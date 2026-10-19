import {z} from 'zod';
import {plainText} from './site-settings.mjs';
import {strictMediaV2JsonSchema} from './media-v3-metadata-v2.mjs';
import {siteMediaEntrySchema} from './site-draft.mjs';
import {canonicalJson} from './draft.mjs';
import {hashSchema,resourceIdSchema,revisionSchema} from './hero.mjs';

// Structural contracts only: no Auth, producer/Storage proof, eligibility or builder.
// The LEGACY import preserves historical fields; it is not an active Rights gate.
const exact=shape=>strictMediaV2JsonSchema.pipe(z.strictObject(shape));
const digestSchema=hashSchema.refine(value=>value.length===64);
export const V2_DESCRIPTOR=Object.freeze({draftId:'home-v3',schemaVersion:3,templateVersion:'m3-site-media-v1',contractRevision:2});
export const V2_CAPS=Object.freeze({references:64,derivatives:256,sourceProofs:61,sourceRefs:600,max_processing_attempts:2});
export const V2_BUDGET_PROFILE=Object.freeze({storedDraft:262144,storedSnapshot:262144,privateJSON:262144,qaEnvelopeVersion3:2097152,qaEnvelopeLegacy:1048576});
export const V2_MANIFEST_ORDER=Object.freeze({entries:'source, asset.id (LEGACY) or asset.assetId (MEDIA_VERSION), ASCII ascending',derivatives:'role ASCII ascending, IMAGE targetWidth numeric ascending, PDF_PAGE pageNumber numeric ascending, key ASCII ascending',content:'preserve every array order and exact string contents'});
const MiB=1024**2;
export const V2_MEDIA_LIMITS=Object.freeze({
  IMAGE:Object.freeze({inputBytes:10*MiB,outputBytes:12*MiB,inputEdge:8192,inputPixels:40000000,outputWidth:1920,outputHeight:8192,widths:Object.freeze([320,960,1920])}),
  PDF:Object.freeze({inputBytes:25*MiB,outputBytes:96*MiB,downloadBytes:64*MiB,pageBytes:64*MiB,pages:48,pageEdge:1600}),
  VIDEO:Object.freeze({inputBytes:128*MiB,outputBytes:49*MiB,videoBytes:48*MiB,posterBytes:MiB,width:1280,height:720,durationSeconds:300})
});
const assetIdSchema=z.string().regex(/^[A-Za-z0-9_-]{1,100}$(?![\s\S])/);
const kindSchema=z.enum(['IMAGE','PDF','VIDEO']);
const positiveInteger=max=>z.number().int().min(1).max(max);
const finiteDuration=z.number().finite().positive().max(300);
const focalPointSchema=exact({x:z.number().finite().min(0).max(1),y:z.number().finite().min(0).max(1)});
const imageFields={assetId:assetIdSchema,alt:plainText(300,{empty:true,visible:false}),isDecorative:z.boolean(),focalPoint:focalPointSchema.optional()};
const validAlt=value=>value.isDecorative?value.alt==='':value.alt.trim().length>0;
export const imageReferenceV2Schema=exact(imageFields).refine(validAlt);
export const identityReferenceV2Schema=exact({assetId:assetIdSchema});
export const videoPosterReferenceV2Schema=exact({...imageFields,derivativeRole:z.literal('POSTER')}).refine(validAlt);

const roleSchema=z.enum(['IMAGE','PDF_DOWNLOAD','PDF_PAGE','VIDEO','POSTER']);
const derivativeFields={
  key:z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$(?![\s\S])/),role:roleSchema,
  mimeType:z.enum(['image/webp','application/pdf','video/mp4']),sizeBytes:positiveInteger(96*MiB),sha256:digestSchema,
  // Generations are opaque decimal strings; conversion to Number loses identity.
  generation:z.string().regex(/^[1-9][0-9]{0,127}$(?![\s\S])/),
  width:positiveInteger(8192).optional(),height:positiveInteger(8192).optional(),
  targetWidth:z.union([z.literal(320),z.literal(960),z.literal(1920)]).optional(),
  durationSeconds:finiteDuration.optional(),pageNumber:positiveInteger(48).optional()
};
function validDerivative(value){
  const {role,width,height,targetWidth,durationSeconds,pageNumber,mimeType,sizeBytes}=value;
  // Other roles must omit targetWidth entirely, even an explicit undefined.
  if(role!=='IMAGE' && Object.hasOwn(value,'targetWidth'))return false;
  if(role==='PDF_DOWNLOAD')return mimeType==='application/pdf' && sizeBytes<=64*MiB && width===undefined && height===undefined && durationSeconds===undefined && pageNumber===undefined;
  if(width===undefined || height===undefined)return false;
  if(role==='VIDEO')return mimeType==='video/mp4' && sizeBytes<=48*MiB && width<=1280 && height<=720 && durationSeconds!==undefined && pageNumber===undefined;
  if(mimeType!=='image/webp' || durationSeconds!==undefined)return false;
  if(role==='PDF_PAGE')return pageNumber!==undefined && width<=1600 && height<=1600 && width*height<=4000000 && sizeBytes<=32*MiB;
  if(pageNumber!==undefined)return false;
  if(role==='POSTER')return width<=1280 && height<=720 && sizeBytes<=MiB;
  return [320,960,1920].includes(targetWidth) && value.key===`image-${targetWidth}` && width<=1920 && height<=8192 && width*height<=40000000 && sizeBytes<=12*MiB;
}
export const derivativeV2Schema=exact(derivativeFields).refine(validDerivative);
const immutableFields={contractRevision:z.literal(2),assetId:assetIdSchema,kind:kindSchema,originalSha256:digestSchema,originalSizeBytes:positiveInteger(128*MiB),processingRecipeSha256:digestSchema,toolSetSha256:digestSchema,derivativeSetSha256:digestSchema,metadataDigest:digestSchema,derivatives:z.array(derivativeV2Schema).min(1).max(256)};
const serverFields={status:z.literal('READY'),archived:z.boolean(),revision:revisionSchema,uploaderUid:resourceIdSchema};
const metadataByKind={
  // IMAGE metadata identifies oriented original geometry, not a rendered bucket.
  IMAGE:{kind:z.literal('IMAGE'),width:positiveInteger(8192),height:positiveInteger(8192)},
  PDF:{kind:z.literal('PDF'),pageCount:positiveInteger(48)},
  VIDEO:{kind:z.literal('VIDEO'),width:positiveInteger(1280),height:positiveInteger(720),durationSeconds:finiteDuration}
};
const uniqueKeys=values=>new Set(values.map(value=>value.key)).size===values.length;
function validMediaOutputs(value){
  const cap=V2_MEDIA_LIMITS[value.kind];
  if(value.originalSizeBytes>cap.inputBytes || !uniqueKeys(value.derivatives) || value.derivatives.reduce((sum,d)=>sum+d.sizeBytes,0)>cap.outputBytes)return false;
  if(value.kind==='IMAGE'){
    if(value.width*value.height>cap.inputPixels || value.derivatives.length!==3)return false;
    const targets=new Set();
    return value.derivatives.every(d=>{
      if(d.role!=='IMAGE' || !cap.widths.includes(d.targetWidth) || targets.has(d.targetWidth))return false;
      targets.add(d.targetWidth);
      const expectedWidth=Math.min(d.targetWidth,value.width),expectedHeight=Math.max(1,Math.round(value.height*expectedWidth/value.width));
      return d.width===expectedWidth && d.height===expectedHeight && d.width<=value.width && d.height<=value.height;
    });
  }
  if(value.kind==='PDF'){
    const pages=value.derivatives.filter(d=>d.role==='PDF_PAGE'),downloads=value.derivatives.filter(d=>d.role==='PDF_DOWNLOAD');
    if(downloads.length!==1 || pages.length!==value.pageCount || value.derivatives.length!==pages.length+1 || pages.reduce((sum,d)=>sum+d.sizeBytes,0)>cap.pageBytes)return false;
    const numbers=new Set(pages.map(d=>d.pageNumber));
    return numbers.size===value.pageCount && Array.from({length:value.pageCount},(_,i)=>i+1).every(number=>numbers.has(number));
  }
  const videos=value.derivatives.filter(d=>d.role==='VIDEO'),posters=value.derivatives.filter(d=>d.role==='POSTER');
  return value.derivatives.length===2 && videos.length===1 && posters.length===1 && videos[0].width===value.width && videos[0].height===value.height && videos[0].durationSeconds===value.durationSeconds && posters[0].width===value.width && posters[0].height===value.height;
}
function mediaVariant(kind,server){return exact({...immutableFields,...(server?serverFields:{}),...metadataByKind[kind]}).refine(validMediaOutputs);}
export const readyVersionV2Schema=strictMediaV2JsonSchema.pipe(z.union(['IMAGE','PDF','VIDEO'].map(kind=>mediaVariant(kind,true))));
export const immutableManifestAssetV2Schema=strictMediaV2JsonSchema.pipe(z.union(['IMAGE','PDF','VIDEO'].map(kind=>mediaVariant(kind,false))));
const bindingFields={assetId:assetIdSchema,kind:kindSchema,originalSha256:digestSchema,derivativeSetSha256:digestSchema,processingRecipeSha256:digestSchema,toolSetSha256:digestSchema};
export const mediaBindingV2Schema=exact(bindingFields);
export function bindingFromReadyVersionV2(input){
  const value=readyVersionV2Schema.parse(input);
  return mediaBindingV2Schema.parse(Object.fromEntries(Object.keys(bindingFields).map(key=>[key,value[key]])));
}
export function safeMetadataFromReadyVersionV2(input){
  const value=readyVersionV2Schema.parse(input);
  const result={contractRevision:2,assetId:value.assetId,kind:value.kind,status:value.status,archived:value.archived,revision:value.revision};
  for(const key of ['width','height','durationSeconds','pageCount'])if(Object.hasOwn(value,key))result[key]=value[key];
  return result;
}
export const mediaV2ContextSchema=exact({legacyCatalog:z.array(siteMediaEntrySchema).max(64),readyVersions:z.array(readyVersionV2Schema).max(64)}).refine(value=>{
  const ids=[...value.legacyCatalog.map(asset=>asset.id),...value.readyVersions.map(asset=>asset.assetId)];
  return new Set(ids).size===ids.length && ['brand-diagonal','favicon'].every(id=>value.legacyCatalog.some(asset=>asset.id===id && asset.kind==='IMAGE'));
});
export const v2MediaManifestEntrySchema=strictMediaV2JsonSchema.pipe(z.union([
  exact({source:z.literal('LEGACY'),asset:siteMediaEntrySchema}),
  exact({source:z.literal('MEDIA_VERSION'),asset:immutableManifestAssetV2Schema})
]));
const compare=(a,b)=>a<b?-1:a>b?1:0;
const effectiveId=entry=>entry.source==='LEGACY'?entry.asset.id:entry.asset.assetId;
const compareEntries=(a,b)=>compare(a.source,b.source)||compare(effectiveId(a),effectiveId(b));
const compareDerivatives=(a,b)=>compare(a.role,b.role)||
  (a.role==='IMAGE'?a.targetWidth-b.targetWidth:a.role==='PDF_PAGE'?a.pageNumber-b.pageNumber:0)||compare(a.key,b.key);
export const v2MediaManifestSchema=strictMediaV2JsonSchema.pipe(z.array(v2MediaManifestEntrySchema).min(1).max(64)).refine(values=>{
  const ids=values.map(effectiveId);
  return new Set(ids).size===ids.length && values.reduce((sum,entry)=>sum+(entry.source==='MEDIA_VERSION'?entry.asset.derivatives.length:0),0)<=256 &&
    values.every((entry,index)=>(index===0 || compareEntries(values[index-1],entry)<0) &&
      (entry.source==='LEGACY' || entry.asset.derivatives.every((d,index)=>index===0 || compareDerivatives(entry.asset.derivatives[index-1],d)<0)));
});

/** Validate entries, preserve all present fields, and sort a fresh complete
 * projection. Kind completeness/aggregate geometry belongs to version schemas;
 * this helper alone does not authenticate READY, custody or source provenance.
 */
export function normalizedDerivativeProjectionV2(inputDerivatives){
  const entries=strictMediaV2JsonSchema.pipe(z.array(derivativeV2Schema).min(1).max(256)).refine(uniqueKeys).parse(inputDerivatives);
  return entries.map(value=>Object.fromEntries(Object.keys(derivativeFields).filter(key=>Object.hasOwn(value,key)).map(key=>[key,value[key]]))).sort(compareDerivatives);
}
export function immutableManifestAssetFromReadyVersionV2(inputReadyVersion){
  const value=readyVersionV2Schema.parse(inputReadyVersion);
  const result=Object.fromEntries([...Object.keys(immutableFields),...Object.keys(metadataByKind[value.kind])].map(key=>[key,value[key]]));
  result.derivatives=normalizedDerivativeProjectionV2(value.derivatives);
  return immutableManifestAssetV2Schema.parse(result);
}
function dataCopy(value){
  if(value===null || typeof value!=='object')return value;
  const descriptors=Object.getOwnPropertyDescriptors(value);
  if(Array.isArray(value))return Array.from({length:descriptors.length.value},(_,index)=>dataCopy(descriptors[String(index)].value));
  return Object.fromEntries(Object.keys(descriptors).map(key=>[key,dataCopy(descriptors[key].value)]));
}
export function canonicalMediaV2Json(value){
  if(!strictMediaV2JsonSchema.safeParse(value).success)throw new TypeError('INVALID_BINDING');
  // Descriptor DATA capture avoids invoking property getters during serialization.
  return canonicalJson(dataCopy(value));
}
const diagnosticCodes=['UNKNOWN_ASSET','KIND_MISMATCH','POSTER_VERSION_MISMATCH','PDF_PAGE_OUT_OF_BOUNDS','MEDIA_NOT_READY','MEDIA_ARCHIVED','REFERENCE_LIMIT','DERIVATIVE_LIMIT','BYTE_LIMIT','INVALID_BINDING'];
const projectIndex='(?:[0-9]|1[0-9]|2[0-3])',galleryIndex='(?:[0-9]|1[01])';
const slotPath=new RegExp(`^(?:hero\\.image|seo\\.ogImage|settings\\.(?:brand\\.logo|credential|showreel\\.(?:assetId|poster)|contact\\.illustration|clientLogos\\.${galleryIndex}\\.image)|projects\\.${projectIndex}\\.(?:cover|gallery\\.${galleryIndex}|publicCredentialPage)|sections\\.[0-6]\\.(?:signature\\.image|image)|fixedAssets\\.[01])$`);
export const safeMediaDiagnosticV2Schema=exact({contractRevision:z.literal(2),code:z.enum(diagnosticCodes),path:plainText(100).regex(slotPath)});
