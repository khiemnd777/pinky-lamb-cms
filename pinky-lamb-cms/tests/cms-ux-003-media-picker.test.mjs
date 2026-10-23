import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm';
import * as mediaSchemas from '../contracts/media-read-public.mjs';
import {safeCatalogV2Schema} from '../contracts/media-v3-records-v2.mjs';

// In-memory UI boundary: execute the actual picker and validators, without HTTP writes.
async function harness(){
 let document,cleanups=0,member={uid:'fixture-user',role:'OWNER',authzVersion:1};const selected=[],calls=[];
 class Node extends EventTarget{
  constructor(tag){super();this.tagName=tag;this.children=[];this.attributes={};this.dataset={};this.value='';}
  append(...nodes){for(const node of nodes){node.remove();node.parentElement=this;this.children.push(node);}}
  replaceChildren(...nodes){for(const node of [...this.children])node.remove();this.append(...nodes);}
  remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(node=>node!==this);this.parentElement=null;}
  setAttribute(key,value){this.attributes[key]=value;}
  querySelectorAll(tag){return this.children.flatMap(node=>[...(node.tagName===tag?[node]:[]),...node.querySelectorAll(tag)]);}
  focus(){document.activeElement=this;}
  click(){if(!this.disabled)this.dispatchEvent(new Event('click'));}
  showModal(){this.open=true;}
  close(){this.open=false;this.dispatchEvent(new Event('close'));}
 }
 document=Object.assign(new EventTarget(),{createElement:tag=>new Node(tag),body:new Node('body'),activeElement:null});
 const context=createContext({document,crypto,AbortController,DOMException,URLSearchParams,window:{confirm(){throw Error('Unexpected confirmation');}}}),synthetic=exports=>new SyntheticModule(Object.keys(exports),function(){for(const [key,value]of Object.entries(exports))this.setExport(key,value);},{context});
 const module=new SourceTextModule(readFileSync(new URL('../admin/media-slot-picker.mjs',import.meta.url),'utf8'),{context});
 await module.link(specifier=>specifier.includes('file-sources')?synthetic({mountFileSources:()=>({destroy(){}})}):specifier.includes('cms-icons')?synthetic({createCmsIcon:()=>new Node('svg')}):specifier.includes('media-v3-records')?synthetic({safeCatalogV2Schema}):synthetic(mediaSchemas));await module.evaluate();
 const finish=module.namespace.openMediaSlotPicker({apiFetch:async path=>{calls.push(path);return {items:[],nextCursor:null};},getSession:()=>member,kind:'IMAGE',onSelect:value=>selected.push(value),catalog:[{source:'LEGACY',asset:{id:'fixture-image',kind:'IMAGE',status:'LEGACY_READY',legacyPath:'assets/fixture.webp',label:'Fixture image'}}],mountThumbnail(host){host.append(new Node('img'));return ()=>cleanups++;}});
 await new Promise(resolve=>setImmediate(resolve));
 return {document,selected,calls,finish,cleanups:()=>cleanups,setMember:value=>{member=value;},button:label=>document.body.querySelectorAll('button').find(node=>node.textContent===label||node.attributes['aria-label']===label)};
}

test('media grid requires explicit confirmation; Cancel discards selection and cleans thumbnails',async()=>{
 const h=await harness();assert.equal(h.document.body.querySelectorAll('article').length,1);const option=h.button('Fixture image — LEGACY');option.click();assert.equal(option.attributes['aria-pressed'],'true');assert.equal(h.selected.length,0);assert.equal(h.button('Dùng tài nguyên này').disabled,false);h.button('Đóng').click();assert.equal(h.selected.length,0);assert.equal(h.document.body.children.length,0);assert.ok(h.cleanups()>0);assert.ok(h.calls.every(path=>path.startsWith('/api/cms/media?')));
});

test('media confirmation preserves actual source DTO and session change prevents a stale choice',async()=>{
 const h=await harness();h.button('Fixture image — LEGACY').click();h.button('Dùng tài nguyên này').click();assert.equal(h.selected.length,1);assert.equal(h.selected[0].source,'LEGACY');assert.equal(h.selected[0].asset.id,'fixture-image');assert.equal(h.document.body.children.length,0);
 const stale=await harness();stale.button('Fixture image — LEGACY').click();stale.setMember(null);stale.document.dispatchEvent(new Event('cms:session'));assert.equal(stale.document.body.children.length,0);assert.equal(stale.selected.length,0);
});
