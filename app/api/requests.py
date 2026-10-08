from fastapi import APIRouter, HTTPException
from .. import db
from ..orchestrator import process
from ..schemas import RequestIn, WorkflowOut
router=APIRouter()
@router.post('/requests', response_model=WorkflowOut, status_code=201)
def create_request(req: RequestIn): return process(req.message, req.customer_id)
@router.get('/requests', response_model=list[WorkflowOut])
def requests(): return db.list_workflows()
@router.get('/requests/{wid}', response_model=WorkflowOut)
def request(wid: str):
    item=db.get_workflow(wid)
    if not item: raise HTTPException(status_code=404, detail='Workflow not found')
    return item
