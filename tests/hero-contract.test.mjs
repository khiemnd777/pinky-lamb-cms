import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateContent,validatePatch,validateRevision,parseJsonBody,assertEnvelopeSize} from '../contracts/hero.mjs';
import {ApiError,errorEnvelope,validationError} from '../contracts/errors.mjs';
const catalog=[{id:'pinky-hero',kind:'IMAGE',status:'LEGACY_READY'},{id:'credential',kind:'PDF',status:'LEGACY_READY'}];
const content=()=>({schemaVersion:1,locale:'vi-VN',hero:{kind:'HERO',variant:'hero-split',heading:{lines:[[{text:'Big ideas.'}],[{text:'Lovely impact.',emphasis:'ACCENT'}]]},eyebrow:'INDEPENDENT MINDS. MEMORABLE EXPERIENCES.',description:[{text:'Từ ý tưởng thương hiệu đến phim, truyền thông và sự kiện.'}],primaryAction:{kind:'SECTION',sectionId:'work',label:'Khám phá dự án'},secondaryAction:{kind:'SHOWREEL',label:'Xem showreel'},footnote:'BASED IN VIETNAM. CREATING FOR THE WORLD.',note:'The house of all cutest things.',image:{assetId:'pinky-hero',alt:'Mascot cừu hồng Pinky Lamb',isDecorative:false}},seo:{title:'Pinky Lamb — Creative, Media & Events',description:'Pinky Lamb — Independent Creative Production Agency & IP Studio.',ogTitle:'Pinky Lamb — Big ideas. Lovely impact.',ogDescription:'Creative production, media & events.',ogImage:{assetId:'pinky-hero',alt:'Pinky Lamb',isDecorative:false}}});
test('baseline-derived content and complete replacement patches preserve exact strings',()=>{
 const c=content();c.hero.eyebrow='  Pinky  ';assert.deepEqual(validateContent(c,catalog),c);
 assert.deepEqual(validatePatch({hero:c.hero},catalog),{hero:c.hero});
 assert.deepEqual(validatePatch({seo:c.seo},catalog),{seo:c.seo});
 c.hero.primaryAction={kind:'CREDENTIAL',assetId:'credential',label:'Credential'};validateContent(c,catalog);
});
test('unknown keys, partial objects, null and arbitrary CTA reject',()=>{
 for(const change of [c=>c.role='OWNER',c=>c.hero.uid='spoof',c=>c.hero.image.path='/private',c=>c.hero.heading.lines[0][0].html=true,c=>c.hero.primaryAction.href='javascript:alert(1)',c=>c.hero.secondaryAction=null,c=>c.hero.primaryAction.sectionId='clients',c=>c.hero.variant='arbitrary']){const c=content();change(c);assert.throws(()=>validateContent(c,catalog));}
 for(const p of [{},{hero:{note:'partial'}},{revision:1},{seo:null}])assert.throws(()=>validatePatch(p,catalog));
});
test('UTF16 exact caps, aggregate runs, visible text and controls',()=>{
 const c=content();c.hero.heading.lines=[[{text:'😀'.repeat(50)}]];c.hero.description=[{text:'x'.repeat(1000)}];c.hero.eyebrow='x'.repeat(120);c.hero.footnote='';c.hero.note='';validateContent(c,catalog);
 c.hero.heading.lines[0].push({text:'x'});assert.throws(()=>validateContent(c,catalog));
 for(const value of [' ','\0','a\u0001','a\n']){const d=content();d.seo.title=value;assert.throws(()=>validateContent(d,catalog));}
 const d=content();d.hero.description=[{text:'a\n\r\t'}, {text:' '}];validateContent(d,catalog);
 d.hero.heading.lines=[[{text:' '}]];assert.throws(()=>validateContent(d,catalog));
 d.hero.heading.lines=[[{text:'x'}]];d.hero.description=Array.from({length:13},()=>({text:'x'}));assert.throws(()=>validateContent(d,catalog));
});
test('asset existence, kind, status, alt and finite focal coordinates',()=>{
 for(const change of [c=>c.hero.image.assetId='missing',c=>c.hero.image.assetId='credential',c=>c.hero.image.alt=' ',c=>c.hero.image.focalPoint={x:Infinity,y:0},c=>c.hero.image.focalPoint={x:-0.1,y:0},c=>c.seo.ogImage.isDecorative=true]){const c=content();change(c);assert.throws(()=>validateContent(c,catalog));}
 assert.throws(()=>validateContent(content(),catalog.map(a=>({...a,status:'ARCHIVED'}))));
 const c=content();c.hero.image={assetId:'pinky-hero',alt:'',isDecorative:true,focalPoint:{x:0,y:1}};validateContent(c,catalog);
 c.hero.image.alt='x';assert.throws(()=>validateContent(c,catalog));
});
test('malicious copy remains plain exact text for later output encoding',()=>{
 const c=JSON.parse(readFileSync(new URL('./fixtures/malicious-hero.json',import.meta.url),'utf8'));
 assert.deepEqual(validateContent(c,catalog),c);assert.match(c.hero.heading.lines[0][0].text,/<script>/);
});
test('revision and UTF8 transport/envelope boundaries fail closed',()=>{
 for(const r of [0,Number.MAX_SAFE_INTEGER-1])assert.equal(validateRevision(r),r);
 for(const r of [-1,1.5,'1',Number.MAX_SAFE_INTEGER,Infinity])assert.throws(()=>validateRevision(r));
 assert.deepEqual(parseJsonBody('{"x":1}'),{x:1});
 assert.throws(()=>parseJsonBody('{'),e=>e.code==='BAD_REQUEST');
 assert.equal(parseJsonBody('"'+'x'.repeat(65534)+'"').length,65534);
 assert.throws(()=>parseJsonBody('"'+'é'.repeat(32768)+'"'),e=>e.code==='PAYLOAD_TOO_LARGE');
 assertEnvelopeSize('x'.repeat(262142));assert.throws(()=>assertEnvelopeSize('x'.repeat(262143)),e=>e.code==='PAYLOAD_TOO_LARGE');
});
test('safe error envelope excludes rejected values, unsafe paths and raw exceptions',()=>{
 const bad=content();bad.hero.heading.lines[0][0].text='';let z;
 try{validateContent(bad,catalog);}catch(e){z=validationError(e);}
 assert.equal(z.status,422);const envelope=errorEnvelope(z,'safe-correlation');
 assert.equal(envelope.error.code,'VALIDATION_ERROR');assert.ok(envelope.error.fieldErrors['hero.heading.lines.0.0.text']);
 const raw=errorEnvelope(new Error('TOKEN /private/path'),'safe-correlation');assert.equal(raw.error.code,'INTERNAL_ERROR');assert.doesNotMatch(JSON.stringify(raw),/TOKEN|private/);
 assert.equal(new ApiError('FORBIDDEN').status,403);
 assert.throws(()=>errorEnvelope(z,'../private'));
});
test('single-line and optional fields enforce inclusive lower and upper bounds',()=>{
 for(const [field,cap] of [['title',80],['ogTitle',80],['description',200],['ogDescription',200]]){const c=content();c.seo[field]='x'.repeat(cap);validateContent(c,catalog);c.seo[field]+='x';assert.throws(()=>validateContent(c,catalog));}
 for(const [field,cap] of [['footnote',240],['note',300],['eyebrow',120]]){const c=content();c.hero[field]='x'.repeat(cap);validateContent(c,catalog);c.hero[field]+='x';assert.throws(()=>validateContent(c,catalog));}
 const c=content();c.hero.primaryAction.label='😀'.repeat(40);c.hero.image.alt='x'.repeat(300);c.hero.heading.lines=Array.from({length:3},()=>Array.from({length:8},()=>({text:'x'})));validateContent(c,catalog);
 c.hero.primaryAction.label+='x';assert.throws(()=>validateContent(c,catalog));c.hero.primaryAction.label='x';c.hero.image.alt+='x';assert.throws(()=>validateContent(c,catalog));c.hero.image.alt='x';c.hero.heading.lines.push([{text:'x'}]);assert.throws(()=>validateContent(c,catalog));
 delete c.hero.secondaryAction;c.hero.heading.lines=[[{text:'x'}]];validateContent(c,catalog);
 assert.throws(()=>createInvalidCatalog());
 assert.throws(()=>parseJsonBody(new Uint8Array([0xff])),e=>e.code==='BAD_REQUEST');
 const err=errorEnvelope(new ApiError('VALIDATION_ERROR',{'../../private':['secret'],'hero.note':['TOKEN']}),'safe');assert.deepEqual(Object.keys(err.error.fieldErrors),['hero.note']);assert.doesNotMatch(JSON.stringify(err),/TOKEN|secret|private/);
});
function createInvalidCatalog(){validateContent(content(),[catalog[0],catalog[0]]);}
