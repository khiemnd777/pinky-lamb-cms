import {z} from 'zod';
import {FILE_MIMES,safeDownloadName,validateExternalUrl} from './file-detection.mjs';
const id=z.string().regex(/^[A-Za-z0-9_-]{1,100}$/),hash=z.string().regex(/^[a-f0-9]{64}$/);
const common={assetId:id,revision:z.number().int().nonnegative(),name:z.string().trim().min(1).max(160),kind:z.enum(['IMAGE','PDF','WORD','EXCEL']),format:z.enum(Object.keys(FILE_MIMES)),mimeType:z.enum(Object.values(FILE_MIMES)),sizeBytes:z.number().int().positive().max(25*1048576),sha256:hash,disposition:z.enum(['READER','DOWNLOAD']),downloadName:z.string().max(110),width:z.number().int().positive().max(8192).optional(),height:z.number().int().positive().max(8192).optional(),pageCount:z.number().int().positive().max(48).optional(),rightsConfirmed:z.literal(true)};
export const fileAssetSchema=z.strictObject({...common,source:z.discriminatedUnion('kind',[z.strictObject({kind:z.literal('EXTERNAL'),url:z.string().max(2048)}),z.strictObject({kind:z.literal('HOSTED')})])}).superRefine((r,ctx)=>{
 const fail=()=>ctx.addIssue({code:'custom',message:'Invalid file descriptor'}),expected=['JPEG','PNG','WEBP'].includes(r.format)?'IMAGE':r.format==='PDF'?'PDF':r.format.startsWith('DOC')?'WORD':'EXCEL';
 if(r.kind!==expected||r.mimeType!==FILE_MIMES[r.format]||r.disposition!==(['IMAGE','PDF'].includes(r.kind)?'READER':'DOWNLOAD')||r.downloadName!==safeDownloadName(r.downloadName,r.format))fail();
 if(r.kind==='IMAGE'){if(!r.width||!r.height||r.width*r.height>40000000||r.sizeBytes>10*1048576||r.pageCount!==undefined)fail();}else if(r.width!==undefined||r.height!==undefined)fail();
 if(r.kind==='PDF'?!r.pageCount:r.pageCount!==undefined)fail();
 if(r.source.kind==='EXTERNAL'){try{validateExternalUrl(r.source.url,[new URL(r.source.url).hostname]);}catch{fail();}}else if(r.kind!=='WORD'&&r.kind!=='EXCEL')fail();
});
export const fileEntrySchema=z.strictObject({source:z.literal('FILE_RESOURCE'),asset:fileAssetSchema});
export function fileQaResource(asset){const a=fileAssetSchema.parse(asset),ext=a.format.toLowerCase().replace('jpeg','jpg');return {id:a.assetId,path:`assets/file-${a.assetId}.${ext}`,url:a.source.kind==='EXTERNAL'?a.source.url:`http://127.0.0.1:5173/api/cms/files/${a.assetId}/bytes`,mimeType:a.mimeType,sizeBytes:a.sizeBytes,sha256:a.sha256,...(a.width?{width:a.width,height:a.height}:{}),file:a};}
export const fileQaResourceSchema=z.strictObject({id,path:z.string(),url:z.string(),mimeType:z.string(),sizeBytes:z.number(),sha256:hash,width:z.number().optional(),height:z.number().optional(),file:fileAssetSchema}).refine(r=>JSON.stringify(r)===JSON.stringify(fileQaResource(r.file)));
