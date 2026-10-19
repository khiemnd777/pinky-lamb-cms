import {GROUP_IDS} from '../contracts/group-localization.mjs';
import {localizedHeroReadSchema} from '../contracts/hero-localization-records.mjs';
import {groupReadSchema,groupStatusSchema} from '../contracts/group-localization-records.mjs';
import {localizedProjectReadSchema,localizedProjectStatusSchema} from '../contracts/project-localization-records.mjs';
import {localizedServiceReadSchema,localizedServiceStatusSchema} from '../contracts/service-localization-records.mjs';
import {localizedSectionReadSchema} from '../contracts/work-services-localization-records.mjs';
const readSchemas={hero:localizedHeroReadSchema,group:groupReadSchema,project:localizedProjectReadSchema,service:localizedServiceReadSchema,section:localizedSectionReadSchema};
const kinds={HERO_LOCALIZATION:'hero',GROUP_LOCALIZATION:'group',PROJECT_LOCALIZATION:'project',SERVICE_LOCALIZATION:'service',SECTION_LOCALIZATION:'section'};
export function localizedReadProjection(resource,r){
 const {kind,entityId,locale}=resource;return readSchemas[kind].parse({contractRevision:1,draftId:'home-v3',locale,...(kind==='hero'?{sourceStale:r.stale}:{[kind+'Id']:entityId}),base:r.base,draft:r.draft});
}
/** Only current worker results serve normal reads. QA/commands still execute
 * their complete domain checks. Pending generations use the existing reader. */
export function readLocalizedProjection(db,route){if(!db.content)return null;return db.sqlite.transaction(()=>readSnapshot(db,route)).deferred();}
function readSnapshot(db,route){
 if(!db.content)return null;
 const kind=kinds[route.kind],family=({GROUP_LOCALIZATION_STATUS:'group',PROJECT_LOCALIZATION_STATUS:'project',SERVICE_LOCALIZATION_STATUS:'service'})[route.kind];if(!kind&&!family)return null;
 const job=db.sqlite.prepare("SELECT state,source_hash FROM cms_content_jobs WHERE job_key='readiness'").get();if(job?.state!=='COMPLETED'||job.source_hash!==db.content.sourcePins())return null;
 const read=key=>{const row=db.sqlite.prepare('SELECT result_json FROM cms_readiness_resources WHERE resource_key=?').get(key);return row?JSON.parse(row.result_json):null;};
 if(kind){const id=kind==='hero'?'home-v3':route[kind+'Id'];return read(`${kind}--${id}--${route.locale}`)?.read??null;}
 const values=db.sqlite.prepare('SELECT result_json FROM cms_readiness_resources ORDER BY resource_key').all().map(row=>JSON.parse(row.result_json)).filter(v=>v.row.resource.kind===family);
 const grouped=new Map();for(const v of values){if(!v.read)return null;const {entityId,locale}=v.row.resource;let result=grouped.get(entityId);if(!result){const base=v.read.base,source=base[family]??base.source;result={[family+'Id']:entityId,sourceTitle:family==='group'?entityId:source.title,isVisible:v.isVisible,locales:{},...(family==='project'?{category:source.category}:{})};grouped.set(entityId,result);}const d=v.read.draft;result.locales[locale]=d?{revision:d.revision,dependencyHash:d.dependencyHash,contentHash:d.contentHash,updatedAt:d.updatedAt,stale:v.draft.stale}:null;}
 const list=family+'s',schema=family==='group'?groupStatusSchema:family==='project'?localizedProjectStatusSchema:localizedServiceStatusSchema;
 const order=family==='group'?GROUP_IDS:db.sqlite.prepare("SELECT entity_id AS id FROM cms_content_entities WHERE site_id='home-v3' AND kind=? ORDER BY position,entity_id").all(family).map(r=>r.id);if(order.some(id=>!grouped.has(id)))return null;return schema.parse({contractRevision:1,draftId:'home-v3',[list]:order.map(id=>grouped.get(id))});
}
