import os
import json
import asyncio
import base64
import logging
from typing import Dict, Any, Optional, Tuple
from io import BytesIO

from app.config import settings
from app.schemas import ReceiptData, ReceiptItem, VoiceQueryResponse
from app.services.mock_data import SAMPLE_RECEIPTS

logger = logging.getLogger(__name__)

class SarvamAIService:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.sarvam_api_key
        self._client = None
        self._init_client()

    def _init_client(self):
        if self.api_key and self.api_key.strip():
            try:
                from sarvamai import SarvamAI
                self._client = SarvamAI(api_subscription_key=self.api_key.strip())
                logger.info("SarvamAI client initialized with API key.")
            except Exception as e:
                logger.error(f"Failed to initialize SarvamAI client: {e}")
                self._client = None
        else:
            self._client = None
            logger.info("No Sarvam API key provided. Running in demo/mock fallback mode.")

    def set_api_key(self, api_key: str):
        self.api_key = api_key
        self._init_client()

    @property
    def has_client(self) -> bool:
        return self._client is not None

    async def extract_document(self, file_bytes: bytes, filename: str, content_type: str) -> Tuple[ReceiptData, Dict[str, Any]]:
        """
        Extracts structured financial receipt data using Sarvam Vision 1.5 Doc AI.
        Passes the required exact schema via json.dumps() to client.doc_ai.extract.
        """
        schema_json_string = json.dumps(settings.vision_extraction_schema)

        if self.has_client:
            try:
                logger.info(f"Submitting Document AI extraction job for {filename} with schema...")
                # client.doc_ai.extract accepts a file tuple list: [(filename, file_bytes, content_type)]
                file_payload = [(filename, file_bytes, content_type)]
                
                # Run synchronous SDK call in threadpool
                loop = asyncio.get_event_loop()
                job = await loop.run_in_executor(
                    None,
                    lambda: self._client.doc_ai.extract(
                        file=file_payload,
                        schema=schema_json_string,
                        output_format="json",
                        model=settings.default_vision_model
                    )
                )

                job_id = getattr(job, "job_id", None)
                if not job_id:
                    raise ValueError(f"No job_id returned by Sarvam Doc AI: {job}")

                logger.info(f"Job initiated with ID: {job_id}. Polling for completion...")

                # Poll job status
                for attempt in range(settings.poll_max_retries):
                    await asyncio.sleep(settings.poll_interval_seconds)
                    status_res = await loop.run_in_executor(
                        None,
                        lambda: self._client.doc_ai.get_status(job_id=job_id)
                    )
                    status = getattr(status_res, "status", "").lower()
                    logger.debug(f"Job {job_id} status (attempt {attempt+1}): {status}")

                    if status in ["completed", "success"]:
                        # Fetch results
                        results_res = await loop.run_in_executor(
                            None,
                            lambda: self._client.doc_ai.get_results(job_id=job_id)
                        )
                        raw_result = getattr(results_res, "result", {})
                        if isinstance(raw_result, str):
                            try:
                                raw_result = json.loads(raw_result)
                            except Exception:
                                pass

                        logger.info(f"Extraction successful: {raw_result}")
                        receipt_data = self._parse_to_receipt_data(raw_result)
                        return receipt_data, {"job_id": job_id, "raw": raw_result}

                    elif status in ["failed", "rejected"]:
                        error_msg = getattr(status_res, "error", f"Document AI job {status}")
                        raise ValueError(f"Sarvam Vision extraction failed: {error_msg}")

                raise TimeoutError("Timed out waiting for Sarvam Doc AI extraction job.")

            except Exception as e:
                logger.error(f"Error calling Sarvam Vision API: {e}. Falling back gracefully.", exc_info=True)
                # Fallback to realistic extraction
                return self._fallback_extraction(filename, str(e))
        else:
            return self._fallback_extraction(filename, "Offline / Demo mode (No API Key set)")

    def _parse_to_receipt_data(self, raw: Any) -> ReceiptData:
        if isinstance(raw, dict):
            # Sometimes Sarvam nests under data or output
            data_dict = raw.get("data", raw)
            vendor_name = str(data_dict.get("vendor_name") or "Unknown Vendor")
            try:
                total_amount = float(data_dict.get("total_amount") or 0.0)
            except (ValueError, TypeError):
                total_amount = 0.0
            
            transaction_date = str(data_dict.get("transaction_date") or "")
            raw_items = data_dict.get("items") or []
            items = []
            for item in raw_items:
                if isinstance(item, dict):
                    name = str(item.get("item_name") or "Item")
                    try:
                        price = float(item.get("price") or 0.0)
                    except (ValueError, TypeError):
                        price = 0.0
                    items.append(ReceiptItem(item_name=name, price=price))

            return ReceiptData(
                vendor_name=vendor_name,
                total_amount=total_amount,
                transaction_date=transaction_date,
                items=items
            )
        return ReceiptData(vendor_name="Scanned Merchant", total_amount=0.0, transaction_date="", items=[])

    def _fallback_extraction(self, filename: str, reason: str) -> Tuple[ReceiptData, Dict[str, Any]]:
        # Match against sample receipts based on filename
        lower_name = filename.lower()
        if "tamil" in lower_name or "balaji" in lower_name:
            sample = SAMPLE_RECEIPTS[1]
        elif "kannada" in lower_name or "bangalore" in lower_name or "shanthi" in lower_name:
            sample = SAMPLE_RECEIPTS[2]
        else:
            sample = SAMPLE_RECEIPTS[0]

        receipt = ReceiptData(
            vendor_name=sample["data"]["vendor_name"],
            total_amount=sample["data"]["total_amount"],
            transaction_date=sample["data"]["transaction_date"],
            items=[ReceiptItem(**item) for item in sample["data"]["items"]]
        )
        return receipt, {"mode": "demo_fallback", "reason": reason, "sample_matched": sample["id"]}

    async def transcribe_audio(self, audio_bytes: bytes, filename: str = "audio.wav") -> Tuple[str, str]:
        """
        Transcribes speech using Sarvam Saaras model via client.speech_to_text.transcribe.
        Returns (transcript, detected_language_code).
        """
        if self.has_client:
            try:
                loop = asyncio.get_event_loop()
                # Pass file as tuple (filename, bytes) or BytesIO
                file_obj = BytesIO(audio_bytes)
                file_obj.name = filename

                response = await loop.run_in_executor(
                    None,
                    lambda: self._client.speech_to_text.transcribe(
                        file=file_obj,
                        model=settings.default_speech_model,
                        mode="transcribe"
                    )
                )
                transcript = getattr(response, "transcript", "") or ""
                lang = getattr(response, "language_code", "en-IN") or "en-IN"
                return transcript.strip(), lang
            except Exception as e:
                logger.error(f"Sarvam Speech-to-text error: {e}", exc_info=True)
                return "", "en-IN"
        return "", "en-IN"

    async def answer_query(self, query: str, document_data: ReceiptData, language_code: str = "en-IN") -> str:
        """
        Answers a voice or text query against the extracted document JSON.
        Uses Sarvam Chat completion when available, or semantic fallback.
        """
        if self.has_client:
            try:
                loop = asyncio.get_event_loop()
                system_prompt = (
                    "You are a helpful financial document assistant. "
                    "Answer questions strictly and concisely based on the following extracted receipt data:\n"
                    f"Vendor: {document_data.vendor_name}\n"
                    f"Date: {document_data.transaction_date}\n"
                    f"Total Amount: ₹{document_data.total_amount}\n"
                    f"Items:\n" + "\n".join([f"- {it.item_name}: ₹{it.price}" for it in document_data.items]) + "\n\n"
                    "Keep answers brief (1-2 sentences), clear, and suitable for Text-to-Speech playback."
                )

                response = await loop.run_in_executor(
                    None,
                    lambda: self._client.chat.completions(
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": query}
                        ],
                        max_tokens=150,
                        temperature=0.3
                    )
                )
                if response and hasattr(response, "choices") and response.choices:
                    answer = response.choices[0].message.content or ""
                    if answer.strip():
                        return answer.strip()
            except Exception as e:
                logger.warning(f"Sarvam Chat completion fallback triggered: {e}")

        # High-precision semantic rule-based fallback
        return self._semantic_answer(query, document_data)

    def _semantic_answer(self, query: str, data: ReceiptData) -> str:
        q = query.lower()

        # Total amount query
        if any(w in q for w in ["total", "amount", "cost", "bill", "how much", "कुल", "राशि", "மொத்த", "தொகை", "ಒಟ್ಟು", "ಮೊತ್ತ"]):
            return f"The total amount for {data.vendor_name} is ₹{data.total_amount:,.2f}."

        # Vendor query
        if any(w in q for w in ["vendor", "store", "shop", "merchant", "who", "business", "दुकान", "विक्रेता", "கடை", "ಅಂಗಡಿ"]):
            return f"The receipt is from {data.vendor_name}."

        # Date query
        if any(w in q for w in ["date", "when", "day", "time", "दिनांक", "तारीख", "தேதி", "ದಿನಾಂಕ"]):
            return f"The transaction date is {data.transaction_date}."

        # Item list query
        if any(w in q for w in ["items", "what was bought", "products", "purchased", "list", "सामान", "चीजें", "பொருட்கள்", "ವಸ್ತು"]):
            if not data.items:
                return "There are no items recorded in this receipt."
            items_str = ", ".join([f"{it.item_name} for ₹{it.price:g}" for it in data.items])
            return f"This receipt has {len(data.items)} items: {items_str}."

        # Expensive item query
        if any(w in q for w in ["expensive", "highest", "costliest", "maximum", "महंगा", "அதிக விலை", "ದುಬಾರಿ"]):
            if not data.items:
                return "No items to compare."
            max_item = max(data.items, key=lambda x: x.price)
            return f"The most expensive item is {max_item.item_name} priced at ₹{max_item.price:g}."

        # Cheapest item query
        if any(w in q for w in ["cheapest", "lowest", "minimum", "सस्ता", "குறைந்த", "ಕಡಿಮೆ"]):
            if not data.items:
                return "No items to compare."
            min_item = min(data.items, key=lambda x: x.price)
            return f"The cheapest item is {min_item.item_name} priced at ₹{min_item.price:g}."

        # Specific item search in receipt
        for it in data.items:
            # Check individual tokens from item name
            tokens = [t.lower() for t in it.item_name.replace("(", " ").replace(")", " ").split() if len(t) > 2]
            if any(token in q for token in tokens):
                return f"{it.item_name} costs ₹{it.price:g}."

        # Default fallback answer
        return (
            f"This receipt is from {data.vendor_name} on {data.transaction_date} "
            f"for a total of ₹{data.total_amount:,.2f} across {len(data.items)} items."
        )

    def _generate_tone_wav_base64(self, duration_s: float = 0.5, freq: float = 520.0) -> str:
        import wave
        import struct
        import math
        buf = BytesIO()
        with wave.open(buf, 'wb') as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(24000)
            n_samples = int(duration_s * 24000)
            for i in range(n_samples):
                envelope = min(i / 1000.0, (n_samples - i) / 1000.0, 1.0)
                sample = int(32767.0 * 0.25 * envelope * math.sin(2.0 * math.pi * freq * i / 24000))
                wav_file.writeframes(struct.pack('<h', sample))
        return base64.b64encode(buf.getvalue()).decode('ascii')

    async def text_to_speech(
        self,
        text: str,
        language_code: Optional[str] = None,
        speaker: Optional[str] = None
    ) -> Optional[str]:
        """
        Synthesizes speech using Sarvam Bulbul V4 model via client.text_to_speech.convert.
        Returns base64 encoded audio string.
        """
        lang = language_code or settings.default_language_code
        spk = speaker or settings.default_speaker

        if self.has_client:
            try:
                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(
                    None,
                    lambda: self._client.text_to_speech.convert(
                        text=text,
                        language_code=lang,
                        speaker=spk,
                        model=settings.default_tts_model,
                        output_audio_codec="mp3"
                    )
                )
                if response and hasattr(response, "audios") and response.audios:
                    return response.audios[0]
            except Exception as e:
                logger.error(f"Sarvam Bulbul TTS error: {e}", exc_info=True)
                return self._generate_tone_wav_base64()
        
        # Demo / fallback valid audio buffer
        return self._generate_tone_wav_base64()

# Singleton instance
sarvam_service = SarvamAIService()

