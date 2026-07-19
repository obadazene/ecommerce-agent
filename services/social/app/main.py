from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Social Service")

class SearchRequest(BaseModel):
    query: str

class AnalyzeRequest(BaseModel):
    text: str

@app.post("/search/tiktok")
async def search_tiktok(request: SearchRequest):
    return {"query": request.query, "source": "tiktok", "analysis": f"Gemini analysis placeholder for {request.query}"}

@app.post("/search/instagram")
async def search_instagram(request: SearchRequest):
    return {"query": request.query, "source": "instagram", "analysis": f"Gemini analysis placeholder for {request.query}"}

@app.post("/search/twitter")
async def search_twitter(request: SearchRequest):
    return {"query": request.query, "source": "twitter", "analysis": f"Gemini analysis placeholder for {request.query}"}

@app.post("/search/facebook")
async def search_facebook(request: SearchRequest):
    return {"query": request.query, "source": "facebook", "analysis": f"Gemini analysis placeholder for {request.query}"}
