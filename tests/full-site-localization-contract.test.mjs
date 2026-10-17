import nodeTest from 'node:test';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {GROUP_IDS} from '../contracts/group-localization.mjs';
import {parseFullSiteQa} from '../contracts/full-site-localization.mjs';
import {assembleFullSiteQa} from '../cms-api/full-site-localizations.mjs';
import {parseLocalizedReleaseBundle} from '../contracts/localized-review-records.mjs';
import {releaseSnapshotSetHash} from '../cms-api/localized-eligibility.mjs';
import {groupFixture} from './group-localization-contract.test.mjs';
import {projectionFixture} from './site-locale-projection.test.mjs';
import {qaV2Fixture} from './hero-localization-renderer.test.mjs';
const test=process.argv[1]===fileURLToPath(import.meta.url)?nodeTest:()=>{};
export function fullSiteFixture(locale='en',mode='QA_SAVED'){
 const workServices=projectionFixture(locale).qa,groups=Object.fromEntries(GROUP_IDS.map(id=>[id,groupFixture(id,locale)])),hero=qaV2Fixture(locale),shared=new Map(workServices.resources.map(r=>[r.id,r]));
 for(const q of Object.values(groups)){q.resources=q.resources.map(r=>shared.get(r.id)??r);q.resources.forEach(r=>shared.set(r.id,r));}hero.resources=hero.resources.map(r=>shared.get(r.id)??r);
 const snapshotIds=mode==='APPROVED_RELEASE'?Object.fromEntries([['hero','home-v3'],...GROUP_IDS.map(id=>['group',id]),...['work','services'].map(id=>['section',id]),['project','wayfair'],['service','brand-creative']].map(([kind,id])=>[`${kind}/${id}`,`snap-${kind}-${id}-${locale}`])):{};if(mode==='APPROVED_RELEASE')workServices.mode='APPROVED_RELEASE';
 const approvalPins=Object.fromEntries(Object.entries(snapshotIds).map(([key,id])=>[key,{snapshotHash:'1'.repeat(64),reviewId:'review-'+id,attestationSetHash:'2'.repeat(64)}]));return assembleFullSiteQa({locale,hero,groups,workServices,mode,snapshotIds,approvalPins,sourceHash:'d'.repeat(64),availabilityHash:'e'.repeat(64),heroDependencyHash:'f'.repeat(64)});
}
test('full DTO requires every group/Hero/section and exact source section order and resource closure',()=>{const qa=fullSiteFixture();assert.equal(parseFullSiteQa(qa).dependencyVector.resources.length,12);assert.deepEqual(qa.sectionOrder,qa.groups.header.base.source.sectionOrder);for(const mutate of [q=>delete q.groups.seo,q=>q.sectionOrder.reverse(),q=>q.resources.pop(),q=>q.hero.draft.locale='vi',q=>q.dependencyVector.resources.pop(),q=>q.dependencyVector.resources[0].snapshotId='fake-approval']){const value=fullSiteFixture();mutate(value);assert.throws(()=>parseFullSiteQa(value));}});
test('approved release requires frozen snapshot identities across all three locales and distinct nested mode',()=>{const entries=['en','vi','ja'].map(locale=>fullSiteFixture(locale,'APPROVED_RELEASE')),bundle={contractRevision:1,kind:'MULTILINGUAL_SITE_RELEASE_BUNDLE',mode:'APPROVED_RELEASE',entries,snapshotSetHash:releaseSnapshotSetHash(entries)};assert.equal(parseLocalizedReleaseBundle(bundle).entries.length,3);for(const mutate of [b=>b.entries[1].dependencyVector.resources[0].snapshotId=null,b=>b.entries[2].mode='QA_SAVED',b=>b.entries[0].workServices.mode='QA_SAVED_PARTIAL',b=>b.entries[2].dependencyVector.sourceHash='0'.repeat(64)]){const value=structuredClone(bundle);mutate(value);assert.throws(()=>parseLocalizedReleaseBundle(value));}});

test('visible empty Work/Services are valid saved partial QA but cannot be composed into approved release',()=>{
 for(const collection of ['projects','services']){
  const compose=mode=>{const full=fullSiteFixture('en',mode),work=full.workServices,removed=work[collection],entityKey=collection==='projects'?'project':'service';work[collection]=[];work.dependencyVector[collection]=[];work.excluded[collection]=removed.map(q=>({id:q[entityKey].id,reason:'MISSING'}));for(const qa of removed){const id=qa[entityKey].id;work.policy[collection==='projects'?'projectLocales':'serviceLocales'][id]=work.policy[collection==='projects'?'projectLocales':'serviceLocales'][id].filter(l=>l!=='en');}
   const serviceIds=work.services.map(q=>q.service.id);work.relations=Object.fromEntries(work.projects.map(q=>[q.project.id,{eligibleServiceIds:q.project.serviceIds.filter(id=>serviceIds.includes(id)),missingServiceIds:q.project.serviceIds.filter(id=>!serviceIds.includes(id))}]));const credential=work.resources.find(r=>r.id===work.workCredential.resourceId),resources=new Map([[credential.id,credential]]);for(const qa of [...Object.values(work.sections),...work.projects,...work.services])for(const resource of qa.resources)resources.set(resource.id,resource);work.resources=[...resources.values()];
   const snapshotIds={},approvalPins={};for(const entry of full.dependencyVector.resources){const key=`${entry.resource.kind}/${entry.resource.entityId}`;if(entry.snapshotId){snapshotIds[key]=entry.snapshotId;approvalPins[key]=entry.approval;}}
   return assembleFullSiteQa({locale:'en',hero:full.hero,groups:full.groups,workServices:work,mode,snapshotIds,approvalPins,sourceHash:full.dependencyVector.sourceHash,availabilityHash:full.dependencyVector.availabilityHash,heroDependencyHash:full.dependencyVector.resources.find(r=>r.resource.kind==='hero').dependencyHash});
  };
  const saved=compose('QA_SAVED');assert.equal(saved.workServices[collection].length,0);assert.equal(saved.workServices.sections[collection==='projects'?'work':'services'].section.isVisible,true);assert.throws(()=>compose('APPROVED_RELEASE'));
 }
});
