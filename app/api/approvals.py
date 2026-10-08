from fastapi import APIRouter,HTTPException
from .. import db
from ..schemas import ReviewIn
router=APIRouter()
def review(wid,body,approve):
 w=db.get_workflow(wid)
 if not w:raise HTTPException(404,'Workflow not found')
 if w['status']!='REQUIRES_HUMAN_REVIEW':raise HTTPException(409,'Workflow is not awaiting human review')
 if approve:
  db.update_workflow(wid,status='APPROVED_BY_HUMAN',final_action={'action_id':'human-approved','type':'approved_by_human','note':body.note});db.add_audit(wid,body.reviewer,'APPROVED_BY_HUMAN',body.note);db.update_workflow(wid,status='COMPLETED');db.add_audit(wid,body.reviewer,'COMPLETED','Human-approved simulated action completed')
 else:db.update_workflow(wid,status='REJECTED',final_action={'type':'rejected','note':body.note});db.add_audit(wid,body.reviewer,'REJECTED',body.note)
 return db.get_workflow(wid)
@router.post('/workflows/{wid}/approve')
def approve(wid:str,body:ReviewIn):return review(wid,body,True)
@router.post('/workflows/{wid}/reject')
def reject(wid:str,body:ReviewIn):return review(wid,body,False)
