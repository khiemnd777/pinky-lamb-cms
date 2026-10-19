import {ApiError} from '../contracts/errors.mjs';
import {parseLocalizedReleaseBundle} from '../contracts/localized-review-records.mjs';
import {parseWorkServicesQa} from '../contracts/site-locale-projection.mjs';
import {assembleFullSiteQa} from './full-site-localizations.mjs';
import {releaseSnapshotSetHash} from './localized-eligibility.mjs';
import {hashProjectValue as hash} from './project-localization-context.mjs';

const same=(a,b)=>hash(a)===hash(b);
function blocked(message){const error=new ApiError('REVISION_CONFLICT');error.message=message;throw error;}
function targetPin(release,resource,dependencyHash){
 const full=release.entries.find(q=>q.locale===resource.locale),pin=full?.dependencyVector.resources.find(v=>same(v.resource,resource));
 if(!pin)blocked('Nội dung chưa có trong bản website đang chạy. Cần chuẩn bị riêng thay đổi cấu trúc website.');
 if(pin.dependencyHash!==dependencyHash)blocked('Nguồn hoặc media dùng chung đã thay đổi. Cần đối chiếu phạm vi phụ thuộc trước khi xuất bản riêng nội dung này.');
 return {full,pin};
}
/** Start from the live frozen bundle, never from current drafts or current approval pointers. */
export function replaceSelectedRelease(input,detail){
 const release=structuredClone(parseLocalizedReleaseBundle(input));
 if(release.snapshotSetHash!==releaseSnapshotSetHash(release.entries))throw Error('Live release digest mismatch');
 const {snapshot,review}=detail,{resource}=snapshot,{full}=targetPin(release,resource,snapshot.dependencyHash),qa=structuredClone(snapshot.qa);
 if(review?.outcome!=='APPROVED'||qa.draft.revision!==snapshot.revision||qa.draft.locale!==resource.locale||qa.draft.contentHash!==snapshot.contentHash||hash(qa.draft.content)!==snapshot.contentHash)throw Error('Selected snapshot identity mismatch');
 const work=full.workServices;
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
 const base=await readRelease(job.base);targetPin(base,selection.resource,selection.expectedDependencyHash);
 if(!same(readPointer(),job.base)&&!(job.target&&same(readPointer(),job.target)))blocked('Website đã chuyển sang bản khác. Tải lại trước khi xuất bản.');
 await assertDraft();
 await stage(job,'Chuẩn bị đúng nội dung và ngôn ngữ đã chọn');
 // Pin the publication to the exact saved intent, including its note. A page reload
 // can create a new website job but must not duplicate the immutable CMS history.
 if(!job.publication){job.publication=await editorial.publishDraft({request,actor,body:selection,key:'selected_'+hash({actorUid:actor.uid,selection})});save(job);}
 const detail=await editorial.readSnapshot({request,id:job.publication.snapshotId});
 if(!same(detail.snapshot.resource,selection.resource)||detail.snapshot.revision!==selection.expectedRevision||detail.snapshot.contentHash!==selection.expectedContentHash||detail.snapshot.snapshotHash!==job.publication.snapshotHash||detail.stale)blocked('Bản xuất bản không còn khớp nội dung đã chọn.');
 const release=replaceSelectedRelease(base,detail);
 if(!job.artifact){await stage(job,'Đóng gói bản website; giữ nguyên các nội dung khác');job.exportAttempt=(job.exportAttempt??0)+1;save(job);job.artifact=await exportRelease(job,release);save(job);}
 const next=job.target??{port:4189,activation:false,artifact:{relativeRoot:job.artifact.root,manifestSha256:job.artifact.manifestSha256},previous:job.base.artifact,previousReleaseSource:job.base.releaseSource??null,releaseId:job.artifact.releaseId,releaseSource:job.artifact.releaseSource,snapshotSetHash:release.snapshotSetHash,updatedAt:new Date().toISOString()};
 if(next.snapshotSetHash!==release.snapshotSetHash)throw Error('Candidate release identity mismatch');
 job.target=next;save(job);
 await assertDraft();await owner(request,actor);
 const current=readPointer();if(!same(current,job.base)&&!same(current,next))blocked('Website đã chuyển sang bản khác. Tải lại trước khi xuất bản.');
 await stage(job,'Cập nhật và kiểm tra website :4189');
 try{if(!same(current,next))writePointer(next);await verifyWebsite(next);await owner(request,actor);if(!same(readPointer(),next))blocked('Website đã thay đổi trong lúc kiểm tra.');}
 catch(error){if(same(readPointer(),next))writePointer(job.base);throw error;}
 job.result={...job.publication,status:'PUBLISHED_ON_WEBSITE',port:4189,activation:false,releaseId:next.releaseId,snapshotSetHash:next.snapshotSetHash,artifact:next.artifact};
 save(job);return job.result;
}
