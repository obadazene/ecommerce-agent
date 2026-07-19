import os
import json
import logging
from typing import Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import google.generativeai as genai
import httpx

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize API clients
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY", "")
DEFAULT_GEMINI_MODEL = os.getenv("DETECTOR_GEMINI_MODEL", "gemini-2.5-flash")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
DEFAULT_GROQ_MODEL = os.getenv(
    "DETECTOR_GROQ_MODEL", "llama-3.1-8b-instant"
)
DEFAULT_MISTRAL_MODEL = os.getenv(
    "DETECTOR_MISTRAL_MODEL", "mistral-small-latest"
)

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    logger.warning("GEMINI_API_KEY not configured - using fallback scoring")

# Note: Mistral not currently integrated, using local scoring calculation
# mistral_client would be initialized here if needed

app = FastAPI(title="Detector Service - Real Analysis Pipeline")


def _resolve_gemini_model_name(preferred_model: str) -> str:
    """Resolve a supported Gemini model for generateContent with safe fallbacks."""
    fallback_models = [
        preferred_model,
        "gemini-2.5-flash",
        "gemini-1.5-flash",
    ]

    try:
        available_model_names = set()
        for model in genai.list_models():
            methods = getattr(model, "supported_generation_methods", []) or []
            if "generateContent" in methods:
                available_model_names.add(model.name.replace("models/", ""))

        for candidate in fallback_models:
            if candidate in available_model_names:
                if candidate != preferred_model:
                    logger.warning(
                        "Preferred Gemini model '%s' unavailable, falling back to '%s'",
                        preferred_model,
                        candidate,
                    )
                return candidate
    except Exception as e:
        logger.warning(
            "Could not list Gemini models, using preferred model '%s'. Error: %s",
            preferred_model,
            str(e),
        )

    return preferred_model


def _groq_model_candidates() -> list[str]:
    """Ordered Groq fallback models to maximize compatibility across free tiers."""
    primary_candidate = DEFAULT_GROQ_MODEL
    candidates = [
        primary_candidate,
        "llama-3.1-8b-instant",
        "llama-3.3-70b-versatile",
    ]

    # Preserve order while removing duplicates.
    seen = set()
    ordered = []
    for model in candidates:
        if model not in seen:
            ordered.append(model)
            seen.add(model)
    return ordered


class ProductRequest(BaseModel):
    id: str
    name: str
    price: float
    platform: str
    description: str = ""
    seller_rating: Optional[float] = None


class ScoreRequest(BaseModel):
    product_id: str
    name: str
    description: str
    price: float


class DetectRequest(BaseModel):
    item_id: str
    payload: dict


def _build_analysis_prompt(product: ProductRequest) -> str:
    return f"""Analyze this dropshipping product against these 7 criteria and score each 0-10:

Product: {product.name}
Price: ${product.price}
Platform: {product.platform}
Seller Rating: {product.seller_rating or 'N/A'}
Description: {product.description}

Score each criterion (0-10 scale):
1. WOW Factor (uniqueness, novelty) - Something people haven't seen before
2. Solves Problem (solves a real pain point) - Addresses customer problems
3. Makes Better/Easier (adds value) - Improves life quality
4. High Perceived Value (appears expensive) - Worth more than actual cost
5. Mass Market Appeal (broad audience) - Many people would buy
6. Specific Niche (targeted market) - Sold to specific people
7. Lightweight Shipping (easy logistics) - Small weight, easy shipping

Return ONLY valid JSON with this exact structure:
{{
    "wow": <number 0-10>,
    "solves_problem": <number 0-10>,
    "makes_better_easier": <number 0-10>,
    "high_perceived_value": <number 0-10>,
    "mass_market_appeal": <number 0-10>,
    "specific_niche": <number 0-10>,
    "lightweight_shipping": <number 0-10>,
    "reasoning": "<brief explanation of scores>"
}}"""


def _extract_json_from_response(response_text: str) -> dict:
    cleaned = response_text.strip()
    if "```json" in cleaned:
        json_str = cleaned.split("```json", 1)[1].split("```", 1)[0].strip()
    elif "```" in cleaned:
        json_str = cleaned.split("```", 1)[1].split("```", 1)[0].strip()
    else:
        json_str = cleaned
    return json.loads(json_str)


async def analyze_with_groq(product: ProductRequest, prompt: str) -> dict:
    """Fallback provider using Groq API with Llama models when Gemini is rate-limited."""
    if not GROQ_API_KEY:
        return {
            "error": "GROQ_NOT_CONFIGURED",
            "message": "Groq fallback is not configured",
            "status": "blocked",
        }

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    last_error = None
    async with httpx.AsyncClient(timeout=45) as client:
        for candidate_model in _groq_model_candidates():
            payload = {
                "model": candidate_model,
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a strict JSON API. Return only valid JSON with no markdown.",
                    },
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.2,
            }

            try:
                response = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers=headers,
                    json=payload,
                )
                response.raise_for_status()
                body = response.json()

                content = (
                    body.get("choices", [{}])[0]
                    .get("message", {})
                    .get("content", "")
                )
                groq_analysis = _extract_json_from_response(content)
                groq_analysis["_model_used"] = candidate_model
                return groq_analysis
            except httpx.HTTPStatusError as e:
                response_body = e.response.text if e.response is not None else ""
                logger.warning(
                    "Groq model '%s' failed with %s: %s",
                    candidate_model,
                    e.response.status_code if e.response is not None else "unknown",
                    response_body,
                )
                last_error = e
                # Keep trying other models for compatibility errors.
                if e.response is not None and e.response.status_code in (400, 404):
                    continue

                error_str = str(e).lower()
                if "429" in str(e) or "quota" in error_str or "rate_limit" in error_str:
                    logger.error(f"🚨 GROQ API RATE LIMIT REACHED: {str(e)}")
                    return {
                        "error": "GROQ_RATE_LIMIT",
                        "message": "🚨 BLOCKING: Groq API reached free tier limit. Please retry later.",
                        "status": "blocked",
                    }
            except Exception as e:
                logger.warning("Groq model '%s' failed: %s", candidate_model, str(e))
                last_error = e
                continue

    return {
        "error": "GROQ_FALLBACK_FAILED",
        "message": f"Groq fallback failed: {str(last_error)}",
        "status": "blocked",
    }


async def analyze_with_mistral(product: ProductRequest, prompt: str) -> dict:
    """Second fallback provider using Mistral API."""
    if not MISTRAL_API_KEY:
        return {
            "error": "MISTRAL_NOT_CONFIGURED",
            "message": "Mistral fallback is not configured",
            "status": "blocked",
        }

    payload = {
        "model": DEFAULT_MISTRAL_MODEL,
        "messages": [
            {
                "role": "system",
                "content": "You are a strict JSON API. Return only valid JSON with no markdown.",
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.2,
    }

    headers = {
        "Authorization": f"Bearer {MISTRAL_API_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=45) as client:
            response = await client.post(
                "https://api.mistral.ai/v1/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            body = response.json()

        content = (
            body.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
        )
        analysis = _extract_json_from_response(content)
        analysis["_model_used"] = DEFAULT_MISTRAL_MODEL
        return analysis
    except httpx.HTTPStatusError as e:
        response_body = e.response.text if e.response is not None else ""
        logger.warning(
            "Mistral model '%s' failed with %s: %s",
            DEFAULT_MISTRAL_MODEL,
            e.response.status_code if e.response is not None else "unknown",
            response_body,
        )
        error_str = str(e).lower()
        if "429" in str(e) or "quota" in error_str or "rate_limit" in error_str:
            logger.error(f"🚨 MISTRAL API RATE LIMIT REACHED: {str(e)}")
            return {
                "error": "MISTRAL_RATE_LIMIT",
                "message": "🚨 BLOCKING: Mistral API reached free tier limit. Please retry later.",
                "status": "blocked",
            }
        return {
            "error": "MISTRAL_FALLBACK_FAILED",
            "message": f"Mistral fallback failed: {str(e)}",
            "status": "blocked",
        }
    except Exception as e:
        logger.warning("Mistral fallback failed: %s", str(e))
        return {
            "error": "MISTRAL_FALLBACK_FAILED",
            "message": f"Mistral fallback failed: {str(e)}",
            "status": "blocked",
        }


async def analyze_with_fallback_chain(product: ProductRequest, prompt: str) -> dict:
    """Provider chain: Groq -> Mistral -> local fallback."""
    logger.warning(
        "Gemini limit reached, switching to Groq fallback model: %s",
        DEFAULT_GROQ_MODEL,
    )
    groq_result = await analyze_with_groq(product, prompt)
    if groq_result.get("status") != "blocked":
        return groq_result

    logger.warning(
        "Groq fallback unavailable, switching to Mistral fallback model: %s",
        DEFAULT_MISTRAL_MODEL,
    )
    mistral_result = await analyze_with_mistral(product, prompt)
    if mistral_result.get("status") != "blocked":
        return mistral_result

    logger.warning("All API providers unavailable, using local fallback scoring")
    return get_fallback_analysis(
        model_used="local-fallback",
        reason="Fallback scoring - Gemini/Groq/Mistral unavailable",
    )


async def analyze_with_gemini(product: ProductRequest) -> dict:
    """Stage 1: Use GEMINI to analyze product against 7 criteria"""
    try:
        if not GEMINI_API_KEY:
            logger.warning("Gemini not configured, trying fallback chain")
            return await analyze_with_fallback_chain(
                product,
                _build_analysis_prompt(product),
            )

        prompt = _build_analysis_prompt(product)

        selected_model_name = _resolve_gemini_model_name(DEFAULT_GEMINI_MODEL)
        model = genai.GenerativeModel(selected_model_name)
        response = model.generate_content(prompt)

        analysis = _extract_json_from_response(response.text)
        analysis["_model_used"] = selected_model_name
        return analysis

    except Exception as e:
        error_str = str(e).lower()
        prompt = _build_analysis_prompt(product)

        if "429" in str(e) or "quota" in error_str or "rate_limit" in error_str or "resource_exhausted" in error_str:
            logger.error(f"🚨 GEMINI API RATE LIMIT REACHED: {str(e)}")
            return await analyze_with_fallback_chain(product, prompt)
        
        if (
            ("not found" in error_str and "model" in error_str)
            or ("no longer available" in error_str and "model" in error_str)
            or ("unsupported" in error_str and "model" in error_str)
        ):
            logger.error(
                "Gemini model unavailable: %s. Set DETECTOR_GEMINI_MODEL to a supported model.",
                str(e),
            )
            return await analyze_with_fallback_chain(product, prompt)
        else:
            logger.error(f"Gemini analysis failed: {str(e)}")
        return get_fallback_analysis()


async def format_with_mistral(analysis: dict, product: ProductRequest) -> dict:
    """Stage 2: Calculate final score from Gemini analysis"""
    try:
        # Check if previous analysis had errors
        if analysis.get("status") == "blocked":
            return analysis

        # Calculate weighted score
        weights = {
            "wow": 0.25,
            "solves_problem": 0.20,
            "makes_better_easier": 0.15,
            "high_perceived_value": 0.15,
            "mass_market_appeal": 0.10,
            "specific_niche": 0.08,
            "lightweight_shipping": 0.07
        }

        weighted_score = sum(
            analysis.get(key, 0) * weight
            for key, weight in weights.items()
        )

        final_score = round(weighted_score, 2)

        return {
            "criteria_scores": {
                "wow": analysis.get("wow", 0),
                "solves_problem": analysis.get("solves_problem", 0),
                "makes_better_easier": analysis.get("makes_better_easier", 0),
                "high_perceived_value": analysis.get("high_perceived_value", 0),
                "mass_market_appeal": analysis.get("mass_market_appeal", 0),
                "specific_niche": analysis.get("specific_niche", 0),
                "lightweight_shipping": analysis.get("lightweight_shipping", 0),
            },
            "final_score": final_score,
            "reasoning": analysis.get("reasoning", "Analysis complete"),
            "is_winning_product": final_score >= 50,
            "model": analysis.get("_model_used", DEFAULT_GEMINI_MODEL),
        }

    except Exception as e:
        error_str = str(e).lower()
        logger.error(f"Score calculation failed: {str(e)}")
        return calculate_final_score(analysis)


def calculate_final_score(analysis: dict) -> dict:
    """Calculate final score from analysis"""
    weights = {
        "wow": 0.25,
        "solves_problem": 0.20,
        "makes_better_easier": 0.15,
        "high_perceived_value": 0.15,
        "mass_market_appeal": 0.10,
        "specific_niche": 0.08,
        "lightweight_shipping": 0.07
    }

    weighted_score = sum(
        analysis.get(key, 0) * weight
        for key, weight in weights.items()
    )

    final_score = round(weighted_score, 2)

    return {
        "criteria_scores": {
            "wow": analysis.get("wow", 0),
            "solves_problem": analysis.get("solves_problem", 0),
            "makes_better_easier": analysis.get("makes_better_easier", 0),
            "high_perceived_value": analysis.get("high_perceived_value", 0),
            "mass_market_appeal": analysis.get("mass_market_appeal", 0),
            "specific_niche": analysis.get("specific_niche", 0),
            "lightweight_shipping": analysis.get("lightweight_shipping", 0),
        },
        "final_score": final_score,
        "reasoning": analysis.get("reasoning", "Analysis complete"),
        "is_winning_product": final_score >= 50,
        "model": analysis.get("_model_used", DEFAULT_GEMINI_MODEL),
    }


def get_fallback_analysis(
    model_used: str = "local-fallback",
    reason: str = "Fallback scoring - API unavailable",
) -> dict:
    """Fallback analysis when APIs fail"""
    return {
        "wow": 5,
        "solves_problem": 5,
        "makes_better_easier": 5,
        "high_perceived_value": 5,
        "mass_market_appeal": 5,
        "specific_niche": 5,
        "lightweight_shipping": 5,
        "reasoning": reason,
        "_model_used": model_used,
    }


@app.post("/analyze")
async def analyze_product(request: ProductRequest):
    """Full analysis pipeline: Gemini → Mistral → Final Score"""
    logger.info(f"Analyzing product: {request.name}")
    
    try:
        # Stage 1: Gemini analysis
        gemini_analysis = await analyze_with_gemini(request)
        
        # Check if Gemini hit rate limit
        if gemini_analysis.get("status") == "blocked":
            logger.error(f"🚨 API RATE LIMIT BLOCKED: {gemini_analysis.get('error')}")
            raise HTTPException(
                status_code=429,
                detail=gemini_analysis.get("message", "API rate limit reached")
            )
        
        # Stage 2: Mistral formatting
        final_result = await format_with_mistral(gemini_analysis, request)
        
        # Check if Mistral hit rate limit
        if final_result.get("status") == "blocked":
            logger.error(f"🚨 API RATE LIMIT BLOCKED: {final_result.get('error')}")
            raise HTTPException(
                status_code=429,
                detail=final_result.get("message", "API rate limit reached")
            )
        
        logger.info(f"Product {request.name} scored: {final_result.get('final_score', 'N/A')}")
        return final_result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analysis pipeline failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/score")
async def score(request: ScoreRequest):
    """Legacy endpoint - delegates to /analyze"""
    product_request = ProductRequest(
        id=request.product_id,
        name=request.name,
        price=request.price,
        platform="aliexpress",
        description=request.description
    )
    return await analyze_product(product_request)


@app.post("/detect/new")
async def detect_new(request: DetectRequest):
    """Detect new/winning products"""
    try:
        product_data = request.payload
        product = ProductRequest(
            id=request.item_id,
            name=product_data.get("name", "Unknown"),
            price=product_data.get("price", 0),
            platform=product_data.get("platform", "unknown"),
            description=product_data.get("description", "")
        )
        
        analysis = await analyze_product(product)
        return {
            "item_id": request.item_id,
            "detected": analysis.get("is_winning_product", False),
            "score": analysis.get("final_score", 0),
            "reasoning": analysis.get("reasoning", ""),
            "criteria": analysis.get("criteria_scores", {})
        }
    except Exception as e:
        logger.error(f"Detection failed: {str(e)}")
        return {
            "item_id": request.item_id,
            "detected": False,
            "score": 0,
            "error": str(e)
        }


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "detector",
        "gemini_model": DEFAULT_GEMINI_MODEL,
        "groq_model": DEFAULT_GROQ_MODEL,
        "mistral_model": DEFAULT_MISTRAL_MODEL,
        "gemini_configured": bool(GEMINI_API_KEY),
        "groq_configured": bool(GROQ_API_KEY),
        "mistral_configured": bool(MISTRAL_API_KEY)
    }
