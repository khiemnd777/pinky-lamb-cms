import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {SITE_SCHEMA_VERSION,SITE_TEMPLATE_VERSION,SITE_DRAFT_ID,createSiteSchemas,validateSiteContent,validateSitePatch,applySitePatch,collectSiteAssetIds,projectClaimGroups,classifySiteContentLeaves} from '../contracts/site.mjs';
import {encodeSiteStoredContent,decodeSiteStoredContent,encodeSiteStoredDraft,decodeSiteStoredDraft,parseSiteSaveRequest,measureSiteBudget,assertSiteBudget,buildSiteBudgetCandidates,createSiteDraftSchemas} from '../contracts/site-draft.mjs';
import {resolveContentVersion,validateVersionedContent,encodeVersionedContent,decodeVersionedContent} from '../contracts/content-version.mjs';
import {parseJsonBody} from '../contracts/hero.mjs';

// Synthetic finite context. No task02 mapping/private catalog or application fixture helpers.
const imageIds=['pinky-hero','brand-diagonal','pinky-mascot','showreel-poster','case-cover','case-gallery','client-logo','favicon'];
const catalog=[...imageIds.map(id=>({id,kind:'IMAGE',status:'LEGACY_READY'})),{id:'credential',kind:'PDF',status:'LEGACY_READY'},{id:'showreel-2025',kind:'VIDEO',status:'LEGACY_READY',durationSeconds:65.344}];
const context={catalog,sourceIds:['baseline-source','baseline-credential'],fixedAssetIds:['brand-diagonal','favicon'],currentYear:2026,allowedShowreelSourceUrl:'https://drive.google.com/file/d/synthetic-source/view',sourceCatalog:[]};
const clone=value=>structuredClone(value);
const image=(assetId='pinky-hero')=>({assetId,alt:'Pinky Lamb',isDecorative:false});
const heading=()=>({lines:[[{text:'Big ideas.'}],[{text:'Lovely impact.',emphasis:'ACCENT'}]]});
const service=(id='events')=>({id,title:'Events',titleVi:'Sự kiện',summary:'Sản xuất sự kiện.',scope:['Concept'],isVisible:true});
const project=(id='case-one')=>({id,slug:id,title:'Synthetic event',client:'Synthetic client',year:2026,category:'EVENTS',eyebrow:'Event 2026',summary:'Synthetic supplied event.',scope:['Production'],cover:image('case-cover'),gallery:[image('case-gallery')],serviceIds:['events'],publicCredentialPage:1,isVisible:true});
function content(){return {schemaVersion:2,locale:'vi-VN',hero:{kind:'HERO',variant:'hero-split',heading:heading(),eyebrow:'INDEPENDENT MINDS.',description:[{text:'Creative production in Vietnam.'}],primaryAction:{kind:'SECTION',sectionId:'work',label:'Khám phá dự án'},secondaryAction:{kind:'SHOWREEL',label:'Xem showreel'},footnote:'BASED IN VIETNAM.',note:'The house of all cutest things.',image:image()},seo:{title:'Pinky Lamb',description:'Creative production.',ogTitle:'Lovely impact.',ogDescription:'Creative production in Vietnam.',ogImage:image()},settings:{header:{descriptor:'Independent Creative Production Agency & IP Studio',ctaLabel:'Gửi brief'},brand:{name:'Pinky Lamb',logo:image('brand-diagonal'),tagline:'Big ideas. Lovely impact.'},credential:{assetId:'credential',label:'Credential',edition:'2026'},showreel:{assetId:'showreel-2025',poster:image('showreel-poster'),title:'Pinky Lamb / Showreel 2025',durationSeconds:65.344},contact:{email:'synthetic@example.test',personName:'Synthetic contact',personPhoneE164:'+84332338667',personPhoneLabel:'+84 33 233 8667',officePhoneE164:'+842822101441',officePhoneLabel:'(028) 22 101 441',addressLines:['Synthetic local address'],facebookUrl:'https://www.facebook.com/pinkylamb.media',illustration:image('pinky-mascot')},nav:[{sectionId:'work',label:'Dự án'},{sectionId:'services',label:'Dịch vụ'}],clientLogos:[{id:'client-one',clientName:'Synthetic client',image:image('client-logo'),isVisible:true}],copyright:{startYear:2026,label:'Pinky Lamb. All rights reserved.'}},services:[service()],projects:[project()],sections:[
 {kind:'CLIENTS',sectionId:'clients',isVisible:true,heading:[{text:'Selected clients'}]},
 {kind:'WORK',sectionId:'work',isVisible:true,variant:'work-grid',heading:heading(),intro:'Các dự án',featuredIds:['case-one'],initialVisibleCount:1,filterLabels:{all:'Tất cả',EVENTS:'Events',FILM:'Film',COMMUNICATIONS:'Communications'}},
 {kind:'SERVICES',sectionId:'services',isVisible:true,variant:'services-accordion',heading:heading(),intro:'Dịch vụ',serviceOrder:['events'],action:{kind:'SECTION',sectionId:'contact',label:'Gửi brief'}},
 {kind:'ABOUT',sectionId:'about',isVisible:true,variant:'about-split',heading:heading(),lead:'Independent minds.',paragraphs:['Creative production in Vietnam.'],experienceFact:{value:'15+',label:'Năm kinh nghiệm',copy:'Supplied experience statement',location:'Vietnam'},signature:{image:image('pinky-mascot'),copy:[{text:'From Pinky with love.'}]},reelHeading:heading(),reelCaption:'Pinky Lamb / Showreel 2025'},
 {kind:'IP',sectionId:'ip-studio',isVisible:true,variant:'ip-split',heading:heading(),description:'Original creative ideas',image:image('pinky-mascot'),disciplines:['Character'],action:{kind:'SECTION',sectionId:'contact',label:'Kết nối'}},
 {kind:'CONTACT',sectionId:'contact',isVisible:true,variant:'contact-form',heading:heading(),intro:'Gửi brief',formMode:'MAILTO_COPY',serviceOptionIds:['events']},
 {kind:'FOOTER',sectionId:'footer',variant:'footer-wordmark',heading:heading(),descriptor:'Independent Creative Production Agency & IP Studio',backToTopLabel:'BACK TO TOP'}],sectionOrder:['work','services','about','ip-studio'],claimSources:[]};}
const section=(value,id)=>value.sections.find(entry=>entry.sectionId===id);
const reject=value=>assert.throws(()=>validateSiteContent(value,context));
const rejectPatch=value=>assert.throws(()=>validateSitePatch(value,context));
const rejectApply=(value,patch)=>{const before=clone(value);assert.throws(()=>applySitePatch(value,patch,context));assert.deepEqual(value,before);};
const canonical=value=>Array.isArray(value)?`[${value.map(canonical).join(',')}]`:value!==null&&typeof value==='object'?`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`:JSON.stringify(value);
const sha=value=>createHash('sha256').update(canonical(value)).digest('hex');
const bytes=value=>Buffer.byteLength(JSON.stringify(value),'utf8');

test('v2 complete content preserves exact values and has its own fixed version/resource',()=>{
 assert.equal(SITE_SCHEMA_VERSION,2);assert.equal(SITE_TEMPLATE_VERSION,'m2-site-baseline-v1');assert.equal(SITE_DRAFT_ID,'home-v2');
 const value=content();value.projects[0].summary='  Exact supplied copy.  ';assert.deepEqual(validateSiteContent(value,context),value);assert.deepEqual(createSiteSchemas(context).contentSchema.parse(value),value);
 value.hero.heading.lines=[[{text:'M1 heading\ncopy'}]];assert.deepEqual(validateSiteContent(value,context),value); // M2 does not change the inherited M1 Hero run contract.
});
test('all references are checked even when records and sections are hidden',()=>{
 for(const mutate of [v=>v.projects[0].serviceIds=['missing'],v=>section(v,'work').featuredIds=['missing'],v=>section(v,'services').serviceOrder=['missing'],v=>section(v,'contact').serviceOptionIds=['missing'],v=>v.projects[0].cover=image('missing'),v=>v.settings.clientLogos[0].image=image('credential')]){const v=content();v.projects[0].isVisible=false;v.services[0].isVisible=false;section(v,'work').isVisible=false;mutate(v);reject(v);}
 const v=content();v.services[0].isVisible=false;assert.deepEqual(validateSiteContent(v,context),v); // Stored contact references may retain a hidden known service.
});
test('sections/order/families keep full permutations and stable unique identities',()=>{
 for(const mutate of [v=>v.sectionOrder=['work','services','about'],v=>v.sectionOrder=['work','work','about','ip-studio'],v=>v.sections.pop(),v=>v.sections[6]=clone(v.sections[0]),v=>v.projects.push({...project('second'),slug:'case-one'}),v=>v.services.push(service()),v=>v.settings.clientLogos.push(clone(v.settings.clientLogos[0])),v=>section(v,'services').serviceOrder=[]]){const v=content();mutate(v);reject(v);}
 const v=content();v.sectionOrder.reverse();v.projects[0].isVisible=false;assert.deepEqual(validateSiteContent(v,context),v);
});
test('visible navigation/CTA targets and SHOWREEL About association validate resulting content',()=>{
 for(const mutate of [v=>section(v,'work').isVisible=false,v=>section(v,'services').isVisible=false,v=>section(v,'about').isVisible=false]){const v=content();mutate(v);reject(v);}
 const v=content();v.hero.secondaryAction={kind:'SECTION',sectionId:'contact',label:'Contact'};section(v,'about').isVisible=false;assert.deepEqual(validateSiteContent(v,context),v);
});
test('full content denies unknown/server fields/null and hostile object prototypes without getters',()=>{
 for(const mutate of [v=>v.revision=4,v=>v.templateVersion='spoof',v=>v.importLineage={},v=>v.projects[0].sourceRefs=['baseline-source'],v=>v.claimSources=[{claimPath:'creative-copy',sourceIds:['baseline-source'],checkedBy:'spoof'}],v=>v.settings=null]){const v=content();mutate(v);reject(v);}
 const v=content();Object.setPrototypeOf(v.projects[0],{verification:'SOURCE_CHECKED'});reject(v);let calls=0;const getter=content();Object.defineProperty(getter.settings.contact,'email',{enumerable:true,get(){calls++;return 'synthetic@example.test';}});reject(getter);assert.equal(calls,0);
 const cyclic=content();cyclic.projects[0].self=cyclic;reject(cyclic);reject(JSON.parse('{"__proto__":{"role":"OWNER"}}'));
});
test('typed patches require nonempty full subvalues and reject server fields/arbitrary merge',()=>{
 for(const patch of [{},{settings:{}},{settings:{brand:{}}},{settings:{brand:{name:'Other'}}},{settings:{header:{ctaLabel:'Partial'}}},{settings:{showreel:content().settings.showreel}},{revision:1},{schemaVersion:2},{localBaseUrl:'http://127.0.0.1:4173'},{projects:[]},{hero:null},{settings:null},{'projects.0.title':'merge'},JSON.parse('{"__proto__":{"role":"OWNER"}}')])rejectPatch(patch);
 const patch={settings:{brand:{tagline:'  Exact new tagline.  '}}};assert.deepEqual(validateSitePatch(patch,context),patch);
 const showreel=clone(content().settings.showreel);delete showreel.durationSeconds;showreel.title='New editorial reel title';const applied=applySitePatch(content(),{settings:{showreel}},context);assert.equal(applied.settings.showreel.durationSeconds,65.344);assert.equal(applied.settings.showreel.title,showreel.title);
 for(const local of [{hero:undefined},{settings:{header:undefined}},{settings:{brand:{tagline:undefined}}}])rejectPatch(local);
 const mixed={hero:undefined,settings:{header:undefined,showreel:undefined,brand:{tagline:'Valid local change',logo:undefined}}};assert.equal(JSON.stringify(validateSitePatch(mixed,context)),JSON.stringify({settings:{brand:{tagline:'Valid local change'}}}));
 const original=content(),before=clone(original);const merged=applySitePatch(original,mixed,context);assert.deepEqual(original,before);assert.deepEqual(merged.settings.header,before.settings.header);assert.deepEqual(merged.settings.showreel,before.settings.showreel);assert.deepEqual(merged.settings.brand.logo,before.settings.brand.logo);assert.equal(merged.settings.brand.tagline,'Valid local change');
});
test('one record family/one record/one section limits reject duplicate and overlapping intents',()=>{
 const change={op:'REPLACE',id:'case-one',value:project()};
 for(const patch of [{projectChanges:[change,change]},{projectChanges:[change],serviceChanges:[{op:'REPLACE',id:'events',value:service()}]},{serviceChanges:[]},{projectChanges:[{...change,id:'other'}]},{projectChanges:[{op:'DELETE',id:'case-one'}]},{projectChanges:[{op:'SET_VISIBILITY',id:'case-one',isVisible:null}]},{sections:[{sectionId:'work',value:section(content(),'services')}]},{sections:[{sectionId:'work',value:section(content(),'work')},{sectionId:'about',value:section(content(),'about')}]}])rejectPatch(patch);
});
test('atomic ADD with dependent order/section/source updates validates only final state',()=>{
 const v=content();const added=service('film');const servicesSection=clone(section(v,'services'));servicesSection.serviceOrder.push('film');const patch={serviceChanges:[{op:'ADD',value:added}],sections:[{sectionId:'services',value:servicesSection}],claimSources:[{claimPath:'services/film/facts',sourceIds:['baseline-source']}]};
 const before=clone(v);const result=applySitePatch(v,patch,context);assert.deepEqual(v,before);assert.deepEqual(result.services,[service(),added]);assert.deepEqual(section(result,'services'),servicesSection);assert.deepEqual(result.claimSources,patch.claimSources);
 rejectApply(v,{serviceChanges:[{op:'ADD',value:added}]});rejectApply(v,{serviceChanges:[{op:'ADD',value:service()}]});
});
test('project/logo order patches include hidden IDs and are exact permutations',()=>{
 const v=content();v.projects.push({...project('case-two'),isVisible:false});v.settings.clientLogos.push({...clone(v.settings.clientLogos[0]),id:'client-two',isVisible:false});
 const p={projectsOrder:['case-two','case-one'],clientLogoOrder:['client-two','client-one']};const result=applySitePatch(v,p,context);assert.deepEqual(result.projects.map(x=>x.id),p.projectsOrder);assert.deepEqual(result.settings.clientLogos.map(x=>x.id),p.clientLogoOrder);
 for(const patch of [{projectsOrder:['case-one']},{projectsOrder:['case-one','case-one']},{projectsOrder:['case-one','missing']},{clientLogoOrder:['client-one']},{clientLogoOrder:['client-one','missing']}])rejectApply(v,patch);
});
test('archive preserves record identity/references and failed patch leaves input unchanged',()=>{
 const v=content();const result=applySitePatch(v,{projectChanges:[{op:'SET_VISIBILITY',id:'case-one',isVisible:false}]},context);assert.equal(result.projects.length,1);assert.equal(result.projects[0].isVisible,false);assert.deepEqual(section(result,'work').featuredIds,['case-one']);
 rejectApply(v,{projectChanges:[{op:'REPLACE',id:'missing',value:project('missing')}]});rejectApply(v,{serviceChanges:[{op:'SET_VISIBILITY',id:'missing',isVisible:false}]});
 const changed=project();changed.serviceIds=['missing'];rejectApply(v,{projectChanges:[{op:'REPLACE',id:'case-one',value:changed}]});
});
test('claim selection refers only to existing fullsite groups and allowed sources',()=>{
 const v=content();v.claimSources=[{claimPath:'projects/case-one/facts',sourceIds:['baseline-credential']},{claimPath:'creative-copy',sourceIds:['baseline-source']}];assert.deepEqual(validateSiteContent(v,context),v);
 for(const claim of [{claimPath:'projects/missing/facts',sourceIds:['baseline-source']},{claimPath:'services/missing/facts',sourceIds:['baseline-source']},{claimPath:'clientLogos/missing/facts',sourceIds:['baseline-source']},{claimPath:'hero/facts',sourceIds:['missing']}])reject({...content(),claimSources:[claim]});
});
test('asset traversal includes hidden/gallery/artwork/signature and fixed assets exactly once',()=>{
 const v=content();v.projects[0].isVisible=false;section(v,'about').isVisible=false;delete v.hero.secondaryAction;
 assert.deepEqual(collectSiteAssetIds(v,context),['brand-diagonal','case-cover','case-gallery','client-logo','credential','favicon','pinky-hero','pinky-mascot','showreel-2025','showreel-poster']);
});
test('factual groups project exact category/service relationships and About signature identity',()=>{
 const v=content();const groups=projectClaimGroups(v,context);assert.deepEqual(groups.map(x=>x.claimPath),[...groups.map(x=>x.claimPath)].sort());assert.equal(new Set(groups.map(x=>x.claimPath)).size,groups.length);
 const facts=groups.find(x=>x.claimPath==='projects/case-one/facts').value;const {title,client,year,category,eyebrow,summary,scope,serviceIds,publicCredentialPage}=v.projects[0];assert.deepEqual(facts,{title,client,year,category,eyebrow,summary,scope,serviceIds,publicCredentialPage,cover:{assetId:'case-cover',alt:'Pinky Lamb'},gallery:[{assetId:'case-gallery',alt:'Pinky Lamb'}]});
 const about=section(v,'about');assert.deepEqual(groups.find(x=>x.claimPath==='sections/about/facts').value,{lead:about.lead,paragraphs:about.paragraphs,experienceFact:about.experienceFact,signature:{image:{assetId:'pinky-mascot',alt:'Pinky Lamb'}}});
 const changed=clone(v);changed.projects[0].category='FILM';assert.notEqual(sha(facts),sha(projectClaimGroups(changed,context).find(x=>x.claimPath==='projects/case-one/facts').value));changed.projects[0].category='EVENTS';changed.projects[0].cover.focalPoint={x:0,y:1};assert.equal(sha(facts),sha(projectClaimGroups(changed,context).find(x=>x.claimPath==='projects/case-one/facts').value));
});
test('renderable leaves are exhaustively classified; category and About signature are factual',()=>{
 const v=content();v.projects[0].cover.focalPoint={x:0,y:1};
 const leaves=[];function walk(value,path=''){if(value!==null&&typeof value==='object')for(const [key,child] of Object.entries(value)){if(!path&&key==='claimSources')continue;walk(child,path?`${path}.${key}`:key);}else leaves.push(path);}walk(v);
 const classified=classifySiteContentLeaves(v,context);assert.deepEqual(classified.map(x=>x.path).sort(),leaves.sort());assert.equal(new Set(classified.map(x=>x.path)).size,leaves.length);
 const expected={'projects.0.category':['FACTUAL','projects/case-one/facts'],'projects.0.serviceIds.0':['FACTUAL','projects/case-one/facts'],'projects.0.cover.assetId':['FACTUAL','projects/case-one/facts'],'sections.3.signature.image.alt':['FACTUAL','sections/about/facts'],'sections.3.signature.copy.0.text':['CREATIVE','creative-copy'],'hero.note':['CREATIVE','creative-copy'],'settings.brand.tagline':['CREATIVE','creative-copy'],'settings.header.descriptor':['FACTUAL','settings/brand/facts'],'projects.0.cover.focalPoint.x':['PRESENTATION',undefined],'projects.0.id':['PRESENTATION',undefined],'schemaVersion':['CONSTANT',undefined],'settings.brand.name':['CONSTANT',undefined]};
 for(const [path,[classification,claimPath]] of Object.entries(expected)){const leaf=classified.find(x=>x.path===path);assert.equal(leaf.classification,classification,path);assert.equal(leaf.claimPath,claimPath,path);}
 for(const leaf of classified)assert.ok(['FACTUAL','CREATIVE','PRESENTATION','CONSTANT'].includes(leaf.classification));
 const unknown=content();unknown.projects[0].result='Unclassified assertion';assert.throws(()=>classifySiteContentLeaves(unknown,context));
});
test('fact membership ordering is normalized while semantic copy ordering and original content remain exact',()=>{
 const v=content();v.services.push(service('film'));section(v,'services').serviceOrder.push('film');v.projects[0].serviceIds=['film','events'];v.projects[0].gallery.push(image('pinky-hero'));
 const groups=projectClaimGroups(v,context);const reordered=clone(v);reordered.projects[0].gallery.reverse();reordered.projects[0].serviceIds.reverse();assert.deepEqual(projectClaimGroups(reordered,context),groups);assert.notEqual(sha(reordered),sha(v));
 const paragraphs=clone(v);section(paragraphs,'about').paragraphs=['First fact.','Second fact.'];const reversed=clone(paragraphs);section(reversed,'about').paragraphs.reverse();assert.notEqual(sha(projectClaimGroups(paragraphs,context)),sha(projectClaimGroups(reversed,context)));
});
test('malicious text is retained literally across fullsite fields for later context encoding',()=>{
 const hostile=JSON.parse(readFileSync(new URL('./fixtures/m2-malicious.json',import.meta.url),'utf8'));const v=content();v.hero.heading.lines=[[{text:hostile.headingText}]];v.settings.brand.tagline=hostile.copy;v.projects[0].summary=hostile.multiline;v.projects[0].cover.alt=hostile.alt;section(v,'about').signature.copy=[{text:hostile.copy}];v.seo.title=hostile.headingText;
 assert.deepEqual(validateSiteContent(v,context),v);assert.equal(projectClaimGroups(v,context).find(x=>x.claimPath==='projects/case-one/facts').value.cover.alt,hostile.alt);
});
test('raw transport64KiB and typed Save64KiB are separate from full content envelope',()=>{
 assert.equal(parseJsonBody('"'+'x'.repeat(65534)+'"').length,65534);assert.throws(()=>parseJsonBody('"'+'x'.repeat(65535)+'"'),e=>e.status===413);assert.throws(()=>parseJsonBody(Uint8Array.from([0xc3,0x28])),e=>e.status===400);
 const request={expectedRevision:0,patch:{settings:{brand:{tagline:'Literal copy'}}}};assert.deepEqual(parseSiteSaveRequest(request,context),request);
 for(const value of [{...request,updatedBy:'spoof'},{...request,expectedRevision:-1},{...request,expectedRevision:'0'},{...request,patch:null}])assert.throws(()=>parseSiteSaveRequest(value,context),e=>e.status===422);
 let getterCalls=0;const accessor=clone(request);Object.defineProperty(accessor,'expectedRevision',{enumerable:true,get(){getterCalls++;return 0;}});assert.throws(()=>parseSiteSaveRequest(accessor,context),e=>e.status===422);assert.equal(getterCalls,0,'typed request getters must not run before rejection');const cyclic=clone(request);cyclic.patch.self=cyclic;assert.throws(()=>parseSiteSaveRequest(cyclic,context),e=>e.status===422);
 const v=content();v.projects=Array.from({length:24},(_,i)=>({...project(`case-${i}`),summary:'界'.repeat(1000)}));section(v,'work').featuredIds=[];assert.ok(bytes(v)>65536);assert.deepEqual(validateSiteContent(v,context),v);
 const large=content(),unit='\ud800';large.projects[0].title=unit.repeat(120);large.projects[0].client=unit.repeat(120);large.projects[0].eyebrow=unit.repeat(120);large.projects[0].summary=unit.repeat(1000);large.projects[0].scope=Array(12).fill(unit.repeat(160));large.projects[0].cover.alt=unit.repeat(300);
 const about=section(large,'about');about.lead=unit.repeat(3997);about.paragraphs=[];about.experienceFact.copy='x';about.signature.copy=[{text:'x'}];about.reelCaption='x';
 large.hero.description=[{text:unit.repeat(1000)}];large.hero.footnote=unit.repeat(240);large.hero.note=unit.repeat(300);large.hero.image.alt=unit.repeat(300);
 const contact=large.settings.contact;contact.personName=unit.repeat(120);contact.personPhoneLabel=unit.repeat(80);contact.officePhoneLabel=unit.repeat(80);contact.addressLines=Array(4).fill(unit.repeat(160));contact.illustration.alt=unit.repeat(300);
 const patch={hero:large.hero,settings:{brand:{tagline:unit.repeat(300),logo:{...image('brand-diagonal'),alt:unit.repeat(300)}},contact},projectChanges:[{op:'REPLACE',id:'case-one',value:large.projects[0]}],sections:[{sectionId:'about',value:about}]};
 assert.deepEqual(validateSitePatch(patch,context),patch);const wire={expectedRevision:0,patch};assert.ok(bytes(wire)>65536);assert.throws(()=>parseSiteSaveRequest(wire,context),e=>e.status===413);assert.throws(()=>parseJsonBody(JSON.stringify(wire)),e=>e.status===413);
});
test('version dispatch requires exact resource/schema/template pair and preserves M1 fixture bytes',()=>{
 const m1={draftId:'home',schemaVersion:1,templateVersion:'m1-hero-split-v1'},m2={draftId:'home-v2',schemaVersion:2,templateVersion:'m2-site-baseline-v1'};
 assert.equal(resolveContentVersion(m1),'M1');assert.equal(resolveContentVersion(m2),'M2');
 for(const descriptor of [{...m1,draftId:'home-v2'},{...m2,templateVersion:m1.templateVersion},{...m2,schemaVersion:1},{...m2,schemaVersion:'2'},{...m2,unknown:true},{}])assert.throws(()=>resolveContentVersion(descriptor));
 let calls=0;const accessor={...m2};Object.defineProperty(accessor,'templateVersion',{enumerable:true,get(){calls++;return m2.templateVersion;}});assert.throws(()=>resolveContentVersion(accessor));assert.equal(calls,0,'descriptor getters must not run');const symbolic={...m2,[Symbol('extra')]:'unknown'};assert.throws(()=>resolveContentVersion(symbolic));
 const path=new URL('./fixtures/approved-hero.json',import.meta.url);const original=readFileSync(path);const fixture=JSON.parse(original);const old=fixture.content;
 assert.deepEqual(validateVersionedContent(old,m1,context),old);assert.equal(encodeVersionedContent(old,m1,context),JSON.stringify(old));assert.deepEqual(decodeVersionedContent(JSON.stringify(old),m1,context),old);assert.deepEqual(readFileSync(path),original);
 assert.deepEqual(validateVersionedContent(content(),m2,context),content());assert.throws(()=>validateVersionedContent(old,m2,context));assert.throws(()=>validateVersionedContent(content(),m1,context));
});

const lineage={importId:'synthetic-import',importedM1Revision:0,importedM1ContentHash:'1'.repeat(64),baselineManifestHash:'2'.repeat(64),importReportHash:'3'.repeat(64)};
function budgetContext(){return {...context,importLineage:clone(lineage),catalog:catalog.map(asset=>({...asset,legacyPath:`assets/${asset.id}.${asset.kind==='PDF'?'pdf':asset.kind==='VIDEO'?'mp4':'webp'}`,mimeType:asset.kind==='PDF'?'application/pdf':asset.kind==='VIDEO'?'video/mp4':'image/webp',sizeBytes:123,sha256:'a'.repeat(64),derivatives:[],rights:{basis:'CLIENT_SUPPLIED',evidenceRef:'synthetic supplied baseline'},sourceRefs:[`synthetic baseline ${asset.id}`],createdBy:'synthetic-importer',createdAt:'2026-01-01T00:00:00.000Z',...(asset.kind==='IMAGE'?{width:640,height:480}:{})})),sourceCatalog:[{id:'baseline-source',kind:'SUPPLIED_FILE',title:'Synthetic supplied source',sha256:'b'.repeat(64),supportedClaimPaths:['creative-copy','projects/*/facts'],excerpt:'Synthetic factual source.'},{id:'baseline-credential',kind:'CREDENTIAL',title:'Synthetic credential',sha256:'c'.repeat(64),pageCount:48,publicCredentialUrl:'http://127.0.0.1:5010/assets/Pinky-Lamb-Credential-2026.pdf',supportedClaimPaths:['services/*/facts'],excerpt:'Synthetic credential facts.'}]};}
const maxRevision=Number.MAX_SAFE_INTEGER-1;
const domainDraft=value=>({draftId:'home-v2',schemaVersion:2,templateVersion:'m2-site-baseline-v1',content:value,revision:0,updatedBy:'synthetic-editor',updatedAt:'2026-01-01T00:00:00.000Z',lastEventId:'synthetic-save',importLineage:clone(lineage)});
// Test-owned literal wrappers from the reviewed wire contract. No production builder supplies expected bytes.
function independentCandidates(value,ctx){
 const id='x'.repeat(128),hash='0'.repeat(64),at='2026-01-01T00:00:00.000Z';
 const assetIds=['brand-diagonal','favicon','credential','showreel-2025',value.settings.showreel.poster.assetId,value.settings.brand.logo.assetId,value.hero.image.assetId,value.seo.ogImage.assetId,value.settings.contact.illustration.assetId,...value.settings.clientLogos.map(x=>x.image.assetId),...value.projects.flatMap(x=>[x.cover.assetId,...x.gallery.map(y=>y.assetId)])];
 for(const s of value.sections){if(s.image)assetIds.push(s.image.assetId);if(s.signature)assetIds.push(s.signature.image.assetId);if(s.action?.kind==='CREDENTIAL')assetIds.push(s.action.assetId);}
 for(const action of [value.hero.primaryAction,value.hero.secondaryAction])if(action?.kind==='CREDENTIAL')assetIds.push(action.assetId);
 const mediaManifest=[...new Set(assetIds)].sort().map(assetId=>{const asset=ctx.catalog.find(x=>x.id===assetId);return Object.fromEntries(['id','kind','legacyPath','mimeType','sizeBytes','sha256','rights','sourceRefs','width','height','durationSeconds'].filter(key=>asset[key]!==undefined).map(key=>[key,clone(asset[key])]));});
 const sourceStrings=[...new Set(mediaManifest.flatMap(x=>x.sourceRefs))].sort();
 const sourceRefs=sourceStrings.map(text=>{const digest=createHash('sha256').update(text).digest('hex');return {id:`source-${digest}`,kind:'SUPPLIED_FILE',privateDocumentId:`legacy-source-${digest}`,claimBindings:[],verification:'UNVERIFIED'};});
 const claimPaths=['creative-copy','hero/facts','seo/facts','settings/brand/facts','settings/contact/facts','settings/credential/facts','settings/showreel/facts','sections/about/facts','sections/ip-studio/facts','sections/footer/facts',...value.projects.map(x=>`projects/${x.id}/facts`),...value.services.map(x=>`services/${x.id}/facts`),...value.settings.clientLogos.map(x=>`clientLogos/${x.id}/facts`)].sort();
 const summary={id,draftId:'home-v2',draftRevision:maxRevision,contentHash:hash,mediaManifestHash:hash,schemaVersion:2,templateVersion:'m2-site-baseline-v1',submittedBy:id,submittedAt:at};
 const snapshot={...summary,content:value,mediaManifest,sourceRefs,importLineage:ctx.importLineage,message:'\ud800'.repeat(500)};
 const {content:ignored,...snapshotFields}=snapshot;assert.equal(ignored,value);
 const storedSnapshot={...snapshotFields,contentJson:JSON.stringify(value)};
 const metadata={draftId:'home-v2',schemaVersion:2,templateVersion:'m2-site-baseline-v1',revision:maxRevision,updatedBy:id,updatedAt:at,lastEventId:id,importLineage:ctx.importLineage};
 const safeCatalog=ctx.catalog.map(asset=>({id:asset.id,kind:asset.kind,status:asset.status,legacyPath:asset.legacyPath,label:asset.legacyPath.split('/').at(-1),...Object.fromEntries(['width','height','durationSeconds'].filter(key=>asset[key]!==undefined).map(key=>[key,asset[key]]))}));
 const reviewState={snapshotId:id,status:'APPROVED',revision:1,activeReviewId:id,sourceRevision:maxRevision,activeSourceCheckIds:Object.fromEntries(claimPaths.map(path=>[path,id])),updatedAt:at};
 const review={id,snapshotId:id,outcome:'APPROVED',contentHash:hash,reviewedBy:id,reviewedAt:at,note:'\ud800'.repeat(2000),creativeCopyDeclaration:'NO_FACTUAL_CLAIMS',sourceRevision:maxRevision,sourceCheckIds:claimPaths.map(()=>id),attestationSetHash:hash};
 return {logicalContent:value,storedDraft:{...metadata,contentJson:JSON.stringify(value)},storedSnapshot,draftRead:{...metadata,content:value,catalog:safeCatalog,sourceCatalog:ctx.sourceCatalog},snapshotRead:{summary,snapshot,reviewState,review,sourceCatalog:ctx.sourceCatalog}};
}
const measureExpected=candidates=>({logicalContentBytes:bytes(candidates.logicalContent),storedDraftBytes:bytes(candidates.storedDraft),storedSnapshotBytes:bytes(candidates.storedSnapshot),draftReadBytes:bytes(candidates.draftRead),snapshotReadBytes:bytes(candidates.snapshotRead)});
test('v2 storage codec uses exact domain metadata and differentiates input422 from persisted500',()=>{
 const ctx=budgetContext(),v=content(),draft=domainDraft(v);const json=encodeSiteStoredContent(v,ctx);assert.deepEqual(JSON.parse(json),v);assert.deepEqual(decodeSiteStoredContent(json,ctx),v);
 const expected={...draft,contentJson:json};delete expected.content;assert.deepEqual(encodeSiteStoredDraft(draft,ctx),expected);assert.deepEqual(decodeSiteStoredDraft(expected,ctx),draft);
 assert.throws(()=>encodeSiteStoredContent({...v,updatedBy:'spoof'},ctx),e=>e.status===422);
 for(const bad of ['{',JSON.stringify({...v,schemaVersion:1}),JSON.stringify({...v,unknown:true}),null])assert.throws(()=>decodeSiteStoredContent(bad,ctx),e=>e.status===500);
 for(const change of [x=>x.schemaVersion=1,x=>x.draftId='home',x=>x.revision=-1,x=>x.updatedBy='../secret',x=>x.extra=true,x=>x.importLineage.importReportHash='bad']){const bad=clone(expected);change(bad);assert.throws(()=>decodeSiteStoredDraft(bad,ctx),e=>e.status===500);}
 for(const [key,value] of Object.entries({importId:'different-valid-import',importedM1Revision:1,importedM1ContentHash:'f'.repeat(64),baselineManifestHash:'f'.repeat(64),importReportHash:'f'.repeat(64)})){const domain=clone(draft);domain.importLineage[key]=value;assert.throws(()=>encodeSiteStoredDraft(domain,ctx),e=>e.status===422,`${key} input`);const stored=clone(expected);stored.importLineage[key]=value;assert.throws(()=>decodeSiteStoredDraft(stored,ctx),e=>e.status===500,`${key} persisted`);}
 assert.equal(draft.updatedAt.length,24);for(const updatedAt of ['2026-01-01T00:00:00.0000Z','2026-01-01T00:00:00Z']){assert.throws(()=>encodeSiteStoredDraft({...draft,updatedAt},ctx),e=>e.status===422);assert.throws(()=>decodeSiteStoredDraft({...expected,updatedAt},ctx),e=>e.status===500);}
});
test('budget independently measures all five actual wrappers including escaped lone-surrogate metadata',()=>{
 const ctx=budgetContext(),v=content();v.hero.note='界"\\\ud800';v.projects[0].isVisible=false;
 const expected=independentCandidates(v,ctx);assert.deepEqual(measureSiteBudget(v,ctx),measureExpected(expected));
 const actual=buildSiteBudgetCandidates(v,ctx);assert.deepEqual(Object.keys(actual).sort(),Object.keys(expected).sort());for(const key of Object.keys(expected))assert.equal(bytes(actual[key]),bytes(expected[key]),key);
 assert.equal(JSON.stringify('\ud800').length,8);assert.equal(bytes(expected.snapshotRead.review.note),12002);assertSiteBudget(v,ctx);
 const maximum=content();maximum.services=[service(),...Array.from({length:11},(_,i)=>service(`service-${i}`))];section(maximum,'services').serviceOrder=maximum.services.map(x=>x.id);maximum.projects=Array.from({length:24},(_,i)=>project(`case-${i}`));section(maximum,'work').featuredIds=[];maximum.settings.clientLogos=Array.from({length:12},(_,i)=>({...clone(maximum.settings.clientLogos[0]),id:`client-${i}`}));const reserve=independentCandidates(maximum,ctx);assert.equal(Object.keys(reserve.snapshotRead.reviewState.activeSourceCheckIds).length,58);assert.equal(reserve.snapshotRead.review.sourceCheckIds.length,58);assert.deepEqual(measureSiteBudget(maximum,ctx),measureExpected(reserve));assertSiteBudget(maximum,ctx);
});
test('budget requires trusted full metadata/source summaries/lineage and rejects unsafe summaries',()=>{
 const v=content(),ctx=budgetContext();for(const key of ['importLineage','sourceCatalog']){const absent=clone(ctx);delete absent[key];assert.throws(()=>assertSiteBudget(v,absent));}assert.throws(()=>assertSiteBudget(v,context));
 const defaults=clone(ctx);delete defaults.currentYear;delete defaults.allowedShowreelSourceUrl;assert.doesNotThrow(()=>assertSiteBudget(v,defaults));const sourced=clone(v);sourced.settings.showreel.originalSourceUrl=ctx.allowedShowreelSourceUrl;assert.throws(()=>assertSiteBudget(sourced,defaults));
 for(const mutate of [c=>c.catalog[0].sourceRefs=[],c=>c.catalog[0].rights=null,c=>c.sourceCatalog[0].supportedClaimPaths=['arbitrary/regex'],c=>c.sourceCatalog[0].excerpt='x'.repeat(1001),c=>c.sourceCatalog[1].publicCredentialUrl='https://example.test/private.pdf',c=>c.sourceCatalog[0].privatePath='/private/source',c=>c.importLineage.importedM1Revision=-1]){const bad=clone(ctx);mutate(bad);assert.throws(()=>assertSiteBudget(v,bad));}
 const schema=createSiteDraftSchemas(ctx).sourceCatalogSchema;assert.deepEqual(schema.parse(ctx.sourceCatalog),ctx.sourceCatalog);
 for(const change of [x=>delete x.pageCount,x=>delete x.publicCredentialUrl,x=>x.pageCount=47]){const credential=clone(ctx.sourceCatalog[1]);change(credential);assert.throws(()=>schema.parse([credential]));}
 for(const extra of [{pageCount:48},{publicCredentialUrl:ctx.sourceCatalog[1].publicCredentialUrl}])assert.throws(()=>schema.parse([{...ctx.sourceCatalog[0],...extra}]));
 for(const change of [c=>c.sourceIds=[],c=>delete c.sourceIds,c=>c.sourceIds=['baseline-source'],c=>c.sourceIds.push('unknown-source'),c=>c.sourceIds.push('baseline-source'),c=>c.sourceCatalog=[],c=>c.sourceCatalog.pop(),c=>c.sourceCatalog.push({...c.sourceCatalog[0],id:'extra-source'}),c=>c.sourceCatalog.push(clone(c.sourceCatalog[0]))]){const bad=clone(ctx);change(bad);assert.throws(()=>assertSiteBudget(v,bad));assert.throws(()=>encodeSiteStoredContent(v,bad),e=>e.status===422);}
});
test('Review outcome controls declaration and exact private-note bounds',()=>{
 const ctx=budgetContext(),schema=createSiteDraftSchemas(ctx).reviewSchema;const approved=independentCandidates(content(),ctx).snapshotRead.review;approved.sourceCheckIds=approved.sourceCheckIds.map((_,i)=>`synthetic-check-${i}`);assert.deepEqual(schema.parse(approved),approved);assert.throws(()=>schema.parse({...approved,sourceCheckIds:['duplicate','duplicate']}));
 const missing={...approved};delete missing.creativeCopyDeclaration;assert.throws(()=>schema.parse(missing));
 const changes={...missing,outcome:'CHANGES_REQUESTED',note:'Please verify this source.'};assert.deepEqual(schema.parse(changes),changes);
 for(const note of [undefined,'','  ','x'.repeat(2001)]){const bad={...changes,note};if(note===undefined)delete bad.note;assert.throws(()=>schema.parse(bad));}
 assert.equal(schema.parse({...changes,note:'x'.repeat(2000)}).note.length,2000);assert.equal(schema.parse({...changes,creativeCopyDeclaration:'NO_FACTUAL_CLAIMS'}).creativeCopyDeclaration,'NO_FACTUAL_CLAIMS');
 assert.equal(approved.reviewedAt.length,24);assert.throws(()=>schema.parse({...approved,reviewedAt:'2026-01-01T00:00:00.0000Z'}));
});
test('near-cap escaped content remains readable/submittable while one more byte fails closed',()=>{
 const ctx=budgetContext(),v=content();v.projects=Array.from({length:24},(_,i)=>({...project(`case-${i}`),summary:'界"\\'.repeat(333)}));section(v,'work').featuredIds=[];v.projects[0].isVisible=false;v.projects[0].summary='';
 // Bounded synthetic trusted metadata stresses actual selected/hidden manifest fields, not a fictional maximum catalog reserve.
 for(const asset of ctx.catalog.slice(0,6))asset.sourceRefs=Array.from({length:20},(_,i)=>`${asset.id}-${i}-`);
 for(const source of ctx.sourceCatalog)source.excerpt='\ud800'.repeat(1000);
 const largest=()=>Math.max(...Object.values(measureExpected(independentCandidates(v,ctx))));
 assert.ok(largest()<262144);
 const maximized=clone(ctx);for(const asset of maximized.catalog.slice(0,6))asset.sourceRefs=asset.sourceRefs.map(text=>text+'\ud800'.repeat(240-text.length));assert.ok(Math.max(...Object.values(measureExpected(independentCandidates(v,maximized))))>262144,'bounded fixture must cross future wrapper budget');
 for(const asset of ctx.catalog.slice(0,6)){for(let i=0;i<asset.sourceRefs.length;i++){const gap=262144-largest()-500;const count=Math.min(240-asset.sourceRefs[i].length,Math.max(0,Math.floor(gap/6)));asset.sourceRefs[i]+='\ud800'.repeat(count);}}
 const needed=262144-largest();assert.ok(needed>=0&&needed<=1000,`independent fixture gap ${needed}`);v.projects[0].summary='x'.repeat(needed);
 const expected=measureExpected(independentCandidates(v,ctx));assert.equal(Math.max(...Object.values(expected)),262144);assert.deepEqual(measureSiteBudget(v,ctx),expected);assertSiteBudget(v,ctx);const json=encodeSiteStoredContent(v,ctx);assert.deepEqual(decodeSiteStoredContent(json,ctx),v);
 v.projects[0].summary+='x';assert.equal(Math.max(...Object.values(measureExpected(independentCandidates(v,ctx)))),262145);assert.throws(()=>assertSiteBudget(v,ctx),e=>e.status===413);assert.throws(()=>encodeSiteStoredContent(v,ctx),e=>e.status===413);
});
