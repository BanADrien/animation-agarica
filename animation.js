'use strict';
const $=id=>document.getElementById(id),bundle=window.CHARACTER_ASSETS,manifest=bundle.manifest;
const canvas=$('stage'),ctx=canvas.getContext('2d'),images={};
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
function advance(dt){state.time+=dt;const duration=6/Number($('fps').value);if(state.attack>=0){state.attack+=dt;if(state.attack>=duration)state.attack=-1;}if(state.attack<0&&$('repeat').checked)state.attack=0;if(state.jump>=0){state.jump+=dt;if(state.jump>=.95)state.jump=-1;}}
function selections(){const frame=Math.floor(state.time*Number($('fps').value)),result=Object.fromEntries(manifest.order.map(n=>[n,'base']));
 if(state.mode==='idle'){result.hair=[0,0,1,0,0,2][Math.floor(frame/2)%6];result.cape=[0,0,1,0,0,2][Math.floor(frame/2)%6];}
 if(state.mode==='walk'){result.lower=[0,1,2,1][frame%4];result.cape=[0,1,0,2][frame%4];result.hair=[0,1,0,2][frame%4];}
 if(state.jump>=0){result.lower=3;result.cape=3;result.hair=3;}
 if(state.attack>=0){const i=Math.min(5,Math.floor(state.attack*Number($('fps').value)));result.torso=[0,1,2,2,3,0][i];}
 if($('emotion').value!=='original')result.eyes=Number($('emotion').value);
 if($('blink').checked){const b=state.time%3.6;if(b>3.31)result.eyes=b>3.38&&b<3.52?2:1;}
 for(const n of manifest.order)if(state.override[n]!=='auto')result[n]=state.override[n]==='base'?'base':Number(state.override[n]);return result;
}
const surface=document.createElement('canvas');surface.width=manifest.width;surface.height=manifest.height;const painter=surface.getContext('2d');
function compose(picks,forceBase=false){painter.clearRect(0,0,surface.width,surface.height);painter.imageSmoothingEnabled=false;
 for(const n of manifest.order){if(!forceBase&&!state.visible[n])continue;const pose=forceBase?'base':picks[n];
 if(n==='head'&&!forceBase&&picks.hair!=='base'&&pose==='base'){painter.save();painter.beginPath();painter.rect(596,220,251,235);painter.clip();painter.drawImage(images[manifest.poses.head[0]],0,0);painter.restore();painter.save();painter.beginPath();painter.rect(0,385,manifest.width,manifest.height-385);painter.clip();painter.drawImage(images[manifest.base.head],0,0);painter.restore();continue;}
 if(n==='eyes'&&pose!=='base'&&state.visible.head)painter.drawImage(images[manifest.eyeUnderlay],0,0);painter.drawImage(images[pose==='base'?manifest.base[n]:manifest.poses[n][pose]],0,0);}return surface;
}
function render(){const picks=selections();ctx.clearRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=false;
 const airborne=!state.reference&&state.jump>=0,offset=airborne?Math.round(Math.sin(Math.PI*state.jump/.95)*55):0;
 if($('explode').checked&&!state.reference){manifest.order.forEach((n,i)=>{if(!state.visible[n])return;const p=picks[n],path=p==='base'?manifest.base[n]:manifest.poses[n][p],img=images[path],b=manifest.bounds[path],scale=Math.min(195/b[2],230/b[3],.65),w=b[2]*scale,h=b[3]*scale,x=(i%3)*230+(230-w)/2,y=Math.floor(i/3)*303+52+(230-h)/2;ctx.drawImage(img,...b,x,y,w,h);ctx.fillStyle='#dce9d0';ctx.font='13px system-ui';ctx.fillText(labels[n],(i%3)*230+30,Math.floor(i/3)*303+304);});}
 else{const scale=.5,art=compose(picks,state.reference);ctx.drawImage(art,30,50-offset,manifest.width*scale,manifest.height*scale);}
 $('view-label').textContent=state.reference?'RÉFÉRENCE · PIXELS D’ORIGINE':$('explode').checked?'VUE ÉCLATÉE · COUCHES INDÉPENDANTES':state.mode==='rest'&&state.attack<0&&state.jump<0?'POSE D’ORIGINE · 6 COUCHES':'LECTURE DES POSES DESSINÉES';
 $('frame-label').textContent=manifest.order.map(n=>labels[n]+': '+(picks[n]==='base'?'source':picks[n]+1)).join(' · ');
 $('status').textContent=`Bas : ${state.jump>=0?'saut':state.mode} · Haut : ${state.attack>=0?'attaque':'repos'} · Yeux indépendants`;window.demoState={...state,selections:picks};
}
$('download').onclick=()=>{const art=compose(selections(),state.reference);const link=document.createElement('a');link.download='personnage-pose.png';link.href=art.toDataURL('image/png');link.click();};
async function start(){await Promise.all(Object.entries(bundle.images).map(([path,data])=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{images[path]=im;resolve();};im.onerror=reject;im.src=data;})));
 $('validation').textContent='Repos : 0 pixel modifié';window.demoReady=true;window.demoAPI={state,selections,compose,render,advance,manifest,images};let previous=0;
 function tick(ms){const dt=Math.min((ms-previous)/1000||0,.05);previous=ms;if(!state.paused)advance(dt);render();requestAnimationFrame(tick);}requestAnimationFrame(tick);
}
start().catch(e=>{$('error').textContent='Chargement impossible. Garder index.html, animation.js et le dossier assets ensemble.';console.error(e);});
