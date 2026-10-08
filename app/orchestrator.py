import uuid
from . import db
from .classifier import classify
from .llm import extract
from .rag import retrieve
from .rules import decide
from .actions import execute

def process(message, customer_id=None):
    workflow_id = str(uuid.uuid4())
    db.create_workflow({'id': workflow_id, 'customer_id': customer_id, 'original_request': message, 'status': 'RECEIVED'})
    db.add_audit(workflow_id, 'system', 'REQUEST_RECEIVED', 'Request accepted and validated')
    try:
        intent, confidence = classify(message)
        db.add_audit(workflow_id, 'classifier', 'CLASSIFICATION_COMPLETED', f'intent={intent}; confidence={confidence:.4f}')
        extracted = extract(message, customer_id)
        db.add_audit(workflow_id, 'extractor', 'EXTRACTION_COMPLETED', 'Structured extraction validated with Pydantic')
        sources = retrieve(message)
        db.update_workflow(workflow_id, status='CLASSIFIED', intent=intent, confidence=confidence, extracted=extracted, sources=sources)
        db.add_audit(workflow_id, 'rag', 'RAG_RETRIEVAL_COMPLETED', f'sources={len(sources)}')
        status, reason = decide(intent, confidence, extracted, sources)
        proposed = 'execute_simulated_action' if status == 'AUTO_APPROVED' else 'human_review'
        db.update_workflow(workflow_id, status=status, proposed_action=proposed, reason=reason)
        db.add_audit(workflow_id, 'rules', 'RULE_EVALUATION_COMPLETED', reason)
        if status == 'REQUIRES_HUMAN_REVIEW':
            db.add_audit(workflow_id, 'workflow', 'HUMAN_REVIEW_REQUIRED', reason)
        if status == 'AUTO_APPROVED':
            final_action = execute(intent, extracted)
            db.update_workflow(workflow_id, status='COMPLETED', final_action=final_action)
            db.add_audit(workflow_id, 'mock_adapter', 'ACTION_EXECUTED', 'Simulated enterprise action executed')
            db.add_audit(workflow_id, 'workflow', 'WORKFLOW_COMPLETED', 'Workflow completed automatically')
        return db.get_workflow(workflow_id)
    except Exception as error:
        db.update_workflow(workflow_id, status='REQUIRES_HUMAN_REVIEW', reason='AI/provider failure; no action executed')
        db.add_audit(workflow_id, 'workflow', 'ACTION_FAILED', f'{type(error).__name__}: processing stopped safely')
        db.add_audit(workflow_id, 'workflow', 'HUMAN_REVIEW_REQUIRED', 'Provider failure requires human review')
        return db.get_workflow(workflow_id)
