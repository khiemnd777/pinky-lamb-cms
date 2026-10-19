import {createHash} from 'node:crypto';
import {CONTENT_CODE_VERSION} from './content-code-version.mjs';
import {groupSourceFromHome,groupSourceMediaUses} from '../contracts/group-localization.mjs';
import {groupClaimPaths} from './group-localization-context.mjs';
import {resourceKey} from './localized-resource-context.mjs';
import {ApiError} from '../contracts/errors.mjs';
import {mediaV2DocumentId} from './media-upload-domain.mjs';
import {projectTemplateResources} from './project-localization-context.mjs';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const collections={hero:'cmsLocalizedHeroDrafts',group:'cmsLocalizedGroupDrafts',section:'cmsLocalizedSectionDrafts',project:'cmsLocalizedProjectDrafts',service:'cmsLocalizedServiceDrafts'};
/** Conservative dependency pins cover every input of the existing domain
 * evaluator. Results are committed only with the enclosing job's source CAS. */
export function createReadinessResourceCache(db){
 const templatePin=hash(projectTemplateResources()),sql=db.sqlite,updates=new Map(),computed=new Set(),rows=sql.prepare('SELECT source_pin,result_json FROM cms_readiness_resources WHERE resource_key=?');
 const raw=path=>db.row(path)?.body??null;
 function pin(resource,current,record){
  const c=current.content,{kind,entityId,locale}=resource;let source,paths,ids=[];
  if(kind==='group'){source=groupSourceFromHome(c,entityId);paths=groupClaimPaths(entityId,source);ids=groupSourceMediaUses(entityId,source).map(u=>u.assetId);}
  else if(kind==='project'){const p=c.projects.find(p=>p.id===entityId);source={project:p,index:c.projects.findIndex(p=>p.id===entityId),credential:p.publicCredentialPage?c.settings.credential:null};paths=[`projects/${entityId}/facts`,'creative-copy'];ids=[p.cover.assetId,...p.gallery.map(v=>v.assetId),...(p.publicCredentialPage?[c.settings.credential.assetId]:[])];}
  else if(kind==='service'){source={service:c.services.find(s=>s.id===entityId),section:c.sections.find(s=>s.sectionId==='services')};paths=[`services/${entityId}/facts`,'creative-copy'];}
  else if(kind==='section'){source={section:c.sections.find(s=>s.sectionId===entityId),index:c.sections.findIndex(s=>s.sectionId===entityId),related:entityId==='work'?c.projects.map(p=>({id:p.id,isVisible:p.isVisible,category:p.category,serviceIds:p.serviceIds,images:[p.cover.assetId,...p.gallery.map(i=>i.assetId)]})):c.services.map(s=>({id:s.id,isVisible:s.isVisible}))};paths=['creative-copy'];}
  else {source={hero:c.hero,brand:c.settings.brand};paths=['hero/facts','creative-copy'];ids=[c.hero.image.assetId,c.settings.brand.logo.assetId];}
  const draftPath=collections[kind]+'/'+(kind==='hero'?`home-v3--${locale}`:`home-v3--${entityId}--${locale}`),draft=raw(draftPath),bindings=c.claimSources.filter(b=>paths.includes(b.claimPath)),pointer=raw('cmsLocalizedApprovals/'+resourceKey(resource)),p=pointer?JSON.parse(pointer):null,snapshot=p?raw('cmsLocalizedSnapshots/'+p.snapshotId):null,state=p?raw('cmsLocalizedReviewStates/'+p.snapshotId):null,s=state?JSON.parse(state):null;
  const association=kind==='hero'&&draft?raw(`cmsLocalizedHeroBases/home-v3--${locale}--${JSON.parse(draft).revision}`):null;
  // Old Hero drafts use the full Home pin until an explicit rebase records a
  // scoped dependency hash. Preserve that historical freshness rule.
  const legacyHome=kind==='hero'&&draft&&!JSON.parse(draft).dependencyHash&&!association?{revision:current.revision,content:c}:null;
  const media=[...new Set(ids)].sort().map(id=>{
   const version=raw('cmsMediaVersions/'+id),mapping=raw('cmsMediaJobMappings/'+mediaV2DocumentId({kind:'ASSET_JOB',assetId:id}));
   if(!mapping)return [id,version,null];const m=JSON.parse(mapping),v=version?JSON.parse(version):null;
   return [id,version,mapping,raw('cmsMediaUploads/'+mediaV2DocumentId({kind:'INTENT',intentId:m.intentId})),raw('cmsMediaJobs/'+mediaV2DocumentId({kind:'JOB',jobId:m.jobId})),raw('cmsMediaMetadata/'+mediaV2DocumentId({kind:'INTENT',intentId:m.intentId})),raw('cmsMediaProcessingEvidence/'+v?.readyFact?.storage?.manifestReceiptId)];
  });
  return hash({code:CONTENT_CODE_VERSION,templatePin,source,bindings,import:record,media,draft,association,legacyHome,pointer,snapshot,state,review:s?.reviewId?raw('cmsLocalizedReviews/'+s.reviewId):null,checks:Object.values(s?.activeSourceCheckIds??{}).map(id=>raw('cmsLocalizedSourceChecks/'+id))});
 }
 return {get(resource,current,record){const key=resourceKey(resource),sourcePin=pin(resource,current,record),r=rows.get(key);return {key,sourcePin,value:r?.source_pin===sourcePin?JSON.parse(r.result_json):null};},put(ticket,value){computed.add(ticket.key);updates.set(ticket.key,{sourcePin:ticket.sourcePin,value});},refresh(ticket,value){updates.set(ticket.key,{sourcePin:ticket.sourcePin,value});},commit(){const put=sql.prepare('INSERT INTO cms_readiness_resources VALUES (?,?,?) ON CONFLICT(resource_key) DO UPDATE SET source_pin=excluded.source_pin,result_json=excluded.result_json');for(const [key,r]of updates)put.run(key,r.sourcePin,JSON.stringify(r.value));},get size(){return computed.size;}};
}

export function readReadinessProjection(db){return db.sqlite.transaction(()=>readStatusSnapshot(db)).deferred();}
function readStatusSnapshot(db){
 const row=db.sqlite.prepare("SELECT * FROM cms_content_jobs WHERE job_key='readiness'").get();
 if(!row)throw new ApiError('LOCAL_RUNTIME_UNAVAILABLE');
 const current=row.state==='COMPLETED'&&row.source_hash===db.content.sourcePins();
 return {contractRevision:1,kind:'CONTENT_READINESS_STATUS',state:row.state==='COMPLETED'&&!current?'PENDING':row.state,generation:row.generation,updatedAt:row.updated_at,readiness:current?JSON.parse(row.payload):null,draftStatuses:current?db.sqlite.prepare('SELECT result_json FROM cms_readiness_resources ORDER BY resource_key').all().map(r=>{const v=JSON.parse(r.result_json);return {resource:v.row.resource,draft:v.draft??null};}):[],errorCode:row.error_code};
}

/** One isolated worker owns projection computation. A source mutation fences an
 * in-flight job; stale results can never become current readiness. */
export function createReadinessWorker({db,createEligibility,clock=Date.now,onError=()=>{}}){
 const sql=db.sqlite;let running=false;
 async function tick(){
  if(running)return null;running=true;
  try{
   const source=db.content.sourcePins(),at=new Date(clock()).toISOString();
   let job=sql.prepare("SELECT * FROM cms_content_jobs WHERE job_key='readiness'").get();
   if(!job){db.content.invalidate();job=sql.prepare("SELECT * FROM cms_content_jobs WHERE job_key='readiness'").get();}
   if(job.state==='COMPLETED'&&job.source_hash!==source){db.content.invalidate();job=sql.prepare("SELECT * FROM cms_content_jobs WHERE job_key='readiness'").get();}
   const attempts=job.state==='FAILED'&&job.source_hash===source?JSON.parse(job.payload??'null')?.attempts??0:0;
   if(job.state==='RUNNING'&&job.lease_until>clock()||job.state==='COMPLETED'||job.state==='FAILED'&&job.source_hash===source&&(attempts>=3||job.lease_until>clock()))return null;
   const claimed=sql.prepare("UPDATE cms_content_jobs SET state='RUNNING',source_hash=?,error_code=NULL,updated_at=?,lease_until=? WHERE job_key='readiness' AND generation=? AND (state<>'RUNNING' OR lease_until<=?)").run(source,at,clock()+60000,job.generation,clock());if(!claimed.changes)return null;
   let cache;
   try{
    cache=createReadinessResourceCache(db);
    const eligibility=await createEligibility(cache),payload=await eligibility.readReadiness({request:{}});
    const committed=sql.transaction(()=>{
     if(db.content.sourcePins()!==source)return false;
     const result=sql.prepare("UPDATE cms_content_jobs SET state='COMPLETED',payload=?,updated_at=?,lease_until=0 WHERE job_key='readiness' AND generation=? AND state='RUNNING' AND source_hash=?").run(JSON.stringify(payload),new Date(clock()).toISOString(),job.generation,source);
     if(result.changes)cache.commit();return Boolean(result.changes);
    }).immediate();
    if(!committed){const current=sql.prepare("SELECT generation FROM cms_content_jobs WHERE job_key='readiness'").get();if(current.generation===job.generation)db.content.invalidate();}
    return {committed,recomputed:cache.size};
   }catch(error){onError(error);sql.prepare("UPDATE cms_content_jobs SET state='FAILED',error_code=?,updated_at=?,payload=?,lease_until=? WHERE job_key='readiness' AND generation=? AND source_hash=? AND state='RUNNING'").run(error instanceof ApiError?error.code:'INTERNAL_ERROR',new Date(clock()).toISOString(),JSON.stringify({attempts:attempts+1}),clock()+5000*(attempts+1),job.generation,source);return {committed:false,errorCode:error instanceof ApiError?error.code:'INTERNAL_ERROR'};}
  }finally{running=false;}
 }
 return {tick};
}
