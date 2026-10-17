import {z} from 'zod';
import {strictSiteObject,plainText} from './site-settings.mjs';
import {hashSchema,revisionSchema,resourceIdSchema,assertEnvelopeSize} from './hero.mjs';
import {SERVICE_TEMPLATE_ID,serviceIdSchema,serviceLocaleSchema,serviceBaseSchema,sourceServiceSchema,localizedServiceContentSchema,mergeLocalizedService} from './service-localization.mjs';
import {projectQaResourceSchema} from './project-localization-records.mjs';
import {canonicalJson} from './draft.mjs';
import {ApiError} from './errors.mjs';
const identity={contractRevision:z.literal(1),draftId:z.literal('home-v3'),serviceId:serviceIdSchema,locale:serviceLocaleSchema};
const receipt={...identity,revision:revisionSchema.refine(n=>n>=1),dependencyHash:hashSchema,contentHash:hashSchema,updatedAt:z.string().datetime().length(24)};
export const localizedServiceReceiptSchema=strictSiteObject(receipt);
export const localizedServiceDraftSchema=strictSiteObject({...receipt,content:localizedServiceContentSchema});
export const localizedServiceReadSchema=strictSiteObject({...identity,base:serviceBaseSchema,draft:localizedServiceDraftSchema.nullable()}).refine(v=>v.serviceId===v.base.service.id&&(!v.draft||(v.draft.serviceId===v.serviceId&&v.draft.locale===v.locale)));
const metadata=strictSiteObject({revision:revisionSchema.refine(n=>n>=1),dependencyHash:hashSchema,contentHash:hashSchema,updatedAt:z.string().datetime().length(24),stale:z.boolean()}).nullable();
export const localizedServiceStatusSchema=strictSiteObject({contractRevision:z.literal(1),draftId:z.literal('home-v3'),services:z.array(strictSiteObject({serviceId:serviceIdSchema,sourceTitle:plainText(120),isVisible:z.boolean(),locales:strictSiteObject({en:metadata,vi:metadata,ja:metadata})})).max(12)}).refine(v=>new Set(v.services.map(s=>s.serviceId)).size===v.services.length);
export const sameServiceValue=(a,b)=>canonicalJson(a)===canonicalJson(b);
export function localizedServiceReceipt(value){return localizedServiceReceiptSchema.parse(Object.fromEntries(Object.keys(receipt).map(key=>[key,value[key]])));}
export function encodeLocalizedService(value,updatedBy){resourceIdSchema.parse(updatedBy);const {content,...rest}=localizedServiceDraftSchema.parse(value);return assertEnvelopeSize({...rest,updatedBy,contentJson:JSON.stringify(content)});}
export function decodeLocalizedService(stored,{serviceId,locale,hashCanonical,base}={}){try{assertEnvelopeSize(stored);const {contentJson,updatedBy,...rest}=stored;resourceIdSchema.parse(updatedBy);if(typeof contentJson!=='string'||Object.hasOwn(rest,'content'))throw Error();const result=localizedServiceDraftSchema.parse({...rest,content:JSON.parse(contentJson)});if(result.serviceId!==serviceId||result.locale!==locale||hashCanonical(result.content)!==result.contentHash)throw Error();if(base&&base.dependencyHash===result.dependencyHash)mergeLocalizedService(base.service,result.content);return result;}catch{throw new ApiError('INTERNAL_ERROR');}}
export const templateResourcesSchema=z.array(projectQaResourceSchema).length(6).superRefine((resources,ctx)=>{const ids=['styles','abril-fatface-400','montserrat-400','montserrat-600','montserrat-700','montserrat-800'];if(new Set(resources.map(r=>r.id)).size!==6||ids.some(id=>!resources.some(r=>r.id===id))||resources.some(r=>r.id==='styles'?r.mimeType!=='text/css'||r.path!=='styles.css':r.mimeType!=='font/woff'||r.path!==`assets/${r.id}.woff`))ctx.addIssue({code:'custom',message:'Invalid template resource closure'});});
export const localizedServiceQaSchema=strictSiteObject({contractRevision:z.literal(1),kind:z.literal('LOCALIZED_SERVICE_QA'),serviceIndex:z.number().int().min(0).max(11),templateIdentity:z.literal(SERVICE_TEMPLATE_ID),draft:localizedServiceDraftSchema,service:sourceServiceSchema,resources:templateResourcesSchema}).refine(v=>v.service.id===v.draft.serviceId&&sameServiceValue(v.service,mergeLocalizedService(v.service,v.draft.content)));
export function parseServiceQa(input){const value=localizedServiceQaSchema.parse(input);assertEnvelopeSize(value);if(new TextEncoder().encode(JSON.stringify(value)).length>262144)throw new ApiError('PAYLOAD_TOO_LARGE');return value;}
