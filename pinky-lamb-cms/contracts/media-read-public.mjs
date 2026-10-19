/** Browser-safe transport DTOs. No server authority/toolset/Storage imports. */
import {z} from 'zod';
import {plainText} from './site-settings.mjs';
import {strictMediaV2JsonSchema} from './media-v3-metadata-v2.mjs';
import {derivativeV2Schema,V2_MEDIA_LIMITS} from './media-v3-contract-v2.mjs';
const exact=shape=>strictMediaV2JsonSchema.pipe(z.strictObject(shape));
export const MEDIA_STATUSES=Object.freeze(['QUEUED','PROCESSING','READY','REJECTED','RECOVERY_REQUIRED']);
export const IMAGE_KEYS=Object.freeze(['image-320','image-960','image-1920']);
export const MEDIA_LIMITS=Object.freeze({imageBytes:12*1048576,retainedBytes:64*1048576,pageSize:50,defaultPageSize:20,readTimeoutMs:30000});
export const mediaIdSchema=z.string().regex(/^[A-Za-z0-9_-]{1,100}$(?![\s\S])/);
export const mediaHashSchema=z.string().regex(/^[a-f0-9]{64}$(?![\s\S])/);
const key=z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$(?![\s\S])/),generation=z.string().regex(/^[1-9][0-9]{0,127}$(?![\s\S])/),time=z.number().int().min(0).max(Number.MAX_SAFE_INTEGER-86400000),kind=z.enum(['IMAGE','PDF','VIDEO']);
const publicDerivativeFields={key,role:z.enum(['IMAGE','PDF_DOWNLOAD','PDF_PAGE','VIDEO','POSTER']),mime:z.enum(['image/webp','application/pdf','video/mp4']),bytes:z.number().int().min(1).max(64*1048576),sha256:mediaHashSchema,generation,width:z.number().int().min(1).max(1920).optional(),height:z.number().int().min(1).max(8192).optional(),targetWidth:z.union([z.literal(320),z.literal(960),z.literal(1920)]).optional(),pageNumber:z.number().int().min(1).max(48).optional(),durationSeconds:z.number().finite().positive().max(300).optional()};
export const mediaDerivativePublicSchema=exact(publicDerivativeFields).refine(value=>{const mapped={key:value.key,role:value.role,mimeType:value.mime,sizeBytes:value.bytes,sha256:value.sha256,generation:value.generation};for(const k of ['width','height','targetWidth','pageNumber','durationSeconds'])if(Object.hasOwn(value,k))mapped[k]=value[k];return derivativeV2Schema.safeParse(mapped).success;});
const publicRecordFields={id:mediaIdSchema,name:plainText(240),kind,status:z.enum(MEDIA_STATUSES),revision:z.number().int().min(0).max(Number.MAX_SAFE_INTEGER-1),canArchive:z.boolean(),createdAtMs:time,width:z.number().int().min(1).max(8192).nullable(),height:z.number().int().min(1).max(8192).nullable(),isArchived:z.boolean(),derivative:mediaDerivativePublicSchema.nullable()};
export const mediaPublicSchema=exact(publicRecordFields);
export const mediaDetailPublicSchema=exact({...publicRecordFields,derivatives:z.array(mediaDerivativePublicSchema).max(256)}).refine(value=>{
 if(value.status!=='READY')return value.derivatives.length===0&&value.derivative===null;
 if(!value.derivative||!value.derivatives.length||new Set(value.derivatives.map(d=>d.key)).size!==value.derivatives.length||!value.derivatives.some(d=>JSON.stringify(d)===JSON.stringify(value.derivative)))return false;
 if(value.derivatives.reduce((n,d)=>n+d.bytes,0)>V2_MEDIA_LIMITS[value.kind].outputBytes)return false;
 if(value.kind==='IMAGE')return value.width!==null&&value.height!==null&&value.width*value.height<=40000000&&value.derivatives.length===3&&new Set(value.derivatives.map(d=>d.targetWidth)).size===3&&value.derivatives.every(d=>d.role==='IMAGE'&&d.width===Math.min(d.targetWidth,value.width)&&d.height===Math.max(1,Math.round(value.height*d.width/value.width)));
 if(value.kind==='PDF'){const pages=value.derivatives.filter(d=>d.role==='PDF_PAGE'),downloads=value.derivatives.filter(d=>d.role==='PDF_DOWNLOAD');return pages.length>=1&&pages.length<=48&&downloads.length===1&&value.derivatives.length===pages.length+1&&pages.reduce((n,d)=>n+d.bytes,0)<=V2_MEDIA_LIMITS.PDF.pageBytes&&new Set(pages.map(d=>d.pageNumber)).size===pages.length&&pages.every(d=>d.pageNumber<=pages.length);}
 const videos=value.derivatives.filter(d=>d.role==='VIDEO'),posters=value.derivatives.filter(d=>d.role==='POSTER');return videos.length===1&&posters.length===1&&value.derivatives.length===2&&videos[0].width===value.width&&videos[0].height===value.height&&posters[0].width===value.width&&posters[0].height===value.height;
});
export function publicMediaDerivative(d){const result={key:d.key,role:d.role,mime:d.mimeType,bytes:d.sizeBytes,sha256:d.sha256,generation:d.generation};for(const k of ['width','height','targetWidth','pageNumber','durationSeconds'])if(Object.hasOwn(d,k))result[k]=d[k];return mediaDerivativePublicSchema.parse(result);}
const filters={kind:kind.default('IMAGE'),status:z.enum(['ALL',...MEDIA_STATUSES]).default('ALL'),pageSize:z.number().int().min(1).max(50).default(20)};
export const mediaListRequestSchema=exact({...filters,cursor:z.string().min(1).max(2048).optional()});
export const mediaPositionSchema=exact({createdAtMs:time,id:mediaIdSchema});
export const mediaCursorSchema=exact({v:z.literal(2),kind,status:z.enum(['ALL',...MEDIA_STATUSES]),pageSize:z.number().int().min(1).max(50),last:mediaPositionSchema});
export function assertMediaCursorFilter(cursor,filter){const c=mediaCursorSchema.parse(cursor);if(c.kind!==filter.kind||c.status!==filter.status||c.pageSize!==filter.pageSize)throw new TypeError('Cursor filter mismatch');return c;}

// Exact public receipt transport fields mirror canonical media-upload.mjs; no mutation authority.
export const MEDIA_UPLOAD_INPUT_BYTES=Object.freeze(Object.fromEntries(Object.entries(V2_MEDIA_LIMITS).map(([k,v])=>[k,v.inputBytes])));
export const MEDIA_UPLOAD_PART_BYTES=4*1048576;
export const MEDIA_UPLOAD_MIMES=Object.freeze({IMAGE:Object.freeze(['image/jpeg','image/png','image/webp']),PDF:Object.freeze(['application/pdf']),VIDEO:Object.freeze(['video/mp4'])});
const integer=max=>z.number().int().min(0).max(max),resourceId=z.string().regex(/^[A-Za-z0-9_-]{1,128}$(?![\s\S])/),revision=integer(Number.MAX_SAFE_INTEGER-1),receiptFields={contractRevision:z.literal(2),assetId:mediaIdSchema,intentId:resourceId,requestId:resourceId,revision},partCounts={acceptedParts:integer(32),partCount:integer(32).min(1)};
export const mediaUploadReceiptSchema=strictMediaV2JsonSchema.pipe(z.discriminatedUnion('operation',[
 z.strictObject({...receiptFields,...partCounts,operation:z.literal('UPLOAD_CREATE'),state:z.literal('UPLOADING'),acceptedParts:z.literal(0)}),
 z.strictObject({...receiptFields,...partCounts,operation:z.literal('UPLOAD_PART'),state:z.literal('UPLOADING'),partIndex:integer(31),acceptedPartId:resourceId}),
 z.strictObject({...receiptFields,...partCounts,operation:z.literal('UPLOAD_COMPLETE'),state:z.literal('QUEUED'),jobId:resourceId}),
 z.strictObject({...receiptFields,...partCounts,operation:z.literal('UPLOAD_CANCEL'),state:z.literal('CANCELLED')}),
 z.strictObject({...receiptFields,operation:z.literal('JOB_RETRY'),state:z.literal('QUEUED'),jobId:resourceId,jobRevision:revision})
])).refine(v=>v.operation==='JOB_RETRY'||v.acceptedParts<=v.partCount&&(v.operation!=='UPLOAD_PART'||v.partIndex<v.partCount&&v.acceptedParts>=1)&&(v.operation!=='UPLOAD_COMPLETE'||v.acceptedParts===v.partCount));

/** Safe authenticated job observation; canRetry is computed by the server. */
export const mediaJobPublicSchema=exact({contractRevision:z.literal(2),jobId:resourceId,intentId:resourceId,assetId:mediaIdSchema,kind,state:z.enum(MEDIA_STATUSES),jobRevision:revision,attempt:integer(2),canRetry:z.boolean()});

export const mediaArchiveReceiptSchema=exact({contractRevision:z.literal(2),assetId:mediaIdSchema,archived:z.literal(true),revision});
