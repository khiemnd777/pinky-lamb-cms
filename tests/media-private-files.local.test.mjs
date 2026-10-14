import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync,symlinkSync} from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {ROOT,validateRuntime} from '../scripts/local-guard.mjs';
validateRuntime();
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const runRoot=path.join(ROOT,`.local/cache/m3/task04/implementation/run-${randomUUID()}`);mkdirSync(runRoot,{recursive:true,mode:0o700});
const observations={scope:'CMS-M3-04_ISOLATED_QA_4173_NOT_AUTH_APP_E2E',startedAt:new Date().toISOString(),runtimeEffort:'actual Medium',checks:[]};
const privateNames=['media-tool-lock.json','media-fixtures.json'];
const {default:config}=await import('../vite.config.mjs');
const plugin=config.plugins.find(item=>item.name==='deny-private-browser-imports');


test('M3 private media metadata and roots are refused before browser import resolution',async()=>{
 const importer=path.join(ROOT,'admin/auth.mjs');let cases=0;
 for(const source of [...privateNames.flatMap(name=>[`../contracts/${name}`,`../contracts/${name}?raw#fragment`,`../contracts/${name.replace('media','%6dedia')}%23fragment?raw`]),'../.local/tools/m3/native?raw','../.local/media-cache/m3/file?url','../quarantine/private.bin','../private/cache/item.json']){
  let resolved=false;await assert.rejects(()=>plugin.resolveId.call({resolve:async()=>{resolved=true;return null;}},source,importer),/Private\/server import forbidden/);assert.equal(resolved,false);cases++;
 }
 observations.checks.push({kind:'private-preresolver',cases,status:'PASS'});
});

test('M3 parent CSP adds only blob image/media while shipped origin and child policies stay strict',()=>{
 const html=readFileSync(path.join(ROOT,'admin/index.html'),'utf8');const csp=html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
 assert.match(csp,/img-src [^;]*blob:/);assert.match(csp,/media-src blob:/);assert.match(csp,/script-src 'self'/);assert.match(csp,/object-src 'none'/);assert.match(csp,/frame-src 'self'/);assert.doesNotMatch(csp,/allow-same-origin|unsafe-eval/);
 const previous=readFileSync(path.join(ROOT,'.local/cache/m3/task04/implementation/preimplementation/admin/index.html'),'utf8').match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
 assert.equal(csp,previous.replace("img-src 'self' http://127.0.0.1:5010;","img-src 'self' http://127.0.0.1:5010 blob:; media-src blob:;"));
 assert.equal(config.server.port,5173);assert.equal(config.server.strictPort,true);
 for(const source of ['preview/hero-renderer.mjs','preview/site-renderer.mjs'])assert.match(readFileSync(path.join(ROOT,source),'utf8'),/media-src 'none'/);
 observations.checks.push({kind:'exact-parent-policy',csp,sourceSha256:hash(Buffer.from(html)),status:'PASS'});
});

test('M3 lint refuses encoded static/dynamic private media imports without creating app source files',async()=>{
 const {ESLint}=await import('eslint');const lint=new ESLint({cwd:ROOT});let cases=0;
 for(const source of ['../contracts/media-tool-lock.json?raw','../contracts/MEDIA-FIXTURES.JSON#?url','../contracts/%6dedia-tool-lock%2ejson?raw','../.local/tools/m3/private.mjs','../quarantine/part.mjs','../private/cache.json'])for(const code of [`import item from ${JSON.stringify(source)};console.log(item);`,`export {default} from ${JSON.stringify(source)};`,`void import(${JSON.stringify(source)});`]){
  const result=await lint.lintText(code,{filePath:path.join(ROOT,'admin/task04-in-memory-lint.mjs')});assert.ok(result[0].messages.some(item=>item.ruleId==='pinky-media/private-imports'),code);cases++;
 }
 const allowed=await lint.lintText("import {PROJECT} from './config-local.mjs';console.log(PROJECT);",{filePath:path.join(ROOT,'admin/task04-in-memory-lint.mjs')});assert.equal(allowed[0].errorCount,0);
 observations.checks.push({kind:'static-dynamic-export-lint',cases,sourceOnlyMemory:true,status:'PASS'});
});

test('M3 symlink aliases into private or outside allowed browser roots fail before load',async()=>{
 const privateTarget=path.join(runRoot,'private-sentinel.json');writeFileSync(privateTarget,'{"marker":"M3_TASK04_PRIVATE_SENTINEL"}',{flag:'wx',mode:0o600});
 const outside=path.join(ROOT,`.preview-output/m3/task04-${randomUUID()}`);mkdirSync(outside,{recursive:true,mode:0o700});const outsideTarget=path.join(outside,'sentinel.json');writeFileSync(outsideTarget,'{"marker":"M3_TASK04_OUTSIDE_SENTINEL"}',{flag:'wx',mode:0o600});
 const aliases=path.join(ROOT,`node_modules/m3-task04-fixture-${randomUUID()}`);mkdirSync(aliases,{mode:0o700});
 for(const [name,target] of [['private-alias.json',privateTarget],['outside-alias.json',outsideTarget]]){
  const alias=path.join(aliases,name);symlinkSync(target,alias);await assert.rejects(()=>plugin.resolveId.call({resolve:async()=>({id:alias+'?raw#fragment'})},'controlled-symlink-alias',path.join(ROOT,'admin/auth.mjs')),/Private\/server import forbidden/);observations.checks.push({kind:'symlink-preresolver',alias,target,link:true,status:'PASS'});
 }
 observations.symlinkFixture={aliases,outside,privateTarget,outsideTarget};
});

const QA='http://127.0.0.1:4173';
const imagePath=path.join(ROOT,'.local/media-scratch/m3/audit-8a56d0f9-736c-415e-9ae1-3307d22b35eb/page-1.png');
const videoPath=path.join(ROOT,'.local/media-scratch/m3/audit-6cfaeb5c-784e-4c7d-8107-137145e70d8d/safe.mp4');
const imageBytes=readFileSync(imagePath),videoBytes=readFileSync(videoPath);
assert.equal(hash(videoBytes),'5152aabfc7ad5f94d826d1019c063dfb1d311d6502d93b8839e443bee48fbc21');
const initialImagePin=hash(imageBytes);assert.equal(initialImagePin,'af469a14f6ffd6f613533eca99129c4da920abd0937f06e6e6cd552ab3b95f87');
let server,context;
const wire=[];const probes=[];const consoleEvents=[];
const fixtureScript=`
const state=window.__m3Fixture={created:[],revoked:[],cleaned:false,policyViolations:[]};
window.addEventListener('securitypolicyviolation',event=>state.policyViolations.push({directive:event.effectiveDirective,blocked:event.blockedURI.startsWith('blob:')?'blob:synthetic':event.blockedURI}));
document.querySelector('#login-panel').remove();document.querySelector('#session-panel').remove();document.querySelector('#status').textContent='Task04 · isolated QA fixture · not authenticated CMS / App module graph / E2E';
const controls=document.createElement('div');controls.className='qa-controls';document.querySelector('main').append(controls);
for(const [id,label]of[['show','Load safe Blob image/video'],['cleanup','Remove preview and revoke URLs']]){const b=document.createElement('button');b.id=id;b.textContent=label;controls.append(b);}
const holder=document.createElement('section');holder.id='qa-preview';document.querySelector('main').append(holder);
function frame(id,content){const f=document.createElement('iframe');f.id=id;f.title=id+' · opaque sandbox';f.setAttribute('sandbox','');f.width='300';f.height='300';f.srcdoc='<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \\'none\\'; script-src \\'none\\'; connect-src \\'none\\'; object-src \\'none\\'; img-src blob:; media-src blob:; base-uri \\'none\\'; form-action \\'none\\'"></head><body>'+content+'</body></html>';holder.append(f);return f;}
document.querySelector('#show').addEventListener('click',async()=>{
 try{
 for(const [kind,mime,url]of[['image','image/png','/__m3_04/image.png'],['video','video/mp4','/__m3_04/video.mp4']]){const r=await fetch(url);if(!r.ok)throw Error('safe fixture response');const bytes=await r.arrayBuffer();const blob=new Blob([bytes],{type:mime});const objectUrl=URL.createObjectURL(blob);state.created.push({kind,url:objectUrl,bytes:blob.size});
 frame('qa-'+kind,kind==='image'?'<h3>Decoded Blob image</h3><img id="safe-image" width="256" src="'+objectUrl+'">':'<h3>Decoded Blob video</h3><video id="safe-video" width="256" controls muted preload="metadata" src="'+objectUrl+'"></video>');}
 const blob=state.created[0].url;frame('qa-negative','<h3>Expected sandbox / CSP denial</h3><script>window.__childScriptRan=true</script><script src="${QA}/__m3_04/probe-script.mjs"></script><img id="no-http-image" src="${QA}/__m3_04/probe-image.png"><object id="no-object" type="image/png" data="'+blob+'"></object><embed id="no-embed" type="image/png" src="'+blob+'">');state.ready=true;
 }catch(error){state.failure=error.message;}
});
document.querySelector('#cleanup').addEventListener('click',()=>{holder.replaceChildren();for(const entry of state.created){URL.revokeObjectURL(entry.url);state.revoked.push(entry.kind);}state.cleaned=true;const image=new Image();image.onload=()=>state.revokedImageResult='UNEXPECTED_LOAD';image.onerror=()=>state.revokedImageResult='ERROR_AFTER_REVOKE';image.src=state.created[0].url;});
`;

test.before(async()=>{
 const {createServer}=await import('vite');
 const html=readFileSync(path.join(ROOT,'admin/index.html'),'utf8');const moduleTags=html.match(/<script type="module" src="\/(?:preview|auth)\.mjs"><\/script>/g);assert.equal(moduleTags.length,2);
 const fixture=html.replace(/<script type="module" src="\/(?:preview|auth)\.mjs"><\/script>/g,'').replace('href="/admin.css"','href="/__m3_04/fixture.css"').replace('</body>','<script type="module" src="/__m3_04/fixture.mjs"></script></body>');
 assert.equal(fixture.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1],html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1]);
 const routes={'/__m3_04/parent.html':['text/html',fixture],'/__m3_04/fixture.mjs':['text/javascript',fixtureScript],'/__m3_04/fixture.css':['text/css','body{font-family:system-ui;margin:0;background:#fff9f5;color:#35212d}main{max-width:1000px;margin:auto;padding:20px}h1{font-size:25px}#logout{display:none}button{font:inherit;margin:10px 10px 16px 0;padding:12px;background:#c51e68;color:white;border:0;border-radius:6px}#qa-preview{display:flex;flex-wrap:wrap;gap:14px}iframe{max-width:100%;background:white;border:1px solid #e6cad6}#status{font-weight:650;color:#992351}'], '/__m3_04/image.png':['image/png',imageBytes],'/__m3_04/video.mp4':['video/mp4',videoBytes]};
 server=await createServer({...config,configFile:false,envDir:false,cacheDir:path.join(runRoot,'vite-cache'),server:{...config.server,host:'127.0.0.1',port:4173,strictPort:true,hmr:false,proxy:{}},plugins:[{name:'task04-fixture-memory-only',enforce:'pre',configureServer(s){s.middlewares.use((req,res,next)=>{const target=(req.url??'').split('?')[0];if(target.startsWith('/__m3_04/probe')){probes.push(target);res.setHeader('Content-Type','text/plain');res.end('OWNED_CSP_SENTINEL');return;}const item=routes[target];if(!item){next();return;}res.setHeader('Content-Type',item[0]);res.setHeader('Cache-Control','no-store');res.end(item[1]);});}},...config.plugins]});
 await server.listen();assert.equal(server.config.server.port,4173);assert.equal(server.config.server.hmr,false);assert.deepEqual(server.config.server.proxy,{});
 observations.fixture={url:QA+'/__m3_04/parent.html',realParentHtmlSha256:hash(Buffer.from(html)),fixtureHtmlSha256:hash(Buffer.from(fixture)),realParentCspExact:true,sourceModulesRemovedOnlyInFixture:['/preview.mjs','/auth.mjs'],realStylesheetReplacedOnlyInFixture:'avoid absentHosting5010 fonts',scope:'CSP/Blob/privatefiles only; not Appmodulegraph/AuthE2E',image:{path:imagePath,bytes:imageBytes.length,sha256:initialImagePin},video:{path:videoPath,bytes:videoBytes.length,sha256:hash(videoBytes)},vite:{host:server.config.server.host,port:server.config.server.port,strictPort:server.config.server.strictPort,hmr:server.config.server.hmr,proxy:server.config.server.proxy}};
});

test.after(async()=>{if(context)await context.close();if(server)await server.close();observations.serverClosed=true;observations.finishedAt=new Date().toISOString();assert.equal(hash(readFileSync(imagePath)),initialImagePin);assert.equal(hash(readFileSync(videoPath)),hash(videoBytes));writeFileSync(path.join(runRoot,'observations.json'),JSON.stringify(observations,null,2)+'\n',{flag:'wx',mode:0o600});});

async function rawGet(target){
 const {request}=await import('node:http');return new Promise((resolve,reject)=>{const r=request({host:'127.0.0.1',port:4173,path:target,method:'GET'},response=>{const parts=[];let bytes=0;response.on('data',chunk=>{bytes+=chunk.length;if(bytes>65536){r.destroy(new Error('HTTP response cap'));return;}parts.push(chunk);});response.on('end',()=>resolve({status:response.statusCode,headers:response.headers,body:Buffer.concat(parts)}));});r.setTimeout(3000,()=>r.destroy(new Error('HTTP timeout')));r.on('error',reject);r.end();});
}

test('M3 actual HTTP privacy covers mixedcase/raw/encoded/@fs/traversal/query and real symlink targets',async()=>{
 const targets=[];
 for(const name of privateNames){const absolute=`${ROOT}/contracts/${name}`;targets.push(`/contracts/${name}`,`/${name}`,`/contracts/${name}?raw`,`/contracts/${name}?import`,`/contracts/${name}?url`,`/@fs${absolute}`,`/@fs${absolute}?raw%23fragment`,`/%63ontracts/${name.replace('media','%6dedia')}`,`/contracts/${name.toUpperCase()}`,`/@fs${absolute.replaceAll('/','%2f')}`,`/contracts%2f${name}`,`/assets/../contracts/${name}`,`/assets/%2e%2e/contracts/${name}`);}
 for(const target of ['/.local/tools/m3/native','/.local/cache/m3/private.json','/.local/media-cache/m3/derivatives/file','/.local/media-scratch/m3/file','/quarantine/part.bin','/private/part.bin','/infra-local/firebase.json'])targets.push(target,target+'?raw',target.toUpperCase());
 for(const name of ['private-alias.json','outside-alias.json'])targets.push(`/@fs${observations.symlinkFixture.aliases}/${name}?raw`);
 for(const target of targets){const response=await rawGet(target);assert.equal(response.status,403,target);assert.ok(!response.body.includes(Buffer.from('M3_TASK04_PRIVATE_SENTINEL')) && !response.body.includes(Buffer.from('M3_TASK04_OUTSIDE_SENTINEL')));assert.equal(response.headers['access-control-allow-credentials'],undefined);wire.push({target,status:response.status,bytes:response.body.length,bodySha256:hash(response.body)});}
 observations.checks.push({kind:'native-http-private',cases:targets.length,status:'PASS',wire});
});

test('M3 real opaque sandbox decodes safe Blob pixels/video frames and denies parent access, scripts/connect/object/embed',async()=>{
 const {chromium}=await import('playwright');const {default:sharp}=await import('sharp');const tmp=path.join(runRoot,'browser-tmp');mkdirSync(tmp,{mode:0o700});
 const executable=path.join(ROOT,'.local/cache/playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
 context=await chromium.launchPersistentContext(path.join(runRoot,'browser-profile'),{headless:true,chromiumSandbox:true,executablePath:executable,serviceWorkers:'block',viewport:{width:1440,height:1000},args:['--disable-background-networking'],env:{PATH:'/usr/bin:/bin',HOME:process.env.HOME,TMPDIR:tmp,LANG:'vi_VN.UTF-8'}});
 context.setDefaultTimeout(10000);
 const blocked=[];await context.route('**/*',route=>{const url=route.request().url();if(url.startsWith('blob:')||url.startsWith('data:'))return route.continue();const parsed=new URL(url);if(parsed.origin!==QA || parsed.pathname.startsWith('/api/')){blocked.push(parsed.origin+parsed.pathname);return route.abort();}return route.continue();});
 observations.nativeAttempts={consoleEvents,blockedNetwork:blocked};
 const page=await context.newPage();page.on('console',message=>consoleEvents.push({type:message.type(),text:message.text().replace(/blob:[^\s"']+/g,'blob:synthetic')}));page.on('pageerror',error=>observations.pageErrors=(observations.pageErrors??[]).concat(error.message));
 await page.goto(QA+'/__m3_04/parent.html');await page.locator('#show').click();await page.waitForFunction(()=>window.__m3Fixture.ready||window.__m3Fixture.failure);assert.equal(await page.evaluate(()=>window.__m3Fixture.failure??null),null);
 const imageFrame=await (await page.locator('#qa-image').elementHandle()).contentFrame();
 const videoFrame=await (await page.locator('#qa-video').elementHandle()).contentFrame(),negative=await (await page.locator('#qa-negative').elementHandle()).contentFrame();assert.ok(imageFrame&&videoFrame&&negative);
 // Same live parent-created URLs prove input viability without logging capabilities.
 const parentControl=await page.evaluate(async()=>{
  const result={urls:window.__m3Fixture.created.map(entry=>({kind:entry.kind,protocol:new URL(entry.url).protocol,creatorOrigin:new URL(entry.url).origin,bytes:entry.bytes}))};
  const image=new Image();image.id='parent-control-image';image.width=256;image.src=window.__m3Fixture.created[0].url;document.querySelector('main').append(image);await image.decode();result.image={width:image.naturalWidth,height:image.naturalHeight};
  const video=document.createElement('video');video.id='parent-control-video';video.muted=true;video.width=256;video.src=window.__m3Fixture.created[1].url;document.querySelector('main').append(video);
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('parent metadata timeout')),5000);video.onloadeddata=()=>{clearTimeout(timer);resolve();};video.onerror=()=>{clearTimeout(timer);reject(Error('parent video error'));};});await video.play();
  await new Promise((resolve,reject)=>{const end=Date.now()+5000;function check(){if(video.currentTime>0&&video.getVideoPlaybackQuality().totalVideoFrames>0)return resolve();if(Date.now()>end)return reject(Error('parent frame timeout'));setTimeout(check,25);}check();});
  result.video={width:video.videoWidth,height:video.videoHeight,time:video.currentTime,frames:video.getVideoPlaybackQuality().totalVideoFrames};video.pause();return result;
 });
 assert.equal(parentControl.image.width,1600);assert.equal(parentControl.video.width,64);assert.equal(parentControl.video.height,48);assert.ok(parentControl.video.frames>0);
 const parentPixels=await page.locator('#parent-control-image').screenshot();writeFileSync(path.join(runRoot,'parent-blob-image.png'),parentPixels,{flag:'wx',mode:0o600});const parentRgb=await sharp(parentPixels).removeAlpha().raw().toBuffer();const parentColors={red:0,green:0,blue:0};for(let i=0;i<parentRgb.length;i+=3){const [r,g,b]=parentRgb.subarray(i,i+3);if(r>180&&g<80&&b<80)parentColors.red++;if(g>180&&r<80&&b<80)parentColors.green++;if(b>180&&r<80&&g<80)parentColors.blue++;}assert.ok(Object.values(parentColors).every(n=>n>=5));
 await page.locator('#parent-control-video').screenshot({path:path.join(runRoot,'parent-blob-video.png')});observations.nativeAttempts.parentControl={...parentControl,pixelCounts:parentColors,status:'PASS_SAME_LIVE_URLS_PARENT_ONLY'};
 try{await imageFrame.waitForFunction(()=>{const img=document.querySelector('#safe-image');return img?.complete&&img.naturalWidth===1600;});}catch(error){
  observations.nativeAttempts.failure=error.message;observations.nativeAttempts.image=await imageFrame.evaluate(()=>({image:{complete:document.querySelector('#safe-image')?.complete,width:document.querySelector('#safe-image')?.naturalWidth},csp:document.querySelector('meta[http-equiv]')?.content,origin:location.origin}));
  observations.nativeAttempts.video=await videoFrame.evaluate(()=>{const v=document.querySelector('#safe-video');return {width:v.videoWidth,height:v.videoHeight,readyState:v.readyState,networkState:v.networkState,errorCode:v.error?.code??null,time:v.currentTime,frames:v.getVideoPlaybackQuality().totalVideoFrames,origin:location.origin};});
  observations.nativeAttempts.opaque=await page.evaluate(()=>['qa-image','qa-video','qa-negative'].map(id=>{const f=document.querySelector('#'+id);let access;try{access=f.contentWindow.document?'UNEXPECTED':'UNKNOWN';}catch(e){access=e.name;}return {id,sandbox:f.getAttribute('sandbox'),access};}));assert.ok(observations.nativeAttempts.opaque.every(x=>x.sandbox===''&&x.access==='SecurityError'));
  assert.equal(await negative.evaluate(()=>window.__childScriptRan??false),false);const connect=await negative.evaluate(async url=>{try{await fetch(url);return 'UNEXPECTED';}catch(e){return e.name;}},QA+'/__m3_04/probe-connect');assert.equal(connect,'TypeError');assert.deepEqual(probes,[]);
  observations.nativeAttempts.negatives={childScript:'BLOCKED_EMPTY_SANDBOX',connect,probeHits:probes.length,httpImage:await negative.locator('#no-http-image').evaluate(img=>({complete:img.complete,width:img.naturalWidth})),objectEmbedConsole:consoleEvents.filter(e=>/object-src/.test(e.text))};
  await page.screenshot({path:path.join(runRoot,'opaque-blob-failure.png'),fullPage:true});await page.locator('#cleanup').click();await page.waitForFunction(()=>window.__m3Fixture.revokedImageResult);observations.nativeAttempts.cleanup=await page.evaluate(()=>({cleaned:window.__m3Fixture.cleaned,revoked:window.__m3Fixture.revoked,revokedImageResult:window.__m3Fixture.revokedImageResult,frames:document.querySelectorAll('#qa-preview iframe').length}));assert.equal(observations.nativeAttempts.cleanup.frames,0);assert.deepEqual(observations.nativeAttempts.cleanup.revoked,['image','video']);assert.equal(observations.nativeAttempts.cleanup.revokedImageResult,'ERROR_AFTER_REVOKE');assert.deepEqual(blocked,[]);
  observations.nativeAttempts.status='HOLD_PARENT_POSITIVE_OPAQUE_CHILD_BLOCKED';observations.nativeAttempts.causeLimit='Observed parent-to-opaque child refusal only; browser partition/origin mechanism not source-verified';throw error;
 }

 const imageState=await imageFrame.evaluate(()=>{const img=document.querySelector('#safe-image');return {complete:img.complete,width:img.naturalWidth,height:img.naturalHeight,origin:location.origin};});assert.equal(imageState.width,1600);assert.ok(imageState.height>0);
 const imageShot=await imageFrame.locator('#safe-image').screenshot();writeFileSync(path.join(runRoot,'blob-image-pixels.png'),imageShot,{flag:'wx',mode:0o600});const pixels=await sharp(imageShot).removeAlpha().raw().toBuffer();const color={red:0,green:0,blue:0};for(let i=0;i<pixels.length;i+=3){const [r,g,b]=pixels.subarray(i,i+3);if(r>180&&g<80&&b<80)color.red++;if(g>180&&r<80&&b<80)color.green++;if(b>180&&r<80&&g<80)color.blue++;}assert.ok(color.red>=5&&color.green>=5&&color.blue>=5,JSON.stringify(color));
 await videoFrame.waitForFunction(()=>{const video=document.querySelector('#safe-video');return video?.videoWidth>0&&video.readyState>=2;});
 await videoFrame.locator('#safe-video').click({position:{x:24,y:175}});await videoFrame.waitForFunction(()=>{const v=document.querySelector('#safe-video');return v.currentTime>0 && v.getVideoPlaybackQuality().totalVideoFrames>0;});
 const videoState=await videoFrame.evaluate(()=>{const v=document.querySelector('#safe-video');return {width:v.videoWidth,height:v.videoHeight,time:v.currentTime,frames:v.getVideoPlaybackQuality().totalVideoFrames,duration:v.duration,muted:v.muted};});assert.equal(videoState.width,64);assert.equal(videoState.height,48);assert.ok(videoState.time>0&&videoState.frames>0);
 await videoFrame.locator('#safe-video').screenshot({path:path.join(runRoot,'blob-video-frame.png')});
 const opaque=await page.evaluate(()=>['qa-image','qa-video','qa-negative'].map(id=>{const f=document.querySelector('#'+id);let result;try{result=f.contentWindow.document?'UNEXPECTED_ACCESS':'UNKNOWN';}catch(error){result=error.name;}return {id,sandbox:f.getAttribute('sandbox'),result};}));assert.ok(opaque.every(x=>x.sandbox===''&&x.result==='SecurityError'));
 assert.equal(await negative.evaluate(()=>window.__childScriptRan??false),false);
 // Authorized test instrumentation invokes fixed same-QA fetch to exercise CSP,
 // while actual HTML child scripts remain blocked by empty sandbox separately.
 const connect=await negative.evaluate(async url=>{try{await fetch(url);return 'UNEXPECTED';}catch(error){return error.name;}},QA+'/__m3_04/probe-connect');assert.equal(connect,'TypeError');
 const deniedImage=await negative.locator('#no-http-image').evaluate(img=>({complete:img.complete,width:img.naturalWidth}));assert.equal(deniedImage.width,0);assert.deepEqual(probes,[]);assert.ok(consoleEvents.some(event=>/sandbox|script execution/i.test(event.text)));assert.ok(consoleEvents.some(event=>/connect-src/.test(event.text)));assert.ok(consoleEvents.some(event=>/object-src/.test(event.text)));
 for(const [name,width,height]of [['desktop',1440,1000],['mobile',390,900]]){await page.setViewportSize({width,height});await page.screenshot({path:path.join(runRoot,`opaque-blob-${name}.png`),fullPage:true});}
 await page.locator('#cleanup').click();await page.waitForFunction(()=>window.__m3Fixture.revokedImageResult);const cleanup=await page.evaluate(()=>({cleaned:window.__m3Fixture.cleaned,revoked:window.__m3Fixture.revoked,revokedImageResult:window.__m3Fixture.revokedImageResult,frames:document.querySelectorAll('#qa-preview iframe').length}));assert.equal(cleanup.frames,0);assert.equal(cleanup.cleaned,true);assert.deepEqual(cleanup.revoked,['image','video']);assert.equal(cleanup.revokedImageResult,'ERROR_AFTER_REVOKE');assert.deepEqual(blocked,[]);assert.deepEqual(observations.pageErrors??[],[]);
 observations.checks.push({kind:'native-opaque-Blob',imageState,imagePixelCounts:color,videoState,opaque,childScript:'BLOCKED_SANDBOX',connect:'BLOCKED_CSP_NO_WIRE',objectEmbed:'BLOCKED_CSP',probes,cleanup,consoleEvents,blockedNetwork:blocked,status:'PASS',limit:'Scoped synthetic fixture; not authenticatedApp/modulegraph/ACL/E2E proof; DevTools CSPnegative instrumentation is not childscript permission'});
 await context.close();context=null;
});
