import os
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from fastapi.responses import FileResponse, Response
from app.schemas import UploadResponse, ReceiptData
from app.services.sarvam_service import sarvam_service
from app.services.mock_data import SAMPLE_RECEIPTS, get_sample_receipt_by_id

router = APIRouter(tags=["documents"])

RECEIPTS_DIR = Path(__file__).resolve().parent.parent.parent / "sample_data" / "receipts"

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".pdf", ".svg"}

@router.post("/upload", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...)):
    """
    Accepts an invoice/receipt file (image or PDF).
    Uses Sarvam Vision 1.5 Doc AI to extract structured receipt data according to the schema.
    """
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No file uploaded")
    
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{file_ext}'. Allowed formats: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

    content_type = file.content_type or "application/octet-stream"
    
    try:
        receipt_data, raw_result = await sarvam_service.extract_document(
            file_bytes=file_bytes,
            filename=file.filename,
            content_type=content_type
        )
        return UploadResponse(
            success=True,
            data=receipt_data,
            vendor_name=receipt_data.vendor_name,
            total_amount=receipt_data.total_amount,
            transaction_date=receipt_data.transaction_date,
            items=receipt_data.items,
            message=f"Successfully extracted {len(receipt_data.items)} items from {file.filename}",
            model_used="sarvam-vision-v1",
            raw_result=raw_result
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to process document with Sarvam Vision: {str(e)}"
        )

@router.get("/sample-receipts")
async def get_sample_receipts():
    """Returns pre-loaded regional receipts for instant testing."""
    return SAMPLE_RECEIPTS

@router.get("/sample-receipts/{receipt_id}.svg")
async def get_sample_receipt_image(receipt_id: str):
    """Serves the SVG graphic of a sample regional receipt."""
    file_path = RECEIPTS_DIR / f"{receipt_id}.svg"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Sample receipt image not found")
    return FileResponse(path=file_path, media_type="image/svg+xml")

@router.post("/sample-receipts/{receipt_id}/select", response_model=UploadResponse)
async def select_sample_receipt(receipt_id: str):
    """Simulates selecting and extracting one of the built-in sample receipts."""
    sample = get_sample_receipt_by_id(receipt_id)
    receipt_data = ReceiptData(**sample["data"])
    return UploadResponse(
        success=True,
        data=receipt_data,
        message=f"Loaded {sample['title']} ({sample['region_language']})",
        model_used="sarvam-vision-v1",
        raw_result={"source": "sample", "id": receipt_id}
    )
