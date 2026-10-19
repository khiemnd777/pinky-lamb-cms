import {z} from 'zod';
import {ApiError} from './errors.mjs';

export const SECTION_IDS=Object.freeze(['clients','work','services','about','ip-studio','contact','footer']);
export const BODY_SECTION_IDS=Object.freeze(['work','services','about','ip-studio']);
const NAV_IDS=['clients',...BODY_SECTION_IDS,'contact'];
const ACTION_IDS=[...BODY_SECTION_IDS,'contact'];
const assetIdSchema=z.string().regex(/^[A-Za-z0-9_-]{1,100}$/);
const sourceIdSchema=z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);

/** Preserve submitted copy; rendering performs context-specific escaping. */
export function plainText(max,{empty=false,multiline=false,visible=true}={}){
  const controls=multiline?/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/:/[\u0000-\u001F\u007F-\u009F\u2028\u2029]/;
  return z.string().refine(value=>value.length<=max && (empty || value.length>0) && !controls.test(value) &&
    (!visible || (empty && value.length===0) || value.trim().length>0),'Giá trị không hợp lệ.');
}
export const stableIdSchema=plainText(100).refine(value=>/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value));
export const slugSchema=stableIdSchema;
export function yearSchema(currentYear=new Date().getUTCFullYear()){
  if(!Number.isSafeInteger(currentYear) || currentYear<1990 || currentYear>9997)throw new ApiError('VALIDATION_ERROR');
  return z.number().int().min(1990).max(currentYear+2);
}

// JSON transports produce plain records. Reject inherited fields/accessors before
// Zod copies objects, including nested inputs supplied directly by local callers.
function plainTree(value,seen=new Set(),depth=0){
  if(value===null || typeof value!=='object')return true;
  if(depth>64 || seen.has(value) || Object.getOwnPropertySymbols(value).length)return false;
  const array=Array.isArray(value);
  if(Object.getPrototypeOf(value)!==(array?Array.prototype:Object.prototype))return false;
  seen.add(value);
  for(const [key,descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))){
    if(array && key==='length')continue;
    if(!Object.hasOwn(descriptor,'value') || (array && !/^(0|[1-9][0-9]*)$/.test(key)) || !plainTree(descriptor.value,seen,depth+1))return false;
  }
  seen.delete(value);return true;
}
export function strictSiteObject(shape){
  return z.preprocess(value=>plainTree(value)?value:undefined,z.strictObject(shape));
}
const unique=(values,key=value=>value)=>new Set(values.map(key)).size===values.length;
const idList=max=>z.array(stableIdSchema).max(max).refine(values=>unique(values));

/** Explicit safe context only; this module never loads private mapping files. */
export function createSiteSettingsSchemas({catalog,sourceIds=[],currentYear=new Date().getUTCFullYear(),allowedShowreelSourceUrl}={}){
  const assets=new Map();
  if(!Array.isArray(catalog) || !Array.isArray(sourceIds) || !unique(sourceIds))throw new ApiError('VALIDATION_ERROR');
  for(const entry of catalog){
    if(!entry || !assetIdSchema.safeParse(entry.id).success || !['IMAGE','VIDEO','PDF'].includes(entry.kind) || typeof entry.status!=='string' || assets.has(entry.id))throw new ApiError('VALIDATION_ERROR');
    assets.set(entry.id,{kind:entry.kind,status:entry.status,durationSeconds:entry.durationSeconds});
  }
  if(sourceIds.some(id=>!sourceIdSchema.safeParse(id).success))throw new ApiError('VALIDATION_ERROR');
  if(allowedShowreelSourceUrl!==undefined){
    let url;try{url=new URL(allowedShowreelSourceUrl);}catch{throw new ApiError('VALIDATION_ERROR');}
    if(url.protocol!=='https:' || url.hostname!=='drive.google.com' || url.username || url.password || url.port || url.search || url.hash || !/^\/file\/d\/[A-Za-z0-9_-]+\/view$/.test(url.pathname) || url.href!==allowedShowreelSourceUrl)throw new ApiError('VALIDATION_ERROR');
  }
  const allowed=(id,kind)=>assets.get(id)?.kind===kind && assets.get(id)?.status==='LEGACY_READY';
  const assetUseSchema=strictSiteObject({assetId:assetIdSchema.refine(id=>allowed(id,'IMAGE')),alt:plainText(300,{empty:true,visible:false}),isDecorative:z.boolean(),
    focalPoint:strictSiteObject({x:z.number().min(0).max(1),y:z.number().min(0).max(1)}).optional()
  }).refine(value=>value.isDecorative?value.alt==='':value.alt.trim().length>0);
  const run=strictSiteObject({text:plainText(1000,{visible:false,multiline:true}),emphasis:z.enum(['NONE','STRONG','ACCENT']).optional()});
  const headingRun=strictSiteObject({text:plainText(1000,{visible:false}),emphasis:z.enum(['NONE','STRONG','ACCENT']).optional()});
  const runs=(count,cap,schema=run)=>z.array(schema).min(1).max(count).refine(values=>{const text=values.map(value=>value.text).join('');return text.length<=cap && text.trim().length>0;});
  const textRunsSchema=runs(12,1000);
  const headingSchema=strictSiteObject({lines:z.array(runs(8,100,headingRun)).min(1).max(3)});
  const actionSchema=z.union([
    strictSiteObject({kind:z.literal('SECTION'),sectionId:z.enum(ACTION_IDS),label:plainText(80)}),
    strictSiteObject({kind:z.literal('SHOWREEL'),label:plainText(80)}),
    strictSiteObject({kind:z.literal('CREDENTIAL'),assetId:assetIdSchema.refine(id=>allowed(id,'PDF')),label:plainText(80)})
  ]);
  const headerSchema=strictSiteObject({descriptor:plainText(120),ctaLabel:plainText(80)});
  const brandSchema=strictSiteObject({name:z.literal('Pinky Lamb'),logo:assetUseSchema,tagline:plainText(300)});
  const credentialSchema=strictSiteObject({assetId:assetIdSchema.refine(id=>allowed(id,'PDF')),label:plainText(80),edition:plainText(120)});
  const showreelFields={assetId:assetIdSchema.refine(id=>allowed(id,'VIDEO') && Number.isFinite(assets.get(id)?.durationSeconds) && assets.get(id).durationSeconds>0),poster:assetUseSchema,title:plainText(120),
    originalSourceUrl:plainText(2048).refine(value=>allowedShowreelSourceUrl!==undefined && value===allowedShowreelSourceUrl).optional()};
  const showreelPatchSchema=strictSiteObject(showreelFields);
  const showreelSchema=strictSiteObject({...showreelFields,durationSeconds:z.number().positive()}).refine(value=>value.durationSeconds===assets.get(value.assetId)?.durationSeconds);
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
  return {assetUseSchema,actionSchema,headingSchema,textRunsSchema,headerSchema,brandSchema,credentialSchema,showreelSchema,showreelPatchSchema,contactSchema,navSchema,copyrightSchema,clientLogoSchema,clientLogosSchema,settingsSchema,sectionSchema,sectionsSchema,claimSourcesSchema};
}
