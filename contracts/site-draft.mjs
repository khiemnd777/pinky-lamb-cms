import {z} from 'zod';
import {ApiError,validationError} from './errors.mjs';
import {revisionSchema,resourceIdSchema,hashSchema,MAX_REVISION,MAX_BODY_BYTES,MAX_ENVELOPE_BYTES,assertEnvelopeSize} from './hero.mjs';
import {utcTimestampSchema,canonicalJson} from './draft.mjs';
import {strictSiteObject,plainText} from './site-settings.mjs';
import {SITE_DRAFT_ID,SITE_SCHEMA_VERSION,SITE_TEMPLATE_VERSION,createSiteSchemas,validateSiteContent,collectSiteAssetIds,projectClaimGroups} from './site.mjs';

export const MAX_SITE_MEDIA_ENTRIES=30;
export const MAX_SITE_SOURCE_REFERENCES=600;
export const MAX_SITE_CLAIM_GROUPS=61;
const supportedPaths=['hero/facts','seo/facts','settings/brand/facts','settings/contact/facts','settings/credential/facts','settings/showreel/facts','sections/about/facts','sections/ip-studio/facts','sections/footer/facts','creative-copy','projects/*/facts','services/*/facts','clientLogos/*/facts'];
const unique=values=>new Set(values).size===values.length;
const reference=plainText(240);
const siteTimestampSchema=utcTimestampSchema.refine(value=>value.length===24);
export const siteImportLineageSchema=strictSiteObject({importId:resourceIdSchema,importedM1Revision:revisionSchema,importedM1ContentHash:hashSchema,baselineManifestHash:hashSchema,importReportHash:hashSchema});
export const siteSourceCatalogSchema=z.array(strictSiteObject({id:resourceIdSchema,kind:z.enum(['CREDENTIAL','SUPPLIED_FILE']),title:plainText(120),sha256:hashSchema,pageCount:z.literal(48).optional(),publicCredentialUrl:z.literal('http://127.0.0.1:5010/assets/Pinky-Lamb-Credential-2026.pdf').optional(),supportedClaimPaths:z.array(z.enum(supportedPaths)).max(13).refine(unique),excerpt:plainText(1000,{multiline:true}).optional()}).refine(value=>value.kind==='CREDENTIAL'?value.pageCount===48 && value.publicCredentialUrl!==undefined:value.pageCount===undefined && value.publicCredentialUrl===undefined)).max(16).refine(values=>unique(values.map(value=>value.id)));
export const siteMediaEntrySchema=strictSiteObject({id:resourceIdSchema,kind:z.enum(['IMAGE','VIDEO','PDF']),legacyPath:z.string().regex(/^assets\/[A-Za-z0-9][A-Za-z0-9._-]*$/),mimeType:plainText(80),sizeBytes:z.number().int().positive().max(Number.MAX_SAFE_INTEGER),sha256:hashSchema,rights:strictSiteObject({basis:z.literal('CLIENT_SUPPLIED'),evidenceRef:reference}),sourceRefs:z.array(reference).min(1).max(20),width:z.number().int().positive().optional(),height:z.number().int().positive().optional(),durationSeconds:z.number().finite().positive().optional()});
export const siteMediaManifestSchema=z.array(siteMediaEntrySchema).min(1).max(MAX_SITE_MEDIA_ENTRIES).refine(values=>unique(values.map(value=>value.id)));
export const siteSourceReferenceSchema=strictSiteObject({id:z.string().regex(/^source-[a-f0-9]{64}$/),kind:z.literal('SUPPLIED_FILE'),privateDocumentId:z.string().regex(/^legacy-source-[a-f0-9]{64}$/),claimBindings:z.array(z.unknown()).max(0),verification:z.literal('UNVERIFIED')});
const versionFields={draftId:z.literal(SITE_DRAFT_ID),schemaVersion:z.literal(SITE_SCHEMA_VERSION),templateVersion:z.literal(SITE_TEMPLATE_VERSION)};
const draftFields={...versionFields,revision:revisionSchema,updatedBy:resourceIdSchema,updatedAt:siteTimestampSchema,lastEventId:resourceIdSchema,importLineage:siteImportLineageSchema};
const summaryFields={id:resourceIdSchema,...versionFields,draftRevision:revisionSchema,contentHash:hashSchema,mediaManifestHash:hashSchema,submittedBy:resourceIdSchema,submittedAt:siteTimestampSchema};
export const siteSnapshotSummarySchema=strictSiteObject(summaryFields);
const snapshotFields={...summaryFields,mediaManifest:siteMediaManifestSchema,sourceRefs:z.array(siteSourceReferenceSchema).min(1).max(MAX_SITE_SOURCE_REFERENCES),importLineage:siteImportLineageSchema,message:plainText(500,{multiline:true}).optional()};
const safeCatalogSchema=z.array(strictSiteObject({id:resourceIdSchema,kind:z.enum(['IMAGE','VIDEO','PDF']),status:z.literal('LEGACY_READY'),legacyPath:z.string().regex(/^assets\/[A-Za-z0-9][A-Za-z0-9._-]*$/),label:plainText(160),width:z.number().int().positive().optional(),height:z.number().int().positive().optional(),durationSeconds:z.number().finite().positive().optional()})).max(30);
const proofIndexSchema=z.record(z.string().max(240),resourceIdSchema).refine(value=>Object.keys(value).length<=MAX_SITE_CLAIM_GROUPS);
export const siteReviewStateSchema=strictSiteObject({snapshotId:resourceIdSchema,status:z.enum(['IN_REVIEW','APPROVED','CHANGES_REQUESTED']),revision:z.number().int().min(0).max(1),activeReviewId:resourceIdSchema.nullable(),sourceRevision:revisionSchema,activeSourceCheckIds:proofIndexSchema,updatedAt:siteTimestampSchema}).refine(value=>value.status==='IN_REVIEW'?value.revision===0 && value.activeReviewId===null:value.revision===1 && value.activeReviewId!==null);
export const siteReviewSchema=strictSiteObject({id:resourceIdSchema,snapshotId:resourceIdSchema,outcome:z.enum(['APPROVED','CHANGES_REQUESTED']),contentHash:hashSchema,reviewedBy:resourceIdSchema,reviewedAt:siteTimestampSchema,note:plainText(2000,{multiline:true}).optional(),creativeCopyDeclaration:z.enum(['NO_FACTUAL_CLAIMS','SOURCE_CHECKED']).optional(),sourceRevision:revisionSchema,sourceCheckIds:z.array(resourceIdSchema).max(MAX_SITE_CLAIM_GROUPS).refine(unique),attestationSetHash:hashSchema}).refine(value=>value.outcome==='APPROVED'?value.creativeCopyDeclaration!==undefined:value.note!==undefined);

export function createSiteDraftSchemas(context){
  const {contentSchema}=createSiteSchemas(context);
  const domainDraftSchema=strictSiteObject({...draftFields,content:contentSchema});
  const storedDraftSchema=strictSiteObject({...draftFields,contentJson:z.string()});
  const snapshotSchema=strictSiteObject({...snapshotFields,content:contentSchema});
  const storedSnapshotSchema=strictSiteObject({...snapshotFields,contentJson:z.string()});
  const draftReadSchema=strictSiteObject({...draftFields,content:contentSchema,catalog:safeCatalogSchema,sourceCatalog:siteSourceCatalogSchema});
  const snapshotReadSchema=strictSiteObject({summary:siteSnapshotSummarySchema,snapshot:snapshotSchema,reviewState:siteReviewStateSchema,review:siteReviewSchema.nullable(),sourceCatalog:siteSourceCatalogSchema}).superRefine((value,ctx)=>{
    const {snapshot,summary,reviewState:state,review}=value;
    const knownPaths=projectClaimGroups(snapshot.content,context).map(group=>group.claimPath);
    const invalidSummary=Object.keys(summary).some(key=>summary[key]!==snapshot[key]);
    const invalidState=state.snapshotId!==snapshot.id || !Object.keys(state.activeSourceCheckIds).every(path=>knownPaths.includes(path));
    const invalidReview=state.status==='IN_REVIEW'?review!==null:!review || review.id!==state.activeReviewId || review.snapshotId!==snapshot.id || review.contentHash!==snapshot.contentHash || review.outcome!==state.status || review.reviewedAt!==state.updatedAt || review.reviewedBy===snapshot.submittedBy || review.sourceRevision!==state.sourceRevision;
    if(invalidSummary || invalidState || invalidReview)ctx.addIssue({code:'custom',message:'Giá trị không hợp lệ.'});
  });
  return {domainDraftSchema,storedDraftSchema,snapshotSchema,storedSnapshotSchema,draftReadSchema,snapshotReadSchema,importLineageSchema:siteImportLineageSchema,sourceCatalogSchema:siteSourceCatalogSchema,mediaManifestSchema:siteMediaManifestSchema,snapshotSummarySchema:siteSnapshotSummarySchema,reviewStateSchema:siteReviewStateSchema,reviewSchema:siteReviewSchema};
}
function trustedMetadata(context){
  const importLineage=siteImportLineageSchema.parse(context.importLineage),sourceCatalog=siteSourceCatalogSchema.parse(context.sourceCatalog);
  const sourceIds=z.array(resourceIdSchema).max(16).refine(unique).parse(context.sourceIds);
  if(!Array.isArray(context.catalog) || context.catalog.length>MAX_SITE_MEDIA_ENTRIES || !unique(context.catalog.map(value=>value.id)) || sourceIds.length!==sourceCatalog.length || !sourceCatalog.every(source=>sourceIds.includes(source.id)))throw new ApiError('VALIDATION_ERROR');
  // Validate every trusted entry, even when current content does not select it.
  for(const asset of context.catalog)siteMediaEntrySchema.parse(projectMedia(asset));
  return {importLineage,sourceCatalog};
}
function projectMedia(asset){return Object.fromEntries(['id','kind','legacyPath','mimeType','sizeBytes','sha256','rights','sourceRefs','width','height','durationSeconds'].filter(key=>asset[key]!==undefined).map(key=>[key,structuredClone(asset[key])]));}
export function createSiteMediaManifest(content,context){return siteMediaManifestSchema.parse(collectSiteAssetIds(content,context).map(id=>projectMedia(context.catalog.find(asset=>asset.id===id))));}
function safeCatalog(context){return safeCatalogSchema.parse(context.catalog.map(asset=>({id:asset.id,kind:asset.kind,status:asset.status,legacyPath:asset.legacyPath,label:asset.legacyPath.split('/').at(-1),...Object.fromEntries(['width','height','durationSeconds'].filter(key=>asset[key]!==undefined).map(key=>[key,asset[key]]))})).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0));}

/** Conservative future-envelope bound. Proof IDs can be reserved together even
 * when one creative declaration would not require every candidate proof. */
export function buildSiteBudgetCandidates(content,context){
  const value=validateSiteContent(content,context),{importLineage,sourceCatalog}=trustedMetadata(context);
  const mediaManifest=createSiteMediaManifest(value,context),sourceStrings=[...new Set(mediaManifest.flatMap(asset=>asset.sourceRefs))].sort();
  if(sourceStrings.length>MAX_SITE_SOURCE_REFERENCES)throw new ApiError('VALIDATION_ERROR');
  // Digest contents do not affect JSON bytes. Unique fixed-width hex identities
  // reserve exactly the actual source count without pretending to compute SHA.
  const sourceRefs=sourceStrings.map((_,index)=>{const digest=index.toString(16).padStart(64,'0');return {id:`source-${digest}`,kind:'SUPPLIED_FILE',privateDocumentId:`legacy-source-${digest}`,claimBindings:[],verification:'UNVERIFIED'};});
  const paths=projectClaimGroups(value,context).map(group=>group.claimPath);
  if(paths.length>MAX_SITE_CLAIM_GROUPS)throw new ApiError('VALIDATION_ERROR');
  const id='x'.repeat(128),hash='0'.repeat(64),at='2026-01-01T00:00:00.000Z';
  const summary={id,draftId:SITE_DRAFT_ID,draftRevision:MAX_REVISION,contentHash:hash,mediaManifestHash:hash,schemaVersion:SITE_SCHEMA_VERSION,templateVersion:SITE_TEMPLATE_VERSION,submittedBy:id,submittedAt:at};
  const snapshot={...summary,content:value,mediaManifest,sourceRefs,importLineage,message:'\ud800'.repeat(500)};
  const {content:omitted,...snapshotMetadata}=snapshot;
  const metadata={...versionFieldsValues(),revision:MAX_REVISION,updatedBy:id,updatedAt:at,lastEventId:id,importLineage};
  const reviewState={snapshotId:id,status:'APPROVED',revision:1,activeReviewId:id,sourceRevision:MAX_REVISION,activeSourceCheckIds:Object.fromEntries(paths.map(path=>[path,id])),updatedAt:at};
  const review={id,snapshotId:id,outcome:'APPROVED',contentHash:hash,reviewedBy:id,reviewedAt:at,note:'\ud800'.repeat(2000),creativeCopyDeclaration:'NO_FACTUAL_CLAIMS',sourceRevision:MAX_REVISION,sourceCheckIds:paths.map(()=>id),attestationSetHash:hash};
  return {logicalContent:omitted,storedDraft:{...metadata,contentJson:JSON.stringify(value)},storedSnapshot:{...snapshotMetadata,contentJson:JSON.stringify(value)},draftRead:{...metadata,content:value,catalog:safeCatalog(context),sourceCatalog},snapshotRead:{summary,snapshot,reviewState,review,sourceCatalog}};
}
function versionFieldsValues(){return {draftId:SITE_DRAFT_ID,schemaVersion:SITE_SCHEMA_VERSION,templateVersion:SITE_TEMPLATE_VERSION};}
export function measureSiteBudget(content,context){const candidates=buildSiteBudgetCandidates(content,context);return Object.fromEntries(Object.entries(candidates).map(([key,value])=>[`${key}Bytes`,new TextEncoder().encode(JSON.stringify(value)).length]));}
export function assertSiteBudget(content,context){const measured=measureSiteBudget(content,context);if(Object.values(measured).some(bytes=>bytes>MAX_ENVELOPE_BYTES))throw new ApiError('PAYLOAD_TOO_LARGE');return measured;}
export function encodeSiteStoredContent(content,context){try{const value=validateSiteContent(content,context);assertSiteBudget(value,context);return JSON.stringify(value);}catch(error){throw validationError(error);}}
export function decodeSiteStoredContent(contentJson,context){try{if(typeof contentJson!=='string')throw new Error();assertEnvelopeSize({contentJson});const content=validateSiteContent(JSON.parse(contentJson),context);assertSiteBudget(content,context);return content;}catch{throw new ApiError('INTERNAL_ERROR');}}
function assertTrustedLineage(lineage,context){if(canonicalJson(lineage)!==canonicalJson(siteImportLineageSchema.parse(context.importLineage)))throw new ApiError('VALIDATION_ERROR');}
export function encodeSiteStoredDraft(value,context){try{const domain=createSiteDraftSchemas(context).domainDraftSchema.parse(value),{content,...metadata}=domain;assertTrustedLineage(metadata.importLineage,context);const stored={...metadata,contentJson:encodeSiteStoredContent(content,context)};assertEnvelopeSize(stored);return createSiteDraftSchemas(context).storedDraftSchema.parse(stored);}catch(error){throw validationError(error);}}
export function decodeSiteStoredDraft(value,context){try{const parsed=createSiteDraftSchemas(context).storedDraftSchema.parse(value);assertEnvelopeSize(parsed);const {contentJson,...metadata}=parsed;assertTrustedLineage(metadata.importLineage,context);return createSiteDraftSchemas(context).domainDraftSchema.parse({...metadata,content:decodeSiteStoredContent(contentJson,context)});}catch{throw new ApiError('INTERNAL_ERROR');}}
export function parseSiteSaveRequest(value,context){try{const plain=strictSiteObject({expectedRevision:z.unknown(),patch:z.unknown()}).parse(value);const serialized=JSON.stringify(plain);if(typeof serialized!=='string')throw new ApiError('VALIDATION_ERROR');if(new TextEncoder().encode(serialized).length>MAX_BODY_BYTES)throw new ApiError('PAYLOAD_TOO_LARGE');return createSiteSchemas(context).saveRequestSchema.parse(plain);}catch(error){throw validationError(error);}}
