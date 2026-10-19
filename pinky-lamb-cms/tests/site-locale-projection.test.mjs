import nodeTest from 'node:test';
import {fileURLToPath} from 'node:url';
const test=process.argv[1]===fileURLToPath(import.meta.url)?nodeTest:()=>{};
import assert from 'node:assert/strict';
import {projectQaFixture} from './project-localization-renderer.test.mjs';
import {service,saveBody} from './service-localization-contract.test.mjs';
import {section,servicesSection,sectionContent} from './work-services-localization-contract.test.mjs';
import {mergeLocalizedService} from '../contracts/service-localization.mjs';
import {mergeLocalizedSection} from '../contracts/work-services-localization.mjs';
import {buildSiteLocalePolicy,parseWorkServicesQa} from '../contracts/site-locale-projection.mjs';
import {hashProjectValue} from '../cms-api/project-localization-context.mjs';
export function projectionFixture(locale='en'){
 const original=projectQaFixture(locale),resources=original.qa.resources.slice(0,6),copy=saveBody().content;
 original.qa.resources.find(resource=>resource.id==='styles').inlineBase64=original.files.find(file=>file.path==='styles.css').base64;
 const draft=(id,content)=>({contractRevision:1,draftId:'home-v3',locale,revision:1,dependencyHash:'a'.repeat(64),contentHash:hashProjectValue(content),updatedAt:'2026-10-16T00:00:00.000Z',...id,content});
 const serviceQa={contractRevision:1,kind:'LOCALIZED_SERVICE_QA',serviceIndex:0,templateIdentity:original.qa.templateIdentity,draft:draft({serviceId:service.id},copy),service:mergeLocalizedService(service,copy),resources};
 const sections={};for(const source of [section,servicesSection]){const content=sectionContent();if(source.sectionId==='services')delete content.loadMoreLabel;sections[source.sectionId]={contractRevision:1,kind:'LOCALIZED_SECTION_QA',sectionIndex:source.sectionId==='work'?1:2,templateIdentity:original.qa.templateIdentity,draft:draft({sectionId:source.sectionId},content),section:mergeLocalizedSection(source,content),resources};}
 const projects=[original.qa],services=[serviceQa],policy=buildSiteLocalePolicy({projectLocales:{wayfair:['en','vi','ja']},serviceLocales:{[service.id]:['en','vi','ja']}}),relations={wayfair:{eligibleServiceIds:[],missingServiceIds:['events']}},excluded={projects:[],services:[]},v=(id,d)=>({id,revision:d.revision,dependencyHash:d.dependencyHash,contentHash:d.contentHash}),dependencyVector={homeSharedHash:'b'.repeat(64),availabilityHash:'c'.repeat(64),sections:Object.entries(sections).map(([id,q])=>v(id,q.draft)),projects:projects.map(q=>v(q.project.id,q.draft)),services:services.map(q=>v(q.service.id,q.draft))};
 return {qa:{contractRevision:1,kind:'LOCALIZED_WORK_SERVICES_QA',mode:'QA_SAVED_PARTIAL',locale,workCredential:{resourceId:'credential'},templateIdentity:original.qa.templateIdentity,dependencyHash:hashProjectValue({dependencyVector,policy,relations,excluded}),dependencyVector,sections,projects,services,excluded,relations,policy,resources:original.qa.resources},files:original.files};
}
test('projection real policy preserves IDs and missing related services explicitly, without fallback',()=>{const {qa}=projectionFixture();const parsed=parseWorkServicesQa(qa);assert.deepEqual(parsed.policy.filters,['all','events','film','communications']);assert.ok(parsed.policy.sections.includes('ip-studio'));assert.deepEqual(parsed.projects[0].project.serviceIds,['events']);assert.deepEqual(parsed.relations.wayfair,{eligibleServiceIds:[],missingServiceIds:['events']});assert.equal(JSON.stringify(parsed.policy).includes('CASE1'),false);});
test('mandatory sections, saved vector identity, locale and complete resource closure reject mixed/tampered DTO',()=>{for(const mutate of [q=>delete q.sections.work,q=>q.sections.work.draft.locale='vi',q=>q.dependencyVector.projects[0].revision++,q=>q.resources.pop(),q=>q.relations.wayfair.eligibleServiceIds=['brand-creative'],q=>q.policy.projectLocales.wayfair=['ja'],q=>q.projects.push(q.projects[0]),q=>q.sections.services.draft.sectionId='work']){const {qa}=projectionFixture();mutate(qa);assert.throws(()=>parseWorkServicesQa(qa));}});

export async function projectionApiFixture(){
 const {createSiteLocaleProjectionService}=await import('../cms-api/site-locale-projections.mjs'),{fixture:serviceFixture}=await import('./service-localization-api.test.mjs'),{encodeLocalizedService}=await import('../contracts/service-localization-records.mjs'),{encodeLocalizedSection}=await import('../contracts/work-services-localization-records.mjs'),{encodeLocalizedProject}=await import('../contracts/project-localization-records.mjs');
 const f=serviceFixture(),{qa}=projectionFixture(),resources=qa.resources.slice(0,6);let serviceDependency='a'.repeat(64);
 for(const q of qa.projects)f.records.set(`cmsLocalizedProjectDrafts/home-v3--${q.project.id}--en`,encodeLocalizedProject(q.draft,'owner'));
 for(const q of qa.services)f.records.set(`cmsLocalizedServiceDrafts/home-v3--${q.service.id}--en`,encodeLocalizedService(q.draft,'owner'));
 for(const [id,q]of Object.entries(qa.sections))f.records.set(`cmsLocalizedSectionDrafts/home-v3--${id}--en`,encodeLocalizedSection(q.draft,'owner'));
 const context={credentialBase:async()=>qa.resources.find(r=>r.id==='credential'),db:f.context.db,authorize:f.context.authorize,load:async()=>({current:{content:{projects:[qa.projects[0].project],services:[service],sections:[section,servicesSection],settings:{credential:{assetId:'credential',label:'PDF',edition:'2026'}}}}}),sectionBase:async(_tx,id)=>({base:{dependencyHash:'a'.repeat(64),sectionIndex:id==='work'?1:2,templateIdentity:qa.templateIdentity,section:id==='work'?section:servicesSection},resources}),serviceBase:async()=>({base:{dependencyHash:serviceDependency,serviceIndex:0,templateIdentity:qa.templateIdentity,service},resources}),projectBase:async()=>({base:{dependencyHash:'a'.repeat(64),projectIndex:0,templateIdentity:qa.templateIdentity,project:qa.projects[0].project},resources:qa.projects[0].resources,credential:qa.projects[0].credential})};
 const api=await createSiteLocaleProjectionService({context});return {api,f,context,qa,setServiceDependency(value){serviceDependency=value;}};
}
test('projection service reads one transaction snapshot, requires sections, excludes missing/stale entities and never writes',async()=>{
 const {api,f,setServiceDependency}=await projectionApiFixture(),before=f.records.size,read=await api.readQa({request:{},locale:'en'});assert.equal(read.projects.length,1);assert.equal(read.services.length,1);assert.deepEqual(read.policy.projectLocales.wayfair,['en']);assert.deepEqual(read.relations.wayfair.eligibleServiceIds,[]);
 setServiceDependency('c'.repeat(64));const stale=await api.readQa({request:{},locale:'en'});assert.equal(stale.services.length,0);assert.deepEqual(stale.excluded.services,[{id:service.id,reason:'STALE'}]);assert.equal(f.records.size,before);
 await assert.rejects(api.readQa({request:{},locale:'ja'}),{code:'REVISION_CONFLICT'});f.revokeOnSecondCheck();await assert.rejects(api.readQa({request:{},locale:'en'}),{code:'FORBIDDEN'});assert.equal(f.records.size,before);
});

test('related source, selected media, credential and sidecar changes alter collection snapshot; unrelated copy does not',async()=>{
 const {api,f,context,qa,setServiceDependency}=await projectionApiFixture(),first=await api.readQa({request:{},locale:'en'}),original=context.load;
 context.load=async tx=>{const result=await original(tx);result.current.content.about={intro:'unrelated update'};return result;};
 assert.equal((await api.readQa({request:{},locale:'en'})).dependencyVector.homeSharedHash,first.dependencyVector.homeSharedHash);
 setServiceDependency('d'.repeat(64));assert.notEqual((await api.readQa({request:{},locale:'en'})).dependencyVector.homeSharedHash,first.dependencyVector.homeSharedHash);setServiceDependency('a'.repeat(64));
 const originalProject=context.projectBase;context.projectBase=async(...args)=>{const result=await originalProject(...args);result.base.dependencyHash='e'.repeat(64);return result;};assert.notEqual((await api.readQa({request:{},locale:'en'})).dependencyVector.homeSharedHash,first.dependencyVector.homeSharedHash);context.projectBase=originalProject;
 context.load=async tx=>{const result=await original(tx);result.current.content.settings.credential.label='Updated label';return result;};assert.notEqual((await api.readQa({request:{},locale:'en'})).dependencyVector.homeSharedHash,first.dependencyVector.homeSharedHash);context.load=original;
 const {encodeLocalizedService}=await import('../contracts/service-localization-records.mjs');f.records.set('cmsLocalizedServiceDrafts/home-v3--brand-creative--ja',encodeLocalizedService({...qa.services[0].draft,locale:'ja'},'owner'));
 const changed=await api.readQa({request:{},locale:'en'});assert.notEqual(changed.dependencyVector.availabilityHash,first.dependencyVector.availabilityHash);assert.deepEqual(changed.policy.serviceLocales['brand-creative'],['en','ja']);
});
test('zero eligible Projects still require shared Work credential PDF closure',async()=>{
 const {api,f}=await projectionApiFixture();f.records.delete('cmsLocalizedProjectDrafts/home-v3--wayfair--en');const qa=await api.readQa({request:{},locale:'en'});assert.equal(qa.projects.length,0);assert.equal(qa.resources.find(r=>r.id===qa.workCredential.resourceId).mimeType,'application/pdf');
});
