import json
from typing import List, Dict, Any
from app.schemas import ReceiptData, ReceiptItem

SAMPLE_RECEIPTS: List[Dict[str, Any]] = [
    {
        "id": "kirana_hindi",
        "title": "Shree Ganesh Kirana Store",
        "region_language": "Hindi (उत्तर भारत)",
        "language_code": "hi-IN",
        "description": "Regional grocery receipt from Varanasi with Hindi/English billing.",
        "image_url": "/api/sample-receipts/kirana_hindi.svg",
        "data": {
            "vendor_name": "Shree Ganesh Kirana Store",
            "total_amount": 1475.0,
            "transaction_date": "2024-10-14",
            "items": [
                {"item_name": "आशीर्वाद आटा (Aashirvaad Atta 5kg)", "price": 280.0},
                {"item_name": "फॉर्च्यून सरसों तेल (Fortune Mustard Oil 1L)", "price": 165.0},
                {"item_name": "टाटा नमक (Tata Salt 1kg)", "price": 28.0},
                {"item_name": "इंडिया गेट बासमती चावल (India Gate Basmati Rice 5kg)", "price": 590.0},
                {"item_name": "ताज महल चाय (Taj Mahal Tea 500g)", "price": 310.0},
                {"item_name": "हल्दी और मसाला (Spices Pack)", "price": 102.0}
            ]
        }
    },
    {
        "id": "madras_cafe_tamil",
        "title": "Sri Balaji Bhavan Cafe",
        "region_language": "Tamil (தமிழ்நாடு)",
        "language_code": "ta-IN",
        "description": "Authentic South Indian restaurant bill in Tamil script & English.",
        "image_url": "/api/sample-receipts/madras_cafe_tamil.svg",
        "data": {
            "vendor_name": "Sri Balaji Bhavan Restaurant",
            "total_amount": 545.0,
            "transaction_date": "2024-10-15",
            "items": [
                {"item_name": "நெய் ரோஸ்ட் தோசை (Ghee Roast Dosa)", "price": 120.0},
                {"item_name": "மசால் வடை (Special Masala Vada 2pc)", "price": 75.0},
                {"item_name": "பில்டர் காபி (Madras Filter Coffee x2)", "price": 90.0},
                {"item_name": "மினி டிபன் காம்போ (Mini Tiffin Combo)", "price": 180.0},
                {"item_name": "ரவா கேசரி (Rava Kesari)", "price": 80.0}
            ]
        }
    },
    {
        "id": "bangalore_retail_kannada",
        "title": "Shanthi Sagar Provisions",
        "region_language": "Kannada (ಕರ್ನಾಟಕ)",
        "language_code": "kn-IN",
        "description": "Bengaluru retail store invoice with Kannada header & item list.",
        "image_url": "/api/sample-receipts/bangalore_retail_kannada.svg",
        "data": {
            "vendor_name": "Shanthi Sagar Super Store",
            "total_amount": 2150.0,
            "transaction_date": "2024-10-16",
            "items": [
                {"item_name": "ಸೋನಾ ಮಸೂರಿ ಅಕ್ಕಿ (Sona Masoori Rice 10kg)", "price": 750.0},
                {"item_name": "ತೊಗರಿ ಬೇಳೆ (Toor Dal 2kg)", "price": 360.0},
                {"item_name": "ನಂದಿನಿ ತುಪ್ಪ (Nandini Pure Ghee 500ml)", "price": 340.0},
                {"item_name": "ಬಾದಾಮಿ ಗೋಡಂಬಿ (Almonds & Cashews 500g)", "price": 550.0},
                {"item_name": "ಏಲಕ್ಕಿ ಮತ್ತು ಲವಂಗ (Spices Pack)", "price": 150.0}
            ]
        }
    }
]

def get_sample_receipt_by_id(receipt_id: str) -> Dict[str, Any]:
    for receipt in SAMPLE_RECEIPTS:
        if receipt["id"] == receipt_id:
            return receipt
    return SAMPLE_RECEIPTS[0]
