import {z} from 'zod';
import {ApiError} from '../contracts/errors.mjs';
import {resourceIdSchema,hashSchema} from '../contracts/hero.mjs';
import {mediaAssetIdSchema} from '../contracts/media-upload.mjs';
import {strictMediaV2JsonSchema,mediaMetadataV2Schema} from '../contracts/media-v3-metadata-v2.mjs';
import {siteMediaEntrySchema} from '../contracts/site-draft.mjs';
import {safeCatalogV2Schema} from '../contracts/media-v3-records-v2.mjs';
import {v2MediaManifestSchema,immutableManifestAssetFromReadyVersionV2,safeMetadataFromReadyVersionV2,canonicalMediaV2Json} from '../contracts/media-v3-contract-v2.mjs';
import {attemptTupleV2Schema,validateAuthorityEnvelopeV2} from '../contracts/media-v3-authority-v2.mjs';
import {processingProgramV2Schema} from '../contracts/media-v3-toolset-v2.mjs';
import {parsePersistedMediaV2} from '../contracts/media.mjs';
import {uploadRecordSchema,expectedUploadFromRecord,mediaV2DocumentId} from './media-upload-domain.mjs';
import {parseJobRecord} from './media-jobs-domain.mjs';
import {loadMediaProcessingProfile,hashMediaProcessingValue as hash} from './media-processing-profile.mjs';
import {selectedSiteV3AssetIds} from './site-v3-context.mjs';
import {transactionValue} from './transaction-context.mjs';
import {createHash} from 'node:crypto';
import {CONTENT_CODE_VERSION} from './content-code-version.mjs';

const demand=(condition,code='INTERNAL_ERROR')=>{if(!condition)throw new ApiError(code);};
const same=(a,b)=>canonicalMediaV2Json(a)===canonicalMediaV2Json(b);
const compare=(a,b)=>a<b?-1:a>b?1:0;
const effectiveId=entry=>entry.source==='LEGACY'?entry.asset.id:entry.asset.assetId;
const entryOrder=(a,b)=>compare(a.source,b.source)||compare(effectiveId(a),effectiveId(b));
const evidenceSchema=strictMediaV2JsonSchema.pipe(z.strictObject({
 contractRevision:z.literal(2),tuple:attemptTupleV2Schema,
 profileId:z.enum(['M3-IMAGE-R0-1','M3-PDF-R0-1','M3-VIDEO-R0-1','M3-PDF-LOCAL-1','M3-PDF-LOCAL-2','M3-PDF-LOCAL-3','M3-PDF-LOCAL-4','M3-PDF-LOCAL-5']),
 processingProgram:processingProgramV2Schema,executionRecipe:strictMediaV2JsonSchema,
 executionRecipeSha256:hashSchema,originalMetadata:strictMediaV2JsonSchema,
 toolSetSha256:hashSchema,processingRecipeSha256:hashSchema
}));
const metadataRowSchema=strictMediaV2JsonSchema.pipe(z.strictObject({contractRevision:z.literal(2),assetId:mediaAssetIdSchema,intentId:resourceIdSchema,metadata:mediaMetadataV2Schema}));
const mappingSchema=strictMediaV2JsonSchema.pipe(z.strictObject({contractRevision:z.literal(2),assetId:mediaAssetIdSchema,intentId:resourceIdSchema,jobId:resourceIdSchema}));
const existingIdsSchema=strictMediaV2JsonSchema.pipe(z.array(mediaAssetIdSchema).max(64)).refine(values=>values.every((value,index)=>index===0||values[index-1]<value));

function capture(value,limit=262144){
 strictMediaV2JsonSchema.parse(value);demand(Buffer.byteLength(JSON.stringify(value),'utf8')<=limit,'PAYLOAD_TOO_LARGE');
 return structuredClone(value);
}
function legacySafe(asset){
 return {source:'LEGACY',asset:{id:asset.id,kind:asset.kind,status:'LEGACY_READY',legacyPath:asset.legacyPath,label:asset.legacyPath.split('/').at(-1),...Object.fromEntries(['width','height','durationSeconds'].filter(key=>Object.hasOwn(asset,key)).map(key=>[key,asset[key]]))}};
}
function validateUses(content,entries){
 const byId=new Map(entries.map(entry=>[effectiveId(entry),entry]));
 function walk(value,path=[]){
  if(!value||typeof value!=='object')return;
  if(Object.hasOwn(value,'assetId')){
   const entry=byId.get(value.assetId);demand(entry,'VALIDATION_ERROR');
   const location=path.join('/');let kind;
   if(location==='settings/showreel')kind='VIDEO';
   else if(location==='settings/credential'||value.kind==='CREDENTIAL')kind='PDF';
   else{
    demand(Object.hasOwn(value,'alt')&&Object.hasOwn(value,'isDecorative'),'VALIDATION_ERROR');
    kind=value.derivativeRole==='POSTER'?'VIDEO':'IMAGE';
    if(value.derivativeRole==='POSTER')demand(entry.source==='MEDIA_VERSION'&&entry.asset.derivatives.some(d=>d.role==='POSTER'),'VALIDATION_ERROR');
   }
   demand(entry.asset.kind===kind,'VALIDATION_ERROR');
  }
  for(const [key,child] of Object.entries(value))walk(child,[...path,key]);
 }
 walk(content);
}

/** Server-only resolver. Caller supplies its current transaction and trusted
 * stored snapshot pins; neither parameter is an HTTP authorization claim.
 * Library readers currently lack transaction support, so they cannot replace
 * these fixed-key reads or weaken the Submit/archive conflict boundary.
 */
export function createSiteV3MediaProvider({db,library,writeVerification=false}){
 demand(db&&typeof db.collection==='function','LOCAL_RUNTIME_UNAVAILABLE');
 if(library!==undefined)demand(library&&typeof library==='object','LOCAL_RUNTIME_UNAVAILABLE');
 const ref=(collection,key)=>db.collection(collection).doc(key);
 async function read(transaction,reference){
  const snapshot=await transaction.get(reference);demand(snapshot.exists,'NOT_FOUND');
  demand(snapshot.id===reference.id);return capture(snapshot.data());
 }
 async function readAuthority(transaction,assetId){
  return transactionValue(transaction,'media-authority:'+assetId,async()=>{
  const raw=await read(transaction,ref('cmsMediaVersions',assetId));
  // Fast paths still bind all six current source records. A version change or
  // source-byte corruption invalidates a prior verification automatically.
  const rawMapping=await read(transaction,ref('cmsMediaJobMappings',mediaV2DocumentId({kind:'ASSET_JOB',assetId})));
  const rawUpload=await read(transaction,ref('cmsMediaUploads',mediaV2DocumentId({kind:'INTENT',intentId:rawMapping.intentId})));
  const rawJob=await read(transaction,ref('cmsMediaJobs',mediaV2DocumentId({kind:'JOB',jobId:rawMapping.jobId})));
  const rawMetadata=await read(transaction,ref('cmsMediaMetadata',mediaV2DocumentId({kind:'INTENT',intentId:rawMapping.intentId})));
  const rawEvidence=await read(transaction,ref('cmsMediaProcessingEvidence',resourceIdSchema.parse(raw.readyFact?.storage?.manifestReceiptId)));
  const sourceHash=createHash('sha256').update(CONTENT_CODE_VERSION).update(JSON.stringify([raw,rawMapping,rawUpload,rawJob,rawMetadata,rawEvidence])).digest('hex');
  const cached=db.content?.sql.prepare('SELECT * FROM cms_media_verified WHERE asset_id=?').get(assetId);
  if(cached?.validator_version===1&&cached.source_hash===sourceHash){
   const version=JSON.parse(cached.ready_json);demand(same(version,raw.readyVersion));return version;
  }
  const row=parsePersistedMediaV2(raw,{hashCanonical:hash});
  demand(row.assetId===assetId&&row.status==='READY','VALIDATION_ERROR');
  const mapping=mappingSchema.parse(rawMapping);
  demand(mapping.assetId===assetId&&mapping.jobId===row.readyFact.tuple.jobId&&mapping.intentId===row.readyFact.tuple.intentId);
  const upload=uploadRecordSchema.parse(rawUpload);
  const job=parseJobRecord(rawJob);
  const metadata=metadataRowSchema.parse(rawMetadata);
  const evidence=evidenceSchema.parse(rawEvidence);
  demand(metadata.assetId===assetId&&metadata.intentId===mapping.intentId&&same(metadata.metadata,row.metadata)&&row.createdAtMs===upload.intentHeader.createdAtMs);
  demand(same(evidence.tuple,row.readyFact.tuple)&&evidence.executionRecipeSha256===hash(evidence.executionRecipe)&&evidence.processingRecipeSha256===row.readyVersion.processingRecipeSha256&&evidence.processingRecipeSha256===hash(evidence.processingProgram)&&evidence.toolSetSha256===row.readyVersion.toolSetSha256);
  const profile=loadMediaProcessingProfile(row.kind,row.readyVersion);
  demand(evidence.profileId===profile.profileId&&same(evidence.processingProgram,profile.program)&&evidence.toolSetSha256===profile.toolSetSha256);
  validateAuthorityEnvelopeV2({readyVersion:row.readyVersion,readyFact:row.readyFact,metadata:row.metadata,actors:row.actors},{expectedUpload:expectedUploadFromRecord(upload),expectedJob:{record:job,toolSetManifest:profile.toolSetManifest,processingProgram:evidence.processingProgram,executionRecipe:evidence.executionRecipe,originalMetadata:evidence.originalMetadata},profileId:profile.profileId,hashCanonical:hash});
  demand(row.storage.original.key===`private/media/v2/${assetId}/originals/${upload.completion.originalId}`&&row.storage.original.generation===upload.completion.effect.generation);
  if(writeVerification&&db.content)db.content.sql.prepare(`INSERT INTO cms_media_verified VALUES (?,?,?,1,?) ON CONFLICT(asset_id) DO UPDATE SET source_hash=excluded.source_hash,ready_json=excluded.ready_json,validator_version=excluded.validator_version,verified_at=excluded.verified_at`).run(assetId,sourceHash,JSON.stringify(row.readyVersion),new Date().toISOString());
  return row.readyVersion;
  });
 }
 async function resolveSelection({transaction,content,legacyCatalog,pinnedManifest,existingAssetIds}){
  demand(transaction&&typeof transaction.get==='function','INTERNAL_ERROR');
  const selected=capture(content),legacy=capture(legacyCatalog);
  demand(selected.schemaVersion===3&&Array.isArray(legacy)&&legacy.length<=64,'VALIDATION_ERROR');
  const catalog=legacy.map(asset=>siteMediaEntrySchema.parse(asset)),legacyById=new Map(catalog.map(asset=>[asset.id,asset]));
  demand(legacyById.size===catalog.length&&['brand-diagonal','favicon'].every(id=>legacyById.get(id)?.kind==='IMAGE'));
  const ids=selectedSiteV3AssetIds(selected);demand(ids.length<=64,'VALIDATION_ERROR');ids.forEach(id=>mediaAssetIdSchema.parse(id));
  const pins=pinnedManifest===undefined?null:v2MediaManifestSchema.parse(capture(pinnedManifest));
  // Only the server context may derive this exception from the stored draft.
  const existing=new Set(existingAssetIds===undefined?[]:existingIdsSchema.parse(capture(existingAssetIds)));
  if(pins)demand(same(pins.map(effectiveId).sort(),ids));
  const orderedManifest=[],expectedMediaVersions=[];
  for(const assetId of ids){
   const legacyAsset=legacyById.get(assetId),pin=pins?.find(entry=>effectiveId(entry)===assetId);
   if(legacyAsset){
    const entry={source:'LEGACY',asset:legacyAsset};if(pin)demand(same(pin,entry));orderedManifest.push(entry);continue;
   }
   if(pin)demand(pin.source==='MEDIA_VERSION');
   const version=await readAuthority(transaction,assetId);
   const entry={source:'MEDIA_VERSION',asset:immutableManifestAssetFromReadyVersionV2(version)};
   if(pin)demand(same(pin,entry));else demand(version.archived===false||existing.has(assetId),'VALIDATION_ERROR');
   expectedMediaVersions.push(version);orderedManifest.push(entry);
  }
  orderedManifest.sort(entryOrder);v2MediaManifestSchema.parse(orderedManifest);validateUses(selected,orderedManifest);
  const safeCatalog=safeCatalogV2Schema.parse([...catalog.map(legacySafe),...expectedMediaVersions.map(version=>({source:'MEDIA_VERSION',asset:safeMetadataFromReadyVersionV2(version)}))].sort(entryOrder));
  return {orderedManifest,expectedMediaVersions,safeCatalog};
 }
 return Object.freeze({resolveSelection});
}
