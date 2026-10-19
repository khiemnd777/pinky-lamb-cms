import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm';

// Real field/navigation controller; deterministic DOM/sorter boundaries, no HTTP or saved data.
async function harness(){
 const ids=new Map(),document=new EventTarget(),window=new EventTarget(),scrolls=[];
 class Node extends EventTarget{
  constructor(tag){super();this.tagName=tag;this.children=[];this.dataset={};this.attrs={};this.classList={add(){}};}
  append(...nodes){for(const node of nodes){node.parentElement=this;this.children.push(node);}}
  prepend(...nodes){for(const node of nodes)node.parentElement=this;this.children.unshift(...nodes);}
  setAttribute(key,value){this.attrs[key]=String(value);if(key==='id'){this.id=value;ids.set(value,this);}if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(value);}
  removeAttribute(key){delete this.attrs[key];}
  hasAttribute(key){return key in this.attrs;}
  matches(selector){return selector.split(',').some(value=>{const item=value.trim();if(item==='[tabindex]')return this.tabIndex!==undefined;if(item[0]==='#')return this.id===item.slice(1);const attr=item.match(/^\[([^=\]]+)(?:="([^\"]*)")?\]$/);if(attr)return this.hasAttribute(attr[1])&&(attr[2]===undefined||this.attrs[attr[1]]===attr[2]);return item===this.tagName;});}
  contains(node){return this===node||this.children.some(child=>child.contains(node));}
  querySelectorAll(selector){return this.children.flatMap(child=>[...(child.matches(selector)?[child]:[]),...child.querySelectorAll(selector)]);}
  querySelector(selector){if(selector.includes(' h3'))return this.querySelector(selector.split(' ')[0])?.querySelector('h3');return this.querySelectorAll(selector)[0]??null;}
  closest(selector){for(let node=this;node;node=node.parentElement)if(node.matches(selector))return node;return null;}
  focus(options){document.activeElement=this;this.focusOptions=options;}
  scrollIntoView(options){scrolls.push({node:this,options});}
  remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(node=>node!==this);}
 }
 document.createElement=tag=>new Node(tag);document.getElementById=id=>ids.get(id);
 class CustomEvent extends Event{constructor(name,options={}){super(name);this.detail=options.detail;}}
 const context=createContext({document,window,CustomEvent,Element:Node}),source=readFileSync(new URL('../admin/site-fields.mjs',import.meta.url),'utf8'),module=new SourceTextModule(source,{context});
 await module.link(specifier=>{const exports=specifier.includes('site-collection')?{createSortableList:()=>({setDisabled(){},destroy(){}})}:specifier.includes('cms-icons')?{createCmsIcon:()=>new Node('svg')}:{closePinkySelects(){}};return new SyntheticModule(Object.keys(exports),function(){for(const [key,value]of Object.entries(exports))this.setExport(key,value);},{context});});await module.evaluate();
 const node=module.namespace.siteNode,container=node('main'),heading=node('h2','Đầu trang, Hero và SEO',{id:'cms-resource-title'}),input=node('input',undefined,{id:'test-field','data-validation-path':'hero.note'});let revealed=0;
 const controller=module.namespace.mountSiteFields(container,{content:{sections:[],sectionOrder:[]},context:{siteUx:true},onChange(){},components:[{key:'settings',label:'Đầu trang, Hero và SEO',mount(host){host.append(input);return {revealValidationPath(){revealed++;return input;},destroy(){}};}}]});return {document,ids,heading,input,controller,scrolls,get revealed(){return revealed;}};
}

test('group navigation focuses and scrolls the page heading; normal field/validation reveal retains field focus',async()=>{
 const h=await harness();h.ids.get('site-go-settings').dispatchEvent(new Event('click'));assert.equal(h.document.activeElement,h.heading);assert.equal(h.heading.tabIndex,-1);assert.equal(h.scrolls.at(-1).node,h.heading);assert.equal(h.ids.get('site-component-settings').focusOptions,undefined);
 h.controller.revealTarget(h.input);assert.equal(h.document.activeElement,h.input);assert.equal(h.scrolls.at(-1).node,h.input);assert.equal(h.input.focusOptions.preventScroll,true);assert.ok(h.revealed>0);h.controller.destroy();
});
