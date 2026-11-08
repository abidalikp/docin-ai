import json
import base64
import logging
from typing import Optional
from fastapi import APIRouter, Request, UploadFile, File, Form, HTTPException, Response, status
from app.schemas import VoiceQueryResponse, TTSRequest, TTSResponse, ReceiptData
from app.services.sarvam_service import sarvam_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["voice"])

@router.post("/voice-query", response_model=VoiceQueryResponse)
async def voice_query(
    request: Request,
    audio: Optional[UploadFile] = File(None),
    text_query: Optional[str] = Form(None),
    document_data: Optional[str] = Form(None),
    language_code: Optional[str] = Form("en-IN"),
    speaker: Optional[str] = Form("kavya_hi_conversational")
):
    """
    Accepts raw audio (WebRTC/Blob) or transcribed text, processes the intent
    against the current document JSON, and returns a spoken response with Bulbul V4 audio.
    Supports both multipart/form-data and application/json requests.
    """
    content_type = request.headers.get("content-type", "").lower()
    resolved_query = ""
    detected_lang = language_code or "en-IN"
    resolved_speaker = speaker or "kavya_hi_conversational"
    doc_dict = None

    if "application/json" in content_type:
        try:
            body = await request.json()
        except Exception:
            body = {}

        resolved_query = str(body.get("text_query") or body.get("query") or body.get("transcript") or "").strip()
        doc_dict = body.get("document_data")
        detected_lang = body.get("language_code") or detected_lang
        resolved_speaker = body.get("speaker") or resolved_speaker

        # Audio can be passed as base64 in json
        if "audio_base64" in body and body["audio_base64"]:
            try:
                audio_bytes = base64.b64decode(body["audio_base64"])
                transcript, lang = await sarvam_service.transcribe_audio(
                    audio_bytes=audio_bytes,
                    filename="query_audio.wav"
                )
                if transcript:
                    resolved_query = transcript
                if lang and lang != "unknown":
                    detected_lang = lang
            except Exception as e:
                logger.warning(f"Failed to decode audio_base64 from JSON: {e}")

    else:
        # Form / Multipart request
        if document_data:
            try:
                doc_dict = json.loads(document_data)
            except Exception:
                pass

        # Audio file provided
        if audio is not None:
            try:
                audio_bytes = await audio.read()
                if len(audio_bytes) > 0:
                    transcript, lang = await sarvam_service.transcribe_audio(
                        audio_bytes=audio_bytes,
                        filename=audio.filename or "recording.webm"
                    )
                    if transcript:
                        resolved_query = transcript
                    if lang and lang != "unknown":
                        detected_lang = lang
            except Exception as e:
                logger.warning(f"Error reading audio upload: {e}")

        if not resolved_query and text_query:
            resolved_query = text_query.strip()

    # Parse or default receipt data
    if isinstance(doc_dict, dict):
        try:
            receipt_data = ReceiptData(**doc_dict)
        except Exception:
            receipt_data = ReceiptData()
    elif isinstance(doc_dict, str):
        try:
            receipt_data = ReceiptData(**json.loads(doc_dict))
        except Exception:
            receipt_data = ReceiptData()
    else:
        receipt_data = ReceiptData(
            vendor_name="Shree Ganesh Kirana Store",
            total_amount=1475.0,
            transaction_date="2024-10-14",
            items=[]
        )

    if not resolved_query:
        resolved_query = "What is the total amount?"

    # Step 3: Process the intent against the extracted JSON
    answer_text = await sarvam_service.answer_query(
        query=resolved_query,
        document_data=receipt_data,
        language_code=detected_lang
    )

    # Step 4: Synthesize answer with Sarvam Bulbul V4
    audio_base64 = await sarvam_service.text_to_speech(
        text=answer_text,
        language_code=detected_lang,
        speaker=resolved_speaker
    )

    return VoiceQueryResponse(
        success=True,
        transcript=resolved_query,
        answer=answer_text,
        response=answer_text,
        audio_base64=audio_base64,
        language_code=detected_lang,
        intent="document_interrogation"
    )

@router.post("/tts", response_model=TTSResponse)
async def text_to_speech_endpoint(
    request: Request,
    payload: Optional[TTSRequest] = None
):
    """
    Accepts arbitrary text and uses Sarvam's Bulbul V4 API to return spoken audio.
    Supports JSON, Form, and raw audio streaming based on Accept header.
    """
    text = ""
    language_code = "hi-IN"
    speaker = "kavya_hi_conversational"

    if payload and (payload.text or payload.input or payload.query):
        text = (payload.text or payload.input or payload.query or "").strip()
        language_code = payload.language_code or language_code
        speaker = payload.speaker or speaker
    else:
        content_type = request.headers.get("content-type", "").lower()
        if "application/json" in content_type:
            try:
                body = await request.json()
                text = str(body.get("text") or body.get("input") or body.get("query") or "").strip()
                language_code = body.get("language_code") or language_code
                speaker = body.get("speaker") or speaker
            except Exception:
                pass
        elif "form" in content_type:
            try:
                form = await request.form()
                text = str(form.get("text") or form.get("input") or form.get("query") or "").strip()
                language_code = str(form.get("language_code") or language_code)
                speaker = str(form.get("speaker") or speaker)
            except Exception:
                pass

    if not text:
        text = "Welcome to the Voice Driven Financial Digitization Platform."

    audio_base64 = await sarvam_service.text_to_speech(
        text=text,
        language_code=language_code,
        speaker=speaker
    )

    # If client requested audio binary directly
    accept_header = request.headers.get("accept", "").lower()
    if "audio/" in accept_header and audio_base64:
        try:
            binary_audio = base64.b64decode(audio_base64)
            return Response(content=binary_audio, media_type="audio/mpeg")
        except Exception:
            pass

    return TTSResponse(
        success=True,
        audio_base64=audio_base64 or "",
        audio_format="mp3",
        message="Synthesized with Sarvam Bulbul V4"
    )
