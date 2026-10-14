import {siteNode} from './site-fields.mjs';
import {createSiteFieldTools} from './site-settings-editor.mjs';
import {renderSiteSourceBindings} from './site-services-editor.mjs';

export function mountSiteContactFooter(container,{content,context,onChange,mode='ALL'}){
 let disposed=false,serviceChoices=null;const tools=createSiteFieldTools({content,context,onChange,redraw});
 const contact=content.sections.find(section=>section.sectionId==='contact'),footer=content.sections.find(section=>section.sectionId==='footer');
 const contactPath=`sections.${content.sections.indexOf(contact)}`,footerPath=`sections.${content.sections.indexOf(footer)}`;
 function refreshServices(){
  if(!serviceChoices)return;const focusId=document.activeElement?.id;serviceChoices.replaceChildren();
  const visible=content.sections.find(section=>section.sectionId==='services').isVisible;
  for(const service of content.services){
   const control=tools.checkbox(serviceChoices,`site-contact-service-${service.id}`,`${service.titleVi}${visible && service.isVisible?'':' — đang ẩn trên website'}`,contact.serviceOptionIds.includes(service.id),checked=>{if(checked)contact.serviceOptionIds.push(service.id);else contact.serviceOptionIds.splice(contact.serviceOptionIds.indexOf(service.id),1);},{path:`${contactPath}.serviceOptionIds`});control.dataset.siteServiceId=service.id;
  }
  serviceChoices.append(siteNode('p','Lựa chọn lưu có thể giữ dịch vụ đang ẩn. Website chỉ hiện dịch vụ và mục Dịch vụ đang bật.'));
  if(focusId)document.getElementById(focusId)?.focus();
 }
 function redraw(focusId=document.activeElement?.id){
  if(disposed)return;container.replaceChildren();
  if(mode!=='FOOTER'){
  const contactFields=tools.group(container,'Liên hệ','site-contact-fields',contactPath);contactFields.tabIndex=-1;
  contactFields.append(siteNode('p','Mục Liên hệ luôn hiển thị. Form chỉ mở email hoặc sao chép brief (MAILTO_COPY); không gửi lead đến máy chủ.'));
  tools.heading(contactFields,contact.heading,`${contactPath}.heading`,'site-contact-heading','Tiêu đề Liên hệ');
  tools.input(contactFields,'site-contact-intro','Giới thiệu Liên hệ',contact.intro,value=>{contact.intro=value;},{max:4000,multiline:true,path:`${contactPath}.intro`});
  serviceChoices=tools.group(contactFields,'Dịch vụ trong form brief','site-contact-services',`${contactPath}.serviceOptionIds`);refreshServices();
  for(const [key,label,max] of [['email','Email nhận brief',254],['personName','Người liên hệ',120],['personPhoneE164','Số điện thoại liên hệ (+84…)',16],['personPhoneLabel','Nhãn điện thoại liên hệ',80],['officePhoneE164','Số điện thoại văn phòng (+84…)',16],['officePhoneLabel','Nhãn điện thoại văn phòng',80],['facebookUrl','Địa chỉ Facebook',2048]])tools.input(contactFields,`site-contact-${key}`,label,content.settings.contact[key],value=>{content.settings.contact[key]=value;},{max,path:`settings.contact.${key}`,hint:key==='facebookUrl'?'Địa chỉ https://www.facebook.com/ cố định theo dữ liệu; không query hoặc fragment.':key.endsWith('E164')?'Dùng dấu + và mã quốc gia; nhãn hiển thị nhập ở trường riêng.':undefined});
  const addresses=tools.group(contactFields,'Địa chỉ','site-contact-address-fields','settings.contact.addressLines');
  content.settings.contact.addressLines.forEach((text,index)=>{
   const row=siteNode('div',undefined,{class:'run-row'});addresses.append(row);
   tools.input(row,`site-contact-address-${index}`,`Dòng địa chỉ ${index+1}`,text,value=>{content.settings.contact.addressLines[index]=value;},{max:160,path:`settings.contact.addressLines.${index}`});
   tools.structural(row,'Bỏ dòng địa chỉ',`site-contact-address-${index}-remove`,()=>content.settings.contact.addressLines.splice(index,1),{disabled:content.settings.contact.addressLines.length<=1,focusId:'site-contact-address-add'});
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
  renderSiteSourceBindings(tools,footerFields,content,context,'sections/footer/facts','site-footer');
  renderSiteSourceBindings(tools,footerFields,content,context,'creative-copy','site-creative');
  }
  if(focusId)document.getElementById(focusId)?.focus();
 }
 redraw();return {refreshReferences(){tools.refreshReferences();refreshServices();},setDisabled(){},destroy(){disposed=true;tools.dispose();container.replaceChildren();}};
}

export const mountSiteContact=(container,options)=>mountSiteContactFooter(container,{...options,mode:'CONTACT'});
export const mountSiteFooter=(container,options)=>mountSiteContactFooter(container,{...options,mode:'FOOTER'});
