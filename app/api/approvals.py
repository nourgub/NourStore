from fastapi import APIRouter, HTTPException
from .. import db
from ..schemas import ReviewIn, WorkflowOut
router=APIRouter()
def review(wid, body, approve):
    workflow=db.get_workflow(wid)
    if not workflow: raise HTTPException(status_code=404, detail='Workflow not found')
    if workflow['status']!='REQUIRES_HUMAN_REVIEW': raise HTTPException(status_code=409, detail='Workflow is not awaiting human review')
    try:
        if approve:
            db.transition_workflow(wid,'APPROVED_BY_HUMAN',final_action={'action_id':'human-approved','type':'approved_by_human','note':body.note})
            db.add_audit(wid,body.reviewer,'HUMAN_APPROVED',component='human_review',metadata={'reviewer':body.reviewer})
            db.transition_workflow(wid,'COMPLETED')
            db.add_audit(wid,body.reviewer,'WORKFLOW_COMPLETED',component='workflow',metadata={'reviewer':body.reviewer})
        else:
            db.transition_workflow(wid,'REJECTED',final_action={'type':'rejected','note':body.note})
            db.add_audit(wid,body.reviewer,'REJECTED',component='human_review',metadata={'reviewer':body.reviewer})
    except ValueError as exc: raise HTTPException(status_code=409, detail=str(exc)) from exc
    return db.get_workflow(wid)
@router.post('/workflows/{wid}/approve', response_model=WorkflowOut)
def approve(wid:str, body:ReviewIn): return review(wid,body,True)
@router.post('/workflows/{wid}/reject', response_model=WorkflowOut)
def reject(wid:str, body:ReviewIn): return review(wid,body,False)
