import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {IMAGE_SCRATCH_ROOT,IMAGE_LIMITS,validateImageRequest,validateImageContainer,validateImageMetadata,imageDimensions,imageSha,validateImageCandidate,commitImageManifest,checkImageDirectory,readImageManifestPair,readImageFile} from '../cms-api/media-images.mjs';
import {structuralPng,pngChunk,structuralWebp,webpChunk,JPEG_SIGNATURE_ONLY} from './fixtures/media-images.mjs';

const request=()=>({input:resolve(IMAGE_SCRATCH_ROOT,'parallel-image-01/source/input.png'),expectedSha256:'a'.repeat(64),declaredMime:'image/png',attemptDirectory:resolve(IMAGE_SCRATCH_ROOT,'parallel-image-01/attempt-1')});
const code=(fn,expected)=>assert.throws(fn,e=>e.code===expected);
test('pure: request rejects knobs, noncanonical/unowned paths, bad hash/MIME and signals',()=>{
  assert.deepEqual(validateImageRequest(request()),request());
  for(const patch of [{quality:80},{verificationScope:'IMAGE'},{verificationScope:'PDF'},{operation:'PDF'},{input:'/tmp/a.png'},{input:resolve(IMAGE_SCRATCH_ROOT,'../sibling/input.png')},{input:request().input+'/../x'},{attemptDirectory:request().input},{expectedSha256:'A'.repeat(64)},{declaredMime:'image/gif'},{signal:{}},{input:request().attemptDirectory+'/input.png'}]) code(()=>validateImageRequest({...request(),...patch}),'IMAGE_REQUEST');
});
test('pure: MIME must be primitive and never coerce caller objects',()=>{
  for(const declaredMime of [new String('image/png'),{toString(){throw new Error('must not coerce');}},Object.assign(Object.create(null),{toString:()=> 'image/png'}),null,1,Symbol('image/png')]) code(()=>validateImageRequest({...request(),declaredMime}),'IMAGE_REQUEST');
});
test('pure: signature/MIME agreement and structurally bounded static containers',()=>{
  assert.equal(validateImageContainer(structuralPng(),'image/png'),'png');
  assert.equal(validateImageContainer(structuralWebp(),'image/webp'),'webp');
  assert.equal(validateImageContainer(JPEG_SIGNATURE_ONLY,'image/jpeg'),'jpeg');
  code(()=>validateImageContainer(structuralPng(),'image/jpeg'),'IMAGE_MIME');
  code(()=>validateImageContainer(Buffer.from('GIF89a'),'image/png'),'IMAGE_SIGNATURE');
  code(()=>validateImageContainer(Buffer.alloc(IMAGE_LIMITS.inputBytes+1),'image/png'),'IMAGE_INPUT_SIZE');
});
test('pure: PNG animation rejected even when decoder might select first frame',()=>{
  for(const type of ['acTL','fcTL','fdAT']) code(()=>validateImageContainer(structuralPng([pngChunk(type)]),'image/png'),'IMAGE_ANIMATION');
  code(()=>validateImageContainer(Buffer.concat([structuralPng(),pngChunk('acTL')]),'image/png'),'IMAGE_CONTAINER');
  const corrupt=structuralPng();corrupt[corrupt.length-1]^=1;code(()=>validateImageContainer(corrupt,'image/png'),'IMAGE_CONTAINER');
  code(()=>validateImageContainer(structuralPng().subarray(0,-1),'image/png'),'IMAGE_CONTAINER');
});
test('pure: WebP RIFF lengths, trailing bytes, animation chunks and flag rejected',()=>{
  for(const type of ['ANIM','ANMF']) code(()=>validateImageContainer(structuralWebp([webpChunk(type)]),'image/webp'),'IMAGE_ANIMATION');
  const flags=Buffer.alloc(10);flags[0]=2;
  code(()=>validateImageContainer(structuralWebp([webpChunk('VP8X',flags),webpChunk('VP8L')]),'image/webp'),'IMAGE_ANIMATION');
  const invalid=structuralWebp();invalid.writeUInt32LE(100,16);code(()=>validateImageContainer(invalid,'image/webp'),'IMAGE_CONTAINER');
  code(()=>validateImageContainer(Buffer.concat([structuralWebp(),webpChunk('ANMF')]),'image/webp'),'IMAGE_CONTAINER');
  code(()=>validateImageContainer(structuralWebp().subarray(0,-1),'image/webp'),'IMAGE_CONTAINER');
});
test('pure: metadata caps, frame count and all eight orientation dimensions',()=>{
  for(let orientation=1;orientation<=8;orientation++) {
    const meta={format:'jpeg',width:7,height:5,orientation,pages:1};validateImageMetadata(meta,'jpeg');
    assert.deepEqual(imageDimensions(meta),orientation>=5?{width:5,height:7}:{width:7,height:5});
  }
  validateImageMetadata({format:'png',width:8000,height:5000,pages:1},'png');
  for(const patch of [{width:8193},{width:8000,height:5001},{width:0},{height:1.5},{pages:2},{orientation:9},{format:'gif'}]) code(()=>validateImageMetadata({format:'png',width:7,height:5,...patch},'png'),'IMAGE_METADATA');
});
test('pure: candidate fixed inventory and independently computed SHA',()=>{
  assert.equal(imageSha(Buffer.from('abc')),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  const candidate={version:1,kind:'IMAGE',original:{sha256:'a'.repeat(64),bytes:8,mime:'image/jpeg'},source:{width:7,height:5,hasAlpha:false},outputs:[320,960,1920].map(width=>({file:`image-${width}.webp`,targetWidth:width,width:7,height:5,mime:'image/webp',bytes:10,sha256:'b'.repeat(64),hasAlpha:false})),recipe:{quality:80,alphaQuality:100,effort:4}};
  validateImageCandidate(candidate,{expectedSha256:'a'.repeat(64),inputBytes:8,declaredMime:'image/jpeg'});
  for(const change of [c=>c.outputs.pop(),c=>c.outputs[0].file='../x.webp',c=>c.outputs[0].bytes=IMAGE_LIMITS.outputBytes+1,c=>c.ready=true,c=>c.recipe.quality=1,c=>c.outputs[0].width=8]) {
    const bad=structuredClone(candidate);change(bad);code(()=>validateImageCandidate(bad,{expectedSha256:'a'.repeat(64),inputBytes:8,declaredMime:'image/jpeg'}),'IMAGE_CANDIDATE');
  }
});
// These filesystem regressions use only newly owned task scratch; never decode or spawn native tools.
async function commitFixture() {
  const fs=(await import('node:fs')).default;
  const {randomUUID}=await import('node:crypto');
  await checkImageDirectory(IMAGE_SCRATCH_ROOT);
  const namespace=resolve(IMAGE_SCRATCH_ROOT,'parallel-image-01');
  try {fs.mkdirSync(namespace,{mode:0o700});} catch(error) {if(error.code!=='EEXIST')throw error;}
  await checkImageDirectory(namespace);
  const directory=resolve(namespace,`pure-commit-${randomUUID()}`);fs.mkdirSync(directory,{mode:0o700});
  const capture=(file,bytes)=>{
    const path=resolve(directory,file);fs.writeFileSync(path,bytes,{flag:'wx',mode:0o600});
    return {path,custody:fs.lstatSync(path),sha256:imageSha(bytes),bytes:bytes.length,maxBytes:IMAGE_LIMITS.inputBytes};
  };
  const original=capture('source.bin',Buffer.from('original independent bytes'));
  const outputs=[320,960,1920].map(width=>capture(`image-${width}.webp`,Buffer.from(`derivative ${width}`)));
  return {fs,directory,custody:fs.lstatSync(directory),original,outputs,manifest:Buffer.from('{"verified":true}'),deadline:Date.now()+30000};
}
const custodyFields=['dev','ino','uid','mode','size','nlink','mtimeMs','ctimeMs'];
function fileSnapshot(fs,path) {
  const before=fs.lstatSync(path),bytes=fs.readFileSync(path),after=fs.lstatSync(path);
  const custody=st=>Object.fromEntries(custodyFields.map(key=>[key,st[key]]));
  assert.deepEqual(custody(after),custody(before),'snapshot must observe stable custody');
  return {path,bytes,custody:custody(after)};
}
function retainedSnapshots(f) {return [f.original,...f.outputs].map(guard=>fileSnapshot(f.fs,guard.path));}
function assertPreserved(fs,snapshots) {
  for(const expected of snapshots) assert.deepEqual(fileSnapshot(fs,expected.path),expected,`retained file changed: ${expected.path}`);
}
test('pure: finalization preparation write/fsync/close/custody/hash failures retain staging without success',async t=>{
  for(const failure of ['write','zero-write','fsync','close','custody','hash']) await t.test(failure,async sub=>{
    const f=await commitFixture(),{fs}=f,real={open:fs.openSync,write:fs.writeSync,sync:fs.fsyncSync,close:fs.closeSync,stat:fs.lstatSync};
    const retained=retainedSnapshots(f);
    let stageFd,stageClosed=false,writeCount=0;
    sub.mock.method(fs,'openSync',(path,...args)=>{const fd=real.open(path,...args);if(String(path).endsWith('manifest.stage.json'))stageFd=fd;return fd;});
    sub.mock.method(fs,'writeSync',(fd,...args)=>{if(fd===stageFd&&failure==='zero-write')return 0;if(fd===stageFd&&failure==='write') {if(++writeCount>1)throw Object.assign(new Error('write fault'),{code:'EIO'});return real.write(fd,args[0],args[1],1);}if(fd===stageFd&&failure==='hash')return real.write(fd,Buffer.alloc(f.manifest.length,120),...args.slice(1));return real.write(fd,...args);});
    sub.mock.method(fs,'fsyncSync',fd=>{if(fd===stageFd&&failure==='fsync')throw Object.assign(new Error('fsync fault'),{code:'EIO'});return real.sync(fd);});
    sub.mock.method(fs,'closeSync',fd=>{const result=real.close(fd);if(fd===stageFd) {stageClosed=true;if(failure==='close')throw Object.assign(new Error('close fault'),{code:'EIO'});}return result;});
    sub.mock.method(fs,'lstatSync',path=>{
      const st=real.stat(path);
      if(failure==='custody'&&stageClosed&&path===f.directory) {
        const realIno=st.ino;st.ino+=1;
        assert.equal(typeof st.isSymbolicLink,'function');assert.equal(typeof st.isDirectory,'function');
        assert.equal(st.isSymbolicLink(),false);assert.equal(st.isDirectory(),true);
        assert.notEqual(st.ino,realIno);assert.notEqual(st.ino,f.custody.ino);
      }
      return st;
    });
    try {
      assert.throws(()=>commitImageManifest(f.directory,f.manifest,f.custody,f.deadline,undefined,f.original,f.outputs),error=>['EIO','IMAGE_ATTEMPT_CHANGED','IMAGE_STAGE_CHANGED','IMAGE_STAGE_WRITE'].includes(error.code));
      assert.equal(fs.existsSync(resolve(f.directory,'manifest.json')),false);
      assert.equal(fs.existsSync(resolve(f.directory,'manifest.stage.json')),true);
    } finally {sub.mock.restoreAll();}
    assertPreserved(fs,retained);
  });
});
test('pure: mutation of stage, original or derivative after early verification refuses publication',async t=>{
  for(const changed of ['stage','original','derivative']) await t.test(changed,async sub=>{
    const f=await commitFixture(),{fs}=f,realOpen=fs.openSync,realClose=fs.closeSync;let stageFd,changedOnce=false;
    const retained=retainedSnapshots(f);let injected;
    const target=changed==='stage'?{path:resolve(f.directory,'manifest.stage.json'),bytes:f.manifest.length}:changed==='original'?f.original:f.outputs[1];
    sub.mock.method(fs,'openSync',(path,...args)=>{const fd=realOpen(path,...args);if(String(path).endsWith('manifest.stage.json'))stageFd=fd;return fd;});
    sub.mock.method(fs,'closeSync',fd=>{realClose(fd);if(fd===stageFd&&!changedOnce) {changedOnce=true;fs.writeFileSync(target.path,Buffer.alloc(target.bytes,120),{mode:0o600});injected=fileSnapshot(fs,target.path);}});
    try {
      code(()=>commitImageManifest(f.directory,f.manifest,f.custody,f.deadline,undefined,f.original,f.outputs),changed==='stage'?'IMAGE_STAGE_CHANGED':changed==='original'?'IMAGE_ORIGINAL_CHANGED':'IMAGE_OUTPUT_CHANGED');
      assert.equal(changedOnce,true);assert.equal(fs.existsSync(resolve(f.directory,'manifest.json')),false);
      assert.deepEqual(fs.readFileSync(resolve(f.directory,'manifest.stage.json')),changed==='stage'?Buffer.alloc(f.manifest.length,120):f.manifest);
    } finally {sub.mock.restoreAll();}
    assertPreserved(fs,retained.map(snapshot=>snapshot.path===target.path?injected:snapshot));
    assertPreserved(fs,[injected]);
  });
});
test('pure: finalization abort/deadline after staging and immediately precommit prevent success',async t=>{
  for(const action of ['abort-after-stage','deadline-after-stage','abort-precommit','deadline-precommit']) await t.test(action,async sub=>{
    const f=await commitFixture(),{fs}=f,realOpen=fs.openSync,realClose=fs.closeSync,realStat=fs.lstatSync,controller=new AbortController();
    const retained=retainedSnapshots(f);
    let stageFd,closed=false,tripped=false,stageOpens=0,lastStageReadClosed=false;
    const trip=()=>{if(tripped)return;tripped=true;if(action.startsWith('abort'))controller.abort();else sub.mock.method(Date,'now',()=>f.deadline);};
    sub.mock.method(fs,'openSync',(path,...args)=>{const fd=realOpen(path,...args);if(String(path).endsWith('manifest.stage.json')) {stageFd=fd;stageOpens++;}return fd;});
    sub.mock.method(fs,'closeSync',fd=>{realClose(fd);if(fd===stageFd) {if(!closed) {closed=true;if(action.endsWith('after-stage'))trip();}if(stageOpens===3)lastStageReadClosed=true;}});
    // Final directory custody check follows the second complete staged-record read/close.
    sub.mock.method(fs,'lstatSync',path=>{const st=realStat(path);if(lastStageReadClosed&&path===f.directory&&action.endsWith('precommit'))trip();return st;});
    try {
      code(()=>commitImageManifest(f.directory,f.manifest,f.custody,f.deadline,controller.signal,f.original,f.outputs),action.startsWith('abort')?'IMAGE_CANCELLED':'IMAGE_TIMEOUT');
      assert.equal(tripped,true);assert.equal(fs.existsSync(resolve(f.directory,'manifest.json')),false);assert.equal(fs.existsSync(resolve(f.directory,'manifest.stage.json')),true);
    } finally {sub.mock.restoreAll();}
    assertPreserved(fs,retained);
  });
});
test('pure: exclusive finalization collision preserves existing destination and stage evidence',async()=>{
  const f=await commitFixture(),destination=resolve(f.directory,'manifest.json'),previous=Buffer.from('previous record');
  const retained=retainedSnapshots(f);
  f.fs.writeFileSync(destination,previous,{flag:'wx',mode:0o600});
  const destinationBefore=fileSnapshot(f.fs,destination);
  code(()=>commitImageManifest(f.directory,f.manifest,f.custody,f.deadline,undefined,f.original,f.outputs),'EEXIST');
  assert.deepEqual(f.fs.readFileSync(destination),previous);assert.deepEqual(f.fs.readFileSync(resolve(f.directory,'manifest.stage.json')),f.manifest);
  assert.equal(f.fs.lstatSync(destination).nlink,1);
  assertPreserved(f.fs,[...retained,destinationBefore]);
});
test('pure: successful exact pair has no postpublication I/O; generic single-link reader refuses',async t=>{
  const f=await commitFixture(),{fs}=f,link=fs.linkSync;let published=false;
  const retained=retainedSnapshots(f);
  t.mock.method(fs,'linkSync',(...args)=>{const result=link(...args);published=true;return result;});
  for(const method of ['lstatSync','openSync','readSync','writeSync','fsyncSync','fstatSync','closeSync']) {
    const real=fs[method];t.mock.method(fs,method,(...args)=>{if(published)throw new Error('unexpected post-publication I/O');return real(...args);});
  }
  try {commitImageManifest(f.directory,f.manifest,f.custody,f.deadline,undefined,f.original,f.outputs);assert.equal(published,true);}
  finally {t.mock.restoreAll();}
  const stage=fs.lstatSync(resolve(f.directory,'manifest.stage.json')),manifest=fs.lstatSync(resolve(f.directory,'manifest.json'));
  assert.equal(stage.nlink,2);assert.equal(manifest.nlink,2);assert.equal(stage.ino,manifest.ino);assert.equal(stage.dev,manifest.dev);
  for(const guard of [f.original,...f.outputs]) assert.equal(fs.lstatSync(guard.path).nlink,1);
  assert.deepEqual(readImageManifestPair(f.directory,{expectedSha256:imageSha(f.manifest),expectedBytes:f.manifest.length,custody:f.custody}),f.manifest);
  await assert.rejects(readImageFile(resolve(f.directory,'manifest.json'),65536),error=>error.code==='IMAGE_PRIVATE_FILE');
  assertPreserved(fs,retained);
});
test('pure: exact pair reader refuses arbitrary links, wrong hashes, mismatched inode and single links',async t=>{
  for(const failure of ['third-link','wrong-hash','wrong-size','mismatched-inode','single-link']) await t.test(failure,async()=>{
    const f=await commitFixture(),{fs}=f,stage=resolve(f.directory,'manifest.stage.json'),manifest=resolve(f.directory,'manifest.json');
    const retained=retainedSnapshots(f);
    if(failure==='mismatched-inode') {
      for(const name of ['manifest.stage.json','manifest.json']) {const path=resolve(f.directory,name);fs.writeFileSync(path,f.manifest,{flag:'wx',mode:0o600});fs.linkSync(path,resolve(f.directory,name+'.other'));}
    } else if(failure==='single-link') {
      fs.writeFileSync(stage,f.manifest,{flag:'wx',mode:0o600});fs.writeFileSync(manifest,f.manifest,{flag:'wx',mode:0o600});
    } else {
      commitImageManifest(f.directory,f.manifest,f.custody,f.deadline,undefined,f.original,f.outputs);
      if(failure==='third-link')fs.linkSync(stage,resolve(f.directory,'arbitrary-link.json'));
    }
    code(()=>readImageManifestPair(f.directory,{expectedSha256:failure==='wrong-hash'?'a'.repeat(64):imageSha(f.manifest),expectedBytes:f.manifest.length+(failure==='wrong-size'?1:0)}),'IMAGE_MANIFEST_PAIR');
    assertPreserved(fs,retained);
  });
});

// No top-level native setup: explicit future admission must also release the frozen tool gate.
const nativeHold={skip:'NOT_RUN_NATIVE_ADMISSION_AND_TOOL_BYTES_HOLD'};
// Internal test enablement only. Native custody/admission and the pinned IMAGE gate remain required.
test('native: first JPEG local processor smoke',{skip:process.env.PINKY_IMAGE_NATIVE_FIRST_CASE==='JPEG_LOCAL'?false:'HOLD_NATIVE_FIRST_JPEG_ADMISSION'},async()=>{
  const {randomUUID}=await import('node:crypto');
  const {readFile,lstat,readdir}=await import('node:fs/promises');
  const {createNativeImageFixtures}=await import('./fixtures/media-images.mjs');
  const {processImage}=await import('../cms-api/media-images.mjs');
  const id=randomUUID(),fixtureDirectory=resolve(IMAGE_SCRATCH_ROOT,`parallel-image-01/first-jpeg-fixtures-${id}`);
  const fixtures=await createNativeImageFixtures(fixtureDirectory,'JPEG_FIRST');
  assert.equal(fixtures.length,1);assert.equal(fixtures[0].file,'source.jpeg');
  assert.deepEqual(await readdir(fixtureDirectory),['source.jpeg']);
  const fixture=fixtures[0],input=resolve(fixtureDirectory,fixture.file),before=await readFile(input),originalCustody=await lstat(input);
  assert.equal(fixture.declaredMime,'image/jpeg');assert.equal(imageSha(before),fixture.expectedSha256);
  const attemptDirectory=resolve(IMAGE_SCRATCH_ROOT,`parallel-image-01/first-jpeg-attempt-${id}`);
  const result=await processImage({input,expectedSha256:fixture.expectedSha256,declaredMime:fixture.declaredMime,attemptDirectory});
  assert.equal(result.ready,false);assert.equal(Object.hasOwn(result,'rightsApproval'),false);
  assert.deepEqual(result.original,{sha256:fixture.expectedSha256,bytes:before.length,mime:'image/jpeg'});
  assert.deepEqual(result.outputs.map(output=>output.targetWidth),[320,960,1920]);
  assert.deepEqual(result.outputs.map(output=>output.file),['image-320.webp','image-960.webp','image-1920.webp']);
  // Fixture creation already passed the pinned gate before importing Sharp; no new bypass or PS probe.
  const sharp=(await import('sharp')).default;
  for(const output of result.outputs) {
    assert.equal(output.mime,'image/webp');assert.equal(output.width,7);assert.equal(output.height,5);
    const bytes=await readFile(resolve(attemptDirectory,output.file));
    assert.equal(bytes.length,output.bytes);assert.equal(imageSha(bytes),output.sha256);
    assert.equal(bytes.subarray(0,4).toString('ascii'),'RIFF');assert.equal(bytes.subarray(8,12).toString('ascii'),'WEBP');
    const metadata=await sharp(bytes,{failOn:'warning',unlimited:false,limitInputPixels:IMAGE_LIMITS.pixels}).metadata();
    assert.equal(metadata.format,'webp');assert.equal(metadata.width,7);assert.equal(metadata.height,5);assert.equal(metadata.space,'srgb');
    for(const key of ['exif','xmp','iptc','icc','orientation'])assert.equal(metadata[key],undefined,key);
    const decoded=await sharp(bytes,{failOn:'warning',unlimited:false,limitInputPixels:IMAGE_LIMITS.pixels}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    assert.equal(decoded.info.width,7);assert.equal(decoded.info.height,5);assert.equal(decoded.info.channels,4);assert.equal(decoded.data.length,7*5*4);
    assert.ok(decoded.data.filter((_,index)=>index%4===3).every(alpha=>alpha===255));
  }
  assert.deepEqual(await readFile(input),before);const after=await lstat(input);
  for(const key of custodyFields)assert.equal(after[key],originalCustody[key],key);
  const encoded=Buffer.from(JSON.stringify(result));
  const manifest=readImageManifestPair(attemptDirectory,{expectedSha256:imageSha(encoded),expectedBytes:encoded.length});
  assert.deepEqual(manifest,encoded);assert.deepEqual(JSON.parse(manifest),result);
  const stage=await lstat(resolve(attemptDirectory,'manifest.stage.json')),published=await lstat(resolve(attemptDirectory,'manifest.json'));
  assert.equal(stage.ino,published.ino);assert.equal(stage.dev,published.dev);assert.equal(stage.nlink,2);assert.equal(published.nlink,2);
  const runtime=result.runtime;
  assert.ok(Number.isInteger(runtime.pid)&&runtime.pid>0);assert.equal(runtime.exit,0);assert.equal(runtime.signal,null);
  assert.equal(runtime.closed,true);assert.equal(runtime.reaped,true);assert.deepEqual(runtime.remainingPids,[]);
  for(const key of ['stdoutBytes','stderrBytes'])assert.ok(Number.isSafeInteger(runtime[key])&&runtime[key]>=0&&runtime[key]<=IMAGE_LIMITS.logBytes);
  // These are actual runtime observations of its owned process group, not OS-wide or hard containment proof.
});
test('native: JPEG/PNG/static WebP, eight asymmetric orientations, alpha and metadata strip',nativeHold,async()=>{
  const {randomUUID}=await import('node:crypto');
  const {readFile,lstat}=await import('node:fs/promises');
  const {createNativeImageFixtures}=await import('./fixtures/media-images.mjs');
  const {processImage}=await import('../cms-api/media-images.mjs');
  const id=randomUUID(),fixtureDirectory=resolve(IMAGE_SCRATCH_ROOT,`parallel-image-01/fixtures-${id}`);
  const fixtures=await createNativeImageFixtures(fixtureDirectory);
  const sharp=(await import('sharp')).default;
  // Independent expected corner permutations, including every EXIF reflection.
  const order={1:[0,1,2,3],2:[1,0,3,2],3:[3,2,1,0],4:[2,3,0,1],5:[0,2,1,3],6:[2,0,3,1],7:[3,1,2,0],8:[1,3,0,2]};
  for(const fixture of fixtures) {
    const input=resolve(fixtureDirectory,fixture.file),before=await readFile(input),custody=await lstat(input),attemptDirectory=resolve(IMAGE_SCRATCH_ROOT,`parallel-image-01/${id}-${fixture.file}`);
    const result=await processImage({input,expectedSha256:fixture.expectedSha256,declaredMime:fixture.declaredMime,attemptDirectory});
    assert.equal(result.outputs.length,3);
    assert.equal(result.ready,false);assert.equal(Object.hasOwn(result,'rightsApproval'),false);
    for(const output of result.outputs) {
      assert.equal(output.width,Math.min(fixture.width,output.targetWidth));
      assert.equal(output.height,Math.round(fixture.height*output.width/fixture.width));
      const bytes=await readFile(resolve(attemptDirectory,output.file));
      assert.equal(imageSha(bytes),output.sha256);assert.equal(bytes.length,output.bytes);
      const meta=await sharp(bytes).metadata();assert.equal(meta.space,'srgb');
      for(const key of ['exif','xmp','iptc','icc','orientation'])assert.equal(meta[key],undefined,key);
      const raw=await sharp(bytes).ensureAlpha().raw().toBuffer();
      if(fixture.alpha) assert.deepEqual([...raw.filter((_,index)=>index%4===3)],fixture.alpha);
      if(fixture.orientation) {
        const coordinates=[[8,8],[fixture.width-9,8],[8,fixture.height-9],[fixture.width-9,fixture.height-9]];
        for(let corner=0;corner<4;corner++) {
          const [x,y]=coordinates[corner],expected=fixture.corners[order[fixture.orientation][corner]];
          for(let channel=0;channel<3;channel++) assert.ok(Math.abs(raw[(y*fixture.width+x)*4+channel]-expected[channel])<40);
        }
      }
    }
    assert.deepEqual(await readFile(input),before);const after=await lstat(input);
    for(const key of ['ino','dev','uid','mode','size','mtimeMs','ctimeMs','nlink']) assert.equal(after[key],custody[key]);
    assert.ok((await lstat(resolve(attemptDirectory,'manifest.json'))).isFile());
    const encoded=Buffer.from(JSON.stringify(result));
    assert.deepEqual(readImageManifestPair(attemptDirectory,{expectedSha256:imageSha(encoded),expectedBytes:encoded.length}),encoded);
  }
});
test('native: malformed/spoof/animation/truncation/caps and cancellation never publish success',nativeHold,async()=>{
  const {randomUUID}=await import('node:crypto');
  const {mkdir,readFile,access}=await import('node:fs/promises');
  const {processImage,writeImageFile,checkImageDirectory}=await import('../cms-api/media-images.mjs');
  const base=resolve(IMAGE_SCRATCH_ROOT,'parallel-image-01');await checkImageDirectory(base);
  const id=randomUUID();
  const invalid=[['malformed.png',structuralPng(),'image/png'],['spoof.png',JPEG_SIGNATURE_ONLY,'image/png'],['truncated.jpeg',JPEG_SIGNATURE_ONLY.subarray(0,-2),'image/jpeg'],['apng.png',structuralPng([pngChunk('acTL',Buffer.alloc(8))]),'image/png'],['animated.webp',structuralWebp([webpChunk('ANIM')]),'image/webp'],['overcap.png',Buffer.alloc(IMAGE_LIMITS.inputBytes+1),'image/png']];
  for(const [file,bytes,declaredMime] of invalid) {
    const directory=resolve(base,`negative-${id}-${file}`);await mkdir(directory,{mode:0o700});
    await writeImageFile(directory,file.replace(/^[^.]+/,'source'),bytes);
    const input=resolve(directory,file.replace(/^[^.]+/,'source')),attemptDirectory=resolve(base,`${id}-${file}`);
    await assert.rejects(processImage({input,declaredMime,expectedSha256:imageSha(bytes),attemptDirectory}));
    await assert.rejects(access(resolve(attemptDirectory,'manifest.json')));
    assert.deepEqual(await readFile(input),bytes);
  }
  const controller=new AbortController();controller.abort();
  await assert.rejects(processImage({...request(),signal:controller.signal}),error=>error.code==='IMAGE_CANCELLED');
});
test('native: cancel during preflight retains original and no success manifest; child start not proved',nativeHold,async()=>{
  const {randomUUID}=await import('node:crypto');
  const {readFile,access}=await import('node:fs/promises');
  const {createNativeImageFixtures}=await import('./fixtures/media-images.mjs');
  const {processImage}=await import('../cms-api/media-images.mjs');
  const id=randomUUID(),directory=resolve(IMAGE_SCRATCH_ROOT,`parallel-image-01/cancel-fixtures-${id}`);
  const fixture=(await createNativeImageFixtures(directory))[0];
  const input=resolve(directory,fixture.file),before=await readFile(input),attemptDirectory=resolve(IMAGE_SCRATCH_ROOT,`parallel-image-01/cancel-${id}`);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25);
  try {await assert.rejects(processImage({input,expectedSha256:fixture.expectedSha256,declaredMime:fixture.declaredMime,attemptDirectory,signal:controller.signal}),error=>error.code==='IMAGE_CANCELLED');}
  finally {clearTimeout(timer);}
  await assert.rejects(access(resolve(attemptDirectory,'manifest.json')));
  assert.deepEqual(await readFile(input),before);
});
