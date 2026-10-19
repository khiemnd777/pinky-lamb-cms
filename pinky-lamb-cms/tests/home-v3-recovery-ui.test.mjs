import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm';
import {webcrypto} from 'node:crypto';
import {z} from 'zod';
import {installNetworkFence} from '../scripts/local-guard.mjs';
import {siteDirtyGroups} from '../admin/site-group-dirty.mjs';

installNetworkFence();
const source=readFileSync(new URL('../admin/site-media-editor.mjs',import.meta.url),'utf8');
async function waitForIdle(nodes,pending){
 const deadline=Date.now()+1000;
 do{
  await new Promise(resolve=>setImmediate(resolve));
  if(pending.size===0&&(nodes.get('v3-reload')?.disabled===false||nodes.get('v3-retry')?.disabled===false))return;
 }while(Date.now()<deadline);
 assert.fail(`Recovery editor did not settle: ${nodes.get('v3-status')?.textContent}; pending=${[...pending].join(', ')}`);
}
// Execute the real editor orchestration. Only DOM/component/preview boundaries
// are synthetic: these tests prove state and actions, not rendered browser QA.
async function editor({role='OWNER',fetch,confirm=()=>true}={}){
 const nodes=new Map(),events=new EventTarget(),document={getElementById:id=>nodes.get(id),addEventListener:(...args)=>events.addEventListener(...args),removeEventListener:(...args)=>events.removeEventListener(...args)};
 const node=(tag,text,attributes={})=>({tag,textContent:text??'',children:[],ownerDocument:document,dataset:{},hidden:false,disabled:false,append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},querySelectorAll(){return [];},remove(){},removeAttribute(){},setAttribute(){},...attributes});
 const siteNode=(tag,text,attributes)=>{const result=node(tag,text,attributes);if(result.id)nodes.set(result.id,result);return result;};
 const siteButton=(label,id,handler)=>{const result=siteNode('button',label,{id});result.click=handler;return result;};
 class CustomEvent extends Event{constructor(type,options){super(type);this.detail=options.detail;}}
 const session={uid:'synthetic-user',role,authzVersion:1},windowEvents=new EventTarget(),dirtyEvents=[],requests=[],pending=new Set();
 windowEvents.addEventListener('cms:site-dirty',event=>dirtyEvents.push(event.detail.groups));
 const context=createContext({document,CustomEvent,window:{confirm,addEventListener:(...args)=>windowEvents.addEventListener(...args),removeEventListener:(...args)=>windowEvents.removeEventListener(...args),dispatchEvent:event=>windowEvents.dispatchEvent(event)},structuredClone,AbortController,DOMException,crypto:webcrypto,TextEncoder,URL,Blob,console});
 const calls={resolverClear:0,resolverDestroy:0,previewDestroy:0};
 const noop=()=>{},components=['mountSiteSettings','mountSiteClients','mountSiteWork','mountSiteServices','mountSiteAbout','mountSiteIp','mountSiteContact','mountSiteFooter'];
 const bindings={siteDirtyGroups,z,canonicalMediaV2Json:JSON.stringify,revisionSchema:z.number().int().nonnegative(),resourceIdSchema:z.string(),hashSchema:z.string(),siteNode,siteButton,
  mountSiteFields:()=>({destroy:noop,setDisabled:noop,getSelectedGroup:()=>undefined}),
  createSiteMediaPreview:()=>({clear:noop,destroy(){calls.previewDestroy++;}}),
  createSavedSiteManifestResolver:()=>({clear(){calls.resolverClear++;},destroy(){calls.resolverDestroy++;},get(){assert.fail('Recovery tests must not request a preview manifest');}}),parseSiteMediaDraft:value=>value,
  closePinkySelects:noop,disposePinkySelects:noop,...Object.fromEntries(components.map(name=>[name,noop]))};
 // These boundaries are outside recovery load/import; fail if a test crosses one.
 for(const name of ['createCmsIcon','createImagePreview','contentDigestProjectionV2','createMediaV3ContentSchemas','parseMediaV3Content','projectClaimGroupsV3','createMediaV2RecordSchemas','sourceCheckRequestSchema','sourceCheckReceiptSchema','sourceCheckV3Schema','openMediaSlotPicker','validateSiteMediaSnapshot','strictMediaV2JsonSchema','beginMediaPreviewBinary','registerMediaPreviewResourceOwner','createPinkySelect'])bindings[name]=()=>assert.fail('Unexpected recovery boundary: '+name);
 const module=new SourceTextModule(source,{context,identifier:'actual-site-media-editor'});
 await module.link(specifier=>{
  const statements=[...source.matchAll(new RegExp('import \\{([^}]+)\\} from [\'\"]'+specifier.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'[\'\"]','g'))];
  assert.ok(statements.length,'Explicit named dependency '+specifier);
  const names=[...new Set(statements.flatMap(statement=>statement[1].split(',').map(name=>name.trim())))];
  for(const name of names)assert.ok(Object.hasOwn(bindings,name),'Missing explicit recovery binding: '+name);
  return new SyntheticModule(names,function(){for(const name of names)this.setExport(name,bindings[name]);},{context});
 });
 await module.evaluate();
 const apiFetch=async(path,options={})=>{const request={path,options};requests.push(request);pending.add(request);try{return await fetch(path,options);}finally{pending.delete(request);}};
 const instance=module.namespace.mountSiteMediaEditor(node('root'),{apiFetch,getSession:()=>session,session});
 try{await waitForIdle(nodes,pending);}catch(error){instance.destroy();throw error;}
 return {nodes,requests,dirtyEvents,calls,async click(id,{force=false}={}){const button=nodes.get(id);assert.ok(button,id+' exists');if(!force)assert.ok(!button.hidden&&!button.disabled,id+' is available');button.click();await waitForIdle(nodes,pending);},destroy(){try{assert.equal(pending.size,0,'No requests left after recovery');}finally{instance.destroy();}assert.equal(calls.resolverDestroy,1);assert.equal(calls.previewDestroy,1);assert.ok(calls.resolverClear>=1);}};
}
const absent=()=>Object.assign(Error('Chưa có bản nháp Home v3.'),{status:404,code:'DRAFT_NOT_INITIALIZED'});
const loaded=()=>({draft:{content:{projects:[]},revision:0,catalog:[],importLineage:{importId:'synthetic-import'}},context:{sourceCatalog:[]}});

const savedStatus='Toàn website — phiên bản 0 — đã lưu';
const importReceipt=()=>({draftId:'home-v3',contractRevision:2,revision:0,importId:'synthetic-import',sourceDraftRevision:778});
function assertRecovered(view){
 assert.equal(view.nodes.get('v3-status').textContent,savedStatus);
 assert.equal(view.nodes.get('v3-import').hidden,true);
 assert.equal(view.nodes.get('v3-save').disabled,true,'Recovered content is clean');
 assert.equal(view.nodes.get('v3-retry').disabled,true,'No unresolved intent remains');
 assert.deepEqual(view.dirtyEvents.at(-1),[]);
}

test('uninitialized draft shows actionable OWNER state instead of generic error',async()=>{
 const view=await editor({fetch:async()=>{throw absent();}});
 try{
  assert.match(view.nodes.get('v3-status').textContent,/Chưa có Home v3/);
  assert.match(view.nodes.get('v3-status').textContent,/Nhập Home v2 hiện tại/);
  assert.equal(view.nodes.get('v3-import').hidden,false);assert.equal(view.nodes.get('v3-save').disabled,true);
  assert.deepEqual(view.requests.map(value=>value.path),['/api/cms/drafts/home-v3'],'No automatic import');
 }finally{view.destroy();}
});
test('non-OWNER cannot import missing draft',async()=>{
 for(const role of ['EDITOR','REVIEWER','PUBLISHER']){
  const view=await editor({role,fetch:async()=>{throw absent();}});
  try{
   assert.equal(view.nodes.get('v3-import').hidden,true);assert.match(view.nodes.get('v3-status').textContent,/OWNER/);
   await view.click('v3-import',{force:true});
   assert.deepEqual(view.requests.map(value=>value.path),['/api/cms/drafts/home-v3'],'Even direct handler invocation cannot import');
  }finally{view.destroy();}
 }
});
test('media404, auth failures and server errors stay errors and never offer import',async()=>{
 for(const [status,code] of [[404,'NOT_FOUND'],[401,'UNAUTHENTICATED'],[403,'FORBIDDEN'],[500,'INTERNAL_ERROR'],[503,'LOCAL_RUNTIME_UNAVAILABLE'],[500,'DRAFT_NOT_INITIALIZED']]){
  const view=await editor({fetch:async()=>{throw Object.assign(Error('Synthetic '+code),{status,code});}});
  try{
   assert.equal(view.nodes.get('v3-status').textContent,'Synthetic '+code);assert.equal(view.nodes.get('v3-import').hidden,true);
   assert.equal(view.requests.length,1);
  }finally{view.destroy();}
 }
});
test('reload clears missing state on real successful editor load',async()=>{
 let missing=true;const view=await editor({fetch:async()=>{if(missing)throw absent();return loaded();}});
 try{
  missing=false;await view.click('v3-reload');assertRecovered(view);
  assert.deepEqual(view.requests.map(value=>value.path),['/api/cms/drafts/home-v3','/api/cms/drafts/home-v3']);
 }finally{view.destroy();}
});
test('failed import remains retryable and successful import clears stale error',async()=>{
 let saved=false,attempts=0;const writes=[];
 const view=await editor({fetch:async(path,options={})=>{
  if(path.endsWith('/home-v2'))return {revision:778};
  if(path.endsWith('/import')){writes.push(options);if(++attempts===1)throw Object.assign(Error('Synthetic denied import'),{status:403,code:'FORBIDDEN'});saved=true;return importReceipt();}
  if(!saved)throw absent();return loaded();
 }});
 try{
  await view.click('v3-import');assert.equal(view.nodes.get('v3-status').textContent,'Synthetic denied import');
  assert.equal(view.nodes.get('v3-import').disabled,false);assert.equal(view.nodes.get('v3-retry').disabled,true);
  await view.click('v3-import');assertRecovered(view);assert.equal(writes.length,2);
  for(const write of writes){assert.equal(write.method,'POST');assert.deepEqual(JSON.parse(write.body),{expectedM2Revision:778});}
  assert.notEqual(writes[0].headers['Idempotency-Key'],writes[1].headers['Idempotency-Key'],'Definite failure permits a new intent');
  assert.equal(view.requests.at(-1).path,'/api/cms/drafts/home-v3','Confirmed success reads the draft');
 }finally{view.destroy();}
});
test('uncertain import retries same key/body and clears error on confirmed recovery',async()=>{
 let saved=false;const writes=[];
 const view=await editor({fetch:async(path,options={})=>{
  if(path.endsWith('/home-v2'))return {revision:778};
  if(path.endsWith('/import')){writes.push(options);saved=true;if(writes.length===1)throw Object.assign(Error('Synthetic uncertain response'),{status:503,code:'INTERNAL_ERROR'});return importReceipt();}
  if(!saved)throw absent();return loaded();
 }});
 try{
  await view.click('v3-import');assert.equal(view.nodes.get('v3-status').textContent,'Synthetic uncertain response');
  assert.equal(view.nodes.get('v3-retry').disabled,false);assert.equal(view.nodes.get('v3-import').disabled,true);
  await view.click('v3-retry');assert.equal(writes.length,2);
  assert.ok(writes[0].headers['Idempotency-Key']);assert.equal(writes[0].headers['Idempotency-Key'],writes[1].headers['Idempotency-Key']);assert.equal(writes[0].body,writes[1].body);
  assert.equal(view.requests.filter(value=>value.path.endsWith('/home-v2')).length,1,'Retry uses held revision rather than rereading M2');
  assertRecovered(view);assert.equal(view.requests.at(-1).path,'/api/cms/drafts/home-v3');
 }finally{view.destroy();}
});
