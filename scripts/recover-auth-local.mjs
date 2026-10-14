/** Fixed local reconstruction policy. Importing this module performs no SDK/API operation. */
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,existsSync,lstatSync,readdirSync,realpathSync} from 'node:fs';
import path from 'node:path';
import * as fs from 'node:fs';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {canonicalJson} from '../contracts/draft.mjs';
import {ROOT,PROJECT,assertRecoveryRelease,assertRecoveryOperator,validateRuntime,assertRecoveryPinnedSources,assertRecoveryMetadata,assertExternalFirestoreIdentity,continueRetainedRecovery,recoveryNodeEnvironment,applyRecoveryEnvironment,recoveryToken,recoveryRoot,recoveryPlan,assertOwnedOutput,installNetworkFence,validateRecoveryHub,assertRuntimePolicyAdmission,assertRuntimePolicyGate,assertRuntimePolicySources,validateRuntimePolicyOperator,observeRuntimePolicyRetained,validateRuntimePolicyQuiescence,validateRuntimePolicySignal,validateRuntimePolicyAbsence,runtimePolicyNativeSnapshot,runtimePolicyNodeEnvironment,createRecoveryRuntime,launchRecoveryRuntime,assertRecoveryPortsAvailable,RETAINED_RECOVERY,readRuntimePolicyHistorical} from './local-guard.mjs';

const refuse=reason=>{throw Object.assign(new Error(`RUNTIME_RECOVERY: ${reason}`),{code:reason});};
export async function withinRecoveryDeadline(operation,remaining,reason,{now=Date.now}={}){
 if(typeof operation!=='function' || !Number.isFinite(remaining) || remaining<=0)refuse(reason);
 const deadline=now()+remaining;let timer;
 try{
  const value=await Promise.race([Promise.resolve().then(()=>{if(now()>=deadline)refuse(reason);return operation();}),new Promise((_resolve,reject)=>{timer=setTimeout(()=>reject(Object.assign(new Error(`RUNTIME_RECOVERY: ${reason}`),{code:reason})),remaining);})]);
  if(now()>=deadline)refuse(reason);return value;
 }finally{clearTimeout(timer);}
}
const withinDeadline=withinRecoveryDeadline;
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export const RECOVERY_ROSTER=Object.freeze([
 ['editor','EDITOR',true,true],['reviewer','REVIEWER',true,true],['publisher','PUBLISHER',true,true],['owner','OWNER',true,true],
 ['unknown',null,null,true],['inactive','EDITOR',false,true],['unverified','EDITOR',true,false]
].map(([name,role,active,verified])=>Object.freeze({uid:`fixture-${name}`,email:`${name}@pinky.test`,role,active,verified})));
export const HISTORY_COLLECTIONS=Object.freeze(['cmsDrafts','cmsSiteImports','cmsSiteSources','cmsIdempotency','cmsAudit','cmsSnapshots','cmsReviewStates','cmsReviews','cmsSourceChecks']);
export const RECOVERY_CAPS=Object.freeze({documents:20000,canonicalBytes:256*1024*1024,deadlineMs:120000,pageSize:25,exportBytes:16*1024*1024,exportFiles:32,exportEntries:256,httpBytes:65536});
const expectedByUid=new Map(RECOVERY_ROSTER.map(fixture=>[fixture.uid,fixture]));
function plain(value){return value!==null && typeof value==='object' && Object.getPrototypeOf(value)===Object.prototype;}
function same(actual,expected){return canonicalJson(actual)===canonicalJson(expected);}
export function validateAuthUser(user){
 const fixture=expectedByUid.get(user?.uid);
 if(!fixture || user.email!==fixture.email || user.emailVerified!==fixture.verified || user.disabled!==false || user.tenantId!==undefined || (user.customClaims!==undefined && (!plain(user.customClaims) || Object.keys(user.customClaims).length)))refuse('AUTH_METADATA_MISMATCH');
 return {uid:fixture.uid,email:fixture.email,emailVerified:fixture.verified,disabled:false};
}
export function validateAuthPage(page,{complete=false}={}){
 if(!plain(page) || !Array.isArray(page.users) || page.users.length>7 || page.pageToken!==undefined || page.nextPageToken!==undefined)refuse('AUTH_PAGINATION_UNKNOWN');
 const users=page.users.map(validateAuthUser),seen=new Set();
 for(const user of users){if(seen.has(user.uid))refuse('AUTH_DUPLICATE');seen.add(user.uid);}
 if(complete && users.length!==7)refuse('AUTH_INCOMPLETE');
 return users.sort((a,b)=>a.uid.localeCompare(b.uid));
}
export async function inspectAuth(auth,complete=false,deadline=Date.now()+120000){
 const users=validateAuthPage(await withinDeadline(()=>auth.listUsers(8),deadline-Date.now(),'AUTH_READ_COMPLETION_UNKNOWN'),{complete});
 const tenants=await withinDeadline(()=>auth.tenantManager().listTenants(1),deadline-Date.now(),'AUTH_READ_COMPLETION_UNKNOWN');
 if(!plain(tenants) || !Array.isArray(tenants.tenants) || tenants.tenants.length || Object.keys(tenants).some(key=>!['tenants','pageToken'].includes(key)) || tenants.pageToken!==undefined || tenants.nextPageToken!==undefined)refuse('TENANTS_UNKNOWN');
 if(Date.now()>=deadline)refuse('AUTH_READ_COMPLETION_UNKNOWN');return users;
}
export function validateMembership(fixture,snapshot){
 if(fixture.role===null){if(snapshot.exists)refuse('UNKNOWN_MEMBER_PRESENT');return null;}
 const member=snapshot.data();
 if(!snapshot.exists || !plain(member) || member.uid!==fixture.uid || member.role!==fixture.role || member.isActive!==fixture.active || member.expectedEmail!==fixture.email || !Number.isSafeInteger(member.authzVersion) || member.authzVersion<1)refuse('MEMBERSHIP_MISMATCH');
 return {uid:fixture.uid,role:member.role,authzVersion:member.authzVersion};
}
/** No transaction/mutator is accepted by this fixed read-only interface. */
export async function inventoryHistory(db,documentId,{now=Date.now,deadlineAt=Date.now()+120000}={}){
 const remaining=()=>Math.min(deadlineAt-Date.now(),RECOVERY_CAPS.deadlineMs-(now()-started));
 const started=now(),inventory={members:[],collections:[]};let documents=0,bytes=0;
 const hashDocument=snapshot=>{
  if(remaining()<=0)refuse('SCAN_DEADLINE');
  if(++documents>RECOVERY_CAPS.documents)refuse('SCAN_DOCUMENT_CAP');
  const text=canonicalJson(snapshot.data());bytes+=Buffer.byteLength(text);
  if(bytes>RECOVERY_CAPS.canonicalBytes)refuse('SCAN_BYTE_CAP');
  return digest(text);
 };
 const references=RECOVERY_ROSTER.map(fixture=>db.collection('cmsMembers').doc(fixture.uid));
 const memberships=await withinDeadline(()=>db.getAll(...references),remaining(),'SCAN_DEADLINE');
 if(!Array.isArray(memberships) || memberships.length!==7)refuse('MEMBERSHIP_READ_UNKNOWN');
 for(let i=0;i<7;i++){
  const snapshot=memberships[i],fixture=RECOVERY_ROSTER[i];
  if(snapshot.id!==fixture.uid)refuse('MEMBERSHIP_ORDER_UNKNOWN');
  const semantics=validateMembership(fixture,snapshot);
  inventory.members.push({id:fixture.uid,exists:snapshot.exists,sha256:snapshot.exists?hashDocument(snapshot):null,semantics});
 }
 for(const name of HISTORY_COLLECTIONS){
  const entries=[];let cursor=null,lastId=null;
  for(;;){
   if(remaining()<=0)refuse('SCAN_DEADLINE');
   let query=db.collection(name).orderBy(documentId).limit(25);if(cursor)query=query.startAfter(cursor);
   const page=await withinDeadline(()=>query.get(),remaining(),'SCAN_DEADLINE');
   if(!Array.isArray(page.docs) || page.docs.length>25 || page.size!==page.docs.length)refuse('SCAN_PAGE_UNKNOWN');
   for(const snapshot of page.docs){
    if(typeof snapshot.id!=='string' || !snapshot.id || snapshot.id.includes('/') || (lastId!==null && snapshot.id<=lastId))refuse('SCAN_NONTERMINAL');
    lastId=snapshot.id;entries.push({id:snapshot.id,sha256:hashDocument(snapshot)});
   }
   if(page.docs.length<25)break;cursor=page.docs.at(-1);
  }
  inventory.collections.push({name,count:entries.length,entries});
 }
 if(now()-started>=120000)refuse('SCAN_DEADLINE');
 return {inventory,documents,canonicalBytes:bytes,elapsedMs:now()-started,sha256:digest(canonicalJson(inventory))};
}
export function assertHistoryEqual(before,after){if(!same(before.inventory,after.inventory))refuse('HISTORY_CHANGED');return true;}
/** Existing records are never updated. A failed create is retained, not rolled back. */
export async function reconstructMissing(auth,password,{now=Date.now,onProgress=()=>{},beforeCreate=async()=>{},deadlineAt=Date.now()+120000}={}){
 const start=now(),deadline=Math.min(deadlineAt,Date.now()+120000),remaining=()=>Math.min(deadline-Date.now(),120000-(now()-start));
 const before=await withinDeadline(()=>inspectAuth(auth,false,deadline),remaining(),'CREATE_COMPLETION_UNKNOWN'),created=[];
 await withinDeadline(beforeCreate,remaining(),'CREATE_COMPLETION_UNKNOWN');
 for(const fixture of RECOVERY_ROSTER){
  if(remaining()<=0)refuse('CREATE_COMPLETION_UNKNOWN');
  try{validateAuthUser(await withinDeadline(()=>auth.getUser(fixture.uid),remaining(),'CREATE_COMPLETION_UNKNOWN'));}
  catch(error){
   if(error.code!=='auth/user-not-found')throw error;
   await withinDeadline(beforeCreate,remaining(),'CREATE_COMPLETION_UNKNOWN');
   const user=await withinDeadline(()=>auth.createUser({uid:fixture.uid,email:fixture.email,emailVerified:fixture.verified,disabled:false,password}),remaining(),'CREATE_COMPLETION_UNKNOWN');
   validateAuthUser(user);created.push(fixture.uid);onProgress({created:[...created]});
  }
 }
 const after=await withinDeadline(()=>inspectAuth(auth,true,deadline),remaining(),'CREATE_COMPLETION_UNKNOWN');
 if(remaining()<=0)refuse('CREATE_COMPLETION_UNKNOWN');return {before,after,created};
}

export function validateExportPayload(metadata,accounts,config){
 if(!same(metadata,{version:'15.33.0',auth:{version:'15.33.0',path:'auth_export'}}))refuse('EXPORT_METADATA');
 if(!plain(accounts) || accounts.kind!=='identitytoolkit#DownloadAccountResponse' || !Array.isArray(accounts.users) || accounts.users.length!==7 || Object.keys(accounts).some(key=>!['kind','users'].includes(key)))refuse('EXPORT_ACCOUNTS_SCHEMA');
 const users=accounts.users.map(user=>{
  if(!plain(user))refuse('EXPORT_ACCOUNT_SCHEMA');
  for(const key of ['emailVerified','disabled'])if(Object.hasOwn(user,key) && typeof user[key]!=='boolean')refuse('EXPORT_BOOLEAN');
  return validateAuthUser({uid:user.localId,email:user.email,emailVerified:user.emailVerified??false,disabled:user.disabled??false,tenantId:user.tenantId,customClaims:user.customAttributes===undefined?undefined:JSON.parse(user.customAttributes)});
 });
 validateAuthPage({users},{complete:true});
 if(!same(config,{signIn:{allowDuplicateEmails:false},blockingFunctions:{},emailPrivacyConfig:{enableImprovedEmailPrivacy:false}}))refuse('EXPORT_CONFIG');
 return {count:7,tenants:0};
}
function readRecoveryFile(target,before,cap){
 const fd=fs.openSync(target,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
 try{
  const opened=fs.fstatSync(fd);if(opened.dev!==before.dev || opened.ino!==before.ino || opened.size!==before.size || opened.nlink!==1 || opened.uid!==process.getuid() || !opened.isFile() || (opened.mode&0o777)!==0o600)refuse('EXPORT_OPEN_IDENTITY');
  const chunks=[];let bytes=0;
  for(;;){const buffer=Buffer.alloc(Math.min(65536,cap+1-bytes)),count=fs.readSync(fd,buffer,0,buffer.length,null);if(!count)break;bytes+=count;if(bytes>cap)refuse('EXPORT_ADMISSION_CAP');chunks.push(buffer.subarray(0,count));}
  const after=fs.fstatSync(fd);if(after.size!==opened.size || after.ino!==opened.ino || after.mtimeMs!==opened.mtimeMs || after.nlink!==1)refuse('EXPORT_READER_CHANGED');return Buffer.concat(chunks);
 }finally{fs.closeSync(fd);}
}
/** No-follow bounded tree observation; private account bytes never leave this function. */
export function inspectAuthExport(destination,{empty=false}={}){
 const base=path.join(ROOT,'.local/emulator-data/m3/runtime-recovery');
 if(path.resolve(destination)!==destination || !destination.startsWith(`${base}/`) || !/^[A-Za-z0-9_-]{22}$/.test(path.basename(path.dirname(destination))) || path.basename(destination)!=='auth-custody')refuse('EXPORT_DESTINATION');
 const files=[],directories=[],contents=new Map();let entries=0,total=0;
 const inspect=(target,relative)=>{
  if(++entries>256)refuse('EXPORT_ENTRY_CAP');const stat=lstatSync(target);
  if(stat.uid!==process.getuid() || stat.isSymbolicLink() || realpathSync(target)!==target)refuse('EXPORT_ESCAPE');
  if(stat.isDirectory()){
   if((stat.mode&0o777)!==0o700)refuse('EXPORT_PRIVATE_MODE');
   directories.push({path:relative,type:'directory',mode:'0700',links:stat.nlink,bytes:stat.size,dev:stat.dev,ino:stat.ino,uid:stat.uid});
   for(const name of readdirSync(target))inspect(path.join(target,name),relative?`${relative}/${name}`:name);
  }else{
   if(!stat.isFile() || stat.nlink!==1 || (stat.mode&0o777)!==0o600)refuse('EXPORT_FILE_TYPE');
   total+=stat.size;if(total>RECOVERY_CAPS.exportBytes || files.length>=32)refuse('EXPORT_ADMISSION_CAP');
   const content=readRecoveryFile(target,stat,RECOVERY_CAPS.exportBytes);contents.set(relative,content);
   files.push({path:relative,bytes:content.length,sha256:digest(content),type:'file',mode:'0600',links:1,dev:stat.dev,ino:stat.ino,uid:stat.uid});
  }
 };
 // Check every ancestor without following even a project-level alias.
 for(let current=destination;;current=path.dirname(current)){const st=lstatSync(current);if(st.isSymbolicLink() || !st.isDirectory() || realpathSync(current)!==current)refuse('EXPORT_ANCESTRY');if(current===ROOT)break;if(current===path.dirname(current))refuse('EXPORT_ESCAPE');}
 inspect(destination,'');files.sort((a,b)=>a.path.localeCompare(b.path));
 directories.sort((a,b)=>a.path.localeCompare(b.path));if(!same(directories.map(directory=>directory.path),['','auth_export']))refuse('EXPORT_EXACT_DIRS');
 const required=['auth_export/accounts.json','auth_export/config.json','firebase-export-metadata.json'];
 if(!same(files.map(file=>file.path),required))refuse('EXPORT_EXACT_FILES');
 const read=name=>JSON.parse(contents.get(name).toString('utf8'));
 if(empty)validateEmptyAuthExportPayload(read(required[2]),read(required[0]),read(required[1]));else validateExportPayload(read(required[2]),read(required[0]),read(required[1]));
 return {files,directories,totalBytes:total,entries,sha256:digest(canonicalJson({files,directories}))};
}
export function assertExportCompletion({exitCode,closed,fulfilled,before,after}){
 if(exitCode!==0 || closed!==true || fulfilled!==true || !before || !after || !Array.isArray(before.files) || !Array.isArray(before.directories) || !same(before,after))refuse('HOLD_WRITER_COMPLETION_UNKNOWN');return after;
}
const SESSION=`http://127.0.0.1:5001/${PROJECT}/us-central1/cmsApi/api/cms/session`;
const READ=`http://127.0.0.1:9199/v0/b/${PROJECT}.appspot.com/o/recovery-read-probe`;
const LIST=`http://127.0.0.1:9199/v0/b/${PROJECT}.appspot.com/o?maxResults=1`;
const SIGNIN=`http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=local-demo-only`;
export const RECOVERY_URLS=Object.freeze({session:SESSION,read:READ,list:LIST,hosting:'http://127.0.0.1:5010/index.html',hub:'http://127.0.0.1:4400/',emulators:'http://127.0.0.1:4400/emulators',signin:SIGNIN});
export function boundedRecoveryRequest(url,{method='GET',body,token,deadlineAt=Date.now()+30000,trace}={}){
 if(!Object.values(RECOVERY_URLS).includes(url) || (url===SIGNIN?method!=='POST':method!=='GET') || (url!==SIGNIN && body!==undefined) || (url!==SESSION && token!==undefined))refuse('HTTP_TARGET');
 const remaining=Math.min(30000,deadlineAt-Date.now());if(remaining<=0)refuse('HTTP_DEADLINE');
 return new Promise((resolve,reject)=>{
  let settled=false,bytes=0;const chunks=[];
  const finish=(error,result)=>{if(settled)return;settled=true;clearTimeout(deadline);trace?.(runtimeProbeTrace(url,error?'REFUSED':'COMPLETED',{status:result?.status,reason:error?.code}));error?reject(error):resolve(result);};
  trace?.(runtimeProbeTrace(url,'BEGIN'));
  const req=http.request(url,{method,headers:{...(body!==undefined?{'Content-Type':'application/json'}:{}),...(token!==undefined?{Authorization:`Bearer ${token}`}:{})}},res=>{
   if(res.statusCode>=300 && res.statusCode<400){res.destroy();finish(Object.assign(new Error('RUNTIME_RECOVERY: HTTP_REDIRECT'),{code:'HTTP_REDIRECT'}));return;}
   res.on('data',chunk=>{bytes+=chunk.length;if(bytes>65536){res.destroy();req.destroy();finish(Object.assign(new Error('RUNTIME_RECOVERY: HTTP_CAP'),{code:'HTTP_CAP'}));}else chunks.push(chunk);});
   res.on('error',()=>finish(Object.assign(new Error('RUNTIME_RECOVERY: HTTP_RESPONSE'),{code:'HTTP_RESPONSE'})));
   res.on('end',()=>finish(null,{status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));
  });
  const deadline=setTimeout(()=>{req.destroy();finish(Object.assign(new Error('RUNTIME_RECOVERY: HTTP_DEADLINE'),{code:'HTTP_DEADLINE'}));},remaining);
  req.once('socket',socket=>{if(socket.connecting){socket.setTimeout(5000,()=>{req.destroy();finish(Object.assign(new Error('RUNTIME_RECOVERY: HTTP_CONNECT'),{code:'HTTP_CONNECT'}));});socket.once('connect',()=>socket.setTimeout(0));}});
  req.on('error',()=>finish(Object.assign(new Error('RUNTIME_RECOVERY: HTTP_CONNECTION'),{code:'HTTP_CONNECTION'})));
  req.end(body===undefined?undefined:JSON.stringify(body));
 });
}
export function validateSessionResponse(response,fixture,member){
 let value;try{value=JSON.parse(response.body);}catch{refuse('SMOKE_JSON');}
 if(fixture?.role && fixture.active && fixture.verified){
  if(response.status!==200 || value.uid!==fixture.uid || value.role!==fixture.role || value.authzVersion!==member.authzVersion || value.isActive!==true || Object.keys(value).some(key=>!['uid','role','isActive','authzVersion'].includes(key)))refuse('SMOKE_ROLE');
 }else{
  const expected=fixture?403:401;
  if(response.status!==expected || value?.error?.code!==(fixture?'FORBIDDEN':'UNAUTHENTICATED') || typeof value.error.message!=='string' || typeof value.error.correlationId!=='string')refuse('SMOKE_DENIAL');
 }
 return {status:response.status,uid:fixture?.uid??null};
}
export async function smokeSessions(password,members,request=boundedRecoveryRequest,{deadlineAt:workflowDeadline=Date.now()+120000}={}){
 const start=Date.now(),deadlineAt=Math.min(start+120000,workflowDeadline),observations=[];
 for(const fixture of RECOVERY_ROSTER){
  if(Date.now()>=deadlineAt)refuse('SMOKE_DEADLINE');
  const response=await withinDeadline(()=>request(SIGNIN,{method:'POST',body:{email:fixture.email,password,returnSecureToken:true},deadlineAt}),deadlineAt-Date.now(),'SMOKE_DEADLINE');
  let signin;try{signin=JSON.parse(response.body);}catch{refuse('SIGNIN_RESPONSE');}
  if(response.status!==200 || signin.localId!==fixture.uid || typeof signin.idToken!=='string' || !signin.idToken)refuse('SIGNIN_RESPONSE');
  const result=await withinDeadline(()=>request(SESSION,{token:signin.idToken,deadlineAt}),deadlineAt-Date.now(),'SMOKE_DEADLINE');
  observations.push(validateSessionResponse(result,fixture,members.find(member=>member.id===fixture.uid)?.semantics));
 }
 observations.push(validateSessionResponse(await withinDeadline(()=>request(SESSION,{deadlineAt}),deadlineAt-Date.now(),'SMOKE_DEADLINE'),null));
 observations.push(validateSessionResponse(await withinDeadline(()=>request(SESSION,{token:'malformed-local-fixture',deadlineAt}),deadlineAt-Date.now(),'SMOKE_DEADLINE'),null));
 if(Date.now()>=deadlineAt)refuse('SMOKE_DEADLINE');return observations;
}
export async function verifyReadOnlyProbes(request=boundedRecoveryRequest,deadlineAt=Date.now()+120000){
 const results=[];
 validateSessionResponse(await request(SESSION,{deadlineAt}),null);results.push({kind:'anonymous-session',status:401});
 const hosting=await request(RECOVERY_URLS.hosting,{deadlineAt});
 if(hosting.status!==200 || !String(hosting.headers['content-type']).startsWith('text/html') || hosting.body.length!==18385 || digest(hosting.body)!=='4de13ed9a2b513458574b16fdaf9410422eb311ea23a0c4bce45b50a5d4630de')refuse('HOSTING_IDENTITY');
 results.push({kind:'hosting',status:200,sha256:digest(hosting.body)});
 for(const [url,permission] of [[READ,'READ'],[LIST,'LIST']]){
  const response=await request(url,{deadlineAt});let value;try{value=JSON.parse(response.body);}catch{refuse('STORAGE_RESPONSE');}
  if(response.status!==403 || !same(value,{error:{code:403,message:`Permission denied. No ${permission} permission.`}}))refuse('STORAGE_LOADED_RULES');
  results.push({kind:permission,status:403});
 }
 if(Date.now()>=deadlineAt)refuse('STARTUP_DEADLINE');return results;
}
export function validateManagedHub(runtime,record,rootResponse,mapResponse){
 if(rootResponse.status!==200 || mapResponse.status!==200)refuse('HUB_RESPONSE');
 const locatorPath=path.join(runtime.runRoot,`tmp/hub-${PROJECT}.json`),stat=lstatSync(locatorPath);
 if(!stat.isFile() || stat.isSymbolicLink() || stat.nlink!==1 || stat.uid!==process.getuid() || stat.size>65536 || realpathSync(locatorPath)!==locatorPath)refuse('HUB_LOCATOR');
 validateRecoveryHub(JSON.parse(rootResponse.body),JSON.parse(mapResponse.body),JSON.parse(readFileSync(locatorPath,'utf8')),record.pid);return true;
}
export async function exportAuthCustody(runtime,controller,{empty=false,deadlineAt=Date.now()+120000}={}){
 const exportStarted=Date.now();deadlineAt=Math.min(deadlineAt,exportStarted+120000);if(Date.now()>=deadlineAt)refuse('HOLD_WRITER_COMPLETION_UNKNOWN');
 if(runtime.policySelector)assertRuntimePolicyAdmission(runtime.policySelector);else assertRecoveryRelease();assertRecoveryPinnedSources();controller.observe();
 const token=recoveryToken(),parent=assertOwnedOutput(`.local/emulator-data/m3/runtime-recovery/${token}`),destination=path.join(parent,'auth-custody');
 if(existsSync(parent))refuse('EXPORT_DESTINATION_EXISTS');mkdirSync(parent,{recursive:true,mode:0o700});
 const plan=recoveryPlan('export-auth',runtime.runRoot,destination),env=runtimePolicyNodeEnvironment(runtime.runRoot,{HOME:process.env.HOME,PATH:process.env.PATH,LANG:process.env.LANG,PINKY_RUNTIME_POLICY_SELECTOR:runtime.policySelector??process.env.PINKY_RUNTIME_POLICY_SELECTOR});
 env.PINKY_RECOVERY_AUTH_DEST=destination;const logs={stdout:[],stderr:[]},counts={stdout:0,stderr:0};
 const child=spawn(plan.node,plan.args,{cwd:plan.cwd,env,stdio:['ignore','pipe','pipe']});
 const result=await new Promise(resolve=>{
  let done=false,exitCode=null,closed=false,reason=null;
  const finish=()=>{if(done)return;done=true;clearTimeout(timer);clearInterval(monitor);resolve({exitCode,closed,reason,pid:child.pid,argv:[plan.node,...plan.args]});};
  const stop=code=>{reason=code;child.stdout.destroy();child.stderr.destroy();child.unref();finish();};
  const timer=setTimeout(()=>stop('HOLD_WRITER_COMPLETION_UNKNOWN'),Math.max(1,deadlineAt-Date.now()));
  const monitor=setInterval(()=>{try{controller.observe();if(existsSync(destination))observePartialExport(destination);}catch{stop('HOLD_WRITER_COMPLETION_UNKNOWN');}},250);
  for(const stream of ['stdout','stderr'])child[stream].on('data',chunk=>{counts[stream]+=chunk.length;if(counts[stream]>262144){stop('HOLD_WRITER_COMPLETION_UNKNOWN');return;}logs[stream].push(chunk);});
  child.on('error',()=>stop('HOLD_WRITER_COMPLETION_UNKNOWN'));child.on('exit',code=>{exitCode=code;});child.on('close',()=>{closed=true;finish();});
 });
 for(const stream of ['stdout','stderr'])writeFileSync(path.join(parent,`export-${stream}.log`),Buffer.concat(logs[stream]),{flag:'wx',mode:0o600});
 writeFileSync(path.join(parent,'client-lifecycle.json'),JSON.stringify({...result,observedLogBytes:counts,capturedLogBytes:Object.fromEntries(Object.entries(logs).map(([name,chunks])=>[name,chunks.reduce((sum,chunk)=>sum+chunk.length,0)])),captureAbandoned:result.reason!==null,limits:'Client exit/close or abandonment does not prove Hub writer cancellation'},null,2),{flag:'wx',mode:0o600});
 if(result.reason || result.exitCode!==0 || !result.closed)refuse('HOLD_WRITER_COMPLETION_UNKNOWN');
 const fulfillmentPath=path.join(runtime.runRoot,`export-fulfilled-${token}.json`),stat=lstatSync(fulfillmentPath);
 if(!stat.isFile() || stat.nlink!==1 || stat.size>65536 || stat.isSymbolicLink())refuse('HOLD_WRITER_COMPLETION_UNKNOWN');
 const fulfillment=JSON.parse(readFileSync(fulfillmentPath));
 if(fulfillment.status!=='SOURCE_BOUND_FULFILLED' || fulfillment.path!==destination || !same(fulfillment.emulators,['auth']))refuse('HOLD_WRITER_COMPLETION_UNKNOWN');
 const before=inspectAuthExport(destination,{empty});if(Date.now()+1000>=deadlineAt)refuse('HOLD_WRITER_COMPLETION_UNKNOWN');await new Promise(resolve=>setTimeout(resolve,1000));const after=inspectAuthExport(destination,{empty});if(Date.now()>=deadlineAt)refuse('HOLD_WRITER_COMPLETION_UNKNOWN');
 assertExportCompletion({exitCode:result.exitCode,closed:result.closed,fulfilled:true,before,after});
 return {destination,...after,client:result,fulfillment:{path:fulfillmentPath,sha256:digest(readFileSync(fulfillmentPath)),httpStatus:'NOT_EXPOSED_BY_PINNED_CLIENT'},restore:'NOT_RUN',oldAuthHistory:'UNKNOWN'};
}
export function observePartialExport(destination){
 let entries=0,files=0,bytes=0;
 const walk=target=>{if(++entries>256)refuse('EXPORT_ENTRY_CAP');const stat=lstatSync(target);if(stat.uid!==process.getuid() || stat.isSymbolicLink())refuse('EXPORT_ESCAPE');if(stat.isDirectory()){if((stat.mode&0o777)!==0o700)refuse('EXPORT_PRIVATE_MODE');for(const name of readdirSync(target))walk(path.join(target,name));}else{if(!stat.isFile() || stat.nlink!==1 || (stat.mode&0o777)!==0o600 || ++files>32)refuse('EXPORT_FILE_TYPE');bytes+=stat.size;if(bytes>16*1024*1024)refuse('EXPORT_ADMISSION_CAP');}};
 walk(destination);return {entries,files,bytes};
}
export async function runRecoveryPhase(mode){
 if(mode!=='live')refuse('FIXED_LIVE_MODE');
 assertRecoveryOperator();
 // This check occurs before importing the seed/SDK module or allocating outputs.
 assertRecoveryRelease();validateRuntime();
 assertRecoveryPinnedSources();assertRecoveryMetadata();const externalBefore=assertExternalFirestoreIdentity();const retained=continueRetainedRecovery();
 const runtime=retained.runtime;
 // Operator imports fixed existing fixture inputs only after release; never calls seedFixtures.
 applyRecoveryEnvironment(recoveryNodeEnvironment(runtime.runRoot));installNetworkFence();
 const receipt={status:'IN_PROGRESS',startedAtUtc:new Date().toISOString(),runtimeRoot:runtime.runRoot,externalBefore,sourcePins:assertRecoveryRelease().sources,limits:['Known collections only; no atomic cross-collection snapshot','Old Auth history unknown; reconstruction is not restore','Filesystem/ps policy controls are best effort, not a hard sandbox']};
 let receiptSerial=0;const save=()=>writeFileSync(path.join(runtime.operatorRoot,`phase-${String(receiptSerial++).padStart(6,'0')}.json`),JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});save();
 let controller=retained,database=null;
 try{
  const {fixtures,fixturePassword}=await import('./seed-emulators.mjs');
  if(!same(fixtures.map(f=>({uid:f.uid,email:f.email,role:f.role??null,active:f.active??null,verified:f.verified})),RECOVERY_ROSTER))refuse('SEED_INPUT_DRIFT');
  const {auth,db}=await import('../cms-api/authorization.mjs');database=db;
  const require=createRequire(import.meta.url),{FieldPath}=require('firebase-admin/firestore');
  const before=await inventoryHistory(db,FieldPath.documentId());assertHistoryEqual(retained.originalInventory,before);receipt.before=before;receipt.originalInventory={documents:retained.originalInventory.documents,sha256:retained.originalInventory.sha256};receipt.owner=controller.record;save();
  const start=Date.now();let ready=false,lastReason='STARTUP_PENDING';
  while(Date.now()-start<120000){
   try{assertRecoveryPinnedSources();assertExternalFirestoreIdentity();controller.observe();validateManagedHub(runtime,controller.record,await boundedRecoveryRequest(RECOVERY_URLS.hub,{deadlineAt:start+120000}),await boundedRecoveryRequest(RECOVERY_URLS.emulators,{deadlineAt:start+120000}));await verifyReadOnlyProbes(boundedRecoveryRequest,start+120000);if(Date.now()-start>=120000)refuse('STARTUP_DEADLINE');ready=true;break;}
   catch(error){lastReason=error.code??'STARTUP_IDENTITY_UNKNOWN';const cause=/^(?:LOCAL_GUARD|RUNTIME_RECOVERY):/.test(error.message??'')?error.message:'UNKNOWN_CONTROL_FAILURE';receipt.firstFailure??={atUtc:new Date().toISOString(),code:lastReason,cause};if(cause.includes('R1 component'))receipt.firstComponentFailure??={atUtc:new Date().toISOString(),cause};save();if(controller.record.exit || controller.record.close)break;await new Promise(resolve=>setTimeout(resolve,250));}
  }
  if(!ready)refuse(`STARTUP_HOLD_${lastReason}`);receipt.readiness='PASS_FIXED_READ_ONLY';save();
  await inspectAuth(auth);receipt.auth=await reconstructMissing(auth,fixturePassword,{beforeCreate:async()=>{assertRecoveryRelease();assertRecoveryPinnedSources();assertExternalFirestoreIdentity();controller.observe();},onProgress:progress=>{receipt.partialCreate=progress;save();}});save();
  receipt.smoke=await smokeSessions(fixturePassword,before.inventory.members);controller.observe();
  const after=await inventoryHistory(db,FieldPath.documentId());assertHistoryEqual(before,after);receipt.after=after;save();
  await inspectAuth(auth,true);receipt.custody=await exportAuthCustody(runtime,controller);await inspectAuth(auth,true);
  const afterExport=await inventoryHistory(db,FieldPath.documentId());assertHistoryEqual(before,afterExport);receipt.afterExport=afterExport;
  receipt.externalAfter=assertExternalFirestoreIdentity();controller.observe();receipt.status='PASS_LOCAL_AUTH_RECONSTRUCTION_CUSTODY_ONLY';receipt.completedAtUtc=new Date().toISOString();save();
  await db.terminate();return receipt;
 }catch(error){receipt.status='HOLD';receipt.reason=error.code??'OWNERSHIP_OR_OPERATION_UNKNOWN';receipt.completedAtUtc=new Date().toISOString();if(controller)receipt.owner=controller.record;save();if(database)try{await withinDeadline(()=>database.terminate(),5000,'CLIENT_CLOSE_UNKNOWN');}catch{receipt.clientClose='UNKNOWN';save();}throw error;}
 // The detached managed services remain running after both PASS and HOLD.

}
export function validateZeroAuthState(users,tenants){
 if(!plain(users) || !Array.isArray(users.users) || users.users.length || Object.keys(users).some(key=>!['users','pageToken'].includes(key)) || users.pageToken!==undefined || users.nextPageToken!==undefined || !plain(tenants) || !Array.isArray(tenants.tenants) || tenants.tenants.length || Object.keys(tenants).some(key=>!['tenants','pageToken'].includes(key)) || tenants.pageToken!==undefined || tenants.nextPageToken!==undefined)refuse('R2_EXISTING_AUTH_OR_TENANT_HOLD_NO_STOP');return {zeroUsers:true,zeroTenants:true};
}
export async function inspectZeroAuth(auth,deadline=Date.now()+120000){
 const users=await withinDeadline(()=>auth.listUsers(8),deadline-Date.now(),'R2_AUTH_READ_UNKNOWN');
 const tenants=await withinDeadline(()=>auth.tenantManager().listTenants(1),deadline-Date.now(),'R2_AUTH_READ_UNKNOWN');
 if(Date.now()>=deadline)refuse('R2_AUTH_READ_UNKNOWN');return validateZeroAuthState(users,tenants);
}
export function validateEmptyAuthExportPayload(metadata,accounts,config){
 if(!same(metadata,{version:'15.33.0',auth:{version:'15.33.0',path:'auth_export'}}) || !same(accounts,{kind:'identitytoolkit#DownloadAccountResponse',users:[]}) || !same(config,{signIn:{allowDuplicateEmails:false},blockingFunctions:{},emailPrivacyConfig:{enableImprovedEmailPrivacy:false}}))refuse('R2_EMPTY_AUTH_EXPORT_SCHEMA');return {users:0,tenants:0};
}
export function runtimeProbeTrace(url,state,{status,reason}={}){
 const key=Object.entries(RECOVERY_URLS).find(([,value])=>value===url)?.[0];
 if(!key || !['BEGIN','COMPLETED','REFUSED'].includes(state) || status!==undefined && (!Number.isInteger(status) || status<100 || status>599) || reason!==undefined && !['HTTP_REDIRECT','HTTP_CAP','HTTP_RESPONSE','HTTP_DEADLINE','HTTP_CONNECT','HTTP_CONNECTION'].includes(reason))refuse('R2_TRACE_CONTRACT');
 return {probe:key,component:{hub:'hub',emulators:'hub',session:'functions',signin:'auth',hosting:'hosting',read:'storage',list:'storage'}[key],method:key==='signin'?'POST':'GET',pathname:new URL(url).pathname,sourceId:'R2_FIXED_RECOVERY_URLS',state,...(status!==undefined?{status}:{}),...(reason!==undefined?{reason}:{})};
}
export function validateZeroStorageEntries(entries){
 if(!Array.isArray(entries) || entries.length)refuse('R2_STORAGE_RETAINED_OR_UNKNOWN_ENTRY');return true;
}
export function inspectRuntimePolicyStorage(runRoot){
 const directory=path.join(runRoot,'tmp/firebase/storage/blobs');
 // Pinned index.js95/files/persistence/upload close the disk location only.
 // No authorized API/memory hook proves the old producer's uploadsMap empty.
 for(let current=path.dirname(directory);current.startsWith(`${runRoot}/`);current=path.dirname(current))if(existsSync(current)){const st=lstatSync(current);if(!st.isDirectory() || st.isSymbolicLink() || realpathSync(current)!==current || st.uid!==process.getuid())refuse('R2_STORAGE_ANCESTRY_UNKNOWN');}
 let entries=[];
 if(existsSync(directory)){const st=lstatSync(directory);if(!st.isDirectory() || st.isSymbolicLink() || st.uid!==process.getuid() || realpathSync(directory)!==directory)refuse('R2_STORAGE_TYPE_UNKNOWN');entries=readdirSync(directory);}
 validateZeroStorageEntries(entries);
 return {entries:0,path:directory,knownActiveUpload:'UNKNOWN',pendingStagingWriter:'UNKNOWN',coverage:'UNKNOWN_UPLOADS_MAP_NOT_OBSERVED',source:'firebase-tools15.33.0 storage/index.js95 + upload.js'};
}
export function inspectRuntimePolicyTree(runRoot){
 const root=recoveryRoot(RETAINED_RECOVERY.token);if(runRoot!==root)refuse('R2_FIXED_CUSTODY_ROOT');const entries=[];let total=0,files=0;const deadline=Date.now()+120000;
 const walk=(target,relative)=>{
  if(Date.now()>=deadline || entries.length>=4096)refuse('R2_CUSTODY_CAP');const st=lstatSync(target);
  if(st.isSymbolicLink() || st.uid!==process.getuid() || realpathSync(target)!==target)refuse('R2_CUSTODY_ESCAPE');
  if(st.isDirectory()){if((st.mode&0o777)!==0o700)refuse('R2_CUSTODY_MODE');entries.push({path:relative,type:'directory',mode:'0700',links:st.nlink});for(const name of readdirSync(target))walk(path.join(target,name),relative?`${relative}/${name}`:name);}
  else{if(!st.isFile() || st.nlink!==1 || (st.mode&0o777)!==0o600 || st.size>16*1024*1024 || ++files>512 || (total+=st.size)>32*1024*1024)refuse('R2_CUSTODY_FILE_CAP');const bytes=readRecoveryFile(target,st,16*1024*1024);entries.push({path:relative,type:'file',mode:'0600',links:1,bytes:bytes.length,sha256:digest(bytes)});}
 };
 walk(runRoot,'');return {entries,totalBytes:total,files,sha256:digest(canonicalJson(entries)),limits:'Posthoc/admission scan; not hard producer quota or atomic snapshot'};
}
function copyRuntimePolicyCustody(runRoot,tree){
 const destination=assertOwnedOutput(`.local/cache/m3/runtime-policy-correction/preservation/${recoveryToken()}`);if(existsSync(destination))refuse('R2_CUSTODY_DESTINATION_EXISTS');mkdirSync(destination,{recursive:true,mode:0o700});
 for(const entry of tree.entries){const target=path.join(destination,entry.path);if(entry.type==='directory'){if(entry.path)mkdirSync(target,{mode:0o700});}else{const source=path.join(runRoot,entry.path),st=lstatSync(source);const bytes=readRecoveryFile(source,st,16*1024*1024);if(digest(bytes)!==entry.sha256 || bytes.length!==entry.bytes)refuse('R2_CUSTODY_SOURCE_CHANGED');writeFileSync(target,bytes,{flag:'wx',mode:0o600});}}
 const after=inspectRuntimePolicyTree(runRoot);if(after.sha256!==tree.sha256)refuse('R2_CUSTODY_SOURCE_CHANGED');return {destination,tree,restore:'NOT_RUN',limits:'Known runtime state/log copies only; no media/full CMS backup'};
}
function policyPhaseReceipt(name,value){
 const target=assertOwnedOutput(`.local/cache/m3/runtime-policy-correction/${name}.json`);writeFileSync(target,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});return {path:target,sha256:digest(readFileSync(target))};
}
export function deriveRuntimePolicyOwnedWorkflow(operators,phases){
 if(!Array.isArray(operators) || operators.length!==2 || !Array.isArray(phases) || phases.length!==2)refuse('R2_WORKFLOW_ATTRIBUTION_UNKNOWN');
 return operators.map((actor,index)=>{
  const expected=[15456,23741][index],phase=phases[index];
  if(actor.pid!==expected || actor.mode!=='runtime-recovery-live' || actor.exit?.code!==1 || actor.close?.code!==1 || actor.exit.signal!==null || actor.close.signal!==null || actor.signals?.length || phase?.status!=='HOLD' || phase.reason!=='STARTUP_HOLD_HTTP_DEADLINE' || !phase.before || phase.before.documents!==4443 || ['readiness','auth','partialCreate','smoke','custody','after','afterExport'].some(key=>Object.hasOwn(phase,key)))refuse('R2_WORKFLOW_PENDING_OR_STAGE_UNKNOWN');
  return {...actor,authCreate:!['auth','partialCreate'].every(key=>!Object.hasOwn(phase,key)),exportStarted:Object.hasOwn(phase,'custody'),knownStorageUpload:['GET','GET'].some(method=>method!=='GET'),requestCoverage:'FIXED_INDEXED_RECOVER_SOURCE_READ_ONLY_READINESS_PATH'};
 });
}
function fixedOldOperators(){
 const operators=[readRuntimePolicyHistorical('original-close'),readRuntimePolicyHistorical('continuation-close')],phases=[readRuntimePolicyHistorical('original-phase'),readRuntimePolicyHistorical('continuation-phase')];
 // Executed current-R1 recovery bytes are separately archived and pinned, not
 // inferred from today's modified operator. Before readiness, source only GETs
 // Hub/session/Hosting/Storage READ/LIST; no upload method or mutator exists.
 const source=readFileSync(path.join(ROOT,'.local/cache/m3/runtime-policy-correction/02a-96a29eba-cca3-4fa1-a9cb-9f30c32df5b2/prior-source/pinky-lamb-cms/scripts/recover-auth-local.mjs'));
 if(digest(source)!=='807225eda0360ba0b7a0bb2be1689d1063de82346a724230f94b0f6e39d5570f')refuse('R2_EXECUTED_RECOVERY_SOURCE_UNKNOWN');
 return deriveRuntimePolicyOwnedWorkflow(operators,phases);
}

// Fixed source stages contain no exception details or state payloads. Admission
// reserves the terminal event before invoking the existing factory exactly once.
export const RUNTIME_POLICY_STAGE_IDS=Object.freeze(['ROOT','HISTORY_ORIGINAL','SOURCE','METADATA','EXTERNAL','ENVIRONMENT','FENCE','SDK_LOAD','SDK_FIRESTORE','OWNERSHIP','HISTORY','HISTORY_EQUALITY','ZERO_AUTH','STORAGE','WORKFLOW','QUIESCENCE','CUSTODY_SCAN','CUSTODY_COPY','AUTH_CUSTODY']);
export const RUNTIME_POLICY_STAGE_CAP=256;
function runtimePolicyStageAdmission(trace,stage,operation){
 if(!Array.isArray(trace) || trace.length>RUNTIME_POLICY_STAGE_CAP-2 || !RUNTIME_POLICY_STAGE_IDS.includes(stage) || typeof operation!=='function')refuse('R2_TRACE_POLICY');
 trace.push({stage,state:'BEGIN'});
}
export function runtimePolicySyncStage(trace,stage,operation){
 runtimePolicyStageAdmission(trace,stage,operation);
 try{const result=operation();if(result && typeof result.then==='function')refuse('R2_TRACE_POLICY');trace.push({stage,state:'COMPLETED'});return result;}
 catch(error){trace.push({stage,state:'REFUSED'});throw error;}
}
export async function runtimePolicyAsyncStage(trace,stage,operation){
 runtimePolicyStageAdmission(trace,stage,operation);
 try{const result=await operation();trace.push({stage,state:'COMPLETED'});return result;}
 catch(error){trace.push({stage,state:'REFUSED'});throw error;}
}
export function runtimePolicyFailureReason(error){return error?.code??'R2_UNCLASSIFIED_FAILURE';}

async function collectPolicyPreservation(runtime,auth,db,FieldPath,deadline,trace){
 assertRuntimePolicyAdmission('runtime-policy-preserve');const observed=runtimePolicySyncStage(trace,'OWNERSHIP',()=>observeRuntimePolicyRetained());runtimePolicySyncStage(trace,'EXTERNAL',()=>assertExternalFirestoreIdentity());
 const history=await runtimePolicyAsyncStage(trace,'HISTORY',()=>withinDeadline(()=>inventoryHistory(db,FieldPath.documentId(),{deadlineAt:deadline}),deadline-Date.now(),'R2_HISTORY_UNKNOWN'));
 const original=runtimePolicySyncStage(trace,'HISTORY_ORIGINAL',()=>readRuntimePolicyHistorical('original-phase')).before;runtimePolicySyncStage(trace,'HISTORY_EQUALITY',()=>assertHistoryEqual(original,history));
 const authState=await runtimePolicyAsyncStage(trace,'ZERO_AUTH',()=>inspectZeroAuth(auth,deadline));const disk=runtimePolicySyncStage(trace,'STORAGE',()=>inspectRuntimePolicyStorage(runtime.runRoot)),operators=runtimePolicySyncStage(trace,'WORKFLOW',()=>fixedOldOperators());
 const pending={create:operators.some(actor=>actor.authCreate),export:operators.some(actor=>actor.exportStarted),hubWriter:operators.some(actor=>actor.exportStarted || !actor.close),coverage:'SOURCE_BOUND_WORKFLOW_ONLY'};
 const storage={...disk,knownActiveUpload:operators.some(actor=>actor.knownStorageUpload),pendingStagingWriter:operators.some(actor=>actor.knownStorageUpload || !actor.close),coverage:operators.every(actor=>actor.requestCoverage==='FIXED_INDEXED_RECOVER_SOURCE_READ_ONLY_READINESS_PATH')?'SOURCE_BOUND_RETAINED_DISK_AND_KNOWN_OWNED_REQUESTS':'UNKNOWN',uploadsMap:'UNKNOWN',externalConcurrentWriters:'UNKNOWN'};
 runtimePolicySyncStage(trace,'QUIESCENCE',()=>validateRuntimePolicyQuiescence({rows:observed.owned.rows,operators,pending,storage}));
 const custody=runtimePolicySyncStage(trace,'CUSTODY_SCAN',()=>inspectRuntimePolicyTree(runtime.runRoot));if(Date.now()>=deadline)refuse('R2_PRESERVATION_DEADLINE');
 return {status:'PASS_PRESERVATION_ONLY',pid:15465,pgid:15465,start:RETAINED_RECOVERY.start,...authState,zeroStorage:true,knownQuiet:true,history,observed,storage,custody};
}
export async function runRuntimePolicyPhase(selector){
 validateRuntimePolicyOperator({selector,execPath:process.execPath,version:process.version,argv:process.argv.slice(1),execArgv:process.execArgv,cwd:process.cwd(),env:process.env});assertRuntimePolicyAdmission(selector);
 // Admission belongs to this exact guard parent, never a caller locator.
 const phase={ 'runtime-policy-preserve':'02c','runtime-policy-stop':'02d','runtime-policy-recover':'02e'}[selector];if(!phase)refuse('R2_FIXED_OPERATOR_PHASE');
 const admission=JSON.parse(readFileSync(assertOwnedOutput(`.local/cache/m3/runtime-policy-correction/admissions/${phase}.json`)));
 if(admission.selector!==selector || admission.phase!==phase || admission.pid!==process.ppid)refuse('R2_PARENT_ADMISSION');
 let db=null;const receipt={phase,selector,status:'IN_PROGRESS',startedAtUtc:new Date().toISOString(),sources:assertRuntimePolicyGate('02a').sources,trace:[]};
 const operatorInput={HOME:process.env.HOME,PATH:process.env.PATH,LANG:process.env.LANG};const start=Date.now(),deadline=start+120000;
 try{
  runtimePolicySyncStage(receipt.trace,'SOURCE',()=>assertRuntimePolicySources());runtimePolicySyncStage(receipt.trace,'METADATA',()=>assertRecoveryMetadata());runtimePolicySyncStage(receipt.trace,'EXTERNAL',()=>assertExternalFirestoreIdentity());
  const runRoot=runtimePolicySyncStage(receipt.trace,'ROOT',()=>recoveryRoot(RETAINED_RECOVERY.token)),runtime={runRoot,token:RETAINED_RECOVERY.token,cwd:path.join(runRoot,'cwd'),policySelector:selector};
  if(selector==='runtime-policy-stop'){
   // Re-attest zero state through public SDK before any signal; no assumptions
   // from the prior High receipt alone, and no blind kill/second signal.
   assertRuntimePolicyGate('02c');
  }
  runtimePolicySyncStage(receipt.trace,'ENVIRONMENT',()=>applyRecoveryEnvironment(runtimePolicyNodeEnvironment(runRoot,{HOME:process.env.HOME,PATH:process.env.PATH,LANG:process.env.LANG,PINKY_RUNTIME_POLICY_SELECTOR:selector==='runtime-policy-stop'?'runtime-policy-preserve':selector})));runtimePolicySyncStage(receipt.trace,'FENCE',()=>installNetworkFence());
  const sdk=await runtimePolicyAsyncStage(receipt.trace,'SDK_LOAD',()=>withinDeadline(()=>import('../cms-api/authorization.mjs'),deadline-Date.now(),'R2_SDK_LOAD_UNKNOWN'));db=sdk.db;const {FieldPath}=runtimePolicySyncStage(receipt.trace,'SDK_FIRESTORE',()=>createRequire(import.meta.url)('firebase-admin/firestore'));
  if(selector==='runtime-policy-preserve' || selector==='runtime-policy-stop'){
   const proof=await collectPolicyPreservation(runtime,sdk.auth,db,FieldPath,deadline,receipt.trace);receipt.preservation=proof;receipt.runtimeCustody=runtimePolicySyncStage(receipt.trace,'CUSTODY_COPY',()=>copyRuntimePolicyCustody(runtime.runRoot,proof.custody));
   if(selector==='runtime-policy-preserve'){
    const controller={record:{pid:15465},observe:observeRuntimePolicyRetained};receipt.emptyAuthCustody=await runtimePolicyAsyncStage(receipt.trace,'AUTH_CUSTODY',()=>withinDeadline(()=>exportAuthCustody(runtime,controller,{empty:true,deadlineAt:deadline}),deadline-Date.now(),'HOLD_WRITER_COMPLETION_UNKNOWN'));
    await runtimePolicyAsyncStage(receipt.trace,'ZERO_AUTH',()=>inspectZeroAuth(sdk.auth,deadline));const after=await runtimePolicyAsyncStage(receipt.trace,'HISTORY',()=>withinDeadline(()=>inventoryHistory(db,FieldPath.documentId(),{deadlineAt:deadline}),deadline-Date.now(),'R2_HISTORY_UNKNOWN'));runtimePolicySyncStage(receipt.trace,'HISTORY_EQUALITY',()=>assertHistoryEqual(proof.history,after));if(Date.now()>=deadline)refuse('R2_PRESERVATION_DEADLINE');receipt.status='PASS_PRESERVATION_ONLY';policyPhaseReceipt('02c-preservation',receipt);
   }else{
    validateRuntimePolicySignal({target:15465,phase:'02d',admitted:true,attempts:0,preflight:proof});
    policyPhaseReceipt('02d-signal-admission',{pid:15465,start:RETAINED_RECOVERY.start,signal:'SIGINT',atUtc:new Date().toISOString(),proofHash:digest(canonicalJson(proof))});
    const immediatelyBefore=await collectPolicyPreservation(runtime,sdk.auth,db,FieldPath,deadline,receipt.trace);assertHistoryEqual(proof.history,immediatelyBefore.history);validateRuntimePolicySignal({target:15465,phase:'02d',admitted:true,attempts:0,preflight:immediatelyBefore});assertExternalFirestoreIdentity();if(Date.now()>=deadline)refuse('R2_STOP_DEADLINE');
    const exactBeforeSignal=observeRuntimePolicyRetained();if(exactBeforeSignal.owned.rows.length!==2)refuse('R2_ACTIVE_OR_UNKNOWN_BEFORE_SIGNAL');const freshDisk=inspectRuntimePolicyStorage(runtime.runRoot);validateZeroStorageEntries(freshDisk.entries===0?[]:['unknown']);assertRuntimePolicyAdmission(selector);assertExternalFirestoreIdentity();if(Date.now()>=deadline)refuse('R2_STOP_DEADLINE');
    receipt.signal={pid:15465,signal:'SIGINT',attempts:1,atUtc:new Date().toISOString(),exactBeforeSignal};process.kill(15465,'SIGINT');
    let absent=false;while(Date.now()<deadline){const snapshot=runtimePolicyNativeSnapshot();try{validateRuntimePolicyAbsence({...snapshot,externalUnchanged:!!assertExternalFirestoreIdentity()});absent=true;receipt.absence=snapshot;break;}catch{await new Promise(resolve=>setTimeout(resolve,100));}}
    if(!absent || Date.now()>=deadline)refuse('R2_STOP_ABSENCE_UNKNOWN_NO_ESCALATION');receipt.status='PASS_ABSENCE_ONLY';policyPhaseReceipt('02d-absence',receipt);
   }
  }else{
   assertRuntimePolicyGate('02d');const snapshot=runtimePolicyNativeSnapshot();validateRuntimePolicyAbsence({...snapshot,externalUnchanged:!!assertExternalFirestoreIdentity()});await withinDeadline(()=>assertRecoveryPortsAvailable(),deadline-Date.now(),'R2_PORTS_UNKNOWN');
   const newRuntime=createRecoveryRuntime(operatorInput,'runtime-policy-recover'),controller=await withinDeadline(()=>launchRecoveryRuntime(newRuntime),deadline-Date.now(),'R2_LAUNCH_COMPLETION_UNKNOWN');receipt.newRuntime=newRuntime.runRoot;
   // Keep the original R1 reconstruction oracles in one fixed workflow.
   const before=await withinDeadline(()=>inventoryHistory(db,FieldPath.documentId(),{deadlineAt:deadline}),deadline-Date.now(),'R2_HISTORY_UNKNOWN');const original=runtimePolicySyncStage(receipt.trace,'HISTORY_ORIGINAL',()=>readRuntimePolicyHistorical('original-phase')).before;assertHistoryEqual(original,before);
   const request=(url,options={})=>boundedRecoveryRequest(url,{...options,deadlineAt:deadline,trace:event=>{receipt.trace.push(event);}});
   let ready=false;while(Date.now()<deadline){try{controller.observe();validateManagedHub(newRuntime,controller.record,await request(RECOVERY_URLS.hub),await request(RECOVERY_URLS.emulators));await verifyReadOnlyProbes(request,deadline);if(Date.now()>=deadline)refuse('R2_READINESS_DEADLINE');ready=true;break;}catch(error){receipt.firstFailure??={code:runtimePolicyFailureReason(error),atUtc:new Date().toISOString()};await new Promise(resolve=>setTimeout(resolve,250));}}
   if(!ready)refuse('R2_READINESS_HOLD');
   const {fixtures,fixturePassword}=await import('./seed-emulators.mjs');if(!same(fixtures.map(value=>({uid:value.uid,email:value.email,role:value.role??null,active:value.active??null,verified:value.verified})),RECOVERY_ROSTER))refuse('SEED_INPUT_DRIFT');
   receipt.auth=await withinDeadline(()=>reconstructMissing(sdk.auth,fixturePassword,{deadlineAt:deadline,beforeCreate:async()=>{assertRuntimePolicyAdmission(selector);assertExternalFirestoreIdentity();controller.observe();},onProgress:partial=>{receipt.partialCreate=partial;}}),deadline-Date.now(),'R2_AUTH_WRITE_COMPLETION_UNKNOWN');receipt.smoke=await withinDeadline(()=>smokeSessions(fixturePassword,before.inventory.members,request,{deadlineAt:deadline}),deadline-Date.now(),'R2_SMOKE_UNKNOWN');
   const after=await withinDeadline(()=>inventoryHistory(db,FieldPath.documentId(),{deadlineAt:deadline}),deadline-Date.now(),'R2_HISTORY_UNKNOWN');assertHistoryEqual(before,after);receipt.after=after;await inspectAuth(sdk.auth,true,deadline);receipt.custody=await withinDeadline(()=>exportAuthCustody({...newRuntime,policySelector:selector},controller,{deadlineAt:deadline}),deadline-Date.now(),'HOLD_WRITER_COMPLETION_UNKNOWN');await inspectAuth(sdk.auth,true,deadline);const afterExport=await withinDeadline(()=>inventoryHistory(db,FieldPath.documentId(),{deadlineAt:deadline}),deadline-Date.now(),'R2_HISTORY_UNKNOWN');assertHistoryEqual(before,afterExport);receipt.afterExport=afterExport;controller.observe();assertExternalFirestoreIdentity();receipt.status='PASS_LOCAL_AUTH_RECONSTRUCTION_CUSTODY_ONLY';policyPhaseReceipt('02e-recovery',receipt);
  }
  if(db){await withinDeadline(()=>db.terminate(),Math.min(5000,deadline-Date.now()),'R2_CLIENT_CLOSE_UNKNOWN');db=null;}if(Date.now()>=deadline)refuse('R2_WORKFLOW_DEADLINE');return receipt;
 }catch(error){receipt.status='HOLD';receipt.reason=runtimePolicyFailureReason(error);receipt.completedAtUtc=new Date().toISOString();policyPhaseReceipt(`${phase}-hold-${recoveryToken()}`,receipt);throw error;}
 finally{if(db && Date.now()<deadline)try{await withinDeadline(()=>db.terminate(),Math.min(5000,deadline-Date.now()),'R2_CLIENT_CLOSE_UNKNOWN');}catch{/* HOLD never treats client timeout as server cancellation. */}}
}

if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 try{if(process.argv.length!==3)refuse('FIXED_ARGUMENTS');if(process.argv[2]?.startsWith('runtime-policy-'))await runRuntimePolicyPhase(process.argv[2]);else await runRecoveryPhase(process.argv[2]);}
 catch(error){console.error(`RUNTIME_RECOVERY: ${error.code??'HOLD_UNKNOWN'}`);process.exitCode=1;}
}
