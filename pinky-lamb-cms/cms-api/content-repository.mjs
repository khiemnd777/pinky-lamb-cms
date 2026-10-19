import {createHash} from 'node:crypto';
import {CONTENT_CODE_VERSION} from './content-code-version.mjs';

const SITE='home-v3';
const LOCALIZED=new Set(['cmsLocalizedHeroDrafts','cmsLocalizedProjectDrafts','cmsLocalizedServiceDrafts','cmsLocalizedSectionDrafts','cmsLocalizedGroupDrafts']);
const hash=value=>createHash('sha256').update(value).digest('hex');
const json=value=>JSON.stringify(value);
const id=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,256}$/.test(value);
export const CONTENT_SCHEMA_VERSION=1;

export function installContentSchema(sql){
 sql.exec(`
 CREATE TABLE IF NOT EXISTS cms_content_schema(version INTEGER PRIMARY KEY CHECK(version=1));
 INSERT OR IGNORE INTO cms_content_schema VALUES (1);
 CREATE TABLE IF NOT EXISTS cms_content_sites(
  site_id TEXT PRIMARY KEY, head_json TEXT NOT NULL CHECK(json_valid(head_json)),
  content_keys TEXT NOT NULL CHECK(json_valid(content_keys)), version INTEGER NOT NULL CHECK(version>0));
 CREATE TABLE IF NOT EXISTS cms_content_entities(
  site_id TEXT NOT NULL REFERENCES cms_content_sites(site_id), kind TEXT NOT NULL,
  entity_id TEXT NOT NULL, position INTEGER NOT NULL, revision INTEGER NOT NULL CHECK(revision>0),
  body TEXT NOT NULL CHECK(json_valid(body)), content_hash TEXT NOT NULL,
  PRIMARY KEY(site_id,kind,entity_id));
 CREATE INDEX IF NOT EXISTS cms_content_entity_order ON cms_content_entities(site_id,kind,position,entity_id);
 CREATE TABLE IF NOT EXISTS cms_content_localizations(
  path TEXT PRIMARY KEY, collection_path TEXT NOT NULL, entity_id TEXT NOT NULL,
  body TEXT NOT NULL CHECK(json_valid(body)), version INTEGER NOT NULL CHECK(version>0));
 CREATE INDEX IF NOT EXISTS cms_content_localization_collection ON cms_content_localizations(collection_path,path);
 CREATE TABLE IF NOT EXISTS cms_content_legacy_archive(
  path TEXT PRIMARY KEY, body TEXT NOT NULL, version INTEGER NOT NULL, sha256 TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS cms_content_references(
  site_id TEXT NOT NULL, owner_kind TEXT NOT NULL, owner_id TEXT NOT NULL,
  target_kind TEXT NOT NULL, target_id TEXT NOT NULL,
  PRIMARY KEY(site_id,owner_kind,owner_id,target_kind,target_id));
 CREATE INDEX IF NOT EXISTS cms_content_reference_target ON cms_content_references(target_kind,target_id,site_id,owner_kind,owner_id);
 CREATE TABLE IF NOT EXISTS cms_content_jobs(
  job_key TEXT PRIMARY KEY, generation INTEGER NOT NULL CHECK(generation>0),
  state TEXT NOT NULL CHECK(state IN ('PENDING','RUNNING','COMPLETED','FAILED')),
  source_hash TEXT, payload TEXT CHECK(payload IS NULL OR json_valid(payload)),
  error_code TEXT, updated_at TEXT NOT NULL, lease_until INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS cms_media_verified(
  asset_id TEXT PRIMARY KEY, source_hash TEXT NOT NULL, ready_json TEXT NOT NULL CHECK(json_valid(ready_json)),
  validator_version INTEGER NOT NULL, verified_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS cms_readiness_resources(
  resource_key TEXT PRIMARY KEY, source_pin TEXT NOT NULL, result_json TEXT NOT NULL CHECK(json_valid(result_json)));
 CREATE VIEW IF NOT EXISTS cms_current_documents AS
  SELECT path,collection_path,body,version FROM cms_documents
  UNION ALL SELECT path,collection_path,body,version FROM cms_content_localizations;
 `);
}

export function hasContentSchema(sql){return Boolean(sql.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='cms_content_schema'").get());}

function splitContent(content){
 if(content.schemaVersion!==3||!Array.isArray(content.sections)||!Array.isArray(content.projects)||!Array.isArray(content.services)||!Array.isArray(content.settings?.clientLogos))throw Error('Unsupported content source');
 const entities=[],add=(kind,entityId,value,position=0)=>{if(!id(entityId))throw Error('Invalid content entity');entities.push({kind,entityId,position,body:json(value)});};
 const settings={...content.settings,clientLogos:null};
 add('settings','site',settings);add('hero','home',content.hero);add('seo','site',content.seo);
 add('structure','site',{schemaVersion:content.schemaVersion,locale:content.locale,sectionOrder:content.sectionOrder,claimSources:content.claimSources});
 for(const [key,kind]of [['sections','section'],['projects','project'],['services','service']])content[key].forEach((value,position)=>add(kind,value.sectionId??value.id,value,position));
 content.settings.clientLogos.forEach((value,position)=>add('client',value.id,value,position));
 if(new Set(entities.map(e=>e.kind+'/'+e.entityId)).size!==entities.length)throw Error('Duplicate content entity');
 const supported=new Set(['schemaVersion','locale','hero','seo','sectionOrder','sections','settings','projects','services','claimSources']);
 if(Object.keys(content).some(key=>!supported.has(key)))throw Error('Unknown content field');
 return entities;
}

export function openContentRepository(sql){
 if(!hasContentSchema(sql))return null;
 const head=sql.prepare('SELECT * FROM cms_content_sites WHERE site_id=?');
 const rows=sql.prepare('SELECT * FROM cms_content_entities WHERE site_id=? ORDER BY kind,position,entity_id');
 const one=sql.prepare('SELECT * FROM cms_content_entities WHERE site_id=? AND kind=? AND entity_id=?');
 const byKind=sql.prepare('SELECT * FROM cms_content_entities WHERE site_id=? AND kind=? ORDER BY position,entity_id');
 const localized=sql.prepare('SELECT path,body,version FROM cms_content_localizations WHERE path=?');
 const archive=sql.prepare('INSERT OR IGNORE INTO cms_content_legacy_archive(path,body,version,sha256) VALUES (?,?,?,?)');
 const putEntity=sql.prepare(`INSERT INTO cms_content_entities(site_id,kind,entity_id,position,revision,body,content_hash) VALUES (?,?,?,?,1,?,?)
 ON CONFLICT(site_id,kind,entity_id) DO UPDATE SET position=excluded.position,body=excluded.body,content_hash=excluded.content_hash,
 revision=cms_content_entities.revision+CASE WHEN cms_content_entities.body<>excluded.body OR cms_content_entities.position<>excluded.position THEN 1 ELSE 0 END`);
 const putReference=sql.prepare('INSERT OR IGNORE INTO cms_content_references VALUES (?,?,?,?,?)');
 const putJob=sql.prepare(`INSERT INTO cms_content_jobs(job_key,generation,state,updated_at) VALUES (?,1,'PENDING',?)
 ON CONFLICT(job_key) DO UPDATE SET generation=generation+1,state='PENDING',payload=NULL,source_hash=NULL,error_code=NULL,updated_at=excluded.updated_at,lease_until=0`);
 function invalidate(){putJob.run('readiness',new Date().toISOString());}
 function references(kind,entityId,value){
  sql.prepare('DELETE FROM cms_content_references WHERE site_id=? AND owner_kind=? AND owner_id=?').run(SITE,kind,entityId);
  function walk(v){if(!v||typeof v!=='object')return;if(typeof v.assetId==='string')putReference.run(SITE,kind,entityId,'media',v.assetId);if(Array.isArray(v.serviceIds))for(const target of v.serviceIds)putReference.run(SITE,kind,entityId,'service',target);for(const child of Object.values(v))walk(child);}
  walk(value);
 }
 function writeSite(stored,{version}={}){
  if(typeof stored.contentJson!=='string')throw Error('Content JSON required');
  const content=JSON.parse(stored.contentJson),entities=splitContent(content),previous=head.get(SITE),metadata={...stored,contentJson:null};
  sql.prepare(`INSERT INTO cms_content_sites VALUES (?,?,?,?) ON CONFLICT(site_id) DO UPDATE SET head_json=excluded.head_json,content_keys=excluded.content_keys,version=excluded.version`).run(SITE,json(metadata),json(Object.keys(content)),version??((previous?.version??0)+1));
  const retained=new Set(entities.map(e=>e.kind+'/'+e.entityId));
  for(const old of rows.all(SITE))if(!retained.has(old.kind+'/'+old.entity_id)){
   sql.prepare('DELETE FROM cms_content_entities WHERE site_id=? AND kind=? AND entity_id=?').run(SITE,old.kind,old.entity_id);
   sql.prepare('DELETE FROM cms_content_references WHERE site_id=? AND owner_kind=? AND owner_id=?').run(SITE,old.kind,old.entity_id);
  }
  for(const e of entities){const old=one.get(SITE,e.kind,e.entityId);if(old?.body===e.body&&old.position===e.position)continue;putEntity.run(SITE,e.kind,e.entityId,e.position,e.body,hash(e.body));references(e.kind,e.entityId,JSON.parse(e.body));}
  invalidate();
 }
 function assemble(){
  const h=head.get(SITE);if(!h)return undefined;
  const entities=rows.all(SITE),value=(kind,entityId)=>{const r=entities.find(e=>e.kind===kind&&e.entity_id===entityId);if(!r||hash(r.body)!==r.content_hash)throw Error('Content integrity mismatch');return JSON.parse(r.body);};
  const list=kind=>entities.filter(e=>e.kind===kind).map(e=>value(kind,e.entity_id));
  const structure=value('structure','site'),settings=value('settings','site');settings.clientLogos=list('client');
  const data={...structure,hero:value('hero','home'),seo:value('seo','site'),settings,sections:list('section'),projects:list('project'),services:list('service')};
  const content=Object.fromEntries(JSON.parse(h.content_keys).map(key=>[key,data[key]])),stored=JSON.parse(h.head_json);stored.contentJson=json(content);
  return {path:'cmsDrafts/home-v3',body:json(stored),version:h.version};
 }
 function nativePath(documentPath){const [collection,entityId,...tail]=documentPath.split('/');return tail.length===0&&(documentPath==='cmsDrafts/home-v3'||LOCALIZED.has(collection)&&id(entityId));}
 function document(documentPath){return documentPath==='cmsDrafts/home-v3'?assemble():LOCALIZED.has(documentPath.split('/')[0])?localized.get(documentPath):undefined;}
 function writeDocument(documentPath,body,{version}={}){
  const value=JSON.parse(body);
  if(documentPath==='cmsDrafts/home-v3'){writeSite(value,{version});return;}
  const [collection,entityId]=documentPath.split('/');if(!LOCALIZED.has(collection)||!id(entityId))throw Error('Not a content document');
  sql.prepare(`INSERT INTO cms_content_localizations VALUES (?,?,?,?,?) ON CONFLICT(path) DO UPDATE SET body=excluded.body,version=excluded.version`).run(documentPath,collection,entityId,body,version??((localized.get(documentPath)?.version??0)+1));invalidate();
 }
 function migrate(){
  return sql.transaction(()=>{
   const source=sql.prepare('SELECT path,body,version FROM cms_documents ORDER BY path').all().filter(row=>nativePath(row.path));
   let migrated=0;
   for(const row of source){
    if(document(row.path))throw Error('Two current content sources');
    archive.run(row.path,row.body,row.version,hash(row.body));writeDocument(row.path,row.body,{version:row.version});
    const roundTrip=document(row.path);if(!roundTrip||json(JSON.parse(roundTrip.body))!==json(JSON.parse(row.body)))throw Error('Content migration round-trip mismatch');
    sql.prepare('DELETE FROM cms_documents WHERE path=? AND version=?').run(row.path,row.version);migrated++;
   }
   return {migrated,entities:sql.prepare('SELECT count(*) AS n FROM cms_content_entities').get().n,localizations:sql.prepare('SELECT count(*) AS n FROM cms_content_localizations').get().n};
  }).immediate();
 }
 function readEntity(kind,entityId){const row=one.get(SITE,kind,entityId);if(!row)return null;if(hash(row.body)!==row.content_hash)throw Error('Content integrity mismatch');return {kind,id:entityId,revision:row.revision,value:JSON.parse(row.body)};}
 function listEntities(kind){return byKind.all(SITE,kind).map(row=>{if(hash(row.body)!==row.content_hash)throw Error('Content integrity mismatch');return {kind,id:row.entity_id,revision:row.revision,value:JSON.parse(row.body)};});}
 function removeDocument(documentPath){if(documentPath==='cmsDrafts/home-v3')throw Error('Site deletion is not supported');sql.prepare('DELETE FROM cms_content_localizations WHERE path=?').run(documentPath);invalidate();}
 function sourcePins(){return hash(json({code:CONTENT_CODE_VERSION,site:head.get(SITE),entities:sql.prepare('SELECT kind,entity_id,revision,content_hash FROM cms_content_entities ORDER BY kind,entity_id').all(),localizations:sql.prepare('SELECT path,version FROM cms_content_localizations ORDER BY path').all(),collections:sql.prepare("SELECT path,version FROM cms_collection_versions WHERE path IN ('cmsMediaVersions','cmsMediaProcessingEvidence','cmsMediaJobMappings','cmsMediaUploads','cmsMediaJobs','cmsMediaMetadata','cmsLocalizedApprovals','cmsLocalizedSnapshots','cmsLocalizedReviewStates','cmsLocalizedReviews','cmsLocalizedSourceChecks','cmsLocalizedHeroBases','cmsSiteV3Imports','cmsAudit') ORDER BY path").all()}));}
 return {migrate,document,nativePath,writeDocument,removeDocument,assemble,readEntity,listEntities,sourcePins,invalidate,head:()=>head.get(SITE),sql};
}
