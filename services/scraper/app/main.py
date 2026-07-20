from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from bs4 import BeautifulSoup
import httpx
import logging
import asyncio
import re
import os
import json
from datetime import datetime
from urllib.parse import quote_plus
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Scraper Service")


def _get_env_int(name: str, default: int) -> int:
    raw_value = os.getenv(name, str(default)).strip()
    try:
        return int(raw_value)
    except ValueError:
        return default

BRIGHT_DATA_API_KEY = os.getenv("BRIGHT_DATA_API_KEY", "").strip()
BRIGHT_DATA_API_URL = os.getenv(
    "BRIGHT_DATA_API_URL",
    "https://api.brightdata.com/request",
).strip()
BRIGHT_DATA_ZONE = os.getenv("BRIGHT_DATA_ZONE", "").strip()
BRIGHT_DATA_FORMAT = os.getenv("BRIGHT_DATA_FORMAT", "raw").strip() or "raw"
BRIGHT_DATA_MIN_CREDITS = _get_env_int("BRIGHT_DATA_MIN_CREDITS", 100)
CREDIT_FILE = os.getenv(
    "BRIGHT_DATA_CREDIT_FILE",
    "/tmp/bright_data_credits.json",
).strip() or "/tmp/bright_data_credits.json"
DEFAULT_BRIGHT_DATA_CREDITS = 5000

LAST_SCRAPE_SOURCE = "none"

class SearchRequest(BaseModel):
    query: str
    useBrightData: bool | None = None

class LookupRequest(BaseModel):
    url: str


def get_cached_credit_balance() -> int:
    """Get the cached credit balance from file."""
    try:
        with open(CREDIT_FILE, "r", encoding="utf-8") as credit_file:
            data = json.load(credit_file)

        remaining = int(data.get("remaining", DEFAULT_BRIGHT_DATA_CREDITS))
        return max(0, remaining)
    except Exception:
        return DEFAULT_BRIGHT_DATA_CREDITS


def update_credit_balance(remaining: int):
    """Update the cached credit balance."""
    safe_remaining = max(0, int(remaining))
    credit_dir = os.path.dirname(CREDIT_FILE)
    if credit_dir:
        os.makedirs(credit_dir, exist_ok=True)

    with open(CREDIT_FILE, "w", encoding="utf-8") as credit_file:
        json.dump(
            {
                "remaining": safe_remaining,
                "last_updated": datetime.now().isoformat(),
            },
            credit_file,
        )


def should_use_bright_data() -> bool:
    """Return True when Bright Data is configured and above the credit threshold."""
    return (
        bool(BRIGHT_DATA_API_KEY)
        and bool(BRIGHT_DATA_ZONE)
        and get_cached_credit_balance() > BRIGHT_DATA_MIN_CREDITS
    )


def emit_credit_alert(remaining: int):
    """Emit low-credit alerts; email escalation can be added later if needed."""
    if remaining < 50:
        logger.warning(
            "Bright Data credits exhausted or critically low (%s). Using Playwright fallback.",
            remaining,
        )
    elif remaining < 100:
        logger.warning("Bright Data credits low (%s). Switching to Playwright soon.", remaining)


def _extract_remaining_credits(response: httpx.Response) -> int:
    header_value = response.headers.get("X-Credits-Remaining")
    if header_value is None:
        return get_cached_credit_balance()

    try:
        return max(0, int(float(header_value.strip())))
    except ValueError:
        return get_cached_credit_balance()


def is_aliexpress_block_page(html: str) -> bool:
    if not html:
        return False

    markers = [
        "_____tmd_____",
        "x5secdata=",
        '"action":"captcha"',
        "window._config_ = {\"action\":\"captcha\"",
    ]
    lowered = html.lower()
    return any(marker.lower() in lowered for marker in markers)


async def search_aliexpress_api(query: str, use_bright_data: bool = True) -> tuple[list[dict], bool, str]:
    """Search AliExpress using Bright Data first, then local fallbacks."""
    fallback_reason = None

    if use_bright_data and should_use_bright_data():
        try:
            products, remaining = await scrape_with_bright_data(query)
            if products:
                if remaining <= 50:
                    logger.warning(
                        "Bright Data credits low (%s). Switching to Playwright for upcoming requests.",
                        remaining,
                    )
                return products, False, "bright-data"

            fallback_reason = "Bright Data returned no products"
        except Exception as error:
            fallback_reason = str(error)
            logger.error(
                "Layer 1/Bright Data failed for query '%s': %s",
                query,
                fallback_reason,
            )
    else:
        remaining = get_cached_credit_balance()
        if not use_bright_data:
            fallback_reason = "Bright Data disabled for this request"
            logger.info("Bright Data disabled for query '%s'. Using Playwright fallback", query)
        elif remaining <= 0:
            fallback_reason = "Bright Data credits exhausted"
            logger.warning("Bright Data credits exhausted. Using Playwright fallback")
        else:
            fallback_reason = f"Bright Data credits low ({remaining})"
            logger.warning(
                "Bright Data credits low (%s). Switching to Playwright",
                remaining,
            )

    search_url = f"https://www.aliexpress.com/wholesale?SearchText={quote_plus(query)}"
    blocked = False

    if fallback_reason:
        logger.info("Playwright fallback (%s)", fallback_reason)

    items = await extract_items_with_playwright(search_url, query)
    if items:
        products = [
            _standardize_playwright_product(item, index, query)
            for index, item in enumerate(items)
            if item.get("url")
        ]
        logger.info("Playwright fallback success: %s products", len(products))
        return products[:12], False, "playwright"

    html = await fetch_html(search_url)
    if is_aliexpress_block_page(html):
        logger.warning("AliExpress anti-bot block page detected for query: %s", query)
        blocked = True

    fallback_items = extract_item_urls_from_html(html, query)
    if fallback_items:
        products = [
            _standardize_playwright_product(item, index, query)
            for index, item in enumerate(fallback_items)
            if item.get("url")
        ]
        return products[:12], False, "html"

    indexed_items = await search_aliexpress_via_bing(query)
    if indexed_items:
        logger.info("AliExpress Bing fallback returned %s items for query: %s", len(indexed_items), query)
        products = [
            _standardize_playwright_product(item, index, query)
            for index, item in enumerate(indexed_items)
            if item.get("url")
        ]
        return products[:12], False, "bing"

    logger.warning("AliExpress search returned no usable product URLs for query: %s", query)
    return [], blocked, "none"


def _parse_opened_since_date(raw_value: str) -> str | None:
    value = raw_value.strip().replace(".", "")
    if not value:
        return None

    month_map = {
        "jan": 1,
        "january": 1,
        "ene": 1,
        "enero": 1,
        "feb": 2,
        "february": 2,
        "febrero": 2,
        "mar": 3,
        "march": 3,
        "marzo": 3,
        "apr": 4,
        "april": 4,
        "abr": 4,
        "abril": 4,
        "may": 5,
        "mayo": 5,
        "jun": 6,
        "june": 6,
        "junio": 6,
        "jul": 7,
        "july": 7,
        "julio": 7,
        "aug": 8,
        "august": 8,
        "ago": 8,
        "agosto": 8,
        "sep": 9,
        "sept": 9,
        "september": 9,
        "septiembre": 9,
        "oct": 10,
        "october": 10,
        "octubre": 10,
        "nov": 11,
        "november": 11,
        "noviembre": 11,
        "dec": 12,
        "december": 12,
        "dic": 12,
        "diciembre": 12,
    }

    match = re.search(r"([A-Za-z\u00C0-\u017F]+)\s+(\d{1,2}),\s*(\d{4})", value)
    if not match:
        return None

    month_token = match.group(1).lower()
    day = int(match.group(2))
    year = int(match.group(3))
    month = month_map.get(month_token)

    if not month:
        return None

    try:
        parsed = datetime(year=year, month=month, day=day)
        return parsed.date().isoformat()
    except ValueError:
        return None


def extract_store_opened_since(html: str) -> str | None:
    if not html:
        return None

    # Matches labels like "Opened since:" or "Abierto desde:" followed by month/day/year.
    label_pattern = re.search(
        r"(?:Opened\s+since|Abierto\s+desde)\s*[:：]?\s*([A-Za-z\u00C0-\u017F]+\s+\d{1,2},\s*\d{4})",
        html,
        flags=re.IGNORECASE,
    )
    if label_pattern:
        parsed = _parse_opened_since_date(label_pattern.group(1))
        if parsed:
            return parsed

    fallback_pattern = re.search(
        r"([A-Za-z\u00C0-\u017F]+\s+\d{1,2},\s*\d{4})",
        html,
        flags=re.IGNORECASE,
    )
    if fallback_pattern:
        return _parse_opened_since_date(fallback_pattern.group(1))

    return None


async def enrich_items_with_launch_dates(items: list[dict]) -> list[dict]:
    if not items:
        return items

    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    semaphore = asyncio.Semaphore(4)

    async with httpx.AsyncClient(timeout=20, headers=headers, follow_redirects=True) as client:
        async def enrich(item: dict) -> dict:
            url = item.get("url")
            if not url:
                return item

            try:
                async with semaphore:
                    response = await client.get(url)
                if response.status_code >= 400:
                    return item

                launch_date = extract_store_opened_since(response.text)
                if launch_date:
                    return {**item, "launchDate": launch_date}
            except Exception:
                return item

            return item

        return await asyncio.gather(*(enrich(item) for item in items))

async def fetch_html(url: str) -> str:
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    try:
        async with httpx.AsyncClient(timeout=30, headers=headers) as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.text
    except Exception:
        return ""


async def search_aliexpress_via_bing(query: str, max_items: int = 12) -> list[dict]:
    """Use indexed search results as a network fallback when AliExpress pages hide links."""
    bing_url = (
        "https://www.bing.com/search?q="
        + quote_plus(f"site:aliexpress.com/item {query}")
    )
    html = await fetch_html(bing_url)
    return extract_item_urls_from_html(html, query, max_items)


def extract_first_aliexpress_item_url(html: str) -> str | None:
    if not html:
        return None

    # Match direct links and escaped links in embedded JSON/script blobs.
    patterns = [
        r"https?://www\\.aliexpress\\.com/item/\\d+\\.html",
        r"//www\\.aliexpress\\.com/item/\\d+\\.html",
        r"https:\\/\\/www\\.aliexpress\\.com\\/item\\/\\d+\\.html",
    ]

    for pattern in patterns:
        match = re.search(pattern, html)
        if not match:
            continue

        raw_url = match.group(0)
        normalized = raw_url.replace("\\/", "/")
        if normalized.startswith("//"):
            normalized = f"https:{normalized}"
        return normalized

    return None


def normalize_aliexpress_url(raw_url: str | None) -> str | None:
    if not raw_url:
        return None

    normalized = raw_url.replace("\\/", "/")
    if normalized.startswith("//"):
        normalized = f"https:{normalized}"
    elif normalized.startswith("/"):
        normalized = f"https://www.aliexpress.com{normalized}"

    normalized = re.sub(r"^https?://([a-z0-9.-]*\.)?aliexpress\.[a-z.]+", "https://www.aliexpress.com", normalized)

    if "/item/" not in normalized:
        return None

    return normalized.split("?", 1)[0]


def extract_item_urls_from_html(html: str, query: str, max_items: int = 12) -> list[dict]:
    if not html:
        return []

    matches = re.findall(
        r"(?:https?:\\/\\/[a-z0-9.-]*aliexpress\\.[a-z.]+\\/item\\/\\d+\\.html|https?://[a-z0-9.-]*aliexpress\\.[a-z.]+/item/\\d+\\.html|//[a-z0-9.-]*aliexpress\\.[a-z.]+/item/\\d+\\.html|/item/\\d+\\.html)",
        html,
    )

    seen: set[str] = set()
    items: list[dict] = []

    for index, match in enumerate(matches, start=1):
        url = normalize_aliexpress_url(match)
        if not url or url in seen:
            continue

        seen.add(url)
        items.append({"title": f"{query} result {len(items) + 1}", "url": url})
        if len(items) >= max_items:
            break

    return items


async def extract_items_with_playwright(search_url: str, query: str, max_items: int = 12) -> list[dict]:
    try:
        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(headless=True)
            page = await browser.new_page(
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/126.0.0.0 Safari/537.36"
                )
            )

            try:
                await page.goto(search_url, wait_until="networkidle", timeout=25000)
                await page.wait_for_timeout(3000)
                await page.mouse.wheel(0, 2400)
                await page.wait_for_timeout(1500)

                raw_items = await page.locator("a[href*='/item/']").evaluate_all(
                    r"""
                    (elements) => elements.map((element) => {
                      const href = element.href || element.getAttribute('href');
                      const image = element.querySelector('img');
                      const text = (
                        element.getAttribute('title') ||
                        element.getAttribute('aria-label') ||
                        image?.getAttribute('alt') ||
                        element.textContent ||
                        ''
                      ).replace(/\s+/g, ' ').trim();

                      return { href, title: text };
                    })
                    """
                )

                seen: set[str] = set()
                items: list[dict] = []

                for raw_item in raw_items:
                    url = normalize_aliexpress_url(raw_item.get("href"))
                    if not url or url in seen:
                        continue

                    seen.add(url)
                    title = raw_item.get("title") or f"{query} result {len(items) + 1}"
                    items.append({"title": title, "url": url})

                    if len(items) >= max_items:
                        break

                if items:
                    return items

                rendered_html = await page.content()
                return extract_item_urls_from_html(rendered_html, query, max_items)
            except PlaywrightTimeoutError:
                return []
            finally:
                await browser.close()
    except Exception as error:
        logger.warning(f"Playwright search extraction failed: {str(error)}")
        return []


async def extract_first_item_with_playwright(search_url: str) -> str | None:
    try:
        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(headless=True)
            page = await browser.new_page(
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/126.0.0.0 Safari/537.36"
                )
            )

            try:
                await page.goto(search_url, wait_until="domcontentloaded", timeout=12000)
                await page.wait_for_timeout(1500)

                href = await page.eval_on_selector(
                    "a[href*='/item/']",
                    "(el) => el.getAttribute('href')",
                )

                if not href:
                    return None

                if href.startswith("//"):
                    return f"https:{href}"
                if href.startswith("/"):
                    return f"https://www.aliexpress.com{href}"
                return href
            except PlaywrightTimeoutError:
                return None
            finally:
                await browser.close()
    except Exception as error:
        logger.warning(f"Playwright item URL extraction failed: {str(error)}")
        return None

async def parse_html(html: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    description_tag = soup.find("meta", {"name": "description"})
    return {
        "title": soup.title.string if soup.title else None,
        "description": description_tag["content"] if description_tag and description_tag.has_attr("content") else None,
    }


def _parse_price(raw_price) -> float:
    if raw_price is None:
        return 0.0

    if isinstance(raw_price, (int, float)):
        return float(raw_price)

    if isinstance(raw_price, str):
        match = re.search(r"\d+(?:\.\d+)?", raw_price.replace(",", ""))
        if match:
            return float(match.group(0))

    return 0.0


def _build_product_id(url: str | None, name: str, index: int, prefix: str) -> str:
    if url:
        match = re.search(r"/item/(\d+)\.html", url, flags=re.IGNORECASE)
        if match:
            return f"{prefix}-{match.group(1)}"

    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:40]
    return f"{prefix}-{slug or f'result-{index + 1}'}"


def _standardize_bright_data_product(raw: dict, index: int, query: str) -> dict:
    name = str(raw.get("title") or raw.get("name") or f"{query} result {index + 1}").strip()
    url = str(raw.get("url") or raw.get("product_url") or "").strip()
    price = _parse_price(raw.get("price") or raw.get("current_price"))
    currency = str(raw.get("currency") or "USD").strip() or "USD"
    image_url = raw.get("image") or raw.get("image_url") or raw.get("thumbnail")
    seller_name = raw.get("seller") or raw.get("seller_name")
    seller_rating = raw.get("rating") or raw.get("seller_rating")
    sales_count = raw.get("sales_count") or raw.get("sales") or raw.get("orders")
    description = raw.get("description")

    return {
        "id": _build_product_id(url, name, index, "aliexpress"),
        "name": name,
        "price": price,
        "currency": currency,
        "url": url,
        "platform": "AliExpress",
        "image_url": image_url,
        "seller_name": seller_name,
        "seller_rating": seller_rating,
        "sales_count": sales_count,
        "description": description,
    }


def _standardize_playwright_product(raw: dict, index: int, query: str) -> dict:
    name = str(raw.get("title") or f"{query} result {index + 1}").strip()
    url = str(raw.get("url") or "").strip()
    price = _parse_price(raw.get("price"))
    image_url = raw.get("imageUrl") or raw.get("image") or raw.get("image_url")

    return {
        "id": _build_product_id(url, name, index, "aliexpress"),
        "name": name,
        "price": price,
        "currency": "USD",
        "url": url,
        "platform": "AliExpress",
        "image_url": image_url,
        "seller_name": raw.get("seller") or raw.get("seller_name"),
        "seller_rating": raw.get("rating") or raw.get("seller_rating"),
        "sales_count": raw.get("sales_count") or raw.get("sales") or raw.get("orders"),
        "description": raw.get("description"),
    }


def _to_legacy_item(product: dict) -> dict:
    return {
        "title": product.get("name"),
        "url": product.get("url"),
        "price": product.get("price"),
        "imageUrl": product.get("image_url"),
        "sellerRating": product.get("seller_rating"),
        "salesCount": product.get("sales_count"),
        "launchDate": None,
    }


async def scrape_with_bright_data(query: str) -> tuple[list[dict], int]:
    """Layer 1: Fetch products using Bright Data Web Unlocker API."""
    if not BRIGHT_DATA_API_KEY:
        raise RuntimeError("BRIGHT_DATA_API_KEY is not configured")
    if not BRIGHT_DATA_ZONE:
        raise RuntimeError("BRIGHT_DATA_ZONE is not configured")
    if not should_use_bright_data():
        remaining = get_cached_credit_balance()
        if remaining <= 0:
            logger.warning("Bright Data credits exhausted. Using Playwright fallback")
        else:
            logger.warning(
                "Bright Data credits low (%s). Switching to Playwright",
                remaining,
            )
        return [], remaining

    logger.info("Layer 1/Bright Data: searching for query '%s'", query)

    auth_header = (
        BRIGHT_DATA_API_KEY
        if BRIGHT_DATA_API_KEY.lower().startswith("bearer ")
        else f"Bearer {BRIGHT_DATA_API_KEY}"
    )

    target_url = f"https://www.aliexpress.com/wholesale?SearchText={quote_plus(query)}"

    headers = {
        "Authorization": auth_header,
        "Accept": "*/*",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        response = await client.post(
            BRIGHT_DATA_API_URL,
            headers=headers,
            json={
                "zone": BRIGHT_DATA_ZONE,
                "url": target_url,
                "format": BRIGHT_DATA_FORMAT,
            },
        )
        remaining_credits = _extract_remaining_credits(response)
        update_credit_balance(remaining_credits)
        logger.info("Bright Data credits: %s remaining", remaining_credits)
        emit_credit_alert(remaining_credits)
        response.raise_for_status()

        content_type = response.headers.get("content-type", "").lower()
        raw_text = response.text

    raw_products = []
    if "application/json" in content_type:
        payload = response.json()
        if isinstance(payload, list):
            raw_products = payload
        elif isinstance(payload, dict):
            raw_products = payload.get("products") or payload.get("items") or payload.get("results") or []

            # Web Unlocker integrations can return HTML wrapped in JSON fields.
            html_text = payload.get("html") or payload.get("body") or payload.get("content")
            if isinstance(html_text, str) and html_text.strip():
                raw_text = html_text
    else:
        raw_text = raw_text or ""

    products = []
    if isinstance(raw_products, list) and raw_products:
        for index, raw in enumerate(raw_products):
            if not isinstance(raw, dict):
                continue
            standardized = _standardize_bright_data_product(raw, index, query)
            if standardized["url"]:
                products.append(standardized)
    else:
        if not raw_text.strip():
            raise ValueError("Bright Data returned an empty response body")

        if is_aliexpress_block_page(raw_text):
            raise ValueError("Bright Data returned anti-bot content")

        extracted_items = extract_item_urls_from_html(raw_text, query)
        for index, item in enumerate(extracted_items):
            standardized = _standardize_playwright_product(item, index, query)
            if standardized["url"]:
                products.append(standardized)

    if not products:
        raise ValueError("Bright Data returned no usable products")

    logger.info("Layer 1/Bright Data: received %s products", len(products))
    return products[:12], remaining_credits


async def scrape_with_playwright(query: str) -> tuple[list[dict], bool]:
    """Layer 2: Fetch products using Playwright (existing code)."""
    logger.info("Layer 2/Playwright: searching for query '%s'", query)
    search_url = f"https://www.aliexpress.com/wholesale?SearchText={quote_plus(query)}"
    items = await extract_items_with_playwright(search_url, query)

    if items:
        products = [
            _standardize_playwright_product(item, index, query)
            for index, item in enumerate(items)
            if item.get("url")
        ]
        logger.info("Playwright fallback success: %s products", len(products))
        return products[:12], False

    html = await fetch_html(search_url)
    blocked = is_aliexpress_block_page(html)

    if blocked:
        logger.warning("Layer 2/Playwright: CAPTCHA/anti-bot detected for query '%s'", query)
        return [], True

    logger.warning("Layer 2/Playwright: no usable products for query '%s'", query)
    return [], False


async def get_demo_products(query: str) -> list[dict]:
    """Layer 3: Return demo products when real sources fail."""
    logger.warning("Layer 3/Demo: returning demo products for query '%s'", query)

    query_label = query.strip() or "trending"
    search_url = f"https://www.aliexpress.com/wholesale?SearchText={quote_plus(query_label)}"
    demo_rows = [
        {
            "name": f"{query_label.title()} Portable Blender",
            "price": 19.99,
            "url": search_url,
            "image_url": "https://via.placeholder.com/640x640.png?text=Portable+Blender",
            "seller_name": "Demo Store A",
            "seller_rating": 4.7,
            "description": "High-margin kitchen gadget with viral potential.",
        },
        {
            "name": f"{query_label.title()} LED Strip Lights",
            "price": 12.49,
            "url": search_url,
            "image_url": "https://via.placeholder.com/640x640.png?text=LED+Strip+Lights",
            "seller_name": "Demo Store B",
            "seller_rating": 4.6,
            "description": "Low-cost decor product with strong social traction.",
        },
        {
            "name": f"{query_label.title()} Pet Grooming Glove",
            "price": 8.95,
            "url": search_url,
            "image_url": "https://via.placeholder.com/640x640.png?text=Pet+Grooming+Glove",
            "seller_name": "Demo Store C",
            "seller_rating": 4.8,
            "description": "Evergreen pet niche item with repeat purchase potential.",
        },
    ]

    products = []
    for index, row in enumerate(demo_rows):
        products.append(
            {
                "id": _build_product_id(row["url"], row["name"], index, "demo"),
                "name": row["name"],
                "price": row["price"],
                "currency": "USD",
                "url": row["url"],
                "platform": "AliExpress",
                "image_url": row["image_url"],
                "seller_name": row["seller_name"],
                "seller_rating": row["seller_rating"],
                "sales_count": None,
                "description": row["description"],
            }
        )

    return products

@app.post("/search/aliexpress")
async def search_aliexpress(request: SearchRequest):
    """Search AliExpress with automatic fallback chain."""
    global LAST_SCRAPE_SOURCE

    query = request.query.strip()
    use_bright_data = True if request.useBrightData is None else bool(request.useBrightData)
    products, blocked, source = await search_aliexpress_api(query, use_bright_data)
    blocked_reason = "ali-captcha" if blocked else None

    if not products:
        logger.warning(
            "No usable live products for query '%s'. Using demo fallback.",
            query,
        )
        products = await get_demo_products(query)
        source = "demo"

    LAST_SCRAPE_SOURCE = source

    logger.info(
        "Search completed for query '%s' using source '%s' with %s products",
        query,
        source,
        len(products),
    )

    return {
        "query": query,
        "url": f"https://www.aliexpress.com/w/wholesale-{query.replace(' ', '-').lower()}.html",
        "result": {"title": f"Search results for {query}", "description": None},
        "source": source,
        "blocked": blocked,
        "blockedReason": blocked_reason,
        "products": products,
        "items": [_to_legacy_item(product) for product in products],
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    remaining_credits = get_cached_credit_balance()
    credits_below_threshold = remaining_credits <= BRIGHT_DATA_MIN_CREDITS
    mode = "bright-data" if should_use_bright_data() else "playwright"

    return {
        "status": "ok",
        "service": "scraper",
        "brightDataConfigured": bool(BRIGHT_DATA_API_KEY),
        "brightDataZoneConfigured": bool(BRIGHT_DATA_ZONE),
        "brightDataFormat": BRIGHT_DATA_FORMAT,
        "brightDataCreditsRemaining": remaining_credits,
        "brightDataCreditsBelowThreshold": credits_below_threshold,
        "brightDataMinCredits": BRIGHT_DATA_MIN_CREDITS,
        "brightDataApiUrl": BRIGHT_DATA_API_URL,
        "currentMode": mode,
        "lastSource": LAST_SCRAPE_SOURCE,
    }

@app.get("/debug/html")
async def debug_html(url: str):
    """Debug endpoint - test URL fetching"""
    try:
        html = await fetch_html(url)
        soup = BeautifulSoup(html, "html.parser")
        all_links = soup.find_all("a")
        
        return {
            "url": url,
            "html_length": len(html),
            "total_links": len(all_links),
            "success": True
        }
    except Exception as e:
        return {
            "url": url,
            "error": str(e),
            "success": False
        }

@app.post("/lookup/amazon")
async def lookup_amazon(request: LookupRequest):
    html = await fetch_html(request.url)
    return {"url": request.url, "metadata": await parse_html(html)}

@app.post("/lookup/shopify")
async def lookup_shopify(request: LookupRequest):
    html = await fetch_html(request.url)
    return {"url": request.url, "metadata": await parse_html(html)}

@app.post("/lookup/woocommerce")
async def lookup_woocommerce(request: LookupRequest):
    html = await fetch_html(request.url)
    return {"url": request.url, "metadata": await parse_html(html)}

@app.post("/lookup/ebay")
async def lookup_ebay(request: LookupRequest):
    html = await fetch_html(request.url)
    return {"url": request.url, "metadata": await parse_html(html)}

@app.post("/lookup/temu")
async def lookup_temu(request: LookupRequest):
    html = await fetch_html(request.url)
    return {"url": request.url, "metadata": await parse_html(html)}
