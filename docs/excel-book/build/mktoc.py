import json,sys
from pypdf import PdfReader
r=PdfReader(sys.argv[1]);out=[]
for o in r.outline:
    if isinstance(o,list): continue
    t=o.title.strip()
    if t in('الفهرس',): continue
    out.append([t,r.get_destination_page_number(o)+1])
json.dump(out,open(sys.argv[2],'w',encoding='utf8'),ensure_ascii=False,indent=0);print(len(out));print(out[:5])
