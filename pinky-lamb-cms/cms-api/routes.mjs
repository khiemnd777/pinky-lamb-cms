import {fileRoute,createFileResourceService} from './file-resources.mjs';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {ApiError,errorEnvelope,validationError} from '../contracts/errors.mjs';
import {parseJsonBody,idempotencyKeySchema,resourceIdSchema,revisionSchema} from '../contracts/hero.mjs';
import {createSiteDraftService} from './site-drafts.mjs';
import {createSiteImportService} from './import-site.mjs';
import {createDraftService} from './drafts.mjs';
import {mediaReadRoute,handleMediaReadRequest,mediaReadDependencies,reserveMediaReadBytes} from './media-reads.mjs';
import {siteV3MediaReadRoute,handleSiteV3MediaReadRequest} from './site-v3-media-reads.mjs';

let siteV3Defaults;
export async function siteV3Dependencies(){
 siteV3Defaults??=(async()=>{
  const [{db,authorize},{library,storage},{createSiteV3MediaProvider}]=await Promise.all([import('./authorization.mjs'),mediaReadDependencies(),import('./site-v3-media-provider.mjs')]);
  const mediaProvider=await createSiteV3MediaProvider({db,library});
  return {options:{db,authorize,mediaProvider},library,storage};
 })().catch(error=>{siteV3Defaults=undefined;throw error;});
 return siteV3Defaults;
}

export function routeDefinition(pathname){
 const file=fileRoute(pathname);if(file)return file;
 if(pathname==='/api/cms/workspace')return {methods:['GET'],kind:'CONTENT_BOOTSTRAP'};
 const contentGroup=/^\/api\/cms\/content\/groups\/(settings|clients|work|services|about|ip|contact|footer|structure)$/.exec(pathname);
 if(contentGroup)return {methods:['GET','PATCH'],kind:'CONTENT_GROUP',group:contentGroup[1]};
 if(pathname==='/api/cms/localizations/website/status')return {methods:['GET'],kind:'LOCAL_WEBSITE_STATUS'};
 const website=/^\/api\/cms\/localizations\/website\/(seed|prepare|publish|rollback|retry-media|recover-pdf)$/.exec(pathname);
 if(website)return {methods:['POST'],kind:'LOCAL_WEBSITE_'+website[1].replace('-','_').toUpperCase()};
 if(pathname==='/api/cms/localizations/groups/status')return {methods:['GET'],kind:'GROUP_LOCALIZATION_STATUS'};
 const group=/^\/api\/cms\/localizations\/groups\/(header|clients|about|ip-studio|contact|footer|seo)\/(en|vi|ja)(\/qa)?$(?![\s\S])/.exec(pathname);
 if(group)return {methods:group[3]?['GET']:['GET','PUT'],kind:group[3]?'GROUP_LOCALIZATION_QA':'GROUP_LOCALIZATION',groupId:group[1],locale:group[2]};
 const fullSite=/^\/api\/cms\/localizations\/site\/(en|vi|ja)\/qa$(?![\s\S])/.exec(pathname);
 if(fullSite)return {methods:['GET'],kind:'FULL_SITE_LOCALIZATION_QA',locale:fullSite[1]};
 const editorialPrefix='/api/cms/localizations/editorial';
 if(pathname===editorialPrefix+'/publish')return {methods:['POST'],kind:'LOCALIZED_EDITORIAL_PUBLISH'};
 if(pathname===editorialPrefix+'/snapshots')throw new ApiError('METHOD_NOT_ALLOWED');
 if(pathname===editorialPrefix+'/queue')return {methods:['GET'],kind:'LOCALIZED_EDITORIAL_QUEUE'};
 if(pathname===editorialPrefix+'/rebase')return {methods:['POST'],kind:'LOCALIZED_EDITORIAL_REBASE'};
 if(pathname===editorialPrefix+'/release')return {methods:['GET'],kind:'LOCALIZED_EDITORIAL_RELEASE'};
 if(pathname===editorialPrefix+'/readiness')return {methods:['GET'],kind:'LOCALIZED_EDITORIAL_READINESS'};
 const eligibility=/^\/api\/cms\/localizations\/editorial\/eligibility\/(en|vi|ja)$(?![\s\S])/.exec(pathname);
 if(eligibility)return {methods:['GET'],kind:'LOCALIZED_EDITORIAL_ELIGIBILITY',locale:eligibility[1]};
 const editorialResource=/^\/api\/cms\/localizations\/editorial\/resources\/(hero|project|service|section|group)\/([a-z0-9]+(?:-[a-z0-9]+)*)\/(en|vi|ja)$(?![\s\S])/.exec(pathname);
 if(editorialResource&&editorialResource[2].length<=100&&(editorialResource[1]==='hero'?editorialResource[2]==='home-v3':editorialResource[1]==='section'?['work','services'].includes(editorialResource[2]):editorialResource[1]==='group'?['header','clients','about','ip-studio','contact','footer','seo'].includes(editorialResource[2]):true))return {methods:['GET'],kind:'LOCALIZED_EDITORIAL_RESOURCE',resource:{kind:editorialResource[1],entityId:editorialResource[2],locale:editorialResource[3]}};
 const editorialSnapshot=/^\/api\/cms\/localizations\/editorial\/snapshots\/([A-Za-z0-9_-]{1,128})(?:\/(source-checks|review))?$(?![\s\S])/.exec(pathname);
 if(editorialSnapshot){if(editorialSnapshot[2])throw new ApiError('METHOD_NOT_ALLOWED');return {methods:['GET'],kind:'LOCALIZED_EDITORIAL_SNAPSHOT',id:editorialSnapshot[1]};}
 if(pathname==='/api/cms/localizations/services/status')return {methods:['GET'],kind:'SERVICE_LOCALIZATION_STATUS'};
 const service=/^\/api\/cms\/localizations\/services\/([a-z0-9]+(?:-[a-z0-9]+)*)\/(en|vi|ja)(\/qa)?$(?![\s\S])/.exec(pathname);
 if(service&&service[1].length<=100)return {methods:service[3]?['GET']:['GET','PUT'],kind:service[3]?'SERVICE_LOCALIZATION_QA':'SERVICE_LOCALIZATION',serviceId:service[1],locale:service[2]};
 const section=/^\/api\/cms\/localizations\/sections\/(work|services)\/(en|vi|ja)(\/qa)?$(?![\s\S])/.exec(pathname);
 if(section)return {methods:section[3]?['GET']:['GET','PUT'],kind:section[3]?'SECTION_LOCALIZATION_QA':'SECTION_LOCALIZATION',sectionId:section[1],locale:section[2]};
 const workServices=/^\/api\/cms\/localizations\/work-services\/(en|vi|ja)\/qa$(?![\s\S])/.exec(pathname);
 if(workServices)return {methods:['GET'],kind:'WORK_SERVICES_LOCALIZATION_QA',locale:workServices[1]};
 const projectStatus=pathname==='/api/cms/localizations/projects/status';
 if(projectStatus)return {methods:['GET'],kind:'PROJECT_LOCALIZATION_STATUS'};
 const project=/^\/api\/cms\/localizations\/projects\/([a-z0-9]+(?:-[a-z0-9]+)*)\/(en|vi|ja)(\/qa)?$(?![\s\S])/.exec(pathname);
 if(project&&project[1].length<=100)return {methods:project[3]?['GET']:['GET','PUT'],kind:project[3]?'PROJECT_LOCALIZATION_QA':'PROJECT_LOCALIZATION',projectId:project[1],locale:project[2]};
 const localized=/^\/api\/cms\/hero-localizations\/home-v3\/(en|vi|ja)(\/qa)?$/.exec(pathname);
 if(localized)return {methods:localized[2]?['GET']:['GET','PUT'],kind:localized[2]?'HERO_LOCALIZATION_QA':'HERO_LOCALIZATION',locale:localized[1]};
 if(pathname==='/api/cms/media-site/drafts/home-v3/preview')return {methods:['GET'],kind:'SITE_V3_DRAFT_PREVIEW'};
 if(pathname==='/api/cms/drafts/home-v3/import')return {methods:['POST'],kind:'SITE_V3_IMPORT'};
 if(pathname==='/api/cms/drafts/home-v3')return {methods:['GET','PATCH'],kind:'SITE_V3_DRAFT'};
 if(pathname==='/api/cms/media-site/snapshots')return {methods:['POST'],kind:'SITE_V3_SUBMIT'};
 if(pathname==='/api/cms/media-site/reviews')return {methods:['POST'],kind:'SITE_V3_REVIEW'};
 if(pathname==='/api/cms/media-site/source-checks')return {methods:['POST'],kind:'SITE_V3_SOURCE_CHECK'};
 const v3Snapshot=/^\/api\/cms\/media-site\/snapshots\/([A-Za-z0-9_-]{1,128})(?:\/(source-checks|qa))?$/.exec(pathname);
 if(v3Snapshot)return {methods:['GET'],kind:v3Snapshot[2]==='source-checks'?'SITE_V3_SOURCE_LIST':v3Snapshot[2]==='qa'?'SITE_V3_QA':'SITE_V3_SNAPSHOT',id:v3Snapshot[1]};
 if(pathname.startsWith('/api/cms/media-site/snapshots/')&&pathname.includes('/media/'))return siteV3MediaReadRoute(pathname);
 if(pathname==='/api/cms/media/uploads')return {methods:['POST'],kind:'MEDIA_UPLOAD_CREATE'};
 const mediaPart=/^\/api\/cms\/media\/uploads\/([A-Za-z0-9_-]{1,128})\/parts\/(0|[1-9]|[12][0-9]|3[01])$/.exec(pathname);
 if(mediaPart)return {methods:['PUT'],kind:'MEDIA_UPLOAD_PART',intentId:mediaPart[1],partIndex:Number(mediaPart[2])};
 const mediaMutation=/^\/api\/cms\/media\/uploads\/([A-Za-z0-9_-]{1,128})\/(complete|cancel)$/.exec(pathname);
 if(mediaMutation)return {methods:['POST'],kind:mediaMutation[2]==='complete'?'MEDIA_UPLOAD_COMPLETE':'MEDIA_UPLOAD_CANCEL',intentId:mediaMutation[1]};
 const mediaRetry=/^\/api\/cms\/media\/jobs\/([A-Za-z0-9_-]{1,128})\/retry$/.exec(pathname);
 if(mediaRetry)return {methods:['POST'],kind:'MEDIA_RETRY',jobId:mediaRetry[1]};
 const mediaJob=/^\/api\/cms\/media\/jobs\/([A-Za-z0-9_-]{1,128})$/.exec(pathname);
 if(mediaJob)return {methods:['GET'],kind:'MEDIA_JOB_READ',jobId:mediaJob[1]};
 const mediaArchive=/^\/api\/cms\/media\/([A-Za-z0-9_-]{1,100})\/archive$/.exec(pathname);
 if(mediaArchive)return {methods:['POST'],kind:'MEDIA_ARCHIVE',assetId:mediaArchive[1]};
 if(pathname==='/api/cms/media'||pathname.startsWith('/api/cms/media/'))return mediaReadRoute(pathname);
 if(pathname==='/api/cms/session')return {methods:['GET'],kind:'SESSION'};
 if(pathname==='/api/cms/drafts/home-v2/import')return {methods:['POST'],kind:'SITE_IMPORT'};
 if(pathname==='/api/cms/drafts/home-v2')return {methods:['GET','PATCH'],kind:'SITE_DRAFT'};
 if(pathname==='/api/cms/drafts/home')return {methods:['GET','PATCH'],kind:'DRAFT'};
 if(pathname==='/api/cms/snapshots')return {methods:['POST'],kind:'SUBMIT'};
 if(pathname==='/api/cms/reviews')return {methods:['POST'],kind:'REVIEW'};
 if(pathname==='/api/cms/source-checks')return {methods:['POST'],kind:'SOURCE_CHECK'};
 const sourceList=/^\/api\/cms\/snapshots\/([A-Za-z0-9_-]{1,128})\/source-checks$/.exec(pathname);
 if(sourceList)return {methods:['GET'],kind:'SOURCE_LIST',id:sourceList[1]};
 const snapshot=/^\/api\/cms\/snapshots\/([A-Za-z0-9_-]{1,128})$/.exec(pathname);
 if(snapshot)return {methods:['GET'],kind:'SNAPSHOT',id:snapshot[1]};
 throw new ApiError('NOT_FOUND');
}

function parseMutation(request){
 if(!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers['content-type']??''))throw new ApiError('UNSUPPORTED_MEDIA_TYPE');
 const body=parseJsonBody(request.rawBody??new Uint8Array());
 let key;
 try{key=idempotencyKeySchema.parse(request.headers['idempotency-key']);}catch(error){throw validationError(error);}
 return {body,key};
}

/** Raw parts are a single bounded byte range, never a caller-supplied part list.
 * Duplicate custody/idempotency headers are rejected before numeric conversion. */
function parseMediaPart(request){
 const oneHeader=name=>{
  const count=request.rawHeaders?.filter((_value,index)=>index%2===0&&String(request.rawHeaders[index]).toLowerCase()===name).length;
  const value=request.headers[name];
  if((count!==undefined&&count!==1)||typeof value!=='string')throw new ApiError('VALIDATION_ERROR');return value;
 };
 if(oneHeader('content-type')!=='application/octet-stream')throw new ApiError('UNSUPPORTED_MEDIA_TYPE');
 const bytes=request.rawBody;
 if(!Buffer.isBuffer(bytes)||bytes.length<1||bytes.length>4194304)throw new ApiError('PAYLOAD_TOO_LARGE');
 const integer=name=>{const value=oneHeader(name);if(!/^(0|[1-9][0-9]{0,15})$/.test(value)||!Number.isSafeInteger(Number(value)))throw new ApiError('VALIDATION_ERROR');return Number(value);};
 const length=integer('content-length');if(length!==bytes.length)throw new ApiError('VALIDATION_ERROR');
 const sha256=oneHeader('x-part-sha256');if(!/^[a-f0-9]{64}$/.test(sha256))throw new ApiError('VALIDATION_ERROR');
 let key;try{key=idempotencyKeySchema.parse(oneHeader('idempotency-key'));}catch(error){throw validationError(error);}
 return {bytes,key,expectedIntentRevision:integer('x-expected-intent-revision'),offsetBytes:integer('x-part-offset-bytes'),sha256};
}

/** JSON.parse discards duplicate keys. Reject them before the v2 command is
 * normalized, including escaped-equivalent names in nested objects. */
function parseMediaMutation(request,maxBytes=65536){
 const count=name=>request.rawHeaders?.filter((_value,index)=>index%2===0&&String(request.rawHeaders[index]).toLowerCase()===name).length;
 for(const name of ['content-type','idempotency-key'])if(count(name)!==undefined&&count(name)!==1)throw new ApiError('VALIDATION_ERROR');
 const raw=request.rawBody;
 if(!(raw instanceof Uint8Array)||raw.byteLength>maxBytes)throw new ApiError('PAYLOAD_TOO_LARGE');
 let input;try{input=new TextDecoder('utf-8',{fatal:true}).decode(raw);}catch{throw new ApiError('BAD_REQUEST');}
 let offset=0;
 const space=()=>{while(/[\t\n\r ]/.test(input[offset]??'!'))offset++;};
 const string=()=>{
  space();const match=/^"(?:[^"\\\u0000-\u001f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"/.exec(input.slice(offset));
  if(!match)throw new ApiError('BAD_REQUEST');offset+=match[0].length;return JSON.parse(match[0]);
 };
 function value(depth){
  if(depth>64)throw new ApiError('VALIDATION_ERROR');space();
  const type=input[offset];
  if(type==='"'){string();return;}
  if(type==='{'||type==='['){
   offset++;space();const close=type==='{'?'}':']',seen=new Set();
   if(input[offset]===close){offset++;return;}
   while(true){
    if(type==='{'){const name=string();if(seen.has(name))throw new ApiError('VALIDATION_ERROR');seen.add(name);space();if(input[offset++]!==':')throw new ApiError('BAD_REQUEST');}
    value(depth+1);space();if(input[offset]===close){offset++;return;}
    if(input[offset++]!==',')throw new ApiError('BAD_REQUEST');
   }
  }
  const match=/^(?:true|false|null|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)/.exec(input.slice(offset));
  if(!match)throw new ApiError('BAD_REQUEST');offset+=match[0].length;
 }
 value(0);space();if(offset!==input.length)throw new ApiError('BAD_REQUEST');
 if(maxBytes===65536)return parseMutation(request);
 if(!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers['content-type']??''))throw new ApiError('UNSUPPORTED_MEDIA_TYPE');
 let key;try{key=idempotencyKeySchema.parse(request.headers['idempotency-key']);}catch(error){throw validationError(error);}
 return {body:JSON.parse(input),key};
}

/** This one private GET accepts a bounded typed cursor; other GET queries remain denied. */
function parseSourceQuery(request){
 const parameters=new URL(request.originalUrl??request.url,'http://127.0.0.1').searchParams;
 const query=request.query??{},allowed=new Set(['cursor','pageSize']);
 for(const name of [...parameters.keys(),...Object.keys(query)]){
  if(/^(cursor|pageSize)\[/.test(name))throw new ApiError('VALIDATION_ERROR');
  if(!allowed.has(name))throw new ApiError('BAD_REQUEST');
 }
 const result={};
 for(const name of allowed){
  const values=parameters.getAll(name);
  if(values.length>1 || (Object.hasOwn(query,name) && typeof query[name]!=='string'))throw new ApiError('VALIDATION_ERROR');
  const value=values.length?values[0]:query[name];
  if(value===undefined)continue;
  if(name==='pageSize'){
   if(!/^[1-9][0-9]?$/.test(value) || Number(value)>50)throw new ApiError('VALIDATION_ERROR');
   result.pageSize=Number(value);
  }else{
   if(!/^[A-Za-z0-9_-]{1,2048}$/.test(value))throw new ApiError('VALIDATION_ERROR');
   result.cursor=value;
  }
 }
 return result;
}

function parseLocalizedQueueQuery(request){
 const parameters=new URL(request.originalUrl??request.url,'http://127.0.0.1').searchParams,query=request.query??{},allowed=['cursor','pageSize','locale','kind','status'],result={};
 if([...parameters.keys(),...Object.keys(query)].some(k=>!allowed.includes(k)))throw new ApiError('BAD_REQUEST');
 for(const name of allowed){const values=parameters.getAll(name);if(values.length>1||(Object.hasOwn(query,name)&&typeof query[name]!=='string'))throw new ApiError('VALIDATION_ERROR');const value=values.length?values[0]:query[name];if(value===undefined)continue;
  if(name==='pageSize'){if(!/^(?:[1-9]|1[0-9]|2[0-4])$/.test(value))throw new ApiError('VALIDATION_ERROR');result.pageSize=Number(value);}
  else if(name==='cursor'){if(!/^[A-Za-z0-9_-]{1,2048}$/.test(value))throw new ApiError('VALIDATION_ERROR');result.cursor=value;}
  else if(name==='locale'){if(!['en','vi','ja'].includes(value))throw new ApiError('VALIDATION_ERROR');result.locale=value;}
  else if(name==='status'){if(!['SUBMITTED','APPROVED','CHANGES_REQUESTED'].includes(value))throw new ApiError('VALIDATION_ERROR');result.status=value;}
  else{if(!['hero','project','service','section','group'].includes(value))throw new ApiError('VALIDATION_ERROR');result.kind=value;}
 }return result;
}

function parseDraftPreviewQuery(request){
 if(request.rawBody?.byteLength||request.headers['transfer-encoding']!==undefined||(request.headers['content-length']!==undefined&&request.headers['content-length']!=='0'))throw new ApiError('BAD_REQUEST');
 const parameters=new URL(request.originalUrl??request.url,'http://127.0.0.1').searchParams,query=request.query??{};
 if(typeof query!=='object'||Array.isArray(query))throw new ApiError('VALIDATION_ERROR');
 for(const name of [...parameters.keys(),...Reflect.ownKeys(query)]){
  if(typeof name!=='string'||/^expectedRevision\[/.test(name))throw new ApiError('VALIDATION_ERROR');
  if(name!=='expectedRevision')throw new ApiError('BAD_REQUEST');
 }
 const values=parameters.getAll('expectedRevision');
 if(values.length!==1||(Object.hasOwn(query,'expectedRevision')&&(typeof query.expectedRevision!=='string'||query.expectedRevision!==values[0])))throw new ApiError('VALIDATION_ERROR');
 if(!/^(0|[1-9][0-9]{0,15})$(?![\s\S])/.test(values[0]))throw new ApiError('VALIDATION_ERROR');
 let expectedRevision;try{expectedRevision=revisionSchema.parse(Number(values[0]));}catch(error){throw validationError(error);}
 return {expectedRevision};
}

async function futureHandler(moduleName,exportName,context){
 const url=new URL(`./${moduleName}.mjs`,import.meta.url);
 if(!existsSync(fileURLToPath(url)))throw new ApiError('LOCAL_RUNTIME_UNAVAILABLE');
 const module=await import(url.href);
 if(typeof module[exportName]!=='function')throw new ApiError('INTERNAL_ERROR');
 return module[exportName](context);
}

const siteFieldKeys=new Set(['expectedM1Revision','baselineManifestHash','expectedRevision','draftId','draftRevision','message','patch','hero','seo','settings','sections','sectionOrder','projectChanges','projectsOrder','serviceChanges','clientLogoChanges','clientLogoOrder','claimSources','projects','services','schemaVersion','locale','kind','variant','heading','lines','text','emphasis','eyebrow','description','primaryAction','secondaryAction','footnote','note','image','assetId','alt','isDecorative','focalPoint','x','y','label','sectionId','title','ogTitle','ogDescription','ogImage','header','descriptor','ctaLabel','brand','name','logo','tagline','credential','edition','showreel','poster','durationSeconds','originalSourceUrl','contact','email','personName','personPhoneE164','personPhoneLabel','officePhoneE164','officePhoneLabel','addressLines','facebookUrl','illustration','nav','clientLogos','copyright','startYear','id','clientName','isVisible','value','op','slug','client','year','category','summary','scope','cover','gallery','serviceIds','publicCredentialPage','titleVi','intro','featuredIds','initialVisibleCount','filterLabels','all','EVENTS','FILM','COMMUNICATIONS','serviceOrder','action','lead','paragraphs','experienceFact','copy','location','signature','reelHeading','reelCaption','disciplines','formMode','serviceOptionIds','backToTopLabel','claimPath','sourceIds','snapshotId','contentHash','expectedReviewRevision','expectedSourceRevision','checks','evidence','sourceId','pages','creativeCopyDeclaration','outcome','cursor','pageSize']);
function safeSiteFieldPath(field){
 if(typeof field!=='string' || field.length<1 || field.length>240)return false;
 const parts=field.split('.');if(parts.length>12 || !siteFieldKeys.has(parts[0]))return false;
 return parts.every(part=>siteFieldKeys.has(part) || /^(0|[1-5]?[0-9]|60)$/.test(part));
}
export function siteErrorResponse(error,correlationId){
 if(error instanceof ApiError&&error.code==='REVISION_CONFLICT'&&['BASE_REBASE_REQUIRED','LOCALIZED_REVISION_CONFLICT'].includes(error.heroReason))return {status:409,body:{error:{...errorEnvelope(error,correlationId).error,reason:error.heroReason}}};
 if(error instanceof ApiError&&error.code==='REVISION_CONFLICT'&&['DEPENDENCY_REBASE_REQUIRED','LOCALIZED_REVISION_CONFLICT'].includes(error.projectReason??error.serviceReason))return {status:409,body:{error:{...errorEnvelope(error,correlationId).error,reason:error.projectReason??error.serviceReason}}};
 const marked=error && (Object.hasOwn(error,'siteReason') || Object.hasOwn(error,'siteValidationPaths'));
 if(!marked){const safe=error instanceof ApiError?error:new ApiError('INTERNAL_ERROR');return {status:safe.status,body:errorEnvelope(safe,correlationId)};}
 if(error instanceof ApiError && error.code==='REVISION_CONFLICT' && error.status===409 && !Object.hasOwn(error,'siteValidationPaths')){
  if(error.siteReason==='ALREADY_INITIALIZED')return {status:409,body:{error:{code:'ALREADY_INITIALIZED',message:'Nội dung toàn site đã được khởi tạo.',correlationId}}};
  if(error.siteReason==='SOURCE_REVISION_CONFLICT')return {status:409,body:{error:{code:'SOURCE_REVISION_CONFLICT',message:'Phiên bản kiểm tra nguồn đã thay đổi. Vui lòng tải lại.',correlationId}}};
 }
 if(error instanceof ApiError && error.code==='VALIDATION_ERROR' && error.status===422 && !Object.hasOwn(error,'siteReason') && Array.isArray(error.siteValidationPaths) && error.siteValidationPaths.length<=32 && error.siteValidationPaths.every(safeSiteFieldPath)){const fieldErrors=Object.fromEntries(error.siteValidationPaths.map(field=>[field,['Giá trị không hợp lệ.']]));return {status:422,body:{error:{code:'VALIDATION_ERROR',message:'Vui lòng kiểm tra nội dung đã nhập.',...(Object.keys(fieldErrors).length?{fieldErrors}:{}),correlationId}}};}
 const safe=new ApiError('INTERNAL_ERROR');return {status:500,body:errorEnvelope(safe,correlationId)};
}

/** The index authorizes before dispatch; service mutations recheck in transactions. */
export async function dispatchRequest(request,response,actor,correlationId){
 try{
  const pathname=request.path??new URL(request.url,'http://127.0.0.1').pathname;
  const route=routeDefinition(pathname);
  if(!route.methods.includes(request.method)){response.set('Allow',route.methods.join(', '));throw new ApiError('METHOD_NOT_ALLOWED');}
  if((route.kind!=='FILE_RESOURCES' && route.kind!=='LOCALIZED_EDITORIAL_QUEUE' && route.kind!=='SOURCE_LIST' && route.kind!=='SITE_V3_SOURCE_LIST' && route.kind!=='SITE_V3_DRAFT_PREVIEW' && !route.kind.startsWith('MEDIA_READ') && Object.keys(request.query??{}).length) || (request.method==='GET' && request.rawBody?.byteLength))throw new ApiError('BAD_REQUEST');
  const context={request,actor,correlationId};
  if(request.method==='GET'&&['HERO_LOCALIZATION','GROUP_LOCALIZATION','PROJECT_LOCALIZATION','SERVICE_LOCALIZATION','SECTION_LOCALIZATION','GROUP_LOCALIZATION_STATUS','PROJECT_LOCALIZATION_STATUS','SERVICE_LOCALIZATION_STATUS'].includes(route.kind)){
   const {options}=await siteV3Dependencies();if(options.db.content){const {readLocalizedProjection}=await import('./content-localized-reads.mjs');await options.authorize(request,'MEMBER_READ');const result=readLocalizedProjection(options.db,route);if(result){response.status(200).json(result);return;}}
  }
  if(route.kind==='CONTENT_BOOTSTRAP'||route.kind==='CONTENT_GROUP'){
   const {options}=await siteV3Dependencies(),{createContentService}=await import('./content-service.mjs'),service=createContentService(options);
   const result=route.kind==='CONTENT_BOOTSTRAP'?await service.bootstrap({request}):request.method==='GET'?await service.readGroup({request,group:route.group}):await service.saveGroup({...context,group:route.group,...parseMediaMutation(request,262144)});
   response.status(200).json(result);return;
  }
  if(route.kind.startsWith('LOCAL_WEBSITE_')){
   if(new URL(request.originalUrl??request.url,'http://127.0.0.1').search)throw new ApiError('BAD_REQUEST');
   const deps=await siteV3Dependencies(),{createLocalWebsiteService}=await import('./local-website.mjs'),service=await createLocalWebsiteService(deps);
   let result;if(route.kind==='LOCAL_WEBSITE_STATUS')result=await service.status(context);else{const {body,key:commandKey}=parseMediaMutation(request);if(!['LOCAL_WEBSITE_PUBLISH','LOCAL_WEBSITE_PREPARE'].includes(route.kind)&&Object.keys(body).length)throw new ApiError('BAD_REQUEST');result=route.kind==='LOCAL_WEBSITE_PREPARE'?await service.prepare({...context,body}):route.kind==='LOCAL_WEBSITE_RECOVER_PDF'?await service.recoverPdf({...context,commandKey}):route.kind==='LOCAL_WEBSITE_RETRY_MEDIA'?await service.retryMedia({...context,commandKey}):route.kind==='LOCAL_WEBSITE_ROLLBACK'?await service.rollback({...context,commandKey}):await service.start({...context,commandKey,body,kind:route.kind==='LOCAL_WEBSITE_SEED'?'SEED':'PUBLISH'});}
   response.status(200).json(result);return;
  }
  if(route.kind.startsWith('LOCALIZED_EDITORIAL')){
   if(route.kind!=='LOCALIZED_EDITORIAL_QUEUE'&&new URL(request.originalUrl??request.url,'http://127.0.0.1').search)throw new ApiError('BAD_REQUEST');
   const {options}=await siteV3Dependencies();if(route.kind==='LOCALIZED_EDITORIAL_READINESS'&&options.db.content){const {readReadinessProjection}=await import('./readiness-projection.mjs');await options.authorize(request,'MEMBER_READ');response.status(200).json(readReadinessProjection(options.db));return;}const {createLocalizedEditorialService}=await import('./localized-editorial.mjs'),service=await createLocalizedEditorialService(options);let result,status=200;
   if(route.kind==='LOCALIZED_EDITORIAL_QUEUE'){const query=parseLocalizedQueueQuery(request);result=await service.readQueue({request,query});}
   else if(route.kind==='LOCALIZED_EDITORIAL_RESOURCE')result=await service.readResource({request,resource:route.resource});
   else if(route.kind==='LOCALIZED_EDITORIAL_SNAPSHOT')result=await service.readSnapshot({request,id:route.id});
   else if(['LOCALIZED_EDITORIAL_RELEASE','LOCALIZED_EDITORIAL_ELIGIBILITY','LOCALIZED_EDITORIAL_READINESS'].includes(route.kind)){const {createLocalizedEligibilityService}=await import('./localized-eligibility.mjs'),eligibility=await createLocalizedEligibilityService({editorial:service});result=route.kind==='LOCALIZED_EDITORIAL_RELEASE'?await eligibility.readReleaseBundle({request}):route.kind==='LOCALIZED_EDITORIAL_READINESS'?await eligibility.readReadiness({request}):await eligibility.readEligibility({request,locale:route.locale});}
   else{const args={...context,...parseMediaMutation(request),id:route.id};if(route.kind==='LOCALIZED_EDITORIAL_PUBLISH'){result=await service.publishDraft(args);status=201;}else if(route.kind==='LOCALIZED_EDITORIAL_SUBMIT'){result=await service.submitSnapshot(args);status=201;}else if(route.kind==='LOCALIZED_EDITORIAL_SOURCE_CHECK'){result=await service.writeSourceChecks(args);status=201;}else if(route.kind==='LOCALIZED_EDITORIAL_REVIEW'){result=await service.submitReview(args);status=201;}else result=await service.rebaseDraft(args);}
   response.status(status).json(result);return;
  }
  if(route.kind.startsWith('GROUP_LOCALIZATION')||route.kind==='FULL_SITE_LOCALIZATION_QA'){
   if(new URL(request.originalUrl??request.url,'http://127.0.0.1').search)throw new ApiError('BAD_REQUEST');const {options}=await siteV3Dependencies();let service;
   if(route.kind==='FULL_SITE_LOCALIZATION_QA'){const {createFullSiteLocalizationService}=await import('./full-site-localizations.mjs');service=await createFullSiteLocalizationService(options);}else{const {createGroupLocalizationService}=await import('./group-localizations.mjs');service=await createGroupLocalizationService(options);}
   const args={request,actor,groupId:route.groupId,locale:route.locale},result=route.kind.endsWith('_STATUS')?await service.readStatus(args):request.method==='PUT'?await service.saveDraft({...args,...parseMediaMutation(request)}):route.kind.endsWith('_QA')?await service.readQa(args):await service.readDraft(args);response.status(200).json(result);return;
  }
  if(route.kind.startsWith('SERVICE_LOCALIZATION')||route.kind.startsWith('SECTION_LOCALIZATION')||route.kind==='WORK_SERVICES_LOCALIZATION_QA'){
   if(new URL(request.originalUrl??request.url,'http://127.0.0.1').search)throw new ApiError('BAD_REQUEST');
   const {options}=await siteV3Dependencies();let service;
   if(route.kind.startsWith('SERVICE_LOCALIZATION')){const {createServiceLocalizationService}=await import('./service-localizations.mjs');service=await createServiceLocalizationService(options);}
   else if(route.kind.startsWith('SECTION_LOCALIZATION')){const {createWorkServicesLocalizationService}=await import('./work-services-localizations.mjs');service=await createWorkServicesLocalizationService(options);}
   else{const {createSiteLocaleProjectionService}=await import('./site-locale-projections.mjs');service=await createSiteLocaleProjectionService(options);}
   const args={request,actor,locale:route.locale,...(route.serviceId?{serviceId:route.serviceId}:{}),...(route.sectionId?{sectionId:route.sectionId}:{})};
   const result=route.kind.endsWith('_STATUS')?await service.readStatus(args):request.method==='PUT'?await service.saveDraft({...args,...parseMediaMutation(request)}):route.kind.endsWith('_QA')?await service.readQa(args):await service.readDraft(args);
   response.status(200).json(result);return;
  }
  if(route.kind.startsWith('PROJECT_LOCALIZATION')){
   if(new URL(request.originalUrl??request.url,'http://127.0.0.1').search)throw new ApiError('BAD_REQUEST');
   const {options}=await siteV3Dependencies(),{createProjectLocalizationService}=await import('./project-localizations.mjs'),service=await createProjectLocalizationService(options);
   const args={request,actor,projectId:route.projectId,locale:route.locale};
   const result=route.kind==='PROJECT_LOCALIZATION_STATUS'?await service.readStatus(args):request.method==='PUT'?await service.saveDraft({...args,...parseMediaMutation(request)}):route.kind==='PROJECT_LOCALIZATION_QA'?await service.readQa(args):await service.readDraft(args);
   response.status(200).json(result);return;
  }
  if(route.kind.startsWith('HERO_LOCALIZATION')){
   if(new URL(request.originalUrl??request.url,'http://127.0.0.1').search)throw new ApiError('BAD_REQUEST');
   const {options}=await siteV3Dependencies(),{createHeroLocalizationService}=await import('./hero-localizations.mjs'),service=await createHeroLocalizationService(options);
   const args={request,actor,locale:route.locale};
   const result=request.method==='PUT'?await service.saveDraft({...args,...parseMediaMutation(request)}):route.kind==='HERO_LOCALIZATION_QA'?await service.readQa(args):await service.readDraft(args);
   response.status(200).json(result);return;
  }
  if(route.kind==='MEDIA_READ_SNAPSHOT_BYTES'){
   const {options,library,storage}=await siteV3Dependencies(),{createSiteV3SnapshotService}=await import('./site-v3-snapshots.mjs');
   const snapshots=await createSiteV3SnapshotService(options);
   await handleSiteV3MediaReadRequest(request,response,{authorize:options.authorize,library,storage,readSnapshot:({request,snapshotId})=>snapshots.readSnapshot({request,id:snapshotId})},correlationId);return;
  }
  if(route.kind.startsWith('SITE_V3')){
   const {options}=await siteV3Dependencies();
   if(request.method==='GET'&&route.kind!=='SITE_V3_SOURCE_LIST'&&route.kind!=='SITE_V3_DRAFT_PREVIEW'&&new URL(request.originalUrl??request.url,'http://127.0.0.1').search)throw new ApiError('BAD_REQUEST');
   let result,status=200;
   if(route.kind==='SITE_V3_IMPORT'||route.kind==='SITE_V3_DRAFT'||route.kind==='SITE_V3_DRAFT_PREVIEW'){
    const {createSiteV3DraftService}=await import('./site-v3-drafts.mjs'),service=await createSiteV3DraftService(options);
    if(route.kind==='SITE_V3_DRAFT_PREVIEW')result=await service.readPreviewManifest({request,query:parseDraftPreviewQuery(request)});
    else if(route.kind==='SITE_V3_IMPORT'){result=await service.importSite({...context,...parseMediaMutation(request,262144)});status=201;}
    else result=request.method==='GET'?await service.readDraft(context):await service.saveDraft({...context,...parseMediaMutation(request,262144)});
   }else if(['SITE_V3_SUBMIT','SITE_V3_SNAPSHOT','SITE_V3_QA'].includes(route.kind)){
    const {createSiteV3SnapshotService}=await import('./site-v3-snapshots.mjs'),service=await createSiteV3SnapshotService(options);
    if(route.kind==='SITE_V3_SUBMIT'){result=await service.submitSnapshot({...context,...parseMediaMutation(request,262144)});status=201;}
    else result=route.kind==='SITE_V3_QA'?await service.readQa({...context,id:route.id}):await service.readSnapshot({...context,id:route.id});
   }else if(route.kind==='SITE_V3_REVIEW'){
    const {createSiteV3ReviewService}=await import('./site-v3-reviews.mjs'),service=await createSiteV3ReviewService(options);
    result=await service.submitReview({...context,...parseMediaMutation(request,262144)});status=201;
   }else{
    const {createSiteV3SourceCheckService}=await import('./site-v3-source-checks.mjs'),service=await createSiteV3SourceCheckService(options);
    if(route.kind==='SITE_V3_SOURCE_LIST')result=await service.readSources({...context,id:route.id,query:parseSourceQuery(request)});
    else{result=await service.writeSourceChecks({...context,...parseMediaMutation(request,262144)});status=201;}
   }
   response.status(status).json(result);return;
  }
  if(route.kind.startsWith('FILE_')){
   const {options,storage}=await siteV3Dependencies(),service=createFileResourceService({...options,storage,hosts:(process.env.PINKY_EXTERNAL_FILE_HOSTS??'').split(',').filter(Boolean)});
   const url=new URL(request.originalUrl??request.url,'http://127.0.0.1');
   if(route.kind==='FILE_POLICY'){response.status(200).json({hosts:service.hosts()});return;}
   if(request.method==='GET'&&route.kind==='FILE_RESOURCES'){if([...url.searchParams.keys()].some(k=>!['kind','source','cursor'].includes(k))||[...url.searchParams.keys()].some(k=>url.searchParams.getAll(k).length!==1))throw new ApiError('BAD_REQUEST');response.status(200).json(await service.list({request,kind:url.searchParams.get('kind')??undefined,source:url.searchParams.get('source')??undefined,cursor:url.searchParams.get('cursor')??undefined}));return;}
   if(url.search)throw new ApiError('BAD_REQUEST');
   if(route.operation==='bytes'){
    const asset=await service.detail({request,id:route.id}),release=reserveMediaReadBytes(asset.sizeBytes);let reading=true,closed=false;
    const close=()=>{closed=true;if(!reading)release();};response.once('finish',close);response.once('close',close);
    try{const result=await service.bytes({request,id:route.id});reading=false;if(closed||response.destroyed){release();return;}response.set('Content-Type',result.asset.mimeType).set('Content-Length',String(result.bytes.length)).set('Content-Disposition','attachment; filename="'+encodeURIComponent(result.asset.downloadName)+'"').status(200).end(result.bytes);}catch(error){reading=false;release();response.removeListener('finish',close);response.removeListener('close',close);throw error;}return;
   }
   if(route.operation==='detail'){response.status(200).json(await service.detail({request,id:route.id}));return;}
   if(route.index!==null&&route.index!==undefined){const part=parseMediaPart(request);response.status(200).json(await service.part({request,id:route.id,index:route.index,bytes:part.bytes,key:part.key}));return;}
   const args={request,...parseMediaMutation(request),id:route.id};response.status(200).json(await (route.operation==='complete'?service.complete(args):route.operation==='archive'?service.archive(args):service.create(args)));return;
  }
  if(route.kind==='MEDIA_ARCHIVE'){
   const [{createMediaArchiveService},{db,authorize}]=await Promise.all([import('./media-archive.mjs'),import('./authorization.mjs')]);
   const service=createMediaArchiveService({db,authorize}),mutation=parseMediaMutation(request);
   response.status(200).json(await service.archiveMedia({request,actor,assetId:route.assetId,body:mutation.body,key:mutation.key}));return;
  }
  if(route.kind==='MEDIA_JOB_READ'){
   if(new URL(request.originalUrl??request.url,'http://127.0.0.1').search)throw new ApiError('BAD_REQUEST');
   const {createMediaUploadService}=await import('./media-upload-service.mjs');
   const service=await createMediaUploadService();
   response.status(200).json(await service.readJobSummary({...context,jobId:route.jobId}));return;
  }
  if(route.kind.startsWith('MEDIA_READ')){await handleMediaReadRequest(request,response,await mediaReadDependencies(),correlationId);return;}
  if(route.kind.startsWith('MEDIA_UPLOAD')||route.kind==='MEDIA_RETRY'){
   const {createMediaUploadService}=await import('./media-upload-service.mjs');
   const service=await createMediaUploadService();
   let result;
   if(route.kind==='MEDIA_UPLOAD_PART')result=await service.uploadPart({...context,intentId:route.intentId,partIndex:route.partIndex,...parseMediaPart(request)});
   else{
    const mutation=parseMediaMutation(request);
    if(route.kind==='MEDIA_UPLOAD_CREATE')result=await service.createUpload({...context,...mutation});
    else if(route.kind==='MEDIA_UPLOAD_COMPLETE')result=await service.completeUpload({...context,intentId:route.intentId,...mutation});
    else if(route.kind==='MEDIA_UPLOAD_CANCEL')result=await service.cancelUpload({...context,intentId:route.intentId,...mutation});
    else result=await service.retryJob({...context,jobId:route.jobId,...mutation});
   }
   response.status(route.kind==='MEDIA_UPLOAD_CREATE'?201:200).json(result);return;
  }
  if(route.kind==='SOURCE_CHECK' || route.kind==='SOURCE_LIST'){
   const {createSourceCheckService}=await import('./source-checks.mjs');
   const service=await createSourceCheckService();
   const result=route.kind==='SOURCE_LIST'?await service.readSources({...context,id:route.id,query:parseSourceQuery(request)}):await service.writeSourceChecks({...context,...parseMutation(request)});
   response.status(route.kind==='SOURCE_LIST'?200:201).json(result);return;
  }
  if(route.kind==='SESSION'){response.status(200).json({uid:actor.uid,role:actor.role,isActive:true,authzVersion:actor.authzVersion});return;}
  if(route.kind==='SITE_IMPORT'){
   const service=await createSiteImportService();
   response.status(201).json(await service.importSite({...context,...parseMutation(request)}));return;
  }
  if(route.kind==='SITE_DRAFT'){
   const service=await createSiteDraftService();
   const result=request.method==='GET'?await service.readDraft(context):await service.saveDraft({...context,...parseMutation(request)});
   response.status(200).json(result);return;
  }
  if(route.kind==='DRAFT'){
   const service=createDraftService();
   const result=request.method==='GET'?await service.readDraft(context):await service.saveDraft({...context,...parseMutation(request)});
   response.status(200).json(result);return;
  }
  if(route.kind==='SNAPSHOT'){
   resourceIdSchema.parse(route.id);
   const result=await futureHandler('snapshots','readSnapshot',{...context,id:route.id});
   response.status(200).json(result);return;
  }
  const handler=route.kind==='SUBMIT'?['snapshots','submitSnapshot']:['reviews','submitReview'];
  const result=await futureHandler(...handler,{...context,...parseMutation(request)});
  response.status(201).json(result);
 }catch(error){
  if(!(error instanceof ApiError))console.warn('CMS_ROUTE_FAILED',{correlationId,name:error?.name,frames:String(error?.stack??'').split('\n').filter(line=>line.trimStart().startsWith('at ')).slice(0,6)});
  const safe=siteErrorResponse(error,correlationId);
  response.status(safe.status).json(safe.body);
 }
}
