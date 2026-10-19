import test from 'node:test';
import assert from 'node:assert/strict';
import {CAPS,CATEGORY_IDS,createSiteRecordSchemas} from '../contracts/site-records.mjs';
const images=['pinky-hero','brand-diagonal','pinky-mascot','showreel-poster','sony-ult-2025','wayfair-summit-2026','wayfair-team-2026','wayfair-registration-2026','varna-elite-2023','varna-elite-collage-2023','varna-elite-lifestyle-2023','vifa-fair-2026','vifa-opening-2026','psd-dell-microsoft-2025','psd-dell-microsoft-stage-2025'];
const catalog=[...images.map(id=>({id,kind:'IMAGE',status:'LEGACY_READY'})),{id:'credential',kind:'PDF',status:'LEGACY_READY'},{id:'showreel-2025',kind:'VIDEO',status:'LEGACY_READY',durationSeconds:65.344},{id:'inactive-image',kind:'IMAGE',status:'ARCHIVED'}];
const schemas=createSiteRecordSchemas({catalog,sourceIds:['baseline-credential'],currentYear:2026});
const image=(assetId='wayfair-summit-2026')=>({assetId,alt:'Wayfair Global Selling Vietnam Summit',isDecorative:false});
const service=()=>({id:'brand-creative',title:'Brand & Creative',titleVi:'Thương hiệu & sáng tạo',summary:'Phát triển concept và ngôn ngữ sáng tạo cho thương hiệu.',scope:['Ý tưởng & concept','Key visual'],isVisible:true});
const project=()=>({id:'wayfair',slug:'wayfair-global-selling-vietnam-summit',title:'Wayfair Global Selling Vietnam Summit',client:'Wayfair',year:2026,category:'EVENTS',eyebrow:'Hội nghị · 2026',summary:'Hội nghị Wayfair Global Selling Vietnam Summit 2026.',scope:[],cover:image(),gallery:[image('wayfair-team-2026'),image('wayfair-registration-2026')],serviceIds:['events-experiences'],publicCredentialPage:21,isVisible:true});
const logo=()=>({id:'sony',clientName:'Sony',image:image('sony-ult-2025'),isVisible:true});
const rejected=(schema,value)=>assert.throws(()=>schema.parse(value));

test('known baseline-shaped service, case and logo values preserve exact copy and empty scopes',()=>{
 for(const [schema,value] of [[schemas.serviceSchema,service()],[schemas.projectSchema,project()],[schemas.clientLogoSchema,logo()]])assert.deepEqual(schema.parse(value),value);
 const empty=service();empty.scope=[];assert.deepEqual(schemas.serviceSchema.parse(empty),empty);
 assert.deepEqual(CAPS,{services:12,projects:24,clientLogos:12,gallery:12,scope:12});assert.deepEqual(CATEGORY_IDS,['EVENTS','FILM','COMMUNICATIONS']);
});
test('record array limits allow exact maxima and reject additional records without silently truncating',()=>{
 const services=Array.from({length:12},(_,i)=>({...service(),id:`service-${i}`}));const projects=Array.from({length:24},(_,i)=>({...project(),id:`case-${i}`,slug:`case-${i}`}));const logos=Array.from({length:12},(_,i)=>({...logo(),id:`client-${i}`}));
 for(const [schema,values,extra] of [[schemas.servicesSchema,services,{...service(),id:'extra'}],[schemas.projectsSchema,projects,{...project(),id:'extra',slug:'extra'}],[schemas.clientLogosSchema,logos,{...logo(),id:'extra'}]]){
  assert.deepEqual(schema.parse(values),values);rejected(schema,[...values,extra]);assert.deepEqual(schema.parse([]),[]);
 }
});
test('stable record IDs and case slugs remain separate and unique; titles do not derive IDs',()=>{
 const value=project();value.title='A changed title';assert.equal(schemas.projectSchema.parse(value).id,'wayfair');assert.equal(schemas.projectSchema.parse(value).slug,'wayfair-global-selling-vietnam-summit');
 rejected(schemas.projectsSchema,[project(),{...project(),id:'other'}]);rejected(schemas.projectsSchema,[project(),{...project(),slug:'different'}]);
 rejected(schemas.servicesSchema,[service(),service()]);rejected(schemas.clientLogosSchema,[logo(),logo()]);
 for(const id of ['../secret','__proto__','constructor.prototype','Case','case_id','x--y','x'.repeat(101),null])for(const [schema,record] of [[schemas.serviceSchema,service()],[schemas.projectSchema,project()],[schemas.clientLogoSchema,logo()]])rejected(schema,{...record,id});
 for(const slug of ['../case','Case','x y','x--y','x'.repeat(101)])rejected(schemas.projectSchema,{...project(),slug});
});
test('all categories, canonical integer years and credential-page edges are finite and strict',()=>{
 for(const category of ['EVENTS','FILM','COMMUNICATIONS'])assert.equal(schemas.projectSchema.parse({...project(),category}).category,category);
 for(const year of [1990,2028])assert.equal(schemas.projectSchema.parse({...project(),year}).year,year);
 for(const year of [1989,2029,2026.25,'2026',NaN,Infinity,null])rejected(schemas.projectSchema,{...project(),year});
 for(const category of ['events','IP','OTHER',null])rejected(schemas.projectSchema,{...project(),category});
 for(const page of [1,48])assert.equal(schemas.projectSchema.parse({...project(),publicCredentialPage:page}).publicCredentialPage,page);
 const omitted=project();delete omitted.publicCredentialPage;assert.deepEqual(schemas.projectSchema.parse(omitted),omitted);
 for(const page of [0,49,1.5,'21',NaN,null])rejected(schemas.projectSchema,{...project(),publicCredentialPage:page});
});
test('title, summary and scope exact UTF16 caps reject oversized aggregates and controls',()=>{
 const maximum={...service(),title:'x'.repeat(120),titleVi:'😀'.repeat(60),summary:'x'.repeat(1000),scope:Array(12).fill('x'.repeat(160))};assert.deepEqual(schemas.serviceSchema.parse(maximum),maximum);
 for(const patch of [{title:maximum.title+'x'},{titleVi:maximum.titleVi+'x'},{summary:maximum.summary+'x'},{scope:Array(13).fill('x')},{scope:['x'.repeat(161)]},{title:'\u0000'},{summary:'\u007f'},{scope:[null]}])rejected(schemas.serviceSchema,{...service(),...patch});
 const p={...project(),title:'x'.repeat(120),client:'x'.repeat(120),summary:'😀'.repeat(500),scope:Array(12).fill('x'.repeat(160))};assert.deepEqual(schemas.projectSchema.parse(p),p);rejected(schemas.projectSchema,{...p,summary:p.summary+'x'});
});
test('gallery has at most twelve supplementary distinct images, never duplicated cover',()=>{
 const gallery=images.filter(id=>id!=='wayfair-summit-2026').slice(0,12).map(image);const value={...project(),gallery};assert.deepEqual(schemas.projectSchema.parse(value),value);
 rejected(schemas.projectSchema,{...value,gallery:[...gallery,image(images.at(-1))]});rejected(schemas.projectSchema,{...project(),gallery:[image('wayfair-team-2026'),image('wayfair-team-2026')]});rejected(schemas.projectSchema,{...project(),gallery:[image()]});
 for(const bad of ['credential','showreel-2025','unknown','inactive-image']){rejected(schemas.projectSchema,{...project(),cover:image(bad)});rejected(schemas.projectSchema,{...project(),gallery:[image(bad)]});rejected(schemas.clientLogoSchema,{...logo(),image:image(bad)});}
});
test('service links are explicit unique stable IDs, with no category-based auto expansion',()=>{
 const value={...project(),serviceIds:['brand-creative','film-content']};assert.deepEqual(schemas.projectSchema.parse(value),value);assert.deepEqual(schemas.projectSchema.parse({...project(),serviceIds:[]}).serviceIds,[]);
 for(const ids of [['brand-creative','brand-creative'],['../service'],['javascript:alert(1)'],Array.from({length:13},(_,i)=>`service-${i}`),null])rejected(schemas.projectSchema,{...project(),serviceIds:ids});
});
test('hidden records remain fully typed and retain validation of factual copy and assets',()=>{
 for(const [schema,value] of [[schemas.serviceSchema,service()],[schemas.projectSchema,project()],[schemas.clientLogoSchema,logo()]]){const hidden={...value,isVisible:false};assert.deepEqual(schema.parse(hidden),hidden);rejected(schema,{...hidden,isVisible:'false'});}
 rejected(schemas.serviceSchema,{...service(),isVisible:false,title:'x'.repeat(121)});rejected(schemas.clientLogoSchema,{...logo(),isVisible:false,image:image('credential')});
 const hidden={...project(),isVisible:false};rejected(schemas.projectSchema,{...hidden,year:2029});rejected(schemas.projectSchema,{...hidden,cover:image('credential')});rejected(schemas.projectSchema,{...hidden,summary:'x'.repeat(1001)});
});
test('untrusted markup remains literal plain text rather than being deleted or treated as HTML',()=>{
 const copy='<script>alert("x")</script></title><img src=x onerror=x>&';const value={...project(),title:copy,summary:copy};assert.deepEqual(schemas.projectSchema.parse(value),value);
 const supplied={...service(),summary:'  Keep exact spacing.  '};assert.equal(schemas.serviceSchema.parse(supplied).summary,supplied.summary);
});
test('record and nested unknown keys, per-record sources and server verification are denied',()=>{
 for(const [schema,value] of [[schemas.serviceSchema,service()],[schemas.projectSchema,project()],[schemas.clientLogoSchema,logo()]])for(const key of ['sourceRefs','claimSources','verification','checkedBy','createdBy','revision','number','html'])rejected(schema,{...value,[key]:key==='sourceRefs'?['baseline-credential']:'synthetic'});
 rejected(schemas.projectSchema,{...project(),cover:{...image(),privatePath:'/private'}});rejected(schemas.projectSchema,{...project(),gallery:[{...image('wayfair-team-2026'),rights:{basis:'LICENSED'}}]});
});
test('nulls and prototype payloads cannot bypass strict record validation',()=>{
 for(const [schema,value] of [[schemas.serviceSchema,service()],[schemas.projectSchema,project()],[schemas.clientLogoSchema,logo()]]){
  rejected(schema,null);for(const key of Object.keys(value))rejected(schema,{...value,[key]:null});rejected(schema,{...value,...JSON.parse('{"__proto__":{"verification":"SOURCE_CHECKED"}}')});rejected(schema,Object.create(value));
 }
 const value=project();Object.setPrototypeOf(value.cover,{privatePath:'/private'});rejected(schemas.projectSchema,value);
});
