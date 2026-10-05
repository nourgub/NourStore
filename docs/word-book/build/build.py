import re,os,json,subprocess,html,glob
S=os.path.dirname(os.path.abspath(__file__))
B=os.path.abspath(S+'/..')+'/'
LOGO=S+'/logo.png'
from PIL import Image
NUM='①②③④⑤⑥⑦⑧⑨⑩'
files=['ch00.md']+[f'ch{i:02d}.md' for i in range(1,15)]+['annexes.md']
jobs=[];shots=[]
def esc(t): return html.escape(t)
def shot(m):
    body=m.group(1);d={};leg=[]
    for line in body.splitlines():
        if line.startswith('- '): leg.append(line[2:].strip())
        elif ':' in line and not line.startswith(' '):
            k,v=line.split(':',1);d[k.strip()]=v.strip()
    sid=d['id'];shots.append(dict(id=sid,title=d['title'],take=d['take'],legend=leg))
    real=next((f for f in glob.glob(f'{B}shots/{sid}.*') if f.lower().endswith(('.png','.jpg','.jpeg'))),None)
    ill=f'{S}/ill/{sid}.png'
    if not real and os.path.exists(ill): real=ill
    if real:
        im=Image.open(real);w=min(16.5,12*im.width/im.height);src=real
    else:
        os.makedirs(S+'/ph',exist_ok=True);src=f'{S}/ph/{sid}.png';w=15.5
        items=''.join(f'<div style="display:flex;gap:14px;align-items:baseline;margin:4px 0"><span style="color:#D4A84B;font-size:30px">{NUM[i]}</span><span>{esc(x)}</span></div>' for i,x in enumerate(leg))
        jobs.append(dict(out=src,w=1600,h=520,html=f'''<div style="width:1600px;height:520px;background:#0F2747;padding:36px;position:relative">
<div style="position:absolute;inset:36px;border:4px dashed #D4A84B;border-radius:28px"></div>
<div style="position:relative;padding:44px 60px;color:#FFFFFF;height:100%">
<div style="display:flex;justify-content:space-between;align-items:center">
<div style="font-size:30px;color:#D4A84B;font-weight:700">📷 مكان لقطة الشاشة</div>
<div style="font-size:64px;font-weight:800;color:#D4A84B;direction:ltr;letter-spacing:2px">{sid}</div></div>
<div style="font-size:50px;font-weight:800;margin-top:6px;line-height:1.3">{esc(d['title'])}</div>
<div style="height:4px;width:180px;background:#D4A84B;margin:18px 0 22px"></div>
<div style="font-size:30px;color:#D3DEEE;line-height:1.55"><b style="color:#F0D58C">كيف تصوّرها:</b> {esc(d['take'])}</div>
<div style="position:absolute;bottom:40px;left:60px;font-size:22px;color:#8FA3C4;direction:ltr">shots/{sid}.png · Nourix Academy</div>
</div></div>'''))
    out=f'![]({src}){{width={w:.2f}cm}}\n\n::: {{custom-style="ShotCaption"}}\nالشكل {int(sid[1:])}: {d["title"]}\n:::\n\n'
    if leg: out+='::: {custom-style="Legend"}\n'+'\n\n'.join(f'{NUM[i]}  {x}' for i,x in enumerate(leg))+'\n:::\n'
    return out
out=[]
for f in files:
    t=open(B+f,encoding='utf8').read()
    t=re.sub(r'```shot\n(.*?)```',shot,t,flags=re.S)
    t=re.sub(r'^(# .*?)\s*\(\*\*(.+?)\*\*\)\s*$',lambda m:m.group(1)+'\n\n::: {custom-style="SubtitleFR"}\n'+m.group(2)+'\n:::',t,flags=re.M)
    t=re.sub(r'\*\*([^*\n]+?)\*\*',lambda m:'**\u202a'+m.group(1)+'\u202c**' if re.search(r'[A-Za-z0-9←→↑↓]',m.group(1)) and not re.search(r'[\u0600-\u06FF]',m.group(1)) else m.group(0),t)
    out.append(t)
# cover
jobs.append(dict(out=S+'/cover.png',w=1240,h=1754,html=open(S+'/cover.html',encoding='utf8').read().replace('LOGO','file://'+LOGO)))
json.dump(jobs,open(S+'/jobs.json','w'),ensure_ascii=False)
if not os.environ.get('NORENDER'): subprocess.run(['node',S+'/render.cjs'],check=True)
json.dump(shots,open(S+'/shots.json','w',encoding='utf8'),ensure_ascii=False,indent=1)
md=f'![]({S}/cover.png){{width=16.3cm}}\n\n'+open(S+'/front.md',encoding='utf8').read()+'\n\n'+'\n\n'.join(out)
open(S+'/book.md','w',encoding='utf8').write(md)
print(len(shots),'shots',sum(1 for j in jobs if '/ph/' in j['out']),'placeholders')
