from fastapi import APIRouter, HTTPException
from .. import db
from ..schemas import AuditEventOut
router=APIRouter()
@router.get('/audit/{wid}', response_model=list[AuditEventOut])
def audit(wid: str):
    if not db.get_workflow(wid): raise HTTPException(status_code=404, detail='Workflow not found')
    return db.audit(wid)
