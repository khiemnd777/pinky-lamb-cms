import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import {installContentSchema,openContentRepository} from '../cms-api/content-repository.mjs';
import {openLocalDataStore} from '../cms-api/local-data-store.mjs';

const content=()=>({schemaVersion:3,locale:'vi-VN',hero:{image:{assetId:'image-a'}},seo:{title:'SEO'},sectionOrder:['work'],sections:[{sectionId:'work',heading:'Work'}],settings:{brand:{name:'Pinky'},clientLogos:[{id:'sony',image:{assetId:'logo-a'}}]},projects:[{id:'p1',title:'Original',cover:{assetId:'image-a'},serviceIds:['s1']}],services:[{id:'s1',title:'Service'}],claimSources:[]});
const stored=()=>({draftId:'home-v3',revision:27,contentJson:JSON.stringify(content()),lastEventId:'event-27'});
function fixture(){const sql=new Database(':memory:');sql.exec('CREATE TABLE cms_documents(path TEXT PRIMARY KEY,collection_path TEXT,body TEXT,version INTEGER);CREATE TABLE cms_collection_versions(path TEXT PRIMARY KEY,version INTEGER);');installContentSchema(sql);return {sql,repository:openContentRepository(sql)};}

test('migration has one current source, preserves original bytes, round trips and is idempotent',()=>{
 const {sql,repository:r}=fixture(),body=JSON.stringify(stored()),localized=JSON.stringify({revision:3,content:{title:'Hello'}});
 sql.prepare('INSERT INTO cms_documents VALUES (?,?,?,?)').run('cmsDrafts/home-v3','cmsDrafts',body,9);
 sql.prepare('INSERT INTO cms_documents VALUES (?,?,?,?)').run('cmsLocalizedProjectDrafts/home-v3--p1--en','cmsLocalizedProjectDrafts',localized,4);
 const first=r.migrate();assert.equal(first.migrated,2);assert.equal(first.localizations,1);
 assert.equal(sql.prepare('SELECT count(*) AS n FROM cms_documents').get().n,0);
 assert.equal(r.assemble().body,body);assert.equal(r.assemble().version,9);
 assert.equal(sql.prepare('SELECT body FROM cms_content_legacy_archive WHERE path=?').get('cmsDrafts/home-v3').body,body);
 assert.equal(r.document('cmsLocalizedProjectDrafts/home-v3--p1--en').body,localized);
 assert.equal(r.migrate().migrated,0);sql.close();
});

test('only changed entities advance revision and media dependencies are indexed',()=>{
 const {sql,repository:r}=fixture();r.writeDocument('cmsDrafts/home-v3',JSON.stringify(stored()));
 assert.equal(r.readEntity('project','p1').revision,1);assert.equal(r.readEntity('service','s1').revision,1);
 const next=stored(),value=JSON.parse(next.contentJson);value.projects[0].title='Changed';next.revision++;next.contentJson=JSON.stringify(value);r.writeDocument('cmsDrafts/home-v3',JSON.stringify(next));
 assert.equal(r.readEntity('project','p1').revision,2);assert.equal(r.readEntity('service','s1').revision,1);
 assert.ok(sql.prepare("SELECT 1 FROM cms_content_references WHERE owner_kind='project' AND owner_id='p1' AND target_kind='media' AND target_id='image-a'").get());
 const job=sql.prepare("SELECT * FROM cms_content_jobs WHERE job_key='readiness'").get();assert.equal(job.state,'PENDING');assert.equal(job.generation,2);sql.close();
});

test('failed conversion rolls back source removal and every normalized write',()=>{
 const {sql,repository:r}=fixture(),bad=stored();bad.contentJson=JSON.stringify({...content(),unexpected:true});
 sql.prepare('INSERT INTO cms_documents VALUES (?,?,?,?)').run('cmsDrafts/home-v3','cmsDrafts',JSON.stringify(bad),1);
 assert.throws(()=>r.migrate(),/Unknown content field/);assert.equal(sql.prepare('SELECT count(*) AS n FROM cms_documents').get().n,1);assert.equal(sql.prepare('SELECT count(*) AS n FROM cms_content_sites').get().n,0);assert.equal(sql.prepare('SELECT count(*) AS n FROM cms_content_legacy_archive').get().n,0);sql.close();
});

test('native content detects body corruption before assembly',()=>{
 const {sql,repository:r}=fixture();r.writeDocument('cmsDrafts/home-v3',JSON.stringify(stored()));
 sql.prepare("UPDATE cms_content_entities SET body=? WHERE kind='project'").run('{"id":"p1","title":"tampered"}');
 assert.throws(()=>r.assemble(),/integrity mismatch/);assert.throws(()=>r.readEntity('project','p1'),/integrity mismatch/);sql.close();
});

test('real store routes legacy contracts to native entities and CAS retries preserve concurrent work',async()=>{
 const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'pinky-content-test-')));fs.chmodSync(root,0o700);const db=openLocalDataStore(root,{create:true});
 try{
  const ref=db.collection('cmsDrafts').doc('home-v3');await ref.create(stored());
  assert.equal(db.sqlite.prepare("SELECT count(*) AS n FROM cms_documents WHERE path='cmsDrafts/home-v3'").get().n,0);
  assert.deepEqual((await ref.get()).data(),stored());assert.equal((await db.collection('cmsDrafts').get()).size,1);
  let attempts=0;await db.runTransaction(async tx=>{attempts++;const snap=await tx.get(ref),value=snap.data();if(attempts===1)await ref.set({...value,revision:28,lastEventId:'other-write'});tx.set(ref,{...value,revision:value.revision+1});});
  assert.equal(attempts,2);assert.equal((await ref.get()).data().revision,29);assert.equal((await ref.get()).data().lastEventId,'other-write');
 }finally{db.close();fs.rmSync(root,{recursive:true,force:true});}
});

test('complete migration verification preserves unrelated tables and is replay safe',async()=>{
 const {migrateContentDatabase}=await import('../cms-api/content-migration.mjs'),{sql}=fixture();sql.exec('CREATE TABLE retained_auth(id TEXT PRIMARY KEY, value TEXT); INSERT INTO retained_auth VALUES (\'synthetic-user\',\'synthetic-credential-fixture\');');
 const body=JSON.stringify(stored());sql.prepare('INSERT INTO cms_documents VALUES (?,?,?,?)').run('cmsDrafts/home-v3','cmsDrafts',body,9);
 const first=migrateContentDatabase({sqlite:sql}),second=migrateContentDatabase({sqlite:sql});assert.equal(first.migrated,1);assert.equal(second.migrated,0);assert.equal(first.sourceSha256,second.sourceSha256);assert.equal(sql.prepare('SELECT value FROM retained_auth').get().value,'synthetic-credential-fixture');sql.close();
});
