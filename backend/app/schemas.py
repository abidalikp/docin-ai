from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field

class ReceiptItem(BaseModel):
    item_name: str = Field(..., description="Name of the purchased item")
    price: float = Field(..., description="Item price")

class ReceiptData(BaseModel):
    vendor_name: str = Field(default="", description="Name of the business issuing the receipt.")
    total_amount: float = Field(default=0.0, description="Final total invoice amount including taxes.")
    transaction_date: str = Field(default="", description="Date of transaction, YYYY-MM-DD.")
    items: List[ReceiptItem] = Field(default_factory=list, description="List of purchased items.")

class UploadResponse(BaseModel):
    success: bool = True
    data: ReceiptData
    vendor_name: Optional[str] = None
    total_amount: Optional[float] = None
    transaction_date: Optional[str] = None
    items: Optional[List[ReceiptItem]] = None
    message: str = "Extraction completed successfully"
    model_used: str = "sarvam-vision-v1"
    raw_result: Optional[Dict[str, Any]] = None

class VoiceQueryRequest(BaseModel):
    text_query: Optional[str] = None
    query: Optional[str] = None
    document_data: Optional[ReceiptData] = None
    language_code: Optional[str] = "en-IN"
    speaker: Optional[str] = "kavya_hi_conversational"

class VoiceQueryResponse(BaseModel):
    success: bool = True
    transcript: str
    answer: str
    response: Optional[str] = None
    audio_base64: Optional[str] = None
    language_code: str = "en-IN"
    intent: Optional[str] = None

class TTSRequest(BaseModel):
    text: Optional[str] = None
    input: Optional[str] = None
    query: Optional[str] = None
    language_code: Optional[str] = "hi-IN"
    speaker: Optional[str] = "kavya_hi_conversational"
    model: Optional[str] = "bulbul:v4-flash"

class TTSResponse(BaseModel):
    success: bool = True
    audio_base64: str
    audio_format: str = "mp3"
    message: Optional[str] = None

class ConfigStatusResponse(BaseModel):
    has_api_key: bool
    default_tts_model: str
    default_speech_model: str
    default_vision_model: str
    default_speaker: str

class UpdateAPIKeyRequest(BaseModel):
    api_key: str

