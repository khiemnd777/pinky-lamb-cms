import {z} from 'zod';
import {ApiError,validationError} from './errors.mjs';
import {resourceIdSchema,hashSchema} from './hero.mjs';
import {plainText,stableIdSchema,slugSchema,yearSchema,SECTION_IDS,BODY_SECTION_IDS} from './site-settings.mjs';
import {strictMediaV3JsonSchema} from './media-v3-metadata.mjs';
import {imageReferenceSchema,videoPosterReferenceSchema} from './media-v3-contract.mjs';

const strictSiteObject=shape=>strictMediaV3JsonSchema.pipe(z.strictObject(shape));
const unique=(values,key=value=>value)=>new Set(values.map(key)).size===values.length;
const permutation=(order,ids)=>order.length===ids.length && unique(order) && order.every(id=>ids.includes(id));
const idList=max=>z.array(stableIdSchema).max(max).refine(values=>unique(values));
const assetIdSchema=z.string().regex(/^[A-Za-z0-9_-]{1,100}$/);
const sourceIdSchema=resourceIdSchema;
const NAV_IDS=['clients',...BODY_SECTION_IDS,'contact'];
const ACTION_IDS=[...BODY_SECTION_IDS,'contact'];
const CAPS=Object.freeze({services:12,projects:24,gallery:12,scope:12});
const CATEGORY_IDS=['EVENTS','FILM','COMMUNICATIONS'];
const fixedClaimPaths=['hero/facts','seo/facts','settings/brand/facts','settings/contact/facts','settings/credential/facts','settings/showreel/facts','sections/about/facts','sections/ip-studio/facts','sections/footer/facts','creative-copy'];
const supportedPaths=[...fixedClaimPaths,'projects/*/facts','services/*/facts','clientLogos/*/facts'];
const sourceCatalogSchema=z.array(strictSiteObject({id:resourceIdSchema,kind:z.enum(['CREDENTIAL','SUPPLIED_FILE']),title:plainText(120),sha256:hashSchema,pageCount:z.literal(48).optional(),publicCredentialUrl:z.literal('http://127.0.0.1:5010/assets/Pinky-Lamb-Credential-2026.pdf').optional(),supportedClaimPaths:z.array(z.enum(supportedPaths)).max(13).refine(values=>unique(values)),excerpt:plainText(1000,{multiline:true}).optional()}).refine(value=>value.kind==='CREDENTIAL'?value.pageCount===48 && value.publicCredentialUrl!==undefined:value.pageCount===undefined && value.publicCredentialUrl===undefined)).max(16).refine(values=>unique(values,value=>value.id));
const allowedSourceUrl=plainText(2048).refine(value=>{
  try{const url=new URL(value);return url.protocol==='https:' && url.hostname==='drive.google.com' && !url.username && !url.password && !url.port && !url.search && !url.hash && /^\/file\/d\/[A-Za-z0-9_-]+\/view$/.test(url.pathname) && url.href===value;}catch{return false;}
});
const contextSchema=strictSiteObject({sourceCatalog:sourceCatalogSchema,currentYear:z.number().int().min(1990).max(9997),allowedShowreelSourceUrl:allowedSourceUrl.optional()});
const claimPaths=content=>[...fixedClaimPaths,...content.projects.map(value=>`projects/${value.id}/facts`),...content.services.map(value=>`services/${value.id}/facts`),...content.settings.clientLogos.map(value=>`clientLogos/${value.id}/facts`)].sort();
const actions=content=>[content.hero.primaryAction,content.hero.secondaryAction,...content.sections.filter(value=>value.action).map(value=>value.action)].filter(Boolean);

/** Context is server-owned factual data, not raw legacy refs or rights refs.
 * Membership is structural; this parser does not authenticate source evidence.
 * Media kind/readiness and selection belong to the later media resolver.
 */
export function createMediaV3ContentSchemas(contentContext){
  let context;try{context=contextSchema.parse(contentContext);}catch{throw new ApiError('INTERNAL_ERROR');}
  const {currentYear,allowedShowreelSourceUrl}=context,sourceIds=context.sourceCatalog.map(entry=>entry.id);
  const assetUseSchema=imageReferenceSchema;
  const run=strictSiteObject({text:plainText(1000,{visible:false,multiline:true}),emphasis:z.enum(['NONE','STRONG','ACCENT']).optional()});
  const headingRun=strictSiteObject({text:plainText(1000,{visible:false}),emphasis:z.enum(['NONE','STRONG','ACCENT']).optional()});
  const runs=(count,cap,schema=run)=>z.array(schema).min(1).max(count).refine(values=>{const text=values.map(value=>value.text).join('');return text.length<=cap && text.trim().length>0;});
  const textRunsSchema=runs(12,1000);
  const headingSchema=strictSiteObject({lines:z.array(runs(8,100,headingRun)).min(1).max(3)});
  const actionSchema=z.union([
    strictSiteObject({kind:z.literal('SECTION'),sectionId:z.enum(ACTION_IDS),label:plainText(80)}),
    strictSiteObject({kind:z.literal('SHOWREEL'),label:plainText(80)}),
    strictSiteObject({kind:z.literal('CREDENTIAL'),assetId:assetIdSchema,label:plainText(80)})
  ]);
  const headerSchema=strictSiteObject({descriptor:plainText(120),ctaLabel:plainText(80)});
  const brandSchema=strictSiteObject({name:z.literal('Pinky Lamb'),logo:assetUseSchema,tagline:plainText(300)});
  const credentialSchema=strictSiteObject({assetId:assetIdSchema,label:plainText(80),edition:plainText(120)});
  const showreelSchema=strictSiteObject({assetId:assetIdSchema,poster:z.union([assetUseSchema,videoPosterReferenceSchema]),title:plainText(120),originalSourceUrl:plainText(2048).refine(value=>allowedShowreelSourceUrl!==undefined && value===allowedShowreelSourceUrl).optional(),durationSeconds:z.number().finite().positive()});
  const phone=plainText(16).refine(value=>/^\+[1-9][0-9]{1,14}$/.test(value));
  const facebook=plainText(2048).refine(value=>{
    try{const url=new URL(value);return url.protocol==='https:' && url.hostname==='www.facebook.com' && !url.username && !url.password && !url.port && !url.search && !url.hash && url.href===value;}catch{return false;}
  });
  const contactSchema=strictSiteObject({email:plainText(254).refine(value=>z.email().safeParse(value).success),personName:plainText(120),personPhoneE164:phone,personPhoneLabel:plainText(80),officePhoneE164:phone,officePhoneLabel:plainText(80),addressLines:z.array(plainText(160)).min(1).max(4),facebookUrl:facebook,illustration:assetUseSchema});
  const navSchema=z.array(strictSiteObject({sectionId:z.enum(NAV_IDS),label:plainText(80)})).max(6).refine(values=>unique(values,value=>value.sectionId));
  const copyrightSchema=strictSiteObject({startYear:yearSchema(currentYear).optional(),label:plainText(240)});
  const clientLogoSchema=strictSiteObject({id:stableIdSchema,clientName:plainText(120),image:assetUseSchema,isVisible:z.boolean()});
  const clientLogosSchema=z.array(clientLogoSchema).max(12).refine(values=>unique(values,value=>value.id));
  const settingsSchema=strictSiteObject({header:headerSchema,brand:brandSchema,credential:credentialSchema,showreel:showreelSchema,contact:contactSchema,nav:navSchema,clientLogos:clientLogosSchema,copyright:copyrightSchema});
  const common={isVisible:z.boolean(),heading:headingSchema};
  const clients=strictSiteObject({kind:z.literal('CLIENTS'),sectionId:z.literal('clients'),isVisible:z.boolean(),heading:runs(8,100,headingRun)});
  const work=strictSiteObject({...common,kind:z.literal('WORK'),sectionId:z.literal('work'),variant:z.literal('work-grid'),intro:plainText(4000,{multiline:true}),featuredIds:idList(24),initialVisibleCount:z.number().int().min(1).max(24),filterLabels:strictSiteObject({all:plainText(80),EVENTS:plainText(80),FILM:plainText(80),COMMUNICATIONS:plainText(80)})});
  const services=strictSiteObject({...common,kind:z.literal('SERVICES'),sectionId:z.literal('services'),variant:z.literal('services-accordion'),intro:plainText(4000,{multiline:true}),serviceOrder:idList(12),action:actionSchema});
  const about=strictSiteObject({...common,kind:z.literal('ABOUT'),sectionId:z.literal('about'),variant:z.literal('about-split'),lead:plainText(4000,{multiline:true}),paragraphs:z.array(plainText(4000,{multiline:true})).max(12),
    experienceFact:strictSiteObject({value:plainText(80),label:plainText(120),copy:plainText(4000,{multiline:true}),location:plainText(160).optional()}),signature:strictSiteObject({image:assetUseSchema,copy:textRunsSchema}),reelHeading:headingSchema,reelCaption:plainText(1000,{multiline:true})
  }).refine(value=>[value.lead,...value.paragraphs,value.experienceFact.copy,...value.signature.copy.map(run=>run.text),value.reelCaption].reduce((total,text)=>total+text.length,0)<=4000);
  const ip=strictSiteObject({...common,kind:z.literal('IP'),sectionId:z.literal('ip-studio'),variant:z.literal('ip-split'),description:plainText(4000,{multiline:true}),image:assetUseSchema,disciplines:z.array(plainText(160)).max(12),action:actionSchema}).refine(value=>value.description.length+value.disciplines.reduce((total,text)=>total+text.length,0)<=4000);
  const contact=strictSiteObject({...common,kind:z.literal('CONTACT'),sectionId:z.literal('contact'),isVisible:z.literal(true),variant:z.literal('contact-form'),intro:plainText(4000,{multiline:true}),formMode:z.literal('MAILTO_COPY'),serviceOptionIds:idList(12)});
  const footer=strictSiteObject({kind:z.literal('FOOTER'),sectionId:z.literal('footer'),variant:z.literal('footer-wordmark'),heading:headingSchema,descriptor:plainText(4000,{multiline:true}),backToTopLabel:plainText(80)});
  const sectionSchema=z.union([clients,work,services,about,ip,contact,footer]);
  const sectionsSchema=z.array(sectionSchema).length(7).refine(values=>unique(values,value=>value.sectionId) && SECTION_IDS.every(id=>values.some(value=>value.sectionId===id)));
  const fixedClaims=['creative-copy','hero/facts','seo/facts','settings/brand/facts','settings/contact/facts','settings/credential/facts','settings/showreel/facts','sections/about/facts','sections/ip-studio/facts','sections/footer/facts'];
  const claimPath=plainText(160).refine(value=>{
    if(fixedClaims.includes(value))return true;
    const parts=value.split('/');
    return parts.length===3 && ['projects','services','clientLogos'].includes(parts[0]) && stableIdSchema.safeParse(parts[1]).success && parts[2]==='facts';
  });
  const claimSourcesSchema=z.array(strictSiteObject({claimPath,sourceIds:z.array(sourceIdSchema.refine(id=>sourceIds.includes(id))).min(1).max(8).refine(values=>unique(values))})).max(61).refine(values=>unique(values,value=>value.claimPath));
  const scope=z.array(plainText(160)).max(CAPS.scope);
  const serviceSchema=strictSiteObject({id:stableIdSchema,title:plainText(120),titleVi:plainText(120),summary:plainText(1000,{multiline:true}),scope,isVisible:z.boolean()});
  const projectSchema=strictSiteObject({id:stableIdSchema,slug:slugSchema,title:plainText(120),client:plainText(120),year:yearSchema(context.currentYear),category:z.enum(CATEGORY_IDS),eyebrow:plainText(120),summary:plainText(1000,{multiline:true}),scope,
    cover:assetUseSchema,gallery:z.array(assetUseSchema).max(CAPS.gallery),serviceIds:z.array(stableIdSchema).max(CAPS.services).refine(values=>unique(values)),publicCredentialPage:z.number().int().min(1).max(48).optional(),isVisible:z.boolean()
  }).refine(value=>unique([value.cover,...value.gallery],asset=>asset.assetId));
  const servicesSchema=z.array(serviceSchema).max(CAPS.services).refine(values=>unique(values,value=>value.id));
  const projectsSchema=z.array(projectSchema).max(CAPS.projects).refine(values=>unique(values,value=>value.id) && unique(values,value=>value.slug));
  // M1 hero heading permits multiline runs; M2 section headings do not.
  const heroSchema=strictSiteObject({kind:z.literal('HERO'),variant:z.literal('hero-split'),heading:strictSiteObject({lines:z.array(runs(8,100)).min(1).max(3)}),eyebrow:plainText(120),description:textRunsSchema,primaryAction:actionSchema,secondaryAction:actionSchema.optional(),footnote:plainText(240,{empty:true,multiline:true}),note:plainText(300,{empty:true,multiline:true}),image:assetUseSchema});
  const seoSchema=strictSiteObject({title:plainText(80),description:plainText(200),ogTitle:plainText(80),ogDescription:plainText(200),ogImage:assetUseSchema.refine(value=>value.isDecorative===false)});
  const sectionOrder=z.array(z.enum(BODY_SECTION_IDS)).length(4).refine(value=>permutation(value,BODY_SECTION_IDS));
  const contentSchema=strictSiteObject({schemaVersion:z.literal(3),locale:z.literal('vi-VN'),hero:heroSchema,seo:seoSchema,
    settings:settingsSchema,services:servicesSchema,projects:projectsSchema,sections:sectionsSchema,sectionOrder,claimSources:claimSourcesSchema
  }).superRefine((content,ctx)=>{
    const sections=new Map(content.sections.map(section=>[section.sectionId,section]));
    const services=content.services.map(value=>value.id),projects=content.projects.map(value=>value.id);
    const issue=(path)=>ctx.addIssue({code:'custom',path,message:'Giá trị không hợp lệ.'});
    // A failed array refinement can still reach superRefine; never dereference
    // an absent section while reporting structural invalidity.
    if(SECTION_IDS.some(id=>!sections.has(id))){issue(['sections']);return;}
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
  return {contentSchema};
}
export function parseMediaV3Content(input,contentContext){
  const {contentSchema}=createMediaV3ContentSchemas(contentContext);
  try{return contentSchema.parse(input);}catch(error){throw validationError(error);}
}

const identity=asset=>({assetId:asset.assetId,alt:asset.alt});
const textRuns=runs=>runs.map(({text})=>({text}));
const heading=value=>({lines:value.lines.map(textRuns)});
export function projectClaimGroupsV3(parsedContent){
  // This public projection consumes already parsed V3 content. Guard descriptors
  // again so projection never invokes caller-supplied accessors.
  let value;try{value=strictMediaV3JsonSchema.parse(parsedContent);}catch(error){throw validationError(error);}
  const sections=new Map(value.sections.map(section=>[section.sectionId,section]));
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

