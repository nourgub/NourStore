import os
os.environ['DATABASE_URL']='sqlite:///./test_enterprise.db'
from fastapi.testclient import TestClient
from app.main import app
client=TestClient(app)
def test_health(): assert client.get('/health').status_code==200
def test_refund_completes():
 r=client.post('/requests',json={'message':'I want a refund for order #12345 $20','customer_id':'cust-1'}); assert r.status_code==201; assert r.json()['status']=='COMPLETED'
def test_cancellation_requires_review_and_can_reject():
 r=client.post('/requests',json={'message':'Please cancel my subscription'}); assert r.json()['status']=='REQUIRES_HUMAN_REVIEW'; wid=r.json()['id']; out=client.post(f'/workflows/{wid}/reject',json={'reviewer':'tester','note':'policy review'}); assert out.json()['status']=='REJECTED'
def test_over_limit_requires_review():
 r=client.post('/requests',json={'message':'Refund order #1 $500'}); assert r.json()['status']=='REQUIRES_HUMAN_REVIEW'
def test_missing_request_rejected(): assert client.post('/requests',json={}).status_code==422
def test_audit_exists():
 r=client.post('/requests',json={'message':'Where is my order #9?'}).json(); assert len(client.get('/audit/'+r['id']).json())>=2
