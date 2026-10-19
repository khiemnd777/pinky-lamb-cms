import {test} from 'node:test';
import assert from 'node:assert/strict';
import {multilingualP3Plan,P3_REMAINDER_UNIT_TESTS} from '../scripts/multilingual-p3-local.mjs';
import {p3TargetPath,P3_WRITE_TARGETS,P3_WRITE_BUDGET} from './helpers/p3-localization-live.mjs';
test('P3 runner selects bounded checks and never implicitly authorizes retained writes',()=>{
 for(const mode of ['unit','api','fixture','build']){const p=multilingualP3Plan(['--mode',mode,'--run-id','controlled']);assert.equal(p.retainedWrites,false);assert.equal(p.authMutations,false);assert.equal(p.emulatorLifecycle,false);assert.equal(p.hostingActivation,false);assert.equal(p.evidenceRoot,'.local/test-outputs/multilingual-001/p3-remainder-v1/controlled');}
 assert.ok(P3_REMAINDER_UNIT_TESTS.includes('tests/service-localization-api.test.mjs'));assert.ok(P3_REMAINDER_UNIT_TESTS.includes('tests/work-services-export.test.mjs'));
 const p=multilingualP3Plan(['--mode','export','--run-id','controlled','--bundle','.local/test-outputs/multilingual-001/p3-remainder-v1/owned/bundle.json']);assert.ok(p.bundle.endsWith('bundle.json'));
});
test('P3 runner rejects lifecycle, traversal, arbitrary bundles, extra arguments and malformed IDs',()=>{
 for(const args of [[],['--mode','seed','--run-id','x'],['--mode','unit','--run-id','../x'],['--mode','unit','--run-id','x','extra'],['--mode','export','--run-id','x','--bundle','/tmp/input.json'],['--mode','export','--run-id','x','--bundle','.local/test-outputs/multilingual-001/p3-remainder-v1/../input.json']])assert.throws(()=>multilingualP3Plan(args));
});
test('live adapter allowlist is exactly nine targets with immutable approved write limits',()=>{
 assert.equal(P3_WRITE_TARGETS.length,9);assert.equal(new Set(P3_WRITE_TARGETS.map(p3TargetPath)).size,9);assert.deepEqual(P3_WRITE_BUDGET,{successfulCommitsMax:16,documentWritesMax:32,draftRecordsMax:9});
 for(const target of [{kind:'projects',id:'wayfair',locale:'en'},{kind:'services',id:'film-content',locale:'en'},{kind:'sections',id:'about',locale:'vi'},{kind:'sections',id:'work',locale:'fr'}])assert.throws(()=>p3TargetPath(target));
});
import {p3ResumeJournal,assertP3ResumeRead,p3LocalizationLive,showServiceEditingPanel} from './helpers/p3-localization-live.mjs';
import {base as serviceBase,saveBody} from './service-localization-contract.test.mjs';
import {base as sectionBase,servicesSection,sectionContent} from './work-services-localization-contract.test.mjs';
import {hashProjectValue} from '../cms-api/project-localization-context.mjs';
function resumeFixture(){
 const candidates={sourceHomeContentJsonSha256:'a'.repeat(64)},records=[],reads=P3_WRITE_TARGETS.map(target=>({target,read:{contractRevision:1,draftId:'home-v3',locale:target.locale,...(target.kind==='services'?{serviceId:target.id,base:structuredClone(serviceBase)}:{sectionId:target.id,base:{...structuredClone(sectionBase),section:target.id==='work'?structuredClone(sectionBase.section):structuredClone(servicesSection),sectionIndex:target.id==='work'?1:2}}),draft:null}}));
 records.push({name:'p3-g0-0001-preflight.private.json',value:{status:'SOURCE_AND_NINE_TARGETS_READ',candidateSourceHash:candidates.sourceHomeContentJsonSha256,reads}});
 for(const [index,target]of P3_WRITE_TARGETS.filter(t=>t.locale==='en').entries()){
  const stage=`${target.kind==='services'?'service':target.id}-en-initial`,read=reads.find(r=>p3TargetPath(r.target)===p3TargetPath(target)).read,content=target.kind==='services'?saveBody().content:sectionContent();if(target.kind==='sections'&&target.id==='services')delete content.loadMoreLabel;
  const key=`controlled-resume-key-${index}`,body={contractRevision:1,expectedRevision:null,expectedDependencyHash:read.base.dependencyHash,content},receipt={contractRevision:1,draftId:'home-v3',...(target.kind==='services'?{serviceId:target.id}:{sectionId:target.id}),locale:'en',revision:1,dependencyHash:read.base.dependencyHash,contentHash:hashProjectValue(content),updatedAt:'2026-10-16T00:00:00.000Z'};
  records.push({name:`p3-g0-${index}-stage-before.private.json`,value:{stage,target,read}},{name:`p3-g0-${index}-write-intent.private.json`,value:{stage,target,key,body,bodyHash:hashProjectValue(body)}},{name:`p3-g0-${index}-commit-checkpoint.private.json`,value:{keyHash:hashProjectValueString(key),receipt}},{name:`p3-g0-${index}-stage-readback.private.json`,value:{stage,target,draft:{...receipt,content}}},{name:`checkpoint-${index}.private.json`,value:{stage,state:'COMPLETE',kind:'write'}});
 }
 records.push({name:'p3-g0-failed-stage-before.private.json',value:{stage:'service-vi-initial',target:{kind:'services',id:'brand-creative',locale:'vi'},read:reads.find(r=>r.target.kind==='services'&&r.target.locale==='vi').read}},{name:'checkpoint-failed.private.json',value:{stage:'service-vi-initial',state:'HELD_READ_ONLY'}});
 return {records,candidates};
}
import {createHash} from 'node:crypto';
const hashProjectValueString=value=>createHash('sha256').update(value).digest('hex');
test('bounded resume seeds total budget3/6 and blocks completed stages while no-admission VI remains explicit',()=>{
 const {records,candidates}=resumeFixture(),resume=p3ResumeJournal(records,{candidates});assert.equal(resume.successfulCommits,3);assert.equal(resume.documentWrites,6);assert.equal(resume.intents.size,3);assert.equal(resume.latest.size,3);assert.equal(resume.before.size,9);
 const previous=process.env.PINKY_MULTILINGUAL_P3_WRITE_APPROVED;process.env.PINKY_MULTILINGUAL_P3_WRITE_APPROVED='1';const adapter=p3LocalizationLive({page:{on(){},off(){}},context:{},run:'/unused-controlled-fixture',candidates,resume});
 try{for(const stage of ['service-en-initial','work-en-initial','services-en-initial'])assert.equal(adapter.phases[stage].authorize(),false);assert.equal(adapter.phases['service-vi-initial'].authorize(),true);assert.equal(adapter.summary().successfulCommits,3);assert.equal(adapter.summary().admittedImmutableIntents,3);}finally{adapter.dispose();assert.equal(adapter.summary().successfulCommits,3);if(previous===undefined)delete process.env.PINKY_MULTILINGUAL_P3_WRITE_APPROVED;else process.env.PINKY_MULTILINGUAL_P3_WRITE_APPROVED=previous;}
});
test('resume rejects unknown admitted outcomes, incomplete admitted stage, forged receipt, missing readback and changed source pin',()=>{
 for(const mutate of [r=>r.splice(r.findIndex(x=>x.name.endsWith('-commit-checkpoint.private.json')),1),r=>r.splice(r.findIndex(x=>x.value.kind==='write'),1),r=>r.find(x=>x.name.endsWith('-commit-checkpoint.private.json')).value.receipt.contentHash='f'.repeat(64),r=>r.splice(r.findIndex(x=>x.name.endsWith('-stage-readback.private.json')),1),r=>r[0].value.candidateSourceHash='changed']){const {records,candidates}=resumeFixture();mutate(records);assert.throws(()=>p3ResumeJournal(records,{candidates}));}
});
test('resume preflight requires exact old latest draft and unchanged dependency; remaining six must stay absent',()=>{
 const {records,candidates}=resumeFixture(),resume=p3ResumeJournal(records,{candidates});
 for(const target of P3_WRITE_TARGETS){const key=p3TargetPath(target),read={...structuredClone(resume.before.get(key)),draft:structuredClone(resume.latest.get(key)??null)};assert.doesNotThrow(()=>assertP3ResumeRead(resume,target,read));for(const change of [r=>r.base.dependencyHash='f'.repeat(64),r=>r.draft=r.draft?{...r.draft,revision:r.draft.revision+1}:{...resume.latest.values().next().value,locale:target.locale}]){const altered=structuredClone(read);change(altered);assert.throws(()=>assertP3ResumeRead(resume,target,altered));}}
});

test('mobile Service editor waits for requested locale load before choosing Biên tập',async()=>{
 const calls=[],page={locator(selector){assert.match(selector,/lang="vi"/);return {async waitFor({state}){calls.push(state);}};},getByRole(role,options){assert.equal(role,'button');assert.equal(options.name,'Biên tập');return {async isVisible(){calls.push('panel-ready');return true;},async click(){calls.push('choose-editor');}};}};
 await showServiceEditingPanel(page,'vi');assert.deepEqual(calls,['attached','panel-ready','choose-editor','visible']);await assert.rejects(showServiceEditingPanel(page,'fr'));
});
