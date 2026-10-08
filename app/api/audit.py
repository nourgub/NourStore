from fastapi import APIRouter,HTTPException
from .. import db
router=APIRouter()
@router.get('/audit/{wid}')
def audit(wid:str):
 if not db.get_workflow(wid):raise HTTPException(404,'Workflow not found')
 return db.audit(wid)
