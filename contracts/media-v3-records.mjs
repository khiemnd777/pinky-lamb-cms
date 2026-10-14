import {z} from 'zod';
import {ApiError,validationError} from './errors.mjs';
import {resourceIdSchema,hashSchema,revisionSchema} from './hero.mjs';
import {plainText} from './site-settings.mjs';
import {canonicalJson} from './draft.mjs';
import {strictMediaV3JsonSchema,uploadActorsSchema} from './media-v3-metadata.mjs';
import {createMediaV3ContentSchemas,projectClaimGroupsV3} from './media-v3-content.mjs';
import {sourceCheckV3Schema,reviewStateV3Schema,reviewV3Schema,validateSourceAttestationsV3} from './media-v3-attestations.mjs';
import {mediaRightsProofV3Schema,validateTerminalRightsProofV3} from './media-v3-authority.mjs';
import {mediaBindingSchema,v3MediaManifestSchema} from './media-v3-contract.mjs';

const exact=shape=>strictMediaV3JsonSchema.pipe(z.strictObject(shape));
const same=(a,b)=>canonicalJson(a)===canonicalJson(b);
const compare=(a,b)=>a<b?-1:a>b?1:0;
const unique=values=>new Set(values).size===values.length;
const assetId=z.string().regex(/^[A-Za-z0-9_-]{1,100}$/);
const positive=max=>z.number().int().min(1).max(max);
const timestamp=z.string().datetime().length(24);
const versionFields={draftId:z.literal('home-v3'),schemaVersion:z.literal(3),templateVersion:z.literal('m3-site-media-v1')};
const sourceM1LineageSchema=exact({importId:resourceIdSchema,importedM1Revision:revisionSchema,importedM1ContentHash:hashSchema,baselineManifestHash:hashSchema,importReportHash:hashSchema});
export const v3ImportLineageSchema=exact({importId:resourceIdSchema,sourceDraftId:z.literal('home-v2'),sourceSchemaVersion:z.literal(2),sourceTemplateVersion:z.literal('m2-site-baseline-v1'),sourceDraftRevision:revisionSchema,sourceContentHash:hashSchema,sourceMediaManifestHash:hashSchema,sourceRefsHash:hashSchema,sourceImportLineage:sourceM1LineageSchema,importReportHash:hashSchema});
export const mediaRightsProofPinSchema=exact({assetId,proofId:resourceIdSchema,proofDigest:hashSchema});
const pinsSchema=z.array(mediaRightsProofPinSchema).max(64).refine(values=>unique(values.map(value=>value.assetId)) && unique(values.map(value=>value.proofId)));
const orderedPinsSchema=pinsSchema.refine(values=>values.every((value,index)=>index===0 || values[index-1].assetId<value.assetId));
const legacySafeSchema=exact({id:resourceIdSchema,kind:z.enum(['IMAGE','PDF','VIDEO']),status:z.literal('LEGACY_READY'),legacyPath:z.string().regex(/^assets\/[A-Za-z0-9][A-Za-z0-9._-]*$/),label:plainText(160),width:positive(Number.MAX_SAFE_INTEGER).optional(),height:positive(Number.MAX_SAFE_INTEGER).optional(),durationSeconds:z.number().finite().positive().optional()});
const safeCommon={assetId,status:z.literal('READY'),archived:z.boolean(),revision:revisionSchema};
const versionSafeSchema=z.union([
  exact({...safeCommon,kind:z.literal('IMAGE'),width:positive(8192),height:positive(8192)}).refine(value=>value.width*value.height<=40000000),
  exact({...safeCommon,kind:z.literal('PDF'),pageCount:positive(48)}),
  exact({...safeCommon,kind:z.literal('VIDEO'),width:positive(1280),height:positive(720),durationSeconds:z.number().finite().positive().max(300)})
]);
const effectiveId=entry=>entry.source==='LEGACY'?entry.asset.id:entry.asset.assetId;
const compareEntries=(a,b)=>compare(a.source,b.source)||compare(effectiveId(a),effectiveId(b));
export const safeCatalogV3Schema=strictMediaV3JsonSchema.pipe(z.array(z.union([exact({source:z.literal('LEGACY'),asset:legacySafeSchema}),exact({source:z.literal('MEDIA_VERSION'),asset:versionSafeSchema})])).max(128).refine(values=>unique(values.map(effectiveId)) && values.filter(value=>value.source==='LEGACY').length<=64 && values.filter(value=>value.source==='MEDIA_VERSION').length<=64 && values.every((value,index)=>index===0 || compareEntries(values[index-1],value)<0)));
const supportedPaths=['hero/facts','seo/facts','settings/brand/facts','settings/contact/facts','settings/credential/facts','settings/showreel/facts','sections/about/facts','sections/ip-studio/facts','sections/footer/facts','creative-copy','projects/*/facts','services/*/facts','clientLogos/*/facts'];
const sourceCatalogSchema=z.array(exact({id:resourceIdSchema,kind:z.enum(['CREDENTIAL','SUPPLIED_FILE']),title:plainText(120),sha256:hashSchema,pageCount:z.literal(48).optional(),publicCredentialUrl:z.literal('http://127.0.0.1:5010/assets/Pinky-Lamb-Credential-2026.pdf').optional(),supportedClaimPaths:z.array(z.enum(supportedPaths)).max(13).refine(unique),excerpt:plainText(1000,{multiline:true}).optional()}).refine(value=>value.kind==='CREDENTIAL'?value.pageCount===48 && value.publicCredentialUrl!==undefined:value.pageCount===undefined && value.publicCredentialUrl===undefined)).max(16).refine(values=>unique(values.map(value=>value.id)));
const rawSourceRefSchema=exact({id:z.string().regex(/^source-[a-f0-9]{64}$/),kind:z.literal('SUPPLIED_FILE'),privateDocumentId:z.string().regex(/^legacy-source-[a-f0-9]{64}$/),claimBindings:z.array(z.unknown()).max(0),verification:z.literal('UNVERIFIED')});
const sourceRefsSchema=z.array(rawSourceRefSchema).min(1).max(600).refine(values=>unique(values.map(value=>value.id)));
const compareDerivatives=(a,b)=>compare(a.role,b.role)||(a.role==='IMAGE'?a.targetWidth-b.targetWidth:a.role==='PDF_PAGE'?a.pageNumber-b.pageNumber:0)||compare(a.key,b.key);
const orderedManifestSchema=strictMediaV3JsonSchema.pipe(v3MediaManifestSchema).refine(values=>values.every((entry,index)=>(index===0 || compareEntries(values[index-1],entry)<0) && (entry.source!=='MEDIA_VERSION' || entry.asset.derivatives.every((value,index)=>index===0 || compareDerivatives(entry.asset.derivatives[index-1],value)<0))) && ['brand-diagonal','favicon'].every(id=>values.some(entry=>entry.source==='LEGACY' && entry.asset.id===id && entry.asset.kind==='IMAGE')));
const draftFields={...versionFields,revision:revisionSchema,updatedBy:resourceIdSchema,updatedAt:timestamp,lastEventId:resourceIdSchema,importLineage:v3ImportLineageSchema};
const summaryFields={id:resourceIdSchema,...versionFields,draftRevision:revisionSchema,contentHash:hashSchema,mediaManifestHash:hashSchema,submittedBy:resourceIdSchema,submittedAt:timestamp};
const summarySchema=exact(summaryFields);
const snapshotFields={...summaryFields,mediaManifest:orderedManifestSchema,sourceRefs:sourceRefsSchema,importLineage:v3ImportLineageSchema,mediaRightsProofPins:orderedPinsSchema,mediaRightsProofPinsHash:hashSchema,message:plainText(500,{multiline:true}).optional()};
const sourceChecksSchema=z.array(sourceCheckV3Schema).max(61).refine(values=>unique(values.map(value=>value.id)));
const rightsChecksSchema=z.array(mediaRightsProofV3Schema).max(64).refine(values=>unique(values.map(value=>value.id)) && unique(values.map(value=>value.binding.assetId)));

/** Shapes only; all owner contexts and hashes are checked by validators below.
 * Whole actual JSON budgets belong to C, applied at composition boundaries.
 */
export function createMediaV3RecordSchemas(contentContext){
  const {contentSchema}=createMediaV3ContentSchemas(contentContext);
  const domainDraftSchema=exact({...draftFields,content:contentSchema});
  const storedDraftSchema=exact({...draftFields,contentJson:z.string()});
  const snapshotSchema=exact({...snapshotFields,content:contentSchema});
  const storedSnapshotSchema=exact({...snapshotFields,contentJson:z.string()});
  const draftReadSchema=exact({...draftFields,content:contentSchema,catalog:safeCatalogV3Schema,sourceCatalog:sourceCatalogSchema});
  const snapshotReadSchema=exact({summary:summarySchema,snapshot:snapshotSchema,reviewState:reviewStateV3Schema,review:reviewV3Schema.nullable(),sourceCatalog:sourceCatalogSchema});
  const qaSchema=exact({snapshot:snapshotSchema,reviewState:reviewStateV3Schema,review:reviewV3Schema,sourceChecks:sourceChecksSchema,mediaRightsChecks:rightsChecksSchema});
  return {domainDraftSchema,storedDraftSchema,snapshotSchema,storedSnapshotSchema,draftReadSchema,snapshotReadSchema,qaSchema};
}
const requireRelation=value=>{if(!value)throw new ApiError('INTERNAL_ERROR');};
const capture=value=>{strictMediaV3JsonSchema.parse(value);return structuredClone(value);};
const digest=(hash,value)=>hashSchema.parse(hash(capture(value)));
const baseKeys=['contentContext','expectedImport','hashCanonical'];
const snapshotKeys=[...baseKeys,'selectedAssetIds','orderedManifest','expectedSourceRefs','originalTerminalProofs'];
const terminalContextSchema=exact({binding:mediaBindingSchema,actors:uploadActorsSchema,originalCheckerUid:resourceIdSchema});
const originalTerminalsSchema=z.array(exact({proof:mediaRightsProofV3Schema,context:terminalContextSchema})).max(64).refine(values=>unique(values.map(value=>value.proof.binding.assetId)) && unique(values.map(value=>value.proof.id)));
const selectedIdsSchema=z.array(assetId).min(1).max(64).refine(values=>unique(values) && values.every((value,index)=>index===0 || values[index-1]<value));
function descriptors(input,keys){
  if(input===null || typeof input!=='object' || Object.getPrototypeOf(input)!==Object.prototype)throw new ApiError('INTERNAL_ERROR');
  const own=Reflect.ownKeys(input),ds=Object.getOwnPropertyDescriptors(input);
  if(own.length!==keys.length || own.some(key=>!keys.includes(key)))throw new ApiError('INTERNAL_ERROR');
  for(const key of keys){const d=ds[key];if(!d || !d.enumerable || !Object.hasOwn(d,'value'))throw new ApiError('INTERNAL_ERROR');}
  return Object.fromEntries(keys.map(key=>[key,ds[key].value]));
}
/** Capture all JSON DATA before a callback can mutate its original references.
 * claimContext retains ATTEST's exact callback-bearing shape, independently
 * supplied by the source owner. No provenance/authentication flag is accepted.
 */
function relationContext(input,keys){
  try{
    const raw=descriptors(input,keys);if(typeof raw.hashCanonical!=='function')throw new Error('Hash capability');
    const data=Object.fromEntries(keys.filter(key=>!['hashCanonical','sourceAttestations'].includes(key)).map(key=>[key,raw[key]]));
    const c={...capture(data),hashCanonical:raw.hashCanonical};
    if(keys.includes('sourceAttestations')){
      const sources=descriptors(raw.sourceAttestations,['sourceChecks','claimContext']);
      const claims=descriptors(sources.claimContext,['snapshot','currentClaimGroups','baselineClaimGroups','claimSources','sourceCatalog','hashCanonical']);
      if(typeof claims.hashCanonical!=='function')throw new Error('Claim hash capability');
      const claimData=Object.fromEntries(Object.entries(claims).filter(([key])=>key!=='hashCanonical'));
      c.sourceAttestations={sourceChecks:capture(sources.sourceChecks),claimContext:{...capture(claimData),hashCanonical:claims.hashCanonical}};
      sourceChecksSchema.parse(c.sourceAttestations.sourceChecks);
    }
    // Factory validates the one exact content context; importer identity is
    // supplied from CURRENT M2 by I. No raw M2 loader/transform/import is run.
    c.schemas=createMediaV3RecordSchemas(c.contentContext);v3ImportLineageSchema.parse(c.expectedImport);
    if(keys.includes('selectedAssetIds')){
      selectedIdsSchema.parse(c.selectedAssetIds);orderedManifestSchema.parse(c.orderedManifest);sourceRefsSchema.parse(c.expectedSourceRefs);originalTerminalsSchema.parse(c.originalTerminalProofs);
      requireRelation(same([...c.orderedManifest.map(effectiveId)].sort(),c.selectedAssetIds));
      const versions=c.orderedManifest.filter(entry=>entry.source==='MEDIA_VERSION');
      requireRelation(versions.length===c.originalTerminalProofs.length);
      for(const original of c.originalTerminalProofs){
        const proof=original.proof,version=versions.find(entry=>entry.asset.assetId===proof.binding.assetId);
        requireRelation(proof.decision==='APPROVED' && version!==undefined && same(bindingOfManifest(version.asset),original.context.binding));
      }
    }
    if(keys.includes('expectedSafeCatalog'))safeCatalogV3Schema.parse(c.expectedSafeCatalog);
    if(keys.includes('expectedSourceCatalog')){
      sourceCatalogSchema.parse(c.expectedSourceCatalog);requireRelation(same(c.expectedSourceCatalog,c.contentContext.sourceCatalog));
    }
    return c;
  }catch{throw new ApiError('INTERNAL_ERROR');}
}
function prepare(input,context,keys,schemaName,encoding=false){
  const c=relationContext(context,keys);
  let value;try{value=capture(input);c.schemas[schemaName].parse(value);}catch(error){if(encoding)throw validationError(error);throw new ApiError('INTERNAL_ERROR');}
  // Context parsing above performs no hashes. Capture caller DATA before even
  // an original-proof hash callback can change caller-owned record references.
  if(keys.includes('originalTerminalProofs')){
    try{for(const original of c.originalTerminalProofs)validateTerminalRightsProofV3(original.proof,{...original.context,hashCanonical:c.hashCanonical});}catch{throw new ApiError('INTERNAL_ERROR');}
  }
  return {c,value};
}
function bindingOfManifest(asset){
  const keys=['assetId','kind','originalSha256','derivativeSetSha256','processingRecipeSha256','toolSetSha256','evidenceSha256'];
  return mediaBindingSchema.parse(Object.fromEntries(keys.map(key=>[key,asset[key]])));
}
function draftRelations(value,c){requireRelation(same(value.importLineage,c.expectedImport));}
function snapshotRelations(value,c){
  draftRelations(value,c);
  requireRelation(same(value.mediaManifest,c.orderedManifest) && same(value.sourceRefs,c.expectedSourceRefs));
  requireRelation(value.mediaManifestHash===digest(c.hashCanonical,value.mediaManifest) && value.contentHash===digest(c.hashCanonical,contentDigestProjection(value.content,value.mediaManifestHash)) && value.mediaRightsProofPinsHash===digest(c.hashCanonical,rightsPinsDigestProjection(value.mediaRightsProofPins)));
  const versions=value.mediaManifest.filter(entry=>entry.source==='MEDIA_VERSION');
  requireRelation(versions.length===value.mediaRightsProofPins.length);
  for(const pin of value.mediaRightsProofPins){
    const original=c.originalTerminalProofs.find(value=>value.proof.binding.assetId===pin.assetId);
    requireRelation(original!==undefined && original.proof.id===pin.proofId && original.proof.proofDigest===pin.proofDigest);
  }
  // sourceRefsHash belongs to the source CURRENT M2 identity, not this new
  // selected V3 raw lineage list. Raw refs never substitute factual attestations.
}
function claimRelations(snapshot,c){
  const claims=c.sourceAttestations.claimContext;
  const identity=Object.fromEntries(['id','contentHash','schemaVersion','templateVersion','submittedBy','submittedAt'].map(key=>[key,snapshot[key]]));
  requireRelation(same(claims.snapshot,identity) && same(claims.currentClaimGroups,projectClaimGroupsV3(snapshot.content)) && same(claims.claimSources,snapshot.content.claimSources) && same(claims.sourceCatalog,c.contentContext.sourceCatalog));
}
const sameSets=(a,b,key)=>same([...a].sort((a,b)=>compare(key(a),key(b))),[...b].sort((a,b)=>compare(key(a),key(b))));
function sourceRelations(value,c,proofView){
  claimRelations(value.snapshot,c);
  const proofs=proofView==='APPROVED'?value.sourceChecks:c.sourceAttestations.sourceChecks;
  if(proofView==='APPROVED')requireRelation(sameSets(value.sourceChecks,c.sourceAttestations.sourceChecks,value=>value.id));
  validateSourceAttestationsV3({reviewState:value.reviewState,review:value.review,sourceChecks:proofs},c.sourceAttestations.claimContext,{proofView});
}

/** All validators return stable validated DATA with submitted property order.
 * A/B provide selection/ordered manifest independently; I provides lineage;
 * source/Rights owners provide original proofs. These contexts do not mint Auth.
 */
export function validateDraftV3(input,context){
  const {c,value}=prepare(input,context,baseKeys,'domainDraftSchema');
  try{draftRelations(value,c);return value;}catch{throw new ApiError('INTERNAL_ERROR');}
}
export function validateSnapshotV3(input,context){
  const {c,value}=prepare(input,context,snapshotKeys,'snapshotSchema');
  try{snapshotRelations(value,c);return value;}catch{throw new ApiError('INTERNAL_ERROR');}
}
export function validateDraftReadV3(input,context){
  const {c,value}=prepare(input,context,[...baseKeys,'expectedSafeCatalog','expectedSourceCatalog'],'draftReadSchema');
  try{draftRelations(value,c);requireRelation(same(value.catalog,c.expectedSafeCatalog) && same(value.sourceCatalog,c.expectedSourceCatalog));return value;}catch{throw new ApiError('INTERNAL_ERROR');}
}
export function validateSnapshotReadV3(input,context){
  const {c,value}=prepare(input,context,[...snapshotKeys,'expectedSourceCatalog','sourceAttestations'],'snapshotReadSchema');
  try{
    snapshotRelations(value.snapshot,c);
    requireRelation(Object.keys(summaryFields).every(key=>value.summary[key]===value.snapshot[key]) && same(value.sourceCatalog,c.expectedSourceCatalog));
    sourceRelations(value,c,'ALL');return value;
  }catch{throw new ApiError('INTERNAL_ERROR');}
}
export function validateQaV3(input,context){
  const {c,value}=prepare(input,context,[...snapshotKeys,'sourceAttestations'],'qaSchema');
  try{
    snapshotRelations(value.snapshot,c);sourceRelations(value,c,'APPROVED');
    requireRelation(sameSets(value.mediaRightsChecks,c.originalTerminalProofs.map(value=>value.proof),value=>value.id));return value;
  }catch{throw new ApiError('INTERNAL_ERROR');}
}
function encode(input,context,snapshot){
  const {c,value}=prepare(input,context,snapshot?snapshotKeys:baseKeys,snapshot?'snapshotSchema':'domainDraftSchema',true);
  try{
    // Capture before any digest/proof callback. Schema parsing is validation,
    // not serialization: Zod's field enumeration may differ from raw DATA.
    if(snapshot)snapshotRelations(value,c);else draftRelations(value,c);
    const {content,...metadata}=value,stored={...metadata,contentJson:JSON.stringify(content)};
    (snapshot?c.schemas.storedSnapshotSchema:c.schemas.storedDraftSchema).parse(stored);return stored;
  }catch(error){if(error instanceof ApiError)throw new ApiError('VALIDATION_ERROR');throw validationError(error);}
}
function decode(input,context,snapshot){
  const {c,value}=prepare(input,context,snapshot?snapshotKeys:baseKeys,snapshot?'storedSnapshotSchema':'storedDraftSchema');
  try{
    const {contentJson,...metadata}=value,content=capture(JSON.parse(contentJson)),domain={...metadata,content};
    (snapshot?c.schemas.snapshotSchema:c.schemas.domainDraftSchema).parse(domain);
    if(snapshot)snapshotRelations(domain,c);else draftRelations(domain,c);return domain;
  }catch{throw new ApiError('INTERNAL_ERROR');}
}
export const encodeStoredDraftV3=(input,context)=>encode(input,context,false);
export const decodeStoredDraftV3=(input,context)=>decode(input,context,false);
export const encodeStoredSnapshotV3=(input,context)=>encode(input,context,true);
export const decodeStoredSnapshotV3=(input,context)=>decode(input,context,true);
export function contentDigestProjection(content,mediaManifestHash){
  try{const value=capture(content);z.literal(3).parse(value.schemaVersion);hashSchema.parse(mediaManifestHash);return {content:value,mediaManifestHash,schemaVersion:3,templateVersion:'m3-site-media-v1'};}catch{throw new ApiError('INTERNAL_ERROR');}
}
export function rightsPinsDigestProjection(pins){
  try{const values=capture(pins);pinsSchema.parse(values);return values.sort((a,b)=>compare(a.assetId,b.assetId));}catch{throw new ApiError('INTERNAL_ERROR');}
}
