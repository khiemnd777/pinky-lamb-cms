import {createHash,randomUUID} from 'node:crypto';
import {readFileSync,realpathSync,lstatSync,existsSync} from 'node:fs';
import path from 'node:path';
import {z} from 'zod';
import {ROOT,validateRuntime} from '../scripts/local-guard.mjs';
import {ApiError,validationError} from '../contracts/errors.mjs';
import {idempotencyKeySchema,hashSchema,resourceIdSchema,revisionSchema,MAX_REVISION,assertEnvelopeSize,validateContent} from '../contracts/hero.mjs';
import {canonicalJson,decodeStoredDraft,encodeStoredContent,parseSaveRequest,utcTimestampSchema} from '../contracts/draft.mjs';
import {db as localDb,authorize as localAuthorize} from './authorization.mjs';

export {canonicalJson};
export const sha256=value=>createHash('sha256').update(value).digest('hex');
export function mutationIdentity(uid,operation,key,body){
 try{idempotencyKeySchema.parse(key);}catch(error){throw validationError(error);}
 return {id:sha256(canonicalJson({uid,operation,key})),requestHash:sha256(canonicalJson(body))};
}

export function loadTrustedCatalog(){
 validateRuntime(process.env,undefined,{server:true});
 const filename=path.join(ROOT,'contracts/legacy-assets.json');
 if(!existsSync(filename))throw new ApiError('LOCAL_RUNTIME_UNAVAILABLE');
 try{
  if(lstatSync(filename).isSymbolicLink() || realpathSync(filename)!==filename)throw new Error('Catalog path');
  const recordSchema=z.strictObject({id:resourceIdSchema,kind:z.enum(['IMAGE','VIDEO','PDF']),legacyPath:z.string().min(1).max(240),mimeType:z.string().min(1).max(80),sizeBytes:z.number().int().positive(),sha256:hashSchema,status:z.literal('LEGACY_READY'),derivatives:z.array(z.unknown()).max(0),rights:z.strictObject({basis:z.literal('CLIENT_SUPPLIED'),evidenceRef:z.string().min(1).max(240)}),sourceRefs:z.array(z.string().min(1).max(240)).min(1).max(20),createdBy:resourceIdSchema,createdAt:utcTimestampSchema,width:z.number().int().positive().optional(),height:z.number().int().positive().optional(),durationSeconds:z.number().positive().finite().optional()});
  const catalog=z.array(recordSchema).min(1).max(200).parse(JSON.parse(readFileSync(filename,'utf8')));
  const ids=new Set();
  for(const asset of catalog){
   resourceIdSchema.parse(asset.id);hashSchema.parse(asset.sha256);
   if(ids.has(asset.id) || !['IMAGE','VIDEO','PDF'].includes(asset.kind) || asset.status!=='LEGACY_READY')throw new Error('Catalog identity');
   ids.add(asset.id);
   if(typeof asset.legacyPath!=='string' || !asset.legacyPath.startsWith('assets/') || asset.legacyPath.includes('..') || asset.legacyPath.includes('\\') || asset.legacyPath.includes('\0') || path.isAbsolute(asset.legacyPath))throw new Error('Asset path');
   const base=realpathSync(path.join(ROOT,'public-baseline'));
   const filename=path.resolve(base,asset.legacyPath);
   if(!filename.startsWith(base+path.sep) || realpathSync(filename)!==filename || !lstatSync(filename).isFile())throw new Error('Asset containment');
   const bytes=readFileSync(filename);
   if(bytes.length!==asset.sizeBytes || sha256(bytes)!==asset.sha256)throw new Error('Asset integrity');
   if(asset.kind==='IMAGE' && !['image/png','image/jpeg','image/webp','image/avif','image/gif'].includes(asset.mimeType))throw new Error('Raster image required');
   if(asset.kind==='PDF' && asset.mimeType!=='application/pdf')throw new Error('PDF MIME');
   if(asset.kind==='VIDEO' && asset.mimeType!=='video/mp4')throw new Error('Video MIME');
   for(const field of ['width','height','durationSeconds'])if(asset[field]!==undefined && (!Number.isFinite(asset[field]) || asset[field]<=0))throw new Error('Asset dimensions');
   if(!asset.rights || !Array.isArray(asset.sourceRefs) || !Array.isArray(asset.derivatives) || typeof asset.createdBy!=='string' || typeof asset.createdAt!=='string')throw new Error('Asset provenance');
  }
  return catalog;
 }catch{throw new ApiError('INTERNAL_ERROR');}
}

export function projectCatalog(catalog){
 return catalog.map(asset=>{
  const label=path.basename(asset.legacyPath);
  if(label.length<1 || label.length>160 || /[\u0000-\u001f\u007f]/.test(label))throw new ApiError('INTERNAL_ERROR');
  return {id:asset.id,kind:asset.kind,status:'LEGACY_READY',legacyPath:asset.legacyPath,label,...Object.fromEntries(['width','height','durationSeconds'].filter(key=>asset[key]!==undefined).map(key=>[key,asset[key]]))};
 }).sort((first,second)=>first.id<second.id?-1:first.id>second.id?1:0);
}

const saveResponseSchema=z.strictObject({revision:revisionSchema,updatedAt:utcTimestampSchema});
const completedSchema=z.strictObject({requestHash:hashSchema,state:z.literal('COMPLETED'),statusCode:z.literal(200),response:saveResponseSchema,createdAt:utcTimestampSchema,eventId:resourceIdSchema});

export function createDraftService({db=localDb,authorize=localAuthorize,catalogProvider=loadTrustedCatalog}={}){
 async function readDraft({request}){
  await authorize(request,'MEMBER_READ');
  const catalog=await catalogProvider();
  const snapshot=await db.collection('cmsDrafts').doc('home').get();
  if(!snapshot.exists)throw new ApiError('NOT_FOUND');
  const draft=decodeStoredDraft(snapshot.data(),{catalog});
  const response={...draft,catalog:projectCatalog(catalog)};
  assertEnvelopeSize(response);
  return response;
 }

 async function saveDraft({request,actor,body,key,correlationId}){
  const catalog=await catalogProvider();
  const parsed=parseSaveRequest(body,{catalog});
  const identity=mutationIdentity(actor.uid,'PATCH /api/cms/drafts/home',key,parsed);
  const eventId=randomUUID();
  const at=new Date().toISOString();
  const draftRef=db.collection('cmsDrafts').doc('home');
  const idempotencyRef=db.collection('cmsIdempotency').doc(identity.id);
  const auditRef=db.collection('cmsAudit').doc(eventId);
  try{
   return await db.runTransaction(async transaction=>{
    const currentActor=await authorize(request,'DRAFT_SAVE',transaction);
    if(currentActor.uid!==actor.uid)throw new ApiError('FORBIDDEN');
    const recordSnapshot=await transaction.get(idempotencyRef);
    const draftSnapshot=await transaction.get(draftRef);
    if(!draftSnapshot.exists)throw new ApiError('NOT_FOUND');
    const draft=decodeStoredDraft(draftSnapshot.data(),{catalog});
    if(recordSnapshot.exists){
     let record;
     try{record=completedSchema.parse(recordSnapshot.data());}catch{throw new ApiError('INTERNAL_ERROR');}
     if(record.requestHash!==identity.requestHash)throw new ApiError('IDEMPOTENCY_PAYLOAD_MISMATCH');
     return record.response;
    }
    if(draft.revision!==parsed.expectedRevision)throw new ApiError('REVISION_CONFLICT');
    if(draft.revision>=MAX_REVISION)throw new ApiError('REVISION_CONFLICT');
    let content;
    try{content=validateContent({...draft.content,...parsed.patch},catalog);}catch(error){throw validationError(error);}
    const logical={content,revision:draft.revision+1,updatedBy:currentActor.uid,updatedAt:at,lastEventId:eventId};
    assertEnvelopeSize(logical);
    const stored={contentJson:encodeStoredContent(content,{catalog}),revision:logical.revision,updatedBy:logical.updatedBy,updatedAt:at,lastEventId:eventId};
    assertEnvelopeSize(stored);
    const response={revision:logical.revision,updatedAt:at};
    transaction.set(draftRef,stored);
    transaction.create(auditRef,{id:eventId,action:'DRAFT_SAVED',actorUid:currentActor.uid,resourceId:'home',fromRevision:draft.revision,toRevision:logical.revision,at,correlationId});
    transaction.create(idempotencyRef,{requestHash:identity.requestHash,state:'COMPLETED',statusCode:200,response,createdAt:at,eventId});
    return response;
   },{maxAttempts:5});
  }catch(error){if(error.code===10)throw new ApiError('IDEMPOTENCY_IN_PROGRESS');throw error;}
 }
 return {readDraft,saveDraft};
}
