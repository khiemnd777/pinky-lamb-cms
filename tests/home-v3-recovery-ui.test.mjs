import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm';
import {webcrypto} from 'node:crypto';
import {z} from 'zod';
import {installNetworkFence} from '../scripts/local-guard.mjs';

installNetworkFence();
const source=readFileSync(new URL('../admin/site-media-editor.mjs',import.meta.url),'utf8');
const drain=async()=>{for(let i=0;i<4;i++)await new Promise(resolve=>setImmediate(resolve));};
// Execute the real editor orchestration. Only DOM/component/preview boundaries
// are synthetic: these tests prove state and actions, not rendered browser QA.
async function editor({role='OWNER',fetch,confirm=()=>true}={}){
 const nodes=new Map(),events=new EventTarget(),document={getElementById:id=>nodes.get(id),addEventListener:(...args)=>events.addEventListener(...args),removeEventListener:(...args)=>events.removeEventListener(...args)};
 const node=(tag,text,attributes={})=>({tag,textContent:text??'',children:[],ownerDocument:document,dataset:{},hidden:false,disabled:false,append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},querySelectorAll(){return [];},remove(){},removeAttribute(){},setAttribute(){},...attributes});
 const siteNode=(tag,text,attributes)=>{const result=node(tag,text,attributes);if(result.id)nodes.set(result.id,result);return result;};
 const siteButton=(label,id,handler)=>{const result=siteNode('button',label,{id});result.click=handler;return result;};
 const session={uid:'synthetic-user',role,authzVersion:1},context=createContext({document,window:{confirm,addEventListener(){},removeEventListener(){}},structuredClone,AbortController,DOMException,crypto:webcrypto,TextEncoder,URL,Blob,console});
 const noop=()=>{},components=['mountSiteSettings','mountSiteClients','mountSiteWork','mountSiteServices','mountSiteAbout','mountSiteIp','mountSiteContact','mountSiteFooter'];
 const bindings={z,canonicalMediaV2Json:JSON.stringify,revisionSchema:z.number().int().nonnegative(),resourceIdSchema:z.string(),hashSchema:z.string(),siteNode,siteButton,
  mountSiteFields:()=>({destroy:noop,setDisabled:noop,getSelectedGroup:()=>undefined}),
  createSiteMediaPreview:()=>({clear:noop,destroy:noop}),parseSiteMediaDraft:value=>value,
  closePinkySelects:noop,disposePinkySelects:noop,...Object.fromEntries(components.map(name=>[name,noop]))};
 const module=new SourceTextModule(source,{context,identifier:'actual-site-media-editor'});
 await module.link(specifier=>{
  const statements=[...source.matchAll(new RegExp('import \\{([^}]+)\\} from [\'\"]'+specifier.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'[\'\"]','g'))];
  assert.ok(statements.length,'Explicit named dependency '+specifier);
  const names=[...new Set(statements.flatMap(statement=>statement[1].split(',').map(name=>name.trim())))];
  return new SyntheticModule(names,function(){for(const name of names)this.setExport(name,bindings[name]??noop);},{context});
 });
 await module.evaluate();
 const instance=module.namespace.mountSiteMediaEditor(node('root'),{apiFetch:fetch,getSession:()=>session,session});await drain();
 return {nodes,session,instance,async click(id){const button=nodes.get(id);assert.ok(!button.hidden&&!button.disabled,id+' is available');button.click();await drain();}};
}
const absent=()=>Object.assign(Error('Chưa có bản nháp Home v3.'),{status:404,code:'DRAFT_NOT_INITIALIZED'});
const loaded=()=>({draft:{content:{projects:[]},revision:0,catalog:[],importLineage:{importId:'synthetic-import'}},context:{sourceCatalog:[]}});

test('uninitialized draft shows actionable OWNER state instead of generic error',async()=>{
 const view=await editor({fetch:async()=>{throw absent();}});
 assert.match(view.nodes.get('v3-status').textContent,/Chưa có Home v3/);
 assert.match(view.nodes.get('v3-status').textContent,/Nhập Home v2 hiện tại/);
 assert.equal(view.nodes.get('v3-import').hidden,false);assert.equal(view.nodes.get('v3-save').disabled,true);view.instance.destroy();
});
test('non-OWNER cannot import missing draft',async()=>{
 for(const role of ['EDITOR','REVIEWER','PUBLISHER']){
  let calls=0;const view=await editor({role,fetch:async()=>{calls++;throw absent();}});
  assert.equal(view.nodes.get('v3-import').hidden,true);assert.match(view.nodes.get('v3-status').textContent,/OWNER/);
  view.nodes.get('v3-import').click();await drain();assert.equal(calls,1);view.instance.destroy();
 }
});
test('media404, auth failures and server errors stay errors and never offer import',async()=>{
 for(const [status,code] of [[404,'NOT_FOUND'],[401,'UNAUTHENTICATED'],[403,'FORBIDDEN'],[500,'INTERNAL_ERROR'],[503,'LOCAL_RUNTIME_UNAVAILABLE'],[500,'DRAFT_NOT_INITIALIZED']]){
  const view=await editor({fetch:async()=>{throw Object.assign(Error('Synthetic '+code),{status,code});}});
  assert.equal(view.nodes.get('v3-status').textContent,'Synthetic '+code);assert.equal(view.nodes.get('v3-import').hidden,true);view.instance.destroy();
 }
});
test('reload clears missing state on real successful editor load',async()=>{
 let missing=true;const view=await editor({fetch:async()=>{if(missing)throw absent();return loaded();}});missing=false;await view.click('v3-reload');
 assert.equal(view.nodes.get('v3-status').textContent,'Home v3 — phiên bản 0 — đã lưu');assert.equal(view.nodes.get('v3-import').hidden,true);view.instance.destroy();
});
test('failed import remains retryable and successful import clears stale error',async()=>{
 let saved=false,attempts=0;const writes=[];
 const view=await editor({fetch:async(path,options={})=>{
  if(path.endsWith('/home-v2'))return {revision:778};
  if(path.endsWith('/import')){writes.push(options);if(++attempts===1)throw Object.assign(Error('Synthetic denied import'),{status:403,code:'FORBIDDEN'});saved=true;return {draftId:'home-v3',contractRevision:2,revision:0,importId:'synthetic-import',sourceDraftRevision:778};}
  if(!saved)throw absent();return loaded();
 }});
 await view.click('v3-import');assert.equal(view.nodes.get('v3-status').textContent,'Synthetic denied import');await view.click('v3-import');
 assert.equal(view.nodes.get('v3-status').textContent,'Home v3 — phiên bản 0 — đã lưu');assert.equal(JSON.parse(writes[1].body).expectedM2Revision,778);view.instance.destroy();
});
test('uncertain import retries same key/body and clears error on confirmed recovery',async()=>{
 let saved=false;const writes=[];
 const view=await editor({fetch:async(path,options={})=>{
  if(path.endsWith('/home-v2'))return {revision:778};
  if(path.endsWith('/import')){writes.push(options);saved=true;if(writes.length===1)throw Object.assign(Error('Synthetic uncertain response'),{status:503,code:'INTERNAL_ERROR'});return {draftId:'home-v3',contractRevision:2,revision:0,importId:'synthetic-import',sourceDraftRevision:778};}
  if(!saved)throw absent();return loaded();
 }});
 await view.click('v3-import');assert.equal(view.nodes.get('v3-retry').disabled,false);await view.click('v3-retry');
 assert.equal(writes[0].headers['Idempotency-Key'],writes[1].headers['Idempotency-Key']);assert.equal(writes[0].body,writes[1].body);
 assert.equal(view.nodes.get('v3-status').textContent,'Home v3 — phiên bản 0 — đã lưu');view.instance.destroy();
});
