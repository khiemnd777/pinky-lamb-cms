import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import Database from 'better-sqlite3';
import {DATA_ROOT,ROOT} from './local-data-guard.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function syncDir(directory){const fd=fs.openSync(directory,'r');try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}
function privateDir(directory){
 if(!path.isAbsolute(directory)||fs.existsSync(directory)&&fs.realpathSync(directory)!==directory)throw Error('Unsafe backup path');
 const stat=fs.lstatSync(directory);if(!stat.isDirectory()||stat.isSymbolicLink()||(stat.mode&0o077)!==0)throw Error('Backup directory must be private');
}
function copyVerified(source,destination){
 const stat=fs.lstatSync(source);if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1)throw Error('Unsafe backup source');
 const bytes=fs.readFileSync(source);const fd=fs.openSync(destination,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600);
 try{fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
 return {bytes:bytes.length,sha256:sha(bytes)};
}
function objects(database){
 return database.prepare('SELECT object_key,generation,sha256,size_bytes,mime_type,source_metadata FROM cms_objects ORDER BY object_key').all();
}
function objectName(root,hash){if(!/^[a-f0-9]{64}$/.test(hash))throw Error('Invalid object digest');return path.join(root,'objects',hash.slice(0,2),hash);}
function validateBackup(root,manifest){
 privateDir(root);if(manifest.version!==1||manifest.projectId!=='demo-pinky-lamb-cms'||!Array.isArray(manifest.objects))throw Error('Invalid backup manifest');
 for(const name of ['cms.sqlite','auth.secret']){
  const target=path.join(root,name),stat=fs.lstatSync(target);if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||(stat.mode&0o077)!==0)throw Error('Unsafe backup file');
  const actual=fs.readFileSync(target);if(actual.length!==manifest.files[name]?.bytes||sha(actual)!==manifest.files[name]?.sha256)throw Error('Backup file mismatch');
 }
 const db=new Database(path.join(root,'cms.sqlite'),{readonly:true,fileMustExist:true});
 try{
  if(db.pragma('integrity_check',{simple:true})!=='ok')throw Error('Backup database integrity failed');
  const rows=objects(db);if(JSON.stringify(rows)!==JSON.stringify(manifest.objects))throw Error('Backup object index mismatch');
  for(const row of rows){const filename=objectName(root,row.sha256),stat=fs.lstatSync(filename);if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||stat.size!==row.size_bytes||sha(fs.readFileSync(filename))!==row.sha256)throw Error('Backup object mismatch');}
 }finally{db.close();}
}
export async function backupLocalData(destination,{source=DATA_ROOT}={}){
 privateDir(source);if(fs.existsSync(destination)||!path.isAbsolute(destination)||destination.startsWith(source+path.sep)||source.startsWith(destination+path.sep))throw Error('Backup destination must be new and separate');
 privateDir(path.dirname(destination));fs.mkdirSync(destination,{mode:0o700});syncDir(path.dirname(destination));
 const db=new Database(path.join(source,'cms.sqlite'),{readonly:true,fileMustExist:true});
 try{await db.backup(path.join(destination,'cms.sqlite'));}finally{db.close();}
 fs.chmodSync(path.join(destination,'cms.sqlite'),0o600);const backupDb=new Database(path.join(destination,'cms.sqlite'),{readonly:true,fileMustExist:true});
 let rows;try{rows=objects(backupDb);}finally{backupDb.close();}
 const files={'cms.sqlite':null,'auth.secret':copyVerified(path.join(source,'auth.secret'),path.join(destination,'auth.secret'))};
 for(const row of rows){const directory=path.join(destination,'objects',row.sha256.slice(0,2));fs.mkdirSync(directory,{recursive:true,mode:0o700});const target=objectName(destination,row.sha256);if(!fs.existsSync(target))copyVerified(objectName(source,row.sha256),target);if(sha(fs.readFileSync(target))!==row.sha256)throw Error('Object changed during backup');syncDir(directory);}
 if(fs.existsSync(path.join(destination,'objects')))syncDir(path.join(destination,'objects'));
 const fd=fs.openSync(path.join(destination,'cms.sqlite'),fs.constants.O_RDONLY);try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
 const sqliteBytes=fs.readFileSync(path.join(destination,'cms.sqlite'));files['cms.sqlite']={bytes:sqliteBytes.length,sha256:sha(sqliteBytes)};
 const manifest={version:1,projectId:'demo-pinky-lamb-cms',createdAt:new Date().toISOString(),files,objects:rows};
 const manifestFile=path.join(destination,'manifest.json'),out=fs.openSync(manifestFile,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL,0o600);
 try{fs.writeFileSync(out,JSON.stringify(manifest));fs.fsyncSync(out);}finally{fs.closeSync(out);}
 syncDir(destination);validateBackup(destination,manifest);return {objects:rows.length,destination};
}
export function restoreLocalData(source,destination){
 privateDir(source);const manifest=JSON.parse(fs.readFileSync(path.join(source,'manifest.json'),'utf8'));validateBackup(source,manifest);
 if(fs.existsSync(destination)||!path.isAbsolute(destination)||destination.startsWith(source+path.sep))throw Error('Restore destination must be new');
 const parent=path.dirname(destination);
 if(destination===DATA_ROOT){const stat=fs.lstatSync(ROOT);if(!stat.isDirectory()||stat.isSymbolicLink()||stat.uid!==process.getuid()||fs.realpathSync(ROOT)!==ROOT)throw Error('Unsafe CMS checkout');}
 else privateDir(parent);
 fs.mkdirSync(destination,{mode:0o700});syncDir(parent);
 for(const name of ['cms.sqlite','auth.secret','manifest.json'])copyVerified(path.join(source,name),path.join(destination,name));
 for(const row of manifest.objects){const directory=path.join(destination,'objects',row.sha256.slice(0,2));fs.mkdirSync(directory,{recursive:true,mode:0o700});const target=objectName(destination,row.sha256);if(!fs.existsSync(target))copyVerified(objectName(source,row.sha256),target);syncDir(directory);}
 if(fs.existsSync(path.join(destination,'objects')))syncDir(path.join(destination,'objects'));syncDir(destination);validateBackup(destination,manifest);return {objects:manifest.objects.length,destination};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.version!=='v22.23.3'||fs.realpathSync(process.cwd())!==ROOT||process.env.NODE_OPTIONS!==undefined)throw Error('Pinned local runtime required');
 const [mode,a,b]=process.argv.slice(2);
 try{
  if(mode==='backup'&&a&&!b)console.log(await backupLocalData(path.resolve(a)));
  else if(mode==='restore'&&a&&b)console.log(restoreLocalData(path.resolve(a),path.resolve(b)));
  else throw Error('Use backup <new-absolute-dir> or restore <backup-absolute-dir> <new-absolute-dir>');
 }catch(error){console.error(`LOCAL_DATA_BACKUP: ${error.message}`);process.exitCode=1;}
}
