import {z} from 'zod';
import {ApiError} from './errors.mjs';
import {resourceIdSchema,hashSchema,revisionSchema} from './hero.mjs';
import {canonicalJson} from './draft.mjs';
import {plainText,stableIdSchema} from './site-settings.mjs';
import {strictMediaV3JsonSchema} from './media-v3-metadata.mjs';

const exact=shape=>strictMediaV3JsonSchema.pipe(z.strictObject(shape));
const unique=values=>new Set(values).size===values.length;
const bytes=value=>new TextEncoder().encode(JSON.stringify(value)).length;
const timestamp=z.string().datetime().length(24);
const pathSchema=plainText(240);
const pages=z.array(z.number().int().min(1).max(48)).min(1).max(48).refine(values=>unique(values) && values.every((value,index)=>index===0 || value>values[index-1]));
const compare=(a,b)=>a.claimPath<b.claimPath?-1:a.claimPath>b.claimPath?1:a.id<b.id?-1:a.id>b.id?1:0;
const fixedPaths=['hero/facts','seo/facts','settings/brand/facts','settings/contact/facts','settings/credential/facts','settings/showreel/facts','sections/about/facts','sections/ip-studio/facts','sections/footer/facts','creative-copy'];
const supportedPaths=[...fixedPaths,'projects/*/facts','services/*/facts','clientLogos/*/facts'];
const claimPath=pathSchema.refine(value=>{
  if(fixedPaths.includes(value))return true;
  const parts=value.split('/');return parts.length===3 && ['projects','services','clientLogos'].includes(parts[0]) && stableIdSchema.safeParse(parts[1]).success && parts[2]==='facts';
});
const sourceCatalogSchema=z.array(exact({id:resourceIdSchema,kind:z.enum(['CREDENTIAL','SUPPLIED_FILE']),title:plainText(120),sha256:hashSchema,pageCount:z.literal(48).optional(),publicCredentialUrl:z.literal('http://127.0.0.1:5010/assets/Pinky-Lamb-Credential-2026.pdf').optional(),supportedClaimPaths:z.array(z.enum(supportedPaths)).max(13).refine(unique),excerpt:plainText(1000,{multiline:true}).optional()}).refine(value=>value.kind==='CREDENTIAL'?value.pageCount===48 && value.publicCredentialUrl!==undefined:value.pageCount===undefined && value.publicCredentialUrl===undefined)).max(16).refine(values=>unique(values.map(value=>value.id)));
const claimGroupsSchema=z.array(exact({claimPath,value:strictMediaV3JsonSchema})).max(61).refine(values=>unique(values.map(value=>value.claimPath)) && fixedPaths.every(path=>values.some(value=>value.claimPath===path)));
const claimSourcesSchema=z.array(exact({claimPath,sourceIds:z.array(resourceIdSchema).min(1).max(8).refine(unique)})).max(61).refine(values=>unique(values.map(value=>value.claimPath)));
const snapshotSchema=exact({id:resourceIdSchema,contentHash:hashSchema,schemaVersion:z.literal(3),templateVersion:z.literal('m3-site-media-v1'),submittedBy:resourceIdSchema,submittedAt:timestamp});
const claimDataSchema=exact({snapshot:snapshotSchema,currentClaimGroups:claimGroupsSchema,baselineClaimGroups:claimGroupsSchema,claimSources:claimSourcesSchema,sourceCatalog:sourceCatalogSchema});

export const sourceCheckV3Schema=exact({id:resourceIdSchema,snapshotId:resourceIdSchema,contentHash:hashSchema,schemaVersion:z.literal(3),templateVersion:z.literal('m3-site-media-v1'),claimPath:pathSchema,claimHash:hashSchema,evidence:z.array(exact({sourceId:resourceIdSchema,sha256:hashSchema,pages:pages.optional()})).min(1).max(8).refine(values=>unique(values.map(value=>value.sourceId))),verification:z.literal('SOURCE_CHECKED'),checkedBy:resourceIdSchema,checkedAt:timestamp,sourceRevision:revisionSchema.refine(value=>value>0),eventId:resourceIdSchema,note:plainText(1000,{multiline:true}).optional()}).refine(value=>bytes(value)<=8192);
const proofIndexSchema=z.record(pathSchema,resourceIdSchema).refine(value=>Object.keys(value).length<=61);
export const reviewStateV3Schema=exact({snapshotId:resourceIdSchema,status:z.enum(['IN_REVIEW','APPROVED','CHANGES_REQUESTED']),revision:z.number().int().min(0).max(1),activeReviewId:resourceIdSchema.nullable(),sourceRevision:revisionSchema,activeSourceCheckIds:proofIndexSchema,updatedAt:timestamp}).refine(value=>value.status==='IN_REVIEW'?value.revision===0 && value.activeReviewId===null:value.revision===1 && value.activeReviewId!==null);
export const reviewV3Schema=exact({id:resourceIdSchema,snapshotId:resourceIdSchema,outcome:z.enum(['APPROVED','CHANGES_REQUESTED']),contentHash:hashSchema,reviewedBy:resourceIdSchema,reviewedAt:timestamp,note:plainText(2000,{multiline:true}).optional(),creativeCopyDeclaration:z.enum(['NO_FACTUAL_CLAIMS','SOURCE_CHECKED']).optional(),sourceRevision:revisionSchema,sourceCheckIds:z.array(resourceIdSchema).max(61).refine(unique),attestationSetHash:hashSchema}).refine(value=>value.outcome==='APPROVED'?value.creativeCopyDeclaration!==undefined:value.note!==undefined);
const proofInputSchema=exact({reviewState:reviewStateV3Schema,review:reviewV3Schema.nullable(),sourceChecks:z.array(sourceCheckV3Schema).max(61).refine(values=>unique(values.map(value=>value.id)))});
const proofOptionsSchema=exact({proofView:z.enum(['ALL','APPROVED'])});

/** Context comes from validated snapshot identity and CONTENT projections.
 * The backend owner verifies provenance/completeness before supplying it. This
 * structural module cannot authenticate catalog ownership or source evidence.
 * It never treats raw LEGACY refs or a Rights allowlist as factual source data.
 */
function parseClaimContext(input){
  const keys=['snapshot','currentClaimGroups','baselineClaimGroups','claimSources','sourceCatalog','hashCanonical'];
  if(input===null || typeof input!=='object' || Object.getPrototypeOf(input)!==Object.prototype)throw new ApiError('INTERNAL_ERROR');
  const own=Reflect.ownKeys(input);if(own.length!==keys.length || own.some(key=>!keys.includes(key)))throw new ApiError('INTERNAL_ERROR');
  const data={};let hashCanonical;
  // Inspect all descriptors before extracting the executable hash capability.
  const descriptors=Object.getOwnPropertyDescriptors(input);
  for(const key of keys){const d=descriptors[key];if(!d || !d.enumerable || !Object.hasOwn(d,'value'))throw new ApiError('INTERNAL_ERROR');}
  for(const key of keys){if(key==='hashCanonical')hashCanonical=descriptors[key].value;else data[key]=descriptors[key].value;}
  if(typeof hashCanonical!=='function')throw new ApiError('INTERNAL_ERROR');
  const context=claimDataSchema.parse(data),known=new Set(context.currentClaimGroups.map(group=>group.claimPath));
  if(context.claimSources.some(binding=>!known.has(binding.claimPath) || binding.sourceIds.some(id=>!context.sourceCatalog.some(source=>source.id===id))))throw new ApiError('INTERNAL_ERROR');
  const baseline=new Map(context.baselineClaimGroups.map(group=>[group.claimPath,group.value]));
  const hash=value=>hashSchema.parse(hashCanonical(value));
  const groups=context.currentClaimGroups.map(group=>{
    const classification=group.claimPath==='creative-copy'?'CREATIVE':'FACTUAL';
    const change=!baseline.has(group.claimPath)?'NEW':canonicalJson(baseline.get(group.claimPath))===canonicalJson(group.value)?'UNCHANGED':'CHANGED';
    return {...group,claimHash:hash(group.value),classification,change,required:classification==='FACTUAL' && change!=='UNCHANGED'};
  });
  return {...context,hash,groups};
}
const supported=(source,path)=>source.supportedClaimPaths.includes(path) || ['projects','services','clientLogos'].some(family=>path.startsWith(`${family}/`) && path.endsWith('/facts') && source.supportedClaimPaths.includes(`${family}/*/facts`));
function validateRecord(input,context){
  const record=sourceCheckV3Schema.parse(input),snapshot=context.snapshot;
  const group=context.groups.find(group=>group.claimPath===record.claimPath);
  const binding=context.claimSources.find(value=>value.claimPath===record.claimPath);
  if(!group || record.snapshotId!==snapshot.id || record.contentHash!==snapshot.contentHash || record.claimHash!==group.claimHash || record.checkedBy===snapshot.submittedBy || record.checkedAt<snapshot.submittedAt)throw new ApiError('INTERNAL_ERROR');
  for(const evidence of record.evidence){
    const source=context.sourceCatalog.find(source=>source.id===evidence.sourceId);
    if(!source || !supported(source,record.claimPath) || (binding && !binding.sourceIds.includes(evidence.sourceId)) || evidence.sha256!==source.sha256 || (source.kind==='CREDENTIAL'?evidence.pages===undefined:evidence.pages!==undefined))throw new ApiError('INTERNAL_ERROR');
  }
  return record;
}
export function validateSourceCheckV3(input,claimContext){
  try{return validateRecord(input,parseClaimContext(claimContext));}catch{throw new ApiError('INTERNAL_ERROR');}
}

/** Terminal digest uses only required active checks, not the private view union.
 * Missing required checks are review eligibility failures. Stored full relation
 * validation wraps this internal failure as INTERNAL_ERROR.
 */
function terminalSelection(state,review,records,context){
  if(review.outcome==='CHANGES_REQUESTED')return [];
  const required=context.groups.filter(group=>group.required || (group.claimPath==='creative-copy' && review.creativeCopyDeclaration==='SOURCE_CHECKED'));
  return required.map(group=>{
    const id=state.activeSourceCheckIds[group.claimPath],record=records.find(value=>value.id===id);
    if(!id || !record)throw new ApiError('VALIDATION_ERROR');
    if(record.claimPath!==group.claimPath || record.sourceRevision>state.sourceRevision)throw new ApiError('INTERNAL_ERROR');
    return record;
  }).sort(compare);
}

/** No omitted options/defaults: proofView is exactly ALL or APPROVED.
 * ALL = active union pinned, APPROVED = frozen terminal pins only. The two
 * views never rewrite evidence/source arrays or alter the terminal digest.
 */
function resolveProofView(input,claimContext,options){
  const context=parseClaimContext(claimContext),{proofView}=proofOptionsSchema.parse(options);
  const {reviewState:state,review,sourceChecks}=proofInputSchema.parse(input),snapshot=context.snapshot;
  if(state.snapshotId!==snapshot.id)throw new ApiError('INTERNAL_ERROR');
  const known=new Set(context.groups.map(group=>group.claimPath)),entries=Object.entries(state.activeSourceCheckIds),activeIds=entries.map(([,id])=>id);
  if(!unique(activeIds) || entries.some(([path])=>!known.has(path)))throw new ApiError('INTERNAL_ERROR');
  const initial=state.status==='IN_REVIEW';
  if(initial && (proofView!=='ALL' || review!==null))throw new ApiError('INTERNAL_ERROR');
  if(!initial){
    if(review===null || review.id!==state.activeReviewId || review.snapshotId!==snapshot.id || review.contentHash!==snapshot.contentHash || review.outcome!==state.status || review.reviewedAt!==state.updatedAt || review.reviewedBy===snapshot.submittedBy || review.reviewedAt<snapshot.submittedAt || review.sourceRevision!==state.sourceRevision || (proofView==='APPROVED' && review.outcome!=='APPROVED'))throw new ApiError('INTERNAL_ERROR');
  }
  const pinned=review?.sourceCheckIds??[],expected=proofView==='APPROVED'?pinned:[...new Set([...activeIds,...pinned])];
  if(expected.length>61 || sourceChecks.length!==expected.length || sourceChecks.some(record=>!expected.includes(record.id)))throw new ApiError('INTERNAL_ERROR');
  const records=sourceChecks.map(record=>validateRecord(record,context));
  if(state.sourceRevision===0){
    if(entries.length || records.length || (initial && state.updatedAt!==snapshot.submittedAt))throw new ApiError('INTERNAL_ERROR');
  }else if(!entries.length)throw new ApiError('INTERNAL_ERROR');
  if(proofView==='ALL'){
    for(const [path,id] of entries){const record=records.find(record=>record.id===id);if(!record || record.claimPath!==path || record.sourceRevision>state.sourceRevision || record.checkedAt>state.updatedAt)throw new ApiError('INTERNAL_ERROR');}
    if(state.sourceRevision>0 && !records.some(record=>record.sourceRevision===state.sourceRevision && (initial?record.checkedAt===state.updatedAt:record.checkedAt<=state.updatedAt)))throw new ApiError('INTERNAL_ERROR');
  }
  if(review!==null){
    const selected=terminalSelection(state,review,records,context),ids=selected.map(record=>record.id).sort();
    if(canonicalJson(ids)!==canonicalJson(review.sourceCheckIds) || context.hash(attestationDigestProjection(selected))!==review.attestationSetHash || selected.some(record=>record.checkedAt>review.reviewedAt))throw new ApiError('INTERNAL_ERROR');
  }
  return records.sort(compare);
}
export function selectSourceChecksV3(input,claimContext,options){
  try{return resolveProofView(input,claimContext,options);}catch{throw new ApiError('INTERNAL_ERROR');}
}
export function validateSourceAttestationsV3(input,claimContext,options){
  try{resolveProofView(input,claimContext,options);return true;}catch{throw new ApiError('INTERNAL_ERROR');}
}
/** Full selected records, claimPath/id sorted; no evidence-array normalization.
 * SHA256(canonicalJson(projection)) is computed by the injected server hash
 * capability at validation. A digest is never source ownership/authentication.
 */
export function attestationDigestProjection(selectedChecks){
  try{
    const records=strictMediaV3JsonSchema.pipe(z.array(sourceCheckV3Schema).max(61).refine(values=>unique(values.map(value=>value.id)))).parse(selectedChecks);
    return structuredClone(records.sort(compare));
  }catch{throw new ApiError('INTERNAL_ERROR');}
}
