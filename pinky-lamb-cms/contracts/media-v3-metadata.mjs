import {z} from 'zod';
import {ApiError,validationError} from './errors.mjs';
import {resourceIdSchema,hashSchema} from './hero.mjs';
import {plainText} from './site-settings.mjs';

const wellFormed=value=>!/[\uD800-\uDFFF]/u.test(value);
/** Validate descriptors before any parser/hash can invoke an input accessor. */
function plainJson(value,ancestors=new Set(),depth=0){
  if(depth>64)return false;
  if(value===null || typeof value==='boolean')return true;
  if(typeof value==='string')return wellFormed(value);
  if(typeof value==='number')return Number.isFinite(value);
  if(typeof value!=='object' || ancestors.has(value))return false;
  const array=Array.isArray(value);
  if(Object.getPrototypeOf(value)!==(array?Array.prototype:Object.prototype))return false;
  const keys=Reflect.ownKeys(value),descriptors=Object.getOwnPropertyDescriptors(value);
  if(array && keys.length!==value.length+1)return false;
  ancestors.add(value);
  for(const key of keys){
    if(array && key==='length')continue;
    if(typeof key!=='string' || !wellFormed(key)){ancestors.delete(value);return false;}
    const d=descriptors[key];
    if(!d.enumerable || !Object.hasOwn(d,'value') || (array && (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key)>=value.length)) || !plainJson(d.value,ancestors,depth+1)){
      ancestors.delete(value);return false;
    }
  }
  ancestors.delete(value);return true;
}
export const strictMediaV3JsonSchema=z.unknown().refine(value=>plainJson(value),'Giá trị không hợp lệ.');
const exact=shape=>strictMediaV3JsonSchema.pipe(z.strictObject(shape));
const utf8Bytes=value=>new TextEncoder().encode(value).length;
const text=(max,multiline=false)=>plainText(max,{multiline}).refine(wellFormed);
const unique=values=>new Set(values).size===values.length;

export const mediaMetadataSchema=exact({
  name:text(240),
  rights:exact({basis:text(1000,true),evidence:exact({
    text:text(1000,true).refine(value=>utf8Bytes(value)<=4096),
    sourceRefs:z.array(resourceIdSchema).max(8).refine(unique)
  })})
});
export const uploadActorsSchema=exact({uploaderUid:resourceIdSchema,rightsEvidenceSubmittedBy:resourceIdSchema});
export const rightsReferenceAllowlistSchema=exact({schemaVersion:z.literal(1),allowedSourceRefs:z.array(resourceIdSchema).max(200).refine(values=>unique(values) && values.every((value,index)=>index===0 || values[index-1]<value))});
const metadataContextSchema=exact({referenceAllowlist:rightsReferenceAllowlistSchema});

function parse(schema,value,code){
  try{return schema.parse(value);}catch(error){if(code)throw new ApiError(code);throw validationError(error);}
}
/** Server owner must verify allowlist provenance before supplying this context.
 * Structural parsing neither authenticates its origin nor accepts a trust flag.
 */
export function parseMediaMetadata(input,options){
  const context=parse(metadataContextSchema,options,'INTERNAL_ERROR');
  const metadata=parse(mediaMetadataSchema,input);
  if(metadata.rights.evidence.sourceRefs.some(id=>!context.referenceAllowlist.allowedSourceRefs.includes(id)))throw new ApiError('VALIDATION_ERROR');
  return metadata;
}
export function metadataDigestProjection(metadata){return parse(mediaMetadataSchema,metadata);}
export function evidenceDigestProjection(metadata,actors){
  const parsed=metadataDigestProjection(metadata),authority=parse(uploadActorsSchema,actors,'INTERNAL_ERROR');
  const projection={rights:parsed.rights,rightsEvidenceSubmittedBy:authority.rightsEvidenceSubmittedBy};
  // Actual outer escaping and actor identity count. Individual field maxima need
  // not fit together; never reserve, truncate or normalize the declaration.
  if(utf8Bytes(JSON.stringify(projection))>4096)throw new ApiError('PAYLOAD_TOO_LARGE');
  return projection;
}
function hashOptions(options){
  if(options===null || typeof options!=='object' || Object.getPrototypeOf(options)!==Object.prototype)throw new ApiError('INTERNAL_ERROR');
  const required=['actors','referenceAllowlist','hashCanonical'],keys=Reflect.ownKeys(options);
  if(keys.length!==required.length || keys.some(key=>!required.includes(key)))throw new ApiError('INTERNAL_ERROR');
  const result={};
  for(const key of required){
    const d=Object.getOwnPropertyDescriptor(options,key);
    if(!d || !d.enumerable || !Object.hasOwn(d,'value'))throw new ApiError('INTERNAL_ERROR');
    result[key]=d.value;
  }
  if(typeof result.hashCanonical!=='function')throw new ApiError('INTERNAL_ERROR');
  return result;
}
/** Injected capability computes SHA256(UTF8 unchanged canonicalJson), lowercase
 * hex, without newline. It is not a client-selected algorithm or authority.
 */
export function hashMediaMetadata(input,options){
  const context=hashOptions(options),actors=parse(uploadActorsSchema,context.actors,'INTERNAL_ERROR');
  const metadata=parseMediaMetadata(input,{referenceAllowlist:context.referenceAllowlist});
  const md=metadataDigestProjection(metadata),ev=evidenceDigestProjection(metadata,actors);
  try{return {metadataDigest:hashSchema.parse(context.hashCanonical(md)),evidenceSha256:hashSchema.parse(context.hashCanonical(ev))};}
  catch{throw new ApiError('INTERNAL_ERROR');}
}
