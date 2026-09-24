const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');process.chdir(root);fs.mkdirSync('previews',{recursive:true});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless','--no-first-run','--disable-gpu','--remote-debugging-port=9334','--remote-allow-origins=*','--user-data-dir='+path.join(os.tmpdir(),'codex-poses-browser-v3'),'about:blank'],{windowsHide:true,stdio:'ignore'});
let ws;const pending=new Map();let id=0;const errors=[];
async function send(method,params={}){const n=++id;return new Promise((resolve,reject)=>{pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
async function screenshot(name){await wait(100);const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync('previews/'+name+'.png',Buffer.from(r.data,'base64'));}
(async()=>{let tabs;for(let i=0;i<100;i++){try{tabs=await(await fetch('http://127.0.0.1:9334/json')).json();if(tabs.length)break;}catch{}await wait(100);}if(!tabs)throw Error('Browser launch failed');
 ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params);};
 await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:'file:///'+root.replace(/\\/g,'/')+'/index.html'});
 let ready=false;for(let i=0;i<100;i++){if(await evaluate('Boolean(window.demoReady)')){ready=true;break;}await wait(100);}if(!ready)throw Error('Demo not ready');
 await evaluate('demoAPI.state.paused=true;demoAPI.render()');await screenshot('01-rest');
 const source='data:image/png;base64,'+fs.readFileSync('image.png').toString('base64');
 const differences=await evaluate(`(async()=>{let im=new Image();im.src=${JSON.stringify(source)};await im.decode();let c=document.createElement('canvas');c.width=im.width;c.height=im.height;let g=c.getContext('2d');g.drawImage(im,0,0);let a=g.getImageData(0,0,c.width,c.height).data,b=demoAPI.compose({},true).getContext('2d').getImageData(0,0,c.width,c.height).data,d=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])d++;return d;})()`);
 if(differences!==0)throw Error('Rest differs from source: '+differences);
 await evaluate("document.getElementById('walk').click();demoAPI.state.time=.36;demoAPI.state.attack=.4;demoAPI.render()");const combined=await evaluate('demoAPI.selections()');if(combined.lower==='base'||combined.torso==='base')throw Error('Walk and attack not combined');await screenshot('02-walk-attack');
 await evaluate("demoAPI.state.attack=-1;demoAPI.state.jump=.45;document.getElementById('emotion').value='2';demoAPI.render()");await screenshot('03-jump-blink');
 await evaluate("document.getElementById('reset').click();demoAPI.state.paused=true;document.getElementById('explode').checked=true;demoAPI.render()");await screenshot('04-layers');
 // Ensure returning to rest removes generated poses, and attack does not reset locomotion time.
 await evaluate("document.getElementById('reset').click();demoAPI.state.paused=true;document.getElementById('walk').click();demoAPI.state.time=7.1;document.getElementById('attack').click()");
 const time=await evaluate('demoAPI.state.time');if(time!==7.1)throw Error('Attack reset locomotion');
 await evaluate("demoAPI.advance(2);demoAPI.render()");const finished=await evaluate('demoAPI.selections()');if(finished.torso!=='base'||finished.lower==='base')throw Error('Attack end disrupted walk');
 if(errors.length)throw Error(JSON.stringify(errors));const result={sourceVsRestDifferingChannels:differences,walkAndAttack:combined,attackDoesNotResetLocomotion:true,attackEndsWithoutStoppingWalk:true,browserErrors:errors.length};fs.writeFileSync('previews/verification.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{try{if(ws?.readyState===1)await send('Browser.close');}catch{}ws?.close();browser.kill();});
