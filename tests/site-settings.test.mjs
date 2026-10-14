import test from 'node:test';
import assert from 'node:assert/strict';
import {plainText,stableIdSchema,slugSchema,yearSchema,SECTION_IDS,BODY_SECTION_IDS,createSiteSettingsSchemas} from '../contracts/site-settings.mjs';
// Inline synthetic context uses known baseline identities; no private catalog import.
const catalog=[...['brand-diagonal','pinky-hero','pinky-mascot','showreel-poster','sony-ult-2025'].map(id=>({id,kind:'IMAGE',status:'LEGACY_READY'})),{id:'credential',kind:'PDF',status:'LEGACY_READY'},{id:'showreel-2025',kind:'VIDEO',status:'LEGACY_READY',durationSeconds:65.344},{id:'unready-image',kind:'IMAGE',status:'QUARANTINED'},{id:'future-image',kind:'IMAGE',status:'READY'}];
const context={catalog,sourceIds:['baseline-credential','baseline-source-content',...Array.from({length:6},(_,i)=>`source-${i}`)],currentYear:2026,allowedShowreelSourceUrl:'https://drive.google.com/file/d/synthetic-source/view'};
const schemas=createSiteSettingsSchemas(context);
const image=(assetId='pinky-hero')=>({assetId,alt:'Pinky Lamb',isDecorative:false});
const heading=()=>({lines:[[{text:'Big ideas.'}],[{text:'Lovely impact.',emphasis:'ACCENT'}]]});
const settings=()=>({header:{descriptor:'Independent Creative Production Agency & IP Studio',ctaLabel:'Gửi brief'},brand:{name:'Pinky Lamb',logo:image('brand-diagonal'),tagline:'Big ideas. Lovely impact.'},credential:{assetId:'credential',label:'Credential',edition:'2026'},showreel:{assetId:'showreel-2025',poster:image('showreel-poster'),title:'Pinky Lamb / Showreel 2025',durationSeconds:65.344},contact:{email:'pinkylamb.co@gmail.com',personName:'Ms. Bảo Ngọc (Christy)',personPhoneE164:'+84332338667',personPhoneLabel:'+84 33 233 8667',officePhoneE164:'+842822101441',officePhoneLabel:'(028) 22 101 441',addressLines:['981 Hồng Bàng, Phường Bình Tây','TP. Hồ Chí Minh, Việt Nam'],facebookUrl:'https://www.facebook.com/pinkylamb.media',illustration:image('pinky-mascot')},nav:[{sectionId:'work',label:'Dự án'},{sectionId:'services',label:'Dịch vụ'}],clientLogos:[{id:'sony',clientName:'Sony',image:image('sony-ult-2025'),isVisible:true}],copyright:{startYear:2026,label:'Pinky Lamb. All rights reserved.'}});
const sections=()=>[
 {kind:'CLIENTS',sectionId:'clients',isVisible:true,heading:[{text:'Selected clients'}]},
 {kind:'WORK',sectionId:'work',isVisible:true,variant:'work-grid',heading:heading(),intro:'Các dự án',featuredIds:['wayfair'],initialVisibleCount:4,filterLabels:{all:'Tất cả',EVENTS:'Events',FILM:'Film',COMMUNICATIONS:'Communications'}},
 {kind:'SERVICES',sectionId:'services',isVisible:true,variant:'services-accordion',heading:heading(),intro:'Dịch vụ',serviceOrder:['brand-creative'],action:{kind:'SECTION',sectionId:'contact',label:'Gửi brief'}},
 {kind:'ABOUT',sectionId:'about',isVisible:true,variant:'about-split',heading:heading(),lead:'Independent minds.',paragraphs:['Creative production in Vietnam.'],experienceFact:{value:'15+',label:'Năm kinh nghiệm',copy:'Kinh nghiệm tự giới thiệu',location:'Vietnam'},signature:{image:image('pinky-mascot'),copy:[{text:'From Pinky with love.'}]},reelHeading:heading(),reelCaption:'Pinky Lamb / Showreel 2025'},
 {kind:'IP',sectionId:'ip-studio',isVisible:true,variant:'ip-split',heading:heading(),description:'Ý tưởng sáng tạo nguyên bản',image:image('pinky-mascot'),disciplines:['Character','Format'],action:{kind:'SECTION',sectionId:'contact',label:'Kết nối'}},
 {kind:'CONTACT',sectionId:'contact',isVisible:true,variant:'contact-form',heading:heading(),intro:'Gửi brief',formMode:'MAILTO_COPY',serviceOptionIds:['brand-creative']},
 {kind:'FOOTER',sectionId:'footer',variant:'footer-wordmark',heading:heading(),descriptor:'Independent Creative Production Agency & IP Studio',backToTopLabel:'BACK TO TOP'}
];
const rejected=(schema,value)=>assert.throws(()=>schema.parse(value));

test('complete baseline-shaped settings and all seven sections preserve exact supplied text',()=>{
 const value=settings();value.header.descriptor='  Independent minds.  ';assert.deepEqual(schemas.settingsSchema.parse(value),value);
 assert.deepEqual(schemas.sectionsSchema.parse(sections()),sections());
 for(const invalid of [sections().slice(0,6),[...sections(),sections()[0]],[...sections().slice(0,6),sections()[0]]])rejected(schemas.sectionsSchema,invalid);
 assert.deepEqual(SECTION_IDS,['clients','work','services','about','ip-studio','contact','footer']);assert.deepEqual(BODY_SECTION_IDS,['work','services','about','ip-studio']);
});
test('plain text preserves hostile markup literally and enforces submitted UTF16 boundaries',()=>{
 const value='<script>alert("x")</script>&<img src=x onerror=x>';assert.equal(plainText(120).parse(value),value);
 assert.equal(plainText(100).parse('😀'.repeat(50)).length,100);rejected(plainText(100),'😀'.repeat(50)+'x');
 assert.equal(plainText(4,{empty:true}).parse(''),'');assert.equal(plainText(4,{multiline:true}).parse('a\nb'),'a\nb');
 for(const value of ['', '  ',null,1,'a\u0000b','a\u007fb','a\u009fb','a\nb'])rejected(plainText(4),value);
});
test('stable IDs, slugs and years reject unsafe or coerced values at exact boundaries',()=>{
 for(const schema of [stableIdSchema,slugSchema]){assert.equal(schema.parse('a'.repeat(100)),'a'.repeat(100));for(const value of ['a'.repeat(101),'../case','Case','a_b','a--b','-a','a-','a b','__proto__',null,42])rejected(schema,value);}
 assert.equal(yearSchema(2026).parse(1990),1990);assert.equal(yearSchema(2026).parse(2028),2028);for(const year of [1989,2029,2026.5,'2026',NaN,Infinity,null])rejected(yearSchema(2026),year);
});
test('image identity, status, alt and focal geometry are strict for visible and decorative images',()=>{
 for(const point of [{x:0,y:1},{x:1,y:0}])assert.deepEqual(schemas.assetUseSchema.parse({...image(),focalPoint:point}),{...image(),focalPoint:point});
 assert.deepEqual(schemas.assetUseSchema.parse({...image(),alt:'',isDecorative:true}),{...image(),alt:'',isDecorative:true});
 for(const value of [{...image(),alt:''},{...image(),alt:'nonempty',isDecorative:true},{...image(),assetId:'credential'},{...image(),assetId:'showreel-2025'},{...image(),assetId:'unknown'},{...image(),assetId:'unready-image'},{...image(),assetId:'future-image'},{...image(),alt:'x'.repeat(301)},{...image(),path:'/private'}])rejected(schemas.assetUseSchema,value);
 for(const point of [{x:-0.001,y:0},{x:1.001,y:0},{x:NaN,y:0},{x:0,y:Infinity},{x:'0',y:0},{x:0,y:0,z:0},null])rejected(schemas.assetUseSchema,{...image(),focalPoint:point});
});
test('credential and showreel kind/status/duration are catalog-derived; patch cannot supply duration',()=>{
 assert.deepEqual(schemas.credentialSchema.parse(settings().credential),settings().credential);assert.deepEqual(schemas.showreelSchema.parse(settings().showreel),settings().showreel);
 assert.equal(schemas.showreelSchema.parse({...settings().showreel,originalSourceUrl:context.allowedShowreelSourceUrl}).originalSourceUrl,context.allowedShowreelSourceUrl);
 for(const url of [context.allowedShowreelSourceUrl+'?extra=true',context.allowedShowreelSourceUrl+'#fragment','https://user:pass@drive.google.com/file/d/synthetic-source/view'])rejected(schemas.showreelSchema,{...settings().showreel,originalSourceUrl:url});
 const patch=settings().showreel;delete patch.durationSeconds;assert.deepEqual(schemas.showreelPatchSchema.parse(patch),patch);
 for(const duration of [65,0,-1,NaN,Infinity,'65.344'])rejected(schemas.showreelSchema,{...settings().showreel,durationSeconds:duration});rejected(schemas.showreelPatchSchema,settings().showreel);
 rejected(schemas.credentialSchema,{...settings().credential,assetId:'pinky-hero'});rejected(schemas.showreelSchema,{...settings().showreel,assetId:'credential'});rejected(schemas.showreelSchema,{...settings().showreel,poster:image('credential')});
 for(const url of ['https://example.test/video','javascript:alert(1)','data:video/mp4;base64,x','https://drive.google.com.evil.test/file/d/id','https://drive.google.com/file/d/unapproved/view'])rejected(schemas.showreelSchema,{...settings().showreel,originalSourceUrl:url});
});
test('contact email, phone, address and fixed Facebook host reject injection and coercion',()=>{
 const contact=settings().contact;assert.deepEqual(schemas.contactSchema.parse(contact),contact);
 const email='a'.repeat(64)+'@'+'b'.repeat(63)+'.'+'c'.repeat(63)+'.'+'d'.repeat(61);assert.equal(email.length,254);assert.equal(schemas.contactSchema.parse({...contact,email}).email,email);
 for(const badEmail of [email+'x','missing-at','a@b\r\nBcc:x@y.test','a@b.test\n',null])rejected(schemas.contactSchema,{...contact,email:badEmail});
 assert.equal(schemas.contactSchema.parse({...contact,personPhoneE164:'+123456789012345'}).personPhoneE164,'+123456789012345');
 for(const phone of ['+1234567890123456','+012345','84332338667','+84 33 233 8667','+84\n33',123,null])rejected(schemas.contactSchema,{...contact,personPhoneE164:phone});
 assert.equal(schemas.contactSchema.parse({...contact,addressLines:Array(4).fill('x'.repeat(160)),personPhoneLabel:'x'.repeat(80)}).addressLines.length,4);
 for(const patch of [{addressLines:Array(5).fill('address')},{addressLines:['x'.repeat(161)]},{personPhoneLabel:'x'.repeat(81)},{facebookUrl:'http://www.facebook.com/pinkylamb.media'},{facebookUrl:'https://www.facebook.com.evil.test/'},{facebookUrl:'https://user:pass@www.facebook.com/'},{facebookUrl:'javascript:alert(1)'},{facebookUrl:'https://facebook.com/pinkylamb.media'}])rejected(schemas.contactSchema,{...contact,...patch});
});
test('heading and copy run counts use aggregate UTF16 line limits and fixed emphasis',()=>{
 const line=Array.from({length:8},()=>({text:'x'.repeat(12)}));assert.equal(schemas.headingSchema.parse({lines:[line,line,line]}).lines.length,3);
 for(const value of [{lines:[]},{lines:Array(4).fill([{text:'x'}])},{lines:[Array(9).fill({text:'x'})]},{lines:[[{text:'x'.repeat(51)},{text:'x'.repeat(50)}]]},{lines:[[{text:'x',emphasis:'HTML'}]]},{lines:[[{text:'x',html:true}]]}])rejected(schemas.headingSchema,value);
 rejected(schemas.headingSchema,{lines:[[{text:'😀'.repeat(50)+'x'}]]});
 assert.deepEqual(schemas.textRunsSchema.parse([{text:'body\ncopy'}]),[{text:'body\ncopy'}]);
 for(const text of ['line\nbreak','line\rbreak','line\u2028break','line\u2029break'])rejected(schemas.headingSchema,{lines:[[{text}]]});
 // Clients keeps a flat heading shape, with the same single-line/100-unit cap.
 const clients=sections()[0];
 for(const heading of [[{text:'x'.repeat(100)}],[...Array.from({length:7},()=>({text:'x'.repeat(12)})),{text:'x'.repeat(16)}],[{text:'😀'.repeat(50)}]])assert.deepEqual(schemas.sectionSchema.parse({...clients,heading}).heading,heading);
 for(const heading of [[{text:'x'.repeat(101)}],[{text:'x'.repeat(50)},{text:'x'.repeat(51)}],Array(9).fill({text:'x'}),[{text:'😀'.repeat(50)+'x'}]])rejected(schemas.sectionSchema,{...clients,heading});
 for(const text of ['line\nbreak','line\rbreak','line\u2028break','line\u2029break'])rejected(schemas.sectionSchema,{...clients,heading:[{text}]});
});
test('nav anchors are finite, unique and capped; catalog logos remain explicit',()=>{
 const nav=['clients','work','services','about','ip-studio','contact'].map(sectionId=>({sectionId,label:sectionId}));assert.equal(schemas.navSchema.parse(nav).length,6);
 for(const value of [[...nav,{sectionId:'work',label:'duplicate'}],[nav[0],nav[0]],[{sectionId:'footer',label:'footer'}],[{sectionId:'javascript:alert(1)',label:'bad'}],[{sectionId:'work',label:'Work',href:'https://example.test'}],null])rejected(schemas.navSchema,value);
 const hidden={id:'sony',clientName:'Sony',image:image('sony-ult-2025'),isVisible:false};assert.deepEqual(schemas.clientLogoSchema.parse(hidden),hidden);rejected(schemas.clientLogoSchema,{...hidden,sourceRefs:['baseline-credential']});
});
test('hidden optional sections validate all copy/assets while Contact and Footer stay fixed',()=>{
 for(const original of sections().filter(value=>!['contact','footer'].includes(value.sectionId))){const hidden={...original,isVisible:false};assert.deepEqual(schemas.sectionSchema.parse(hidden),hidden);rejected(schemas.sectionSchema,{...hidden,variant:'new-layout'});}
 rejected(schemas.sectionSchema,{...sections()[5],isVisible:false});rejected(schemas.sectionSchema,{...sections()[6],isVisible:false});
 const about=sections()[3];rejected(schemas.sectionSchema,{...about,image:image('brand-diagonal')});rejected(schemas.sectionSchema,{...about,signature:{...about.signature,image:image('showreel-2025')}});const absent={...about,signature:{copy:about.signature.copy}};rejected(schemas.sectionSchema,absent);
});
test('section aggregate long-copy cap is independent from heading cap and includes signature/experience',()=>{
 // Exact cap accounting includes all section long-copy strings; this simple IP fixture gives an unambiguous boundary.
 const ip=sections()[4];ip.description='x'.repeat(4000);ip.disciplines=[];assert.equal(schemas.sectionSchema.parse(ip).description.length,4000);rejected(schemas.sectionSchema,{...ip,description:ip.description+'x'});
 const over=sections()[3];over.lead='x'.repeat(2000);over.paragraphs=['x'.repeat(2000)];over.signature.copy=[{text:'x'}];rejected(schemas.sectionSchema,over);
});
test('claim sources use one known finite taxonomy and source IDs; no verification can be supplied',()=>{
 const claims=[{claimPath:'projects/wayfair/facts',sourceIds:['baseline-credential']},{claimPath:'creative-copy',sourceIds:['baseline-source-content']}];assert.deepEqual(schemas.claimSourcesSchema.parse(claims),claims);assert.deepEqual(schemas.claimSourcesSchema.parse([]),[]);
 assert.equal(schemas.claimSourcesSchema.parse([{claimPath:'creative-copy',sourceIds:context.sourceIds}])[0].sourceIds.length,8);
 const oversizedSources=createSiteSettingsSchemas({...context,sourceIds:[...context.sourceIds,'source-9']});rejected(oversizedSources.claimSourcesSchema,[{claimPath:'creative-copy',sourceIds:[...context.sourceIds,'source-9']}]);
 rejected(schemas.claimSourcesSchema,Array.from({length:62},(_,i)=>({claimPath:`projects/case-${i}/facts`,sourceIds:['baseline-credential']})));
 rejected(schemas.claimSourcesSchema,[{claimPath:'creative-copy',sourceIds:['../source']}]);
 rejected(schemas.claimSourcesSchema,[{claimPath:`projects/${'x'.repeat(101)}/facts`,sourceIds:['baseline-credential']}]);
 for(const value of [[claims[0],claims[0]],[{claimPath:'projects.wayfair.summary',sourceIds:['baseline-credential']}],[{claimPath:'projects/../facts',sourceIds:['baseline-credential']}],[{claimPath:'creative-copy',sourceIds:['unknown']}],[{claimPath:'creative-copy',sourceIds:['baseline-credential','baseline-credential']}],[{claimPath:'creative-copy',sourceIds:[]}],[{...claims[0],verification:'SOURCE_CHECKED'}],[{...claims[0],checkedBy:'synthetic'}]])rejected(schemas.claimSourcesSchema,value);
});
test('strict objects reject null, server metadata and prototype-shaped payloads at every boundary',()=>{
 for(const key of ['localBaseUrl','revision','updatedBy','verification','schemaVersion','claimSources'])rejected(schemas.settingsSchema,{...settings(),[key]:'synthetic'});
 for(const field of ['header','brand','credential','showreel','contact','nav','clientLogos','copyright'])rejected(schemas.settingsSchema,{...settings(),[field]:null});
 for(const schema of [schemas.settingsSchema,schemas.contactSchema,schemas.sectionSchema])rejected(schema,JSON.parse('{"__proto__":{"verification":"SOURCE_CHECKED"}}'));
 rejected(schemas.settingsSchema,Object.create(settings()));const inherited=settings();Object.setPrototypeOf(inherited.contact,{verification:'SOURCE_CHECKED'});rejected(schemas.settingsSchema,inherited);
 let getterCalls=0;const accessor=settings();Object.defineProperty(accessor.contact,'email',{get(){getterCalls++;return 'synthetic@example.test';},enumerable:true});rejected(schemas.settingsSchema,accessor);assert.equal(getterCalls,0);
 const cyclic=settings();cyclic.contact.self=cyclic;rejected(schemas.settingsSchema,cyclic);
});
