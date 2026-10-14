import {siteNode,siteButton} from './site-fields.mjs';
import {createSiteFieldTools} from './site-settings-editor.mjs';
import {createSiteRecordSchemas} from '../contracts/site-records.mjs';

export function renderSiteScope(tools,parent,values,path,prefix){
 const group=tools.group(parent,'Phạm vi công việc',`${prefix}-scope`,path);
 values.forEach((value,index)=>{
  const row=siteNode('div',undefined,{class:'run-row','data-site-scope-path':`${path}.${index}`});group.append(row);
  tools.input(row,`${prefix}-scope-${index}`,'Hạng mục '+(index+1),value,text=>{values[index]=text;},{max:160,path:`${path}.${index}`});
  tools.structural(row,'Bỏ hạng mục',`${prefix}-scope-${index}-remove`,()=>values.splice(index,1),{focusId:`${prefix}-scope-add`});
 });
 tools.structural(group,'Thêm hạng mục',`${prefix}-scope-add`,()=>values.push(''),{disabled:values.length>=12,focusId:`${prefix}-scope-${values.length}`});
}
/** A binding selects candidate evidence only. It does not verify any claim. */
export function renderSiteSourceBindings(tools,parent,content,context,claimPath,prefix){
 const group=tools.group(parent,'Nguồn cho dữ kiện',`${prefix}-sources`,'claimSources');
 const supported=source=>source.supportedClaimPaths.includes(claimPath) || ['projects','services','clientLogos'].some(family=>claimPath.startsWith(family+'/') && source.supportedClaimPaths.includes(`${family}/*/facts`));
 function refresh(){
  const focusId=document.activeElement?.id;group.replaceChildren();
  const binding=content.claimSources.find(value=>value.claimPath===claimPath),selected=binding?.sourceIds??[];
  for(const source of context.sourceCatalog.filter(value=>context.sourceIds.includes(value.id))){
   const eligible=supported(source),checked=selected.includes(source.id);
   if(!eligible && !checked)continue;
   const control=tools.checkbox(group,`${prefix}-source-${source.id}`,`${source.title}${eligible?'':' — không hỗ trợ nhóm này; bỏ lựa chọn'}`,checked,value=>{
    let current=content.claimSources.find(entry=>entry.claimPath===claimPath);
    if(value){if(!eligible || (current?.sourceIds.length??0)>=8)return;if(!current){current={claimPath,sourceIds:[]};content.claimSources.push(current);}if(!current.sourceIds.includes(source.id))current.sourceIds.push(source.id);}
    else if(current){current.sourceIds=current.sourceIds.filter(id=>id!==source.id);if(!current.sourceIds.length)content.claimSources.splice(content.claimSources.indexOf(current),1);}
    refresh();
   });control.dataset.siteSourceId=source.id;control.disabled=!checked && selected.length>=8;
  }
  group.append(siteNode('p','Chỉ chọn nguồn đang được cấp. Lựa chọn này chưa phải xác minh dữ kiện hay quyền sử dụng.'));
  if(focusId)document.getElementById(focusId)?.focus();
 }
 refresh();
}
function emptyService(){return {id:'',title:'',titleVi:'',summary:'',scope:[],isVisible:true};}
export function mountSiteServices(container,{content,context,onChange}){
 let disposed=false,staged=emptyService(),recordNav=null;
 const tools=createSiteFieldTools({content,context,onChange,redraw});
 const section=content.sections.find(value=>value.sectionId==='services');
 const sectionPath=`sections.${content.sections.indexOf(section)}`;
 function recordFields(parent,record,path,prefix,{existing=false}={}){
  tools.input(parent,`${prefix}-id`,'Mã dịch vụ',record.id,value=>{record.id=value;},{max:100,readonly:existing,path:`${path}.id`,hint:'Mã duy nhất, chữ thường, số và dấu gạch ngang. Mã đã thêm được giữ nguyên.'});
  for(const [key,label] of [['title','Tên dịch vụ'],['titleVi','Tên dịch vụ tiếng Việt']])tools.input(parent,`${prefix}-${key}`,label,record[key],value=>{record[key]=value;},{max:120,path:`${path}.${key}`});
  tools.input(parent,`${prefix}-summary`,'Mô tả dịch vụ',record.summary,value=>{record.summary=value;},{max:1000,multiline:true,path:`${path}.summary`});
  renderSiteScope(tools,parent,record.scope,`${path}.scope`,prefix);
  if(existing)tools.checkbox(parent,`${prefix}-visible`,'Hiện dịch vụ',record.isVisible,value=>{record.isVisible=value;},{path:`${path}.isVisible`});
 }
 function refreshRecordNavigation(){
  if(!recordNav)return;
  for(const link of recordNav.querySelectorAll('[data-site-record-link]')){
   const record=content.services.find(value=>value.id===link.dataset.siteRecordLink);
   if(record)link.textContent=record.titleVi+(record.isVisible?'':' — đang ẩn');
  }
 }
 function redraw(focusId=document.activeElement?.id){
  if(disposed)return;container.replaceChildren();
  const sectionFields=tools.group(container,'Mục Dịch vụ','site-services-fields',sectionPath);
  tools.checkbox(sectionFields,'site-services-visible','Hiện mục Dịch vụ',section.isVisible,value=>{section.isVisible=value;},{path:`${sectionPath}.isVisible`});
  tools.heading(sectionFields,section.heading,`${sectionPath}.heading`,'site-services-heading','Tiêu đề Dịch vụ');
  tools.input(sectionFields,'site-services-intro','Giới thiệu Dịch vụ',section.intro,value=>{section.intro=value;},{max:4000,multiline:true,path:`${sectionPath}.intro`});
  tools.action(sectionFields,section.action,`${sectionPath}.action`,'site-services-action','Nút Dịch vụ',value=>{section.action=value;});
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
  const add=tools.group(container,'Thêm dịch vụ','site-service-add-fields');
  recordFields(add,staged,'services.new','site-service-add');
  const error=siteNode('p','',{id:'site-service-add-error',role:'alert'});add.append(error);
  const button=siteButton('Thêm dịch vụ','site-service-add',()=>{
   const result=createSiteRecordSchemas(context).serviceSchema.safeParse(staged);
   if(!result.success || content.services.some(record=>record.id===staged.id)){error.textContent='Hãy nhập mã duy nhất, tên, mô tả và phạm vi hợp lệ.';document.getElementById('site-service-add-id')?.focus();return;}
   if(content.services.length>=12)return;
   const record=result.data;content.services.push(record);section.serviceOrder.push(record.id);staged=emptyService();tools.change({refresh:true,focusId:`site-service-${record.id}-title`});
  });button.disabled=content.services.length>=12;add.append(button);
  add.append(siteButton('Bỏ dịch vụ chưa thêm','site-service-add-cancel',()=>{staged=emptyService();tools.change({refresh:true,focusId:'site-service-add-id'});}),siteNode('p',`${content.services.length}/12 dịch vụ, gồm cả dịch vụ đang ẩn.`));
  if(focusId)document.getElementById(focusId)?.focus();
 }
 redraw();return {hasPendingInput(){return Boolean(staged.id || staged.title || staged.titleVi || staged.summary || staged.scope.length);},refreshReferences(){tools.refreshReferences();refreshRecordNavigation();},setDisabled(){},destroy(){disposed=true;tools.dispose();container.replaceChildren();}};
}
