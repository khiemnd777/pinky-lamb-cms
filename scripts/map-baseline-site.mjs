import {readFileSync,lstatSync,realpathSync,writeFileSync,renameSync,unlinkSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {canonicalJson} from '../contracts/draft.mjs';
import {MAX_REVISION} from '../contracts/hero.mjs';
import {validateSiteContent,projectClaimGroups,FIXED_SITE_ASSET_IDS} from '../contracts/site.mjs';
import {assertSiteBudget,siteSourceCatalogSchema} from '../contracts/site-draft.mjs';
import {installNetworkFence,validateRuntime} from './local-guard.mjs';

const CMS=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const HANDOFF=path.dirname(CMS);
const PDF='dist/assets/Pinky-Lamb-Credential-2026.pdf';
export const BASELINE_INPUT_PINS=Object.freeze([
 ['dist/index.html','4de13ed9a2b513458574b16fdaf9410422eb311ea23a0c4bce45b50a5d4630de'],
 ['dist/content.js','0140b31e91742d75387860a565c8082f3e34d5dc4b79c3b92b69cc0dd2484a63'],
 ['dist/app.js','3a0d2d5466f21f662c61870a851b10b7848c880ea90f75bcb3483d89d49fda32'],
 ['dist/styles.css','511db2c926152e819f267fe187b47a9fba32b8bdc39877969157504d04dfa65e'],
 ['source-content.json','ef34d3263d709dd18eb88ed19fbb65d49153a98f7797c2ed1ecdf5d16a46bbaa'],
 ['pinky-lamb-cms/contracts/legacy-assets.json','26ae46ffbd72bb6a4d3f001f9e7e5601f25eb29db93360a86ec91549f1016b5e'],
 ['references/asset-manifest.json','fd439907da1ea852be8ba578567f654a006d449d536f7ecbb90aa3114ff83c8e'],
 ['references/credential-provenance/selected-object-provenance.json','b5e1eb9690a7c91a8df1511d0bcfcc2c7be705d9d13c8a09511e4335469b5b3f'],
 ['references/credential-provenance/path-map.json','c2aac669b032894a4bbf39ccdd752c0886b2e6f0f1c317708c0a225f6f37efc6'],
 [PDF,'6087d6465ad55ae8451e2f7f3df1512e1427b987c220d9358f8fc899abe2dcce']
].map(([path,sha256])=>Object.freeze({path,sha256})));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const digest=value=>sha(canonicalJson(value));
const refuse=()=>{throw new Error('BASELINE_MAP: fixed input, mapping or output validation failed.');};
const inputPaths=BASELINE_INPUT_PINS.map(pin=>pin.path);

/** This handoff is JSON inside a reviewed assignment, never executable input. */
export function parseRuntimeContent(text){
 if(typeof text!=='string' || Buffer.byteLength(text)>1024*1024)refuse();
 const match=/^window\.PINKY_CONTENT = (\{[\s\S]*\});\s*$/.exec(text);
 if(!match)refuse();
 return JSON.parse(match[1],(key,value)=>{if(['__proto__','constructor','prototype'].includes(key))refuse();return value;});
}
function checkedFile(filename,{missing=false}={}){
 const root=filename.startsWith(`${CMS}${path.sep}`)?CMS:HANDOFF;
 if(!filename.startsWith(`${root}${path.sep}`))refuse();
 const components=path.relative(root,filename).split(path.sep);let current=root;
 if(realpathSync(root)!==root)refuse();
 for(const [index,name] of components.entries()){
  current=path.join(current,name);let stat;
  try{stat=lstatSync(current);}catch(error){if(missing && index===components.length-1 && error.code==='ENOENT')return;throw error;}
  if(stat.isSymbolicLink() || realpathSync(current)!==current || (index<components.length-1?!stat.isDirectory():!stat.isFile()))refuse();
 }
}
export function loadBaselineInputs(){
 const inputs={};for(const pin of BASELINE_INPUT_PINS){const filename=path.join(HANDOFF,pin.path);checkedFile(filename);const bytes=readFileSync(filename);if(sha(bytes)!==pin.sha256)refuse();inputs[pin.path]=pin.path===PDF?bytes:new TextDecoder('utf-8',{fatal:true}).decode(bytes);}return inputs;
}
function verifyInputs(inputs){
 if(!inputs || Object.getPrototypeOf(inputs)!==Object.prototype || Object.getOwnPropertySymbols(inputs).length || Object.keys(inputs).length!==inputPaths.length)refuse();
 for(const pin of BASELINE_INPUT_PINS){const descriptor=Object.getOwnPropertyDescriptor(inputs,pin.path);if(!descriptor || !Object.hasOwn(descriptor,'value'))refuse();const value=descriptor.value;if(pin.path===PDF?!(value instanceof Uint8Array):typeof value!=='string')refuse();if(sha(value)!==pin.sha256)refuse();}
}
function one(text,expression){const matches=[...text.matchAll(new RegExp(expression,'g'))];if(matches.length!==1)refuse();return matches[0][1];}
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const section=(html,id)=>one(html,`<section\\b[^>]*\\bid="${escape(id)}"[^>]*>([\\s\\S]*?)</section>`);
const byClass=(html,name,tag)=>one(html,`<${tag}\\b[^>]*\\bclass="[^"]*\\b${escape(name)}\\b[^"]*"[^>]*>([\\s\\S]*?)</${tag}>`);
const byId=(html,id,tag)=>one(html,`<${tag}\\b[^>]*\\bid="${escape(id)}"[^>]*>([\\s\\S]*?)</${tag}>`);
function decode(text){return text.replace(/&(amp|lt|gt|quot|apos|nbsp);/g,(_,name)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '})[name]).replace(/&#(\d+);/g,(_,value)=>String.fromCodePoint(Number(value)));}
function withoutDecorations(html){return html.replace(/<svg\b[\s\S]*?<\/svg>/g,'').replace(/<span class="(?:small-star|note-star|section-number)"[^>]*>[\s\S]*?<\/span>/g,'');}
function text(html,{lineBreak='\n'}={}){return decode(withoutDecorations(html).replace(/<br\s*\/?\s*>/g,lineBreak).replace(/<[^>]*>/g,'')).trim();}
function runs(html){
 const pieces=withoutDecorations(html).split(/(<[^>]+>)/g),result=[];let emphasis;
 for(const piece of pieces){if(!piece)continue;if(piece.startsWith('<')){if(/^<strong\b/.test(piece))emphasis='STRONG';else if(/^<span\b[^>]*class="(?:pink-text|hero-last)"/.test(piece))emphasis='ACCENT';else if(/^<\/(strong|span)>/.test(piece))emphasis=undefined;else if(/^<br\b/.test(piece))refuse();continue;}
  const value=decode(piece);if(value)result.push({text:value,...(emphasis?{emphasis}:{})});
 }return result;
}
const heading=html=>({lines:withoutDecorations(html).split(/<br\s*\/?\s*>/g).map(runs)});
const imageAttributes=html=>Object.fromEntries([...html.matchAll(/([A-Za-z-]+)="([^"]*)"/g)].map(match=>[match[1],decode(match[2])]));
const paragraphs=html=>[...html.matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/g)].map(match=>text(match[1]));
const explicitServices=Object.freeze({wayfair:[],sony:['film-content'],diag:['brand-creative','film-content','integrated-communications'],vifa:['exhibition-activation'],petrosetco:[],varna:['brand-creative','integrated-communications'],samsung:['film-content'],psd:[]});
const supportedClaimPaths=['hero/facts','seo/facts','settings/brand/facts','settings/contact/facts','settings/credential/facts','settings/showreel/facts','sections/about/facts','sections/ip-studio/facts','sections/footer/facts','creative-copy','projects/*/facts','services/*/facts','clientLogos/*/facts'];

export function mapBaselineSite(inputs){
 verifyInputs(inputs);
 const html=inputs['dist/index.html'],runtime=parseRuntimeContent(inputs['dist/content.js']),source=JSON.parse(inputs['source-content.json']),catalog=JSON.parse(inputs['pinky-lamb-cms/contracts/legacy-assets.json']);
 const mappingRules=[];
 function mapping(field,source,selector,rule='COPY_EXACT'){mappingRules.push({field,source,selector,rule});}
 function asset(filename,alt){const entry=catalog.find(value=>value.legacyPath===filename);if(!entry || entry.kind!=='IMAGE')refuse();return {assetId:entry.id,alt,isDecorative:alt===''};}
 function htmlImage(fragment){const attributes=imageAttributes(fragment);return asset(attributes.src,attributes.alt);}
 function meta(name,property=false){return decode(one(html,`<meta ${property?'property':'name'}="${escape(name)}" content="([^"]*)">`));}
 const work=section(html,'work'),servicesHtml=section(html,'services'),about=section(html,'about'),ip=section(html,'ip-studio'),contact=section(html,'contact'),clients=section(html,'clients'),footer=one(html,'<footer class="site-footer">([\\s\\S]*?)</footer>');
 const heroImage=htmlImage(one(html,'<div class="hero-art"><img ([^>]+)>'));
 const hero={kind:'HERO',variant:'hero-split',heading:heading(byId(html,'hero-title','h1'))};
 // There are several eyebrow paragraphs. Select Hero before the client strip.
 hero.eyebrow=text(byClass(html.slice(html.indexOf('<main id="main">'),html.indexOf('<section class="client-strip"')),'eyebrow','p'));
 Object.assign(hero,{description:runs(byClass(html,'hero-description','p')),primaryAction:{kind:'SECTION',sectionId:'work',label:text(one(html,'<a class="button button-dark" href="#work">([\\s\\S]*?)</a>'))},secondaryAction:{kind:'SHOWREEL',label:text(byClass(html,'text-button','button').replace(/<small>[\s\S]*?<\/small>/g,''))},footnote:text(byClass(html,'hero-footnote','div')),note:text(one(html,'<a class="pinky-note"[\\s\\S]*?<span>The house of([\\s\\S]*?)</span>'))});
 hero.note=`The house of${hero.note.startsWith('\n')?'':' '}${hero.note}`.replace(/\s+/g,' ').trim();hero.image=heroImage;
 const seo={title:text(one(html,'<title>([\\s\\S]*?)</title>')),description:meta('description'),ogTitle:meta('og:title',true),ogDescription:meta('og:description',true),ogImage:structuredClone(heroImage)};
 if(!meta('og:image',true).endsWith(`/${catalog.find(value=>value.id===heroImage.assetId).legacyPath}`))refuse();
 const showreelAsset=catalog.find(value=>value.id==='showreel-2025');
 const videoTitle=text(byId(html,'video-title','h2')),videoCaption=byClass(html,'video-caption','div');
 const showreel={assetId:showreelAsset.id,poster:htmlImage(one(about,'<button class="reel-banner"[\\s\\S]*?<img ([^>]+)>')),title:videoTitle,durationSeconds:showreelAsset.durationSeconds,originalSourceUrl:one(videoCaption,'<a href="([^"]+)"')};
 const logo=htmlImage(one(html,'<a class="brand"[\\s\\S]*?<img ([^>]+)>'));
 const clientLogos=[...byClass(clients,'client-logos','div').matchAll(/<img ([^>]+)>/g)].map(match=>{const image=htmlImage(match[1]);return {id:image.assetId.replace(/^client-/,''),clientName:image.alt,image,isVisible:true};});
 const contactPerson=byClass(contact,'contact-person','div'),contactAddress=byClass(contact,'contact-address','div');
 const contactSettings={email:source.contact.email,personName:text(one(contactPerson,'<strong>([\\s\\S]*?)</strong>')),personPhoneE164:source.contact.phoneHref.slice(4),personPhoneLabel:text(one(contactPerson,'<a href="tel:[^"]+">([\\s\\S]*?)</a>')),officePhoneE164:source.contact.officeHref.slice(4),officePhoneLabel:text(one(contactAddress,'<a href="tel:[^"]+">([\\s\\S]*?)</a>')),addressLines:text(one(contactAddress,'<p>([\\s\\S]*?)</p>')).split('\n'),facebookUrl:source.contact.facebook,illustration:htmlImage(one(contactPerson,'<img ([^>]+)>'))};
 const settings={header:{descriptor:text(one(byClass(html,'brand-name','span'),'<small>([\\s\\S]*?)</small>')),ctaLabel:text(byClass(html,'header-cta','a'))},brand:{name:source.company.name,logo,tagline:text(byClass(html,'hero-art-label','span'),{lineBreak:' '})},credential:{assetId:catalog.find(value=>value.kind==='PDF').id,label:text(one(work,'<a class="underlined-link"[\\s\\S]*?>([\\s\\S]*?)</a>')),edition:'2026'},showreel,contact:contactSettings,nav:[...byClass(html,'desktop-nav','nav').matchAll(/<a href="#([^"]+)">([^<]+)<\/a>/g)].map(match=>({sectionId:match[1],label:decode(match[2])})),clientLogos,copyright:{startYear:2026,label:text(one(footer,'<div class="footer-bottom"><span>© 2026 ([\\s\\S]*?)</span>'))}};
 const services=runtime.services.map(({id,title,titleVi,summary,scope})=>({id,title,titleVi,summary,scope,isVisible:true}));
 const projects=runtime.projects.map(project=>({id:project.id,slug:project.id,title:project.title,client:project.client,year:project.year,category:project.category.toUpperCase(),eyebrow:project.eyebrow,summary:project.summary,scope:project.scope,cover:asset(`assets/${project.image}.webp`,`${project.title} — ${project.client}`),gallery:[...new Set(project.gallery)].filter(id=>id!==project.image).map((id,index)=>asset(`assets/${id}.webp`,`${project.title} — hình ảnh ${index+2}`)),serviceIds:[...explicitServices[project.id]],publicCredentialPage:project.sourcePage,isVisible:true}));
 const aboutCopy=byClass(about,'about-copy','div'),aboutParagraphs=paragraphs(aboutCopy),experience=byClass(about,'experience-block','div'),signature=byClass(about,'about-signature','div'),ipCopy=byClass(ip,'ip-copy','div');
 const sections=[
  {kind:'CLIENTS',sectionId:'clients',isVisible:true,heading:one(clients,'<p>([\\s\\S]*?)</p>').split(/<br\s*\/?\s*>/g).flatMap(runs)},
  {kind:'WORK',sectionId:'work',isVisible:true,variant:'work-grid',heading:heading(byId(work,'work-title','h2')),intro:text(one(work,'<div class="intro-aside"><p>([\\s\\S]*?)</p>')),featuredIds:[],initialVisibleCount:4,filterLabels:{all:text(one(work,'data-filter="all"[^>]*>([\\s\\S]*?)<span>')),EVENTS:text(one(work,'data-filter="events"[^>]*>([\\s\\S]*?)</button>')),FILM:text(one(work,'data-filter="film"[^>]*>([\\s\\S]*?)</button>')),COMMUNICATIONS:text(one(work,'data-filter="communications"[^>]*>([\\s\\S]*?)</button>'))}},
  {kind:'SERVICES',sectionId:'services',isVisible:true,variant:'services-accordion',heading:heading(byId(servicesHtml,'services-title','h2')),intro:text(one(servicesHtml,'</h2><p>([\\s\\S]*?)</p>')),serviceOrder:services.map(value=>value.id),action:{kind:'SECTION',sectionId:'contact',label:text(byClass(servicesHtml,'underlined-link','a'))}},
  {kind:'ABOUT',sectionId:'about',isVisible:true,variant:'about-split',heading:heading(byId(about,'about-title','h2')),lead:aboutParagraphs[0],paragraphs:aboutParagraphs.slice(1),experienceFact:{value:text(one(experience,'<span class="experience-number">([\\s\\S]*?)</span><h3>')),label:text(one(experience,'<h3>([\\s\\S]*?)</h3>'),{lineBreak:' '}),copy:paragraphs(experience)[0],location:text(byClass(about,'location-label','span'))},signature:{image:htmlImage(one(signature,'<img ([^>]+)>')),copy:one(signature,'<span>([\\s\\S]*?)</span>').split(/<br\s*\/?\s*>/g).flatMap((value,index)=>runs(`${index?' ':''}${value}`))},reelHeading:heading(byClass(about,'reel-title','span')),reelCaption:text(one(videoCaption,'<span>([\\s\\S]*?)</span>'))},
  {kind:'IP',sectionId:'ip-studio',isVisible:true,variant:'ip-split',heading:heading(byId(ip,'ip-title','h2')),description:text(one(ipCopy,'</h2><p>([\\s\\S]*?)</p>')),image:htmlImage(one(ip,'<div class="ip-visual">[\\s\\S]*?<img ([^>]+)>')),disciplines:[...byClass(ip,'ip-disciplines','div').matchAll(/<span>([\s\S]*?)<\/span>/g)].map(match=>text(match[1])),action:{kind:'SECTION',sectionId:'contact',label:text(byClass(ip,'button-dark','a'))}},
  {kind:'CONTACT',sectionId:'contact',isVisible:true,variant:'contact-form',heading:heading(byId(contact,'contact-title','h2')),intro:paragraphs(byClass(contact,'contact-heading','div')).at(-1),formMode:'MAILTO_COPY',serviceOptionIds:services.map(value=>value.id)},
  {kind:'FOOTER',sectionId:'footer',variant:'footer-wordmark',heading:heading(one(footer,'<div class="footer-top"><p>([\\s\\S]*?)</p>')),descriptor:text(one(footer,'<div class="footer-bottom">[\\s\\S]*?</span><span>([\\s\\S]*?)</span>')),backToTopLabel:text(one(footer,'<a href="#top"[\\s\\S]*?>([\\s\\S]*?)<span>'))}
 ];
 const sourceCatalog=siteSourceCatalogSchema.parse([
  {id:'baseline-credential',kind:'CREDENTIAL',title:source.source.title,sha256:BASELINE_INPUT_PINS.find(value=>value.path===PDF).sha256,pageCount:48,publicCredentialUrl:'http://127.0.0.1:5010/assets/Pinky-Lamb-Credential-2026.pdf',supportedClaimPaths,excerpt:source.source.notes.join('\n')},
  {id:'baseline-source',kind:'SUPPLIED_FILE',title:'Pinky Lamb — supplied source content',sha256:BASELINE_INPUT_PINS.find(value=>value.path==='source-content.json').sha256,supportedClaimPaths,excerpt:[source.company.intro,source.company.experienceStatement].join('\n')}
 ]);
 const context={catalog,sourceIds:sourceCatalog.map(value=>value.id),sourceCatalog,fixedAssetIds:[...FIXED_SITE_ASSET_IDS],currentYear:2026,allowedShowreelSourceUrl:showreel.originalSourceUrl};
 let content=validateSiteContent({schemaVersion:2,locale:'vi-VN',hero,seo,settings,services,projects,sections,sectionOrder:['work','services','about','ip-studio'],claimSources:[]},context);
 content.claimSources=projectClaimGroups(content,context).map(({claimPath})=>({claimPath,sourceIds:claimPath==='creative-copy'?['baseline-source']:['baseline-credential','baseline-source']}));content=validateSiteContent(content,context);
 mapping('schemaVersion','contracts/site.mjs','SITE_SCHEMA_VERSION','FIXED_CONTRACT');
 mapping('locale','contracts/site.mjs','siteContentSchema.locale','FIXED_CONTRACT');
 mapping('sectionOrder','dist/index.html','main > section IDs: work, services, about, ip-studio','EXISTING_HTML_BODY_ORDER');
 mapping('hero','dist/index.html','.hero','HTML_COPY_WITH_TYPED_RUNS');mapping('seo','dist/index.html','head meta/title','META_COPY_AND_HERO_IMAGE_ALT');mapping('settings','dist/index.html','header / contact / footer / .hero-art-label','HTML_COPY');
 mapping('settings.brand.name','source-content.json','company.name');mapping('settings.showreel.durationSeconds','pinky-lamb-cms/contracts/legacy-assets.json','showreel-2025.durationSeconds','ACTUAL_CATALOG_DURATION');mapping('settings.showreel.originalSourceUrl','dist/index.html','.video-caption a[href]','PRIVATE_FIXED_URL_NO_FETCH');
 for(const field of ['email','personPhoneE164','officePhoneE164','facebookUrl'])mapping(`settings.contact.${field}`,'source-content.json',`contact.${({email:'email',personPhoneE164:'phoneHref',officePhoneE164:'officeHref',facebookUrl:'facebook'})[field]}`,'IDENTITY_COPY_REMOVE_TEL_SCHEME');
 mapping('settings.contact.personName','dist/index.html','.contact-person strong');mapping('settings.contact.addressLines','dist/index.html','.contact-address p','SPLIT_EXISTING_BR_RETAIN_PUNCTUATION');mapping('settings.header.descriptor','dist/index.html','.brand-name small');
 mapping('settings.clientLogos','dist/index.html','.client-logos img','FIVE_DISPLAYED_LOGOS_NOT_ENDORSEMENT');mapping('services','dist/content.js','services[]','COPY_ALL_SIX_RECORDS_ORDER');mapping('projects','dist/content.js','projects[]','COPY_ALL_EIGHT_RECORDS_ORDER');
 services.forEach((service,index)=>mapping(`services.${index}.isVisible`,'dist/content.js',`services[${index}]`,'DERIVED_TRUE_BASELINE_RECORD'));
 clientLogos.forEach((logo,index)=>{mapping(`settings.clientLogos.${index}.id`,'dist/index.html',`.client-logos img[${index}] asset ID without client- prefix`,'STABLE_ID_FROM_DISPLAYED_ASSET');mapping(`settings.clientLogos.${index}.isVisible`,'dist/index.html',`.client-logos img[${index}]`,'DERIVED_TRUE_DISPLAYED_LOGO');});
 projects.forEach((project,index)=>{mapping(`projects.${index}.isVisible`,'dist/content.js',`projects[${index}]`,'DERIVED_TRUE_BASELINE_RECORD');mapping(`projects.${index}.serviceIds`,'source-content.json',`projects[id=${project.id}].scope + explicit serviceLinks`,'EXPLICIT_SCOPE_MAPPING_NOT_CATEGORY');mapping(`projects.${index}.gallery`,'dist/app.js','case gallery normalization','EXCLUDE_COVER_DEDUP_PRESERVE_ORDER_AND_EXISTING_ALT_RULE');mapping(`projects.${index}.cover`,'dist/app.js','case-main-image','CATALOG_ID_AND_TITLE_CLIENT_ALT');mapping(`projects.${index}.slug`,'dist/content.js',`projects[${index}].id`,'SLUG_EQUALS_STABLE_ID');});
 sections.forEach((value,index)=>{mapping(`sections.${index}`,'dist/index.html',value.sectionId==='footer'?'.site-footer':`#${value.sectionId}`,'EXISTING_LAYOUT_TYPED_FIELDS');if(Object.hasOwn(value,'isVisible'))mapping(`sections.${index}.isVisible`,'dist/index.html',`#${value.sectionId}`,'DERIVED_TRUE_EXISTING_SECTION');});
 mapping('sections.0.heading','dist/index.html','#clients .clients-inner p','FLAT_TWO_RUNS_STRONG_FIXED_VISUAL_BREAK');mapping('sections.3.signature','dist/index.html','#about .about-signature','SIGNATURE_ONLY_ARTWORK_COPY');mapping('sections.3.reelCaption','dist/index.html','.video-caption > span');mapping('sections.6.descriptor','dist/index.html','.footer-bottom > span:nth-child(2)');mapping('claimSources','source-content.json','source identities / project facts','ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED');
 const fieldMappings=[];
 function leaves(value,field=''){if(value!==null && typeof value==='object'){for(const [key,child] of Object.entries(value))leaves(child,field?`${field}.${key}`:key);}else{const candidates=mappingRules.filter(rule=>field===rule.field || field.startsWith(`${rule.field}.`)).sort((a,b)=>b.field.length-a.field.length);if(!candidates.length)refuse();fieldMappings.push({...candidates[0],field});}}
 leaves(content);
 const serviceLinks=runtime.projects.map(project=>({projectId:project.id,serviceIds:[...explicitServices[project.id]],scopeBasis:project.scope,rule:project.scope.length?'EXPLICIT_SCOPE_MAPPING':'NO_DOCUMENTED_SCOPE'}));
 const derivedFields=[{field:'services[*].isVisible',source:'dist/content.js',rule:'Initial true for all six baseline services; runtime has no visibility property.'},{field:'projects[*].isVisible',source:'dist/content.js',rule:'Initial true for all eight baseline projects; runtime has no visibility property.'},{field:'settings.clientLogos[*].isVisible',source:'dist/index.html',rule:'Initial true for the five displayed logos.'},{field:'sections[*].isVisible',source:'dist/index.html',rule:'Initial true for all existing optional baseline sections; Footer remains required without visibility.'},{field:'settings.clientLogos[*].id',source:'dist/index.html',rule:'Displayed asset stable ID with client- prefix removed; image.assetId remains unchanged.'},{field:'projects[*].gallery',source:'dist/app.js',rule:'Remove cover once, unique supplementals in source order; existing dialog alt numbering.'},{field:'projects[*].slug',source:'dist/content.js',rule:'Equal stable project ID.'},{field:'settings.showreel.durationSeconds',source:'pinky-lamb-cms/contracts/legacy-assets.json',rule:'65.344 actual measured duration; baseline01:05/65giây are display rounding, not stored duration.'},{field:'sections.work.initialVisibleCount',source:'dist/app.js',rule:'4; featuredIds[] preserves baseline source order.'},{field:'settings.contact',source:'dist/index.html + source-content.json',rule:'Vietnamese name/address/display labels from HTML; email/E164/social identity from supplied JSON. Office label already includes Văn phòng prefix.'},{field:'settings.brand.tagline',source:'dist/index.html .hero-art-label',rule:'Existing two visual lines stored single-line; fixed wrap remains template presentation.'}];
 const fixedStrings=[
  {group:'section-overlines',source:'dist/index.html',values:['SELECTED WORK','WHAT WE DO','A LITTLE ABOUT US','ORIGINAL IP STUDIO',"LET'S TALK",'A GLIMPSE INTO OUR WORLD'],reason:'Existing fixed template overlines, not editable claim/layout records.'},
  {group:'hero-decoration',source:'dist/index.html',values:['MEET PINKY / OUR CREATIVE SPIRIT','SCROLL TO FEEL THE PINKY'],reason:'Fixed decorative captions/scroll label; SVG symbols and orbit remain template artwork.'},
  {group:'secondary-credential-actions',source:'dist/index.html',values:['Làm quen với Pinky','Credential 2026 · Trang'],reason:'Existing About and case action wording; page comes from validated publicCredentialPage.'},
  {group:'ip-decoration',source:'dist/index.html',values:['HELLO,','IMAGINATION!'],reason:'Existing sticker; brand-diagonal background and favicon are fixed catalog refs.'},
  {group:'work-controls',source:'dist/index.html + dist/app.js',values:['Xem thêm dự án','Những ý tưởng khác nhau. Cùng một tinh thần Pinky.','PINKY LAMB / SELECTED WORK','Cùng tạo dự án của bạn'],reason:'Functional labels remain fixed; counts/service badges derive current validated records.'},
  {group:'form-dialog-menu',source:'dist/index.html',values:['Tên của bạn','Email','Thương hiệu / Công ty','Bạn đang cần Pinky hỗ trợ điều gì?','Một chút về ý tưởng của bạn','Soạn email gửi Pinky','Sao chép brief','Nội dung brief','Mở menu','Đóng chi tiết dự án','Đóng video'],reason:'Existing mailto/copy/dialog/menu controls and accessibility strings stay fixed; no new lead backend.'},
  {group:'wordmark-social',source:'dist/index.html',values:['PINKY','LAMB','FACEBOOK ↗','HOTLINE','GHÉ NHÀ PINKY'],reason:'Fixed wordmark/UI labels; Footer heading instead maps footer-top slogan.'}
 ];
 fixedStrings.push({group:'manual-send-and-navigation',source:'dist/index.html',values:[text(byClass(html,'form-note','p')),text(one(byId(html,'brief-fallback','div'),'<p>([\\s\\S]*?)</p>')),text(byClass(html,'skip-link','a')),text(one(contact,'<a class="underlined-link" href="https://www.facebook.com/[^"]+"[^>]*>([\\s\\S]*?)</a>')),text(one(videoCaption,'<a [^>]+>([\\s\\S]*?)</a>')),'Trình duyệt của bạn chưa hỗ trợ video.','Mở video showreel'],reason:'Existing functional labels and manual-send promise remain fixed. The fallback recipient email derives settings.contact.email; original video URL is private validated context, never fetched.'});
 fixedStrings.push({group:'functional-attributes',source:'dist/index.html',values:[...new Set([...html.matchAll(/(?:aria-label|placeholder)="([^"]*)"/g)].map(match=>decode(match[1])))],reason:'Reviewed baseline functional/accessibility copy; dynamic record labels and showreel title/duration must derive validated content, not keep stale literal attributes.'});
 fixedStrings.push({group:'brief-feedback',source:'dist/app.js',values:[...inputs['dist/app.js'].matchAll(/showToast\('([^']*)'\)/g)].map(match=>match[1]),reason:'Existing local mailto/copy feedback. Recipient identity must derive validated contact email; no real lead storage.'});
 const unmapped=[{source:'source-content.json',fields:['company.tagline','company.contactHeading','company.internationalStatement','company.collaborationStatement','company.ipStatement','contact.person','contact.address','contact.website','source.driveFileId','assetFiles'],reason:'Source/provenance preserved privately; existing HTML public copy wins; no additional claims, links or displayed logos inferred.'},{source:'references/credential-provenance/selected-object-provenance.json',fields:['historical_raw_path','pdf_xref','pdf_bbox_points','image_index_on_page'],reason:'Pinned local evidence only; historic absolute paths not browser summaries or content.'},{source:'dist/index.html',fields:['og:url','canonical','theme-color','fonts','form validation attributes','noscript/video fallback/toast'],reason:'Functional/template constants or derived local URL; no new editable fields. Existing public production URL is not a local runtime endpoint.'}];
 const report={mapVersion:1,inputs:BASELINE_INPUT_PINS,fieldMappings,serviceLinks,derivedFields,fixedStrings,unmapped};
 const sources=[{id:'baseline-credential',kind:'CREDENTIAL',path:PDF,sha256:sourceCatalog[0].sha256,pageCount:48,verification:'UNVERIFIED',notes:[...source.company.sourceNotes,...source.source.notes],projectPages:Object.fromEntries(source.projects.map(project=>[project.id,project.sourcePages??[project.sourcePage]])),projectNotes:Object.fromEntries(source.projects.filter(project=>project.sourceNote).map(project=>[project.id,project.sourceNote]))},{id:'baseline-source',kind:'SUPPLIED_FILE',path:'source-content.json',sha256:sourceCatalog[1].sha256,verification:'UNVERIFIED',notes:source.source.notes}];
 const provenance={...report,baselineManifestHash:digest(BASELINE_INPUT_PINS),baselineContentHash:digest(content),reportHash:digest(report),sourceCatalog,sources};
 // This only bounds future metadata. It is never an import receipt or approval.
 context.importLineage={importId:'x'.repeat(128),importedM1Revision:MAX_REVISION,importedM1ContentHash:'0'.repeat(64),baselineManifestHash:provenance.baselineManifestHash,importReportHash:provenance.reportHash};
 assertSiteBudget(content,context);
 return {content,provenance,report,context};
}

function verifyCatalogBytes(catalog){for(const entry of catalog){if(!/^assets\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(entry.legacyPath))refuse();for(const root of [path.join(HANDOFF,'dist'),path.join(CMS,'public-baseline')]){const filename=path.join(root,entry.legacyPath);checkedFile(filename);const bytes=readFileSync(filename);if(bytes.length!==entry.sizeBytes || sha(bytes)!==entry.sha256)refuse();}}}
function documentMap(result){
 const {provenance,report}=result;
 return `# M2 — bản đồ import baseline\n\nĐược tạo offline từ10 input cố định, không thực thi content.js, không fetch nguồn ngoài. Bản đồ không phải editorial approval. M1 Hero/SEO current sẽ được OWNER import rõ ràng ở task03; factual baseline và non-Hero copy ở đây độc lập với Draft M1 mutable.\n\n- baselineManifestHash: \`${provenance.baselineManifestHash}\` = SHA256 canonical JSON của exact input pinset.\n- baselineContentHash: \`${provenance.baselineContentHash}\` = SHA256 canonical JSON của full mapped baseline content.\n- importReportHash/reportHash: \`${provenance.reportHash}\` = SHA256 canonical JSON structured report; không phải hash file Markdown này. Evidence pin Markdown bytes riêng.\n- SourceCatalog gồm2 identities UNVERIFIED; excerpts là selected existing text ≤1000, không cắt full evidence rồi coi là đã kiểm nguồn. Credential48pages; Diag private pages7–8, publiccasepage7.\n- Converter context.importLineage là conservative synthetic budget reservation only; task03 tạo immutable lineage thật từ transaction. Không lưu reservation vào content/provenance như một import receipt.\n- Asset bytes của30 catalog records được so với dist và public-baseline trước output. Văn phòng prefix đã nằm trong officePhoneLabel; renderer không thêm lần nữa.\n\n## Input pins\n\n${provenance.inputs.map(pin=>`- ${pin.path}: \`${pin.sha256}\``).join('\n')}\n\n## Explicit service links\n\n| Project | Service IDs | Scope basis |\n|---|---|---|\n${report.serviceLinks.map(link=>`| ${link.projectId} | ${link.serviceIds.join(', ')||'[]'} | ${link.scopeBasis.join('; ')||'[] — không tự suy diễn vai trò'} |`).join('\n')}\n\nVIFA chỉ exhibition-activation theo lễ khai mạc/dịch vụ đăng ký, không thêm events chỉ vì category. Ba scopes rỗng giữ [] và serviceIds[]. Galleries bỏ cover và giữ supplemental order; slug=id; initialVisibleCount4, featuredIds[]. Logo chỉ5ảnh đang hiển thị, không suy endorsement.\n\n## Derived fields\n\n${report.derivedFields.map(field=>`- ${field.field}: ${field.rule} (${field.source})`).join('\n')}\n\n## Fixed functional/template strings\n\n${report.fixedStrings.map(group=>`- ${group.group}: ${group.values.join(' / ')} — ${group.reason}`).join('\n')}\n\n## Preserved private/unmapped source metadata\n\n${report.unmapped.map(group=>`- ${group.source}: ${group.fields.join(', ')} — ${group.reason}`).join('\n')}\n\n## Field mapping\n\n| Field | Source | Selector | Rule |\n|---|---|---|---|\n${report.fieldMappings.map(field=>`| ${field.field} | ${field.source} | ${field.selector} | ${field.rule} |`).join('\n')}\n\nTask02 chỉ local converter/contract/privacy checks. Không tạo Draft, source registry, audit hoặc review; không có cloud/production traffic.\n`;
}
function removeTemporary(filename){try{unlinkSync(filename);}catch(error){if(error.code!=='ENOENT')throw error;}}
export function writeBaselineMap(){
 if(arguments.length || process.version!=='v22.23.3')refuse();validateRuntime();installNetworkFence();
 const result=mapBaselineSite(loadBaselineInputs());verifyCatalogBytes(result.context.catalog);
 const outputs=[['contracts/baseline-site.json',`${JSON.stringify(result.content,null,2)}\n`],['contracts/baseline-provenance.json',`${JSON.stringify(result.provenance,null,2)}\n`],['docs/M2-IMPORT-MAP.md',documentMap(result)]];
 // Validate all destinations before the first write. Atomic replacement avoids
 // truncating an existing hard-linked inode; unknown files are never deleted.
 for(const [relative] of outputs)checkedFile(path.join(CMS,relative),{missing:true});
 const temporaryRoot=path.join(CMS,'.local/cache/m2');
 // A checked sentinel path validates every existing private temporary ancestor.
 checkedFile(path.join(temporaryRoot,'.baseline-map-containment-check'),{missing:true});
 for(const [relative,bytes] of outputs){const filename=path.join(CMS,relative),temporary=path.join(temporaryRoot,`.baseline-map-${randomUUID()}.tmp`);try{checkedFile(temporary,{missing:true});writeFileSync(temporary,bytes,{flag:'wx',mode:0o600});checkedFile(filename,{missing:true});renameSync(temporary,filename);}finally{removeTemporary(temporary);}}
 return result;
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{if(process.argv.length!==2)refuse();const result=writeBaselineMap();console.log(JSON.stringify({mapVersion:1,services:result.content.services.length,projects:result.content.projects.length,clientLogos:result.content.settings.clientLogos.length,baselineManifestHash:result.provenance.baselineManifestHash,reportHash:result.provenance.reportHash}));}catch{console.error('BASELINE_MAP: validation or containment failed; no import occurred.');process.exitCode=1;}
}
