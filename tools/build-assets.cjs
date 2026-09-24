// Mechanical extraction/registration. New drawings come from the imagegen sheets.
const fs=require('node:fs'),path=require('node:path');const {read,write,blank}=require('./png.cjs');
const root=path.resolve(__dirname,'..');process.chdir(root);fs.mkdirSync('assets/base',{recursive:true});fs.mkdirSync('assets/poses',{recursive:true});
const original=read('image.png');const {w:W,h:H}=original;
const names=['cape','lower','torso','head','eyes','hair'];const base=Object.fromEntries(names.map(n=>[n,blank(W,H)]));
function inside(x,y,points){let hit=false;for(let i=0,j=points.length-1;i<points.length;j=i++){let[a,b]=points[i],[c,d]=points[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)hit=!hit;}return hit;}
const face=[[805,239],[827,241],[827,298],[847,299],[858,398],[840,437],[811,456],[750,456],[750,508],[706,508],[706,475],[669,473],[668,455],[646,455],[646,438],[606,438],[606,418],[627,418],[627,339],[647,320],[685,305],[707,320],[726,338],[768,305],[787,282]];
const ear=[[507,357],[534,361],[553,380],[554,418],[531,417],[511,400]];
const hairLeft=[[254,476],[356,461],[396,430],[479,436],[514,451],[541,442],[575,457],[594,473],[615,499],[648,506],[667,535],[665,568],[628,567],[613,535],[578,511],[550,507],[527,521],[508,538],[493,563],[465,575],[446,612],[419,632],[395,663],[377,673],[330,642],[316,593],[264,592]];
const hairRight=[[835,427],[907,428],[945,461],[968,492],[959,541],[939,542],[939,565],[963,593],[995,609],[995,692],[971,697],[949,657],[926,641],[882,624],[859,596],[839,568],[840,535],[826,511],[814,491]];
const cape=[[278,487],[370,484],[402,591],[462,586],[476,650],[453,695],[499,713],[519,810],[545,847],[511,954],[478,962],[444,923],[411,957],[378,951],[339,911],[288,975],[268,975],[267,919],[295,861],[250,859],[252,796],[282,744],[336,704],[383,690],[400,644],[327,641],[305,573],[275,580]];
const armLeft=[[466,668],[539,685],[533,723],[516,751],[498,777],[505,812],[445,833],[392,796],[395,747],[425,727]];
const armRight=[[819,658],[909,690],[929,746],[983,768],[983,815],[942,842],[893,815],[868,780],[786,744]];
const lower=[[542,690],[769,672],[831,686],[813,731],[866,784],[961,895],[977,1160],[416,1160],[412,969],[501,890],[501,824],[513,772]];
const eyeL=[[648,318],[686,318],[686,337],[706,337],[707,397],[648,398],[628,381],[628,340]];
const eyeR=[[806,300],[845,300],[845,338],[826,338],[826,357],[806,378],[806,398],[786,398],[786,339],[788,318],[806,318]];
for(let y=0;y<H;y++)for(let x=0;x<W;x++){let i=(y*W+x)*4;if(!original.data[i+3])continue;let n=y>=698?'lower':'torso';if(inside(x,y,lower))n='lower';if(inside(x,y,cape)||(y>830&&y<980&&x<525))n='cape';if(inside(x,y,armLeft)||inside(x,y,armRight))n='torso';if(y<475||inside(x,y,hairLeft)||inside(x,y,hairRight))n='hair';if(inside(x,y,face)||inside(x,y,ear))n='head';if(inside(x,y,eyeL)||inside(x,y,eyeR))n='eyes';original.data.copy(base[n].data,i,i,i+4);}
// No overlaps or omissions: the base layers partition original RGBA bytes.
let differences=0;for(let i=0;i<original.data.length;i+=4){if(!original.data[i+3])continue;let pixels=names.filter(n=>base[n].data[i+3]);if(pixels.length!==1||!base[pixels[0]].data.subarray(i,i+4).equals(original.data.subarray(i,i+4)))differences++;}
if(differences)throw Error('Base decomposition failed: '+differences);
for(const n of names)write('assets/base/'+n+'.png',base[n]);
const eyeUnderlay=blank(W,H);for(let y=0;y<H;y++)for(let x=0;x<W;x++){if(!inside(x,y,eyeL)&&!inside(x,y,eyeR))continue;let i=(y*W+x)*4;eyeUnderlay.data[i]=255;eyeUnderlay.data[i+1]=205;eyeUnderlay.data[i+2]=154;eyeUnderlay.data[i+3]=255;}write('assets/base/eye-underlay.png',eyeUnderlay);
const manifest={width:W,height:H,order:names,base:{},poses:{},validation:{originalPixelDifferences:differences},method:'Source pixels for rest; registered imagegen drawings for poses. No runtime rotations, mesh deformation or per-frame resizing.'};for(const n of names)manifest.base[n]='assets/base/'+n+'.png';manifest.eyeUnderlay='assets/base/eye-underlay.png';
// One fixed scale per sheet. Anchors measured in the source sheet for each frame.
// Alpha threshold removes the generated translucent matte while preserving hard sprite edges.
const config={
 lower:{file:'lower-sheet.png',rects:[[100,130,550,482],[694,130,550,482],[100,636,550,491],[694,636,550,491]],anchors:[[414,183],[952,183],[414,695],[952,695]],target:[726,700],scale:1.06},
 torso:{file:'torso-sheet.png',rects:[[150,112,505,394],[847,112,500,394],[150,575,663,380],[847,575,500,380]],anchors:[[400,175],[1074,175],[400,640],[1074,640]],target:[721,488],scale:1.06},
 hair:{file:'hair-sheet.png',rects:[[25,90,575,490],[641,90,582,490],[25,655,598,488],[641,655,582,488]],anchors:[[368,121],[982,121],[368,698],[982,698]],target:[692,89],scale:1.37},
 cape:{file:'cape-sheet.png',rects:[[145,110,432,491],[680,110,505,491],[145,626,432,508],[680,626,505,508]],anchors:[[493,168],[1110,168],[493,710],[1110,710]],target:[555,555],scale:.95},
 eyes:{file:'eyes-sheet.png',rects:[[385,280,251,130],[893,302,256,110],[385,681,251,69],[900,656,251,110]],anchors:[[502,347],[1017,359],[502,711],[1024,708]],target:[736,360],scale:.94},
 head:{file:'head-sheet.png',rects:[[180,135,430,448],[695,135,430,448],[180,655,430,448],[695,655,450,448]],anchors:[[401,493],[907,503],[401,992],[907,1026]],target:[723,456],scale:.82}
};
function registered(src,c,index){const out=blank(W,H),[rx,ry,rw,rh]=c.rects[index],[ax,ay]=c.anchors[index],[tx,ty]=c.target;for(let y=0;y<H;y++)for(let x=0;x<W;x++){let sx=Math.floor((x-tx)/c.scale+ax),sy=Math.floor((y-ty)/c.scale+ay);if(sx<rx||sx>=rx+rw||sy<ry||sy>=ry+rh||sx<0||sy<0||sx>=src.w||sy>=src.h)continue;let from=(sy*src.w+sx)*4,to=(y*W+x)*4;if(src.data[from+3]<245)continue;src.data.copy(out.data,to,from,from+4);out.data[to+3]=255;}return out;}
for(const [name,c]of Object.entries(config)){const sheet=read('assets/'+c.file);manifest.poses[name]=[];for(let i=0;i<4;i++){const target='assets/poses/'+name+'-'+i+'.png',frame=registered(sheet,c,i);if(name==='torso'){for(let y=674;y<H;y++)for(let x=578;x<841;x++)frame.data.fill(0,(y*W+x)*4,(y*W+x)*4+4);}write(target,frame);manifest.poses[name].push(target);}}
manifest.bounds={};for(const f of [...Object.values(manifest.base),...Object.values(manifest.poses).flat()]){const im=read(f);let x0=W,y0=H,x1=0,y1=0;for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(im.data[(y*W+x)*4+3]>16){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}manifest.bounds[f]=[x0,y0,x1-x0+1,y1-y0+1];}
fs.writeFileSync('assets/manifest.json',JSON.stringify(manifest,null,2));
const embedded={manifest,images:{}};for(const f of [...Object.values(manifest.base),manifest.eyeUnderlay,...Object.values(manifest.poses).flat()])embedded.images[f]='data:image/png;base64,'+fs.readFileSync(f).toString('base64');fs.writeFileSync('assets/bundle.js','window.CHARACTER_ASSETS='+JSON.stringify(embedded)+';');
console.log(JSON.stringify({width:W,height:H,layers:names.length,drawnPoses:24,originalPixelDifferences:differences}));
