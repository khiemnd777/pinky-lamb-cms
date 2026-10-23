import {unzipSync,strFromU8} from 'fflate';
export const FILE_MIMES=Object.freeze({PDF:'application/pdf',JPEG:'image/jpeg',PNG:'image/png',WEBP:'image/webp',DOC:'application/msword',DOCX:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',XLS:'application/vnd.ms-excel',XLSX:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
export const FILE_CAP=25*1048576;
const invalid=()=>{throw Error('FILE_TYPE');};
const ascii=(b,start,end)=>String.fromCharCode(...b.subarray(start,end));
function zipOffice(bytes){
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let end=-1;
 for(let p=bytes.length-22;p>=Math.max(0,bytes.length-65557);p--)if(v.getUint32(p,true)===0x06054b50&&p+22+v.getUint16(p+20,true)===bytes.length){end=p;break;}
 if(end<0||v.getUint16(end+4,true)||v.getUint16(end+6,true))invalid();
 const count=v.getUint16(end+10,true),offset=v.getUint32(end+16,true),length=v.getUint32(end+12,true);
 if(!count||count>2048||offset+length!==end)invalid();let cursor=offset,expanded=0;const names=new Set();
 for(let i=0;i<count;i++){
  if(cursor+46>end||v.getUint32(cursor,true)!==0x02014b50)invalid();
  const flags=v.getUint16(cursor+8,true),method=v.getUint16(cursor+10,true),size=v.getUint32(cursor+24,true),n=v.getUint16(cursor+28,true),extra=v.getUint16(cursor+30,true),comment=v.getUint16(cursor+32,true),local=v.getUint32(cursor+42,true);
  if(flags&1||![0,8].includes(method)||local+30>offset||v.getUint32(local,true)!==0x04034b50)invalid();
  const name=new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(cursor+46,cursor+46+n));
  if(!name||name.includes('\\')||name.startsWith('/')||name.split('/').some(p=>p==='..'||p==='.')||name.split('/').length>16||names.has(name)||/vbaproject|encryptedpackage|encryptioninfo/i.test(name))invalid();
  names.add(name);expanded+=size;if(expanded>64*1048576||size>32*1048576||name==='[Content_Types].xml'&&size>1048576)invalid();cursor+=46+n+extra+comment;
 }
 if(cursor!==end||!names.has('[Content_Types].xml'))invalid();
 const word=names.has('word/document.xml'),excel=names.has('xl/workbook.xml');if(word===excel)invalid();
 const files=unzipSync(bytes,{filter:f=>f.name==='[Content_Types].xml'}),types=strFromU8(files['[Content_Types].xml']??new Uint8Array());
 if(/macroenabled|<!DOCTYPE|<!ENTITY/i.test(types))invalid();
 const expected=word?'wordprocessingml.document':'spreadsheetml.sheet';if(!types.includes(`application/vnd.openxmlformats-officedocument.${expected}.main+xml`))invalid();
 return word?'DOCX':'XLSX';
}
// Bounded CFB metadata and stream signatures; never execute or render Office content.
function compoundOffice(bytes){
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.length);if(bytes.length<1536||v.getUint16(28,true)!==0xfffe)invalid();
 const shift=v.getUint16(30,true);if(![9,12].includes(shift)||v.getUint16(26,true)!==(shift===9?3:4)||v.getUint16(32,true)!==6||v.getUint32(56,true)!==4096||bytes.length%(2**shift))invalid();const sector=2**shift,max=Math.floor(bytes.length/sector)-2;
 const readSector=id=>{if(id>max||id<0)invalid();return (id+1)*sector;};
 const fatIds=[];for(let p=76;p<512;p+=4){const id=v.getUint32(p,true);if(id!==0xffffffff)fatIds.push(id);}
 let difat=v.getUint32(68,true);const seenDifat=new Set();
 for(let i=0;i<v.getUint32(72,true);i++){if(i>=512||seenDifat.has(difat))invalid();seenDifat.add(difat);const p=readSector(difat);for(let q=0;q<sector-4;q+=4){const id=v.getUint32(p+q,true);if(id!==0xffffffff)fatIds.push(id);}difat=v.getUint32(p+sector-4,true);}
 if(fatIds.length!==v.getUint32(44,true)||fatIds.length>1024||new Set(fatIds).size!==fatIds.length)invalid();
 const next=id=>{const index=Math.floor(id/(sector/4));if(index>=fatIds.length)invalid();return v.getUint32(readSector(fatIds[index])+(id%(sector/4))*4,true);};
 const names=new Set(),streams=new Map(),seen=new Set();let root,id=v.getUint32(48,true);
 while(id!==0xfffffffe){if(seen.has(id)||seen.size>2048)invalid();seen.add(id);const p=readSector(id);for(let q=0;q<sector;q+=128){const len=v.getUint16(p+q+64,true),type=bytes[p+q+66];if(!type)continue;if(len<2||len>64||len%2)invalid();const name=new TextDecoder('utf-16le',{fatal:true}).decode(bytes.subarray(p+q,p+q+len-2));if(![1,2,5].includes(type)||v.getUint16(p+q+len-2,true)!==0)invalid();names.add(name);const entry={start:v.getUint32(p+q+116,true),size:Number(v.getBigUint64(p+q+120,true))};if(!Number.isSafeInteger(entry.size)||entry.size>bytes.length)invalid();if(type===5){if(root)invalid();root=entry;}if(type===2){if(streams.has(name))invalid();streams.set(name,entry);}}id=next(id);}
 if(!root||names.has('EncryptedPackage')||names.has('EncryptionInfo'))invalid();const word=streams.has('WordDocument')&&(streams.has('0Table')||streams.has('1Table')),excel=streams.has('Workbook')||streams.has('Book');if(word===excel)invalid();
 const chain=(start,size,unit,getNext,getBytes)=>{if(!Number.isSafeInteger(size)||size<0||size>bytes.length)invalid();if(!size)return new Uint8Array();const out=new Uint8Array(size),visited=new Set();let id=start,pos=0;while(pos<size){if(visited.has(id)||visited.size>Math.ceil(bytes.length/unit))invalid();visited.add(id);const part=getBytes(id),take=Math.min(unit,size-pos);out.set(part.subarray(0,take),pos);pos+=take;id=getNext(id);}if(id!==0xfffffffe)invalid();return out;};
 const regular=(start,size)=>chain(start,size,sector,next,id=>bytes.subarray(readSector(id),readSector(id)+sector));
 let miniFat,miniStream;const stream=name=>{const entry=streams.get(name);if(!entry)invalid();if(entry.size>=4096)return regular(entry.start,entry.size);miniFat??=regular(v.getUint32(60,true),v.getUint32(64,true)*sector);miniStream??=regular(root.start,root.size);const mv=new DataView(miniFat.buffer);return chain(entry.start,entry.size,64,id=>{if(id*4+4>miniFat.length)invalid();return mv.getUint32(id*4,true);},id=>{if(id*64+64>miniStream.length)invalid();return miniStream.subarray(id*64,id*64+64);});};
 if(word){const data=stream('WordDocument'),dv=new DataView(data.buffer);if(data.length<32||dv.getUint16(0,true)!==0xa5ec||dv.getUint16(10,true)&0x0100)invalid();stream(dv.getUint16(10,true)&0x0200?'1Table':'0Table');return 'DOC';}
 const data=stream(streams.has('Workbook')?'Workbook':'Book'),dv=new DataView(data.buffer);if(data.length<8||dv.getUint16(0,true)!==0x0809||![0x0500,0x0600].includes(dv.getUint16(4,true))||dv.getUint16(6,true)!==5)invalid();
 for(let p=0,count=0;p<data.length;count++){if(count>1000000||p+4>data.length)invalid();const record=dv.getUint16(p,true),length=dv.getUint16(p+2,true);if(record===0x002f||p+4+length>data.length)invalid();p+=4+length;if(record===0x000a)return 'XLS';}invalid();
}
export function imageGeometry(bytes,format){
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let width,height;
 if(format==='PNG'){if(bytes.length<33||ascii(bytes,12,16)!=='IHDR'||v.getUint32(8)!==13)invalid();width=v.getUint32(16);height=v.getUint32(20);}
 else if(format==='JPEG'){let p=2;while(p+8<bytes.length){if(bytes[p++]!==255)invalid();while(bytes[p]===255)p++;const marker=bytes[p++];if(marker===0xda||marker===0xd9)break;const size=v.getUint16(p);if(size<2||p+size>bytes.length)invalid();if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)){height=v.getUint16(p+3);width=v.getUint16(p+5);break;}p+=size;}}
 else{let p=12;for(let count=0;p+8<=bytes.length&&count<2048;count++){const chunk=ascii(bytes,p,p+4),size=v.getUint32(p+4,true),d=p+8;if(d+size>bytes.length)invalid();if(chunk==='VP8X'&&size>=10){width=1+bytes[d+4]+(bytes[d+5]<<8)+(bytes[d+6]<<16);height=1+bytes[d+7]+(bytes[d+8]<<8)+(bytes[d+9]<<16);break;}if(chunk==='VP8L'&&size>=5&&bytes[d]===47){width=1+bytes[d+1]+((bytes[d+2]&63)<<8);height=1+(bytes[d+2]>>6)+(bytes[d+3]<<2)+((bytes[d+4]&15)<<10);break;}if(chunk==='VP8 '&&size>=10&&ascii(bytes,d+3,d+6)==='\x9d\x01\x2a'){width=v.getUint16(d+6,true)&16383;height=v.getUint16(d+8,true)&16383;break;}p=d+size+(size%2);}}
 if(!width||!height||width>8192||height>8192||width*height>40000000)throw Error('IMAGE_SIZE');return {width,height};
}
export function detectFile(input,{maxBytes=FILE_CAP,maxImageBytes=10*1048576}={}){
 const bytes=input instanceof Uint8Array?input:new Uint8Array(input);if(!bytes.length||bytes.length>maxBytes)throw Error('FILE_SIZE');let format;
 if(ascii(bytes,0,5)==='%PDF-')format='PDF';
 else if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)format='JPEG';
 else if(bytes.length>=8&&[137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b))format='PNG';
 else if(ascii(bytes,0,4)==='RIFF'&&ascii(bytes,8,12)==='WEBP')format='WEBP';
 else if(ascii(bytes,0,2)==='PK')format=zipOffice(bytes);
 else if([208,207,17,224,161,177,26,225].every((b,i)=>bytes[i]===b))format=compoundOffice(bytes);
 else invalid();
 const kind=['JPEG','PNG','WEBP'].includes(format)?'IMAGE':format==='PDF'?'PDF':format.startsWith('DOC')?'WORD':'EXCEL';if(kind==='IMAGE'&&bytes.length>maxImageBytes)throw Error('FILE_SIZE');
 if(kind==='IMAGE')imageGeometry(bytes,format);
 return {kind,format,mimeType:FILE_MIMES[format],disposition:['IMAGE','PDF'].includes(kind)?'READER':'DOWNLOAD'};
}
export function safeDownloadName(name,format){const base=String(name).split(/[\\/]/).at(-1).replace(/[\u0000-\u001f\u007f]/g,'').replace(/\.[^.]*$/,'').replace(/[^\p{L}\p{N} _.-]/gu,'').replace(/^\.+/,'').trim().slice(0,100)||'Pinky-Lamb';return base+'.'+format.toLowerCase().replace('jpeg','jpg');}
export function validateExternalUrl(value,hosts){
 try{const u=new URL(value);if(u.href!==value||u.protocol!=='https:'||u.port||u.username||u.password||u.search||u.hash||!hosts.includes(u.hostname)||!/^([a-z0-9-]+\.)+[a-z][a-z0-9-]+$/.test(u.hostname)||/(^|\.)(localhost|local|internal|test|lan)$/.test(u.hostname))throw Error();return u.href;}catch{throw Error('FILE_URL');}
}
export async function sha256(bytes){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');}
export async function readBoundedResponse(response,{limit=FILE_CAP,signal}={}){
 if(!response.ok||!response.body||response.redirected)throw Error('FILE_READ');const declared=Number(response.headers.get('content-length'));if(Number.isFinite(declared)&&declared>limit)throw Error('FILE_SIZE');
 const reader=response.body.getReader(),parts=[];let total=0;try{while(true){signal?.throwIfAborted();const part=await reader.read();if(part.done)break;total+=part.value.length;if(total>limit)throw Error('FILE_SIZE');parts.push(part.value);}const out=new Uint8Array(total);let p=0;for(const part of parts){out.set(part,p);p+=part.length;}return out;}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
export async function fetchExternalFile(url,{hosts,signal,fetcher=fetch}={}){
 validateExternalUrl(url,hosts);const timeout=AbortSignal.timeout(30000),combined=signal?AbortSignal.any([signal,timeout]):timeout;
 const response=await fetcher(url,{signal:combined,credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',cache:'no-store'}),bytes=await readBoundedResponse(response,{signal:combined}),detected=detectFile(bytes),mime=response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
 if(mime&&mime!=='application/octet-stream'&&mime!==detected.mimeType)throw Error('FILE_MIME');return {bytes,...detected,sha256:await sha256(bytes),sizeBytes:bytes.length};
}
