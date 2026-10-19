import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {BASELINE_INPUT_PINS,parseRuntimeContent,loadBaselineInputs,mapBaselineSite} from '../scripts/map-baseline-site.mjs';
import {validateSiteContent} from '../contracts/site.mjs';
const ROOT=path.resolve(import.meta.dirname,'..');
const REPO=path.resolve(ROOT,'..');
const rawRuntime=readFileSync(path.join(REPO,'dist/content.js'),'utf8');
assert.ok(rawRuntime.startsWith('window.PINKY_CONTENT = '));assert.ok(rawRuntime.endsWith(';\n'));
// Independent JSON-literal extraction; baseline script is never evaluated.
const golden=JSON.parse(rawRuntime.slice('window.PINKY_CONTENT = '.length,-2));
const source=JSON.parse(readFileSync(path.join(REPO,'source-content.json'),'utf8'));
const html=readFileSync(path.join(REPO,'dist/index.html'),'utf8');
const css=readFileSync(path.join(REPO,'dist/styles.css'),'utf8');
const script=readFileSync(path.join(REPO,'dist/app.js'),'utf8');
const catalog=JSON.parse(readFileSync(path.join(ROOT,'contracts/legacy-assets.json'),'utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const canonical=value=>Array.isArray(value)?`[${value.map(canonical).join(',')}]`:value!==null&&typeof value==='object'?`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`:JSON.stringify(value);
const mapped=()=>mapBaselineSite(loadBaselineInputs());
const section=(value,id)=>value.sections.find(item=>item.sectionId===id);
const links={wayfair:[],sony:['film-content'],diag:['brand-creative','film-content','integrated-communications'],vifa:['exhibition-activation'],petrosetco:[],varna:['brand-creative','integrated-communications'],samsung:['film-content'],psd:[]};

test('converter parses only the fixed pure JSON assignment without evaluating code',()=>{
 assert.deepEqual(parseRuntimeContent(rawRuntime),golden);
 for(const text of [rawRuntime+'globalThis.pwned=true;',rawRuntime.replace('window.PINKY_CONTENT','globalThis.PINKY_CONTENT'),'window.PINKY_CONTENT = (()=>({services:[],projects:[]}))();','window.PINKY_CONTENT = {"services":[],"projects":[],};','window.PINKY_CONTENT = {"__proto__":{"role":"OWNER"}};','window.PINKY_CONTENT = {"nested":{"constructor":{}}};','window.PINKY_CONTENT = {"nested":{"prototype":{}}};',rawRuntime.replace('= {','= /* comment */ {')])assert.throws(()=>parseRuntimeContent(text));
 assert.equal(globalThis.pwned,undefined);
});
test('all six services preserve literal baseline public copy and supplied source values',()=>{
 const {content}=mapped();assert.equal(content.services.length,6);assert.deepEqual(content.services.map(x=>x.id),['brand-creative','film-content','events-experiences','exhibition-activation','integrated-communications','original-ip']);
 const expected=golden.services.map(({id,title,titleVi,summary,scope})=>({id,title,titleVi,summary,scope,isVisible:true}));assert.deepEqual(content.services,expected);
 for(const service of content.services){const supplied=source.services.find(x=>x.id===service.id);for(const key of ['title','titleVi','summary','scope'])assert.deepEqual(service[key],supplied[key],`${service.id}.${key}`);assert.equal('sourcePages' in service,false);assert.equal('sourceNote' in service,false);}
});
test('eight cases retain exact copy/year/category/public page and stable id slug',()=>{
 const {content}=mapped();assert.equal(content.projects.length,8);assert.deepEqual(content.projects.map(x=>x.id),['wayfair','sony','diag','vifa','petrosetco','varna','samsung','psd']);
 for(const value of content.projects){const original=golden.projects.find(x=>x.id===value.id);for(const key of ['title','client','year','eyebrow','summary','scope'])assert.deepEqual(value[key],original[key],`${value.id}.${key}`);assert.equal(value.category,{events:'EVENTS',film:'FILM',communications:'COMMUNICATIONS'}[original.category]);assert.equal(value.slug,value.id);assert.equal(value.publicCredentialPage,original.sourcePage);assert.equal(value.isVisible,true);assert.equal('sourceNote' in value,false);assert.equal('sourcePages' in value,false);}
 assert.equal(content.projects.find(x=>x.id==='diag').publicCredentialPage,7);
});
test('gallery normalizes the cover once and keeps actual supplemental asset/alt order',()=>{
 assert.match(script,/filter\(\(name\) => name !== project\.image\)/);
 const {content}=mapped();for(const value of content.projects){const original=golden.projects.find(x=>x.id===value.id);assert.deepEqual(value.cover,{assetId:original.image,alt:`${original.title} — ${original.client}`,isDecorative:false});const supplemental=[...new Set(original.gallery)].filter(id=>id!==original.image);assert.deepEqual(value.gallery,supplemental.map((assetId,index)=>({assetId,alt:`${original.title} — hình ảnh ${index+2}`,isDecorative:false})));}
 for(const id of ['sony','diag','samsung'])assert.deepEqual(content.projects.find(x=>x.id===id).gallery,[]);
});
test('empty scopes remain empty and service membership uses explicit scope evidence, not category',()=>{
 const {content}=mapped();for(const value of content.projects)assert.deepEqual(value.serviceIds,links[value.id],value.id);
 for(const id of ['wayfair','petrosetco','psd']){const value=content.projects.find(x=>x.id===id);assert.equal(value.category,'EVENTS');assert.deepEqual(value.scope,[]);assert.deepEqual(value.serviceIds,[]);}
 assert.deepEqual(content.projects.find(x=>x.id==='vifa').serviceIds,['exhibition-activation']);
});
test('logo strip contains precisely the five displayed assets, not all catalog logos',()=>{
 const {content}=mapped();const expected=[['sony','Sony'],['wayfair','Wayfair'],['samsung','Samsung'],['aqua','AQUA'],['manulife','Manulife']];assert.equal(content.settings.clientLogos.length,5);
 for(const [index,[id,clientName]] of expected.entries()){assert.ok(html.includes(`src="assets/client-${id}.webp" alt="${clientName}"`));assert.deepEqual(content.settings.clientLogos[index],{id,clientName,image:{assetId:`client-${id}`,alt:clientName,isDecorative:false},isVisible:true});}
});
test('fixed variants/order/initial count preserve baseline section layout',()=>{
 const {content,context}=mapped();assert.deepEqual(content.sectionOrder,['work','services','about','ip-studio']);assert.deepEqual(content.sections.map(x=>x.sectionId),['clients','work','services','about','ip-studio','contact','footer']);
 assert.deepEqual(content.sections.filter(x=>x.variant).map(x=>[x.sectionId,x.variant]),[['work','work-grid'],['services','services-accordion'],['about','about-split'],['ip-studio','ip-split'],['contact','contact-form'],['footer','footer-wordmark']]);assert.equal(section(content,'work').initialVisibleCount,4);assert.deepEqual(section(content,'work').featuredIds,[]);assert.ok(script.includes('const pageSize = 4;'));
 assert.match(css,/background:url\('assets\/brand-diagonal\.webp'\)/);assert.deepEqual(context.fixedAssetIds,['brand-diagonal','favicon']);assert.equal('image' in section(content,'about'),false);assert.equal(section(content,'about').signature.image.assetId,'pinky-mascot');assert.deepEqual(validateSiteContent(content,context),content);
});
test('contact keeps Vietnamese HTML display but exact supplied email/E164/social identities',()=>{
 const {content}=mapped(),contact=content.settings.contact;assert.ok(html.includes('Ms. Bảo Ngọc (Christy)'));assert.equal(contact.personName,'Ms. Bảo Ngọc (Christy)');assert.notEqual(contact.personName,source.contact.person);assert.deepEqual(contact.addressLines,['981 Hồng Bàng, Phường Bình Tây,','TP. Hồ Chí Minh, Việt Nam']);
 assert.equal(contact.email,source.contact.email);assert.equal(contact.personPhoneE164,source.contact.phoneHref.slice(4));assert.equal(contact.officePhoneE164,source.contact.officeHref.slice(4));assert.equal(contact.personPhoneLabel,'+84 33 233 8667');assert.equal(contact.officePhoneLabel,'Văn phòng: (028) 22 101 441');assert.equal(contact.facebookUrl,source.contact.facebook);
 assert.notEqual(contact.addressLines.join(' '),source.contact.address);assert.equal(section(content,'contact').formMode,'MAILTO_COPY');assert.deepEqual(section(content,'contact').serviceOptionIds,golden.services.map(x=>x.id));
});
test('header/tagline/Footer/Reel slots use actual public HTML rather than unrelated company fields',()=>{
 const {content}=mapped();assert.equal(content.settings.header.descriptor,'CREATIVE AGENCY & IP STUDIO');assert.equal(content.settings.header.ctaLabel,'Kể ý tưởng của bạn');assert.equal(content.settings.brand.name,'Pinky Lamb');assert.deepEqual(content.settings.brand.logo,{assetId:'pinky-logo',alt:'',isDecorative:true});assert.equal(content.settings.brand.tagline,'A LITTLE CUTE. A LOT OF CREATIVE.');assert.notEqual(content.settings.brand.tagline,source.company.tagline);
 assert.equal(section(content,'about').reelCaption,'65 giây bước vào thế giới sáng tạo của Pinky.');assert.equal(content.settings.showreel.title,'Pinky Lamb / Showreel 2025');assert.equal(content.settings.showreel.durationSeconds,catalog.find(x=>x.id==='showreel-2025').durationSeconds);assert.equal(section(content,'footer').descriptor,'INDEPENDENT CREATIVE PRODUCTION AGENCY & IP STUDIO');assert.deepEqual(section(content,'footer').heading.lines.map(line=>line.map(run=>run.text).join('')),["LET'S CREATE",'SOMETHING MEMORABLE.']);
 assert.deepEqual(section(content,'clients').heading,[{text:'Những thương hiệu'},{text:'đã cùng tạo dấu ấn.',emphasis:'STRONG'}]);
});
test('missing/tampered fixed input fails closed before emitting a usable map',()=>{
 const input=loadBaselineInputs();assert.ok(BASELINE_INPUT_PINS.length>=4);for(const pin of BASELINE_INPUT_PINS){assert.match(pin.sha256,/^[a-f0-9]{64}$/);const missing={...input};delete missing[pin.path];assert.throws(()=>mapBaselineSite(missing));const tampered={...input,[pin.path]:input[pin.path]+'\n'};assert.throws(()=>mapBaselineSite(tampered));}
 assert.throws(()=>mapBaselineSite({...input,'outside-input':'arbitrary'}));
});
test('input, catalog and mapping-report digests match independently read fixed bytes',()=>{
 const paths=['dist/index.html','dist/content.js','dist/app.js','dist/styles.css','source-content.json','pinky-lamb-cms/contracts/legacy-assets.json','references/asset-manifest.json','references/credential-provenance/selected-object-provenance.json','references/credential-provenance/path-map.json','dist/assets/Pinky-Lamb-Credential-2026.pdf'];assert.deepEqual(BASELINE_INPUT_PINS.map(x=>x.path).sort(),paths.sort());
 for(const pin of BASELINE_INPUT_PINS)assert.equal(pin.sha256,sha(readFileSync(path.join(REPO,pin.path))),pin.path);
 const loaded=loadBaselineInputs();assert.deepEqual(Object.keys(loaded).sort(),paths);for(const file of paths){const original=readFileSync(path.join(REPO,file));if(file.endsWith('.pdf')){assert.ok(loaded[file] instanceof Uint8Array);assert.equal(loaded[file].byteLength,original.length);assert.equal(sha(loaded[file]),sha(original));}else assert.ok(loaded[file]===original.toString('utf8'),`${file} UTF8 input must match fixed bytes`);}
 const {content,context,provenance,report}=mapped();assert.equal(sha(canonical(context.catalog)),sha(canonical(catalog)),'full catalog metadata must match fixed input');assert.deepEqual(provenance.inputs,BASELINE_INPUT_PINS);assert.equal(provenance.baselineManifestHash,sha(canonical(BASELINE_INPUT_PINS)));assert.equal(provenance.baselineContentHash,sha(canonical(content)));assert.equal(provenance.reportHash,sha(canonical(report)));
 for(const asset of context.catalog){const original=readFileSync(path.join(REPO,'dist',asset.legacyPath));assert.equal(sha(original),asset.sha256,asset.id);assert.equal(original.length,asset.sizeBytes,asset.id);}
});
test('authorized evidence summaries contain only two bounded existing source identities',()=>{
 const {provenance,context}=mapped();assert.equal(provenance.mapVersion,1);assert.deepEqual(provenance.sourceCatalog.map(x=>x.id).sort(),['baseline-credential','baseline-source']);assert.equal(sha(canonical(context.sourceCatalog)),sha(canonical(provenance.sourceCatalog)),'authorized summaries must match');assert.deepEqual([...context.sourceIds].sort(),['baseline-credential','baseline-source']);
 const pdf=provenance.sourceCatalog.find(x=>x.kind==='CREDENTIAL'),json=provenance.sourceCatalog.find(x=>x.kind==='SUPPLIED_FILE');assert.equal(pdf.pageCount,48);assert.equal(pdf.publicCredentialUrl,'http://127.0.0.1:5010/assets/Pinky-Lamb-Credential-2026.pdf');assert.equal(pdf.sha256,sha(readFileSync(path.join(REPO,'dist/assets/Pinky-Lamb-Credential-2026.pdf'))));assert.equal(json.sha256,sha(readFileSync(path.join(REPO,'source-content.json'))));assert.equal('pageCount' in json,false);assert.equal('publicCredentialUrl' in json,false);
 for(const item of provenance.sourceCatalog){assert.ok(item.title.length<=120);assert.ok((item.excerpt?.length??0)<=1000);for(const key of Object.keys(item))assert.ok(['id','kind','title','sha256','pageCount','publicCredentialUrl','supportedClaimPaths','excerpt'].includes(key),key);assert.ok(item.supportedClaimPaths.length<=13);assert.equal(new Set(item.supportedClaimPaths).size,item.supportedClaimPaths.length);assert.doesNotMatch(JSON.stringify(item),/\/Users\/|drive\.google|driveFileId/);}
 assert.equal(JSON.stringify(provenance.sourceCatalog).includes(source.source.driveFileId),false);
});
test('private source notes and Diag two-page provenance stay separate from visitor content',()=>{
 const {content,provenance}=mapped();const text=JSON.stringify(content);const notes=[...source.source.notes,...source.company.sourceNotes,...source.services.flatMap(x=>x.sourceNote?[x.sourceNote]:[]),...source.projects.flatMap(x=>x.sourceNote?[x.sourceNote]:[])];
 for(const note of notes)assert.equal(text.includes(note),false);assert.ok(JSON.stringify(provenance.sources).includes(source.company.sourceNotes[0]));assert.ok(JSON.stringify(provenance.sources).includes(source.projects.find(x=>x.id==='wayfair').sourceNote));
 assert.equal(content.projects.find(x=>x.id==='diag').publicCredentialPage,7);const credential=provenance.sources.find(x=>x.id==='baseline-credential');assert.deepEqual(credential.projectPages.diag,[7,8]);assert.equal(credential.verification,'UNVERIFIED');assert.equal(credential.path,'dist/assets/Pinky-Lamb-Credential-2026.pdf');
 const json=provenance.sources.find(x=>x.id==='baseline-source');assert.equal(json.path,'source-content.json');assert.equal(json.verification,'UNVERIFIED');
});
test('mapping report documents source-backed service links and fixed/derived/unmapped slots',()=>{
 const {content,provenance,report}=mapped();assert.equal(report.mapVersion,1);for(const key of ['inputs','fieldMappings','serviceLinks','derivedFields','fixedStrings','unmapped'])assert.equal(sha(canonical(report[key])),sha(canonical(provenance[key])),key);
 for(const link of report.serviceLinks){assert.deepEqual(link.serviceIds,links[link.projectId]);assert.deepEqual(link.scopeBasis,golden.projects.find(x=>x.id===link.projectId).scope);assert.equal(link.rule,link.scopeBasis.length?'EXPLICIT_SCOPE_MAPPING':'NO_DOCUMENTED_SCOPE');}assert.equal(report.serviceLinks.length,8);
 const contractSelectors={schemaVersion:'SITE_SCHEMA_VERSION',locale:'siteContentSchema.locale'};
 for(const entry of report.fieldMappings){assert.ok(typeof entry.field==='string'&&entry.field.length>0);if(Object.hasOwn(contractSelectors,entry.field)){assert.equal(entry.source,'contracts/site.mjs');assert.equal(entry.selector,contractSelectors[entry.field]);assert.equal(entry.rule,'FIXED_CONTRACT');}else assert.ok(BASELINE_INPUT_PINS.some(x=>x.path===entry.source),`${entry.field} must use an actual pinned baseline source`);assert.ok(entry.selector.length>0);assert.ok(entry.rule.length>0);}
 assert.deepEqual(report.fieldMappings.filter(x=>x.source==='contracts/site.mjs').map(x=>x.field).sort(),['locale','schemaVersion']);
 for(const entry of report.fieldMappings.filter(x=>x.field.startsWith('sectionOrder.')))assert.equal(entry.source,'dist/index.html');
 assert.equal(report.fieldMappings.find(x=>x.field==='settings.showreel.durationSeconds').source,'pinky-lamb-cms/contracts/legacy-assets.json');
 const leaves=[];function walk(value,field=''){if(value!==null&&typeof value==='object')for(const [key,child] of Object.entries(value))walk(child,field?`${field}.${key}`:key);else leaves.push(field);}walk(content);assert.deepEqual(report.fieldMappings.map(x=>x.field).sort(),leaves.sort());
 const fixed=report.fixedStrings.flatMap(x=>x.values);for(const label of ['SELECTED WORK','WHAT WE DO','A LITTLE ABOUT US','ORIGINAL IP STUDIO',"LET'S TALK"]){assert.ok(html.includes(label));assert.ok(fixed.includes(label),label);}
 for(const label of ['Đến nội dung chính','Mở ứng dụng email với brief đã điền. Thông tin được gửi đến Pinky khi bạn bấm gửi trong email.','Mở video showreel','Xem video gốc ↗','Về đầu trang']){assert.ok(html.includes(label));assert.ok(fixed.includes(label),`fixed functional slot missing: ${label}`);}
 assert.equal(section(content,'footer').backToTopLabel,'BACK TO TOP');
 for(const field of ['services[*].isVisible','projects[*].isVisible','settings.clientLogos[*].isVisible','sections[*].isVisible','settings.clientLogos[*].id'])assert.ok(report.derivedFields.some(x=>x.field===field&&x.rule.length>0),`${field} must explicitly document synthesized presentation metadata`);
 assert.equal(report.derivedFields.find(x=>x.field==='settings.showreel.durationSeconds').source,'pinky-lamb-cms/contracts/legacy-assets.json');
 assert.ok(report.unmapped.length>0);assert.ok(report.derivedFields.length>0);assert.equal(content.settings.credential.label,'Xem credential 2026');assert.equal(content.settings.credential.edition,'2026');
});
test('emitted private JSON equals deterministic converter output and leaves frozen inputs unchanged',()=>{
 const before=BASELINE_INPUT_PINS.map(pin=>[pin.path,sha(readFileSync(path.join(REPO,pin.path)))]);const result=mapped();for(const [file,value] of [['baseline-site.json',result.content],['baseline-provenance.json',result.provenance]]){assert.ok(existsSync(path.join(ROOT,'contracts',file)),`${file} must be generated by source owner before final unit gate`);assert.equal(sha(canonical(JSON.parse(readFileSync(path.join(ROOT,'contracts',file),'utf8')))),sha(canonical(value)),`${file} output digest mismatch`);}
 assert.equal(sha(canonical(mapped())),sha(canonical(result)),'converter output must be deterministic');assert.deepEqual(BASELINE_INPUT_PINS.map(pin=>[pin.path,sha(readFileSync(path.join(REPO,pin.path)))]),before);
});
