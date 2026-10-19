import {mountRecordCollection,configureRecordTabs} from './site-collection-ui.mjs';
import {siteNode,siteButton} from './site-fields.mjs';
import {createSiteFieldTools} from './site-settings-editor.mjs';
import {createSiteRecordSchemas} from '../contracts/site-records.mjs';
import {renderSiteSourceBindings} from './site-source-bindings.mjs';
export {renderSiteSourceBindings} from './site-source-bindings.mjs';

export function renderSiteScope(tools,parent,values,path,prefix){
 const group=tools.group(parent,'Phạm vi công việc',`${prefix}-scope`,path);
 tools.sortList?.(group,values,path,'Sắp xếp phạm vi công việc',value=>value||'Hạng mục chưa có nội dung');
 values.forEach((value,index)=>{
  const row=siteNode('div',undefined,{class:'run-row','data-site-scope-path':`${path}.${index}`});group.append(row);
  tools.input(row,`${prefix}-scope-${index}`,'Hạng mục '+(index+1),value,text=>{values[index]=text;},{max:160,path:`${path}.${index}`});
  tools.structural(row,'Bỏ hạng mục',`${prefix}-scope-${index}-remove`,()=>tools.remove(values,index),{focusId:`${prefix}-scope-add`});
 });
 tools.structural(group,'Thêm hạng mục',`${prefix}-scope-add`,()=>values.push(''),{disabled:values.length>=12,focusId:`${prefix}-scope-${values.length}`});
}
function emptyService(){return {id:'',title:'',titleVi:'',summary:'',scope:[],isVisible:true};}
export function mountSiteServices(container,{content,context,onChange}){
 if(context.siteUx&&!context.collectionRecordId&&!context.collectionAdd&&!context.collectionSettings)return mountRecordCollection(container,{content,context,onChange,kind:'services',mountFields:mountSiteServices});
 let disposed=false,staged=emptyService(),stagedSources=[],recordNav=null,additionButton=null,selectedTab=0;
 const tools=createSiteFieldTools({content,context,onChange,redraw});
 const section=content.sections.find(value=>value.sectionId==='services');
 const sectionPath=`sections.${content.sections.indexOf(section)}`;
 function recordFields(parent,record,path,prefix,{existing=false}={}){
  tools.input(parent,`${prefix}-id`,'Mã dịch vụ',record.id,value=>{record.id=value;},{max:100,readonly:existing,path:`${path}.id`,hint:'Mã duy nhất, chữ thường, số và dấu gạch ngang. Mã đã thêm được giữ nguyên.'});
  const names=siteNode('div',undefined,{class:'ux-service-names'});parent.append(names);
  for(const [key,label] of [['title','Tên dịch vụ'],['titleVi','Tên dịch vụ tiếng Việt']])tools.input(names,`${prefix}-${key}`,label,record[key],value=>{record[key]=value;},{max:120,path:`${path}.${key}`});
  tools.input(parent,`${prefix}-summary`,'Mô tả dịch vụ',record.summary,value=>{record.summary=value;},{max:1000,multiline:true,path:`${path}.summary`});
  renderSiteScope(tools,parent,record.scope,`${path}.scope`,prefix);
  if(existing||context.collectionAdd)tools.checkbox(parent,`${prefix}-visible`,'Hiện dịch vụ',record.isVisible,value=>{record.isVisible=value;},{path:`${path}.isVisible`});
 }
 function refreshRecordNavigation(){
  if(!recordNav)return;
  for(const link of recordNav.querySelectorAll('[data-site-record-link]')){
   const record=content.services.find(value=>value.id===link.dataset.siteRecordLink);
   if(record)link.textContent=record.titleVi+(record.isVisible?'':' — đang ẩn');
  }
 }
 function renderAddition(){
  const add=tools.group(container,'Thêm dịch vụ','site-service-add-fields');
  add.classList.add('ux-service-record');
  recordFields(add,staged,'services.new','site-service-add');
  if(context.collectionAdd){let sourcePath=`services/${staged.id||'new'}/facts`;const sources=renderSiteSourceBindings(tools,add,{...content,claimSources:stagedSources},context,()=>sourcePath,'site-service-add');document.getElementById('site-service-add-id')?.addEventListener('input',()=>{sourcePath=`services/${staged.id||'new'}/facts`;for(const binding of stagedSources)binding.claimPath=sourcePath;sources?.refresh();});}
  const error=siteNode('p','',{id:'site-service-add-error',role:'alert'});add.append(error);
  const button=siteButton('Thêm dịch vụ','site-service-add',()=>{
   const result=typeof context.validateServiceAddition==='function'?context.validateServiceAddition(content,staged,{claimSources:stagedSources}):createSiteRecordSchemas(context).serviceSchema.safeParse(staged);
   if(!result.success || content.services.some(record=>record.id===staged.id)){error.textContent='Hãy nhập mã duy nhất, tên, mô tả và phạm vi hợp lệ.';document.getElementById('site-service-add-id')?.focus();return;}
   if(content.services.length>=12)return;
   const record=result.data;content.services.push(record);section.serviceOrder.push(record.id);for(const binding of stagedSources)if(binding.sourceIds.length)content.claimSources.push({claimPath:`services/${record.id}/facts`,sourceIds:[...binding.sourceIds]});staged=emptyService();stagedSources=[];tools.change({refresh:true,focusId:`site-service-${record.id}-title`});
  });additionButton=button;if(context.collectionAdd)button.hidden=true;button.disabled=content.services.length>=12;add.append(button);
  add.append(siteButton('Bỏ dịch vụ chưa thêm','site-service-add-cancel',()=>{staged=emptyService();stagedSources=[];tools.change({refresh:true,focusId:'site-service-add-id'});}),siteNode('p',`${content.services.length}/12 dịch vụ, gồm cả dịch vụ đang ẩn.`));
 }
 function redraw(focusId=document.activeElement?.id){
  if(disposed)return;tools.disposeControls(container);container.replaceChildren();
  if(context.collectionAdd){renderAddition();configureRecordTabs(container.firstElementChild,{projects:false,initialIndex:selectedTab,onSelect:index=>{selectedTab=index;}});if(focusId)document.getElementById(focusId)?.focus();return;}
  if(context.collectionRecordId){const record=content.services.find(value=>value.id===context.collectionRecordId);if(record){const prefix=`site-service-${record.id}`,path=`services.${content.services.indexOf(record)}`,card=tools.group(container,record.titleVi||record.title,prefix,path);card.classList.add('ux-service-record');recordFields(card,record,path,prefix,{existing:true});renderSiteSourceBindings(tools,card,content,context,`services/${record.id}/facts`,prefix);configureRecordTabs(card,{projects:false,initialIndex:selectedTab,onSelect:index=>{selectedTab=index;}});}if(focusId)document.getElementById(focusId)?.focus();return;}
  const sectionFields=tools.group(container,'Nội dung mục Dịch vụ','site-services-fields',sectionPath);
  sectionFields.classList.add('ux-service-content');
  tools.checkbox(sectionFields,'site-services-visible','Hiện mục Dịch vụ',section.isVisible,value=>{section.isVisible=value;},{path:`${sectionPath}.isVisible`});
  tools.heading(sectionFields,section.heading,`${sectionPath}.heading`,'site-services-heading','Tiêu đề Dịch vụ');
  tools.input(sectionFields,'site-services-intro','Giới thiệu Dịch vụ',section.intro,value=>{section.intro=value;},{max:4000,multiline:true,path:`${sectionPath}.intro`});
  const actionFields=tools.group(sectionFields,'Nút hành động','site-services-action-fields');
  tools.action(actionFields,section.action,`${sectionPath}.action`,'site-services-action','Nút Dịch vụ',value=>{section.action=value;});
  if(context.collectionSettings){if(focusId)document.getElementById(focusId)?.focus();return;}
  recordNav=siteNode('nav',undefined,{'aria-label':'Danh sách dịch vụ trong bản nháp',class:'site-section-navigation',id:'site-services-record-nav'});container.append(recordNav);
  for(const id of section.serviceOrder){
   const record=content.services.find(value=>value.id===id);if(!record)continue;
   const link=siteNode('a',record.titleVi+(record.isVisible?'':' — đang ẩn'),{href:`#site-service-${id}`,'data-site-record-link':id});
   link.addEventListener('click',event=>{event.preventDefault();const target=document.getElementById(`site-service-${id}`);target?.scrollIntoView({block:'start'});target?.focus();});recordNav.append(link);
  }
  section.serviceOrder.forEach((id,position)=>{
   const record=content.services.find(value=>value.id===id);if(!record)return;
   const prefix=`site-service-${id}`,path=`services.${content.services.indexOf(record)}`;
   const card=tools.group(container,`Dịch vụ ${position+1}`,prefix,path);card.dataset.siteServiceId=id;card.tabIndex=-1;
   recordFields(card,record,path,prefix,{existing:true});
   renderSiteSourceBindings(tools,card,content,context,`services/${id}/facts`,prefix);
   tools.structural(card,'Đưa dịch vụ lên',`${prefix}-up`,()=>tools.move(section.serviceOrder,position,-1),{disabled:position===0,focusId:`${prefix}-title`});
   tools.structural(card,'Đưa dịch vụ xuống',`${prefix}-down`,()=>tools.move(section.serviceOrder,position,1),{disabled:position===section.serviceOrder.length-1,focusId:`${prefix}-title`});
  });
  renderAddition();
  if(focusId)document.getElementById(focusId)?.focus();
 }
 redraw();return {revealValidationPath(path){const target=[...container.querySelectorAll('[data-validation-path]')].find(node=>node.dataset.validationPath===path);if(!target)return false;for(let parent=target.parentElement;parent&&parent!==container;parent=parent.parentElement)parent.siteRevealTarget?.(target);if(!target.matches('input,textarea,button,select'))target.tabIndex=-1;target.setAttribute('aria-invalid','true');target.scrollIntoView({block:'center'});target.focus();return true;},applyPending(){const count=content.services.length;additionButton?.click();return content.services.length>count;},hasPendingInput(){return Boolean(stagedSources.length||staged.isVisible===false||staged.id || staged.title || staged.titleVi || staged.summary || staged.scope.length);},refreshReferences(){tools.refreshReferences();refreshRecordNavigation();},setDisabled(value){tools.setDisabled?.(value);},destroy(){disposed=true;tools.dispose();container.replaceChildren();}};
}
