import {z} from 'zod';
import {ApiError} from './errors.mjs';
export const MAX_BODY_BYTES=64*1024;
export const MAX_ENVELOPE_BYTES=256*1024;
export const MAX_REVISION=Number.MAX_SAFE_INTEGER-1;
// Zod4.6 length is code points; M1 deliberately uses submitted UTF-16 units.
// https://zod.dev/api?id=strings and https://zod.dev/api?id=objects
function text(max,{empty=false,multiline=false,visible=true}={}){return z.string().refine(v=>v.length<=max && (empty || v.length>0),'Giá trị không hợp lệ.').refine(v=>!(multiline?/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/:/[\u0000-\u001F\u007F-\u009F\u2028\u2029]/).test(v),'Giá trị không hợp lệ.').refine(v=>!visible || (empty && v.length===0) || v.trim().length>0,'Giá trị không hợp lệ.');}
const assetId=text(100).refine(v=>/^[A-Za-z0-9_-]+$/.test(v));
export const revisionSchema=z.number().int().min(0).max(MAX_REVISION);
export const resourceIdSchema=text(128).refine(v=>/^[A-Za-z0-9_-]+$/.test(v));
export const hashSchema=z.string().regex(/^[a-f0-9]{64}$/);
export const idempotencyKeySchema=z.string().regex(/^[A-Za-z0-9_-]{8,128}$/);
export const submitMessageSchema=text(500,{empty:true,multiline:true});
export const reviewNoteSchema=text(1000,{empty:true,multiline:true});
/** @typedef {{id:string,kind:'IMAGE'|'VIDEO'|'PDF',status:string}} SafeAsset */
/** @param {SafeAsset[]} safeCatalog Explicit public-safe metadata; never import private catalog here. */
export function createHeroSchemas(safeCatalog){
 if(!Array.isArray(safeCatalog))throw new ApiError('VALIDATION_ERROR');
 const assets=new Map();for(const entry of safeCatalog){if(!entry || !assetId.safeParse(entry.id).success || !['IMAGE','VIDEO','PDF'].includes(entry.kind) || typeof entry.status!=='string' || assets.has(entry.id))throw new ApiError('VALIDATION_ERROR');assets.set(entry.id,{kind:entry.kind,status:entry.status});}
 const allowed=(id,kind)=>assets.get(id)?.kind===kind && assets.get(id)?.status==='LEGACY_READY';
 const run=z.strictObject({text:text(1000,{visible:false,multiline:true}),emphasis:z.enum(['NONE','STRONG','ACCENT']).optional()});
 const runs=(count,cap)=>z.array(run).min(1).max(count).refine(v=>{const joined=v.map(r=>r.text).join('');return joined.length<=cap && joined.trim().length>0;},'Giá trị không hợp lệ.');
 const action=z.discriminatedUnion('kind',[
  z.strictObject({kind:z.literal('SECTION'),sectionId:z.enum(['work','services','about','ip-studio','contact']),label:text(80)}),
  z.strictObject({kind:z.literal('SHOWREEL'),label:text(80)}),
  z.strictObject({kind:z.literal('CREDENTIAL'),assetId:assetId.refine(id=>allowed(id,'PDF')),label:text(80)})
 ]);
 const use=(decorative)=>z.strictObject({assetId:assetId.refine(id=>allowed(id,'IMAGE')),alt:text(300,{empty:true,visible:false}),isDecorative:z.boolean(),focalPoint:z.strictObject({x:z.number().min(0).max(1),y:z.number().min(0).max(1)}).optional()}).refine(v=>v.isDecorative?decorative && v.alt==='':v.alt.trim().length>0,'Giá trị không hợp lệ.');
 const heroSchema=z.strictObject({kind:z.literal('HERO'),variant:z.literal('hero-split'),heading:z.strictObject({lines:z.array(runs(8,100)).min(1).max(3)}),eyebrow:text(120),description:runs(12,1000),primaryAction:action,secondaryAction:action.optional(),footnote:text(240,{empty:true,multiline:true}),note:text(300,{empty:true,multiline:true}),image:use(true)});
 const seoSchema=z.strictObject({title:text(80),description:text(200),ogTitle:text(80),ogDescription:text(200),ogImage:use(false)});
 const contentSchema=z.strictObject({schemaVersion:z.literal(1),locale:z.literal('vi-VN'),hero:heroSchema,seo:seoSchema});
 const patchSchema=z.strictObject({hero:heroSchema.optional(),seo:seoSchema.optional()}).refine(v=>v.hero!==undefined || v.seo!==undefined,'Giá trị không hợp lệ.');
 return {heroSchema,seoSchema,contentSchema,patchSchema};
}
export function validateContent(input,safeCatalog){return createHeroSchemas(safeCatalog).contentSchema.parse(input);}
export function validatePatch(input,safeCatalog){return createHeroSchemas(safeCatalog).patchSchema.parse(input);}
export function validateRevision(input){return revisionSchema.parse(input);}
/** UTF8 byte limits also work in the browser; no Buffer/Node imports. */
export function assertEnvelopeSize(value){let json;try{json=JSON.stringify(value);}catch{throw new ApiError('VALIDATION_ERROR');}if(typeof json!=='string')throw new ApiError('VALIDATION_ERROR');if(new TextEncoder().encode(json).length>MAX_ENVELOPE_BYTES)throw new ApiError('PAYLOAD_TOO_LARGE');return value;}
export function parseJsonBody(raw){let value;if(typeof raw==='string')value=raw;else if(raw instanceof Uint8Array){if(raw.byteLength>MAX_BODY_BYTES)throw new ApiError('PAYLOAD_TOO_LARGE');try{value=new TextDecoder('utf-8',{fatal:true}).decode(raw);}catch{throw new ApiError('BAD_REQUEST');}}else throw new ApiError('BAD_REQUEST');if(new TextEncoder().encode(value).length>MAX_BODY_BYTES)throw new ApiError('PAYLOAD_TOO_LARGE');try{return JSON.parse(value);}catch{throw new ApiError('BAD_REQUEST');}}
