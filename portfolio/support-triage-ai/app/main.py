from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from . import db
from .api import approvals, audit, health, requests

app = FastAPI(
    title='Enterprise AI Automation Platform',
    version='0.2.0',
    description='Safe AI-assisted customer operations prototype with human oversight',
)
db.init_db()
static = Path(__file__).parent / 'static'
app.mount('/static', StaticFiles(directory=static), name='static')
app.include_router(health.router)
app.include_router(requests.router)
app.include_router(approvals.router)
app.include_router(audit.router)

@app.get('/', response_class=HTMLResponse)
def dashboard():
    return (static / 'index.html').read_text(encoding='utf-8')

@app.get('/workflows/{wid}')
def workflow_alias(wid: str):
    return requests.request(wid)
