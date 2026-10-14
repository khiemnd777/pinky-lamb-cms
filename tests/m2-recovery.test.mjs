import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import net from 'node:net';
import {EventEmitter} from 'node:events';
import * as m2Profile from '../scripts/m2-recovery-profile.mjs';
import * as m2Operator from '../scripts/m2-recovery-local.mjs';
import {readFileSync} from 'node:fs';
import * as fs from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const spawnFixtureFIFO=p=>spawnSync('/usr/bin/mkfifo',['-m','600',p],{timeout:1000,maxBuffer:2048});
import {ROOT,validateConfig,validateRuntime} from '../scripts/local-guard.mjs';
import {M2_PORTS,m2Root,m2Environment,m2Plan,validateM2Config,validateM2RecoveryRuntime,validateM2Profile,m2SocketPath,validateM2Release,validateM2RetainedIdentity,validateM2Ownership,assertM2Pins,validateM2ReadRequest,validateM2Catalog,createM2ReadOnlyHandler,m2ClosureSources,validateM2Manifest} from '../scripts/m2-recovery-profile.mjs';
import {validateM2Hub,m2Deadline,createM2BoundedCapture,validateM2AttemptHistory,m2AtomicAttempt,inventoryM2,M2_COLLECTIONS,assertM2InventoryEqual,canonicalM2Value,validateM2FixtureInputs,createM2Fixtures,validateM2PhaseRelease} from '../scripts/m2-recovery-local.mjs';
import {createLocalViteConfig,privateFile,recoveryHtml,recoveryBuildOutput} from '../vite.config.mjs';
import {ApiError} from '../contracts/errors.mjs';

const root=m2Root('AAAAAAAAAAAAAAAAAAAAAA');
const config=()=>JSON.parse(readFileSync(path.join(ROOT,'infra-local/firebase.m2-recovery.json'),'utf8'));
const env=()=>m2Environment(root,{PATH:'/usr/bin:/bin'});
const cli=()=>({entry:m2Plan(root).args[1],argv:m2Plan(root).args.slice(1),execArgv:['--max-old-space-size=256'],cwd:path.join(root,'cwd'),env:env()});

test('parallel M2 config starts Auth/Functions only and leaves original config valid',()=>{
 assert.equal(validateM2Config(config()),true);
 assert.ok(validateConfig());
 assert.equal(config().hosting,undefined);
 assert.equal(config().firestore,undefined);
 assert.equal(config().storage,undefined);
 assert.deepEqual(M2_PORTS,{auth:9098,functions:5002,hub:4401,logging:4501,eventarc:9298,tasks:9498});
});
test('configuration cannot change ports, source, host or add an emulator',()=>{
 for(const mutate of [c=>{c.emulators.auth.port=9099;},c=>{c.functions[0].source='cms-api';},c=>{c.emulators.functions.host='0.0.0.0';},c=>{c.emulators.storage={host:'127.0.0.1',port:9199};},c=>{c.functions[0].ignore.push('index.mjs');}]){
  const c=config();mutate(c);assert.throws(()=>validateM2Config(c));
 }
});
test('environment isolates caches and credentials; no caller loader or credential is accepted',()=>{
 const e=env();assert.equal(e.HOME,process.env.HOME);assert.equal(e.FIREBASE_AUTH_EMULATOR_HOST,'127.0.0.1:9098');
 assert.equal(e.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8080');assert.equal(e.PINKY_NETWORK_FENCE,undefined);
 assert.equal(validateM2RecoveryRuntime(e),true);
 for(const key of ['GOOGLE_APPLICATION_CREDENTIALS','FIREBASE_TOKEN','NODE_OPTIONS','HTTP_PROXY','JAVA_TOOL_OPTIONS','PINKY_RECOVERY_RUNTIME'])assert.throws(()=>m2Environment(root,{[key]:'unsafe'}));
});
test('HOME stays actual parent HOME while TMP and XDG remain owned and overrides fail',()=>{
 const e=m2Environment(root,{HOME:process.env.HOME});assert.equal(e.HOME,process.env.HOME);
 for(const key of ['TMPDIR','TMP','TEMP'])assert.equal(e[key],path.join(root,'tmp'));
 assert.equal(e.XDG_CONFIG_HOME,path.join(root,'config'));assert.throws(()=>m2Environment(root,{HOME:path.join(root,'home')}));
});
test('diagnostic loop terminates after deadline and does not continue polling',async()=>{
 let loops=0,terminated=false;
 await assert.rejects(()=>m2Deadline(async control=>{
  try{while(true){control.assertActive();await new Promise(resolve=>setTimeout(resolve,3));control.assertActive();loops++;}}
  finally{terminated=true;}
 },8),/deadline/);
 await new Promise(resolve=>setTimeout(resolve,12));const observed=loops;
 await new Promise(resolve=>setTimeout(resolve,12));assert.equal(loops,observed);assert.equal(terminated,true);
});
test('bounded stream capture writes at most cap and records received/captured bytes without stopping child',()=>{
 const written=[],capture=createM2BoundedCapture(chunk=>written.push(Buffer.from(chunk)),{cap:8});
 assert.deepEqual(capture.add(Buffer.from('12345')),{received:5,captured:5,cap:8,exceeded:false});
 assert.deepEqual(capture.add(Buffer.from('67890')),{received:10,captured:8,cap:8,exceeded:true});
 capture.add(Buffer.alloc(1024));assert.equal(Buffer.concat(written).toString(),'12345678');assert.equal(capture.snapshot().received,1034);
 capture.stop();capture.add(Buffer.alloc(20));assert.equal(capture.snapshot().captured,8);
 assert.throws(()=>createM2BoundedCapture(()=>{}, {cap:256*1024+1}));
});
test('named runtime does not weaken original default validation',()=>{
 assert.equal(validateRuntime(env()),true);
 const e=env();delete e.PINKY_M2_RECOVERY_RUNTIME;assert.throws(()=>validateRuntime(e));
 for(const mutate of [e=>{e.GCLOUD_PROJECT='real-project';},e=>{e.FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:9099';},e=>{e.FIRESTORE_EMULATOR_HOST=undefined;},e=>{e.FIREBASE_CONFIG='{"projectId":"demo-pinky-lamb-cms","databaseURL":"https://x"}';}]){
  const e=env();mutate(e);assert.throws(()=>validateRuntime(e));
 }
});
test('CLI profile rejects additional modes, inherited flags and old cwd',()=>{
 assert.equal(validateM2Profile(cli()),'cli');
 for(const mutate of [p=>{p.argv.push('--import=x');},p=>{p.execArgv=[];},p=>{p.cwd=ROOT;},p=>{p.env.FIREBASE_TOKEN='x';}]){
  const p=cli();mutate(p);assert.throws(()=>validateM2Profile(p));
 }
});
test('native worker and discovery bind exact dedicated API source',()=>{
 const source=path.join(ROOT,'cms-recovery-api'),worker=path.join(ROOT,'node_modules/firebase-tools/lib/emulator/functionsEmulatorRuntime');
 const e={...env(),FUNCTIONS_EMULATOR:'true',FUNCTION_TARGET:'cmsApi',FUNCTION_SIGNATURE_TYPE:'http',PORT:path.join(root,'tmp/fire_emu_1234567890abcdef.sock')};
 const p={entry:worker,argv:[worker],cwd:source,execArgv:[],env:e};assert.equal(validateM2Profile(p),'worker');
 assert.throws(()=>validateM2Profile({...p,cwd:path.join(ROOT,'cms-api')}));
 const entry=path.join(ROOT,'node_modules/firebase-functions/lib/bin/firebase-functions.js');
 const d={entry,argv:[entry,source],cwd:source,execArgv:[],env:{...env(),FUNCTIONS_CONTROL_API:'true',FUNCTIONS_MANIFEST_OUTPUT_PATH:path.join(root,'discovery/functions.yaml'),PORT:'80'}};
 assert.equal(validateM2Profile(d),'discovery');assert.throws(()=>validateM2Profile({...d,env:{...d.env,PORT:'8081'}}));
});
test('Unix socket projection is bounded and cannot escape new custody',()=>{
 const s=path.join(root,'tmp/fire_emu_1234567890abcdef.sock'),cwd=path.join(ROOT,'cms-recovery-api');
 assert.equal(path.resolve(cwd,m2SocketPath(s,cwd,root)),s);
 assert.ok(Buffer.byteLength(m2SocketPath(s,cwd,root))<=103);
 assert.throws(()=>m2SocketPath('/tmp/foreign.sock',cwd,root));assert.throws(()=>m2SocketPath(s,ROOT,root));
 assert.throws(()=>m2Root('../escape'));
});
test('native release requires exact new task, High source review and immutable source hashes',()=>{
 const sources=[{path:'scripts/local-guard.mjs',sha256:'a'.repeat(64)}];
 const r={task:'CMS-RECOVERY-001',revision:2,status:'PASS_CODE_UNIT_ONLY',actual_effort:'high',reviewer:'/root/pdf_setup_reviewer',coordinator:'/root',coordinator_route:{model:'gpt-6.1-sol',effort:'xhigh'},runtime_observation:{model:'gpt-6.1-sol',effort:'high',turn_context_sha256:'c'.repeat(64)},sources,source_base_sha256:'b'.repeat(64),reviewed_at_utc:'2026-10-13T03:00:00Z',native_control_release:true};
 assert.equal(validateM2Release(r,sources,'b'.repeat(64)),true);
 for(const patch of [{task:'M3-RUNTIME-02'},{actual_effort:'medium'},{sources:[]},{native_control_release:false},{source_base_sha256:'c'.repeat(64)}])assert.throws(()=>validateM2Release({...r,...patch},sources,'b'.repeat(64)));
});
test('retained identity requires current exact generations and loopback listener tuples',()=>{
 const owners=[{pid:65804,start:'s',argv:'f',cwd:'/f',listeners:['127.0.0.1:8080']},{pid:15465,start:'h',argv:'h',cwd:'/h',listeners:['127.0.0.1:5010']}];
 const proof={observed_at_utc:'2026-10-13T03:00:00Z',owners};assert.equal(validateM2RetainedIdentity(proof,proof,Date.parse('2026-10-13T03:00:10Z')),true);
 assert.throws(()=>validateM2RetainedIdentity(proof,proof,Date.parse('2026-10-13T03:03:00Z')));
 assert.throws(()=>validateM2RetainedIdentity(proof,{...proof,owners:[{...owners[0],start:'changed'},owners[1]]},Date.parse('2026-10-13T03:00:10Z')));
});
test('new ownership requires every listener and current CLI generation; no old process can qualify',()=>{
 const leader={pid:90001,ppid:90000,pgid:90001,start:'fresh',argv:'exact',cwd:path.join(root,'cwd')};
 const listeners=Object.values(M2_PORTS).map(port=>({pid:leader.pid,address:'127.0.0.1',port}));
 const record={runRoot:root,leader};assert.equal(validateM2Ownership(record,[leader],listeners),true);
 assert.throws(()=>validateM2Ownership(record,[{...leader,start:'other'}],listeners));
 assert.throws(()=>validateM2Ownership(record,[leader],listeners.slice(1)));
 assert.throws(()=>validateM2Ownership(record,[leader],[...listeners,{pid:15465,address:'127.0.0.1',port:9099}]));
});
test('pinned installed primary CLI sources match without SDK initialization',()=>assert.equal(assertM2Pins(),true));
test('missing current High release refuses before native launch or SDK',()=>assert.throws(()=>validateM2Release(undefined,[],'b'.repeat(64))));
test('new Hub metadata rejects old Hub, extra services and foreign hosts',()=>{
 const hub={version:'15.33.0',pid:90001,host:'127.0.0.1',port:4401,origins:['http://127.0.0.1:4401']};
 const map=Object.fromEntries(Object.entries(M2_PORTS).map(([name,port])=>[name,{name,host:'127.0.0.1',port,listen:[{address:'127.0.0.1',family:'IPv4',port}]}]));
 assert.equal(validateM2Hub(hub,map,90001),true);
 assert.throws(()=>validateM2Hub({...hub,port:4400},map,90001));
 assert.throws(()=>validateM2Hub(hub,{...map,firestore:{name:'firestore',host:'127.0.0.1',port:8080}},90001));
 assert.throws(()=>validateM2Hub(hub,{...map,auth:{...map.auth,host:'0.0.0.0'}},90001));
});
test('deadline reports pending state without stopping or retrying the operation',async()=>{
 let calls=0;await assert.rejects(()=>m2Deadline(()=>{calls++;return new Promise(()=>{});},5),/preserve pending state/);
 assert.equal(calls,1);assert.equal(await m2Deadline(()=>42,50),42);
 await assert.rejects(()=>m2Deadline(()=>1,120001),/bounded deadline/);
});
test('Hub malformed data cannot become a transient connection retry',()=>{
 for(const [hub,map] of [[null,{}],[{},null],[[],{}],[{},[]],[{},{}]])assert.throws(()=>validateM2Hub(hub,map,1),/M2_RECOVERY_HOLD/);
 const hub={version:'15.33.0',pid:90001,host:'127.0.0.1',port:4401,origins:['http://127.0.0.1:4401']};
 const map=Object.fromEntries(Object.entries(M2_PORTS).map(([name,port])=>[name,{name,host:'127.0.0.1',port,listen:[{address:'127.0.0.1',family:'IPv4',port}]}]));
 for(const bad of [null,[],{}, {...map.auth,listen:[null]}, {...map.auth,listen:[{address:'127.0.0.1',family:'IPv4',port:9098,extra:true}]}])assert.throws(()=>validateM2Hub(hub,{...map,auth:bad},90001),/M2_RECOVERY_HOLD/);
});
function closedSlot1(){
 const old={task:'CMS-RECOVERY-001',revision:2,number:1,runToken:path.basename(root),runRoot:root,attemptId:'synthetic-prior-slot',sources:m2Profile.m2Sources(),status:'ADMITTED_COMPLETION_UNKNOWN'};
 old.completion={...old,status:'CLOSED_SAFE_NO_PENDING_OR_LIVE_CHILDREN',approval_sha256:m2Profile.M2_AMENDMENT_PINS.approval,closure_high_review:{sha256:m2Profile.M2_AMENDMENT_PINS.closure},original_admission_preserved:true};return old;
}
const slot2Authority=()=>({approval_sha256:m2Profile.M2_AMENDMENT_PINS.approval,additional_attempt:2});
test('amended epoch permits only closed slot1 plus exact approval to append slot2',()=>{
 assert.equal(validateM2AttemptHistory([closedSlot1()],slot2Authority()),2);
 for(const history of [[],[{}],[closedSlot1(),{}],[{...closedSlot1(),completion:null}]])assert.throws(()=>validateM2AttemptHistory(history,slot2Authority()),/M2_RECOVERY_HOLD/);
 const wrong=closedSlot1();wrong.completion.sources=[];assert.throws(()=>validateM2AttemptHistory([wrong],slot2Authority()));
 assert.throws(()=>validateM2AttemptHistory([closedSlot1()],{...slot2Authority(),approval_sha256:'a'.repeat(64)}));
});
test('competing admission loses atomically without retry or a second runtime effect',()=>{
 let admitted=null,writes=0;const writer=record=>{writes++;if(admitted)throw Object.assign(new Error('exists'),{code:'EEXIST'});admitted=record;};
 const a={task:'CMS-RECOVERY-001',revision:2,number:3,attemptId:'first'},b={...a,attemptId:'racing'};
 assert.equal(m2AtomicAttempt(writer,a),a);assert.throws(()=>m2AtomicAttempt(writer,b),/concurrent or replayed/);assert.equal(admitted,a);assert.equal(writes,2);
});
const catalog=()=>({task:'CMS-RECOVERY-001',revision:2,projectId:'demo-pinky-lamb-cms',resourceId:'home-v2',draftRevision:1,snapshots:[{id:'snapshot-v2',contentHash:'a'.repeat(64),sourceCheckIds:['source-check-1']}],beforeInventoryHash:'b'.repeat(64)});
const request=(url,method='GET')=>({method,url,originalUrl:url,path:url.split('?')[0],headers:{origin:'http://127.0.0.1:5175'},query:{}});
test('recovery GET whitelist accepts only M2 and existing M2 snapshot IDs',()=>{
 const c=catalog();assert.equal(validateM2Catalog(c),c);
 for(const url of ['/api/cms/session','/api/cms/drafts/home-v2','/api/cms/snapshots/snapshot-v2','/api/cms/snapshots/snapshot-v2/source-checks?pageSize=25&cursor=abc'])assert.ok(validateM2ReadRequest(request(url),c));
 for(const url of ['/api/cms/drafts/home','/api/cms/drafts/home-v2/import','/api/cms/snapshots/snapshot-v1','/api/cms/snapshots/%2e%2e','/api/cms/session/'])assert.throws(()=>validateM2ReadRequest(request(url),c),e=>e.code==='NOT_FOUND');
 assert.throws(()=>validateM2Catalog({...c,resourceId:'home'}));
});
test('GET query/body and exact Origin constraints refuse before dispatch',()=>{
 const c=catalog();
 for(const url of ['/api/cms/session?x=1','/api/cms/drafts/home-v2?cursor=x','/api/cms/snapshots/snapshot-v2/source-checks?pageSize=51','/api/cms/snapshots/snapshot-v2/source-checks?pageSize=1&pageSize=2','/api/cms/snapshots/snapshot-v2/source-checks?cursor[x]=1','/api/cms/snapshots/snapshot-v2/source-checks?cursor=%20'])assert.throws(()=>validateM2ReadRequest(request(url),c));
 assert.throws(()=>validateM2ReadRequest({...request('/api/cms/session'),rawBody:Buffer.from('{}')},c),e=>e.code==='BAD_REQUEST');
 assert.throws(()=>validateM2ReadRequest({...request('/api/cms/session'),headers:{origin:'http://127.0.0.1:5173'}},c),e=>e.code==='FORBIDDEN');
});
test('all nonGET and legacy Hero refusals occur before authorize and dispatch',async()=>{
 let auth=0,dispatch=0;const handler=createM2ReadOnlyHandler({authorize:async()=>{auth++;},dispatchRequest:async()=>{dispatch++;},runtime:()=>true});
 for(const method of ['POST','PATCH','PUT','DELETE','HEAD','OPTIONS']){
  let status,body;const response={set(){},status(n){status=n;return this;},json(v){body=v;}};
  await handler(request('/api/cms/drafts/home-v2',method),response);assert.equal(status,405);assert.equal(body.error.code,'METHOD_NOT_ALLOWED');
 }
 let status;await handler(request('/api/cms/drafts/home'),{set(){},status(n){status=n;return this;},json(){}});assert.equal(status,404);assert.equal(auth,0);assert.equal(dispatch,0);
});
test('proper authorization stays in the recovery read path and anonymous 401 avoids business dispatch',async()=>{
 let dispatched=0,seen=[];
 const handler=createM2ReadOnlyHandler({runtime:()=>true,catalog,authorize:async(req,action)=>{assert.equal(action,'MEMBER_READ');if(!req.headers.authorization)throw new ApiError('UNAUTHENTICATED');return {uid:'fixture-editor',role:'EDITOR',isActive:true,authzVersion:1};},dispatchRequest:async(_req,res,actor)=>{dispatched++;assert.equal(actor.role,'EDITOR');res.status(200).json({ok:true});},observe:v=>seen.push(v)});
 let status;const response={set(){},status(n){status=n;return this;},json(){}};
 await handler(request('/api/cms/session'),response);assert.equal(status,401);assert.equal(dispatched,0);assert.equal(seen[0].authenticatedAuthFirestoreRpc,'NOT_RUN_NO_BEARER');
 const req=request('/api/cms/drafts/home-v2');req.headers.authorization='Bearer synthetic';await handler(req,response);assert.equal(status,200);assert.equal(dispatched,1);
});
test('new HTTP manifest refuses nulls, extra functions, SDK secrets and runtime overrides',()=>{
 const m=()=>({specVersion:'v1alpha1',endpoints:{cmsApi:{entryPoint:'cmsApi',platform:'gcfv2',region:['us-central1'],httpsTrigger:{}}},params:[],requiredAPIs:[]});
 assert.equal(validateM2Manifest(m()),true);
 for(const mutate of [v=>{v.endpoints.cmsApi=null;},v=>{v.endpoints.other={};},v=>{v.endpoints.cmsApi.secretEnvironmentVariables=[];},v=>{v.endpoints.cmsApi.timeoutSeconds=500;},v=>{v.params=[{name:'secret'}];}]){const v=m();mutate(v);assert.throws(()=>validateM2Manifest(v));}
 assert.throws(()=>validateM2Manifest(null));
});
test('immutable business/API package closure hashes current bounded source files without imports',()=>{
 const records=m2ClosureSources();assert.ok(records.some(r=>r.path==='cms-api/authorization.mjs'));assert.ok(records.some(r=>r.path==='cms-api/routes.mjs'));assert.ok(records.some(r=>r.path==='package-lock.json'));
 assert.ok(records.every(r=>/^[a-f0-9]{64}$/.test(r.sha256)));
});
test('recovery Vite literal selects fixed endpoints and adds private recovery API denial',()=>{
 const v=createLocalViteConfig({recovery:true,output:'/synthetic-output'}),original=createLocalViteConfig();
 assert.deepEqual(v.optimizeDeps,{noDiscovery:true,include:[]});assert.equal(original.optimizeDeps,undefined);
 assert.equal(v.define.__PINKY_M2_RECOVERY__,'true');assert.equal(original.define.__PINKY_M2_RECOVERY__,'false');assert.equal(v.server.port,5175);assert.equal(original.server.port,5173);
 assert.equal(v.server.proxy['/api/cms'].target,'http://127.0.0.1:5002');assert.equal(v.server.proxy['/api/cms'].changeOrigin,false);assert.equal(v.publicDir,false);assert.equal(v.build.emptyOutDir,false);
 for(const url of ['/cms-recovery-api/index.mjs','/node_modules/pinky-lamb-cms-recovery-api-local/index.mjs','/%2563ms-recovery-api/index.mjs','/.local/cache/secret','/scripts/m2-recovery-profile.mjs'])assert.equal(privateFile(url),true);
});
test('recovery HTML keeps original opaque sandbox/CSP while changing only Auth and HMR endpoints',()=>{
 const original=readFileSync(path.join(ROOT,'admin/index.html'),'utf8'),changed=recoveryHtml(original);
 assert.equal(changed,original.replaceAll('http://127.0.0.1:9099','http://127.0.0.1:9098').replaceAll('ws://127.0.0.1:5173','ws://127.0.0.1:5175'));
 assert.ok(changed.includes(' sandbox hidden'));assert.throws(()=>recoveryHtml(original.replace('sandbox hidden','sandbox="allow-scripts" hidden')));
 assert.throws(()=>recoveryHtml(original.replace('http://127.0.0.1:9099','http://other')));
 assert.throws(()=>recoveryBuildOutput('../admin-dist'));assert.ok(recoveryBuildOutput('11111111-1111-4111-8111-111111111111').includes('/.local/test-outputs/cms-recovery-001/v2/builds/'));
});
class Timestamp{constructor(seconds,nanoseconds=0){this.seconds=seconds;this.nanoseconds=nanoseconds;}}
const fakeDoc=(id,data={value:id})=>({id,exists:true,data:()=>data,createTime:new Timestamp(10),updateTime:new Timestamp(20)});
function fakeInventoryDB(docs,{get=async values=>({docs:values,size:values.length})}={}){
 let calls=0;const db={collection(name){let after=null;const query={orderBy(){return query;},limit(n){assert.equal(n,25);return query;},startAfter(doc){after=doc.id;return query;},async get(){calls++;const values=(docs[name]??[]).filter(d=>after===null || d.id>after).slice(0,25);return get(values);}};return query;},create(){throw new Error('write forbidden');},set(){throw new Error('write forbidden');},update(){throw new Error('write forbidden');},delete(){throw new Error('write forbidden');}};
 return {db,calls:()=>calls};
}
test('inventory scans ALL members and nine history collections with paged metadata hashes and no mutators',async()=>{
 const docs=Array.from({length:26},(_,i)=>fakeDoc(`member-${String(i).padStart(3,'0')}`));const f=fakeInventoryDB({cmsMembers:docs,cmsDrafts:[fakeDoc('home-v2')]});
 const {inventory}=await m2Deadline(control=>inventoryM2(f.db,'__name__',control));
 assert.deepEqual(inventory.collections.map(c=>c.name),M2_COLLECTIONS);assert.equal(inventory.documents,27);assert.equal(inventory.collections[0].count,26);assert.equal(f.calls(),11);
 assert.equal(inventory.collections[0].entries[0].createTime.seconds,10);assert.equal(inventory.collections[0].entries[0].updateTime.seconds,20);
 assert.equal(assertM2InventoryEqual(inventory,inventory),true);assert.throws(()=>assertM2InventoryEqual(inventory,{...inventory,sha256:'x'}));
});
test('inventory refuses duplicated/nonterminal IDs, unsupported values and missing timestamps',async()=>{
 for(const docs of [[fakeDoc('x'),fakeDoc('x')],[fakeDoc('x',{bad:new Date()})],[{...fakeDoc('x'),createTime:undefined}]]){
  const f=fakeInventoryDB({cmsMembers:docs});await assert.rejects(()=>m2Deadline(control=>inventoryM2(f.db,'__name__',control)),/M2_RECOVERY_HOLD/);
 }
 assert.throws(()=>canonicalM2Value(Number.POSITIVE_INFINITY));assert.throws(()=>canonicalM2Value(undefined));
});
test('inventory deadline stops further read pages after an in-flight readonly completion',async()=>{
 const f=fakeInventoryDB({cmsMembers:[fakeDoc('x')]},{get:async values=>{await new Promise(r=>setTimeout(r,20));return {docs:values,size:values.length};}});
 await assert.rejects(()=>m2Deadline(control=>inventoryM2(f.db,'__name__',control),5),/deadline/);await new Promise(r=>setTimeout(r,30));assert.equal(f.calls(),1);
});
test('same-run High phase gate cannot use unrelated run, stale source or coordinator-as-High fiction',()=>{
 const runtime={runRoot:root,sources:[{path:'a',bytes:1,sha256:'a'.repeat(64)}],closure_sources:[]};
 const gate={task:'CMS-RECOVERY-001',revision:2,projectId:'demo-pinky-lamb-cms',runToken:path.basename(root),phase:'fixtures',status:'PASS_PRECEDING_GATE',phase_release:true,reviewer:'/root/pdf_setup_reviewer',coordinator:'/root',actual_effort:'high',runtime_observation:{model:'gpt-6.1-sol',effort:'high',turn_context_sha256:'b'.repeat(64)},sources:runtime.sources,closure_sources:[]};
 assert.equal(validateM2PhaseRelease(gate,'fixtures',runtime),true);
 for(const patch of [{runToken:'BBBBBBBBBBBBBBBBBBBBBB'},{sources:[]},{reviewer:'/root'},{status:'HOLD'},{phase:'inventory-before'}])assert.throws(()=>validateM2PhaseRelease({...gate,...patch},'fixtures',runtime));
});
test('exact seven new fixture passwords are distinct; create-only flow has no update/delete/claim calls',async()=>{
 const {RECOVERY_ROSTER}=await import('../scripts/recover-auth-local.mjs');
 const fixtures=RECOVERY_ROSTER.map((f,i)=>({...f,password:'a'.repeat(31)+i}));assert.equal(validateM2FixtureInputs(fixtures,RECOVERY_ROSTER),true);
 assert.throws(()=>validateM2FixtureInputs(fixtures.slice(1),RECOVERY_ROSTER));assert.throws(()=>validateM2FixtureInputs(fixtures.map(f=>({...f,password:'a'.repeat(32)})),RECOVERY_ROSTER));
 const users=[],auth={listUsers:async()=>({users}),tenantManager:()=>({listTenants:async()=>({tenants:[]})}),createUser:async({uid,email,emailVerified,disabled})=>{const u={uid,email,emailVerified,disabled};users.push(u);return u;},getUser:async uid=>users.find(u=>u.uid===uid),updateUser(){throw new Error('never update');},deleteUser(){throw new Error('never delete');},setCustomUserClaims(){throw new Error('never claims');}};
 const created=[];const result=await m2Deadline(control=>createM2Fixtures(auth,fixtures,control,{onProgress:uid=>created.push(uid)}));assert.equal(result.length,7);assert.equal(created.length,7);
 await assert.rejects(()=>m2Deadline(control=>createM2Fixtures(auth,fixtures,control)),/not empty/);
});


test('pinned discovery system env survives loadTriggers and execAdmin only',()=>{
 const primary=readFileSync(path.join(ROOT,'node_modules/firebase-tools/lib/emulator/functionsEmulator.js'),'utf8'),delegate=readFileSync(path.join(ROOT,'node_modules/firebase-tools/lib/deploy/functions/runtimes/node/index.js'),'utf8');
 assert.match(primary,/envs\.PORT = "80"/);assert.match(primary,/\.\.\.this\.getSystemEnvs\(\)/);
 assert.match(delegate,/execAdmin\(config, envs, manifestPath\)[\s\S]*?\.\.\.envs,[\s\S]*?FUNCTIONS_MANIFEST_OUTPUT_PATH: manifestPath/);
 const source=path.join(ROOT,'cms-recovery-api'),entry=path.join(ROOT,'node_modules/firebase-functions/lib/bin/firebase-functions.js');
 const system={PORT:'80'},load={...system,...env()},execAdmin={...load,FUNCTIONS_CONTROL_API:'true',FUNCTIONS_MANIFEST_OUTPUT_PATH:path.join(root,'discovery/functions.yaml')};
 const receipt={entry,argv:[entry,source],cwd:source,execArgv:[],env:execAdmin};assert.equal(validateM2Profile(receipt),'discovery');
 for(const PORT of [undefined,'8081',80,'',null])assert.throws(()=>validateM2Profile({...receipt,env:{...execAdmin,PORT}}));
 assert.throws(()=>validateM2Profile({...receipt,env:{...execAdmin,FUNCTIONS_MANIFEST_OUTPUT_PATH:undefined}}));
});
test('M2 normalized TCP null path preserves exact tuple and transport options',()=>{
 const tuple=net._normalizeArgs([{host:'127.0.0.1',port:9098,path:null}]),options=tuple[0],args=[tuple];let calls=0;
 assert.equal(m2Profile.mapM2ConnectArguments(args,()=>{calls++;throw new Error('must not map TCP');}),args);assert.equal(tuple[0],options);assert.equal(calls,0);
 const direct=[{host:'127.0.0.1',port:4401,path:null}];assert.equal(m2Profile.mapM2ConnectArguments(direct,()=>{throw new Error('TCP');}),direct);
 const socket=path.join(root,'tmp/fire_emu_1234567890abcdef.sock'),unix=net._normalizeArgs([{path:socket}]),marker=Object.getOwnPropertySymbols(unix)[0];
 assert.equal(m2Profile.mapM2ConnectArguments([unix],value=>{assert.equal(value,socket);return 'registered.sock';})[0],unix);assert.equal(unix[marker],true);assert.equal(unix[0].path,'registered.sock');
 for(const value of [null,[],{},[{},null],{path:5},{path:''},{path:null}])assert.throws(()=>m2Profile.mapM2ConnectArguments([value],()=>{throw new Error('unknown');}));
 assert.throws(()=>m2Profile.mapM2ConnectArguments([{path:'/unknown.sock'}],()=>{throw new Error('unregistered');}),/unregistered/);
});
test('Hub request TimeoutError is transient only for fixed GET and live outer deadline',async()=>{
 const active={signal:new AbortController().signal,assertActive(){},remaining:()=>1000},timeout=()=>Promise.reject(Object.assign(new Error('request deadline'),{name:'TimeoutError'}));
 await assert.rejects(()=>m2Operator.m2HubJSON('http://127.0.0.1:4401/',active,{fetchImpl:timeout}),error=>error.stage==='HUB_CONNECT' && error.transient===true);
 await assert.rejects(()=>m2Operator.m2HubJSON('http://127.0.0.1:4401/emulators',active,{fetchImpl:timeout}),error=>error.stage==='HUB_CONNECT' && error.transient===true);
 await assert.rejects(()=>m2Operator.m2HubJSON('http://127.0.0.1:4400/',active,{fetchImpl:timeout}),/M2_RECOVERY_HOLD/);
 await assert.rejects(()=>m2Operator.m2HubJSON('http://127.0.0.1:4401/',{...active,assertActive(){throw new Error('outer deadline');}},{fetchImpl:timeout}),/outer deadline/);
 await assert.rejects(()=>m2Operator.m2HubJSON('http://127.0.0.1:4401/',active,{fetchImpl:()=>Promise.reject(new TypeError('preload unknown'))}),error=>error.transient===false);
 const malformed={status:200,body:(async function*(){yield Buffer.from('null');})()};
 const value=await m2Operator.m2HubJSON('http://127.0.0.1:4401/',active,{fetchImpl:async()=>malformed});assert.throws(()=>validateM2Hub(value,{},1),/root\/map shape/);
});
test('actual Hub Auth custody uses strict GET config projection without blockingFunctions',async()=>{
 const primary=readFileSync(path.join(ROOT,'node_modules/firebase-tools/lib/emulator/auth/operations.js'),'utf8'),section=primary.slice(primary.indexOf('function getEmulatorProjectConfig'),primary.indexOf('function updateEmulatorProjectConfig'));
 assert.match(section,/allowDuplicateEmails/);assert.doesNotMatch(section,/blockingFunctions/);
 const metadata={version:'15.33.0',auth:{version:'15.33.0',path:'auth_export'}},accounts={kind:'identitytoolkit#DownloadAccountResponse',users:[]},config={signIn:{allowDuplicateEmails:false},emailPrivacyConfig:{enableImprovedEmailPrivacy:false}};
 assert.deepEqual(await m2Operator.validateM2HubExportPayload(metadata,accounts,config),{count:0,tenants:0});
 const {RECOVERY_ROSTER}=await import('../scripts/recover-auth-local.mjs');
 const seven={...accounts,users:RECOVERY_ROSTER.map(f=>({localId:f.uid,email:f.email,emailVerified:f.verified,disabled:false}))};
 assert.deepEqual(await m2Operator.validateM2HubExportPayload(metadata,seven,config),{count:7,tenants:0});
 assert.deepEqual(await m2Operator.validateM2HubExportPayload(metadata,{...seven,users:seven.users.slice(0,3)},config),{count:3,tenants:0});
 await assert.rejects(()=>m2Operator.validateM2HubExportPayload(metadata,{...seven,users:[...seven.users.slice(0,6),seven.users[0]]},config),/AUTH_DUPLICATE/);
 await assert.rejects(()=>m2Operator.validateM2HubExportPayload(metadata,{...seven,users:seven.users.map((u,i)=>i?u:{...u,customAttributes:'{"owner":true}'})},config),/AUTH_METADATA_MISMATCH/);
 await assert.rejects(()=>m2Operator.validateM2HubExportPayload(metadata,{...seven,users:[...seven.users,seven.users[0]]},config),/accounts schema/);

 for(const bad of [{...config,blockingFunctions:{}},{...config,signIn:{allowDuplicateEmails:true}},{...config,extra:true}])await assert.rejects(()=>m2Operator.validateM2HubExportPayload(metadata,accounts,bad),/M2_RECOVERY_HOLD/);
});


test('source-bound discovery waits delayed completion/manifest before any worker ownership probe',async()=>{
 const runtime={runRoot:root,sources:[],closure_sources:[],plan:{node:m2Plan(root).node}},leaderPid=91000;
 const identity={task:'CMS-RECOVERY-001',revision:2,projectId:'demo-pinky-lamb-cms',runToken:path.basename(root),sources:[],closure_sources:[],parentPid:leaderPid,pid:91001,source:path.join(ROOT,'cms-recovery-api'),manifestPath:path.join(root,'discovery/functions.yaml')};
 const admission={...identity,status:'DISCOVERY_ADMITTED_COMPLETION_UNKNOWN'},completion={...identity,status:'DISCOVERY_EXITED',exitCode:0,signal:null};
 const ready={...identity,pid:leaderPid,status:'START_ALL_RESOLVED'};let polls=0;
 const profile={...identity,node:runtime.plan.node,version:'v22.23.3',cwd:identity.source,ppid:leaderPid,pgid:leaderPid,start:'fixed',profile:'discovery',argv:`node ${path.join(ROOT,'node_modules/.bin/firebase-functions')} ${identity.source}`};
 const manifest={value:{specVersion:'v1alpha1',endpoints:{cmsApi:{entryPoint:'cmsApi',platform:'gcfv2',region:['us-central1'],httpsTrigger:{}}}},bytes:100,sha256:'a'.repeat(64)};
 const state=()=>{polls++;return polls===1?{}:polls===2?{admission}:polls===3?{admission,completion,profile,manifest}:{admission,completion,profile,manifest,ready};};
 const result=await m2Deadline(control=>m2Operator.waitM2Discovery(runtime,control,leaderPid,{readState:state,delay:async()=>{}}));assert.equal(polls,4);assert.equal(result.profile.argv,profile.argv);
 for(const patch of [{admission:null},{completion:null},{ready:null},{completion:{...completion,exitCode:1}},{completion:{...completion,signal:'SIGTERM'}},{profile:{...profile,node:'/unknown/node'}},{manifest:{...manifest,value:{}}},{completion:{...completion,sources:[{}]}},{manifest:null}])await assert.rejects(()=>m2Deadline(control=>m2Operator.waitM2Discovery(runtime,control,leaderPid,{readState:()=>({admission,completion,profile,manifest,ready,...patch}),delay:async()=>{}})),/M2_RECOVERY_HOLD/);
 let afterDeadline=0;await assert.rejects(()=>m2Deadline(control=>m2Operator.waitM2Discovery(runtime,control,leaderPid,{readState:()=>{afterDeadline++;return {admission};},delay:()=>new Promise(resolve=>setTimeout(resolve,8))}),5),/deadline/);await new Promise(resolve=>setTimeout(resolve,20));assert.equal(afterDeadline,1);
});
test('discovery completion records actual exit and preserves exact shebang raw argv',()=>{
 const primary=readFileSync(path.join(ROOT,'node_modules/firebase-tools/lib/deploy/functions/runtimes/node/index.js'),'utf8');assert.match(primary,/spawn\(binPath, \[this\.sourceDir\]/);assert.match(primary,/PATH: process\.env\.PATH/);
 const bin=readFileSync(path.join(ROOT,'node_modules/firebase-functions/lib/bin/firebase-functions.js'),'utf8');assert.match(bin,/^#!\/usr\/bin\/env node/);
 const child=new EventEmitter();child.pid=91001;const identity={parentPid:91000,source:path.join(ROOT,'cms-recovery-api'),manifestPath:path.join(root,'discovery/functions.yaml')},writes=[];
 m2Profile.captureM2DiscoveryCompletion(child,identity,value=>writes.push(value));assert.equal(writes.length,1);child.emit('exit',0,null);assert.equal(writes.length,2);assert.equal(writes[1].exitCode,0);assert.equal(writes[1].status,'DISCOVERY_EXITED');
 const proof={node:m2Plan(root).node,version:'v22.23.3',cwd:identity.source,ppid:91000,pgid:91000,pid:91001,start:'fixed',profile:'discovery',sources:[],closure_sources:[],argv:`node ${path.join(ROOT,'node_modules/.bin/firebase-functions')} ${identity.source}`};
 const runtime={plan:{node:m2Plan(root).node},sources:[],closure_sources:[]};assert.equal(m2Operator.validateM2DiscoveryProfile(proof,runtime,91000),true);
 for(const patch of [{node:'node'},{version:'v20.0.0'},{ppid:1},{pgid:1},{argv:proof.argv.replace('node ','/usr/bin/node ')},{argv:proof.argv.replace('/.bin/firebase-functions','/firebase-functions/lib/bin/firebase-functions.js')},{cwd:ROOT}])assert.throws(()=>m2Operator.validateM2DiscoveryProfile({...proof,...patch},runtime,91000),/M2_RECOVERY_HOLD/);
});


test('v2 production startup order ignores early partial map and reads fresh map after ready',async()=>{
 const calls=[],hub={version:'15.33.0',pid:91000,host:'127.0.0.1',port:4401,origins:['http://127.0.0.1:4401']},full=Object.fromEntries(Object.entries(M2_PORTS).map(([name,port])=>[name,{name,host:'127.0.0.1',port,listen:[{address:'127.0.0.1',family:'IPv4',port}]}]));
 let ready=false;const early={auth:full.auth};assert.notDeepEqual(early,full);
 const deps={pid:91000,checkIdentity:()=>calls.push('identity'),fetchHubIdentity:async()=>{calls.push('hub');return hub;},waitDiscovery:async()=>{calls.push('discovery-pending');await Promise.resolve();calls.push('manifest-valid');calls.push('controller-ready');ready=true;return {ready:true};},fetchHubMap:async()=>{calls.push('fresh-map');assert.equal(ready,true);return full;},observeOwnership:()=>{calls.push('ownership');return {};},proveEntry:async()=>{calls.push('api-worker');return {};},proveDeny:async()=>{calls.push('deny');return {};},observeRetained:()=>{calls.push('retained');return {};},validateRetained:()=>{}};
 const result=await m2Deadline(control=>m2Operator.runM2Startup({},control,deps));assert.equal(result.startupState,'READY');assert.ok(calls.indexOf('identity')<calls.indexOf('discovery-pending'));assert.ok(calls.indexOf('controller-ready')<calls.indexOf('fresh-map'));assert.ok(calls.indexOf('fresh-map')<calls.indexOf('ownership'));assert.ok(calls.indexOf('ownership')<calls.indexOf('api-worker'));
 for(const bad of [{fetchHubIdentity:async()=>({...hub,pid:1})},{waitDiscovery:async()=>{throw new Error('M2_RECOVERY_HOLD: discovery exit1');}},{fetchHubMap:async()=>early},{checkIdentity:()=>{throw new Error('M2_RECOVERY_HOLD: unknown child identity');}}]){
  let wire=0;await assert.rejects(()=>m2Deadline(control=>m2Operator.runM2Startup({},control,{...deps,...bad,proveEntry:async()=>{wire++;return {};}})),/M2_RECOVERY_HOLD/);assert.equal(wire,0);
 }
 let wire=0;await assert.rejects(()=>m2Deadline(control=>m2Operator.runM2Startup({},control,{...deps,waitDiscovery:()=>new Promise(()=>{}),proveEntry:async()=>{wire++;}}),5),/deadline/);assert.equal(wire,0);
});
test('cumulative slot3 remains consumed and cannot authorize reset or slot4',()=>{
 const record={task:'CMS-RECOVERY-001',revision:2,number:3,runToken:path.basename(root),runRoot:root};let count=0;
 assert.equal(m2AtomicAttempt(()=>{count++;},record),record);assert.equal(count,1);
 for(const records of [[closedSlot1(),record],[closedSlot1(),{...record,completion:{status:'CLOSED_SAFE_NO_PENDING_OR_LIVE_CHILDREN'}}]])assert.throws(()=>validateM2AttemptHistory(records,slot2Authority()),/no slot3/);
 assert.throws(()=>m2AtomicAttempt(()=>{throw Object.assign(new Error('exists'),{code:'EEXIST'});},record),/replay|concurrent/);
 for(const number of [1,2,4])assert.throws(()=>m2AtomicAttempt(()=>{count++;},{...record,number}));assert.equal(count,1);
});
test('v2 representative catalog selects one existing snapshot without expanding read caps',()=>{
 const snapshots=[{id:'b',sourceCheckIds:['existing-b']},{id:'a',sourceCheckIds:['existing-a']}];
 assert.deepEqual(m2Operator.selectM2CatalogSnapshots(snapshots),[snapshots[1]]);assert.equal(snapshots.length,2);
 assert.throws(()=>m2Operator.selectM2CatalogSnapshots([{id:'a',sourceCheckIds:Array.from({length:62},(_,i)=>String(i))}]),/read cap/);
});


test('v2 custody verifies exact private stable-tree inputs and fixed browser VM runtime args',()=>{
 const records=['.','auth_export','auth_export/accounts.json','auth_export/config.json','firebase-export-metadata.json'].map((name,i)=>({name,type:i<2?'directory':'file',uid:process.getuid(),dev:1,ino:i+1,mode:i<2?0o700:0o600,nlink:1,...(i<2?{}:{bytes:10,sha256:'a'.repeat(64)})}));
 assert.equal(m2Operator.validateM2CustodyTree(records),records);
 for(const mutate of [rows=>rows[2].mode=0o644,rows=>rows[0].mode=0o755,rows=>rows[2].type='socket',rows=>rows[2].nlink=2,rows=>rows[2].bytes=16*1024*1024+1,rows=>rows[2].uid=-1,rows=>rows.push({...rows[2],name:'auth_export/tenants.json'})]){const changed=structuredClone(records);mutate(changed);assert.throws(()=>m2Operator.validateM2CustodyTree(changed),/M2_RECOVERY_HOLD/);}
 assert.deepEqual(m2Operator.M2_BROWSER_ARGS,['--experimental-vm-modules','--test','--test-name-pattern=^live:','tests/m2-recovery.local.test.mjs']);
});


test('v2 browser proof refuses skipped, partial, wrong-run or stale result before PASS',()=>{
 const runtime={runRoot:root,beforeInventoryHash:'a'.repeat(64),uiSources:[]},result={task:'CMS-RECOVERY-001',revision:2,projectId:'demo-pinky-lamb-cms',runToken:path.basename(root),status:'PASS_UI_PENDING_PRESERVATION',beforeInventoryHash:runtime.beforeInventoryHash,sourceHashes:[],roles:['EDITOR','OWNER','PUBLISHER','REVIEWER'].map(role=>({role,status:'PASS'})),negativeFixtures:[1,2,3].map(()=>({status:403,privateContentCleared:true})),screenshots:[{file:'real.png'}],blockedNetwork:0,pageErrors:0,consoleErrors:0};
 assert.equal(m2Operator.validateM2BrowserReport(result,runtime),true);
 for(const patch of [{status:'RUNNING'},{status:'SKIPPED'},{roles:[]},{negativeFixtures:[]},{screenshots:[]},{revision:1},{runToken:'BBBBBBBBBBBBBBBBBBBBBB'},{sourceHashes:[{}]},{consoleErrors:1}])assert.throws(()=>m2Operator.validateM2BrowserReport({...result,...patch},runtime),/actual completed browser/);
});


test('v2 catalog expects validated active or approved sources, excluding superseded history',()=>{
 const active={reviewState:{status:'IN_REVIEW',activeSourceCheckIds:{claim:'current-a'}},review:{sourceCheckIds:['old-superseded']}};
 assert.deepEqual(m2Operator.selectM2ReadableSourceIds(active),['current-a']);
 assert.deepEqual(m2Operator.selectM2ReadableSourceIds({...active,reviewState:{...active.reviewState,status:'APPROVED'},review:{sourceCheckIds:['pinned-approved']}}),['pinned-approved']);
 assert.throws(()=>m2Operator.selectM2ReadableSourceIds({...active,reviewState:{...active.reviewState,status:'APPROVED'},review:null}),/source-check relation/);
});
test('production startup waits exact CLI profile pending return before Hub/discovery',async()=>{
 const calls=[];let checks=0;
 const hub={version:'15.33.0',pid:91000,host:'127.0.0.1',port:4401,origins:['http://127.0.0.1:4401']},map=Object.fromEntries(Object.entries(M2_PORTS).map(([name,port])=>[name,{name,host:'127.0.0.1',port,listen:[{address:'127.0.0.1',family:'IPv4',port}]}]));
 await m2Deadline(control=>m2Operator.runM2Startup({},control,{pid:91000,checkIdentity:()=>{checks++;return checks<4?false:true;},delay:async()=>{calls.push('profile-pending');},fetchHubIdentity:async()=>{calls.push('hub');assert.ok(checks>=4);return hub;},waitDiscovery:async()=>({}),fetchHubMap:async()=>map,observeOwnership:()=>({}),proveEntry:async()=>({}),proveDeny:async()=>({}),observeRetained:()=>({}),validateRetained:()=>{}}));
 assert.deepEqual(calls.slice(0,2),['profile-pending','profile-pending']);assert.equal(calls[2],'hub');
});


function diskFixture(){
 const parent=path.join(ROOT,'.local/cache/cms-recovery-001/v2/disk-custody-fix/tests',randomUUID()),base=path.join(parent,'tree');fs.mkdirSync(base,{recursive:true,mode:0o700});
 fs.writeFileSync(path.join(parent,'outside-target'),'synthetic target never followed',{mode:0o600});fs.writeFileSync(path.join(base,'regular'),'actual regular fixture bytes',{mode:0o600});
 const records=[];
 for(let i=0;i<20;i++){const dir=path.join(base,`fixture-${String(i).padStart(2,'0')}`);fs.mkdirSync(dir,{mode:0o700});const link=path.join(dir,'link'),rawTarget='../../outside-target';fs.symlinkSync(rawTarget,link);const st=fs.lstatSync(link);records.push({path:path.relative(ROOT,link),type:'symlink',uid:st.uid,mode:st.mode&0o777,nlink:st.nlink,dev:st.dev,ino:st.ino,size:st.size,rawTarget,sha256:createHash('sha256').update(rawTarget).digest('hex')});}
 return {base,parent,manifest:{task:'CMS-RECOVERY-001',revision:2,kind:'EXACT_KNOWN_HISTORICAL_NEGATIVE_FIXTURE_LINKS',count:20,noTargetDereference:true,noHistoricalMutation:true,records}};
}
test('disk custody captures complete real FS tree and known20 symlink leaves without opening targets',()=>{
 const f=diskFixture(),opened=[];const io={...fs,openSync(p,...args){opened.push(p);return fs.openSync(p,...args);}};
 const before=m2Operator.captureM2DiskCustody(f.base,f.manifest,{io}),after=m2Operator.captureM2DiskCustody(f.base,f.manifest,{io});
 assert.equal(before.records.filter(r=>r.type==='symlink').length,20);assert.equal(before.records.filter(r=>r.type==='directory').length,21);assert.equal(before.records.filter(r=>r.type==='file').length,1);assert.equal(before.sha256,after.sha256);assert.ok(opened.every(p=>p===path.join(f.base,'regular')));
 assert.equal(before.records.find(r=>r.type==='file').sha256,createHash('sha256').update('actual regular fixture bytes').digest('hex'));
 fs.writeFileSync(path.join(f.base,'regular'),'changed fixture bytes');assert.notEqual(m2Operator.captureM2DiskCustody(f.base,f.manifest).sha256,before.sha256);
});
test('disk custody still refuses unknown target/type/metadata/special and nofollow races',()=>{
 for(const change of ['unknown','target','identity','type','fifo','open-race','read-race','dir-race']){
  const f=diskFixture(),link=path.join(ROOT,f.manifest.records[0].path);let io=fs;
  if(change==='unknown')fs.symlinkSync('regular',path.join(f.base,'unknown'));
  if(change==='target'){fs.unlinkSync(link);fs.symlinkSync('wrong-target',link);}
  if(change==='identity')f.manifest.records[0].ino++;
  if(change==='type'){fs.unlinkSync(link);fs.writeFileSync(link,'replacement',{mode:0o600});}
  if(change==='fifo'){const r=spawnFixtureFIFO(path.join(f.base,'special'));assert.equal(r.status,0);}
  if(change==='open-race'){let changed=false;io={...fs,openSync(p,...args){if(!changed){changed=true;fs.renameSync(p,p+'.old');fs.symlinkSync('../outside-target',p);}return fs.openSync(p,...args);}};}
  if(change==='read-race'){let changed=false;io={...fs,readSync(fd,...args){const n=fs.readSync(fd,...args);if(!changed){changed=true;fs.appendFileSync(path.join(f.base,'regular'),'race');}return n;}};}
  if(change==='dir-race'){let changed=false;io={...fs,readdirSync(p,...args){const names=fs.readdirSync(p,...args);if(!changed){changed=true;fs.writeFileSync(path.join(p,'new-entry'),'race');}return names;}};}
  assert.throws(()=>m2Operator.captureM2DiskCustody(f.base,f.manifest,{io}),/M2_RECOVERY_HOLD|ELOOP/);
 }
});


test('regular-to-FIFO race is refused without blocking before fstat',{timeout:5000},()=>{
 const f=diskFixture();
 const script=`import * as fs from 'node:fs';import {spawnSync} from 'node:child_process';import {captureM2DiskCustody} from './scripts/m2-recovery-local.mjs';const base=${JSON.stringify(f.base)},manifest=${JSON.stringify(f.manifest)};let swapped=false;const io={...fs,openSync(p,...args){if(!swapped){swapped=true;fs.renameSync(p,p+'.saved');const made=spawnSync('/usr/bin/mkfifo',['-m','600',p],{timeout:1000});if(made.status!==0)throw Error('FIFO fixture creation failed');}return fs.openSync(p,...args);}};try{captureM2DiskCustody(base,manifest,{io});console.error('unexpectedPASS');process.exitCode=2;}catch(error){if(!swapped || !String(error.message).includes('disk FD identity before read')){console.error('unexpectedRefusal');process.exitCode=3;}else console.log('PASS_FIFO_SWAP_REFUSED_BEFORE_READ');}`;
 const result=spawnSync(process.execPath,['--input-type=module','-e',script],{cwd:ROOT,env:{PATH:'/usr/bin:/bin',HOME:process.env.HOME},timeout:2000,maxBuffer:4096});
 assert.equal(result.error,undefined,'Owned test child must finish before timeout');assert.equal(result.signal,null);assert.equal(result.status,0);assert.equal(result.stdout.toString().trim(),'PASS_FIFO_SWAP_REFUSED_BEFORE_READ');
});


test('Vite amendment appends only slot3 after both genuine preserved admissions close',()=>{
 const one=closedSlot1(),two={...one,number:2,attemptId:'synthetic-slot2',approval_sha256:m2Profile.M2_AMENDMENT_PINS.approval};two.completion={...two,status:'CLOSED_OWNED_PROCESSES_ABSENT_PRIVATE_EXPORT_PRESERVED',approval_sha256:m2Profile.M2_VITE_PINS?.approval,closure_high_review:{sha256:m2Profile.M2_VITE_PINS?.closure},original_admission_preserved:true,original_approval_sha256:m2Profile.M2_AMENDMENT_PINS.approval,no_pending_known_owned_children:true,CLI_exit_cause:'UNKNOWN'};
 const authority={approval_sha256:m2Profile.M2_VITE_PINS?.approval,additional_attempt:3};assert.equal(validateM2AttemptHistory([one,two],authority),3);
 for(const history of [[],[one],[one,two,{}],[one,{...two,completion:null}]])assert.throws(()=>validateM2AttemptHistory(history,authority),/M2_RECOVERY_HOLD/);
 for(const mutate of [v=>{v.completion.sources=[];},v=>{v.completion.original_admission_preserved=false;},v=>{v.completion.closure_high_review.sha256='a'.repeat(64);},v=>{v.completion.no_pending_known_owned_children=false;}]){const bad=structuredClone(two);mutate(bad);assert.throws(()=>validateM2AttemptHistory([one,bad],authority));}
 assert.throws(()=>validateM2AttemptHistory([one,two],{...authority,approval_sha256:'b'.repeat(64)}));
});
