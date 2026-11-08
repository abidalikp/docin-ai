import io
import json
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    res = client.get('/health')
    assert res.status_code == 200
    data = res.json()
    assert data['status'] == 'healthy'
    assert 'models' in data

    # Test alias /api/health
    res_api = client.get('/api/health')
    assert res_api.status_code == 200
    assert res_api.json()['status'] == 'healthy'

def test_config():
    res = client.get('/config')
    assert res.status_code == 200
    data = res.json()
    assert 'has_api_key' in data
    assert 'default_vision_model' in data

def test_sample_receipts():
    res = client.get('/sample-receipts')
    assert res.status_code == 200
    samples = res.json()
    assert isinstance(samples, list)
    assert len(samples) >= 3

    sample = samples[0]
    assert 'id' in sample
    assert 'data' in sample
    assert 'vendor_name' in sample['data']
    assert 'total_amount' in sample['data']
    assert 'transaction_date' in sample['data']
    assert 'items' in sample['data']

def test_upload_document_image():
    fake_png = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
    files = {'file': ('kirana_receipt.png', io.BytesIO(fake_png), 'image/png')}
    
    res = client.post('/upload', files=files)
    assert res.status_code == 200
    json_data = res.json()
    assert json_data['success'] is True
    assert 'data' in json_data
    
    receipt = json_data['data']
    assert isinstance(receipt['vendor_name'], str)
    assert isinstance(receipt['total_amount'], (int, float))
    assert isinstance(receipt['transaction_date'], str)
    assert isinstance(receipt['items'], list)
    if receipt['items']:
        item = receipt['items'][0]
        assert 'item_name' in item
        assert 'price' in item

    files2 = {'file': ('receipt.png', io.BytesIO(fake_png), 'image/png')}
    res2 = client.post('/api/upload', files=files2)
    assert res2.status_code == 200

def test_voice_query_json():
    payload = {
        'text_query': 'What is the total amount?',
        'document_data': {
            'vendor_name': 'Shree Ganesh Kirana',
            'total_amount': 1475.0,
            'transaction_date': '2024-10-14',
            'items': [
                {'item_name': 'Tata Salt', 'price': 28.0}
            ]
        },
        'language_code': 'en-IN',
        'speaker': 'kavya_hi_conversational'
    }

    res = client.post('/voice-query', json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data['success'] is True
    assert '1,475' in data['answer'] or '1475' in data['answer']
    assert data['audio_base64'] is not None
    assert len(data['audio_base64']) > 0

    res2 = client.post('/api/voice-query', json=payload)
    assert res2.status_code == 200

def test_voice_query_form():
    form_data = {
        'text_query': 'Who is the vendor?',
        'document_data': json.dumps({
            'vendor_name': 'Sri Balaji Bhavan Cafe',
            'total_amount': 545.0,
            'transaction_date': '2024-10-15',
            'items': []
        }),
        'language_code': 'en-IN'
    }
    res = client.post('/voice-query', data=form_data)
    assert res.status_code == 200
    data = res.json()
    assert data['success'] is True
    assert 'Balaji' in data['answer']

def test_tts_endpoint():
    payload = {
        'text': 'Your total is ₹1,475.',
        'language_code': 'hi-IN',
        'speaker': 'kavya_hi_conversational'
    }

    res = client.post('/tts', json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data['success'] is True
    assert data['audio_base64'] is not None
    assert len(data['audio_base64']) > 0

    res2 = client.post('/api/tts', json=payload)
    assert res2.status_code == 200

    res_audio = client.post('/tts', json=payload, headers={'Accept': 'audio/mpeg'})
    assert res_audio.status_code == 200
    assert len(res_audio.content) > 0

if __name__ == "__main__":
    print("Running test_health...")
    test_health()
    print("Running test_config...")
    test_config()
    print("Running test_sample_receipts...")
    test_sample_receipts()
    print("Running test_upload_document_image...")
    test_upload_document_image()
    print("Running test_voice_query_json...")
    test_voice_query_json()
    print("Running test_voice_query_form...")
    test_voice_query_form()
    print("Running test_tts_endpoint...")
    test_tts_endpoint()
    print("\n>>> ALL BACKEND API TESTS PASSED SUCCESSFULLY! <<<")
