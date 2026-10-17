import {createContentLocaleSession} from './content-locale-session.mjs';
import {authFailureAction,persistenceHierarchy,rememberingAvailable} from './auth-session.mjs';
import {mountCmsShell} from './cms-shell.mjs';
import {closePinkySelects,disposePinkySelects} from './pinky-select.mjs';
import {mediaDerivativePublicSchema} from '../contracts/media-read-public.mjs';
import {assertLocalOrigin,firebaseConfig,LOCAL,RECOVERY_READ_ONLY} from './config-local.mjs';
import {TEMPLATE_VERSION as HERO_TEMPLATE_VERSION} from '../preview/hero-renderer.mjs';
import {resourceIdSchema,hashSchema,revisionSchema} from '../contracts/hero.mjs';
import {sourceCheckCursorSchema,sourceCheckQuerySchema} from '../contracts/source-checks.mjs';
assertLocalOrigin();
document.getElementById('login-panel').hidden=true;document.getElementById('login-submit').disabled=true;
document.documentElement.dataset.cmsAuthState='INITIALIZING';
const durable=typeof __PINKY_LOCAL_DATA_DURABLE__!=='undefined'&&__PINKY_LOCAL_DATA_DURABLE__===true;
let auth,signInWithEmailAndPassword,signOut,onAuthStateChanged;
if(durable){({auth,signInWithEmailAndPassword,signOut,onAuthStateChanged}=(await import('./local-auth-client.mjs')).createLocalAuthClient());}
else{
 const {initializeApp}=await import('firebase/app');const sdk=await import('firebase/auth');
 ({signInWithEmailAndPassword,signOut,onAuthStateChanged}=sdk);
 const app=initializeApp(firebaseConfig,{name:'cms-browser-local',automaticDataCollectionEnabled:false});
 auth=sdk.initializeAuth(app,{persistence:persistenceHierarchy(sdk)});
 sdk.connectAuthEmulator(auth,LOCAL.auth,{disableWarnings:true});
}
const canRemember=durable||await rememberingAvailable();
await auth.authStateReady();
document.documentElement.dataset.cmsAuthPersistence=canRemember?'LOCAL_AVAILABLE':'MEMORY_ONLY';
const element=id=>document.getElementById(id);
const pending=new Set();const objectUrls=new Set();
let generation=0;let resourceGeneration=0;let session=null;let contentLocaleSession=null;let editor=null;let review=null;
const shell=mountCmsShell(document,{onResource:selectResource,closePopups:closePinkySelects,recoveryReadOnly:RECOVERY_READ_ONLY});
if(RECOVERY_READ_ONLY){
 const banner=document.createElement('p');banner.id='recovery-read-only';banner.className='card';banner.setAttribute('role','status');banner.textContent='Khôi phục — chỉ xem';element('session-panel').prepend(banner);
}
const accessError='Không thể truy cập nội dung. Vui lòng kiểm tra quyền hoặc đăng nhập lại.';
function announce(message){element('status').textContent=message;}
const retryMessage='Chưa thể xác minh quyền truy cập. Vui lòng tải lại để thử kết nối; không cần nhập lại mật khẩu.';
function holdIdentity(message=retryMessage){clearPrivate();element('login-panel').hidden=Boolean(auth.currentUser);element('logout').hidden=!auth.currentUser;document.documentElement.dataset.cmsAuthState='RETRY_REQUIRED';announce(message);}
function clearPrivate(){
 contentLocaleSession?.destroy();contentLocaleSession=null;
 closePinkySelects();shell.setSession(null);
 editor?.destroy();editor=null;review?.destroy();review=null;disposePinkySelects(element('private-content'));generation++;resourceGeneration++;session=null;for(const controller of pending)controller.abort();pending.clear();
 for(const url of objectUrls)URL.revokeObjectURL(url);objectUrls.clear();
 element('private-content').replaceChildren();for(const frame of document.querySelectorAll('iframe')){frame.removeAttribute('srcdoc');frame.hidden=true;}
 element('session-panel').hidden=true;element('session-role').textContent='';
 document.dispatchEvent(new CustomEvent('cms:session',{detail:null}));
}
async function endSession(message=accessError){clearPrivate();document.documentElement.dataset.cmsAuthState='LOGIN_REQUIRED';announce(message);element('login-panel').hidden=false;element('logout').hidden=true;element('login-submit').disabled=false;await signOut(auth);}
export function getSession(){return session?{...session}:null;}
export function registerObjectUrl(url){objectUrls.add(url);}
/** An opaque cursor must use the same canonical base64url/UTF-8 format as
 * the server. This check grants no resource access or evidence authority. */
function validSourceCursor(value){
 if(!value || value.length>2048 || !/^[A-Za-z0-9_-]+$/.test(value) || value.length%4===1)return false;
 try{
  const raw=atob(value.replaceAll('-','+').replaceAll('_','/')+'='.repeat((4-value.length%4)%4));
  if(btoa(raw).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')!==value)return false;
  const text=new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(raw,character=>character.charCodeAt(0)));
  const parsed=sourceCheckCursorSchema.parse(JSON.parse(text));return JSON.stringify(parsed)===text;
 }catch{return false;}
}
export function isAllowedSourceCheckRequest(path,method){
 if(typeof path!=='string')return false;
 if(path==='/api/cms/source-checks')return method==='POST';
 const match=/^\/api\/cms\/snapshots\/([A-Za-z0-9_-]{1,128})\/source-checks(?:\?([^#]+))?$/.exec(path);
 if(method!=='GET' || !match)return false;
 if(match[2]===undefined)return true;
 const query=new URLSearchParams(match[2]),keys=[...query.keys()];
 if(!keys.length || new Set(keys).size!==keys.length || keys.some(key=>!['cursor','pageSize'].includes(key)))return false;
 if(query.has('pageSize') && (!/^(?:[1-9]|[1-4][0-9]|50)$/.test(query.get('pageSize'))))return false;
 return !query.has('cursor') || validSourceCursor(query.get('cursor'));
}
/** Closed same-origin media transport; this grants no server authorization. */
export function isAllowedMediaRequest(path,method){
 if(typeof path!=='string'||path.length>4096||!path.startsWith('/api/cms/media')||path.includes('#'))return false;
 const url=new URL(path,'http://127.0.0.1:5273');
 if(method==='GET'){
  if(/^\/api\/cms\/media\/jobs\/[A-Za-z0-9_-]{1,128}$/.test(url.pathname))return !url.search;
  if(url.pathname==='/api/cms/media'){const keys=[...url.searchParams.keys()];if(new Set(keys).size!==keys.length||keys.some(k=>!['kind','status','pageSize','cursor'].includes(k)))return false;const kind=url.searchParams.get('kind');if(kind!==null&&!['IMAGE','PDF','VIDEO'].includes(kind))return false;const status=url.searchParams.get('status');if(status!==null&&!['ALL','QUEUED','PROCESSING','READY','REJECTED','RECOVERY_REQUIRED'].includes(status))return false;const page=url.searchParams.get('pageSize');if(page!==null&&!/^(?:[1-9]|[1-4][0-9]|50)$/.test(page))return false;const cursor=url.searchParams.get('cursor');return cursor===null||/^[A-Za-z0-9_-]{1,2048}$/.test(cursor);}
  return !url.search&&/^\/api\/cms\/media\/[A-Za-z0-9_-]{1,100}(?:\/derivatives\/[A-Za-z0-9][A-Za-z0-9_-]{0,127})?$/.test(url.pathname);
 }
 if(url.search)return false;
 if(/^\/api\/cms\/media\/[A-Za-z0-9_-]{1,100}\/archive$/.test(url.pathname))return method==='POST';
 if(url.pathname==='/api/cms/media/uploads')return method==='POST';
 if(/^\/api\/cms\/media\/uploads\/[A-Za-z0-9_-]{1,128}\/parts\/(?:0|[1-9]|[12][0-9]|3[01])$/.test(url.pathname))return method==='PUT';
 return method==='POST'&&/^\/api\/cms\/media\/(?:uploads\/[A-Za-z0-9_-]{1,128}\/(?:complete|cancel)|jobs\/[A-Za-z0-9_-]{1,128}\/retry)$/.test(url.pathname);
}
/** V3 source cursors use the actual five-field server shape; M2 keeps its own schema. */
function validMediaSiteSourceCursor(value,snapshotId){
 if(!value||value.length>2048||!/^[A-Za-z0-9_-]+$/.test(value)||value.length%4===1)return false;
 try{sourceCheckQuerySchema.parse({cursor:value});const raw=atob(value.replaceAll('-','+').replaceAll('_','/')+'='.repeat((4-value.length%4)%4));if(btoa(raw).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')!==value)return false;const text=new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(raw,c=>c.charCodeAt(0))),cursor=JSON.parse(text);if(Object.keys(cursor).sort().join(',')!=='contentHash,lastId,snapshotId,sourceRevision,view'||cursor.snapshotId!==snapshotId||!['ACTIVE','APPROVED'].includes(cursor.view))return false;resourceIdSchema.parse(cursor.snapshotId);resourceIdSchema.parse(cursor.lastId);hashSchema.parse(cursor.contentHash);revisionSchema.parse(cursor.sourceRevision);return JSON.stringify(cursor)===text;}catch{return false;}
}
export function isAllowedMediaSiteRequest(path,method){
 if(typeof path!=='string'||path.length>4096||!path.startsWith('/api/cms/')||path.includes('#'))return false;
 const url=new URL(path,'http://127.0.0.1:5273'),pathname=url.pathname;
 if(pathname==='/api/cms/media-site/drafts/home-v3/preview'){
  if(method!=='GET')return false;const values=url.searchParams.getAll('expectedRevision'),keys=[...url.searchParams.keys()];if(keys.length!==1||keys[0]!=='expectedRevision'||values.length!==1||!/^(?:0|[1-9][0-9]*)$/.test(values[0]))return false;const expected=Number(values[0]);if(!Number.isSafeInteger(expected))return false;try{revisionSchema.parse(expected);return url.search==='?expectedRevision='+values[0];}catch{return false;}
 }
 const sources=/^\/api\/cms\/media-site\/snapshots\/([A-Za-z0-9_-]{1,128})\/source-checks$/.exec(pathname);
 if(sources&&method==='GET'){const keys=[...url.searchParams.keys()];if(new Set(keys).size!==keys.length||keys.some(k=>!['cursor','pageSize'].includes(k)))return false;const page=url.searchParams.get('pageSize');if(page!==null&&!/^(?:[1-9]|[1-4][0-9]|50)$/.test(page))return false;const cursor=url.searchParams.get('cursor');return cursor===null||validMediaSiteSourceCursor(cursor,sources[1]);}
 if(pathname==='/api/cms/localizations/editorial/queue'&&method==='GET'){
  if(path!==pathname+url.search)return false;const keys=[...url.searchParams.keys()];if(new Set(keys).size!==keys.length||keys.some(k=>!['cursor','pageSize','locale','kind','status'].includes(k)))return false;const page=url.searchParams.get('pageSize'),cursor=url.searchParams.get('cursor'),locale=url.searchParams.get('locale'),kind=url.searchParams.get('kind'),status=url.searchParams.get('status');return (status===null||['SUBMITTED','APPROVED','CHANGES_REQUESTED'].includes(status))&& (locale===null||['en','vi','ja'].includes(locale))&&(kind===null||['hero','project','service','section','group'].includes(kind))&& (page===null||/^(?:[1-9]|1[0-9]|2[0-4])$/.test(page))&&(cursor===null||/^[A-Za-z0-9_-]{1,2048}$/.test(cursor));
 }
 if(url.search)return false;
 if(pathname==='/api/cms/localizations/website/status')return path===pathname&&method==='GET';
 if(/^\/api\/cms\/localizations\/website\/(seed|publish|rollback|retry-media|recover-pdf)$/.test(pathname))return path===pathname&&method==='POST';
 if(pathname.startsWith('/api/cms/localizations/editorial/')){
  if(path!==pathname)return false;
  if(['/api/cms/localizations/editorial/rebase','/api/cms/localizations/editorial/publish'].includes(pathname))return method==='POST';
  if(['/api/cms/localizations/editorial/release','/api/cms/localizations/editorial/readiness'].includes(pathname)||/^\/api\/cms\/localizations\/editorial\/eligibility\/(en|vi|ja)$(?![\s\S])/.test(pathname))return method==='GET';
  const resource=/^\/api\/cms\/localizations\/editorial\/resources\/(hero|project|service|section|group)\/([a-z0-9]+(?:-[a-z0-9]+)*)\/(en|vi|ja)$(?![\s\S])/.exec(pathname);
  if(resource&&resource[2].length<=100)return method==='GET'&&(resource[1]==='hero'?resource[2]==='home-v3':resource[1]==='section'?['work','services'].includes(resource[2]):resource[1]==='group'?['header','clients','about','ip-studio','contact','footer','seo'].includes(resource[2]):true);
  const snapshot=/^\/api\/cms\/localizations\/editorial\/snapshots\/[A-Za-z0-9_-]{1,128}(\/(source-checks|review))?$(?![\s\S])/.exec(pathname);return Boolean(snapshot&&!snapshot[1]&&method==='GET');
 }
 if(pathname==='/api/cms/localizations/groups/status')return path===pathname&&method==='GET';
 const group=/^\/api\/cms\/localizations\/groups\/(header|clients|about|ip-studio|contact|footer|seo)\/(en|vi|ja)(\/qa)?$(?![\s\S])/.exec(pathname);
 if(group)return path===pathname&&(group[3]?method==='GET':['GET','PUT'].includes(method));
 if(/^\/api\/cms\/localizations\/site\/(en|vi|ja)\/qa$(?![\s\S])/.test(pathname))return path===pathname&&method==='GET';
 if(pathname==='/api/cms/localizations/services/status')return path===pathname&&method==='GET';
 const service=/^\/api\/cms\/localizations\/services\/([a-z0-9]+(?:-[a-z0-9]+)*)\/(en|vi|ja)(\/qa)?$(?![\s\S])/.exec(pathname);
 if(service&&service[1].length<=100)return path===pathname&&(service[3]?method==='GET':['GET','PUT'].includes(method));
 const section=/^\/api\/cms\/localizations\/sections\/(work|services)\/(en|vi|ja)(\/qa)?$(?![\s\S])/.exec(pathname);
 if(section)return path===pathname&&(section[3]?method==='GET':['GET','PUT'].includes(method));
 if(/^\/api\/cms\/localizations\/work-services\/(en|vi|ja)\/qa$(?![\s\S])/.test(pathname))return path===pathname&&method==='GET';
 if(pathname==='/api/cms/localizations/projects/status')return path===pathname&&method==='GET';
 const project=/^\/api\/cms\/localizations\/projects\/([a-z0-9]+(?:-[a-z0-9]+)*)\/(en|vi|ja)(\/qa)?$(?![\s\S])/.exec(pathname);
 if(project&&project[1].length<=100)return path===pathname&&(project[3]?method==='GET':['GET','PUT'].includes(method));
 const localized=/^\/api\/cms\/hero-localizations\/home-v3\/(en|vi|ja)(\/qa)?$/.exec(pathname);
 if(localized)return path===pathname&&(localized[2]?method==='GET':['GET','PUT'].includes(method));
 if(pathname==='/api/cms/drafts/home-v3')return ['GET','PATCH'].includes(method);
 if(pathname==='/api/cms/drafts/home-v3/import')return method==='POST';
 if(['/api/cms/media-site/snapshots','/api/cms/media-site/reviews','/api/cms/media-site/source-checks'].includes(pathname))return method==='POST';
 return method==='GET'&&/^\/api\/cms\/media-site\/snapshots\/[A-Za-z0-9_-]{1,128}(?:\/qa|\/media\/[A-Za-z0-9_-]{1,100}\/derivatives\/[A-Za-z0-9][A-Za-z0-9_-]{0,127})?$/.test(pathname);
}
function mediaBytesRoute(path){return /^\/api\/cms\/media\/[A-Za-z0-9_-]{1,100}\/derivatives\/([A-Za-z0-9][A-Za-z0-9_-]{0,127})$/.exec(path)||/^\/api\/cms\/media-site\/snapshots\/[A-Za-z0-9_-]{1,128}\/media\/[A-Za-z0-9_-]{1,100}\/derivatives\/([A-Za-z0-9][A-Za-z0-9_-]{0,127})$/.exec(path);}
function mediaCallerHeaders(input){
 const headers=new Headers(input);for(const name of headers.keys())if(['authorization','proxy-authorization'].includes(name.toLowerCase()))throw new Error('Yêu cầu không hợp lệ.');return Object.fromEntries(headers.entries());
}
async function mediaBytes(response,signal,expected,maxBytes){
 const mime=response.headers.get('content-type'),sha256=response.headers.get('x-media-sha256'),generation=response.headers.get('x-media-generation'),length=response.headers.get('content-length');
 if(!['image/webp','application/pdf','video/mp4'].includes(mime)||!/^[a-f0-9]{64}$/.test(sha256??'')||!/^[1-9][0-9]{0,127}$/.test(generation??'')||!/^[1-9][0-9]{0,7}$/.test(length??'')||Number(length)>maxBytes||!response.body)throw new Error('Dữ liệu ảnh không hợp lệ.');
 if(mime!==expected.mime||sha256!==expected.sha256||generation!==expected.generation||Number(length)!==expected.bytes)throw new Error('Phiên bản media không khớp.');
 const reader=response.body.getReader(),chunks=[];let total=0;try{while(true){if(signal.aborted)throw new DOMException('Đã hủy.','AbortError');const result=await reader.read();if(result.done)break;total+=result.value.byteLength;if(total>maxBytes||total>Number(length))throw new Error('Ảnh vượt giới hạn.');chunks.push(result.value);}if(total!==Number(length))throw new Error('Dữ liệu ảnh chưa đầy đủ.');const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return {bytes,mime,sha256,generation};}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
function mediaSiteJsonLimit(path){if(path==='/api/cms/localizations/editorial/release')return 12*1048576;if(/^\/api\/cms\/localizations\/site\/(?:en|vi|ja)\/qa$(?![\s\S])/.test(path))return 4*1048576;if(/^\/api\/cms\/localizations\/editorial\/snapshots\/[A-Za-z0-9_-]{1,128}$(?![\s\S])/.test(path))return 786432;return /^\/api\/cms\/(?:media-site\/snapshots\/[A-Za-z0-9_-]{1,128}\/qa|localizations\/work-services\/(?:en|vi|ja)\/qa)$(?![\s\S])/.test(path)?2*1048576:256*1024;}
async function mediaJson(response,signal,cap=2*1048576){
 if(!response.body)throw new Error('Phản hồi media chưa đầy đủ.');const reader=response.body.getReader(),chunks=[];let total=0;try{while(true){if(signal.aborted)throw new DOMException('Đã hủy.','AbortError');const part=await reader.read();if(part.done)break;total+=part.value.byteLength;if(total>cap)throw new Error('Phản hồi media vượt giới hạn.');chunks.push(part.value);}const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
/** Private requests share one session generation. Stale responses cannot repopulate UI. */
export async function apiFetch(path,options={}){
 const method=(options.method??'GET').toUpperCase(),media=isAllowedMediaRequest(path,method),mediaSite=isAllowedMediaSiteRequest(path,method),{responseType,derivative:expectedDerivative,maxBytes:requestedMax,...transportOptions}=options;if(responseType!==undefined&&responseType!=='bytes')throw new Error('Yêu cầu không hợp lệ.');if(responseType==='bytes'&&(!(media||mediaSite)||method!=='GET'||!mediaBytesRoute(path)))throw new Error('Yêu cầu không hợp lệ.');
 if(RECOVERY_READ_ONLY && !(method==='GET' && (path==='/api/cms/session' || path==='/api/cms/drafts/home-v2' || /^\/api\/cms\/snapshots\/[A-Za-z0-9_-]{1,128}$/.test(path) || isAllowedSourceCheckRequest(path,method))))throw new Error('Yêu cầu không hợp lệ.');
 const legacy=/^\/api\/cms\/(?:session|drafts\/home|snapshots(?:\/[A-Za-z0-9_-]+)?|reviews)$/.test(path);
 const site=(path==='/api/cms/drafts/home-v2' && ['GET','PATCH'].includes(method)) || (path==='/api/cms/drafts/home-v2/import' && method==='POST');
 if(!legacy && !site && !isAllowedSourceCheckRequest(path,method)&&!media&&!mediaSite)throw new Error('Yêu cầu không hợp lệ.');
 let byteDerivative,byteCap;if(responseType==='bytes'){byteDerivative=mediaDerivativePublicSchema.parse(expectedDerivative);if(mediaBytesRoute(path)[1]!==byteDerivative.key)throw new Error('Phiên bản media không khớp.');byteCap=requestedMax??(byteDerivative.role==='IMAGE'?12*1048576:64*1048576);if(!Number.isSafeInteger(byteCap)||byteCap<1||byteCap>64*1048576||byteDerivative.bytes>byteCap)throw new Error('Media vượt giới hạn.');}
 if(mediaSite&&options.body!==undefined&&(typeof options.body!=='string'||new TextEncoder().encode(options.body).length>256*1024))throw new Error('Nội dung vượt giới hạn.');
 const callerHeaders=media||mediaSite?mediaCallerHeaders(options.headers):options.headers;
 const current=generation;const user=auth.currentUser;if(!user)throw new Error(accessError);
 const controller=new AbortController(),external=options.signal,abortCaller=()=>controller.abort();if(external?.aborted)controller.abort();else external?.addEventListener('abort',abortCaller,{once:true});pending.add(controller);
 const sessionRead=method==='GET'&&path==='/api/cms/session',timeoutMessage=retryMessage;let deadlineTimer,timedOut=false,abortDeadline;
 const deadlineGate=sessionRead?new Promise((_resolve,reject)=>{abortDeadline=()=>{const error=timedOut?Object.assign(new Error(timeoutMessage),{code:'SESSION_API_TIMEOUT'}):new DOMException('Phiên đã kết thúc.','AbortError');reject(error);};controller.signal.addEventListener('abort',abortDeadline,{once:true});deadlineTimer=setTimeout(()=>{if(current!==generation||controller.signal.aborted||external?.aborted){controller.abort();return;}timedOut=true;controller.abort();},15000);if(controller.signal.aborted)abortDeadline();}):null;
 try{
  const operation=(async()=>{
  let response;
  for(let attempt=0;attempt<(durable?1:2);attempt++){
   const token=durable?null:await user.getIdToken(attempt===1);
   if(current!==generation||controller.signal.aborted)throw new DOMException('Phiên đã kết thúc.','AbortError');
   response=await fetch(path,{...transportOptions,...(media||mediaSite?{redirect:'error'}:{}),cache:'no-store',credentials:durable?'same-origin':'omit',signal:controller.signal,headers:{...callerHeaders,...(durable?{}:{Authorization:`Bearer ${token}`})}});
   if(response.status!==401 || attempt===1)break;
  }
  if(current!==generation||controller.signal.aborted)throw new DOMException('Phiên đã kết thúc.','AbortError');
  if(response.status===401){await endSession();throw Object.assign(new Error(accessError),{status:401});}
  let body;try{body=response.ok&&responseType==='bytes'?await mediaBytes(response,controller.signal,byteDerivative,byteCap):mediaSite?await mediaJson(response,controller.signal,mediaSiteJsonLimit(path)):media?await mediaJson(response,controller.signal):await response.json();}catch(error){if(response.status===403&&current===generation&&!controller.signal.aborted){await endSession();throw Object.assign(new Error(accessError),{status:403});}throw error;}
  if(current!==generation||controller.signal.aborted)throw new DOMException('Phiên đã kết thúc.','AbortError');
  if(response.status===403 && body.error?.code!=='SELF_REVIEW_FORBIDDEN'){await endSession();throw Object.assign(new Error(accessError),{status:403});}
  if(!response.ok){const error=new Error(body.error?.message??'Không thể xử lý yêu cầu.');error.code=body.error?.code;error.status=response.status;error.fieldErrors=body.error?.fieldErrors;if(/^\/api\/cms\/localizations\/(projects|services|sections|groups)\//.test(path)&&['DEPENDENCY_REBASE_REQUIRED','LOCALIZED_REVISION_CONFLICT'].includes(body.error?.reason))error.reason=body.error.reason;throw error;}
  return body;
  })();
  // Token promises cannot be cancelled. Observe late rejection and block late private completion.
  operation.catch(()=>{});return await (deadlineGate?Promise.race([operation,deadlineGate]):operation);
 }catch(error){
  if(current===generation&&error.name!=='AbortError'&&!external?.aborted){
   if(authFailureAction(error)==='SIGN_OUT')await endSession();
   else if(sessionRead)holdIdentity();
  }
  throw error;
 }finally{clearTimeout(deadlineTimer);if(abortDeadline)controller.signal.removeEventListener('abort',abortDeadline);external?.removeEventListener('abort',abortCaller);pending.delete(controller);}
}
element('login-form').addEventListener('submit',async event=>{
 event.preventDefault();element('login-submit').disabled=true;announce('Đang đăng nhập…');
 try{await signInWithEmailAndPassword(auth,element('email').value.trim(),element('password').value);}catch{announce('Không thể đăng nhập. Vui lòng kiểm tra thông tin và thử lại.');}
 finally{element('password').value='';element('login-submit').disabled=false;}
});
element('logout').addEventListener('click',()=>{if((editor && !editor.canLeave())||(review?.canLeave&&!review.canLeave()))return;void endSession('Bạn đã đăng xuất.');});
async function mountResource(value,member){
 if((RECOVERY_READ_ONLY && value!=='home-v2')||(!RECOVERY_READ_ONLY && !['home-v3','home','media'].includes(value)))throw new Error('Yêu cầu không hợp lệ.');
 const current=++resourceGeneration,sessionGeneration=generation;
 closePinkySelects();shell.setBusy(true);
 editor?.destroy();editor=null;review?.destroy();review=null;disposePinkySelects(element('private-content'));element('private-content').replaceChildren();
 document.dispatchEvent(new CustomEvent('cms:content',{detail:null}));
 shell.setResource(value);
 const resourceApi=async(path,options)=>{
  const body=await apiFetch(path,options);
  if(current!==resourceGeneration || sessionGeneration!==generation)throw new DOMException('Nội dung đã được chuyển.','AbortError');
  if(value==='home' && /^\/api\/cms\/snapshots\/[A-Za-z0-9_-]+$/.test(path) && (body.snapshot?.schemaVersion!==1 || body.snapshot?.templateVersion!==HERO_TEMPLATE_VERSION))throw new Error('Bản nội dung này thuộc Toàn website. Hãy chọn đúng nội dung cần quản lý.');
  return body;
 };
 if(value==='home-v2'){
  const {mountSiteEditor}=await import('./site-editor.mjs');
  if(current!==resourceGeneration || sessionGeneration!==generation)return;
  editor=mountSiteEditor(element('private-content'),{apiFetch:resourceApi,session:member,readOnly:RECOVERY_READ_ONLY});
 }else if(value==='home-v3'){
  const {mountSiteMediaEditor}=await import('./site-media-editor.mjs');if(current!==resourceGeneration||sessionGeneration!==generation)return;editor=mountSiteMediaEditor(element('private-content'),{apiFetch:resourceApi,getSession,session:member,localeSession:contentLocaleSession});
  const {mountSiteLegacyHistory}=await import('./site-legacy-history.mjs');if(current!==resourceGeneration||sessionGeneration!==generation)return;review=mountSiteLegacyHistory(element('private-content'),{apiFetch:resourceApi,session:member});
 }else if(value==='media'){
  const [{mountMediaLibrary},{mountMediaUpload}]=await Promise.all([import('./media-library.mjs'),import('./media-upload.mjs')]);if(current!==resourceGeneration||sessionGeneration!==generation)return;
  const root=element('private-content'),uploadRoot=document.createElement('div'),libraryRoot=document.createElement('div');root.append(uploadRoot,libraryRoot);const library=mountMediaLibrary(libraryRoot,{apiFetch:resourceApi,getSession});const upload=mountMediaUpload(uploadRoot,{apiFetch:resourceApi,getSession,onQueued:()=>library.reload()});editor={canLeave:()=>upload.canLeave()&&library.canLeave(),destroy(){upload.destroy();library.destroy();root.replaceChildren();}};
 }else{
  const {mountHeroEditor}=await import('./hero-editor.mjs'),{mountReview}=await import('./review.mjs');
  if(current!==resourceGeneration || sessionGeneration!==generation)return;
  review=mountReview(element('private-content'),{apiFetch:resourceApi,session:member});editor=mountHeroEditor(element('private-content'),{apiFetch:resourceApi,session:member});
 }
 shell.refreshPanels();
}
function selectResource(value){
 if((RECOVERY_READ_ONLY && value!=='home-v2')||(!RECOVERY_READ_ONLY && !['home-v3','home','media'].includes(value)))return;
 if(!session || (value===editorResource && editor))return;
 if((editor && !editor.canLeave())||(review?.canLeave&&!review.canLeave()))return;
 editorResource=value;const member=session;
 void mountResource(value,member).catch(error=>{if(error.name!=='AbortError' && session===member)announce('Không thể mở nội dung. Vui lòng thử lại.');}).finally(()=>{if(session===member && editorResource===value)shell.setBusy(false);});
}
let editorResource=RECOVERY_READ_ONLY?'home-v2':'home-v3';
onAuthStateChanged(auth,async user=>{
 clearPrivate();element('logout').hidden=!user;element('login-panel').hidden=Boolean(user);element('login-submit').disabled=false;
 if(!user){document.documentElement.dataset.cmsAuthState='LOGIN_REQUIRED';if(!canRemember)announce('Trình duyệt đang chặn lưu phiên. Đăng nhập chỉ được giữ trong lần mở hiện tại.');return;}
 document.documentElement.dataset.cmsAuthState='AUTHORIZING';
 const current=generation;announce('Đang kiểm tra quyền truy cập…');
 try{
  const member=await apiFetch('/api/cms/session');if(current!==generation)return;
  session=Object.freeze(member);contentLocaleSession=createContentLocaleSession({getSession});element('session-role').textContent=member.role;element('session-panel').hidden=false;shell.setSession(member,{readOnly:RECOVERY_READ_ONLY});announce(canRemember?'':'Trình duyệt đang chặn lưu phiên. Phiên hiện tại có thể mất khi đóng hoặc tải lại.');element('session-ready').textContent='';
  editorResource=RECOVERY_READ_ONLY?'home-v2':'home-v3';await mountResource(editorResource,member);if(current!==generation)return;
  shell.setBusy(false);shell.refreshPanels();document.documentElement.dataset.cmsAuthState='AUTHORIZED';document.dispatchEvent(new CustomEvent('cms:session',{detail:{...member}}));
 }catch(error){
  if(error.name!=='AbortError'&&current===generation){
   if(authFailureAction(error)==='SIGN_OUT')await endSession();
   else holdIdentity();
  }
 }
});
