import re,zipfile,shutil,sys
src,dst=sys.argv[1],sys.argv[2]
zin=zipfile.ZipFile(src);files={n:zin.read(n) for n in zin.namelist()}
d=files['word/document.xml'].decode()
s=files['word/styles.xml'].decode()

# --- document.xml ---
# code blocks: LTR, no rtl runs
def ltr(m):
    p=m.group(0).replace('<w:bidi />','').replace('<w:rtl />','')
    return p
d=re.sub(r'<w:p><w:pPr><w:pStyle w:val="SourceCode" />.*?</w:p>',ltr,d,flags=re.S)
d=d.replace('<w:rStyle w:val="VerbatimChar" /><w:rtl /></w:rPr>','<w:rStyle w:val="VerbatimChar" /></w:rPr>')
d=re.sub(r'(<pic:cNvPr descr=")[^"]*(")',r'\1\2',d)
# tables: RTL column order, full width, borders via style
d=re.sub(r'<w:tblW w:type="(?:auto|pct)" w:w="\d+" />','<w:bidiVisual /><w:tblW w:type="pct" w:w="5000" />',d)
# move cover + front matter (everything between the TOC and the first Heading1) before the TOC
toc_m=re.search(r'<w:sdt>.*?</w:sdt>',d,re.S)
h1=re.search(r'<w:p><w:pPr><w:pStyle w:val="Heading1" />',d[toc_m.end():])
seg=d[toc_m.end():toc_m.end()+h1.start()]
cov_m=re.search(r'<w:p>(?:(?!</w:p>).)*?<w:drawing>.*?</w:p>',seg,re.S)
cov=cov_m.group(0); rest=seg[:cov_m.start()]+seg[cov_m.end():]
PBR='<w:p><w:r><w:br w:type="page"/></w:r></w:p>'
d=d[:toc_m.start()]+cov+PBR+rest+PBR+toc_m.group(0)+d[toc_m.end()+h1.start():]

import json,os,html
tj=os.path.join(os.path.dirname(os.path.abspath(__file__)),'toc.json')
if os.path.exists(tj):
    ents=json.load(open(tj,encoding='utf8'))
    paras=[]
    for i,(title,page) in enumerate(ents):
        title=re.sub(r'\s*\([^()]*\)\s*$','',title)
        part=title.startswith('الجزء')
        rpr='<w:rPr><w:b/><w:bCs/><w:color w:val="A67C2E"/><w:rtl/></w:rPr>' if part else '<w:rPr><w:rtl/></w:rPr>'
        pre=('<w:r><w:fldChar w:fldCharType="begin" w:dirty="true"/></w:r><w:r><w:instrText xml:space="preserve">TOC \\o &quot;1-1&quot; \\h \\z \\u</w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>') if i==0 else ''
        post_='<w:r><w:fldChar w:fldCharType="end"/></w:r>' if i==len(ents)-1 else ''
        sp='<w:spacing w:before="160" w:after="40"/>' if part else '<w:spacing w:before="20" w:after="20"/><w:ind w:right="360"/>'
        paras.append(f'<w:p><w:pPr><w:pStyle w:val="TOC1"/><w:tabs><w:tab w:val="end" w:leader="dot" w:pos="9200"/></w:tabs><w:bidi/>{sp}</w:pPr>{pre}'
                     f'<w:r>{rpr}<w:t xml:space="preserve">{html.escape(title,quote=False)}</w:t></w:r><w:r>{rpr}<w:tab/></w:r><w:r>{rpr}<w:t>{page}</w:t></w:r>{post_}</w:p>')
    d=re.sub(r'<w:p><w:r><w:fldChar w:fldCharType="begin" w:dirty="true" /><w:instrText xml:space="preserve">TOC .*?</w:p>',lambda m:''.join(paras),d,count=1,flags=re.S)

# section: A4, margins, footer
sect=('<w:sectPr><w:footerReference w:type="default" r:id="rIdFooter1"/>'
      '<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1020" w:right="1020" w:bottom="1020" w:left="1020" w:header="600" w:footer="600" w:gutter="0"/>'
      '<w:titlePg/><w:bidi/></w:sectPr>')
d=re.sub(r'<w:sectPr.*?</w:sectPr>',sect,d,flags=re.S) if '<w:sectPr' in d else d.replace('</w:body>',sect+'</w:body>')
if 'xmlns:r=' not in d[:2000]:
    d=d.replace('<w:document ','<w:document xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ',1)
_prev=[False]
def _h1(m):
    para=m.group(0); isH=para.startswith('<w:p><w:pPr><w:pStyle w:val="Heading1" />')
    if isH and not _prev[0] and re.search(r'<w:t[^>]*>(الجزء|المقدمة|الملاحق|الفصل|الملحق)',para): para=para.replace('<w:pStyle w:val="Heading1" />','<w:pStyle w:val="Heading1" /><w:pageBreakBefore/>',1)
    _prev[0]=isH; return para
d=re.sub(r'<w:p>(?:(?!<w:p>).)*?</w:p>',_h1,d,flags=re.S)
d=re.sub(r'<w:tr>(?!<w:trPr>)','<w:tr><w:trPr><w:cantSplit/></w:trPr>',d)
d=re.sub(r'<w:tr><w:trPr>(?!<w:cantSplit)','<w:tr><w:trPr><w:cantSplit/>',d)
files['word/document.xml']=d.encode()

# footer
files['word/footer1.xml']=('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
 '<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:bidi/><w:jc w:val="center"/></w:pPr>'
 '<w:r><w:rPr><w:color w:val="8A7E62"/><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">Word من الصفر إلى الاحتراف  ·  Nourix Academy  ·  </w:t></w:r>'
 '<w:r><w:rPr><w:color w:val="8A7E62"/><w:sz w:val="18"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:rPr><w:color w:val="8A7E62"/><w:sz w:val="18"/></w:rPr><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>'
 '<w:r><w:rPr><w:color w:val="8A7E62"/><w:sz w:val="18"/></w:rPr><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:rPr><w:color w:val="8A7E62"/><w:sz w:val="18"/></w:rPr><w:t>1</w:t></w:r><w:r><w:rPr><w:color w:val="8A7E62"/><w:sz w:val="18"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r></w:p></w:ftr>').encode()
r=files['word/_rels/document.xml.rels'].decode()
r=r.replace('</Relationships>','<Relationship Id="rIdFooter1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>')
files['word/_rels/document.xml.rels']=r.encode()
ct=files['[Content_Types].xml'].decode()
ct=(ct if 'Extension="png"' in ct else ct.replace('<Default ','<Default Extension="png" ContentType="image/png"/><Default ',1)).replace('</Types>','<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>')
for ext,mt in (('jpg','image/jpeg'),('jpeg','image/jpeg'),('png','image/png')):
    if f'Extension="{ext}"' not in ct: ct=ct.replace('<Default ',f'<Default Extension="{ext}" ContentType="{mt}"/><Default ',1)
files['[Content_Types].xml']=ct.encode()

# --- styles.xml ---
def setstyle(sid,ppr='',rpr='',extra_remove=True):
    global s
    m=re.search(r'(<w:style [^>]*w:styleId="'+sid+r'"[^>]*>)(.*?)(</w:style>)',s,re.S)
    if not m: print('missing',sid); return
    body=re.sub(r'<w:pPr>.*?</w:pPr>|<w:pPr ?/>','',m.group(2),flags=re.S)
    body=re.sub(r'<w:rPr>.*?</w:rPr>|<w:rPr ?/>','',body,flags=re.S)
    if sid!='Normal': body=body.replace('<w:semiHidden />','')
    new=m.group(1)+body+(f'<w:pPr>{ppr}</w:pPr>' if ppr else '')+(f'<w:rPr>{rpr}</w:rPr>' if rpr else '')+m.group(3)
    s=s[:m.start()]+new+s[m.end():]
F='<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Arial" w:eastAsia="Calibri"/>'
s=re.sub(r'<w:docDefaults>.*?</w:docDefaults>',
 '<w:docDefaults><w:rPrDefault><w:rPr>'+F+'<w:sz w:val="21"/><w:szCs w:val="23"/><w:lang w:val="fr-FR" w:bidi="ar-SA"/></w:rPr></w:rPrDefault>'
 '<w:pPrDefault><w:pPr><w:spacing w:after="100" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>',s,flags=re.S)
def H(sz,color,before,after,extra=''):
    return (f'<w:keepNext/><w:keepLines/>{extra}<w:spacing w:before="{before}" w:after="{after}"/>',
            f'<w:b/><w:bCs/><w:color w:val="{color}"/><w:sz w:val="{sz}"/><w:szCs w:val="{sz}"/>')
p,rr=H(44,'15110A',480,240,'<w:pBdr><w:bottom w:val="single" w:sz="18" w:space="8" w:color="D4A84B"/></w:pBdr>');setstyle('Heading1',p+'<w:outlineLvl w:val="0"/>',rr)
p,rr=H(32,'A67C2E',360,120);setstyle('Heading2',p+'<w:outlineLvl w:val="1"/>',rr)
p,rr=H(28,'3A2F18',240,80);setstyle('Heading3',p+'<w:outlineLvl w:val="2"/>',rr)
p,rr=H(26,'1F2937',200,60);setstyle('Heading4',p+'<w:outlineLvl w:val="3"/>',rr)
setstyle('BodyText','<w:spacing w:before="40" w:after="100"/>')
setstyle('FirstParagraph','<w:spacing w:before="40" w:after="100"/>')
setstyle('Compact','<w:spacing w:before="30" w:after="30"/>')
setstyle('BlockText','<w:pBdr><w:left w:val="single" w:sz="24" w:space="8" w:color="D4A84B"/><w:right w:val="single" w:sz="24" w:space="8" w:color="D4A84B"/></w:pBdr>'
 '<w:shd w:val="clear" w:color="auto" w:fill="FAF5E8"/><w:spacing w:before="0" w:after="0"/><w:ind w:left="200" w:right="200"/>')
setstyle('SourceCode','<w:pBdr><w:top w:val="single" w:sz="4" w:space="4" w:color="D9CBA3"/><w:left w:val="single" w:sz="4" w:space="4" w:color="D9CBA3"/><w:bottom w:val="single" w:sz="4" w:space="4" w:color="D9CBA3"/><w:right w:val="single" w:sz="4" w:space="4" w:color="D9CBA3"/></w:pBdr>'
 '<w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/><w:wordWrap w:val="on"/><w:spacing w:before="120" w:after="120" w:line="260" w:lineRule="auto"/><w:ind w:left="120" w:right="120"/><w:jc w:val="left"/>',
 '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Arial"/><w:color w:val="0F172A"/><w:sz w:val="18"/><w:szCs w:val="20"/>')
setstyle('VerbatimChar','','<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Arial"/><w:color w:val="B91C1C"/><w:sz w:val="21"/><w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>')
setstyle('Title','<w:spacing w:after="200"/><w:jc w:val="center"/>','<w:b/><w:bCs/><w:color w:val="15110A"/><w:sz w:val="56"/><w:szCs w:val="56"/>')
setstyle('TOCHeading','<w:spacing w:before="0" w:after="300"/><w:jc w:val="center"/>','<w:b/><w:bCs/><w:color w:val="15110A"/><w:sz w:val="44"/><w:szCs w:val="44"/>')
setstyle('ImageCaption','<w:spacing w:before="40" w:after="200"/><w:jc w:val="center"/>','<w:i/><w:iCs/><w:color w:val="8A7E62"/><w:sz w:val="20"/><w:szCs w:val="22"/>')
# table style with borders + header shading
m=re.search(r'<w:style [^>]*w:styleId="Table"[^>]*>.*?</w:style>',s,re.S)
s=s[:m.start()]+('<w:style w:type="table" w:default="1" w:styleId="Table"><w:name w:val="Table"/><w:basedOn w:val="TableNormal"/><w:qFormat/>'
 '<w:pPr><w:spacing w:before="20" w:after="20"/></w:pPr><w:rPr><w:sz w:val="21"/><w:szCs w:val="23"/></w:rPr>'
 '<w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:color="D9CBA3"/><w:left w:val="single" w:sz="4" w:color="D9CBA3"/><w:bottom w:val="single" w:sz="4" w:color="D9CBA3"/><w:right w:val="single" w:sz="4" w:color="D9CBA3"/><w:insideH w:val="single" w:sz="4" w:color="D9CBA3"/><w:insideV w:val="single" w:sz="4" w:color="D9CBA3"/></w:tblBorders>'
 '<w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr>'
 '<w:tblStylePr w:type="firstRow"><w:rPr><w:b/><w:bCs/><w:color w:val="F0D58C"/></w:rPr><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="15110A"/></w:tcPr></w:tblStylePr></w:style>')+s[m.end():]
s=s.replace('</w:styles>','<w:style w:type="paragraph" w:styleId="TOC1"><w:name w:val="toc 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="39"/><w:unhideWhenUsed/><w:rPr><w:sz w:val="24"/><w:szCs w:val="26"/></w:rPr></w:style></w:styles>') if 'w:styleId="TOC1"' not in s else s
if 'w:styleId="SubtitleFR"' in s:
    m=re.search(r'(<w:style [^>]*w:styleId="SubtitleFR"[^>]*>)(.*?)(</w:style>)',s,re.S)
    s=s[:m.start()]+m.group(1)+'<w:name w:val="SubtitleFR"/><w:basedOn w:val="Normal"/><w:next w:val="BodyText"/><w:pPr><w:keepNext/><w:spacing w:before="0" w:after="240"/></w:pPr><w:rPr><w:i/><w:iCs/><w:color w:val="A67C2E"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>'+m.group(3)+s[m.end():]
if 'w:styleId="Copyright"' in s:
    m=re.search(r'(<w:style [^>]*w:styleId="Copyright"[^>]*>)(.*?)(</w:style>)',s,re.S)
    s=s[:m.start()]+m.group(1)+'<w:name w:val="Copyright"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="0" w:after="160" w:line="264" w:lineRule="auto"/><w:jc w:val="both"/></w:pPr><w:rPr><w:sz w:val="19"/><w:szCs w:val="21"/><w:color w:val="374151"/></w:rPr>'+m.group(3)+s[m.end():]

def addstyle(sid,ppr,rpr):
    global s
    m=re.search(r'(<w:style [^>]*w:styleId="'+sid+r'"[^>]*>)(.*?)(</w:style>)',s,re.S)
    if m: s=s[:m.start()]+m.group(1)+f'<w:name w:val="{sid}"/><w:basedOn w:val="Normal"/><w:pPr>{ppr}</w:pPr><w:rPr>{rpr}</w:rPr>'+m.group(3)+s[m.end():]
    else: print('missing style',sid)
addstyle('ShotCaption','<w:keepNext/><w:spacing w:before="40" w:after="60"/><w:jc w:val="center"/>','<w:b/><w:bCs/><w:color w:val="A67C2E"/><w:sz w:val="20"/><w:szCs w:val="22"/>')
addstyle('Legend','<w:pBdr><w:right w:val="single" w:sz="18" w:space="6" w:color="D4A84B"/></w:pBdr><w:shd w:val="clear" w:color="auto" w:fill="FAF5E8"/><w:spacing w:before="0" w:after="0" w:line="252" w:lineRule="auto"/><w:ind w:left="300" w:right="300"/>','<w:sz w:val="20"/><w:szCs w:val="22"/><w:color w:val="1C170E"/>')
files['word/styles.xml']=s.encode()
core=('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
 '<dc:title>Word من الصفر إلى الاحتراف</dc:title><dc:subject>تعلّم Microsoft Word بالصور خطوة بخطوة</dc:subject><dc:creator>Nourix Academy</dc:creator><dc:language>ar</dc:language>'
 '<cp:keywords>Microsoft Word، Word، اختصارات لوحة المفاتيح، Nourix Academy</cp:keywords><dcterms:created xsi:type="dcterms:W3CDTF">2026-10-01T00:00:00Z</dcterms:created></cp:coreProperties>')
files['docProps/core.xml']=core.encode()
zout=zipfile.ZipFile(dst,'w',zipfile.ZIP_DEFLATED)
for n in zin.namelist(): zout.writestr(n,files[n])
for n in files:
    if n not in zin.namelist(): zout.writestr(n,files[n])
zout.close()
