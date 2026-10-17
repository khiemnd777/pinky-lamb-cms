import test from 'node:test';
import assert from 'node:assert/strict';
import {createListTokens,createFormTabs,createFormSorts} from '../admin/site-form-ui.mjs';
import {createCmsIcon} from '../admin/cms-icons.mjs';
import {renderSiteScope} from '../admin/site-services-editor.mjs';
import {restoreOrder} from '../admin/site-collection-ui.mjs';

test('text row identities distinguish duplicate values and are not persisted',()=>{
 const values=['Same','Same','Other'],tokens=createListTokens(),ids=tokens.ids(values);
 assert.equal(new Set(ids).size,3);assert.deepEqual(values,['Same','Same','Other']);
 tokens.reorder(values,[ids[1],ids[2],ids[0]]);
 assert.deepEqual(tokens.ids(values),[ids[1],ids[2],ids[0]]);assert.deepEqual(values,['Same','Other','Same']);
});
test('order undo retains edited object fields and newly added objects',()=>{
 const values=[{id:'a',label:'A'},{id:'b',label:'B'}],tokens=createListTokens(),before=tokens.ids(values);
 tokens.reorder(values,[before[1],before[0]]);values[0].label='Edited';tokens.ids(values);values.push({id:'c',label:'New'});
 const current=tokens.ids(values);tokens.reorder(values,restoreOrder(before,current));
 assert.deepEqual(values,[{id:'a',label:'A'},{id:'b',label:'Edited'},{id:'c',label:'New'}]);assert.deepEqual(Object.keys(values[0]),['id','label']);
});
test('text edits are retained through reorder undo and structural addition',()=>{
 const values=['A','B'],tokens=createListTokens(),before=tokens.ids(values);tokens.reorder(values,[before[1],before[0]]);
 values[0]='Changed';tokens.ids(values);values.push('New');const current=tokens.ids(values);
 tokens.reorder(values,restoreOrder(before,current));assert.deepEqual(values,['A','Changed','New']);
});
test('invalid UI reorder cannot omit or duplicate persisted records',()=>{
 const values=[{id:'a'},{id:'b'}],tokens=createListTokens(),ids=tokens.ids(values),before=structuredClone(values);
 for(const invalid of [[ids[0]],[ids[0],ids[0]],['unknown',ids[1]]]){assert.equal(tokens.reorder(values,invalid),false);assert.deepEqual(values,before);}
});
class Node{
 constructor(tag){this.tagName=tag;this.children=[];this.attributes={};this.listeners={};this.hidden=false;this.style={};this.dataset={};this.classList={add(){},remove(){},toggle(){}};}
 setAttribute(name,value){this.attributes[name]=String(value);if(name==='id')this.id=value;if(name.startsWith('data-'))this.dataset[name.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(value);}
 getAttribute(name){return this.attributes[name]??null;}
 removeAttribute(name){delete this.attributes[name];}
 matches(selector){if(selector===':disabled')return Boolean(this.disabled);if(selector.startsWith('.'))return (this.className??this.attributes.class??'').split(' ').includes(selector.slice(1));return selector===this.tagName;}
 closest(){return null;}
 replaceChildren(...nodes){this.children=[];this.append(...nodes);}
 remove(){if(this.parentElement)this.parentElement.children.splice(this.parentElement.children.indexOf(this),1);this.parentElement=null;}
 appendChild(node){this.append(node);return node;}
 append(...nodes){for(const node of nodes){node.parentElement?.children.splice(node.parentElement.children.indexOf(node),1);node.parentElement=this;this.children.push(node);}}
 prepend(node){this.append(node);this.children.unshift(this.children.pop());}
 addEventListener(type,callback){this.listeners[type]=callback;}
 contains(node){return node===this||this.children.some(child=>child.contains(node));}
 querySelectorAll(selector){if(selector.startsWith(':scope > '))return this.children.filter(child=>child.matches(selector.slice(9)));const attribute=selector.startsWith('[')?selector.slice(1,-1):null;return this.children.flatMap(child=>[...(attribute?child.attributes[attribute]!==undefined?[child]:[]:child.matches(selector)?[child]:[]),...child.querySelectorAll(selector)]);}
 querySelector(selector){return this.querySelectorAll(selector)[0]??null;}
 focus(){this.focused=true;}
}
test('form tabs preserve mounted controls, reveal validation and use arrow keyboard navigation',()=>{
 const previous=globalThis.document;globalThis.document={createElement:tag=>new Node(tag)};
 try{
  const container=new Node('div'),selections=[],tabs=createFormTabs(container,{label:'Synthetic tabs',tabs:[{id:'a',label:'A'},{id:'b',label:'B'}],onSelect:id=>selections.push(id)});
  const control=new Node('input');control.value='Unchanged';tabs.panel('b').append(control);assert.equal(tabs.panel('b').hidden,true);
  tabs.reveal(control);assert.equal(tabs.panel('b').hidden,false);assert.equal(tabs.panel('a').hidden,true);assert.equal(control.value,'Unchanged');assert.equal(tabs.panel('b').children[0],control);
  const tab=container.children[0].children[1];let prevented=false;tab.listeners.keydown({key:'ArrowRight',preventDefault(){prevented=true;}});
  assert.equal(prevented,true);assert.equal(tabs.panel('a').hidden,false);assert.deepEqual(selections,['a','b','a']);
 }finally{globalThis.document=previous;}
});

test('all form and preview icons resolve through actual Lucide geometry',()=>{
 const previous=globalThis.document;globalThis.document={createElementNS:(_namespace,tag)=>new Node(tag)};
 try{for(const name of ['PanelsTopLeft','Building2','BriefcaseBusiness','Layers','Users','Sparkles','Mail','PanelBottom','FileText','Image','Clapperboard','Plus','Pencil','X','RefreshCw','Maximize2']){const icon=createCmsIcon(name);assert.equal(icon.tagName,'svg');assert.equal(icon.attributes['data-lucide'],name);assert.equal(icon.attributes['aria-hidden'],'true');assert.ok(icon.children.length>0);}}finally{globalThis.document=previous;}
});

test('drag then native move shares identities and undo restores immediately previous order',()=>{
 for(const original of [[{id:'a'},{id:'b'},{id:'c'}],['A','B','C'],['A','A','B']]){
  const values=structuredClone(original),tokens=createListTokens(),initial=tokens.ids(values);
  tokens.reorder(values,[initial[2],initial[0],initial[1]]);const afterDrag=structuredClone(values);
  const undoNative=tokens.move(values,1,-1);assert.deepEqual(tokens.ids(values),[initial[0],initial[2],initial[1]]);
  tokens.reorder(values,restoreOrder(undoNative,tokens.ids(values)));assert.deepEqual(values,afterDrag);
 }
});

test('form sort bridge shares direct-row PinkySelect movement with real sortable undo history',async()=>{
 const previous=globalThis.document;globalThis.document={createElement:tag=>new Node(tag),createElementNS:(_namespace,tag)=>new Node(tag),removeEventListener(){},defaultView:{AbortController,MutationObserver:class{observe(){}disconnect(){}},queueMicrotask(){}}};
 try{
  const parent=new Node('div'),values=[{id:'a'},{id:'b'},{id:'c'}];let sorts;
  const draw=()=>{parent.replaceChildren(...values.map((value,index)=>{const row=new Node('div');row.setAttribute('data-validation-path',`synthetic.${index}`);row.textContent=value.id;return row;}));const controller=sorts.mount(parent,values,'synthetic','Order',value=>value.id);controller.refresh();};
  sorts=createFormSorts({onChange(){},redraw:draw});draw();
  const position=parent.children[2].children[0].children[3];assert.equal(position.getAttribute('role'),'combobox');position.value='0';position.listeners.change();assert.deepEqual(values.map(item=>item.id),['c','a','b']);
  sorts.move(values,1,-1);draw();assert.deepEqual(values.map(item=>item.id),['a','c','b']);
  const undo=parent.children.at(-1).children[0].children.at(-1);undo.listeners.click();assert.deepEqual(values.map(item=>item.id),['c','a','b']);await Promise.resolve();sorts.destroy();
 }finally{globalThis.document=previous;}
});

test('actual scope renderer removes the selected duplicate identity and Undo preserves surviving row',async()=>{
 const previous=globalThis.document;globalThis.document={createElement:tag=>new Node(tag),createElementNS:(_namespace,tag)=>new Node(tag),removeEventListener(){},defaultView:{AbortController,MutationObserver:class{observe(){}disconnect(){}},queueMicrotask(){}}};
 try{
  const parent=new Node('div'),values=['same','other','same'];let sorts,controller;
  const tools={group(host,_label,_id,path){const node=new Node('section');node.dataset.validationPath=path;host.append(node);return node;},sortList(host,list,path,label,getLabel){controller=sorts.mount(host,list,path,label,getLabel);return controller;},input(host,_id,_label,value){const input=new Node('input');input.value=value;host.append(input);},structural(host,label,_id,action){const button=new Node('button');button.textContent=label;button.addEventListener('click',()=>{action();draw();});host.append(button);},remove:(list,index)=>sorts.remove(list,index)};
  const draw=()=>{parent.replaceChildren();renderSiteScope(tools,parent,values,'projects.0.scope','scope');controller.refresh();};
  sorts=createFormSorts({onChange(){},redraw:draw});draw();
  const group=parent.children[0],rows=()=>parent.children[0].children.filter(node=>node.dataset.siteScopePath);
  rows()[2].children[0].children[3].value='1';rows()[2].children[0].children[3].listeners.change();assert.deepEqual(values,['same','same','other']);
  rows()[0].children.at(-1).listeners.click();assert.deepEqual(values,['same','other']);
  const undo=parent.children[0].children.find(node=>node.attributes.class==='ux-form-sort').children[0].children.at(-1);undo.listeners.click();assert.deepEqual(values,['other','same']);assert.ok(group);await Promise.resolve();sorts.destroy();
 }finally{globalThis.document=previous;}
});

test('outer heading reorder remounts inner row paths and preserves keyboard, position and Undo controls',async()=>{
 const previous=globalThis.document;globalThis.document={createElement:tag=>new Node(tag),createElementNS:(_namespace,tag)=>new Node(tag),removeEventListener(){},defaultView:{AbortController,MutationObserver:class{observe(){}disconnect(){}},queueMicrotask(){}}};
 let sorts;try{
  const parent=new Node('div'),a={text:'A',emphasis:'ACCENT'},b={text:'B'},original=[a,b],other=[{text:'Other'}],lines=[original,other];let changes=0;
  const sections=()=>parent.children.filter(node=>node.dataset.validationPath),rows=section=>section.children.filter(node=>node.dataset.siteRunPath),position=row=>row.querySelector('.ux-sort-tools').children[3];
  const draw=()=>{
   for(const child of [...parent.children])child.remove();parent.replaceChildren(...lines.map((values,lineIndex)=>{const section=new Node('section');section.setAttribute('data-validation-path',`heading.lines.${lineIndex}`);for(const [runIndex,value]of values.entries()){const row=new Node('div');row.setAttribute('data-site-run-path',`heading.lines.${lineIndex}.${runIndex}`);row.textContent=value.text;section.append(row);}return section;}));
   for(const [lineIndex,values]of lines.entries())sorts.mount(sections()[lineIndex],values,`heading.lines.${lineIndex}`,'Runs',value=>value.text).refresh();
   sorts.mount(parent,lines,'heading','Lines').refresh();
  };
  sorts=createFormSorts({onChange(){changes++;},redraw:draw});draw();position(sections()[0]).value='1';position(sections()[0]).listeners.change();assert.equal(lines[1],original);assert.equal(lines[0],other);
  const inner=rows(sections()[1]);assert.equal(inner[0].dataset.siteRunPath,'heading.lines.1.0');assert.ok(inner[0].querySelector('.ux-sort-tools'),'inner controls survive the outer path change');
  inner[0].querySelector('.ux-sort-tools').children[0].listeners.keydown({altKey:true,key:'ArrowDown',preventDefault(){}});assert.deepEqual(original,[b,a]);b.text='Edited B';draw();position(rows(sections()[1])[0]).value='1';position(rows(sections()[1])[0]).listeners.change();assert.deepEqual(original,[a,b]);
  const footer=sections()[1].children.find(node=>node.attributes.class==='ux-form-sort');footer.children[0].children.at(-1).listeners.click();assert.deepEqual(original,[b,a]);assert.equal(b.text,'Edited B');assert.equal(a.emphasis,'ACCENT');assert.equal(lines[0],other);assert.deepEqual(Object.keys(a).sort(),['emphasis','text']);assert.equal(changes,4);await Promise.resolve();sorts.destroy();
 }finally{await Promise.resolve();sorts?.destroy();globalThis.document=previous;}
});

test('guarded tab change commits selection and focus only after allowed, including reveal',async()=>{
 const previous=globalThis.document;globalThis.document={createElement:tag=>new Node(tag)};
 try{const container=new Node('div');let release;const selected=[];const tabs=createFormTabs(container,{label:'Guarded',tabs:[{id:'a',label:'A'},{id:'b',label:'B'}],beforeSelect:()=>new Promise(resolve=>{release=resolve;}),onSelect:id=>selected.push(id)});const input=new Node('input');tabs.panel('b').append(input);const change=tabs.select('b',{focus:true});assert.equal(tabs.panel('b').hidden,true);release(false);assert.equal(await change,false);assert.deepEqual(selected,['a']);const reveal=tabs.reveal(input);release(true);assert.equal(await reveal,true);assert.equal(tabs.panel('b').hidden,false);assert.deepEqual(selected,['a','b']);}finally{globalThis.document=previous;}
});
