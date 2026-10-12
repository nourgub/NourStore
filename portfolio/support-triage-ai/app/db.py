import json, sqlite3, time
from pathlib import Path
from .config import settings
_ALLOWED_UPDATE_FIELDS={'status','intent','confidence','extracted','sources','proposed_action','final_action','reason'}
_TRANSITIONS={'RECEIVED':{'CLASSIFIED','PROCESSING','REQUIRES_HUMAN_REVIEW','FAILED'},'CLASSIFIED':{'PROCESSING','AUTO_APPROVED','REQUIRES_HUMAN_REVIEW','FAILED'},'PROCESSING':{'AUTO_APPROVED','REQUIRES_HUMAN_REVIEW','FAILED'},'AUTO_APPROVED':{'COMPLETED','FAILED'},'REQUIRES_HUMAN_REVIEW':{'APPROVED_BY_HUMAN','REJECTED','FAILED'},'APPROVED_BY_HUMAN':{'COMPLETED','FAILED'},'REJECTED':set(),'COMPLETED':set(),'FAILED':set()}
def _path():
    path=Path(settings.database_url.replace('sqlite:///','',1)); path.parent.mkdir(parents=True,exist_ok=True); return path
def connect():
    c=sqlite3.connect(_path(),timeout=10); c.row_factory=sqlite3.Row; c.execute('PRAGMA foreign_keys=ON'); return c
def init_db():
    with connect() as c:
        c.executescript('''CREATE TABLE IF NOT EXISTS workflows (id TEXT PRIMARY KEY, customer_id TEXT, original_request TEXT NOT NULL, status TEXT NOT NULL, intent TEXT, confidence REAL, extracted TEXT, sources TEXT, proposed_action TEXT, final_action TEXT, reason TEXT, created_at REAL NOT NULL, updated_at REAL NOT NULL); CREATE TABLE IF NOT EXISTS audit_events (id INTEGER PRIMARY KEY AUTOINCREMENT, workflow_id TEXT NOT NULL, event_type TEXT NOT NULL, component TEXT NOT NULL, status TEXT NOT NULL, duration_ms REAL, metadata TEXT NOT NULL DEFAULT '{}', created_at REAL NOT NULL, FOREIGN KEY(workflow_id) REFERENCES workflows(id));''')
        columns={r['name'] for r in c.execute('PRAGMA table_info(audit_events)')}
        for name,definition in [('event_type',"TEXT NOT NULL DEFAULT 'LEGACY_EVENT'"),('component',"TEXT NOT NULL DEFAULT 'legacy'"),('status',"TEXT NOT NULL DEFAULT 'recorded'"),('duration_ms','REAL'),('metadata',"TEXT NOT NULL DEFAULT '{}'" )]:
            if name not in columns: c.execute(f'ALTER TABLE audit_events ADD COLUMN {name} {definition}')
def _encode(v): return json.dumps(v,ensure_ascii=False) if isinstance(v,(dict,list)) else v
def create_workflow(w):
    now=time.time()
    with connect() as c: c.execute('INSERT INTO workflows VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',(w['id'],w.get('customer_id'),w['original_request'],w['status'],w.get('intent'),w.get('confidence'),_encode(w.get('extracted')), _encode(w.get('sources')),w.get('proposed_action'),_encode(w.get('final_action')),w.get('reason'),now,now))
def update_workflow(wid,**fields):
    unknown=set(fields)-_ALLOWED_UPDATE_FIELDS
    if unknown: raise ValueError(f'Unsupported workflow fields: {sorted(unknown)}')
    if not fields:return
    fields['updated_at']=time.time()
    with connect() as c:
        c.execute(f"UPDATE workflows SET {','.join(k+'=?' for k in fields)} WHERE id=?",[_encode(v) for v in fields.values()]+[wid])
        if c.total_changes!=1: raise KeyError(f'Unknown workflow: {wid}')
def transition_workflow(wid,target,**fields):
    with connect() as c:
        row=c.execute('SELECT status FROM workflows WHERE id=?',(wid,)).fetchone()
        if not row: raise KeyError(f'Unknown workflow: {wid}')
        if target not in _TRANSITIONS.get(row['status'],set()): raise ValueError(f"Invalid transition {row['status']} -> {target}")
        values={k:v for k,v in fields.items() if k in _ALLOWED_UPDATE_FIELDS}; values['status']=target; values['updated_at']=time.time()
        c.execute(f"UPDATE workflows SET {','.join(k+'=?' for k in values)} WHERE id=?",[_encode(v) for v in values.values()]+[wid])
def add_audit(wid,actor,event_type,detail='',*,component=None,status='recorded',duration_ms=None,metadata=None):
    payload=dict(metadata or {})
    if detail: payload.setdefault('detail',detail[:500])
    with connect() as c:c.execute('INSERT INTO audit_events(workflow_id,event_type,component,status,duration_ms,metadata,created_at) VALUES(?,?,?,?,?,?,?)',(wid,event_type,component or actor,status,duration_ms,json.dumps(payload,ensure_ascii=False),time.time()))
def _decode(row):
    if not row:return None
    result=dict(row)
    for key in ('extracted','sources','final_action'):
        if result.get(key): result[key]=json.loads(result[key])
    return result
def get_workflow(wid):
    with connect() as c:return _decode(c.execute('SELECT * FROM workflows WHERE id=?',(wid,)).fetchone())
def list_workflows():
    with connect() as c:return [_decode(r) for r in c.execute('SELECT * FROM workflows ORDER BY created_at DESC').fetchall()]
def audit(wid):
    with connect() as c:
        result=[]
        for row in c.execute('SELECT * FROM audit_events WHERE workflow_id=? ORDER BY id',(wid,)).fetchall():
            item=dict(row); item['metadata']=json.loads(item['metadata'] or '{}'); result.append(item)
        return result
