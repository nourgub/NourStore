from fastapi import APIRouter
from ..schemas import RequestIn
from ..orchestrator import process
from .. import db
router=APIRouter(prefix='')
@router.post('/requests',status_code=201)
def create_request(req:RequestIn):return process(req.message,req.customer_id)
@router.get('/requests')
def requests():return db.list_workflows()
@router.get('/requests/{wid}')
def request(wid:str):
 from fastapi import HTTPException
 x=db.get_workflow(wid)
 if not x:raise HTTPException(404,'Workflow not found')
 return x
