import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm';
import {pathToFileURL} from 'node:url';
import path from 'node:path';

// Actual field-tools factory with synthetic DOM and PinkySelect/sort mount boundaries.
// Verifies field identity, typed models and semantic layout hooks; not rendered geometry.
async function harness(){
 class Node extends EventTarget{
  constructor(tag){super();this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attributes={};this.style={setProperty(){}};this.classList={add:value=>{this.attributes.class=[this.attributes.class,value].filter(Boolean).join(' ');},remove:value=>{this.attributes.class=(this.attributes.class??'').split(' ').filter(item=>item!==value).join(' ');}};}
  setAttribute(name,value){this.attributes[name]=String(value);if(name==='id')this.id=value;if(name.startsWith('data-'))this.dataset[name.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(value);}
  getAttribute(name){return this.attributes[name];}
  append(...nodes){for(const node of nodes){node.remove();node.parentElement=this;this.children.push(node);}}
  get lastElementChild(){return this.children.at(-1)??null;}
  prepend(...nodes){for(const node of [...nodes].reverse()){node.remove();node.parentElement=this;this.children.unshift(node);}}
  remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(child=>child!==this);this.parentElement=null;}
  replaceWith(other){const parent=this.parentElement,index=parent.children.indexOf(this);other.remove();parent.children[index]=other;other.parentElement=parent;this.parentElement=null;}
  replaceChildren(...nodes){for(const child of [...this.children])child.remove();this.append(...nodes);}
  matches(selector){if(selector==='*')return true;if(selector.startsWith('.'))return (this.attributes.class??'').split(' ').includes(selector.slice(1));return selector.toUpperCase()===this.tagName;}
  closest(selector){for(let current=this;current;current=current.parentElement)if(current.matches(selector))return current;return null;}
  querySelectorAll(selector){return this.children.flatMap(child=>[...(child.matches(selector)?[child]:[]),...child.querySelectorAll(selector)]);}
  querySelector(selector){if(selector.startsWith(':scope > '))return this.children.find(child=>child.matches(selector.slice(9)))??null;return this.querySelectorAll(selector)[0]??null;}
 }
 const node=(tag,text,attrs={})=>{const el=new Node(tag);el.textContent=text??'';for(const [name,value]of Object.entries(attrs))el.setAttribute(name,value);return el;},button=(text,id,handler)=>{const el=node('button',text,id?{id}:{});el.addEventListener('click',handler);return el;};
 const mounts=[],sourceBindings=[],hosts=new WeakMap(),context=createContext({document:{createElement:tag=>new Node(tag),getElementById:()=>null,activeElement:null}}),module=new SourceTextModule(readFileSync(new URL('../admin/site-settings-editor.mjs',import.meta.url),'utf8'),{context});
 const synthetic=exports=>new SyntheticModule(Object.keys(exports),function(){for(const [key,value]of Object.entries(exports))this.setExport(key,value);},{context});
 await module.link(specifier=>{
  if(specifier.includes('site-source-bindings'))return synthetic({renderSiteSourceBindings(_tools,_parent,_content,_context,claimPath){sourceBindings.push(claimPath);}});
  if(specifier.includes('site-fields'))return synthetic({siteNode:node,siteButton:button,SITE_SECTION_LABELS:{}});
  if(specifier.includes('site-form-ui'))return synthetic({createFormTabs(parent,options){const panels=new Map(options.tabs.map(tab=>[tab.id,node('div','',{id:tab.id})]));parent.append(...panels.values());return {panel:id=>panels.get(id),reveal(){}};},createFormSorts(){return {mount(parent,values,path){let host=hosts.get(values);if(!host){host=node('div','',{class:'ux-form-sort'});hosts.set(values,host);}parent.append(host);mounts.push({values,path,host});return {};},sync(){},remove(values,index){values.splice(index,1);},setDisabled(){},destroy(){}};}});
  if(specifier.includes('cms-icons'))return synthetic({createCmsIcon:()=>node('svg')});
  if(specifier.includes('pinky-select'))return synthetic({createPinkySelect(_doc,config){const el=node('button','',{id:config.id,'data-validation-path':config.path,role:'combobox'});el.value=config.value;el.pinkySelect={destroy(){},setOptions(){}};return el;},disposePinkySelects(){},closePinkySelects(){}});
  if(specifier.includes('site-collection-ui'))return synthetic({createRecordDialog(){throw Error('No dialog expected');}});
  if(specifier.includes('site-settings.mjs'))return synthetic({stableIdSchema:{}});
  return synthetic({openMediaPicker(){throw Error('No media expected');}});
 });await module.evaluate();return {createTools:module.namespace.createSiteFieldTools,mountSettings:module.namespace.mountSiteSettings,node,mounts,sourceBindings};
}

test('typed runs retain full text/emphasis controls, identity and caps while sort footer follows editable rows',async()=>{
 const h=await harness(),parent=h.node('section'),values=[{text:'First',emphasis:'STRONG'},{text:'Second'}],before=structuredClone(values);let changes=0;
 const tools=h.createTools({content:{},context:{siteUx:true},onChange(){changes++;},redraw(){}});tools.runs(parent,values,'sections.1.heading.lines.0','heading-0','Tiêu đề',{cap:100});assert.deepEqual(values,before);
 const rows=parent.querySelectorAll('.ux-typed-run');assert.equal(rows.length,2);assert.equal(rows[0].dataset.siteRunPath,'sections.1.heading.lines.0.0');const text=rows[0].querySelector('input'),emphasis=rows[0].querySelector('.ux-run-style-field').querySelector('button');assert.equal(text.closest('.ux-run-text-field'),rows[0].querySelector('.ux-run-text-field'));assert.equal(text.id,'heading-0-0-text');assert.equal(text.maxLength,100);assert.equal(text.dataset.validationPath,'sections.1.heading.lines.0.0.text');assert.equal(emphasis.id,'heading-0-0-emphasis');assert.equal(emphasis.getAttribute('role'),'combobox');
 text.value='Edited';text.dispatchEvent(new Event('input'));emphasis.value='ACCENT';emphasis.dispatchEvent(new Event('change'));assert.deepEqual(values,[{text:'Edited',emphasis:'ACCENT'},{text:'Second'}]);assert.equal(changes,2);
 const group=parent.children[0],footer=h.mounts[0].host;assert.equal(group.children.indexOf(footer)>group.children.indexOf(rows[1]),true);assert.equal(group.children.at(-1).getAttribute('aria-label'),'Minh họa Tiêu đề');tools.dispose();
});

test('heading lines retain AST and path metadata and put line ordering footer after line controls',async()=>{
 const h=await harness(),parent=h.node('section'),value={lines:[[{text:'A'}],[{text:'B',emphasis:'ACCENT'}]]},before=structuredClone(value),tools=h.createTools({content:{},context:{siteUx:true},onChange(){},redraw(){}});
 tools.heading(parent,value,'sections.1.heading','work-heading','Tiêu đề Dự án');assert.deepEqual(value,before);const rich=parent.querySelector('.ux-rich-heading'),lines=rich.querySelectorAll('.ux-heading-line');assert.equal(lines.length,2);assert.equal(lines[1].dataset.validationPath,'sections.1.heading.lines.1');assert.equal(rich.children.at(-1),h.mounts.find(entry=>entry.values===value.lines).host);assert.equal(lines[0].querySelector('.ux-run-text-field').querySelector('input').id,'work-heading-0-0-text');tools.dispose();
});


test('G01 mounts all settings panels with real structural buttons, source call sites and disposable illustration thumbnails',async()=>{
 const {loadBaselineInputs,mapBaselineSite}=await import(pathToFileURL(path.join(process.cwd(),'scripts/map-baseline-site.mjs')).href),baseline=mapBaselineSite(loadBaselineInputs()),content=structuredClone(baseline.content),before=structuredClone(content),h=await harness(),parent=h.node('section');let mounted=0,cleaned=0;
 const controller=h.mountSettings(parent,{content,context:{...baseline.context,siteUx:true,mountMediaThumbnail(){mounted++;return ()=>{cleaned++;};}},onChange(){},includeContact:false});
 assert.deepEqual(content,before);assert.equal(parent.querySelectorAll('.ux-settings-layout').length,3);assert.equal(parent.querySelectorAll('.ux-settings-context').length,3);assert.deepEqual(h.sourceBindings,['settings/brand/facts','hero/facts','seo/facts']);
 const navRows=parent.querySelectorAll('.ux-settings-nav-row');assert.equal(navRows.length,content.settings.nav.length);for(const row of navRows){const remove=row.children.find(child=>child.id?.endsWith('-remove'));assert.equal(remove.tagName,'BUTTON');assert.ok(remove.getAttribute('aria-label').startsWith('Bỏ '));assert.equal(remove.children[0].tagName,'SVG');}
 const descriptor=parent.querySelectorAll('input').find(input=>input.id==='site-header-descriptor'),cta=parent.querySelectorAll('input').find(input=>input.id==='site-header-cta');assert.ok(descriptor.closest('.ux-settings-pair'));assert.equal(descriptor.closest('.ux-settings-pair'),cta.closest('.ux-settings-pair'));const header=descriptor.closest('.ux-settings-pair').parentElement,pairIndex=header.children.indexOf(descriptor.closest('.ux-settings-pair')),control=id=>parent.querySelectorAll('*').find(node=>node.id===id);for(const id of ['site-brand-logo-pick','site-brand-logo-alt','site-brand-logo-decorative','site-brand-logo-focal-enabled']){const field=control(id).closest('.ux-media-field')??control(id).closest('.editor-field')??control(id).closest('.editor-check');assert.ok(header.children.indexOf(field)<pairIndex,id+' before descriptor/CTA');}assert.ok(header.children.indexOf(control('site-brand-tagline').closest('.editor-field'))>pairIndex);assert.ok(mounted>=3);controller.destroy();assert.equal(cleaned,mounted);assert.equal(parent.children.length,0);
});


test('compact order toggle is view-only and retains typed controls and all nested sorter models',async()=>{
 const h=await harness(),parent=h.node('section'),value={lines:[[{text:'First',emphasis:'STRONG'}],[{text:'Second',emphasis:'ACCENT'}]]},before=structuredClone(value);let changes=0;
 const tools=h.createTools({content:{},context:{siteUx:true},onChange(){changes++;},redraw(){}});tools.heading(parent,value,'hero.heading','hero-heading','Tiêu đề Hero');
 const rich=parent.querySelector('.ux-rich-heading'),toggle=rich.querySelector('.ux-order-toggle');assert.ok(toggle);assert.equal(toggle.getAttribute('aria-expanded'),'false');assert.equal(toggle.getAttribute('data-site-view-only'),'');
 toggle.dispatchEvent(new Event('click'));assert.equal(toggle.getAttribute('aria-expanded'),'true');assert.ok(rich.matches('.ux-order-expanded'));toggle.dispatchEvent(new Event('click'));assert.equal(toggle.getAttribute('aria-expanded'),'false');assert.equal(changes,0);assert.deepEqual(value,before);assert.equal(h.mounts.length,3);assert.equal(rich.querySelectorAll('.ux-run-style-field').length,2);assert.equal(rich.querySelectorAll('.ux-typed-run').length,2);tools.dispose();
});


test('collection content panels use the same compact heading without changing typed values',async()=>{
 const h=await harness(),parent=h.node('section'),value={lines:[[{text:'Service heading'}]]},before=structuredClone(value),tools=h.createTools({content:{},context:{siteUx:false,formSorts:true},onChange(){throw Error('View must not edit');},redraw(){}});tools.heading(parent,value,'sections.2.heading','service-heading','Tiêu đề Dịch vụ');assert.ok(parent.querySelector('.ux-rich-heading'));assert.ok(parent.querySelector('.ux-order-toggle'));assert.equal(parent.querySelectorAll('.ux-typed-run').length,1);assert.deepEqual(value,before);tools.dispose();
});
