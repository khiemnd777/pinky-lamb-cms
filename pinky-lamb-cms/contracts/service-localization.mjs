import {z} from 'zod';
import {plainText,stableIdSchema,strictSiteObject} from './site-settings.mjs';
import {revisionSchema,hashSchema,assertEnvelopeSize} from './hero.mjs';
import {ApiError,validationError} from './errors.mjs';
export const SERVICE_LOCALES=Object.freeze(['en','vi','ja']);
export const SERVICE_TEMPLATE_ID='pinky-lamb-static-20261010-p3-v1';
export const serviceLocaleSchema=z.enum(SERVICE_LOCALES),serviceIdSchema=stableIdSchema;
export const localizedServiceContentSchema=strictSiteObject({title:plainText(120),subtitle:plainText(120),summary:plainText(1000,{multiline:true}),scope:z.array(plainText(160)).max(12)});
export const sourceServiceSchema=strictSiteObject({id:serviceIdSchema,title:plainText(120),titleVi:plainText(120),summary:plainText(1000,{multiline:true}),scope:z.array(plainText(160)).max(12),isVisible:z.boolean()});
export const serviceBaseSchema=strictSiteObject({dependencyHash:hashSchema,serviceIndex:z.number().int().min(0).max(11),service:sourceServiceSchema,templateIdentity:z.literal(SERVICE_TEMPLATE_ID)});
export const localizedServiceSaveSchema=strictSiteObject({contractRevision:z.literal(1),expectedRevision:revisionSchema.nullable(),expectedSourceHash:hashSchema.optional(),expectedDependencyHash:hashSchema,content:localizedServiceContentSchema});
export function mergeLocalizedService(source,input){const service=sourceServiceSchema.parse(source),content=localizedServiceContentSchema.parse(input);return sourceServiceSchema.parse({...service,title:content.title,titleVi:content.subtitle,summary:content.summary,scope:content.scope});}
export function parseLocalizedServiceSave(input,base){try{assertEnvelopeSize(input);if(new TextEncoder().encode(JSON.stringify(input)).length>32768)throw new ApiError('PAYLOAD_TOO_LARGE');const parsed=localizedServiceSaveSchema.parse(input);mergeLocalizedService(base.service,parsed.content);return parsed;}catch(error){throw validationError(error);}}
