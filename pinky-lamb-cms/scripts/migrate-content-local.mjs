import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DATA_ROOT,ROOT,validateLocalDataRuntime} from './local-data-guard.mjs';
import {backupLocalData} from './local-data-backup.mjs';
import {openLocalDataStore} from '../cms-api/local-data-store.mjs';
import {migrateContentDatabase} from '../cms-api/content-migration.mjs';
export async function migrateContentLocal(){
 validateLocalDataRuntime();process.umask(0o077);
 if(process.argv.length!==2)throw Error('No migration arguments accepted');
 if(fs.existsSync(path.join(DATA_ROOT,'run-instance.json')))throw Error('Stop the owned local stack before migration');
 const parent=path.join(ROOT,'.local/content-architecture-backups');fs.mkdirSync(parent,{recursive:true,mode:0o700});
 const destination=path.join(parent,new Date().toISOString().replaceAll(':','-'));
 await backupLocalData(destination);
 const db=openLocalDataStore(DATA_ROOT);
 try{console.log(JSON.stringify({migration:'CONTENT-ARCHITECTURE-001',...migrateContentDatabase(db),backup:destination}));}finally{db.close();}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await migrateContentLocal();
