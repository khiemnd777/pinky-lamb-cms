import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,lstat,realpath,open,mkdir,writeFile,chmod,symlink,link,mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,randomBytes} from 'node:crypto';
import {constants} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm';
import {mountSiteEditor} from '../admin/site-editor.mjs';
import {mountSiteReview} from '../admin/review.mjs';
import {canonicalJson} from '../contracts/draft.mjs';
import {sourceCheckCursorSchema} from '../contracts/source-checks.mjs';

// This phase evaluates the real auth module with inert boundary doubles. It never
// imports Firebase, opens a browser, reads credentials, or sends a network request.
class Node extends EventTarget {
 constructor(tag='div'){super();this.tagName=tag.toUpperCase();this.children=[];this.style={};this.dataset={};this.value='';this.hidden=false;this.disabled=false;this.textContent='';this.classList={add(){},toggle(){},remove(){}};}
 get parentElement(){return this.parent??null;}
 get isConnected(){return true;}
 matches(selector){return selector===':disabled'?(this.disabled||Boolean(this.closest('fieldset[disabled]'))):selector==='fieldset[disabled]'?this.tagName==='FIELDSET'&&this.disabled:false;}
 closest(selector){for(let node=this;node;node=node.parentElement)if(node.matches(selector))return node;return null;}
 contains(target){return target===this||this.children.some(node=>node.contains(target));}
 prepend(...nodes){for(const node of nodes)node.parent=this;this.children.unshift(...nodes);}
 append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
 replaceChildren(...nodes){this.children=[];this.append(...nodes);}
 setAttribute(name,value){this[name]=String(value);}
 getAttribute(name){return this[name]??null;}
 removeAttribute(name){delete this[name];}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(value=>value!==this);}
 querySelectorAll(selector){const all=this.children.flatMap(node=>[node,...node.querySelectorAll('*')]);if(selector==='*')return all;if(selector==='[aria-invalid]')return all.filter(node=>node['aria-invalid']);return all.filter(node=>selector.split(',').includes(node.tagName.toLowerCase()));}
}
function dom(){
 const document=new EventTarget(),nodes=new Map();document.createElement=tag=>{const node=new Node(tag);node.ownerDocument=document;return node;};document.createElementNS=(_namespace,tag)=>document.createElement(tag);document.documentElement=document.createElement('html');document.defaultView={AbortController,Event,queueMicrotask,MutationObserver:class{observe(){}disconnect(){}}};document.getElementById=id=>{if(!nodes.has(id)){const node=new Node();node.id=id;nodes.set(id,node);}return nodes.get(id);};document.querySelectorAll=()=>[];return {document,nodes};
}
async function authHarness(recovery){
 const {document,nodes}=dom(),mounts=[],requests=[];let observer,tokens=0;
 const user={getIdToken:async()=>{tokens++;return 'synthetic-token';}},auth={currentUser:user};
 const member={uid:'synthetic-owner',role:'OWNER'};
 class CustomEvent extends Event{constructor(type,options){super(type);this.detail=options?.detail;}}
 const context=createContext({document,CustomEvent,Event,EventTarget,URL,URLSearchParams,TextDecoder,TextEncoder,Uint8Array,AbortController,DOMException,atob,btoa,console,fetch:async(path,options)=>{requests.push({path,method:options.method??'GET'});return {status:200,ok:true,json:async()=>member};}});
 const modules=new Map();
 function synthetic(key,exports){const module=new SyntheticModule(Object.keys(exports),function(){for(const [name,value]of Object.entries(exports))this.setExport(name,value);},{context,identifier:key});modules.set(key,module);return module;}
 synthetic('./config-local.mjs',{assertLocalOrigin(){},firebaseConfig:{},LOCAL:{auth:'http://127.0.0.1:9098'},RECOVERY_READ_ONLY:recovery});
 synthetic('../preview/hero-renderer.mjs',{TEMPLATE_VERSION:'hero-test'});
 synthetic('../contracts/source-checks.mjs',{sourceCheckCursorSchema});
 synthetic('firebase/app',{initializeApp:()=>({})});
 synthetic('firebase/auth',{initializeAuth:()=>auth,inMemoryPersistence:{},connectAuthEmulator(){},signInWithEmailAndPassword:async()=>{},signOut:async()=>{auth.currentUser=null;},onAuthStateChanged:(value,callback)=>{observer=callback;}});
 const mount=resource=>(container,props)=>{mounts.push({resource,props});return {canLeave:()=>true,destroy(){}};};
 synthetic('./site-editor.mjs',{mountSiteEditor:mount('home-v2')});synthetic('./hero-editor.mjs',{mountHeroEditor:mount('home')});synthetic('./review.mjs',{mountReview:()=>({destroy(){}})});
 // UI boundary doubles isolate auth admission; they do not prove shell behavior.
 synthetic('./pinky-select.mjs',{closePinkySelects(){},disposePinkySelects(){}});
 synthetic('./cms-shell.mjs',{mountCmsShell:(_document,{onResource})=>{
  for(const key of ['home','home-v2','home-v3','media']){const button=document.getElementById('resource-'+key);button.dataset.cmsResource=key;button.addEventListener('click',()=>onResource(key));}
  return {setSession(member,{readOnly=false}={}){for(const key of ['home','home-v2','home-v3','media'])document.getElementById('resource-'+key).disabled=!member||(readOnly&&key!=='home-v2');},setResource(key){for(const candidate of ['home','home-v2','home-v3','media']){const button=document.getElementById('resource-'+candidate);candidate===key?button.setAttribute('aria-current','page'):button.removeAttribute('aria-current');}},setBusy(){},refreshPanels(){}};
 }});

 const entry=new SourceTextModule(await readFile(new URL('../admin/auth.mjs',import.meta.url),'utf8'),{context,identifier:'auth',importModuleDynamically:async specifier=>{const module=modules.get(specifier);assert.ok(module,`unexpected import ${specifier}`);if(module.status==='unlinked')await module.link(()=>{throw Error('unexpected import');});if(module.status==='linked')await module.evaluate();return module;}});
 await entry.link(specifier=>{assert.ok(modules.has(specifier));return modules.get(specifier);});await entry.evaluate();
 return {api:entry.namespace,login:()=>observer(user),nodes,mounts,requests,tokenCount:()=>tokens};
}

test('safe: recovery login mounts real membership as read-only home-v2 and rejects forged home selection',async()=>{
 const h=await authHarness(true);await h.login();assert.equal(h.nodes.get('resource-home-v2').getAttribute('aria-current'),'page');assert.equal(h.mounts.length,1);assert.equal(h.mounts[0].resource,'home-v2');assert.equal(h.mounts[0].props.session.role,'OWNER');assert.equal(h.mounts[0].props.readOnly,true);
 const forbidden=h.nodes.get('resource-home');assert.equal(forbidden.disabled,true);forbidden.disabled=false;forbidden.dispatchEvent(new Event('click'));await Promise.resolve();assert.equal(h.nodes.get('resource-home-v2').getAttribute('aria-current'),'page');assert.equal(h.mounts.length,1);
});
test('safe: recovery rejects write and invalid read routes before token or transport',async()=>{
 const h=await authHarness(true);const cases=[['/api/cms/drafts/home'],['/api/cms/snapshots'],['/api/cms/reviews'],['/api/cms/session',{method:'POST'}],['/api/cms/drafts/home-v2',{method:'PATCH'}],['/api/cms/drafts/home-v2/import',{method:'POST'}],['/api/cms/snapshots/x',{method:'DELETE'}],['/api/cms/source-checks',{method:'POST'}],['/api/cms/snapshots/x/source-checks?pageSize=51'],['/api/cms/snapshots/x/source-checks?pageSize=20&pageSize=20'],['/api/cms/snapshots/x/source-checks?view=APPROVED'],['/api/cms/session?bad=1']];
 for(const [route,options]of cases)await assert.rejects(h.api.apiFetch(route,options),/Yêu cầu không hợp lệ/);assert.equal(h.tokenCount(),0);assert.equal(h.requests.length,0);
});
test('safe: recovery allows bounded current M2 reads',async()=>{
 const h=await authHarness(true);for(const route of ['/api/cms/session','/api/cms/drafts/home-v2','/api/cms/snapshots/existing_1','/api/cms/snapshots/existing_1/source-checks?pageSize=20'])await h.api.apiFetch(route);assert.equal(h.requests.length,4);
});
test('safe: default profile retains original home mount and write transport',async()=>{
 const h=await authHarness(false);await h.login();assert.equal(h.mounts[0].resource,'home');await h.api.apiFetch('/api/cms/drafts/home-v2',{method:'PATCH',body:'{}'});assert.equal(h.requests.at(-1).method,'PATCH');
});

// Real-runtime phase is deliberately a separate opt-in group added only after
// Coordinator release. Importing or selecting safe tests has no HTTP side effect.
test('live: recovery feature and screenshot verification',{skip:process.env.PINKY_M2_UI_LIVE!=='CMS-RECOVERY-001-v2',timeout:110000},runLiveRecovery);

function find(root,id){return [root,...root.querySelectorAll('*')].find(node=>node.id===id);}
function installDom(){const previous={document:globalThis.document,window:globalThis.window,CustomEvent:globalThis.CustomEvent};const {document}=dom();globalThis.document=document;globalThis.window=new EventTarget();globalThis.window.confirm=()=>{throw Error('unexpected prompt');};globalThis.CustomEvent=class extends Event{constructor(type,options){super(type);this.detail=options?.detail;}};return ()=>Object.assign(globalThis,previous);}
test('safe: read-only editor refuses forced save/import while retaining reload',async()=>{
 const restore=installDom(),container=new Node(),requests=[];let controller;
 try{controller=mountSiteEditor(container,{session:{uid:'owner',role:'OWNER'},readOnly:true,apiFetch:async(path,options)=>{requests.push({path,method:options?.method??'GET'});throw Object.assign(Error('missing'),{code:'NOT_FOUND'});}});await new Promise(resolve=>setImmediate(resolve));
 for(const id of ['site-save','site-import','site-snapshot-submit','site-review-submit','site-source-submit'])assert.equal(find(container,id).disabled,true,id);
 assert.equal(find(container,'site-reload').disabled,false);assert.match(find(container,'site-status').textContent,/chỉ cho phép xem/);
 for(const id of ['site-save','site-import']){const control=find(container,id);control.disabled=false;control.dispatchEvent(new Event('click'));}await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(requests,[{path:'/api/cms/drafts/home-v2',method:'GET'}]);
 }finally{controller?.destroy();restore();}
});
test('safe: read-only workflow rejects forced submit after saved-content event',async()=>{
 const restore=installDom(),container=new Node(),requests=[];let controller;
 try{controller=mountSiteReview(container,{session:{uid:'owner',role:'OWNER'},readOnly:true,apiFetch:async(...args)=>{requests.push(args);throw Error('unexpected write');}});document.dispatchEvent(new CustomEvent('cms:site-content',{detail:{draft:{revision:2,content:{}}}}));
 for(const id of ['site-submit-message','site-snapshot-submit','site-review-outcome','site-creative-declaration','site-review-note','site-review-submit','site-source-note','site-source-submit'])assert.equal(find(container,id).disabled,true,id);
 assert.equal(find(container,'site-snapshot-id').disabled,false);assert.equal(find(container,'site-snapshot-load').disabled,false);
 for(const id of ['site-snapshot-submit','site-review-submit','site-source-submit']){const control=find(container,id);control.disabled=false;control.dispatchEvent(new Event('click'));}await new Promise(resolve=>setImmediate(resolve));assert.equal(requests.length,0);
 }finally{controller?.destroy();restore();}
});
test('safe: default workflow still enables owner submission after saved-content event',()=>{
 const restore=installDom(),container=new Node();let controller;
 try{controller=mountSiteReview(container,{session:{uid:'owner',role:'OWNER'},apiFetch:async()=>{throw Error('unexpected request');}});document.dispatchEvent(new CustomEvent('cms:site-content',{detail:{draft:{revision:2,content:{}}}}));assert.equal(find(container,'site-snapshot-submit').disabled,false);assert.equal(find(container,'site-submit-message').disabled,false);
 }finally{controller?.destroy();restore();}
});


const CMS_ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const RUNTIME_SOURCE_PATHS=['scripts/local-guard.mjs','scripts/m2-recovery-profile.mjs','scripts/m2-recovery-local.mjs','infra-local/firebase.m2-recovery.json','cms-recovery-api/package.json','cms-recovery-api/index.mjs','tests/m2-recovery.test.mjs','vite.config.mjs','admin/config-local.mjs'];
const UI_SOURCE_PATHS=[...RUNTIME_SOURCE_PATHS,'admin/auth.mjs','admin/site-editor.mjs','admin/review.mjs','admin/source-review.mjs','tests/m2-recovery.local.test.mjs'];
const INVENTORY_COLLECTIONS=['cmsMembers','cmsDrafts','cmsSiteImports','cmsSiteSources','cmsIdempotency','cmsAudit','cmsSnapshots','cmsReviewStates','cmsReviews','cmsSourceChecks'];
const PRIVATE_HTTP_PATHS=['/cms-recovery-api/index.mjs','/cms-api/authorization.mjs','/.local/cache/cms-recovery-001/v2/private','/contracts/baseline-site.json','/infra-local/firebase.m2-recovery.json','/scripts/m2-recovery-profile.mjs','/node_modules/pinky-lamb-cms-recovery-api-local/index.mjs'];
const WRITE_DENY_CASES=[{method:'PATCH',path:'/api/cms/drafts/home-v2'},{method:'POST',path:'/api/cms/snapshots'},{method:'POST',path:'/api/cms/reviews'},{method:'POST',path:'/api/cms/source-checks'}];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const hashPattern=/^[a-f0-9]{64}$/;
function hold(condition){if(!condition)throw Error('CMS_RECOVERY_UI_HOLD: admission or evidence mismatch');}
function exactKeys(value,keys){return value && !Array.isArray(value) && JSON.stringify(Object.keys(value).sort())===JSON.stringify([...keys].sort());}
function privateRegularFile(metadata,cap){return metadata.isFile() && metadata.uid===process.getuid() && metadata.nlink===1 && (metadata.mode&0o777)===0o600 && metadata.size>0 && metadata.size<=cap;}
async function ownedEvidenceBytes(name,relative){
 hold(['beforeInventory','native','privacy','high'].includes(name));
 return ownedPrivateBytes(relative,name==='beforeInventory'?16*1024*1024:2097152);
}
async function ownedPrivateBytes(relative,cap){
 hold(Number.isSafeInteger(cap) && cap>0 && cap<=16*1024*1024 && typeof relative==='string' && !path.isAbsolute(relative) && !relative.split('/').some(part=>!part || part==='.' || part==='..'));
 let target=CMS_ROOT,expected;
 for(const part of relative.split('/')){target=path.join(target,part);const metadata=await lstat(target);hold(!metadata.isSymbolicLink() && await realpath(target)===target);expected=metadata;}
 // Reject special paths before open; NONBLOCK also protects a swapped FIFO.
 hold(privateRegularFile(expected,cap));
 const handle=await open(target,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
 try{
  const metadata=await handle.stat();hold(privateRegularFile(metadata,cap) && metadata.dev===expected.dev && metadata.ino===expected.ino && metadata.size===expected.size && metadata.mtimeMs===expected.mtimeMs);
  const buffer=Buffer.alloc(cap+1),{bytesRead}=await handle.read(buffer,0,buffer.length,0),after=await handle.stat();hold(privateRegularFile(after,cap) && bytesRead===metadata.size && bytesRead<=cap && after.dev===metadata.dev && after.size===metadata.size && after.mtimeMs===metadata.mtimeMs && after.ino===metadata.ino);return buffer.subarray(0,bytesRead);
 }finally{await handle.close();}
}
async function ownedPrivateJson(relative,cap){try{return JSON.parse((await ownedPrivateBytes(relative,cap)).toString('utf8'));}catch{throw Error('CMS_RECOVERY_UI_HOLD: private admission file is invalid');}}
const PUBLIC_FIXTURE_ROSTER=[
 {uid:'fixture-editor',email:'editor@pinky.test',expectedRole:'EDITOR',expectedSessionStatus:200},
 {uid:'fixture-reviewer',email:'reviewer@pinky.test',expectedRole:'REVIEWER',expectedSessionStatus:200},
 {uid:'fixture-publisher',email:'publisher@pinky.test',expectedRole:'PUBLISHER',expectedSessionStatus:200},
 {uid:'fixture-owner',email:'owner@pinky.test',expectedRole:'OWNER',expectedSessionStatus:200},
 {uid:'fixture-unknown',email:'unknown@pinky.test',expectedRole:null,expectedSessionStatus:403},
 {uid:'fixture-inactive',email:'inactive@pinky.test',expectedRole:'EDITOR',expectedSessionStatus:403},
 {uid:'fixture-unverified',email:'unverified@pinky.test',expectedRole:'EDITOR',expectedSessionStatus:403}
];
function validateFixtureCatalog(fixtures,catalog,release){
 hold(exactKeys(fixtures,['task','revision','projectId','authEndpoint','fixtures']) && fixtures.task==='CMS-RECOVERY-001' && fixtures.revision===2 && fixtures.projectId==='demo-pinky-lamb-cms' && fixtures.authEndpoint==='127.0.0.1:9098');
 hold(Array.isArray(fixtures.fixtures) && fixtures.fixtures.length===7 && Array.isArray(release.fixtureRoster) && release.fixtureRoster.length===7);
 const roster=fixtures.fixtures.map(value=>{
  hold(exactKeys(value,['uid','email','password','expectedRole','expectedSessionStatus']) && /^[A-Za-z0-9_-]{1,128}$/.test(value.uid) && typeof value.email==='string' && value.email.length<=254 && /^[^\s@]+@[^\s@]+$/.test(value.email) && typeof value.password==='string' && value.password.length>=12 && value.password.length<=256 && !/[\r\n]/.test(value.password));
  return {uid:value.uid,email:value.email,expectedRole:value.expectedRole,expectedSessionStatus:value.expectedSessionStatus};
 });
 hold(new Set(roster.map(value=>value.uid)).size===7 && new Set(roster.map(value=>value.email)).size===7 && new Set(fixtures.fixtures.map(value=>value.password)).size===7 && JSON.stringify(roster)===JSON.stringify(release.fixtureRoster) && JSON.stringify(roster)===JSON.stringify(PUBLIC_FIXTURE_ROSTER));
 hold(JSON.stringify(roster.filter(value=>value.expectedSessionStatus===200).map(value=>value.expectedRole).sort())===JSON.stringify(['EDITOR','OWNER','PUBLISHER','REVIEWER']) && roster.filter(value=>value.expectedSessionStatus===403).length===3);
 hold(exactKeys(catalog,['task','revision','projectId','resourceId','draftRevision','snapshots','beforeInventoryHash']) && catalog.task==='CMS-RECOVERY-001' && catalog.revision===2 && catalog.projectId==='demo-pinky-lamb-cms' && catalog.resourceId==='home-v2' && Number.isSafeInteger(catalog.draftRevision) && catalog.draftRevision>=0 && hashPattern.test(catalog.beforeInventoryHash) && catalog.beforeInventoryHash===release.beforeInventoryHash && Array.isArray(catalog.snapshots) && catalog.snapshots.length<=128);
 for(const value of catalog.snapshots)hold(exactKeys(value,['id','contentHash','sourceCheckIds']) && /^[A-Za-z0-9_-]{1,128}$/.test(value.id) && hashPattern.test(value.contentHash) && Array.isArray(value.sourceCheckIds) && value.sourceCheckIds.length<=61 && new Set(value.sourceCheckIds).size===value.sourceCheckIds.length && value.sourceCheckIds.every(id=>/^[A-Za-z0-9_-]{1,128}$/.test(id)));
 hold(new Set(catalog.snapshots.map(value=>value.id)).size===catalog.snapshots.length);return {fixtures:fixtures.fixtures,catalog};
}
function same(value,expected){return canonicalJson(value)===canonicalJson(expected);}
function boundSourceArray(value,expected){
 hold(Array.isArray(value) && value.length===expected.length && new Set(value.map(row=>row?.path)).size===value.length);
 for(const row of value)hold(exactKeys(row,['path','bytes','sha256']) && typeof row.path==='string' && Number.isSafeInteger(row.bytes) && row.bytes>0 && hashPattern.test(row.sha256));
 hold(same(value,expected));
}
function sameRunEvidence(value,release,phase,status,sources){
 hold(value && value.task==='CMS-RECOVERY-001' && value.revision===2 && value.projectId==='demo-pinky-lamb-cms' && value.runToken===release.runToken && value.phase===phase && value.status===status);
 boundSourceArray(value.sources,sources);
}
function actualHighReceipt(value,release,currentSources){
 hold(value && value.task==='CMS-RECOVERY-001' && value.revision===2 && value.projectId==='demo-pinky-lamb-cms' && value.runToken===release.runToken && value.status==='PASS_CODE_UNIT_ONLY' && value.reviewer==='/root/pdf_setup_reviewer' && value.coordinator==='/root' && value.actual_effort==='high' && same(value.runtime_observation,release.runtime_observation));
 boundSourceArray(value.sources,currentSources);
}
function validateTypedEvidence(release,proof,current){
 boundSourceArray(release.sources,current.ui);hold(same(release.sources.map(row=>row.path),UI_SOURCE_PATHS));actualHighReceipt(proof.high,release,current.ui);
 sameRunEvidence(proof.native,release,'NATIVE_CONTROLS','PASS_NATIVE_CONTROL_ONLY',current.runtime);boundSourceArray(proof.native.closure_sources,current.closure);
 const entry=proof.native.entry,manifest=entry?.manifest;
 hold(entry && manifest && Number.isSafeInteger(manifest.bytes) && manifest.bytes>0 && manifest.bytes<=65536 && hashPattern.test(manifest.sha256) && manifest.value?.specVersion==='v1alpha1' && same(Object.keys(manifest.value.endpoints??{}),['cmsApi']) && (!Object.hasOwn(manifest.value,'params') || Array.isArray(manifest.value.params) && manifest.value.params.length===0) && same(manifest.value.requiredAPIs,[]));
 const endpoint=manifest.value.endpoints.cmsApi;hold(endpoint.entryPoint==='cmsApi' && endpoint.platform==='gcfv2' && same(endpoint.region,['us-central1']) && exactKeys(endpoint.httpsTrigger,[]) && !['eventTrigger','scheduleTrigger','callableTrigger','taskQueueTrigger'].some(key=>key in endpoint));
 const apiRoot=path.join(CMS_ROOT,'cms-recovery-api'),node=path.join(CMS_ROOT,'.local/cache/node/node-v22.23.3-darwin-arm64/bin/node');
 for(const [profile,value]of [['discovery',entry.discovery],['worker',entry.worker]]){
  hold(value && value.profile===profile && value.node===node && value.version==='v22.23.3' && value.cwd===apiRoot && Number.isSafeInteger(value.pid) && value.pid>0 && ![15465,15525,65804].includes(value.pid) && Number.isSafeInteger(value.ppid) && value.ppid>0 && ![15465,15525,65804].includes(value.ppid) && value.pgid===value.ppid && typeof value.start==='string' && Number.isFinite(Date.parse(value.start)));
  boundSourceArray(value.sources,current.runtime);boundSourceArray(value.closure_sources,current.closure);
 }
 hold(entry.discovery.ppid===entry.worker.ppid && entry.discovery.pid!==entry.worker.pid && [`${node} ${path.join(CMS_ROOT,'node_modules/firebase-functions/lib/bin/firebase-functions.js')} ${apiRoot}`,`${node} ${path.join(CMS_ROOT,'node_modules/.bin/firebase-functions')} ${apiRoot}`,`node ${path.join(CMS_ROOT,'node_modules/.bin/firebase-functions')} ${apiRoot}`].includes(entry.discovery.argv) && [`${node} ${path.join(CMS_ROOT,'node_modules/firebase-tools/lib/emulator/functionsEmulatorRuntime')}`,`${node} ${path.join(CMS_ROOT,'node_modules/firebase-tools/lib/emulator/functionsEmulatorRuntime.js')}`].includes(entry.worker.argv));
 const socket=entry.socket,runRoot=path.join(CMS_ROOT,'.local/cache/cms-recovery-001/v2/runs',release.runToken);
 hold(socket && socket.type==='UNIX_SOCKET' && socket.ownerUid===process.getuid() && typeof socket.canonical==='string' && path.dirname(socket.canonical)===path.join(runRoot,'tmp') && /^fire_emu_[a-f0-9]{16}\.sock$/.test(path.basename(socket.canonical)) && socket.effective===path.relative(apiRoot,socket.canonical) && entry.worker.canonicalSocket===socket.canonical && entry.worker.effectiveSocket===socket.effective);
 hold(entry.anonymous?.status===401 && entry.anonymous?.code==='UNAUTHENTICATED' && Number.isSafeInteger(entry.anonymous.bytes) && entry.anonymous.bytes>0 && entry.anonymous.bytes<=65536 && entry.SDK==='MODULE_LOADED_EXISTING_AUTHORIZATION' && entry.authenticatedAuthFirestoreRpc==='NOT_RUN_NO_BEARER');
 const write=proof.native.writeDeny;hold(write?.status==='PASS_BEFORE_DISPATCH_405' && Array.isArray(write.cases) && write.cases.length===4);
 for(const [index,value]of write.cases.entries())hold(exactKeys(value,['method','path','status','code','authorize_called','dispatch_called']) && same({method:value.method,path:value.path},WRITE_DENY_CASES[index]) && value.status===405 && value.code==='METHOD_NOT_ALLOWED' && value.authorize_called===false && value.dispatch_called===false);
 sameRunEvidence(proof.before,release,'BEFORE_INVENTORY','PASS_READ_ONLY_INVENTORY',current.runtime);boundSourceArray(proof.before.closure_sources,current.closure);
 const inventory=proof.before.inventory;hold(exactKeys(inventory,['collections','documents','canonicalBytes','sha256']) && Array.isArray(inventory.collections) && inventory.collections.length===10 && same(inventory.collections.map(value=>value.name).sort(),[...INVENTORY_COLLECTIONS].sort()) && Number.isSafeInteger(inventory.documents) && inventory.documents>=0 && inventory.documents<=20000 && Number.isSafeInteger(inventory.canonicalBytes) && inventory.canonicalBytes>=0 && inventory.canonicalBytes<=268435456 && hashPattern.test(inventory.sha256) && hashPattern.test(proof.before.diskCustodyHash));
 let documents=0;
 for(const collection of inventory.collections){
  hold(exactKeys(collection,['name','count','entries']) && Number.isSafeInteger(collection.count) && collection.count>=0 && Array.isArray(collection.entries) && collection.entries.length===collection.count && new Set(collection.entries.map(value=>value?.id)).size===collection.count);documents+=collection.count;
  for(const record of collection.entries){hold(exactKeys(record,['id','sha256','createTime','updateTime']) && typeof record.id==='string' && record.id.length>0 && Buffer.byteLength(record.id)<=1500 && !record.id.includes('/') && hashPattern.test(record.sha256));for(const time of [record.createTime,record.updateTime])hold(exactKeys(time,['seconds','nanoseconds']) && Number.isSafeInteger(time.seconds) && time.seconds>=0 && Number.isSafeInteger(time.nanoseconds) && time.nanoseconds>=0 && time.nanoseconds<1000000000);hold(record.updateTime.seconds>record.createTime.seconds || record.updateTime.seconds===record.createTime.seconds && record.updateTime.nanoseconds>=record.createTime.nanoseconds);}
 }
 const canonical=canonicalJson({collections:inventory.collections,documents:inventory.documents,canonicalBytes:inventory.canonicalBytes});hold(documents===inventory.documents && inventory.sha256===sha(canonical) && proof.before.beforeInventoryHash===inventory.sha256 && release.beforeInventoryHash===inventory.sha256);
 sameRunEvidence(proof.privacy,release,'HTTP_PRIVACY','PASS_HTTP_PRIVACY',current.ui);hold(proof.privacy.beforeInventoryHash===inventory.sha256 && exactKeys(proof.privacy.CSP,['auth9098','hmr5175','opaqueSandbox']) && Object.values(proof.privacy.CSP).every(value=>value===true) && Array.isArray(proof.privacy.privateCases) && proof.privacy.privateCases.length===7 && new Set(proof.privacy.privateCases.map(value=>value?.path)).size===7 && same(proof.privacy.privateCases.map(value=>value.path).sort(),[...PRIVATE_HTTP_PATHS].sort()));for(const value of proof.privacy.privateCases)hold(exactKeys(value,['path','status']) && value.status===403);
 return true;
}
async function liveAdmission(){
 hold(process.version==='v22.23.3' && await realpath(process.execPath)===path.join(CMS_ROOT,'.local/cache/node/node-v22.23.3-darwin-arm64/bin/node') && process.cwd()===CMS_ROOT);
 for(const key of ['DEBUG','PWDEBUG','NODE_OPTIONS','NODE_PATH','GOOGLE_APPLICATION_CREDENTIALS','FIREBASE_TOKEN','HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','http_proxy','https_proxy','all_proxy','NODE_TLS_REJECT_UNAUTHORIZED','NODE_EXTRA_CA_CERTS'])hold(process.env[key]===undefined);
 hold(process.env.PLAYWRIGHT_BROWSERS_PATH===path.join(CMS_ROOT,'.local/cache/playwright') && /^[A-Za-z0-9_-]{22}$/.test(process.env.PINKY_M2_UI_RUN_TOKEN??''));
 const release=await ownedPrivateJson('.local/cache/cms-recovery-001/v2/ui-browser-release.json',131072);
 hold(release.task==='CMS-RECOVERY-001' && release.revision===2 && release.projectId==='demo-pinky-lamb-cms' && release.status==='PASS_NATIVE_PRESERVATION_PRIVACY' && release.reviewer==='/root/pdf_setup_reviewer' && release.coordinator==='/root' && release.actual_effort==='high' && release.ui_browser_release===true && release.backend_write_deny_verified===true && release.runToken===process.env.PINKY_M2_UI_RUN_TOKEN && hashPattern.test(release.beforeInventoryHash) && Number.isFinite(Date.parse(release.reviewed_at_utc)) && Date.now()>=Date.parse(release.reviewed_at_utc) && Date.now()-Date.parse(release.reviewed_at_utc)<900000);
 hold(typeof release.runtime_observation?.session==='string' && /^[a-f0-9-]{36}$/.test(release.runtime_observation.session) && release.runtime_observation?.model==='gpt-6.1-sol' && release.runtime_observation?.effort==='high' && hashPattern.test(release.runtime_observation?.turn_context_sha256));
 const runRelative=`.local/cache/cms-recovery-001/v2/runs/${release.runToken}`,metadata=await lstat(path.join(CMS_ROOT,runRelative));hold(metadata.isDirectory() && metadata.uid===process.getuid() && (metadata.mode&0o777)===0o700);
 for(const key of ['TMPDIR','TMP','TEMP','MAC_CHROMIUM_TMPDIR'])hold(process.env[key]===path.join(CMS_ROOT,runRelative,'tmp'));
 const proof={};
 for(const [name,key,file]of [['native','native','native-controls.json'],['before','beforeInventory','before-inventory.json'],['privacy','privacy','privacy.json'],['high',null,null]]){
  const reference=key?release.evidence?.[key]:release.high_review;hold(exactKeys(reference,['path','sha256']) && reference.path===(file?`${runRelative}/${file}`:`${runRelative}/ui-high-review.json`) && hashPattern.test(reference.sha256));const bytes=await ownedEvidenceBytes(key??'high',reference.path);hold(sha(bytes)===reference.sha256);try{proof[name]=JSON.parse(bytes.toString('utf8'));}catch{hold(false);}
 }
 hold(same(release.evidence?.backendDeny,release.evidence.native));
 // These passive source functions read the frozen graph. They load no SDK or transport.
 const {m2Sources,m2UiSources,m2ClosureSources}=await import('../scripts/m2-recovery-profile.mjs');
 const current={runtime:m2Sources(),ui:m2UiSources(),closure:m2ClosureSources()};hold(same(current.runtime.map(row=>row.path),RUNTIME_SOURCE_PATHS));validateTypedEvidence(release,proof,current);
 const manifest=await ownedPrivateBytes(`${runRelative}/discovery/functions.yaml`,65536);hold(manifest.length===proof.native.entry.manifest.bytes && sha(manifest)===proof.native.entry.manifest.sha256);try{hold(same(JSON.parse(manifest.toString('utf8')),proof.native.entry.manifest.value));}catch{hold(false);}
 const fixtures=await ownedPrivateJson(`${runRelative}/fixtures.json`,65536),catalog=await ownedPrivateJson(`${runRelative}/read-catalog.json`,262144);
 return {...validateFixtureCatalog(fixtures,catalog,release),release};
}
const htmlEscape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
async function waitForParentPaint(evaluate,timeoutMs=15000){
 let timer;try{
  hold(Number.isSafeInteger(timeoutMs) && timeoutMs>0 && timeoutMs<=15000);
  const painted=await Promise.race([Promise.resolve().then(evaluate),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('paint deadline')),timeoutMs);})]);
  hold(painted===true);
 }catch{throw Error('CMS_RECOVERY_UI_HOLD: PARENT_PAINT_DEADLINE');}finally{clearTimeout(timer);}
}
async function waitForAuthModule(evaluate,timeoutMs=15000){
 let timer;try{
  hold(Number.isSafeInteger(timeoutMs) && timeoutMs>0 && timeoutMs<=15000);
  const complete=await Promise.race([Promise.resolve().then(evaluate),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('readiness deadline')),timeoutMs);})]);
  hold(complete===true);
 }catch{throw Error('CMS_RECOVERY_UI_HOLD: AUTH_MODULE_EVALUATION');}finally{clearTimeout(timer);}
}
function ownerFirstFixtures(fixtures){return fixtures.filter(value=>value.expectedSessionStatus===200).sort((a,b)=>['OWNER','EDITOR','REVIEWER','PUBLISHER'].indexOf(a.expectedRole)-['OWNER','EDITOR','REVIEWER','PUBLISHER'].indexOf(b.expectedRole));}
async function runLiveRecovery(testContext){
 // Admission verifies the current typed receipt before reading the exact fixture.
 // Playwright and all transport remain behind successful admission.
 const admission=await liveAdmission();process.umask(0o077);
 const activityDeadline=Date.now()+80000,assertActive=()=>hold(!testContext.signal.aborted && Date.now()<activityDeadline);
 const {chromium}=await import('@playwright/test');
 const runId=`ui-${new Date().toISOString().replaceAll(/[:.]/g,'-')}-${randomBytes(6).toString('hex')}`;
 const output=path.join(CMS_ROOT,'.local/test-outputs/cms-recovery-001/v2/ui',runId),browserCache=path.join(CMS_ROOT,'.local/cache/cms-recovery-001/v2/ui',runId);await mkdir(output,{recursive:true,mode:0o700});await mkdir(browserCache,{recursive:true,mode:0o700});
 const result={task:'CMS-RECOVERY-001',revision:2,projectId:'demo-pinky-lamb-cms',runToken:admission.release.runToken,runId,utcStarted:new Date().toISOString(),status:'RUNNING',Verified:[],Unknown:['Human acceptance PENDING','Production NOT_RUN_OUT_OF_SCOPE','Final protected inventory comparison belongs to runtime owner'],Proposed:[],sourceHashes:admission.release.sources,beforeInventoryHash:admission.catalog.beforeInventoryHash,roles:[],negativeFixtures:[],screenshots:[],network:[],blockedNetwork:0,pageErrors:0,consoleErrors:0,expectedNegativeConsole403:0};
 // A short owned scratch path keeps macOS Chromium Unix sockets below native limits.
 const toolingTemp=await mkdtemp('/private/tmp/pinky-m2-ui-');await chmod(toolingTemp,0o700);const tempMetadata=await lstat(toolingTemp);hold(tempMetadata.isDirectory() && !tempMetadata.isSymbolicLink() && tempMetadata.uid===process.getuid() && (tempMetadata.mode&0o777)===0o700 && await realpath(toolingTemp)===toolingTemp);
 const marker=JSON.stringify({task:'CMS-RECOVERY-001',revision:2,runId,runToken:admission.release.runToken});await writeFile(path.join(toolingTemp,'owner.json'),marker,{flag:'wx',mode:0o600});
 const launchEnvironment={...process.env,TMPDIR:toolingTemp,TMP:toolingTemp,TEMP:toolingTemp,MAC_CHROMIUM_TMPDIR:toolingTemp};
 await writeFile(path.join(browserCache,'temp-custody.json'),JSON.stringify({path:toolingTemp,type:'DIRECTORY',uid:tempMetadata.uid,mode:'0700',inode:tempMetadata.ino,device:tempMetadata.dev,markerSha256:sha(marker),launchEnvironment:Object.fromEntries(['TMPDIR','TMP','TEMP','MAC_CHROMIUM_TMPDIR'].map(key=>[key,launchEnvironment[key]])),HOME:'PRESERVED',nativeEffectiveness:'NOT_RUN_UNTIL_ACTUAL_LAUNCH'},null,2)+'\n',{flag:'wx',mode:0o600});
 let browser,context,credentialHeader=null,allowDirectProbe=false,negativePhase=false,reportFailed=false,stage='BROWSER_LAUNCH';
 const markStage=(name,state='BEGIN')=>{stage=name;process.stdout.write(JSON.stringify({phase:'UI_TEST_STAGE',stage:name,state})+'\n');};
 const origin='http://127.0.0.1:5175';
 try{
  markStage('BROWSER_LAUNCH');context=await chromium.launchPersistentContext(path.join(browserCache,'browser-profile'),{headless:true,chromiumSandbox:true,env:launchEnvironment,timeout:30000,viewport:{width:1440,height:1000},serviceWorkers:'block',acceptDownloads:false,artifactsDir:path.join(browserCache,'browser-artifacts'),args:['--disable-save-password-bubble','--disable-features=PasswordManagerOnboarding,PasswordManagerEnabled']});browser=context.browser();markStage('BROWSER_LAUNCH','COMPLETED');
  await context.route('**/*',async route=>{
   const request=route.request();let url;try{url=new URL(request.url());}catch{result.blockedNetwork++;return route.abort();}
   const local=url.protocol==='http:' && url.hostname==='127.0.0.1' && ['5175','5010','9098'].includes(url.port),authPost=url.port==='9098' && request.method()==='POST' && /^\/identitytoolkit\.googleapis\.com\/v1\/accounts:(signInWithPassword|lookup)$/.test(url.pathname);
   if(!local || !['GET','HEAD'].includes(request.method()) && !authPost){result.blockedNetwork++;return route.abort();}
   await route.continue();
  });
  const page=await context.newPage();page.setDefaultTimeout(20000);page.setDefaultNavigationTimeout(30000);
  const requestLogs=new WeakMap();
  page.on('request',request=>{const url=new URL(request.url());if(url.pathname==='/api/cms/session'){const header=request.headers().authorization;if(header?.startsWith('Bearer '))credentialHeader=header;}if(result.network.length<2048){const record={method:request.method(),origin:url.origin,path:url.pathname.startsWith('/.local/')?'PRIVATE_PATH':url.pathname.startsWith('/@fs/')?'/@fs/WORKSPACE_MODULE':url.pathname,query:url.search?'REDACTED':undefined,type:request.resourceType()};result.network.push(record);requestLogs.set(request,record);}else result.blockedNetwork++;});
  page.on('response',response=>{const record=requestLogs.get(response.request());if(record)record.status=response.status();});
  page.on('pageerror',()=>result.pageErrors++);page.on('console',message=>{if(message.type()==='error'){if(negativePhase && /^Failed to load resource:.*403/.test(message.text()))result.expectedNegativeConsole403++;else result.consoleErrors++;}});
  const {expect}=await import('@playwright/test');
  const {revealCmsControl,choosePinkySelect,showCmsView,expectPreviewViewport}=await import('./helpers/pinky-select-ui.mjs');
  async function capture(label,viewport,locator=page){assertActive();markStage('SCREENSHOT_CAPTURE');
   const name=`${label}-${viewport.width}px.png`;const file=path.join(output,name);let scope=locator===page?'actual viewport':'actual section';if(locator!==page){const box=await locator.boundingBox();hold(box && box.width<=2000);if(box.height>6000){await locator.scrollIntoViewIfNeeded();locator=page;scope='bounded actual viewport at section; full section exceeds6000px';}}await locator.screenshot({path:file,animations:'disabled',mask:[page.locator('#email'),page.locator('#password')],timeout:30000,...(locator===page?{fullPage:false}:{})});hold((await lstat(file)).size<=33554432);result.screenshots.push({file:name,label,scope,viewport,utc:new Date().toISOString(),sha256:sha(await readFile(file)),source:'Genuine CMS browser screenshot'});markStage('SCREENSHOT_CAPTURE','COMPLETED');
  }
  async function login(fixture){assertActive();
   markStage('LOGIN_NAVIGATION');await page.goto(origin,{waitUntil:'domcontentloaded'});markStage(stage,'COMPLETED');markStage('AUTH_MODULE_EVALUATION');await waitForAuthModule(()=>page.evaluate(async()=>{const module=await import('/auth.mjs');return typeof module.apiFetch==='function';}));markStage('AUTH_MODULE_EVALUATION','COMPLETED');assertActive();markStage('LOGIN_SUBMIT');(await revealCmsControl(page,page.locator('#email')), await page.locator('#email').fill(fixture.email));(await revealCmsControl(page,page.locator('#password')), await page.locator('#password').fill(fixture.password));(await revealCmsControl(page,page.locator('#login-submit')), await page.locator('#login-submit').click());markStage('LOGIN_SUBMIT','COMPLETED');markStage('PASSWORD_CLEAR');await expect(page.locator('#password')).toHaveValue('',{timeout:15000});markStage('PASSWORD_CLEAR','COMPLETED');markStage('SESSION_ROLE');
   await expect(page.locator('#session-role')).toHaveText(fixture.expectedRole);await expect(page.locator('#site-editor')).toHaveCount(1);await expect(page.locator('#site-status')).toHaveText('Bạn có quyền xem nội dung.');await expect(page.locator('#recovery-read-only')).toHaveText('Khôi phục — chỉ xem');await expect(page.locator('[data-cms-resource=home-v2]')).toHaveAttribute('aria-current','page');await expect(page.locator('#hero-editor')).toHaveCount(0);stage='M2_READONLY_VERIFICATION';
  }
  async function privateState(){return page.evaluate(async()=>{
   const requestValue=request=>new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(Error('IndexedDB check failed'));});
   let benignHeartbeatRecords=0,privateRecords=0;
   for(const info of await indexedDB.databases()){
    const database=await requestValue(indexedDB.open(info.name));try{
     for(const name of database.objectStoreNames){const transaction=database.transaction(name,'readonly'),store=transaction.objectStore(name),count=await requestValue(store.count());
      if(info.name!=='firebase-heartbeat-database' || name!=='firebase-heartbeat-store'){privateRecords+=count;continue;}
      if(count>8){privateRecords+=count;continue;}
      const values=await requestValue(store.getAll(undefined,8));for(const value of values){const allowed=value && !Array.isArray(value) && Object.keys(value).every(key=>['heartbeats','lastSentHeartbeatDate'].includes(key)) && Array.isArray(value.heartbeats) && value.heartbeats.length<=30 && (value.lastSentHeartbeatDate===undefined || /^\d{4}-\d{2}-\d{2}$/.test(value.lastSentHeartbeatDate)) && value.heartbeats.every(item=>item && Object.keys(item).sort().join(',')==='agent,date' && /^\d{4}-\d{2}-\d{2}$/.test(item.date) && typeof item.agent==='string' && item.agent.length<=2048 && /^(?:[A-Za-z0-9_-]+\/[A-Za-z0-9._-]+)(?: [A-Za-z0-9_-]+\/[A-Za-z0-9._-]+)*$/.test(item.agent));if(allowed)benignHeartbeatRecords++;else privateRecords++;}
     }
    }finally{database.close();}
   }
   return {local:localStorage.length,session:sessionStorage.length,indexedDbPrivateRecords:privateRecords,benignHeartbeatRecords};
  });}
  async function readApi(route){return page.evaluate(async route=>(await import('/auth.mjs')).apiFetch(route),route);}
  async function disabledControls(){
   for(const id of ['site-save','site-import','site-snapshot-submit','site-review-submit','site-source-submit'])await expect(page.locator(`#${id}`)).toBeDisabled();
   const editable=await page.locator('#site-fields input,#site-fields textarea,#site-fields [role=combobox],#site-fields button').evaluateAll(nodes=>nodes.filter(node=>!node.matches(':disabled')).length);assert.equal(editable,0);await expect(page.locator('#site-reload')).toBeEnabled();
  }
  async function boundNavigation(){
   await showCmsView(page,'edit');const checks=[];
   for(const id of ['site-header-fields','site-hero-fields','site-seo-fields']){(await revealCmsControl(page,page.locator(`#site-component-settings a[href="#${id}"]`)), await page.locator(`#site-component-settings a[href="#${id}"]`).click());await expect.poll(()=>page.evaluate(()=>location.hash)).toBe(`#${id}`);checks.push(id);}
   for(const nav of ['site-work-record-nav','site-services-record-nav']){const links=page.locator(`#${nav} a[data-site-record-link]`);if(await links.count()){const link=links.first(),fragment=await link.getAttribute('href');(await revealCmsControl(page,link), await link.click());await expect.poll(()=>page.evaluate(()=>document.activeElement?.id)).toBe(fragment.slice(1));checks.push(fragment.slice(1));}}
   return checks;
  }
  async function settlePreviewPaint(){
   await showCmsView(page,'preview');markStage('PREVIEW_PARENT_SCROLL');(await revealCmsControl(page,page.locator('#preview-panel')), await page.locator('#preview-panel').scrollIntoViewIfNeeded());markStage('PREVIEW_PARENT_SCROLL','COMPLETED');markStage('PREVIEW_FRAME_SCROLL');(await revealCmsControl(page,page.locator('#preview')), await page.locator('#preview').scrollIntoViewIfNeeded());markStage('PREVIEW_FRAME_SCROLL','COMPLETED');
   const body=page.frameLocator('#preview').locator('body');markStage('PREVIEW_RESET_SCROLL');await body.evaluate(()=>window.scrollTo({top:0,left:0,behavior:'instant'}));
   await expect.poll(()=>body.evaluate(()=>({x:window.scrollX,y:window.scrollY})),{timeout:15000}).toEqual({x:0,y:0});markStage('PREVIEW_RESET_SCROLL','COMPLETED');
   markStage('PREVIEW_PAINT');await waitForParentPaint(()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true))))));markStage('PREVIEW_PAINT','COMPLETED');
  }
  async function preview(viewport){
   markStage('PREVIEW_SELECT_WIDTH');await showCmsView(page,'preview');await choosePinkySelect(page,page.locator('#preview-width'),String(viewport.width));markStage('PREVIEW_SELECT_WIDTH','COMPLETED');
   markStage('PREVIEW_PARENT_SCROLL');(await revealCmsControl(page,page.locator('#preview-panel')), await page.locator('#preview-panel').scrollIntoViewIfNeeded());markStage('PREVIEW_PARENT_SCROLL','COMPLETED');const frame=page.locator('#preview');markStage('PREVIEW_FRAME_SCROLL');await frame.scrollIntoViewIfNeeded();markStage('PREVIEW_FRAME_SCROLL','COMPLETED');
   markStage('PREVIEW_STATUS_SANDBOX');await expect(page.locator('#preview-status')).toHaveText('Bản thử local — chưa xuất bản.');await expect(frame).toHaveAttribute('sandbox','');markStage('PREVIEW_STATUS_SANDBOX','COMPLETED');
   markStage('PREVIEW_FRAME_GEOMETRY');await expect(frame).toBeVisible();const dimensions=await frame.evaluate(node=>({width:Math.round(node.getBoundingClientRect().width),height:Math.round(node.getBoundingClientRect().height),sandbox:node.getAttribute('sandbox')}));await expectPreviewViewport(page,viewport.width,viewport.width===390?844:900);assert.ok(dimensions.width>0&&dimensions.width<=viewport.width);assert.ok(dimensions.height>0);markStage('PREVIEW_FRAME_GEOMETRY','COMPLETED');
   const child=page.frameLocator('#preview');markStage('PREVIEW_DOCUMENT_BOUNDARY');await expect(child.locator('main')).toBeVisible();assert.equal(await child.locator('script').count(),0);assert.equal(await child.locator('form[action]').count(),0);markStage('PREVIEW_DOCUMENT_BOUNDARY','COMPLETED');
   markStage('PREVIEW_IMAGE_COUNT');await child.locator('img').first().waitFor({state:'attached'});const visibleImages=child.locator('img:visible'),imageCount=await visibleImages.count();hold(imageCount>0 && imageCount<=128);markStage('PREVIEW_IMAGE_COUNT','COMPLETED');
   markStage('PREVIEW_IMAGE_READY');for(let index=0;index<imageCount;index++){const image=visibleImages.nth(index);await expect.poll(()=>image.evaluate(node=>node.complete && node.naturalWidth>0),{timeout:15000}).toBe(true);}markStage('PREVIEW_IMAGE_READY','COMPLETED');
   markStage('PREVIEW_IMAGE_SUMMARY');const images=await child.locator('img').evaluateAll(nodes=>{const visible=nodes.filter(node=>node.getClientRects().length>0);return {total:nodes.length,visible:visible.length,loaded:visible.filter(node=>node.naturalWidth>0).length,broken:visible.filter(node=>node.naturalWidth===0).length,hiddenNotChecked:nodes.length-visible.length};});assert.ok(images.visible>0);assert.equal(images.broken,0);markStage('PREVIEW_IMAGE_SUMMARY','COMPLETED');await settlePreviewPaint();return {dimensions,images};
  }
  const valid=ownerFirstFixtures(admission.fixtures);
  for(const fixture of valid){assertActive();
   credentialHeader=null;await page.setViewportSize({width:1440,height:1000});await login(fixture);await disabledControls();const storage=await privateState();assert.equal(storage.local,0);assert.equal(storage.session,0);assert.equal(storage.indexedDbPrivateRecords,0);assert.equal((await context.cookies()).length,0);
   const draft=await readApi('/api/cms/drafts/home-v2');assert.equal(draft.revision,admission.catalog.draftRevision);const contentHash=sha(JSON.stringify(draft.content));const role={role:fixture.expectedRole,status:'PASS',draftRevision:draft.revision,contentHash,storage,viewports:[]};
   for(const key of ['settings','clients','work','services','about','ip-studio','contact','footer'])await expect(page.locator(`#site-component-${key}`)).toHaveCount(1);
   for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
    await page.setViewportSize(viewport);const navigation=await boundNavigation(),metrics=await preview(viewport);role.viewports.push({viewport,navigation,...metrics});await capture(`${fixture.expectedRole.toLowerCase()}-overview`,viewport);
    await showCmsView(page,'edit');if(fixture.expectedRole==='OWNER')for(const key of ['settings','clients','work','services','about','ip-studio','contact','footer']){const section=page.locator(`#site-component-${key}`);(await revealCmsControl(page,section), await section.scrollIntoViewIfNeeded());await capture(`owner-section-${key}`,viewport,section);}
    await settlePreviewPaint();markStage('PREVIEW_CAPTURE');await capture(`${fixture.expectedRole.toLowerCase()}-private-preview`,viewport,page.locator('#preview-panel'));stage='M2_READONLY_VERIFICATION';
   }
   await page.setViewportSize({width:1440,height:1000});(await revealCmsControl(page,page.locator('#site-reload')), await page.locator('#site-reload').click());await expect(page.locator('#site-status')).toHaveText('Bạn có quyền xem nội dung.');assert.equal(sha(JSON.stringify((await readApi('/api/cms/drafts/home-v2')).content)),contentHash);
   const forged=await page.evaluate(async()=>{
    const module=await import('/auth.mjs'),cases=[['/api/cms/drafts/home'],['/api/cms/snapshots'],['/api/cms/snapshots/x/source-checks?pageSize=51'],['/api/cms/drafts/home-v2',{method:'PATCH',body:'{}'}],['/api/cms/source-checks',{method:'POST',body:'{}'}]];const before=performance.getEntriesByType('resource').filter(item=>item.name.includes('/api/cms/')).length;let refused=0;for(const [path,options]of cases)try{await module.apiFetch(path,options);}catch{refused++;}
    const forbidden=document.querySelector('[data-cms-resource=home]');const locked=forbidden.disabled;forbidden.dispatchEvent(new Event('click',{bubbles:true}));return {refused,before,after:performance.getEntriesByType('resource').filter(item=>item.name.includes('/api/cms/')).length,resource:document.querySelector('[data-cms-resource][aria-current=page]')?.dataset.cmsResource,locked,hero:document.getElementById('hero-editor')!==null};
   });assert.equal(forged.refused,5);assert.equal(forged.after,forged.before);assert.equal(forged.resource,'home-v2');assert.equal(forged.locked,true);assert.equal(forged.hero,false);role.clientRefusal=forged;
   if(fixture.expectedRole==='OWNER'){
    hold(admission.release.backend_write_deny_verified===true && credentialHeader);
    // Fixed empty-body probes only. Authorization stays in memory and never enters evidence.
    allowDirectProbe=true;const statuses=[];for(const [route,method]of [['/api/cms/drafts/home-v2','PATCH'],['/api/cms/snapshots','POST'],['/api/cms/reviews','POST'],['/api/cms/source-checks','POST']]){const response=await context.request.fetch(origin+route,{method,headers:{Authorization:credentialHeader,'Content-Type':'application/json'},data:'{}',timeout:15000,maxRedirects:0});statuses.push({method,status:response.status()});assert.equal(response.status(),405);await response.dispose();}allowDirectProbe=false;role.directWriteRefusal=statuses;
   }
   role.snapshots=[];
   for(const item of admission.catalog.snapshots.slice(0,3)){assertActive();
    markStage('SNAPSHOT_LOAD');(await revealCmsControl(page,page.locator('#site-snapshot-id')), await page.locator('#site-snapshot-id').fill(item.id));(await revealCmsControl(page,page.locator('#site-snapshot-load')), await page.locator('#site-snapshot-load').click());markStage('SNAPSHOT_LOAD','COMPLETED');markStage('SNAPSHOT_TRUSTED_READ');const response=await readApi(`/api/cms/snapshots/${item.id}`);assert.equal(response.snapshot.contentHash,item.contentHash);markStage('SNAPSHOT_TRUSTED_READ','COMPLETED');markStage('SNAPSHOT_STATUS_SUMMARY');await expect(page.locator('#site-snapshot-summary')).toContainText(item.contentHash);await expect(page.locator('#site-review-status')).toHaveText(response.snapshot.submittedBy===fixture.uid?'Bạn không thể tự đối chiếu nguồn hoặc tự duyệt website do mình gửi.':'Đã mở đúng bản website bất biến.');markStage('SNAPSHOT_STATUS_SUMMARY','COMPLETED');markStage('SOURCE_CHECK_LOAD');(await revealCmsControl(page,page.locator('#site-source-load')), await page.locator('#site-source-load').click());await expect(page.locator('#site-source-status')).toContainText('Đã đọc');markStage('SOURCE_CHECK_LOAD','COMPLETED');
    markStage('SOURCE_CHECK_PAGINATION');let pages=1;while(await page.locator('#site-source-next').isEnabled()){hold(pages<10);(await revealCmsControl(page,page.locator('#site-source-next')), await page.locator('#site-source-next').click());await expect(page.locator('#site-source-status')).toContainText('Đã đọc');pages++;}markStage('SOURCE_CHECK_PAGINATION','COMPLETED');
    markStage('SOURCE_CHECK_IDS');const ids=await page.locator('#site-source-checks [data-source-check-id]').evaluateAll(nodes=>nodes.map(node=>node.dataset.sourceCheckId));assert.deepEqual(ids.sort(),[...item.sourceCheckIds].sort());markStage('SOURCE_CHECK_IDS','COMPLETED');await disabledControls();role.snapshots.push({id:item.id,contentHash:item.contentHash,sourceChecks:ids.length,pages});await capture(`${fixture.expectedRole.toLowerCase()}-snapshot-${role.snapshots.length}`,{width:1440,height:1000},page.locator('#site-review-panel'));
   }
   if(!admission.catalog.snapshots.length)role.snapshotStatus='NOT_RUN_NO_EXISTING_M2_SNAPSHOT';if(admission.catalog.snapshots.length>3)role.snapshotScope='BOUNDED_FIRST_3_ONLY';
   (await revealCmsControl(page,page.locator('#logout')), await page.locator('#logout').click());await expect(page.locator('#private-content')).toBeEmpty();await expect(page.locator('#preview')).not.toHaveAttribute('srcdoc',/./);await expect(page.locator('#site-editor')).toHaveCount(0);await login(fixture);assert.equal(sha(JSON.stringify((await readApi('/api/cms/drafts/home-v2')).content)),contentHash);(await revealCmsControl(page,page.locator('#logout')), await page.locator('#logout').click());credentialHeader=null;result.roles.push(role);
  }
  assert.equal(result.consoleErrors,0);negativePhase=true;
  // Negative membership cases use only fixtures created by the runtime owner.
  for(const [index,fixture]of admission.fixtures.filter(value=>value.expectedSessionStatus===403).entries()){assertActive();
   markStage('NEGATIVE_NAVIGATION');await page.goto(origin,{waitUntil:'domcontentloaded'});markStage(stage,'COMPLETED');markStage('AUTH_MODULE_EVALUATION');await waitForAuthModule(()=>page.evaluate(async()=>{const module=await import('/auth.mjs');return typeof module.apiFetch==='function';}));markStage('AUTH_MODULE_EVALUATION','COMPLETED');assertActive();markStage('NEGATIVE_SUBMIT');(await revealCmsControl(page,page.locator('#email')), await page.locator('#email').fill(fixture.email));(await revealCmsControl(page,page.locator('#password')), await page.locator('#password').fill(fixture.password));const refused=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/cms/session',{timeout:20000});(await revealCmsControl(page,page.locator('#login-submit')), await page.locator('#login-submit').click());const response=await refused;assert.equal(response.status(),403);markStage('PASSWORD_CLEAR');await expect(page.locator('#password')).toHaveValue('',{timeout:15000});markStage('PASSWORD_CLEAR','COMPLETED');markStage('NEGATIVE_SESSION_REFUSAL');await expect(page.locator('#login-panel')).toBeVisible();await expect(page.locator('#private-content')).toBeEmpty();await expect(page.locator('#site-editor')).toHaveCount(0);await expect(page.locator('#preview')).not.toHaveAttribute('srcdoc',/./);await capture(`negative-membership-${index+1}`,{width:1440,height:1000});result.negativeFixtures.push({fixture:index+1,status:403,privateContentCleared:true});
  }
  assert.equal(result.blockedNetwork,0);assert.equal(result.pageErrors,0);assert.equal(result.consoleErrors,0);const storage=await privateState();assert.equal(storage.local,0);assert.equal(storage.session,0);assert.equal(storage.indexedDbPrivateRecords,0);assert.equal((await context.cookies()).length,0);hold(!allowDirectProbe);result.Verified=['Real OWNER/EDITOR/REVIEWER/PUBLISHER login/read-only UI','Current M2 draft and all8sections','Actual1440/390 private legacy preview images+sandbox','Bound Header/Hero/SEO and populated Work/Services navigation','Disabled mutation UI and client pre-network refusal','Direct authenticated API write405 METHOD_NOT_ALLOWED before dispatch after High backendDENY gate','Reload/logout/relogin','3membership refusal fixtures','Loopback-only browser transport; tokens/private content storage0, benign SDK heartbeat metadata reported separately'];result.status='PASS_UI_PENDING_PRESERVATION';
 }catch{result.status='HOLD_UI_FAILURE';result.failureStage=stage;result.Unknown.push('One or more UI checks failed; no raw assertion, credential, header or body retained');throw Error('CMS_RECOVERY_UI_HOLD: inspect redacted results; no runtime was stopped');}
 finally{
  credentialHeader=null;admission.fixtures.forEach(value=>{value.password='';});result.utcCompleted=new Date().toISOString();
  const cards=result.screenshots.map(item=>`<figure><figcaption>${htmlEscape(item.label)} — ${item.viewport.width}×${item.viewport.height} — ${htmlEscape(item.utc)}</figcaption><img src="${htmlEscape(item.file)}" alt="${htmlEscape(item.label)}"><small>SHA-256 ${item.sha256}</small></figure>`).join('');
  const reportHtml=()=>`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>CMS-RECOVERY-001 — kiểm thử UI thật</title><style>body{font:16px/1.5 system-ui;margin:24px;max-width:1280px;color:#222;background:#faf8f5}h1{font-size:28px}figure{margin:24px 0;padding:12px;border:1px solid #bbb;background:#fff}img{display:block;width:100%;height:auto}small{overflow-wrap:anywhere}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style><h1>CMS-RECOVERY-001 — kiểm thử UI thật</h1><p><strong>${htmlEscape(result.status)}</strong> — ${htmlEscape(result.utcCompleted)}</p><p>${result.screenshots.length?'Verified: ảnh chụp từ CMS thật, không phải mockup.':'Unknown: Screenshot NOT_RUN; chưa chụp được giao diện.'} Unknown: nghiệm thu người dùng PENDING; đối chiếu bảo toàn dữ liệu cuối do runtime owner thực hiện. Production NOT_RUN.</p><details><summary>Metadata, kết quả và giới hạn</summary><pre>${htmlEscape(JSON.stringify({...result,network:undefined,screenshots:undefined},null,2))}</pre></details>${cards}</html>`;
  let html=reportHtml();
  if(browser){try{const reportContext=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});const reportPage=await reportContext.newPage();await reportContext.route('**/*',route=>route.abort());const cover=result.screenshots.slice(0,4);let embedded=html;for(const item of cover)embedded=embedded.replace(`src="${item.file}"`,`src="data:image/png;base64,${(await readFile(path.join(output,item.file))).toString('base64')}"`);embedded=embedded.replace(/<figure>(?:(?!<figure>)[\s\S])*?<\/figure>/g,figure=>figure.includes('data:image/png;')?figure:'');await reportPage.setContent(embedded,{waitUntil:'load',timeout:30000});await reportPage.screenshot({path:path.join(output,'report.png'),fullPage:true,animations:'disabled',timeout:30000});await reportContext.close();}catch{result.Unknown.push('Report PNG NOT_RUN_RENDER_LIMIT');if(result.status==='PASS_UI_PENDING_PRESERVATION'){result.status='HOLD_REPORT_RENDER';reportFailed=true;}}}
  html=reportHtml();await writeFile(path.join(output,'report.html'),html,{flag:'wx',mode:0o600});await writeFile(path.join(output,'results.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
  const files=['results.json','report.html',...(await lstat(path.join(output,'report.png')).then(()=>['report.png'],()=>[])),...result.screenshots.map(value=>value.file)],manifest={task:'CMS-RECOVERY-001',revision:2,projectId:'demo-pinky-lamb-cms',runToken:admission.release.runToken,runId,utc:new Date().toISOString(),status:result.status,acceptance:'PENDING',files:[]};for(const file of files)manifest.files.push({file,sha256:sha(await readFile(path.join(output,file)))});await writeFile(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx',mode:0o600});await context?.close();await browser?.close();
  const finalTemp=await lstat(toolingTemp);hold(finalTemp.isDirectory() && !finalTemp.isSymbolicLink() && finalTemp.uid===process.getuid() && (finalTemp.mode&0o777)===0o700 && finalTemp.ino===tempMetadata.ino && finalTemp.dev===tempMetadata.dev && await realpath(toolingTemp)===toolingTemp && (await readFile(path.join(toolingTemp,'owner.json'),'utf8'))===marker);await rm(toolingTemp,{recursive:true,force:false});await writeFile(path.join(browserCache,'temp-cleanup.json'),JSON.stringify({path:toolingTemp,markerSha256:sha(marker),status:'COMPLETE_OWNED_TOOLING_SCRATCH_REMOVED',utc:new Date().toISOString()})+'\n',{flag:'wx',mode:0o600});
 }
 if(reportFailed)throw Error('CMS_RECOVERY_UI_HOLD: report PNG not rendered; no runtime was stopped');
 hold(result.status==='PASS_UI_PENDING_PRESERVATION' && !testContext.signal.aborted);
 const manifestBytes=await readFile(path.join(output,'manifest.json'));
 await writeFile(path.join(CMS_ROOT,'.local/cache/cms-recovery-001/v2/runs',admission.release.runToken,'browser-result.json'),JSON.stringify({task:'CMS-RECOVERY-001',revision:2,projectId:'demo-pinky-lamb-cms',runToken:admission.release.runToken,phase:'UI_REPORT',status:'PASS_REPORT_WRITER_COMPLETED',output:path.relative(CMS_ROOT,output),runId,manifestSha256:sha(manifestBytes),sources:admission.release.sources,beforeInventoryHash:admission.catalog.beforeInventoryHash})+'\n',{flag:'wx',mode:0o600});
}


test('safe: live fixture boundary rejects roster/project drift without exposing credential values',()=>{
 const fixtures={task:'CMS-RECOVERY-001',revision:2,projectId:'demo-pinky-lamb-cms',authEndpoint:'127.0.0.1:9098',fixtures:PUBLIC_FIXTURE_ROSTER.map((value,index)=>({...value,password:`Synthetic-boundary-${index}-only`}))},catalog={task:'CMS-RECOVERY-001',revision:2,projectId:'demo-pinky-lamb-cms',resourceId:'home-v2',draftRevision:3,snapshots:[],beforeInventoryHash:'a'.repeat(64)},release={fixtureRoster:PUBLIC_FIXTURE_ROSTER,beforeInventoryHash:catalog.beforeInventoryHash};
 assert.equal(validateFixtureCatalog(fixtures,catalog,release).fixtures.length,7);
 for(const mutate of [value=>{value.projectId='real-project';},value=>{value.authEndpoint='127.0.0.1:9099';},value=>{value.fixtures[2].expectedRole='VIEWER';},value=>{value.fixtures[0].uid='other-user';},value=>{value.fixtures[0].password='too-short';}]){const value=structuredClone(fixtures);mutate(value);assert.throws(()=>validateFixtureCatalog(value,catalog,release),error=>error.message==='CMS_RECOVERY_UI_HOLD: admission or evidence mismatch');}
 const wrongCatalog={...catalog,beforeInventoryHash:'b'.repeat(64)};assert.throws(()=>validateFixtureCatalog(fixtures,wrongCatalog,release),/CMS_RECOVERY_UI_HOLD/);
});


test('safe: private reader refuses actual FIFO, directory, symlink, mode and link drift before read',{timeout:5000},async()=>{
 const relative=`.local/cache/cms-recovery-001/v2/ui/private-reader-${randomBytes(8).toString('hex')}`,directory=path.join(CMS_ROOT,relative);await mkdir(directory,{recursive:true,mode:0o700});const regular=path.join(directory,'regular.txt');await writeFile(regular,'synthetic finite fixture',{flag:'wx',mode:0o600});assert.equal((await ownedPrivateBytes(`${relative}/regular.txt`,64)).toString(),'synthetic finite fixture');
 const fifo=path.join(directory,'refused.fifo'),created=spawnSync('/usr/bin/mkfifo',['-m','600',fifo],{timeout:1000,maxBuffer:2048});assert.equal(created.status,0);await assert.rejects(ownedPrivateBytes(`${relative}/refused.fifo`,64),/CMS_RECOVERY_UI_HOLD/);
 await assert.rejects(ownedPrivateBytes(relative,64),/CMS_RECOVERY_UI_HOLD/);await symlink('regular.txt',path.join(directory,'refused-link'));await assert.rejects(ownedPrivateBytes(`${relative}/refused-link`,64),/CMS_RECOVERY_UI_HOLD/);await chmod(regular,0o644);await assert.rejects(ownedPrivateBytes(`${relative}/regular.txt`,64),/CMS_RECOVERY_UI_HOLD/);await chmod(regular,0o600);await assert.rejects(ownedPrivateBytes(`${relative}/regular.txt`,4),/CMS_RECOVERY_UI_HOLD/);await link(regular,path.join(directory,'refused-hardlink'));await assert.rejects(ownedPrivateBytes(`${relative}/regular.txt`,64),/CMS_RECOVERY_UI_HOLD/);
});


test('safe: typed live proof rejects HOLD, wrong run/source, duplicate binding and unlinked High review',()=>{
 // Synthetic boundary packets only. They are never saved as native evidence.
 const rows=paths=>paths.map(path=>({path,bytes:1,sha256:'a'.repeat(64)})),current={runtime:rows(RUNTIME_SOURCE_PATHS),ui:rows(UI_SOURCE_PATHS),closure:rows(['synthetic-source.mjs'])},runToken='AAAAAAAAAAAAAAAAAAAAAA';
 const runtime_observation={session:'01a12d56-7fe2-7f33-909f-308eb4299ff7',model:'gpt-6.1-sol',effort:'high',turn_context_sha256:'36a9f88efe9dd33672b5ffee92209de99c8155eebbe216980ffa251876f87977'},release={runToken,sources:current.ui,runtime_observation};
 const identity={task:'CMS-RECOVERY-001',revision:2,projectId:'demo-pinky-lamb-cms',runToken},apiRoot=path.join(CMS_ROOT,'cms-recovery-api'),node=path.join(CMS_ROOT,'.local/cache/node/node-v22.23.3-darwin-arm64/bin/node'),canonical=path.join(CMS_ROOT,'.local/cache/cms-recovery-001/v2/runs',runToken,'tmp/fire_emu_aaaaaaaaaaaaaaaa.sock'),effective=path.relative(apiRoot,canonical);
 const process={node,version:'v22.23.3',cwd:apiRoot,ppid:10002,pgid:10002,start:'Tue Oct 13 09:00:00 2026',sources:current.runtime,closure_sources:current.closure};
 const inventory={collections:INVENTORY_COLLECTIONS.map(name=>({name,count:0,entries:[]})),documents:0,canonicalBytes:0},inventoryJson=canonicalJson(inventory);inventory.sha256=sha(inventoryJson);release.beforeInventoryHash=inventory.sha256;
 const proof={
  high:{...identity,status:'PASS_CODE_UNIT_ONLY',reviewer:'/root/pdf_setup_reviewer',coordinator:'/root',actual_effort:'high',runtime_observation,sources:current.ui},
  native:{...identity,phase:'NATIVE_CONTROLS',status:'PASS_NATIVE_CONTROL_ONLY',sources:current.runtime,closure_sources:current.closure,entry:{manifest:{value:{specVersion:'v1alpha1',endpoints:{cmsApi:{entryPoint:'cmsApi',platform:'gcfv2',region:['us-central1'],httpsTrigger:{}}},params:[],requiredAPIs:[]},bytes:1,sha256:'a'.repeat(64)},discovery:{...process,profile:'discovery',pid:10003,argv:`${node} ${path.join(CMS_ROOT,'node_modules/firebase-functions/lib/bin/firebase-functions.js')} ${apiRoot}`},worker:{...process,profile:'worker',pid:10004,argv:`${node} ${path.join(CMS_ROOT,'node_modules/firebase-tools/lib/emulator/functionsEmulatorRuntime')}`,canonicalSocket:canonical,effectiveSocket:effective},socket:{canonical,effective,type:'UNIX_SOCKET',ownerUid:globalThis.process.getuid()},anonymous:{status:401,code:'UNAUTHENTICATED',bytes:1},SDK:'MODULE_LOADED_EXISTING_AUTHORIZATION',authenticatedAuthFirestoreRpc:'NOT_RUN_NO_BEARER'},writeDeny:{status:'PASS_BEFORE_DISPATCH_405',cases:WRITE_DENY_CASES.map(value=>({...value,status:405,code:'METHOD_NOT_ALLOWED',authorize_called:false,dispatch_called:false}))}},
  before:{...identity,phase:'BEFORE_INVENTORY',status:'PASS_READ_ONLY_INVENTORY',sources:current.runtime,closure_sources:current.closure,inventory,beforeInventoryHash:inventory.sha256,diskCustodyHash:'a'.repeat(64)},
  privacy:{...identity,phase:'HTTP_PRIVACY',status:'PASS_HTTP_PRIVACY',sources:current.ui,beforeInventoryHash:inventory.sha256,CSP:{auth9098:true,hmr5175:true,opaqueSandbox:true},privateCases:PRIVATE_HTTP_PATHS.map(path=>({path,status:403}))}
 };
 assert.equal(validateTypedEvidence(release,proof,current),true);
 // Inert exact499B packet captured from the current pinned producer; no live file/transport read.
 const capturedManifestBytes="{\n  \"specVersion\": \"v1alpha1\",\n  \"endpoints\": {\n    \"cmsApi\": {\n      \"availableMemoryMb\": null,\n      \"timeoutSeconds\": null,\n      \"minInstances\": null,\n      \"maxInstances\": null,\n      \"ingressSettings\": null,\n      \"concurrency\": null,\n      \"serviceAccountEmail\": null,\n      \"vpc\": null,\n      \"platform\": \"gcfv2\",\n      \"region\": [\n        \"us-central1\"\n      ],\n      \"labels\": {},\n      \"httpsTrigger\": {},\n      \"entryPoint\": \"cmsApi\"\n    }\n  },\n  \"extensions\": {},\n  \"requiredAPIs\": []\n}";
 assert.equal(Buffer.byteLength(capturedManifestBytes),499);
 const captured=structuredClone(proof);captured.native.entry.manifest={value:JSON.parse(capturedManifestBytes),bytes:499,sha256:sha(capturedManifestBytes)};
 assert.equal(validateTypedEvidence(release,captured,current),true);
 const emptyParams=structuredClone(captured);emptyParams.native.entry.manifest.value.params=[];assert.equal(validateTypedEvidence(release,emptyParams,current),true);
 for(const params of [undefined,null,{},'empty',0,[{name:'unexpected'}]]){const invalid=structuredClone(captured);invalid.native.entry.manifest.value.params=params;assert.throws(()=>validateTypedEvidence(release,invalid,current),/CMS_RECOVERY_UI_HOLD/);}

 const shebang=structuredClone(proof);shebang.native.entry.discovery.argv=`node ${path.join(CMS_ROOT,'node_modules/.bin/firebase-functions')} ${apiRoot}`;assert.equal(validateTypedEvidence(release,shebang,current),true);
 const wrongExecutable=structuredClone(shebang);wrongExecutable.native.entry.discovery.node='/usr/bin/node';assert.throws(()=>validateTypedEvidence(release,wrongExecutable,current),/CMS_RECOVERY_UI_HOLD/);
 const oldRevision=structuredClone(proof);oldRevision.native.revision=1;assert.throws(()=>validateTypedEvidence(release,oldRevision,current),/CMS_RECOVERY_UI_HOLD/);
 for(const mutate of [value=>{value.native.status='HOLD';},value=>{value.before.status='Unknown';},value=>{value.native.runToken='BBBBBBBBBBBBBBBBBBBBBB';},value=>{value.privacy.sources[0].sha256='b'.repeat(64);},value=>{value.high.sources[1]=value.high.sources[0];},value=>{value.high.reviewer='/root';},value=>{value.high.runToken='BBBBBBBBBBBBBBBBBBBBBB';},value=>{value.native.entry.anonymous.status=200;},value=>{value.native.writeDeny.cases[0].dispatch_called=true;},value=>{value.native.entry.manifest.value.endpoints.other={};},value=>{value.before.inventory.sha256='b'.repeat(64);},value=>{value.privacy.privateCases[0].status=200;}]){const value=structuredClone(proof);mutate(value);assert.throws(()=>validateTypedEvidence(release,value,current),/CMS_RECOVERY_UI_HOLD/);}
});


test('safe: BEFORE evidence alone admits the maintained 16 MiB inventory bound',{timeout:10000},async()=>{
 const relative=`.local/cache/cms-recovery-001/v2/ui-before-cap-fix-r4/fixtures-${randomBytes(8).toString('hex')}`,directory=path.join(CMS_ROOT,relative);await mkdir(directory,{recursive:true,mode:0o700});
 for(const size of [2235187,16*1024*1024,16*1024*1024+1]){
  const file=`${relative}/${size}.bin`;await writeFile(path.join(CMS_ROOT,file),Buffer.alloc(size,97),{flag:'wx',mode:0o600});
  if(size<=16*1024*1024)assert.equal((await ownedEvidenceBytes('beforeInventory',file)).length,size);else await assert.rejects(ownedEvidenceBytes('beforeInventory',file),/CMS_RECOVERY_UI_HOLD/);
  for(const name of ['native','privacy','high'])await assert.rejects(ownedEvidenceBytes(name,file),/CMS_RECOVERY_UI_HOLD/);
 }
 await assert.rejects(ownedEvidenceBytes('unknown',`${relative}/2235187.bin`),/CMS_RECOVERY_UI_HOLD/);
});


// Opt-in pre-emulator QA: actual installed Vite, public CMS sources, no Auth/API requests.
test('dev: recovery public ESM graph and private HTTP boundary',{skip:process.env.PINKY_M2_VITE_QA!=='CMS-RECOVERY-001-v2',timeout:90000},async()=>{
 const {createServer}=await import('vite'),{createLocalViteConfig}=await import('../vite.config.mjs');
 const cache=path.join(CMS_ROOT,'.local/cache/cms-recovery-001/v2/vite-fix/qa',randomBytes(8).toString('hex'));await mkdir(cache,{recursive:true,mode:0o700});
 const server=await createServer({...createLocalViteConfig({recovery:true,cache}),configFile:false,logLevel:'error'});
 const receipt={task:'CMS-RECOVERY-001',revision:2,phase:'PRE_EMULATOR_REAL_VITE_GRAPH',cache,requests:[],AuthAPI:'NOT_RUN',closed:false};
 try{
  await server.listen();
  const queue=['/auth.mjs',`/@fs/${path.join(CMS_ROOT,'contracts/site-records.mjs')}`,`/@fs/${path.join(CMS_ROOT,'preview/site-public-data.mjs')}`],seen=new Set();let bytes=0;const deadline=Date.now()+60000;
  while(queue.length){
   assert.ok(Date.now()<deadline && seen.size<1500 && bytes<32*1024*1024,'bounded public graph');
   const route=queue.shift();if(seen.has(route))continue;seen.add(route);assert.ok(!route.startsWith('/api/') && !route.includes('.local/'));
   const response=await fetch(`http://127.0.0.1:5175${route}`,{signal:AbortSignal.timeout(5000)}),body=await response.text();bytes+=Buffer.byteLength(body);receipt.requests.push({path:route,status:response.status,bytes:Buffer.byteLength(body)});assert.equal(response.status,200,route);
   assert.ok(!body.includes('/.local/'),'public graph cannot reference private optimizer cache');
   for(const match of body.matchAll(/(?:from\s*|import\s*)["']([^"']+)["']/g)){const specifier=match[1];if(specifier.startsWith('/'))queue.push(specifier);else if(specifier.startsWith('.'))queue.push(new URL(specifier,`http://127.0.0.1:5175${route}`).pathname);}
  }
  for(const name of ['firebase/app','firebase/auth','zod']){const resolved=await server.pluginContainer.resolveId(name,path.join(CMS_ROOT,'admin/auth.mjs'));assert.ok(resolved?.id && resolved.id.includes('/node_modules/') && !resolved.id.includes('/.local/'),name);}
  for(const route of PRIVATE_HTTP_PATHS){const response=await fetch(`http://127.0.0.1:5175${route}`,{signal:AbortSignal.timeout(5000)});receipt.requests.push({path:route,status:response.status});assert.equal(response.status,403,route);}
  await assert.rejects(server.pluginContainer.resolveId('../scripts/m2-recovery-profile.mjs',path.join(CMS_ROOT,'admin/auth.mjs')),/Private\/server import forbidden/);
  receipt.status='PASS_REAL_VITE_GRAPH_PRIVATE_BOUNDARY';
 }catch(error){receipt.status='HOLD';receipt.error=error.message;throw error;}finally{await server.close();receipt.closed=true;await writeFile(path.join(cache,'result.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});}
});


test('safe: auth readiness awaits real module evaluation before credential work',{timeout:3000},async()=>{
 let release;const ready=new Promise(resolve=>{release=resolve;}),context=createContext({ready});
 const module=new SourceTextModule('await ready; globalThis.evaluated=true; export const apiFetch=()=>{};',{context});await module.link(()=>{throw Error('unexpected import');});
 let proceeded=false;const barrier=waitForAuthModule(async()=>{await module.evaluate();return typeof module.namespace.apiFetch==='function';},1000).then(()=>{proceeded=true;});
 await new Promise(resolve=>setImmediate(resolve));assert.equal(proceeded,false);assert.equal(context.evaluated,undefined);release();await barrier;assert.equal(proceeded,true);assert.equal(context.evaluated,true);
 await assert.rejects(waitForAuthModule(()=>new Promise(()=>{}),5),/AUTH_MODULE_EVALUATION/);
 await assert.rejects(waitForAuthModule(async()=>{throw Error('sensitive synthetic cause');},1000),error=>error.message==='CMS_RECOVERY_UI_HOLD: AUTH_MODULE_EVALUATION');
 await assert.rejects(waitForAuthModule(async()=>false,1000),/AUTH_MODULE_EVALUATION/);
 assert.deepEqual(ownerFirstFixtures(PUBLIC_FIXTURE_ROSTER).map(value=>value.expectedRole),['OWNER','EDITOR','REVIEWER','PUBLISHER']);assert.equal(PUBLIC_FIXTURE_ROSTER[0].expectedRole,'EDITOR');
});


test('safe: parent paint callback is awaited and refuses a non-resolving paint within its deadline',{timeout:1000},async()=>{
 let complete;const parentPaint=new Promise(resolve=>{complete=resolve;});let proceeded=false;
 const pending=waitForParentPaint(()=>parentPaint,100).then(()=>{proceeded=true;});await new Promise(resolve=>setImmediate(resolve));assert.equal(proceeded,false);complete(true);await pending;assert.equal(proceeded,true);
 const started=performance.now();await assert.rejects(waitForParentPaint(()=>new Promise(()=>{}),5),error=>error.message==='CMS_RECOVERY_UI_HOLD: PARENT_PAINT_DEADLINE');assert.ok(performance.now()-started<500);
 await assert.rejects(waitForParentPaint(async()=>false,100),/PARENT_PAINT_DEADLINE/);
 await assert.rejects(waitForParentPaint(async()=>{throw Error('synthetic private cause');},100),error=>error.message==='CMS_RECOVERY_UI_HOLD: PARENT_PAINT_DEADLINE');
});


test('safe: real site review read retains own-submitter status guard and other-submitter success',{timeout:5000},async()=>{
 const restore=installDom();try{
  const source=await readFile(new URL('../admin/review.mjs',import.meta.url),'utf8'),sourceReview=await import('../admin/source-review.mjs');
  for(const own of [true,false]){
   const context=createContext({document,window,Event,CustomEvent,structuredClone,console,DOMException}),modules=new Map(),container=new Node(),requests=[];
   const entry=new SourceTextModule(source,{context});await entry.link(async specifier=>{
    if(modules.has(specifier))return modules.get(specifier);
    const actual=await import(specifier.startsWith('.')?new URL(specifier,new URL('../admin/review.mjs',import.meta.url)).href:specifier);
    // Snapshot-validation/source-panel boundaries are inert; actual review handler and controls execute unchanged.
    const values=specifier==='./source-review.mjs'?{...sourceReview,validateBrowserSnapshot:async raw=>({response:raw,context:{}}),mountSourceReview:()=>({hasIntent:()=>false,setBusy(){},setSelection(){},destroy(){}})}:actual;
    const module=new SyntheticModule(Object.keys(values),function(){for(const [name,value]of Object.entries(values))this.setExport(name,value);},{context});modules.set(specifier,module);return module;
   });await entry.evaluate();
   const response={snapshot:{id:'synthetic-snapshot',submittedBy:'synthetic-submitter',contentHash:'a'.repeat(64)},reviewState:{status:'IN_REVIEW',sourceRevision:0}};
   const controller=entry.namespace.mountSiteReview(container,{session:{uid:own?'synthetic-submitter':'synthetic-reader',role:'OWNER'},readOnly:true,apiFetch:async route=>{requests.push(route);return response;}});
   try{find(container,'site-snapshot-id').value=response.snapshot.id;find(container,'site-snapshot-load').dispatchEvent(new Event('click'));await new Promise(resolve=>setImmediate(resolve));
    assert.equal(find(container,'site-review-status').textContent,own?'Bạn không thể tự đối chiếu nguồn hoặc tự duyệt website do mình gửi.':'Đã mở đúng bản website bất biến.');assert.match(find(container,'site-snapshot-summary').textContent,/[a]{64}/);assert.equal(find(container,'site-review-submit').disabled,true);assert.deepEqual(requests,['/api/cms/snapshots/synthetic-snapshot']);
   }finally{controller.destroy();}
  }
 }finally{restore();}
});
