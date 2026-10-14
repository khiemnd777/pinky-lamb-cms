import {z} from 'zod';
import {ApiError,validationError} from './errors.mjs';
import {resourceIdSchema,hashSchema} from './hero.mjs';
import {plainText} from './site-settings.mjs';

const wellFormed=value=>!/[\uD800-\uDFFF]/u.test(value);
/** Descriptor inspection precedes Zod copying and injected hash callbacks.
 * Raw duplicate JSON keys remain a separate transport rejection requirement.
 */
function plainJson(value,ancestors=new Set(),depth=0){
  if(depth>64)return false;
  if(value===null || typeof value==='boolean')return true;
  if(typeof value==='string')return wellFormed(value);
  if(typeof value==='number')return Number.isFinite(value);
  if(typeof value!=='object' || ancestors.has(value))return false;
  const array=Array.isArray(value);
  if(Object.getPrototypeOf(value)!==(array?Array.prototype:Object.prototype))return false;
  const keys=Reflect.ownKeys(value),descriptors=Object.getOwnPropertyDescriptors(value);
  const length=array?descriptors.length?.value:0;
  if(array && (!Number.isSafeInteger(length) || length<0 || keys.length!==length+1))return false;
  ancestors.add(value);
  for(const key of keys){
    if(array && key==='length')continue;
    if(typeof key!=='string' || !wellFormed(key)){ancestors.delete(value);return false;}
    const d=descriptors[key];
    if(!d.enumerable || !Object.hasOwn(d,'value') ||
      (array && (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key)>=length)) ||
      !plainJson(d.value,ancestors,depth+1)){
      ancestors.delete(value);return false;
    }
  }
  ancestors.delete(value);return true;
}
export const strictMediaV2JsonSchema=z.unknown().refine(value=>{
  try{return plainJson(value);}catch{return false;}
},'Giá trị không hợp lệ.');
const exact=shape=>strictMediaV2JsonSchema.pipe(z.strictObject(shape));
// Exact length also rejects a final newline accepted by a JavaScript $ anchor.
const digestSchema=hashSchema.refine(value=>value.length===64);

/** Keep submitted whitespace, case and Unicode composition. String length is
 * UTF-16 units through the baseline primitive, not Zod code-point counting.
 */
export const mediaMetadataV2Schema=exact({name:plainText(240).refine(wellFormed)});
/** Server authorization supplies the persisted uploader; parsing is not Auth. */
export const uploadActorsV2Schema=exact({uploaderUid:resourceIdSchema});

function parseMetadata(input){
  try{return mediaMetadataV2Schema.parse(input);}catch(error){throw validationError(error);}
}
export function parseMediaMetadataV2(input){return parseMetadata(input);}
export function metadataDigestProjectionV2(metadata){return parseMetadata(metadata);}

function hashCapability(options){
  try{
    if(options===null || typeof options!=='object' || Object.getPrototypeOf(options)!==Object.prototype)throw new ApiError('INTERNAL_ERROR');
    const keys=Reflect.ownKeys(options);
    if(keys.length!==1 || keys[0]!=='hashCanonical')throw new ApiError('INTERNAL_ERROR');
    const descriptor=Object.getOwnPropertyDescriptor(options,'hashCanonical');
    if(!descriptor?.enumerable || !Object.hasOwn(descriptor,'value') || typeof descriptor.value!=='function')throw new ApiError('INTERNAL_ERROR');
    return descriptor.value;
  }catch{throw new ApiError('INTERNAL_ERROR');}
}
/** Trusted server capability computes SHA256(UTF8(canonicalJson({name}))) with
 * no newline and lowercase64 hex. Actors/request/time are outside this digest.
 * This pure contract cannot authenticate the algorithm, uploader or provenance.
 */
export function hashMediaMetadataV2(input,options){
  const hashCanonical=hashCapability(options);
  // Zod produces an isolated DATA record before the capability can mutate input.
  const projection=metadataDigestProjectionV2(input);
  try{return {metadataDigest:digestSchema.parse(hashCanonical(projection))};}
  catch{throw new ApiError('INTERNAL_ERROR');}
}
