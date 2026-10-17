import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const PROJECT='demo-pinky-lamb-cms';
const IDENTIFIER=/^[A-Za-z0-9_-]{1,256}$/;
const FIELD=/^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/;
const MAX_DOCUMENT_BYTES=4*1024*1024;
const MAX_QUERY_LIMIT=1000;

function requireIdentifier(value){
 if(typeof value!=='string'||!IDENTIFIER.test(value))throw Error('Invalid document identifier');
 return value;
}
function requireCollectionPath(value){
 const parts=value.split('/');
 if(parts.length%2!==1||parts.some(part=>!IDENTIFIER.test(part)))throw Error('Invalid collection path');
 return value;
}
function requireDocumentPath(value){
 const parts=value.split('/');
 if(parts.length%2!==0||parts.some(part=>!IDENTIFIER.test(part)))throw Error('Invalid document path');
 return value;
}
function copyDocument(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid document value');
 const seen=new Set();
 function validate(part){
  if(part===null||typeof part==='string'||typeof part==='boolean')return;
  if(typeof part==='number'&&Number.isFinite(part))return;
  if(typeof part!=='object'||seen.has(part)||!(Array.isArray(part)||Object.getPrototypeOf(part)===Object.prototype||Object.getPrototypeOf(part)===null))throw Error('Unsupported document value');
  seen.add(part);
  for(const [key,item] of Object.entries(part)){if(key==='__proto__'||key==='constructor'||key==='prototype')throw Error('Unsafe document key');validate(item);}
  seen.delete(part);
 }
 validate(value);
 const bytes=JSON.stringify(value);
 if(typeof bytes!=='string'||Buffer.byteLength(bytes)>MAX_DOCUMENT_BYTES)throw Error('Document too large');
 const parsed=JSON.parse(bytes);
 if(JSON.stringify(parsed)!==bytes)throw Error('Unsupported document value');
 return {body:bytes,data:parsed};
}
function snapshot(reference,row){
 const value=row?JSON.parse(row.body):undefined;
 return Object.freeze({id:reference.id,ref:reference,exists:Boolean(row),data:()=>value===undefined?undefined:structuredClone(value),get:field=>value===undefined?undefined:field.split('.').reduce((part,key)=>part?.[key],value)});
}
function collectionSnapshot(query,rows){
 const docs=rows.map(row=>snapshot(new DocumentReference(query.store,row.path),row));
 return Object.freeze({docs,size:docs.length,empty:docs.length===0,forEach:fn=>docs.forEach(fn)});
}
function sqlField(field){
 if(field==='__name__')return 'substr(path, length(collection_path) + 2)';
 if(typeof field!=='string'||!FIELD.test(field))throw Error('Unsupported query field');
 return `json_extract(body, '$.${field}')`;
}
function queryValue(value){
 if(value===null||['string','number'].includes(typeof value))return value;
 if(typeof value==='boolean')return value?1:0;
 throw Error('Unsupported query value');
}
function querySql(query){
 const clauses=['collection_path = ?'];
 const binds=[query.path];
 for(const {field,operator,value} of query.filters){
  if(!['==','!=','<','<=','>','>='].includes(operator))throw Error('Unsupported query operator');
  if(value===null&&!['==','!='].includes(operator))throw Error('Unsupported null query operator');
  const column=sqlField(field);
  clauses.push(value===null?`${column} ${operator==='!='?'IS NOT':'IS'} NULL`:`${column} ${operator==='=='?'=':operator} ?`);
  if(value!==null)binds.push(queryValue(value));
 }
 const sorts=query.sorts.length?query.sorts:[{field:'__name__',direction:'asc'}];
 for(const sort of sorts){if(sort.field!=='__name__')clauses.push(`${sqlField(sort.field)} IS NOT NULL`);}
 if(query.cursor){
  if(query.cursor.length!==sorts.length)throw Error('Invalid cursor');
  const branches=[];
  for(let index=0;index<sorts.length;index++){
   const prefix=[];
   for(let prior=0;prior<index;prior++){
    prefix.push(`${sqlField(sorts[prior].field)} = ?`);
    binds.push(queryValue(query.cursor[prior]));
   }
   prefix.push(`${sqlField(sorts[index].field)} ${sorts[index].direction==='desc'?'<':'>'} ?`);
   binds.push(queryValue(query.cursor[index]));
   branches.push(`(${prefix.join(' AND ')})`);
  }
  clauses.push(`(${branches.join(' OR ')})`);
 }
 const order=sorts.map(sort=>`${sqlField(sort.field)} ${sort.direction.toUpperCase()}`).join(', ');
 const sql=`SELECT path, body, version FROM cms_documents WHERE ${clauses.join(' AND ')} ORDER BY ${order} LIMIT ?`;
 binds.push(query.max);
 return {sql,binds};
}

class Query {
 constructor(store,path,filters=[],sorts=[],max=MAX_QUERY_LIMIT,cursor=null){
  this.store=store;this.path=requireCollectionPath(path);this.filters=filters;this.sorts=sorts;this.max=max;this.cursor=cursor;
 }
 with(changes){return new Query(this.store,this.path,changes.filters??this.filters,changes.sorts??this.sorts,changes.max??this.max,changes.cursor??this.cursor);}
 where(field,operator,value){sqlField(field);return this.with({filters:[...this.filters,{field,operator,value}]});}
 orderBy(field,direction='asc'){
  if(typeof field!=='string'&&field?.toString?.()==='__name__')field='__name__';
  sqlField(field);if(!['asc','desc'].includes(direction))throw Error('Invalid sort direction');
  return this.with({sorts:[...this.sorts,{field,direction}]});
 }
 limit(max){if(!Number.isSafeInteger(max)||max<1||max>MAX_QUERY_LIMIT)throw Error('Invalid query limit');return this.with({max});}
 startAfter(...cursor){return this.with({cursor});}
 doc(id){return new DocumentReference(this.store,`${this.path}/${requireIdentifier(id)}`);}
 async get(){return this.store.readQuery(this);}
}

class DocumentReference {
 constructor(store,documentPath){this.store=store;this.path=requireDocumentPath(documentPath);this.id=documentPath.split('/').at(-1);}
 collection(name){return new Query(this.store,`${this.path}/${requireIdentifier(name)}`);}
 async get(){return this.store.readDocument(this);}
 async create(value){return this.store.runTransaction(tx=>tx.create(this,value));}
 async set(value){return this.store.runTransaction(tx=>tx.set(this,value));}
 async update(value){return this.store.runTransaction(tx=>tx.update(this,value));}
 async delete(){return this.store.runTransaction(tx=>tx.delete(this));}
}

class Transaction {
 constructor(store){this.store=store;this.reads=new Map();this.queryReads=new Map();this.writes=[];this.validators=[];}
 validate(predicate){if(typeof predicate!=='function')throw Error('Invalid transaction validator');this.validators.push(predicate);}
 async get(reference){
  if(reference instanceof Query){
   const version=this.store.collectionVersion(reference.path);
   const result=this.store.readQuery(reference);
   this.queryReads.set(reference.path,version);
   for(const doc of result.docs)this.reads.set(doc.ref.path,this.store.documentVersion(doc.ref.path));
   return result;
  }
  if(!(reference instanceof DocumentReference))throw Error('Unsupported transaction read');
  const row=this.store.row(reference.path);
  this.reads.set(reference.path,row?.version??null);
  return snapshot(reference,row);
 }
 write(kind,reference,value){
  if(!(reference instanceof DocumentReference))throw Error('Unsupported transaction write');
  this.writes.push({kind,path:reference.path,...(value===undefined?{}:{body:copyDocument(value).body})});
  return this;
 }
 create(reference,value){return this.write('create',reference,value);}
 set(reference,value){return this.write('set',reference,value);}
 update(reference,value){return this.write('update',reference,value);}
 delete(reference){return this.write('delete',reference);}
}

export function openLocalDataStore(root,{create=false}={}){
 const absolute=path.resolve(root);
 if(!path.isAbsolute(root)||fs.existsSync(absolute)&&fs.realpathSync(absolute)!==absolute)throw Error('Invalid local data root');
 if(create&&!fs.existsSync(absolute))fs.mkdirSync(absolute,{recursive:true,mode:0o700});
 const stat=fs.lstatSync(absolute);
 if(!stat.isDirectory()||stat.isSymbolicLink()||stat.uid!==process.getuid()||(stat.mode&0o077)!==0)throw Error('Insecure local data root');
 const file=path.join(absolute,'cms.sqlite');
 if(!create&&!fs.existsSync(file))throw Error('Local CMS database is missing');
 if(fs.existsSync(file)){
  const existing=fs.lstatSync(file);
  if(!existing.isFile()||existing.isSymbolicLink()||existing.nlink!==1||(existing.mode&0o077)!==0)throw Error('Insecure local CMS database');
 }
 const sql=new Database(file,{fileMustExist:!create,timeout:5000});
 if(create)fs.chmodSync(file,0o600);
 sql.pragma('journal_mode = WAL');sql.pragma('synchronous = FULL');sql.pragma('fullfsync = ON');sql.pragma('foreign_keys = ON');
 if(sql.pragma('journal_mode',{simple:true})!=='wal'||sql.pragma('synchronous',{simple:true})!==2||sql.pragma('fullfsync',{simple:true})!==1)throw Error('SQLite durability unavailable');
 if(create){
  sql.exec(`CREATE TABLE IF NOT EXISTS cms_documents(path TEXT PRIMARY KEY, collection_path TEXT NOT NULL, body TEXT NOT NULL CHECK(json_valid(body)), version INTEGER NOT NULL CHECK(version > 0));
CREATE INDEX IF NOT EXISTS cms_documents_collection ON cms_documents(collection_path,path);
CREATE TABLE IF NOT EXISTS cms_collection_versions(path TEXT PRIMARY KEY, version INTEGER NOT NULL CHECK(version > 0));
CREATE TABLE IF NOT EXISTS cms_objects(object_key TEXT PRIMARY KEY, generation INTEGER NOT NULL UNIQUE, sha256 TEXT NOT NULL, size_bytes INTEGER NOT NULL CHECK(size_bytes > 0), mime_type TEXT NOT NULL, source_metadata TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(source_metadata)));
CREATE TABLE IF NOT EXISTS cms_object_generations(generation INTEGER PRIMARY KEY AUTOINCREMENT);
CREATE TABLE IF NOT EXISTS cms_schema_version(version INTEGER NOT NULL CHECK(version = 1));`);
  if(sql.prepare('SELECT count(*) AS n FROM cms_schema_version').get().n===0)sql.prepare('INSERT INTO cms_schema_version(version) VALUES (1)').run();
 }
 if(sql.prepare('SELECT version FROM cms_schema_version').get()?.version!==1)throw Error('Unsupported local CMS schema');
 const row=sql.prepare('SELECT path,body,version FROM cms_documents WHERE path = ?');
 const version=sql.prepare('SELECT version FROM cms_collection_versions WHERE path = ?');
 const insert=sql.prepare('INSERT INTO cms_documents(path,collection_path,body,version) VALUES (?,?,?,1)');
 const replace=sql.prepare('UPDATE cms_documents SET body=?, version=version+1 WHERE path=?');
 const remove=sql.prepare('DELETE FROM cms_documents WHERE path=?');
 const bump=sql.prepare('INSERT INTO cms_collection_versions(path,version) VALUES (?,1) ON CONFLICT(path) DO UPDATE SET version=version+1');
 const store={projectId:PROJECT,sqlite:sql,
  collection(name){return new Query(store,requireIdentifier(name));},
  row:documentPath=>row.get(documentPath),
  documentVersion:documentPath=>row.get(documentPath)?.version??null,
  collectionVersion:collectionPath=>version.get(collectionPath)?.version??null,
  readDocument(reference){return snapshot(reference,row.get(reference.path));},
  readQuery(query){const {sql:statement,binds}=querySql(query);return collectionSnapshot(query,sql.prepare(statement).all(...binds));},
  async runTransaction(callback,{maxAttempts=5}={}){
   for(let attempt=0;attempt<maxAttempts;attempt++){
    const transaction=new Transaction(store);
    const result=await callback(transaction);
    const commit=sql.transaction(()=>{
     for(const [documentPath,expected] of transaction.reads)if((row.get(documentPath)?.version??null)!==expected)return false;
     for(const [collectionPath,expected] of transaction.queryReads)if((version.get(collectionPath)?.version??null)!==expected)return false;
     for(const predicate of transaction.validators)if(predicate()!==true)return false;
     for(const write of transaction.writes){
      const collectionPath=write.path.slice(0,write.path.lastIndexOf('/'));
      const present=Boolean(row.get(write.path));
      if(write.kind==='create'){
       if(present)throw Error('Document already exists');
       insert.run(write.path,collectionPath,write.body);
      }else if(write.kind==='set'){
       if(present)replace.run(write.body,write.path);else insert.run(write.path,collectionPath,write.body);
      }else if(write.kind==='update'){
       if(!present)throw Error('Document does not exist');
       const merged={...JSON.parse(row.get(write.path).body),...JSON.parse(write.body)};
       replace.run(copyDocument(merged).body,write.path);
      }else if(write.kind==='delete'){
       if(present)remove.run(write.path);
      }
      if(present||write.kind!=='delete')bump.run(collectionPath);
     }
     return true;
    });
    if(commit.immediate())return result;
   }
   throw Error('Local transaction conflict');
  },
  close(){sql.close();}
 };
 return store;
}
