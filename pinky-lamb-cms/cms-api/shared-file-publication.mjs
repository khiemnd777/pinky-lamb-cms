import {ApiError} from '../contracts/errors.mjs';
import {hashProjectValue as hash} from './project-localization-context.mjs';
const same=(a,b)=>hash(a)===hash(b);
const fail=message=>{const error=new ApiError('REVISION_CONFLICT');error.message=message;throw error;};
export const publicationKey=r=>`${r.kind}/${r.entityId}/${r.locale}`;
export function publicationQa(full,r){return r.kind==='hero'?full.hero:r.kind==='group'?full.groups[r.entityId]:r.kind==='section'?full.workServices.sections[r.entityId]:full.workServices[r.kind==='project'?'projects':'services'].find(q=>q[r.kind].id===r.entityId);}
function model(qa){const {draft,resources,base,mediaSlots,...rest}=qa;void draft;void resources;void mediaSlots;return {...rest,...(base?{source:base.source}:{})};}
function differences(old,next,map,actions,path=[]){
 if(same(old,next))return;
 if(old&&next&&typeof old==='object'&&typeof next==='object'&&!Array.isArray(old)&&next.kind==='FILE'&&old.kind!==next.kind){if(old.assetId&&next.assetId&&old.assetId!==next.assetId){const previous=map.get(old.assetId);if(previous&&previous!==next.assetId)fail('Một file đang được đổi sang nhiều nguồn khác nhau.');map.set(old.assetId,next.assetId);}actions.push({path,action:next});return;}
 if(old===null||next===null||typeof old!=='object'||typeof next!=='object'||Array.isArray(old)!==Array.isArray(next))fail('Nguồn có thay đổi ngoài file. Hãy tách thay đổi nội dung trước khi cập nhật file dùng chung.');
 if(!same(Object.keys(old).sort(),Object.keys(next).sort()))fail('Cấu trúc nội dung đã thay đổi ngoài phạm vi file.');
 for(const key of Object.keys(old)){
  if(['assetId','resourceId'].includes(key)&&typeof old[key]==='string'&&typeof next[key]==='string'&&old[key]!==next[key]){const previous=map.get(old[key]);if(previous&&previous!==next[key])fail('Một file đang được đổi sang nhiều nguồn khác nhau.');map.set(old[key],next[key]);}
  else differences(old[key],next[key],map,actions,[...path,key]);
 }
}
function applyModel(value,map,actions){const next=structuredClone(value);function walk(v){if(!v||typeof v!=='object')return;for(const [k,child]of Object.entries(v)){if(['assetId','resourceId'].includes(k)&&map.has(child))v[k]=map.get(child);else walk(child);}}walk(next);for(const change of actions){let node=next;for(const k of change.path.slice(0,-1))node=node[k];const key=change.path.at(-1);node[key]={...change.action,...(node[key]?.label?{label:node[key].label}:{})};}if(actions.length&&next.source&&Object.hasOwn(next.source,'ipServiceId')&&next.source.section?.action?.kind==='FILE'){next.source.ipServiceId=null;if(next.group)next.group.ipServiceId=null;}return next;}
function frozenQa(r,previous){const draft={...structuredClone(previous.draft),dependencyHash:r.dependencyHash};
 if(r.resource.kind==='project'&&r.base.project){const before=previous.project.gallery,after=r.base.project.gallery;if(before.length!==after.length)fail('Cấu trúc thư viện ảnh đã thay đổi.');const imageAlts={cover:draft.content.imageAlts.cover};for(let i=0;i<before.length;i++)imageAlts['gallery:'+after[i].assetId]=draft.content.imageAlts['gallery:'+before[i].assetId];draft.content.imageAlts=imageAlts;draft.contentHash=hash(draft.content);}
 if(r.resource.kind==='hero'){draft.baseRevision=r.base.revision;draft.baseContentHash=r.base.contentHash;}return r.buildQa(draft);}
function assertSelected(r,selection){if(!r.draft||r.stale||r.draft.revision!==selection.expectedRevision||r.draft.contentHash!==selection.expectedContentHash||r.dependencyHash!==selection.expectedDependencyHash)fail('Bản đã lưu hoặc nguồn file đã thay đổi. Tải lại và xác nhận lại phạm vi.');}
/** Rebuild only file consumers from frozen live copy. Other saved drafts are never used. */
export async function prepareSharedFilePlan({release,selection,readCurrent}){
 selection=structuredClone(selection);delete selection.fileConfirmation;
 const full=release.entries.find(q=>q.locale===selection.resource.locale),pin=full?.dependencyVector.resources.find(p=>same(p.resource,selection.resource));if(!pin)fail('Nội dung chưa có trên Website đang chạy.');
 const selected=await readCurrent(selection.resource);assertSelected(selected,selection);
 if(pin.dependencyHash===selected.dependencyHash)return null;
 const oldSelected=publicationQa(full,selection.resource),rebuilt=frozenQa(selected,oldSelected),map=new Map(),actions=[],beforeModel=model(oldSelected),nextModel=model(rebuilt);
 // The IP service link is derived from its CTA; switching that CTA to FILE clears the link.
 if(selection.resource.kind==='group'&&selection.resource.entityId==='ip-studio'&&oldSelected.base.source.section.action.kind!=='FILE'&&rebuilt.base.source.section.action.kind==='FILE'){beforeModel.source.ipServiceId=nextModel.source.ipServiceId;beforeModel.group.ipServiceId=nextModel.group.ipServiceId;}
 differences(beforeModel,nextModel,map,actions);
 const added=actions.flatMap(c=>c.action.assetId?[c.action.assetId]:[]),ids=[...new Set([...map.values(),...added])];if(!ids.length)fail('Thay đổi nguồn không phải thay file dùng chung.');
 const descriptors=ids.map(id=>{const found=rebuilt.resources.find(r=>r.id===id);if(!found||!(/^(image\/(png|jpeg|webp)|application\/pdf)$/.test(found.mimeType)||found.file))fail('Loại file không được hỗ trợ trong lần cập nhật này.');return found;});
 const changes=[...map].map(([from,to])=>({from,to})),targets=[];
 for(const entry of release.entries)for(const previousPin of entry.dependencyVector.resources){
  const resource=previousPin.resource,old=publicationQa(entry,resource),sameEntity=resource.kind===selection.resource.kind&&resource.entityId===selection.resource.entityId;
  if(!old.resources.some(r=>map.has(r.id))&&!(sameEntity&&actions.length)&&!same(resource,selection.resource))continue;
  const current=same(resource,selection.resource)?selected:await readCurrent(resource),qa=frozenQa(current,old),entityActions=sameEntity?actions:[];
  if(!same(applyModel(model(old),map,entityActions),model(qa)))fail(`Nguồn ${resource.entityId} (${resource.locale}) chưa thay đồng nhất file hoặc có thay đổi khác. Không xuất bản draft liên quan.`);
  const expected=new Map(old.resources.map(r=>{const id=map.get(r.id);return id?[id,descriptors.find(d=>d.id===id)]:[r.id,r];}));for(const id of sameEntity?added:[])expected.set(id,descriptors.find(d=>d.id===id));
  if(qa.resources.length!==expected.size||qa.resources.some(r=>!expected.has(r.id)||!same(r,expected.get(r.id))))fail('Tài nguyên ngoài phạm vi file đã thay đổi.');
  if(same(resource,selection.resource)&&!current.qa)fail('Bản nháp được chọn chưa sẵn sàng xuất bản.');
  targets.push({resource,previousPin,qa:same(resource,selection.resource)?current.qa:qa,claims:current.claims,sourceCatalog:current.sourceCatalog,sourceProvenance:current.sourceProvenance});
 }
 // A root Work CTA can use Credential even when no project exposes a page.
 for(const entry of release.entries){const id=entry.workServices.workCredential.resourceId;if(map.has(id)&&!descriptors.find(d=>d.id===map.get(id)&&d.mimeType==='application/pdf'))fail('Credential phải là PDF.');}
 const payload={baseSnapshotSetHash:release.snapshotSetHash,selection,changes,added,descriptors,targets};if(Buffer.byteLength(JSON.stringify(payload))>2*1048576)throw new ApiError('PAYLOAD_TOO_LARGE');return {...payload,hash:hash(payload)};
}
export function sharedFilePlanSummary(plan){return {hash:plan.hash,baseSnapshotSetHash:plan.baseSnapshotSetHash,changes:plan.changes,files:plan.descriptors.map(r=>({id:r.id,name:r.file?.name??r.path,kind:r.file?.kind??(r.mimeType==='application/pdf'?'PDF':'IMAGE')})),resources:plan.targets.map(t=>t.resource)};}

/** Assemble once after every replacement: a partial union could mix old/new shared bytes. */
export function applySharedFilePlan(input,plan,details,{assemble,parse,parseWork,snapshotSetHash}){
 const release=structuredClone(input),map=new Map(plan.changes.map(c=>[c.from,c.to]));
 if(release.snapshotSetHash!==plan.baseSnapshotSetHash||details.length!==plan.targets.length)fail('Phạm vi file không còn khớp bản Website.');
 const sourceHash=hash({previous:release.entries[0].dependencyVector.sourceHash,filePlan:plan.hash}),availabilityHash=hash({previous:release.entries[0].dependencyVector.availabilityHash,filePlan:plan.hash});
 for(const full of release.entries){
  const pins=new Map(full.dependencyVector.resources.map(p=>[publicationKey(p.resource),p]));
  for(const target of plan.targets.filter(t=>t.resource.locale===full.locale)){
   const detail=details.find(d=>same(d.snapshot.resource,target.resource));if(!detail||detail.review?.outcome!=='APPROVED'||!same(detail.snapshot.qa,target.qa)||detail.snapshot.dependencyHash!==target.qa.draft.dependencyHash)fail('Snapshot không khớp phạm vi file đã xác nhận.');
   const {resource}=target,qa=structuredClone(detail.snapshot.qa),pin=pins.get(publicationKey(resource));pin.snapshotId=detail.snapshot.id;pin.approval={snapshotHash:detail.snapshot.snapshotHash,reviewId:detail.review.id,attestationSetHash:detail.review.attestationSetHash};pin.dependencyHash=detail.snapshot.dependencyHash;
   if(resource.kind==='hero')full.hero=qa;else if(resource.kind==='group')full.groups[resource.entityId]=qa;else if(resource.kind==='section')full.workServices.sections[resource.entityId]=qa;else {const collection=resource.kind==='project'?'projects':'services',index=full.workServices[collection].findIndex(q=>q[resource.kind].id===resource.entityId);full.workServices[collection][index]=qa;}
  }
  const work=full.workServices,oldId=work.workCredential.resourceId,newId=map.get(oldId)??oldId,credential=plan.descriptors.find(r=>r.id===newId)??work.resources.find(r=>r.id===oldId);work.workCredential={resourceId:newId};const resources=new Map([[credential.id,credential]]);
  for(const qa of [...Object.values(work.sections),...work.projects,...work.services])for(const r of qa.resources){if(resources.has(r.id)&&!same(resources.get(r.id),r))fail('File dùng chung không khớp giữa các nội dung.');resources.set(r.id,r);}
  const vector=(id,q)=>({id,revision:q.draft.revision,dependencyHash:q.draft.dependencyHash,contentHash:q.draft.contentHash});work.dependencyVector.sections=Object.entries(work.sections).map(([id,q])=>vector(id,q));for(const [collection,kind]of [['projects','project'],['services','service']])work.dependencyVector[collection]=work[collection].map(q=>vector(q[kind].id,q));work.dependencyVector.homeSharedHash=sourceHash;work.dependencyVector.availabilityHash=availabilityHash;work.resources=[...resources.values()];work.dependencyHash=hash({dependencyVector:work.dependencyVector,policy:work.policy,relations:work.relations,excluded:work.excluded});parseWork(work);
  const snapshotIds={},approvalPins={};for(const p of pins.values()){const k=`${p.resource.kind}/${p.resource.entityId}`;snapshotIds[k]=p.snapshotId;approvalPins[k]=p.approval;}
  const index=release.entries.indexOf(full);release.entries[index]=assemble({locale:full.locale,hero:full.hero,groups:full.groups,workServices:work,mode:'APPROVED_RELEASE',snapshotIds,approvalPins,sourceHash,availabilityHash,heroDependencyHash:full.hero.draft.dependencyHash??pins.get(`hero/home-v3/${full.locale}`).dependencyHash});
 }
 release.snapshotSetHash=snapshotSetHash(release.entries);return parse(release);
}
