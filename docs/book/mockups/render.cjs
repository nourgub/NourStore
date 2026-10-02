// Render mockups/*.html -> images/<name>.png (2x). Usage: node render.cjs [file.html ...]
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
(async()=>{const dir=__dirname;const out=path.join(dir,'..','images');
const files=process.argv.slice(2).length?process.argv.slice(2).map(f=>path.basename(f)):fs.readdirSync(dir).filter(f=>f.endsWith('.html')&&!f.startsWith('_'));
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1048,height:800},deviceScaleFactor:2});
for(const f of files){await p.setViewportSize({width:1048,height:100});await p.goto('file://'+path.join(dir,f));await p.waitForTimeout(100);
 const h=await p.evaluate(()=>document.documentElement.scrollHeight);await p.setViewportSize({width:1048,height:h});
 await p.screenshot({path:path.join(out,f.replace('.html','.png')),fullPage:true});console.log('ok',f);}
await b.close()})()
