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
 if(!playing&&$('onion').checked&&phase>0){lg.clearRect(0,0,M.width,M.height);drawPhase(lg,phase-1);ctx.globalAlpha=Number($('onion-alpha').value);ctx.drawImage(layerCanvas,0,0);ctx.globalAlpha=1;}
 drawPhase(ctx,p);
 if(!playing&&$('outline').checked&&layerOf(selected).visible){const f=Collage.frame(M,collage,phase,selected),z=Number($('zoom').value);ctx.strokeStyle='#ffd27a';ctx.lineWidth=2/z;ctx.setLineDash([8/z,6/z]);ctx.strokeRect(f.x-2,f.y-2,f.w+4,f.h+4);ctx.setLineDash([]);}
}
function refresh(){buildLayers();syncDetail();M.phases.forEach((_,i)=>$('phase-'+i).setAttribute('aria-pressed',String(i===phase)));$('front-arms').checked=collage.phases[phase].frontArms;$('undo').disabled=!undo.length;$('redo').disabled=!redo.length;render();}

// ---------- side panel ----------
M.phases.forEach((ph,i)=>{const b=document.createElement('button');b.id='phase-'+i;b.textContent=`${i+1}. ${ph.label}`;b.setAttribute('role','tab');b.onclick=()=>setPhase(i);$('phases').append(b);const o=document.createElement('option');o.value=i;o.textContent='Dessin « '+ph.label+' »';$('src').append(o);});
function setPhase(i){stop();phase=i;refresh();}
function buildLayers(){const ph=collage.phases[phase],list=$('layers');list.textContent='';
 [...ph.order].reverse().forEach(n=>{const l=ph.layers[n],li=document.createElement('li');if(n===selected)li.className='selected';li.onclick=()=>{selected=n;refresh();};
  const eye=document.createElement('input');eye.type='checkbox';eye.checked=l.visible;eye.title='Afficher';eye.onclick=e=>e.stopPropagation();eye.onchange=()=>{snapshot();l.visible=eye.checked;commit();};
  const name=document.createElement('span');name.className='name';name.textContent=names[n];const pos=document.createElement('span');pos.className='pos';pos.textContent=`${l.dx}, ${l.dy}`;
  const up=document.createElement('button');up.textContent='▲';up.title='Vers l’avant';up.disabled=ph.order.indexOf(n)===ph.order.length-1;up.onclick=e=>{e.stopPropagation();move(n,1);};
  const down=document.createElement('button');down.textContent='▼';down.title='Vers l’arrière';down.disabled=ph.order.indexOf(n)===0;down.onclick=e=>{e.stopPropagation();move(n,-1);};
  li.append(eye,name,pos,up,down);list.append(li);});}
function move(n,step){const o=collage.phases[phase].order,i=o.indexOf(n),j=i+step;if(j<0||j>=o.length)return;snapshot();[o[i],o[j]]=[o[j],o[i]];commit();}
function syncDetail(){const l=layerOf(selected);$('detail-title').textContent=names[selected];$('src').value=l.src;if(document.activeElement!==$('dx'))$('dx').value=l.dx;if(document.activeElement!==$('dy'))$('dy').value=l.dy;$('copy-prev').disabled=phase===0;}
$('src').onchange=e=>{snapshot();layerOf(selected).src=Number(e.target.value);commit();};
for(const k of ['dx','dy'])$(k).onchange=e=>{const v=Math.round(Number(e.target.value));if(!Number.isFinite(v))return;snapshot();layerOf(selected)[k]=v;commit();};
$('reset-layer').onclick=()=>{snapshot();Object.assign(layerOf(selected),{src:phase,dx:0,dy:0,visible:true});commit();};
$('copy-prev').onclick=()=>{if(!phase)return;snapshot();Object.assign(layerOf(selected),collage.phases[phase-1].layers[selected]);commit('Copié depuis '+M.phases[phase-1].label);};
$('copy-all').onclick=()=>{snapshot();const l=layerOf(selected);collage.phases.forEach(ph=>Object.assign(ph.layers[selected],l));commit(names[selected]+' appliqué à toutes les phases');};
$('front-arms').onchange=e=>{snapshot();collage.phases[phase].frontArms=e.target.checked;commit();};
$('reset-phase').onclick=()=>{if(!confirm('Remettre la phase « '+M.phases[phase].label+' » comme au départ ?'))return;snapshot();collage.phases[phase]=Collage.defaults(M).phases[phase];commit('Phase réinitialisée');};
$('undo').onclick=()=>restore(undo,redo);$('redo').onclick=()=>restore(redo,undo);
for(const id of ['onion','onion-alpha','outline','guides'])$(id).oninput=render;
$('zoom').oninput=()=>{canvas.style.width=VIEW.w*Number($('zoom').value)+'px';render();};

// ---------- mouse ----------
function point(e){const r=canvas.getBoundingClientRect();return[(e.clientX-r.left)/r.width*VIEW.w+VIEW.x,(e.clientY-r.top)/r.height*VIEW.h+VIEW.y];}
function hit(n,[x,y]){const l=layerOf(n);if(!l.visible)return false;const f=Collage.frame(M,collage,phase,n),a=alphas[f.file],px=Math.floor(x-f.x),py=Math.floor(y-f.y);return px>=0&&py>=0&&px<a.w&&py<a.h&&a.data[py*a.w+px]>0;}
canvas.addEventListener('pointerdown',e=>{if(playing)stop();const pt=point(e),order=collage.phases[phase].order;
 // Keep dragging the chosen limb even when another one covers it; otherwise pick the front-most limb under the cursor.
 const n=hit(selected,pt)?selected:[...order].reverse().find(k=>hit(k,pt));if(!n)return;selected=n;const l=layerOf(n);drag={start:pt,dx:l.dx,dy:l.dy,moved:false};canvas.setPointerCapture(e.pointerId);$('viewport').classList.add('dragging');refresh();});
canvas.addEventListener('pointermove',e=>{if(!drag)return;const [x,y]=point(e),l=layerOf(selected),dx=Math.round(drag.dx+x-drag.start[0]),dy=Math.round(drag.dy+y-drag.start[1]);if(dx===l.dx&&dy===l.dy)return;if(!drag.moved){snapshot();drag.moved=true;}l.dx=dx;l.dy=dy;syncDetail();render();});
function endDrag(){if(!drag)return;const moved=drag.moved;drag=null;$('viewport').classList.remove('dragging');if(moved)commit();}
canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);

// ---------- keyboard ----------
addEventListener('keydown',e=>{if(e.target.closest&&e.target.closest('input,select,textarea'))return;const k=e.key.toLowerCase();
 if((e.ctrlKey||e.metaKey)&&k==='z'){e.preventDefault();e.shiftKey?restore(redo,undo):restore(undo,redo);return;}
 if((e.ctrlKey||e.metaKey)&&k==='y'){e.preventDefault();restore(redo,undo);return;}
 if(/^[1-9]$/.test(e.key)&&Number(e.key)<=M.phases.length){setPhase(Number(e.key)-1);return;}
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
$('load-file').onclick=()=>$('file').click();
$('file').onchange=async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;try{const t=await file.text(),json=JSON.parse(t.slice(t.indexOf('{'),t.lastIndexOf('}')+1));snapshot();collage=Collage.normalize(M,json);commit('Réglages importés');}catch(err){$('error').textContent='Fichier illisible : '+err.message;}};

// ---------- start ----------
Promise.all(Object.entries(data.images).map(([p,url])=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{images[p]=im;if(p!=='image.png'){const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const g=c.getContext('2d');g.drawImage(im,0,0);const d=g.getImageData(0,0,im.width,im.height).data,a=new Uint8Array(im.width*im.height);for(let i=0;i<a.length;i++)a[i]=d[i*4+3];alphas[p]={w:im.width,h:im.height,data:a};}resolve();};im.onerror=()=>reject(Error(p));im.src=url;})))
 .then(()=>{$('zoom').oninput();refresh();window.editorReady=true;}).catch(e=>{$('error').textContent='Image manquante : '+e.message;console.error(e);});
