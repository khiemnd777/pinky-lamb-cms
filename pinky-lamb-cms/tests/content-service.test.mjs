import test from 'node:test';
import assert from 'node:assert/strict';
import {contentGroupReadSchema,contentGroupReceiptSchema} from '../contracts/content-workspace.mjs';
import {createNativeContentFixture,createLocalizedEligibilityService,createReadinessWorker} from './helpers/content-native-fixture.mjs';
async function fixture(t){const f=await createNativeContentFixture();t.after(f.close);return f;}
const command=(group,read,content=read.content,key='synthetic-native-save')=>({request:{},actor:{uid:'synthetic-owner'},group,body:{expected:read.entities.map(({kind,id,revision})=>({kind,id,revision})),content},key,correlationId:'synthetic'});
test('each group reads a closed scoped contract without media authority work',async t=>{
 const f=await fixture(t),before=f.calls();
 for(const group of ['settings','clients','work','services','about','ip','contact','footer','structure']){
  const raw=await f.service.readGroup({request:{},group});const parsed=contentGroupReadSchema.safeParse(raw);assert.equal(parsed.success,true,group+': '+JSON.stringify(parsed.error?.issues));const read=parsed.data;assert.equal(read.group,group);if(group!=='work')assert.equal(read.content.projects.some(p=>p.gallery),false);if(group!=='services')assert.equal(read.content.services.some(s=>s.description),false);
 }
 assert.equal(f.calls(),before);f.setRole('ANONYMOUS');await assert.rejects(()=>f.service.bootstrap({request:{}}),{code:'UNAUTHENTICATED'});
});
test('native save changes only owned data, has CAS and replay, and denies an unauthorized writer',async t=>{
 const f=await fixture(t),read=await f.service.readGroup({request:{},group:'settings'}),old=JSON.parse(f.db.content.assemble().body),content=structuredClone(read.content);content.hero.eyebrow='Synthetic saved Hero';content.projects=[{id:'injected-project'}];
 const response=contentGroupReceiptSchema.parse(await f.service.saveGroup(command('settings',read,content)));assert.equal(response.siteRevision,1);assert.equal(response.read.content.hero.eyebrow,'Synthetic saved Hero');
 const stored=JSON.parse(f.db.content.assemble().body);assert.deepEqual(JSON.parse(stored.contentJson).projects,JSON.parse(old.contentJson).projects);
 assert.deepEqual(await f.service.saveGroup(command('settings',read,content)),response);
 await assert.rejects(()=>f.service.saveGroup(command('settings',read,content,'synthetic-stale')),e=>e.code==='REVISION_CONFLICT');
 f.setRole('REVIEWER');await assert.rejects(()=>f.service.saveGroup(command('settings',response.read,content,'synthetic-forbidden')),e=>e.code==='FORBIDDEN');
});
test('readiness worker reuses unchanged resource results and recomputes scoped dependencies',async t=>{
 const f=await fixture(t),worker=createReadinessWorker({db:f.db,onError:error=>{throw error;},createEligibility:readinessCache=>createLocalizedEligibilityService({...f.options,readinessCache})});
 const first=await worker.tick();assert.equal(first.committed,true);assert.ok(first.recomputed>30);assert.equal(await worker.tick(),null);
 f.db.content.invalidate();const second=await worker.tick();assert.equal(second.committed,true);assert.equal(second.recomputed,0);
 const read=await f.service.readGroup({request:{},group:'settings'}),content=structuredClone(read.content);content.hero.eyebrow='Scoped Hero update';await f.service.saveGroup(command('settings',read,content));
 const third=await worker.tick();assert.equal(third.committed,true);assert.equal(third.recomputed,3);
});
test('a mutation during worker computation fences its result',async t=>{
 const f=await fixture(t),worker=createReadinessWorker({db:f.db,onError:error=>{throw error;},createEligibility:async()=>({readReadiness:async()=>{f.db.content.invalidate();return {ready:true};}})});
 assert.equal((await worker.tick()).committed,false);assert.equal(f.db.sqlite.prepare("SELECT state FROM cms_content_jobs WHERE job_key='readiness'").get().state,'PENDING');
});
test('existing localized callers write the native source and invalidate only that resource',async t=>{
 const f=await fixture(t),worker=createReadinessWorker({db:f.db,onError:error=>{throw error;},createEligibility:readinessCache=>createLocalizedEligibilityService({...f.options,readinessCache})});await worker.tick();
 const [{createGroupLocalizationService},{groupContentFromSource},{createLocalizedEditorialService}]=await Promise.all([import('../cms-api/group-localizations.mjs'),import('../contracts/group-localization.mjs'),import('../cms-api/localized-editorial.mjs')]);
 const service=await createGroupLocalizationService(f.options),args={request:{},actor:{uid:'synthetic-owner'},groupId:'contact',locale:'en'},read=await service.readDraft(args);
 const saved=await service.saveDraft({...args,key:'synthetic-native-localized',body:{contractRevision:1,expectedRevision:null,expectedDependencyHash:read.base.dependencyHash,content:groupContentFromSource('contact',read.base.source)}});
 assert.equal(f.db.sqlite.prepare("SELECT count(*) AS n FROM cms_documents WHERE path='cmsLocalizedGroupDrafts/home-v3--contact--en'").get().n,0);assert.ok(f.db.content.document('cmsLocalizedGroupDrafts/home-v3--contact--en'));
 assert.equal((await worker.tick()).recomputed,1);
 const editorial=await createLocalizedEditorialService(f.options);await editorial.publishDraft({request:{},actor:args.actor,key:'synthetic-native-publish',body:{resource:{kind:'group',entityId:'contact',locale:'en'},expectedRevision:saved.revision,expectedDependencyHash:read.base.dependencyHash,expectedContentHash:saved.contentHash}});
 assert.equal((await worker.tick()).recomputed,1);
 const status=JSON.parse(f.db.sqlite.prepare("SELECT payload FROM cms_content_jobs WHERE job_key='readiness'").get().payload);assert.equal(status.locales[0].resources.find(r=>r.resource.kind==='group'&&r.resource.entityId==='contact').reason,'ELIGIBLE');
});
test('worker failures retry with bounded backoff and a new generation resets the budget',async t=>{
 const f=await fixture(t);let time=0,calls=0;const worker=createReadinessWorker({db:f.db,clock:()=>time,createEligibility:async()=>({readReadiness:async()=>{calls++;throw Error('Synthetic transient failure');}})});
 assert.equal((await worker.tick()).errorCode,'INTERNAL_ERROR');assert.equal(await worker.tick(),null);assert.equal(calls,1);
 time=5000;await worker.tick();assert.equal(calls,2);time=15000;await worker.tick();assert.equal(calls,3);time=60000;assert.equal(await worker.tick(),null);assert.equal(calls,3);
 f.db.content.invalidate();await worker.tick();assert.equal(calls,4);
});

test('completed readiness exposes version-pinned draft metadata without invoking domain reads',async t=>{
 const f=await fixture(t),{readReadinessProjection}=await import('../cms-api/readiness-projection.mjs'),worker=createReadinessWorker({db:f.db,createEligibility:readinessCache=>createLocalizedEligibilityService({...f.options,readinessCache})});await worker.tick();const calls=f.calls(),projection=readReadinessProjection(f.db);assert.equal(projection.state,'COMPLETED');assert.ok(projection.draftStatuses.length>30);assert.ok(projection.draftStatuses.every(v=>v.draft===null));assert.equal(f.calls(),calls);f.db.content.invalidate();const pending=readReadinessProjection(f.db);assert.equal(pending.readiness,null);assert.deepEqual(pending.draftStatuses,[]);
});

test('native localized projections preserve existing DTOs and refresh Hero global pins without reevaluating siblings',async t=>{
 const f=await fixture(t),{readLocalizedProjection}=await import('../cms-api/content-localized-reads.mjs'),worker=createReadinessWorker({db:f.db,createEligibility:readinessCache=>createLocalizedEligibilityService({...f.options,readinessCache})});await worker.tick();
 const [{createGroupLocalizationService},{createHeroLocalizationService},{createProjectLocalizationService},{createServiceLocalizationService}]=await Promise.all([import('../cms-api/group-localizations.mjs'),import('../cms-api/hero-localizations.mjs'),import('../cms-api/project-localizations.mjs'),import('../cms-api/service-localizations.mjs')]);
 for(const [kind,create]of [['GROUP',createGroupLocalizationService],['PROJECT',createProjectLocalizationService],['SERVICE',createServiceLocalizationService]]){const actual=await (await create(f.options)).readStatus({request:{}});assert.deepEqual(readLocalizedProjection(f.db,{kind:kind+'_LOCALIZATION_STATUS'}),actual);}
 const hero=await createHeroLocalizationService(f.options),before=readLocalizedProjection(f.db,{kind:'HERO_LOCALIZATION',locale:'en'});assert.deepEqual(before,await hero.readDraft({request:{},locale:'en'}));
 const read=await f.service.readGroup({request:{},group:'work'}),content=structuredClone(read.content);content.projects[0].title='Synthetic unrelated project title';await f.service.saveGroup(command('work',read,content));assert.equal(readLocalizedProjection(f.db,{kind:'HERO_LOCALIZATION',locale:'en'}),null);await worker.tick();
 const after=readLocalizedProjection(f.db,{kind:'HERO_LOCALIZATION',locale:'en'});assert.equal(after.base.revision,before.base.revision+1);assert.notEqual(after.base.contentHash,before.base.contentHash);assert.equal(after.base.dependencyHash,before.base.dependencyHash);assert.deepEqual(after,await hero.readDraft({request:{},locale:'en'}));
});
