import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm';

// Real auth.mjs and auth-session.mjs; inert SDK/DOM/transport boundaries. No live Auth.
class Element extends EventTarget{
 constructor(){super();this.hidden=false;this.disabled=false;this.value='';this.textContent='';this.children=[];this.dataset={};}
 replaceChildren(...children){this.children=children;}
 append(...children){this.children.push(...children);}
 querySelectorAll(){return [];}
 removeAttribute(){}
}
async function harness(){
 const nodes=new Map(),document=new EventTarget();document.getElementById=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);};document.documentElement=new Element();document.querySelectorAll=()=>[];document.createElement=()=>new Element();
 let observer,signOuts=0,tokenCalls=0,readyCalls=0,deadline,fetcher=async()=>({status:200,ok:true,json:async()=>({uid:'synthetic-member',role:'OWNER',authzVersion:1})}),tokenError=null,mountError=null,persistences;
 const user={getIdToken:async()=>{tokenCalls++;if(tokenError)throw Object.assign(Error('synthetic Auth condition'),{code:tokenError});return 'synthetic-not-a-real-token';}};
 const auth={currentUser:user,authStateReady:async()=>{readyCalls++;}};
 class CustomEvent extends Event{constructor(type,options){super(type);this.detail=options?.detail;}}
 const context=createContext({document,CustomEvent,Event,EventTarget,URL,URLSearchParams,Headers,TextDecoder,TextEncoder,Uint8Array,AbortController,DOMException,atob,btoa,console,
  fetch:(...args)=>fetcher(...args),setTimeout:(fn,ms)=>{if(ms===15000){deadline=fn;return 'session-deadline';}return setTimeout(fn,ms);},clearTimeout:id=>{if(id!=='session-deadline')clearTimeout(id);}});
 const modules=new Map();
 const synthetic=(name,exports)=>{const module=new SyntheticModule(Object.keys(exports),function(){for(const [key,value]of Object.entries(exports))this.setExport(key,value);},{context,identifier:name});modules.set(name,module);};
 synthetic('./config-local.mjs',{assertLocalOrigin(){},firebaseConfig:{},LOCAL:{auth:'http://127.0.0.1:9099'},RECOVERY_READ_ONLY:false});
 synthetic('./cms-shell.mjs',{mountCmsShell:()=>({setSession(){},setResource(){},setBusy(){},refreshPanels(){}})});
 synthetic('./pinky-select.mjs',{closePinkySelects(){},disposePinkySelects(){}});
 const parse=value=>value;synthetic('../contracts/media-read-public.mjs',{mediaDerivativePublicSchema:{parse}});synthetic('../contracts/hero.mjs',{resourceIdSchema:{parse},hashSchema:{parse},revisionSchema:{parse}});synthetic('../contracts/source-checks.mjs',{sourceCheckCursorSchema:{parse},sourceCheckQuerySchema:{parse}});synthetic('../preview/hero-renderer.mjs',{TEMPLATE_VERSION:'synthetic'});
 synthetic('firebase/app',{initializeApp:()=>({})});
 const indexedDBLocalPersistence={},browserLocalPersistence={},inMemoryPersistence={};
 synthetic('firebase/auth',{indexedDBLocalPersistence,browserLocalPersistence,inMemoryPersistence,initializeAuth:(_app,options)=>{persistences=options.persistence;return auth;},connectAuthEmulator(){},signInWithEmailAndPassword:async()=>{},signOut:async()=>{signOuts++;auth.currentUser=null;await observer?.(null);},onAuthStateChanged:(_auth,callback)=>{observer=callback;}});
 synthetic('./site-media-editor.mjs',{mountSiteMediaEditor:container=>{if(mountError)throw mountError;container.append(new Element());return {destroy(){container.replaceChildren();},canLeave:()=>true};}});
 synthetic('./site-legacy-history.mjs',{mountSiteLegacyHistory:()=>({destroy(){}})});
 const policy=new SourceTextModule(readFileSync(new URL('../admin/auth-session.mjs',import.meta.url),'utf8'),{context,identifier:'./auth-session.mjs'});modules.set('./auth-session.mjs',policy);
 const entry=new SourceTextModule(readFileSync(new URL('../admin/auth.mjs',import.meta.url),'utf8'),{context,identifier:'auth',importModuleDynamically:async name=>{const module=modules.get(name);assert.ok(module,'Unexpected module dependency');if(module.status==='unlinked')await module.link(()=>{throw Error('unexpected import');});if(module.status==='linked')await module.evaluate();return module;}});
 await entry.link(name=>{assert.ok(modules.has(name),`Missing synthetic dependency ${name}`);return modules.get(name);});await entry.evaluate();
 return {api:entry.namespace,auth,nodes,document,bootstrap:()=>observer(user),setResponse:next=>{fetcher=next;},setTokenError:code=>{tokenError=code;},setMountError:error=>{mountError=error;},expire:()=>deadline(),signOuts:()=>signOuts,tokenCalls:()=>tokenCalls,readyCalls:()=>readyCalls,persistences:()=>persistences,expectedPersistence:[indexedDBLocalPersistence,browserLocalPersistence,inMemoryPersistence]};
}
const response=(status,code)=>{const body={error:{code,message:'Controlled failure'}};return {status,ok:status>=200&&status<300,json:async()=>body,body:new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode(JSON.stringify(body)));controller.close();}})};};

test('SDK hydration and LOCAL hierarchy precede backend-authorized private mount; blocked storage is explicit',async()=>{
 const h=await harness();assert.equal(h.readyCalls(),1);assert.deepEqual([...h.persistences()],h.expectedPersistence);assert.equal(h.api.getSession(),null);assert.equal(h.nodes.get('login-panel').hidden,true);
 await h.bootstrap();assert.equal(h.api.getSession().role,'OWNER');assert.equal(h.document.documentElement.dataset.cmsAuthState,'AUTHORIZED');assert.equal(h.document.documentElement.dataset.cmsAuthPersistence,'MEMORY_ONLY');assert.match(h.nodes.get('status').textContent,/chặn lưu phiên/);
});
test('bootstrap transient network/5xx and mount failures keep identity with private UI closed',async()=>{
 for(const setup of [h=>h.setResponse(async()=>{throw new TypeError('Network unavailable');}),h=>h.setResponse(async()=>response(503,'UNAVAILABLE')),h=>h.setMountError(new TypeError('Mount network error')),h=>h.setTokenError('auth/network-request-failed')]){
  const h=await harness();setup(h);await h.bootstrap();assert.equal(h.auth.currentUser!==null,true);assert.equal(h.signOuts(),0);assert.equal(h.api.getSession(),null);assert.equal(h.nodes.get('private-content').children.length,0);assert.equal(h.nodes.get('session-panel').hidden,true);assert.equal(h.document.documentElement.dataset.cmsAuthState,'RETRY_REQUIRED');assert.equal(h.nodes.get('login-panel').hidden,true);
 }
});
test('15s authorization deadline keeps SDK identity and ignores late backend response',async()=>{
 const h=await harness();let release;h.setResponse(()=>new Promise(resolve=>{release=resolve;}));const loading=h.bootstrap();await new Promise(resolve=>setImmediate(resolve));h.expire();await loading;
 assert.equal(h.signOuts(),0);assert.equal(h.auth.currentUser!==null,true);assert.equal(h.api.getSession(),null);assert.equal(h.document.documentElement.dataset.cmsAuthState,'RETRY_REQUIRED');
 release({status:200,ok:true,json:async()=>({uid:'synthetic-member',role:'OWNER'})});await new Promise(resolve=>setImmediate(resolve));assert.equal(h.api.getSession(),null);assert.equal(h.nodes.get('private-content').children.length,0);
});
test('repeated401, denied membership and invalid/disabled Auth clear identity',async()=>{
 for(const setup of [h=>h.setResponse(async()=>response(401,'UNAUTHENTICATED')),h=>h.setResponse(async()=>response(403,'FORBIDDEN')),h=>h.setResponse(async()=>({status:403,ok:false,json:async()=>{throw Error('Malformed refusal');}})),h=>h.setTokenError('auth/user-disabled'),h=>h.setTokenError('auth/invalid-user-token')]){
  const h=await harness();setup(h);await h.bootstrap();assert.equal(h.auth.currentUser,null);assert.equal(h.signOuts(),1);assert.equal(h.api.getSession(),null);assert.equal(h.nodes.get('private-content').children.length,0);assert.equal(h.document.documentElement.dataset.cmsAuthState,'LOGIN_REQUIRED');
 }
});
test('business500 and SELF_REVIEW_FORBIDDEN preserve verified editor/identity; explicit logout clears',async()=>{
 const h=await harness();await h.bootstrap();const editor=h.nodes.get('private-content').children[0];
 h.setResponse(async()=>response(500,'INTERNAL'));await assert.rejects(h.api.apiFetch('/api/cms/localizations/projects/wayfair/en',{method:'PUT',body:'{}'}));assert.equal(h.nodes.get('private-content').children[0],editor);assert.equal(h.api.getSession().role,'OWNER');assert.equal(h.signOuts(),0);
 h.setResponse(async()=>response(403,'SELF_REVIEW_FORBIDDEN'));await assert.rejects(h.api.apiFetch('/api/cms/media-site/reviews',{method:'POST',body:'{}'}),error=>error.code==='SELF_REVIEW_FORBIDDEN');assert.equal(h.signOuts(),0);assert.equal(h.nodes.get('private-content').children[0],editor);
 h.nodes.get('logout').dispatchEvent(new Event('click'));await new Promise(resolve=>setImmediate(resolve));assert.equal(h.signOuts(),1);assert.equal(h.auth.currentUser,null);assert.equal(h.api.getSession(),null);assert.equal(h.nodes.get('private-content').children.length,0);
});
test('logout during pending membership response prevents late remount',async()=>{
 const h=await harness();let release;h.setResponse(()=>new Promise(resolve=>{release=resolve;}));const loading=h.bootstrap();await new Promise(resolve=>setImmediate(resolve));h.nodes.get('logout').dispatchEvent(new Event('click'));await new Promise(resolve=>setImmediate(resolve));release({status:200,ok:true,json:async()=>({uid:'synthetic-member',role:'OWNER'})});await loading;assert.equal(h.api.getSession(),null);assert.equal(h.nodes.get('private-content').children.length,0);
});
