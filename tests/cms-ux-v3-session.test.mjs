import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm';
import {webcrypto} from 'node:crypto';
import {siteDirtyGroups} from '../admin/site-group-dirty.mjs';
import {z} from 'zod';
import {installNetworkFence} from '../scripts/local-guard.mjs';

installNetworkFence();
const source=readFileSync(new URL('../admin/site-media-editor.mjs',import.meta.url),'utf8');
const drain=async()=>{for(let i=0;i<4;i++)await new Promise(resolve=>setImmediate(resolve));};
const loaded=()=>({draft:{content:{projects:[]},revision:0,catalog:[],importLineage:{importId:'synthetic-import'}},context:{sourceCatalog:[]}});

// Execute the real async editor orchestration. DOM/components/preview are
// synthetic boundaries; no network, retained data or browser state is used.
async function mountPendingEditor(){
 const nodes=new Map(),events=new EventTarget(),document={getElementById:id=>nodes.get(id),addEventListener:(...args)=>events.addEventListener(...args),removeEventListener:(...args)=>events.removeEventListener(...args)};
 const node=(tag,text,attributes={})=>({tag,textContent:text??'',children:[],ownerDocument:document,dataset:{},hidden:false,disabled:false,append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},querySelectorAll(){return [];},remove(){},removeAttribute(){},setAttribute(){},...attributes});
 const siteNode=(tag,text,attributes)=>{const result=node(tag,text,attributes);if(result.id)nodes.set(result.id,result);return result;};
 const siteButton=(label,id,handler)=>{const result=siteNode('button',label,{id});result.click=handler;return result;};
 const initialSession={uid:'synthetic-user',role:'OWNER',authzVersion:1};let currentSession=initialSession,mountCount=0,resolveRead,signal;
 const read=new Promise(resolve=>{resolveRead=resolve;});
 class CustomEvent extends Event{constructor(type,options){super(type);this.detail=options.detail;}}
 const context=createContext({document,CustomEvent,window:{confirm:()=>true,addEventListener(){},removeEventListener(){},dispatchEvent(){}},structuredClone,AbortController,DOMException,crypto:webcrypto,TextEncoder,URL,Blob,console});
 const noop=()=>{},components=['mountSiteSettings','mountSiteClients','mountSiteWork','mountSiteServices','mountSiteAbout','mountSiteIp','mountSiteContact','mountSiteFooter'];
 const bindings={siteDirtyGroups,z,canonicalMediaV2Json:JSON.stringify,revisionSchema:z.number().int().nonnegative(),resourceIdSchema:z.string(),hashSchema:z.string(),siteNode,siteButton,
  mountSiteFields:()=>{mountCount++;return {destroy:noop,setDisabled:noop,getSelectedGroup:()=>undefined};},
  createSiteMediaPreview:()=>({clear:noop,destroy:noop}),createSavedSiteManifestResolver:()=>({clear:noop,destroy:noop}),parseSiteMediaDraft:value=>value,
  closePinkySelects:noop,disposePinkySelects:noop,...Object.fromEntries(components.map(name=>[name,noop]))};
 const module=new SourceTextModule(source,{context,identifier:'actual-site-media-editor-session-regression'});
 await module.link(specifier=>{
  const statements=[...source.matchAll(new RegExp('import \\{([^}]+)\\} from [\'\"]'+specifier.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'[\'\"]','g'))];
  assert.ok(statements.length,'Explicit named dependency '+specifier);
  const names=[...new Set(statements.flatMap(statement=>statement[1].split(',').map(name=>name.trim())))];
  return new SyntheticModule(names,function(){for(const name of names)this.setExport(name,bindings[name]??noop);},{context});
 });
 await module.evaluate();
 const instance=module.namespace.mountSiteMediaEditor(node('root'),{apiFetch:async(_path,options)=>{signal=options.signal;return read;},getSession:()=>currentSession,session:initialSession});
 await drain();
 return {nodes,instance,get signal(){return signal;},get mountCount(){return mountCount;},async session(value){currentSession=value;events.dispatchEvent(new Event('cms:session'));await drain();},async resolve(){resolveRead(loaded());await drain();}};
}

test('same authenticated identity event does not cancel initial v3 read or strand pending',async()=>{
 const view=await mountPendingEditor();assert.equal(view.signal.aborted,false);assert.equal(view.mountCount,0);
 await view.session({uid:'synthetic-user',role:'OWNER',authzVersion:1});
 assert.equal(view.signal.aborted,false,'same member must retain in-flight initial read');
 await view.resolve();assert.equal(view.mountCount,1);assert.equal(view.nodes.get('v3-status').textContent,'Toàn website — phiên bản 0 — đã lưu');assert.equal(view.nodes.get('v3-reload').disabled,false);assert.equal(view.nodes.get('v3-saved-preview').disabled,false);view.instance.destroy();
});

test('null or changed uid/role/authzVersion aborts and blocks late private read completion',async()=>{
 for(const session of [null,{uid:'other-user',role:'OWNER',authzVersion:1},{uid:'synthetic-user',role:'REVIEWER',authzVersion:1},{uid:'synthetic-user',role:'OWNER',authzVersion:2}]){
  const view=await mountPendingEditor();await view.session(session);assert.equal(view.signal.aborted,true);await view.resolve();assert.equal(view.mountCount,0,'late private read must never mount');assert.equal(view.nodes.get('v3-status').textContent,'Phiên đã thay đổi. Mở lại Toàn website.');view.instance.destroy();
 }
});
