import test,{after} from 'node:test';
import http from 'node:http';
import net from 'node:net';
import assert from 'node:assert/strict';
import path from 'node:path';
import https from 'node:https';
import os from 'node:os';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {readFileSync,lstatSync,existsSync,mkdirSync,writeFileSync,symlinkSync,chmodSync} from 'node:fs';
import {ROOT,recoveryToken,recoveryRoot,recoverySocketPath,recoveryEnvironment,recoveryPlan,validateRecoveryProfile,validateRecoveryRelease,RECOVERY_BUNDLE,RECOVERY_COMPONENTS,installRecoverySocketAdapter,validateRecoveryManifest,validateRecoveryHub,validateRecoveryOwnership,commandPlan,assertOwnedOutput,assertStorageJar,assertLocalLaunchAuthorized,assertRecoveryPinnedSources,recoveryPinnedLocation,bindRecoveryStorageStart,recoveryMetadataName,validateRecoveryHighReview,validateRecoveryOperator,childEnvironment,applyRecoveryEnvironment,RETAINED_RECOVERY,assertRetainedPolicyParity,validateRetainedTransition,compareRetainedPolicy,validateContinuationNamespace,atomicContinuationAdmission,validateRetainedPrivateDirectory} from '../scripts/local-guard.mjs';
import {RECOVERY_ROSTER,HISTORY_COLLECTIONS,validateAuthPage,inspectAuth,validateMembership,reconstructMissing,inventoryHistory,assertHistoryEqual,validateExportPayload,inspectAuthExport,observePartialExport,assertExportCompletion,validateSessionResponse,boundedRecoveryRequest,withinRecoveryDeadline} from '../scripts/recover-auth-local.mjs';
const offlineAttempts={http:0,net:0},originalHttp=http.request,originalConnect=net.Socket.prototype.connect;
http.request=()=>{offlineAttempts.http++;throw new Error('UNIT_ONLY: actual HTTP forbidden');};
net.Socket.prototype.connect=function(){offlineAttempts.net++;throw new Error('UNIT_ONLY: actual socket forbidden');};
after(()=>{http.request=originalHttp;net.Socket.prototype.connect=originalConnect;assert.deepEqual(offlineAttempts,{http:0,net:0});console.log('R1_OFFLINE_NETWORK_ATTEMPTS '+JSON.stringify(offlineAttempts));});
const token=recoveryToken('00112233-4455-6677-8899-aabbccddeeff'),runRoot=recoveryRoot(token);
const user=fixture=>({uid:fixture.uid,email:fixture.email,emailVerified:fixture.verified,disabled:false});
const snapshot=fixture=>({id:fixture.uid,exists:fixture.role!==null,data:()=>({uid:fixture.uid,role:fixture.role,isActive:fixture.active,expectedEmail:fixture.email,authzVersion:4})});
function fakeAuth(initial=[]){
 const records=new Map(initial.map(value=>[value.uid,value])),calls=[];
 return {records,calls,listUsers:async cap=>{calls.push(['list',cap]);return {users:[...records.values()]};},tenantManager:()=>({listTenants:async cap=>{calls.push(['tenants',cap]);return {tenants:[]};}}),getUser:async uid=>{calls.push(['get',uid]);if(!records.has(uid))throw Object.assign(new Error('missing'),{code:'auth/user-not-found'});return records.get(uid);},createUser:async properties=>{calls.push(['create',properties.uid]);const value={...properties};delete value.password;records.set(value.uid,value);return value;},updateUser:()=>assert.fail('no update'),deleteUser:()=>assert.fail('no delete')};
}
test('unit: UUID mapping is reversible 128-bit; short syscall reaches same canonical socket',()=>{
 assert.equal(Buffer.from(token,'base64url').toString('hex'),'00112233445566778899aabbccddeeff');assert.equal(token.length,22);
 const canonical=path.join(runRoot,'tmp/fire_emu_0123456789abcdef.sock');
 for(const cwd of [path.join(ROOT,'cms-api'),path.join(runRoot,'cwd')]){const relative=recoverySocketPath(canonical,cwd,runRoot);assert.ok(Buffer.byteLength(relative)<=103);assert.equal(path.resolve(cwd,relative),canonical);assert.ok(!path.isAbsolute(relative));}
});
test('unit: socket rejects NUL, unknown root/name/cwd and oversized native pathname',()=>{
 for(const target of [path.join(runRoot,'tmp/other.sock'),path.join(runRoot,'tmp/fire_emu_0123456789abcdef.sock')+'\0','/tmp/fire_emu_0123456789abcdef.sock'])assert.throws(()=>recoverySocketPath(target,path.join(ROOT,'cms-api'),runRoot));
 assert.throws(()=>recoverySocketPath(path.join(runRoot,'tmp/fire_emu_0123456789abcdef.sock'),ROOT,runRoot));
 assert.throws(()=>recoveryToken('arbitrary'));assert.throws(()=>recoveryRoot('bad'));
});
test('unit: lexical native seam preserves callback/this and never reabsolutizes before syscall',()=>{
 const calls=[],callback=()=>{},server={listen(...args){calls.push({self:this,args});return this;}},socket={connect(...args){calls.push({self:this,args});return this;}};
 const canonical=path.join(runRoot,'tmp/fire_emu_0123456789abcdef.sock'),cwd=path.join(ROOT,'cms-api');
 installRecoverySocketAdapter('worker',runRoot,{server,socket,cwd,port:canonical});
 assert.equal(server.listen(canonical,callback),server);assert.equal(calls[0].args[1],callback);assert.ok(!path.isAbsolute(calls[0].args[0]));
 socket.connect({path:canonical},callback);assert.ok(!path.isAbsolute(calls[1].args[0].path));assert.equal(calls[1].args[1],callback);
 assert.throws(()=>server.listen(canonical,{backlog:5}));assert.throws(()=>socket.connect({path:'/tmp/not-owned'}));
});
test('unit: fixed CLI excludes Firestore and export selector cannot accept import/force/storage',()=>{
 const start=recoveryPlan('start',runRoot);assert.equal(start.args[start.args.indexOf('--only')+1],'auth,functions,hosting,storage');assert.ok(!start.args.includes('--import'));
 const output=path.join(ROOT,'.local/emulator-data/m3/runtime-recovery',token,'auth-custody');const exp=recoveryPlan('export-auth',runRoot,output);assert.equal(exp.args[exp.args.indexOf('--only')+1],'auth');assert.ok(!exp.args.includes('--force'));
 assert.throws(()=>recoveryPlan('import',runRoot,output));assert.throws(()=>recoveryPlan('export-auth',runRoot,'/tmp/export'));
});
test('unit: child environment retains HOME and refuses inherited JVM/runtime markers',()=>{
 const env=recoveryEnvironment(runRoot,{HOME:'/synthetic-home',PATH:'/usr/bin'});assert.equal(env.HOME,'/synthetic-home');assert.equal(env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8080');assert.equal(env.PINKY_STORAGE_RUNTIME,undefined);assert.equal(env.JAVA_TOOL_OPTIONS,undefined);
 for(const key of ['JAVA_TOOL_OPTIONS','JDK_JAVA_OPTIONS','_JAVA_OPTIONS','PINKY_STORAGE_RUNTIME'])assert.throws(()=>recoveryEnvironment(runRoot,{[key]:'untrusted'}));
});
test('unit: source-bound High receipt rejects missing/mismatch before live action',async()=>{
 const current=[{path:'synthetic',sha256:'a'.repeat(64)}],receipt={status:'PASS_CODE_UNIT_ONLY',bundle:RECOVERY_BUNDLE,sources:current,review:{path:'.local/cache/m3/review.json',sha256:'b'.repeat(64),atUtc:'2026-10-12T07:00:00Z'}};
 assert.equal(validateRecoveryRelease(receipt,current),true);
 for(const altered of [{...receipt,status:'PASS'},{...receipt,sources:[]},{...receipt,review:null},{...receipt,bundle:{}}])assert.throws(()=>validateRecoveryRelease(altered,current));
 assert.throws(()=>validateRecoveryOperator({execPath:process.execPath,version:process.version,argv:process.argv.slice(1),execArgv:process.execArgv,cwd:process.cwd(),env:process.env}));assert.throws(()=>commandPlan('seed'));
});
test('unit: exact CLI/discovery/worker profile refuses entry/argv/cwd drift',()=>{
 const env=recoveryEnvironment(runRoot,{}),entry=path.join(ROOT,'node_modules/firebase-tools/lib/bin/firebase.js'),profile={entry,env,argv:recoveryPlan('start',runRoot).args.slice(1),execArgv:['--max-old-space-size=256'],cwd:path.join(runRoot,'cwd')};
 assert.equal(validateRecoveryProfile(profile),'cli');
 for(const changed of [{...profile,argv:[...profile.argv,'--import=x']},{...profile,cwd:ROOT},{...profile,entry:'/tmp/cli.js'}])assert.throws(()=>validateRecoveryProfile(changed));
 const worker=path.join(ROOT,'node_modules/firebase-tools/lib/emulator/functionsEmulatorRuntime.js'),wenv={...env,FUNCTIONS_EMULATOR:'true',FUNCTION_TARGET:'cmsApi',FUNCTION_SIGNATURE_TYPE:'http',PORT:path.join(runRoot,'tmp/fire_emu_0123456789abcdef.sock')};
 assert.equal(validateRecoveryProfile({entry:worker,env:wenv,argv:[worker],execArgv:[],cwd:path.join(ROOT,'cms-api')}),'worker');
 assert.throws(()=>validateRecoveryProfile({entry:worker,env:{...wenv,JAVA_TOOL_OPTIONS:'bad'},argv:[worker],execArgv:[],cwd:path.join(ROOT,'cms-api')}));
});
test('unit: Auth public pagination, unexpected users, tenants and metadata fail closed',async()=>{
 assert.equal(validateAuthPage({users:RECOVERY_ROSTER.map(user)},{complete:true}).length,7);
 for(const page of [{users:[],pageToken:'more'},{users:[],nextPageToken:'more'},{users:[{...user(RECOVERY_ROSTER[0]),uid:'foreign'}]},{users:[user(RECOVERY_ROSTER[0]),user(RECOVERY_ROSTER[0])]},{users:[]}])assert.throws(()=>validateAuthPage(page,{complete:true}));
 const auth=fakeAuth();auth.tenantManager=()=>({listTenants:async()=>({tenants:[],pageToken:'next'})});await assert.rejects(inspectAuth(auth));
});
test('unit: create only missing; existing identities are not updated and failure resumes without rollback',async()=>{
 const auth=fakeAuth([user(RECOVERY_ROSTER[0])]);const original=auth.createUser;let count=0;
 auth.createUser=async properties=>{if(++count===3)throw new Error('synthetic create failed');return original(properties);};
 await assert.rejects(reconstructMissing(auth,'synthetic-unit-input'));assert.equal(auth.records.size,3);
 auth.createUser=original;const result=await reconstructMissing(auth,'synthetic-unit-input');assert.equal(result.after.length,7);assert.equal(result.created.length,4);assert.ok(!auth.calls.some(([kind])=>['update','delete'].includes(kind)));
});
test('unit: existing metadata mismatch refuses before creation',async()=>{
 const auth=fakeAuth([{...user(RECOVERY_ROSTER[0]),emailVerified:false}]);await assert.rejects(reconstructMissing(auth,'synthetic-unit-input'));assert.equal(auth.calls.filter(([kind])=>kind==='create').length,0);
});
test('unit: membership absence, current positive version and inactive semantics preserved',()=>{
 for(const fixture of RECOVERY_ROSTER){const result=validateMembership(fixture,snapshot(fixture));assert.equal(result?.authzVersion??null,fixture.role?4:null);}
 const fixture=RECOVERY_ROSTER[0];assert.throws(()=>validateMembership(fixture,{exists:true,data:()=>({...snapshot(fixture).data(),authzVersion:0})}));assert.throws(()=>validateMembership(RECOVERY_ROSTER[4],{exists:true}));
});
function fakeDb({duplicate=false,nonplain=false}={}){
 const calls=[],db={calls,getAll:async()=>RECOVERY_ROSTER.map(snapshot),collection(name){
  if(name==='cmsMembers')return {doc:uid=>({id:uid})};let cursor=null;
  return {orderBy(key){calls.push(['orderBy',name,key]);return this;},limit(size){assert.equal(size,25);return this;},startAfter(last){cursor=last;calls.push(['cursor',last.id]);return this;},async get(){
   const total=name==='cmsDrafts'?26:0,start=cursor?(duplicate?0:Number(cursor.id)+1):0;
   const docs=Array.from({length:Math.max(0,Math.min(25,total-start))},(_,i)=>({id:String(start+i).padStart(4,'0'),data:()=>nonplain?{timestamp:new Date()}:{revision:4,text:'synthetic'}}));return {size:docs.length,docs};
  }};
 }};return db;
}
test('unit: history uses paged readonly query and exact full-document hashes, no mutators',async()=>{
 const db=fakeDb(),before=await inventoryHistory(db,'DOCUMENT_ID');assert.equal(before.inventory.collections.length,HISTORY_COLLECTIONS.length);assert.equal(before.inventory.collections[0].count,26);assert.equal(db.calls.filter(([kind])=>kind==='cursor').length,1);
 const after=await inventoryHistory(fakeDb(),'DOCUMENT_ID');assert.equal(assertHistoryEqual(before,after),true);after.inventory.members[0].sha256='changed';assert.throws(()=>assertHistoryEqual(before,after));
});
test('unit: nonterminal, unsupported Firestore value and scan deadline refuse partial inventory',async()=>{
 await assert.rejects(inventoryHistory(fakeDb({duplicate:true}),'DOCUMENT_ID'));
 await assert.rejects(inventoryHistory(fakeDb({nonplain:true}),'DOCUMENT_ID'));
 let now=0;await assert.rejects(inventoryHistory(fakeDb(),'DOCUMENT_ID',{now:()=>now+=120001}));
});
function exportPayload(){return [{version:'15.33.0',auth:{version:'15.33.0',path:'auth_export'}},{kind:'identitytoolkit#DownloadAccountResponse',users:RECOVERY_ROSTER.map(f=>({localId:f.uid,email:f.email,...(f.verified?{emailVerified:true}:{})}))},{signIn:{allowDuplicateEmails:false},blockingFunctions:{},emailPrivacyConfig:{enableImprovedEmailPrivacy:false}}];}
test('unit: private export exact schema/default booleans; string/null coercions refused',()=>{
 const value=exportPayload();assert.equal(validateExportPayload(...value).count,7);
 for(const bad of ['true',null,1]){const modified=exportPayload();modified[1].users[0].emailVerified=bad;assert.throws(()=>validateExportPayload(...modified));}
 const extra=exportPayload();extra[0].firestore={};assert.throws(()=>validateExportPayload(...extra));const tenant=exportPayload();tenant[1].users[0].tenantId='tenant';assert.throws(()=>validateExportPayload(...tenant));
});
test('unit: CLI close alone cannot prove Hub writer fulfillment or stable custody',()=>{
 const observation={sha256:'a'.repeat(64),files:[],directories:[]},good={exitCode:0,closed:true,fulfilled:true,before:observation,after:observation};assert.equal(assertExportCompletion(good),observation);
 for(const bad of [{...good,fulfilled:false},{...good,closed:false},{...good,exitCode:1},{...good,after:{sha256:'b'}}])assert.throws(()=>assertExportCompletion(bad),/HOLD_WRITER_COMPLETION_UNKNOWN/);
});
test('unit: unknown HTTP targets/body/method refused before request; smoke typed roles/denials',()=>{
 assert.throws(()=>boundedRecoveryRequest('http://127.0.0.1:8080/'));assert.throws(()=>boundedRecoveryRequest('https://example.com/'));
 const fixture=RECOVERY_ROSTER[0],response={status:200,body:Buffer.from(JSON.stringify({uid:fixture.uid,role:fixture.role,isActive:true,authzVersion:4}))};assert.equal(validateSessionResponse(response,fixture,{authzVersion:4}).status,200);assert.throws(()=>validateSessionResponse(response,fixture,{authzVersion:1}));
 assert.equal(validateSessionResponse({status:401,body:Buffer.from(JSON.stringify({error:{code:'UNAUTHENTICATED',message:'Denied',correlationId:'fixture'}}))},null).status,401);
});

function manifest(){return {specVersion:'v1alpha1',endpoints:{cmsApi:{entryPoint:'cmsApi',platform:'gcfv2',region:['us-central1'],httpsTrigger:{}}},params:[],requiredAPIs:[]};}
test('unit: file discovery accepts only fixed single-function HTTP manifest, not secrets/background triggers',()=>{
 assert.equal(validateRecoveryManifest(manifest()),true);
 for(const modify of [v=>v.endpoints.other={...v.endpoints.cmsApi},v=>v.endpoints.cmsApi.region=['foreign'],v=>v.endpoints.cmsApi.secretEnvironmentVariables=[{key:'secret'}],v=>v.endpoints.cmsApi.eventTrigger={},v=>v.params=[{name:'dynamic'}],v=>v.specVersion='unknown',v=>v.requiredAPIs={},v=>v.endpoints.cmsApi.unknown='ignored',v=>v.endpoints.cmsApi.timeoutSeconds=500]){const value=manifest();modify(value);assert.throws(()=>validateRecoveryManifest(value));}
});
function hub(){const root={version:'15.33.0',origins:['http://127.0.0.1:4400'],pid:123,host:'127.0.0.1',port:4400},locator={version:root.version,origins:root.origins,pid:123},map={};for(const [name,port] of Object.entries(RECOVERY_COMPONENTS))map[name]={name,host:'127.0.0.1',port,listen:[{address:'127.0.0.1',family:'IPv4',port}]};return {root,locator,map};}
test('unit: Hub root/map alone does not bind demo; locator and eight exact components required',()=>{
 const {root,map,locator}=hub();assert.equal(validateRecoveryHub(root,map,locator,123),true);
 for(const modify of [(h,m,l)=>l.pid=124,(h,m)=>m.firestore={name:'firestore',host:'127.0.0.1',port:8080},(h,m)=>delete m.eventarc,(h,m)=>m.tasks.port=9498,h=>h.origins=['http://localhost:4400'],h=>h.projectId='demo-pinky-lamb-cms']){const value=hub();modify(value.root,value.map,value.locator);assert.throws(()=>validateRecoveryHub(value.root,value.map,value.locator,123));}
});
test('unit: owned process classes/generation/ancestry reject unknown descendants and reappeared leader',()=>{
 const leader={pid:2001,ppid:1999,pgid:2001,start:'Mon Oct 12 14:00:00 2026',argv:'fixed-cli'},jvm={pid:2002,ppid:2001,pgid:2001,start:'Mon Oct 12 14:00:01 2026',argv:`java -Djava.security.manager=disallow -Duser.language=en -jar ${assertStorageJar()} serve`};
 const record={pid:2001,ppid:1999,start:leader.start,argv:leader.argv,generations:[]};assert.equal(validateRecoveryOwnership(record,[leader,jvm]).jvm.pid,2002);
 for(const rows of [[{...leader,start:'changed'},jvm],[leader,{...jvm,ppid:1}],[leader,jvm,{pid:2003,ppid:2001,pgid:2001,start:jvm.start,argv:'unknown-node'}]])assert.throws(()=>validateRecoveryOwnership(record,rows));
 assert.throws(()=>validateRecoveryOwnership({...record,exit:{code:0}},[leader,jvm]));assert.throws(()=>validateRecoveryOwnership({...record,generations:[[2002,'old']]},[leader,jvm]));
});
test('unit: discovery explicit env refuses missing manifest and worker refuses TCP PORT',()=>{
 const env=recoveryEnvironment(runRoot,{}),entry=path.join(ROOT,'node_modules/firebase-functions/lib/bin/firebase-functions.js'),discovery={entry,env:{...env,FUNCTIONS_CONTROL_API:'true',FUNCTIONS_MANIFEST_OUTPUT_PATH:path.join(runRoot,'discovery/functions.yaml')},argv:[entry,path.join(ROOT,'cms-api')],execArgv:[],cwd:path.join(ROOT,'cms-api')};assert.equal(validateRecoveryProfile(discovery),'discovery');assert.throws(()=>validateRecoveryProfile({...discovery,env:{...discovery.env,FUNCTIONS_MANIFEST_OUTPUT_PATH:undefined}}));
 const worker=path.join(ROOT,'node_modules/firebase-tools/lib/emulator/functionsEmulatorRuntime');assert.throws(()=>validateRecoveryProfile({entry:worker,env:{...env,FUNCTIONS_EMULATOR:'true',FUNCTION_TARGET:'cmsApi',FUNCTION_SIGNATURE_TYPE:'http',PORT:'5001'},argv:[worker],execArgv:[],cwd:path.join(ROOT,'cms-api')}));
});
function writeSyntheticExport(){
 const folder=path.join(ROOT,'.local/emulator-data/m3/runtime-recovery',recoveryToken()),destination=path.join(folder,'auth-custody');mkdirSync(path.join(destination,'auth_export'),{recursive:true,mode:0o700});
 const payload=exportPayload();for(const [index,name] of ['firebase-export-metadata.json','auth_export/accounts.json','auth_export/config.json'].entries())writeFileSync(path.join(destination,name),JSON.stringify(payload[index]),{flag:'wx',mode:0o600});
 writeFileSync(path.join(folder,'UNIT_SYNTHETIC_ONLY.json'),JSON.stringify({kind:'UNIT_SCHEMA_NO_AUTH_API',noRealCredentials:true}),{flag:'wx',mode:0o600});return destination;
}
test('unit: Auth custody exact3 private single-link files; extra/symlink/mode failures retained',()=>{
 const exact=writeSyntheticExport();assert.equal(inspectAuthExport(exact).files.length,3);
 const extra=writeSyntheticExport();writeFileSync(path.join(extra,'unexpected'),'',{mode:0o600});assert.throws(()=>inspectAuthExport(extra));
 const link=writeSyntheticExport();symlinkSync('auth_export/accounts.json',path.join(link,'link'));assert.throws(()=>observePartialExport(link));
 const mode=writeSyntheticExport();chmodSync(path.join(mode,'auth_export/accounts.json'),0o644);assert.throws(()=>inspectAuthExport(mode));
 assert.throws(()=>inspectAuthExport('/tmp/auth-custody'));
});
test('unit: interrupted deadline does not authorize update/rollback or accept a complete roster',async()=>{
 const auth=fakeAuth();let clock=0;await assert.rejects(reconstructMissing(auth,'synthetic-unit-input',{now:()=>clock+=120001}));assert.equal(auth.records.size,0);
});

test('unit: exact selector authorization path works offline; live/seed remain refused',async()=>{
 assert.equal(await assertLocalLaunchAuthorized('runtime-recovery-unit'),true);assert.equal(commandPlan('runtime-recovery-live').args.at(-1),'live');assert.equal(commandPlan('runtime-recovery-unit').args.at(-1),path.join(ROOT,'tests/runtime-recovery.test.mjs'));assert.throws(()=>commandPlan('runtime-recovery-unit',['--task=foreign']));
});
test('unit: frozen original guard binds its private historical archive; workspace approvals resolve correctly',()=>{
 const scope=assertRecoveryPinnedSources();assert.equal(scope.frozen_input_pins.length,72);
 const pin=scope.frozen_input_pins.find(value=>value.path==='pinky-lamb-cms/scripts/local-guard.mjs'),location=recoveryPinnedLocation(pin);assert.equal(location.historical,true);assert.equal(location.mode,'0o600');assert.ok(location.absolute.includes('/prior-source/'));
 const approval=recoveryPinnedLocation({path:'approvals/APPROVAL-REGISTER.json',mode:'0o644'});assert.equal(approval.absolute,path.join(path.dirname(ROOT),'approvals/APPROVAL-REGISTER.json'));assert.throws(()=>recoveryPinnedLocation({path:'../outside'}));
});
test('unit: R1 Storage dispatch preserves exact this and explicit false; rejects method/control drift',async()=>{
 const calls=[];class FixedRuntime{async start(autoDownload=true){calls.push({receiver:this,autoDownload});return 'fixed';}}
 let controls=0;const identity=bindRecoveryStorageStart(FixedRuntime,()=>controls++),runtime=new FixedRuntime();assert.equal(await runtime.start(),'fixed');assert.equal(calls[0].receiver,runtime);assert.equal(calls[0].autoDownload,false);assert.equal(controls,1);
 FixedRuntime.prototype.start=()=>{};await assert.rejects(identity.adapter.call(runtime));
 class RefusedRuntime{async start(){assert.fail('no uncontrolled original call');}}bindRecoveryStorageStart(RefusedRuntime,()=>{throw new Error('cache missing or profile wrong');});await assert.rejects(new RefusedRuntime().start());
});

test('unit: create source/process barrier failure prevents any Auth write even after metadata passed',async()=>{
 const auth=fakeAuth();let barriers=0;await assert.rejects(reconstructMissing(auth,'synthetic-unit-input',{beforeCreate:async()=>{if(++barriers===2)throw new Error('generation changed');}}));assert.equal(auth.records.size,0);assert.equal(barriers,2);
});
test('unit: extra empty custody directory and identity/mode changes cannot satisfy stable-tree completion',()=>{
 const destination=writeSyntheticExport(),before=inspectAuthExport(destination);mkdirSync(path.join(destination,'empty'),{mode:0o700});assert.throws(()=>inspectAuthExport(destination));
 const after=structuredClone(before);after.directories[0].ino+=1;assert.throws(()=>assertExportCompletion({exitCode:0,closed:true,fulfilled:true,before,after}));
 const modes=structuredClone(before);modes.files[0].mode='0644';assert.throws(()=>assertExportCompletion({exitCode:0,closed:true,fulfilled:true,before,after:modes}));
});

test('unit: case-folded discovery metadata denies mixed-case reserved names without reading contents',()=>{
 for(const name of ['.ENV','.eNv.local','.SECRET.LOCAL','.Secret.new','.RUNTIMECONFIG.JSON','FUNCTIONS.YAML','.PnP.Js','.pnp.cjs'])assert.equal(recoveryMetadataName(name),true);for(const name of ['index.mjs','package.json','env-example.txt'])assert.equal(recoveryMetadataName(name),false);
});
test('unit: linked High PASS must bind exact R1 revision, source bytes/modes, bundle and reviewer/time',()=>{
 const sources=[{path:'synthetic',bytes:1,mode:'0o644',links:1,sha256:'a'.repeat(64)}],receipt={sources,review:{atUtc:'2026-10-12T07:00:00Z'}},review={status:'PASS_CODE_UNIT_ONLY',amendment_id:'M3-RUNTIME-01',revision:1,actual_effort:'HIGH',reviewer:'/root/pdf_setup_reviewer',atUtc:receipt.review.atUtc,bundle:RECOVERY_BUNDLE,sources};assert.equal(validateRecoveryHighReview(review,receipt,sources),true);
 for(const value of [{...review,revision:2},{...review,reviewer:'unrelated'},{...review,sources:[{...sources[0],mode:'0o600'}]},{...review,bundle:{}},{...review,atUtc:'2026-10-12T06:00:00Z'}])assert.throws(()=>validateRecoveryHighReview(value,receipt,sources));
});

test('unit: live operator admission is independent of receipt existence; exact Node/source/env required',()=>{
 const env=childEnvironment({});delete env.NODE_OPTIONS;delete env.PINKY_NETWORK_FENCE;
 const profile={execPath:path.join(ROOT,'.local/cache/node/node-v22.23.3-darwin-arm64/bin/node'),version:'v22.23.3',argv:[path.join(ROOT,'scripts/recover-auth-local.mjs'),'live'],execArgv:[],cwd:ROOT,env};assert.equal(validateRecoveryOperator(profile),true);
 for(const bad of [{...profile,argv:[path.join(ROOT,'tests/runtime-recovery.test.mjs')]},{...profile,execPath:'/usr/bin/node'},{...profile,execArgv:['--inspect']},{...profile,env:{...env,NODE_OPTIONS:'--import=untrusted'}},{...profile,version:'v22.0.0'}])assert.throws(()=>validateRecoveryOperator(bad));
});

test('unit: process.env setter deletes undefined instead of coercing it to string, restoring only task key',()=>{
 const key='PINKY_R1_UNIT_UNDEFINED',before=process.env[key];try{process.env[key]='synthetic';applyRecoveryEnvironment({[key]:undefined});assert.equal(process.env[key],undefined);applyRecoveryEnvironment({[key]:'fixed'});assert.equal(process.env[key],'fixed');assert.throws(()=>applyRecoveryEnvironment({[key]:null}));}finally{if(before===undefined)delete process.env[key];else process.env[key]=before;}
});

test('unit: expired admission never invokes operation factory; late microtask cannot bypass elapsed deadline',async()=>{
 let called=0;await assert.rejects(withinRecoveryDeadline(()=>called++,0,'EXPIRED'));assert.equal(called,0);
 const clocks=[0,11];await assert.rejects(withinRecoveryDeadline(()=>called++,10,'EXPIRED',{now:()=>clocks.shift()??11}));assert.equal(called,0);
 const late=[0,1,11];await assert.rejects(withinRecoveryDeadline(()=>{called++;return 'late';},10,'EXPIRED',{now:()=>late.shift()??11}));assert.equal(called,1);
});

test('unit: pinned Hub accepts omitted own listen only on functions/eventarc/tasks; hostile values stay refused',()=>{
 const value=hub();for(const name of ['functions','eventarc','tasks'])delete value.map[name].listen;assert.equal(validateRecoveryHub(value.root,value.map,value.locator,123),true);
 for(const name of Object.keys(RECOVERY_COMPONENTS)){
  for(const listen of [null,[],[null],[{}],[{address:'0.0.0.0',family:'IPv4',port:RECOVERY_COMPONENTS[name]}],[{address:'127.0.0.1',family:'IPv4',port:RECOVERY_COMPONENTS[name]},{address:'127.0.0.1',family:'IPv4',port:RECOVERY_COMPONENTS[name]}]]){const bad=hub();bad.map[name].listen=listen;assert.throws(()=>validateRecoveryHub(bad.root,bad.map,bad.locator,123));}
  if(!['functions','eventarc','tasks'].includes(name)){const missing=hub();delete missing.map[name].listen;assert.throws(()=>validateRecoveryHub(missing.root,missing.map,missing.locator,123));}
 }
 const extra=hub();extra.map.functions.extra='untrusted';assert.throws(()=>validateRecoveryHub(extra.root,extra.map,extra.locator,123));
 const undefinedOwn=hub();undefinedOwn.map.functions.listen=undefined;assert.throws(()=>validateRecoveryHub(undefinedOwn.root,undefinedOwn.map,undefinedOwn.locator,123));
});
function retainedControl(){
 const fixed=RETAINED_RECOVERY,plan=recoveryPlan('start',recoveryRoot(fixed.token)),argv=[plan.node,...plan.args].join(' '),leader={pid:fixed.pid,ppid:fixed.oldParent,pgid:fixed.pgid,start:fixed.start,argv},jvm={pid:fixed.jvm,ppid:fixed.pid,pgid:fixed.pgid,start:fixed.jvmStart,argv:'fixed-test-jvm'};
 return {owner:{pid:fixed.pid,ppid:fixed.oldParent,start:fixed.start,argv,exit:null,close:null,observations:[{owned:{leader,jvm}}]},operator:{pid:fixed.oldParent,mode:'runtime-recovery-live',start:'Mon Oct 12 14:58:12 2026',argv:`${path.join(ROOT,'.local/cache/node/node-v22.23.3-darwin-arm64/bin/node')} ${path.join(ROOT,'scripts/recover-auth-local.mjs')} live`,exit:{code:1,signal:null},close:{code:1,signal:null},signals:[]},rows:[{...leader,ppid:1},jvm]};
}
test('unit: retained runtime requires exact recorded parent exit/reparent, argv and both generations',()=>{
 const control=retainedControl();assert.equal(validateRetainedTransition(control.owner,control.operator,control.rows).currentParent,1);
 for(const mutate of [c=>c.owner.pid++,c=>c.operator.close=null,c=>c.operator.exit.code=0,c=>c.rows[0].ppid=2,c=>c.rows[0].start='changed',c=>c.rows[1].pid++,c=>c.rows[1].start='changed',c=>c.rows.push({pid:15456}),c=>c.rows[0].argv+=' --other']){const bad=retainedControl();mutate(bad);assert.throws(()=>validateRetainedTransition(bad.owner,bad.operator,bad.rows));}
});
test('unit: old loaded CLI policy31 sections byte-match; changed fence/socket/parser/adapter body refused',()=>{
 const old=readFileSync(path.join(ROOT,'.local/cache/m3/runtime-recovery/01Ra-4e723b85-a8fc-47d0-bc19-f94f909832cb/final-8d611f55-1ef9-4fd4-bbb1-cf2aeefe6d47/source/scripts/local-guard.mjs'),'utf8');const reviewed=readFileSync(path.join(ROOT,'.local/cache/m3/runtime-policy-correction/02a-96a29eba-cca3-4fa1-a9cb-9f30c32df5b2/prior-source/pinky-lamb-cms/scripts/local-guard.mjs'),'utf8');const sections=compareRetainedPolicy(old,reviewed);assert.equal(sections.length,31);assert.ok(sections.every(section=>section.match));assert.throws(()=>assertRetainedPolicyParity());
 const source=readFileSync(path.join(ROOT,'scripts/local-guard.mjs'),'utf8');
 for(const name of ['installNetworkFence','installRecoverySocketAdapter','installLocalHttpParser','installRecoveryProcessAdapters']){const altered=source.replace(`export function ${name}(`,`export function ${name} (`);assert.throws(()=>compareRetainedPolicy(source,altered));}
});

test('unit: second/concurrent/unknown continuation refuses before any SDK/factory; latch never overwritten',async()=>{
 const parent=assertOwnedOutput('.local/cache/m3/runtime-policy-correction/unit-fixtures');mkdirSync(parent,{recursive:true,mode:0o700});const parentStat=lstatSync(parent);assert.equal(parentStat.isDirectory(),true);assert.equal(parentStat.uid,process.getuid());assert.equal(parentStat.mode&0o777,0o700);
 const base=assertOwnedOutput(`.local/cache/m3/runtime-policy-correction/unit-fixtures/${recoveryToken()}`);assert.equal(existsSync(base),false);mkdirSync(base,{mode:0o700});const file=path.join(base,'unit-latch.json');assert.ok(base.startsWith(parent+path.sep));let factories=0;
 const attempt=()=>{atomicContinuationAdmission(record=>writeFileSync(file,JSON.stringify(record),{flag:'wx',mode:0o600}),{synthetic:true});factories++;};
 const results=await Promise.allSettled([Promise.resolve().then(attempt),Promise.resolve().then(attempt)]);assert.equal(results.filter(result=>result.status==='fulfilled').length,1);assert.equal(factories,1);assert.throws(attempt);assert.equal(factories,1);assert.equal(readFileSync(file,'utf8'),JSON.stringify({synthetic:true}));
 for(const entries of [['continuation-admission.json'],['continuation-unknown'],['CONTINUATION-stale']])assert.throws(()=>validateContinuationNamespace(entries));assert.equal(validateContinuationNamespace(['tmp','profiles','runtime-owner.json']),true);
 const error=()=>{throw Object.assign(new Error('unknown storage state'),{code:'EIO'});};assert.throws(()=>atomicContinuationAdmission(error,{}));
});

test('unit: retained private directory UID/mode/type/symlink drift holds without chmod or repair',()=>{
 const record={path:'/synthetic-owned-root',realpath:'/synthetic-owned-root',type:'directory',symbolicLink:false,uid:process.getuid(),mode:0o700};assert.equal(validateRetainedPrivateDirectory(record),true);
 for(const bad of [{...record,mode:0o755},{...record,mode:0o600},{...record,uid:record.uid+1},{...record,type:'other'},{...record,type:'symlink',symbolicLink:true},{...record,realpath:'/escaped'}])assert.throws(()=>validateRetainedPrivateDirectory(bad));assert.equal(record.mode,0o700);
});

// R2 code-phase regressions; boundary doubles perform no native IPC.
test('R2 unit: normalized tuple retains actual marker identity, callback and overload',async()=>{
 const {mapRecoveryConnectArguments}=await import('../scripts/local-guard.mjs');
 const callback=()=>{},tuple=net._normalizeArgs([{path:path.join(runRoot,'tmp/fire_emu_0123456789abcdef.sock')},callback]);
 const marker=Object.getOwnPropertySymbols(tuple);const mapped=mapRecoveryConnectArguments([tuple],()=> 'tmp/owned.sock');
 assert.equal(mapped[0],tuple);assert.equal(mapped[0][1],callback);assert.deepEqual(Object.getOwnPropertySymbols(mapped[0]),marker);assert.equal(mapped[0][marker[0]],true);assert.equal(mapped[0][0].path,'tmp/owned.sock');
 assert.throws(()=>mapRecoveryConnectArguments([[{path:'owned.sock'},callback]],()=> 'safe.sock'));
 const direct=mapRecoveryConnectArguments([{path:'owned.sock'},callback],()=> 'safe.sock');assert.equal(direct[1],callback);
});
test('R2 unit: footer has explicit async main and no syntactic footer top-level await',()=>{
 const source=readFileSync(path.join(ROOT,'scripts/local-guard.mjs'),'utf8');assert.match(source,/export async function localGuardMain\(/);
 assert.match(source,/void localGuardMain\(\);/);
 const footer=source.slice(source.lastIndexOf('if(process.argv[1]'));assert.doesNotMatch(footer,/\bawait\b/);
});

test('R2 unit: legacy recovery dispatcher contains no R2 selector/control allocation',()=>{
 const source=readFileSync(path.join(ROOT,'scripts/local-guard.mjs'),'utf8'),part=source.slice(source.indexOf('export async function dispatchRecoveryOperator'),source.indexOf('// M3-RUNTIME-02:'));
 assert.doesNotMatch(part,/if\(selector===/);assert.doesNotMatch(part,/PINKY_RUNTIME_POLICY_CONTROL/);
});

if(process.env.PINKY_RUNTIME_POLICY_CONTROL!==undefined){
test('R2 native: public synchronous API require and actual normalized UNIX peer controls',async()=>{
 const policy=await import('../scripts/local-guard.mjs');policy.assertRuntimePolicyAdmission('runtime-policy-control');
 const root=process.env.PINKY_RUNTIME_POLICY_CONTROL;assert.equal(policy.recoveryRoot(path.basename(root??'')),root);assert.equal(os.tmpdir(),path.join(root,'tmp'));for(const name of ['', 'cwd','tmp','profiles']){const st=lstatSync(path.join(root,name));assert.equal(st.isDirectory(),true);assert.equal(st.isSymbolicLink(),false);assert.equal(st.uid,process.getuid());assert.equal(st.mode&0o777,0o700);}
 const ps=pid=>{const p=spawnSync('/bin/ps',['-p',String(pid),'-o','pid=,ppid=,pgid=,lstart=,args='],{encoding:'utf8',env:{...process.env,TZ:'Asia/Ho_Chi_Minh'},timeout:1500,maxBuffer:65536});assert.equal(p.status,0);const m=p.stdout.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+([A-Z][a-z]{2}\s+[A-Z][a-z]{2}\s+\d+\s+\d{2}:\d{2}:\d{2}\s+\d{4})\s+(.+)$/);assert.ok(m);return {pid:Number(m[1]),ppid:Number(m[2]),pgid:Number(m[3]),start:m[4],argv:m[5]};};
 const parent=ps(process.ppid),actor=ps(process.pid),admissionPath=path.join(ROOT,'.local/cache/m3/runtime-policy-correction/admissions/02b.json'),operatorPath=path.join(ROOT,'.local/cache/m3/runtime-policy-correction/admissions/02b-operator.json');
 const readPrivate=target=>{const st=lstatSync(target);assert.equal(st.isFile(),true);assert.equal(st.isSymbolicLink(),false);assert.equal(st.uid,process.getuid());assert.equal(st.mode&0o777,0o600);assert.equal(st.nlink,1);return JSON.parse(readFileSync(target));};
 let operator=readPrivate(operatorPath);const attributionDeadline=Date.now()+1500;while(!operator.generation && Date.now()<attributionDeadline){await new Promise(resolve=>setTimeout(resolve,20));operator=readPrivate(operatorPath);}policy.validateRuntimePolicyControlOwnership(readPrivate(admissionPath),operator,parent,root);
 policy.validateRuntimePolicyControlChild({execPath:process.execPath,version:process.version,argv:process.argv.slice(1),execArgv:process.execArgv,cwd:process.cwd(),env:process.env,parent,rawArgv:[process.execPath,...process.execArgv,...process.argv.slice(1)]});assert.equal(actor.ppid,parent.pid);
 const began=Date.now(),deadline=began+120000,receipt={status:'IN_PROGRESS',sources:policy.recoverySourceRecords(),actor,parent,argv:process.argv,execArgv:process.execArgv,observerTimeZone:'Asia/Ho_Chi_Minh',controlRoot:root,nodeTmpdir:os.tmpdir(),rpcAttempts:0,deniedControls:0};
 const originalHttps=https.request,socketConnect=net.Socket.prototype.connect,serverListen=net.Server.prototype.listen;let client,server,peer,peerClosedPromise,unixAdmission=false;const cwd=process.cwd(),canonical=path.join(root,'tmp/fire_emu_0123456789abcdef.sock');
 const save=()=>writeFileSync(path.join(root,'control-receipt.json'),JSON.stringify(receipt,null,2)+'\n',{mode:0o600});
 try{
  const deny=()=>{receipt.rpcAttempts++;throw new Error('R2_CONTROL_RPC_REFUSED');};http.request=deny;https.request=deny;
  net.Server.prototype.listen=function(...args){if(!unixAdmission || typeof args[0]!=='string' || path.resolve(process.cwd(),args[0])!==canonical || Buffer.byteLength(args[0])>103)return deny();return serverListen.apply(this,args);};
  net.Socket.prototype.connect=function(...args){let options=args[0];if(Array.isArray(options))options=options[0];if(!unixAdmission || !options || typeof options!=='object' || typeof options.path!=='string' || path.resolve(process.cwd(),options.path)!==canonical || Buffer.byteLength(options.path)>103)return deny();return originalConnect.apply(this,args);};
  for(const operation of [()=>http.request('http://127.0.0.1:9099/'),()=>https.request('https://example.invalid/'),()=>net.createConnection({host:'127.0.0.1',port:8080}),()=>net.createServer().listen({host:'127.0.0.1',port:0}),()=>net.createConnection({path:'/private/tmp/untrusted-control.sock'})]){assert.throws(operation,/R2_CONTROL_RPC_REFUSED/);receipt.deniedControls++;}
  const denied=receipt.rpcAttempts;const namespace=createRequire(import.meta.url)(path.join(ROOT,'cms-api/index.mjs'));assert.equal(typeof namespace.cmsApi,'function');assert.equal(receipt.rpcAttempts,denied);receipt.syncRequire='PASS_PUBLIC_PINNED_NODE_NO_RPC';
  process.chdir(path.join(root,'cwd'));const effective=policy.recoverySocketPath(canonical,process.cwd(),root);receipt.socket={canonical,effective,cwd:process.cwd()};
  policy.installRecoverySocketAdapter('worker',root,{cwd:process.cwd(),port:canonical});policy.installRegisteredRecoveryConnectAdapter(net.Socket.prototype,root,process.cwd(),new Set([canonical]));unixAdmission=true;server=net.createServer(connection=>{peer=connection;peerClosedPromise=once(connection,'close');connection.end(Buffer.from('R2_PEER'));});
  await withinRecoveryDeadline(()=>new Promise((resolve,reject)=>{server.once('error',reject);server.listen(canonical,resolve);}),deadline-Date.now(),'R2_CONTROL_LISTEN_UNKNOWN');
  const socketMetadata=lstatSync(canonical);assert.equal(socketMetadata.isSocket(),true);assert.equal(socketMetadata.uid,process.getuid());assert.equal(socketMetadata.mode&0o777,0o700);receipt.socket.type='socket';receipt.socket.mode='0700';receipt.socket.uid=socketMetadata.uid;
  let callbackCount=0;client=new net.Socket();const tuple=net._normalizeArgs([{path:canonical},()=>{callbackCount++;}]);const symbols=Object.getOwnPropertySymbols(tuple);assert.equal(symbols.length,1);assert.equal(client.connect(tuple),client);assert.equal(Object.getOwnPropertySymbols(tuple)[0],symbols[0]);assert.equal(tuple[symbols[0]],true);
  const chunks=[];client.on('data',chunk=>{chunks.push(chunk);assert.ok(chunks.reduce((n,b)=>n+b.length,0)<=65536);});await withinRecoveryDeadline(()=>once(client,'close'),deadline-Date.now(),'R2_CONTROL_PEER_CLOSE_UNKNOWN');assert.equal(callbackCount,1);assert.equal(Buffer.concat(chunks).toString(),'R2_PEER');
  assert.throws(()=>policy.mapRecoveryConnectArguments([[{path:canonical},()=>{}]],value=>value));assert.throws(()=>server.listen({host:'127.0.0.1',port:1}));receipt.normalized={workerAndRegisteredCliSharedSeams:true,actualNativeMarker:true,callbacks:callbackCount,bytes:Buffer.concat(chunks).length,wrongMarkerRefused:true};
  await withinRecoveryDeadline(()=>peerClosedPromise,deadline-Date.now(),'R2_CONTROL_ACCEPTED_PEER_CLOSE_UNKNOWN');
  await withinRecoveryDeadline(()=>new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve())),deadline-Date.now(),'R2_CONTROL_SERVER_CLOSE_UNKNOWN');receipt.peerClosed=client.closed;receipt.serverClosed=!server.listening;assert.equal(receipt.peerClosed,true);assert.equal(receipt.serverClosed,true);assert.equal(existsSync(canonical),false);receipt.socketAbsent=true;
  if(Date.now()>=deadline)throw new Error('R2_CONTROL_DEADLINE');receipt.status='PASS_NATIVE_CONTROL_ONLY';receipt.completedAtUtc=new Date().toISOString();save();writeFileSync(path.join(ROOT,'.local/cache/m3/runtime-policy-correction/02b-native-controls.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});
 }catch(error){receipt.status='HOLD';receipt.reason=/^[A-Z0-9_: -]+$/.test(error.code??'')?error.code:'CONTROL_UNKNOWN';receipt.completedAtUtc=new Date().toISOString();save();throw error;}
 finally{if(client && !client.destroyed)client.destroy();if(peer && !peer.destroyed)peer.destroy();if(server?.listening){try{await withinRecoveryDeadline(()=>new Promise(resolve=>server.close(resolve)),Math.max(1,deadline-Date.now()),'R2_CONTROL_CLEANUP_UNKNOWN');}catch{receipt.cleanup='UNKNOWN_HOLD';receipt.status='HOLD';save();}}net.Socket.prototype.connect=socketConnect;net.Server.prototype.listen=serverListen;http.request=originalHttp;https.request=originalHttps;process.chdir(cwd);}
});
}

test('R2 unit: exact sequential High phase/revision/current sources; forged or stale refuses',async()=>{
 const p=await import('../scripts/local-guard.mjs'),current=p.recoverySourceRecords(),atUtc='2026-10-12T10:00:00Z';
 const receipt={status:'PASS_CODE_UNIT_ONLY',amendment_id:'M3-RUNTIME-02',revision:1,freeze_generation:3,phase:'02a',bundle:p.RUNTIME_POLICY_BUNDLE,sources:current,review:{path:'.local/cache/m3/runtime-policy-correction/02a-high-review.json',sha256:'a'.repeat(64),atUtc}};
 const review={...receipt,actual_effort:'HIGH',reviewer:'/root/pdf_setup_reviewer',atUtc};delete review.review;
 assert.equal(p.validateRuntimePolicyGate(receipt,review,'02a',current),true);
 for(const bad of [{...receipt,phase:'02c'},{...receipt,status:'PASS_PLANNING_ONLY'},{...receipt,sources:[]},{...receipt,bundle:{}},{...receipt,freeze_generation:2},{...receipt,review:{...receipt.review,path:'.local/cache/foreign.json'}}])assert.throws(()=>p.validateRuntimePolicyGate(bad,review,'02a',current));
 for(const bad of [{...review,actual_effort:'MEDIUM'},{...review,atUtc:'2026-10-12T09:00:00Z'},{...review,sources:[]}])assert.throws(()=>p.validateRuntimePolicyGate(receipt,bad,'02a',current));
 assert.throws(()=>p.validateRuntimePolicyGate(receipt,review,'02a',[]));
});
test('R2 unit: fixed selectors reject caller paths/flags and broad suites remain refused',async()=>{
 const p=await import('../scripts/local-guard.mjs');for(const selector of Object.keys(p.RUNTIME_POLICY_PHASES)){const plan=p.commandPlan(selector);assert.equal(plan.node,path.join(ROOT,'.local/cache/node/node-v22.23.3-darwin-arm64/bin/node'));assert.throws(()=>p.commandPlan(selector,['--root=/tmp']));}
 assert.throws(()=>p.runtimePolicyOperatorPlan('runtime-policy-adopt'));assert.throws(()=>p.commandPlan('seed'));
});
test('R2 unit: control launcher vs actual test-child args and native profile attribution are separate',async()=>{
 const p=await import('../scripts/local-guard.mjs'),plan=p.runtimePolicyOperatorPlan('runtime-policy-control'),flags=['--test-concurrency=1','--test-name-pattern=^R2 native:'],entry=path.join(ROOT,'tests/runtime-recovery.test.mjs');
 const env={...p.childEnvironment({HOME:'/synthetic'}),NODE_TEST_CONTEXT:'child-v8'};delete env.NODE_OPTIONS;delete env.PINKY_NETWORK_FENCE;
 const value={execPath:plan.node,version:'v22.23.3',argv:[entry],execArgv:flags,cwd:ROOT,env,parent:{pid:process.ppid,start:'Mon Oct 12 17:00:00 2026',argv:[plan.node,...plan.args].join(' ')},rawArgv:[plan.node,...flags,entry]};
 assert.equal(p.validateRuntimePolicyControlChild(value),true);
 for(const changed of [{...value,argv:plan.args},{...value,execArgv:[]},{...value,execArgv:[...flags,'--no-experimental-require-module']},{...value,parent:{...value.parent,pid:999999}},{...value,rawArgv:[plan.node,entry]},{...value,env:{...env,NODE_OPTIONS:'untrusted'}}])assert.throws(()=>p.validateRuntimePolicyControlChild(changed));
 assert.throws(()=>p.validateRuntimePolicyOperator({selector:'runtime-policy-control',...value}));
});
test('R2 unit: post-apply runtime markers are omitted from explicit export Node env',async()=>{
 const p=await import('../scripts/local-guard.mjs'),input={HOME:'/synthetic',PATH:'/usr/bin',LANG:'C',PINKY_RECOVERY_RUNTIME:runRoot,JAVA_TOOL_OPTIONS:'inherited',PINKY_STORAGE_RUNTIME:'old',PINKY_RUNTIME_POLICY_SELECTOR:'runtime-policy-preserve'},env=p.runtimePolicyNodeEnvironment(runRoot,{HOME:input.HOME,PATH:input.PATH,LANG:input.LANG,PINKY_RUNTIME_POLICY_SELECTOR:input.PINKY_RUNTIME_POLICY_SELECTOR});assert.throws(()=>p.runtimePolicyNodeEnvironment(runRoot,input));
 assert.equal(env.PINKY_RECOVERY_RUNTIME,runRoot);assert.equal(env.HOME,input.HOME);assert.equal(env.PINKY_RUNTIME_POLICY_SELECTOR,'runtime-policy-preserve');assert.equal(env.JAVA_TOOL_OPTIONS,undefined);assert.equal(env.PINKY_STORAGE_RUNTIME,undefined);assert.equal(env.TMPDIR,path.join(runRoot,'tmp'));
 assert.throws(()=>p.recoveryEnvironment(runRoot,input));
});
test('R2 unit: single atomic phase admission rejects prior/current/unknown writer before factory',async()=>{
 const p=await import('../scripts/local-guard.mjs');let calls=0;const occupied=()=>{throw Object.assign(new Error('occupied'),{code:'EEXIST'});};assert.throws(()=>p.runtimePolicyAtomicAdmission('runtime-policy-stop',occupied));assert.equal(calls,0);
 assert.throws(()=>p.runtimePolicyAtomicAdmission('unknown',()=>calls++));assert.equal(calls,0);assert.throws(()=>p.runtimePolicyAtomicAdmission('runtime-policy-preserve',()=>{throw Object.assign(new Error('unknown'),{code:'EIO'});}));
});
test('R2 unit: zero Auth custody requires real empty users and no tenants/pagination/error',async()=>{
 const p=await import('../scripts/recover-auth-local.mjs');assert.deepEqual(p.validateZeroAuthState({users:[]},{tenants:[]}),{zeroUsers:true,zeroTenants:true});
 for(const users of [{},{users:[user(RECOVERY_ROSTER[0])]},{users:[],pageToken:'next'},{users:[],error:{}},{users:[],nextPageToken:'next'}])assert.throws(()=>p.validateZeroAuthState(users,{tenants:[]}));
 assert.throws(()=>p.validateZeroAuthState({users:[]},{tenants:[{}]}));const auth=fakeAuth();assert.deepEqual(await p.inspectZeroAuth(auth),{zeroUsers:true,zeroTenants:true});assert.equal(auth.calls.some(call=>call[0]==='create'),false);
 const metadata={version:'15.33.0',auth:{version:'15.33.0',path:'auth_export'}},accounts={kind:'identitytoolkit#DownloadAccountResponse',users:[]},config={signIn:{allowDuplicateEmails:false},blockingFunctions:{},emailPrivacyConfig:{enableImprovedEmailPrivacy:false}};
 assert.equal(p.validateEmptyAuthExportPayload(metadata,accounts,config).users,0);
 for(const bad of [{kind:accounts.kind},{...accounts,error:{}},{...accounts,users:[{}]},{...accounts,nextPageToken:'next'}])assert.throws(()=>p.validateEmptyAuthExportPayload(metadata,bad,config));assert.throws(()=>p.validateEmptyAuthExportPayload(metadata,accounts,{...config,unexpected:true}));
});
test('R2 unit: disk zero alone cannot assert upload/writer quietness; zeroB/link/dir all hold',async()=>{
 const p=await import('../scripts/recover-auth-local.mjs');assert.equal(p.validateZeroStorageEntries([]),true);for(const entry of [{bytes:0,type:'file'},{type:'directory'},{type:'symlink'},{type:'unknown'}])assert.throws(()=>p.validateZeroStorageEntries([entry]));
 const g=await import('../scripts/local-guard.mjs');assert.throws(()=>g.validateRuntimePolicyQuiescence({rows:[],operators:[],pending:{},storage:{entries:0}}));
});
test('R2 unit: known owned-workflow quietness derived from indexed terminal pre-create stages',async()=>{
 const p=await import('../scripts/recover-auth-local.mjs'),g=await import('../scripts/local-guard.mjs');const operators=[15456,23741].map(pid=>({pid,mode:'runtime-recovery-live',exit:{code:1,signal:null},close:{code:1,signal:null},signals:[]})),phases=operators.map(()=>({status:'HOLD',reason:'STARTUP_HOLD_HTTP_DEADLINE',before:{documents:4443}}));
 const derived=p.deriveRuntimePolicyOwnedWorkflow(operators,phases);assert.ok(derived.every(actor=>actor.authCreate===false && actor.exportStarted===false));
 for(const field of ['readiness','auth','partialCreate','smoke','custody']){const bad=structuredClone(phases);bad[1][field]={};assert.throws(()=>p.deriveRuntimePolicyOwnedWorkflow(operators,bad));}
 assert.throws(()=>p.deriveRuntimePolicyOwnedWorkflow([{...operators[0],close:null},operators[1]],phases));
 const rows=[{pid:15465,ppid:1,pgid:15465,start:g.RETAINED_RECOVERY.start,kind:'cli'},{pid:15525,ppid:15465,pgid:15465,start:g.RETAINED_RECOVERY.jvmStart,kind:'rules-jvm'}],pending={create:false,export:false,hubWriter:false,coverage:'SOURCE_BOUND_WORKFLOW_ONLY'},storage={entries:0,knownActiveUpload:false,pendingStagingWriter:false,coverage:'SOURCE_BOUND_RETAINED_DISK_AND_KNOWN_OWNED_REQUESTS'};
 assert.equal(g.validateRuntimePolicyQuiescence({rows,operators:derived,pending,storage}),true);
 for(const changed of [{rows:[...rows,{pid:99,kind:'http-worker'}]},{pending:{...pending,hubWriter:'UNKNOWN'}},{storage:{...storage,knownActiveUpload:'UNKNOWN'}},{storage:{...storage,entries:1}},{storage:{...storage,coverage:'UNKNOWN'}}])assert.throws(()=>g.validateRuntimePolicyQuiescence({rows,operators:derived,pending,storage,...changed}));
});
test('R2 unit: one exact SIGINT decision refuses unknown state, generation drift or second attempt',async()=>{
 const p=await import('../scripts/local-guard.mjs'),preflight={status:'PASS_PRESERVATION_ONLY',pid:15465,pgid:15465,start:p.RETAINED_RECOVERY.start,zeroUsers:true,zeroTenants:true,zeroStorage:true,knownQuiet:true},value={target:15465,phase:'02d',admitted:true,attempts:0,preflight};
 assert.deepEqual(p.validateRuntimePolicySignal(value),{pid:15465,signal:'SIGINT',maxCount:1});for(const changed of [{attempts:1},{target:65804},{admitted:false},{phase:'02c'},{preflight:{...preflight,start:'changed'}},{preflight:{...preflight,zeroUsers:false}},{preflight:{...preflight,knownQuiet:'UNKNOWN'}}])assert.throws(()=>p.validateRuntimePolicySignal({...value,...changed}));
});
test('R2 unit: old group/JVM/listener absence is independent of allgreen/exit code',async()=>{
 const p=await import('../scripts/local-guard.mjs');assert.equal(p.validateRuntimePolicyAbsence({rows:[{pid:65804,pgid:65804}],listeners:[],externalUnchanged:true}),true);
 for(const changed of [{rows:[{pid:15465,pgid:9}]},{rows:[{pid:15525,pgid:15465}]},{rows:[{pid:99,pgid:15465}]},{listeners:[{pid:999,port:9199}]},{externalUnchanged:'UNKNOWN'},{rows:null}])assert.throws(()=>p.validateRuntimePolicyAbsence({rows:[],listeners:[],externalUnchanged:true,...changed}));
});
test('R2 unit: trace strips query/body/credentials and only fixed probe/state/status metadata',async()=>{
 const p=await import('../scripts/recover-auth-local.mjs');const value=p.runtimeProbeTrace(p.RECOVERY_URLS.signin,'BEGIN');assert.equal(value.method,'POST');assert.equal(value.component,'auth');assert.equal(value.pathname.includes('?'),false);assert.equal(Object.keys(value).some(key=>['body','headers','query','token','password'].includes(key)),false);
 assert.throws(()=>p.runtimeProbeTrace('http://example.invalid/','BEGIN'));assert.throws(()=>p.runtimeProbeTrace(p.RECOVERY_URLS.hub,'COMPLETED',{status:'200'}));assert.throws(()=>p.runtimeProbeTrace(p.RECOVERY_URLS.hub,'REFUSED',{reason:'raw secret arbitrary'}));
});
test('R2 unit: process observers use explicit query timezone without changing runtime TZ',()=>{
 const source=readFileSync(path.join(ROOT,'scripts/local-guard.mjs'),'utf8');assert.match(source,/TZ:'Asia\/Ho_Chi_Minh'/);assert.match(source,/observerTimeZone:'Asia\/Ho_Chi_Minh'/);assert.doesNotMatch(source,/process\.env\.TZ\s*=/);
 console.log('R2_OFFLINE_TEST_ATTRIBUTION '+JSON.stringify({argv:process.argv,execArgv:process.execArgv,nodeTestContext:process.env.NODE_TEST_CONTEXT}));
});

test('R2 unit: registered CLI and worker share the actual tuple-preserving mapping boundary',async()=>{
 const p=await import('../scripts/local-guard.mjs'),canonical=path.join(runRoot,'tmp/fire_emu_0123456789abcdef.sock'),cwd=path.join(ROOT,'cms-api'),seen=[],socket={connect(...args){seen.push({self:this,args});return this;}},callback=()=>{};
 p.installRegisteredRecoveryConnectAdapter(socket,runRoot,cwd,new Set([canonical]));const tuple=net._normalizeArgs([{path:canonical},callback]);const symbols=Object.getOwnPropertySymbols(tuple);assert.equal(socket.connect(tuple),socket);assert.equal(seen[0].args[0],tuple);assert.equal(tuple[1],callback);assert.deepEqual(Object.getOwnPropertySymbols(tuple),symbols);assert.equal(path.resolve(cwd,tuple[0].path),canonical);assert.throws(()=>socket.connect({path:path.join(runRoot,'tmp/fire_emu_aaaaaaaaaaaaaaaa.sock')}));
 const source=readFileSync(path.join(ROOT,'scripts/local-guard.mjs'),'utf8');assert.match(source,/installRegisteredRecoveryConnectAdapter\(net\.Socket\.prototype,runRoot,cwd,sockets\)/);
});

test('R2 unit: original credential/proxy/config/loader/runtime caller is refused before projection',async()=>{
 const p=await import('../scripts/local-guard.mjs');assert.equal(p.validateRuntimePolicyCallerEnvironment({HOME:'/synthetic',PATH:'/usr/bin'}),true);
 for(const key of ['FIREBASE_TOKEN','GOOGLE_APPLICATION_CREDENTIALS','HTTP_PROXY','https_proxy','FIREBASE_WEBAPP_CONFIG','NODE_OPTIONS','NODE_PATH','NODE_TLS_REJECT_UNAUTHORIZED','PINKY_RECOVERY_RUNTIME','PINKY_RUNTIME_POLICY_CONTROL','JAVA_TOOL_OPTIONS','FIREBASE_STORAGE_EMULATOR_BINARY_PATH']){let factoryCalls=0;assert.throws(()=>{p.validateRuntimePolicyCallerEnvironment({[key]:'synthetic-hostile'});factoryCalls++;});assert.equal(factoryCalls,0);}
 for(const input of [{GCLOUD_PROJECT:'real-project'},{FIREBASE_AUTH_EMULATOR_HOST:'remote:9099'},{FIREBASE_CONFIG:'{"projectId":"remote"}'}])assert.throws(()=>p.validateRuntimePolicyCallerEnvironment(input));
 const source=readFileSync(path.join(ROOT,'scripts/local-guard.mjs'),'utf8'),part=source.slice(source.indexOf('export function createRuntimePolicyOperator'),source.indexOf('export function observeRuntimePolicyRetained'));assert.ok(part.indexOf('validateRuntimePolicyCallerEnvironment')<part.indexOf('childEnvironment(input)'));assert.ok(part.indexOf('assertRecoveryMetadata')<part.indexOf('mkdirSync(parent'));
});
test('R2 unit: source-created control root/parent generation refuses manual caller or unknown launcher',async()=>{
 const p=await import('../scripts/local-guard.mjs'),plan=p.runtimePolicyOperatorPlan('runtime-policy-control'),parent={pid:111,ppid:110,pgid:111,start:'Mon Oct 12 17:00:00 2026'},admission={selector:'runtime-policy-control',phase:'02b',pid:110,controlRoot:runRoot},operator={selector:'runtime-policy-control',controlRoot:runRoot,pid:111,ppid:110,argv:[plan.node,...plan.args],generation:parent,exit:null,close:null};
 assert.equal(p.validateRuntimePolicyControlOwnership(admission,operator,parent,runRoot),true);for(const changed of [{...operator,generation:null},{...operator,close:{code:0}},{...operator,controlRoot:'/tmp/manual'},{...operator,generation:{...parent,start:'changed'}},{...operator,ppid:999}])assert.throws(()=>p.validateRuntimePolicyControlOwnership(admission,changed,parent,runRoot));assert.throws(()=>p.validateRuntimePolicyControlOwnership({...admission,pid:999},operator,parent,runRoot));
});

test('R2 unit: inherited expired workflow budget refuses before DB/Auth live factories',async()=>{
 const p=await import('../scripts/recover-auth-local.mjs');let reads=0,creates=0;const db={getAll(){reads++;throw new Error('should not run');},collection(){return {doc:uid=>({uid})};}},auth=fakeAuth();auth.listUsers=async()=>{reads++;return {users:[]};};auth.createUser=async()=>{creates++;throw new Error('should not run');};
 await assert.rejects(p.inventoryHistory(db,{}, {deadlineAt:Date.now()-1}));await assert.rejects(p.reconstructMissing(auth,'synthetic',{deadlineAt:Date.now()-1}));assert.equal(reads,0);assert.equal(creates,0);
});

test('R2 historical unit: fixed original HOLD index cannot bless simultaneous member/index drift',async()=>{
 const p=await import('../scripts/local-guard.mjs'),{createHash}=await import('node:crypto'),digest=bytes=>createHash('sha256').update(bytes).digest('hex');
 const indexPath=path.join(ROOT,'.local/cache/m3/runtime-recovery/01Rb-2e1a90bb-6820-45a4-85e3-9e0d493e1ebb/evidence-index.json'),indexBytes=readFileSync(indexPath),index=JSON.parse(indexBytes),memberPath=path.join(ROOT,p.RUNTIME_POLICY_HISTORY['original-owner'].relative),record=index.files.find(value=>value.path===memberPath),memberBytes=readFileSync(memberPath);
 const metadata=(target,bytes)=>({path:target,type:'regular',mode:0o600,links:1,uid:process.getuid(),bytes:bytes.length});
 const indexMetadata=metadata(indexPath,indexBytes),memberMetadata=metadata(memberPath,memberBytes);assert.doesNotThrow(()=>p.validateRuntimePolicyHistorical('original-owner',indexBytes,indexMetadata,memberBytes,memberMetadata));
 // Attack has identical byte counts, plausible types/modes and a consistent
 // forged memberSHA. Only the independently fixed index authority rejects it.
 const fake=Buffer.alloc(memberBytes.length,32);Buffer.from('{"pid":65804,"pgid":65804}').copy(fake);const poison=Buffer.from(indexBytes.toString().replace(record.sha256,digest(fake)));assert.equal(poison.length,indexBytes.length);
 assert.equal(JSON.parse(poison).files.find(value=>value.path===memberPath).sha256,digest(fake));
 assert.throws(()=>p.validateRuntimePolicyHistorical('original-owner',poison,indexMetadata,fake,memberMetadata),/fixed historical index identity/);
});
test('R2 historical unit: original owner and before phase refuse type/link/mode/UID/hash drift',async()=>{
 const p=await import('../scripts/local-guard.mjs'),indexPath=path.join(ROOT,'.local/cache/m3/runtime-recovery/01Rb-2e1a90bb-6820-45a4-85e3-9e0d493e1ebb/evidence-index.json'),indexBytes=readFileSync(indexPath),indexMetadata={path:indexPath,type:'regular',mode:0o600,links:1,uid:process.getuid(),bytes:indexBytes.length};
 for(const key of ['original-owner','original-phase']){
  const target=path.join(ROOT,p.RUNTIME_POLICY_HISTORY[key].relative),bytes=readFileSync(target),metadata={path:target,type:'regular',mode:0o600,links:1,uid:process.getuid(),bytes:bytes.length};
  assert.doesNotThrow(()=>p.validateRuntimePolicyHistorical(key,indexBytes,indexMetadata,bytes,metadata));
  for(const change of [{type:'symlink'},{type:'fifo'},{links:2},{mode:0o644},{uid:process.getuid()+1},{path:'/private/tmp/foreign'},{bytes:bytes.length+1}])assert.throws(()=>p.validateRuntimePolicyHistorical(key,indexBytes,indexMetadata,bytes,{...metadata,...change}));
  const bad=Buffer.from(bytes);bad[0]^=1;assert.throws(()=>p.validateRuntimePolicyHistorical(key,indexBytes,indexMetadata,bad,metadata));
 }
 for(const change of [{type:'symlink'},{mode:0o644},{links:2},{uid:process.getuid()+1},{path:'/private/tmp/foreign-index'}])assert.throws(()=>p.validateRuntimePolicyHistorical('original-owner',indexBytes,{...indexMetadata,...change},Buffer.from('{}'),{}));
 assert.throws(()=>p.readRuntimePolicyHistorical('__proto__'));assert.throws(()=>p.readRuntimePolicyHistorical('caller-index-path'));
});
test('R2 historical unit: all runtime consumers route fixed original authority before owner/history use',()=>{
 const guard=readFileSync(path.join(ROOT,'scripts/local-guard.mjs'),'utf8'),recover=readFileSync(path.join(ROOT,'scripts/recover-auth-local.mjs'),'utf8'),observer=guard.slice(guard.indexOf('export function observeRuntimePolicyRetained'),guard.indexOf('export function runtimePolicyNativeSnapshot'));
 assert.match(observer,/readRuntimePolicyHistorical\('original-owner'\)/);assert.match(observer,/readRuntimePolicyHistorical\('original-close'\)/);assert.doesNotMatch(observer,/JSON\.parse\(readOwnedSource/);
 const r2=recover.slice(recover.indexOf('function fixedOldOperators'));
 assert.equal([...r2.matchAll(/runtimePolicySyncStage\((?:trace|receipt\.trace),'HISTORY_ORIGINAL',\(\)=>readRuntimePolicyHistorical\('original-phase'\)\)\.before/g)].length,2);assert.doesNotMatch(r2,/JSON\.parse\(readFileSync\(path\.join\(ROOT,'\.local\/cache\/m3\/runtime-recovery\/01Rb-2e1/);
 assert.doesNotMatch(recover,/function readPolicyIndexedFile/);
});


test('R2 trace unit: fixed stages record sync/async completion and invoke each factory once',async()=>{
 const p=await import('../scripts/recover-auth-local.mjs'),trace=[];let calls=0;
 assert.equal(p.runtimePolicySyncStage(trace,'SOURCE',()=>{calls++;return 7;}),7);
 assert.equal(await p.runtimePolicyAsyncStage(trace,'SDK_LOAD',async()=>{calls++;return 8;}),8);
 assert.equal(calls,2);assert.deepEqual(trace,[{stage:'SOURCE',state:'BEGIN'},{stage:'SOURCE',state:'COMPLETED'},{stage:'SDK_LOAD',state:'BEGIN'},{stage:'SDK_LOAD',state:'COMPLETED'}]);
});
test('R2 trace unit: refusal never becomes completion or leaks error data',async()=>{
 const p=await import('../scripts/recover-auth-local.mjs'),trace=[];let calls=0;const error=Object.assign(new Error('synthetic private body token stack'),{code:'R2_HISTORY_UNKNOWN'});
 assert.throws(()=>p.runtimePolicySyncStage(trace,'OWNERSHIP',()=>{calls++;throw error;}),value=>value===error);
 await assert.rejects(p.runtimePolicyAsyncStage(trace,'HISTORY',async()=>{calls++;throw error;}),value=>value===error);
 assert.equal(calls,2);assert.deepEqual(trace,[{stage:'OWNERSHIP',state:'BEGIN'},{stage:'OWNERSHIP',state:'REFUSED'},{stage:'HISTORY',state:'BEGIN'},{stage:'HISTORY',state:'REFUSED'}]);
 assert.equal(p.runtimePolicyFailureReason(error),'R2_HISTORY_UNKNOWN');assert.equal(p.runtimePolicyFailureReason(new Error('ownership-looking secret')),'R2_UNCLASSIFIED_FAILURE');assert.equal(p.runtimePolicyFailureReason({name:'ReferenceError',message:'SDK secret'}),'R2_UNCLASSIFIED_FAILURE');assert.ok(!JSON.stringify(trace).includes('synthetic'));
});
test('R2 trace unit: unknown stage/cap/invalid factory refuse before invocation',async()=>{
 const p=await import('../scripts/recover-auth-local.mjs');let calls=0;const factory=()=>{calls++;};
 assert.throws(()=>p.runtimePolicySyncStage([],'caller-stage',factory),/R2_TRACE_POLICY/);
 await assert.rejects(p.runtimePolicyAsyncStage([],'caller-stage',factory),/R2_TRACE_POLICY/);
 assert.throws(()=>p.runtimePolicySyncStage(Array.from({length:255},()=>({stage:'SOURCE',state:'BEGIN'})),'SOURCE',factory),/R2_TRACE_POLICY/);
 await assert.rejects(p.runtimePolicyAsyncStage(null,'SOURCE',factory),/R2_TRACE_POLICY/);
 assert.throws(()=>p.runtimePolicySyncStage([],'SOURCE',null),/R2_TRACE_POLICY/);assert.equal(calls,0);
});
test('R2 trace unit: sync factory returning a thenable cannot report completion',async()=>{
 const p=await import('../scripts/recover-auth-local.mjs'),trace=[];let calls=0;
 assert.throws(()=>p.runtimePolicySyncStage(trace,'ENVIRONMENT',()=>{calls++;return {then(){assert.fail('no invocation');}};}),/R2_TRACE_POLICY/);
 assert.equal(calls,1);assert.deepEqual(trace,[{stage:'ENVIRONMENT',state:'BEGIN'},{stage:'ENVIRONMENT',state:'REFUSED'}]);
});

test('R2 trace unit: root/history-original/FieldPath failures have only fixed refusal markers',async()=>{
 const p=await import('../scripts/recover-auth-local.mjs');let calls=0;
 for(const stage of ['ROOT','HISTORY_ORIGINAL','SDK_FIRESTORE']){const trace=[];assert.throws(()=>p.runtimePolicySyncStage(trace,stage,()=>{calls++;throw new Error('synthetic private path/SDK details');}));assert.deepEqual(trace,[{stage,state:'BEGIN'},{stage,state:'REFUSED'}]);}
 assert.equal(calls,3);
});
