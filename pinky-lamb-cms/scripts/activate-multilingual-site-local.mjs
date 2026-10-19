import {z} from 'zod';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';
import {canonicalJson} from '../contracts/draft.mjs';
import {readReleaseManifest,verifyReleaseFiles,createMultilingualSiteHandler} from './export-multilingual-site-local.mjs';
import {assertMultilingualToolingRuntime,digest,runId,writeJsonExclusive,readPrivateJson} from './multilingual-release-files.mjs';
const same=(a,b)=>canonicalJson(a)===canonicalJson(b);
/** A controller must own an independently managed Hosting listener, never the emulator parent. */
function hostingIdentity(value){if(!value||value.service!=='hosting'||value.host!=='127.0.0.1'||value.port!==5010||value.projectId!=='demo-pinky-lamb-cms'||value.independentlyManaged!==true||!Number.isSafeInteger(value.pid)||value.pid<1||typeof value.startIdentity!=='string'||!value.startIdentity)throw Error('Independent Hosting identity required; shared emulator parent is never stoppable here');return value;}
export function planMultilingualActivation({relativeRoot,manifestSha256,currentHosting,beforeResources,activationId}){
 const manifest=readReleaseManifest(relativeRoot,manifestSha256);runId(activationId);hostingIdentity(currentHosting);
 if(manifest.qaFixture===true)throw Error('QA fixture cannot be activated');
 if(!Array.isArray(beforeResources)||beforeResources.length<1||beforeResources.some(r=>typeof r.path!=='string'||!/^[a-f0-9]{64}$/.test(r.sha256)))throw Error('Before HTTP/resource manifest required');
 const expected=new Map(manifest.compatibility.map(r=>[r.path,r.sha256]));for(const [name,hash] of expected)if(!beforeResources.some(r=>r.path===name&&r.sha256===hash))throw Error('CMS preview legacy compatibility not proven');
 return {contractRevision:1,kind:'MULTILINGUAL_HOSTING_ACTIVATION',activationId,relativeRoot,manifestSha256,releaseId:manifest.releaseId,currentHosting:{...currentHosting},beforeResources:structuredClone(beforeResources),port:5010,actions:['CAPTURE_BEFORE','STOP_OWNED_HOSTING','START_RELEASE_HOSTING','VERIFY_HTTP_MANIFEST'],rollback:'RESTORE_CAPTURED_HOSTING_ONLY',otherEmulators:'UNCHANGED',hostingConfig:{hosting:{public:path.resolve(fileURLToPath(new URL('../',import.meta.url)),relativeRoot),ignore:['.*'],headers:[{source:'/assets/**',headers:[{key:'Access-Control-Allow-Origin',value:'*'}]},{source:'/index.html',headers:[{key:'Access-Control-Allow-Origin',value:'http://127.0.0.1:5273'}]}]},emulators:{hosting:{host:'127.0.0.1',port:5010},ui:{enabled:false},singleProjectMode:true}}};
}
/** Listener absence must be positively observed; an inspection error is Unknown. */
async function inspectHosting(controller){
 try{const observation=await controller.inspectHosting();if(observation?.state==='ABSENT')return {state:'ABSENT'};if(observation?.state==='PRESENT')return {state:'PRESENT',identity:hostingIdentity(observation.identity)};return {state:'UNKNOWN'};}catch{return {state:'UNKNOWN'};}
}
/** Execution is intentionally separate from preparation. Source approval cannot authorize activation. */
export async function activateMultilingualSite(plan,{approval,controller,journal}){
 if(!approval||approval.action!=='ACTIVATE_LOCAL_5010'||approval.planHash!==digest(canonicalJson(plan)))throw Error('Exact activation approval required');
 if(plan.kind!=='MULTILINGUAL_HOSTING_ACTIVATION'||plan.port!==5010)throw Error('Invalid activation plan');
 for(const method of ['identity','inspectHosting','capture','stopHosting','startRelease','verifyRelease','restoreHosting'])if(typeof controller?.[method]!=='function')throw Error('Hosting-only controller unavailable');
 if(typeof journal?.append!=='function')throw Error('Private durable activation journal required');
 const actual=hostingIdentity(await controller.identity());if(!same(actual,plan.currentHosting))throw Error('Hosting process changed');
 verifyReleaseFiles(plan.relativeRoot,plan.manifestSha256);const before=await controller.capture();if(!before||!Array.isArray(before.resources)||!same(before.resources,plan.beforeResources))throw Error('Before-image changed');
 await journal.append({state:'BEFORE_CAPTURED',plan,before});let started;
 try{
  await journal.append({state:'STOP_ATTEMPTED',activationId:plan.activationId,identity:actual});
  await controller.stopHosting(actual);
  if((await inspectHosting(controller)).state!=='ABSENT')throw Error('Hosting stop did not prove a free port');
  await journal.append({state:'HOSTING_STOPPED',activationId:plan.activationId});
  started=hostingIdentity(await controller.startRelease({relativeRoot:plan.relativeRoot,manifestSha256:plan.manifestSha256,port:5010}));
  await controller.verifyRelease({identity:started,relativeRoot:plan.relativeRoot,manifestSha256:plan.manifestSha256,includeCmsPreview:true});
  await journal.append({state:'ACTIVE',activationId:plan.activationId,identity:started});return {state:'ACTIVE',releaseId:plan.releaseId,identity:started};
 }catch(error){
  const journalErrors=[];const recordFailure=async entry=>{try{await journal.append(entry);}catch(failure){journalErrors.push(failure);}};
  await recordFailure({state:'ACTIVATION_FAILED',activationId:plan.activationId,reason:error.code??'ACTIVATION_FAILED'});
  let observed=await inspectHosting(controller);
  if(observed.state==='PRESENT'&&!started&&same(observed.identity,actual)){
   await recordFailure({state:'ORIGINAL_HOSTING_PRESENT',activationId:plan.activationId});throw error;
  }
  if(observed.state==='PRESENT'&&started&&same(observed.identity,started)){
   await recordFailure({state:'RELEASE_STOP_ATTEMPTED',activationId:plan.activationId,identity:started});
   try{await controller.stopHosting(started);}catch{/* Reconcile actual listener state even if stop returned an error. */}
   observed=await inspectHosting(controller);
  }
  if(observed.state!=='ABSENT'){
   await recordFailure({state:'RESTORE_BLOCKED',activationId:plan.activationId,reason:observed.state==='UNKNOWN'?'LISTENER_STATE_UNKNOWN':'LISTENER_IDENTITY_CHANGED'});
   throw new Error('Hosting listener is foreign or Unknown; automatic restore refused',{cause:error});
  }
  await controller.restoreHosting(before);
  const restored=await inspectHosting(controller);if(restored.state!=='PRESENT'||!same((await controller.capture()).resources,before.resources))throw new Error('Hosting restore not proven; inspect the captured owner before further action',{cause:error});
  await recordFailure({state:'RESTORED',activationId:plan.activationId});if(journalErrors.length)throw new AggregateError([error,...journalErrors],'Hosting restored; activation journal writes failed');throw error;
 }
}
export async function rollbackMultilingualSite({plan,before,activeIdentity},{approval,controller,journal}){
 if(approval?.action!=='RESTORE_LOCAL_5010'||approval.activationId!==plan.activationId||approval.beforeHash!==digest(canonicalJson(before)))throw Error('Exact restore approval required');
 for(const method of ['identity','inspectHosting','stopHosting','restoreHosting','capture'])if(typeof controller?.[method]!=='function')throw Error('Hosting-only recovery controller unavailable');
 if(typeof journal?.append!=='function')throw Error('Private durable recovery journal required');
 if(!same(hostingIdentity(await controller.identity()),hostingIdentity(activeIdentity)))throw Error('Hosting process changed');
 if(!before||!same(before.resources,plan.beforeResources))throw Error('Recovery before-image mismatch');
 await journal.append({state:'RESTORE_ATTEMPTED',activationId:plan.activationId,identity:activeIdentity});
 let stopError;try{await controller.stopHosting(activeIdentity);}catch(error){stopError=error;}
 const observed=await inspectHosting(controller);
 if(observed.state!=='ABSENT'){await journal.append({state:'RESTORE_BLOCKED',activationId:plan.activationId,reason:observed.state==='UNKNOWN'?'LISTENER_STATE_UNKNOWN':'LISTENER_STILL_PRESENT'});throw new Error('Hosting recovery requires a proven free listener',{cause:stopError});}
 await controller.restoreHosting(before);
 const restored=await inspectHosting(controller);
 if(restored.state!=='PRESENT'||!same((await controller.capture()).resources,before.resources))throw Error('Hosting restore not proven');
 await journal.append({state:'RESTORED',activationId:plan.activationId,identity:restored.identity});return {state:'RESTORED',identity:restored.identity};
}
/** Standalone release listener is only for a free 5010 port. It never discovers or kills existing processes. */
export async function startStandaloneReleaseHosting({relativeRoot,manifestSha256,approval}){if(approval?.action!=='ACTIVATE_LOCAL_5010'||approval.manifestSha256!==manifestSha256||approval.relativeRoot!==relativeRoot)throw Error('Exact activation approval required');assertMultilingualToolingRuntime();verifyReleaseFiles(relativeRoot,manifestSha256);const server=createServer(createMultilingualSiteHandler({relativeRoot,manifestSha256,port:5010}));await new Promise((resolve,reject)=>{server.once('error',reject);server.listen({host:'127.0.0.1',port:5010,exclusive:true},resolve);});return server;}
async function readActivationApproval(){
 if(process.stdin.isTTY)throw Error('Supply the exact activation approval as private JSON through stdin');
 let text='';for await(const chunk of process.stdin){text+=chunk;if(Buffer.byteLength(text)>16384)throw Error('Activation approval exceeds input budget');}
 return z.strictObject({approval:z.unknown()}).parse(JSON.parse(text)).approval;
}
export async function main(args=process.argv.slice(2)){
 assertMultilingualToolingRuntime();
 if(args.length!==4||!['prepare','serve'].includes(args[0])||args[2]!=='--run-id')throw Error('Usage: activate-multilingual-site-local.mjs <prepare|serve> <private-input.json> --run-id <id>. Serve requires separate exact approval and a free local Hosting port.');
 const input=readPrivateJson(args[1]),id=runId(args[3]);
 if(args[0]==='prepare'){
  const plan=planMultilingualActivation({...input,activationId:id});writeJsonExclusive(`.local/activation-plans/multilingual-001/${id}.json`,plan);writeJsonExclusive(`.local/activation-plans/multilingual-001/${id}/firebase.hosting.json`,plan.hostingConfig);
  return {activation:false,planHash:digest(canonicalJson(plan)),planPath:`.local/activation-plans/multilingual-001/${id}.json`};
 }
 const artifact=z.strictObject({relativeRoot:z.string(),manifestSha256:z.string().regex(/^[a-f0-9]{64}$/)}).parse(input),approval=await readActivationApproval();
 if(approval?.activationId!==id)throw Error('Activation run approval mismatch');
 const journalRoot=`.local/activation-runs/multilingual-001/${id}`;
 // The standalone mode owns only its new listener. It cannot stop or adopt retained Hosting.
 verifyReleaseFiles(artifact.relativeRoot,artifact.manifestSha256);
 if(approval.action!=='ACTIVATE_LOCAL_5010'||approval.manifestSha256!==artifact.manifestSha256||approval.relativeRoot!==artifact.relativeRoot)throw Error('Exact standalone activation approval required');
 writeJsonExclusive(journalRoot+'/intent.json',{state:'START_ATTEMPTED',activationId:id,...artifact});
 let server;
 try{
  server=await startStandaloneReleaseHosting({...artifact,approval});
  writeJsonExclusive(journalRoot+'/active.json',{state:'ACTIVE',activationId:id,...artifact,pid:process.pid});
 }catch(error){if(server)await new Promise(resolve=>server.close(resolve));throw error;}
 for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>server.close(()=>{process.exitCode=0;}));
 return {state:'ACTIVE',activationId:id,host:'127.0.0.1',port:5010,...artifact};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{console.log(JSON.stringify(await main()));}catch(error){console.error(error.message);process.exitCode=1;}}
