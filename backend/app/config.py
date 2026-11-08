import os
from pathlib import Path
from pydantic import BaseModel
from dotenv import load_dotenv

# Load .env file from project or backend directory
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

class Settings(BaseModel):
    sarvam_api_key: str = os.getenv("SARVAM_API_KEY", "")
    default_tts_model: str = "bulbul:v4-flash"
    default_speech_model: str = "saaras:v3"
    default_vision_model: str = "sarvam-vision-v1"
    default_speaker: str = "kavya_hi_conversational"
    default_language_code: str = "hi-IN"
    poll_interval_seconds: float = 2.0
    poll_max_retries: int = 30  # up to 60 seconds

    # Exact required vision extraction schema
    vision_extraction_schema: dict = {
        "type": "object",
        "properties": {
            "vendor_name": {
                "type": "string",
                "description": "Name of the business issuing the receipt."
            },
            "total_amount": {
                "type": "number",
                "description": "Final total invoice amount including taxes."
            },
            "transaction_date": {
                "type": "string",
                "description": "Date of transaction, YYYY-MM-DD."
            },
            "items": {
                "type": "array",
                "description": "List of purchased items.",
                "items": {
                    "type": "object",
                    "properties": {
                        "item_name": {"type": "string"},
                        "price": {"type": "number"}
                    }
                }
            }
        }
    }

settings = Settings()
