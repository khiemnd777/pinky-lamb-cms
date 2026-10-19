import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {canonicalJson} from '../contracts/draft.mjs';
import {parseImportPlan,importRoute,dryRunImport,executeSelectedImport,recoverSelectedImport,inventoryLocalizedSource} from '../scripts/multilingual-import-local.mjs';
import {createServiceLocalizationService} from '../cms-api/service-localizations.mjs';
import {fixture as serviceFixture} from './service-localization-api.test.mjs';
import {base} from './service-localization-contract.test.mjs';
const hash=value=>createHash('sha256').update(canonicalJson(value)).digest('hex');
const source={services:[base.service]},content={title:base.service.title,subtitle:'Source comparison',summary:base.service.summary,scope:base.service.scope};
const plan=()=>({contractRevision:2,kind:'MULTILINGUAL_SELECTED_IMPORT',planId:'selected-service',sourceHash:hash(source),maxCommits:1,items:[{
 kind:'service',id:base.service.id,locale:'en',expectedRevision:null,expectedDependencyHash:base.dependencyHash,content:structuredClone(content),
 source:{origin:'RETAINED_HOME_V3',path:'/services/0',sha256:hash(base.service),language:'mixed',reviewer:'Synthetic content owner',factsReviewed:true,mediaReviewed:true},
 mappings:[['title','title','en'],['titleVi','subtitle','vi'],['summary','summary','en'],['scope/0','scope/0','en']].map(([from,to,language])=>({sourcePath:'/services/0/'+from,targetPath:'/'+to,sha256:hash(from==='scope/0'?base.service.scope[0]:base.service[from]),sourceLanguage:language,treatment:language==='en'?'COPY':'TRANSLATE',reviewedBy:'Synthetic content owner'})),
}]});
async function fixture(input=plan()){
 const f=serviceFixture(),entries=[];let lose=false,currentSource=structuredClone(source);
 f.context.readTrustedDraftContext=async()=>({current:{content:structuredClone(currentSource)}});
 const api=await createServiceLocalizationService({context:f.context});
 const request=async(route,{method,body,headers}={})=>{const locale=route.split('/').at(-1),args=f.args(locale,headers?.['Idempotency-Key']);assert.equal(route,`/api/cms/localizations/services/${base.service.id}/${locale}`);if(method==='GET')return api.readDraft(args);assert.equal(method,'PUT');const receipt=await api.saveDraft({...args,body});if(lose){lose=false;throw Error('Synthetic lost response');}return receipt;};
 const options={request,readSource:async()=>structuredClone(currentSource),journal:{entries:async()=>structuredClone(entries),append:async entry=>entries.push(structuredClone(entry))},approval:{action:'RETAINED_SELECTED_IMPORT',planHash:hash(input),maxCommits:input.maxCommits}};
 return {...f,api,entries,options,setSource:value=>{currentSource=structuredClone(value);},lose:()=>lose=true};
}
test('selected import validates target identity, complete field mapping and aggregate budget',()=>{
 assert.equal(importRoute(parseImportPlan(plan()).items[0]),`/api/cms/localizations/services/${base.service.id}/en`);
 const duplicate=plan();duplicate.items.push(duplicate.items[0]);duplicate.maxCommits=2;assert.throws(()=>parseImportPlan(duplicate),/Duplicate/);
 for(const mutate of [p=>p.items[0].id='INVALID',p=>p.items[0].locale='fr',p=>p.items[0].mappings.pop()]){const p=plan();mutate(p);assert.throws(()=>parseImportPlan(p));}
});
test('dry-run reads real service contracts and all selected CAS targets without a write',async()=>{
 const f=await fixture(),report=await dryRunImport(plan(),f.options);assert.equal(f.records.size,0);assert.equal(report.commits,1);assert.equal(report.records[0].before,null);
 await f.api.saveDraft(f.args());await assert.rejects(dryRunImport(plan(),f.options),/conflict/);assert.equal(f.records.size,2);
});
test('actual source paths, field hashes and language decisions are checked before target mutations',async()=>{
 const f=await fixture();for(const mutate of [p=>p.items[0].source.sha256='f'.repeat(64),p=>p.items[0].mappings[0].sha256='f'.repeat(64),p=>p.items[0].mappings[0].sourcePath='/services/0/missing',p=>p.items[0].mappings[0].sourceLanguage='mixed']){const p=plan();mutate(p);await assert.rejects(dryRunImport(p,f.options));}
 await assert.rejects(dryRunImport(plan(),{...f.options,readSource:undefined,readSourceHash:async()=>hash(source)}),/Actual retained source/);
 assert.equal(inventoryLocalizedSource(source).fields.find(field=>field.sourcePath==='/services/0/title').sha256,hash(base.service.title));assert.equal(f.records.size,0);
});
test('interrupted import calls the actual save service with the identical intent and commits once',async()=>{
 const p=plan(),f=await fixture(p);f.lose();assert.equal((await executeSelectedImport(p,f.options)).state,'PARTIAL');assert.equal(f.records.size,2);
 assert.equal((await executeSelectedImport(p,f.options)).state,'COMPLETE');assert.equal((await executeSelectedImport(p,f.options)).state,'COMPLETE');assert.equal(f.records.size,2);assert.equal(f.entries.filter(entry=>entry.state==='COMMITTED').length,1);
 assert.equal((await f.api.readDraft(f.args())).draft.revision,1);
});
test('the entire selected plan fails preflight before the first write when a later target changed',async()=>{
 const p=plan();p.maxCommits=2;p.items.push({...structuredClone(p.items[0]),locale:'vi',mappings:p.items[0].mappings.map(row=>({...row,treatment:'TRANSLATE'}))});
 const f=await fixture(p);await f.api.saveDraft(f.args('vi'));await assert.rejects(executeSelectedImport(p,f.options),/preflight/);assert.equal((await f.api.readDraft(f.args('en'))).draft,null);assert.equal(f.records.size,2);assert.equal(f.entries.length,0);
});
test('corrective recovery uses a separately approved journal before-image and creates one new revision',async()=>{
 const p=plan();p.items[0].expectedRevision=1;const f=await fixture(p),beforeArgs=f.args();beforeArgs.body.content={...content,title:'Before selected import'};await f.api.saveDraft(beforeArgs);
 assert.equal((await executeSelectedImport(p,f.options)).state,'COMPLETE');const intent=f.entries.find(entry=>entry.state==='INTENT'),done=f.entries.find(entry=>entry.state==='COMMITTED'),selected={plan:p,index:0};
 await assert.rejects(recoverSelectedImport(selected,f.options),/approval/);
 const options={...f.options,approval:{action:'RESTORE_SELECTED_IMPORT',planHash:hash(p),index:0,beforeHash:intent.beforeHash,committedHash:hash(done.receipt)}};
 assert.equal((await recoverSelectedImport(selected,options)).state,'RESTORED');assert.equal((await recoverSelectedImport(selected,options)).state,'RESTORED');
 const read=await f.api.readDraft(f.args());assert.equal(read.draft.revision,3);assert.equal(read.draft.content.title,'Before selected import');
 const next=f.args('en','concurrent-after-recovery');next.body={...next.body,expectedRevision:3,content:{...content,title:'Concurrent edit'}};await f.api.saveDraft(next);await assert.rejects(recoverSelectedImport(selected,options),/Concurrent/);assert.equal((await f.api.readDraft(f.args())).draft.revision,4);
});
test('source-only approval never authorizes retained import and new drafts are retained during recovery',async()=>{
 await assert.rejects(executeSelectedImport(plan(),{}),/approval/);const p=plan(),f=await fixture(p);await executeSelectedImport(p,f.options);
 const intent=f.entries[0],done=f.entries[1],options={...f.options,approval:{action:'RESTORE_SELECTED_IMPORT',planHash:hash(p),index:0,beforeHash:intent.beforeHash,committedHash:hash(done.receipt)}};
 assert.equal((await recoverSelectedImport({plan:p,index:0},options)).state,'NEW_DRAFT_RETAINED');assert.equal(f.records.size,2);
});

test('lost readback after a committed save reports the exact partial stage and resumes without a second commit',async()=>{
 const p=plan(),f=await fixture(p),original=f.options.request;let written=false,failRead=true;
 const request=async(route,options)=>{if(options.method==='GET'&&written&&failRead){failRead=false;throw Error('Readback unavailable');}const result=await original(route,options);if(options.method==='PUT')written=true;return result;};
 const options={...f.options,request},partial=await executeSelectedImport(p,options);assert.equal(partial.state,'PARTIAL');assert.equal(partial.stage,'READBACK');assert.equal(partial.outcomeUnknown,true);assert.equal(partial.pendingIndex,0);assert.equal(partial.completed,0);assert.equal(f.records.size,2);
 assert.equal((await executeSelectedImport(p,options)).state,'COMPLETE');assert.equal(f.records.size,2);assert.equal((await f.api.readDraft(f.args())).draft.revision,1);
});

test('source drift between CLI preflight and target transaction rejects without a target write',async()=>{
 const p=plan(),f=await fixture(p),request=f.options.request;
 f.options.request=async(route,options)=>{if(options.method==='PUT')f.setSource({...source,hero:{eyebrow:'Changed outside Service dependencies'}});return request(route,options);};
 const result=await executeSelectedImport(p,f.options);
 assert.equal(result.state,'PARTIAL');assert.equal(result.stage,'SAVE_COMMAND');assert.equal(result.errorCode,'REVISION_CONFLICT');assert.equal(result.completed,0);assert.equal(f.records.size,0);
 assert.equal(f.entries.filter(entry=>entry.state==='COMMITTED').length,0);
});
test('immutable import intent includes the source pin and refuses edited pins on retry',async()=>{
 const p=plan(),f=await fixture(p),request=f.options.request,writes=[];
 f.options.request=async(route,options)=>{if(options.method==='PUT')writes.push(structuredClone(options.body));return request(route,options);};
 f.lose();assert.equal((await executeSelectedImport(p,f.options)).state,'PARTIAL');
 f.setSource({...source,changed:true});await assert.rejects(executeSelectedImport(p,f.options),/Source changed/);
 f.setSource(source);assert.equal((await executeSelectedImport(p,f.options)).state,'COMPLETE');
 assert.deepEqual(writes[0],writes[1]);assert.equal(writes[0].expectedSourceHash,p.sourceHash);assert.equal(f.records.size,2);
});
