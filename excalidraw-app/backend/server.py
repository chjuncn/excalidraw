import os
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import httpx
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

app = FastAPI(title="Excalidraw App Backend", version="0.1.0")

# CORS for local dev (adjust as needed via env)
allowed_origins = os.getenv(
    "CORS_ALLOW_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000"
).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in allowed_origins if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OPEN_API_KEY = os.getenv("OPEN_API_KEY")
OPEN_API_BASE = os.getenv("OPEN_API_BASE", "https://api.openai.com/v1")
OPEN_API_MODEL = os.getenv("OPEN_API_MODEL", "gpt-4o-mini")


class RectTextRequest(BaseModel):
    prompt: str


class RectTextResponse(BaseModel):
    text: str


class TextRequest(BaseModel):
    prompt: str
    currentText: str = ""


class TextResponse(BaseModel):
    text: str


class ConsistencyRequest(BaseModel):
    left: str
    right: str


class ConsistencyResponse(BaseModel):
    same_entity: bool
    inconsistent: bool
    reason: str

@app.get("/health")
async def health() -> dict:
    return {"ok": True}


@app.post("/v1/ai/rect-text/generate", response_model=RectTextResponse)
async def rect_text_generate(req: RectTextRequest) -> RectTextResponse:
    if not OPEN_API_KEY:
        raise HTTPException(status_code=500, detail="OPEN_API_KEY not configured")

    # Call OpenAI-compatible chat completions endpoint
    headers = {
        "Authorization": f"Bearer {OPEN_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": OPEN_API_MODEL,
        "messages": [
            {
                "role": "system",
                "content": "You generate concise text to place inside a diagram rectangle.",
            },
            {"role": "user", "content": req.prompt},
        ],
        "temperature": 0.2,
    }

    url = f"{OPEN_API_BASE}/chat/completions"

    async with httpx.AsyncClient(timeout=60) as client:
        try:
            r = await client.post(url, headers=headers, json=payload)
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"Upstream error: {e}")

    if r.status_code != 200:
        detail = r.text
        try:
            detail = r.json()
        except Exception:
            pass
        raise HTTPException(status_code=r.status_code, detail=detail)

    data = r.json()
    text: Optional[str] = None
    # OpenAI style response
    if isinstance(data, dict):
        choices = data.get("choices")
        if choices and isinstance(choices, list):
            message = choices[0].get("message", {})
            text = message.get("content")

    if not text:
        raise HTTPException(status_code=500, detail="Invalid response from model")

    return RectTextResponse(text=text.strip())


@app.post("/v1/ai/text/generate", response_model=TextResponse)
async def text_generate(req: TextRequest) -> TextResponse:
    if not OPEN_API_KEY:
        raise HTTPException(status_code=500, detail="OPEN_API_KEY not configured")

    # Call OpenAI-compatible chat completions endpoint
    headers = {
        "Authorization": f"Bearer {OPEN_API_KEY}",
        "Content-Type": "application/json",
    }

    # Build the system message based on whether there's existing text
    if req.currentText.strip():
        system_content = f"You are an AI text editor. The user has existing text: '{req.currentText}'. Based on their request, edit, improve, or rewrite this text. Return only the final text without explanations."
    else:
        system_content = "You generate text based on the user's request. Return only the text without explanations."

    payload = {
        "model": OPEN_API_MODEL,
        "messages": [
            {
                "role": "system",
                "content": system_content,
            },
            {"role": "user", "content": req.prompt},
        ],
        "temperature": 0.2,
    }

    url = f"{OPEN_API_BASE}/chat/completions"

    async with httpx.AsyncClient(timeout=60) as client:
        try:
            r = await client.post(url, headers=headers, json=payload)
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"Upstream error: {e}")

    if r.status_code != 200:
        detail = r.text
        try:
            detail = r.json()
        except Exception:
            pass
        raise HTTPException(status_code=r.status_code, detail=detail)

    data = r.json()
    text: Optional[str] = None
    # OpenAI style response
    if isinstance(data, dict):
        choices = data.get("choices")
        if choices and isinstance(choices, list):
            message = choices[0].get("message", {})
            text = message.get("content")

    if not text:
        raise HTTPException(status_code=500, detail="Invalid response from model")

    return TextResponse(text=text.strip())


@app.post("/v1/ai/consistency/check", response_model=ConsistencyResponse)
async def consistency_check(req: ConsistencyRequest) -> ConsistencyResponse:
    if not OPEN_API_KEY:
        raise HTTPException(status_code=500, detail="OPEN_API_KEY not configured")

    headers = {
        "Authorization": f"Bearer {OPEN_API_KEY}",
        "Content-Type": "application/json",
    }

    system_content = (
        "You are a strict consistency checker. "
        "Given two short texts from a diagram canvas, determine whether they talk about the same real-world entity/person/thing, "
        "and if so whether their factual claims are inconsistent. "
        "Reply ONLY in compact JSON with fields: same_entity (boolean), inconsistent (boolean), reason (short string). "
        "Keep reason one sentence."
    )

    user_content = (
        "Left:\n" + req.left.strip() + "\n\nRight:\n" + req.right.strip() +
        "\n\nReturn JSON only."
    )

    payload = {
        "model": OPEN_API_MODEL,
        "messages": [
            {"role": "system", "content": system_content},
            {"role": "user", "content": user_content},
        ],
        "temperature": 0,
        "response_format": {"type": "json_object"},
    }

    url = f"{OPEN_API_BASE}/chat/completions"

    async with httpx.AsyncClient(timeout=60) as client:
        try:
            r = await client.post(url, headers=headers, json=payload)
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"Upstream error: {e}")

    if r.status_code != 200:
        detail = r.text
        try:
            detail = r.json()
        except Exception:
            pass
        raise HTTPException(status_code=r.status_code, detail=detail)

    data = r.json()
    content: Optional[str] = None
    if isinstance(data, dict):
        choices = data.get("choices")
        if choices and isinstance(choices, list):
            message = choices[0].get("message", {})
            content = message.get("content")

    if not content:
        raise HTTPException(status_code=500, detail="Invalid response from model")

    try:
        parsed = httpx.Response(200, text=content).json()
    except Exception:
        # best-effort: try python eval fallback
        try:
            import json as _json
            parsed = _json.loads(content)
        except Exception:
            raise HTTPException(status_code=500, detail="Model did not return JSON")

    same_entity = bool(parsed.get("same_entity", False))
    inconsistent = bool(parsed.get("inconsistent", False))
    reason = str(parsed.get("reason", ""))

    return ConsistencyResponse(
        same_entity=same_entity, inconsistent=inconsistent, reason=reason
    )
