import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm';

// Form wiring test only. No SDK, API, browser, credentials or retained content.
async function editorHarness(content,context){
 const fields=new Map(),actions=new Map(),sorts=[],bindings=[];let removes=0;
 function node(tag,_text,attrs={}){return {tagName:tag.toUpperCase(),children:[],dataset:{},id:attrs.id,classList:{add(){}},append(...children){this.children.push(...children);},replaceChildren(){this.children=[];},get firstElementChild(){return this.children[0];}};}
 const tools={group(parent,label,id,path){const el=node('section',label,{id});el.dataset.validationPath=path;parent.append(el);return el;},input(parent,id,label,value,set,options){fields.set(id,{parent,label,value,set,options});},checkbox(parent,id,label,value,set,options){fields.set(id,{parent,label,value,set,options});},structural(_parent,_label,id,action){actions.set(id,action);},sortList(_parent,values,path){sorts.push({values,path});},remove(values,index){removes++;values.splice(index,1);},heading(_parent,value,path){fields.set('heading',{value,path});},action(_parent,value,path,_prefix,_label,set){fields.set('action',{value,path,set});},change(){},disposeControls(){},dispose(){},refreshReferences(){}};
 const runtime=createContext({document:{activeElement:null,getElementById(){return null;}}}),module=new SourceTextModule(readFileSync(new URL('../admin/site-services-editor.mjs',import.meta.url),'utf8'),{context:runtime});
 const synthetic=exports=>new SyntheticModule(Object.keys(exports),function(){for(const [key,value]of Object.entries(exports))this.setExport(key,value);},{context:runtime});
 await module.link(specifier=>{
  if(specifier.includes('site-collection-ui'))return synthetic({mountRecordCollection(){throw Error('unexpected collection');},configureRecordTabs(){}});
  if(specifier.includes('site-settings-editor'))return synthetic({createSiteFieldTools(){return tools;}});
  if(specifier.includes('site-source-bindings'))return synthetic({renderSiteSourceBindings(_tools,_card,_content,_context,path){bindings.push(path);}});
  if(specifier.includes('site-records'))return synthetic({createSiteRecordSchemas(){throw Error('schema not used by existing form');}});
  return synthetic({siteNode:node,siteButton:(text,id,handler)=>{const button=node('button',text,{id});button.click=handler;return button;}});
 });await module.evaluate();const host=node('div');const controller=module.namespace.mountSiteServices(host,{content,context,onChange(){}});return {fields,actions,sorts,bindings,controller,removes:()=>removes};
}
function fixture(){return {services:[{id:'events',title:'EVENTS',titleVi:'Sự kiện',summary:'Mô tả',scope:['Trùng','Trùng','Khác'],isVisible:false}],projects:[{id:'p',serviceIds:['events','hidden']}],sections:[{sectionId:'services',isVisible:true,serviceOrder:['events'],heading:{lines:[[{text:'Dịch vụ',emphasis:false}]]},intro:'Giới thiệu',action:{kind:'SECTION',sectionId:'contact',label:'Liên hệ'}}],claimSources:[]};}

test('service form groups names, preserves existing readonly ID and real fact binding',async()=>{
 const content=fixture(),h=await editorHarness(content,{siteUx:true,formSorts:true,collectionRecordId:'events'}),title=h.fields.get('site-service-events-title'),vi=h.fields.get('site-service-events-titleVi');
 assert.equal(title.parent,vi.parent);assert.equal(h.fields.get('site-service-events-id').options.readonly,true);assert.equal(h.fields.get('site-service-events-id').options.path,'services.0.id');assert.deepEqual(h.bindings,['services/events/facts']);title.set('EDITED');assert.equal(content.services[0].title,'EDITED');assert.deepEqual(content.projects[0].serviceIds,['events','hidden']);h.controller.destroy();
});
test('service scope removes exact duplicate index through identity-aware helper',async()=>{
 const content=fixture(),h=await editorHarness(content,{siteUx:true,formSorts:true,collectionRecordId:'events'});assert.equal(h.sorts[0].values,content.services[0].scope);assert.equal(h.sorts[0].path,'services.0.scope');h.actions.get('site-service-events-scope-1-remove')();assert.equal(h.removes(),1);assert.deepEqual(content.services[0].scope,['Trùng','Khác']);h.controller.destroy();
});
test('service content keeps full typed heading, visibility and every action union variant',async()=>{
 const content=fixture(),h=await editorHarness(content,{collectionSettings:true,formSorts:true});assert.equal(h.fields.get('heading').value,content.sections[0].heading);assert.equal(h.fields.get('heading').path,'sections.0.heading');assert.equal(h.fields.get('site-services-visible').options.path,'sections.0.isVisible');
 for(const value of [{kind:'SECTION',sectionId:'about',label:'Đến mục'},{kind:'SHOWREEL',label:'Xem video'},{kind:'CREDENTIAL',assetId:'credential',label:'Hồ sơ'}]){h.fields.get('action').set(value);assert.equal(content.sections[0].action,value);}h.controller.destroy();
});


test('new service exposes visibility and source scope while keeping the record staged until Apply',async()=>{
 const content=fixture(),before=structuredClone(content);let validated;const context={siteUx:true,formSorts:true,collectionAdd:true,validateServiceAddition(_content,record,{claimSources}){validated={record:structuredClone(record),claimSources};return {success:true,data:structuredClone(record)};}};const h=await editorHarness(content,context);
 assert.ok(h.fields.has('site-service-add-visible'));assert.equal(typeof h.bindings[0],'function');assert.equal(h.bindings[0](),'services/new/facts');h.fields.get('site-service-add-id').set('new-service');h.fields.get('site-service-add-title').set('New');h.fields.get('site-service-add-titleVi').set('Mới');h.fields.get('site-service-add-visible').set(false);assert.deepEqual(content,before);assert.equal(h.controller.hasPendingInput(),true);assert.equal(h.controller.applyPending(),true);assert.equal(validated.record.isVisible,false);assert.equal(content.services.at(-1).id,'new-service');assert.equal(content.services.at(-1).isVisible,false);assert.equal(content.sections[0].serviceOrder.at(-1),'new-service');assert.deepEqual(content.projects,before.projects);h.controller.destroy();
});
