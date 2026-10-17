import {siteNode,siteButton} from './site-fields.mjs';
import {createSortableList} from './site-collection-ui.mjs';

/** Panels keep the actual typed controls mounted. Switching tabs never changes data. */
export function createFormTabs(container,{label,tabs,selected,onSelect=()=>{},beforeSelect}){
 const bar=siteNode('div',undefined,{class:'ux-form-tabs',role:'tablist','aria-label':label});
 const panels=[];let active=selected??tabs[0]?.id,initialized=false,pending=false;
 function commit(id,{focus=false}={}){active=id;
  for(const entry of panels){const chosen=entry.id===id;entry.panel.hidden=!chosen;entry.button.setAttribute('aria-selected',String(chosen));entry.button.tabIndex=chosen?0:-1;if(chosen&&focus)entry.button.focus();}onSelect(id);return true;
 }
 function select(id,options={}){
  if(!panels.some(entry=>entry.id===id)||pending)return false;
  if(initialized&&id===active)return true;
  if(!initialized||!beforeSelect)return commit(id,options);
  const allowed=beforeSelect(id,active);
  if(allowed?.then){pending=true;return Promise.resolve(allowed).then(ok=>ok===true&&commit(id,options)).finally(()=>{pending=false;});}
  return allowed===true&&commit(id,options);
 }
 for(const tab of tabs){
  const panel=siteNode('section',undefined,{id:tab.id,class:'ux-form-panel',role:'tabpanel','aria-labelledby':`${tab.id}-tab`});
  const button=siteButton(tab.label,`${tab.id}-tab`,()=>select(tab.id));button.setAttribute('role','tab');button.setAttribute('aria-controls',tab.id);
  button.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const index=panels.findIndex(entry=>entry.id===active),target=event.key==='Home'?0:event.key==='End'?panels.length-1:(index+(event.key==='ArrowRight'?1:-1)+panels.length)%panels.length;select(panels[target].id,{focus:true});});
  bar.append(button);panels.push({...tab,panel,button});
 }
 container.prepend(bar);for(const entry of panels)container.append(entry.panel);select(active);initialized=true;
 return {panel:id=>panels.find(entry=>entry.id===id)?.panel,select,reveal(target){const entry=panels.find(item=>item.panel.contains(target));if(!entry)return false;const finish=ok=>{if(!ok)return false;for(let parent=target?.parentElement;parent&&parent!==container;parent=parent.parentElement)if(parent.tagName?.toUpperCase()==='DETAILS')parent.open=true;return true;};const allowed=select(entry.id);return allowed?.then?allowed.then(finish):finish(allowed);}};
}

export function moveFields(panel,root,ids){
 for(const id of ids){const element=root.querySelector(`#${id}`);if(!element)continue;const field=element.closest('.ux-media-field')??element.closest('.editor-field,.editor-check')??element;panel.append(field);}
}

/** UI-only tokens preserve duplicate text rows without introducing persisted IDs. */
export function createListTokens(){
 let serial=0;const entries=new WeakMap();
 function state(values){let item=entries.get(values);if(!item){item={ids:values.map(()=>`row-${++serial}`),values:[...values]};entries.set(values,item);}else if(item.ids.length!==values.length){const used=new Set();item.ids=values.map(value=>{const index=item.values.findIndex((old,i)=>!used.has(i)&&old===value);if(index<0)return `row-${++serial}`;used.add(index);return item.ids[index];});}item.values=[...values];return item;}
 return {ids:values=>[...state(values).ids],remove(values,index){const item=state(values);if(index<0||index>=values.length)return false;values.splice(index,1);item.ids.splice(index,1);item.values=[...values];return true;},move(values,index,offset){const ids=this.ids(values),target=index+offset;if(index<0||index>=ids.length||target<0||target>=ids.length)return null;const before=[...ids];[ids[index],ids[target]]=[ids[target],ids[index]];this.reorder(values,ids);return before;},reorder(values,ids){const item=state(values);if(ids.length!==values.length||new Set(ids).size!==ids.length||ids.some(id=>!item.ids.includes(id)))return false;const current=new Map(item.ids.map((id,index)=>[id,values[index]]));values.splice(0,values.length,...ids.map(id=>current.get(id)));item.ids=[...ids];item.values=[...values];return true;}};
}

export function createFormSorts({onChange,redraw}){
 const tokens=createListTokens(),mounted=new Map();let disabled=false;
 function mount(parent,values,path,label,getLabel=value=>typeof value==='string'?value:JSON.stringify(value)){
  let record=mounted.get(values);
  if(!record){const host=siteNode('div',undefined,{class:'ux-form-sort'});const getRows=()=>{const ids=tokens.ids(values);return [...(record?.parent??parent).children].filter(node=>node!==host&&((node.dataset.validationPath??node.dataset.siteScopePath??node.dataset.siteRunPath??'').startsWith(`${record?.path??path}.`))).map((row,index)=>{row.dataset.sortId=ids[index];return row;}).filter(row=>row.dataset.sortId);};const controller=createSortableList({container:host,getIds:()=>tokens.ids(values),getRows,getLabel:id=>{const index=tokens.ids(values).indexOf(id);return getLabel(values[index],index);},label,disabled,onReorder:ids=>{if(tokens.reorder(values,ids)){onChange();redraw();}}});record={host,controller,values,parent,path};mounted.set(values,record);}

  // Outer reorders retain this array but change its indexed validation path.
  record.parent=parent;record.path=path;parent.append(record.host);queueMicrotask(()=>record.controller.refresh());return record.controller;
 }
 return {mount,remove(values,index){return tokens.remove(values,index);},move(values,index,offset){const before=tokens.move(values,index,offset);if(before)mounted.get(values)?.controller.rememberOrder(before);return Boolean(before);},sync(){for(const record of mounted.values())tokens.ids(record.values);},setDisabled(value){disabled=value;for(const record of mounted.values())record.controller.setDisabled(value);},destroy(){for(const record of mounted.values())record.controller.destroy();mounted.clear();}};
}
