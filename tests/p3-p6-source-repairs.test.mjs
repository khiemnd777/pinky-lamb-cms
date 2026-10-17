import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture as heroFixture} from './hero-localization-api.test.mjs';
import {fixture as projectFixture} from './project-localization-api.test.mjs';
import {fixture as serviceFixture} from './service-localization-api.test.mjs';
import {fixture as sectionFixture} from './work-services-localization-api.test.mjs';
import {groupHome} from './group-localization-contract.test.mjs';
import {qaV2Fixture} from './hero-localization-renderer.test.mjs';
import {createHeroLocalizationService} from '../cms-api/hero-localizations.mjs';
import {createProjectLocalizationService} from '../cms-api/project-localizations.mjs';
import {createServiceLocalizationService} from '../cms-api/service-localizations.mjs';
import {createWorkServicesLocalizationService} from '../cms-api/work-services-localizations.mjs';
import {createLocalizedResourceContext} from '../cms-api/localized-resource-context.mjs';
import {createHeroLocalizationController} from '../admin/hero-localization-editor.mjs';
import {heroDependencyHash,hashHeroValue} from '../cms-api/hero-localization-dependency.mjs';
import {localizedHeroFromBase} from '../contracts/hero-localization.mjs';

for(const [name,fixture,create]of [['Project',projectFixture,createProjectLocalizationService],['Service',serviceFixture,createServiceLocalizationService],['Section',sectionFixture,createWorkServicesLocalizationService]]){
 test(`${name} import source pin is read inside the target transaction and rejected before any write`,async()=>{
  const f=fixture(),source={retained:'before'},expectedSourceHash=hashHeroValue(source);let reads=0,seenTransaction;
  f.context.readTrustedDraftContext=async({transaction})=>{reads++;seenTransaction=transaction;return {current:{content:source}};};
  const api=await create({context:f.context}),args=f.args();args.body.expectedSourceHash=expectedSourceHash;
  source.retained='after';await assert.rejects(api.saveDraft(args),{code:'REVISION_CONFLICT'});assert.equal(f.records.size,0);assert.equal(reads,1);assert.equal(typeof seenTransaction.get,'function');
  source.retained='before';const receipt=await api.saveDraft(args);assert.equal(receipt.revision,1);assert.equal(reads,2);
  source.retained='later';assert.deepEqual(await api.saveDraft(args),receipt,'committed retry returns its original receipt');assert.equal(reads,2);
  await assert.rejects(api.saveDraft({...args,body:{...args.body,expectedSourceHash:hashHeroValue(source)}}),{code:'IDEMPOTENCY_PAYLOAD_MISMATCH'});
 });
}
test('transaction callback retry rereads the source pin and refuses a stale second attempt',async()=>{
 const f=serviceFixture(),source={version:1},args=f.args();args.body.expectedSourceHash=hashHeroValue(source);let reads=0,writes=0;
 f.context.readTrustedDraftContext=async()=>{reads++;return {current:{content:structuredClone(source)}};};
 const tx={get:async()=>({exists:false}),create(){writes++;},set(){writes++;}};
 f.context.db.runTransaction=async callback=>{await callback(tx);assert.equal(writes,2);writes=0;source.version++;return callback(tx);};
 const api=await createServiceLocalizationService({context:f.context});await assert.rejects(api.saveDraft(args),{code:'REVISION_CONFLICT'});assert.equal(reads,2);assert.equal(writes,0);assert.equal(f.records.size,0);
});

async function heroDependencies(){
 const f=heroFixture(),qa=qaV2Fixture(),current={revision:4,content:structuredClone(groupHome),importLineage:{}},baselineContent=structuredClone(groupHome),ids=new Set(current.content.claimSources.flatMap(b=>b.sourceIds)),record={baselineContent,sourceCatalog:[...ids].map(id=>({id,kind:'CREDENTIAL',title:'Synthetic source',sha256:'b'.repeat(64),pageCount:48,supportedClaimPaths:['*']}))};
 f.context.readTrustedDraftContext=async()=>({current:structuredClone(current),record:structuredClone(record)});
 f.context.readBase=async()=>{const value={base:{revision:current.revision,contentHash:hashHeroValue(current.content),hero:structuredClone(current.content.hero)},resources:qa.resources,presentation:qa.presentation};value.base.dependencyHash=heroDependencyHash(current,record,value);return value;};
 const api=await createHeroLocalizationService({context:f.context}),resources=await createLocalizedResourceContext({trustedContext:f.context,heroContext:f.context});
 const args=async(key='hero-dependency-save')=>{const {base}=await f.context.readBase();return {...f.args('en',key),body:{expectedRevision:null,baseRevision:base.revision,baseContentHash:base.contentHash,expectedDependencyHash:base.dependencyHash,content:localizedHeroFromBase(base.hero)}};};
 const resource={kind:'hero',entityId:'home-v3',locale:'en'},readResource=()=>f.context.db.runTransaction(tx=>resources.readResource(tx,resource,{qa:false}));
 return {...f,api,current,record,args,readResource};
}
test('Hero editor, ordinary save, QA and P5 remain fresh after an unrelated Home edit',async()=>{
 const f=await heroDependencies(),args=await f.args();await f.api.saveDraft(args);
 const c=createHeroLocalizationController({getSession:()=>({uid:'demo-editor',role:'EDITOR',authzVersion:1}),keyFactory:()=> 'hero-unrelated-save',apiFetch:async(_path,options={})=>options.method==='PUT'?f.api.saveDraft({...args,key:options.headers['Idempotency-Key'],body:JSON.parse(options.body)}):f.api.readDraft({locale:'en'})});
 await c.load();const originalDependency=c.state().record.base.dependencyHash;f.current.content.settings.contact.email='changed@example.test';f.current.revision++;
 assert.equal((await f.api.readDraft({locale:'en'})).sourceStale,false);assert.equal((await f.readResource()).stale,false);assert.equal((await f.api.readQa({locale:'en'})).kind,'LOCALIZED_HERO_QA');
 c.edit(value=>value.note='Updated translation after Contact change');assert.equal(await c.save(),true);assert.equal(c.state().baseDrift,false);assert.equal(c.state().record.draft.baseRevision,f.current.revision);assert.equal(c.state().record.draft.dependencyHash,originalDependency);assert.equal((await f.readResource()).stale,false);c.destroy();
});
test('Hero relevant source, media, CTA and claim changes require explicit rebase',async()=>{
 for(const change of ['copy','cta','source','media']){
  const f=await heroDependencies(),args=await f.args();await f.api.saveDraft(args);
  if(change==='copy')f.current.content.hero.note+=' changed';
  if(change==='cta')f.current.content.hero.primaryAction.label+=' changed';
  if(change==='source'){const id=f.current.content.claimSources.find(b=>b.claimPath==='hero/facts').sourceIds[0];f.record.sourceCatalog.find(s=>s.id===id).sha256='c'.repeat(64);}
  if(change==='media'){const read=f.context.readBase;f.context.readBase=async()=>{const value=await read();value.resources=structuredClone(value.resources);value.resources[0].sha256='d'.repeat(64);value.base.dependencyHash=heroDependencyHash(f.current,f.record,value);return value;};}
  f.current.revision++;const fresh=await f.context.readBase(),body={...args.body,expectedRevision:1,baseRevision:fresh.base.revision,baseContentHash:fresh.base.contentHash,expectedDependencyHash:fresh.base.dependencyHash};
  assert.equal((await f.api.readDraft({locale:'en'})).sourceStale,true,change);assert.equal((await f.readResource()).stale,true,change);
  await assert.rejects(f.api.saveDraft({...args,key:`hero-related-${change}`,body}),e=>e.code==='REVISION_CONFLICT'&&e.heroReason==='BASE_REBASE_REQUIRED');assert.equal(f.records.size,2);
 }
});
test('legacy Hero rebase association survives ordinary save in the next revision',async()=>{
 const f=await heroDependencies(),args=await f.args();await f.api.saveDraft(args);const key='cmsLocalizedHeroDrafts/home-v3--en',stored=f.records.get(key),dependencyHash=stored.dependencyHash;
 delete stored.dependencyHash;f.records.set('cmsLocalizedHeroBases/home-v3--en--1',{contentHash:stored.contentHash,baseRevision:stored.baseRevision,baseContentHash:stored.baseContentHash,dependencyHash});
 f.current.content.settings.contact.email='unrelated@example.test';f.current.revision++;
 const next=await f.args('hero-after-legacy-rebase');next.body.expectedRevision=1;await f.api.saveDraft(next);
 assert.equal(f.records.get(key).dependencyHash,dependencyHash);f.current.content.settings.contact.email='again@example.test';f.current.revision++;
 assert.equal((await f.api.readDraft({locale:'en'})).sourceStale,false);assert.equal((await f.readResource()).stale,false);
});
test('Hero retains conservative compatibility for legacy drafts and enforces import full-source pin',async()=>{
 const f=await heroDependencies(),args=await f.args();args.body.expectedSourceHash=args.body.baseContentHash;f.current.content.settings.contact.email='raced@example.test';f.current.revision++;
 await assert.rejects(f.api.saveDraft(args),{code:'REVISION_CONFLICT'});assert.equal(f.records.size,0);
 const next=await f.args();await f.api.saveDraft(next);delete f.records.get('cmsLocalizedHeroDrafts/home-v3--en').dependencyHash;
 f.current.content.settings.contact.email='legacy-changed@example.test';f.current.revision++;
 assert.equal((await f.api.readDraft({locale:'en'})).sourceStale,true);assert.equal((await f.readResource()).stale,true);
});
test('P6 Hero import keeps full-source pins separate from Hero dependency receipts',async()=>{
 const f=await heroDependencies(),args=await f.args(),{localizedTextFields}=await import('../contracts/multilingual-import.mjs'),{executeSelectedImport}=await import('../scripts/multilingual-import-local.mjs'),entries=[];
 const plan={contractRevision:2,kind:'MULTILINGUAL_SELECTED_IMPORT',planId:'synthetic-hero-import',sourceHash:hashHeroValue(f.current.content),maxCommits:1,items:[{kind:'hero',id:'home-v3',locale:'en',expectedRevision:null,expectedDependencyHash:args.body.baseContentHash,baseRevision:args.body.baseRevision,content:args.body.content,source:{origin:'RETAINED_HOME_V3',path:'/hero',sha256:hashHeroValue(f.current.content.hero),language:'en',reviewer:'Synthetic reviewer',factsReviewed:true,mediaReviewed:true},mappings:localizedTextFields(args.body.content).map(field=>({sourcePath:'/hero'+field.path,sha256:hashHeroValue(field.value),sourceLanguage:'en',targetPath:field.path,treatment:'COPY',reviewedBy:'Synthetic reviewer'}))}]};
 const options={approval:{action:'RETAINED_SELECTED_IMPORT',planHash:hashHeroValue(plan),maxCommits:1},readSource:async()=>structuredClone(f.current.content),journal:{entries:async()=>entries,append:async entry=>entries.push(structuredClone(entry))},request:async(_path,options)=>options.method==='GET'?f.api.readDraft({locale:'en'}):f.api.saveDraft({...args,key:options.headers['Idempotency-Key'],body:options.body})};
 assert.equal((await executeSelectedImport(plan,options)).state,'COMPLETE');assert.equal((await executeSelectedImport(plan,options)).state,'COMPLETE');const receipt=entries.find(entry=>entry.state==='COMMITTED').receipt;
 assert.equal(receipt.baseContentHash,plan.sourceHash);assert.notEqual(receipt.dependencyHash,receipt.baseContentHash);assert.equal(f.records.size,2);
});
