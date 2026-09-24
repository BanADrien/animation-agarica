// Register the six imagegen sheets. No runtime warping or limb rotations.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {read,write,blank}=require('./png.cjs');process.chdir(path.resolve(__dirname,'..'));
// One head drawing (the Montée cell) for every phase so the hair always fits the same skull; HEAD puts its chin on each neck.
const HEAD_CELL=1,HEAD=[[11,2],[6,0],[1,1],[8,0],[3,0]];
const EYES=[[0,0],[0,0],[0,0],[0,0],[0,0]],CAPE=[[70,20],[40,0],[20,0],[80,70],[80,70]];
const W=1600,H=1700,OX=160,OY=320;
const phaseNames=['appui','montee','apogee','chute'];
const phaseLabels=['Appui','Montée','Apogée','Chute'];
const order=['cape','lower','torso','head','eyes','hair'];
const commonTop=[[20,70,475,440],[515,65,480,445],[1000,60,536,450]];
const commonBottom=[[20,530,475,480],[515,530,480,480],[1000,530,536,480]];
const config={
 hair:{scale:1.70,target:[694,92],rects:[...commonTop,...commonBottom],anchors:[[281,124],[778,102],[1286,125],[277,690],[788,690],[1288,690]]},
 torso:{scale:1.28,target:[721,490],rects:[[25,128,450,350],[527,128,414,350],[970,128,565,350],[45,550,460,450],[526,560,485,440],[1014,560,521,440]],anchors:[[313,175],[779,173],[1268,173],[277,701],[777,701],[1252,701]]},
 lower:{scale:1.30,target:[725,694],rects:[...commonTop,...commonBottom],anchors:[[297,218],[782,109],[1296,89],[297,583],[785,583],[1291,583]]},
 head:{scale:.85,target:[721,489],rects:[...commonTop,...commonBottom],anchors:[[270,435],[787,412],[1268,423],[262,906],[764,906],[1268,906]]},
 eyes:{scale:.76,target:[734,358],rects:[[70,210,365,180],[580,190,365,180],[1070,190,445,180],[70,680,365,175],[580,680,365,175],[1070,680,445,175]],anchors:[[248,303],[780,281],[1285,281],[248,770],[756,776],[1265,776]]},
 cape:{scale:1.05,target:[555,550],rects:[[15,170,385,440],[495,170,240,485],[780,155,420,295],[40,660,365,390],[419,685,390,365],[835,660,370,390]],anchors:[[342,229],[668,228],[1154,227],[362,994],[753,996],[895,983]]}
};
// Per-frame corrections in canvas pixels, measured with tools/measure-jump.cjs: neck above the belt buckle,
// chin on the neck, eyes centred in the face. Head, eyes and hair move together.
const headShift=[[8,4],[6,0],[-3,-2],[7,3],[-5,-7]];
const shifts={torso:[[-5,0],[3,0],[-2,0],[-5,0],[0,0]],head:HEAD,hair:headShift,eyes:headShift.map(([x,y],f)=>[x+EYES[f][0],y+EYES[f][1]]),lower:[[0,0],[0,0],[0,0],[0,0],[0,0]],cape:CAPE};
const manifest={version:4,scope:'jump-only',width:W,height:H,sourceOffset:[OX,OY],order,phases:phaseNames.map((id,i)=>({id,label:phaseLabels[i]})),frames:{},registration:config,source:'image.png',notes:'Four drawn jump poses per component (the two wind variants of the sheets are unused). Fixed per-sheet scale; registration is baked into PNG offsets.'};
manifest.frontArmRegions=[[OX+330,OY+230,280,300],[OX+880,OY+230,300,300]];
const composites=phaseNames.map(()=>blank(W,H)),frontArms={},images={};
function bounds(im){let x0=im.w,y0=im.h,x1=-1,y1=-1,count=0;for(let y=0;y<im.h;y++)for(let x=0;x<im.w;x++)if(im.data[(y*im.w+x)*4+3]){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);count++;}if(!count)throw Error('Empty sprite');return{x:x0,y:y0,w:x1-x0+1,h:y1-y0+1,count};}
function crop(im,b){let out=blank(b.w,b.h);for(let y=0;y<b.h;y++)im.data.copy(out.data,y*b.w*4,((y+b.y)*im.w+b.x)*4,((y+b.y)*im.w+b.x+b.w)*4);return out;}
for(const name of order){const c=config[name],sheet=read('assets/jump/sheets/'+name+'.png');manifest.frames[name]=[];fs.mkdirSync('assets/jump/poses/'+name,{recursive:true});let hashes=[];
 for(let f=0;f<phaseNames.length;f++){const cell=name==='head'?HEAD_CELL:f,out=blank(W,H),[rx,ry,rw,rh]=c.rects[cell],[ax,ay]=c.anchors[cell],[sx0,sy0]=shifts[name][f],tx=c.target[0]+OX+sx0,ty=c.target[1]+OY+(f===0?120:0)+sy0;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const sx=Math.floor((x-tx)/c.scale+ax),sy=Math.floor((y-ty)/c.scale+ay);if(sx<rx||sx>=rx+rw||sy<ry||sy>=ry+rh||sx<0||sy<0||sx>=sheet.w||sy>=sheet.h)continue;const from=(sy*sheet.w+sx)*4,to=(y*W+x)*4;if(sheet.data[from+3]<245)continue;
   // Remove extra generated tunic tails so the separate belt layer supplies the waist.
   if(name==='torso'&&x>=OX+500+sx0&&x<OX+835+sx0&&y>=OY+685+(f===0?120:0))continue;
   sheet.data.copy(out.data,to,from,from+4);out.data[to+3]=255;
  }
  if(name==='torso'&&f>=3)frontArms[f]=out;
  const b=bounds(out);if(b.x===0||b.y===0||b.x+b.w===W||b.y+b.h===H)throw Error('Clipped frame '+name+' '+f);
  const file='assets/jump/poses/'+name+'/'+phaseNames[f]+'.png';write(file,crop(out,b));manifest.frames[name].push({file,...b,anchor:[tx,ty]});images[file]='data:image/png;base64,'+fs.readFileSync(file).toString('base64');hashes.push(crypto.createHash('sha256').update(out.data).digest('hex'));
  const composite=composites[f];for(let i=0;i<out.data.length;i+=4)if(out.data[i+3])out.data.copy(composite.data,i,i,i+4);
 }
 if(name!=='head'&&new Set(hashes).size!==phaseNames.length)throw Error('Duplicated pose: '+name);
}
fs.mkdirSync('assets/jump/assembled',{recursive:true});for(let f=0;f<phaseNames.length;f++){if(f>=3){const arm=frontArms[f];for(const [x0,y0,w,h]of manifest.frontArmRegions)for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++){const i=(y*W+x)*4;if(arm.data[i+3])arm.data.copy(composites[f].data,i,i,i+4);}}write('assets/jump/assembled/'+phaseNames[f]+'.png',composites[f]);}
images['image.png']='data:image/png;base64,'+fs.readFileSync('image.png').toString('base64');
fs.writeFileSync('assets/jump/manifest.json',JSON.stringify(manifest,null,2));
fs.writeFileSync('assets/jump/bundle.js','window.JUMP_ASSETS='+JSON.stringify({manifest,images})+';');
console.log(JSON.stringify({components:order.length,distinctPosesPerComponent:phaseNames.length,phases:phaseNames,edgeClipping:false}));
