import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {installNetworkFence} from '../scripts/local-guard.mjs';
import {ApiError,errorEnvelope} from '../contracts/errors.mjs';
import {encodeStoredContent} from '../contracts/draft.mjs';
import {projectClaimGroupsV3} from '../contracts/media-v3-content.mjs';
import {createSiteMediaManifest} from '../contracts/site-draft.mjs';
import {loadBaselineInputs,mapBaselineSite} from '../scripts/map-baseline-site.mjs';

installNetworkFence();
// drafts.mjs eagerly imports its default SDK. Isolate only that external
// boundary; accidentally invoking it fails rather than reaching real data.
const authorizationUrl=new URL('../cms-api/authorization.mjs',import.meta.url).href;
const hook=registerHooks({load(url,context,next){if(url===authorizationUrl)return {format:'module',shortCircuit:true,source:'export const db=null; export function authorize(){throw Error("Unexpected default authorization");}'};return next(url,context);}});
const {createSiteImportService}=await import('../cms-api/import-site.mjs');
const {createSiteV3DraftService}=await import('../cms-api/site-v3-drafts.mjs');
const {createSiteV3ContextService}=await import('../cms-api/site-v3-context.mjs');
const {createSiteV3SnapshotService}=await import('../cms-api/site-v3-snapshots.mjs');
hook.deregister();
// All writes are transactional copies in memory. Trusted baseline source is
// read-only; no Admin SDK, Auth identity or emulator connection is constructed.
function memoryDb(){
 const records=new Map();
 const db={records,collection:name=>({doc:id=>({id,path:name+'/'+id})}),async runTransaction(run){
  const pending=new Map(records),tx={get:async ref=>({id:ref.id,exists:pending.has(ref.path),data:()=>structuredClone(pending.get(ref.path))}),create(ref,value){assert.ok(!pending.has(ref.path));pending.set(ref.path,structuredClone(value));},set(ref,value){pending.set(ref.path,structuredClone(value));}};
  const result=await run(tx);records.clear();for(const entry of pending)records.set(...entry);return result;
 }};return db;
}
const safeError=code=>error=>error instanceof ApiError&&error.code===code;
async function fixture(){
 const db=memoryDb(),baseline=mapBaselineSite(loadBaselineInputs()),catalog=baseline.context.catalog;
 let role='OWNER',mediaError=null;
 const authorize=async (_request,action)=>{if(role==='ANONYMOUS')throw new ApiError('UNAUTHENTICATED');if(action==='SITE_IMPORT'&&role!=='OWNER')throw new ApiError('FORBIDDEN');return {uid:'synthetic-owner',role};};
 const options={db,authorize,baselineProvider:()=>baseline,catalogProvider:()=>catalog,mediaProvider:{async resolveSelection({content,pinnedManifest}){if(mediaError)throw mediaError;return {safeCatalog:[],expectedMediaVersions:[],orderedManifest:pinnedManifest??createSiteMediaManifest({...content,schemaVersion:2},baseline.context).map(asset=>({source:'LEGACY',asset}))};}}};
 db.records.set('cmsDrafts/home',{contentJson:encodeStoredContent({schemaVersion:1,locale:baseline.content.locale,hero:baseline.content.hero,seo:baseline.content.seo},{catalog}),revision:159,updatedBy:'synthetic-owner',updatedAt:'2026-10-15T00:00:00.000Z',lastEventId:'synthetic-m1-event'});
 const m2=await createSiteImportService(options);
 await m2.importSite({request:{},actor:{uid:'synthetic-owner'},body:{expectedM1Revision:159,baselineManifestHash:baseline.provenance.baselineManifestHash},key:'synthetic-m2-import',correlationId:'synthetic-recovery'});
 db.records.get('cmsDrafts/home-v2').revision=778;
 const service=await createSiteV3DraftService(options);
 const invoke=(body={expectedM2Revision:778},key='synthetic-v3-import')=>service.importSite({request:{},actor:{uid:'synthetic-owner'},body,key,correlationId:'synthetic-recovery'});
 const trusted=await createSiteV3ContextService(options),snapshots=await createSiteV3SnapshotService(options);
 const readTrusted=()=>db.runTransaction(async transaction=>trusted.readTrustedDraftContext({transaction,target:await transaction.get(db.collection('cmsDrafts').doc('home-v3'))}));
 return {db,service,invoke,trusted,snapshots,readTrusted,setRole:value=>{role=value;},setMediaError:value=>{mediaError=value;}};
}

test('absent Home v3 has a distinct safe HTTP404 after member authorization',async()=>{
 const f=await fixture();await assert.rejects(()=>f.service.readDraft({request:{}}),error=>{
  assert.equal(error.status,404);assert.equal(error.code,'DRAFT_NOT_INITIALIZED');
  assert.equal(errorEnvelope(error,'synthetic-recovery').error.message,'Chưa có bản nháp Home v3.');return true;
 });
 f.setRole('ANONYMOUS');await assert.rejects(()=>f.service.readDraft({request:{}}),safeError('UNAUTHENTICATED'));
});
test('real import copies revision778 once and preserves M1/M2; replay and conflicts retain records',async()=>{
 const f=await fixture(),before=structuredClone([...f.db.records]),receipt=await f.invoke();
 assert.equal(receipt.sourceDraftRevision,778);assert.equal(receipt.revision,0);
 const after=structuredClone([...f.db.records]);assert.equal(after.length,before.length+4);
 for(const [key,value] of before)assert.deepEqual(f.db.records.get(key),value);
 assert.deepEqual(await f.invoke(),receipt);assert.deepEqual([...f.db.records],after);
 await assert.rejects(()=>f.invoke({expectedM2Revision:777}),safeError('IDEMPOTENCY_PAYLOAD_MISMATCH'));
 await assert.rejects(()=>f.invoke({expectedM2Revision:778},'synthetic-second-import'),safeError('REVISION_CONFLICT'));
 f.setRole('EDITOR');await assert.rejects(()=>f.invoke(),safeError('FORBIDDEN'));assert.deepEqual([...f.db.records],after);
});
test('stale M2 revision rejects import without partial writes',async()=>{
 const f=await fixture(),before=structuredClone([...f.db.records]);
 await assert.rejects(()=>f.invoke({expectedM2Revision:777}),safeError('REVISION_CONFLICT'));assert.deepEqual([...f.db.records],before);
});
test('missing selected media retains NOT_FOUND rather than offering initialization',async()=>{
 const f=await fixture();await f.invoke();f.setMediaError(new ApiError('NOT_FOUND'));
 await assert.rejects(()=>f.service.readDraft({request:{}}),error=>error.code==='NOT_FOUND'&&error.status===404);
 f.setMediaError(new ApiError('INTERNAL_ERROR'));await assert.rejects(()=>f.service.readDraft({request:{}}),safeError('INTERNAL_ERROR'));
});

function assertFirestoreShape(value,parentIsArray=false){
 if(Array.isArray(value)){assert.equal(parentIsArray,false,'Firestore Standard rejects direct array-in-array');for(const child of value)assertFirestoreShape(child,true);}
 else if(value&&typeof value==='object')for(const child of Object.values(value))assertFirestoreShape(child,false);
}
test('new import persists one encoded immutable content source without nested arrays',async()=>{
 const f=await fixture(),receipt=await f.invoke(),record=f.db.records.get('cmsSiteV3Imports/'+receipt.importId);
 assert.equal(Object.hasOwn(record,'baselineContent'),false);
 assert.equal(typeof record.initialDraft.contentJson,'string');assertFirestoreShape(record);
 const read=await f.readTrusted();assert.deepEqual(read.record.baselineContent,JSON.parse(record.initialDraft.contentJson));
 assert.equal(Object.hasOwn(record,'baselineContent'),false,'hydration does not mutate persistence');
});
test('reader accepts encoded-only import and fails closed on initial draft and audit corruption',async()=>{
 const f=await fixture(),receipt=await f.invoke(),key='cmsSiteV3Imports/'+receipt.importId;
 const record=f.db.records.get(key);delete record.baselineContent;const initial=structuredClone(record);
 assert.deepEqual((await f.readTrusted()).record.baselineContent,JSON.parse(initial.initialDraft.contentJson));
 const mutations=[
  value=>{value.initialDraft.contentJson='{invalid';},
  value=>{const content=JSON.parse(value.initialDraft.contentJson);content.schemaVersion=2;value.initialDraft.contentJson=JSON.stringify(content);},
  value=>{value.initialDraft.revision=1;},value=>{value.initialDraft.updatedBy='other-actor';},
  value=>{value.initialDraft.updatedAt='2026-10-14T00:00:00.000Z';},value=>{value.initialDraft.lastEventId='other-event';},
  value=>{value.initialDraft.importLineage.sourceDraftRevision=777;},
  value=>{delete value.initialDraft;}
 ];
 for(const mutate of mutations){const corrupted=structuredClone(initial);mutate(corrupted);f.db.records.set(key,corrupted);await assert.rejects(()=>f.readTrusted(),safeError('INTERNAL_ERROR'));}
 f.db.records.set(key,initial);
 const auditKey='cmsAudit/'+initial.eventId,audit=f.db.records.get(auditKey);
 for(const field of ['action','actorUid','importId','at']){f.db.records.set(auditKey,{...audit,[field]:'corrupted'});await assert.rejects(()=>f.readTrusted(),safeError('INTERNAL_ERROR'));}
 f.db.records.set(auditKey,audit);assert.deepEqual((await f.readTrusted()).record.baselineContent,JSON.parse(initial.initialDraft.contentJson));
});
test('historical matching raw baseline is accepted and mismatching raw baseline is rejected',async()=>{
 const f=await fixture(),receipt=await f.invoke(),record=f.db.records.get('cmsSiteV3Imports/'+receipt.importId);
 record.baselineContent=JSON.parse(record.initialDraft.contentJson);assert.deepEqual((await f.readTrusted()).record.baselineContent,record.baselineContent);
 record.baselineContent.hero.eyebrow='Synthetic corrupted baseline';await assert.rejects(()=>f.readTrusted(),safeError('INTERNAL_ERROR'));
});
test('snapshot baseline remains imported initial content after current draft and M2 changes',async()=>{
 const f=await fixture();await f.invoke();const initial=await f.readTrusted(),initialContent=structuredClone(initial.current.content);
 // Model the new persisted shape even during RED so the historical reader is
 // tested against contentJson rather than passing through the old duplicate.
 delete f.db.records.get('cmsSiteV3Imports/'+initial.current.importLineage.importId).baselineContent;
 const snapshot=await f.snapshots.submitSnapshot({request:{},actor:{uid:'synthetic-owner'},body:{draftId:'home-v3',draftRevision:0},key:'synthetic-snapshot',correlationId:'synthetic-recovery'});
 const hero={...initialContent.hero,eyebrow:'Synthetic edited draft'};
 const saved=await f.service.saveDraft({request:{},actor:{uid:'synthetic-owner'},body:{expectedRevision:0,patch:{hero}},key:'synthetic-save',correlationId:'synthetic-recovery'});
 assert.equal(saved.revision,1);
 await assert.rejects(()=>f.service.saveDraft({request:{},actor:{uid:'synthetic-owner'},body:{expectedRevision:0,patch:{hero}},key:'synthetic-stale-save',correlationId:'synthetic-recovery'}),safeError('REVISION_CONFLICT'));
 f.db.records.get('cmsDrafts/home-v2').contentJson='{invalid-current-m2';
 const historical=await f.db.runTransaction(async transaction=>f.trusted.readTrustedSnapshotContext({transaction,snapshotDoc:await transaction.get(f.db.collection('cmsSnapshotsV3').doc(snapshot.id))}));
 assert.deepEqual(historical.snapshot.content,initialContent);
 assert.deepEqual(historical.claimContext.baselineClaimGroups,projectClaimGroupsV3(initialContent));
 assert.notDeepEqual(historical.claimContext.baselineClaimGroups,projectClaimGroupsV3((await f.readTrusted()).current.content));
 assert.deepEqual(historical.record.baselineContent,initialContent);
});
