import {createFormTabs,moveFields} from './site-form-ui.mjs';
import {siteNode,siteHeadingNode} from './site-fields.mjs';
import {createCmsIcon} from './cms-icons.mjs';
import {createSiteFieldTools} from './site-settings-editor.mjs';
import {renderSiteSourceBindings} from './site-source-bindings.mjs';

export function mountSiteContactFooter(container,{content,context,onChange,mode='ALL'}){
 let disposed=false,serviceChoices=null,selectedTab;let tabs;let thumbnail=null;let updateContext=()=>{};const tools=createSiteFieldTools({content,context,onChange,redraw});
 function clearThumbnail(){thumbnail?.cleanup?.();thumbnail=null;}
 function contextThumbnail(parent,assetId,options){const key=JSON.stringify([assetId,options.slot??'IMAGE']);if(thumbnail?.key!==key){clearThumbnail();const host=siteNode('div',undefined,{class:'ux-media-thumb'});parent.append(host);thumbnail={key,host,cleanup:context.mountMediaThumbnail?.(host,assetId,options)};}parent.append(thumbnail.host);return thumbnail.host;}
 const contact=content.sections.find(section=>section.sectionId==='contact'),footer=content.sections.find(section=>section.sectionId==='footer');
 const contactPath=`sections.${content.sections.indexOf(contact)}`,footerPath=`sections.${content.sections.indexOf(footer)}`;
 function refreshServices(){
  if(!serviceChoices)return;const focusId=document.activeElement?.id;tools.disposeControls(serviceChoices);serviceChoices.replaceChildren();
  const visible=content.sections.find(section=>section.sectionId==='services').isVisible;
  for(const service of content.services){
   const control=tools.checkbox(serviceChoices,`site-contact-service-${service.id}`,`${service.titleVi}${visible && service.isVisible?'':' — đang ẩn trên website'}`,contact.serviceOptionIds.includes(service.id),checked=>{if(checked)contact.serviceOptionIds.push(service.id);else contact.serviceOptionIds.splice(contact.serviceOptionIds.indexOf(service.id),1);},{path:`${contactPath}.serviceOptionIds`});control.dataset.siteServiceId=service.id;
  }
  serviceChoices.append(siteNode('p','Lựa chọn lưu có thể giữ dịch vụ đang ẩn. Website chỉ hiện dịch vụ và mục Dịch vụ đang bật.'));
  if(focusId)document.getElementById(focusId)?.focus();
 }
 function redraw(focusId=document.activeElement?.id){
  if(disposed)return;clearThumbnail();tools.disposeControls(container);container.replaceChildren();tabs=undefined;container.classList.toggle('ux-content-editor',Boolean(context.siteUx));
  if(mode!=='FOOTER'){
  const contactFields=tools.group(container,'Liên hệ','site-contact-fields',contactPath);contactFields.tabIndex=-1;
  contactFields.append(siteNode('p','Mục Liên hệ luôn hiển thị. Form chỉ mở email hoặc sao chép brief (MAILTO_COPY); không gửi lead đến máy chủ.'));
  tools.heading(contactFields,contact.heading,`${contactPath}.heading`,'site-contact-heading','Tiêu đề Liên hệ');
  tools.input(contactFields,'site-contact-intro','Giới thiệu Liên hệ',contact.intro,value=>{contact.intro=value;},{max:4000,multiline:true,path:`${contactPath}.intro`});
  serviceChoices=tools.group(contactFields,'Dịch vụ trong form brief','site-contact-services',`${contactPath}.serviceOptionIds`);refreshServices();
  for(const [key,label,max] of [['email','Email nhận brief',254],['personName','Người liên hệ',120],['personPhoneE164','Số điện thoại liên hệ (+84…)',16],['personPhoneLabel','Nhãn điện thoại liên hệ',80],['officePhoneE164','Số điện thoại văn phòng (+84…)',16],['officePhoneLabel','Nhãn điện thoại văn phòng',80],['facebookUrl','Địa chỉ Facebook',2048]])tools.input(contactFields,`site-contact-${key}`,label,content.settings.contact[key],value=>{content.settings.contact[key]=value;},{max,type:key==='email'?'email':key.endsWith('E164')?'tel':key==='facebookUrl'?'url':'text',path:`settings.contact.${key}`,hint:key==='facebookUrl'?'Địa chỉ https://www.facebook.com/ cố định theo dữ liệu; không query hoặc fragment.':key.endsWith('E164')?'Dùng dấu + và mã quốc gia; nhãn hiển thị nhập ở trường riêng.':undefined});
  const addresses=tools.group(contactFields,'Địa chỉ','site-contact-address-fields','settings.contact.addressLines');
  tools.sortList(addresses,content.settings.contact.addressLines,'settings.contact.addressLines','Sắp xếp dòng địa chỉ',(_,index)=>`Dòng địa chỉ ${index+1}`);
  content.settings.contact.addressLines.forEach((text,index)=>{
   const row=siteNode('div',undefined,{class:'run-row ux-content-list-row','data-validation-path':`settings.contact.addressLines.${index}`});addresses.append(row);
   tools.input(row,`site-contact-address-${index}`,`Dòng địa chỉ ${index+1}`,text,value=>{content.settings.contact.addressLines[index]=value;},{max:160,path:`settings.contact.addressLines.${index}`});
   tools.structural(row,'Bỏ dòng địa chỉ',`site-contact-address-${index}-remove`,()=>tools.remove(content.settings.contact.addressLines,index),{disabled:content.settings.contact.addressLines.length<=1,focusId:'site-contact-address-add'});
  });
  tools.structural(addresses,'Thêm dòng địa chỉ','site-contact-address-add',()=>content.settings.contact.addressLines.push(''),{disabled:content.settings.contact.addressLines.length>=4,focusId:`site-contact-address-${content.settings.contact.addressLines.length}`});
  tools.image(contactFields,content.settings.contact.illustration,'settings.contact.illustration','site-contact-illustration','hình liên hệ');
  renderSiteSourceBindings(tools,contactFields,content,context,'settings/contact/facts','site-contact');
  }
  if(mode!=='CONTACT'){
  const footerFields=tools.group(container,'Chân trang','site-footer-fields',footerPath);footerFields.tabIndex=-1;
  tools.heading(footerFields,footer.heading,`${footerPath}.heading`,'site-footer-heading','Tiêu đề Chân trang');
  tools.input(footerFields,'site-footer-descriptor','Mô tả chân trang',footer.descriptor,value=>{footer.descriptor=value;},{max:4000,multiline:true,path:`${footerPath}.descriptor`});
  tools.input(footerFields,'site-footer-backtotop','Nhãn về đầu trang',footer.backToTopLabel,value=>{footer.backToTopLabel=value;},{max:80,path:`${footerPath}.backToTopLabel`});
  tools.checkbox(footerFields,'site-footer-copyright-enabled','Ghi năm bắt đầu bản quyền',content.settings.copyright.startYear!==undefined,checked=>{if(checked)content.settings.copyright.startYear=NaN;else delete content.settings.copyright.startYear;},{path:'settings.copyright.startYear',refresh:true});
  if(content.settings.copyright.startYear!==undefined)tools.input(footerFields,'site-footer-copyright-year','Năm bắt đầu bản quyền',Number.isFinite(content.settings.copyright.startYear)?content.settings.copyright.startYear:'',value=>{content.settings.copyright.startYear=value;},{type:'number',min:1990,maxValue:context.currentYear+2,step:1,path:'settings.copyright.startYear'});
  tools.input(footerFields,'site-footer-copyright-label','Nội dung bản quyền',content.settings.copyright.label,value=>{content.settings.copyright.label=value;},{max:240,path:'settings.copyright.label'});
  renderSiteSourceBindings(tools,footerFields,content,context,'sections/footer/facts','site-footer','Nguồn dữ kiện Chân trang');
  renderSiteSourceBindings(tools,footerFields,content,context,'creative-copy','site-creative','Nguồn nội dung sáng tạo');
  }
  if(context.siteUx){
   if(mode==='CONTACT'){
    const fields=container.querySelector('#site-contact-fields');tabs=createFormTabs(container,{label:'Liên hệ',selected:selectedTab,onSelect:id=>{selectedTab=id;},tabs:[{id:'site-contact-content-panel',label:'Nội dung hiển thị'},{id:'site-contact-details-panel',label:'Thông tin liên hệ'},{id:'site-contact-brief-panel',label:'Form brief'}]});tabs.panel('site-contact-content-panel').append(fields);
    for(const key of ['email','personName','personPhoneE164','personPhoneLabel','officePhoneE164','officePhoneLabel','facebookUrl'])moveFields(tabs.panel('site-contact-details-panel'),fields,[`site-contact-${key}`]);
    for(const keys of [['email','personName'],['personPhoneE164','personPhoneLabel'],['officePhoneE164','officePhoneLabel']]){const pair=siteNode('div',undefined,{class:'ux-content-pair'}),details=tabs.panel('site-contact-details-panel');details.append(pair);moveFields(pair,details,keys.map(key=>`site-contact-${key}`));}
    const addresses=fields.querySelector('#site-contact-address-fields');if(addresses)tabs.panel('site-contact-details-panel').append(addresses);
    moveFields(tabs.panel('site-contact-details-panel'),tabs.panel('site-contact-details-panel'),['site-contact-facebookUrl']);
    const sources=fields.querySelector('#site-contact-sources');if(sources)tabs.panel('site-contact-details-panel').append(sources.closest('details')??sources);
    const services=fields.querySelector('#site-contact-services');if(services)tabs.panel('site-contact-brief-panel').append(services);
    for(const id of ['site-contact-content-panel','site-contact-details-panel','site-contact-brief-panel'])tabs.panel(id).classList.add('ux-content-surface');
    const aside=siteNode('aside',undefined,{class:'ux-content-context','aria-label':'Minh họa Liên hệ'});container.append(aside);
    updateContext=()=>{aside.replaceChildren(siteNode('p','LIÊN HỆ · XEM NHANH',{class:'ux-content-eyebrow'}),siteHeadingNode(contact.heading),siteNode('p',contact.intro),siteNode('strong',content.settings.contact.email),siteNode('p',content.settings.contact.personName),siteNode('p',content.settings.contact.personPhoneLabel),siteNode('p',content.settings.contact.addressLines.join(' · ')));contextThumbnail(aside,content.settings.contact.illustration.assetId,{label:'Hình liên hệ'});};
    tabs.panel('site-contact-brief-panel').prepend(siteNode('p','Form mở ứng dụng email hoặc sao chép brief. Thông tin chỉ gửi khi khách bấm gửi trong ứng dụng email.',{class:'ux-mini-preview'}));
   }else if(mode==='FOOTER'){
    const fields=container.querySelector('#site-footer-fields');fields.classList.add('ux-content-surface');
    const sharedFacebook=siteNode('p',`Facebook dùng chung: ${content.settings.contact.facebookUrl}`),references=siteNode('div',undefined,{class:'ux-content-reference'});references.append(siteNode('p','Logo và thương hiệu dùng chung với Đầu trang.'),siteNode('a','Chỉnh logo và thương hiệu',{href:'#site-brand-logo-pick'}),sharedFacebook,siteNode('a','Chỉnh Facebook tại Liên hệ',{href:'#site-contact-facebookUrl'}));fields.append(references);
    const preview=siteNode('aside',undefined,{class:'ux-content-context ux-content-context--footer','aria-label':'Minh họa chân trang'});container.append(preview);
    updateContext=()=>{sharedFacebook.textContent=`Facebook dùng chung: ${content.settings.contact.facebookUrl}`;const back=siteNode('p',footer.backToTopLabel,{class:'ux-context-backtotop'});back.append(createCmsIcon('ArrowUp'));preview.replaceChildren(siteNode('p','CHÂN TRANG · XEM NHANH',{class:'ux-content-eyebrow'}),siteHeadingNode(footer.heading),back,siteNode('p',content.settings.brand.name,{class:'ux-context-wordmark'}),siteNode('p',`© ${[content.settings.copyright.startYear,content.settings.copyright.label].filter(value=>value!==undefined).join(' ')}`,{class:'ux-context-copyright'}),siteNode('p',footer.descriptor,{class:'ux-context-descriptor'}));};
   }
  }
  updateContext();
  if(focusId){const target=document.getElementById(focusId);if(target){tabs?.reveal(target);target.focus();}}
 }
 const onInput=()=>updateContext();container.addEventListener('input',onInput);
 redraw();return {revealValidationPath(path){const target=[...container.querySelectorAll('[data-validation-path]')].find(node=>node.dataset.validationPath===path||node.dataset.validationPath.startsWith(path+'.'));if(target){tabs?.reveal(target);for(let parent=target.parentElement;parent&&parent!==container;parent=parent.parentElement)if(parent.tagName?.toUpperCase()==='DETAILS')parent.open=true;return target;}return false;},refreshReferences(){tools.refreshReferences();refreshServices();updateContext();},setDisabled(value){tools.setDisabled(value);},destroy(){disposed=true;container.removeEventListener('input',onInput);clearThumbnail();tools.dispose();container.replaceChildren();}};
}

export const mountSiteContact=(container,options)=>mountSiteContactFooter(container,{...options,mode:'CONTACT'});
export const mountSiteFooter=(container,options)=>mountSiteContactFooter(container,{...options,mode:'FOOTER'});
