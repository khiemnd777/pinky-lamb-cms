import {createHash} from 'node:crypto';
import {z} from 'zod';
import {ApiError,validationError} from '../contracts/errors.mjs';
import {MAX_REVISION,revisionSchema,resourceIdSchema} from '../contracts/hero.mjs';
import {MEDIA_COLLECTION,mediaIdSchema,parsePersistedMediaV2} from '../contracts/media.mjs';
import {strictMediaV2JsonSchema} from '../contracts/media-v3-metadata-v2.mjs';
import {canonicalMediaV2Json} from '../contracts/media-v3-contract-v2.mjs';
import {PROJECT} from '../scripts/local-guard.mjs';
import {validateCmsServerRuntime,installCmsNetworkFence} from '../scripts/local-data-guard.mjs';

const exact=shape=>strictMediaV2JsonSchema.pipe(z.strictObject(shape));
const bodySchema=exact({expectedRevision:revisionSchema});
const requestId=z.string().min(8).max(128).refine(value=>!/[^A-Za-z0-9_-]/.test(value));
const identitySchema=exact({contractRevision:z.literal(2),operation:z.literal('MEDIA_ARCHIVE'),actorUid:resourceIdSchema,assetId:mediaIdSchema,requestId});
const responseSchema=exact({contractRevision:z.literal(2),assetId:mediaIdSchema,archived:z.literal(true),revision:revisionSchema});
const hashSchema=z.string().length(64).refine(value=>!/[^a-f0-9]/.test(value));
const receiptSchema=exact({contractRevision:z.literal(2),identity:identitySchema,requestHash:hashSchema,request:bodySchema,response:responseSchema});
const hashCanonical=value=>createHash('sha256').update(canonicalMediaV2Json(value),'utf8').digest('hex');
const same=(a,b)=>canonicalMediaV2Json(a)===canonicalMediaV2Json(b);
const requireValue=(value,code='INTERNAL_ERROR')=>{if(!value)throw new ApiError(code);};
function parse(schema,value) {try{return schema.parse(value);}catch(error){throw validationError(error);}}
function storedReceipt(value) {try{return receiptSchema.parse(value);}catch{throw new ApiError('INTERNAL_ERROR');}}
function storedVersion(value,assetId) {
  let row;
  try {
    // No revision default and no legacy fallback: the shared private bridge
    // requires an explicit row revision, including non-READY records.
    strictMediaV2JsonSchema.parse(value);
    revisionSchema.parse(value.revision);
    row=parsePersistedMediaV2(value,{hashCanonical});
  } catch {throw new ApiError('INTERNAL_ERROR');}
  requireValue(row.assetId===assetId&&row.contractRevision===2&&Number.isSafeInteger(row.revision)&&row.revision>=0&&row.revision<=MAX_REVISION);
  if(row.status==='READY') requireValue(row.readyVersion.revision===row.revision&&row.readyVersion.archived===row.archived);
  return row;
}
function ownData(value,required) {
  requireValue(value&&typeof value==='object'&&Object.getPrototypeOf(value)===Object.prototype,'VALIDATION_ERROR');
  const d=Object.getOwnPropertyDescriptors(value),names=Reflect.ownKeys(d);
  requireValue(names.length===required.length&&required.every(key=>Object.hasOwn(d,key))&&names.every(key=>typeof key==='string'&&required.includes(key)&&d[key].enumerable&&Object.hasOwn(d[key],'value')),'VALIDATION_ERROR');
  return Object.fromEntries(names.map(key=>[key,d[key].value]));
}

/** Soft archive only. Storage objects and saved snapshot bindings are retained.
 * Authorization/current stored relations precede exact idempotency replay. */
export function createMediaArchiveService(options) {
  const {db,authorize}=ownData(options,['db','authorize']);
  requireValue(db&&typeof db.collection==='function'&&typeof db.runTransaction==='function'&&typeof authorize==='function','VALIDATION_ERROR');
  const guard=()=>{
    validateCmsServerRuntime();installCmsNetworkFence();
    requireValue(db.projectId===PROJECT,'LOCAL_RUNTIME_UNAVAILABLE');
  };
  return {async archiveMedia(value) {
    const {request,actor,assetId:rawAssetId,body,key}=ownData(value,['request','actor','assetId','body','key']);
    const assetId=parse(mediaIdSchema,rawAssetId),payload=parse(bodySchema,body),requestKey=parse(requestId,key);
    const actorData=parse(exact({uid:resourceIdSchema,role:z.enum(['EDITOR','OWNER']),authzVersion:z.number().int().positive().max(Number.MAX_SAFE_INTEGER)}),actor);
    const identity=parse(identitySchema,{contractRevision:2,operation:'MEDIA_ARCHIVE',actorUid:actorData.uid,assetId,requestId:requestKey});
    const requestHash=hashCanonical(payload),operationId=`v2_${hashCanonical(identity)}`;
    guard();
    const versionRef=db.collection(MEDIA_COLLECTION).doc(assetId),operationRef=db.collection('cmsMediaArchiveOperations').doc(operationId);
    return db.runTransaction(async tx=>{
      guard();
      const current=await authorize(request,'MEDIA_UPLOAD',tx);
      requireValue(current.uid===actorData.uid&&current.role===actorData.role&&current.authzVersion===actorData.authzVersion&&['EDITOR','OWNER'].includes(current.role),'FORBIDDEN');
      const versionSnapshot=await tx.get(versionRef),operationSnapshot=await tx.get(operationRef);
      requireValue(versionSnapshot.exists,'NOT_FOUND');
      const row=storedVersion(versionSnapshot.data(),assetId);
      requireValue(current.role==='OWNER'||row.actors.uploaderUid===current.uid,'FORBIDDEN');
      // Stored receipt relations are checked before replay or fresh CAS. Later
      // archives may increment the row; replay returns the original response.
      if(operationSnapshot.exists) {
        const receipt=storedReceipt(operationSnapshot.data());
        requireValue(same(receipt.identity,identity)&&receipt.response.assetId===assetId&&receipt.requestHash===hashCanonical(receipt.request)&&receipt.response.revision===receipt.request.expectedRevision+1&&row.archived===true&&row.revision>=receipt.response.revision);
        requireValue(receipt.requestHash===requestHash,'IDEMPOTENCY_PAYLOAD_MISMATCH');
        return receipt.response;
      }
      requireValue(row.revision===payload.expectedRevision,'REVISION_CONFLICT');
      requireValue(row.revision<MAX_REVISION,'REVISION_CONFLICT');
      const revision=row.revision+1;
      const next={...row,archived:true,revision,...(row.status==='READY'?{readyVersion:{...row.readyVersion,archived:true,revision}}:{})};
      // Reparse the complete proposed row; immutable core, readyFact, binding,
      // metadata and Storage references are preserved without regeneration.
      storedVersion(next,assetId);
      const response=responseSchema.parse({contractRevision:2,assetId,archived:true,revision});
      const receipt=receiptSchema.parse({contractRevision:2,identity,requestHash,request:payload,response});
      guard();tx.set(versionRef,next);tx.create(operationRef,receipt);
      return response;
    },{maxAttempts:5}).catch(error=>{if(error.code===10)throw new ApiError('IDEMPOTENCY_IN_PROGRESS');throw error;});
  }};
}
