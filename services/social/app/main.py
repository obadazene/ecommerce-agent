from fastapi import FastAPI
from pydantic import BaseModel
from bs4 import BeautifulSoup
import httpx
from urllib.parse import quote_plus

app = FastAPI(title="Social Service")

class SearchRequest(BaseModel):
    query: str

class AnalyzeRequest(BaseModel):
    text: str


async def fetch_html(url: str) -> str:
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    try:
        async with httpx.AsyncClient(timeout=20, headers=headers, follow_redirects=True) as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.text
    except Exception:
        return ""


def parse_metadata(html: str) -> dict:
    if not html:
        return {"title": None, "description": None}

    soup = BeautifulSoup(html, "html.parser")
    description_tag = soup.find("meta", {"name": "description"})
    return {
        "title": soup.title.string.strip() if soup.title and soup.title.string else None,
        "description": description_tag["content"] if description_tag and description_tag.has_attr("content") else None,
    }


async def build_search_response(source: str, query: str, url: str):
    html = await fetch_html(url)
    metadata = parse_metadata(html)
    exists = bool(metadata["title"] or metadata["description"])
    return {
        "query": query,
        "source": source,
        "exists": exists,
        "firstPost": None,
        "url": url,
        "engagement": 1 if exists else 0,
        "metadata": metadata,
    }

@app.post("/search/tiktok")
async def search_tiktok(request: SearchRequest):
    url = f"https://www.tiktok.com/search?q={quote_plus(request.query)}"
    return await build_search_response("tiktok", request.query, url)

@app.post("/search/instagram")
async def search_instagram(request: SearchRequest):
    tag = request.query.replace(" ", "")
    url = f"https://www.instagram.com/explore/tags/{quote_plus(tag)}/"
    return await build_search_response("instagram", request.query, url)

@app.post("/search/twitter")
async def search_twitter(request: SearchRequest):
    url = f"https://twitter.com/search?q={quote_plus(request.query)}"
    return await build_search_response("twitter", request.query, url)

@app.post("/search/facebook")
async def search_facebook(request: SearchRequest):
    url = f"https://www.facebook.com/search/top?q={quote_plus(request.query)}"
    return await build_search_response("facebook", request.query, url)

@app.post("/search/youtube")
async def search_youtube(request: SearchRequest):
    url = f"https://www.youtube.com/results?search_query={quote_plus(request.query)}"
    return await build_search_response("youtube", request.query, url)

@app.post("/search/pinterest")
async def search_pinterest(request: SearchRequest):
    url = f"https://www.pinterest.com/search/pins/?q={quote_plus(request.query)}"
    return await build_search_response("pinterest", request.query, url)
