import test from 'node:test';
import assert from 'node:assert/strict';
import {mountSharedLocalizationWorkspace} from '../admin/shared-localization-workspace.mjs';
import {mountLocalizationReviewEditor} from '../admin/localization-review-editor.mjs';
import {createLocalizedEditorialService} from '../cms-api/localized-editorial.mjs';
import {editorialFixture} from './localized-editorial-api.test.mjs';

// In-memory DOM: exercise the real mount and event handlers, without CMS/network writes.
class Element{
 constructor(doc,tag){this.ownerDocument=doc;this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attributes={};this.handlers=new Map();this.hidden=false;this.disabled=false;this.id='';}
 append(...nodes){for(const node of nodes){node.parentNode=this;this.children.push(node);}}
 prepend(...nodes){for(const node of nodes)node.parentNode=this;this.children.unshift(...nodes);}
 replaceChildren(...nodes){if(this.contains(this.ownerDocument.activeElement))this.ownerDocument.activeElement=this.ownerDocument.body;this.children=[];this.append(...nodes);}
 setAttribute(key,value){this.attributes[key]=String(value);}
 getAttribute(key){return this.attributes[key]??null;}
 addEventListener(type,fn){const handlers=this.handlers.get(type)??[];handlers.push(fn);this.handlers.set(type,handlers);}
 removeEventListener(){}
 async fire(type){await Promise.all((this.handlers.get(type)??[]).map(fn=>fn({target:this,preventDefault(){}})));await new Promise(resolve=>setImmediate(resolve));}
 click(){return this.fire('click');}
 contains(node){return node===this||this.children.some(child=>child.contains(node));}
 focus(){this.ownerDocument.activeElement=this;}
 getClientRects(){return [];}
 remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(node=>node!==this);}
 all(){return this.children.flatMap(node=>[node,...node.all()]);}
}
function dom(){const doc={addEventListener(){},removeEventListener(){},createElement(tag){return new Element(this,tag);},getElementById(id){return this.body.all().find(node=>node.id===id)??null;}};doc.defaultView={setTimeout,clearTimeout,addEventListener(){},removeEventListener(){},dispatchEvent(){},confirm:()=>true,CustomEvent:class{constructor(type,{detail}){this.type=type;this.detail=detail;}},MutationObserver:class{observe(){}disconnect(){}}};doc.body=new Element(doc,'body');doc.activeElement=doc.body;const root=new Element(doc,'main');doc.body.append(root);return {doc,root};}
function workspace(){const {doc,root}=dom(),content={projects:[],services:[],settings:{contact:{email:'before@example.test'}}},context={siteUx:true},calls=[];let deny=false,staged=false,sharedActive=false,localizedActive=false,changed=0,destroyed=0;const target=new Element(doc,'input');
 const options={content,context,onChange:()=>changed++},editor=mountSharedLocalizationWorkspace(root,options,{key:'work',mountShared(host,received){assert.equal(received.content,content);assert.equal(received.context,context);host.append(target);return {setGroupActive:value=>sharedActive=value,setDisabled:value=>calls.push(['disable',value]),refreshReferences:()=>calls.push(['references']),hasPendingInput:()=>staged,revealValidationPath:path=>{calls.push(['reveal',path]);return target;},destroy(){destroyed++;}};},mountLocalized(_host,received){assert.equal(received.content,content);return {setGroupActive(value){localizedActive=value;received.onContext?.({active:value});},requestTransition:async target=>{calls.push(['transition',target]);return !deny;},canLeave:()=>!deny,hasPendingInput:()=>deny,destroy(){destroyed++;}};}}),host=root.children[0],tabs=host.children[0];
 return {doc,root,editor,tabs,host,content,options,calls,target,active:()=>({sharedActive,localizedActive}),deny:value=>deny=value,stage:value=>staged=value,changed:()=>changed,destroyed:()=>destroyed};
}
test('shared workspace forwards the real working model and restores shared editing without a locale write',async()=>{
 const f=workspace();f.editor.setGroupActive(true);assert.deepEqual(f.active(),{sharedActive:false,localizedActive:true});
 await f.tabs.children[1].click();assert.deepEqual(f.active(),{sharedActive:true,localizedActive:false});assert.equal(f.host.children[2].hidden,false);assert.equal(f.tabs.children[1].getAttribute('aria-selected'),'true');assert.equal(f.doc.activeElement,f.tabs.children[1]);
 f.content.settings.contact.email='after@example.test';f.options.onChange();assert.equal(f.changed(),1);f.editor.refreshReferences();f.editor.setDisabled(true);assert.ok(f.calls.some(c=>c[0]==='references'));assert.ok(f.calls.some(c=>c[0]==='disable'&&c[1]));
 f.stage(true);assert.equal(f.editor.hasPendingInput(),true);f.editor.destroy();assert.equal(f.destroyed(),2);
});
test('dirty or unresolved localized edits block switching to shared; validation can reveal shared fields',async()=>{
 const f=workspace();f.editor.setGroupActive(true);f.deny(true);await f.tabs.children[1].click();assert.equal(f.host.children[2].hidden,true);assert.deepEqual(f.active(),{sharedActive:false,localizedActive:true});assert.equal(f.editor.canLeave(),false);
 f.deny(false);assert.equal(await f.editor.revealValidationPath('projects.0.cover'),f.target);assert.deepEqual(f.active(),{sharedActive:true,localizedActive:false});assert.ok(f.calls.some(c=>c[0]==='transition'&&c[1]==='group:site-component-work'));f.editor.destroy();
});
test('shared workspace panels have linked tabs and deactivate when the group is hidden',async()=>{
 const f=workspace();for(const b of f.tabs.children){const panel=f.doc.getElementById(b.getAttribute('aria-controls'));assert.equal(panel.getAttribute('aria-labelledby'),b.id);}
 f.editor.setGroupActive(true);await f.tabs.children[1].click();f.editor.setGroupActive(false);assert.deepEqual(f.active(),{sharedActive:false,localizedActive:false});f.editor.destroy();
});
function linkedControls(root){const all=root.all(),controls=all.filter(n=>['INPUT','TEXTAREA','SELECT'].includes(n.tagName));for(const control of controls){if(control.type==='checkbox')continue;assert.ok(control.id,'named control');assert.equal(all.filter(n=>n.tagName==='LABEL'&&n.htmlFor===control.id).length,1,'exactly one linked caption');}assert.equal(new Set(controls.filter(c=>c.id).map(c=>c.id)).size,controls.filter(c=>c.id).length);return controls;}
test('P5 filter labels have unique stable associations and focus survives redraw',async()=>{
 const {doc,root}=dom(),editor=mountLocalizationReviewEditor(root,{getSession:()=>({uid:'reviewer',role:'REVIEWER',authzVersion:1}),apiFetch:async path=>path.endsWith('/groups/status')?{contractRevision:1,draftId:'home-v3',groups:['header','clients','about','ip-studio','contact','footer','seo'].map(groupId=>({groupId,sourceTitle:groupId,isVisible:true,locales:{en:null,vi:null,ja:null}}))}:path.endsWith('/projects/status')?{contractRevision:1,draftId:'home-v3',projects:[]}:path.endsWith('/services/status')?{contractRevision:1,draftId:'home-v3',services:[]}:{contractRevision:1,items:[],nextCursor:null}});
 const before=linkedControls(root).map(n=>n.id);const filter=root.all().find(n=>n.tagName==='SELECT');filter.focus();filter.value='vi';await filter.fire('change');await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(linkedControls(root).map(n=>n.id),before);assert.equal(doc.activeElement,doc.getElementById(filter.id));editor.destroy();
});
test('P5 single Admin draft detail has one Publish action and no reviewer or source-attestation form',async()=>{
 const f=editorialFixture();f.setActor('admin','OWNER');const api=await createLocalizedEditorialService({resourceContext:f.context}),r=await f.context.readResource(null,f.resource),{root}=dom();
 const editor=mountLocalizationReviewEditor(root,{getSession:()=>({uid:'admin',role:'OWNER',authzVersion:1}),getContent:()=>({projects:[],services:[{id:'brand-creative',title:'Brand & Creative'}]}),apiFetch:async(path,options)=>{
  if(path==='/api/cms/localizations/website/publish'){const body=JSON.parse(options.body);assert.deepEqual(body.resource,f.resource);assert.equal(body.expectedRevision,r.draft.revision);const receipt=await api.publishDraft({request:{},actor:f.actor(),key:options.headers['Idempotency-Key'],body});return {id:'ui-job',kind:'PUBLISH',state:'COMPLETED',selection:body,result:{...receipt,status:'PUBLISHED_ON_WEBSITE',port:4189,activation:false,releaseId:'ui-release',snapshotSetHash:'a'.repeat(64),artifact:{relativeRoot:'.local/releases/multilingual-001/ui-release/public',manifestSha256:'b'.repeat(64)}}};}
  if(path.startsWith('/api/cms/localizations/editorial/snapshots/'))return api.readSnapshot({request:{},id:path.split('/').at(-1)});
  if(path.endsWith('/services/status'))return {contractRevision:1,draftId:'home-v3',services:[{serviceId:'brand-creative',sourceTitle:'Brand & Creative',isVisible:true,locales:{en:{revision:r.draft.revision,dependencyHash:r.dependencyHash,contentHash:r.draft.contentHash,updatedAt:r.draft.updatedAt,stale:false},vi:null,ja:null}}]};
  if(path.includes('/editorial/resources/'))return api.readResource({request:{},resource:f.resource});
  if(path==='/api/cms/localizations/services/brand-creative/en')return {contractRevision:1,draftId:'home-v3',serviceId:'brand-creative',locale:'en',base:{dependencyHash:r.dependencyHash,serviceIndex:r.qa.serviceIndex,templateIdentity:r.qa.templateIdentity,service:r.qa.service},draft:r.draft};
  throw Error('Unexpected read '+path);
 }});
 let filters=root.all().filter(n=>n.tagName==='SELECT');filters[1].value='service';await filters[1].fire('change');filters=root.all().filter(n=>n.tagName==='SELECT');filters[0].value='en';await filters[0].fire('change');
 await root.all().find(n=>n.tagName==='BUTTON'&&n.textContent==='Xem bản đã lưu ↗').click();
 const controls=linkedControls(root);assert.equal(controls.filter(n=>n.tagName==='TEXTAREA').length,1);assert.equal(controls.filter(n=>n.tagName==='SELECT').length,0);assert.equal(root.all().find(n=>n.tagName==='BUTTON'&&n.textContent==='Xuất bản').disabled,false);
 assert.equal(root.all().some(n=>['Gửi bản chụp để duyệt','Duyệt bản chụp','Lưu đối chiếu nguồn'].includes(n.textContent)),false);assert.equal(root.all().some(n=>n.tagName==='BUTTON'&&n.textContent==='Xuất bản website'),false);
 await root.all().find(n=>n.tagName==='BUTTON'&&n.textContent==='Xuất bản').click();await new Promise(resolve=>setImmediate(resolve));
 assert.ok(root.all().some(n=>n.textContent==='Đã xuất bản lên website :4189. Các nội dung và ngôn ngữ khác được giữ nguyên.'));editor.destroy();
});

async function draftCatalogFixture({fail=false}={}){
 const {root}=dom(),metadata={revision:2,dependencyHash:'a'.repeat(64),contentHash:'b'.repeat(64),updatedAt:'2026-10-17T00:00:00.000Z',stale:false},calls=[];
 const editor=mountLocalizationReviewEditor(root,{getSession:()=>({uid:'owner',role:'OWNER',authzVersion:1}),getContent:()=>({projects:[],services:[]}),apiFetch:async path=>{
  calls.push(path);if(path.includes('/queue?'))return {contractRevision:1,items:[],nextCursor:null};
  assert.equal(path,'/api/cms/localizations/groups/status');if(fail)throw Error('Không tải được trạng thái bản lưu.');
  return {contractRevision:1,draftId:'home-v3',groups:['header','clients','about','ip-studio','contact','footer','seo'].map(groupId=>({groupId,sourceTitle:groupId,isVisible:true,locales:{en:groupId==='header'?metadata:null,vi:null,ja:null}}))};
 }});
 const filters=root.all().filter(n=>n.tagName==='SELECT');filters[1].value='group';await filters[1].fire('change');const next=root.all().find(n=>n.tagName==='SELECT');next.value='en';await next.fire('change');calls.length=0;await root.all().find(n=>n.tagName==='BUTTON'&&n.textContent==='Bản nháp').click();
 return {root,editor,calls,row:name=>root.all().find(n=>n.tagName==='TR'&&n.children[0]?.children[0]?.textContent===name)};
}
test('P5 catalog uses actual saved metadata and disables missing draft actions',async()=>{
 const f=await draftCatalogFixture(),saved=f.row('Đầu trang'),missing=f.row('Khách hàng');
 assert.ok(saved.all().some(n=>n.textContent==='Đã lưu'));assert.ok(saved.all().some(n=>n.textContent==='Phiên bản 2'));assert.equal(saved.all().find(n=>n.tagName==='BUTTON').disabled,false);
 assert.ok(missing.all().some(n=>n.textContent==='Chưa có bản lưu'));assert.equal(missing.all().find(n=>n.tagName==='BUTTON').disabled,true);assert.equal(missing.all().some(n=>n.textContent==='Xem bản đã lưu ↗'),false);
 assert.equal(f.calls.filter(path=>path.endsWith('/status')).length,1);f.editor.destroy();
});
test('P5 catalog keeps failed reads unknown instead of reporting missing drafts',async()=>{
 const f=await draftCatalogFixture({fail:true}),row=f.row('Đầu trang');
 assert.ok(row.all().some(n=>n.textContent==='Chưa xác định trạng thái'));assert.equal(row.all().some(n=>n.textContent==='Chưa có bản lưu'),false);assert.equal(row.all().find(n=>n.tagName==='BUTTON').disabled,true);
 assert.ok(f.root.all().some(n=>n.textContent==='Không tải được trạng thái bản lưu.'));assert.ok(f.root.all().some(n=>n.tagName==='BUTTON'&&n.textContent==='Tải lại trạng thái bản lưu'&&!n.disabled));f.editor.destroy();
});
