import pytest
from app.ai.extractor import ExtractedRequest, MockLLMProvider
from app.ai.rag import DocumentStore, retrieve
from app.workflows.rules import decide
from app.orchestrator import process

def test_structured_extraction_is_validated():
    output = MockLLMProvider().extract_request('Refund order #A-9 for $25', 'cust-9')
    assert isinstance(output, ExtractedRequest)
    assert output.order_id == 'A-9'
    assert output.amount == 25

def test_structured_output_rejects_unexpected_fields():
    with pytest.raises(Exception):
        ExtractedRequest.model_validate({'amount': 10, 'unexpected': True})

def test_rag_loads_documents_and_returns_source():
    hits = retrieve('subscription cancellation')
    assert hits
    assert hits[0]['source'].startswith('data/documents/')
    assert 'Cancellation' in hits[0]['title']

def test_rag_has_no_result_for_unrelated_query():
    assert DocumentStore().retrieve('quantum telescope astrophysics') == []

def test_rules_require_order_for_refund():
    status, reason = decide('refund_request', 0.9, {'amount': 20, 'order_id': None}, [{'source': 'policy'}])
    assert status == 'REQUIRES_HUMAN_REVIEW'
    assert 'order' in reason

def test_rules_require_review_for_low_confidence():
    status, _ = decide('refund_request', 0.1, {'amount': 20, 'order_id': '1'}, [{'source': 'policy'}])
    assert status == 'REQUIRES_HUMAN_REVIEW'

def test_unknown_policy_never_auto_approves():
    status, _ = decide('refund_request', 0.95, {'amount': 20, 'order_id': '1'}, [])
    assert status == 'REQUIRES_HUMAN_REVIEW'

def test_provider_failure_fails_safe(monkeypatch):
    class BrokenProvider:
        def extract_request(self, message, customer_id=None):
            raise TimeoutError('simulated provider timeout')
    monkeypatch.setattr('app.ai.extractor.get_provider', lambda: BrokenProvider())
    workflow = process('I want a refund for order #12345 $20')
    assert workflow['status'] == 'REQUIRES_HUMAN_REVIEW'
    assert workflow['final_action'] is None
