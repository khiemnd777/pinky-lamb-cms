import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm';
import {stableIdSchema} from '../contracts/site-settings.mjs';

// Actual G01/G02 handlers and frozen source-binding helper. Synthetic DOM, modal,
// media and sorter boundaries only; no SDK, retained data, network or geometry proof.
async function harness(){
 let document,modal;
 class Node extends EventTarget{
  constructor(tag){super();this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attributes={};this.style={setProperty(){}};this.disabled=false;this.textContent='';this.classList={add:(...names)=>{this.attributes.class=[this.attributes.class,...names].filter(Boolean).join(' ');},remove:(name)=>{this.attributes.class=(this.attributes.class??'').split(' ').filter(value=>value!==name).join(' ');}};}
  setAttribute(name,value){this.attributes[name]=String(value);if(name==='id')this.id=value;if(name.startsWith('data-'))this.dataset[name.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(value);}
  getAttribute(name){return this.attributes[name];}
  get lastElementChild(){return this.children.at(-1)??null;}
  append(...nodes){for(const node of nodes){node.remove();node.parentElement=this;this.children.push(node);}}
  prepend(...nodes){for(const node of [...nodes].reverse()){node.remove();node.parentElement=this;this.children.unshift(node);}}
  remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(child=>child!==this);this.parentElement=null;}
  replaceWith(other){const parent=this.parentElement,index=parent.children.indexOf(this);other.remove();parent.children[index]=other;other.parentElement=parent;this.parentElement=null;}
  replaceChildren(...nodes){for(const child of [...this.children])child.remove();this.append(...nodes);}
  contains(node){return node===this||this.children.some(child=>child.contains(node));}
  matches(selector){
   if(selector==='*')return true;if(selector.includes(','))return selector.split(',').some(value=>this.matches(value.trim()));
   if(selector.startsWith('#'))return this.id===selector.slice(1);if(selector.startsWith('.'))return (this.attributes.class??'').split(' ').includes(selector.slice(1));
   const attr=selector.match(/^\[data-([\w-]+)(?:="(.*)")?\]$/);if(attr){const value=this.dataset[attr[1].replace(/-([a-z])/g,(_,c)=>c.toUpperCase())];return value!==undefined&&(attr[2]===undefined||value===attr[2]);}
   return selector.toUpperCase()===this.tagName;
  }
  closest(selector){for(let current=this;current;current=current.parentElement)if(current.matches(selector))return current;return null;}
  querySelectorAll(selector){if(selector.startsWith(':scope > '))return this.children.filter(child=>child.matches(selector.slice(9)));return this.children.flatMap(child=>[...(child.matches(selector)?[child]:[]),...child.querySelectorAll(selector)]);}
  querySelector(selector){return this.querySelectorAll(selector)[0]??null;}
  focus(){document.activeElement=this;}
  get isConnected(){return document.body.contains(this);}
 }
 const node=(tag,text,attrs={})=>{const el=new Node(tag);el.textContent=text??'';for(const [name,value]of Object.entries(attrs))el.setAttribute(name,value);return el;},button=(text,id,handler)=>{const el=node('button',text,id?{id}:{});el.addEventListener('click',handler);return el;};
 document={body:node('body'),activeElement:null,createElement:tag=>new Node(tag),getElementById:id=>document.body.querySelectorAll('*').find(value=>value.id===id)};
 const mounts=[],thumbs=[],tabs=[],context=createContext({document,structuredClone,queueMicrotask,Event}),module=new SourceTextModule(readFileSync(new URL('../admin/site-settings-editor.mjs',import.meta.url),'utf8'),{context});
 const synthetic=exports=>new SyntheticModule(Object.keys(exports),function(){for(const [key,value]of Object.entries(exports))this.setExport(key,value);},{context});
 const fields=synthetic({siteNode:node,siteButton:button,SITE_SECTION_LABELS:{work:'Dự án',contact:'Liên hệ',services:'Dịch vụ',about:'Giới thiệu','ip-studio':'IP Studio'}});
 const sources=new SourceTextModule(readFileSync(new URL('../admin/site-source-bindings.mjs',import.meta.url),'utf8'),{context});await sources.link(()=>fields);
 await module.link(specifier=>{
  if(specifier.includes('site-source-bindings'))return sources;if(specifier.includes('site-fields'))return fields;
  if(specifier.includes('cms-icons'))return synthetic({createCmsIcon:name=>node('svg',undefined,{'data-lucide':name})});
  if(specifier.includes('site-settings.mjs'))return synthetic({stableIdSchema});
  if(specifier.includes('pinky-select'))return synthetic({createPinkySelect(_doc,config){const el=node('button',config.label,{id:config.id,'data-validation-path':config.path,role:'combobox'});el.value=config.value;el.pinkySelect={destroy(){delete el.pinkySelect;},setOptions(){}};return el;},disposePinkySelects(){},closePinkySelects(){}});
  if(specifier.includes('site-form-ui'))return synthetic({createFormTabs(parent,config){tabs.push(config);const panels=new Map(config.tabs.map(tab=>[tab.id,node('section',undefined,{id:tab.id})]));for(const panel of panels.values())parent.append(panel);return {panel:id=>panels.get(id),reveal(){}};},createFormSorts(){return {mount(parent,values,path){const host=node('div',undefined,{class:'ux-form-sort'});parent.append(host);mounts.push({parent,values,path,host});},sync(){},remove(values,index){values.splice(index,1);},move(values,index,offset){const target=index+offset;if(target>=0&&target<values.length)[values[index],values[target]]=[values[target],values[index]];},setDisabled(){},destroy(){}};}});
  if(specifier.includes('site-collection-ui'))return synthetic({createRecordDialog(config){const body=node('div');document.body.append(body);modal={body,scratch:null,baseline:null,child:null,open(value){this.scratch=structuredClone(value);this.baseline=JSON.stringify(this.scratch);this.child=config.render(body,this.scratch);},close(){return true;},setTitle(){},setDisabled(value){this.disabled=value;this.child?.setDisabled?.(value);},hasPendingInput(){return this.scratch&&JSON.stringify(this.scratch)!==this.baseline;},revealValidationPath:path=>modal.child.revealValidationPath(path),apply(){return config.onApply(this.scratch);},discard(){this.child?.destroy();body.replaceChildren();this.scratch=null;},destroy(){this.discard();body.remove();}};return modal;}});
  return synthetic({openMediaPicker(){throw Error('Picker is outside this unit boundary');}});
 });await module.evaluate();
 const image={assetId:'logo-image',alt:'Mô tả thật',isDecorative:false,focalPoint:{x:.2,y:.7}},logo={id:'alpha',clientName:'Alpha',image:structuredClone(image),isVisible:false};
 const content={settings:{header:{descriptor:'Mô tả đầu trang thật',ctaLabel:'Gửi brief'},brand:{name:'Pinky Lamb',logo:structuredClone(image),tagline:'Thông điệp thật'},nav:[{sectionId:'work',label:'Dự án thật'},{sectionId:'contact',label:'Liên hệ thật'}],clientLogos:[logo,{...structuredClone(logo),id:'beta',clientName:'Beta'}]},sections:[{sectionId:'clients',isVisible:true,heading:[{text:'Khách hàng',emphasis:'ACCENT'}]},...['work','services','about','ip-studio','contact'].map(sectionId=>({sectionId,isVisible:true}))],hero:{eyebrow:'Giới thiệu thật',heading:{lines:[[{text:'Dòng một',emphasis:'STRONG'}],[{text:'Dòng hai'}]]},description:[{text:'Mô tả Hero thật'}],image:structuredClone(image),primaryAction:{kind:'SECTION',sectionId:'contact',label:'Gửi brief'},secondaryAction:{kind:'SHOWREEL',label:'Xem showreel'},footnote:'Chú thích',note:'Ghi chú'},seo:{title:'SEO thật',description:'Mô tả SEO thật',ogTitle:'Chia sẻ thật',ogDescription:'Mô tả chia sẻ thật',ogImage:structuredClone(image)},claimSources:[{claimPath:'clientLogos/alpha/facts',sourceIds:['source-a','unassigned-preserved']},{claimPath:'clientLogos/beta/facts',sourceIds:['source-b']},{claimPath:'hero/facts',sourceIds:['source-a']}]};
 const uiContext={siteUx:true,catalog:[{id:'logo-image',kind:'IMAGE',status:'LEGACY_READY',label:'Logo thật',width:640,height:480}],sourceIds:['source-a','source-b'],sourceCatalog:[{id:'source-a',title:'Nguồn A',supportedClaimPaths:['clientLogos/*/facts','hero/facts','seo/facts','settings/brand/facts']},{id:'source-b',title:'Nguồn B',supportedClaimPaths:['clientLogos/*/facts']}],resolveMediaAsset:id=>uiContext.catalog.find(value=>value.id===id),mountMediaThumbnail(host,id,options){thumbs.push({host,id,options});return ()=>{};},onPendingChange(){}};
 const container=node('section');document.body.append(container);let changes=0;
 return {content,uiContext,container,document,tabs,mounts,thumbs,get modal(){return modal;},mountSettings:()=>module.namespace.mountSiteSettings(container,{content,context:uiContext,onChange(){changes++;},includeContact:false}),mountClients:()=>module.namespace.mountSiteClients(container,{content,context:uiContext,onChange(){changes++;}}),changes:()=>changes,control:id=>document.getElementById(id),input(id,value,type='input'){const el=document.getElementById(id);if(type==='change')el.checked=value;else el.value=value;el.dispatchEvent(new Event(type));return el;},click(id){document.getElementById(id).dispatchEvent(new Event('click'));}};
}

test('G01 mounts all three real tabs, sources and actual illustrations without altering working content',async()=>{
 const h=await harness(),before=structuredClone(h.content),controller=h.mountSettings();
 assert.deepEqual(Array.from(h.tabs[0].tabs,tab=>tab.label),['Đầu trang','Hero','SEO & chia sẻ']);assert.deepEqual(h.content,before);
 assert.equal(h.container.querySelectorAll('.ux-settings-context').length,3);assert.equal(h.thumbs.length,9);assert.equal(h.container.querySelectorAll('.ux-focal-surface').length,3);assert.equal(h.control('site-nav-0-up'),undefined);assert.equal(h.control('site-nav-0-down'),undefined);assert.equal(h.control('site-nav-0-remove').querySelector('svg').dataset.lucide,'Trash2');
 assert.equal(h.control('site-hero-heading-1-0-text').value,'Dòng hai');assert.equal(h.control('site-hero-heading-0-0-emphasis').value,'STRONG');assert.ok(h.control('site-brand-source-source-a'));assert.ok(h.control('site-hero-source-source-a'));assert.ok(h.control('site-seo-source-source-a'));
 const nav=h.mounts.find(value=>value.path==='settings.nav');assert.equal(nav.parent.querySelectorAll('.ux-settings-nav-row').length,2);assert.equal(nav.values,h.content.settings.nav);controller.destroy();
});

test('G02 dialog edits and source choices stay isolated until Apply; discarded scratch preserves all working state',async()=>{
 const h=await harness(),controller=h.mountClients(),before=structuredClone(h.content);h.click('site-client-alpha-edit');
 assert.equal(h.control('site-client-detail-id').readOnly,true);assert.equal(h.modal.scratch.logo.id,'alpha');assert.equal(h.modal.scratch.claimSources.length,1);
 h.input('site-client-detail-name','Nội dung chưa áp dụng');h.input('site-client-detail-source-source-b',true,'change');
 assert.deepEqual(h.content,before);assert.equal(controller.hasPendingInput(),true);h.modal.discard();assert.deepEqual(h.content,before);controller.destroy();
});

test('G02 Apply updates only selected logo and its binding, retaining full image metadata and later unrelated edits',async()=>{
 const h=await harness(),controller=h.mountClients(),other=structuredClone(h.content.settings.clientLogos[1]);h.click('site-client-alpha-edit');
 h.input('site-client-detail-name','Alpha mới');h.input('site-client-detail-source-source-b',true,'change');h.content.claimSources[1].sourceIds.push('later-source');
 h.modal.apply();assert.equal(h.content.settings.clientLogos[0].clientName,'Alpha mới');assert.deepEqual(h.content.settings.clientLogos[0].image,{assetId:'logo-image',alt:'Mô tả thật',isDecorative:false,focalPoint:{x:.2,y:.7}});assert.deepEqual(h.content.settings.clientLogos[1],other);assert.equal('claimSources' in h.content.settings.clientLogos[0],false);assert.deepEqual(h.content.claimSources[0].sourceIds,['source-a','unassigned-preserved','source-b']);assert.deepEqual(h.content.claimSources[1].sourceIds,['source-b','later-source']);assert.deepEqual(h.content.claimSources[2],{claimPath:'hero/facts',sourceIds:['source-a']});controller.destroy();
});

test('G02 new ID changes rename only scratch binding; hidden records count toward twelve; identity and media refusal mutate nothing',async()=>{
 const h=await harness(),controller=h.mountClients();h.click('site-client-add');h.input('site-client-detail-id','new-logo');h.input('site-client-detail-source-source-a',true,'change');h.input('site-client-detail-id','renamed-logo');
 assert.equal(h.modal.scratch.claimSources[0].claimPath,'clientLogos/renamed-logo/facts');h.input('site-client-detail-name','Khách hàng mới');h.modal.scratch.logo.image=structuredClone(h.content.settings.clientLogos[0].image);h.modal.apply();assert.equal(h.content.settings.clientLogos.at(-1).id,'renamed-logo');assert.deepEqual(h.content.claimSources.at(-1),{claimPath:'clientLogos/renamed-logo/facts',sourceIds:['source-a']});
 h.click('site-client-alpha-edit');const before=structuredClone(h.content);h.modal.scratch.logo.id='changed-id';assert.throws(()=>h.modal.apply(),/mã duy nhất/);assert.deepEqual(h.content,before);h.modal.scratch.logo.id='alpha';h.uiContext.catalog[0].isArchived=true;assert.throws(()=>h.modal.apply(),/ảnh sẵn sàng/);assert.deepEqual(h.content,before);h.uiContext.catalog[0].isArchived=false;h.modal.discard();
 while(h.content.settings.clientLogos.length<12)h.content.settings.clientLogos.push({...structuredClone(h.content.settings.clientLogos[0]),id:`hidden-${h.content.settings.clientLogos.length}`,isVisible:false});
 // Opening this callback directly simulates a cap reached after a dialog opened.
 h.click('site-client-add');h.modal.scratch.logo={id:'overflow',clientName:'Overflow',image:structuredClone(h.content.settings.clientLogos[0].image),isVisible:true};const capped=structuredClone(h.content);assert.throws(()=>h.modal.apply(),/12 logo/);assert.deepEqual(h.content,capped);controller.destroy();
});

test('G02 direct cards preserve sort-row paths, visibility and pending locks',async()=>{
 const h=await harness(),controller=h.mountClients();const sort=h.mounts.find(value=>value.path==='settings.clientLogos');assert.equal(sort.parent.querySelectorAll('.ux-logo-card').length,2);assert.equal(sort.parent.querySelectorAll('.ux-logo-card')[1].dataset.validationPath,'settings.clientLogos.1');
 h.click('site-client-alpha-visible');assert.equal(h.content.settings.clientLogos[0].isVisible,true);assert.equal(h.control('site-client-alpha-visible').getAttribute('aria-pressed'),'true');controller.setDisabled(true);h.click('site-client-alpha-visible');assert.equal(h.content.settings.clientLogos[0].isVisible,true);assert.equal(h.control('site-client-add').disabled,true);
 h.click('site-client-alpha-edit');h.modal.scratch.logo.clientName='Locked edit';assert.equal(h.modal.apply(),false);assert.equal(h.content.settings.clientLogos[0].clientName,'Alpha');controller.destroy();
});

test('G02 removing the last selected source removes only its binding; empty and capped collections keep their real actions',async()=>{
 const h=await harness();h.content.claimSources[0].sourceIds=['source-a'];let controller=h.mountClients();h.click('site-client-alpha-edit');const unrelated=structuredClone(h.content.claimSources.slice(1));h.input('site-client-detail-source-source-a',false,'change');h.modal.apply();assert.deepEqual(h.content.claimSources,unrelated);controller.destroy();
 h.content.settings.clientLogos=[];controller=h.mountClients();assert.equal(h.container.querySelectorAll('.ux-clients-empty').length,1);assert.equal(h.control('site-client-add').disabled,false);controller.destroy();
 h.content.settings.clientLogos=Array.from({length:12},(_,index)=>({id:`client-${index}`,clientName:`Client ${index}`,image:{assetId:'logo-image',alt:'Logo',isDecorative:false},isVisible:false}));controller=h.mountClients();assert.equal(h.control('site-client-add').disabled,true);assert.equal(h.container.querySelectorAll('.ux-logo-card').length,12);controller.destroy();
});


test('visual focal control clamps pointer coordinates, supports keyboard steps and honors disabled state without changing media identity',async()=>{
 const h=await harness(),c=h.mountSettings(),surface=h.container.querySelectorAll('.ux-focal-surface')[1],before=structuredClone(h.content.hero.image);surface.getBoundingClientRect=()=>({left:20,top:10,width:200,height:100});
 const click=Object.assign(new Event('click'),{detail:1,clientX:420,clientY:-10});surface.dispatchEvent(click);assert.deepEqual(h.content.hero.image.focalPoint,{x:1,y:0});assert.equal(h.control('site-hero-image-focal-x').value,'1');
 surface.dispatchEvent(Object.assign(new Event('keydown',{cancelable:true}),{key:'ArrowLeft',shiftKey:true}));assert.deepEqual(h.content.hero.image.focalPoint,{x:.9,y:0});assert.equal(h.content.hero.image.assetId,before.assetId);assert.equal(h.content.hero.image.alt,before.alt);surface.disabled=true;surface.dispatchEvent(click);assert.equal(h.content.hero.image.focalPoint.x,.9);c.destroy();
});
