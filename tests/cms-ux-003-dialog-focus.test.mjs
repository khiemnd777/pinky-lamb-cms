import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm';

// Actual record dialog with synthetic DOM focus/visibility semantics, no API or browser.
async function harness(){
 let document;
 class Node extends EventTarget{
  constructor(tag){super();this.tagName=tag.toUpperCase();this.children=[];this.attributes={};this.dataset={};this.style={};this.disabled=false;this.hidden=false;this.inert=false;this.isConnected=true;this.tabIndex=['BUTTON','INPUT','TEXTAREA','SELECT','SUMMARY','IFRAME'].includes(this.tagName)?0:-1;this.classList={add(){}};}
  append(...nodes){for(const node of nodes){node.remove();node.parentElement=this;this.children.push(node);}}
  prepend(...nodes){for(const node of [...nodes].reverse()){node.remove();node.parentElement=this;this.children.unshift(node);}}
  replaceChildren(...nodes){for(const child of [...this.children])child.remove();this.append(...nodes);}
  remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(child=>child!==this);this.parentElement=null;}
  setAttribute(name,value){this.attributes[name]=String(value);if(name==='tabindex')this.tabIndex=Number(value);}
  getAttribute(name){return this.attributes[name];}
  contains(node){return node===this||this.children.some(child=>child.contains(node));}
  matches(selector){
   if(selector===':disabled')return this.disabled||Boolean(this.parentElement?.closest('fieldset[disabled]'));
   if(selector==='[hidden],[inert]')return this.hidden||this.inert;
   if(selector==='dialog[open]')return this.tagName==='DIALOG'&&this.open;
   if(selector==='fieldset[disabled]')return this.tagName==='FIELDSET'&&this.disabled;
   if(selector==='[tabindex]')return this.attributes.tabindex!==undefined;
   if(selector==='[contenteditable="true"]')return this.attributes.contenteditable==='true';
   if(selector.startsWith('[data-dialog'))return false;
   return selector.split(',').some(part=>{const value=part.trim(),tag=/^[a-z]+/.exec(value)?.[0]?.toUpperCase();if(tag!==this.tagName)return false;if(value.includes('not(:disabled)')&&this.matches(':disabled'))return false;if(value.includes('not([readonly])')&&this.readOnly)return false;if(value.includes('[href]')&&!this.attributes.href)return false;if(value.includes('[controls]')&&!this.attributes.controls)return false;return true;});
  }
  closest(selector){for(let node=this;node;node=node.parentElement)if(node.matches(selector))return node;return null;}
  querySelectorAll(selector){return this.children.flatMap(child=>[...(child.matches(selector)?[child]:[]),...child.querySelectorAll(selector)]);}
  querySelector(selector){return this.querySelectorAll(selector)[0]??null;}
  getClientRects(){return this.closest('[hidden],[inert]')||this.visibility==='hidden'?[]:[{}];}
  focus(){document.activeElement=this;}
  showModal(){this.open=true;}
  close(){this.open=false;}
  click(){if(!this.matches(':disabled'))this.dispatchEvent(new Event('click'));}
 }
 document={activeElement:null,defaultView:{getComputedStyle:node=>({visibility:node.visibility??'visible'})}};document.body=new Node('body');
 const node=(tag,text,attrs={})=>{const result=new Node(tag);result.textContent=text??'';for(const [key,value]of Object.entries(attrs))result.setAttribute(key,value);return result;};
 const button=(label,id,handler)=>{const result=node('button',label,id?{id}:{});result.addEventListener('click',handler);return result;};
 const context=createContext({document,structuredClone}),module=new SourceTextModule(readFileSync(new URL('../admin/site-collection-ui.mjs',import.meta.url),'utf8'),{context}),synthetic=exports=>new SyntheticModule(Object.keys(exports),function(){for(const [key,value]of Object.entries(exports))this.setExport(key,value);},{context});
 await module.link(specifier=>specifier.includes('site-fields')?synthetic({siteNode:node,siteButton:button}):specifier.includes('cms-icons')?synthetic({createCmsIcon:()=>node('svg')}):specifier.includes('pinky-select')?synthetic({createPinkySelect(){throw Error('Unexpected selector');},disposePinkySelects(){}}):synthetic({createFormTabs(){throw Error('Unexpected tabs');}}));await module.evaluate();
 return {api:module.namespace,document,node,button,tab(dialog,{shift=false,prevented=false}={}){const event=new Event('keydown',{cancelable:true});Object.assign(event,{key:'Tab',shiftKey:shift});if(prevented)event.preventDefault();dialog.dispatchEvent(event);return event;}};
}

test('record dialog wraps Tab and Shift+Tab boundaries, respects interior and default-prevented combo events',async()=>{
 const h=await harness();let input;const controller=h.api.createRecordDialog({title:'Project',render(body){input=h.node('input');body.append(input);return {};},onApply(){}});controller.open({});const dialog=h.document.body.querySelector('dialog'),buttons=dialog.querySelectorAll('button'),first=buttons.find(button=>button.attributes['aria-label']==='Đóng'),apply=buttons.find(button=>button.textContent==='Áp dụng');
 apply.focus();assert.equal(h.tab(dialog).defaultPrevented,true);assert.equal(h.document.activeElement,first);assert.equal(h.tab(dialog,{shift:true}).defaultPrevented,true);assert.equal(h.document.activeElement,apply);input.focus();assert.equal(h.tab(dialog).defaultPrevented,false);assert.equal(h.document.activeElement,input);apply.focus();h.tab(dialog,{prevented:true});assert.equal(h.document.activeElement,apply);assert.equal(dialog.open,true);controller.destroy();
});

test('hidden guard, disabled controls and fieldsets, inert content and negative tabindex do not become boundaries; summary remains reachable',async()=>{
 const h=await harness();let field,summary,blockedTail;const controller=h.api.createRecordDialog({title:'Project',render(body){field=h.node('input');summary=h.node('summary');const fieldset=h.node('fieldset'),disabled=h.node('input'),inert=h.node('div'),nested=h.node('button'),negative=h.node('button');fieldset.disabled=true;fieldset.append(disabled);inert.inert=true;inert.append(nested);negative.tabIndex=-1;blockedTail=[fieldset,inert,negative];body.append(field,summary,...blockedTail);return {};},onApply(){}});controller.open({});const dialog=h.document.body.querySelector('dialog'),buttons=dialog.querySelectorAll('button'),close=buttons.find(button=>button.attributes['aria-label']==='Đóng'),cancel=buttons.find(button=>button.textContent==='Hủy'),apply=buttons.find(button=>button.textContent==='Áp dụng');controller.setDisabled(true);assert.equal(apply.disabled,true);cancel.focus();h.tab(dialog);assert.equal(h.document.activeElement,close);controller.setDisabled(false);dialog.append(summary,...blockedTail);summary.focus();assert.equal(h.tab(dialog).defaultPrevented,true);assert.equal(h.document.activeElement,close);h.tab(dialog,{shift:true});assert.equal(h.document.activeElement,summary);controller.destroy();
});

test('dirty Escape opens discard guard, Tab includes visible guard controls, discard preserves working data and restores opener',async()=>{
 const h=await harness(),value={title:'Original'},opener=h.node('button','Open');h.document.body.append(opener);opener.focus();let scratch;const controller=h.api.createRecordDialog({title:'Project',render(_body,data){scratch=data;return {};},onApply(){assert.fail('No apply expected');}});controller.open(value);scratch.title='Changed';const dialog=h.document.body.querySelector('dialog');dialog.dispatchEvent(new Event('cancel',{cancelable:true}));assert.equal(dialog.open,true);const discard=dialog.querySelectorAll('button').find(button=>button.textContent==='Bỏ thay đổi');assert.equal(h.document.activeElement.textContent,'Tiếp tục chỉnh sửa');assert.equal(h.tab(dialog).defaultPrevented,false);discard.click();assert.equal(dialog.open,false);assert.equal(value.title,'Original');assert.equal(h.document.activeElement,opener);controller.destroy();
});
