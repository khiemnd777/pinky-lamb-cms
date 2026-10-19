import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {openLocalDataStore} from '../cms-api/local-data-store.mjs';
import {editorialFixture} from './localized-editorial-api.test.mjs';
import {createLocalizedEditorialService} from '../cms-api/localized-editorial.mjs';
import {hashProjectValue as hash} from '../cms-api/project-localization-context.mjs';
import {runSelectedPublication} from '../cms-api/selected-publication.mjs';
import {mergeLocalizedService} from '../contracts/service-localization.mjs';
import {releaseBytesFixture} from './helpers/localized-release-fixture.mjs';
import {planMultilingualSiteExport} from '../scripts/export-multilingual-site-local.mjs';
import {publishSelectedWebsite} from '../admin/selected-website-publication.mjs';

async function fixture(t){
 const directory=mkdtempSync(path.join(realpathSync(tmpdir()),'pinky-selected-')),db=openLocalDataStore(directory,{create:true});
 t.after(()=>{db.close();rmSync(directory,{recursive:true,force:true});});
 const original=releaseBytesFixture(),before=structuredClone(original.release),f=editorialFixture();f.setActor('admin','OWNER');
 const qa=structuredClone(before.entries[0].workServices.services[0]);qa.draft.revision++;qa.draft.content.summary='Selected English content';qa.draft.contentHash=hash(qa.draft.content);qa.service=mergeLocalizedService(qa.service,qa.draft.content);
 const originalRead=await f.context.readResource(null,f.resource),{ref,encode,buildQa,...plain}=originalRead;void ref;void encode;void buildQa;
 const value={...plain,draft:qa.draft,qa};
 const context={...f.context,db,readResource:async(_tx,resource)=>{assert.deepEqual(resource,f.resource,'no other draft/resource read');return structuredClone(value);}};
 const editorial=await createLocalizedEditorialService({resourceContext:context}),selection={resource:f.resource,expectedRevision:qa.draft.revision,expectedContentHash:qa.draft.contentHash,expectedDependencyHash:qa.draft.dependencyHash};
 const base={port:4189,activation:false,releaseId:'live',artifact:{relativeRoot:'.local/releases/multilingual-001/live/public',manifestSha256:'c'.repeat(64)},snapshotSetHash:before.snapshotSetHash};
 let current=structuredClone(base),failExport=false,failVerify=false,revoke=false,exports=0,publications=0,verifications=0,plan;
 const job={id:'synthetic-job',selection};
 const deps={editorial:{...editorial,publishDraft:async args=>{publications++;return editorial.publishDraft(args);}},owner:async()=>{if(revoke)throw Error('FORBIDDEN');},readPointer:()=>structuredClone(current),writePointer:value=>{current=structuredClone(value);},readRelease:async()=>structuredClone(before),save:()=>{},stage:async()=>{},
  exportRelease:async(job,release)=>{exports++;if(failExport)throw Error('PACKAGING_FAILURE');plan=planMultilingualSiteExport({release,files:original.files},'test-selected-'+job.exportAttempt);return {root:'.local/releases/multilingual-001/'+plan.manifest.releaseId+'/public',manifestSha256:hash(plan.manifest),releaseId:plan.manifest.releaseId,releaseSource:{path:'.local/synthetic/release.json',sha256:hash(release)}};},
  verifyWebsite:async pointer=>{verifications++;assert.equal(current.releaseId,pointer.releaseId);if(failVerify)throw Error('HTTP_FAILURE');}
 };
 return {db,job,deps,selection,before,original,base,current:()=>current,setCurrent:v=>{current=structuredClone(v);},editorial,qa,value,plan:()=>plan,counts:()=>({exports,publications,verifications}),failExport:v=>{failExport=v;},failVerify:v=>{failVerify=v;},revoke:v=>{revoke=v;}};
}
const run=f=>runSelectedPublication(f.job,{request:{},actor:{uid:'admin'}},f.deps);

test('real SQLite transaction and actual exporter change one service/locale; other live pins and HTML stay unchanged',async t=>{
 const f=await fixture(t),receipt=await run(f);assert.equal(receipt.status,'PUBLISHED_ON_WEBSITE');assert.equal(f.current().port,4189);
 const snapshot=await f.editorial.readSnapshot({request:{},id:receipt.snapshotId});assert.equal(snapshot.snapshot.revision,f.selection.expectedRevision);
 assert.deepEqual((await f.editorial.readQueue({request:{},query:{status:'APPROVED'}})).items.map(i=>i.snapshot.resource),[f.selection.resource]);
 const beforePlan=planMultilingualSiteExport(f.original,'test-before');
 for(const name of ['vi/index.html','ja/index.html'])assert.deepEqual(f.plan().files.find(v=>v.relative===name).bytes,beforePlan.files.find(v=>v.relative===name).bytes);
 assert.match(f.plan().files.find(v=>v.relative==='index.html').bytes.toString(),/Selected English content/);
 for(const entry of f.plan().manifest.identities){const before=f.before.entries.find(v=>v.locale===entry.locale);assert.deepEqual(entry.dependencyVector.resources.filter(v=>v.resource.kind!=='service'||v.resource.locale!=='en'),before.dependencyVector.resources.filter(v=>v.resource.kind!=='service'||v.resource.locale!=='en'));}
});
test('packaging failure keeps old website; retry keeps one immutable publication in real SQLite',async t=>{
 const f=await fixture(t);f.failExport(true);await assert.rejects(run(f),/PACKAGING_FAILURE/);assert.deepEqual(f.current(),f.base);assert.equal(f.job.result,undefined);
 const id=f.job.publication.snapshotId;f.failExport(false);assert.equal((await run(f)).snapshotId,id);assert.equal(f.counts().publications,1);assert.equal((await f.db.collection('cmsLocalizedSnapshots').get()).size,1);assert.equal((await f.db.collection('cmsLocalizedReviews').get()).size,1);
});
test('HTTP verification failure restores old website; explicit retry reuses artifact and frozen snapshot',async t=>{
 const f=await fixture(t);f.failVerify(true);await assert.rejects(run(f),/HTTP_FAILURE/);assert.deepEqual(f.current(),f.base);assert.equal(f.job.result,undefined);const id=f.job.publication.snapshotId;
 f.failVerify(false);assert.equal((await run(f)).snapshotId,id);assert.deepEqual(f.counts(),{exports:1,publications:1,verifications:2});
});
test('lost publication response replays the transaction key without duplicate history',async t=>{
 const f=await fixture(t),publish=f.deps.editorial.publishDraft;let lost=true;
 f.deps.editorial.publishDraft=async args=>{const result=await publish(args);if(lost){lost=false;throw Error('RESPONSE_LOST');}return result;};
 await assert.rejects(run(f),/RESPONSE_LOST/);assert.equal(f.job.publication,undefined);assert.deepEqual(f.current(),f.base);
 await run(f);assert.equal((await f.db.collection('cmsLocalizedSnapshots').get()).size,1);assert.equal((await f.db.collection('cmsLocalizedReviews').get()).size,1);
});
test('restart after pointer switch verifies candidate without publishing again',async t=>{
 const f=await fixture(t);f.failVerify(true);await assert.rejects(run(f));f.setCurrent(f.job.target);f.failVerify(false);
 await run(f);assert.equal(f.counts().publications,1);assert.equal(f.counts().exports,1);
});
test('changed selected draft, revoked permission and concurrent website switch cannot overwrite live content',async t=>{
 for(const scenario of ['draft','permission','pointer']){
  const f=await fixture(t);if(scenario==='draft')f.value.draft.revision++;if(scenario==='permission')f.revoke(true);
  if(scenario==='pointer'){f.job.base=f.base;f.setCurrent({...f.base,releaseId:'another-release'});}
  const before=f.current();await assert.rejects(run(f));assert.deepEqual(f.current(),before);assert.equal((await f.db.collection('cmsLocalizedSnapshots').get()).size,0);
 }
});
test('failure must not restore over an independently changed website pointer',async t=>{
 const f=await fixture(t),other={...f.base,releaseId:'another-release'};
 f.deps.verifyWebsite=async()=>{f.setCurrent(other);throw Error('HTTP_FAILURE');};await assert.rejects(run(f),/HTTP_FAILURE/);assert.deepEqual(f.current(),other);
});
test('UI waits for website verification and reuses the same key/body after a blocked result',async t=>{
 const f=await fixture(t),calls=[],key='same-command-key';let blocked=true;
 const apiFetch=async(path,options)=>{calls.push({path,options});if(options?.method==='POST')return {id:'ui-job',kind:'PUBLISH',state:'RUNNING',selection:f.selection};return {job:blocked?{id:'ui-job',kind:'PUBLISH',state:'BLOCKED',selection:f.selection,error:{message:'HTTP_FAILURE'}}:{id:'ui-job',kind:'PUBLISH',state:'COMPLETED',selection:f.selection,result:await run(f)}};};
 const input={apiFetch,body:f.selection,key,wait:async()=>{}};
 await assert.rejects(publishSelectedWebsite(input),e=>e.jobBlocked&&/Chưa cập nhật website/.test(e.message));assert.equal(calls.filter(c=>c.options?.method==='POST').length,1,'no automatic retry');
 blocked=false;assert.equal((await publishSelectedWebsite(input)).status,'PUBLISHED_ON_WEBSITE');const posts=calls.filter(c=>c.options?.method==='POST');assert.equal(posts.length,2);assert.deepEqual(posts[0].options,posts[1].options);
 await assert.rejects(publishSelectedWebsite({...input,apiFetch:async()=>{throw Error('CONNECTION_LOST');}}),/CONNECTION_LOST/);
});
test('UI rejects another job or wrong language and never reports success on an incomplete job',async t=>{
 const f=await fixture(t),job={id:'ui-job',kind:'PUBLISH',state:'RUNNING',selection:f.selection};
 for(const status of [{...job,id:'other-job'},{...job,selection:{...f.selection,resource:{...f.selection.resource,locale:'vi'}}},job]){
  let count=0;await assert.rejects(publishSelectedWebsite({apiFetch:async()=>++count===1?job:{job:status},body:f.selection,key:'ui-key',wait:async()=>{},maxPolls:1}));
 }
});

test('pointer-write error after replacement restores the old website and retry reuses the publication',async t=>{
 const f=await fixture(t),write=f.deps.writePointer;let failed=false;
 f.deps.writePointer=value=>{write(value);if(value.releaseId!==f.base.releaseId&&!failed){failed=true;throw Error('POINTER_WRITE_FAILURE');}};
 await assert.rejects(run(f),/POINTER_WRITE_FAILURE/);assert.deepEqual(f.current(),f.base);await run(f);assert.equal(f.counts().publications,1);
});
test('rollback restores the frozen release source that belongs to the restored artifact',async()=>{
 const {previousWebsitePointer}=await import('../scripts/local-website-pointer.mjs'),current={port:4189,activation:false,artifact:{relativeRoot:'new'},previous:{relativeRoot:'old'},releaseSource:{path:'new-source',sha256:'a'},previousReleaseSource:{path:'old-source',sha256:'b'}};
 const old=previousWebsitePointer(current,{releaseId:'old',snapshotSetHash:'old-hash'},'now');assert.deepEqual(old.artifact,current.previous);assert.deepEqual(old.releaseSource,current.previousReleaseSource);
 const newer=previousWebsitePointer(old,{releaseId:'new',snapshotSetHash:'new-hash'},'later');assert.deepEqual(newer.artifact,current.artifact);assert.deepEqual(newer.releaseSource,current.releaseSource);
});

test('a fresh website job after page reload reuses the exact saved publication intent',async t=>{
 const f=await fixture(t);f.failExport(true);await assert.rejects(run(f));const snapshotId=f.job.publication.snapshotId;
 f.failExport(false);const reloaded={id:'another-website-job',selection:structuredClone(f.selection)};
 const receipt=await runSelectedPublication(reloaded,{request:{},actor:{uid:'admin'}},f.deps);assert.equal(receipt.snapshotId,snapshotId);
 assert.equal((await f.db.collection('cmsLocalizedSnapshots').get()).size,1);assert.equal((await f.db.collection('cmsLocalizedReviews').get()).size,1);
});
