'use strict';
// Shared collage settings for the jump: which drawing each limb uses, its offset, size and the layer order, per phase.
// Saved in the browser by editeur.html; assets/jump/collage-data.js (optional) makes them permanent.
window.Collage=(()=>{
 const KEY='saut-collage-v1',MIN_SCALE=0.1,MAX_SCALE=4;
 const clampScale=s=>Math.round(Math.min(MAX_SCALE,Math.max(MIN_SCALE,s))*1000)/1000;
 // linkScale[n]: the limb keeps the same size in every phase.
 function defaults(M){return{version:2,linkScale:Object.fromEntries(M.order.map(n=>[n,true])),phases:M.phases.map((_,p)=>({order:[...M.order],frontArms:p>=3,layers:Object.fromEntries(M.order.map(n=>[n,{src:p,dx:0,dy:0,scale:1,visible:true}]))}))};}
 // Fill in anything missing so older or hand-edited files keep working.
 function normalize(M,c){const d=defaults(M);if(!c||!Array.isArray(c.phases))return d;
  if(c.linkScale)for(const n of M.order)if(typeof c.linkScale[n]==='boolean')d.linkScale[n]=c.linkScale[n];
  d.phases.forEach((ph,p)=>{const s=c.phases[p];if(!s)return;if(Array.isArray(s.order)&&s.order.length===M.order.length&&M.order.every(n=>s.order.includes(n)))ph.order=[...s.order];if(typeof s.frontArms==='boolean')ph.frontArms=s.frontArms;
   for(const n of M.order){const l=s.layers&&s.layers[n];if(!l)continue;const t=ph.layers[n];if(Number.isInteger(l.src)&&l.src>=0&&l.src<M.phases.length)t.src=l.src;if(Number.isFinite(l.dx))t.dx=Math.round(l.dx);if(Number.isFinite(l.dy))t.dy=Math.round(l.dy);if(Number.isFinite(l.scale)&&l.scale>0)t.scale=clampScale(l.scale);if(typeof l.visible==='boolean')t.visible=l.visible;}});
  return d;}
 function load(M){let stored=null;try{stored=JSON.parse(localStorage.getItem(KEY));}catch(e){}return normalize(M,stored||window.JUMP_COLLAGE);}
 function save(c){try{localStorage.setItem(KEY,JSON.stringify(c));return true;}catch(e){return false;}}
 function clearSaved(){try{localStorage.removeItem(KEY);}catch(e){}}
 // Where limb n is drawn in phase p. The size changes around the centre of the drawing, so resizing does not move the limb.
 function frame(M,c,p,n){const l=c.phases[p].layers[n],f=M.frames[n][l.src],s=l.scale,w=f.w*s,h=f.h*s,cx=f.x+f.w/2+l.dx,cy=f.y+f.h/2+l.dy;
  return{file:f.file,x:cx-w/2,y:cy-h/2,w,h,scale:s,cx,cy};}
 // Draws phase p on g in manifest coordinates. visible (optional) hides layers globally, as in saut.html.
 function draw(g,images,M,c,p,visible){const ph=c.phases[p];
  for(const n of ph.order){if(!ph.layers[n].visible||(visible&&!visible[n]))continue;const f=frame(M,c,p,n);g.drawImage(images[f.file],f.x,f.y,f.w,f.h);}
  if(ph.frontArms&&ph.layers.torso.visible&&(!visible||visible.torso)){const f=frame(M,c,p,'torso'),o=M.frames.torso[ph.layers.torso.src];
   // The arm regions are given for the unmoved torso: apply the torso's offset and size to them.
   g.save();g.translate(f.cx,f.cy);g.scale(f.scale,f.scale);g.translate(-(o.x+o.w/2),-(o.y+o.h/2));g.beginPath();for(const [x,y,w,h]of M.frontArmRegions)g.rect(x,y,w,h);g.clip();g.drawImage(images[f.file],o.x,o.y);g.restore();}
 }
 return{KEY,MIN_SCALE,MAX_SCALE,clampScale,defaults,normalize,load,save,clearSaved,frame,draw};
})();
