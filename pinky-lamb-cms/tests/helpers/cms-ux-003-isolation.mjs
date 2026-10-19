import assert from 'node:assert/strict';
export const fixtureCollections=Object.freeze(['cmsDrafts','cmsAudit','cmsIdempotency','cmsSiteImports','cmsSiteSources','cmsSiteV3Imports','cmsSnapshotsV3','cmsReviewStatesV3','cmsReviewsV3','cmsSourceChecksV3']);
export function namespaceCollection(namespace,name){
 assert.match(namespace,/^cmsux003_[a-f0-9]{32}$/);
 assert.ok(fixtureCollections.includes(name),'Unmapped collection refused');
 return namespace+'__'+name;
}
export function classifyFixtureRequest(method,input){
 const url=new URL(input);if(url.origin!=='http://127.0.0.1:5173'||url.username||url.password||url.hash)return 'deny';
 if(method==='GET'&&url.pathname==='/api/cms/media'){
  const allowed=new Set(['kind','status','pageSize','cursor']);
  if([...url.searchParams.keys()].some(key=>!allowed.has(key)||url.searchParams.getAll(key).length!==1))return 'deny';
  return 'media-read';
 }
 if(method==='GET'&&!url.search&&/^\/api\/cms\/media\/[A-Za-z0-9_-]{1,100}(?:\/derivatives\/[A-Za-z0-9][A-Za-z0-9_-]{0,127})?$/.test(url.pathname))return 'media-read';
 const routes={
  'GET /api/cms/session':'session-read',
  'GET /api/cms/drafts/home-v3':'draft-read',
  'PATCH /api/cms/drafts/home-v3':'draft-save',
  'GET /api/cms/media-site/drafts/home-v3/preview':'preview-read',
  'POST /api/cms/media-site/snapshots':'snapshot-submit',
  'POST /api/cms/media-site/reviews':'review-submit',
 };
 if(url.search&&url.pathname!=='/api/cms/media-site/drafts/home-v3/preview')return 'deny';
 return routes[method+' '+url.pathname]??'deny';
}
/** No fallback/continue: even unknown GETs are blocked. This adapter is NOT HTTP-handler E2E. */
export async function attachFixtureAdapter(page,fixture,{role='EDITOR'}={}){
 const events=[],pending=new Set(),failures=[],expectedReadAborts=[],requestErrors=new Map();let disposed=false;
 function classify(entry,request){
  const observed=request.failure?.()?.errorText??null;entry.requestFailure=observed==='net::ERR_ABORTED'?observed:observed?'OTHER_OBSERVED_FAILURE':null;
  const approved=entry.kind==='preview-read'&&entry.method==='GET'&&entry.path==='/api/cms/media-site/drafts/home-v3/preview';
  entry.disposition=approved&&observed==='net::ERR_ABORTED'?'EXPECTED_READ_ABORT':'FAIL';
  if(entry.disposition==='EXPECTED_READ_ABORT'&&!expectedReadAborts.includes(entry))expectedReadAborts.push(entry);
 }
 function safeMessage(error){const text=String(error.message??''),known=['Route is already handled!','Target page, context or browser has been closed','Request was aborted'];for(const value of known)if(text.includes(value))return value;const protocol=text.match(/Protocol error \(Fetch\.fulfillRequest\): [A-Za-z .]+/);return protocol?.[0]??'UNCLASSIFIED_TRANSPORT_ERROR';}
 const requestFailed=request=>{const entry=requestErrors.get(request);if(entry)classify(entry,request);};page.on?.('requestfailed',requestFailed);
 async function respond(route,event){
  const request=route.request(),kind=event.kind;let response;
  if(kind==='deny'||disposed)response={status:403,json:{error:{code:'FIXTURE_ROUTE_DENIED',message:'Test adapter refuses unhandled request.'}}};
  else try{
   if(kind==='media-read')response=await fixture.readMedia(request.url(),{role});
   else{const value=await fixture.dispatch(kind,{role,body:request.postDataJSON(),key:request.headers()['idempotency-key'],url:request.url()});response={status:kind.endsWith('submit')?201:200,json:value};}
  }catch(error){const safe=fixture.errorResponse(error);response={status:safe.status,json:safe.body};}
  event.phase='fulfill';await route.fulfill(response);event.phase='complete';event.completedAt=Date.now();
 }
 const handler=route=>{
  const request=route.request(),event={method:request.method(),path:new URL(request.url()).pathname,kind:classifyFixtureRequest(request.method(),request.url()),phase:'dispatch',startedAt:Date.now()};events.push(event);
  const operation=respond(route,event).catch(error=>{const entry={method:event.method,path:event.path,kind:event.kind,phase:event.phase,name:error.name,code:error.code??null,message:safeMessage(error),at:Date.now()};requestErrors.set(request,entry);failures.push(entry);classify(entry,request);event.phase='failed';event.completedAt=Date.now();});pending.add(operation);operation.finally(()=>pending.delete(operation));return operation;
 };
 async function drain(){while(pending.size)await Promise.all([...pending]);for(const [request,entry]of requestErrors)classify(entry,request);if(failures.some(entry=>entry.disposition!=='EXPECTED_READ_ABORT'))throw new Error('Fixture adapter response delivery failed');}
 await page.route('**/api/cms/**',handler);
 return {events,failures,expectedReadAborts,drain,async dispose(){try{await drain();}finally{disposed=true;try{await page.unroute('**/api/cms/**',handler);}catch(error){failures.push({phase:'unroute',name:error.name,code:error.code??null,disposition:'FAIL'});}await Promise.all([...pending]);page.off?.('requestfailed',requestFailed);}for(const [request,entry]of requestErrors)classify(entry,request);if(failures.some(entry=>entry.disposition!=='EXPECTED_READ_ABORT'))throw new Error('Fixture adapter response delivery failed');}};
}
