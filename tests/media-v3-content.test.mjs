import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createMediaV3ContentSchemas,parseMediaV3Content,projectClaimGroupsV3} from '../contracts/media-v3-content.mjs';

const fixture=JSON.parse(readFileSync(new URL('./fixtures/media-v3-content.json',import.meta.url),'utf8'));
const sample=fixture.cases[0];
const clone=value=>structuredClone(value);
const context=row=>({sourceCatalog:row.sourceCatalog,currentYear:fixture.currentYear,...(row.content.settings.showreel.originalSourceUrl!==undefined?{allowedShowreelSourceUrl:row.content.settings.showreel.originalSourceUrl}:{})});
const parse=value=>parseMediaV3Content(value,context(sample));
const groups=value=>projectClaimGroupsV3(parse(value));
const changed=mutate=>{const value=clone(sample.content);mutate(value);return value;};
const section=(value,id)=>value.sections.find(item=>item.sectionId===id);
const rejected=mutate=>assert.throws(()=>parse(changed(mutate)));
// Independent expected-hash oracle: direct sorted keys, ordered arrays, unchanged
// string escaping. Never call the production canonical primitive for expectations.
function canonical(value){
  if(value===null || typeof value!=='object')return JSON.stringify(value);
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';
}
const hash=value=>createHash('sha256').update(canonical(value),'utf8').digest('hex');

test('five frozen synthetic contents parse unchanged and match independent factual claim hashes',()=>{
  for(const row of fixture.cases){
    const parsed=parseMediaV3Content(row.content,context(row));assert.deepEqual(parsed,row.content);
    const claim=projectClaimGroupsV3(parsed).find(group=>group.claimPath===row.expectedClaim.claimPath);
    assert.ok(claim);assert.equal(hash(claim.value),row.expectedClaim.claimHash,row.family);
  }
});
test('builder exposes only contentSchema and requires explicit typed sourceCatalog/currentYear',()=>{
  assert.deepEqual(Object.keys(createMediaV3ContentSchemas(context(sample))),['contentSchema']);
  const ctx=context(sample);delete ctx.currentYear;assert.throws(()=>createMediaV3ContentSchemas(ctx));
  assert.throws(()=>createMediaV3ContentSchemas({...context(sample),sourceIds:sample.sourceCatalog.map(value=>value.id)}));
  const bad={...context(sample)};delete bad.sourceCatalog;assert.throws(()=>createMediaV3ContentSchemas(bad));
  assert.throws(()=>createMediaV3ContentSchemas({...context(sample),trust:true}));
});
test('context catalog retains strict baseline factual entry relations and uniqueness',()=>{
  const bad=clone(context(sample));bad.sourceCatalog.push(clone(bad.sourceCatalog[0]));assert.throws(()=>createMediaV3ContentSchemas(bad));
  const unknown=clone(context(sample));unknown.sourceCatalog[0].privateDocumentId='raw-legacy';assert.throws(()=>createMediaV3ContentSchemas(unknown));
  const invalid=clone(context(sample));invalid.sourceCatalog[0].kind='CREDENTIAL';delete invalid.sourceCatalog[0].pageCount;assert.throws(()=>createMediaV3ContentSchemas(invalid));
});
test('descriptor and unknown properties are rejected at every content depth',()=>{
  rejected(value=>{value.schemaVersion=2;});rejected(value=>{value.locale='en-US';});
  rejected(value=>{value.extra=true;});rejected(value=>{value.projects[0].unknown=true;});
  rejected(value=>{value.hero.image.source='MEDIA_VERSION';});
});
test('strict JSON refuses descriptors/accessors/cycles/undefined/sparse/symbols/lone surrogates',()=>{
  let calls=0;const value=clone(sample.content);Object.defineProperty(value.hero,'note',{enumerable:true,get(){calls++;return 'x';}});assert.throws(()=>parse(value));assert.equal(calls,0);
  rejected(value=>{value.hero.note=undefined;});rejected(value=>{value.hero.note='\uD800';});
  rejected(value=>{value.projects[0].scope[Symbol('x')]='x';});
  rejected(value=>{delete value.hero.description[0];});
  rejected(value=>{value.self=value;});
  const contextWithGetter={...context(sample)};Object.defineProperty(contextWithGetter,'currentYear',{enumerable:true,get(){calls++;return 2026;}});assert.throws(()=>createMediaV3ContentSchemas(contextWithGetter));assert.equal(calls,0);
});
test('copy preserves whitespace/Unicode and enforces submitted UTF16 limits',()=>{
  const value=changed(item=>{item.hero.note='  Tiếng Việt 😀\nDòng hai  ';});assert.equal(parse(value).hero.note,value.hero.note);
  rejected(item=>{item.hero.note='😀'.repeat(151);});
  rejected(item=>{item.hero.eyebrow='\tbad';});
});
test('M1 multiline hero headings and M2 single-line section headings retain separate rules',()=>{
  assert.equal(parse(changed(value=>{value.hero.heading.lines[0][0].text='A\nB';})).hero.heading.lines[0][0].text,'A\nB');
  rejected(value=>{section(value,'work').heading.lines[0][0].text='A\nB';});
});
test('media references remain structural without catalog eligibility or a source discriminator',()=>{
  const value=changed(item=>{item.hero.image.assetId='unresolved-image';});assert.equal(parse(value).hero.image.assetId,'unresolved-image');
  rejected(item=>{item.hero.image.assetId='path/to/file';});
  rejected(item=>{item.hero.image.assetId='a'.repeat(101);});
  rejected(item=>{item.hero.image.derivativeRole='POSTER';});
});
test('new POSTER and legacy image poster shapes are accepted separately and strictly',()=>{
  const row=fixture.cases.find(item=>item.family==='G_VIDEO');assert.equal(parseMediaV3Content(row.content,context(row)).settings.showreel.poster.derivativeRole,'POSTER');
  assert.equal(parse(sample.content).settings.showreel.poster.derivativeRole,undefined);
  const invalid=clone(row.content);invalid.settings.showreel.poster.derivativeRole='VIDEO';assert.throws(()=>parseMediaV3Content(invalid,context(row)));
});
test('decorative images retain exact alt rule; SEO image must be nondecorative',()=>{
  assert.equal(parse(changed(value=>{value.hero.image.isDecorative=true;value.hero.image.alt='';})).hero.image.isDecorative,true);
  rejected(value=>{value.hero.image.isDecorative=true;});
  rejected(value=>{value.seo.ogImage.isDecorative=true;value.seo.ogImage.alt='';});
  rejected(value=>{value.hero.image.focalPoint={x:NaN,y:0};});
});
test('year and baseline list/identity constraints remain explicit',()=>{
  rejected(value=>{value.projects[0].year=2029;});
  rejected(value=>{value.projects.push(clone(value.projects[0]));});
  rejected(value=>{value.projects[0].gallery.push(clone(value.projects[0].cover));});
  rejected(value=>{value.projects[0].publicCredentialPage=49;});
  rejected(value=>{value.sectionOrder[0]=value.sectionOrder[1];});
});
test('business section/service/project relations reject broken identities safely',()=>{
  rejected(value=>{section(value,'services').serviceOrder=[];});
  rejected(value=>{section(value,'work').featuredIds=['missing-project'];});
  rejected(value=>{section(value,'contact').serviceOptionIds=['missing-service'];});
  rejected(value=>{value.projects[0].serviceIds=['missing-service'];});
  rejected(value=>{value.sections[0]=clone(value.sections[1]);});
});
test('navigation/actions retain visible-target and credential identity rules',()=>{
  rejected(value=>{value.settings.nav[0].sectionId='about';section(value,'about').isVisible=false;});
  rejected(value=>{value.hero.primaryAction={kind:'SECTION',sectionId:'work',label:'Go'};section(value,'work').isVisible=false;});
  rejected(value=>{value.hero.primaryAction={kind:'SHOWREEL',label:'Play'};section(value,'about').isVisible=false;});
  rejected(value=>{value.hero.primaryAction={kind:'CREDENTIAL',assetId:'other-pdf',label:'Read'};});
});
test('showreel URL context is explicit and cannot widen baseline URL semantics',()=>{
  const value=clone(sample.content);value.settings.showreel.originalSourceUrl='https://drive.google.com/file/d/golden/view';
  assert.throws(()=>parse(value));assert.equal(parseMediaV3Content(value,{...context(sample),allowedShowreelSourceUrl:value.settings.showreel.originalSourceUrl}).settings.showreel.originalSourceUrl,value.settings.showreel.originalSourceUrl);
  assert.throws(()=>createMediaV3ContentSchemas({...context(sample),allowedShowreelSourceUrl:'https://drive.google.com/file/d/golden/view?x=1'}));
  rejected(item=>{item.settings.showreel.durationSeconds=Infinity;});
});
test('factual source membership uses sourceCatalog, never raw legacy or rights namespace',()=>{
  rejected(value=>{value.claimSources[0].sourceIds=['raw-legacy-unknown'];});
  rejected(value=>{value.claimSources[0].claimPath='projects/missing/facts';});
  rejected(value=>{value.claimSources.push(clone(value.claimSources[0]));});
  rejected(value=>{value.claimSources[0].sourceIds.push(value.claimSources[0].sourceIds[0]);});
});
test('projection includes hidden facts, sorts identities and returns independent data',()=>{
  const result=groups(sample.content),paths=result.map(value=>value.claimPath);assert.deepEqual(paths,[...paths].sort());
  const hidden=sample.content.projects.find(value=>value.isVisible===false);assert.ok(hidden);assert.ok(paths.includes(`projects/${hidden.id}/facts`));
  const project=result.find(value=>value.claimPath===`projects/${hidden.id}/facts`).value;assert.deepEqual(project.serviceIds,[...project.serviceIds].sort());assert.equal(Object.hasOwn(project,'isVisible'),false);
  result.find(value=>value.claimPath==='settings/credential/facts').value.label='changed';assert.notEqual(sample.content.settings.credential.label,'changed');
});
test('projection excludes presentation/emphasis/source bindings but preserves factual and creative changes',()=>{
  const baseline=groups(sample.content);
  const presentation=changed(value=>{value.projects[0].isVisible=!value.projects[0].isVisible;value.hero.image.focalPoint={x:0.2,y:0.8};value.hero.description[0].emphasis='ACCENT';value.claimSources=[];});assert.deepEqual(groups(presentation),baseline);
  const factual=changed(value=>{value.hero.image.alt+=' revised';});assert.notDeepEqual(groups(factual).find(value=>value.claimPath==='hero/facts'),baseline.find(value=>value.claimPath==='hero/facts'));
  const creative=changed(value=>{value.hero.note+=' revised';});assert.notDeepEqual(groups(creative).find(value=>value.claimPath==='creative-copy'),baseline.find(value=>value.claimPath==='creative-copy'));assert.deepEqual(groups(creative).find(value=>value.claimPath==='hero/facts'),baseline.find(value=>value.claimPath==='hero/facts'));
});
