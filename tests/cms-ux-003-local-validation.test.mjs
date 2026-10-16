import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm';
import {webcrypto} from 'node:crypto';
import {siteDirtyGroups} from '../admin/site-group-dirty.mjs';
import {z} from 'zod';
import {createMediaV3ContentSchemas,parseMediaV3Content} from '../contracts/media-v3-content.mjs';
const {loadBaselineInputs,mapBaselineSite}=await import(pathToFileURL(path.join(process.cwd(),'scripts/map-baseline-site.mjs')).href);
const source=readFileSync(new URL('../admin/site-media-editor.mjs',import.meta.url),'utf8'),drain=async()=>{for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve));};

// Real editor orchestration and unchanged content schema; field-controller/DOM and transport are
// synthetic boundaries. Actual modal tab/disclosure geometry still requires the browser fixture.
async function harness({unknownFirstWrite=false}={}){
 const baseline=mapBaselineSite(loadBaselineInputs()),content={...structuredClone(baseline.content),schemaVersion:3},contentContext=Object.fromEntries(['sourceCatalog','currentYear','allowedShowreelSourceUrl'].map(key=>[key,baseline.context[key]]));
 const nodes=new Map(),events=new EventTarget(),document={getElementById:id=>nodes.get(id),addEventListener:(...args)=>events.addEventListener(...args),removeEventListener:(...args)=>events.removeEventListener(...args)};
 class Element{
  constructor(tag,text,attrs={}){this.tag=tag;this.textContent=text??'';this.children=[];this.dataset={};this.attributes={};this.ownerDocument=document;this.hidden=false;this.disabled=false;for(const [key,value]of Object.entries(attrs))this.setAttribute(key,value);}
  append(...items){this.children.push(...items);}
  replaceChildren(...items){this.children=items;}
  querySelectorAll(selector){return this.children.filter(Boolean).flatMap(child=>[...((selector==='[data-validation-path]'&&child.dataset.validationPath||selector==='[aria-invalid]'&&child.attributes['aria-invalid'])?[child]:[]),...child.querySelectorAll(selector)]);}
  setAttribute(key,value){this.attributes[key]=String(value);if(key==='id'){this.id=value;nodes.set(value,this);}if(key==='data-validation-path')this.dataset.validationPath=String(value);}
  removeAttribute(key){delete this.attributes[key];}
  getAttribute(key){return this.attributes[key];}
  focus(){document.activeElement=this;}
  remove(){}
 }
 const dirtyEvents=[];class CustomEvent extends Event{constructor(type,options){super(type);this.detail=options.detail;}}
 const node=(tag,text,attrs)=>new Element(tag,text,attrs),siteButton=(label,id,handler)=>{const result=node('button',label,{id});result.click=()=>{if(!result.disabled)handler();};return result;};
 const noop=()=>{},session={uid:'synthetic-editor',role:'EDITOR',authzVersion:1},calls=[],revealed=[],targets=new Map();let fields,state={content:structuredClone(content),revision:0,catalog:[],importLineage:{importId:'synthetic-import'}};
 const context=createContext({document,Element,window:{confirm:()=>true,addEventListener(){},removeEventListener(){},dispatchEvent(event){dirtyEvents.push(event.detail.groups);}},CustomEvent,structuredClone,AbortController,DOMException,crypto:webcrypto,TextEncoder,URL,Blob,console});
 const bindings={siteDirtyGroups,z,createMediaV3ContentSchemas,parseMediaV3Content:(value,contentContext)=>parseMediaV3Content(structuredClone(value),contentContext),canonicalMediaV2Json:JSON.stringify,revisionSchema:z.number().int().nonnegative(),resourceIdSchema:z.string(),hashSchema:z.string(),siteNode:node,siteButton,createCmsIcon:()=>node('svg'),
  mountSiteFields(body,options){fields=options;return {destroy:noop,setDisabled:noop,getSelectedGroup:()=>undefined,revealValidationPath(value){revealed.push(value);if(!targets.has(value)){const target=node('input','',{'data-validation-path':value});targets.set(value,target);body.append(target);}return targets.get(value);},revealTarget(target){target.focus();}};},
  createSiteMediaPreview:()=>({clear:noop,destroy:noop}),createSavedSiteManifestResolver:()=>({clear:noop,destroy:noop}),parseSiteMediaDraft:value=>value,closePinkySelects:noop,disposePinkySelects:noop};
 const module=new SourceTextModule(source,{context});
 await module.link(specifier=>{const statements=[...source.matchAll(new RegExp('import \\{([^}]+)\\} from [\'\"]'+specifier.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'[\'\"]','g'))],names=[...new Set(statements.flatMap(statement=>statement[1].split(',').map(name=>name.trim())))];return new SyntheticModule(names,function(){for(const name of names)this.setExport(name,bindings[name]??noop);},{context});});await module.evaluate();
 const instance=module.namespace.mountSiteMediaEditor(node('root'),{session,getSession:()=>session,async apiFetch(url,options={}){
  calls.push({url,method:options.method??'GET',body:options.body,key:options.headers?.['Idempotency-Key']});
  if(!options.method)return {draft:structuredClone(state),context:contentContext};
  assert.equal(url,'/api/cms/drafts/home-v3');assert.equal(options.method,'PATCH');if(unknownFirstWrite){unknownFirstWrite=false;throw Error('Synthetic unknown result');}
  const request=JSON.parse(options.body);assert.equal(request.expectedRevision,state.revision);for(const change of request.patch.projectChanges??[]){const index=state.content.projects.findIndex(project=>project.id===change.id);assert.equal(change.op,'REPLACE');state.content.projects[index]=structuredClone(change.value);}state.revision++;state.lastEventId='synthetic-event-'+state.revision;
  return {draftId:'home-v3',contractRevision:2,revision:state.revision,updatedAt:'2026-10-15T00:00:00.000Z',lastEventId:state.lastEventId};
 }});await drain();return {nodes,instance,calls,revealed,targets,document,dirtyEvents,validateAddition(project,options){return fields.context.validateProjectAddition(fields.content,project,options);},loseSession(){session.authzVersion++;events.dispatchEvent(new Event('cms:session'));},get state(){return state;},edit(change){change(fields.content);fields.onChange();},async click(id){nodes.get(id).click();await drain();}};
}

test('blank project title is rejected locally without PATCH and reaches the existing field reveal/focus controller',async()=>{
 const h=await harness(),before=structuredClone(h.state.content);h.edit(content=>{content.projects[0].title='';});await h.click('v3-save');assert.equal(h.calls.filter(call=>call.method==='PATCH').length,0);assert.ok(h.revealed.includes('projects.0.title'),h.nodes.get('v3-status').textContent);const target=h.targets.get('projects.0.title');assert.equal(target.getAttribute('aria-invalid'),'true');assert.equal(h.document.activeElement,target);assert.deepEqual(h.state.content,before);h.instance.destroy();
});

test('second gallery alt retains local indexed path for the image-tab disclosure controller without PATCH',async()=>{
 const h=await harness();assert.ok(h.state.content.projects[0].gallery.length>=2);h.edit(content=>{content.projects[0].gallery[1].alt='';});await h.click('v3-save');assert.equal(h.calls.filter(call=>call.method==='PATCH').length,0);assert.ok(h.revealed.includes('projects.0.gallery.1.alt'),h.nodes.get('v3-status').textContent);const target=h.targets.get('projects.0.gallery.1.alt');assert.equal(target.getAttribute('aria-invalid'),'true');assert.equal(h.document.activeElement,target);h.instance.destroy();
});

test('unchanged target stays unsaved and valid edit keeps actual save plan and unknown-intent retry identity',async()=>{
 const h=await harness({unknownFirstWrite:true});assert.equal(h.nodes.get('v3-save').disabled,true);await h.click('v3-save');assert.equal(h.calls.filter(call=>call.method==='PATCH').length,0);h.edit(content=>{content.projects[0].title='Valid changed title';});await h.click('v3-save');assert.equal(h.nodes.get('v3-retry').disabled,false,h.nodes.get('v3-status').textContent);assert.equal(h.nodes.get('v3-save').disabled,true);await h.click('v3-retry');const writes=h.calls.filter(call=>call.method==='PATCH');assert.equal(writes.length,2);assert.equal(writes[0].body,writes[1].body);assert.equal(writes[0].key,writes[1].key);assert.equal(h.state.revision,1);assert.equal(h.state.content.projects[0].title,'Valid changed title');assert.equal(h.revealed.length,0);h.instance.destroy();
});


test('dirty group event producer follows actual values, saved content, session loss and destroy',async()=>{
 const h=await harness(),original=h.state.content.projects[0].title;
 assert.deepEqual(Array.from(h.dirtyEvents.at(-1)),[]);
 h.edit(content=>{content.projects[0].title='Changed for dirty marker';});assert.deepEqual(Array.from(h.dirtyEvents.at(-1)),['work']);
 h.edit(content=>{content.projects[0].title=original;});assert.deepEqual(Array.from(h.dirtyEvents.at(-1)),[]);
 h.edit(content=>{content.projects[0].title='Saved dirty marker';});await h.click('v3-save');assert.deepEqual(Array.from(h.dirtyEvents.at(-1)),[]);
 h.edit(content=>{content.projects[0].title='Unsaved before session loss';});h.loseSession();assert.deepEqual(Array.from(h.dirtyEvents.at(-1)),[]);h.instance.destroy();assert.deepEqual(Array.from(h.dirtyEvents.at(-1)),[]);
 const second=await harness();second.edit(content=>{content.projects[0].title='Unsaved before destroy';});second.instance.destroy();assert.deepEqual(Array.from(second.dirtyEvents.at(-1)),[]);
});


test('project addition validates final source and featured combination before scratch mutation',async()=>{
 const h=await harness(),before=structuredClone(h.state.content),project={...structuredClone(before.projects[0]),id:'final-project',slug:'final-project'},sourceId=before.claimSources.flatMap(binding=>binding.sourceIds)[0];assert.ok(sourceId);
 assert.equal(h.validateAddition(project,{claimSources:[{sourceIds:[sourceId]}],featured:true}).success,true);
 assert.equal(h.validateAddition(project,{claimSources:[{sourceIds:[sourceId,sourceId]}],featured:true}).success,false);
 assert.equal(h.validateAddition(project,{claimSources:Array.from({length:62},()=>({sourceIds:[sourceId]})),featured:true}).success,false);
 assert.deepEqual(h.state.content,before);assert.equal(h.calls.filter(call=>call.method==='PATCH').length,0);h.instance.destroy();
});
