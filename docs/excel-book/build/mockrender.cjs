const {chromium}=require('playwright');const path=require('path');
const ids=process.argv.slice(3);const out=process.argv[2];
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1.5});
await p.goto('file://'+path.join(__dirname,'mock','mock.html'));await p.evaluate(()=>document.fonts.ready);
const list=ids.length?ids:await p.evaluate(()=>Object.keys(SHOTS));
for(const id of list){await p.evaluate(i=>render(i),id);await p.waitForTimeout(60);await p.screenshot({path:`${out}/${id}.png`});}
await b.close()})()
