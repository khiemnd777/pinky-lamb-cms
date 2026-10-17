import fs from 'node:fs';
import path from 'node:path';
import {createServer} from 'node:http';
import {ROOT,validateLocalDataRuntime,installLocalDataNetworkFence} from './local-data-guard.mjs';

const PUBLIC=path.join(ROOT,'public-baseline');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.woff':'font/woff','.woff2':'font/woff2','.ico':'image/x-icon','.txt':'text/plain; charset=utf-8'};
export function createPublicBaselineServer(){
 validateLocalDataRuntime();installLocalDataNetworkFence();
 if(fs.realpathSync(PUBLIC)!==PUBLIC)throw Error('Public source path changed');
 return createServer((request,response)=>{
  response.setHeader('X-Content-Type-Options','nosniff');response.setHeader('Cache-Control','no-store');
  if(request.headers.host!=='127.0.0.1:5010'||!['127.0.0.1','::ffff:127.0.0.1'].includes(request.socket.remoteAddress)){response.writeHead(403).end();return;}
  if(!['GET','HEAD'].includes(request.method)){response.writeHead(405).end();return;}
  let pathname;try{pathname=new URL(request.url,'http://127.0.0.1:5010').pathname;pathname=decodeURIComponent(pathname);}catch{response.writeHead(400).end();return;}
  if(pathname==='/'||/^\/(?:en|vi|ja)\/?$/.test(pathname))pathname='/index.html';
  if(!/^\/[A-Za-z0-9_./-]+$/.test(pathname)||pathname.split('/').includes('..')||pathname.split('/').some(part=>part.startsWith('.'))){response.writeHead(403).end();return;}
  const target=path.join(PUBLIC,pathname),mime=types[path.extname(target).toLowerCase()];
  if(!mime||!target.startsWith(PUBLIC+path.sep)){response.writeHead(404).end();return;}
  if(pathname==='/index.html')response.setHeader('Access-Control-Allow-Origin','http://127.0.0.1:5273');
  else if(pathname.startsWith('/assets/'))response.setHeader('Access-Control-Allow-Origin','*');
  try{
   const stat=fs.lstatSync(target);
   if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||fs.realpathSync(target)!==target){response.writeHead(404).end();return;}
   response.setHeader('Content-Type',mime);response.setHeader('Content-Length',stat.size);
   if(request.method==='HEAD'){response.writeHead(200).end();return;}
   const stream=fs.createReadStream(target,{flags:fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW});stream.on('error',()=>response.destroy());stream.pipe(response);
  }catch{response.writeHead(404).end();}
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){
 if(process.argv.length!==2)throw Error('Unexpected public server arguments');
 const server=createPublicBaselineServer();server.listen({host:'127.0.0.1',port:5010,exclusive:true},()=>console.log('PUBLIC_BASELINE: http://127.0.0.1:5010/'));
}
