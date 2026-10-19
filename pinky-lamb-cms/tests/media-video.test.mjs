import test from 'node:test';
import {observeVideoProcesses} from '../cms-api/media-video-runtime.mjs';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {readFile,mkdir,lstat,appendFile,chmod,writeFile} from 'node:fs/promises';
import fsPromises from 'node:fs/promises';
import fs from 'node:fs';
import {readRegularFile} from '../scripts/media-tool-audit.mjs';
import {VIDEO_SCRATCH_ROOT,validateVideoRequest,inspectVideoMetadata,validateVideoContainer,videoSha,checkVideoCustody,checkVideoAncestry,processVideo,validateVideoCandidate,validateVideoAttemptPath,writeVideoRecord,checkVideoPrivateMode,checkVideoFinalization,checkVideoDirectory} from '../cms-api/media-video.mjs';
import {videoMetadata,mp4Boxes,candidateVector} from './fixtures/media-video.mjs';

// Preserve the historical golden recipe while projecting the current candidate schema.
const currentCandidate=()=>{const value=structuredClone(candidateVector);delete value.rightsApproval;return value;};
const request=()=>({input:resolve(VIDEO_SCRATCH_ROOT,'run/original.mp4'),expectedSha256:'a'.repeat(64),attemptDirectory:resolve(VIDEO_SCRATCH_ROOT,'run/attempt')});
test('pure VIDEO: request accepts only fixed private shape',()=>{
  assert.equal(validateVideoRequest(request()).expectedSha256,'a'.repeat(64));
  for(const extra of ['argv','caps','command','tools','deadline']) assert.throws(()=>validateVideoRequest({...request(),[extra]:{}}),{code:'VIDEO_REQUEST'});
  assert.throws(()=>validateVideoRequest({...request(),input:'https://example.invalid/a.mp4'}),{code:'VIDEO_REQUEST'});
  assert.throws(()=>validateVideoRequest({...request(),attemptDirectory:request().input}),{code:'VIDEO_REQUEST'});
});
test('pure VIDEO: own verificationScope VIDEO is refused before filesystem or verifier',async()=>{
  const value={...request(),verificationScope:'VIDEO'};
  assert.throws(()=>validateVideoRequest(value),{code:'VIDEO_REQUEST'});
  await assert.rejects(processVideo(value),{code:'VIDEO_REQUEST'});
});
test('pure VIDEO: own verificationScope PDF is refused before filesystem or verifier',async()=>{
  const value={...request(),verificationScope:'PDF'};
  assert.throws(()=>validateVideoRequest(value),{code:'VIDEO_REQUEST'});
  await assert.rejects(processVideo(value),{code:'VIDEO_REQUEST'});
});
test('pure VIDEO: own operation PDF is refused before filesystem or verifier',async()=>{
  const value={...request(),operation:'PDF'};
  assert.throws(()=>validateVideoRequest(value),{code:'VIDEO_REQUEST'});
  await assert.rejects(processVideo(value),{code:'VIDEO_REQUEST'});
});
test('pure VIDEO: metadata accepts audio and silent H264 at input boundaries',()=>{
  assert.equal(inspectVideoMetadata(videoMetadata()).audio,true);
  assert.equal(inspectVideoMetadata(videoMetadata({audio:false,width:1920,height:1080,duration:'300',fps:'60/1'})).audio,false);
});
test('pure VIDEO: metadata refuses caps malformed ratios extra streams and artwork',()=>{
  for(const options of [{width:1921},{height:1081},{duration:'300.001'},{fps:'61/1'},{fps:'0/0'}]) assert.throws(()=>inspectVideoMetadata(videoMetadata(options)));
  const extra=videoMetadata();extra.streams.push({codec_type:'data'});assert.throws(()=>inspectVideoMetadata(extra),{code:'VIDEO_STREAMS'});
  const picture=videoMetadata();picture.streams[0].disposition.attached_pic=1;assert.throws(()=>inspectVideoMetadata(picture),{code:'VIDEO_STREAMS'});
});
test('pure VIDEO: output rejects metadata chapters upscale and output caps',()=>{
  const source=inspectVideoMetadata(videoMetadata());
  assert.equal(inspectVideoMetadata(videoMetadata(),{output:true,source}).width,640);
  const tagged=videoMetadata();tagged.streams[0].tags.title='private';assert.throws(()=>inspectVideoMetadata(tagged,{output:true,source}),{code:'VIDEO_OUTPUT_METADATA'});
  const chapters=videoMetadata();chapters.chapters=[{}];assert.throws(()=>inspectVideoMetadata(chapters,{output:true,source}),{code:'VIDEO_OUTPUT_METADATA'});
  assert.throws(()=>inspectVideoMetadata(videoMetadata({width:1280,height:720}),{output:true,source}),{code:'VIDEO_OUTPUT_CAP'});
});
test('pure VIDEO: MP4 structure rejects external references and truncation',()=>{
  assert.equal(validateVideoContainer(mp4Boxes()),true);
  assert.throws(()=>validateVideoContainer(mp4Boxes(true)),{code:'VIDEO_EXTERNAL_REFERENCE'});
  assert.throws(()=>validateVideoContainer(mp4Boxes().subarray(0,14)));
});
test('pure VIDEO: SHA and custody are deterministic and detect every retained identity change',()=>{
  assert.equal(videoSha(Buffer.from('abc')),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  const stat={ino:1,dev:2,size:3,mode:0o100600,uid:4,nlink:1,mtimeMs:5,ctimeMs:6};
  assert.equal(checkVideoCustody(stat,{...stat}),true);
  for(const field of Object.keys(stat)) assert.throws(()=>checkVideoCustody(stat,{...stat,[field]:stat[field]+1}),{code:'VIDEO_CUSTODY_CHANGED'});
});
test('pure VIDEO: runtime module exposes fixed entry on import',async()=>{
  const runtime=await import('../cms-api/media-video-runtime.mjs');assert.equal(typeof runtime.startVideoRuntime,'function');
});
test('pure VIDEO: pre-aborted processing refuses before tools or filesystem',async()=>{
  const controller=new AbortController();controller.abort();
  await assert.rejects(processVideo({...request(),signal:controller.signal}),{code:'VIDEO_CANCELLED'});
});
test('pure VIDEO: manifest requires both fixed outputs decode gates and reaping',()=>{
  const value=currentCandidate();
  assert.equal(videoSha(Buffer.from(JSON.stringify(value.recipe))),candidateVector.recipeSha256);
  assert.equal(validateVideoCandidate(value,'a'.repeat(64),1),value);
  for(const rightsApproval of [false,true]) assert.throws(()=>validateVideoCandidate({...value,rightsApproval},'a'.repeat(64),1),{code:'VIDEO_MANIFEST'});
  for(const changed of [{ready:true},{video:{...value.video,width:641}},{poster:{...value.poster,height:361}},{recipe:{...value.recipe,version:'tampered'}},{recipeSha256:'d'.repeat(64)},{nativeSummary:{allReaped:false}},{poster:{...value.poster,file:'../poster.webp'}},{verification:{...value.verification,outputDecoded:false}}]) assert.throws(()=>validateVideoCandidate({...value,...changed},'a'.repeat(64),1),{code:'VIDEO_MANIFEST'});
});

// Native tests consume separately admitted, retained fixtures only. No generation/hooks on import.
for(const kind of ['audio','silent']) test(`native VIDEO: retained ${kind} H264 fixture completes decode and private manifest`,async()=>{
  const run=resolve(VIDEO_SCRATCH_ROOT,'native-fixtures'),input=resolve(run,`${kind}.mp4`);
  const original=await readFile(input),expectedSha256=videoSha(original);
  const manifest=await processVideo({input,expectedSha256,attemptDirectory:resolve(run,`attempt-${randomUUID()}`)});
  assert.equal(manifest.private,true);assert.equal(manifest.ready,false);assert.equal(manifest.video.audio,kind==='audio');
  assert.equal(manifest.original.sha256,expectedSha256);assert.equal(manifest.runtime.reaped,true);assert.equal(manifest.poster.derivativeRole,'POSTER');
  assert.equal(videoSha(await readFile(input)),expectedSha256);
});
for(const [fixture,codes] of [
  ['over-duration',['VIDEO_CAP']],['over-dimensions',['VIDEO_CAP']],['over-fps',['VIDEO_CAP']],
  ['extra-stream',['VIDEO_STREAMS']],['external-reference',['VIDEO_EXTERNAL_REFERENCE']],
  ['truncated',['MOV_STRUCTURE','VIDEO_NATIVE_FAILED','VIDEO_DIAGNOSTIC']]
]) test(`native VIDEO: retained ${fixture} refuses without manifest`,async()=>{
  const run=resolve(VIDEO_SCRATCH_ROOT,'native-fixtures'),input=resolve(run,`${fixture}.mp4`),attemptDirectory=resolve(run,`attempt-${randomUUID()}`);
  const expectedSha256=videoSha(await readFile(input));
  await assert.rejects(processVideo({input,expectedSha256,attemptDirectory}),e=>codes.includes(e.code));
  await assert.rejects(readFile(resolve(attemptDirectory,'manifest.json')),{code:'ENOENT'});
  assert.equal(videoSha(await readFile(input)),expectedSha256);
});

test('pure VIDEO: final record refuses foreign or wrong-depth paths before filesystem access',async()=>{
  for(const path of ['/private/tmp/foreign',resolve(VIDEO_SCRATCH_ROOT,'attempt'),resolve(VIDEO_SCRATCH_ROOT,'run/attempt/deeper')]) {
    assert.throws(()=>validateVideoAttemptPath(path),{code:'VIDEO_ATTEMPT_PATH'});
    await assert.rejects(writeVideoRecord(path,{},'manifest.json',{}),{code:'VIDEO_ATTEMPT_PATH'});
  }
});
test('pure VIDEO: duration rounding remains frame-bound and never permits above300s',()=>{
  const source=inspectVideoMetadata(videoMetadata({duration:'299.99'}));
  assert.equal(inspectVideoMetadata(videoMetadata({duration:'300'}),{output:true,source}).duration,300);
  assert.throws(()=>inspectVideoMetadata(videoMetadata({duration:'300.001'}),{output:true,source}),{code:'VIDEO_CAP'});
  assert.throws(()=>inspectVideoMetadata(videoMetadata({duration:'299.9'}),{output:true,source}),{code:'VIDEO_OUTPUT_CAP'});
});
test('pure VIDEO: CPB metadata is structural and rotation is unsupported',()=>{
  const value=videoMetadata();value.streams[0].side_data_list=[{side_data_type:'CPB properties'}];
  assert.equal(inspectVideoMetadata(value).width,640);
  value.streams[0].side_data_list=[{side_data_type:'Display Matrix',rotation:90}];
  assert.throws(()=>inspectVideoMetadata(value),{code:'VIDEO_STREAMS'});
});
test('pure VIDEO: ancestor replacement and record without custody refuse',async()=>{
  const before=[{path:'/owned',ino:1,dev:2,uid:3,mode:0o40700}];
  assert.equal(checkVideoAncestry(before,structuredClone(before)),true);
  for(const key of ['path','ino','dev','uid','mode']) assert.throws(()=>checkVideoAncestry(before,[{...before[0],[key]:key==='path'?'/replacement':99}]),{code:'VIDEO_ANCESTRY_CHANGED'});
  await assert.rejects(writeVideoRecord(request().attemptDirectory,{},'manifest.json',{}),{code:'VIDEO_RECORD_CUSTODY'});
});

test('pure VIDEO: private original and ancestry reject world or group access',()=>{
  assert.equal(checkVideoPrivateMode({uid:42,mode:0o100600},'file',42),true);
  assert.equal(checkVideoPrivateMode({uid:42,mode:0o40700},'directory',42),true);
  for(const mode of [0o100644,0o100640,0o100620,0o100700]) assert.throws(()=>checkVideoPrivateMode({uid:42,mode},'file',42),{code:'VIDEO_PRIVATE_INPUT'});
  for(const mode of [0o40755,0o40750,0o40720]) assert.throws(()=>checkVideoPrivateMode({uid:42,mode},'directory',42),{code:'VIDEO_PRIVATE_DIRECTORY'});
});
test('pure VIDEO: strict complete manifest rejects versions unknown keys omitted recipe and semantic argv tamper',()=>{
  for(const mutate of [v=>{v.version=2;},v=>{v.extra=true;},v=>{v.video.extra=true;},v=>{delete v.recipe.transcode;},v=>{delete v.recipe.sharp;},v=>{v.recipe.transcode[v.recipe.transcode.indexOf('h264_videotoolbox')]='copy';},v=>{v.recipe.posterEncode='copy-original';},v=>{v.recipe.tools[0].sha256='0'.repeat(64);},v=>{v.recipe.transcode.push('-evil');}]) {
    const value=currentCandidate();mutate(value);value.recipeSha256=videoSha(Buffer.from(JSON.stringify(value.recipe)));
    assert.throws(()=>validateVideoCandidate(value,'a'.repeat(64),1),{code:'VIDEO_MANIFEST'});
  }
  for(const value of [null,{},'wrong',{...currentCandidate(),recipe:null}]) assert.throws(()=>validateVideoCandidate(value,'a'.repeat(64),1),{code:'VIDEO_MANIFEST'});
});
test('pure VIDEO: secret markers in every otherwise structural tag refuse',()=>{
  const source=inspectVideoMetadata(videoMetadata());
  for(const key of ['major_brand','minor_version','compatible_brands','encoder','language','handler_name','vendor_id']) {
    for(const target of ['format','video','audio']) {
      const value=videoMetadata(),tags=target==='format'?value.format.tags:value.streams[target==='video'?0:1].tags;tags[key]='PRIVATE_SECRET_MARKER';
      assert.throws(()=>inspectVideoMetadata(value,{output:true,source}),{code:'VIDEO_OUTPUT_METADATA'});
    }
  }
  const value=videoMetadata();value.format.tags={major_brand:'isom',minor_version:'512',compatible_brands:'isomiso2avc1mp41',encoder:'Lavf63.1.102'};
  value.streams[0].tags={language:'und',handler_name:'VideoHandler',vendor_id:'[0][0][0][0]',encoder:'Lavc63.1.102 h264_videotoolbox'};
  assert.equal(inspectVideoMetadata(value,{output:true,source}).width,640);
});
test('pure VIDEO: finalization guards cancellation and deadline after asynchronous receipt or custody stages',async()=>{
  for(const stage of ['receipt','custody','pending-write','pending-close']) {
    const controller=new AbortController();let committed=false;
    const control={deadline:100,signal:controller.signal};checkVideoFinalization(control,99);
    await Promise.resolve(stage);controller.abort();
    assert.throws(()=>{checkVideoFinalization(control,99);committed=true;},{code:'VIDEO_CANCELLED'});assert.equal(committed,false);
  }
  assert.throws(()=>checkVideoFinalization({deadline:100},100),{code:'VIDEO_TIMEOUT'});
  assert.equal(checkVideoFinalization({deadline:100},99),true);
});
test('pure VIDEO: process accounting retains descendants after PGID migration and reparenting',()=>{
  const leader={pid:10,parent:1,group:10,rss:1024,start:'leader'},descendant={pid:11,parent:10,group:10,rss:2048,start:'descendant'};
  const state={known:[],leaderPid:10,parentPid:1,preflightPids:[],detached:true,closed:false};
  const first=observeVideoProcesses(state,[leader,descendant]);assert.equal(first.rssBytes,3072);
  const escaped={...descendant,parent:1,group:99};
  const second=observeVideoProcesses({...state,known:first.known,closed:true},[escaped]);
  assert.deepEqual(second.owned.map(r=>r.pid),[11]);assert.equal(second.rssBytes,2048);
  assert.equal(observeVideoProcesses({...state,known:second.known,closed:true},[]).owned.length,0);
  assert.throws(()=>observeVideoProcesses({...state,known:first.known},[{...escaped,start:'reused'}]),{code:'VIDEO_PROCESS_IDENTITY'});
  assert.throws(()=>observeVideoProcesses({...state,known:first.known},[leader,{pid:12,parent:99,group:10,rss:1,start:'unknown'}]),{code:'VIDEO_PROCESS_IDENTITY'});
});

// Tiny retained filesystem fixtures are created only inside admitted matching tests, never on import.
async function publisherFixture() {
  try {await mkdir(VIDEO_SCRATCH_ROOT,{mode:0o700});} catch(e) {if(e.code!=='EEXIST') throw e;}
  await checkVideoDirectory(VIDEO_SCRATCH_ROOT);
  const run=resolve(VIDEO_SCRATCH_ROOT,`pure-record-${randomUUID()}`),directory=resolve(run,'attempt');
  await mkdir(run,{mode:0o700});await mkdir(directory,{mode:0o700});
  const custody=await lstat(directory);custody.ancestry=await checkVideoDirectory(directory);
  return {directory,custody,final:resolve(directory,'manifest.json'),pending:resolve(directory,'manifest.json.pending'),value:{private:true,synthetic:'publisher-fixture'},control:{deadline:Date.now()+60000}};
}
function interceptPublisherDescriptor(t,afterWrite,afterClose) {
  const original=fsPromises.open;
  t.mock.method(fsPromises,'open',async(...args)=>{
    const descriptor=await original(...args),write=descriptor.writeFile.bind(descriptor),close=descriptor.close.bind(descriptor);
    if(afterWrite) t.mock.method(descriptor,'writeFile',async(...values)=>{await write(...values);await afterWrite(args[0]);});
    if(afterClose) t.mock.method(descriptor,'close',async()=>{await close();await afterClose();});
    return descriptor;
  });
}
test('pure VIDEO: filesystem publisher commits exclusive single-link exact bytes',async()=>{
  const f=await publisherFixture(),expected=Buffer.from(JSON.stringify(f.value,null,2));
  const result=await writeVideoRecord(f.directory,f.custody,'manifest.json',f.value,f.control);
  assert.deepEqual(result,{committed:true,singleLink:true,housekeeping:[]});assert.deepEqual(await readFile(f.final),expected);
  assert.deepEqual(await readRegularFile(f.final,65536),expected);
  const stat=await lstat(f.final);assert.equal(stat.nlink,1);assert.equal(stat.mode&0o7777,0o600);assert.equal(stat.uid,process.getuid());
  await assert.rejects(lstat(f.pending),{code:'ENOENT'});
  await assert.rejects(writeVideoRecord(f.directory,f.custody,'manifest.json',{private:true,synthetic:'replacement'},f.control),{code:'EEXIST'});
  assert.deepEqual(await readFile(f.final),expected);
});
test('pure VIDEO: filesystem publisher cleanup fault rolls back final and retains private pending',async(t)=>{
  const f=await publisherFixture(),original=fs.unlinkSync;
  t.mock.method(fs,'unlinkSync',path=>{if(path===f.pending) throw Object.assign(new Error('owned injected cleanup fault'),{code:'EIO'});return original(path);});
  await assert.rejects(writeVideoRecord(f.directory,f.custody,'manifest.json',f.value,f.control),{code:'VIDEO_PUBLICATION_ABORTED'});
  await assert.rejects(lstat(f.final),{code:'ENOENT'});assert.equal((await lstat(f.pending)).nlink,1);assert.deepEqual(JSON.parse(await readFile(f.pending)),f.value);
});
test('pure VIDEO: filesystem publisher postcommit close fault reports housekeeping without false failure',async(t)=>{
  const f=await publisherFixture();interceptPublisherDescriptor(t,null,()=>{throw Object.assign(new Error('owned injected close fault'),{code:'EIO'});});
  const result=await writeVideoRecord(f.directory,f.custody,'manifest.json',f.value,f.control);
  assert.equal(result.committed,true);assert.deepEqual(result.housekeeping,[{code:'EIO',state:'UNKNOWN'}]);assert.equal((await lstat(f.final)).nlink,1);
  assert.deepEqual(JSON.parse(await readFile(f.final)),f.value);
});
test('pure VIDEO: filesystem publisher rollback failure reports Unknown and artifact cannot be accepted',async(t)=>{
  const f=await publisherFixture(),original=fs.unlinkSync;
  t.mock.method(fs,'unlinkSync',path=>{if(path===f.pending||path===f.final) throw Object.assign(new Error('owned injected rollback fault'),{code:'EIO'});return original(path);});
  await assert.rejects(writeVideoRecord(f.directory,f.custody,'manifest.json',f.value,f.control),e=>e.code==='VIDEO_PUBLICATION_UNKNOWN'&&e.publication.committed===false&&e.publication.state==='UNKNOWN');
  assert.equal((await lstat(f.final)).nlink,2);
  await assert.rejects(readRegularFile(f.final,65536),{code:'NOT_SINGLE_REGULAR_FILE'});
});
for(const mutation of ['append','overwrite','mode']) test(`pure VIDEO: filesystem publisher refuses same-inode pending ${mutation} tamper`,async(t)=>{
  const f=await publisherFixture();let originalInode;
  interceptPublisherDescriptor(t,async path=>{
    originalInode=(await lstat(path)).ino;
    if(mutation==='append') await appendFile(path,'tamper');
    else if(mutation==='mode') await chmod(path,0o644); // Only this new tiny fault fixture, never shared/original data.
    else {const bytes=await readFile(path);bytes[0]=0x5b;await writeFile(path,bytes);}
  });
  await assert.rejects(writeVideoRecord(f.directory,f.custody,'manifest.json',f.value,f.control),e=>['VIDEO_RECORD_CUSTODY','VIDEO_RECORD_CONTENT'].includes(e.code));
  assert.equal((await lstat(f.pending)).ino,originalInode);await assert.rejects(lstat(f.final),{code:'ENOENT'});
});
for(const crossing of ['cancel','deadline']) test(`pure VIDEO: filesystem publisher refuses ${crossing} after pending write`,async(t)=>{
  const f=await publisherFixture(),controller=new AbortController();f.control.signal=controller.signal;
  interceptPublisherDescriptor(t,async()=>{if(crossing==='cancel') controller.abort();else f.control.deadline=Date.now()-1;});
  await assert.rejects(writeVideoRecord(f.directory,f.custody,'manifest.json',f.value,f.control),{code:crossing==='cancel'?'VIDEO_CANCELLED':'VIDEO_TIMEOUT'});
  await assert.rejects(lstat(f.final),{code:'ENOENT'});assert.equal((await lstat(f.pending)).nlink,1);
});
