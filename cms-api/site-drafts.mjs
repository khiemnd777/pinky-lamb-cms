import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {ApiError} from '../contracts/errors.mjs';
import {assertEnvelopeSize,MAX_BODY_BYTES,MAX_REVISION,revisionSchema,resourceIdSchema,hashSchema} from '../contracts/hero.mjs';
import {canonicalJson} from '../contracts/draft.mjs';
import {strictSiteObject} from '../contracts/site-settings.mjs';
import {createSiteSchemas,applySitePatch,SITE_TEMPLATE_VERSION} from '../contracts/site.mjs';
import {encodeSiteStoredDraft,assertSiteBudget,siteImportLineageSchema} from '../contracts/site-draft.mjs';
import {createSiteImportService,loadTrustedBaseline} from './import-site.mjs';
import {loadTrustedCatalog,mutationIdentity,sha256} from './drafts.mjs';

export const SITE_SAVE_OPERATION='PATCH /api/cms/drafts/home-v2';
const timestamp=z.string().datetime().length(24);
export const siteSaveReceiptSchema=z.strictObject({draftId:z.literal('home-v2'),revision:revisionSchema,updatedAt:timestamp,lastEventId:resourceIdSchema});
const completedSchema=z.strictObject({requestHash:hashSchema,state:z.literal('COMPLETED'),statusCode:z.literal(200),response:siteSaveReceiptSchema,createdAt:timestamp,eventId:resourceIdSchema,importLineage:siteImportLineageSchema,contentHash:hashSchema});
const auditSchema=z.strictObject({id:resourceIdSchema,action:z.literal('SITE_DRAFT_SAVED'),actorUid:resourceIdSchema,draftId:z.literal('home-v2'),schemaVersion:z.literal(2),templateVersion:z.literal(SITE_TEMPLATE_VERSION),importLineage:siteImportLineageSchema,fromRevision:revisionSchema,toRevision:revisionSchema,at:timestamp,correlationId:resourceIdSchema,requestHash:hashSchema,contentHash:hashSchema});
const same=(a,b)=>canonicalJson(a)===canonicalJson(b);
function checked(schema,value){try{assertEnvelopeSize(value);return schema.parse(value);}catch{throw new ApiError('INTERNAL_ERROR');}}
/** Only request parsing and applying a verified input intent use this marker.
 * Stored evidence/provider failures are never relabelled as client input. */
function inputError(error){
 if(error instanceof ApiError && error.code!=='VALIDATION_ERROR')return error;
 const safe=new ApiError('VALIDATION_ERROR');
 safe.siteValidationPaths=[...new Set((error.issues??[]).map(issue=>issue.path.join('.')).filter(field=>field.length>0 && field.length<=240 && field.split('.').length<=12))].slice(0,32);
 return safe;
}
function parseSaveBody(body,saveSchema){
 try{
  const plain=strictSiteObject({expectedRevision:z.unknown(),patch:z.unknown()}).parse(body);
  if(Buffer.byteLength(JSON.stringify(plain),'utf8')>MAX_BODY_BYTES)throw new ApiError('PAYLOAD_TOO_LARGE');
  return saveSchema.parse(plain);
 }catch(error){throw inputError(error);}
}
export async function createSiteDraftService(options={}){
 const runtime=options.db && options.authorize?options:await import('./authorization.mjs');
 const db=options.db??runtime.db,authorize=options.authorize??runtime.authorize;
 const baselineProvider=options.baselineProvider??loadTrustedBaseline,catalogProvider=options.catalogProvider??loadTrustedCatalog;
 const importer=await createSiteImportService({db,authorize,baselineProvider,catalogProvider});
 const readDraft=context=>importer.readSiteDraft(context);
 async function saveDraft({request,actor,body,key,correlationId}){
  const baseline=await baselineProvider(),catalog=await catalogProvider();
  const eventId=randomUUID(),at=new Date().toISOString(),draftRef=db.collection('cmsDrafts').doc('home-v2');
  try{return await db.runTransaction(async transaction=>{
   const currentActor=await authorize(request,'DRAFT_SAVE',transaction);if(currentActor.uid!==actor.uid)throw new ApiError('FORBIDDEN');
   const target=await transaction.get(draftRef);
   const {context,current}=await importer.readTrustedContext({transaction,target,baseline,catalog});
   let saveSchema;try{saveSchema=createSiteSchemas(context).saveRequestSchema;}catch{throw new ApiError('INTERNAL_ERROR');}
   const parsed=parseSaveBody(body,saveSchema),identity=mutationIdentity(actor.uid,SITE_SAVE_OPERATION,key,parsed);
   const keyRef=db.collection('cmsIdempotency').doc(identity.id),keyDoc=await transaction.get(keyRef);
   if(keyDoc.exists){
    const record=checked(completedSchema,keyDoc.data());if(record.requestHash!==identity.requestHash)throw new ApiError('IDEMPOTENCY_PAYLOAD_MISMATCH');
    const auditDoc=await transaction.get(db.collection('cmsAudit').doc(record.eventId));if(!auditDoc.exists)throw new ApiError('INTERNAL_ERROR');
    const audit=checked(auditSchema,auditDoc.data()),receipt=record.response;
    if(audit.id!==record.eventId || receipt.lastEventId!==record.eventId || audit.actorUid!==actor.uid || audit.fromRevision!==parsed.expectedRevision || audit.toRevision!==parsed.expectedRevision+1 || receipt.revision!==audit.toRevision || audit.at!==record.createdAt || receipt.updatedAt!==record.createdAt || audit.requestHash!==identity.requestHash || audit.contentHash!==record.contentHash || !same(audit.importLineage,context.importLineage) || !same(record.importLineage,context.importLineage))throw new ApiError('INTERNAL_ERROR');
    return receipt;
   }
   if(current.revision!==parsed.expectedRevision || current.revision>=MAX_REVISION)throw new ApiError('REVISION_CONFLICT');
   let content;try{content=applySitePatch(current.content,parsed.patch,context);}catch(error){throw inputError(error);}
   // Reserve all five future envelopes before persisting this exact candidate.
   assertSiteBudget(content,context);
   const logical={...current,content,revision:current.revision+1,updatedBy:actor.uid,updatedAt:at,lastEventId:eventId};
   const stored=encodeSiteStoredDraft(logical,context);
   const receipt=siteSaveReceiptSchema.parse({draftId:'home-v2',revision:logical.revision,updatedAt:at,lastEventId:eventId});
   // This audit digest covers canonical Draft content, not a Snapshot envelope.
   const contentHash=sha256(canonicalJson(content));
   const audit={id:eventId,action:'SITE_DRAFT_SAVED',actorUid:actor.uid,draftId:'home-v2',schemaVersion:2,templateVersion:SITE_TEMPLATE_VERSION,importLineage:context.importLineage,fromRevision:current.revision,toRevision:logical.revision,at,correlationId,requestHash:identity.requestHash,contentHash};
   const completed={requestHash:identity.requestHash,state:'COMPLETED',statusCode:200,response:receipt,createdAt:at,eventId,importLineage:context.importLineage,contentHash};
   checked(auditSchema,audit);checked(completedSchema,completed);
   const lateActor=await authorize(request,'DRAFT_SAVE',transaction);if(lateActor.uid!==actor.uid)throw new ApiError('FORBIDDEN');
   transaction.set(draftRef,stored);transaction.create(db.collection('cmsAudit').doc(eventId),audit);transaction.create(keyRef,completed);
   return receipt;
  },{maxAttempts:5});}catch(error){if(error.code===10)throw new ApiError('IDEMPOTENCY_IN_PROGRESS');throw error;}
 }
 return {readDraft,saveDraft};
}
