import {websitePublishSchema} from '../contracts/website-publication.mjs';
import {readSelectedShowreelResource,readPublicationFileResource} from './selected-publication-media.mjs';
import {readReleaseManifest} from '../scripts/multilingual-site-artifact.mjs';
import {loadMediaProcessingProfile} from './media-processing-profile.mjs';
import {createPdfLocalRecovery} from './pdf-local-recovery.mjs';
import {readFileSync,existsSync,renameSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {ApiError} from '../contracts/errors.mjs';
import {canonicalJson} from '../contracts/draft.mjs';
import {captureHostingSource,loadHostingSeed,seedResources,seedContent} from '../scripts/hosting-source-seed.mjs';
import {digest,ownedFile,readPrivateJson,readPrivateBytes,writeJsonExclusive} from '../scripts/multilingual-release-files.mjs';
import {readWebsitePointer,writeWebsitePointer,previousWebsitePointer} from '../scripts/local-website-pointer.mjs';
import {packageReleaseResources,exportMultilingualSite} from '../scripts/export-multilingual-site-local.mjs';
import {createSiteV3DraftService} from './site-v3-drafts.mjs';
import {createLocalizedEditorialService} from './localized-editorial.mjs';
import {runSelectedPublication,prepareWebsitePublication} from './selected-publication.mjs';
import {localizedPublishSchema,parseLocalizedReleaseBundle} from '../contracts/localized-review-records.mjs';
import {releaseSnapshotSetHash} from './localized-eligibility.mjs';
import {createHeroLocalizationService} from './hero-localizations.mjs';
import {createProjectLocalizationService} from './project-localizations.mjs';
import {createServiceLocalizationService} from './service-localizations.mjs';
import {createWorkServicesLocalizationService} from './work-services-localizations.mjs';
import {createGroupLocalizationService} from './group-localizations.mjs';
import {createMediaUploadService} from './media-upload-service.mjs';
const ROOT='.local/p7-v3',LATEST=ROOT+'/latest-job.json',SEED=ROOT+'/seed-job.json';
let running=null;
const same=(a,b)=>canonicalJson(a)===canonicalJson(b),hash=v=>digest(canonicalJson(v)),at=()=>new Date().toISOString();
function put(relative,value){const temporary=ROOT+'/write-'+randomUUID()+'.json';writeJsonExclusive(temporary,value);renameSync(ownedFile(temporary),ownedFile(relative,{missing:true}));}
function get(relative){return existsSync(ownedFile(relative,{missing:true}))?readPrivateJson(relative,8*1048576):null;}
const summary=job=>job?{id:job.id,kind:job.kind,state:job.state,stage:job.stage,startedAt:job.startedAt,updatedAt:job.updatedAt,media:job.media??[],resources:job.resources??[],result:job.result??null,error:job.error??null,selection:job.selection??null}:null;
const key=(job,name)=>'p7v3_'+digest(job.id+':'+name).slice(0,52);
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
/** Local Admin application commands. Auth, CAS, idempotency and native media processing remain authoritative. */
export async function createLocalWebsiteService({options,library,storage}){
 const {db,authorize}=options,homeService=await createSiteV3DraftService(options),editorial=await createLocalizedEditorialService(options);
 async function owner(request,actor){if(request.headers.host!=='127.0.0.1:5273')throw new ApiError('FORBIDDEN');const current=await authorize(request,'DRAFT_PUBLISH');if(current.role!=='OWNER'||actor&&current.uid!==actor.uid)throw new ApiError('FORBIDDEN');return current;}
 function save(job){job.updatedAt=at();put(ROOT+'/'+job.id+'.json',job);put(LATEST,{id:job.id});if(job.kind==='SEED')put(SEED,{id:job.id});}
 async function action(job,name,input,fn){job.operations??={};let op=job.operations[name];if(!op){op={input,operationKey:key(job,name)};job.operations[name]=op;save(job);}else if(!same(op.input,input))throw Error('Concurrent change at '+name);if(op.receipt)return op.receipt;const receipt=await fn(op.input,op.operationKey);op.receipt=receipt;save(job);return receipt;}
 async function stage(job,text){job.stage=text;save(job);}
 async function seed(job,request,actor){
  const sourceRoot=ROOT+'/'+job.id+'/source';
  if(!job.source){await stage(job,'Chụp và khóa template đóng gói');job.source=await captureHostingSource(sourceRoot);save(job);}
  const rawSeed=loadHostingSeed(sourceRoot),resources=seedResources(rawSeed.home);if(resources.length!==72)throw Error('Expected 72 source resources');
  if(!job.backup){await stage(job,'Bảo lưu dữ liệu CMS trước seed');const before={at:at(),home:await homeService.readDraft({request}),collections:{}};
   for(const name of ['cmsLocalizedHeroDrafts','cmsLocalizedHeroBases','cmsLocalizedProjectDrafts','cmsLocalizedServiceDrafts','cmsLocalizedSectionDrafts','cmsLocalizedGroupDrafts','cmsLocalizedSnapshots','cmsLocalizedReviewStates','cmsLocalizedReviews','cmsLocalizedApprovals','cmsMediaVersions','cmsMediaQuota']){const snap=await db.collection(name).limit(501).get();if(snap.size>500)throw Error('Backup collection exceeds bound');before.collections[name]=snap.docs.map(doc=>({id:doc.id,data:doc.data()}));}
   await owner(request,actor);writeJsonExclusive(ROOT+'/'+job.id+'/cms-before.json',before);job.backup={path:ROOT+'/'+job.id+'/cms-before.json',sha256:hash(before),homeRevision:before.home.revision};save(job);
  }
  const media=JSON.parse(readFileSync(new URL('../contracts/legacy-assets.json',import.meta.url),'utf8')).filter(m=>!['brand-diagonal','favicon'].includes(m.id));
  const upload=await createMediaUploadService();job.assetMap??={};job.media??=[];
  if(job.heldMedia?.includes('credential')){const profile=loadMediaProcessingProfile('PDF');if(profile.profileId!=='M3-PDF-LOCAL-3'||profile.program.recipe.limits.edge!==1280||profile.program.recipe.limits.combinedBytes!==96*1048576)throw Error('Credential vẫn giữ nguyên đến khi profile 1280px đã duyệt được nạp.');job.heldMedia=job.heldMedia.filter(id=>id!=='credential');job.mediaReplacement={...job.mediaReplacement,credential:'-pdf-local-3'};job.approvedPdfProfile={profileId:profile.profileId,processingRecipeSha256:profile.processingRecipeSha256,toolSetSha256:profile.toolSetSha256,decision:'Duyệt raster 1280px, giữ mọi trần hiện tại (đề nghị)'};save(job);}
  for(const item of media){
   if(job.heldMedia?.includes(item.id))continue;
   await stage(job,`Media ${job.media.length}/${media.length} · ${item.id}`);const bytes=readPrivateBytes(sourceRoot+'/'+item.legacyPath,32*1048576);if(digest(bytes)!==item.sha256||bytes.length!==item.sizeBytes)throw Error('Captured media changed');
   const operationId=item.id+(job.mediaReplacement?.[item.id]??'');
   const created=await action(job,'media-create-'+operationId,{name:item.legacyPath.split('/').pop(),kind:item.kind,declaredMime:item.mimeType,inputBytes:bytes.length},(body,k)=>upload.createUpload({request,actor,body:{...body,requestId:k},key:k}));let receipt=created;
   for(let offset=0,index=0;offset<bytes.length;offset+=4*1048576,index++){const part=bytes.subarray(offset,Math.min(offset+4*1048576,bytes.length)),input={intentId:created.intentId,partIndex:index,expectedIntentRevision:receipt.revision,offsetBytes:offset,sha256:digest(part)};receipt=await action(job,'media-part-'+operationId+'-'+index,input,(body,k)=>upload.uploadPart({request,actor,...body,key:k,bytes:part}));}
   const completed=await action(job,'media-complete-'+operationId,{intentId:created.intentId,expectedIntentRevision:receipt.revision},(body,k)=>upload.completeUpload({request,actor,intentId:body.intentId,body:{expectedIntentRevision:body.expectedIntentRevision},key:k}));
   const deadline=Date.now()+240000;let status;
   do{status=await upload.readJobSummary({request,jobId:completed.jobId});if(status.state==='READY')break;if(['REJECTED','RECOVERY_REQUIRED','FAILED'].includes(status.state))throw Error('Media '+item.id+': '+status.state);if(Date.now()>deadline)throw Error('Media processing timeout: '+item.id);await wait(1000);}while(status.state!=='READY');
   const version=await library.readVersion(created.assetId);if(version.status!=='READY')throw Error('Media version unavailable');job.assetMap[item.id]=created.assetId;
   if(!job.media.some(m=>m.sourceId===item.id))job.media.push({sourceId:item.id,assetId:created.assetId,jobId:completed.jobId,sourceSha256:item.sha256,state:status.state});save(job);
  }
  if(job.heldMedia?.length)throw Error('Đã xử lý media độc lập; credential chờ quyết định độ phân giải trong ngân sách 96 MiB.');
  const seed=loadHostingSeed(sourceRoot,job.assetMap),target=seed.home;
  await stage(job,'Cập nhật nguồn dùng chung từ template đóng gói');
  const patches=[{hero:target.hero,seo:target.seo,settings:Object.fromEntries(Object.entries(target.settings).filter(([k])=>k!=='clientLogos')),sectionOrder:target.sectionOrder,claimSources:target.claimSources},...target.settings.clientLogos.map(v=>({clientLogoChanges:[{op:'REPLACE',id:v.id,value:v}]})),...target.projects.map(v=>({projectChanges:[{op:'REPLACE',id:v.id,value:v}]})),...target.services.map(v=>({serviceChanges:[{op:'REPLACE',id:v.id,value:v}]})),...target.sections.map(v=>({sections:[{sectionId:v.sectionId,value:v}]}))];
  let expectedRevision=job.backup.homeRevision;
  for(const [index,patch]of patches.entries()){const original='shared-'+index,old=job.operations[original],name=old&&!old.receipt&&!same(old.input.patch,patch)?original+'-repair-'+hash(patch).slice(0,12):original,prior=job.operations[name],input=prior?.input??{expectedRevision,patch};const result=await action(job,name,input,(body,k)=>homeService.saveDraft({request,actor,body,key:k,correlationId:job.id}));expectedRevision=result.revision;}
  const shared=await homeService.readDraft({request});if(shared.revision!==expectedRevision||!same(shared.content,{...target,settings:{...target.settings,showreel:{...target.settings.showreel,durationSeconds:shared.content.settings.showreel.durationSeconds}}}))throw Error('Shared source changed outside seed');
  const services={hero:await createHeroLocalizationService(options),project:await createProjectLocalizationService(options),service:await createServiceLocalizationService(options),section:await createWorkServicesLocalizationService(options),group:await createGroupLocalizationService(options)};
  job.resources??=[];
  for(const resource of resources){const name=['copy',resource.kind,resource.entityId,resource.locale].join('-');await stage(job,`Nội dung ${job.resources.length}/72 · ${resource.entityId} ${resource.locale.toUpperCase()}`);
   if(job.resources.some(r=>same(r.resource,resource)))continue;
   const current=await editorial.readResource({request,resource}),content=seedContent(seed,resource),service=services[resource.kind],args={request,locale:resource.locale,...(resource.kind==='hero'?{}:{[resource.kind+'Id']:resource.entityId})};
   if(current.draft&&!current.stale&&same(current.draft.content,content)){job.resources.push({resource,revision:current.draft.revision,contentHash:current.draft.contentHash,change:'RETAINED'});save(job);continue;}
   let result;
   if(current.draft&&current.stale||job.operations[name]?.input.resource){const input=job.operations[name]?.input??{resource,expectedRevision:current.draft.revision,expectedContentHash:current.draft.contentHash,expectedDependencyHash:current.currentDependencyHash,previousDependencyHash:current.previousDependencyHash,acknowledgeSourceChange:true,content};result=await action(job,name,input,(body,k)=>editorial.rebaseDraft({request,actor,body,key:k}));}
   else{const record=await service.readDraft(args),input=job.operations[name]?.input??(resource.kind==='hero'?{expectedRevision:record.draft?.revision??null,baseRevision:record.base.revision,baseContentHash:record.base.contentHash,expectedDependencyHash:current.currentDependencyHash,content}:{contractRevision:1,expectedRevision:record.draft?.revision??null,expectedDependencyHash:current.currentDependencyHash,content});result=await action(job,name,input,(body,k)=>service.saveDraft({...args,actor,body,key:k}));}
   const after=await editorial.readResource({request,resource});if(after.stale||!same(after.draft.content,content)||after.draft.revision!==result.revision)throw Error('Seed readback mismatch');job.resources.push({resource,revision:after.draft.revision,contentHash:after.draft.contentHash,change:current.draft?'UPDATED':'CREATED'});save(job);
  }
  put(ROOT+'/'+job.id+'/translation-review.json',{at:at(),sourceManifestHash:hash(job.source),review:'Source facts, names, dates, scope and language consistency reviewed against captured source. EN/JA are translated content; no claim of independent native-language review.',headings:'Shared English headings from approved template',resources:job.resources});
  job.result={sourceManifestHash:hash(job.source),media:job.media.length,resources:job.resources.length,backup:job.backup,sourceRoot,publication:'NOT_PUBLISHED'};
 }
 async function readLiveRelease(pointer){
    const manifest=readReleaseManifest(pointer.artifact.relativeRoot,pointer.artifact.manifestSha256);
    if(manifest.qaFixture||manifest.releaseId!==pointer.releaseId)throw Error('Cần bản website CMS thật để xuất bản riêng nội dung.');
    const source=pointer.releaseSource??{path:ROOT+'/'+pointer.releaseId.replace(/^cms-/,'')+'/release.json'};
    if(!/^\.local\/p7-v3\/[a-z0-9]+-[a-f0-9]{8}\/release\.json$/.test(source.path))throw Error('Invalid private release source');
    const release=parseLocalizedReleaseBundle(readPrivateJson(source.path,12*1048576));
    if(source.sha256&&source.sha256!==hash(release)||release.snapshotSetHash!==pointer.snapshotSetHash||release.snapshotSetHash!==manifest.snapshotSetHash||release.snapshotSetHash!==releaseSnapshotSetHash(release.entries))throw Error('Frozen live release mismatch');
    return release;
 }
 async function selectedSource(request,resource){return (await (await createGroupLocalizationService(options)).readDraft({request,groupId:resource.entityId,locale:resource.locale})).base.source;}
 async function prepare({request,actor,body}){
  await owner(request,actor);const parsed=localizedPublishSchema.safeParse(body);if(!parsed.success)throw new ApiError('VALIDATION_ERROR');const selection=parsed.data,pointer=readWebsitePointer();if(!pointer)throw new ApiError('NOT_FOUND');const release=await readLiveRelease(pointer);
  const result=await db.runTransaction(async tx=>{const current=await authorize(request,'DRAFT_PUBLISH',tx);if(current.role!=='OWNER'||current.uid!==actor.uid)throw new ApiError('FORBIDDEN');return prepareWebsitePublication({release,selection,readCurrent:resource=>editorial.context.readResource(tx,resource)});});
  await owner(request,actor);if(!same(pointer,readWebsitePointer()))throw new ApiError('REVISION_CONFLICT');return result;
 }
 async function publish(job,request,actor){
  return runSelectedPublication(job,{request,actor},{editorial,owner,readPointer:readWebsitePointer,writePointer:writeWebsitePointer,save,stage,
   readSelectedSource:resource=>selectedSource(request,resource),
   readRelease:readLiveRelease,
   exportRelease:async(job,release)=>{
    const bundle=await packageReleaseResources(release,{readResource:async descriptor=>{
     // Retained bytes come from the live artifact, not today's media catalog or drafts.
     const manifest=readReleaseManifest(job.base.artifact.relativeRoot,job.base.artifact.manifestSha256),pin=manifest.files.find(f=>f.path===descriptor.path&&f.sha256===descriptor.sha256&&f.sizeBytes===descriptor.sizeBytes);
     if(!pin&&descriptor.file?.source.kind==='HOSTED'){const row=await db.collection('cmsFileResources').doc(descriptor.id).get(),record=row.data();if(!row.exists||!same(record.asset,descriptor.file)||record.state!=='INSPECTED')throw Error('Frozen file mismatch');return storage.readDerivative(record.object);}
     if(!pin&&job.filePublication)return readPublicationFileResource({descriptor,allowed:job.filePublication.plan.descriptors,library,storage});
     if(!pin)return readSelectedShowreelResource({descriptor,release,selection:job.selection,library,storage});
     return readPrivateBytes(job.base.artifact.relativeRoot+'/'+pin.path,64*1048576);
    }});
    const sourcePath=ROOT+'/'+job.id+'/release.json';
    if(existsSync(ownedFile(sourcePath,{missing:true}))){if(hash(readPrivateJson(sourcePath,12*1048576))!==hash(release))throw Error('Candidate release changed');}
    else writeJsonExclusive(sourcePath,release);
    const changedLocales=new Set(job.filePublication?job.filePublication.plan.targets.map(t=>t.resource.locale):[job.selection.resource.locale]);
    const preserveDocuments=Object.fromEntries(['en','vi','ja'].filter(locale=>!changedLocales.has(locale)).map(locale=>{
     const name=locale==='en'?'index.html':locale+'/index.html';
     return [name,readPrivateBytes(job.base.artifact.relativeRoot+'/'+name)];
    }));
    const artifact=exportMultilingualSite(bundle,'cms-'+job.id+'-'+job.exportAttempt,{preserveDocuments});
    // Other locales must remain byte-identical, even across renderer/template changes.
    const before=readReleaseManifest(job.base.artifact.relativeRoot,job.base.artifact.manifestSha256),after=readReleaseManifest(artifact.root,artifact.manifestSha256);
    for(const locale of ['en','vi','ja'].filter(l=>!changedLocales.has(l))){
     const document=locale==='en'?'index.html':locale+'/index.html';
     if(before.files.find(f=>f.path===document)?.sha256!==after.files.find(f=>f.path===document)?.sha256)throw Error('Bộ dựng làm thay đổi ngôn ngữ không được chọn. Website giữ nguyên bản trước.');
    }
    return {...artifact,releaseSource:{path:sourcePath,sha256:hash(release)}};
   },
   verifyWebsite:async pointer=>{
    for(const route of ['','vi/','ja/']){
     const response=await fetch('http://127.0.0.1:4189/'+route,{redirect:'error',signal:AbortSignal.timeout(10000)});
     if(!response.ok||response.headers.get('x-pinky-content'))throw Error('Chưa đọc được bản website mới tại :4189.');
     const bytes=Buffer.from(await response.arrayBuffer()),expected=readPrivateBytes(pointer.artifact.relativeRoot+'/'+route+'index.html');
     if(!bytes.equals(expected))throw Error('Website :4189 chưa phục vụ đúng bản nội dung đã chọn.');
    }
   }
  });
 }
 async function status({request}){await owner(request);const latest=get(LATEST),job=latest?get(ROOT+'/'+latest.id+'.json'):null;if(job?.state==='RUNNING'&&running!==job.id){job.state='BLOCKED';job.error={code:'INTERRUPTED',message:'Tác vụ bị ngắt khi CMS khởi động lại. Dữ liệu và journal được giữ để tiếp tục có kiểm soát.'};save(job);}const seedJob=get(SEED)?get(ROOT+'/'+get(SEED).id+'.json'):null;let blockedMedia=null;if(seedJob?.state==='BLOCKED'){const pending=Object.entries(seedJob.operations??{}).find(([name,op])=>name.startsWith('media-complete-')&&op.receipt&&!seedJob.retiredMedia?.includes(op.receipt.jobId)&&!seedJob.media.some(m=>m.jobId===op.receipt.jobId));if(pending)blockedMedia=await (await createMediaUploadService()).readJobSummary({request,jobId:pending[1].receipt.jobId});}return {job:summary(job),website:readWebsitePointer(),seed:summary(seedJob),blockedMedia,pdfRecoveryAvailable:['5a4c6354-3173-4b27-b60e-f9b35122aa25','259047bb-f62d-4bed-ac48-8c80bc01b182','48b96365-cf97-40cd-b584-caa4e6188d87','724af3e2-0f4c-422b-96f7-e7d54f984fde','795db8e3-d77c-44b6-b826-549ff2e9305b'].includes(blockedMedia?.jobId)&&!seedJob.retiredMedia?.includes(blockedMedia.jobId)};}
 async function start({request,actor,kind,commandKey,body={}}){
  await owner(request,actor);let selection=null;
  if(kind==='PUBLISH'){const parsed=websitePublishSchema.safeParse(body);if(!parsed.success)throw new ApiError('VALIDATION_ERROR');selection=parsed.data;}
  const commandPath=ROOT+'/command-'+digest(actor.uid+':'+commandKey)+'.json',existing=get(commandPath);let job;
  if(existing){
   if(existing.kind!==kind)throw new ApiError('IDEMPOTENCY_PAYLOAD_MISMATCH');job=get(ROOT+'/'+existing.id+'.json');
   if(!same(job.selection??null,selection))throw new ApiError('IDEMPOTENCY_PAYLOAD_MISMATCH');
   if(job.state==='COMPLETED'||running===job.id)return summary(job);
   if(kind!=='PUBLISH')return summary(job);
  }
  if(running)throw new ApiError('IDEMPOTENCY_IN_PROGRESS');
  if(!job){
   if(kind==='SEED'&&get(SEED)){job=get(ROOT+'/'+get(SEED).id+'.json');if(job.state==='COMPLETED')return summary(job);if(job.actorUid!==actor.uid)throw new ApiError('FORBIDDEN');}
   else job={id:Date.now().toString(36)+'-'+randomUUID().slice(0,8),kind,state:'RUNNING',stage:'Chuẩn bị',actorUid:actor.uid,startedAt:at(),operations:{},media:[],resources:[],selection};
  }
  job.state='RUNNING';job.error=null;save(job);put(commandPath,{id:job.id,kind});running=job.id;
  // Request credentials exist only in this closure. They are never serialized to the journal.
  void (async()=>{try{await (kind==='SEED'?seed:publish)(job,request,actor);job.state='COMPLETED';job.stage=kind==='SEED'?'Đã seed đủ nội dung; chưa xuất bản':'Đã xuất bản nội dung đã chọn lên website :4189';}catch(error){job.state='BLOCKED';job.diagnostic={stack:error.stack};job.error={code:error.code??'LOCAL_WEBSITE_BLOCKED',message:error.message};console.warn('LOCAL_WEBSITE_BLOCKED',{id:job.id,stage:job.stage,code:error.code??'LOCAL_WEBSITE_BLOCKED',message:error.message});}finally{try{save(job);}finally{running=null;}}})().catch(error=>console.warn('LOCAL_WEBSITE_JOURNAL_FAILED',{id:job.id,message:error.message}));return summary(job);
 }
 async function retryMedia({request,actor}){await owner(request,actor);if(running)throw new ApiError('IDEMPOTENCY_IN_PROGRESS');const seedJob=get(SEED)?get(ROOT+'/'+get(SEED).id+'.json'):null;if(seedJob?.state!=='BLOCKED')throw new ApiError('REVIEW_STATE_CONFLICT');const pending=Object.entries(seedJob.operations??{}).find(([name,op])=>name.startsWith('media-complete-')&&op.receipt&&!seedJob.retiredMedia?.includes(op.receipt.jobId)&&!seedJob.media.some(m=>m.jobId===op.receipt.jobId));if(!pending)throw new ApiError('NOT_FOUND');const upload=await createMediaUploadService(),jobId=pending[1].receipt.jobId,current=await upload.readJobSummary({request,jobId});if(!current.canRetry)throw new ApiError('REVIEW_STATE_CONFLICT');return action(seedJob,'retry-media-'+jobId,{jobId,expectedJobRevision:current.jobRevision},(body,k)=>upload.retryJob({request,actor,jobId,body:{expectedJobRevision:body.expectedJobRevision},key:k}));}
 async function rollback({request,actor,commandKey}){await owner(request,actor);const commandPath=ROOT+'/command-'+digest(actor.uid+':'+commandKey)+'.json',existing=get(commandPath);if(existing){if(existing.kind!=='ROLLBACK')throw new ApiError('IDEMPOTENCY_PAYLOAD_MISMATCH');return existing.receipt;}if(running)throw new ApiError('IDEMPOTENCY_IN_PROGRESS');const current=readWebsitePointer();if(!current?.previous)throw new ApiError('NOT_FOUND');const restored=readReleaseManifest(current.previous.relativeRoot,current.previous.manifestSha256),next=previousWebsitePointer(current,restored,at());writeWebsitePointer(next);const receipt={port:4189,activation:false,artifact:next.artifact};put(commandPath,{kind:'ROLLBACK',receipt});return receipt;}
 async function recoverPdf({request,actor}){await owner(request,actor);if(running)throw new ApiError('IDEMPOTENCY_IN_PROGRESS');const seedJob=get(SEED)?get(ROOT+'/'+get(SEED).id+'.json'):null;if(seedJob?.state!=='BLOCKED')throw new ApiError('REVIEW_STATE_CONFLICT');const recovery=createPdfLocalRecovery({db,authorize,storage}),next=seedJob.retiredMedia?.includes('5a4c6354-3173-4b27-b60e-f9b35122aa25');const pending=Object.entries(seedJob.operations??{}).find(([name,op])=>name.startsWith('media-complete-credential')&&op.receipt&&!seedJob.retiredMedia?.includes(op.receipt.jobId)&&!seedJob.media.some(m=>m.jobId===op.receipt.jobId));if(!pending)throw new ApiError('NOT_FOUND');const receipt=await (next?recovery.retireClosed:recovery.recover)({request,actor,jobId:pending[1].receipt.jobId});seedJob.retiredMedia=[...new Set([...(seedJob.retiredMedia??[]),receipt.jobId])];if(receipt.jobId==='795db8e3-d77c-44b6-b826-549ff2e9305b'){const p=loadMediaProcessingProfile('PDF');if(p.profileId!=='M3-PDF-LOCAL-5')throw new ApiError('LOCAL_RUNTIME_UNAVAILABLE');seedJob.heldMedia=[];seedJob.mediaReplacement={...seedJob.mediaReplacement,credential:'-pdf-local-5'};seedJob.approvedPdfProfile={...seedJob.approvedPdfProfile,profileId:p.profileId,processingRecipeSha256:p.processingRecipeSha256,toolSetSha256:p.toolSetSha256};}else if(receipt.jobId==='724af3e2-0f4c-422b-96f7-e7d54f984fde'){const p=loadMediaProcessingProfile('PDF');if(p.profileId!=='M3-PDF-LOCAL-4')throw new ApiError('LOCAL_RUNTIME_UNAVAILABLE');seedJob.heldMedia=[];seedJob.mediaReplacement={...seedJob.mediaReplacement,credential:'-pdf-local-4'};seedJob.approvedPdfProfile={...seedJob.approvedPdfProfile,profileId:p.profileId,processingRecipeSha256:p.processingRecipeSha256,toolSetSha256:p.toolSetSha256};}else if(receipt.jobId==='48b96365-cf97-40cd-b584-caa4e6188d87')seedJob.heldMedia=['credential'];else seedJob.mediaReplacement={...seedJob.mediaReplacement,credential:next?'-pdf-local-2':'-pdf-local-1'};seedJob.recoveries=[...(seedJob.recoveries??(seedJob.recovery?[seedJob.recovery]:[])),receipt];seedJob.recovery=receipt;save(seedJob);return receipt;}
 return {status,prepare,start,rollback,retryMedia,recoverPdf};
}
