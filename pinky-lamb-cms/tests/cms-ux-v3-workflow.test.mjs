import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {registerHooks} from 'node:module';
import {runInNewContext} from 'node:vm';
import {installNetworkFence} from '../scripts/local-guard.mjs';
import {ApiError} from '../contracts/errors.mjs';
import {encodeStoredContent} from '../contracts/draft.mjs';
import {parseMediaV3Content} from '../contracts/media-v3-content.mjs';
import {createSiteMediaManifest} from '../contracts/site-draft.mjs';
import {loadBaselineInputs,mapBaselineSite} from '../scripts/map-baseline-site.mjs';

installNetworkFence();
// Reuse the actual matrix, but actor admission is synthetic. This does not
// establish Firebase bearer-token or live membership enforcement.
const authorizationUrl=new URL('../cms-api/authorization.mjs',import.meta.url);
const authorizationSource=readFileSync(authorizationUrl,'utf8');
const permissionLiteral=/const permissions=(\{[^\n]+\});/.exec(authorizationSource)?.[1];
assert.ok(permissionLiteral,'actual authorization permission matrix located');
const permissions=runInNewContext('('+permissionLiteral+')');
const hook=registerHooks({load(url,context,next){if(url===authorizationUrl.href)return {format:'module',shortCircuit:true,source:'export const db=null; export function authorize(){throw Error("Unexpected SDK authorization");}'};return next(url,context);}});
const {createSiteImportService}=await import('../cms-api/import-site.mjs');
const {createSiteV3DraftService}=await import('../cms-api/site-v3-drafts.mjs');
const {createSiteV3ContextService}=await import('../cms-api/site-v3-context.mjs');
const {createSiteV3SnapshotService}=await import('../cms-api/site-v3-snapshots.mjs');
const {createSiteV3ReviewService}=await import('../cms-api/site-v3-reviews.mjs');
hook.deregister();
const copy=value=>structuredClone(value),hasCode=code=>error=>error instanceof ApiError&&error.code===code;
function memoryDb(){const records=new Map();return {records,collection:name=>({doc:id=>({id,path:name+'/'+id})}),async runTransaction(run){const pending=new Map([...records].map(([key,value])=>[key,copy(value)])),tx={get:async ref=>({id:ref.id,exists:pending.has(ref.path),data:()=>copy(pending.get(ref.path))}),create(ref,value){assert.ok(!pending.has(ref.path));pending.set(ref.path,copy(value));},set(ref,value){pending.set(ref.path,copy(value));}};const result=await run(tx);records.clear();for(const pair of pending)records.set(...pair);return result;}};}
async function fixture(){
 const db=memoryDb(),baseline=mapBaselineSite(loadBaselineInputs()),catalog=baseline.context.catalog;let actor={uid:'ux-owner',role:'OWNER'};
 const options={db,authorize:async(_request,action)=>{if(!permissions[action]?.includes(actor.role))throw new ApiError('FORBIDDEN');return copy(actor);},baselineProvider:()=>baseline,catalogProvider:()=>catalog,mediaProvider:{async resolveSelection({content,pinnedManifest}){return {safeCatalog:[],expectedMediaVersions:[],orderedManifest:pinnedManifest??createSiteMediaManifest({...content,schemaVersion:2},baseline.context).map(asset=>({source:'LEGACY',asset}))};}}};
 db.records.set('cmsDrafts/home',{contentJson:encodeStoredContent({schemaVersion:1,locale:baseline.content.locale,hero:baseline.content.hero,seo:baseline.content.seo},{catalog}),revision:159,updatedBy:actor.uid,updatedAt:'2026-10-15T00:00:00.000Z',lastEventId:'ux-m1-event'});
 await (await createSiteImportService(options)).importSite({request:{},actor,body:{expectedM1Revision:159,baselineManifestHash:baseline.provenance.baselineManifestHash},key:'ux-m2-import',correlationId:'ux-workflow'});
 db.records.get('cmsDrafts/home-v2').revision=778;
 const service=await createSiteV3DraftService(options),trusted=await createSiteV3ContextService(options),snapshots=await createSiteV3SnapshotService(options),reviews=await createSiteV3ReviewService(options);
 await service.importSite({request:{},actor,body:{expectedM2Revision:778},key:'ux-v3-import',correlationId:'ux-workflow'});
 return {db,service,snapshots,reviews,get actor(){return actor;},setActor:next=>{actor=next;},save:(body,key)=>service.saveDraft({request:{},actor,body,key,correlationId:'ux-workflow'}),readTrusted:()=>db.runTransaction(async transaction=>trusted.readTrustedDraftContext({transaction,target:await transaction.get(db.collection('cmsDrafts').doc('home-v3'))}))};
}

test('full collection edits/reorders pass real v3 validator, persist/read back and preserve v2/import/history',async()=>{
 const f=await fixture(),initial=await f.readTrusted(),original=copy(initial.current.content),candidate=copy(original);
 const oldSnapshot=await f.snapshots.submitSnapshot({request:{},actor:f.actor,body:{draftId:'home-v3',draftRevision:0},key:'ux-old-snapshot',correlationId:'ux-workflow'});
 const protectedRows=copy([...f.db.records].filter(([key])=>key==='cmsDrafts/home'||key==='cmsDrafts/home-v2'||key.startsWith('cmsSiteImports/')||key.startsWith('cmsSiteV3Imports/')||key==='cmsSnapshotsV3/'+oldSnapshot.id||key==='cmsReviewStatesV3/'+oldSnapshot.id||key.startsWith('cmsAudit/')));
 candidate.projects[0].title+=' — local fixture';candidate.projects[0].gallery.reverse();candidate.projects.reverse();candidate.services[0].titleVi+=' — local fixture';
 const work=candidate.sections.find(section=>section.sectionId==='work'),services=candidate.sections.find(section=>section.sectionId==='services');work.featuredIds.reverse();services.serviceOrder.reverse();
 assert.deepEqual(parseMediaV3Content(candidate,initial.context.contentContext),candidate,'the full UI candidate retains all existing fields and references');
 const project=candidate.projects.find(item=>item.id===original.projects[0].id),service=candidate.services[0];
 const patches=[{projectChanges:[{op:'REPLACE',id:project.id,value:project}]},{projectsOrder:candidate.projects.map(item=>item.id)},{serviceChanges:[{op:'REPLACE',id:service.id,value:service}]},{sections:[{sectionId:'work',value:work}]},{sections:[{sectionId:'services',value:services}]}];
 const firstBody={expectedRevision:0,patch:patches[0]},first=await f.save(firstBody,'ux-edit-0');assert.equal(first.revision,1);
 for(let index=1;index<patches.length;index++)assert.equal((await f.save({expectedRevision:index,patch:patches[index]},'ux-edit-'+index)).revision,index+1);
 const read=await f.service.readDraft({request:{}});assert.equal(read.revision,5);assert.deepEqual(read.content,candidate);
 for(const [key,value] of protectedRows)assert.deepEqual(f.db.records.get(key),value,'immutable historical row '+key);
 const savedRows=copy([...f.db.records]);assert.deepEqual(await f.save(firstBody,'ux-edit-0'),first);assert.deepEqual([...f.db.records],savedRows,'idempotency replay writes nothing');
 await assert.rejects(()=>f.save({expectedRevision:0,patch:patches[0]},'ux-stale'),hasCode('REVISION_CONFLICT'));assert.deepEqual([...f.db.records],savedRows);
 await assert.rejects(()=>f.save({expectedRevision:1,patch:patches[0]},'ux-edit-0'),hasCode('IDEMPOTENCY_PAYLOAD_MISMATCH'));assert.deepEqual([...f.db.records],savedRows);
 await assert.rejects(()=>f.save({expectedRevision:5,patch:{projectChanges:[{op:'REPLACE',id:project.id,value:{...project,id:'forbidden-rename'}}]}},'ux-id-rename'),hasCode('VALIDATION_ERROR'));assert.deepEqual([...f.db.records],savedRows);
 assert.deepEqual((await f.snapshots.readSnapshot({request:{},id:oldSnapshot.id})).snapshot.content,original);
});

test('actual permission matrix denies non-editors and real review service rejects OWNER self-review',async()=>{
 const f=await fixture(),initial=(await f.readTrusted()).current.content,hero={...initial.hero,note:'Synthetic local fixture note'};
 for(const role of ['REVIEWER','PUBLISHER']){f.setActor({uid:'ux-'+role.toLowerCase(),role});const before=copy([...f.db.records]);await assert.rejects(()=>f.save({expectedRevision:0,patch:{hero}},'ux-denied-'+role),hasCode('FORBIDDEN'));assert.deepEqual([...f.db.records],before);}
 f.setActor({uid:'ux-editor',role:'EDITOR'});await f.save({expectedRevision:0,patch:{hero}},'ux-editor-save');
 f.setActor({uid:'ux-owner',role:'OWNER'});const snapshot=await f.snapshots.submitSnapshot({request:{},actor:f.actor,body:{draftId:'home-v3',draftRevision:1},key:'ux-new-snapshot',correlationId:'ux-workflow'});
 const body={snapshotId:snapshot.id,contentHash:snapshot.contentHash,expectedReviewRevision:0,expectedSourceRevision:0,outcome:'CHANGES_REQUESTED',note:'Synthetic review note'},before=copy([...f.db.records]);
 await assert.rejects(()=>f.reviews.submitReview({request:{},actor:f.actor,body,key:'ux-self-review',correlationId:'ux-workflow'}),hasCode('SELF_REVIEW_FORBIDDEN'));assert.deepEqual([...f.db.records],before);
 f.setActor({uid:'ux-reviewer',role:'REVIEWER'});const result=await f.reviews.submitReview({request:{},actor:f.actor,body,key:'ux-independent-review',correlationId:'ux-workflow'});assert.equal(result.status,'CHANGES_REQUESTED');assert.equal((await f.snapshots.readSnapshot({request:{},id:snapshot.id})).snapshot.content.hero.note,hero.note);
});
