'use strict';
// Shared collage settings for the jump: which drawing each limb uses, its offset and the layer order, per phase.
// Saved in the browser by editeur.html; assets/jump/collage-data.js (optional) makes them permanent.
window.Collage=(()=>{
 const KEY='saut-collage-v1';
 function defaults(M){return{version:1,phases:M.phases.map((_,p)=>({order:[...M.order],frontArms:p>=3,layers:Object.fromEntries(M.order.map(n=>[n,{src:p,dx:0,dy:0,visible:true}]))}))};}
 // Fill in anything missing so older or hand-edited files keep working.
 function normalize(M,c){const d=defaults(M);if(!c||!Array.isArray(c.phases))return d;
  d.phases.forEach((ph,p)=>{const s=c.phases[p];if(!s)return;if(Array.isArray(s.order)&&s.order.length===M.order.length&&M.order.every(n=>s.order.includes(n)))ph.order=[...s.order];if(typeof s.frontArms==='boolean')ph.frontArms=s.frontArms;
   for(const n of M.order){const l=s.layers&&s.layers[n];if(!l)continue;const t=ph.layers[n];if(Number.isInteger(l.src)&&l.src>=0&&l.src<M.phases.length)t.src=l.src;if(Number.isFinite(l.dx))t.dx=Math.round(l.dx);if(Number.isFinite(l.dy))t.dy=Math.round(l.dy);if(typeof l.visible==='boolean')t.visible=l.visible;}});
  return d;}
 function load(M){let stored=null;try{stored=JSON.parse(localStorage.getItem(KEY));}catch(e){}return normalize(M,stored||window.JUMP_COLLAGE);}
 function save(c){try{localStorage.setItem(KEY,JSON.stringify(c));return true;}catch(e){return false;}}
 function clearSaved(){try{localStorage.removeItem(KEY);}catch(e){}}
 function frame(M,c,p,n){const l=c.phases[p].layers[n],f=M.frames[n][l.src];return{file:f.file,x:f.x+l.dx,y:f.y+l.dy,w:f.w,h:f.h};}
 // Draws phase p on g in manifest coordinates. visible (optional) hides layers globally, as in saut.html.
 function draw(g,images,M,c,p,visible){const ph=c.phases[p];
  for(const n of ph.order){if(!ph.layers[n].visible||(visible&&!visible[n]))continue;const f=frame(M,c,p,n);g.drawImage(images[f.file],f.x,f.y);}
  if(ph.frontArms&&ph.layers.torso.visible&&(!visible||visible.torso)){const f=frame(M,c,p,'torso'),l=ph.layers.torso;g.save();g.beginPath();for(const [x,y,w,h]of M.frontArmRegions)g.rect(x+l.dx,y+l.dy,w,h);g.clip();g.drawImage(images[f.file],f.x,f.y);g.restore();}
 }
 return{KEY,defaults,normalize,load,save,clearSaved,frame,draw};
})();
