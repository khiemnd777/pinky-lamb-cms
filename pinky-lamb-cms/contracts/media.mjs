import {MEDIA_STATUSES,mediaIdSchema,mediaHashSchema,mediaPublicSchema,mediaDetailPublicSchema,publicMediaDerivative} from './media-read-public.mjs';
export {MEDIA_STATUSES,IMAGE_KEYS,MEDIA_LIMITS,mediaIdSchema,mediaHashSchema,mediaDerivativePublicSchema,mediaPublicSchema,mediaDetailPublicSchema,publicMediaDerivative,mediaListRequestSchema,mediaPositionSchema,mediaCursorSchema,assertMediaCursorFilter} from './media-read-public.mjs';
import {z} from 'zod';
import {strictMediaV2JsonSchema,mediaMetadataV2Schema,uploadActorsV2Schema,hashMediaMetadataV2} from './media-v3-metadata-v2.mjs';
import {readyVersionV2Schema,bindingFromReadyVersionV2,normalizedDerivativeProjectionV2,canonicalMediaV2Json} from './media-v3-contract-v2.mjs';
import {readyFactV2Schema} from './media-v3-authority-v2.mjs';
export const MEDIA_COLLECTION='cmsMediaVersions';
const exact=shape=>strictMediaV2JsonSchema.pipe(z.strictObject(shape));
const key=z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$(?![\s\S])/);
const generation=z.string().regex(/^[1-9][0-9]{0,127}$(?![\s\S])/);
const time=z.number().int().min(0).max(Number.MAX_SAFE_INTEGER-86400000);
const kind=z.enum(['IMAGE','PDF','VIDEO']);
const storageKey=z.string().max(768).regex(/^private\/media\/v2\/[A-Za-z0-9_/-]+$(?![\s\S])/);
const originalSchema=exact({key:storageKey,generation,sizeBytes:z.number().int().min(1).max(128*1048576),sha256:mediaHashSchema});
const storedDerivativeSchema=exact({key,objectKey:storageKey,generation,sizeBytes:z.number().int().min(1).max(96*1048576),mimeType:z.enum(['image/webp','application/pdf','video/mp4']),sha256:mediaHashSchema});
const envelopeFields={contractRevision:z.literal(2),assetId:mediaIdSchema,kind,status:z.enum(MEDIA_STATUSES),archived:z.boolean(),revision:z.number().int().min(0).max(Number.MAX_SAFE_INTEGER-1),createdAtMs:time,metadata:mediaMetadataV2Schema,actors:uploadActorsV2Schema};
/** Private persisted bridge. Malformed v2 records never become legacy records. */
export const mediaVersionSchema=exact({...envelopeFields,readyVersion:readyVersionV2Schema.optional(),readyFact:readyFactV2Schema.optional(),storage:exact({original:originalSchema,derivatives:z.array(storedDerivativeSchema).min(1).max(256)}).optional()}).superRefine((value,ctx)=>{
 const issue=()=>ctx.addIssue({code:'custom',message:'Invalid persisted media binding'});
 if(value.status!=='READY'){if(value.readyVersion||value.readyFact||value.storage)issue();return;}
 if(!value.readyVersion||!value.readyFact||!value.storage){issue();return;}
 const v=value.readyVersion,f=value.readyFact,s=value.storage;
 if(v.assetId!==value.assetId||v.kind!==value.kind||v.archived!==value.archived||v.revision!==value.revision||v.uploaderUid!==value.actors.uploaderUid||f.tuple.assetId!==v.assetId||f.tuple.kind!==v.kind||canonicalMediaV2Json(bindingFromReadyVersionV2(v))!==canonicalMediaV2Json(f.binding))issue();
 if(s.original.sha256!==v.originalSha256||s.original.sizeBytes!==v.originalSizeBytes||s.original.generation!==f.storage.originalGeneration||!s.original.key.startsWith(`private/media/v2/${v.assetId}/originals/`))issue();
 if(s.derivatives.length!==v.derivatives.length||new Set(s.derivatives.map(d=>d.key)).size!==s.derivatives.length||new Set(s.derivatives.map(d=>d.objectKey)).size!==s.derivatives.length)issue();
 const prefix=`private/media/v2/${v.assetId}/jobs/${f.tuple.jobId}/${f.tuple.attempt}/${f.tuple.leaseEpoch}/`;
 for(const d of s.derivatives){const logical=v.derivatives.find(x=>x.key===d.key);if(!logical||!d.objectKey.startsWith(prefix)||d.generation!==logical.generation||d.sizeBytes!==logical.sizeBytes||d.sha256!==logical.sha256||d.mimeType!==logical.mimeType)issue();}
});
/** Trusted server hash capability verifies both canonical digests before any DTO. */
export function parsePersistedMediaV2(input,{hashCanonical}){
 const value=mediaVersionSchema.parse(input);
 if(value.status==='READY'){
  const metadataDigest=hashMediaMetadataV2(value.metadata,{hashCanonical}).metadataDigest;
  const derivativeDigest=mediaHashSchema.parse(hashCanonical(normalizedDerivativeProjectionV2(value.readyVersion.derivatives)));
  if(metadataDigest!==value.readyVersion.metadataDigest||metadataDigest!==value.readyFact.metadataDigest||derivativeDigest!==value.readyVersion.derivativeSetSha256||derivativeDigest!==value.readyFact.storage.generationBoundDerivativeSetSha256)throw new TypeError('Invalid persisted media digest');
 }
 return value;
}
export function mediaPublicProjection(value,{actor}={}){
 const v=value.readyVersion,selected=value.status==='READY'&&!value.archived?(v.derivatives.find(d=>value.kind==='IMAGE'?d.key==='image-960':value.kind==='PDF'?d.role==='PDF_DOWNLOAD':d.role==='VIDEO')??v.derivatives[0]):null;
 const dto={id:value.assetId,name:value.metadata.name,kind:value.kind,status:value.status,revision:value.revision,canArchive:!value.archived&&Boolean(actor&&(actor.role==='OWNER'||actor.role==='EDITOR'&&actor.uid===value.actors.uploaderUid)),createdAtMs:value.createdAtMs,width:v?.width??null,height:v?.height??null,isArchived:value.archived,derivative:selected?publicMediaDerivative(selected):null};return mediaPublicSchema.parse(dto);
}

export function mediaDetailProjection(value,options){return mediaDetailPublicSchema.parse({...mediaPublicProjection(value,options),derivatives:value.status==='READY'&&!value.archived?value.readyVersion.derivatives.map(publicMediaDerivative):[]});}
