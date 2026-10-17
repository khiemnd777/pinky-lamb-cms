import {lstat,readdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {readRegularFile,verifyMediaTools,verifyPinnedFiles} from '../scripts/media-tool-audit.mjs';
import {PDF_LOCAL_RUNTIME_PIN,PDF_LOCAL_PROGRAM} from '../contracts/media-pdf-local-profile-v5.mjs';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sha=b=>createHash('sha256').update(b).digest('hex');
const demand=v=>{if(!v)throw Object.assign(new Error('PDF_LOCAL_RUNTIME_CHANGED'),{code:'PDF_LOCAL_RUNTIME_CHANGED'});};
/** Fixed server-owned profile. Old R0 inventories remain immutable historical authority. */
export async function verifyLocalPdfRuntime(){
 await verifyMediaTools('IMAGE'); // Same pinned Node, Sharp, pdf-lib and exact package closure.
 const bytes=await readRegularFile(resolve(ROOT,PDF_LOCAL_RUNTIME_PIN.path),PDF_LOCAL_RUNTIME_PIN.bytes);
 demand(bytes.length===PDF_LOCAL_RUNTIME_PIN.bytes&&sha(bytes)===PDF_LOCAL_RUNTIME_PIN.sha256);
 const lock=JSON.parse(bytes),base=resolve(ROOT,lock.runtimeRoot),allowed=new Set(lock.files.map(f=>resolve(ROOT,f.path))),dirs=new Set([base]);
 for(const file of allowed){let dir=dirname(file);while(dir.startsWith(base)){dirs.add(dir);if(dir===base)break;dir=dirname(dir);}}
 await verifyPinnedFiles(ROOT,lock.files);
 async function walk(path){const st=await lstat(path);demand(st.uid===process.getuid()&&!st.isSymbolicLink());if(st.isDirectory()){demand(dirs.has(path)&&(st.mode&0o777)===0o500);for(const name of await readdir(path))await walk(resolve(path,name));}else{const pin=lock.files.find(f=>resolve(ROOT,f.path)===path);demand(allowed.has(path)&&st.isFile()&&st.nlink===1&&(st.mode&0o777)===pin.mode);}}
 await walk(base);
 for(const [path,pin]of [['cms-api/media-pdf.mjs',PDF_LOCAL_PROGRAM.processorSha256],['cms-api/media-pdf-runtime.mjs',PDF_LOCAL_PROGRAM.runtimeSha256],['cms-api/pdf-local-runtime.mjs',PDF_LOCAL_PROGRAM.helperSha256]])demand(sha(await readRegularFile(resolve(ROOT,path),1048576))===pin);
 return {lockBytes:bytes,lock};
}
