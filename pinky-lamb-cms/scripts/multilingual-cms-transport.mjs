import {z} from 'zod';
import {digest} from './multilingual-release-files.mjs';

export async function readMultilingualSession(input=process.stdin){
  if(input.isTTY)throw Error('Supply private session JSON through stdin; never put credentials in arguments');
  let text='';for await(const chunk of input){text+=chunk;if(Buffer.byteLength(text)>16384)throw Error('Session input too large');}
  return z.strictObject({token:z.string().min(20).max(8192).refine(value=>!/[\r\n]/.test(value)),approval:z.unknown().optional()}).parse(JSON.parse(text));
}

/** The canonical API is hosted by the current Admin application; retained Functions may have older loaded modules. */
export function createMultilingualReleaseReader(sessionProvider,{fetchLocal=fetch}={}){
  async function read(route,{mimeType,cap}){
    const token=await sessionProvider();
    if(typeof token!=='string'||token.length<20||token.length>8192||/[\r\n]/.test(token))throw Error('Invalid in-memory local session');
    const response=await fetchLocal('http://127.0.0.1:5273'+route,{method:'GET',redirect:'error',signal:AbortSignal.timeout(30000),
      headers:{Origin:'http://127.0.0.1:5273',Authorization:'Bearer '+token}});
    if(!response.ok||!response.body)throw Error('Authenticated release resource unavailable');
    if(response.headers.get('content-type')?.split(';')[0]!==mimeType)throw Error('Release response MIME mismatch');
    const declared=response.headers.get('content-length');if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>cap))throw Error('Release response exceeds byte budget');
    const reader=response.body.getReader(),chunks=[];let size=0;
    try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>cap)throw Error('Release response exceeds byte budget');chunks.push(Buffer.from(part.value));}return Buffer.concat(chunks,size);}
    finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
  }
  return {
    async release(){const bytes=await read('/api/cms/localizations/editorial/release',{mimeType:'application/json',cap:12*1048576}),value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));return value.data??value;},
    async resource(descriptor){
      // Descriptor URLs are immutable QA metadata. Fetch only their validated path on the current Admin origin.
      const url=new URL(descriptor.url),match=/^\/api\/cms\/media\/([A-Za-z0-9_-]{1,100})\/derivatives\/([A-Za-z0-9][A-Za-z0-9_-]{0,127})$/.exec(url.pathname);
      if(url.origin!=='http://127.0.0.1:5173'||url.search||url.hash||!match||!descriptor.derivative||descriptor.derivative.key!==match[2]||(descriptor.assetId??descriptor.id)!==match[1]||descriptor.derivative.sha256!==descriptor.sha256||descriptor.derivative.bytes!==descriptor.sizeBytes||descriptor.derivative.mime!==descriptor.mimeType||!Number.isSafeInteger(descriptor.sizeBytes)||descriptor.sizeBytes<1||descriptor.sizeBytes>64*1048576)throw Error('Invalid authenticated release resource');
      const bytes=await read(url.pathname,{mimeType:descriptor.mimeType,cap:descriptor.sizeBytes});
      if(bytes.length!==descriptor.sizeBytes||digest(bytes)!==descriptor.sha256)throw Error('Release resource bytes changed');
      return bytes;
    },
  };
}
