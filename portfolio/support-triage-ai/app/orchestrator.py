import time, uuid
from . import db
from .classifier import classify
from .llm import extract
from .rag import retrieve
from .rules import decide
from .actions import execute
from .security import contains_prompt_injection, safe_metadata

def _event(wid,event_type,component,status='recorded',**metadata): db.add_audit(wid,component,event_type,component=component,status=status,metadata=metadata)
def process(message,customer_id=None):
    workflow_id=str(uuid.uuid4()); db.create_workflow({'id':workflow_id,'customer_id':customer_id,'original_request':message,'status':'RECEIVED'}); _event(workflow_id,'REQUEST_RECEIVED','api',message_length=len(message)); started=time.perf_counter()
    try:
        if contains_prompt_injection(message):
            db.transition_workflow(workflow_id,'REQUIRES_HUMAN_REVIEW',reason='untrusted instruction-like content detected',proposed_action='human_review'); _event(workflow_id,'PROMPT_INJECTION_DETECTED','security',status='blocked'); _event(workflow_id,'HUMAN_REVIEW_REQUIRED','workflow',reason='security review required'); return db.get_workflow(workflow_id)
        intent,confidence=classify(message); _event(workflow_id,'CLASSIFICATION_COMPLETED','classifier',intent=intent,confidence=round(confidence,4))
        extracted=extract(message,customer_id); _event(workflow_id,'EXTRACTION_COMPLETED','extractor',fields=list(extracted.keys()))
        sources=retrieve(message); _event(workflow_id,'RAG_RETRIEVAL_COMPLETED','rag',source_count=len(sources))
        db.transition_workflow(workflow_id,'CLASSIFIED',intent=intent,confidence=confidence,extracted=extracted,sources=sources)
        status,reason=decide(intent,confidence,extracted,sources); proposed='execute_simulated_action' if status=='AUTO_APPROVED' else 'human_review'; db.transition_workflow(workflow_id,status,proposed_action=proposed,reason=reason); _event(workflow_id,'RULE_EVALUATION_COMPLETED','rules',decision=status,reason=reason)
        if status=='REQUIRES_HUMAN_REVIEW': _event(workflow_id,'HUMAN_REVIEW_REQUIRED','workflow',reason=reason); return db.get_workflow(workflow_id)
        final_action=execute(intent,extracted); _event(workflow_id,'ACTION_EXECUTED','mock_adapter',action_type=final_action.get('type')); db.transition_workflow(workflow_id,'COMPLETED',final_action=final_action); _event(workflow_id,'WORKFLOW_COMPLETED','workflow',duration_ms=round((time.perf_counter()-started)*1000,3)); return db.get_workflow(workflow_id)
    except Exception as error:
        safe_reason='AI/provider failure; no action executed'
        try:
            current=db.get_workflow(workflow_id)
            if current and current['status'] not in {'REQUIRES_HUMAN_REVIEW','FAILED','COMPLETED','REJECTED'}: db.transition_workflow(workflow_id,'REQUIRES_HUMAN_REVIEW',reason=safe_reason,proposed_action='human_review')
            _event(workflow_id,'ACTION_FAILED','workflow',status='error',error=type(error).__name__,message=safe_metadata(error)); _event(workflow_id,'HUMAN_REVIEW_REQUIRED','workflow',reason=safe_reason)
        except Exception: pass
        return db.get_workflow(workflow_id)
