import {z} from 'zod';
import {strictSiteObject} from './site-settings.mjs';
import {hashSchema,revisionSchema,resourceIdSchema,assertEnvelopeSize} from './hero.mjs';
import {SECTION_TEMPLATE_ID,sectionIdSchema,sectionLocaleSchema,sectionBaseSchema,localizedWorkServicesContentSchema,localizedProjectedSectionSchema,mergeLocalizedSection,sourceWorkServicesSectionSchema} from './work-services-localization.mjs';
import {templateResourcesSchema} from './service-localization-records.mjs';
import {canonicalJson} from './draft.mjs';
import {ApiError} from './errors.mjs';
const identity={contractRevision:z.literal(1),draftId:z.literal('home-v3'),sectionId:sectionIdSchema,locale:sectionLocaleSchema};
const receipt={...identity,revision:revisionSchema.refine(n=>n>=1),dependencyHash:hashSchema,contentHash:hashSchema,updatedAt:z.string().datetime().length(24)};
export const localizedSectionReceiptSchema=strictSiteObject(receipt);
export const localizedSectionDraftSchema=strictSiteObject({...receipt,content:localizedWorkServicesContentSchema}).refine(v=>v.sectionId==='work'?Object.hasOwn(v.content,'loadMoreLabel'):!Object.hasOwn(v.content,'loadMoreLabel'));
export const localizedSectionReadSchema=strictSiteObject({...identity,base:sectionBaseSchema,draft:localizedSectionDraftSchema.nullable()}).refine(v=>v.sectionId===v.base.section.sectionId&&(!v.draft||(v.draft.sectionId===v.sectionId&&v.draft.locale===v.locale)));
export const sameSectionValue=(a,b)=>canonicalJson(a)===canonicalJson(b);
export function localizedSectionReceipt(value){return localizedSectionReceiptSchema.parse(Object.fromEntries(Object.keys(receipt).map(key=>[key,value[key]])));}
export function encodeLocalizedSection(value,updatedBy){resourceIdSchema.parse(updatedBy);const {content,...rest}=localizedSectionDraftSchema.parse(value);return assertEnvelopeSize({...rest,updatedBy,contentJson:JSON.stringify(content)});}
export function decodeLocalizedSection(stored,{sectionId,locale,hashCanonical,base}={}){try{assertEnvelopeSize(stored);const {contentJson,updatedBy,...rest}=stored;resourceIdSchema.parse(updatedBy);if(typeof contentJson!=='string'||Object.hasOwn(rest,'content'))throw Error();const result=localizedSectionDraftSchema.parse({...rest,content:JSON.parse(contentJson)});if(result.sectionId!==sectionId||result.locale!==locale||hashCanonical(result.content)!==result.contentHash)throw Error();if(base&&base.dependencyHash===result.dependencyHash)mergeLocalizedSection(base.section,result.content);return result;}catch{throw new ApiError('INTERNAL_ERROR');}}
export const localizedSectionQaSchema=strictSiteObject({contractRevision:z.literal(1),kind:z.literal('LOCALIZED_SECTION_QA'),sectionIndex:z.number().int().min(0).max(6),templateIdentity:z.literal(SECTION_TEMPLATE_ID),draft:localizedSectionDraftSchema,section:localizedProjectedSectionSchema,resources:templateResourcesSchema}).refine(v=>v.section.sectionId===v.draft.sectionId&&sameSectionValue(v.section,mergeLocalizedSection(sourceWorkServicesSectionSchema.parse(Object.fromEntries(Object.entries(v.section).filter(([key])=>!['eyebrow','loadMoreLabel'].includes(key)))),v.draft.content)));
export function parseSectionQa(input){const value=localizedSectionQaSchema.parse(input);assertEnvelopeSize(value);if(new TextEncoder().encode(JSON.stringify(value)).length>262144)throw new ApiError('PAYLOAD_TOO_LARGE');return value;}
