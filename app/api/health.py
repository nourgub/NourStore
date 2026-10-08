from fastapi import APIRouter
router=APIRouter()
@router.get('/health')
def health(): return {'status':'ok','database':'sqlite','llm_provider':'configured_or_mock'}
