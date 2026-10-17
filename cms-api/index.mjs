import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { validateRuntime,installNetworkFence,installLocalHttpParser } from '../scripts/local-guard.mjs';
import {validateLocalDataRuntime,installLocalDataNetworkFence} from '../scripts/local-data-guard.mjs';
import {ApiError,errorEnvelope} from '../contracts/errors.mjs';
// Fail before loading a Firebase SDK if the approved local boundary is absent.
const durable=process.env.PINKY_LOCAL_DATA_MODE==='durable';
if(durable){validateLocalDataRuntime();installLocalDataNetworkFence();}
else{validateRuntime(process.env,undefined,{server:true});installNetworkFence();process.env.METADATA_SERVER_DETECTION='none';installLocalHttpParser();}
const onRequest=durable?null:createRequire(import.meta.url)('firebase-functions/v2/https').onRequest;
export async function handleRequest(request,response) {
  response.set('Cache-Control','no-store');response.set('X-Content-Type-Options','nosniff');
  try {if(durable)validateLocalDataRuntime();else validateRuntime(process.env,undefined,{server:true});} catch {
    response.status(503).json({error:{code:'LOCAL_RUNTIME_UNAVAILABLE',message:'Môi trường local chưa sẵn sàng.',correlationId:randomUUID()}});return;
  }
  if(request.headers.origin && request.headers.origin!=='http://127.0.0.1:5273') {
    response.status(403).json({error:{code:'FORBIDDEN',message:'Không có quyền truy cập.',correlationId:randomUUID()}});return;
  }
  const correlationId=randomUUID();
  const unavailable=()=>response.status(503).json({error:{code:'LOCAL_RUNTIME_UNAVAILABLE',message:'CMS đang được chuẩn bị.',correlationId}});
  const authUrl=new URL('./authorization.mjs',import.meta.url);
  if(!existsSync(fileURLToPath(authUrl))) {unavailable();return;}
  try {
    const {authorize}=await import(authUrl.href);
    const pathname=request.path ?? new URL(request.url,'http://127.0.0.1').pathname;
    let actor=await authorize(request,'MEMBER_READ');
    const routesUrl=new URL('./routes.mjs',import.meta.url);
    if(!existsSync(fileURLToPath(routesUrl))){
      if(request.method==='GET' && pathname==='/api/cms/session'){
        if(Object.keys(request.query??{}).length || request.rawBody?.byteLength)throw new ApiError('BAD_REQUEST');
        response.status(200).json({uid:actor.uid,role:actor.role,isActive:true,authzVersion:actor.authzVersion});return;
      }
      unavailable();return;
    }
    const {dispatchRequest,routeDefinition}=await import(routesUrl.href);
    const route=routeDefinition(pathname);
    if(route.methods.includes(request.method)){
      const siteV3Action={SITE_V3_IMPORT:'SITE_IMPORT',SITE_V3_SUBMIT:'SNAPSHOT_SUBMIT',SITE_V3_REVIEW:'SNAPSHOT_REVIEW',SITE_V3_SOURCE_CHECK:'SOURCE_CHECK',SITE_V3_DRAFT_PREVIEW:'MEMBER_READ'}[route.kind]??(route.kind==='SITE_V3_DRAFT'&&request.method==='PATCH'?'DRAFT_SAVE':null);
      const action=siteV3Action??(route.kind==='MEDIA_ARCHIVE'||route.kind.startsWith('MEDIA_UPLOAD')?'MEDIA_UPLOAD':route.kind==='MEDIA_RETRY'?'MEDIA_RETRY':route.kind==='MEDIA_JOB_READ'||route.kind.startsWith('MEDIA_READ')?'MEMBER_READ':route.kind==='SITE_IMPORT'?'SITE_IMPORT':(route.kind==='DRAFT' || route.kind==='SITE_DRAFT') && request.method==='PATCH'?'DRAFT_SAVE':route.kind==='SUBMIT'?'SNAPSHOT_SUBMIT':route.kind==='REVIEW'?'SNAPSHOT_REVIEW':route.kind==='SOURCE_CHECK'?'SOURCE_CHECK':'MEMBER_READ');
      if(action!=='MEMBER_READ')actor=await authorize(request,action);
    }
    await dispatchRequest(request,response,actor,correlationId);
  } catch(error) {
    if(!(error instanceof ApiError))console.warn('CMS_REQUEST_FAILED',{correlationId,name:error?.name,code:error?.code,frames:String(error?.stack??'').split('\n').filter(line=>line.trimStart().startsWith('at ')).slice(0,6)});
    const safe=error instanceof ApiError?error:new ApiError('INTERNAL_ERROR');
    response.status(safe.status).json(errorEnvelope(safe,correlationId));
  }
}
export const cmsApi=durable?null:onRequest({region:'us-central1',cors:false,timeoutSeconds:900,memory:'1GiB'},handleRequest);
