'use strict';
const $=id=>document.getElementById(id),data=window.JUMP_ASSETS,M=data.manifest,images={},alphas={};
const names={cape:'Cape',lower:'Bas du corps',torso:'Torse et bras',head:'Tête',eyes:'Yeux',hair:'Cheveux'};
// Part of the 1600 × 1700 manifest canvas shown in the editor; the character sits well inside it.
const VIEW={x:250,y:120,w:1100,h:1450},GROUND=1470,AXIS=890;
const canvas=$('stage'),ctx=canvas.getContext('2d');canvas.width=VIEW.w;canvas.height=VIEW.h;
const layerCanvas=document.createElement('canvas');layerCanvas.width=M.width;layerCanvas.height=M.height;const lg=layerCanvas.getContext('2d');
let collage=Collage.load(M),phase=0,selected='head',undo=[],redo=[],drag=null,playing=null;

// ---------- history & saving ----------
function snapshot(){undo.push(JSON.stringify(collage));if(undo.length>200)undo.shift();redo=[];}
function commit(message){const ok=Collage.save(collage);status(ok?(message||'Enregistré dans le navigateur'):'Impossible d’enregistrer dans ce navigateur — télécharge collage-data.js');refresh();}
function restore(from,to){if(!from.length)return;to.push(JSON.stringify(collage));collage=Collage.normalize(M,JSON.parse(from.pop()));commit('');}
let statusTimer;function status(t){$('status').textContent=t;clearTimeout(statusTimer);statusTimer=setTimeout(()=>$('status').textContent='',2500);}

// ---------- drawing ----------
const layerOf=n=>collage.phases[phase].layers[n];
function drawPhase(g,p){g.imageSmoothingEnabled=false;Collage.draw(g,images,M,collage,p);}
function render(){const p=playing?playing.phase:phase;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,VIEW.w,VIEW.h);ctx.imageSmoothingEnabled=false;ctx.setTransform(1,0,0,1,-VIEW.x,-VIEW.y);
 if($('guides').checked){ctx.fillStyle='rgba(200,233,163,.35)';ctx.fillRect(VIEW.x,GROUND,VIEW.w,3);ctx.fillStyle='rgba(200,233,163,.18)';ctx.fillRect(AXIS,VIEW.y,2,VIEW.h);}
 if(!ref.front)drawRef(p);
 if(!playing&&$('onion').checked&&phase>0){lg.clearRect(0,0,M.width,M.height);drawPhase(lg,phase-1);ctx.globalAlpha=Number($('onion-alpha').value);ctx.drawImage(layerCanvas,0,0);ctx.globalAlpha=1;}
 drawPhase(ctx,p);
 if(ref.front)drawRef(p);
 if(!playing&&$('outline').checked&&layerOf(selected).visible){const f=Collage.frame(M,collage,phase,selected),z=Number($('zoom').value);ctx.strokeStyle='#ffd27a';ctx.lineWidth=2/z;ctx.setLineDash([8/z,6/z]);ctx.strokeRect(f.x-2,f.y-2,f.w+4,f.h+4);ctx.setLineDash([]);
  const r=HANDLE/z;ctx.fillStyle='#ffd27a';for(const [x,y]of corners(f))ctx.fillRect(x-r/2,y-r/2,r,r);}
}
// Corner handles of the selected limb's outline, used to resize it.
const HANDLE=12,corners=f=>[[f.x-2,f.y-2],[f.x+f.w+2,f.y-2],[f.x-2,f.y+f.h+2],[f.x+f.w+2,f.y+f.h+2]];
function refresh(){buildLayers();syncDetail();M.phases.forEach((_,i)=>$('phase-'+i).setAttribute('aria-pressed',String(i===phase)));$('front-arms').checked=collage.phases[phase].frontArms;$('undo').disabled=!undo.length;$('redo').disabled=!redo.length;syncRef();render();}

// ---------- side panel ----------
M.phases.forEach((ph,i)=>{const b=document.createElement('button');b.id='phase-'+i;b.textContent=`${i+1}. ${ph.label}`;b.setAttribute('role','tab');b.onclick=()=>setPhase(i);$('phases').append(b);const o=document.createElement('option');o.value=i;o.textContent='Dessin « '+ph.label+' »';$('src').append(o);});
function setPhase(i){stop();phase=i;refresh();}
function buildLayers(){const ph=collage.phases[phase],list=$('layers');list.textContent='';
 [...ph.order].reverse().forEach(n=>{const l=ph.layers[n],li=document.createElement('li');if(n===selected)li.className='selected';li.onclick=()=>{selected=n;refresh();};
  const eye=document.createElement('input');eye.type='checkbox';eye.checked=l.visible;eye.title='Afficher';eye.onclick=e=>e.stopPropagation();eye.onchange=()=>{snapshot();l.visible=eye.checked;commit();};
  const name=document.createElement('span');name.className='name';name.textContent=names[n];const pos=document.createElement('span');pos.className='pos';pos.textContent=`${l.dx}, ${l.dy}`+(l.scale!==1?` · ${Math.round(l.scale*100)} %`:'');
  const up=document.createElement('button');up.textContent='▲';up.title='Vers l’avant';up.disabled=ph.order.indexOf(n)===ph.order.length-1;up.onclick=e=>{e.stopPropagation();move(n,1);};
  const down=document.createElement('button');down.textContent='▼';down.title='Vers l’arrière';down.disabled=ph.order.indexOf(n)===0;down.onclick=e=>{e.stopPropagation();move(n,-1);};
  li.append(eye,name,pos,up,down);list.append(li);});}
function move(n,step){const o=collage.phases[phase].order,i=o.indexOf(n),j=i+step;if(j<0||j>=o.length)return;snapshot();[o[i],o[j]]=[o[j],o[i]];commit();}
function syncDetail(){const l=layerOf(selected);$('detail-title').textContent=names[selected];$('src').value=l.src;if(document.activeElement!==$('dx'))$('dx').value=l.dx;if(document.activeElement!==$('dy'))$('dy').value=l.dy;
 const pct=Math.round(l.scale*1000)/10;if(document.activeElement!==$('size'))$('size').value=pct;$('size-range').value=pct;$('link-size').checked=collage.linkScale[selected];$('copy-prev').disabled=phase===0;}
// Sets the selected limb's size in this phase, or in every phase when its size is linked.
function setScale(s){s=Collage.clampScale(s);for(const ph of collage.linkScale[selected]?collage.phases:[collage.phases[phase]])ph.layers[selected].scale=s;}
$('size').onchange=e=>{const v=Number(e.target.value);if(!Number.isFinite(v)||v<=0)return syncDetail();snapshot();setScale(v/100);commit();};
let sizeSliding=false;
$('size-range').oninput=e=>{if(!sizeSliding){snapshot();sizeSliding=true;}setScale(Number(e.target.value)/100);syncDetail();render();};
$('size-range').onchange=()=>{sizeSliding=false;commit();};
$('link-size').onchange=e=>{snapshot();collage.linkScale[selected]=e.target.checked;if(e.target.checked)setScale(layerOf(selected).scale);commit(e.target.checked?'Taille de « '+names[selected]+' » identique dans toutes les phases':'');};
$('src').onchange=e=>{snapshot();layerOf(selected).src=Number(e.target.value);commit();};
for(const k of ['dx','dy'])$(k).onchange=e=>{const v=Math.round(Number(e.target.value));if(!Number.isFinite(v))return;snapshot();layerOf(selected)[k]=v;commit();};
$('reset-layer').onclick=()=>{snapshot();Object.assign(layerOf(selected),{src:phase,dx:0,dy:0,visible:true});setScale(1);commit();};
$('copy-prev').onclick=()=>{if(!phase)return;snapshot();Object.assign(layerOf(selected),collage.phases[phase-1].layers[selected]);commit('Copié depuis '+M.phases[phase-1].label);};
$('copy-all').onclick=()=>{snapshot();const l=layerOf(selected);collage.phases.forEach(ph=>Object.assign(ph.layers[selected],l));commit(names[selected]+' appliqué à toutes les phases');};
$('front-arms').onchange=e=>{snapshot();collage.phases[phase].frontArms=e.target.checked;commit();};
$('reset-phase').onclick=()=>{if(!confirm('Remettre la phase « '+M.phases[phase].label+' » comme au départ ?'))return;snapshot();const fresh=Collage.defaults(M).phases[phase];
 // Linked sizes stay shared with the other phases.
 for(const n of M.order)if(collage.linkScale[n])fresh.layers[n].scale=layerOf(n).scale;collage.phases[phase]=fresh;commit('Phase réinitialisée');};
$('undo').onclick=()=>restore(undo,redo);$('redo').onclick=()=>restore(redo,undo);
for(const id of ['onion','onion-alpha','outline','guides'])$(id).oninput=render;
$('zoom').oninput=()=>{canvas.style.width=VIEW.w*Number($('zoom').value)+'px';render();};

// ---------- editing the drawings in Pixelorama ----------
// The link "pixelorama-edit:" is registered by installer-pixelorama.bat; it opens the PNG and refreshes assets/jump/bundle.js on each save.
let editing=false;
$('edit-image').onclick=()=>{const f=Collage.frame(M,collage,phase,selected);editing=true;location.href='pixelorama-edit:'+encodeURI(f.file);status('Ouverture de '+f.file.split('/').slice(-2).join('/')+' dans Pixelorama…');};
// Re-reads bundle.js (a plain script, so it also works from a local file) and replaces the drawings that changed.
function reloadImages(quiet){return new Promise(resolve=>{const s=document.createElement('script');s.src='assets/jump/bundle.js?t='+Date.now();
 s.onerror=()=>{s.remove();resolve(0);};
 s.onload=async()=>{s.remove();const d=window.JUMP_ASSETS,changed=Object.keys(d.images).filter(p=>d.images[p]!==data.images[p]);
  for(const p of changed)await loadImage(p,d.images[p]);Object.assign(M.frames,d.manifest.frames);data.images=d.images;
  if(changed.length){render();status(changed.length+' image(s) mise(s) à jour');}else if(!quiet)status('Aucune image modifiée');resolve(changed.length);};
 document.head.append(s);});}
$('reload-images').onclick=()=>reloadImages(false);
addEventListener('focus',()=>{if(editing)reloadImages(true);});

// ---------- reference image ----------
// A finished sprite shown faintly behind (or in front of) the limbs, per phase, to place them against it.
// Kept apart from the collage: never exported, not in the undo history. Chosen files are remembered as data URLs when they fit.
const REF_KEY='saut-reference-v1',refImages={'image.png':null};
let ref={alpha:.35,front:false,shared:true,phases:M.phases.map(()=>({src:'',x:0,y:0,scale:1}))},refFiles={};
try{const s=JSON.parse(localStorage.getItem(REF_KEY));if(s&&Array.isArray(s.phases)&&s.phases.length===M.phases.length){refFiles=s.files||{};ref={...ref,...s.settings,phases:s.phases};}}catch(e){}
const refOf=p=>ref.phases[p],refImage=r=>r.src&&refImages[r.src];
function saveRef(){const settings={alpha:ref.alpha,front:ref.front,shared:ref.shared};
 try{localStorage.setItem(REF_KEY,JSON.stringify({settings,phases:ref.phases,files:refFiles}));}
 catch(e){try{localStorage.setItem(REF_KEY,JSON.stringify({settings,phases:ref.phases,files:{}}));status('Image trop lourde pour être retenue : il faudra la rechoisir au prochain lancement');}catch(e2){}}}
function drawRef(p){const r=refOf(p),im=refImage(r);if(!im)return;ctx.globalAlpha=ref.alpha;ctx.drawImage(im,r.x,r.y,im.width*r.scale,im.height*r.scale);ctx.globalAlpha=1;}
// Changes the reference of this phase, or of every phase when it is shared.
function editRef(change){for(const r of ref.shared?ref.phases:[refOf(phase)])Object.assign(r,change);saveRef();syncRef();render();}
function addRefOption(key){if([...$('ref-src').options].some(o=>o.value===key))return;const o=document.createElement('option');o.value=key;o.textContent=key.replace(/^fichier:/,'');$('ref-src').append(o);}
function loadRefImage(key,url){return new Promise(resolve=>{const im=new Image();im.onload=()=>{refImages[key]=im;addRefOption(key);resolve(im);};im.onerror=()=>resolve(null);im.src=url;});}
// Scales and places the image so it covers the character of this phase: same height, same feet, same centre.
function fitRef(){const r=refOf(phase),im=refImage(r);if(!im)return;let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
 for(const n of M.order){if(!layerOf(n).visible)continue;const f=Collage.frame(M,collage,phase,n);x0=Math.min(x0,f.x);y0=Math.min(y0,f.y);x1=Math.max(x1,f.x+f.w);y1=Math.max(y1,f.y+f.h);}
 if(!Number.isFinite(x0))return;const scale=Math.round((y1-y0)/im.height*1000)/1000;editRef({scale,x:Math.round((x0+x1)/2-im.width*scale/2),y:Math.round(y1-im.height*scale)});}
function syncRef(){const r=refOf(phase),on=!!refImage(r);$('ref-src').value=refImage(r)?r.src:'';$('ref-alpha').value=ref.alpha;$('ref-front').checked=ref.front;$('ref-shared').checked=ref.shared;
 for(const [id,v]of [['ref-x',r.x],['ref-y',r.y],['ref-size',Math.round(r.scale*1000)/10]]){if(document.activeElement!==$(id))$(id).value=v;$(id).disabled=!on;}$('ref-fit').disabled=!on;}
$('ref-src').onchange=e=>{const src=e.target.value,im=refImages[src];
 // The original drawing sits at sourceOffset in the manifest canvas; other images start fitted on the character.
 if(src==='image.png')editRef({src,x:M.sourceOffset[0],y:M.sourceOffset[1],scale:1});else{editRef({src});if(im&&!refOf(phase).placed){fitRef();editRef({placed:true});}}};
$('ref-load').onclick=()=>$('ref-file').click();
$('ref-file').onchange=async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;const url=await new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result);fr.readAsDataURL(file);});
 const key='fichier:'+file.name;if(!await loadRefImage(key,url))return $('error').textContent='Image illisible : '+file.name;refFiles[key]=url;
 for(const r of ref.shared?ref.phases:[refOf(phase)])r.placed=false;$('ref-src').value=key;$('ref-src').onchange({target:$('ref-src')});status('Référence : '+file.name);};
$('ref-fit').onclick=fitRef;
$('ref-alpha').oninput=e=>{ref.alpha=Number(e.target.value);saveRef();render();};
$('ref-front').onchange=e=>{ref.front=e.target.checked;saveRef();render();};
// Turning sharing on copies this phase's reference to the others.
$('ref-shared').onchange=e=>{ref.shared=e.target.checked;if(ref.shared)editRef({...refOf(phase)});else saveRef();};
$('ref-x').onchange=e=>{const v=Math.round(Number(e.target.value));if(Number.isFinite(v))editRef({x:v});};
$('ref-y').onchange=e=>{const v=Math.round(Number(e.target.value));if(Number.isFinite(v))editRef({y:v});};
$('ref-size').onchange=e=>{const v=Number(e.target.value);if(Number.isFinite(v)&&v>0)editRef({scale:Math.round(v*10)/1000});};
$('ref-move').onchange=render;

// ---------- mouse ----------
function point(e){const r=canvas.getBoundingClientRect();return[(e.clientX-r.left)/r.width*VIEW.w+VIEW.x,(e.clientY-r.top)/r.height*VIEW.h+VIEW.y];}
function hit(n,[x,y]){const l=layerOf(n);if(!l.visible)return false;const f=Collage.frame(M,collage,phase,n),a=alphas[f.file],px=Math.floor((x-f.x)/f.scale),py=Math.floor((y-f.y)/f.scale);return px>=0&&py>=0&&px<a.w&&py<a.h&&a.data[py*a.w+px]>0;}
function onHandle([x,y]){if(!$('outline').checked||!layerOf(selected).visible)return false;const f=Collage.frame(M,collage,phase,selected),r=HANDLE/Number($('zoom').value);return corners(f).some(([cx,cy])=>Math.abs(x-cx)<=r&&Math.abs(y-cy)<=r);}
canvas.addEventListener('pointerdown',e=>{if(playing)stop();const pt=point(e),order=collage.phases[phase].order;
 // "Déplacer la référence" drags the reference image instead of the limbs.
 if($('ref-move').checked&&refImage(refOf(phase))){const r=refOf(phase);drag={ref:true,start:pt,x:r.x,y:r.y};canvas.setPointerCapture(e.pointerId);$('viewport').classList.add('dragging');return;}
 // A corner handle resizes the chosen limb around its centre.
 if(onHandle(pt)){const f=Collage.frame(M,collage,phase,selected);drag={resize:true,cx:f.cx,cy:f.cy,dist:Math.max(1,Math.hypot(pt[0]-f.cx,pt[1]-f.cy)),scale:f.scale,moved:false};canvas.setPointerCapture(e.pointerId);return;}
 // Keep dragging the chosen limb even when another one covers it; otherwise pick the front-most limb under the cursor.
 const n=hit(selected,pt)?selected:[...order].reverse().find(k=>hit(k,pt));if(!n)return;selected=n;const l=layerOf(n);drag={start:pt,dx:l.dx,dy:l.dy,moved:false};canvas.setPointerCapture(e.pointerId);$('viewport').classList.add('dragging');refresh();});
canvas.addEventListener('pointermove',e=>{if(!drag){canvas.style.cursor=$('ref-move').checked?'move':onHandle(point(e))?'nwse-resize':'';return;}
 if(drag.ref){const [x,y]=point(e);for(const r of ref.shared?ref.phases:[refOf(phase)])Object.assign(r,{x:Math.round(drag.x+x-drag.start[0]),y:Math.round(drag.y+y-drag.start[1])});syncRef();render();return;}
 if(drag.resize){const [x,y]=point(e),s=Collage.clampScale(drag.scale*Math.hypot(x-drag.cx,y-drag.cy)/drag.dist);if(s===layerOf(selected).scale)return;if(!drag.moved){snapshot();drag.moved=true;}setScale(s);syncDetail();render();return;}
 const [x,y]=point(e),l=layerOf(selected),dx=Math.round(drag.dx+x-drag.start[0]),dy=Math.round(drag.dy+y-drag.start[1]);if(dx===l.dx&&dy===l.dy)return;if(!drag.moved){snapshot();drag.moved=true;}l.dx=dx;l.dy=dy;syncDetail();render();});
function endDrag(){if(!drag)return;if(drag.ref){drag=null;$('viewport').classList.remove('dragging');saveRef();return;}const moved=drag.moved;drag=null;$('viewport').classList.remove('dragging');if(moved)commit();}
canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);

// ---------- keyboard ----------
addEventListener('keydown',e=>{if(e.target.closest&&e.target.closest('input,select,textarea'))return;const k=e.key.toLowerCase();
 if((e.ctrlKey||e.metaKey)&&k==='z'){e.preventDefault();e.shiftKey?restore(redo,undo):restore(undo,redo);return;}
 if((e.ctrlKey||e.metaKey)&&k==='y'){e.preventDefault();restore(redo,undo);return;}
 if(/^[1-9]$/.test(e.key)&&Number(e.key)<=M.phases.length){setPhase(Number(e.key)-1);return;}
 const grow={'+':1,'=':1,'-':-1,pageup:10,pagedown:-10}[k];
 if(grow&&!e.ctrlKey&&!e.metaKey){e.preventDefault();if(!e.repeat)snapshot();setScale(layerOf(selected).scale+grow/100);commit('');return;}
 const d={arrowleft:[-1,0],arrowright:[1,0],arrowup:[0,-1],arrowdown:[0,1]}[k];if(!d)return;e.preventDefault();const s=e.shiftKey?10:1,l=layerOf(selected);
 if(!e.repeat)snapshot();l.dx+=d[0]*s;l.dy+=d[1]*s;commit('');});

// ---------- preview ----------
const TIMING=[[0,.36],[1,.58],[2,.26],[3,.74],[0,.28]];
function stop(){if(!playing)return;cancelAnimationFrame(playing.raf);playing=null;$('play').textContent='▶ Aperçu';$('play').setAttribute('aria-pressed','false');render();}
$('play').onclick=()=>{if(playing)return stop();playing={start:performance.now(),phase:0};$('play').textContent='■ Arrêter';$('play').setAttribute('aria-pressed','true');
 const total=TIMING.reduce((s,t)=>s+t[1],0);(function tick(now){if(!playing)return;let t=((now-playing.start)/1000)%total;for(const [p,d]of TIMING){if(t<d){playing.phase=p;break;}t-=d;}render();playing.raf=requestAnimationFrame(tick);})(performance.now());};

// ---------- export ----------
const phaseCanvas=p=>{const c=document.createElement('canvas');c.width=M.width;c.height=M.height;drawPhase(c.getContext('2d'),p);return c;};
// One box around the character in every phase, so the exported frames line up.
function unionBox(){let x0=M.width,y0=M.height,x1=-1,y1=-1;for(let p=0;p<M.phases.length;p++){const d=phaseCanvas(p).getContext('2d').getImageData(0,0,M.width,M.height).data;
 for(let y=0;y<M.height;y++)for(let x=0;x<M.width;x++)if(d[(y*M.width+x)*4+3]){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}}
 const pad=4;return{x:Math.max(0,x0-pad),y:Math.max(0,y0-pad),w:Math.min(M.width,x1+pad+1)-Math.max(0,x0-pad),h:Math.min(M.height,y1+pad+1)-Math.max(0,y0-pad)};}
function cropped(p,b){const c=document.createElement('canvas');c.width=b.w;c.height=b.h;c.getContext('2d').drawImage(phaseCanvas(p),-b.x,-b.y);return c;}
function download(name,href){const a=document.createElement('a');a.download=name;a.href=href;document.body.append(a);a.click();a.remove();}
$('export-phase').onclick=()=>{const b=unionBox();download(`saut-${phase+1}-${M.phases[phase].id}.png`,cropped(phase,b).toDataURL('image/png'));status('PNG exporté');};
$('export-sheet').onclick=()=>{const b=unionBox(),n=M.phases.length,c=document.createElement('canvas');c.width=b.w*n;c.height=b.h;const g=c.getContext('2d');for(let p=0;p<n;p++)g.drawImage(cropped(p,b),p*b.w,0);download('saut-planche.png',c.toDataURL('image/png'));status(`Planche exportée : ${n} images de ${b.w} × ${b.h}`);};
$('export-all').onclick=async()=>{const b=unionBox();for(let p=0;p<M.phases.length;p++){download(`saut-${p+1}-${M.phases[p].id}.png`,cropped(p,b).toDataURL('image/png'));await new Promise(r=>setTimeout(r,350));}status('4 PNG exportés');};
$('save-file').onclick=()=>{const text='// Collage des membres du saut, créé avec editeur.html.\nwindow.JUMP_COLLAGE='+JSON.stringify(collage,null,1)+';\n';download('collage-data.js',URL.createObjectURL(new Blob([text],{type:'text/javascript'})));status('Place le fichier dans assets/jump');};
// Positions of every layer, phase by phase, for animating the separate layer PNGs (nothing is flattened).
const r2=v=>Math.round(v*100)/100;
function positions(){return{format:'saut-positions',version:1,
 note:'Coordonnées en pixels dans un canevas commun à toutes les phases, origine en haut à gauche. x, y : coin haut-gauche du calque affiché ; largeur, hauteur : taille affichée (image × echelle). Calques listés de l’arrière vers l’avant (z). Le champ « editeur » permet de réimporter ces réglages dans editeur.html.',
 canevas:{largeur:M.width,hauteur:M.height},repere:{x:AXIS,y:GROUND,description:'axe du personnage et sol dans l’éditeur'},
 phases:M.phases.map((ph,p)=>{const c=collage.phases[p];return{id:ph.id,nom:ph.label,
  calques:c.order.map((n,z)=>{const l=c.layers[n],f=Collage.frame(M,collage,p,n),o=M.frames[n][l.src];
   return{calque:n,nom:names[n],fichier:f.file,dessin:M.phases[l.src].id,z,visible:l.visible,x:r2(f.x),y:r2(f.y),largeur:r2(f.w),hauteur:r2(f.h),echelle:l.scale,centre:{x:r2(f.cx),y:r2(f.cy)},decalage:{x:l.dx,y:l.dy},taille_image:{largeur:o.w,hauteur:o.h}};}),
  // Arms of the torso redrawn above the head: a second torso copy limited to these rectangles, placed at the very front.
  brasDevant:c.frontArms&&c.layers.torso.visible?(()=>{const f=Collage.frame(M,collage,p,'torso'),o=M.frames.torso[c.layers.torso.src],ox=o.x+o.w/2,oy=o.y+o.h/2;
   return{fichier:f.file,x:r2(f.x),y:r2(f.y),largeur:r2(f.w),hauteur:r2(f.h),zones:M.frontArmRegions.map(([x,y,w,h])=>({x:r2(f.cx+(x-ox)*f.scale),y:r2(f.cy+(y-oy)*f.scale),largeur:r2(w*f.scale),hauteur:r2(h*f.scale)}))};})():null};}),
 editeur:collage};}
$('export-json').onclick=()=>{download('saut-positions.json',URL.createObjectURL(new Blob([JSON.stringify(positions(),null,1)],{type:'application/json'})));status('Positions exportées : saut-positions.json');};
$('load-file').onclick=()=>$('file').click();
$('file').onchange=async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;try{const t=await file.text(),json=JSON.parse(t.slice(t.indexOf('{'),t.lastIndexOf('}')+1));snapshot();collage=Collage.normalize(M,json.editeur||json);commit('Réglages importés');}catch(err){$('error').textContent='Fichier illisible : '+err.message;}};

// ---------- start ----------
// Decodes one drawing and keeps its alpha channel for clicking on the limbs.
function loadImage(p,url){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{images[p]=im;if(p!=='image.png'){const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const g=c.getContext('2d');g.drawImage(im,0,0);const d=g.getImageData(0,0,im.width,im.height).data,a=new Uint8Array(im.width*im.height);for(let i=0;i<a.length;i++)a[i]=d[i*4+3];alphas[p]={w:im.width,h:im.height,data:a};}resolve();};im.onerror=()=>reject(Error(p));im.src=url;});}
Promise.all(Object.entries(data.images).map(([p,url])=>loadImage(p,url)))
 .then(async()=>{refImages['image.png']=images['image.png'];for(const [key,url]of Object.entries(refFiles))await loadRefImage(key,url);$('zoom').oninput();refresh();window.editorReady=true;}).catch(e=>{$('error').textContent='Image manquante : '+e.message;console.error(e);});
