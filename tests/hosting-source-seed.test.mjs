import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,rmSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {writeExclusive,ownedFile} from '../scripts/multilingual-release-files.mjs';
import {loadHostingSeed,seedResources,seedContent} from '../scripts/hosting-source-seed.mjs';
import {mergeLocalizedHero} from '../contracts/hero-localization.mjs';
import {mergeLocalizedGroup,groupSourceFromHome} from '../contracts/group-localization.mjs';
import {mergeLocalizedProject} from '../contracts/project-localization.mjs';
import {mergeLocalizedService} from '../contracts/service-localization.mjs';
import {mergeLocalizedSection} from '../contracts/work-services-localization.mjs';
import {routeDefinition} from '../cms-api/routes.mjs';

test('captured template yields all 72 real locale records with shared English headings and remapped media',()=>{
 const relative='.local/test-outputs/p7-v3-source-'+randomUUID();
 try{
  for(const name of ['index.html','content.js'])writeExclusive(relative+'/'+name,readFileSync(new URL('../public-baseline/'+name,import.meta.url)));
  const seed=loadHostingSeed(relative,{'wayfair-team-2026':'cms-wayfair-team'}),resources=seedResources(seed.home);assert.equal(resources.length,72);assert.equal(seed.home.sections.find(s=>s.sectionId==='about').experienceFact.label,'Years of creative & production experience.');
  for(const resource of resources){const copy=seedContent(seed,resource);assert.ok(!/QA project|Sample service|P1 LOCAL QA|日本語 見出し/.test(JSON.stringify(copy)));
   if(resource.kind==='hero'){const merged=mergeLocalizedHero(seed.home.hero,{...copy,heading:{lines:[[{text:'Ignored local heading'}]]}});assert.deepEqual(merged.heading,seed.home.hero.heading);}
   if(resource.kind==='group'){const base=groupSourceFromHome(seed.home,resource.entityId),merged=mergeLocalizedGroup(resource.entityId,base,copy);if(base.section?.heading)assert.deepEqual(merged.section.heading,base.section.heading);}
   if(resource.kind==='project'){const base=seed.home.projects.find(p=>p.id===resource.entityId),merged=mergeLocalizedProject(base,copy);assert.equal(merged.client,base.client);assert.equal(merged.year,base.year);if(base.id==='wayfair'){assert.ok(Object.hasOwn(copy.imageAlts,'gallery:cms-wayfair-team'));assert.deepEqual(copy.scope,[]);}}
   if(resource.kind==='service')mergeLocalizedService(seed.home.services.find(s=>s.id===resource.entityId),copy);
   if(resource.kind==='section'){const base=seed.home.sections.find(s=>s.sectionId===resource.entityId),merged=mergeLocalizedSection(base,{...copy,heading:{lines:[[{text:'Ignored local heading'}]]}});assert.deepEqual(merged.heading,base.heading);}
  }
  assert.notEqual(seedContent(seed,{kind:'service',entityId:'brand-creative',locale:'en'}).summary,seedContent(seed,{kind:'service',entityId:'brand-creative',locale:'ja'}).summary);
 }finally{rmSync(ownedFile(relative),{recursive:true,force:true});}
});
test('website commands expose only the explicit local status, seed, publish and rollback routes',()=>{
 assert.deepEqual(routeDefinition('/api/cms/localizations/website/status'),{methods:['GET'],kind:'LOCAL_WEBSITE_STATUS'});
 for(const action of ['seed','publish','rollback'])assert.deepEqual(routeDefinition('/api/cms/localizations/website/'+action).methods,['POST']);
 for(const action of ['activate','cloud','reset','../publish'])assert.throws(()=>routeDefinition('/api/cms/localizations/website/'+action));
});
