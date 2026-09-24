// Measure anatomical landmarks on each registered jump layer and on the original layers.
const path=require('node:path');const {read}=require('./png.cjs');process.chdir(path.resolve(__dirname,'..'));
const M=require('../assets/jump/manifest.json'),OX=M.sourceOffset[0],OY=M.sourceOffset[1];
const isSkin=(r,g,b)=>r>225&&g>165&&g<220&&b>130&&b<200&&r-b>40;
const isYellow=(r,g,b)=>r>200&&g>160&&b<90;
const isWhite=(r,g,b)=>r>235&&g>235&&b>235;
function pts(im,ox,oy,test){const out=[];for(let y=0;y<im.h;y++)for(let x=0;x<im.w;x++){const i=(y*im.w+x)*4;if(im.data[i+3]&&test(im.data[i],im.data[i+1],im.data[i+2],x,y))out.push([x+ox,y+oy]);}return out;}
const mean=p=>p.length?[Math.round(p.reduce((s,q)=>s+q[0],0)/p.length),Math.round(p.reduce((s,q)=>s+q[1],0)/p.length)]:null;
function box(p){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const [x,y]of p){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}return{x0,y0,x1,y1};}
function landmarks(name,im,ox,oy){const all=pts(im,ox,oy,()=>true),b=box(all),r={box:b};
 if(name==='lower'){r.buckle=mean(pts(im,ox,oy,isYellow));r.feet=b.y1;}
 if(name==='torso'){const s=pts(im,ox,oy,isSkin),top=Math.min(...s.map(p=>p[1]));// neck = skin in top band of the torso
  const neck=s.filter(p=>p[1]<b.y0+(b.y1-b.y0)*.25&&Math.abs(p[0]-mean(s.filter(q=>q[1]<top+15))[0])<60);r.neck=mean(neck);r.neckTop=top;r.bottom=b.y1;}
 if(name==='head'){const bottom=all.filter(p=>p[1]>b.y1-12);r.chin=[mean(bottom)[0],b.y1];r.top=b.y0;r.center=mean(all);}
 if(name==='eyes')r.eyes=mean(pts(im,ox,oy,isWhite));
 if(name==='hair'){r.flower=mean(pts(im,ox,oy,isWhite));r.ear=mean(pts(im,ox,oy,isSkin));}
 if(name==='cape')r.center=mean(all);
 return r;}
const report={};
const base=require('../assets/manifest.json');report.rest={};for(const n of M.order)report.rest[n]=landmarks(n,read(base.base[n]),OX,OY);
for(const [f,ph]of M.phases.entries()){report[ph.id]={};for(const n of M.order){const fr=M.frames[n][f];report[ph.id][n]=landmarks(n,read(fr.file),fr.x,fr.y);}}
console.log(JSON.stringify(report,(k,v)=>Array.isArray(v)?JSON.stringify(v):v,1).replace(/"\[/g,'[').replace(/\]"/g,']'));
