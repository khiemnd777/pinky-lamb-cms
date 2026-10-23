import {prepareSharedFilePlan,applySharedFilePlan,sharedFilePlanSummary} from './shared-file-publication.mjs';
import {groupSourceSchema} from '../contracts/group-localization.mjs';
import {ApiError} from '../contracts/errors.mjs';
import {parseLocalizedReleaseBundle} from '../contracts/localized-review-records.mjs';
import {parseWorkServicesQa} from '../contracts/site-locale-projection.mjs';
import {assembleFullSiteQa} from './full-site-localizations.mjs';
import {releaseSnapshotSetHash} from './localized-eligibility.mjs';
import {hashProjectValue as hash} from './project-localization-context.mjs';
import {MAX_RETAINED_WEBSITE_RELEASES} from '../scripts/local-website-pointer.mjs';

const same=(a,b)=>hash(a)===hash(b);
function blocked(message){const error=new ApiError('REVISION_CONFLICT');error.message=message;throw error;}
export function targetPin(release,resource,dependencyHash,source){
 const full=release.entries.find(q=>q.locale===resource.locale),pin=full?.dependencyVector.resources.find(v=>same(v.resource,resource));
 if(!pin)blocked('Nội dung chưa có trong bản website đang chạy. Cần chuẩn bị riêng thay đổi cấu trúc website.');
 if(pin.dependencyHash!==dependencyHash&&!showreelOnlyChange(full,resource,source))blocked('Nguồn hoặc media dùng chung đã thay đổi. Cần đối chiếu phạm vi phụ thuộc trước khi xuất bản riêng nội dung này.');
 return {full,pin};
}
/** Only Showreel source changes may cross the old shared dependency pin.
 * Other About facts and every other resource keep the existing strict boundary. */
function showreelOnlyChange(full,resource,source){
 if(resource.kind!=='group'||resource.entityId!=='about'||!source)return false;
 const checked=groupSourceSchema('about').safeParse(source);if(!checked.success)return false;
 const previous=full.groups.about.base.source,{showreel:old,...oldRest}=previous,{showreel:next,...nextRest}=checked.data;
 return !same(old,next)&&same(oldRest,nextRest);
}
function assertUnchangedAboutMedia(previous,next){
 const stable=qa=>qa.mediaSlots.filter(s=>!['about/showreel','about/poster'].includes(s.slotId)).map(slot=>({slot,resource:qa.resources.find(r=>r.id===slot.resourceId)}));
 if(!same(stable(previous),stable(next)))blocked('Media ngoài Showreel đã thay đổi. Website giữ nguyên bản trước.');
}
/** Start from the live frozen bundle, never from current drafts or current approval pointers. */
export function replaceSelectedRelease(input,detail){
 const release=structuredClone(parseLocalizedReleaseBundle(input));
 if(release.snapshotSetHash!==releaseSnapshotSetHash(release.entries))throw Error('Live release digest mismatch');
 const {snapshot,review}=detail,{resource}=snapshot,{full}=targetPin(release,resource,snapshot.dependencyHash,snapshot.qa?.base?.source),qa=structuredClone(snapshot.qa);
 if(review?.outcome!=='APPROVED'||qa.draft.revision!==snapshot.revision||qa.draft.locale!==resource.locale||qa.draft.contentHash!==snapshot.contentHash||hash(qa.draft.content)!==snapshot.contentHash)throw Error('Selected snapshot identity mismatch');
 const work=full.workServices;
 if(resource.kind==='group'&&resource.entityId==='about')assertUnchangedAboutMedia(full.groups.about,qa);
 if(resource.kind==='hero')full.hero=qa;
 else if(resource.kind==='group')full.groups[resource.entityId]=qa;
 else if(resource.kind==='section')work.sections[resource.entityId]=qa;
 else {const collection=resource.kind==='project'?'projects':'services',entity=resource.kind;const index=work[collection].findIndex(q=>q[entity].id===resource.entityId);if(index<0)blocked('Không tìm thấy nội dung trên website.');work[collection][index]=qa;}
 if(['section','project','service'].includes(resource.kind)){
  const vector=(id,d)=>({id,revision:d.revision,dependencyHash:d.dependencyHash,contentHash:d.contentHash});
  work.dependencyVector.sections=Object.entries(work.sections).map(([id,q])=>vector(id,q.draft));
  for(const [collection,kind]of [['projects','project'],['services','service']])work.dependencyVector[collection]=work[collection].map(q=>vector(q[kind].id,q.draft));
  const credential=work.resources.find(r=>r.id===work.workCredential.resourceId),resources=new Map([[credential.id,credential]]);
  for(const q of [...Object.values(work.sections),...work.projects,...work.services])for(const r of q.resources){if(resources.has(r.id)&&!same(resources.get(r.id),r))blocked('Media dùng chung không khớp bản website đang chạy.');resources.set(r.id,r);}
  work.resources=[...resources.values()];work.dependencyHash=hash({dependencyVector:work.dependencyVector,policy:work.policy,relations:work.relations,excluded:work.excluded});parseWorkServicesQa(work);
 }
 const snapshotIds={},approvalPins={};for(const entry of full.dependencyVector.resources){const key=`${entry.resource.kind}/${entry.resource.entityId}`;snapshotIds[key]=entry.snapshotId;approvalPins[key]=entry.approval;}
 const key=`${resource.kind}/${resource.entityId}`;snapshotIds[key]=snapshot.id;approvalPins[key]={snapshotHash:snapshot.snapshotHash,reviewId:review.id,attestationSetHash:review.attestationSetHash};
 const index=release.entries.indexOf(full);
 release.entries[index]=assembleFullSiteQa({locale:full.locale,hero:full.hero,groups:full.groups,workServices:work,mode:'APPROVED_RELEASE',snapshotIds,approvalPins,sourceHash:full.dependencyVector.sourceHash,availabilityHash:full.dependencyVector.availabilityHash,heroDependencyHash:full.dependencyVector.resources.find(v=>v.resource.kind==='hero').dependencyHash});
 release.snapshotSetHash=releaseSnapshotSetHash(release.entries);return parseLocalizedReleaseBundle(release);
}

/** A resumable application command. CMS history can exist after a failed website update. */
export async function runSelectedPublication(job,{request,actor},deps){
 const {editorial,owner,readPointer,writePointer,readRelease,exportRelease,verifyWebsite,save,stage}=deps,selection=job.selection;
 const assertDraft=async()=>{const current=await editorial.readResource({request,resource:selection.resource});if(!current.draft||current.stale||current.draft.revision!==selection.expectedRevision||current.draft.contentHash!==selection.expectedContentHash||current.currentDependencyHash!==selection.expectedDependencyHash)blocked('Bản đã lưu hoặc nguồn đã thay đổi. Tải lại đúng nội dung trước khi xuất bản.');};
 await owner(request,actor);
 if(!job.base){const base=readPointer();if(!base)blocked('Chưa có bản website đang chạy để giữ nguyên các nội dung khác.');job.base=base;save(job);}
 const base=await readRelease(job.base);let selectedSource;if(selection.resource.kind==='group'&&selection.resource.entityId==='about'&&deps.readSelectedSource)selectedSource=await deps.readSelectedSource(selection.resource);if(!selection.fileConfirmation)targetPin(base,selection.resource,selection.expectedDependencyHash,selectedSource);
 if(!same(readPointer(),job.base)&&!(job.target&&same(readPointer(),job.target)))blocked('Website đã chuyển sang bản khác. Tải lại trước khi xuất bản.');
 if(!job.target&&(job.base.retainedArtifacts??[]).length>=MAX_RETAINED_WEBSITE_RELEASES-1)blocked('Lịch sử tài nguyên website đã đạt giới hạn; cần bảo trì trước khi xuất bản tiếp.');
 await assertDraft();
 await stage(job,'Chuẩn bị đúng nội dung và ngôn ngữ đã chọn');
 // Pin the publication to the exact saved intent, including its note. A page reload
 // can create a new website job but must not duplicate the immutable CMS history.
 if(selection.fileConfirmation){if(!job.filePublication){job.filePublication=await editorial.publishSharedFiles({request,actor,base,selection,key:'shared_'+hash({actorUid:actor.uid,selection})});job.publication=job.filePublication.publication;save(job);}await editorial.assertSharedFiles({request,actor,base,selection,planHash:job.filePublication.plan.hash});}
 else if(!job.publication){job.publication=await editorial.publishDraft({request,actor,body:selection,key:'selected_'+hash({actorUid:actor.uid,selection})});save(job);}
 const detail=await editorial.readSnapshot({request,id:job.publication.snapshotId});
 if(!same(detail.snapshot.resource,selection.resource)||detail.snapshot.revision!==selection.expectedRevision||detail.snapshot.contentHash!==selection.expectedContentHash||detail.snapshot.snapshotHash!==job.publication.snapshotHash||detail.stale)blocked('Bản xuất bản không còn khớp nội dung đã chọn.');
 const release=job.filePublication?replaceSharedFileRelease(base,job.filePublication.plan,job.filePublication.details):replaceSelectedRelease(base,detail);
 if(!job.artifact){await stage(job,'Đóng gói bản website; giữ nguyên các nội dung khác');job.exportAttempt=(job.exportAttempt??0)+1;save(job);job.artifact=await exportRelease(job,release);save(job);}
 const retainedArtifacts=[...(job.base.retainedArtifacts??[]),job.base.artifact].filter((artifact,index,all)=>all.findIndex(item=>item.manifestSha256===artifact.manifestSha256)===index);
 const next=job.target??{port:4189,activation:false,artifact:{relativeRoot:job.artifact.root,manifestSha256:job.artifact.manifestSha256},previous:job.base.artifact,retainedArtifacts,previousReleaseSource:job.base.releaseSource??null,releaseId:job.artifact.releaseId,releaseSource:job.artifact.releaseSource,snapshotSetHash:release.snapshotSetHash,updatedAt:new Date().toISOString()};
 if(next.snapshotSetHash!==release.snapshotSetHash)throw Error('Candidate release identity mismatch');
 job.target=next;save(job);
 await assertDraft();if(job.filePublication)await editorial.assertSharedFiles({request,actor,base,selection,planHash:job.filePublication.plan.hash});await owner(request,actor);
 const current=readPointer();if(!same(current,job.base)&&!same(current,next))blocked('Website đã chuyển sang bản khác. Tải lại trước khi xuất bản.');
 await stage(job,'Cập nhật và kiểm tra website :4189');
 try{if(!same(current,next))writePointer(next);await verifyWebsite(next);await assertDraft();if(job.filePublication)await editorial.assertSharedFiles({request,actor,base,selection,planHash:job.filePublication.plan.hash});await owner(request,actor);if(!same(readPointer(),next))blocked('Website đã thay đổi trong lúc kiểm tra.');}
 catch(error){if(same(readPointer(),next))writePointer(job.base);throw error;}
 job.result={...job.publication,...(job.filePublication?{fileUpdate:sharedFilePlanSummary(job.filePublication.plan)}:{}),status:'PUBLISHED_ON_WEBSITE',port:4189,activation:false,releaseId:next.releaseId,snapshotSetHash:next.snapshotSetHash,artifact:next.artifact};
 save(job);return job.result;
}

export function replaceSharedFileRelease(base,plan,details){return applySharedFilePlan(base,plan,details,{assemble:assembleFullSiteQa,parse:parseLocalizedReleaseBundle,parseWork:parseWorkServicesQa,snapshotSetHash:releaseSnapshotSetHash});}
export async function prepareWebsitePublication({release,selection,readCurrent}){
 const current=await readCurrent(selection.resource);if(!current.draft||current.stale||current.draft.revision!==selection.expectedRevision||current.dependencyHash!==selection.expectedDependencyHash||current.draft.contentHash!==selection.expectedContentHash)blocked('Bản đã lưu hoặc nguồn đã thay đổi. Tải lại trước khi chuẩn bị xuất bản.');
 const source=selection.resource.kind==='group'&&selection.resource.entityId==='about'?current.base.source:undefined;const read=resource=>same(resource,selection.resource)?Promise.resolve(current):readCurrent(resource);
 let plan;
 try{plan=await prepareSharedFilePlan({release,selection,readCurrent:read});}catch(error){
  if(!showreelOnlyChange(release.entries.find(q=>q.locale===selection.resource.locale),selection.resource,source))throw error;
 }
 if(!plan){targetPin(release,selection.resource,selection.expectedDependencyHash,source);return {mode:'SELECTED',selection};}
 const details=plan.targets.map((t,i)=>({snapshot:{resource:t.resource,qa:t.qa,dependencyHash:t.qa.draft.dependencyHash,id:'preview-file-'+i,snapshotHash:plan.hash},review:{outcome:'APPROVED',id:'preview-file-review-'+i,attestationSetHash:plan.hash}}));
 const preview=replaceSharedFileRelease(release,plan,details);
 return {mode:'SHARED_FILES',selection,...sharedFilePlanSummary(plan),previews:preview.entries.filter(q=>plan.targets.some(t=>t.resource.locale===q.locale))};
}
