/** CMS-RECOVERY-001 leaf policy. Ordinary imports do not launch or load an SDK. */
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import {createHash,randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync,lstatSync,realpathSync,readdirSync} from 'node:fs';
import {createRequire,syncBuiltinESMExports} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {ApiError,errorEnvelope} from '../contracts/errors.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const guardPath=path.join(ROOT,'scripts/local-guard.mjs');
const PROJECT='demo-pinky-lamb-cms';
const SOURCE=path.join(ROOT,'cms-recovery-api');
const CONFIG=path.join(ROOT,'infra-local/firebase.m2-recovery.json');
const NODE=path.join(ROOT,'.local/cache/node/node-v22.23.3-darwin-arm64/bin/node');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const fail=reason=>{throw new Error(`M2_RECOVERY_HOLD: ${reason}`);};
export const M2_REVISION=2;
export const M2_CACHE_ROOT='.local/cache/cms-recovery-001/v2';
export const M2_AMENDMENT_ROOT='.local/cache/cms-recovery-001/v2/disk-custody-fix';
export const M2_AMENDMENT_PINS=Object.freeze({approval:'6e2deee1735742a15b27f1f633c7d8ace52182412d3660325ad8e0be410a689f',manifest:'934450fb8941a0fcf71f75da78dd70873afa9387ce9359111740ef7e92c4131d',completion:'328699a9d62cc6ad664fd4b78d3721a5a0cd361eaaa56de371aac60024fc7881',closure:'4b4b43f734c95f685e6a4885bb492655d3bcca4105e484beb490866ce2fd58ba'});
export const M2_VITE_ROOT='.local/cache/cms-recovery-001/v2/vite-fix';
export const M2_VITE_PINS=Object.freeze({approval:'861136c7418320c6675f0ae519a3eaacca651204a1ad43f06ef2741332c19b0b',completion:'92ef972817563f341a80f08703f122d34be5b7b3f89c72c6cd2a71f61ac77701',closure:'1a02b017e7f1641f2ddf979f7036bcffd0a69c485c3874a5a6c02cfd87661156',base:'6845d1263951b85b99efb6290d60d90d9e7ad65ed81d4da6aeb9e9ede7fccd54'});
export const M2_HISTORICAL_LINK_MANIFEST=`${M2_AMENDMENT_ROOT}/ops/symlink-manifest-0be62cea-e7e7-42fc-a73e-3c0a4d240397/symlink-manifest.json`;
export const M2_PORTS=Object.freeze({auth:9098,functions:5002,hub:4401,logging:4501,eventarc:9298,tasks:9498});
export const M2_SOURCE_PATHS=Object.freeze(['scripts/local-guard.mjs','scripts/m2-recovery-profile.mjs','scripts/m2-recovery-local.mjs','infra-local/firebase.m2-recovery.json','cms-recovery-api/package.json','cms-recovery-api/index.mjs','tests/m2-recovery.test.mjs','vite.config.mjs','admin/config-local.mjs']);
export const M2_CLOSURE_PATHS=Object.freeze([
 'package.json','package-lock.json','cms-api/package.json',
 ...['authorization','routes','drafts','import-site','site-drafts','snapshots','site-snapshots','source-checks','reviews','site-reviews'].map(n=>`cms-api/${n}.mjs`),
 ...['content-version','draft','errors','hero','site-draft','site-records','site-settings','site','source-checks'].map(n=>`contracts/${n}.mjs`),
 ...['baseline-provenance','baseline-site','legacy-assets'].map(n=>`contracts/${n}.json`),
 ...['hero-renderer','site-renderer','site-sections','site-public-data','site-interactions'].map(n=>`preview/${n}.mjs`),
 'scripts/map-baseline-site.mjs','scripts/recover-auth-local.mjs',
 'node_modules/firebase-admin/package.json','node_modules/firebase-admin/lib/app/index.js','node_modules/firebase-admin/lib/auth/index.js','node_modules/firebase-admin/lib/firestore/index.js',
 'node_modules/firebase-functions/lib/v2/providers/https.js','node_modules/firebase-functions/lib/common/providers/https.js','node_modules/zod/package.json'
]);
const CLI_PINS=Object.freeze({
 'firebase-tools/package.json':'bdc585a7498b51fe16e7af54882c3113208f23a775e9d1a37f9dc3b51539a8c8',
 'firebase-tools/lib/config.js':'e0ffd09b3d65c180bd3e0a342801c8a014b211c47893566a6a64874b38480c04',
 'firebase-tools/lib/emulator/controller.js':'86a3411bbb68a6e6c031e79f921b545045618471fd373e16cf6621f67011a946',
 'firebase-tools/lib/emulator/functionsEmulator.js':'0704e9b033e25ab8b32a572c0a8d040627edc7bf5d72f9bba83b51447db7ccad',
 'firebase-tools/lib/emulator/functionsEmulatorRuntime.js':'224e604c745fd538ce13b56ea651aa9c955cd32b8e629d8e118f6564c6f9c50a',
 'firebase-tools/lib/deploy/functions/runtimes/node/index.js':'adc89488bb4c87808e90a54b94606c31873c010c24f76ca2b867bf2bfe8ccfa1',
 'firebase-tools/lib/emulator/env.js':'67d2b363b2335f122193cf1a678a7b516f08321d19b8f415ca5b18bb3cf86a3b',
 'firebase-tools/lib/emulator/hub.js':'0c111df0bbba9f26d8c91af1a6c15f0edd3b4ccca26478365a8bfd6bd685c1cc',
 'firebase-tools/lib/emulator/hubExport.js':'a94bdf8edda5bd2d21aabe80f53b5f4601b967475ea0055558549ab19e17d009',
 'firebase-tools/lib/emulator/hubClient.js':'02f4ebd0f6dc9b463fe8aa039b3592da4297f8a8e7d615de708341bf57000994',
 'firebase-tools/lib/emulator/auth/index.js':'6f46a45892a0c6fc2da4066409deddd0b2c844b70a4839f6f8d83b9b4140f84e',
 'firebase-tools/lib/emulator/auth/server.js':'40f4d7c16aca84829ee502f4bfebc84fb50ad2893650011f268c0b6e1f27c1a7',
 'firebase-tools/lib/emulator/auth/operations.js':'1e79b9f5af411485143bc8baa3ef6f609b6d4cf03d86daecb4d781391f5186f4',
 'firebase-functions/package.json':'abf948edce3e9c6da26008569b03c1f7218ee857820e45d3c5f53e1304eac5e0',
 'firebase-functions/lib/bin/firebase-functions.js':'2f4878ce52cb8edab06ecc52f7f70205b8ed37985fb5a7e566040bc83350f864',
 'body-parser/package.json':'1545e5c4868c2b733fce76a1210c3d6de17322f464de04ba8975dc94b0ffd80d',
 'body-parser/index.js':'9c6c900e7e85fb599c62d9b9e4dfd2ea2f61d119dce5ed69ac3a8da828819241',
 'body-parser/lib/types/raw.js':'14548e46265ba5d67d6ce727fbe6f2ede1c1706b73a541502fc309b13d4fa5c1',
 'body-parser/lib/read.js':'1e9e274755366c39ae70e8b9a7a42fc12219566e67efaf9b7ebc2a8b337f5b6b'
});
const FORBIDDEN_INPUT=['GOOGLE_APPLICATION_CREDENTIALS','FIREBASE_TOKEN','FIREBASE_WEBAPP_CONFIG','NODE_OPTIONS','NODE_PATH','NODE_EXTRA_CA_CERTS','NODE_TLS_REJECT_UNAUTHORIZED','HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','http_proxy','https_proxy','all_proxy','npm_config_proxy','npm_config_https_proxy','JAVA_TOOL_OPTIONS','JDK_JAVA_OPTIONS','_JAVA_OPTIONS','PINKY_RECOVERY_RUNTIME','PINKY_STORAGE_RUNTIME','PINKY_RUNTIME_POLICY_SELECTOR','PINKY_NETWORK_FENCE','PINKY_M2_RECOVERY_RUNTIME'];

export function m2Read(relative,cap=1024*1024,{privateFile=false}={}){
 if(typeof relative!=='string' || relative.startsWith('/') || relative.split('/').some(x=>!x || x==='.' || x==='..'))fail('source path');
 let p=ROOT;
 for(const segment of relative.split('/')){p=path.join(p,segment);if(lstatSync(p).isSymbolicLink() || realpathSync(p)!==p)fail('symlink or escaped source');}
 const s=lstatSync(p);
 if(!s.isFile() || s.nlink!==1 || s.size>cap || s.uid!==process.getuid() || privateFile && (s.mode&0o777)!==0o600)fail('source type/size/owner/mode');
 return readFileSync(p);
}
export function m2Root(token){
 if(typeof token!=='string' || !/^[A-Za-z0-9_-]{22}$/.test(token))fail('immutable attempt token');
 return path.join(ROOT,'.local/cache/cms-recovery-001/v2/runs',token);
}
function checkRoot(root){if(typeof root!=='string' || m2Root(path.basename(root))!==root)fail('new owned root');return root;}
export function validateM2Config(value){
 const expected={functions:[{source:'cms-recovery-api',codebase:'cms-recovery-local',runtime:'nodejs22',ignore:['node_modules','.git','*.log']}],emulators:{...Object.fromEntries(Object.entries(M2_PORTS).map(([name,port])=>[name,{host:'127.0.0.1',port}])),ui:{enabled:false},singleProjectMode:true}};
 if(!same(value,expected))fail('fixed Auth/Functions configuration');return true;
}
export function m2Environment(root,input={}){
 checkRoot(root);for(const key of FORBIDDEN_INPUT)if(input[key]!==undefined)fail(`inherited setting ${key}`);
 if(typeof process.env.HOME!=='string' || !path.isAbsolute(process.env.HOME) || input.HOME!==undefined && input.HOME!==process.env.HOME)fail('preserve actual parent HOME');
 const env={PATH:`${path.dirname(NODE)}:/usr/bin:/bin:/usr/sbin:/sbin`,LANG:'en_US.UTF-8',HOME:process.env.HOME,CI:'1',NO_UPDATE_NOTIFIER:'1',METADATA_SERVER_DETECTION:'none',GCLOUD_PROJECT:PROJECT,GOOGLE_CLOUD_PROJECT:PROJECT,FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9098',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080',PINKY_FUNCTIONS_EMULATOR_HOST:'127.0.0.1:5002',PINKY_HOSTING_EMULATOR_HOST:'127.0.0.1:5010',PINKY_M2_RECOVERY_RUNTIME:root,NODE_OPTIONS:`--import=${pathToFileURL(guardPath).href}`,START_LOGGING_EMULATOR:'true',FIREBASE_FUNCTIONS_DISCOVERY_OUTPUT_PATH:path.join(root,'discovery'),FIREBASE_DEBUG_PATH:path.join(root,'firebase-debug.log'),XDG_CONFIG_HOME:path.join(root,'config'),XDG_CACHE_HOME:path.join(root,'cache'),XDG_DATA_HOME:path.join(root,'data'),FIREBASE_EMULATORS_PATH:path.join(ROOT,'.local/cache/emulators')};
 for(const key of ['TMPDIR','TMP','TEMP'])env[key]=path.join(root,'tmp');
 env.FIREBASE_CONFIG=JSON.stringify({projectId:PROJECT});return env;
}
export function validateM2RecoveryRuntime(env){
 const root=checkRoot(env.PINKY_M2_RECOVERY_RUNTIME),expected=m2Environment(root);
 for(const key of FORBIDDEN_INPUT.filter(key=>!['NODE_OPTIONS','PINKY_M2_RECOVERY_RUNTIME'].includes(key)))if(env[key]!==undefined)fail(`forbidden runtime ${key}`);
 for(const key of Object.keys(expected).filter(key=>!['PATH','LANG','FIREBASE_CONFIG'].includes(key)))if(env[key]!==expected[key])fail(`fixed runtime ${key}`);
 if(env.PATH!==expected.PATH || !['en_US.UTF-8','C','C.UTF-8'].includes(env.LANG))fail('fixed runtime PATH/LANG');
 const firebase=JSON.parse(env.FIREBASE_CONFIG??'null');
 if(!firebase || Array.isArray(firebase) || Object.keys(firebase).some(key=>!['projectId','storageBucket'].includes(key)) || firebase.projectId!==PROJECT || firebase.storageBucket!==undefined && firebase.storageBucket!==`${PROJECT}.appspot.com`)fail('demo autoconfig');
 for(const key of ['FIREBASE_STORAGE_EMULATOR_HOST','CLOUD_STORAGE_EMULATOR_HOST','FIREBASE_DATABASE_EMULATOR_HOST','CLOUD_RUNTIME_CONFIG','__FIREBASE_FRAMEWORKS_ENTRY__'])if(env[key]!==undefined)fail('unapproved service/config');
 return true;
}
export function m2Plan(root){
 checkRoot(root);return {node:NODE,args:['--max-old-space-size=256',path.join(ROOT,'node_modules/firebase-tools/lib/bin/firebase.js'),'emulators:start','--project',PROJECT,'--config',CONFIG,'--only','auth,functions','--non-interactive'],cwd:path.join(root,'cwd')};
}
export function m2SocketPath(socket,cwd,root){
 checkRoot(root);
 if(typeof socket!=='string' || path.dirname(socket)!==path.join(root,'tmp') || !/^fire_emu_[a-f0-9]{16}\.sock$/.test(path.basename(socket)) || ![SOURCE,path.join(root,'cwd')].includes(cwd))fail('unregistered Unix socket');
 const relative=path.relative(cwd,socket);if(Buffer.byteLength(relative)>103 || path.resolve(cwd,relative)!==socket)fail('native Unix path budget');return relative;
}
export function validateM2Profile({entry,argv,execArgv,cwd,env}){
 validateM2RecoveryRuntime(env);const root=env.PINKY_M2_RECOVERY_RUNTIME;
 const plan=m2Plan(root),worker=path.join(ROOT,'node_modules/firebase-tools/lib/emulator/functionsEmulatorRuntime');
 if(entry===plan.args[1] && same(argv,plan.args.slice(1)) && same(execArgv,['--max-old-space-size=256']) && cwd===plan.cwd)return 'cli';
 if([worker,`${worker}.js`].includes(entry) && same(argv,[entry]) && execArgv.length===0 && cwd===SOURCE && env.FUNCTIONS_EMULATOR==='true' && env.FUNCTION_TARGET==='cmsApi' && env.FUNCTION_SIGNATURE_TYPE==='http' && env.FUNCTIONS_CONTROL_API===undefined){m2SocketPath(env.PORT,cwd,root);return 'worker';}
 const discovery=[path.join(ROOT,'node_modules/firebase-functions/lib/bin/firebase-functions.js'),path.join(ROOT,'node_modules/.bin/firebase-functions')];
 if(discovery.includes(entry) && same(argv,[entry,SOURCE]) && execArgv.length===0 && cwd===SOURCE && env.FUNCTIONS_CONTROL_API==='true' && env.FUNCTIONS_MANIFEST_OUTPUT_PATH===path.join(root,'discovery/functions.yaml') && env.PORT==='80' && env.FUNCTION_TARGET===undefined)return 'discovery';
 fail('unknown native process profile');
}
export function m2Sources(){return M2_SOURCE_PATHS.map(relative=>{const bytes=m2Read(relative);return {path:relative,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};});}
export function m2UiSources(){return [...m2Sources(),...['admin/auth.mjs','admin/site-editor.mjs','admin/review.mjs','admin/source-review.mjs','tests/m2-recovery.local.test.mjs'].map(relative=>{const bytes=m2Read(relative);return {path:relative,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};})];}
export function m2ClosureSources(){return M2_CLOSURE_PATHS.map(relative=>{const bytes=m2Read(relative,8*1024*1024);return {path:relative,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};});}
export function validateM2Catalog(value){
 const id=x=>typeof x==='string' && /^[A-Za-z0-9_-]{1,128}$/.test(x),hash=x=>typeof x==='string' && /^[a-f0-9]{64}$/.test(x);
 if(!value || Object.keys(value).some(k=>!['task','revision','projectId','resourceId','draftRevision','snapshots','beforeInventoryHash'].includes(k)) || value.task!=='CMS-RECOVERY-001' || value.revision!==2 || value.projectId!==PROJECT || value.resourceId!=='home-v2' || !Number.isSafeInteger(value.draftRevision) || value.draftRevision<0 || !hash(value.beforeInventoryHash) || !Array.isArray(value.snapshots) || value.snapshots.length>20000)throw new ApiError('LOCAL_RUNTIME_UNAVAILABLE');
 const ids=new Set();
 for(const s of value.snapshots){
  if(!s || Object.keys(s).some(k=>!['id','contentHash','sourceCheckIds'].includes(k)) || !id(s.id) || ids.has(s.id) || !hash(s.contentHash) || !Array.isArray(s.sourceCheckIds) || s.sourceCheckIds.length>20000 || s.sourceCheckIds.some(x=>!id(x)) || new Set(s.sourceCheckIds).size!==s.sourceCheckIds.length)throw new ApiError('LOCAL_RUNTIME_UNAVAILABLE');ids.add(s.id);
 }
 return value;
}
export function readM2Catalog(){
 const root=checkRoot(process.env.PINKY_M2_RECOVERY_RUNTIME),catalog=JSON.parse(m2Read(`${path.relative(ROOT,root)}/read-catalog.json`,8*1024*1024,{privateFile:true}));
 return validateM2Catalog(catalog);
}
export function validateM2ReadRequest(request,catalog){
 if(request.method!=='GET')throw new ApiError('METHOD_NOT_ALLOWED');
 if(request.headers?.origin!==undefined && request.headers.origin!=='http://127.0.0.1:5175')throw new ApiError('FORBIDDEN');
 if(request.rawBody?.byteLength || request.body && Object.keys(request.body).length)throw new ApiError('BAD_REQUEST');
 const url=new URL(request.originalUrl??request.url,'http://127.0.0.1'),pathname=request.path??url.pathname;
 const source=/^\/api\/cms\/snapshots\/([A-Za-z0-9_-]{1,128})\/source-checks$/.exec(pathname),snapshot=/^\/api\/cms\/snapshots\/([A-Za-z0-9_-]{1,128})$/.exec(pathname);
 if(!['/api/cms/session','/api/cms/drafts/home-v2'].includes(pathname) && !source && !snapshot)throw new ApiError('NOT_FOUND');
 const params=url.searchParams,query=request.query??{};
 if(!source && ([...params].length || Object.keys(query).length))throw new ApiError('BAD_REQUEST');
 if(source){
  for(const key of [...params.keys(),...Object.keys(query)])if(!['cursor','pageSize'].includes(key))throw new ApiError('BAD_REQUEST');
  for(const key of ['cursor','pageSize']){
   const values=params.getAll(key),q=query[key];if(values.length>1 || q!==undefined && typeof q!=='string' || values.length && q!==undefined && q!==values[0])throw new ApiError('VALIDATION_ERROR');
   const value=values[0]??q;if(value===undefined)continue;
   if(key==='cursor'?!/^[A-Za-z0-9_-]{1,2048}$/.test(value):!/^[1-9][0-9]?$/.test(value) || Number(value)>50)throw new ApiError('VALIDATION_ERROR');
  }
 }
 if(pathname!=='/api/cms/session' && catalog!==undefined){
  validateM2Catalog(catalog);if((source || snapshot) && !catalog.snapshots.some(s=>s.id===(source??snapshot)[1]))throw new ApiError('NOT_FOUND');
 }
 return {pathname,snapshotId:(source??snapshot)?.[1]??null,isSession:pathname==='/api/cms/session'};
}
export function createM2ReadOnlyHandler({authorize,dispatchRequest,catalog=readM2Catalog,runtime=()=>validateM2RecoveryRuntime(process.env),observe=()=>{}}){
 if(typeof authorize!=='function' || typeof dispatchRequest!=='function')fail('read-only handler dependencies');
 return async function handleRequest(request,response){
  response.set('Cache-Control','no-store');response.set('X-Content-Type-Options','nosniff');const correlationId=randomUUID();let authorizationStarted=false,dispatchStarted=false;
  try{
   runtime();const route=validateM2ReadRequest(request);
   // Method/path/query refusal precedes token verification and business dispatch.
   authorizationStarted=true;const actor=await authorize(request,'MEMBER_READ');
   if(!route.isSession)validateM2ReadRequest(request,catalog());
   dispatchStarted=true;await dispatchRequest(request,response,actor,correlationId);
  }catch(error){
   const safe=error instanceof ApiError?error:new ApiError('INTERNAL_ERROR');
   if(safe.code==='METHOD_NOT_ALLOWED')observe({kind:'WRITE_DENY',method:request.method,path:request.path,status:405,code:safe.code,authorize_called:authorizationStarted,dispatch_called:dispatchStarted});
   if(safe.code==='UNAUTHENTICATED' && request.method==='GET' && request.path==='/api/cms/session' && request.headers?.authorization===undefined)observe({status:401,code:safe.code,authorizationInput:'ABSENT',authenticatedAuthFirestoreRpc:'NOT_RUN_NO_BEARER'});
   response.status(safe.status).json(errorEnvelope(safe,correlationId));
  }
 };
}
export function validateM2Release(review,sources,baseHash){
 if(!review || review.task!=='CMS-RECOVERY-001' || review.revision!==2 || review.status!=='PASS_CODE_UNIT_ONLY' || review.actual_effort!=='high' || review.reviewer!=='/root/pdf_setup_reviewer' || review.coordinator!=='/root' || review.coordinator_route?.model!=='gpt-6.1-sol' || review.coordinator_route?.effort!=='xhigh' || review.runtime_observation?.model!=='gpt-6.1-sol' || review.runtime_observation?.effort!=='high' || !/^[a-f0-9]{64}$/.test(review.runtime_observation?.turn_context_sha256??'') || review.native_control_release!==true || !same(review.sources,sources) || review.source_base_sha256!==baseHash || !/^[a-f0-9]{64}$/.test(baseHash) || !Number.isFinite(Date.parse(review.reviewed_at_utc)))fail('current source-bound High native release');return true;
}
export function assertM2Amendment(){
 const readPinned=(relative,hash)=>{const bytes=m2Read(relative,1024*1024,{privateFile:true});if(createHash('sha256').update(bytes).digest('hex')!==hash)fail('immutable amendment pin');return JSON.parse(bytes);};
 const approval=readPinned(`${M2_AMENDMENT_ROOT}/approval.json`,M2_AMENDMENT_PINS.approval),closure=readPinned(`${M2_AMENDMENT_ROOT}/closure-high-review.json`,M2_AMENDMENT_PINS.closure),completion=readPinned(`${M2_CACHE_ROOT}/epoch/complete-1.json`,M2_AMENDMENT_PINS.completion);
 if(approval.task!=='CMS-RECOVERY-001' || approval.revision!==2 || approval.status!=='APPROVED' || approval.budget?.previous_launches!==1 || approval.budget.additional_launches_authorized!==1 || approval.budget.cumulative_maximum!==2 || approval.budget.required_additional_attempt!==2 || completion.task!=='CMS-RECOVERY-001' || completion.revision!==2 || completion.number!==1 || completion.status!=='CLOSED_SAFE_NO_PENDING_OR_LIVE_CHILDREN' || completion.approval_sha256!==M2_AMENDMENT_PINS.approval || completion.closure_high_review?.sha256!==M2_AMENDMENT_PINS.closure || closure.status!=='CLOSED_SAFE_NO_PENDING_OR_LIVE_CHILDREN')fail('approved historical slot2 after genuine closure');
 const viteApproval=readPinned(`${M2_VITE_ROOT}/approval.json`,M2_VITE_PINS.approval),viteClosure=readPinned(`${M2_VITE_ROOT}/closure-high-review.json`,M2_VITE_PINS.closure),slot2=readPinned(`${M2_CACHE_ROOT}/epoch/complete-2.json`,M2_VITE_PINS.completion);
 if(viteApproval.task!=='CMS-RECOVERY-001' || viteApproval.revision!==2 || viteApproval.status!=='APPROVED_DIRECT_HUMAN' || viteApproval.previous_used!==2 || viteApproval.additional_cli_launches!==1 || viteApproval.cumulative_maximum!==3 || slot2.task!=='CMS-RECOVERY-001' || slot2.revision!==2 || slot2.number!==2 || slot2.status!=='CLOSED_OWNED_PROCESSES_ABSENT_PRIVATE_EXPORT_PRESERVED' || slot2.approval_sha256!==M2_VITE_PINS.approval || slot2.original_approval_sha256!==M2_AMENDMENT_PINS.approval || slot2.no_pending_known_owned_children!==true || slot2.closure_high_review?.sha256!==M2_VITE_PINS.closure || viteClosure.status!=='PASS_PROCESSES_CLOSED_PRIVATE_EXPORT_PRESERVED_ONLY')fail('approved cumulative slot3 after truthful owned closure');return {approval,completion,closure,viteApproval,viteClosure,slot2};
}
export function readM2HistoricalLinks(){
 const bytes=m2Read(M2_HISTORICAL_LINK_MANIFEST,1024*1024,{privateFile:true});if(createHash('sha256').update(bytes).digest('hex')!==M2_AMENDMENT_PINS.manifest)fail('verified20 historical link pin');
 const value=JSON.parse(bytes);if(value.task!=='CMS-RECOVERY-001' || value.revision!==2 || value.kind!=='EXACT_KNOWN_HISTORICAL_NEGATIVE_FIXTURE_LINKS' || value.count!==20 || value.noTargetDereference!==true || value.noHistoricalMutation!==true || !Array.isArray(value.records) || value.records.length!==20)fail('verified20 manifest schema');return value;
}
export function assertM2Release(){
 assertM2Amendment();const base=m2Read(`${M2_VITE_ROOT}/approved-base.json`,1024*1024,{privateFile:true});
 const review=JSON.parse(m2Read(`${M2_VITE_ROOT}/native-control-release.json`,1024*1024,{privateFile:true}));
 if(createHash('sha256').update(base).digest('hex')!==M2_VITE_PINS.base)fail('immutable Vite approved base');
 validateM2Release(review,m2Sources(),createHash('sha256').update(base).digest('hex'));
 const closure=m2Read(`${M2_CACHE_ROOT}/transition/closure-high-review.json`,1024*1024,{privateFile:true}),closed=JSON.parse(closure);
 if(closed.task!=='CMS-RECOVERY-001' || closed.revision!==2 || closed.status!=='CLOSED_SAFE_NO_PENDING_OR_LIVE_CHILDREN' || closed.reviewer!=='/root/pdf_setup_reviewer' || closed.coordinator!=='/root' || closed.actual_effort!=='high' || review.v1_closure_sha256!==createHash('sha256').update(closure).digest('hex'))fail('v1 safe closure before v2 launch');
 if(review.additional_attempt!==3 || review.amendment_sha256!==M2_VITE_PINS.approval || review.slot2_completion_sha256!==M2_VITE_PINS.completion || review.slot2_closure_sha256!==M2_VITE_PINS.closure || review.symlink_manifest_sha256!==M2_AMENDMENT_PINS.manifest || review.slot1_completion_sha256!==M2_AMENDMENT_PINS.completion || review.slot1_closure_sha256!==M2_AMENDMENT_PINS.closure)fail('source release bound to cumulative slot3 amendment');readM2HistoricalLinks();
 if(!same(review.closure_sources,m2ClosureSources()))fail('current immutable business/package closure');return review;
}
export function assertM2Pins(){
 for(const [relative,hash] of Object.entries(CLI_PINS))if(createHash('sha256').update(m2Read(`node_modules/${relative}`,1024*1024)).digest('hex')!==hash)fail(`pinned primary source ${relative}`);
 const require=createRequire(import.meta.url);if(require('../node_modules/firebase-tools/package.json').version!=='15.33.0' || require('../node_modules/firebase-functions/package.json').version!=='7.4.0')fail('pinned CLI/Functions version');return true;
}
export function assertM2Metadata(){
 for(const dir of [ROOT,SOURCE]){
  if(realpathSync(dir)!==dir)fail('backend source escape');
  for(const name of readdirSync(dir))if(/^(\.env|\.secret|\.runtimeconfig|\.pnp)|^functions\.yaml$/i.test(name))fail('unexpected backend metadata');
 }
 const pkg=JSON.parse(m2Read('cms-recovery-api/package.json',65536));
 if(pkg.main!=='index.mjs' || pkg.type!=='module' || pkg.engines?.node!=='22' || Object.keys(pkg).some(key=>!['name','version','private','type','main','engines','dependencies'].includes(key)) || pkg.private!==true || !same(pkg.dependencies,{'firebase-admin':'14.5.0','firebase-functions':'7.4.0'}))fail('dedicated API package');
 return true;
}
export function assertM2Admission(root){
 checkRoot(root);assertM2Amendment();const prepared=JSON.parse(m2Read(`${path.relative(ROOT,root)}/prepared.json`,1024*1024,{privateFile:true}));
 if(prepared.task!=='CMS-RECOVERY-001' || prepared.revision!==2 || prepared.runRoot!==root || !Number.isSafeInteger(prepared.attemptNumber) || prepared.attemptNumber!==3 || !same(prepared.plan,m2Plan(root)) || !same(prepared.sources,m2Sources()) || !same(prepared.closure_sources,m2ClosureSources()))fail('prepared source-bound attempt');
 const admission=JSON.parse(m2Read(`.local/cache/cms-recovery-001/v2/epoch/attempt-${prepared.attemptNumber}.json`,65536,{privateFile:true}));
 if(admission.task!=='CMS-RECOVERY-001' || admission.revision!==2 || admission.number!==prepared.attemptNumber || admission.runRoot!==root || admission.runToken!==path.basename(root) || admission.attemptId!==prepared.attemptId || admission.status!=='ADMITTED_COMPLETION_UNKNOWN' || admission.approval_sha256!==M2_VITE_PINS.approval || admission.previous_completion_sha256!==M2_VITE_PINS.completion || !same(admission.sources,prepared.sources))fail('atomic active attempt source binding');
 try{m2Read(`.local/cache/cms-recovery-001/v2/epoch/complete-${prepared.attemptNumber}.json`,65536,{privateFile:true});fail('completed attempt cannot relaunch');}catch(error){if(error.code!=='ENOENT')throw error;}
 return prepared;
}
export function validateM2RetainedIdentity(expected,current,now=Date.now()){
 if(!expected || !current || !Array.isArray(expected.owners) || expected.owners.length!==2 || !same(expected.owners,current.owners) || !Number.isFinite(Date.parse(current.observed_at_utc)) || now-Date.parse(current.observed_at_utc)>120000 || now<Date.parse(current.observed_at_utc))fail('fresh retained identity');
 for(const [index,pid,port] of [[0,65804,8080],[1,15465,5010]]){
  const o=current.owners[index];if(o.pid!==pid || !o.start || !o.argv || !o.cwd || !Array.isArray(o.listeners) || !o.listeners.includes(`127.0.0.1:${port}`) || o.listeners.some(x=>!/^127\.0\.0\.1:\d+$/.test(x)))fail('retained listener/source generation');
 }
 return true;
}
export function validateM2Ownership(record,rows,listeners){
 checkRoot(record.runRoot);const l=record.leader;
 if(!l || !Number.isSafeInteger(l.pid) || l.pid<=0 || [15465,15525,65804,28023].includes(l.pid) || l.pgid!==l.pid || l.cwd!==path.join(record.runRoot,'cwd') || !same(rows.find(r=>r.pid===l.pid),l))fail('new CLI generation');
 if(rows.some(r=>r.pid!==l.pid && (r.pgid!==l.pid || r.ppid!==l.pid || !['worker','discovery'].includes(r.profile) || r.cwd!==SOURCE || !r.start)))fail('new child ownership');
 if(!Array.isArray(listeners) || listeners.length!==Object.keys(M2_PORTS).length || listeners.some(x=>x.pid!==l.pid || x.address!=='127.0.0.1') || !same(listeners.map(x=>x.port).sort((a,b)=>a-b),Object.values(M2_PORTS).sort((a,b)=>a-b)))fail('exact new listeners');return true;
}
function nativeSelf(){
 const result=spawnSync('/bin/ps',['-p',String(process.pid),'-o','pid=,ppid=,pgid=,lstart=,command='],{encoding:'utf8',timeout:2000,maxBuffer:65536,env:{PATH:'/usr/bin:/bin',TZ:'Asia/Ho_Chi_Minh'}});
 const match=result.stdout?.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+([A-Z][a-z]{2}\s+[A-Z][a-z]{2}\s+\d+\s+\d{2}:\d{2}:\d{2}\s+\d{4})\s+(.+)$/);
 if(result.status!==0 || !match || Number(match[1])!==process.pid || Number(match[2])!==process.ppid)fail('native generation observation unavailable');
 return {pid:process.pid,ppid:process.ppid,pgid:Number(match[3]),start:match[4].replace(/\s+/g,' '),argv:match[5],cwd:process.cwd()};
}
export function installM2PortFence(){
 const allowed=new Set([...Object.values(M2_PORTS),8080,5010]),original=net.Socket.prototype.connect;
 net.Socket.prototype.connect=function(...args){
  const a=Array.isArray(args[0])?args[0][0]:args[0];
  if(!a?.path && !(typeof a==='string' && a.includes('/'))){const port=typeof a==='object'?a.port:a;if(!allowed.has(Number(port)))fail('unapproved loopback port');}
  return original.apply(this,args);
 };syncBuiltinESMExports();
}
// Preserve Node's marked TCP tuple, including HTTP's path:null transport slot.
// Only this new profile maps registered Unix paths; historical recovery adapters stay unchanged.
export function mapM2ConnectArguments(args,mapPath){
 if(!Array.isArray(args) || typeof mapPath!=='function')fail('M2 connect arguments');
 const first=args[0];let options=first;
 if(Array.isArray(first)){
  const symbols=Object.getOwnPropertySymbols(net._normalizeArgs([]));
  if(symbols.length!==1 || first.length!==2 || first[symbols[0]]!==true || !first[0] || typeof first[0]!=='object' || Array.isArray(first[0]) || first[1]!==null && typeof first[1]!=='function' || args.length!==1)fail('M2 malformed native normalized tuple');
  options=first[0];
 }
 if(options && typeof options==='object' && !Array.isArray(options)){
  if(options.path===null){if(!Number.isInteger(Number(options.port)) || Number(options.port)<1 || Number(options.port)>65535)fail('M2 null path requires TCP port');return args;}
  if(options.path!==undefined){
   if(typeof options.path!=='string' || !options.path.length || options.path.includes('\0'))fail('M2 invalid Unix path');
   const mapped={...options,path:mapPath(options.path)};
   if(Array.isArray(first)){first[0]=mapped;return args;}return [mapped,...args.slice(1)];
  }
  if(options.port!==undefined)return args;
  fail('M2 unknown connect options');
 }
 if(typeof options==='number' || typeof options==='string' && /^\d+$/.test(options))return args;
 fail('M2 unknown connect overload');
}
export function captureM2DiscoveryCompletion(child,identity,write){
 if(!Number.isSafeInteger(child?.pid) || child.pid<1 || typeof child.once!=='function' || typeof write!=='function')fail('fixed discovery child admission');
 write({...identity,pid:child.pid,status:'DISCOVERY_ADMITTED_COMPLETION_UNKNOWN'});
 child.once('exit',(exitCode,signal)=>write({...identity,pid:child.pid,status:'DISCOVERY_EXITED',exitCode,signal}));
}
export function installM2Profile({installNetworkFence,disableCliCredentialDiscovery,installLocalHttpParser}){
 if(process.version!=='v22.23.3' || realpathSync(process.execPath)!==NODE)fail('pinned Node runtime');
 const profile=validateM2Profile({entry:process.argv[1],argv:process.argv.slice(1),execArgv:process.execArgv,cwd:process.cwd(),env:process.env});
 const root=process.env.PINKY_M2_RECOVERY_RUNTIME;
 assertM2Release();assertM2Pins();assertM2Metadata();assertM2Admission(root);validateM2Config(JSON.parse(m2Read('infra-local/firebase.m2-recovery.json')));
 const s=lstatSync(root);if(!s.isDirectory() || s.uid!==process.getuid() || (s.mode&0o777)!==0o700 || realpathSync(root)!==root || os.tmpdir()!==path.join(root,'tmp'))fail('private new runtime custody');
 const self=nativeSelf();
 writeFileSync(path.join(root,`profiles/profile-${process.pid}.json`),JSON.stringify({...self,profile,node:process.execPath,version:process.version,sources:m2Sources(),closure_sources:m2ClosureSources(),canonicalSocket:profile==='worker'?process.env.PORT:null,effectiveSocket:profile==='worker'?m2SocketPath(process.env.PORT,SOURCE,root):null},null,2)+'\n',{flag:'wx',mode:0o600});
 installNetworkFence();installM2PortFence();
 if(profile==='worker'){
  const listen=net.Server.prototype.listen;
  net.Server.prototype.listen=function(...args){if(args[0]!==process.env.PORT || args.length>2 || args.length===2 && typeof args[1]!=='function')fail('worker listen profile');return listen.apply(this,[m2SocketPath(args[0],SOURCE,root),...args.slice(1)]);};
  installLocalHttpParser({profile:'m2-recovery'});return profile;
 }
 if(profile==='discovery')return profile;
 disableCliCredentialDiscovery();
 const require=createRequire(import.meta.url),{Config}=require('../node_modules/firebase-tools/lib/config.js'),load=Config.load;
 Config.load=function(options,allowMissing){
  if(path.resolve(options.cwd??process.cwd(),options.configPath??'')!==CONFIG || options.projectDir && options.projectDir!==ROOT)fail('fixed recovery config path');
  validateM2Config(JSON.parse(m2Read('infra-local/firebase.m2-recovery.json')));return load.call(this,{...options,projectDir:ROOT},allowMissing);
 };
 const controller=require('../node_modules/firebase-tools/lib/emulator/controller.js'),{FunctionsEmulator}=require('../node_modules/firebase-tools/lib/emulator/functionsEmulator.js');
 const {Delegate}=require('../node_modules/firebase-tools/lib/deploy/functions/runtimes/node/index.js');
 const originalAdmin=Delegate.prototype.execAdmin,originalStart=controller.startAll,originalNode=FunctionsEmulator.prototype.startNode,sockets=new Set(),connect=net.Socket.prototype.connect;
 const discoveryIdentity={task:'CMS-RECOVERY-001',revision:2,projectId:PROJECT,runToken:path.basename(root),sources:m2Sources(),closure_sources:m2ClosureSources(),parentPid:process.pid,source:SOURCE,manifestPath:path.join(root,'discovery/functions.yaml')};
 const admin=function(config,envs,manifestPath){
  if(Delegate.prototype.execAdmin!==admin || this.sourceDir!==SOURCE || this.projectId!==PROJECT || envs.PORT!=='80' || manifestPath!==discoveryIdentity.manifestPath)fail('exact file-output discovery control');
  const child=originalAdmin.call(this,config,envs,manifestPath);
  captureM2DiscoveryCompletion(child,discoveryIdentity,value=>writeFileSync(path.join(root,value.status==='DISCOVERY_EXITED'?'discovery-completion.json':'discovery-admission.json'),JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600}));return child;
 };
 Delegate.prototype.execAdmin=admin;
 net.Socket.prototype.connect=function(...args){return connect.apply(this,mapM2ConnectArguments(args,socket=>{const canonical=path.resolve(process.cwd(),socket);if(!sockets.has(canonical))fail('CLI unregistered worker connection');return m2SocketPath(canonical,process.cwd(),root);}));};
 const start=async function(options,...rest){
  if(controller.startAll!==start || FunctionsEmulator.prototype.startNode!==node || options.only!=='auth,functions' || options.project!==PROJECT || options.extDevEnv!==undefined || options.import!==undefined || options.exportOnExit!==undefined)fail('CLI control options drift');
  assertM2Metadata();const result=await originalStart.call(this,{...options,extDevEnv:m2Environment(root)},...rest);
  writeFileSync(path.join(root,'controller-ready.json'),JSON.stringify({...discoveryIdentity,pid:process.pid,status:'START_ALL_RESOLVED'},null,2)+'\n',{flag:'wx',mode:0o600});return result;
 };
 const node=async function(backend,envs){
  if(controller.startAll!==start || FunctionsEmulator.prototype.startNode!==node || backend.functionsDir!==SOURCE || backend.bin!==NODE || this.debugMode || envs.FUNCTION_TARGET!=='cmsApi' || envs.FUNCTION_SIGNATURE_TYPE!=='http')fail('worker source/target drift');
  assertM2Metadata();assertM2Manifest(root);
  const runtime=await originalNode.call(this,backend,{...envs,...m2Environment(root)});
  if(runtime.cwd!==SOURCE || !Number.isSafeInteger(runtime.process?.pid) || !runtime.conn?.socketPath)fail('native worker result');
  m2SocketPath(runtime.conn.socketPath,process.cwd(),root);sockets.add(runtime.conn.socketPath);return runtime;
 };
 controller.startAll=start;FunctionsEmulator.prototype.startNode=node;syncBuiltinESMExports();return profile;
}
export function validateM2Manifest(value){
 const object=x=>x!==null && typeof x==='object' && !Array.isArray(x) && Object.getPrototypeOf(x)===Object.prototype;
 if(!object(value) || value.specVersion!=='v1alpha1' || Object.keys(value).some(k=>!['specVersion','endpoints','extensions','params','requiredAPIs'].includes(k)) || !object(value.endpoints) || !same(Object.keys(value.endpoints),['cmsApi']))fail('new fixed discovery manifest');
 for(const key of ['params','requiredAPIs'])if(value[key]!==undefined && (!Array.isArray(value[key]) || value[key].length))fail('discovery dynamic inputs');
 if(value.extensions!==undefined && (!object(value.extensions) || Object.keys(value.extensions).length))fail('discovery extensions');
 const endpoint=value.endpoints.cmsApi,reset=['availableMemoryMb','timeoutSeconds','minInstances','maxInstances','ingressSettings','concurrency','serviceAccountEmail','vpc'];
 if(!object(endpoint) || Object.keys(endpoint).some(k=>!['entryPoint','platform','region','labels','httpsTrigger',...reset].includes(k)) || !object(endpoint.httpsTrigger) || Object.keys(endpoint.httpsTrigger).length || endpoint.entryPoint!=='cmsApi' || !same(endpoint.region,['us-central1']) || endpoint.platform!=='gcfv2')fail('one fixed HTTP function manifest');
 if(endpoint.labels!==undefined && (!object(endpoint.labels) || Object.keys(endpoint.labels).length))fail('manifest labels');
 for(const key of reset)if(endpoint[key]!==undefined && endpoint[key]!==null)fail('manifest runtime overrides');return true;
}
export function assertM2Manifest(root){
 checkRoot(root);const bytes=m2Read(`${path.relative(ROOT,root)}/discovery/functions.yaml`,65536,{privateFile:true}),value=JSON.parse(bytes);validateM2Manifest(value);
 return {value,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
}
