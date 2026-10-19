import {createHash} from 'node:crypto';
import {installContentSchema,openContentRepository} from './content-repository.mjs';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const sort=rows=>[...rows].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
/** The caller owns backup and quiescence. Conversion is one SQLite transaction;
 * every original logical document and every unrelated table must still match. */
export function migrateContentDatabase(db){
 const sql=db.sqlite,existing=openContentRepository(sql),source=sql.prepare('SELECT path,body,version FROM '+(existing?'cms_current_documents':'cms_documents')+' ORDER BY path').all();if(existing?.head())source.push(existing.assemble());
 const unchanged=new Map(),names=sql.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'cms_content_%' AND name NOT IN ('cms_documents','cms_media_verified','cms_readiness_resources') ORDER BY name").all().map(r=>r.name);
 for(const name of names){if(!/^[A-Za-z0-9_]+$/.test(name))throw Error('Unexpected table');unchanged.set(name,hash(sql.prepare('SELECT * FROM "'+name+'"').all()));}
 return sql.transaction(()=>{
  installContentSchema(sql);const repo=openContentRepository(sql),result=repo.migrate(),logical=sql.prepare('SELECT path,body,version FROM cms_current_documents ORDER BY path').all();if(repo.head())logical.push(repo.assemble());
  if(hash(sort(logical))!==hash(sort(source)))throw Error('Logical source changed during migration');
  for(const [name,digest]of unchanged)if(hash(sql.prepare('SELECT * FROM "'+name+'"').all())!==digest)throw Error('Unrelated data changed: '+name);
  if(sql.pragma('integrity_check',{simple:true})!=='ok')throw Error('Database integrity failed');
  return {...result,logicalDocuments:source.length,sourceSha256:hash(sort(source)),preservedTables:names.length,integrity:'ok'};
 }).immediate();
}
