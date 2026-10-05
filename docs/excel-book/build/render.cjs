const {chromium}=require('playwright');const fs=require('fs');const D=__dirname;
const jobs=JSON.parse(fs.readFileSync(D+'/jobs.json','utf8'));
const FONT='<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@400..800&family=Tajawal:wght@400;500;700&display=swap">';
(async()=>{const b=await chromium.launch();const p=await b.newPage();
for(const j of jobs){await p.setViewportSize({width:j.w,height:j.h});
 fs.writeFileSync(D+'/tmp.html',`<!doctype html><html dir="rtl"><head><meta charset="utf-8">${FONT}<style>*{margin:0;box-sizing:border-box}body{width:${j.w}px;height:${j.h}px;overflow:hidden;font-family:Cairo,Tajawal,sans-serif}</style></head><body>${j.html}</body></html>`);
 await p.goto('file://'+D+'/tmp.html');await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(200);
 await p.screenshot({path:j.out});}
await b.close()})()
