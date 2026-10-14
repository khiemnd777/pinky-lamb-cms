import {z} from 'zod';
import {ApiError,validationError} from './errors.mjs';
import {createHeroSchemas,validateContent,revisionSchema,resourceIdSchema,assertEnvelopeSize,MAX_ENVELOPE_BYTES} from './hero.mjs';

export const utcTimestampSchema=z.iso.datetime().refine(value=>value.endsWith('Z'));
const metadata={revision:revisionSchema,updatedBy:resourceIdSchema,updatedAt:utcTimestampSchema,lastEventId:resourceIdSchema};
export const storedDraftSchema=z.strictObject({contentJson:z.string(),...metadata});

/** Shared deterministic definition for API, fixture verification and export. */
export function canonicalJson(value){
 if(Array.isArray(value))return `[${value.map(canonicalJson).join(',')}]`;
 if(value!==null && typeof value==='object'){
  if(![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new ApiError('VALIDATION_ERROR');
  return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
 }
 if(value!==null && !['string','boolean','number'].includes(typeof value))throw new ApiError('VALIDATION_ERROR');
 if(typeof value==='number' && !Number.isFinite(value))throw new ApiError('VALIDATION_ERROR');
 return JSON.stringify(value);
}

export function encodeStoredContent(content,{catalog}){
 let validated;
 try{validated=validateContent(content,catalog);}catch(error){throw validationError(error);}
 assertEnvelopeSize(validated);
 const contentJson=JSON.stringify(validated);
 assertEnvelopeSize({contentJson});
 return contentJson;
}

export function decodeStoredContent(contentJson,{catalog}){
 try{
  if(typeof contentJson!=='string' || new TextEncoder().encode(contentJson).length>MAX_ENVELOPE_BYTES)throw new Error('Invalid stored content');
  assertEnvelopeSize({contentJson});
  const content=validateContent(JSON.parse(contentJson),catalog);
  assertEnvelopeSize(content);
  return content;
 }catch{throw new ApiError('INTERNAL_ERROR');}
}

export function decodeStoredDraft(value,{catalog}){
 try{
  assertEnvelopeSize(value);
  const {contentJson,...metadata}=storedDraftSchema.parse(value);
  const result={content:decodeStoredContent(contentJson,{catalog}),...metadata};
  assertEnvelopeSize(result);
  return result;
 }catch{throw new ApiError('INTERNAL_ERROR');}
}

export function parseSaveRequest(value,{catalog}){
 const {patchSchema}=createHeroSchemas(catalog);
 try{return z.strictObject({expectedRevision:revisionSchema,patch:patchSchema}).parse(value);}
 catch(error){throw validationError(error);}
}
