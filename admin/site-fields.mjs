import {createSortableList} from './site-collection-ui.mjs';
import {createCmsIcon} from './cms-icons.mjs';
import {closePinkySelects} from './pinky-select.mjs';
export function siteNode(tag,text,attributes={}){
 const element=document.createElement(tag);if(text!==undefined)element.textContent=text;
 for(const [name,value] of Object.entries(attributes))element.setAttribute(name,value);
 return element;
}
export function siteButton(text,id,action){const button=siteNode('button',text,{type:'button',...(id?{id}:{})});button.addEventListener('click',action);return button;}
export function siteHeadingNode(value){
 const heading=siteNode('h3');
 for(const line of value.lines){const row=siteNode('span',undefined,{class:'ux-context-heading-line'});for(const run of line)row.append(siteNode(run.emphasis==='STRONG'?'strong':'span',run.text,run.emphasis==='ACCENT'?{class:'ux-copy-accent'}:{}));heading.append(row);}
 return heading;
}
export const SITE_SECTION_LABELS=Object.freeze({clients:'Khách hàng',work:'Dự án',services:'Dịch vụ',about:'Giới thiệu','ip-studio':'IP Studio',contact:'Liên hệ',footer:'Chân trang'});

/** Task11 foundation fields. Later section components mount through the same controller. */
export function mountSiteFields(container,{content,context,onChange,components=[],initialGroup}){
 const frame=siteNode('div',undefined,{class:'site-fields-layout cms-section-layout'}),root=siteNode('fieldset',undefined,{id:'site-fields'}),navigation=siteNode('nav',undefined,{'aria-label':'Các mục website',class:'site-section-navigation cms-section-nav'});
 frame.append(navigation,root);container.append(frame);const mounted=[];let selectedGroup=initialGroup;let bodySorter;
 if(context.siteUx){frame.classList.add('ux-site-fields');const order=siteNode('section',undefined,{id:'site-structure-content',class:'editor-group cms-field-group','data-site-group':''});order.append(siteNode('h3','Cấu trúc website'),siteNode('p','Kéo các mục nội dung chính để đổi thứ tự. Các mục có khóa giữ nguyên vị trí.'));const fixed=(labels)=>{const host=siteNode('div',undefined,{class:'ux-structure-fixed'});for(const label of labels){const row=siteNode('div',undefined,{class:'ux-structure-fixed-row'});row.append(createCmsIcon('LockKeyhole'),siteNode('strong',label),siteNode('span','Cố định'));host.append(row);}order.append(host);};fixed(['Đầu trang, Hero và SEO','Khách hàng']);root.append(order);bodySorter=createSortableList({container:order,getIds:()=>[...content.sectionOrder],getLabel:id=>SITE_SECTION_LABELS[id],label:'Thứ tự nội dung chính',onReorder:ids=>{if(ids.length===4&&new Set(ids).size===4&&ids.every(id=>['work','services','about','ip-studio'].includes(id))){content.sectionOrder.splice(0,content.sectionOrder.length,...ids);onChange();}}});fixed(['Liên hệ','Chân trang']);mounted.push({setDisabled:value=>bodySorter.setDisabled(value),destroy(){bodySorter.destroy();}});}
 function publishNavigation(){if(context.siteUx)window.dispatchEvent(new CustomEvent('cms:site-navigation',{detail:{node:navigation,groupId:selectedGroup,label:root.querySelector(`#${selectedGroup} h3`)?.textContent??''}}));}
 function receiveGroup(event){selectGroup(event.detail?.id);}
 window.addEventListener('cms:site-group',receiveGroup);
 function selectGroup(id){
  const target=document.getElementById(id);if(!target || !root.contains(target))return;selectedGroup=id;closePinkySelects();
  for(const section of root.children)section.hidden=section.id!==id;
  for(const button of navigation.querySelectorAll('[data-site-group-target]')){const active=button.dataset.siteGroupTarget===id;button.setAttribute('aria-pressed',String(active));if(active)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current');}
  publishNavigation();
 }
 function revealTarget(target,{focus=true,navigation=false}={}){
  if(!target || !root.contains(target))return false;const path=target.dataset?.validationPath;for(const controller of mounted)if(path)controller.revealValidationPath?.(path);const section=target.closest('[data-site-group]');if(section)selectGroup(section.id);
  for(let parent=target.parentElement;parent && parent!==root;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;
  document.dispatchEvent(new CustomEvent('cms:show-work',{detail:{pane:'edit'}}));
  if(focus){const focusTarget=navigation?document.getElementById('cms-resource-title')??target:target;if(!focusTarget.matches('input,textarea,button,a,[tabindex]'))focusTarget.tabIndex=-1;focusTarget.scrollIntoView({block:'start'});focusTarget.focus({preventScroll:true});}return true;
 }
 function fragment(event){const link=event.target.closest?.('a[href^="#site-"]');if(!link)return;const target=document.getElementById(link.getAttribute('href').slice(1));if(revealTarget(target)){event.preventDefault();}}
 frame.addEventListener('click',fragment);
 function addNavigation(label,id,targetId){const control=siteButton(label,id,()=>revealTarget(document.getElementById(targetId),{navigation:true}));if(context.siteUx){const names={'site-go-settings':'PanelTop','site-go-clients':'Users','site-go-work':'Clapperboard','site-go-services':'BriefcaseBusiness','site-go-about':'Info','site-go-ip-studio':'Sparkles','site-go-contact':'Mail','site-go-footer':'PanelBottom'};control.prepend(createCmsIcon(names[id]??'FileText'));}control.dataset.siteGroupTarget=targetId;control.setAttribute('aria-controls',targetId);navigation.append(control);}

 const settingsComponent=components.find(component=>component.key==='settings');
 function group(label,id){const section=siteNode('section',undefined,{class:'editor-group cms-field-group',id,'data-site-group':''});const heading=siteNode('div',undefined,{class:'cms-section-heading'});heading.append(siteNode('h3',label));section.append(heading);root.append(section);return section;}
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
  const host=group(component.label,`site-component-${component.key}`);host.tabIndex=-1;if(component.key==='settings')addNavigation(component.label,'site-go-settings',host.id);
  const controller=component.mount(host,{content,context,onChange});if(controller)mounted.push(controller);
 }
 for(const section of content.sections){
  const label=SITE_SECTION_LABELS[section.sectionId],id=`site-section-${section.sectionId}`;
  const component=components.find(value=>value.sectionIds?.includes(section.sectionId)),targetId=component?`site-component-${component.key}`:id;
  addNavigation(label,`site-go-${section.sectionId}`,targetId);
  if(component)continue;
  const summary=group(label,id);summary.tabIndex=-1;
  summary.append(siteNode('p',section.isVisible===false?'Đang ẩn trên website.':'Hiển thị trên website.'));
  if(section.heading){const lines=Array.isArray(section.heading)?[section.heading]:section.heading.lines;summary.append(siteNode('p',lines.map(line=>line.map(run=>run.text).join('')).join(' ')));}
  if(section.sectionId==='services')summary.append(siteNode('p',`${content.services.length} dịch vụ`));
  if(section.sectionId==='work')summary.append(siteNode('p',`${content.projects.length} dự án`));
 }
 if(!settingsComponent){for(const section of root.children)if(!navigation.querySelector(`[data-site-group-target="${section.id}"]`))addNavigation(section.querySelector('h3')?.textContent??section.id,`site-go-${section.id}`,section.id);}
 selectGroup(selectedGroup && document.getElementById(selectedGroup)?selectedGroup:(context.siteUx?'site-component-settings':root.firstElementChild?.id));
 return {getSelectedGroup:()=>selectedGroup,revealTarget,revealValidationPath(path){const sectionId=path.startsWith('sections.')?content.sections[Number(path.split('.')[1])]?.sectionId:null;const key=sectionId==='ip-studio'?'ip':sectionId??(path.startsWith('projects.')?'work':path.startsWith('services.')?'services':path.startsWith('settings.clientLogos')?'clients':/^settings\.(showreel|credential)/.test(path)?'about':path.startsWith('settings.contact')?'contact':path.startsWith('settings.copyright')?'footer':'settings');selectGroup(`site-component-${key}`);for(const controller of mounted){const target=controller.revealValidationPath?.(path);if(target){if(target instanceof Element && root.contains(target))revealTarget(target);return target;}}return false;},setDisabled(value){if(context.siteUx){root.disabled=false;for(const control of root.querySelectorAll('input,textarea,button,select')){if(control.closest('.ux-form-tabs')||control.hasAttribute('data-site-view-only'))continue;if(value){if(control.dataset.siteLockDisabled===undefined)control.dataset.siteLockDisabled=String(control.disabled);control.disabled=true;}else if(control.dataset.siteLockDisabled!==undefined){control.disabled=control.dataset.siteLockDisabled==='true';delete control.dataset.siteLockDisabled;}}}else root.disabled=value;for(const controller of mounted)controller.setDisabled?.(value);},destroy(){window.removeEventListener('cms:site-group',receiveGroup);if(context.siteUx)window.dispatchEvent(new CustomEvent('cms:site-navigation',{detail:{node:null,groupId:null,label:''}}));navigation.remove();frame.removeEventListener('click',fragment);for(const controller of mounted)controller.destroy?.();frame.remove();}};
}
