import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {ApiError,validationError} from '../contracts/errors.mjs';
import {revisionSchema,MAX_REVISION} from '../contracts/hero.mjs';
import {strictMediaV2JsonSchema} from '../contracts/media-v3-metadata-v2.mjs';
import {parseMediaV3Content} from '../contracts/media-v3-content.mjs';
import {encodeStoredDraftV2,validateDraftReadV2,contentDigestProjectionV2} from '../contracts/media-v3-records-v2.mjs';
import {createSiteMediaManifest,projectSiteSourceReferences,siteSnapshotHashes} from './site-snapshots.mjs';
import {mutationIdentity} from './drafts.mjs';
import {createSiteV3ContextService,hashCanonical,sameV3,assertV3Bytes,selectedSiteV3AssetIds} from './site-v3-context.mjs';

const exact=shape=>strictMediaV2JsonSchema.pipe(z.strictObject(shape));
const importBody=exact({expectedM2Revision:revisionSchema});
const saveBody=exact({expectedRevision:revisionSchema,patch:strictMediaV2JsonSchema});
const previewQuery=exact({expectedRevision:revisionSchema});
const descriptor={draftId:'home-v3',schemaVersion:3,templateVersion:'m3-site-media-v1',contractRevision:2};
/** M2 patch operations retain their semantics; final validation is exclusively v3. */
function patchContent(current,patch,context){
 const allowed=['hero','seo','settings','sections','sectionOrder','projectChanges','projectsOrder','serviceChanges','clientLogoChanges','clientLogoOrder','claimSources'];
 if(!patch||Array.isArray(patch)||!Object.keys(patch).length||Object.keys(patch).some(key=>!allowed.includes(key))||['projectChanges','serviceChanges','clientLogoChanges'].filter(key=>patch[key]!==undefined).length>1)throw new ApiError('VALIDATION_ERROR');
 const next=structuredClone(current);
 const change=(list,changes)=>{if(!Array.isArray(changes)||changes.length!==1)throw new ApiError('VALIDATION_ERROR');const c=changes[0],id=c.op==='ADD'?c.value?.id:c.id,index=list.findIndex(v=>v.id===id);if(c.op==='ADD'){if(index!==-1||Object.keys(c).some(k=>!['op','value'].includes(k)))throw new ApiError('VALIDATION_ERROR');list.push(c.value);}else if(c.op==='REPLACE'){if(index<0||c.value?.id!==c.id||Object.keys(c).some(k=>!['op','id','value'].includes(k)))throw new ApiError('VALIDATION_ERROR');list[index]=c.value;}else if(c.op==='SET_VISIBILITY'){if(index<0||typeof c.isVisible!=='boolean'||Object.keys(c).some(k=>!['op','id','isVisible'].includes(k)))throw new ApiError('VALIDATION_ERROR');list[index]={...list[index],isVisible:c.isVisible};}else throw new ApiError('VALIDATION_ERROR');};
 for(const [key,list] of [['projectChanges',next.projects],['serviceChanges',next.services],['clientLogoChanges',next.settings.clientLogos]])if(patch[key]!==undefined)change(list,patch[key]);
 for(const key of ['hero','seo','sectionOrder','claimSources'])if(patch[key]!==undefined)next[key]=patch[key];
 if(patch.settings){if(typeof patch.settings!=='object'||Array.isArray(patch.settings))throw new ApiError('VALIDATION_ERROR');for(const [key,value] of Object.entries(patch.settings)){if(!Object.hasOwn(next.settings,key)||key==='clientLogos')throw new ApiError('VALIDATION_ERROR');if(key==='showreel'){if(!value||typeof value!=='object'||Array.isArray(value))throw new ApiError('VALIDATION_ERROR');const {durationSeconds:ignoredClientDuration,...showreel}=value;next.settings.showreel=showreel;}else next.settings[key]=key==='brand'?{...next.settings.brand,...value}:value;}}
 if(patch.sections){if(!Array.isArray(patch.sections)||patch.sections.length!==1)throw new ApiError('VALIDATION_ERROR');const c=patch.sections[0],i=next.sections.findIndex(v=>v.sectionId===c.sectionId);if(i<0||c.value?.sectionId!==c.sectionId||Object.keys(c).some(k=>!['sectionId','value'].includes(k)))throw new ApiError('VALIDATION_ERROR');next.sections[i]=c.value;}
 for(const [key,list] of [['projectsOrder',next.projects],['clientLogoOrder',next.settings.clientLogos]])if(patch[key]!==undefined){const order=patch[key];if(!Array.isArray(order)||order.length!==list.length||new Set(order).size!==list.length||order.some(id=>!list.some(v=>v.id===id)))throw new ApiError('VALIDATION_ERROR');const sorted=order.map(id=>list.find(v=>v.id===id));if(key==='projectsOrder')next.projects=sorted;else next.settings.clientLogos=sorted;}
 // Resolve the selected server-owned video before final whole-content parsing.
 // A client duration or the former video's duration cannot validate a new reel.
 return strictMediaV2JsonSchema.parse(next);
}
export async function createSiteV3DraftService(options={}){
 const trusted=await createSiteV3ContextService(options),{db,authorize}=trusted;
 async function importSite({request,actor,body,key,correlationId}){
  let parsed;try{parsed=importBody.parse(assertV3Bytes(body));}catch(e){throw validationError(e);}const identity=mutationIdentity(actor.uid,'POST /api/cms/drafts/home-v3/import',key,parsed),id=randomUUID(),eventId=randomUUID(),at=new Date().toISOString();
  return db.runTransaction(async tx=>{
   if((await authorize(request,'SITE_IMPORT',tx)).uid!==actor.uid)throw new ApiError('FORBIDDEN');
   const keyRef=db.collection('cmsIdempotency').doc(identity.id),prior=await tx.get(keyRef),draftRef=db.collection('cmsDrafts').doc('home-v3'),target=await tx.get(draftRef);
   if(prior.exists){const r=assertV3Bytes(prior.data());if(r.requestHash!==identity.requestHash)throw new ApiError('IDEMPOTENCY_PAYLOAD_MISMATCH');const saved=await tx.get(db.collection('cmsSiteV3Imports').doc(r.response.importId));if(!saved.exists||saved.data().createdBy!==actor.uid||saved.data().eventId!==r.eventId||!sameV3(saved.data().receipt,r.response))throw new ApiError('INTERNAL_ERROR');return r.response;}
   if(target.exists)throw new ApiError('REVISION_CONFLICT');const m2=await trusted.currentM2(tx);if(m2.current.revision!==parsed.expectedM2Revision)throw new ApiError('REVISION_CONFLICT');
   const contentContext={sourceCatalog:m2.context.sourceCatalog,currentYear:m2.context.currentYear,...(m2.current.content.settings.showreel.originalSourceUrl!==undefined?{allowedShowreelSourceUrl:m2.current.content.settings.showreel.originalSourceUrl}:{})};
   const content=parseMediaV3Content({...m2.current.content,schemaVersion:3},contentContext),manifest=createSiteMediaManifest(m2.current.content,m2.context),hashes=siteSnapshotHashes(m2.current.content,manifest);
   const report={sourceDraftId:'home-v2',sourceDraftRevision:m2.current.revision,sourceContentHash:hashes.contentHash,sourceMediaManifestHash:hashes.mediaManifestHash,sourceRefsHash:hashCanonical(projectSiteSourceReferences(manifest)),sourceImportLineage:m2.current.importLineage};
   const lineage={importId:id,sourceDraftId:'home-v2',sourceSchemaVersion:2,sourceTemplateVersion:'m2-site-baseline-v1',sourceDraftRevision:m2.current.revision,sourceContentHash:hashes.contentHash,sourceMediaManifestHash:hashes.mediaManifestHash,sourceRefsHash:report.sourceRefsHash,sourceImportLineage:m2.current.importLineage,importReportHash:hashCanonical(report)};
   const context={contentContext,expectedImport:lineage,hashCanonical},draft={...descriptor,content,revision:0,updatedBy:actor.uid,updatedAt:at,lastEventId:eventId,importLineage:lineage},stored=assertV3Bytes(encodeStoredDraftV2(draft,context));
   const receipt={draftId:'home-v3',contractRevision:2,revision:0,importId:id,sourceDraftRevision:m2.current.revision};
   const legacyCatalog=m2.context.catalog.map(a=>Object.fromEntries(['id','kind','legacyPath','mimeType','sizeBytes','sha256','rights','sourceRefs','width','height','durationSeconds'].filter(k=>a[k]!==undefined).map(k=>[k,a[k]])));
   const record=assertV3Bytes({contractRevision:2,id,lineage,report,receipt,initialDraft:stored,baselineContent:content,legacyCatalog,sourceCatalog:contentContext.sourceCatalog,sourceRefs:projectSiteSourceReferences(manifest),createdBy:actor.uid,createdAt:at,eventId,...(contentContext.allowedShowreelSourceUrl!==undefined?{allowedShowreelSourceUrl:contentContext.allowedShowreelSourceUrl}:{})},1048576);
   if((await authorize(request,'SITE_IMPORT',tx)).uid!==actor.uid)throw new ApiError('FORBIDDEN');tx.create(draftRef,stored);tx.create(db.collection('cmsSiteV3Imports').doc(id),record);tx.create(db.collection('cmsAudit').doc(eventId),{id:eventId,action:'SITE_V3_IMPORTED',actorUid:actor.uid,at,correlationId,importId:id,requestHash:identity.requestHash});tx.create(keyRef,{contractRevision:2,requestHash:identity.requestHash,state:'COMPLETED',response:receipt,eventId});return receipt;
  });
 }
 async function readDraft({request}){return db.runTransaction(async tx=>{await authorize(request,'MEMBER_READ',tx);const {context,current,record}=await trusted.readTrustedDraftContext({transaction:tx,target:await tx.get(db.collection('cmsDrafts').doc('home-v3'))});const resolved=await trusted.selection(tx,current.content,record,undefined,selectedSiteV3AssetIds(current.content).filter(id=>!record.legacyCatalog.some(a=>a.id===id)));return assertV3Bytes(validateDraftReadV2({...current,catalog:resolved.safeCatalog,sourceCatalog:context.contentContext.sourceCatalog},{...context,expectedSafeCatalog:resolved.safeCatalog,expectedSourceCatalog:context.contentContext.sourceCatalog}));});}
 async function saveDraft({request,actor,body,key,correlationId}){
  let parsed;try{parsed=saveBody.parse(assertV3Bytes(body));}catch(e){throw validationError(e);}const identity=mutationIdentity(actor.uid,'PATCH /api/cms/drafts/home-v3',key,parsed),eventId=randomUUID(),at=new Date().toISOString();
  return db.runTransaction(async tx=>{if((await authorize(request,'DRAFT_SAVE',tx)).uid!==actor.uid)throw new ApiError('FORBIDDEN');const keyRef=db.collection('cmsIdempotency').doc(identity.id),prior=await tx.get(keyRef);if(prior.exists){const r=assertV3Bytes(prior.data());if(r.requestHash!==identity.requestHash)throw new ApiError('IDEMPOTENCY_PAYLOAD_MISMATCH');const a=await tx.get(db.collection('cmsAudit').doc(r.eventId));if(!a.exists||a.data().actorUid!==actor.uid||a.data().requestHash!==identity.requestHash||!sameV3(a.data().receipt,r.response))throw new ApiError('INTERNAL_ERROR');return r.response;}
   const ref=db.collection('cmsDrafts').doc('home-v3'),{context,current,record}=await trusted.readTrustedDraftContext({transaction:tx,target:await tx.get(ref)});if(current.revision!==parsed.expectedRevision||current.revision>=MAX_REVISION)throw new ApiError('REVISION_CONFLICT');let content;try{content=patchContent(current.content,parsed.patch,context.contentContext);}catch(e){throw validationError(e);}const selected=await trusted.selection(tx,content,record,undefined,selectedSiteV3AssetIds(current.content).filter(id=>!record.legacyCatalog.some(a=>a.id===id)));const reel=selected.expectedMediaVersions.find(v=>v.assetId===content.settings.showreel.assetId)??record.legacyCatalog.find(a=>a.id===content.settings.showreel.assetId);if(!reel||reel.kind!=='VIDEO'||!Number.isFinite(reel.durationSeconds)||reel.durationSeconds<=0)throw new ApiError('VALIDATION_ERROR');content=parseMediaV3Content({...content,settings:{...content.settings,showreel:{...content.settings.showreel,durationSeconds:reel.durationSeconds}}},context.contentContext);const next={...current,content,revision:current.revision+1,updatedBy:actor.uid,updatedAt:at,lastEventId:eventId},stored=assertV3Bytes(encodeStoredDraftV2(next,context)),receipt={draftId:'home-v3',contractRevision:2,revision:next.revision,updatedAt:at,lastEventId:eventId};if((await authorize(request,'DRAFT_SAVE',tx)).uid!==actor.uid)throw new ApiError('FORBIDDEN');tx.set(ref,stored);tx.create(db.collection('cmsAudit').doc(eventId),{id:eventId,action:'SITE_V3_DRAFT_SAVED',actorUid:actor.uid,at,correlationId,requestHash:identity.requestHash,contentHash:hashCanonical(content),receipt});tx.create(keyRef,{contractRevision:2,requestHash:identity.requestHash,state:'COMPLETED',response:receipt,eventId});return receipt;});
 }
 async function readPreviewManifest({request,query}){
  let parsed;try{parsed=previewQuery.parse(query);}catch(error){throw validationError(error);}
  return db.runTransaction(async tx=>{
   await authorize(request,'MEMBER_READ',tx);
   const {current,record}=await trusted.readTrustedDraftContext({transaction:tx,target:await tx.get(db.collection('cmsDrafts').doc('home-v3'))});
   if(current.revision!==parsed.expectedRevision)throw new ApiError('REVISION_CONFLICT');
   const existingAssetIds=selectedSiteV3AssetIds(current.content).filter(id=>!record.legacyCatalog.some(asset=>asset.id===id));
   const selected=await trusted.selection(tx,current.content,record,undefined,existingAssetIds),mediaManifest=selected.orderedManifest,mediaManifestHash=hashCanonical(mediaManifest);
   const response=assertV3Bytes({contractRevision:2,draftId:'home-v3',draftRevision:current.revision,contentHash:hashCanonical(contentDigestProjectionV2(current.content,mediaManifestHash)),mediaManifestHash,mediaManifest});
   await authorize(request,'MEMBER_READ',tx);
   return response;
  });
 }
 return {importSite,readDraft,saveDraft,readPreviewManifest};
}
