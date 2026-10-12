"""Regression tests for the auto-approval and dashboard safety fixes."""
from pathlib import Path

import pytest

from app import db
from app.ai.extractor import MockLLMProvider, extract_amount
from app.classifier import classify, model, vec
from app.orchestrator import process
from app.workflows.rules import decide

db.init_db()
POLICY = [{'source': 'data/documents/refund_policy.md'}]


@pytest.mark.parametrize('message', [
    'I want a refund for order #77 of 5000 dollars',
    'Refund order #77, amount: 900 EUR',
    'refund order #1 USD 2500',
    'please refund order #3, total 450',
])
def test_amount_without_dollar_sign_is_not_auto_approved(message):
    result = process(message)
    assert result['status'] == 'REQUIRES_HUMAN_REVIEW'
    assert result['final_action'] is None


@pytest.mark.parametrize('message, expected', [
    ('refund $20', 20.0),
    ('refund 5000 dollars', 5000.0),
    ('amount: 900 EUR', 900.0),
    ('USD 2500', 2500.0),
    ('refund 12,50 €', 12.5),
    ('pay $10 now and $300 later', 300.0),
    ('refund order #12345', None),
    ('refund for order #12345 $20', 20.0),
    ('order 500 arrived broken, refund 30 euros', 30.0),
    ('my agenda 5 days', None),
])
def test_extract_amount(message, expected):
    assert extract_amount(message) == expected


def test_refund_without_amount_requires_review():
    result = process('Please refund order #12345')
    assert result['status'] == 'REQUIRES_HUMAN_REVIEW'
    assert result['reason'] == 'refund amount could not be determined'


@pytest.mark.parametrize('amount', [None, 0])
def test_rules_never_auto_approve_unknown_amount(amount):
    status, _ = decide('refund_request', 0.95, {'order_id': '1', 'amount': amount}, POLICY)
    assert status == 'REQUIRES_HUMAN_REVIEW'


@pytest.mark.parametrize('message', [
    'My account was hacked, refund order #8 $40 urgent',
    'Refund order #8 $40, this was a fraudulent charge',
])
def test_urgent_or_sensitive_refund_requires_review(message):
    assert MockLLMProvider().extract_request(message).urgency == 'high'
    result = process(message)
    assert result['status'] == 'REQUIRES_HUMAN_REVIEW'


def test_urgency_is_checked_before_refund_rules():
    status, reason = decide('refund_request', 0.95, {'order_id': '1', 'amount': 10, 'urgency': 'high'}, POLICY)
    assert status == 'REQUIRES_HUMAN_REVIEW'
    assert 'urgent' in reason


@pytest.mark.parametrize('text', [
    'I want a refund for order #12345 $20',
    'refund?? no, I actually want to report fraud on my card',
    'money back',
])
def test_confidence_is_the_raw_model_probability(text):
    _, confidence = classify(text)
    assert confidence == pytest.approx(float(model.predict_proba(vec.transform([text]))[0].max()))


def test_mixed_request_is_not_confidently_a_refund():
    intent, confidence = classify('my account was hacked, refund order #8')
    assert intent != 'refund_request' or confidence < 0.70


def test_dashboard_never_renders_data_as_html():
    html = (Path(__file__).parents[1] / 'app/static/index.html').read_text(encoding='utf-8')
    assert 'innerHTML' not in html
    assert 'insertAdjacentHTML' not in html
    assert 'onclick=' not in html
    assert 'textContent' in html
