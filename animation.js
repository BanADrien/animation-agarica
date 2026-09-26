'use strict';
const $=id=>document.getElementById(id),bundle=window.CHARACTER_ASSETS,manifest=bundle.manifest;
const canvas=$('stage'),ctx=canvas.getContext('2d'),images={};
// Jump: drawings and limb placement from editeur.html (browser storage or assets/jump/collage-data.js), on its own larger canvas.
const jumpData=window.JUMP_ASSETS,JM=jumpData.manifest,jumpImages={};let collage=Collage.load(JM);addEventListener('focus',()=>{collage=Collage.load(JM);});
// Same timeline as saut.html at speed 1: start of each phase (appui, montée, apogée, chute, réception) and end, in seconds; 180 px high on the jump canvas.
const JUMP_TIMES=[0,.36,.94,1.20,1.94,2.22],JUMP_HEIGHT=180;
function jumpPhase(t){const i=JUMP_TIMES.findIndex(x=>t<x)-1;return i<0||i>3?0:i;}
function jumpHeight(t){if(t<.36||t>=1.94)return 0;if(t<.94)return JUMP_HEIGHT*(1-Math.pow(1-(t-.36)/.58,2));if(t<1.20)return JUMP_HEIGHT;const q=(t-1.20)/.74;return JUMP_HEIGHT*(1-q*q);}
const labels={cape:'Cape',lower:'Bas du corps',torso:'Torse + bras',head:'Tête',eyes:'Yeux',hair:'Cheveux'};
const state={mode:'rest',time:0,attack:-1,jump:-1,paused:false,reference:false,visible:{},override:{}};
for(const name of manifest.order){state.visible[name]=true;state.override[name]='auto';const row=document.createElement('div');row.className='layer';row.innerHTML=`<input type="checkbox" checked aria-label="Afficher ${labels[name]}" id="show-${name}"><label for="show-${name}">${labels[name]}</label><select id="pose-${name}" aria-label="Pose ${labels[name]}"><option value="auto">Auto</option><option value="base">Original</option>${[0,1,2,3].map(i=>`<option value="${i}">Pose ${i+1}</option>`).join('')}</select>`;$('layers').append(row);$('show-'+name).onchange=e=>state.visible[name]=e.target.checked;$('pose-'+name).onchange=e=>state.override[name]=e.target.value;}
function mode(m){state.mode=m;for(const k of ['rest','idle','walk'])$(k).setAttribute('aria-pressed',String(k===m));}
for(const k of ['rest','idle','walk'])$(k).onclick=()=>mode(k);
$('attack').onclick=()=>{if(state.attack<0)state.attack=0;};$('jump').onclick=()=>{if(state.jump<0)state.jump=0;};
$('pause').onclick=()=>{state.paused=!state.paused;$('pause').setAttribute('aria-pressed',String(state.paused));$('pause').textContent=state.paused?'Reprendre':'Pause';};
$('step').onclick=()=>{state.paused=true;$('pause').setAttribute('aria-pressed','true');$('pause').textContent='Reprendre';advance(1/Number($('fps').value));};
$('reference').onclick=()=>{state.reference=!state.reference;$('reference').setAttribute('aria-pressed',String(state.reference));};
$('reset').onclick=()=>{mode('rest');Object.assign(state,{time:0,attack:-1,jump:-1,paused:false,reference:false});$('pause').textContent='Pause';$('pause').setAttribute('aria-pressed','false');$('reference').setAttribute('aria-pressed','false');for(const k of ['blink','repeat','explode'])$(k).checked=false;$('emotion').value='original';for(const n of manifest.order){state.visible[n]=true;state.override[n]='auto';$('show-'+n).checked=true;$('pose-'+n).value='auto';}};
function advance(dt){state.time+=dt;const duration=6/Number($('fps').value);if(state.attack>=0){state.attack+=dt;if(state.attack>=duration)state.attack=-1;}if(state.attack<0&&$('repeat').checked)state.attack=0;if(state.jump>=0){state.jump+=dt;if(state.jump>=JUMP_TIMES[5])state.jump=-1;}}
function selections(){const frame=Math.floor(state.time*Number($('fps').value)),result=Object.fromEntries(manifest.order.map(n=>[n,'base']));
 if(state.mode==='idle'){result.hair=[0,0,1,0,0,2][Math.floor(frame/2)%6];result.cape=[0,0,1,0,0,2][Math.floor(frame/2)%6];}
 if(state.mode==='walk'){result.lower=[0,1,2,1][frame%4];result.cape=[0,1,0,2][frame%4];result.hair=[0,1,0,2][frame%4];}
 // The jump drives every layer; the attack (torso), the eyes and the pose menus then take over their own layer.
 if(state.jump>=0)for(const n of manifest.order)result[n]='jump';
 if(state.attack>=0){const i=Math.min(5,Math.floor(state.attack*Number($('fps').value)));result.torso=[0,1,2,2,3,0][i];}
 if($('emotion').value!=='original')result.eyes=Number($('emotion').value);
 if($('blink').checked){const b=state.time%3.6;if(b>3.31)result.eyes=b>3.38&&b<3.52?2:1;}
 for(const n of manifest.order)if(state.override[n]!=='auto')result[n]=state.override[n]==='base'?'base':Number(state.override[n]);return result;
}
const surface=document.createElement('canvas');surface.width=manifest.width;surface.height=manifest.height;const painter=surface.getContext('2d');
const jumpSurface=document.createElement('canvas');jumpSurface.width=JM.width;jumpSurface.height=JM.height;const jumpPainter=jumpSurface.getContext('2d');
const posePath=(n,pose)=>pose==='base'?manifest.base[n]:manifest.poses[n][pose];
// Jump phase with other animations on top. A layer taken over (attack torso, blinking eyes…) is drawn in its slot of the jump's layer order
// and follows the jump limb it replaces: its attach point is moved onto that limb's attach point.
function composeJump(picks){const g=jumpPainter,p=jumpPhase(state.jump),ph=collage.phases[p];g.clearRect(0,0,JM.width,JM.height);g.imageSmoothingEnabled=false;
 for(const n of ph.order){if(!state.visible[n])continue;
  if(picks[n]==='jump'){if(ph.layers[n].visible)Collage.drawLayer(g,jumpImages,JM,collage,p,n);continue;}
  const [ax,ay]=Collage.anchor(JM,collage,p,n),[tx,ty]=JM.registration[n].target;g.save();g.translate(ax-tx,ay-ty);
  if(n==='eyes'&&picks.eyes!=='base'&&state.visible.head)g.drawImage(images[manifest.eyeUnderlay],0,0);
  g.drawImage(images[posePath(n,picks[n])],0,0);g.restore();}
 if(ph.frontArms&&picks.torso==='jump'&&state.visible.torso&&ph.layers.torso.visible)Collage.drawFrontArms(g,jumpImages,JM,collage,p);return jumpSurface;}
const jumping=picks=>!state.reference&&manifest.order.some(n=>picks[n]==='jump');
function compose(picks,forceBase=false){painter.clearRect(0,0,surface.width,surface.height);painter.imageSmoothingEnabled=false;
 for(const n of manifest.order){if(!forceBase&&!state.visible[n])continue;const pose=forceBase?'base':picks[n];
 if(n==='head'&&!forceBase&&picks.hair!=='base'&&pose==='base'){painter.save();painter.beginPath();painter.rect(596,220,251,235);painter.clip();painter.drawImage(images[manifest.poses.head[0]],0,0);painter.restore();painter.save();painter.beginPath();painter.rect(0,385,manifest.width,manifest.height-385);painter.clip();painter.drawImage(images[manifest.base.head],0,0);painter.restore();continue;}
 if(n==='eyes'&&pose!=='base'&&state.visible.head)painter.drawImage(images[manifest.eyeUnderlay],0,0);painter.drawImage(images[posePath(n,pose)],0,0);}return surface;
}
// Where the original canvas sits on the stage: room above the head for the jump's height and flying hair.
const VIEW={x:68,y:155,scale:.44};
function render(){const picks=selections();ctx.clearRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=false;
 if($('explode').checked&&!state.reference){manifest.order.forEach((n,i)=>{if(!state.visible[n])return;const p=picks[n],jf=p==='jump'&&Collage.frame(JM,collage,jumpPhase(state.jump),n),img=jf?jumpImages[jf.file]:images[posePath(n,p)],b=jf?[0,0,img.width,img.height]:manifest.bounds[posePath(n,p)],scale=Math.min(195/b[2],230/b[3],.65),w=b[2]*scale,h=b[3]*scale,x=(i%3)*230+(230-w)/2,y=Math.floor(i/3)*303+52+(230-h)/2;ctx.drawImage(img,...b,x,y,w,h);ctx.fillStyle='#dce9d0';ctx.font='13px system-ui';ctx.fillText(labels[n],(i%3)*230+30,Math.floor(i/3)*303+304);});}
 else if(jumping(picks)){const {x,y,scale}=VIEW,[ox,oy]=JM.sourceOffset;ctx.drawImage(composeJump(picks),x-ox*scale,y-(oy+jumpHeight(state.jump))*scale,JM.width*scale,JM.height*scale);}
 else{const {x,y,scale}=VIEW,art=compose(picks,state.reference);ctx.drawImage(art,x,y,manifest.width*scale,manifest.height*scale);}
 $('view-label').textContent=state.reference?'RÉFÉRENCE · PIXELS D’ORIGINE':$('explode').checked?'VUE ÉCLATÉE · COUCHES INDÉPENDANTES':state.mode==='rest'&&state.attack<0&&state.jump<0?'POSE D’ORIGINE · 6 COUCHES':'LECTURE DES POSES DESSINÉES';
 $('frame-label').textContent=manifest.order.map(n=>labels[n]+': '+(picks[n]==='base'?'source':picks[n]==='jump'?'saut':picks[n]+1)).join(' · ');
 $('status').textContent=`Bas : ${state.jump>=0?'saut':state.mode} · Haut : ${state.attack>=0?'attaque':'repos'} · Yeux indépendants`;window.demoState={...state,selections:picks};
}
$('download').onclick=()=>{const picks=selections(),art=jumping(picks)?composeJump(picks):compose(picks,state.reference);const link=document.createElement('a');link.download='personnage-pose.png';link.href=art.toDataURL('image/png');link.click();};
const loadAll=(sources,into)=>Promise.all(Object.entries(sources).map(([path,data])=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{into[path]=im;resolve();};im.onerror=reject;im.src=data;})));
async function start(){await Promise.all([loadAll(bundle.images,images),loadAll(jumpData.images,jumpImages)]);
 $('validation').textContent='Repos : 0 pixel modifié';window.demoReady=true;window.demoAPI={state,selections,compose,render,advance,manifest,images};let previous=0;
 function tick(ms){const dt=Math.min((ms-previous)/1000||0,.05);previous=ms;if(!state.paused)advance(dt);render();requestAnimationFrame(tick);}requestAnimationFrame(tick);
}
start().catch(e=>{$('error').textContent='Chargement impossible. Garder index.html, animation.js, collage.js et le dossier assets ensemble.';console.error(e);});
