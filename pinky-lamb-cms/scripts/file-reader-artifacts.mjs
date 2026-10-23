import {X,ChevronLeft,ChevronRight,ZoomOut,ZoomIn,MoveHorizontal,Download,RotateCw,FileText} from 'lucide';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
/** Version this closed runtime graph from leaves to entry. Retained website
 * documents must keep their matching PDF engine/worker after another release. */
export function fileReaderArtifacts(){
 const read=name=>readFileSync(new URL('../'+name,import.meta.url)),files=[];
 function add(path,input){const bytes=Buffer.isBuffer(input)?input:Buffer.from(input),mimeType=path.endsWith('.txt')?'text/plain':'text/javascript',hash=createHash('sha256').update(bytes).digest('hex'),cachePath='assets/cache/'+hash+(path.endsWith('.txt')?'.txt':'.mjs');files.push({path,bytes,mimeType,cachePath},{path:cachePath,bytes,mimeType});return '/'+cachePath;}
 const fflate=add('assets/fflate.mjs',read('node_modules/fflate/esm/browser.js'));
 const detection=add('assets/file-detection.mjs',read('contracts/file-detection.mjs').toString().replace("from 'fflate'",`from '${fflate}'`));
 const pdf=add('assets/pdf.mjs',read('node_modules/pdfjs-dist/build/pdf.mjs'));
 const worker=add('assets/pdf.worker.mjs',read('node_modules/pdfjs-dist/build/pdf.worker.mjs'));
 const workerUrl=add('assets/pdf-worker-url.mjs',`export const defaultWorkerUrl=${JSON.stringify(worker)};\n`);
 const icons=add('assets/reader-icons.mjs','export const '+Object.entries({X,ChevronLeft,ChevronRight,ZoomOut,ZoomIn,MoveHorizontal,Download,RotateCw,FileText}).map(([name,nodes])=>name+'='+JSON.stringify(nodes)).join(',')+';\n');
 const reader=add('assets/pinky-reader.mjs',read('reader/pinky-reader.mjs').toString().replace("from 'lucide'",`from '${icons}'`).replace('../contracts/file-detection.mjs',detection).replace('./pdf-worker-url.mjs',workerUrl).replace('./pdf.mjs',pdf));
 add('assets/pinky-files.mjs',read('reader/pinky-files.mjs').toString().replace('./pinky-reader.mjs',reader));
 add('assets/PDFJS-LICENSE.txt',read('node_modules/pdfjs-dist/LICENSE'));
 add('assets/LUCIDE-LICENSE.txt',read('node_modules/lucide/LICENSE'));
 add('assets/FFLATE-LICENSE.txt',read('node_modules/fflate/LICENSE'));
 return [...new Map(files.map(file=>[file.path,file])).values()];
}
