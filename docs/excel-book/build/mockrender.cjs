const {chromium}=require('playwright');const path=require('path');
// Renders each figure, then crops to the region around its numbered markers so the text stays legible in print.
const FULL=new Set(['X01']);
// Manual crops where the automatic one would cut useful context (row labels).
const FIX={X28:{x:0,y:197,width:1340,height:600},X29:{x:0,y:249,width:1140,height:640}};
const ids=process.argv.slice(3);const out=process.argv[2];
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:2});
await p.goto('file://'+path.join(__dirname,'mock','mock.html'));await p.evaluate(()=>document.fonts.ready);
const list=ids.length?ids:await p.evaluate(()=>Object.keys(SHOTS));
const info={};
for(const id of list){await p.evaluate(i=>render(i),id);await p.waitForTimeout(60);
 let clip={x:0,y:0,width:1600,height:1000};
 if(FIX[id]) clip=FIX[id]; else if(!FULL.has(id)){
  const r=await p.evaluate(()=>{let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;document.querySelectorAll('.mo,.mk,.dlg,.menu').forEach(e=>{const q=e.getBoundingClientRect();x0=Math.min(x0,q.left);y0=Math.min(y0,q.top);x1=Math.max(x1,q.right);y1=Math.max(y1,q.bottom)});return {x0,y0,x1,y1}});
  if(r.x1>r.x0){const pad=56,minW=960,minH=540;let x=r.x0-pad,y=r.y0-pad,w=r.x1-r.x0+2*pad,h=r.y1-r.y0+2*pad;
   if(w<minW){x-=(minW-w)/2;w=minW}if(h<minH){y-=(minH-h)/2;h=minH}
   x=Math.max(0,Math.min(x,1600-w));y=Math.max(0,Math.min(y,1000-h));w=Math.min(w,1600);h=Math.min(h,1000);clip={x:Math.round(x),y:Math.round(y),width:Math.round(w),height:Math.round(h)};}
 }
 info[id]=clip;await p.screenshot({path:`${out}/${id}.png`,clip});}
require('fs').writeFileSync(path.join(__dirname,'clips.json'),JSON.stringify(info,null,0));
await b.close()})()
