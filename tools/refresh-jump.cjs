// Reloads the jump pose PNGs after they were retouched in a drawing program (Pixelorama…), without regenerating them.
// Updates assets/jump/bundle.js (the copy the pages read) and the sizes in assets/jump/manifest.json.
// A PNG keeps its top-left corner: if its canvas grew to the left or top, fix the limb's position in editeur.html.
const fs=require('node:fs'),path=require('node:path');process.chdir(path.resolve(__dirname,'..'));
const manifest=JSON.parse(fs.readFileSync('assets/jump/manifest.json','utf8'));
const old=JSON.parse(fs.readFileSync('assets/jump/bundle.js','utf8').replace(/^window\.JUMP_ASSETS=/,'').replace(/;\s*$/,''));
const images={},changes=[];
for(const [name,frames]of Object.entries(manifest.frames))for(const f of frames){const b=fs.readFileSync(f.file);
 if(b.toString('ascii',12,16)!=='IHDR')throw Error(f.file+' n’est pas un PNG');const w=b.readUInt32BE(16),h=b.readUInt32BE(20),url='data:image/png;base64,'+b.toString('base64');
 if(url!==old.images[f.file])changes.push(f.file+(w!==f.w||h!==f.h?`  (taille ${f.w}×${f.h} → ${w}×${h})`:''));f.w=w;f.h=h;images[f.file]=url;}
images['image.png']='data:image/png;base64,'+fs.readFileSync('image.png').toString('base64');
fs.writeFileSync('assets/jump/manifest.json',JSON.stringify(manifest,null,2));
fs.writeFileSync('assets/jump/bundle.js','window.JUMP_ASSETS='+JSON.stringify({manifest,images})+';');
console.log(changes.length?'Images mises à jour :\n  '+changes.join('\n  '):'Aucune image modifiée.');
