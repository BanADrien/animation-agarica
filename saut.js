'use strict';
const $=id=>document.getElementById(id),data=window.JUMP_ASSETS,M=data.manifest,images={};
const names={cape:'Cape',lower:'Bas du corps',torso:'Torse et bras',head:'Tête',eyes:'Yeux',hair:'Cheveux'};
const explanations=['Appui : genoux fléchis et bras en préparation.','Montée : les cheveux et la cape traînent vers le bas ; les bras restent bas.','Apogée : les jambes se replient, les bras s’écartent, cheveux et cape commencent à flotter.','Chute : les jambes se préparent à réceptionner ; les bras, les cheveux et la cape remontent.'];
// Limb placement per phase comes from editeur.html (browser storage) or assets/jump/collage-data.js.
let collage=Collage.load(M);addEventListener('storage',e=>{if(e.key===Collage.KEY)collage=Collage.load(M);});addEventListener('focus',()=>{collage=Collage.load(M);});
const state={phase:0,time:0,playing:false,paused:false,reference:false,visible:Object.fromEntries(M.order.map(n=>[n,true])),height:0};
const canvas=$('jump-stage'),ctx=canvas.getContext('2d'),surface=document.createElement('canvas');surface.width=M.width;surface.height=M.height;const g=surface.getContext('2d');
for(const [i,phase]of M.phases.entries()){const button=document.createElement('button');button.innerHTML=`${i+1}. ${phase.label}<span>Phase du saut</span>`;button.id='phase-'+i;button.setAttribute('aria-pressed',String(i===0));button.onclick=()=>choose(i);$('phases').append(button);}
for(const name of M.order){const row=document.createElement('div');row.className='layer';row.innerHTML=`<input type="checkbox" checked id="layer-${name}"><label for="layer-${name}">${names[name]}</label><a id="png-${name}" download>PNG</a>`;$('layers').append(row);$('layer-'+name).onchange=e=>state.visible[name]=e.target.checked;const card=document.createElement('div');card.className='sheet';card.innerHTML=`<a href="assets/jump/sheets/${name}.png" target="_blank"><img src="assets/jump/sheets/${name}.png" alt="Six poses du saut — ${names[name]}">${names[name]} · planche complète</a>`;$('sheets').append(card);}
function choose(i){state.phase=i;state.playing=false;state.paused=false;state.height=0;$('pause').textContent='Pause';$('pause').setAttribute('aria-pressed','false');render();}
function play(){Object.assign(state,{time:0,phase:0,playing:true,paused:false,reference:false,height:0});$('reference').setAttribute('aria-pressed','false');$('pause').textContent='Pause';$('pause').setAttribute('aria-pressed','false');}
$('play').onclick=play;
$('loop').onchange=e=>{if(e.target.checked&&!state.playing)play();};
$('pause').onclick=()=>{if(!state.playing)return;state.paused=!state.paused;$('pause').textContent=state.paused?'Reprendre':'Pause';$('pause').setAttribute('aria-pressed',String(state.paused));};
$('next').onclick=()=>choose((state.phase+1)%M.phases.length);
$('reference').onclick=()=>{state.reference=!state.reference;$('reference').setAttribute('aria-pressed',String(state.reference));};
function advance(dt){if(!state.playing||state.paused)return;state.time+=dt*Number($('speed').value);const t=state.time;
 if(t<.36){state.phase=0;state.height=0;}
 else if(t<.94){state.phase=1;state.height=180*(1-Math.pow(1-(t-.36)/.58,2));}
 else if(t<1.20){state.phase=2;state.height=180;}
 else if(t<1.94){const q=(t-1.20)/.74;state.phase=3;state.height=180*(1-q*q);}
 else if(t<2.22){state.phase=0;state.height=0;}
 else if($('loop').checked){state.time=0;state.phase=0;state.height=0;}
 else{state.playing=false;state.phase=0;state.height=0;}
}
function compose(){g.clearRect(0,0,M.width,M.height);g.imageSmoothingEnabled=false;if(state.reference){g.drawImage(images['image.png'],...M.sourceOffset);return surface;}Collage.draw(g,images,M,collage,state.phase,state.visible);return surface;}
function render(){ctx.clearRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=false;const phase=state.phase;
 if($('explode').checked&&!state.reference){M.order.forEach((n,i)=>{if(!state.visible[n])return;const f=Collage.frame(M,collage,phase,n),scale=Math.min(205/f.w,280/f.h,.65),w=f.w*scale,h=f.h*scale,x=(i%3)*240+(240-w)/2,y=Math.floor(i/3)*365+25+(290-h)/2;ctx.drawImage(images[f.file],x,y,w,h);ctx.fillStyle='#e8efdc';ctx.font='14px system-ui';ctx.fillText(names[n],(i%3)*240+25,Math.floor(i/3)*365+342);});}
 else{ctx.fillStyle='#1c3026';ctx.beginPath();ctx.ellipse(370,703,116,12,0,0,Math.PI*2);ctx.fill();const scale=.43,y=65-(!state.reference&&$('travel').checked?state.height*scale:0);ctx.drawImage(compose(),16,y,M.width*scale,M.height*scale);}
 $('phase-name').textContent=state.reference?'Image originale':M.phases[phase].label;$('counter').textContent=(phase+1)+' / '+M.phases.length;$('instruction').textContent=explanations[phase];$('status').textContent=state.reference?'Référence':state.playing?(state.paused?'Lecture en pause':'Saut en lecture'):'Pose arrêtée — inspecte les composants';
 M.phases.forEach((_,i)=>$('phase-'+i).setAttribute('aria-pressed',String(i===phase)));for(const n of M.order)$('png-'+n).href=Collage.frame(M,collage,phase,n).file;
}
$('export').onclick=()=>{const a=document.createElement('a');a.download='saut-'+M.phases[state.phase].id+'.png';a.href=compose().toDataURL('image/png');a.click();};
Promise.all(Object.entries(data.images).map(([p,url])=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{images[p]=im;resolve();};im.onerror=()=>reject(Error(p));im.src=url;}))).then(()=>{window.jumpReady=true;window.jumpAPI={state,choose,advance,render,compose,manifest:M};let last=0;function tick(ms){const dt=Math.min((ms-last)/1000||0,.05);last=ms;advance(dt);render();requestAnimationFrame(tick);}requestAnimationFrame(tick);}).catch(e=>{$('error').textContent='Image manquante : '+e.message;console.error(e);});
