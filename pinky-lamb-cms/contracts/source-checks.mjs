import {z} from 'zod';
import {ApiError} from './errors.mjs';
import {resourceIdSchema,hashSchema,revisionSchema,MAX_BODY_BYTES} from './hero.mjs';
import {canonicalJson} from './draft.mjs';
import {strictSiteObject,plainText} from './site-settings.mjs';
import {projectClaimGroups,SITE_TEMPLATE_VERSION} from './site.mjs';
import {siteReviewStateSchema,siteReviewSchema,siteSourceCatalogSchema} from './site-draft.mjs';

export const MAX_SOURCE_CHECK_BYTES=8192;
export const MAX_SOURCE_PAGE_BYTES=131072;
const unique=values=>new Set(values).size===values.length;
const bytes=value=>new TextEncoder().encode(JSON.stringify(value)).length;
const pathSchema=plainText(240);
function wellFormedText(value){
 for(let index=0;index<value.length;index++){
  const unit=value.charCodeAt(index);
  if(unit>=0xd800 && unit<=0xdbff){const next=value.charCodeAt(++index);if(!(next>=0xdc00 && next<=0xdfff))return false;}
  else if(unit>=0xdc00 && unit<=0xdfff)return false;
 }
 return true;
}
// Firestore scalar strings cannot preserve unpaired UTF-16 units. Never normalize an intent.
export const sourceCheckNoteSchema=plainText(1000,{multiline:true}).refine(wellFormedText);
export const siteReviewNoteSchema=plainText(2000,{multiline:true}).refine(wellFormedText);
const pages=z.array(z.number().int().min(1).max(48)).min(1).max(48).refine(values=>unique(values) && values.every((value,index)=>index===0 || value>values[index-1]));
const requestEvidence=strictSiteObject({sourceId:resourceIdSchema,pages:pages.optional()});
const requestCheck=strictSiteObject({claimPath:pathSchema,evidence:z.array(requestEvidence).min(1).max(8).refine(values=>unique(values.map(value=>value.sourceId)))});
export const sourceCheckRequestSchema=strictSiteObject({snapshotId:resourceIdSchema,contentHash:hashSchema,expectedReviewRevision:z.literal(0),expectedSourceRevision:revisionSchema,checks:z.array(requestCheck).min(1).max(16).refine(values=>unique(values.map(value=>value.claimPath))),note:sourceCheckNoteSchema.optional()});
export const sourceCheckRecordSchema=strictSiteObject({id:resourceIdSchema,snapshotId:resourceIdSchema,contentHash:hashSchema,schemaVersion:z.literal(2),templateVersion:z.literal(SITE_TEMPLATE_VERSION),claimPath:pathSchema,claimHash:hashSchema,evidence:z.array(strictSiteObject({sourceId:resourceIdSchema,sha256:hashSchema,pages:pages.optional()})).min(1).max(8).refine(values=>unique(values.map(value=>value.sourceId))),verification:z.literal('SOURCE_CHECKED'),checkedBy:resourceIdSchema,checkedAt:z.string().datetime().length(24),sourceRevision:revisionSchema.refine(value=>value>0),eventId:resourceIdSchema,note:sourceCheckNoteSchema.optional()});
export const sourceCheckReceiptSchema=strictSiteObject({snapshotId:resourceIdSchema,contentHash:hashSchema,sourceRevision:revisionSchema.refine(value=>value>0),sourceCheckIds:z.array(resourceIdSchema).min(1).max(16).refine(unique)});
export const sourceCheckCursorSchema=strictSiteObject({snapshotId:resourceIdSchema,contentHash:hashSchema,view:z.enum(['ACTIVE','APPROVED']),sourceRevision:revisionSchema,lastClaimPath:pathSchema,lastId:resourceIdSchema});
export const sourceCheckQuerySchema=strictSiteObject({cursor:z.string().min(1).max(2048).optional(),pageSize:z.number().int().min(1).max(50).optional()});
export function parseSourceCheckRequest(value){
 try{
  const plain=strictSiteObject({snapshotId:z.unknown(),contentHash:z.unknown(),expectedReviewRevision:z.unknown(),expectedSourceRevision:z.unknown(),checks:z.unknown(),note:z.unknown().optional()}).parse(value);
  if(bytes(plain)>MAX_BODY_BYTES)throw new ApiError('PAYLOAD_TOO_LARGE');
  return sourceCheckRequestSchema.parse(plain);
 }catch(error){
  if(error instanceof ApiError)throw error;
  const safe=new ApiError('VALIDATION_ERROR');safe.siteValidationPaths=[...new Set((error.issues??[]).map(issue=>issue.path.join('.')).filter(path=>path.length>0 && path.length<=240 && path.split('.').length<=12))].slice(0,32);throw safe;
 }
}
/** Exact projections include hidden records. The resolver does not infer claims from prose. */
export function resolveClaimGroups(snapshot,context,hashCanonical){
 if(snapshot.schemaVersion!==2 || snapshot.templateVersion!==SITE_TEMPLATE_VERSION || typeof hashCanonical!=='function' || !context.baselineContent)throw new ApiError('INTERNAL_ERROR');
 const baseline=new Map(projectClaimGroups(context.baselineContent,context).map(group=>[group.claimPath,group.value]));
 return projectClaimGroups(snapshot.content,context).map(group=>{
  const classification=group.claimPath==='creative-copy'?'CREATIVE':'FACTUAL';
  const change=!baseline.has(group.claimPath)?'NEW':canonicalJson(baseline.get(group.claimPath))===canonicalJson(group.value)?'UNCHANGED':'CHANGED';
  return {...group,claimHash:hashSchema.parse(hashCanonical(group.value)),classification,change,required:classification==='FACTUAL' && change!=='UNCHANGED'};
 });
}
function supported(source,path){return source.supportedClaimPaths.includes(path) || ['projects','services','clientLogos'].some(family=>path.startsWith(`${family}/`) && path.endsWith('/facts') && source.supportedClaimPaths.includes(`${family}/*/facts`));}
export function resolveSourceEvidence(evidence,claimPath,context,snapshot){
 const sources=siteSourceCatalogSchema.parse(context.sourceCatalog);
 const binding=snapshot?.content.claimSources.find(value=>value.claimPath===claimPath);
 return evidence.map(value=>{
  const source=sources.find(source=>source.id===value.sourceId);
  if(!source || !supported(source,claimPath) || (binding && !binding.sourceIds.includes(value.sourceId)) || (source.kind==='CREDENTIAL'?value.pages===undefined:value.pages!==undefined))throw new ApiError('VALIDATION_ERROR');
  return {...value,sha256:source.sha256};
 });
}
export function validateSourceCheckRecord(value,{snapshot,context,hashCanonical}){
 try{
  const record=sourceCheckRecordSchema.parse(value);if(bytes(record)>MAX_SOURCE_CHECK_BYTES)throw new Error('Record cap');
  const group=resolveClaimGroups(snapshot,context,hashCanonical).find(group=>group.claimPath===record.claimPath);
  if(!group || record.snapshotId!==snapshot.id || record.contentHash!==snapshot.contentHash || record.claimHash!==group.claimHash || record.checkedBy===snapshot.submittedBy || record.checkedAt<snapshot.submittedAt || canonicalJson(record.evidence)!==canonicalJson(resolveSourceEvidence(record.evidence.map(({sourceId,pages})=>({sourceId,...(pages?{pages}:{})})),record.claimPath,context,snapshot)))throw new Error('Proof identity');
  return record;
 }catch{throw new ApiError('INTERNAL_ERROR');}
}
const compareRecords=(a,b)=>a.claimPath<b.claimPath?-1:a.claimPath>b.claimPath?1:a.id<b.id?-1:a.id>b.id?1:0;
/** Required groups are exact projected facts, never inferred from human prose. */
export function selectReviewSourceChecks({snapshot,reviewState,sourceChecks,creativeCopyDeclaration},context,hashCanonical){
 const required=resolveClaimGroups(snapshot,context,hashCanonical).filter(group=>group.required || (group.claimPath==='creative-copy' && creativeCopyDeclaration==='SOURCE_CHECKED'));
 const selected=required.map(group=>{
  const id=reviewState.activeSourceCheckIds[group.claimPath];
  const value=sourceChecks.find(record=>record.id===id);
  if(!id || !value)throw new ApiError('VALIDATION_ERROR');
  const record=validateSourceCheckRecord(value,{snapshot,context,hashCanonical});
  if(record.claimPath!==group.claimPath || record.sourceRevision>reviewState.sourceRevision)throw new ApiError('INTERNAL_ERROR');
  return record;
 });
 return selected.sort(compareRecords);
}
/** ALL checks private runtime relations; APPROVED checks only frozen export pins. */
export function validateSiteProofRelations({snapshot,reviewState,review,sourceChecks},context,hashCanonical,{proofView='ALL'}={}){
 try{
  const state=siteReviewStateSchema.parse(reviewState);
  if(!['ALL','APPROVED'].includes(proofView) || state.snapshotId!==snapshot.id || !Array.isArray(sourceChecks) || sourceChecks.length>61)throw new Error('Proof view');
  const groups=resolveClaimGroups(snapshot,context,hashCanonical),known=new Set(groups.map(group=>group.claimPath));
  const entries=Object.entries(state.activeSourceCheckIds),activeIds=entries.map(([,id])=>id);
  if(!unique(activeIds) || !entries.every(([path])=>known.has(path)) || !unique(sourceChecks.map(value=>value.id)))throw new Error('Proof index');
  const initial=state.status==='IN_REVIEW';
  if(initial && (proofView!=='ALL' || review!==null))throw new Error('Initial view');
  let saved=null;
  if(!initial){
   saved=siteReviewSchema.parse(review);
   if(saved.note!==undefined)siteReviewNoteSchema.parse(saved.note);
   if(saved.id!==state.activeReviewId || saved.snapshotId!==snapshot.id || saved.contentHash!==snapshot.contentHash || saved.outcome!==state.status || saved.reviewedAt!==state.updatedAt || saved.reviewedBy===snapshot.submittedBy || saved.reviewedAt<snapshot.submittedAt || saved.sourceRevision!==state.sourceRevision || (proofView==='APPROVED' && saved.outcome!=='APPROVED'))throw new Error('Review identity');
  }
  const pinnedIds=saved?.sourceCheckIds??[];
  const expectedIds=proofView==='APPROVED'?pinnedIds:[...new Set([...activeIds,...pinnedIds])];
  if(expectedIds.length>61 || sourceChecks.length!==expectedIds.length || !sourceChecks.every(record=>expectedIds.includes(record.id)))throw new Error('Proof set');
  const records=sourceChecks.map(value=>validateSourceCheckRecord(value,{snapshot,context,hashCanonical}));
  if(state.sourceRevision===0){if(entries.length || records.length || (initial && state.updatedAt!==snapshot.submittedAt))throw new Error('Initial source state');}
  else if(!entries.length)throw new Error('Empty active state');
  if(proofView==='ALL'){
   for(const [path,id] of entries){const record=records.find(record=>record.id===id);if(!record || record.claimPath!==path || record.sourceRevision>state.sourceRevision || record.checkedAt>state.updatedAt)throw new Error('Active relation');}
   if(state.sourceRevision>0 && !records.some(record=>record.sourceRevision===state.sourceRevision && (initial?record.checkedAt===state.updatedAt:record.checkedAt<=state.updatedAt)))throw new Error('Latest source revision');
  }
  if(saved){
   const selected=saved.outcome==='CHANGES_REQUESTED'?[]:selectReviewSourceChecks({snapshot,reviewState:state,sourceChecks:records,creativeCopyDeclaration:saved.creativeCopyDeclaration},context,hashCanonical);
   const ids=selected.map(record=>record.id).sort();
   if(canonicalJson(ids)!==canonicalJson(saved.sourceCheckIds) || saved.attestationSetHash!==hashCanonical(selected) || selected.some(record=>record.checkedAt>saved.reviewedAt))throw new Error('Frozen attestation');
  }
  return true;
 }catch{throw new ApiError('INTERNAL_ERROR');}
}
