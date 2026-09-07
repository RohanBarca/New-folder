import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
os.environ['OTP_PROVIDER'] = 'mock'
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
res1 = client.post('/api/auth/mobile/send-otp', json={'phone': '+919876500001'})
print('SEND', res1.status_code, res1.text)
req_id = res1.json()['request_id']
res2 = client.post('/api/auth/mobile/verify-otp', json={'phone': '+919876500001', 'otp': '180706', 'request_id': req_id})
print('VERIFY', res2.status_code, res2.text)
