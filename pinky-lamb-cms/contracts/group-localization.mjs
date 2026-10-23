import {showreelSourceSchema,isYoutubeReel} from './showreel-source.mjs';
import {z} from 'zod';
import {plainText,strictSiteObject,stableIdSchema} from './site-settings.mjs';
import {revisionSchema,hashSchema,resourceIdSchema,assertEnvelopeSize} from './hero.mjs';
import {localizedSectionHeadingSchema} from './work-services-localization.mjs';
import {SERVICE_TEMPLATE_ID} from './service-localization.mjs';
import {imageReferenceSchema} from './media-v3-contract.mjs';
import {ApiError,validationError} from './errors.mjs';
export const GROUP_IDS=Object.freeze(['header','clients','about','ip-studio','contact','footer','seo']);
export const GROUP_LOCALES=Object.freeze(['en','vi','ja']);
export const groupIdSchema=z.enum(GROUP_IDS),groupLocaleSchema=z.enum(GROUP_LOCALES);
export const GROUP_TEMPLATE_ID=SERVICE_TEMPLATE_ID;
const text=(max,options)=>plainText(max,options),heading=localizedSectionHeadingSchema;
const run=strictSiteObject({text:text(1000,{multiline:true,visible:false}),emphasis:z.enum(['NONE','STRONG','ACCENT']).optional()});
const clientHeadingRun=strictSiteObject({text:text(1000,{visible:false}),emphasis:z.enum(['NONE','STRONG','ACCENT']).optional()});
const clientHeading=z.array(clientHeadingRun).min(1).max(8).refine(v=>v.reduce((n,r)=>n+r.text.length,0)<=100&&v.map(r=>r.text).join('').trim().length>0);
const runs=z.array(run).min(1).max(12).refine(value=>value.map(r=>r.text).join('').trim().length>0&&value.reduce((n,r)=>n+r.text.length,0)<=1000);
const alt=text(300,{empty:true,visible:false}),unique=(items,key)=>new Set(items.map(item=>item[key])).size===items.length;
export const localizedHeaderContentSchema=strictSiteObject({descriptor:text(120),tagline:text(300),ctaLabel:text(80),navLabels:z.array(strictSiteObject({sectionId:stableIdSchema,label:text(80)})).max(6).refine(v=>unique(v,'sectionId')),credentialLabel:text(80),logoAlt:alt});
export const localizedClientsContentSchema=strictSiteObject({heading:clientHeading,logoAlts:z.array(strictSiteObject({clientId:stableIdSchema,assetId:resourceIdSchema,alt})).max(12).refine(v=>unique(v,'clientId'))});
export const localizedAboutContentSchema=strictSiteObject({heading,lead:text(4000,{multiline:true}),paragraphs:z.array(text(4000,{multiline:true})).max(12),experienceLabel:text(120,{multiline:true}),experienceCopy:text(4000,{multiline:true}),experienceLocationLabel:text(160).optional(),signatureCopy:runs,signatureAlt:alt,reelHeading:heading,reelCaption:text(1000,{multiline:true}),reelTitle:text(120),reelPosterAlt:alt}).refine(v=>[v.lead,...v.paragraphs,v.experienceCopy,...v.signatureCopy.map(r=>r.text),v.reelCaption].reduce((n,t)=>n+t.length,0)<=4000);
export const localizedIpContentSchema=strictSiteObject({heading,description:text(4000,{multiline:true}),disciplines:z.array(text(160)).max(12),ctaLabel:text(80),imageAlt:alt}).refine(v=>v.description.length+v.disciplines.reduce((n,t)=>n+t.length,0)<=4000);
export const localizedContactContentSchema=strictSiteObject({heading,intro:text(4000,{multiline:true}),personPhoneLabel:text(80),officePhoneLabel:text(80),addressLines:z.array(text(160)).min(1).max(4),illustrationAlt:alt});
export const localizedFooterContentSchema=strictSiteObject({heading,descriptor:text(4000,{multiline:true}),backToTopLabel:text(80),copyrightLabel:text(240)});
export const localizedSeoContentSchema=strictSiteObject({title:text(80),description:text(200),ogTitle:text(80),ogDescription:text(200),shareAlt:alt});
const schemas={header:localizedHeaderContentSchema,clients:localizedClientsContentSchema,about:localizedAboutContentSchema,'ip-studio':localizedIpContentSchema,contact:localizedContactContentSchema,footer:localizedFooterContentSchema,seo:localizedSeoContentSchema};
export function groupContentSchema(id){return schemas[groupIdSchema.parse(id)];}
/** Source is already validated by the trusted Home reader; only this group's dependencies leave the API. */
export function groupSourceFromHome(content,id){
 groupIdSchema.parse(id);const section=content.sections.find(s=>s.sectionId===id),s=content.settings;
 if(id==='header')return {header:s.header,brand:s.brand,nav:s.nav,credential:s.credential,sectionOrder:content.sectionOrder};
 if(id==='clients')return {section,logos:s.clientLogos};
 if(id==='about')return {section,showreel:s.showreel};
 if(id==='ip-studio')return {section,ipServiceId:section.action.kind==='SECTION'&&section.action.sectionId==='contact'&&content.services.some(s=>s.id==='original-ip')?'original-ip':null};
 if(id==='contact')return {section,contact:s.contact};
 if(id==='footer')return {section,copyright:s.copyright,brandName:s.brand.name};
 return {seo:content.seo};
}
export function groupSourceMediaUses(id,source){
 const uses=[];const add=(slotId,image,role='IMAGE')=>{if(image)uses.push({slotId,assetId:image.assetId,role:image.derivativeRole==='POSTER'?'POSTER':role});};
 if(id==='header'){add('brand/logo',source.brand.logo);add('credential',source.credential,'PDF_DOWNLOAD');add('template/favicon',{assetId:'favicon'});add('template/brand-diagonal',{assetId:'brand-diagonal'});}
 if(id==='clients')for(const l of source.logos)add(`clients/${l.id}/image`,l.image);
 if(id==='about'){add('about/signature',source.section.signature.image);if(!isYoutubeReel(source.showreel))add('about/showreel',source.showreel,'VIDEO');add('about/poster',source.showreel.poster);}
 if(id==='ip-studio'){add('ip-studio/image',source.section.image);if(source.section.action.kind==='CREDENTIAL')add('ip-studio/credential',source.section.action,'PDF_DOWNLOAD');if(source.section.action.kind==='FILE')add('ip-studio/file',source.section.action,'FILE_DOWNLOAD');}
 if(id==='contact')add('contact/illustration',source.contact.illustration);
 if(id==='seo')add('seo/share',source.seo.ogImage);
 return uses;
}
export function groupContentFromSource(id,source){
 const s=source.section;let value;
 if(id==='header')value={descriptor:source.header.descriptor,tagline:source.brand.tagline,ctaLabel:source.header.ctaLabel,navLabels:source.nav.map(({sectionId,label})=>({sectionId,label})),credentialLabel:source.credential.label,logoAlt:source.brand.logo.alt};
 else if(id==='clients')value={heading:s.heading,logoAlts:source.logos.map(logo=>({clientId:logo.id,assetId:logo.image.assetId,alt:logo.image.alt}))};
 else if(id==='about')value={heading:s.heading,lead:s.lead,paragraphs:s.paragraphs,experienceLabel:s.experienceFact.label,experienceCopy:s.experienceFact.copy,...(s.experienceFact.location?{experienceLocationLabel:s.experienceFact.location}:{}),signatureCopy:s.signature.copy,signatureAlt:s.signature.image.alt,reelHeading:s.reelHeading,reelCaption:s.reelCaption,reelTitle:source.showreel.title,reelPosterAlt:source.showreel.poster.alt};
 else if(id==='ip-studio')value={heading:s.heading,description:s.description,disciplines:s.disciplines,ctaLabel:s.action.label,imageAlt:s.image.alt};
 else if(id==='contact')value={heading:s.heading,intro:s.intro,personPhoneLabel:source.contact.personPhoneLabel,officePhoneLabel:source.contact.officePhoneLabel,addressLines:source.contact.addressLines,illustrationAlt:source.contact.illustration.alt};
 else if(id==='footer')value={heading:s.heading,descriptor:s.descriptor,backToTopLabel:s.backToTopLabel,copyrightLabel:source.copyright.label};
 else value={title:source.seo.title,description:source.seo.description,ogTitle:source.seo.ogTitle,ogDescription:source.seo.ogDescription,shareAlt:source.seo.ogImage.alt};
 return groupContentSchema(id).parse(value);
}
const imageAlt=(image,value)=>{if(image.isDecorative?value!=='':!value.trim())throw new ApiError('VALIDATION_ERROR');return {...image,alt:value};};
export function mergeLocalizedGroup(id,source,input){
 source=groupSourceSchema(id).parse(source);const c=groupContentSchema(id).parse(input),s=source.section;
 if(id==='header'){if(c.navLabels.length!==source.nav.length||c.navLabels.some(label=>!source.nav.some(n=>n.sectionId===label.sectionId)))throw new ApiError('VALIDATION_ERROR');return {...source,header:{...source.header,descriptor:c.descriptor,ctaLabel:c.ctaLabel},brand:{...source.brand,tagline:c.tagline,logo:imageAlt(source.brand.logo,c.logoAlt)},nav:source.nav.map(n=>({...n,label:c.navLabels.find(l=>l.sectionId===n.sectionId).label})),credential:{...source.credential,label:c.credentialLabel}};}
 if(id==='clients'){if(c.logoAlts.length!==source.logos.length||c.logoAlts.some(a=>!source.logos.some(l=>l.id===a.clientId&&l.image.assetId===a.assetId)))throw new ApiError('VALIDATION_ERROR');return {...source,section:{...s,heading:s.heading},logos:source.logos.map(l=>({...l,image:imageAlt(l.image,c.logoAlts.find(a=>a.clientId===l.id).alt)}))};}
 if(id==='about'){if(Boolean(s.experienceFact.location)!==Boolean(c.experienceLocationLabel))throw new ApiError('VALIDATION_ERROR');return {...source,section:{...s,heading:s.heading,lead:c.lead,paragraphs:c.paragraphs,experienceFact:{...s.experienceFact,label:s.experienceFact.label,copy:c.experienceCopy,...(c.experienceLocationLabel?{displayLocation:c.experienceLocationLabel}:{})},signature:{...s.signature,copy:c.signatureCopy,image:imageAlt(s.signature.image,c.signatureAlt)},reelHeading:s.reelHeading,reelCaption:c.reelCaption},showreel:{...source.showreel,title:c.reelTitle,poster:imageAlt(source.showreel.poster,c.reelPosterAlt)}};}
 if(id==='ip-studio')return {...source,section:{...s,heading:s.heading,description:c.description,disciplines:c.disciplines,action:{...s.action,label:c.ctaLabel},image:imageAlt(s.image,c.imageAlt)}};
 if(id==='contact')return {...source,section:{...s,heading:s.heading,intro:c.intro},contact:{...source.contact,personPhoneLabel:c.personPhoneLabel,officePhoneLabel:c.officePhoneLabel,addressLines:c.addressLines,illustration:imageAlt(source.contact.illustration,c.illustrationAlt)}};
 if(id==='footer')return {...source,section:{...s,heading:s.heading,descriptor:c.descriptor,backToTopLabel:c.backToTopLabel},copyright:{...source.copyright,label:c.copyrightLabel}};
 return {...source,seo:{...source.seo,title:c.title,description:c.description,ogTitle:c.ogTitle,ogDescription:c.ogDescription,ogImage:imageAlt(source.seo.ogImage,c.shareAlt)}};
}
const sourceImage=imageReferenceSchema,sourceAction=z.union([
 strictSiteObject({kind:z.literal('SECTION'),sectionId:z.enum(['work','services','about','ip-studio','contact']),label:text(80)}),strictSiteObject({kind:z.literal('SHOWREEL'),label:text(80)}),strictSiteObject({kind:z.literal('CREDENTIAL'),assetId:resourceIdSchema,label:text(80)}),strictSiteObject({kind:z.literal('FILE'),assetId:resourceIdSchema,label:text(80)})
]);
const sourceCommon={isVisible:z.boolean(),heading},sourceHeader=strictSiteObject({descriptor:text(120),ctaLabel:text(80)}),sourceBrand=strictSiteObject({name:z.literal('Pinky Lamb'),logo:sourceImage,tagline:text(300)}),sourceCredential=strictSiteObject({assetId:resourceIdSchema,label:text(80),edition:text(120)}),sourceNav=z.array(strictSiteObject({sectionId:z.enum(['clients','work','services','about','ip-studio','contact']),label:text(80)})).max(6).refine(v=>unique(v,'sectionId'));
const sectionOrder=z.array(z.enum(['work','services','about','ip-studio'])).length(4).refine(v=>new Set(v).size===4);
const sourceClients=strictSiteObject({kind:z.literal('CLIENTS'),sectionId:z.literal('clients'),isVisible:z.boolean(),heading:clientHeading});
const sourceAbout=strictSiteObject({...sourceCommon,kind:z.literal('ABOUT'),sectionId:z.literal('about'),variant:z.literal('about-split'),lead:text(4000,{multiline:true}),paragraphs:z.array(text(4000,{multiline:true})).max(12),experienceFact:strictSiteObject({value:text(80),label:text(120,{multiline:true}),copy:text(4000,{multiline:true}),location:text(160).optional()}),signature:strictSiteObject({image:sourceImage,copy:runs}),reelHeading:heading,reelCaption:text(1000,{multiline:true})}).refine(v=>[v.lead,...v.paragraphs,v.experienceFact.copy,...v.signature.copy.map(r=>r.text),v.reelCaption].reduce((n,t)=>n+t.length,0)<=4000);
const sourceIp=strictSiteObject({...sourceCommon,kind:z.literal('IP'),sectionId:z.literal('ip-studio'),variant:z.literal('ip-split'),description:text(4000,{multiline:true}),image:sourceImage,disciplines:z.array(text(160)).max(12),action:sourceAction}).refine(v=>v.description.length+v.disciplines.reduce((n,t)=>n+t.length,0)<=4000);
const phone=text(16).regex(/^\+[1-9][0-9]{1,14}$/),safeFacebook=text(2048).refine(v=>{try{const u=new URL(v);return u.protocol==='https:'&&u.hostname==='www.facebook.com'&&!u.username&&!u.password&&!u.port&&!u.search&&!u.hash&&u.href===v;}catch{return false;}}),safeShowreelSource=text(2048).refine(v=>{try{const u=new URL(v);return u.protocol==='https:'&&u.hostname==='drive.google.com'&&!u.username&&!u.password&&!u.port&&!u.search&&!u.hash&&/^\/file\/d\/[A-Za-z0-9_-]+\/view$/.test(u.pathname)&&u.href===v;}catch{return false;}});
const sourceContact=strictSiteObject({...sourceCommon,kind:z.literal('CONTACT'),sectionId:z.literal('contact'),isVisible:z.literal(true),variant:z.literal('contact-form'),intro:text(4000,{multiline:true}),formMode:z.literal('MAILTO_COPY'),serviceOptionIds:z.array(stableIdSchema).max(12).refine(v=>new Set(v).size===v.length)});
const sourceFooter=strictSiteObject({kind:z.literal('FOOTER'),sectionId:z.literal('footer'),variant:z.literal('footer-wordmark'),heading,descriptor:text(4000,{multiline:true}),backToTopLabel:text(80)});
const sources={
 header:strictSiteObject({header:sourceHeader,brand:sourceBrand,nav:sourceNav,credential:sourceCredential,sectionOrder}),
 clients:strictSiteObject({section:sourceClients,logos:z.array(strictSiteObject({id:stableIdSchema,clientName:text(120),image:sourceImage,isVisible:z.boolean()})).max(12).refine(v=>unique(v,'id'))}),
 about:strictSiteObject({section:sourceAbout,showreel:showreelSourceSchema({assetId:resourceIdSchema,title:text(120),originalSourceUrl:safeShowreelSource})}),
 'ip-studio':strictSiteObject({section:sourceIp,ipServiceId:z.literal('original-ip').nullable()}),
 contact:strictSiteObject({section:sourceContact,contact:strictSiteObject({email:z.email().max(254),personName:text(120),personPhoneE164:phone,personPhoneLabel:text(80),officePhoneE164:phone,officePhoneLabel:text(80),addressLines:z.array(text(160)).min(1).max(4),facebookUrl:safeFacebook,illustration:sourceImage})}),
 footer:strictSiteObject({section:sourceFooter,copyright:strictSiteObject({startYear:z.number().int().min(1990).max(9999).optional(),label:text(240)}),brandName:z.literal('Pinky Lamb')}),
 seo:strictSiteObject({seo:strictSiteObject({title:text(80),description:text(200),ogTitle:text(80),ogDescription:text(200),ogImage:sourceImage.refine(v=>!v.isDecorative)})})
};
export function groupSourceSchema(id){return sources[groupIdSchema.parse(id)];}
export const groupBaseSchema=strictSiteObject({groupId:groupIdSchema,dependencyHash:hashSchema,source:z.record(z.string(),z.unknown()),templateIdentity:z.literal(GROUP_TEMPLATE_ID)}).refine(v=>groupSourceSchema(v.groupId).safeParse(v.source).success);
export const localizedGroupSaveSchema=strictSiteObject({contractRevision:z.literal(1),expectedRevision:revisionSchema.nullable(),expectedSourceHash:hashSchema.optional(),expectedDependencyHash:hashSchema,content:z.unknown()});
export function parseLocalizedGroupSave(input,base){try{assertEnvelopeSize(input);const parsed=localizedGroupSaveSchema.parse(input);parsed.content=groupContentSchema(base.groupId).parse(parsed.content);mergeLocalizedGroup(base.groupId,base.source,parsed.content);return parsed;}catch(error){throw validationError(error);}}
