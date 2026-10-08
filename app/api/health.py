from fastapi import APIRouter
from ..config import settings
from ..schemas import HealthOut
router=APIRouter()
@router.get('/health',response_model=HealthOut)
def health(): return {'status':'ok','database':'sqlite','llm_provider':settings.llm_provider}
