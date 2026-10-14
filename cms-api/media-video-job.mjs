import {resolve} from 'node:path';
import {attemptTupleV2Schema,frozenInputV2Schema} from '../contracts/media-v3-authority-v2.mjs';
import {canonicalMediaV2Json} from '../contracts/media-v3-contract-v2.mjs';
import {strictMediaV2JsonSchema} from '../contracts/media-v3-metadata-v2.mjs';
import {validateToolSetManifest,validateProcessingProgram,validateProcessingExecution,expectedProcessingProgram} from '../contracts/media-v3-toolset-v2.mjs';
import {readRegularFile} from '../scripts/media-tool-audit.mjs';
import {VIDEO_ROOT,VIDEO_LIMITS,videoSha,videoFail,validateVideoRequest,validateVideoCandidate,checkVideoFinalization,processVideo} from './media-video.mjs';

const PROFILE='M3-VIDEO-R0-1';
const hashCanonical=value=>videoSha(Buffer.from(canonicalMediaV2Json(value),'utf8'));
const currentProgram=()=>validateProcessingProgram(expectedProcessingProgram('VIDEO'),{profileId:PROFILE,hashCanonical});

// Capture own DATA before touching values. AbortSignal is passed through only in
// the fixed processor request; tuple/frozen/tool data use canonical schemas.
function ownData(value,required,optional=[]) {
  if(!value||typeof value!=='object'||Object.getPrototypeOf(value)!==Object.prototype) videoFail('VIDEO_JOB_REQUEST');
  const keys=Reflect.ownKeys(value),allowed=[...required,...optional];
  if(keys.some(key=>typeof key!=='string'||!allowed.includes(key))||required.some(key=>!keys.includes(key))) videoFail('VIDEO_JOB_REQUEST');
  const result={};
  for(const key of keys) {
    const descriptor=Object.getOwnPropertyDescriptor(value,key);
    if(!descriptor?.enumerable||!Object.hasOwn(descriptor,'value')) videoFail('VIDEO_JOB_REQUEST');
    result[key]=descriptor.value;
  }
  return result;
}

function projectVideoJobResult(result,tuple,toolSetManifest,originalSha256,inputBytes,helperSha256) {
  const {runtime,publication,...candidate}=result;
  validateVideoCandidate(candidate,originalSha256,inputBytes);
  if(runtime?.reaped!==true||runtime.close!==true||runtime.exit!==0||runtime.controlError||!Array.isArray(runtime.remainingPids)||runtime.remainingPids.length) videoFail('VIDEO_PROCESS_CONTROL');
  if(publication?.committed!==true||publication.singleLink!==true||!Array.isArray(publication.housekeeping)) videoFail('VIDEO_PUBLICATION_UNKNOWN');
  const originalMetadata={...candidate.original.metadata};
  const toolSetSha256=hashCanonical(toolSetManifest);
  // Queued identity binds the input-independent PROGRAM. Expanded execution
  // separately binds actual metadata/argv and is validated only after claim.
  const processingRecipe=currentProgram();
  if(helperSha256!==processingRecipe.helperSha256||candidate.recipe.processorSha256!==processingRecipe.processorSha256||candidate.recipe.runtimeSha256!==processingRecipe.runtimeSha256) videoFail('VIDEO_JOB_SOURCE_BINDING');
  if(toolSetSha256!==processingRecipe.toolSetSha256) videoFail('VIDEO_JOB_TOOLSET_BINDING');
  const executionRecipe=candidate.recipe;
  validateProcessingExecution(processingRecipe,executionRecipe,originalMetadata,hashCanonical);
  const processingRecipeSha256=hashCanonical(processingRecipe);
  const executionRecipeSha256=hashCanonical(executionRecipe);
  return {
    contractRevision:2,private:true,ready:false,tuple,
    original:{sizeBytes:candidate.original.bytes,sha256:candidate.original.sha256},originalMetadata,
    toolSetSha256,processingRecipe,processingRecipeSha256,executionRecipe,executionRecipeSha256,
    outputs:[
      {key:'video',file:'safe.mp4',role:'VIDEO',mimeType:'video/mp4',sizeBytes:candidate.video.bytes,sha256:candidate.video.sha256,width:candidate.video.width,height:candidate.video.height,durationSeconds:candidate.video.duration},
      {key:'poster',file:'poster.webp',role:'POSTER',mimeType:'image/webp',sizeBytes:candidate.poster.bytes,sha256:candidate.poster.sha256,width:candidate.poster.width,height:candidate.poster.height}
    ],
    verification:candidate.verification,nativeSummary:candidate.nativeSummary,runtime,publication
  };
}

/** Projection after the common worker's J1 claim and actual processVideo call.
 * No media probe or processing happens here; expected original data is trusted
 * server input. This does not invent a preclaim recipe or a READY authority. */
export async function mapVideoJobResult(value) {
  const input=ownData(value,['result','tuple','toolSetManifest','originalSha256','inputBytes']);
  const tuple=attemptTupleV2Schema.parse(input.tuple);
  if(tuple.kind!=='VIDEO'||typeof input.originalSha256!=='string'||input.originalSha256.length!==64||!/^[a-f0-9]{64}$/.test(input.originalSha256)||!Number.isSafeInteger(input.inputBytes)||input.inputBytes<1||input.inputBytes>VIDEO_LIMITS.inputBytes) videoFail('VIDEO_JOB_BINDING');
  const rawResult=ownData(input.result,['version','private','ready','original','recipe','recipeSha256','video','poster','verification','nativeSummary','runtime','publication']);
  const result=structuredClone(strictMediaV2JsonSchema.parse(rawResult));
  const toolSetManifest=validateToolSetManifest(input.toolSetManifest,{profileId:PROFILE,hashCanonical});
  if(toolSetManifest.kind!=='VIDEO') videoFail('VIDEO_JOB_TOOLSET_BINDING');
  const helperPath=resolve(VIDEO_ROOT,'scripts/media-tool-audit.mjs');
  const helperSha256=videoSha(await readRegularFile(helperPath,1024**2));
  const mapped=projectVideoJobResult(result,tuple,toolSetManifest,input.originalSha256,input.inputBytes,helperSha256);
  if(videoSha(await readRegularFile(helperPath,1024**2))!==helperSha256) videoFail('VIDEO_JOB_HELPER_CHANGED');
  return mapped;
}

/** Trusted server caller only. Canonical parsing binds data, not authorization
 * or a lease. Upload owns Storage generations/cache/quiescence/READY facts.
 * Any processor, cancellation, publication or canonical error propagates with
 * retained attempts intact; this entry never cleans up or retries. */
export async function processVideoJob(value) {
  const input=ownData(value,['request','tuple','frozenInput','toolSetManifest']);
  const request=ownData(input.request,['input','expectedSha256','attemptDirectory'],['signal']);
  validateVideoRequest(request);
  const tuple=attemptTupleV2Schema.parse(input.tuple),frozenInput=frozenInputV2Schema.parse(input.frozenInput);
  if(tuple.kind!=='VIDEO'||frozenInput.kind!=='VIDEO'||tuple.assetId!==frozenInput.assetId||request.expectedSha256!==frozenInput.originalSha256) videoFail('VIDEO_JOB_BINDING');
  const control={deadline:Date.now()+VIDEO_LIMITS.timeoutMs,signal:request.signal};
  checkVideoFinalization(control);
  const toolSetManifest=validateToolSetManifest(input.toolSetManifest,{profileId:PROFILE,hashCanonical});
  if(toolSetManifest.kind!=='VIDEO'||hashCanonical(toolSetManifest)!==frozenInput.toolSetSha256) videoFail('VIDEO_JOB_TOOLSET_BINDING');
  const program=currentProgram();
  if(hashCanonical(program)!==frozenInput.processingRecipeSha256) videoFail('VIDEO_JOB_RECIPE_BINDING');
  if(program.toolSetSha256!==frozenInput.toolSetSha256) videoFail('VIDEO_JOB_TOOLSET_BINDING');
  const helperPath=resolve(VIDEO_ROOT,'scripts/media-tool-audit.mjs');
  const helperSha256=videoSha(await readRegularFile(helperPath,1024**2));
  checkVideoFinalization(control);
  if(helperSha256!==program.helperSha256) videoFail('VIDEO_JOB_SOURCE_BINDING');
  const result=await processVideo(request);
  checkVideoFinalization(control);
  if(videoSha(await readRegularFile(helperPath,1024**2))!==helperSha256) videoFail('VIDEO_JOB_HELPER_CHANGED');
  checkVideoFinalization(control);
  const mapped=projectVideoJobResult(result,tuple,toolSetManifest,frozenInput.originalSha256,frozenInput.inputBytes,helperSha256);
  if(mapped.toolSetSha256!==frozenInput.toolSetSha256) videoFail('VIDEO_JOB_TOOLSET_BINDING');
  if(mapped.processingRecipeSha256!==frozenInput.processingRecipeSha256) videoFail('VIDEO_JOB_RECIPE_BINDING');
  checkVideoFinalization(control);
  return mapped;
}
