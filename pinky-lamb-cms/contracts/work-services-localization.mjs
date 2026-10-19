import {z} from 'zod';
import {plainText,stableIdSchema,strictSiteObject} from './site-settings.mjs';
import {revisionSchema,hashSchema,assertEnvelopeSize} from './hero.mjs';
import {ApiError,validationError} from './errors.mjs';
export const SECTION_LOCALES=Object.freeze(['en','vi','ja']),SECTION_TEMPLATE_ID='pinky-lamb-static-20261010-p3-v1';
export const sectionLocaleSchema=z.enum(SECTION_LOCALES),sectionIdSchema=z.enum(['work','services']);
const run=strictSiteObject({text:plainText(100,{visible:false}),emphasis:z.enum(['NONE','STRONG','ACCENT']).optional()});
export const localizedSectionHeadingSchema=strictSiteObject({lines:z.array(z.array(run).min(1).max(8).refine(runs=>runs.map(r=>r.text).join('').trim().length>0&&runs.reduce((n,r)=>n+r.text.length,0)<=100)).min(1).max(3)});
const commonContent={eyebrow:plainText(120),heading:localizedSectionHeadingSchema,intro:plainText(4000,{multiline:true})};
export const localizedWorkContentSchema=strictSiteObject({...commonContent,loadMoreLabel:plainText(80)}),localizedServicesContentSchema=strictSiteObject(commonContent);
export const localizedWorkServicesContentSchema=z.union([localizedWorkContentSchema,localizedServicesContentSchema]);
const ids=max=>z.array(stableIdSchema).max(max).refine(v=>new Set(v).size===v.length);
const commonSource={isVisible:z.boolean(),heading:localizedSectionHeadingSchema,intro:plainText(4000,{multiline:true})};
const action=z.union([strictSiteObject({kind:z.literal('SECTION'),sectionId:stableIdSchema,label:plainText(80)}),strictSiteObject({kind:z.literal('SHOWREEL'),label:plainText(80)}),strictSiteObject({kind:z.literal('CREDENTIAL'),assetId:stableIdSchema,label:plainText(80)})]);
const workShape={...commonSource,kind:z.literal('WORK'),sectionId:z.literal('work'),variant:z.literal('work-grid'),featuredIds:ids(24),initialVisibleCount:z.number().int().min(1).max(24),filterLabels:strictSiteObject({all:plainText(80),EVENTS:plainText(80),FILM:plainText(80),COMMUNICATIONS:plainText(80)})};
const servicesShape={...commonSource,kind:z.literal('SERVICES'),sectionId:z.literal('services'),variant:z.literal('services-accordion'),serviceOrder:ids(12),action};
export const sourceWorkSectionSchema=strictSiteObject(workShape),sourceServicesSectionSchema=strictSiteObject(servicesShape);
export const sourceWorkServicesSectionSchema=z.union([sourceWorkSectionSchema,sourceServicesSectionSchema]);
export const sectionBaseSchema=strictSiteObject({dependencyHash:hashSchema,sectionIndex:z.number().int().min(0).max(6),section:sourceWorkServicesSectionSchema,templateIdentity:z.literal(SECTION_TEMPLATE_ID)});
export const localizedSectionSaveSchema=strictSiteObject({contractRevision:z.literal(1),expectedRevision:revisionSchema.nullable(),expectedSourceHash:hashSchema.optional(),expectedDependencyHash:hashSchema,content:localizedWorkServicesContentSchema});
export const localizedProjectedSectionSchema=z.union([strictSiteObject({...workShape,eyebrow:plainText(120),loadMoreLabel:plainText(80)}),strictSiteObject({...servicesShape,eyebrow:plainText(120)})]);
export function mergeLocalizedSection(input,copy){const section=sourceWorkServicesSectionSchema.parse(input),content=(section.sectionId==='work'?localizedWorkContentSchema:localizedServicesContentSchema).parse(copy);return localizedProjectedSectionSchema.parse({...section,...content,heading:section.heading});}
export function parseLocalizedSectionSave(input,base){try{assertEnvelopeSize(input);if(new TextEncoder().encode(JSON.stringify(input)).length>32768)throw new ApiError('PAYLOAD_TOO_LARGE');const value=localizedSectionSaveSchema.parse(input);mergeLocalizedSection(base.section,value.content);return value;}catch(error){throw validationError(error);}}
