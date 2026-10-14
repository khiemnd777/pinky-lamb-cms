// Structural vectors are deliberately not native image/decode evidence.
const PNG = Buffer.from([137,80,78,71,13,10,26,10]);
function crc32(bytes) {
  let crc=0xffffffff;
  for(const byte of bytes) {crc^=byte;for(let bit=0;bit<8;bit++) crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  return (crc^0xffffffff)>>>0;
}
export function pngChunk(type,data=Buffer.alloc(0)) {
  const value=Buffer.alloc(data.length+12);value.writeUInt32BE(data.length);value.write(type,4,'ascii');data.copy(value,8);
  value.writeUInt32BE(crc32(value.subarray(4,-4)),value.length-4);return value;
}
export function structuralPng(extra=[]) {
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(1);ihdr.writeUInt32BE(1,4);ihdr[8]=8;ihdr[9]=6;
  return Buffer.concat([PNG,pngChunk('IHDR',ihdr),...extra,pngChunk('IDAT',Buffer.from([1])),pngChunk('IEND')]);
}
export function webpChunk(type,data=Buffer.from([0])) {
  const value=Buffer.alloc(8+data.length+(data.length&1));value.write(type,0,'ascii');value.writeUInt32LE(data.length,4);data.copy(value,8);return value;
}
export function structuralWebp(chunks=[webpChunk('VP8L')]) {
  const body=Buffer.concat(chunks),head=Buffer.alloc(12);head.write('RIFF');head.writeUInt32LE(body.length+4,4);head.write('WEBP',8);
  return Buffer.concat([head,body]);
}
export const JPEG_SIGNATURE_ONLY=Buffer.from([255,216,255,224,0,2,255,217]);

/** Future native fixture builder; never called by pure tests. Frozen COMMON+IMAGE gate is mandatory. */
export async function createNativeImageFixtures(directory,selection='ALL') {
  if(!['ALL','JPEG_FIRST'].includes(selection)) throw new Error('FIXTURE_SELECTION');
  const {verifyMediaTools}=await import('../../scripts/media-tool-audit.mjs');
  await verifyMediaTools('IMAGE');
  const {checkImageDirectory,writeImageFile,imageSha,IMAGE_SCRATCH_ROOT,imageOwnedPath,imageActive}=await import('../../cms-api/media-images.mjs');
  const {dirname}=await import('node:path');
  const {mkdir}=await import('node:fs/promises');
  if(!imageOwnedPath(directory)||!directory.startsWith(`${IMAGE_SCRATCH_ROOT}/parallel-image-01/`)) throw new Error('FIXTURE_NAMESPACE');
  await checkImageDirectory(dirname(directory));
  await mkdir(directory,{mode:0o700});await checkImageDirectory(directory);
  const deadline=Date.now()+30000;
  const sharp=(await import('sharp')).default;
  sharp.concurrency(2);sharp.cache(false);
  const fixtures=[];let bytes=0;
  async function save(file,data,details) {
    bytes+=data.length;if(bytes>4*1024**2)throw new Error('FIXTURE_BUDGET');imageActive(deadline);
    await writeImageFile(directory,file,data);
    fixtures.push({file,expectedSha256:imageSha(data),...details});
  }
  for(const format of selection==='JPEG_FIRST'?['jpeg']:['jpeg','png','webp']) {
    const data=await sharp({create:{width:7,height:5,channels:4,background:{r:200,g:50,b:10,alpha:0.5}}})[format]().toBuffer();
    await save(`source.${format}`,data,{declaredMime:format==='jpeg'?'image/jpeg':`image/${format}`,width:7,height:5});
  }
  if(selection==='JPEG_FIRST') return fixtures;
  await save('resize.png',await sharp({create:{width:2000,height:1000,channels:3,background:{r:60,g:120,b:200}}}).png().toBuffer(),{declaredMime:'image/png',width:2000,height:1000,resize:true});
  const width=96,height=64,pixels=Buffer.alloc(width*height*3),corners=[[230,20,20],[20,230,20],[20,20,230],[230,230,20]];
  for(let y=0;y<height;y++) for(let x=0;x<width;x++) {
    const color=corners[(y>=height/2?2:0)+(x>=width/2?1:0)];for(let channel=0;channel<3;channel++)pixels[(y*width+x)*3+channel]=color[channel];
  }
  for(let orientation=1;orientation<=8;orientation++) {
    const data=await sharp(pixels,{raw:{width,height,channels:3}}).withMetadata({orientation}).withExifMerge({IFD0:{Artist:'private fixture'}}).withXmp('<x:xmpmeta xmlns:x="adobe:ns:meta/">private fixture</x:xmpmeta>').jpeg({quality:95}).toBuffer();
    await save(`orientation-${orientation}.jpeg`,data,{declaredMime:'image/jpeg',orientation,width:orientation>=5?height:width,height:orientation>=5?width:height,corners});
  }
  const alpha=Buffer.alloc(12*8*4);
  for(let pixel=0;pixel<96;pixel++) {alpha[pixel*4]=60;alpha[pixel*4+1]=120;alpha[pixel*4+2]=200;alpha[pixel*4+3]=(pixel%12)*20;}
  await save('alpha.png',await sharp(alpha,{raw:{width:12,height:8,channels:4}}).png().toBuffer(),{declaredMime:'image/png',width:12,height:8,alpha:[...alpha.filter((_,index)=>index%4===3)]});
  return fixtures;
}
