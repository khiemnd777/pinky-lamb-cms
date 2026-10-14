export function siteNode(tag,text,attributes={}){
 const element=document.createElement(tag);if(text!==undefined)element.textContent=text;
 for(const [name,value] of Object.entries(attributes))element.setAttribute(name,value);
 return element;
}
export function siteButton(text,id,action){const button=siteNode('button',text,{type:'button',id});button.addEventListener('click',action);return button;}
export const SITE_SECTION_LABELS=Object.freeze({clients:'Khách hàng',work:'Dự án',services:'Dịch vụ',about:'Giới thiệu','ip-studio':'IP Studio',contact:'Liên hệ',footer:'Chân trang'});

/** Task11 foundation fields. Later section components mount through the same controller. */
export function mountSiteFields(container,{content,context,onChange,components=[]}){
 const frame=siteNode('div',undefined,{class:'site-fields-layout'}),root=siteNode('fieldset',undefined,{id:'site-fields'}),navigation=siteNode('nav',undefined,{'aria-label':'Các mục website',class:'site-section-navigation'});
 frame.append(navigation,root);container.append(frame);const mounted=[];
 const settingsComponent=components.find(component=>component.key==='settings');
 function group(label,id){const section=siteNode('section',undefined,{class:'editor-group',id});section.append(siteNode('h3',label));root.append(section);return section;}
 function input(parent,id,label,value,set,{max=120,multiline=false,path=id}={}){
  const wrapper=siteNode('div',undefined,{class:'editor-field'}),control=siteNode(multiline?'textarea':'input',undefined,{id,'data-validation-path':path});
  if(!multiline)control.type='text';control.maxLength=max;control.value=value??'';
  wrapper.append(siteNode('label',label,{for:id}),control);parent.append(wrapper);
  control.addEventListener('input',()=>{set(control.value);onChange();});return control;
 }
 if(!settingsComponent){
 const general=group('Nhận diện và đầu trang','site-general');
 input(general,'site-header-descriptor','Mô tả đầu trang',content.settings.header.descriptor,value=>{content.settings.header.descriptor=value;},{path:'settings.header.descriptor'});
 input(general,'site-header-cta','Nhãn nút đầu trang',content.settings.header.ctaLabel,value=>{content.settings.header.ctaLabel=value;},{max:80,path:'settings.header.ctaLabel'});
 input(general,'site-brand-tagline','Thông điệp thương hiệu',content.settings.brand.tagline,value=>{content.settings.brand.tagline=value;},{max:300,path:'settings.brand.tagline'});
 const hero=group('Hero và SEO của website','site-hero-seo');
 input(hero,'site-hero-note','Ghi chú Hero',content.hero.note,value=>{content.hero.note=value;},{max:300,multiline:true,path:'hero.note'});
 for(const [key,label,max] of [['title','Tiêu đề SEO',80],['description','Mô tả SEO',200],['ogTitle','Tiêu đề chia sẻ',80],['ogDescription','Mô tả chia sẻ',200]])input(hero,`site-seo-${key}`,label,content.seo[key],value=>{content.seo[key]=value;},{max,multiline:key.includes('escription'),path:`seo.${key}`});
 const contact=group('Thông tin liên hệ','site-contact-settings');
 for(const [key,label,max] of [['email','Email nhận brief',254],['personName','Người liên hệ',120],['personPhoneE164','Số điện thoại liên hệ (+84…)',16],['personPhoneLabel','Nhãn điện thoại liên hệ',80],['officePhoneE164','Số điện thoại văn phòng (+84…)',16],['officePhoneLabel','Nhãn điện thoại văn phòng',80],['facebookUrl','Địa chỉ Facebook',2048]])input(contact,`site-contact-${key}`,label,content.settings.contact[key],value=>{content.settings.contact[key]=value;},{max,path:`settings.contact.${key}`});
 }
 for(const component of components){
  const host=group(component.label,`site-component-${component.key}`);host.tabIndex=-1;
  const controller=component.mount(host,{content,context,onChange});if(controller)mounted.push(controller);
 }
 for(const section of content.sections){
  const label=SITE_SECTION_LABELS[section.sectionId],id=`site-section-${section.sectionId}`;
  const component=components.find(value=>value.sectionIds?.includes(section.sectionId)),targetId=component?`site-component-${component.key}`:id;
  navigation.append(siteButton(label,`site-go-${section.sectionId}`,()=>{document.getElementById(targetId)?.scrollIntoView({block:'start'});document.getElementById(targetId)?.focus();}));
  if(component)continue;
  const summary=group(label,id);summary.tabIndex=-1;
  summary.append(siteNode('p',section.isVisible===false?'Đang ẩn trên website.':'Hiển thị trên website.'));
  if(section.heading){const lines=Array.isArray(section.heading)?[section.heading]:section.heading.lines;summary.append(siteNode('p',lines.map(line=>line.map(run=>run.text).join('')).join(' ')));}
  if(section.sectionId==='services')summary.append(siteNode('p',`${content.services.length} dịch vụ`));
  if(section.sectionId==='work')summary.append(siteNode('p',`${content.projects.length} dự án`));
 }
 return {setDisabled(value){root.disabled=value;for(const controller of mounted)controller.setDisabled?.(value);},destroy(){for(const controller of mounted)controller.destroy?.();frame.remove();}};
}
