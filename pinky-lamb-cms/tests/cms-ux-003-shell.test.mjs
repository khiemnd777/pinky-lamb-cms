import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm';
import {createCmsIcon} from '../admin/cms-icons.mjs';

// Synthetic DOM only. No API, retained draft, credentials or emulator writes.
class Element extends EventTarget{
 constructor(tag='div'){super();this.tagName=tag;this.children=[];this.dataset={};this.attributes={};this.style={setProperty(name,value){this[name]=value;},getPropertyValue(name){return this[name]??'';},removeProperty(name){delete this[name];}};this.hidden=false;this.disabled=false;this.inert=false;this._text='';this.isConnected=true;this.classList={add(){},remove(){},toggle(){},contains:name=>(this.className??'').split(' ').includes(name)};}
 get hidden(){return this._hidden??false;}
 set hidden(value){this._hidden=Boolean(value);this.ownerDocument?.notify?.(this,{type:'attributes',attributeName:'hidden'});}
 get disabled(){return this._disabled??false;}
 set disabled(value){this._disabled=Boolean(value);this.ownerDocument?.notify?.(this,{type:'attributes',attributeName:'disabled'});}
 append(...nodes){for(const node of nodes){if(node.parentNode)node.parentNode.children=node.parentNode.children.filter(child=>child!==node);node.parentNode=this;node.isConnected=true;this.children.push(node);}}
 appendChild(node){this.append(node);return node;}
 prepend(...nodes){for(const node of nodes)node.parentNode=this;this.children.unshift(...nodes);}
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
 querySelectorAll(selector){const all=this.children.flatMap(child=>[child,...child.querySelectorAll('*')]);if(selector==='*')return all;if(selector.startsWith('.'))return all.filter(n=>(n.className??'').split(' ').includes(selector.slice(1)));if(['button','h1'].includes(selector))return all.filter(n=>n.tagName===selector);if(selector==='.admin-header')return all.filter(n=>n.className==='admin-header');if(selector==='[data-cms-pane]')return all.filter(n=>n.dataset.cmsPane);if(selector===':scope > section')return this.children.filter(n=>n.tagName==='section');if(selector.startsWith('button:not'))return all.filter(n=>n.tagName==='button'&&!n.disabled);if(selector==='[data-cms-pane="review"]')return all.filter(n=>n.dataset.cmsPane==='review');if(selector.includes('data-cms-preview'))return all.filter(n=>n.dataset.cmsPreview==='snapshot'&&!n.hidden);return [];}
 querySelector(selector){return this.querySelectorAll(selector)[0]??null;}
 focus(){this.ownerDocument.activeElement=this;}
 getClientRects(){return this.hidden?[]:[{}];}
 click(){if(!this.disabled)this.dispatchEvent(new Event('click'));}
 showModal(){this.open=true;}
 close(){this.open=false;this.dispatchEvent(new Event('close'));}
}
function fixture({mobile=false,width=mobile?390:1440}={}){
 const ids=new Map(),doc=new EventTarget();doc.body=new Element('body');
 const observers=new Set(),stats={batches:0,limitHit:false};
 doc.notify=(node,record)=>{for(const observer of observers)if(observer.targets.some(entry=>(entry.target===node||entry.options.subtree&&entry.target.contains(node))&&(record.type==='childList'?entry.options.childList:entry.options.attributes&&entry.options.attributeFilter.includes(record.attributeName)))){observer.records.push(record);if(!observer.queued){observer.queued=true;queueMicrotask(()=>{observer.queued=false;const records=observer.records.splice(0);if(!records.length)return;if(++stats.batches>30){stats.limitHit=true;return;}observer.callback(records);});}}};
 class Observer{constructor(callback){this.callback=callback;this.targets=[];this.records=[];this.queued=false;observers.add(this);}observe(target,options){this.targets.push({target,options});}disconnect(){this.targets=[];this.records=[];}}

 doc.createElement=tag=>{const node=new Element(tag);node.ownerDocument=doc;return node;};doc.createElementNS=(_ns,tag)=>doc.createElement(tag);doc.createTextNode=text=>{const node=doc.createElement('#text');node.textContent=text;return node;};doc.getElementById=id=>ids.get(id);doc.activeElement=null;
 const media=new EventTarget();media.matches=width<=720;
 class CustomEvent extends Event{constructor(name,options={}){super(name);this.detail=options.detail;}}
 const view=new EventTarget(),queries=[],resizeObservers=[];class HeaderObserver{constructor(callback){this.callback=callback;this.disconnected=false;resizeObservers.push(this);}observe(target){this.target=target;}disconnect(){this.disconnected=true;}}Object.assign(view,{CustomEvent,innerWidth:width,matchMedia:query=>{queries.push(query);return media;},ResizeObserver:HeaderObserver,MutationObserver:Observer,requestAnimationFrame:fn=>{fn();return 1;},cancelAnimationFrame(){}});doc.defaultView=view;
 for(const id of ['cms-group-nav','cms-management-nav','cms-legacy-access','cms-preview-shortcut','cms-mobile-preview','cms-mobile-send','cms-sidebar','cms-body','cms-menu-open','cms-menu-close','cms-menu-backdrop','cms-resource-nav','cms-content-grid','cms-view-toggle','private-content','cms-preview-host','cms-action-host','cms-work-tabs','cms-edit-tab','cms-review-tab','cms-send-shortcut','cms-mobile-actions','cms-mobile-action-host','cms-context-status','cms-mobile-status','cms-resource-title','cms-top-actions','cms-skip','cms-sidebar-logout','logout']){const node=doc.createElement(id.includes('tab')||id.includes('menu-open')||id.includes('menu-close')?'button':'div');node.id=id;ids.set(id,node);}
 const header=doc.createElement('header');header.className='admin-header';header.getBoundingClientRect=()=>({height:84,bottom:84});const heading=doc.createElement('h1'),breadcrumb=doc.createElement('p');heading.textContent='Toàn website';breadcrumb.className='cms-card-subtitle';breadcrumb.textContent='Pinky Lamb / Quản trị nội dung';header.append(heading,breadcrumb);ids.get('cms-body').append(header);const titleHost=doc.createElement('div');titleHost.className='cms-content-header';titleHost.append(ids.get('cms-resource-title'));ids.get('cms-body').append(titleHost);doc.body.append(ids.get('cms-body'),ids.get('cms-sidebar'));ids.get('cms-sidebar').append(ids.get('cms-resource-nav'),ids.get('cms-group-nav'),ids.get('cms-management-nav'),ids.get('cms-menu-close'));ids.get('cms-body').append(ids.get('private-content'),ids.get('cms-preview-host'));return {doc,ids,view,stats,queries,media,resizeObservers,header};
}
async function shell(options={}){
 const f=fixture(options),calls=[],context=createContext({Event,console});const module=new SourceTextModule(readFileSync(new URL('../admin/cms-shell.mjs',import.meta.url),'utf8'),{context});
 await module.link(()=>new SyntheticModule(['createCmsIcon'],function(){this.setExport('createCmsIcon',name=>{const icon=f.doc.createElement('svg');icon.dataset.lucide=name;return icon;});},{context}));await module.evaluate();
 const instance=module.namespace.mountCmsShell(f.doc,{onResource:value=>calls.push(value),recoveryReadOnly:options.recoveryReadOnly});return {...f,instance,calls,buttons:()=>f.ids.get('cms-resource-nav').querySelectorAll('button')};
}
test('normal sidebar lists eight groups, media and management; no duplicate parent or legacy resource',async()=>{
 const f=await shell();assert.deepEqual(f.buttons().map(b=>b.dataset.cmsResource),['media']);assert.equal(f.ids.get('cms-group-nav').querySelectorAll('button').length,8);assert.equal(f.ids.get('cms-management-nav').querySelectorAll('button').length,2);assert.equal(f.ids.get('cms-resource-title').textContent,'Đầu trang, Hero và SEO');assert.equal(f.ids.get('cms-legacy-access').hidden,true);f.instance.destroy();
});
test('read-only recovery stays v2-only without editing groups',async()=>{
 const f=await shell({recoveryReadOnly:true});assert.deepEqual(f.buttons().map(b=>b.dataset.cmsResource),['home-v2']);assert.equal(f.ids.get('cms-group-nav').querySelectorAll('button').length,0);f.instance.setResource('home-v3');assert.equal(f.ids.get('cms-body').dataset.cmsResource,'home-v2');f.instance.destroy();
});
test('media exit requests real auth lifecycle while signed out/busy navigation is blocked',async()=>{
 const f=await shell();f.buttons()[0].click();assert.equal(f.calls.length,0);f.instance.setSession({role:'OWNER'});f.instance.setBusy(true);f.buttons()[0].click();assert.equal(f.calls.length,0);f.instance.setBusy(false);f.buttons()[0].click();assert.deepEqual(f.calls,['media']);f.instance.setResource('media');f.ids.get('cms-group-nav').querySelectorAll('button')[2].click();assert.deepEqual(f.calls,['media','home-v3']);f.instance.destroy();
});
test('legacy Hero is accessible only from explicit review context and delegates resource exit',async()=>{
 const f=await shell();f.instance.setSession({role:'OWNER'});const panel=f.doc.createElement('section');panel.dataset.cmsPane='review';f.ids.get('private-content').append(panel);f.instance.refreshPanels();f.ids.get('cms-management-nav').querySelectorAll('button')[1].click();assert.equal(f.ids.get('cms-legacy-access').hidden,false);f.ids.get('cms-legacy-access').querySelector('button').click();assert.deepEqual(f.calls,['home']);f.instance.destroy();
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

test('adopts actual group navigation and changes group without requesting or reloading resource',async()=>{
 const f=await shell();f.instance.setSession({role:'OWNER'});const nav=f.doc.createElement('nav');nav.append(f.doc.createElement('button'));let selection;
 f.view.addEventListener('cms:site-group',event=>{selection=event.detail.id;});
 f.view.dispatchEvent(new f.view.CustomEvent('cms:site-navigation',{detail:{node:nav,groupId:'site-component-work',label:'Dự án'}}));
 assert.equal(nav.parentNode,f.ids.get('cms-group-nav'));assert.equal(f.ids.get('cms-resource-title').textContent,'Dự án');
 f.ids.get('cms-management-nav').querySelectorAll('button')[0].click();await new Promise(resolve=>setImmediate(resolve));assert.equal(selection,'site-structure-content');assert.deepEqual(f.calls,[]);
 f.view.dispatchEvent(new f.view.CustomEvent('cms:site-navigation',{detail:{node:null}}));assert.equal(f.ids.get('cms-group-nav').querySelectorAll('button')[0].hidden,false);f.instance.destroy();
});
test('pending group choice replays after resource controller mounts actual navigation',async()=>{
 const f=await shell();f.instance.setSession({role:'OWNER'});f.instance.setResource('media');f.ids.get('cms-group-nav').querySelectorAll('button')[2].click();assert.deepEqual(f.calls,['home-v3']);
 f.instance.setResource('home-v3');let requested;f.view.addEventListener('cms:site-group',event=>{requested=event.detail.id;});
 const node=f.doc.createElement('nav');f.view.dispatchEvent(new f.view.CustomEvent('cms:site-navigation',{detail:{node,groupId:'site-component-settings',label:'Đầu trang, Hero và SEO'}}));assert.equal(requested,'site-component-work');f.instance.destroy();
});

test('async preview request survives hidden panel until controller makes saved preview available',async()=>{
 const f=await shell();f.instance.setSession({role:'EDITOR'});const source=f.doc.createElement('button');source.id='v3-saved-preview';f.ids.set(source.id,source);f.ids.get('private-content').append(source);const panel=f.doc.createElement('section');panel.hidden=true;f.ids.get('cms-preview-host').append(panel);source.addEventListener('click',()=>{source.disabled=true;});f.instance.refreshPanels();f.ids.get('cms-preview-shortcut').click();assert.equal(f.ids.get('cms-content-grid').dataset.view,'edit');f.instance.refreshPanels();panel.hidden=false;panel.dataset.cmsPreview='draft';source.disabled=false;f.instance.refreshPanels();assert.equal(f.ids.get('cms-content-grid').dataset.view,'edit');assert.equal(f.ids.get('cms-preview-host').hidden,false);const dialog=f.doc.body.querySelector('.cms-saved-preview-dialog');assert.equal(dialog.open,true);assert.equal(f.ids.get('cms-preview-host').parentNode,dialog);assert.equal(panel.parentNode,f.ids.get('cms-preview-host'));dialog.close();assert.equal(f.ids.get('cms-preview-host').parentNode,f.ids.get('cms-content-grid'));f.instance.destroy();
});
test('failed or cancelled async preview does not reopen after explicit navigation',async()=>{
 const f=await shell();f.instance.setSession({role:'EDITOR'});const source=f.doc.createElement('button');source.id='v3-saved-preview';f.ids.set(source.id,source);f.ids.get('private-content').append(source);const panel=f.doc.createElement('section');panel.hidden=true;f.ids.get('cms-preview-host').append(panel);source.addEventListener('click',()=>{source.disabled=true;});f.instance.refreshPanels();f.ids.get('cms-preview-shortcut').click();source.disabled=false;f.instance.refreshPanels();panel.hidden=false;f.instance.refreshPanels();assert.equal(f.ids.get('cms-content-grid').dataset.view,'edit');panel.hidden=true;f.ids.get('cms-preview-shortcut').click();f.instance.setResource('media');panel.hidden=false;f.instance.refreshPanels();assert.equal(f.ids.get('cms-content-grid').dataset.view,'edit');f.instance.destroy();
});

test('representative page context sits below title while duplicate saved state hides without hiding errors',async()=>{
 const f=await shell();f.instance.setSession({role:'EDITOR'});const nav=f.doc.createElement('nav');f.view.dispatchEvent(new f.view.CustomEvent('cms:site-navigation',{detail:{node:nav,groupId:'site-component-work',label:'Dự án'}}));const title=f.ids.get('cms-resource-title'),context=title.parentNode.children.find(node=>node.className==='cms-section-context');assert.equal(context.hidden,false);assert.equal(context.textContent,'Quản lý câu chuyện, hình ảnh và thứ tự dự án.');
 const status=f.doc.createElement('p');status.id='v3-status';f.ids.set(status.id,status);f.ids.get('private-content').append(status);status.textContent='Toàn website — phiên bản 4 — đã lưu';f.instance.refreshPanels();assert.equal(status.hidden,true);assert.equal(f.ids.get('cms-context-status').textContent,status.textContent);assert.equal(f.ids.get('cms-context-status').getAttribute('role'),'status');status.textContent='Xung đột phiên bản. Giữ thay đổi và tải bản mới để đối chiếu.';f.instance.refreshPanels();assert.equal(status.hidden,false);assert.equal(f.ids.get('cms-context-status').textContent,status.textContent);f.instance.setResource('media');assert.equal(context.hidden,true);f.instance.destroy();
});


test('all eight editing groups show truthful page context while structure/review/media hide that group context',async()=>{const f=await shell();f.instance.setSession({role:'EDITOR'});const title=f.ids.get('cms-resource-title'),context=title.parentNode.children.find(node=>node.className==='cms-section-context');for(const key of ['settings','clients','work','services','about','ip','contact','footer']){const nav=f.doc.createElement('nav');f.view.dispatchEvent(new f.view.CustomEvent('cms:site-navigation',{detail:{node:nav,groupId:'site-component-'+key,label:key}}));assert.equal(context.hidden,false,key);assert.equal(context.textContent,key==='work'?'Quản lý câu chuyện, hình ảnh và thứ tự dự án.':key==='services'?'Tổ chức dịch vụ và nội dung khách hàng nhìn thấy.':'Biên tập nội dung theo đúng vị trí trên website.');}const nav=f.doc.createElement('nav');f.view.dispatchEvent(new f.view.CustomEvent('cms:site-navigation',{detail:{node:nav,groupId:'site-structure-content',label:'Cấu trúc website'}}));assert.equal(context.hidden,true);f.instance.setResource('media');assert.equal(context.hidden,true);f.instance.destroy();});


test('focused edit controls obscured by fixed header/mobile actions scroll into view without changing focus',async()=>{const f=await shell({mobile:true});f.instance.setSession({role:'EDITOR'});f.view.innerHeight=900;const fields=f.doc.createElement('fieldset');fields.id='site-fields';f.ids.set(fields.id,fields);f.ids.get('private-content').append(fields);const bar=f.ids.get('cms-mobile-actions');bar.hidden=false;bar.getBoundingClientRect=()=>({top:745,bottom:900});const header=f.doc.createElement('header');header.getBoundingClientRect=()=>({top:0,bottom:90});const originalQuery=f.ids.get('cms-body').querySelector.bind(f.ids.get('cms-body'));f.ids.get('cms-body').querySelector=s=>s==='.admin-header'?header:originalQuery(s);
 const control=f.doc.createElement('input');fields.append(control);control.matches=()=>true;control.closest=()=>null;let rect={top:795,bottom:843},scrolls=0;control.getBoundingClientRect=()=>rect;control.scrollIntoView=options=>{assert.equal(options.block,'center');assert.equal(options.behavior,'instant');scrolls++;};const section=f.doc.createElement('section');fields.append(section);section.setAttribute('tabindex','-1');section.getBoundingClientRect=()=>({top:120,bottom:1800});section.scrollIntoView=()=>{throw Error('Group navigation container must not be centered');};const groupFocus=new Event('focusin');Object.defineProperty(groupFocus,'target',{value:section});f.doc.dispatchEvent(groupFocus);const focus=()=>{control.focus();const e=new Event('focusin');Object.defineProperty(e,'target',{value:control});f.doc.dispatchEvent(e);};focus();assert.equal(scrolls,1);assert.equal(f.doc.activeElement,control);rect={top:120,bottom:168};focus();assert.equal(scrolls,1);rect={top:40,bottom:88};focus();assert.equal(scrolls,2);control.closest=()=>({open:true});rect={top:800,bottom:844};focus();assert.equal(scrolls,2);control.closest=()=>null;f.instance.setResource('media');focus();assert.equal(scrolls,2);f.instance.setResource('home-v3');f.instance.destroy();focus();assert.equal(scrolls,2);});


test('known eight group headings prefer canonical identity over first inner heading while structure keeps its label',async()=>{const f=await shell();f.instance.setSession({role:'EDITOR'});for(const [key,label]of [['settings','Đầu trang, Hero và SEO'],['clients','Khách hàng'],['work','Dự án'],['services','Dịch vụ'],['about','Giới thiệu'],['ip','IP Studio'],['contact','Liên hệ'],['footer','Chân trang']]){const nav=f.doc.createElement('nav');f.view.dispatchEvent(new f.view.CustomEvent('cms:site-navigation',{detail:{node:nav,groupId:'site-component-'+key,label:'Inner form heading'}}));assert.equal(f.ids.get('cms-resource-title').textContent,label);}const nav=f.doc.createElement('nav');f.view.dispatchEvent(new f.view.CustomEvent('cms:site-navigation',{detail:{node:nav,groupId:'site-structure-content',label:'Cấu trúc website'}}));assert.equal(f.ids.get('cms-resource-title').textContent,'Cấu trúc website');f.instance.setResource('media');assert.equal(f.ids.get('cms-resource-title').textContent,'Thư viện media');f.instance.destroy();});


test('accepted 720px drawer boundary keeps 721/768/tablet navigation available and real actions reachable',async()=>{
 for(const width of [390,720,721,768,1023,1440]){const f=await shell({width});f.instance.setSession({role:'EDITOR'});assert.deepEqual(f.queries,['(max-width:720px)']);assert.equal(f.ids.get('cms-sidebar').inert,width<=720);f.ids.get('cms-menu-open').click();assert.equal(f.ids.get('cms-menu-open').getAttribute('aria-expanded'),width<=720?'true':null);if(width<=720){assert.equal(f.ids.get('cms-sidebar').getAttribute('role'),'dialog');assert.equal(f.ids.get('cms-sidebar').getAttribute('aria-modal'),'true');assert.equal(f.ids.get('cms-body').inert,true);f.ids.get('cms-menu-close').click();assert.equal(f.ids.get('cms-sidebar').inert,true);assert.equal(f.ids.get('cms-body').inert,false);}else{assert.equal(f.ids.get('cms-sidebar').getAttribute('role'),null);assert.equal(f.ids.get('cms-body').inert,false);}let requested;f.view.addEventListener('cms:site-group',event=>{requested=event.detail.id;});f.ids.get('cms-group-nav').querySelectorAll('button')[2].click();await new Promise(resolve=>setImmediate(resolve));assert.equal(requested,'site-component-work');const save=f.doc.createElement('button');save.id='v3-save';save.textContent='Lưu website';f.ids.set(save.id,save);f.ids.get('private-content').append(save);let writes=0;save.addEventListener('click',()=>writes++);f.instance.refreshPanels();const proxy=f.ids.get('cms-action-host').querySelector('button');assert.equal(proxy.disabled,false);proxy.click();assert.equal(writes,1);f.instance.destroy();}
});

test('wrapped header geometry drives sticky offset and resize observer/resize listener clean up on destroy',async()=>{const f=await shell({width:768}),body=f.ids.get('cms-body');assert.equal(body.style.getPropertyValue('--cms-header-height'),'84px');assert.equal(f.resizeObservers.length,1);assert.equal(f.resizeObservers[0].target,f.header);f.header.getBoundingClientRect=()=>({height:177.4,bottom:177.4});f.resizeObservers[0].callback();assert.equal(body.style.getPropertyValue('--cms-header-height'),'178px');f.header.getBoundingClientRect=()=>({height:132,bottom:132});f.view.dispatchEvent(new Event('resize'));assert.equal(body.style.getPropertyValue('--cms-header-height'),'132px');f.instance.destroy();assert.equal(f.resizeObservers[0].disconnected,true);assert.equal(body.style.getPropertyValue('--cms-header-height'),'');f.view.dispatchEvent(new Event('resize'));f.resizeObservers[0].callback();assert.equal(body.style.getPropertyValue('--cms-header-height'),'');});

test('crossing from open mobile drawer to tablet restores body and sidebar semantics',async()=>{const f=await shell({width:720});f.instance.setSession({role:'EDITOR'});f.ids.get('cms-menu-open').click();assert.equal(f.ids.get('cms-body').inert,true);f.media.matches=false;f.media.dispatchEvent(new Event('change'));assert.equal(f.ids.get('cms-body').inert,false);assert.equal(f.ids.get('cms-sidebar').inert,false);assert.equal(f.ids.get('cms-sidebar').getAttribute('role'),null);assert.equal(f.ids.get('cms-sidebar').getAttribute('aria-modal'),null);assert.equal(f.ids.get('cms-sidebar').getAttribute('aria-hidden'),null);f.instance.destroy();});


test('accepted sidebar widths and matching main offsets stay exact at desktop/tablet while mobile drawer remains separate',()=>{const css=readFileSync(new URL('../admin/cms-studio-shell.css',import.meta.url),'utf8');assert.match(css,/\.cms-sidebar\{width:248px;/);assert.match(css,/\.cms-authenticated\.admin-shell\{margin-left:248px\}/);assert.match(css,/@media\(min-width:721px\) and \(max-width:1180px\)\{\.cms-sidebar\{width:220px\}\.cms-authenticated\.admin-shell\{margin-left:220px\}/);assert.match(css,/@media\(max-width:720px\)\{\.cms-authenticated\.admin-shell\{margin-left:0\}\.cms-sidebar\{width:min\(300px,calc\(100% - 40px\)\)/);assert.doesNotMatch(css,/width:252px|margin-left:252px/);});

test('sidebar mascot is served by the CMS origin with the approved image bytes',()=>{
 const html=readFileSync(new URL('../admin/index.html',import.meta.url),'utf8');
 const src=html.match(/<aside id="cms-sidebar"[^>]*><div class="brand"><img src="([^"]+)"/)?.[1];
 assert.ok(src,'Sidebar mascot source is present');
 const origin='http://127.0.0.1:5273',url=new URL(src,origin);
 assert.equal(url.origin,origin,'CMS branding must work without the public website server');
 const image=readFileSync(new URL('../admin'+url.pathname,import.meta.url));
 assert.deepEqual(image,readFileSync(new URL('../public-baseline/assets/pinky-mascot.webp',import.meta.url)));
});

 test('template sidebar branding and official group icon mapping are explicit',async()=>{
 const html=readFileSync(new URL('../admin/index.html',import.meta.url),'utf8');assert.match(html,/pinky-mascot\.webp/);assert.match(html,/CONTENT STUDIO/);
 const f=await shell();assert.deepEqual(f.ids.get('cms-group-nav').querySelectorAll('button').map(b=>b.children[0].dataset.lucide),['PanelTop','Users','Clapperboard','BriefcaseBusiness','Info','Sparkles','Mail','PanelBottom']);f.instance.destroy();
});

test('dirty navigation marker follows actual event changes and clears on saved/reverted state',async()=>{const f=await shell();f.view.dispatchEvent(new f.view.CustomEvent('cms:site-dirty',{detail:{groups:['work']}}));const project=f.ids.get('cms-group-nav').querySelectorAll('button')[2];assert.equal(project.querySelectorAll('.cms-group-dirty').length,1);assert.equal(project.querySelector('.cms-group-dirty').getAttribute('aria-label'),'Có thay đổi chưa lưu');f.view.dispatchEvent(new f.view.CustomEvent('cms:site-dirty',{detail:{groups:['work']}}));assert.equal(project.querySelectorAll('.cms-group-dirty').length,1);f.view.dispatchEvent(new f.view.CustomEvent('cms:site-dirty',{detail:{groups:[]}}));assert.equal(project.querySelectorAll('.cms-group-dirty').length,0);f.instance.destroy();});

test('pointer focus near viewport edge does not move a button between press and release; keyboard focus still scrolls',async()=>{
 const f=await shell({mobile:true});f.instance.setSession({role:'EDITOR'});f.view.innerHeight=900;
 const fields=f.doc.createElement('fieldset');fields.id='site-fields';f.ids.set(fields.id,fields);f.ids.get('private-content').append(fields);
 const bar=f.ids.get('cms-mobile-actions');bar.hidden=false;bar.getBoundingClientRect=()=>({top:745,bottom:900});
 const button=f.doc.createElement('button');fields.append(button);button.matches=()=>true;button.closest=()=>null;button.getBoundingClientRect=()=>({top:730,bottom:774});let scrolls=0;button.scrollIntoView=()=>{scrolls++;};
 const focus=()=>{button.focus();const e=new Event('focusin');Object.defineProperty(e,'target',{value:button});f.doc.dispatchEvent(e);};
 f.doc.dispatchEvent(new Event('pointerdown'));focus();assert.equal(scrolls,0,'Click target must stay still until pointer release');f.doc.dispatchEvent(new Event('pointerup'));focus();assert.equal(scrolls,1,'Keyboard/programmatic focus retains clipping protection');
 f.doc.dispatchEvent(new Event('pointerdown'));f.doc.dispatchEvent(new Event('pointercancel'));focus();assert.equal(scrolls,2);f.instance.destroy();
});

test('keyboard focus reveals native source disclosure summaries above the mobile action bar',async()=>{
 const f=await shell({mobile:true});f.instance.setSession({role:'EDITOR'});f.view.innerHeight=844;
 const fields=f.doc.createElement('fieldset');fields.id='site-fields';f.ids.set(fields.id,fields);f.ids.get('private-content').append(fields);
 const bar=f.ids.get('cms-mobile-actions');bar.hidden=false;bar.getBoundingClientRect=()=>({top:745,bottom:844});const summary=f.doc.createElement('summary');fields.append(summary);summary.matches=selector=>selector.split(',').includes('summary');summary.closest=()=>null;summary.getBoundingClientRect=()=>({top:790,bottom:838});let scrolls=0;summary.scrollIntoView=()=>{scrolls++;};
 summary.focus();const event=new Event('focusin');Object.defineProperty(event,'target',{value:summary});f.doc.dispatchEvent(event);assert.equal(scrolls,1);assert.equal(f.doc.activeElement,summary);f.instance.destroy();
});


test('localized D5 owns review chrome synchronously and after async context events, then restores other views',async()=>{
 const f=await shell();f.instance.setSession({role:'OWNER'});
 const root=f.ids.get('private-content'),workflow=f.doc.createElement('section'),editor=f.doc.createElement('section'),legacy=f.doc.createElement('details'),edit=f.doc.createElement('section');
 workflow.dataset.cmsPane='review';editor.className='localization-review-editor';workflow.append(editor);legacy.dataset.cmsPane='review';legacy.className='ux-legacy-history cms-review-card';edit.dataset.cmsPane='edit';root.append(edit,workflow,legacy);
 for(const id of ['v3-save','v3-saved-preview']){const source=f.doc.createElement('button');source.id=id;source.textContent=id;f.ids.set(id,source);edit.append(source);}
 const contentHeader=f.ids.get('cms-body').querySelector('.cms-content-header');
 f.instance.refreshPanels();assert.equal(contentHeader.hidden,false);assert.equal(f.ids.get('cms-action-host').querySelectorAll('button').length,1);
 f.ids.get('cms-management-nav').querySelectorAll('button')[1].click();
 const assertReview=()=>{assert.equal(f.header.querySelector('h1').textContent,'Gửi và duyệt');assert.equal(contentHeader.hidden,true);assert.equal(workflow.hidden,false);assert.equal(legacy.hidden,true);assert.equal(legacy.parentNode,root,'History remains mounted without deleting records');assert.equal(f.ids.get('cms-legacy-access').hidden,true);assert.equal(f.ids.get('cms-action-host').querySelectorAll('button').length,0);for(const id of ['cms-context-status','cms-preview-shortcut','cms-send-shortcut','cms-mobile-actions','cms-mobile-send'])assert.equal(f.ids.get(id).hidden,true,id);};
 assertReview();
 f.view.dispatchEvent(new f.view.CustomEvent('cms:localized-review-context',{detail:{active:true,requestTransition:()=>true}}));
 await new Promise(resolve=>setImmediate(resolve));f.instance.refreshPanels();assertReview();assert.equal(f.stats.limitHit,false);
 f.ids.get('cms-edit-tab').click();await new Promise(resolve=>setImmediate(resolve));assert.equal(contentHeader.hidden,false);assert.equal(workflow.hidden,true);assert.equal(f.ids.get('cms-action-host').querySelectorAll('button').length,1);
 // Delayed visibility events from the old renderer cannot override another resource.
 f.instance.setResource('media');f.view.dispatchEvent(new f.view.CustomEvent('cms:localized-review-context',{detail:{active:true,requestTransition:()=>true}}));assert.equal(f.header.querySelector('h1').textContent,'Toàn website');assert.equal(contentHeader.hidden,false);
 f.instance.setResource('home');f.ids.get('cms-review-tab').click();await new Promise(resolve=>setImmediate(resolve));assert.equal(f.ids.get('cms-legacy-access').hidden,false);assert.equal(legacy.hidden,false,'Legacy context retains its original history access');
 f.instance.destroy();assert.equal(contentHeader.hidden,false);
});
