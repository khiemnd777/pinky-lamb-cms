import {z} from 'zod';
import {ApiError} from './errors.mjs';
import {createHeroSchemas,revisionSchema,assertEnvelopeSize} from './hero.mjs';
import {createSiteSettingsSchemas,strictSiteObject,stableIdSchema,plainText,BODY_SECTION_IDS} from './site-settings.mjs';
import {createSiteRecordSchemas} from './site-records.mjs';

export const SITE_SCHEMA_VERSION=2;
export const SITE_TEMPLATE_VERSION='m2-site-baseline-v1';
export const SITE_DRAFT_ID='home-v2';
export const FIXED_SITE_ASSET_IDS=Object.freeze(['brand-diagonal','favicon']);
const unique=values=>new Set(values).size===values.length;
const hasChange=value=>Object.values(value).some(field=>field!==undefined);
const permutation=(order,ids)=>order.length===ids.length && unique(order) && order.every(id=>ids.includes(id));
const fixedClaimPaths=['hero/facts','seo/facts','settings/brand/facts','settings/contact/facts','settings/credential/facts','settings/showreel/facts','sections/about/facts','sections/ip-studio/facts','sections/footer/facts','creative-copy'];
const claimPaths=content=>[...fixedClaimPaths,...content.projects.map(value=>`projects/${value.id}/facts`),...content.services.map(value=>`services/${value.id}/facts`),...content.settings.clientLogos.map(value=>`clientLogos/${value.id}/facts`)].sort();
const actions=content=>[content.hero.primaryAction,content.hero.secondaryAction,...content.sections.filter(value=>value.action).map(value=>value.action)].filter(Boolean);

export function createSiteSchemas(context){
  const settings=createSiteSettingsSchemas(context),records=createSiteRecordSchemas(context),hero=createHeroSchemas(context.catalog);
  const sectionOrder=z.array(z.enum(BODY_SECTION_IDS)).length(4).refine(value=>permutation(value,BODY_SECTION_IDS));
  const contentSchema=strictSiteObject({schemaVersion:z.literal(SITE_SCHEMA_VERSION),locale:z.literal('vi-VN'),hero:hero.heroSchema,seo:hero.seoSchema,
    settings:settings.settingsSchema,services:records.servicesSchema,projects:records.projectsSchema,sections:settings.sectionsSchema,sectionOrder,claimSources:settings.claimSourcesSchema
  }).superRefine((content,ctx)=>{
    const sections=new Map(content.sections.map(section=>[section.sectionId,section]));
    const services=content.services.map(value=>value.id),projects=content.projects.map(value=>value.id);
    const issue=(path)=>ctx.addIssue({code:'custom',path,message:'Giá trị không hợp lệ.'});
    if(!permutation(sections.get('services').serviceOrder,services))issue(['sections']);
    if(!sections.get('work').featuredIds.every(id=>projects.includes(id)))issue(['sections']);
    if(!sections.get('contact').serviceOptionIds.every(id=>services.includes(id)))issue(['sections']);
    content.projects.forEach((value,index)=>{if(!value.serviceIds.every(id=>services.includes(id)))issue(['projects',index,'serviceIds']);});
    content.settings.nav.forEach((value,index)=>{if(sections.get(value.sectionId)?.isVisible!==true)issue(['settings','nav',index]);});
    for(const action of actions(content)){
      if(action.kind==='SECTION' && sections.get(action.sectionId)?.isVisible!==true)issue(['hero']);
      if(action.kind==='SHOWREEL' && sections.get('about').isVisible!==true)issue(['hero']);
      if(action.kind==='CREDENTIAL' && action.assetId!==content.settings.credential.assetId)issue(['hero']);
    }
    const knownClaims=claimPaths(content);
    content.claimSources.forEach((value,index)=>{if(!knownClaims.includes(value.claimPath))issue(['claimSources',index,'claimPath']);});
  });
  const change=schema=>z.union([
    strictSiteObject({op:z.literal('ADD'),value:schema}),
    strictSiteObject({op:z.literal('REPLACE'),id:stableIdSchema,value:schema}).refine(value=>value.id===value.value.id),
    strictSiteObject({op:z.literal('SET_VISIBILITY'),id:stableIdSchema,isVisible:z.boolean()})
  ]);
  const brandPatch=strictSiteObject({logo:settings.assetUseSchema.optional(),tagline:plainText(300).optional()}).refine(hasChange);
  const settingsPatch=strictSiteObject({header:settings.headerSchema.optional(),brand:brandPatch.optional(),credential:settings.credentialSchema.optional(),showreel:settings.showreelPatchSchema.optional(),contact:settings.contactSchema.optional(),nav:settings.navSchema.optional(),copyright:settings.copyrightSchema.optional()}).refine(hasChange);
  const order=max=>z.array(stableIdSchema).max(max).refine(unique);
  const patchSchema=strictSiteObject({hero:hero.heroSchema.optional(),seo:hero.seoSchema.optional(),settings:settingsPatch.optional(),sections:z.array(strictSiteObject({sectionId:z.enum(['clients',...BODY_SECTION_IDS,'contact','footer']),value:settings.sectionSchema}).refine(value=>value.sectionId===value.value.sectionId)).min(1).max(1).optional(),sectionOrder:sectionOrder.optional(),projectChanges:z.array(change(records.projectSchema)).min(1).max(1).optional(),projectsOrder:order(24).optional(),serviceChanges:z.array(change(records.serviceSchema)).min(1).max(1).optional(),clientLogoChanges:z.array(change(records.clientLogoSchema)).min(1).max(1).optional(),clientLogoOrder:order(12).optional(),claimSources:settings.claimSourcesSchema.optional()})
    .refine(value=>hasChange(value) && ['projectChanges','serviceChanges','clientLogoChanges'].filter(key=>value[key]!==undefined).length<=1);
  const saveRequestSchema=strictSiteObject({expectedRevision:revisionSchema,patch:patchSchema});
  return {contentSchema,patchSchema,saveRequestSchema};
}
export function validateSiteContent(value,context){const result=createSiteSchemas(context).contentSchema.parse(value);assertEnvelopeSize(result);return result;}
export function validateSitePatch(value,context){return createSiteSchemas(context).patchSchema.parse(value);}

/** Apply only explicit typed operations; validate resulting references once. */
export function applySitePatch(content,patch,context){
  const current=validateSiteContent(content,context),parsed=validateSitePatch(patch,context),next=structuredClone(current);
  function changeRecord(list,change){
    const id=change.op==='ADD'?change.value.id:change.id,index=list.findIndex(value=>value.id===id);
    if(change.op==='ADD'){if(index!==-1)throw new ApiError('VALIDATION_ERROR');list.push(change.value);}
    else {if(index===-1)throw new ApiError('VALIDATION_ERROR');list[index]=change.op==='REPLACE'?change.value:{...list[index],isVisible:change.isVisible};}
  }
  if(parsed.projectChanges)changeRecord(next.projects,parsed.projectChanges[0]);
  if(parsed.serviceChanges)changeRecord(next.services,parsed.serviceChanges[0]);
  if(parsed.clientLogoChanges)changeRecord(next.settings.clientLogos,parsed.clientLogoChanges[0]);
  for(const key of ['hero','seo','sectionOrder','claimSources'])if(parsed[key]!==undefined)next[key]=parsed[key];
  if(parsed.settings)for(const [key,value] of Object.entries(parsed.settings)){
    if(value===undefined)continue;
    if(key==='brand')next.settings.brand={...next.settings.brand,...Object.fromEntries(Object.entries(value).filter(([,field])=>field!==undefined))};
    else if(key==='showreel')next.settings.showreel={...value,durationSeconds:context.catalog.find(asset=>asset.id===value.assetId).durationSeconds};
    else next.settings[key]=value;
  }
  if(parsed.sections){const change=parsed.sections[0],index=next.sections.findIndex(value=>value.sectionId===change.sectionId);next.sections[index]=change.value;}
  function reorder(list,order){if(!permutation(order,list.map(value=>value.id)))throw new ApiError('VALIDATION_ERROR');return order.map(id=>list.find(value=>value.id===id));}
  if(parsed.projectsOrder)next.projects=reorder(next.projects,parsed.projectsOrder);
  if(parsed.clientLogoOrder)next.settings.clientLogos=reorder(next.settings.clientLogos,parsed.clientLogoOrder);
  return validateSiteContent(next,context);
}

export function collectSiteAssetIds(content,context){
  const value=validateSiteContent(content,context),ids=new Set();
  if(!Array.isArray(context.fixedAssetIds) || !unique(context.fixedAssetIds) || !FIXED_SITE_ASSET_IDS.every(id=>context.fixedAssetIds.includes(id)))throw new ApiError('VALIDATION_ERROR');
  for(const id of context.fixedAssetIds){if(!context.catalog.some(asset=>asset.id===id && asset.status==='LEGACY_READY' && asset.kind==='IMAGE'))throw new ApiError('VALIDATION_ERROR');ids.add(id);}
  function walk(item){if(!item || typeof item!=='object')return;if(Object.hasOwn(item,'assetId'))ids.add(item.assetId);for(const child of Object.values(item))walk(child);}
  walk(value.hero);walk(value.seo);walk(value.settings);walk(value.projects);walk(value.sections);
  return [...ids].sort();
}
const identity=asset=>({assetId:asset.assetId,alt:asset.alt});
const textRuns=runs=>runs.map(({text})=>({text}));
const heading=value=>({lines:value.lines.map(textRuns)});
export function projectClaimGroups(content,context){
  const value=validateSiteContent(content,context),sections=new Map(value.sections.map(section=>[section.sectionId,section]));
  const groups=value.projects.map(project=>({claimPath:`projects/${project.id}/facts`,value:{title:project.title,client:project.client,year:project.year,category:project.category,eyebrow:project.eyebrow,summary:project.summary,scope:project.scope,serviceIds:[...project.serviceIds].sort(),...(project.publicCredentialPage!==undefined?{publicCredentialPage:project.publicCredentialPage}:{}),cover:identity(project.cover),gallery:project.gallery.map(identity).sort((a,b)=>a.assetId<b.assetId?-1:a.assetId>b.assetId?1:0)}}));
  groups.push(...value.services.map(service=>({claimPath:`services/${service.id}/facts`,value:{title:service.title,titleVi:service.titleVi,summary:service.summary,scope:service.scope}})),...value.settings.clientLogos.map(logo=>({claimPath:`clientLogos/${logo.id}/facts`,value:{clientName:logo.clientName,image:identity(logo.image)}})));
  const about=sections.get('about'),ip=sections.get('ip-studio');
  const factual={
    'hero/facts':{eyebrow:value.hero.eyebrow,description:textRuns(value.hero.description),footnote:value.hero.footnote,image:identity(value.hero.image)},
    'seo/facts':{description:value.seo.description,ogDescription:value.seo.ogDescription,ogImage:identity(value.seo.ogImage)},
    'settings/brand/facts':{header:{descriptor:value.settings.header.descriptor},brand:{logo:identity(value.settings.brand.logo)}},
    'settings/contact/facts':{...value.settings.contact,illustration:identity(value.settings.contact.illustration)},
    'settings/credential/facts':value.settings.credential,
    'settings/showreel/facts':{...value.settings.showreel,poster:identity(value.settings.showreel.poster)},
    'sections/about/facts':{lead:about.lead,paragraphs:about.paragraphs,experienceFact:about.experienceFact,signature:{image:identity(about.signature.image)}},
    'sections/ip-studio/facts':{description:ip.description,disciplines:ip.disciplines,image:identity(ip.image)},
    'sections/footer/facts':{descriptor:sections.get('footer').descriptor,copyright:value.settings.copyright}
  };
  for(const [claimPath,projection] of Object.entries(factual))groups.push({claimPath,value:projection});
  const creativeSections=value.sections.map(section=>{
    const projection={sectionId:section.sectionId,heading:section.kind==='CLIENTS'?textRuns(section.heading):heading(section.heading)};
    if(['WORK','SERVICES','CONTACT'].includes(section.kind))projection.intro=section.intro;
    if(section.kind==='WORK')projection.filterLabels=section.filterLabels;
    if(section.action)projection.action={label:section.action.label};
    if(section.kind==='ABOUT')Object.assign(projection,{reelHeading:heading(section.reelHeading),reelCaption:section.reelCaption,signature:{copy:textRuns(section.signature.copy)}});
    if(section.kind==='FOOTER')projection.backToTopLabel=section.backToTopLabel;
    return projection;
  }).sort((a,b)=>a.sectionId<b.sectionId?-1:1);
  groups.push({claimPath:'creative-copy',value:{hero:{heading:heading(value.hero.heading),note:value.hero.note,primaryAction:{label:value.hero.primaryAction.label},...(value.hero.secondaryAction?{secondaryAction:{label:value.hero.secondaryAction.label}}:{})},seo:{title:value.seo.title,ogTitle:value.seo.ogTitle},settings:{header:{ctaLabel:value.settings.header.ctaLabel},brand:{tagline:value.settings.brand.tagline},nav:[...value.settings.nav].sort((a,b)=>a.sectionId<b.sectionId?-1:1)},sections:creativeSections}});
  return structuredClone(groups.sort((a,b)=>a.claimPath<b.claimPath?-1:1));
}

/** Every renderable primitive must match an explicit taxonomy branch. */
export function classifySiteContentLeaves(content,context){
  const value=validateSiteContent(content,context),result=[];
  const classify=(path,classification,claimPath)=>({path,classification,...(claimPath?{claimPath}:{})});
  const creative=path=>classify(path,'CREATIVE','creative-copy');
  const fact=(path,group)=>classify(path,'FACTUAL',group);
  const presentation=path=>classify(path,'PRESENTATION');
  const constant=path=>classify(path,'CONSTANT');
  const image=(path,group)=>/\.(?:assetId|alt)$/.test(path)?fact(path,group):/\.(?:isDecorative|focalPoint\.[xy])$/.test(path)?presentation(path):null;
  function entry(path){
    if(['schemaVersion','locale'].includes(path))return constant(path);
    if(path.startsWith('sectionOrder.'))return presentation(path);
    if(path.startsWith('hero.')){
      const tail=path.slice(5);if(['kind','variant'].includes(tail))return constant(path);
      if(tail.startsWith('image.'))return image(path,'hero/facts');
      if(/^heading\.lines\.\d+\.\d+\.(text|emphasis)$/.test(tail))return tail.endsWith('.text')?creative(path):presentation(path);
      if(/^description\.\d+\.(text|emphasis)$/.test(tail))return tail.endsWith('.text')?fact(path,'hero/facts'):presentation(path);
      if(['eyebrow','footnote'].includes(tail))return fact(path,'hero/facts');if(tail==='note')return creative(path);
      if(/^(primaryAction|secondaryAction)\.(kind|sectionId|assetId|label)$/.test(tail))return tail.endsWith('.label')?creative(path):presentation(path);
    }
    if(path.startsWith('seo.')){const tail=path.slice(4);if(['title','ogTitle'].includes(tail))return creative(path);if(['description','ogDescription'].includes(tail))return fact(path,'seo/facts');if(tail.startsWith('ogImage.'))return image(path,'seo/facts');}
    const service=path.match(/^services\.(\d+)\.(.*)$/);if(service){const tail=service[2];if(['id','isVisible'].includes(tail))return presentation(path);if(/^(title|titleVi|summary|scope\.\d+)$/.test(tail))return fact(path,`services/${value.services[Number(service[1])].id}/facts`);}
    const project=path.match(/^projects\.(\d+)\.(.*)$/);if(project){const tail=project[2],group=`projects/${value.projects[Number(project[1])].id}/facts`;if(['id','slug','isVisible'].includes(tail))return presentation(path);if(/^(cover|gallery\.\d+)\./.test(tail))return image(path,group);if(/^(title|client|year|category|eyebrow|summary|publicCredentialPage|scope\.\d+|serviceIds\.\d+)$/.test(tail))return fact(path,group);}
    if(path.startsWith('settings.')){
      const tail=path.slice(9);
      if(tail==='brand.name')return constant(path);if(['brand.tagline','header.ctaLabel'].includes(tail))return creative(path);if(tail==='header.descriptor')return fact(path,'settings/brand/facts');if(tail.startsWith('brand.logo.'))return image(path,'settings/brand/facts');
      if(/^credential\.(assetId|label|edition)$/.test(tail))return fact(path,'settings/credential/facts');
      if(tail.startsWith('showreel.poster.'))return image(path,'settings/showreel/facts');if(/^showreel\.(assetId|title|durationSeconds|originalSourceUrl)$/.test(tail))return fact(path,'settings/showreel/facts');
      if(tail.startsWith('contact.illustration.'))return image(path,'settings/contact/facts');if(/^contact\.(email|personName|personPhoneE164|personPhoneLabel|officePhoneE164|officePhoneLabel|facebookUrl|addressLines\.\d+)$/.test(tail))return fact(path,'settings/contact/facts');
      if(/^nav\.\d+\.(sectionId|label)$/.test(tail))return tail.endsWith('.label')?creative(path):presentation(path);
      const logo=tail.match(/^clientLogos\.(\d+)\.(.*)$/);if(logo){const group=`clientLogos/${value.settings.clientLogos[Number(logo[1])].id}/facts`;if(['id','isVisible'].includes(logo[2]))return presentation(path);if(logo[2]==='clientName')return fact(path,group);if(logo[2].startsWith('image.'))return image(path,group);}
      if(/^copyright\.(startYear|label)$/.test(tail))return fact(path,'sections/footer/facts');
    }
    const section=path.match(/^sections\.(\d+)\.(.*)$/);
    if(section){const item=value.sections[Number(section[1])],tail=section[2];
      if(['kind','sectionId','variant','formMode'].includes(tail))return constant(path);if(tail==='isVisible')return presentation(path);
      if(/^(heading|reelHeading)\.(?:lines\.\d+\.)?\d+\.(text|emphasis)$/.test(tail))return tail.endsWith('.text')?creative(path):presentation(path);
      if(/^(featuredIds\.\d+|initialVisibleCount|serviceOrder\.\d+|serviceOptionIds\.\d+)$/.test(tail))return presentation(path);
      if(/^(intro|filterLabels\.(all|EVENTS|FILM|COMMUNICATIONS)|backToTopLabel|reelCaption)$/.test(tail))return creative(path);
      if(/^action\.(kind|sectionId|assetId|label)$/.test(tail))return tail.endsWith('.label')?creative(path):presentation(path);
      if(item.kind==='ABOUT'){
        if(tail.startsWith('signature.image.'))return image(path,'sections/about/facts');
        if(/^signature\.copy\.\d+\.(text|emphasis)$/.test(tail))return tail.endsWith('.text')?creative(path):presentation(path);
        if(/^(lead|paragraphs\.\d+|experienceFact\.(value|label|copy|location))$/.test(tail))return fact(path,'sections/about/facts');
      }
      if(item.kind==='IP'){if(tail.startsWith('image.'))return image(path,'sections/ip-studio/facts');if(/^(description|disciplines\.\d+)$/.test(tail))return fact(path,'sections/ip-studio/facts');}
      if(item.kind==='FOOTER' && tail==='descriptor')return fact(path,'sections/footer/facts');
    }
    throw new ApiError('VALIDATION_ERROR');
  }
  function walk(item,path){if(item!==null && typeof item==='object'){for(const [key,child] of Object.entries(item)){if(!path && key==='claimSources')continue;walk(child,path?`${path}.${key}`:key);}}else{const classification=entry(path);if(!classification)throw new ApiError('VALIDATION_ERROR');result.push(classification);}}
  walk(value,'');return result;
}
