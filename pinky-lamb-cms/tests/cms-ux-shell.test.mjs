import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm';
import {createCmsIcon} from '../admin/cms-icons.mjs';

// Synthetic DOM only. No API, retained draft, credentials or emulator writes.
class Element extends EventTarget{
 constructor(tag='div'){super();this.tagName=tag;this.children=[];this.dataset={};this.attributes={};this.style={};this.hidden=false;this.disabled=false;this.inert=false;this._text='';this.isConnected=true;this.classList={add(){},remove(){},toggle(){}};}
 get hidden(){return this._hidden??false;}
 set hidden(value){this._hidden=Boolean(value);this.ownerDocument?.notify?.(this,{type:'attributes',attributeName:'hidden'});}
 get disabled(){return this._disabled??false;}
 set disabled(value){this._disabled=Boolean(value);this.ownerDocument?.notify?.(this,{type:'attributes',attributeName:'disabled'});}
 append(...nodes){for(const node of nodes){if(node.parentNode)node.parentNode.children=node.parentNode.children.filter(child=>child!==node);node.parentNode=this;node.isConnected=true;this.children.push(node);}}
 appendChild(node){this.append(node);return node;}
 remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(node=>node!==this);this.isConnected=false;}
 replaceChildren(...nodes){this.children=[];this.append(...nodes);}
 set textContent(value){this._text=value;this.children=[];}
 get textContent(){return this._text+this.children.map(n=>n.textContent).join('');}
 setAttribute(name,value){this.attributes[name]=String(value);this.ownerDocument?.notify?.(this,{type:'attributes',attributeName:name});}
 getAttribute(name){return this.attributes[name]??null;}
 removeAttribute(name){delete this.attributes[name];this.ownerDocument?.notify?.(this,{type:'attributes',attributeName:name});}
 toggleAttribute(name,force){if(force)this.setAttribute(name,'');else this.removeAttribute(name);}
 contains(node){return this===node||this.children.some(child=>child.contains(node));}
 matches(selector){return selector===':disabled'&&this.disabled;}
 querySelectorAll(selector){const all=this.children.flatMap(child=>[child,...child.querySelectorAll('*')]);if(selector==='*')return all;if(selector==='button')return all.filter(n=>n.tagName==='button');if(selector==='[data-cms-pane]')return all.filter(n=>n.dataset.cmsPane);if(selector===':scope > section')return this.children.filter(n=>n.tagName==='section');if(selector.startsWith('button:not'))return all.filter(n=>n.tagName==='button'&&!n.disabled);if(selector==='[data-cms-pane="review"]')return all.filter(n=>n.dataset.cmsPane==='review');if(selector.includes('data-cms-preview'))return all.filter(n=>n.dataset.cmsPreview==='snapshot'&&!n.hidden);return [];}
 querySelector(selector){return this.querySelectorAll(selector)[0]??null;}
 focus(){this.ownerDocument.activeElement=this;}
 getClientRects(){return this.hidden?[]:[{}];}
 click(){if(!this.disabled)this.dispatchEvent(new Event('click'));}
 showModal(){this.open=true;}
 close(){this.open=false;this.dispatchEvent(new Event('close'));}
}
function fixture({mobile=false}={}){
 const ids=new Map(),doc=new EventTarget();doc.body=new Element('body');
 const observers=new Set(),stats={batches:0,limitHit:false};
 doc.notify=(node,record)=>{for(const observer of observers)if(observer.targets.some(entry=>(entry.target===node||entry.options.subtree&&entry.target.contains(node))&&(record.type==='childList'?entry.options.childList:entry.options.attributes&&entry.options.attributeFilter.includes(record.attributeName)))){observer.records.push(record);if(!observer.queued){observer.queued=true;queueMicrotask(()=>{observer.queued=false;const records=observer.records.splice(0);if(!records.length)return;if(++stats.batches>30){stats.limitHit=true;return;}observer.callback(records);});}}};
 class Observer{constructor(callback){this.callback=callback;this.targets=[];this.records=[];this.queued=false;observers.add(this);}observe(target,options){this.targets.push({target,options});}disconnect(){this.targets=[];this.records=[];}}

 doc.createElement=tag=>{const node=new Element(tag);node.ownerDocument=doc;return node;};doc.createElementNS=(_ns,tag)=>doc.createElement(tag);doc.createTextNode=text=>{const node=doc.createElement('#text');node.textContent=text;return node;};doc.getElementById=id=>ids.get(id);doc.activeElement=null;
 const media=new EventTarget();media.matches=mobile;
 class CustomEvent extends Event{constructor(name,options={}){super(name);this.detail=options.detail;}}
 const view=new EventTarget();Object.assign(view,{CustomEvent,matchMedia:()=>media,MutationObserver:Observer,requestAnimationFrame:fn=>{fn();return 1;},cancelAnimationFrame(){}});doc.defaultView=view;
 for(const id of ['cms-group-nav','cms-management-nav','cms-legacy-access','cms-preview-shortcut','cms-mobile-preview','cms-mobile-send','cms-sidebar','cms-body','cms-menu-open','cms-menu-close','cms-menu-backdrop','cms-resource-nav','cms-content-grid','cms-view-toggle','private-content','cms-preview-host','cms-action-host','cms-work-tabs','cms-edit-tab','cms-review-tab','cms-send-shortcut','cms-mobile-actions','cms-mobile-action-host','cms-context-status','cms-mobile-status','cms-resource-title','cms-top-actions','cms-skip','cms-sidebar-logout','logout']){const node=doc.createElement(id.includes('tab')||id.includes('menu-open')||id.includes('menu-close')?'button':'div');node.id=id;ids.set(id,node);}
 doc.body.append(ids.get('cms-body'),ids.get('cms-sidebar'));ids.get('cms-sidebar').append(ids.get('cms-resource-nav'),ids.get('cms-group-nav'),ids.get('cms-management-nav'),ids.get('cms-menu-close'));ids.get('cms-body').append(ids.get('private-content'),ids.get('cms-preview-host'));return {doc,ids,view,stats};
}
async function shell(options={}){
 const f=fixture(options),calls=[],context=createContext({Event,console});const module=new SourceTextModule(readFileSync(new URL('../admin/cms-shell.mjs',import.meta.url),'utf8'),{context});
 await module.link(()=>new SyntheticModule(['createCmsIcon'],function(){this.setExport('createCmsIcon',name=>{const icon=f.doc.createElement('svg');icon.dataset.lucide=name;return icon;});},{context}));await module.evaluate();
 const instance=module.namespace.mountCmsShell(f.doc,{onResource:value=>calls.push(value),recoveryReadOnly:options.recoveryReadOnly});return {...f,instance,calls,buttons:()=>f.ids.get('cms-resource-nav').querySelectorAll('button')};
}
test('normal sidebar lists eight groups, media and management; no duplicate parent or legacy resource',async()=>{
 const f=await shell();assert.deepEqual(f.buttons().map(b=>b.dataset.cmsResource),['media']);assert.equal(f.ids.get('cms-group-nav').querySelectorAll('button').length,8);assert.equal(f.ids.get('cms-management-nav').querySelectorAll('button').length,2);assert.equal(f.ids.get('cms-resource-title').textContent,'Đầu trang, Hero và SEO');assert.equal(f.ids.get('cms-legacy-access').hidden,true);f.instance.destroy();
});
test('read-only recovery remains a separate v2-only navigation',async()=>{
 const f=await shell({recoveryReadOnly:true});assert.deepEqual(f.buttons().map(b=>b.dataset.cmsResource),['home-v2']);f.instance.setSession({role:'OWNER'},{readOnly:true});assert.equal(f.buttons()[0].disabled,false);f.instance.setResource('home-v3');assert.equal(f.ids.get('cms-body').dataset.cmsResource,'home-v2');f.instance.destroy();
});
test('signed-out and busy navigation never dispatch resource actions',async()=>{
 const f=await shell();f.buttons()[0].click();assert.equal(f.calls.length,0);f.instance.setSession({role:'EDITOR'});f.instance.setBusy(true);f.buttons()[0].click();assert.equal(f.calls.length,0);f.instance.setBusy(false);f.buttons()[0].click();assert.deepEqual(f.calls,['media']);f.instance.destroy();
});
test('save proxy delegates to the real disabled-state action',async()=>{
 const f=await shell();const source=f.doc.createElement('button');source.id='v3-save';source.textContent='Lưu website';f.ids.set(source.id,source);f.ids.get('private-content').append(source);let saves=0;source.addEventListener('click',()=>saves++);f.instance.setSession({role:'OWNER'});f.instance.refreshPanels();const proxy=f.ids.get('cms-action-host').querySelector('button');proxy.click();assert.equal(saves,1);source.disabled=true;f.instance.refreshPanels();proxy.click();assert.equal(saves,1);assert.equal(proxy.disabled,true);f.instance.destroy();
});
test('icon wrapper creates actual Lucide SVG and rejects unknown geometry',()=>{
 const f=fixture();const previous=globalThis.document;globalThis.document=f.doc;try{const icon=createCmsIcon('GripVertical');assert.equal(icon.tagName,'svg');assert.equal(icon.getAttribute('data-lucide'),'GripVertical');assert.equal(icon.getAttribute('aria-hidden'),'true');assert.ok(icon.children.length>0);assert.throws(()=>createCmsIcon('HomemadeIcon'),TypeError);}finally{globalThis.document=previous;}
});
test('legacy history cannot create a v2 submission and retains original reader/guards',()=>{
 const review=readFileSync(new URL('../admin/review.mjs',import.meta.url),'utf8'),wrapper=readFileSync(new URL('../admin/site-legacy-history.mjs',import.meta.url),'utf8');assert.match(review,/canSubmit=!readOnly && !legacyOnly/);assert.match(review,/snapshot\.submittedBy===session\.uid/);assert.match(review,/validateBrowserSnapshot\(raw,guard\)/);assert.match(review,/expectedReviewRevision:0/);assert.match(wrapper,/legacyOnly:true/);assert.doesNotMatch(wrapper,/method:'(?:POST|PATCH)'/);
});

test('observer synchronization settles and continues to observe later controller changes',async()=>{
 const f=await shell();f.instance.setSession({role:'OWNER'});
 const panel=f.doc.createElement('section');panel.dataset.cmsPane='review';f.ids.get('private-content').append(panel);
 // A hidden attribute mutation is exactly what real controllers and native dialogs emit.
 f.doc.notify(panel,{type:'attributes',attributeName:'hidden'});
 await new Promise(resolve=>setImmediate(resolve));const settled=f.stats.batches;
 assert.ok(settled>0);assert.equal(f.stats.limitHit,false);
 await new Promise(resolve=>setImmediate(resolve));assert.equal(f.stats.batches,settled);
 f.doc.notify(panel,{type:'attributes',attributeName:'disabled'});
 await new Promise(resolve=>setImmediate(resolve));assert.equal(f.stats.batches,settled+1);f.instance.destroy();
});

test('all literal icon callers and dynamic section navigation resolve actual library geometry',()=>{
 const folder=new URL('../admin/',import.meta.url),names=new Set(['Globe','PanelTop','Image','History','Menu','X','FileText']);
 for(const filename of readdirSync(folder).filter(name=>name.endsWith('.mjs'))){const source=readFileSync(new URL(filename,folder),'utf8');for(const regex of [/createCmsIcon\('([A-Za-z0-9]+)'/g,/iconButton\('([A-Za-z0-9]+)'/g,/'site-go-[a-z-]+':'([A-Za-z0-9]+)'/g])for(const match of source.matchAll(regex))names.add(match[1]);}
 const f=fixture(),previous=globalThis.document;globalThis.document=f.doc;
 try{for(const name of names){const icon=createCmsIcon(name);assert.ok(icon.children.length>0,name+' has Lucide geometry');assert.equal(icon.getAttribute('data-lucide'),name);}}finally{globalThis.document=previous;}
});
