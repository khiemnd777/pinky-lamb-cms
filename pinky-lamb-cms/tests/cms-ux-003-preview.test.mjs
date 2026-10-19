import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {createSiteMediaPreview} from '../admin/site-media-preview.mjs';

const initialDocument=globalThis.document;afterEach(()=>{globalThis.document=initialDocument;});

// The real PinkySelect widget and preview component, with geometry-only DOM stand-ins.
// No transport, stored drafts, credentials, binary resources or emulator writes.
class Element extends EventTarget{
 constructor(document,tag){super();this.ownerDocument=document;this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attributes={};this.hidden=false;this.disabled=false;this.style={setProperty(name,value){this[name]=value;}};this.classList={add(){},toggle(){}};this.scrollHeight=200;this.clientHeight=200;this.scrollTop=0;this.offsetTop=0;this.offsetHeight=44;this._text='';}
 get isConnected(){return this===this.ownerDocument.documentElement||Boolean(this.parentElement?.isConnected);}
 get textContent(){return this._text+this.children.map(child=>child.textContent).join('');}
 set textContent(value){this._text=value;this.replaceChildren();}
 append(...items){for(const item of items){item.remove();item.parentElement=this;this.children.push(item);}}
 appendChild(item){this.append(item);return item;}
 prepend(...items){for(const item of items.reverse()){item.remove();item.parentElement=this;this.children.unshift(item);}}
 remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(child=>child!==this);this.parentElement=null;}
 replaceChildren(...items){for(const child of [...this.children])child.remove();this.append(...items);}
 setAttribute(name,value){this.attributes[name]=String(value);}
 getAttribute(name){return this.attributes[name]??null;}
 removeAttribute(name){delete this.attributes[name];}
 matches(selector){return selector===':disabled'?this.disabled:selector===':modal'?false:selector==='[hidden],[inert]'?this.hidden||this.inert:false;}
 closest(selector){for(let node=this;node;node=node.parentElement)if(node.matches(selector))return node;return null;}
 contains(node){return this===node||this.children.some(child=>child.contains(node));}
 getClientRects(){return this.isConnected&&!this.hidden?[{}]:[];}
 getBoundingClientRect(){return {left:20,top:100,bottom:144,width:260};}
 focus(){this.ownerDocument.activeElement=this;}
 querySelectorAll(selector){const items=this.children.flatMap(child=>[child,...child.querySelectorAll('*')]);return selector==='*'?items:selector==='dialog[open]'?[]:items.filter(item=>item.getAttribute('role')==='combobox'&&selector==='[role=combobox]');}
 querySelector(){return null;}
}
function fixture(){
 const document=new EventTarget(),view=new EventTarget();let disconnected=0;
 Object.assign(view,{Event,AbortController,queueMicrotask,innerWidth:1440,innerHeight:900,getComputedStyle:()=>({visibility:'visible'}),MutationObserver:class{observe(){}disconnect(){disconnected++;}}});
 document.defaultView=view;document.createElement=tag=>new Element(document,tag);document.createElementNS=(_ns,tag)=>document.createElement(tag);document.createTextNode=text=>{const node=document.createElement('#text');node.textContent=text;return node;};document.querySelectorAll=()=>[];document.querySelector=()=>null;
 document.documentElement=document.createElement('html');document.body=document.createElement('body');document.documentElement.append(document.body);const root=document.createElement('div');document.body.append(root);
 return {document,root,disconnected:()=>disconnected};
}
function key(element,key){const event=new Event('keydown',{cancelable:true});Object.defineProperty(event,'key',{value:key});element.dispatchEvent(event);}
function descendants(root){return root.querySelectorAll('*');}
function create(f,options={}){globalThis.document=f.document;return createSiteMediaPreview(f.root,{apiFetch(){throw Error('Unexpected transport');},getSession:()=>({uid:'fixture',role:'OWNER',authzVersion:1}),...options});}
async function visibleFailure(preview){await preview.showThumbnail({source:'INVALID',asset:{kind:'IMAGE',id:'fixture-image'}},'Fixture image');}

test('real PinkySelect user choice updates preview width; clear closes and disables, subsequent use preserves choice',async()=>{
 const f=fixture(),preview=create(f),size=descendants(f.root).find(node=>node.getAttribute('role')==='combobox'),host=descendants(f.root).find(node=>node.className==='site-media-preview-viewport');
 assert.ok(size);assert.equal(descendants(f.root).some(node=>node.tagName==='SELECT'),false);assert.equal(size.value,'fluid');assert.equal(host.style['--preview-width'],'100%');assert.equal(size.disabled,true);
 await visibleFailure(preview);assert.equal(size.disabled,false);
 let changes=0;size.addEventListener('change',()=>changes++);
 const previous=globalThis.document;globalThis.document=f.document;
 try{key(size,'Enter');key(size,'End');key(size,'Enter');}finally{globalThis.document=previous;}
 assert.equal(size.value,'390');assert.equal(host.dataset.previewWidth,'390');assert.equal(host.style['--preview-width'],'390px');assert.equal(changes,1);
 globalThis.document=f.document;try{key(size,'Enter');}finally{globalThis.document=previous;}
 assert.equal(size.getAttribute('aria-expanded'),'true');preview.clear();assert.equal(size.getAttribute('aria-expanded'),'false');assert.equal(size.disabled,true);
 await visibleFailure(preview);assert.equal(size.value,'390');assert.equal(size.disabled,false);assert.equal(host.style['--preview-width'],'390px');
 size.pinkySelect.setValue('fluid');assert.equal(changes,1);size.dispatchEvent(new Event('change'));assert.equal(host.style['--preview-width'],'100%');
 size.pinkySelect.setValue('unexpected');size.dispatchEvent(new Event('change'));assert.equal(host.style['--preview-width'],'100%');
 preview.destroy();preview.destroy();assert.equal(size.pinkySelect,undefined);assert.equal(f.disconnected(),1);assert.equal(f.root.children.length,0);
});

test('thumbnail instances create no device widget or widget observer',()=>{
 const f=fixture(),preview=create(f,{thumbnail:true});assert.equal(descendants(f.root).some(node=>node.getAttribute('role')==='combobox'),false);preview.destroy();assert.equal(f.disconnected(),0);
});
