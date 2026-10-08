import json, sqlite3, time
from pathlib import Path
from .config import settings

def _path():
    return Path(settings.database_url.replace("sqlite:///", ""))

def connect():
    c=sqlite3.connect(_path()); c.row_factory=sqlite3.Row; return c

def init_db():
    with connect() as c:
        c.executescript("""CREATE TABLE IF NOT EXISTS workflows (id TEXT PRIMARY KEY, customer_id TEXT, original_request TEXT NOT NULL, status TEXT NOT NULL, intent TEXT, confidence REAL, extracted TEXT, sources TEXT, proposed_action TEXT, final_action TEXT, reason TEXT, created_at REAL NOT NULL, updated_at REAL NOT NULL); CREATE TABLE IF NOT EXISTS audit_events (id INTEGER PRIMARY KEY AUTOINCREMENT, workflow_id TEXT NOT NULL, actor TEXT NOT NULL, stage TEXT NOT NULL, detail TEXT NOT NULL, created_at REAL NOT NULL);""")

def create_workflow(w):
    now=time.time(); w["created_at"]=now; w["updated_at"]=now
    with connect() as c: c.execute("INSERT INTO workflows VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", (w['id'],w.get('customer_id'),w['original_request'],w['status'],w.get('intent'),w.get('confidence'),json.dumps(w.get('extracted')),json.dumps(w.get('sources')),w.get('proposed_action'),w.get('final_action'),w.get('reason'),now,now))

def update_workflow(wid, **fields):
    fields['updated_at']=time.time(); cols=[]; vals=[]
    for k,v in fields.items(): cols.append(f"{k}=?"); vals.append(json.dumps(v) if isinstance(v,(dict,list)) else v)
    vals.append(wid)
    with connect() as c: c.execute(f"UPDATE workflows SET {','.join(cols)} WHERE id=?", vals)

def add_audit(wid, actor, stage, detail):
    with connect() as c: c.execute("INSERT INTO audit_events(workflow_id,actor,stage,detail,created_at) VALUES(?,?,?,?,?)",(wid,actor,stage,detail,time.time()))

def decode(row):
    if not row:return None
    d=dict(row)
    for k in ('extracted','sources'): d[k]=json.loads(d[k]) if d[k] else None
    return d

def get_workflow(wid):
    with connect() as c: return decode(c.execute("SELECT * FROM workflows WHERE id=?",(wid,)).fetchone())
def list_workflows():
    with connect() as c:return [decode(r) for r in c.execute("SELECT * FROM workflows ORDER BY created_at DESC").fetchall()]
def audit(wid):
    with connect() as c:return [dict(r) for r in c.execute("SELECT * FROM audit_events WHERE workflow_id=? ORDER BY id",(wid,)).fetchall()]
