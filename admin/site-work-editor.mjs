import {mountRecordCollection,configureRecordTabs} from './site-collection-ui.mjs';
import {createCmsIcon} from './cms-icons.mjs';
import {siteNode,siteButton} from './site-fields.mjs';
import {createSiteFieldTools} from './site-settings-editor.mjs';
import {renderSiteScope,renderSiteSourceBindings} from './site-services-editor.mjs';
import {createSiteRecordSchemas,CATEGORY_IDS} from '../contracts/site-records.mjs';

const CATEGORY_LABELS={EVENTS:'Sự kiện',FILM:'Phim',COMMUNICATIONS:'Truyền thông'};
const emptyImage=()=>({assetId:'',alt:'',isDecorative:false});
const emptyProject=()=>({id:'',slug:'',title:'',client:'',year:NaN,category:'',eyebrow:'',summary:'',scope:[],cover:emptyImage(),gallery:[],serviceIds:[],isVisible:true});
/** Presentation only: reuse the authenticated image picker/thumbnail once, then
 * move its metadata controls into native, keyboard-accessible disclosure. */
export function compactProjectGalleryImage(block,{open=false,onToggle=()=>{}}={}){
 const media=block.querySelector(':scope > .ux-media-field');if(!media)return block;
 block.classList.add('ux-project-gallery-row');
 const header=siteNode('div',undefined,{class:'ux-project-gallery-header'}),heading=block.querySelector(':scope > h3'),details=siteNode('details',undefined,{class:'ux-project-gallery-metadata'}),summary=siteNode('summary','Mô tả và trọng tâm ảnh');
 summary.prepend(createCmsIcon('ChevronDown'));details.append(summary);details.open=open;
 const controls=[...block.children].filter(node=>node!==heading&&node!==media);
 if(heading)header.append(heading);header.append(media);details.append(...controls);block.append(header,details);
 details.addEventListener('toggle',()=>onToggle(details.open));
 return block;
}
export function mountSiteWork(container,{content,context,onChange}){
 if(context.siteUx&&!context.collectionRecordId&&!context.collectionAdd&&!context.collectionSettings)return mountRecordCollection(container,{content,context,onChange,kind:'projects',mountFields:mountSiteWork});
 let disposed=false,staged=emptyProject(),stagedSources=[],stagedFeatured=false,recordNav=null,additionButton=null,selectedTab=0,restoringFocusId=null;const references=[],galleryMetadataOpen=new WeakMap();
 const tools=createSiteFieldTools({content,context,onChange,redraw});
 const section=content.sections.find(value=>value.sectionId==='work'),sectionPath=`sections.${content.sections.indexOf(section)}`;
 function serviceOptions(parent,record,path,prefix){
  const group=tools.group(parent,'Dịch vụ liên quan',`${prefix}-services`,`${path}.serviceIds`);
  function refresh(){
   const focusId=document.activeElement?.id;tools.disposeControls(group);group.replaceChildren(siteNode('h3','Dịch vụ liên quan'));
   for(const service of content.services){
    const id=`${prefix}-service-${service.id}`;
    const control=tools.checkbox(group,id,`${service.titleVi}${service.isVisible?'':' — đang ẩn'}`,record.serviceIds.includes(service.id),checked=>{if(checked)record.serviceIds.push(service.id);else record.serviceIds.splice(record.serviceIds.indexOf(service.id),1);},{path:`${path}.serviceIds`});control.dataset.siteServiceId=service.id;
   }
   if(focusId && group.querySelectorAll('input').length)document.getElementById(focusId)?.focus();
  }
  refresh();references.push({group,refresh});
 }
 function recordFields(parent,record,path,prefix,{existing=false}={}){
  tools.input(parent,`${prefix}-id`,'Mã dự án',record.id,value=>{record.id=value;},{max:100,readonly:existing,path:`${path}.id`,hint:'Mã duy nhất, chữ thường, số và dấu gạch ngang. Mã đã thêm được giữ nguyên.'});
  tools.input(parent,`${prefix}-slug`,'Đường dẫn dự án',record.slug,value=>{record.slug=value;},{max:100,path:`${path}.slug`,hint:'Đường dẫn duy nhất, chữ thường, số và dấu gạch ngang.'});
  for(const [key,label] of [['title','Tên dự án'],['client','Khách hàng'],['eyebrow','Dòng giới thiệu']])tools.input(parent,`${prefix}-${key}`,label,record[key],value=>{record[key]=value;},{max:120,path:`${path}.${key}`});
  tools.input(parent,`${prefix}-year`,'Năm',Number.isFinite(record.year)?record.year:'',value=>{record.year=value;},{type:'number',min:1990,maxValue:context.currentYear+2,step:1,path:`${path}.year`});
  tools.select(parent,`${prefix}-category`,'Nhóm dự án',record.category,[...(!record.category?[['','Chọn nhóm']]:[]),...CATEGORY_IDS.map(id=>[id,CATEGORY_LABELS[id]])],value=>{record.category=value;},{path:`${path}.category`});
  tools.input(parent,`${prefix}-summary`,'Mô tả dự án',record.summary,value=>{record.summary=value;},{max:1000,multiline:true,path:`${path}.summary`});
  renderSiteScope(tools,parent,record.scope,`${path}.scope`,prefix);
  const cover=tools.group(parent,'Ảnh bìa',`${prefix}-cover-fields`,`${path}.cover`);tools.image(cover,record.cover,`${path}.cover`,`${prefix}-cover`,'ảnh bìa dự án');
  const gallery=tools.group(parent,'Thư viện ảnh',`${prefix}-gallery-fields`,`${path}.gallery`);
  tools.sortList?.(gallery,record.gallery,`${path}.gallery`,'Sắp xếp thư viện ảnh',(image,index)=>context.resolveMediaAsset?.(image.assetId)?.label??`Ảnh ${index+1}`);
  record.gallery.forEach((image,index)=>{
   const block=tools.group(gallery,`Ảnh ${index+1}`,`${prefix}-gallery-${index}-fields`,`${path}.gallery.${index}`);block.dataset.siteGalleryIndex=String(index);
   const imagePrefix=`${prefix}-gallery-${index}`;
   tools.image(block,image,`${path}.gallery.${index}`,imagePrefix,'ảnh dự án');
   if(context.siteUx)compactProjectGalleryImage(block,{open:galleryMetadataOpen.get(image)??Boolean(restoringFocusId?.startsWith(`${imagePrefix}-`)&&!restoringFocusId?.endsWith('-pick')),onToggle:open=>galleryMetadataOpen.set(image,open)});
   const remove=tools.structural(block,'Bỏ ảnh khỏi thư viện',`${imagePrefix}-remove`,()=>record.gallery.splice(index,1),{focusId:`${prefix}-gallery-add`});
   if(context.siteUx){remove.classList.add('ux-project-gallery-remove');remove.setAttribute('aria-label',`Bỏ ảnh ${index+1} khỏi thư viện`);remove.title=remove.getAttribute('aria-label');remove.replaceChildren(createCmsIcon('Trash2'));}

  });
  tools.structural(gallery,'Thêm ảnh vào thư viện',`${prefix}-gallery-add`,()=>record.gallery.push(emptyImage()),{disabled:record.gallery.length>=12,focusId:`${prefix}-gallery-${record.gallery.length}-pick`});
  serviceOptions(parent,record,path,prefix);
  tools.checkbox(parent,`${prefix}-page-enabled`,'Ghi trang trong hồ sơ năng lực',record.publicCredentialPage!==undefined,checked=>{if(checked)record.publicCredentialPage=NaN;else delete record.publicCredentialPage;},{path:`${path}.publicCredentialPage`,refresh:true});
  if(record.publicCredentialPage!==undefined)tools.input(parent,`${prefix}-page`,'Trang hồ sơ năng lực (1–48)',Number.isFinite(record.publicCredentialPage)?record.publicCredentialPage:'',value=>{record.publicCredentialPage=value;},{type:'number',min:1,maxValue:48,step:1,path:`${path}.publicCredentialPage`});
  {
   tools.checkbox(parent,`${prefix}-visible`,'Hiện dự án',record.isVisible,value=>{record.isVisible=value;},{path:`${path}.isVisible`});
   tools.checkbox(parent,`${prefix}-featured`,'Dự án nổi bật',existing?section.featuredIds.includes(record.id):stagedFeatured,checked=>{if(!existing){stagedFeatured=checked;return;}if(checked)section.featuredIds.push(record.id);else section.featuredIds.splice(section.featuredIds.indexOf(record.id),1);},{path:`${sectionPath}.featuredIds`,refresh:true});
  }
 }
 function refreshRecordNavigation(){
  if(!recordNav)return;
  for(const link of recordNav.querySelectorAll('[data-site-record-link]')){
   const record=content.projects.find(value=>value.id===link.dataset.siteRecordLink);
   if(record)link.textContent=record.title+(record.isVisible?'':' — đang ẩn');
  }
 }
 function renderAddition(){
  const add=tools.group(container,'Thêm dự án','site-project-add-fields');recordFields(add,staged,'projects.new','site-project-add');let sourcePath=`projects/${staged.id||'new'}/facts`;const sourceView=renderSiteSourceBindings(tools,add,{...content,claimSources:stagedSources},context,()=>sourcePath,'site-project-add');document.getElementById('site-project-add-id')?.addEventListener('input',()=>{sourcePath=`projects/${staged.id||'new'}/facts`;for(const binding of stagedSources)binding.claimPath=sourcePath;sourceView?.refresh();});
  const error=siteNode('p','',{id:'site-project-add-error',role:'alert'});add.append(error);
  const button=siteButton('Thêm dự án','site-project-add',()=>{
   const result=typeof context.validateProjectAddition==='function'?context.validateProjectAddition(content,staged,{claimSources:stagedSources,featured:stagedFeatured}):createSiteRecordSchemas(context).projectSchema.safeParse(staged);
   if(!result.success || content.projects.some(record=>record.id===staged.id || record.slug===staged.slug) || staged.serviceIds.some(id=>!content.services.some(service=>service.id===id))){error.textContent='Hãy nhập mã và đường dẫn duy nhất, dữ kiện, ảnh và dịch vụ hợp lệ.';document.getElementById('site-project-add-id')?.focus();return;}
   if(content.projects.length>=24)return;const record=result.data;content.projects.push(record);for(const binding of stagedSources)if(binding.sourceIds.length)content.claimSources.push({claimPath:`projects/${record.id}/facts`,sourceIds:[...binding.sourceIds]});if(stagedFeatured)section.featuredIds.push(record.id);staged=emptyProject();stagedSources=[];stagedFeatured=false;tools.change({refresh:true,focusId:`site-project-${record.id}-title`});
  });additionButton=button;if(context.collectionAdd)button.hidden=true;button.disabled=content.projects.length>=24;add.append(button,siteButton('Bỏ dự án chưa thêm','site-project-add-cancel',()=>{staged=emptyProject();stagedSources=[];stagedFeatured=false;tools.change({refresh:true,focusId:'site-project-add-id'});}),siteNode('p',`${content.projects.length}/24 dự án, gồm cả dự án đang ẩn.`));
 }
 function redraw(focusId=document.activeElement?.id){
  if(disposed)return;restoringFocusId=focusId;tools.disposeControls(container);container.replaceChildren();references.length=0;
  if(context.collectionAdd){renderAddition();configureRecordTabs(container.firstElementChild,{projects:true,initialIndex:selectedTab,onSelect:index=>{selectedTab=index;}});if(focusId)document.getElementById(focusId)?.focus();return;}
  if(context.collectionRecordId){const record=content.projects.find(value=>value.id===context.collectionRecordId);if(record){const prefix=`site-project-${record.id}`,path=`projects.${content.projects.indexOf(record)}`,card=tools.group(container,record.title,prefix,path);recordFields(card,record,path,prefix,{existing:true});renderSiteSourceBindings(tools,card,content,context,`projects/${record.id}/facts`,prefix);if(context.collectionRecordId)configureRecordTabs(card,{projects:true,initialIndex:selectedTab,onSelect:index=>{selectedTab=index;}});}if(focusId)document.getElementById(focusId)?.focus();return;}
  const fields=tools.group(container,'Mục Dự án','site-work-fields',sectionPath);
  tools.checkbox(fields,'site-work-visible','Hiện mục Dự án',section.isVisible,value=>{section.isVisible=value;},{path:`${sectionPath}.isVisible`});
  tools.heading(fields,section.heading,`${sectionPath}.heading`,'site-work-heading','Tiêu đề Dự án');
  tools.input(fields,'site-work-intro','Giới thiệu Dự án',section.intro,value=>{section.intro=value;},{max:4000,multiline:true,path:`${sectionPath}.intro`});
  tools.input(fields,'site-work-initial-count','Số dự án hiển thị ban đầu',section.initialVisibleCount,value=>{section.initialVisibleCount=value;},{type:'number',min:1,maxValue:24,step:1,path:`${sectionPath}.initialVisibleCount`});
  for(const [key,label] of [['all','Tất cả'],...CATEGORY_IDS.map(id=>[id,CATEGORY_LABELS[id]])])tools.input(fields,`site-work-filter-${key}`,`Nhãn bộ lọc ${label}`,section.filterLabels[key],value=>{section.filterLabels[key]=value;},{max:80,path:`${sectionPath}.filterLabels.${key}`});
  if(context.collectionSettings){const shared=tools.group(container,'Thông tin dùng chung và cố định','site-work-shared-context');shared.append(siteNode('p',`Nút hồ sơ năng lực: ${content.settings?.credential?.label??'Xem hồ sơ năng lực'} — chỉnh ở Giới thiệu → Hồ sơ năng lực.`),siteNode('a','Chỉnh hồ sơ năng lực tại Giới thiệu',{href:'#site-credential-pick'}),siteNode('p','Dòng kết thúc: Những ý tưởng khác nhau. Cùng một tinh thần Pinky. — nội dung cố định của website.'));if(focusId)document.getElementById(focusId)?.focus();return;}
  recordNav=siteNode('nav',undefined,{'aria-label':'Danh sách dự án trong bản nháp',class:'site-section-navigation',id:'site-work-record-nav'});container.append(recordNav);
  for(const record of content.projects){
   const link=siteNode('a',record.title+(record.isVisible?'':' — đang ẩn'),{href:`#site-project-${record.id}`,'data-site-record-link':record.id});
   link.addEventListener('click',event=>{event.preventDefault();const target=document.getElementById(`site-project-${record.id}`);target?.scrollIntoView({block:'start'});target?.focus();});recordNav.append(link);
  }
  content.projects.forEach((record,index)=>{
   const prefix=`site-project-${record.id}`,path=`projects.${index}`,card=tools.group(container,`Dự án ${index+1}`,prefix,path);card.dataset.siteProjectId=record.id;card.tabIndex=-1;
   recordFields(card,record,path,prefix,{existing:true});
   renderSiteSourceBindings(tools,card,content,context,`projects/${record.id}/facts`,prefix);if(context.collectionRecordId)configureRecordTabs(card,{projects:true,initialIndex:selectedTab,onSelect:index=>{selectedTab=index;}});
   tools.structural(card,'Đưa dự án lên',`${prefix}-up`,()=>tools.move(content.projects,index,-1),{disabled:index===0,focusId:`${prefix}-title`});
   tools.structural(card,'Đưa dự án xuống',`${prefix}-down`,()=>tools.move(content.projects,index,1),{disabled:index===content.projects.length-1,focusId:`${prefix}-title`});
  });
  const featured=tools.group(container,'Thứ tự dự án nổi bật','site-work-featured',`${sectionPath}.featuredIds`);
  section.featuredIds.forEach((id,index)=>{
   const record=content.projects.find(project=>project.id===id);if(!record)return;
   const row=siteNode('div',undefined,{class:'run-row','data-site-featured-id':id,id:`site-work-featured-${id}`,tabindex:'-1','aria-label':record.title});row.append(siteNode('p',record.title));featured.append(row);
   tools.structural(row,'Đưa dự án nổi bật lên',`site-work-featured-${id}-up`,()=>tools.move(section.featuredIds,index,-1),{disabled:index===0,focusId:`site-work-featured-${id}`});
   tools.structural(row,'Đưa dự án nổi bật xuống',`site-work-featured-${id}-down`,()=>tools.move(section.featuredIds,index,1),{disabled:index===section.featuredIds.length-1,focusId:`site-work-featured-${id}`});
  });
  renderAddition();
  if(focusId)document.getElementById(focusId)?.focus();
 }
 redraw();return {revealValidationPath(path){const target=[...container.querySelectorAll('[data-validation-path]')].find(node=>node.dataset.validationPath===path);if(!target)return false;for(let parent=target.parentElement;parent&&parent!==container;parent=parent.parentElement){if(parent.tagName==='DETAILS')parent.open=true;parent.siteRevealTarget?.(target);}if(!target.matches('input,textarea,button,select'))target.tabIndex=-1;target.setAttribute('aria-invalid','true');target.scrollIntoView({block:'center'});target.focus();return true;},applyPending(){const count=content.projects.length;additionButton?.click();return content.projects.length>count;},hasPendingInput(){return Boolean(stagedSources.length||stagedFeatured||staged.isVisible===false||staged.id || staged.slug || staged.title || staged.client || Number.isFinite(staged.year) || staged.category || staged.eyebrow || staged.summary || staged.scope.length || staged.cover.assetId || staged.cover.alt || staged.cover.isDecorative || staged.cover.focalPoint || staged.gallery.length || staged.serviceIds.length || staged.publicCredentialPage!==undefined);},refreshReferences(){tools.refreshReferences();refreshRecordNavigation();for(const reference of references)if(reference.group.isConnected)reference.refresh();},setDisabled(value){tools.setDisabled?.(value);},destroy(){disposed=true;tools.dispose();container.replaceChildren();}};
}
