import {ApiError} from './errors.mjs';
import {validateContent} from './hero.mjs';
import {encodeStoredContent,decodeStoredContent} from './draft.mjs';
import {validateSiteContent} from './site.mjs';
import {encodeSiteStoredContent,decodeSiteStoredContent} from './site-draft.mjs';
import {z} from 'zod';
import {strictSiteObject} from './site-settings.mjs';

const descriptorSchema=strictSiteObject({draftId:z.string(),schemaVersion:z.number().int(),templateVersion:z.string()});

/** Resource and template are part of the version, never inferred from payload. */
export function resolveContentVersion(descriptor){
  let value;try{value=descriptorSchema.parse(descriptor);}catch{throw new ApiError('VALIDATION_ERROR');}
  if(value.draftId==='home' && value.schemaVersion===1 && value.templateVersion==='m1-hero-split-v1')return 'M1';
  if(value.draftId==='home-v2' && value.schemaVersion===2 && value.templateVersion==='m2-site-baseline-v1')return 'M2';
  throw new ApiError('VALIDATION_ERROR');
}
export function validateVersionedContent(value,descriptor,context){return resolveContentVersion(descriptor)==='M1'?validateContent(value,context.catalog):validateSiteContent(value,context);}
export function encodeVersionedContent(value,descriptor,context){return resolveContentVersion(descriptor)==='M1'?encodeStoredContent(value,context):encodeSiteStoredContent(value,context);}
export function decodeVersionedContent(contentJson,descriptor,context){
  try{return resolveContentVersion(descriptor)==='M1'?decodeStoredContent(contentJson,context):decodeSiteStoredContent(contentJson,context);}catch{throw new ApiError('INTERNAL_ERROR');}
}
