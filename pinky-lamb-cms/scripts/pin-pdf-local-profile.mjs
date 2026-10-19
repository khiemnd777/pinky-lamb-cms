// Setup-only pin generation. This does not start a decoder or modify CMS data.
import {readFileSync,writeFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {canonicalMediaV2Json} from '../contracts/media-v3-contract-v2.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex'),read=p=>readFileSync(p),hash=v=>sha(canonicalMediaV2Json(v));
const source=read('contracts/media-v3-toolset-v2.mjs').toString(),prefix=/staticR0PackedPrefix='([^']+)'/.exec(read('contracts/media-processing-r0-static-v2.mjs').toString())[1],tail=/const packedTail='([^']+)'/.exec(source)[1],fixed=JSON.parse(inflateSync(Buffer.from(prefix+tail,'base64')));
const path='contracts/media-pdf-local-runtime-v1.json',bytes=read(path),lock=JSON.parse(bytes),pin={path,bytes:bytes.length,sha256:sha(bytes)};
const manifest={schemaVersion:1,kind:'PDF',profileId:'M3-PDF-LOCAL-5',runtimeManifest:pin,commonSha256:hash(fixed.common)};
const program=structuredClone(fixed.programs.PDF);program.processorSha256=sha(read('cms-api/media-pdf.mjs'));program.runtimeSha256=sha(read('cms-api/media-pdf-runtime.mjs'));program.helperSha256=sha(read('cms-api/pdf-local-runtime.mjs'));program.toolSetSha256=hash(manifest);program.recipe={...program.recipe,limits:{...program.recipe.limits,edge:1280,webpBytes:64*1024**2},render:program.recipe.render.map(v=>v==='1600'?'1280':v),lockSha256:pin.sha256,runtimeSha256:program.runtimeSha256,processorSha256:program.processorSha256,tools:lock.poppler.binaryPins};
writeFileSync('contracts/media-pdf-local-profile-v5.mjs','// Approved P7 v3 repository-owned PDF profile. Preserve the historical R0 profile.\n'+Object.entries({PDF_LOCAL_RUNTIME_PIN:pin,PDF_LOCAL_MANIFEST:manifest,PDF_LOCAL_PROGRAM:program}).map(([name,value])=>'export const '+name+'=Object.freeze('+JSON.stringify(value)+');').join('\n')+'\n',{flag:'wx'});
console.log(JSON.stringify({profileId:manifest.profileId,runtimeManifest:pin,toolSetSha256:hash(manifest),processingRecipeSha256:hash(program),processorSha256:program.processorSha256,runtimeSha256:program.runtimeSha256,helperSha256:program.helperSha256}));
