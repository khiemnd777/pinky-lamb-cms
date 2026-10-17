import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {z} from 'zod';
import {canonicalJson} from '../contracts/draft.mjs';
import {mergeLocalizedHero} from '../contracts/hero-localization.mjs';
import {mergeLocalizedProject} from '../contracts/project-localization.mjs';
import {mergeLocalizedService} from '../contracts/service-localization.mjs';
import {mergeLocalizedSection} from '../contracts/work-services-localization.mjs';
import {mergeLocalizedGroup} from '../contracts/group-localization.mjs';
import {localizedHeroReadSchema,localizedHeroReceiptSchema} from '../contracts/hero-localization-records.mjs';
import {localizedProjectReadSchema,localizedProjectReceiptSchema} from '../contracts/project-localization-records.mjs';
import {localizedServiceReadSchema,localizedServiceReceiptSchema} from '../contracts/service-localization-records.mjs';
import {localizedSectionReadSchema,localizedSectionReceiptSchema} from '../contracts/work-services-localization-records.mjs';
import {groupReadSchema,groupReceiptSchema} from '../contracts/group-localization-records.mjs';
import {assertMultilingualToolingRuntime,digest,runId,readPrivateJson,writeJsonExclusive} from './multilingual-release-files.mjs';
export {importPlanSchema,parseImportPlan} from '../contracts/multilingual-import.mjs';
import {parseImportPlan,verifyImportSource,stringFields} from '../contracts/multilingual-import.mjs';
const canonicalHash=value=>digest(canonicalJson(value));
export function inventoryLocalizedSource(content,{revision=null,sourceCatalog=[],catalog=[]}={}){
 const fields=stringFields(content).map(({path,value})=>({sourcePath:path,sha256:canonicalHash(value),value,characters:value.length,sourceLanguage:'UNREVIEWED'}));
 return {contractRevision:2,kind:'MULTILINGUAL_SOURCE_INVENTORY',origin:'RETAINED_HOME_V3',sourceHash:canonicalHash(content),sourceRevision:revision,sourceCatalogHash:canonicalHash(sourceCatalog),mediaCatalogHash:canonicalHash(catalog),fieldCount:fields.length,fields,
  entities:{projects:(content.projects??[]).map(v=>v.id),services:(content.services??[]).map(v=>v.id),sections:(content.sections??[]).map(v=>v.sectionId)},
  mediaReview:'REQUIRED_INCLUDING_EMBEDDED_TEXT',languageAcceptance:false};
}
async function verifySource(plan,{readSource}){
 if(typeof readSource!=='function')throw Error('Actual retained source reader required; a supplied hash is not source evidence');
 return verifyImportSource(plan,await readSource(),canonicalHash);
}
export function importRoute(item){if(item.kind==='hero')return `/api/cms/hero-localizations/home-v3/${item.locale}`;const family={project:'projects',service:'services',section:'sections',group:'groups'}[item.kind];if(!family)throw Error('Invalid import kind');return `/api/cms/localizations/${family}/${item.id}/${item.locale}`;}
const baseHash=(read,item)=>item.kind==='hero'?read.base?.contentHash:read.base?.dependencyHash;
const receiptBaseHash=(item,receipt)=>item.kind==='hero'?receipt.baseContentHash:receipt.dependencyHash;
const baseMatches=(read,item)=>baseHash(read,item)===item.expectedDependencyHash&&(item.kind!=='hero'||read.base?.revision===item.baseRevision);
const saveBody=(item,sourceHash,revision=item.expectedRevision)=>item.kind==='hero'?{expectedRevision:revision,...(sourceHash?{expectedSourceHash:sourceHash}:{}),baseRevision:item.baseRevision,baseContentHash:item.expectedDependencyHash,content:item.content}:{contractRevision:1,expectedRevision:revision,...(sourceHash?{expectedSourceHash:sourceHash}:{}),expectedDependencyHash:item.expectedDependencyHash,content:item.content};
const targetSchemas={hero:[localizedHeroReadSchema,localizedHeroReceiptSchema],project:[localizedProjectReadSchema,localizedProjectReceiptSchema],service:[localizedServiceReadSchema,localizedServiceReceiptSchema],section:[localizedSectionReadSchema,localizedSectionReceiptSchema],group:[groupReadSchema,groupReceiptSchema]};
function targetIdentity(item,value){if(value.locale!==item.locale||item.kind!=='hero'&&value[`${item.kind}Id`]!==item.id)throw Error('Import target identity mismatch');return value;}
function parseReceipt(item,value){return targetIdentity(item,targetSchemas[item.kind][1].parse(value));}
async function readTarget(item,request){
 const read=targetIdentity(item,targetSchemas[item.kind][0].parse(await request(importRoute(item),{method:'GET'})));
 if(read.draft&&canonicalHash(read.draft.content)!==read.draft.contentHash)throw Error('Import before-image content hash mismatch');
 if(read.draft&&(item.kind==='hero'?(read.sourceStale??(read.draft.baseContentHash!==read.base.contentHash||read.draft.baseRevision!==read.base.revision)):read.draft.dependencyHash!==read.base.dependencyHash))throw Error('Import target requires explicit source rebase');
 if(item.kind==='group')mergeLocalizedGroup(item.id,read.base.source,item.content);
 else ({hero:mergeLocalizedHero,project:mergeLocalizedProject,service:mergeLocalizedService,section:mergeLocalizedSection}[item.kind])(read.base[item.kind],item.content);
 return read;
}
/** request is the same authenticated CMS transport; no credential files or direct database adapter. */
export async function dryRunImport(input,{request,readSource}){
 const plan=parseImportPlan(input);if(typeof request!=='function')throw Error('Authenticated transport required');await verifySource(plan,{readSource});const records=[];
 for(const item of plan.items){const read=await readTarget(item,request);if((read.draft?.revision??null)!==item.expectedRevision||!baseMatches(read,item))throw Error(`Import conflict: ${item.kind}/${item.id}/${item.locale}`);records.push({key:`${item.kind}/${item.id}/${item.locale}`,before:read.draft??null,beforeHash:canonicalHash(read.draft??null),afterContentHash:canonicalHash(item.content)});}
 return {contractRevision:1,kind:'MULTILINGUAL_IMPORT_DRY_RUN',planHash:canonicalHash(plan),sourceHash:plan.sourceHash,commits:plan.items.length,minimumDocumentWrites:plan.items.length*2,records};
}
export async function executeSelectedImport(input,{request,readSource,journal,approval}){
 const plan=parseImportPlan(input),planHash=canonicalHash(plan);
 if(!approval||!Number.isSafeInteger(approval.maxCommits)||approval.action!=='RETAINED_SELECTED_IMPORT'||approval.planHash!==planHash||approval.maxCommits<plan.items.length)throw Error('Exact retained import approval required');
 if(!journal||typeof journal.append!=='function'||typeof journal.entries!=='function')throw Error('Durable private import journal required');
 const prior=await journal.entries(),committed=new Map(),intents=new Map();
 for(const entry of prior){if(!Number.isSafeInteger(entry.index)||entry.index<0||entry.index>=plan.items.length||!['INTENT','COMMITTED'].includes(entry.state))throw Error('Invalid import journal');if(entry.state==='INTENT'&&intents.has(entry.index)||entry.state==='COMMITTED'&&(!intents.has(entry.index)||committed.has(entry.index)))throw Error('Invalid import journal order');if(entry.planHash!==planHash)throw Error('Journal plan mismatch');if(entry.state==='INTENT')intents.set(entry.index,entry);if(entry.state==='COMMITTED')committed.set(entry.index,entry);}
 await verifySource(plan,{readSource});
 // Validate the entire selected set before the first new write. Prior committed
 // items are compared with their own receipts, never with stale initial revisions.
 for(let index=0;index<plan.items.length;index++){const item=plan.items[index],read=await readTarget(item,request),done=committed.get(index),intent=intents.get(index);if(intent&&(intent.beforeHash!==canonicalHash(intent.before)||intent.bodyHash!==canonicalHash(saveBody(item,plan.sourceHash))||intent.key!==`ml-import-${digest(`${planHash}:${index}`).slice(0,48)}`))throw Error('Immutable import intent mismatch');if(done){if(done.receipt?.contentHash!==canonicalHash(item.content)||done.receipt.revision!==(item.expectedRevision??0)+1||receiptBaseHash(item,done.receipt)!==item.expectedDependencyHash)throw Error('Invalid import receipt');if(read.draft?.revision!==done.receipt.revision||read.draft?.contentHash!==done.receipt.contentHash||canonicalHash(read.draft.content)!==done.receipt.contentHash||!baseMatches(read,item))throw Error('Concurrent edit after import; stop resume');}else{if(!baseMatches(read,item))throw Error('Import source dependency changed');const before=(read.draft?.revision??null)===item.expectedRevision,possibleCommit=intent&&read.draft?.revision===(item.expectedRevision??0)+1&&read.draft.contentHash===canonicalHash(item.content)&&canonicalHash(read.draft.content)===read.draft.contentHash;if(!before&&!possibleCommit)throw Error('Import preflight conflict');}}
 for(let index=0;index<plan.items.length;index++){
  let stage='SOURCE_PREFLIGHT';try{
  await verifySource(plan,{readSource});
  const item=plan.items[index],route=importRoute(item),body=saveBody(item,plan.sourceHash),key=`ml-import-${digest(`${planHash}:${index}`).slice(0,48)}`;
  stage='READ_TARGET';const read=await readTarget(item,request),done=committed.get(index);
  if(done){if(read.draft?.revision!==done.receipt.revision||read.draft?.contentHash!==done.receipt.contentHash||canonicalHash(read.draft.content)!==done.receipt.contentHash)throw Error('Concurrent edit after import; stop resume');continue;}
  let intent=intents.get(index);
  if(!intent){if((read.draft?.revision??null)!==item.expectedRevision||!baseMatches(read,item))throw Error('Import CAS conflict');intent={state:'INTENT',planHash,index,key,bodyHash:canonicalHash(body),before:read.draft??null,beforeHash:canonicalHash(read.draft??null)};stage='WRITE_INTENT';await journal.append(intent);intents.set(index,intent);}else if(intent.key!==key||intent.bodyHash!==canonicalHash(body))throw Error('Immutable import intent mismatch');
  // A lost response reuses the exact key/body. Server idempotency resolves an existing commit.
  stage='SAVE_COMMAND';const receipt=parseReceipt(item,await request(route,{method:'PUT',headers:{'Idempotency-Key':key},body}));
  stage='READBACK';const after=await readTarget(item,request);
  if(receipt.revision!==(item.expectedRevision??0)+1||receipt.contentHash!==canonicalHash(item.content)||receiptBaseHash(item,receipt)!==item.expectedDependencyHash||after.draft?.revision!==receipt.revision||canonicalHash(after.draft.content)!==receipt.contentHash)throw Error('Import readback mismatch; preserve journal and stop');
  stage='COMMIT_CHECKPOINT';await journal.append({state:'COMMITTED',planHash,index,receipt});committed.set(index,{receipt});
  }catch(error){return {state:'PARTIAL',planHash,completed:committed.size,pendingIndex:index,stage,outcomeUnknown:intents.has(index)&&!committed.has(index),errorCode:error.code??'IMPORT_NOT_CONFIRMED'};}
 }
 return {state:'COMPLETE',planHash,completed:committed.size,editorialApproval:false};
}
/** Recovery is a new audited save. Its immutable key also resolves an unknown response. */
export async function restoreImportedItem({item,committed,before,sourceHash},{request,key}){
 if(!before)throw Error('New drafts remain unapproved; deletion is not recovery');
 if(canonicalHash(before.content)!==before.contentHash||before.revision!==item.expectedRevision||committed.contentHash!==canonicalHash(item.content)||committed.revision!==(item.expectedRevision??0)+1)throw Error('Recovery before-image or receipt mismatch');
 const read=await readTarget(item,request),expected=read.draft?.revision===committed.revision&&read.draft?.contentHash===committed.contentHash&&canonicalHash(read.draft.content)===committed.contentHash,
  replay=read.draft?.revision===committed.revision+1&&read.draft?.contentHash===before.contentHash&&canonicalHash(read.draft.content)===before.contentHash;
 if((!expected&&!replay)||!baseMatches(read,item))throw Error('Concurrent edit; corrective save refused');
 const receipt=parseReceipt(item,await request(importRoute(item),{method:'PUT',headers:{'Idempotency-Key':key},body:saveBody({...item,content:before.content},sourceHash,committed.revision)})),after=await readTarget(item,request);
 if(receipt.revision!==committed.revision+1||receipt.contentHash!==before.contentHash||receiptBaseHash(item,receipt)!==item.expectedDependencyHash||after.draft?.revision!==receipt.revision||after.draft?.contentHash!==receipt.contentHash||canonicalHash(after.draft.content)!==before.contentHash)throw Error('Recovery readback mismatch; preserve journal');
 return receipt;
}
export async function recoverSelectedImport({plan:input,index},{request,journal,approval}){
 const plan=parseImportPlan(input),planHash=canonicalHash(plan);
 if(!Number.isSafeInteger(index)||index<0||index>=plan.items.length)throw Error('Invalid recovery index');
 const entries=await journal.entries(),intent=entries.find(e=>e.state==='INTENT'&&e.index===index),done=entries.find(e=>e.state==='COMMITTED'&&e.index===index);
 if(!intent||!done||entries.some(e=>e.planHash!==planHash)||intent.beforeHash!==canonicalHash(intent.before)||intent.bodyHash!==canonicalHash(saveBody(plan.items[index],plan.sourceHash)))throw Error('Recovery journal mismatch');
 if(approval?.action!=='RESTORE_SELECTED_IMPORT'||approval.planHash!==planHash||approval.index!==index||approval.beforeHash!==intent.beforeHash||approval.committedHash!==canonicalHash(done.receipt))throw Error('Exact corrective recovery approval required');
 if(!intent.before)return {state:'NEW_DRAFT_RETAINED',index,editorialApproval:false};
 const key=`ml-recover-${digest(`${planHash}:${index}:${intent.beforeHash}`).slice(0,48)}`;
 const previous=entries.find(e=>e.state==='RECOVERY_INTENT'&&e.index===index),restored=entries.find(e=>e.state==='RESTORED'&&e.index===index);
 if(previous&&(previous.key!==key||previous.beforeHash!==intent.beforeHash))throw Error('Recovery intent mismatch');
 if(!previous)await journal.append({state:'RECOVERY_INTENT',planHash,index,key,beforeHash:intent.beforeHash});
 const receipt=await restoreImportedItem({item:plan.items[index],committed:done.receipt,before:intent.before,sourceHash:plan.sourceHash},{request,key});
 if(restored&&canonicalHash(restored.receipt)!==canonicalHash(receipt))throw Error('Recovery receipt mismatch');
 if(!restored)await journal.append({state:'RESTORED',planHash,index,receipt});
 return {state:'RESTORED',index,receipt,editorialApproval:false};
}
export function createImportJournal(relative){if(!/^\.local\/multilingual-imports\/[A-Za-z0-9_-]+$/.test(relative))throw Error('Invalid private journal root');let sequence=0;return {async entries(){sequence=0;const entries=[];for(;;){try{entries.push(readPrivateJson(`${relative}/${String(sequence).padStart(4,'0')}.json`));sequence++;}catch(error){if(error.code==='ENOENT')break;throw error;}}return entries;},async append(entry){writeJsonExclusive(`${relative}/${String(sequence).padStart(4,'0')}.json`,entry);sequence++;}};}
export function validateImportCommand(args=process.argv.slice(2)){if(args.length!==4||args[0]!=='validate'||args[2]!=='--run-id')throw Error('Usage: multilingual-import-local.mjs validate <private-plan.json> --run-id <id>. Retained execution requires the authenticated CMS import action and exact approval.');const plan=parseImportPlan(readPrivateJson(args[1]));return {runId:runId(args[3]),planHash:canonicalHash(plan),items:plan.items.length,execution:false};}
export function createLoopbackImportRequest(sessionProvider){return async(route,{method='GET',headers={},body}={})=>{if(!/^\/api\/cms\/(?:localizations\/(?:projects|services|sections|groups)\/[a-z0-9-]+\/(?:en|vi|ja)|hero-localizations\/home-v3\/(?:en|vi|ja)|drafts\/home-v3)$/.test(route))throw Error('Import route denied');const token=await sessionProvider();if(typeof token!=='string'||token.length<20||token.length>8192||/[\r\n]/.test(token))throw Error('Invalid in-memory local session');const response=await fetch('http://127.0.0.1:5273'+route,{method,redirect:'error',signal:AbortSignal.timeout(15000),headers:{...headers,Origin:'http://127.0.0.1:5273',Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});const reader=response.body.getReader(),chunks=[];let length=0;for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>4*1048576){await reader.cancel();throw Error('Import response budget exceeded');}chunks.push(value);}const text=Buffer.concat(chunks.map(value=>Buffer.from(value))).toString('utf8');const value=JSON.parse(text);if(!response.ok){const error=Error('Import request rejected');error.code=value.error?.code??'REQUEST_FAILED';throw error;}return value.data??value;};}
async function stdinSession(){if(process.stdin.isTTY)throw Error('Supply private session JSON through stdin, never command arguments');let text='';for await(const chunk of process.stdin){text+=chunk;if(text.length>16384)throw Error('Session input too large');}return z.strictObject({token:z.string().min(20).max(8192),approval:z.unknown().optional()}).parse(JSON.parse(text));}
export async function main(args=process.argv.slice(2)){
 assertMultilingualToolingRuntime();
 if(args[0]==='validate')return validateImportCommand(args);
 if(args.length!==4||!['inventory','dry-run','apply','recover'].includes(args[0])||args[2]!=='--run-id')throw Error('Usage: multilingual-import-local.mjs <validate|inventory|dry-run|apply|recover> <private-input.json> --run-id <id>; authenticated modes read private session JSON from stdin');
 const id=runId(args[3]),input=readPrivateJson(args[1]),session=await stdinSession(),request=createLoopbackImportRequest(()=>session.token),
  readRetained=async()=>{const value=await request('/api/cms/drafts/home-v3'),draft=value.draft??value,content=draft.content??JSON.parse(draft.contentJson);if(!content||typeof content!=='object')throw Error('Retained source unavailable');return {content,revision:draft.revision,sourceCatalog:draft.sourceCatalog??[],catalog:draft.catalog??[]};},readSource=async()=>(await readRetained()).content;
 if(args[0]==='inventory'){
  z.strictObject({contractRevision:z.literal(1),kind:z.literal('RETAINED_HOME_V3_INVENTORY_REQUEST')}).parse(input);
  const retained=await readRetained(),report=inventoryLocalizedSource(retained.content,retained);writeJsonExclusive(`.local/multilingual-imports/${id}/inventory.json`,report);
  return {state:'INVENTORY',sourceHash:report.sourceHash,fieldCount:report.fieldCount,retainedWrites:0};
 }
 if(args[0]==='recover'){
  const selected=z.strictObject({plan:z.unknown(),index:z.number().int().nonnegative(),journalRunId:z.string()}).parse(input);
  return recoverSelectedImport(selected,{request,journal:createImportJournal(`.local/multilingual-imports/${runId(selected.journalRunId)}`),approval:session.approval});
 }
 const plan=parseImportPlan(input);
 if(args[0]==='dry-run'){
  const report=await dryRunImport(plan,{request,readSource});writeJsonExclusive(`.local/multilingual-imports/${id}/dry-run.json`,report);
  return {state:'DRY_RUN',planHash:report.planHash,commits:report.commits,retainedWrites:0};
 }
 return executeSelectedImport(plan,{request,readSource,journal:createImportJournal(`.local/multilingual-imports/${id}`),approval:session.approval});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{console.log(JSON.stringify(await main()));}catch(error){console.error(error.message);process.exitCode=1;}}
