import logging
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.schemas import ConfigStatusResponse, UpdateAPIKeyRequest
from app.services.sarvam_service import sarvam_service
from app.routes.documents import router as documents_router
from app.routes.voice import router as voice_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("finvoice")

app = FastAPI(
    title="Sarvam FinVoice API",
    description="Voice-Driven Financial Document Digitization platform powered by Sarvam AI SDK (Vision 1.5, Saaras, Bulbul V4)",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes both at root level (/upload, /voice-query, /tts) and /api (/api/upload, etc.)
app.include_router(documents_router)
app.include_router(documents_router, prefix="/api")
app.include_router(voice_router)
app.include_router(voice_router, prefix="/api")

@app.get("/health")
@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "Sarvam FinVoice",
        "has_api_key": sarvam_service.has_client,
        "models": {
            "vision": settings.default_vision_model,
            "stt": settings.default_speech_model,
            "tts": settings.default_tts_model
        }
    }

@app.get("/config", response_model=ConfigStatusResponse)
@app.get("/api/config", response_model=ConfigStatusResponse)
async def get_config():
    return ConfigStatusResponse(
        has_api_key=sarvam_service.has_client,
        default_tts_model=settings.default_tts_model,
        default_speech_model=settings.default_speech_model,
        default_vision_model=settings.default_vision_model,
        default_speaker=settings.default_speaker
    )

@app.post("/config/key")
@app.post("/api/config/key")
async def update_api_key(payload: UpdateAPIKeyRequest):
    if not payload.api_key.strip():
        raise HTTPException(status_code=400, detail="API key cannot be empty.")
    sarvam_service.set_api_key(payload.api_key.strip())
    return {
        "success": True,
        "has_api_key": sarvam_service.has_client,
        "message": "Sarvam AI API key configured successfully."
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
