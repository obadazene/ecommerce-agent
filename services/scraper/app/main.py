from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from bs4 import BeautifulSoup
import httpx
import logging
import asyncio
import re
from urllib.parse import quote_plus
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# TODO: Add Groq-powered search and analysis integration when the scraper service
# needs LLM-assisted result enrichment.

app = FastAPI(title="Scraper Service")

class SearchRequest(BaseModel):
    query: str

class LookupRequest(BaseModel):
    url: str


async def search_aliexpress_api(query: str) -> list[dict]:
    """
    Return a fixed AliExpress demo result set for development and testing.

    This keeps the scraper service deterministic in local and demo environments
    while a production-grade AliExpress search implementation is introduced later.
    """
    print(f"DEBUG: DEMO MODE - Returning test products for query: '{query}'")
    
    # Demo products that showcase different use cases.
    demo_titles = [
        "USB-C Fast Charger 65W GaN Technology Portable Power Adapter",
        "Wireless Charging Pad 15W Qi-Certified Fast Charge for iPhone 14 Pro",
        "Solar Power Bank 30000mAh with LED Flashlight Waterproof",
        "Smart Watch Fitness Tracker Heart Rate Monitor 7-Day Battery",
        "Magnetic Pop Phone Stand Desk Holder for All Smartphones",
        "Air Purifier with HEPA Filter USB Powered Negative Ion",
        "Portable LED Projector 1080P Support 4K Input 200 ANSI Lumens",
        "Bluetooth Speakers Portable Waterproof 360 Degree Sound",
        "Mini Drone with 4K Camera Foldable 30 Min Flight Time",
        "Mechanical Keyboard RGB Gaming 104 Keys Hot Swap",
        "Electric Toothbrush Sonic Smart 3D Clean Technology",
        "Smart Doorbell with 2K Camera Night Vision Two-Way Audio",
    ]

    async def resolve_demo_product_url(title: str) -> dict:
        search_url = (
            f"https://www.aliexpress.com/wholesale?SearchText={quote_plus(title)}"
        )

        # 1) Try direct HTML extraction (fast path).
        html = await fetch_html(search_url)
        item_url = extract_first_aliexpress_item_url(html)
        if item_url:
            return {"title": title, "url": item_url}

        # 2) Try browser-rendered extraction (dynamic page path).
        rendered_item_url = await extract_first_item_with_playwright(search_url)
        if rendered_item_url:
            return {"title": title, "url": rendered_item_url}

        # 3) Fallback to search page URL if item cannot be resolved.
        return {"title": title, "url": search_url}

    demo_products = await asyncio.gather(*(resolve_demo_product_url(title) for title in demo_titles))
    
    # Return consistent set for testing
    return demo_products

async def fetch_html(url: str) -> str:
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    try:
        async with httpx.AsyncClient(timeout=30, headers=headers) as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.text
    except Exception:
        return ""


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

@app.post("/search/aliexpress")
async def search_aliexpress(request: SearchRequest):
    """Search AliExpress using API approach - more reliable than Playwright"""
    try:
        items = await search_aliexpress_api(request.query)
        print(f"DEBUG: Search complete - found {len(items)} products")
        
        return {
            "query": request.query,
            "url": f"https://www.aliexpress.com/w/wholesale-{request.query.replace(' ', '-').lower()}.html",
            "result": {"title": f"Search results for {request.query}", "description": None},
            "items": items,
        }
    except Exception as e:
        print(f"ERROR: Search failed: {str(e)}")
        return {
            "query": request.query,
            "url": "",
            "result": {},
            "items": [],
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
