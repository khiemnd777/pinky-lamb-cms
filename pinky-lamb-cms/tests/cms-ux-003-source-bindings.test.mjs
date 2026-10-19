import test from 'node:test';
import assert from 'node:assert/strict';
import {renderSiteSourceBindings} from '../admin/site-source-bindings.mjs';
import {renderSiteSourceBindings as compatibleExport} from '../admin/site-services-editor.mjs';

// Synthetic DOM and working/scratch objects only; no API, credentials or emulator access.
function fixture(content,context,path,label){
 const previous=globalThis.document;const controls=[];let cleaned=0;
 const node=(tag,text='')=>({tag,text,children:[],attributes:{},setAttribute(k,v){this.attributes[k]=v;},querySelector(){return null;},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=[...items];}});
 globalThis.document={activeElement:null,createElement:tag=>node(tag),getElementById:()=>null};
 const parent=node('section');
 const tools={group(host){const group=node('section');host.append(group);return group;},disposeControls(){controls.length=0;cleaned++;},checkbox(_host,id,label,checked,onChange){const control={id,label,checked,onChange,dataset:{},disabled:false};controls.push(control);return control;}};
 renderSiteSourceBindings(tools,parent,content,context,path,'binding',label);
 return {parent,controls,cleaned:()=>cleaned,restore(){globalThis.document=previous;}};
}
const source=(id,paths)=>({id,title:id,supportedClaimPaths:paths});

test('extracted helper keeps the existing public service export and binds only eligible assigned sources',()=>{
 assert.equal(renderSiteSourceBindings,compatibleExport);
 const content={claimSources:[]},context={sourceCatalog:[source('exact',['projects/a/facts']),source('wildcard',['projects/*/facts']),source('other',['settings/contact/facts']),source('unassigned',['projects/*/facts'])],sourceIds:['exact','wildcard','other']},f=fixture(content,context,'projects/a/facts');
 try{assert.deepEqual(f.controls.map(control=>control.dataset.siteSourceId),['exact','wildcard']);f.controls[0].onChange(true);assert.deepEqual(content.claimSources,[{claimPath:'projects/a/facts',sourceIds:['exact']}]);assert.ok(f.cleaned()>1);f.controls.find(control=>control.dataset.siteSourceId==='wildcard').onChange(true);assert.deepEqual(content.claimSources[0].sourceIds,['exact','wildcard']);f.controls.find(control=>control.dataset.siteSourceId==='exact').onChange(false);assert.deepEqual(content.claimSources[0].sourceIds,['wildcard']);f.controls.find(control=>control.dataset.siteSourceId==='wildcard').onChange(false);assert.deepEqual(content.claimSources,[]);}finally{f.restore();}
});

test('selected unsupported source stays removable; unrelated and unassigned bindings are preserved',()=>{
 const content={claimSources:[{claimPath:'projects/a/facts',sourceIds:['unsupported','unassigned']},{claimPath:'services/s/facts',sourceIds:['keep']}]},context={sourceCatalog:[source('unsupported',['settings/contact/facts']),source('unassigned',['projects/*/facts'])],sourceIds:['unsupported']},f=fixture(content,context,'projects/a/facts');
 try{assert.equal(f.controls.length,1);assert.match(f.controls[0].label,/không hỗ trợ/);assert.equal(f.controls[0].checked,true);f.controls[0].onChange(false);assert.deepEqual(content.claimSources,[{claimPath:'projects/a/facts',sourceIds:['unassigned']},{claimPath:'services/s/facts',sourceIds:['keep']}]);}finally{f.restore();}
});

test('source limit stays eight and editing an explicitly cloned scratch does not mutate working copy',()=>{
 const working={claimSources:[{claimPath:'projects/a/facts',sourceIds:Array.from({length:8},(_,index)=>'s'+index)}]},scratch=structuredClone(working),context={sourceCatalog:Array.from({length:9},(_,index)=>source('s'+index,['projects/*/facts'])),sourceIds:Array.from({length:9},(_,index)=>'s'+index)},f=fixture(scratch,context,'projects/a/facts');
 try{const extra=f.controls.find(control=>control.dataset.siteSourceId==='s8');assert.equal(extra.disabled,true);extra.onChange(true);assert.equal(scratch.claimSources[0].sourceIds.length,8);f.controls[0].onChange(false);assert.equal(scratch.claimSources[0].sourceIds.length,7);assert.equal(working.claimSources[0].sourceIds.length,8);assert.notDeepEqual(scratch,working);}finally{f.restore();}
});

test('compact source disclosure preserves selected bindings and candidate authorization',()=>{
 const content={claimSources:[]},context={siteUx:true,sourceCatalog:[source('allowed',['projects/*/facts']),source('other',['projects/*/facts'])],sourceIds:['allowed']},f=fixture(content,context,'projects/a/facts');
 try{const disclosure=f.parent.children[0];assert.equal(disclosure.tag,'details');assert.equal(disclosure.children[0].textContent,'Nguồn cho dữ kiện · 0 nguồn đã chọn');assert.deepEqual(f.controls.map(c=>c.dataset.siteSourceId),['allowed']);f.controls[0].onChange(true);assert.equal(disclosure.children[0].textContent,'Nguồn cho dữ kiện · 1 nguồn đã chọn');assert.deepEqual(content.claimSources,[{claimPath:'projects/a/facts',sourceIds:['allowed']}]);}finally{f.restore();}
});

test('context label remains visible in collapsed source disclosure after changes',()=>{const content={claimSources:[]},context={siteUx:true,sourceCatalog:[source('allowed',['creative-copy'])],sourceIds:['allowed']},f=fixture(content,context,'creative-copy','Nguồn nội dung sáng tạo');try{const summary=f.parent.children[0].children[0];assert.equal(summary.textContent,'Nguồn nội dung sáng tạo · 0 nguồn đã chọn');f.controls[0].onChange(true);assert.equal(summary.textContent,'Nguồn nội dung sáng tạo · 1 nguồn đã chọn');}finally{f.restore();}});
