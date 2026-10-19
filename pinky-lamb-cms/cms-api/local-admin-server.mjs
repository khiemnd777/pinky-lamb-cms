import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {existsSync,realpathSync,lstatSync} from 'node:fs';
import express from 'express';
import {ApiError,errorEnvelope} from '../contracts/errors.mjs';

const privatePath=/(?:^|\/)(?:\.[^/]*|cms-api|contracts|scripts|tests|docs|node_modules)(?:\/|$)/i;
export function createBuiltAdminApplication({handleRequest,authHandler,buildRoot}){
 const index=path.join(buildRoot,'index.html');if(!existsSync(index)||realpathSync(buildRoot)!==buildRoot||realpathSync(index)!==index||!lstatSync(index).isFile()||lstatSync(index).nlink!==1)throw Error('Admin build required');
 const app=express();app.disable('x-powered-by');app.disable('etag');app.set('trust proxy',false);app.set('query parser','simple');
 const fail=(res,code)=>{if(res.headersSent){res.destroy();return;}const error=new ApiError(code);res.status(error.status).set({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).json(errorEnvelope(error,randomUUID()));};
 app.use((req,res,next)=>{
  const duplicate=['host','origin','cookie','authorization'].some(name=>req.rawHeaders.filter((_v,i)=>i%2===0&&req.rawHeaders[i].toLowerCase()===name).length>1);
  if(duplicate||req.headers.host!=='127.0.0.1:5273'||!['127.0.0.1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)||req.headers.origin&&req.headers.origin!=='http://127.0.0.1:5273'){fail(res,'FORBIDDEN');return;}
  res.set('X-Content-Type-Options','nosniff');next();
 });
 app.use((req,res,next)=>{
  if(!req.path.startsWith('/api/auth/')){next();return;}
  const route=req.path.slice('/api/auth/'.length),method=req.method;
  if(req.headers.authorization!==undefined){fail(res,'FORBIDDEN');return;}
  if(!((route==='get-session'&&method==='GET')||(['sign-in/email','sign-out'].includes(route)&&method==='POST'))){fail(res,'NOT_FOUND');return;}
  if(method==='POST'&&req.headers.origin!=='http://127.0.0.1:5273'){fail(res,'FORBIDDEN');return;}
  if(method==='POST'&&(!/^application\/json(?:;|$)/i.test(req.headers['content-type']??'')||Number(req.headers['content-length']??0)>4096)){fail(res,'BAD_REQUEST');return;}
  Promise.resolve(authHandler(req,res)).catch(()=>fail(res,'LOCAL_RUNTIME_UNAVAILABLE'));
 });
 app.use('/api',express.raw({type:()=>true,limit:4*1024*1024,inflate:false,verify(req,_res,bytes){req.rawBody=bytes;}}));
 app.use((req,res,next)=>{if(req.path==='/api/cms'||req.path.startsWith('/api/cms/')){req.rawBody??=Buffer.alloc(0);Promise.resolve(handleRequest(req,res)).catch(next);}else next();});
 app.use((req,res,next)=>{
  let decoded=req.path;try{for(let i=0;i<4;i++)decoded=decodeURIComponent(decoded);}catch{fail(res,'BAD_REQUEST');return;}
  if(privatePath.test(decoded.replaceAll('\\','/'))||decoded.split('/').includes('..')||/%[a-f0-9]{2}/i.test(decoded)){fail(res,'NOT_FOUND');return;}
  if(decoded.startsWith('/assets/')){const candidate=path.resolve(buildRoot,'.'+decoded);if(!candidate.startsWith(path.join(buildRoot,'assets')+path.sep)||existsSync(candidate)&&(realpathSync(candidate)!==candidate||lstatSync(candidate).nlink!==1)){fail(res,'NOT_FOUND');return;}}
  if(req.method!=='GET'&&req.method!=='HEAD'){fail(res,'METHOD_NOT_ALLOWED');return;}next();
 });
 app.use('/assets',express.static(path.join(buildRoot,'assets'),{dotfiles:'deny',index:false,fallthrough:false,immutable:true,maxAge:'1y',setHeaders(res){res.setHeader('Cache-Control','public, max-age=31536000, immutable');}}));
 app.use((req,res)=>{if(!['/','/login'].includes(req.path)){fail(res,'NOT_FOUND');return;}res.set('Cache-Control','no-store').sendFile(path.join(buildRoot,'index.html'));});
 app.use((error,_req,res,_next)=>fail(res,error?.status===404?'NOT_FOUND':error?.type==='entity.too.large'?'PAYLOAD_TOO_LARGE':error?.type==='encoding.unsupported'?'UNSUPPORTED_MEDIA_TYPE':error?.type==='entity.parse.failed'||error?.type==='request.aborted'||error?.type==='request.size.invalid'?'BAD_REQUEST':'INTERNAL_ERROR'));
 return app;
}
