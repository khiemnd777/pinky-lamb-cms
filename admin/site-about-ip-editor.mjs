import {createFormTabs,moveFields} from './site-form-ui.mjs';
import {siteNode,siteHeadingNode} from './site-fields.mjs';
import {createSiteFieldTools} from './site-settings-editor.mjs';
import {renderSiteSourceBindings} from './site-source-bindings.mjs';

export const APPROVED_SHOWREEL_SOURCE_URL='https://drive.google.com/file/d/1I5v6s_z_Tbd1l1FVHLkTe7bAd1LQIl7b/view';
export function mountSiteAboutIp(container,{content,context,onChange,mode='ALL'}){
 let disposed=false,selectedTab;let tabs;let thumbnail=null;let updateContext=()=>{};const tools=createSiteFieldTools({content,context,onChange,redraw});
 function clearThumbnail(){thumbnail?.cleanup?.();thumbnail=null;}
 function contextThumbnail(parent,assetId,options){const key=JSON.stringify([assetId,options.slot??'IMAGE']);if(thumbnail?.key!==key){clearThumbnail();const host=siteNode('div',undefined,{class:'ux-media-thumb'});const asset=context.resolveMediaAsset?.(assetId);if(asset?.width>0&&asset?.height>0)host.style?.setProperty('--context-media-ratio',`${asset.width} / ${asset.height}`);parent.append(host);thumbnail={key,host,cleanup:context.mountMediaThumbnail?.(host,assetId,options)};}parent.append(thumbnail.host);return thumbnail.host;}
 const about=content.sections.find(section=>section.sectionId==='about'),ip=content.sections.find(section=>section.sectionId==='ip-studio');
 const aboutPath=`sections.${content.sections.indexOf(about)}`,ipPath=`sections.${content.sections.indexOf(ip)}`;
 function textList(parent,values,path,prefix,label,{max=12,cap=160,multiline=false}={}){
  tools.sortList(parent,values,path,`Sắp xếp ${label.toLowerCase()}`,(_,index)=>`${label} ${index+1}`);
  values.forEach((text,index)=>{
   const row=siteNode('div',undefined,{class:'run-row ux-content-list-row','data-validation-path':`${path}.${index}`});parent.append(row);
   tools.input(row,`${prefix}-${index}`,`${label} ${index+1}`,text,value=>{values[index]=value;},{max:cap,multiline,path:`${path}.${index}`});
   if(!context.siteUx&&!context.formSorts){
    tools.structural(row,'Đưa nội dung lên',`${prefix}-${index}-up`,()=>tools.move(values,index,-1),{disabled:index===0,focusId:`${prefix}-${index-1}`});
    tools.structural(row,'Đưa nội dung xuống',`${prefix}-${index}-down`,()=>tools.move(values,index,1),{disabled:index===values.length-1,focusId:`${prefix}-${index+1}`});
   }
   tools.structural(row,`Bỏ ${label.toLowerCase()}`,`${prefix}-${index}-remove`,()=>tools.remove(values,index),{focusId:`${prefix}-add`});
  });
  tools.structural(parent,`Thêm ${label.toLowerCase()}`,`${prefix}-add`,()=>values.push(''),{disabled:values.length>=max,focusId:`${prefix}-${values.length}`});
 }
 function redraw(focusId=document.activeElement?.id){
  if(disposed)return;clearThumbnail();tools.disposeControls(container);container.replaceChildren();tabs=undefined;container.classList.toggle('ux-content-editor',Boolean(context.siteUx));
  if(mode!=='IP'){
  if(!context.siteUx){const order=tools.group(container,'Thứ tự các mục chính','site-body-order','sectionOrder');
  const labels={work:'Dự án',services:'Dịch vụ',about:'Giới thiệu','ip-studio':'IP Studio'};
  content.sectionOrder.forEach((id,index)=>{
   const row=siteNode('div',undefined,{class:'run-row',id:`site-body-${id}`,tabindex:'-1','aria-label':labels[id]});order.append(row);row.append(siteNode('p',`${index+1}. ${labels[id]}${content.sections.find(section=>section.sectionId===id).isVisible?'':' — đang ẩn'}`));
   tools.structural(row,'Đưa mục lên',`site-body-${id}-up`,()=>tools.move(content.sectionOrder,index,-1),{disabled:index===0,focusId:`site-body-${id}`});
   tools.structural(row,'Đưa mục xuống',`site-body-${id}-down`,()=>tools.move(content.sectionOrder,index,1),{disabled:index===content.sectionOrder.length-1,focusId:`site-body-${id}`});
  });
  }
  const aboutFields=tools.group(container,'Giới thiệu','site-about-fields',aboutPath);aboutFields.tabIndex=-1;
  tools.checkbox(aboutFields,'site-about-visible','Hiện mục Giới thiệu',about.isVisible,value=>{about.isVisible=value;},{path:`${aboutPath}.isVisible`});
  tools.heading(aboutFields,about.heading,`${aboutPath}.heading`,'site-about-heading','Tiêu đề Giới thiệu');
  tools.input(aboutFields,'site-about-lead','Đoạn mở đầu',about.lead,value=>{about.lead=value;},{max:4000,multiline:true,path:`${aboutPath}.lead`});
  textList(aboutFields,about.paragraphs,`${aboutPath}.paragraphs`,'site-about-paragraph','Đoạn nội dung',{cap:4000,multiline:true});
  for(const [key,label,max,multiline] of [['value','Giá trị kinh nghiệm',80,false],['label','Nhãn kinh nghiệm',120,false],['copy','Nội dung kinh nghiệm',4000,true]])tools.input(aboutFields,`site-about-experience-${key}`,label,about.experienceFact[key],value=>{about.experienceFact[key]=value;},{max,multiline,path:`${aboutPath}.experienceFact.${key}`});
  tools.checkbox(aboutFields,'site-about-experience-location-enabled','Ghi địa điểm kinh nghiệm',about.experienceFact.location!==undefined,value=>{if(value)about.experienceFact.location='';else delete about.experienceFact.location;},{path:`${aboutPath}.experienceFact.location`,refresh:true});
  if(about.experienceFact.location!==undefined)tools.input(aboutFields,'site-about-experience-location','Địa điểm kinh nghiệm',about.experienceFact.location,value=>{about.experienceFact.location=value;},{max:160,path:`${aboutPath}.experienceFact.location`});
  tools.image(aboutFields,about.signature.image,`${aboutPath}.signature.image`,'site-about-signature-image','hình chữ ký');
  tools.runs(aboutFields,about.signature.copy,`${aboutPath}.signature.copy`,'site-about-signature-copy','Nội dung chữ ký',{maxRuns:12,cap:1000,multiline:true});
  tools.heading(aboutFields,about.reelHeading,`${aboutPath}.reelHeading`,'site-about-reel-heading','Tiêu đề showreel');
  tools.input(aboutFields,'site-about-reel-caption','Chú thích showreel',about.reelCaption,value=>{about.reelCaption=value;},{max:1000,multiline:true,path:`${aboutPath}.reelCaption`});
  aboutFields.append(siteNode('p','Tổng nội dung dài của Giới thiệu tối đa 4.000 ký tự; tiêu đề được tính riêng.'));
  renderSiteSourceBindings(tools,aboutFields,content,context,'sections/about/facts','site-about');
  const reel=tools.group(container,'Video showreel','site-showreel-fields','settings.showreel');
  const videos=()=>context.catalog.filter(asset=>asset.kind==='VIDEO' && asset.status==='LEGACY_READY' && Number.isFinite(asset.durationSeconds) && asset.durationSeconds>0).map(asset=>[asset.id,asset.label??asset.id]);
  if(typeof context.openMediaPicker==='function')tools.picker(reel,'site-showreel','Chọn video','VIDEO',()=>content.settings.showreel.assetId,id=>{const asset=context.resolveMediaAsset(id);content.settings.showreel.assetId=id;content.settings.showreel.durationSeconds=asset.durationSeconds;},{path:'settings.showreel.assetId'});
  else tools.select(reel,'site-showreel-asset','Video trong danh mục',content.settings.showreel.assetId,videos,id=>{const asset=context.catalog.find(value=>value.id===id);content.settings.showreel.assetId=id;content.settings.showreel.durationSeconds=asset.durationSeconds;},{path:'settings.showreel.assetId',refresh:true});
  tools.input(reel,'site-showreel-duration','Thời lượng từ danh mục (giây)',content.settings.showreel.durationSeconds,()=>{},{readonly:true,path:'settings.showreel.durationSeconds',hint:'Thời lượng lấy từ video trong danh mục; không nhập thủ công.'});
  tools.input(reel,'site-showreel-title','Tên showreel',content.settings.showreel.title,value=>{content.settings.showreel.title=value;},{max:120,path:'settings.showreel.title'});
  if(typeof context.openMediaPicker==='function')tools.select(reel,'site-showreel-poster-kind','Nguồn ảnh đại diện',content.settings.showreel.poster.derivativeRole==='POSTER'?'VIDEO_POSTER':'IMAGE',[['IMAGE','Ảnh riêng'],['VIDEO_POSTER','Poster từ video READY']],kind=>{if(kind==='VIDEO_POSTER')content.settings.showreel.poster={...content.settings.showreel.poster,assetId:content.settings.showreel.assetId,derivativeRole:'POSTER'};else delete content.settings.showreel.poster.derivativeRole;},{refresh:true});
  tools.image(reel,content.settings.showreel.poster,'settings.showreel.poster','site-showreel-poster','ảnh đại diện showreel');
  tools.checkbox(reel,'site-showreel-source-enabled','Hiện liên kết video gốc đã bàn giao',content.settings.showreel.originalSourceUrl!==undefined,checked=>{if(checked)content.settings.showreel.originalSourceUrl=APPROVED_SHOWREEL_SOURCE_URL;else delete content.settings.showreel.originalSourceUrl;},{path:'settings.showreel.originalSourceUrl',refresh:true});
  reel.append(siteNode('p',content.settings.showreel.originalSourceUrl!==undefined?'Đang dùng liên kết video gốc cố định của bản bàn giao.':'Liên kết video gốc đang được bỏ.'));
  renderSiteSourceBindings(tools,reel,content,context,'settings/showreel/facts','site-showreel');
  const credential=tools.group(container,'Hồ sơ năng lực','site-credential-fields','settings.credential');
  tools.picker(credential,'site-credential','Chọn hồ sơ PDF','PDF',()=>content.settings.credential.assetId,id=>{content.settings.credential.assetId=id;},{path:'settings.credential.assetId'});
  tools.input(credential,'site-credential-label','Nhãn hồ sơ',content.settings.credential.label,value=>{content.settings.credential.label=value;},{max:80,path:'settings.credential.label'});
  tools.input(credential,'site-credential-edition','Phiên bản hồ sơ',content.settings.credential.edition,value=>{content.settings.credential.edition=value;},{max:120,path:'settings.credential.edition'});
  credential.append(siteNode('p','Nếu đổi PDF, hãy sửa các nút dẫn đến hồ sơ cho cùng PDF trước khi lưu.'));
  if(context.siteUx){const usage=siteNode('details',undefined,{class:'ux-source-disclosure'});usage.append(siteNode('summary','Vị trí đang sử dụng'),siteNode('p','Dự án / Nút hồ sơ năng lực dùng chung'),siteNode('p',`${content.projects.filter(project=>Number.isInteger(project.publicCredentialPage)).length} dự án có thông tin tham chiếu Credential.`,{class:'ux-credential-usage'}));credential.append(usage);}
  renderSiteSourceBindings(tools,credential,content,context,'settings/credential/facts','site-credential');
  }
  if(mode!=='ABOUT'){
  const ipFields=tools.group(container,'IP Studio','site-ip-fields',ipPath);ipFields.tabIndex=-1;
  tools.checkbox(ipFields,'site-ip-visible','Hiện IP Studio',ip.isVisible,value=>{ip.isVisible=value;},{path:`${ipPath}.isVisible`});
  tools.heading(ipFields,ip.heading,`${ipPath}.heading`,'site-ip-heading','Tiêu đề IP Studio');
  tools.input(ipFields,'site-ip-description','Nội dung IP Studio',ip.description,value=>{ip.description=value;},{max:4000,multiline:true,path:`${ipPath}.description`});
  textList(ipFields,ip.disciplines,`${ipPath}.disciplines`,'site-ip-discipline','Chuyên môn');
  tools.image(ipFields,ip.image,`${ipPath}.image`,'site-ip-image','ảnh IP Studio');
  tools.action(ipFields,ip.action,`${ipPath}.action`,'site-ip-action','Nút IP Studio',value=>{ip.action=value;});
  ipFields.append(siteNode('p','Tổng nội dung và chuyên môn IP Studio tối đa 4.000 ký tự.'));
  renderSiteSourceBindings(tools,ipFields,content,context,'sections/ip-studio/facts','site-ip');
  }
  if(context.siteUx){
   if(mode==='ABOUT'){
    const intro=container.querySelector('#site-about-fields'),reel=container.querySelector('#site-showreel-fields'),credential=container.querySelector('#site-credential-fields');
    tabs=createFormTabs(container,{label:'Giới thiệu',selected:selectedTab,onSelect:id=>{selectedTab=id;},tabs:[{id:'site-about-content-panel',label:'Nội dung'},{id:'site-about-experience-panel',label:'Kinh nghiệm & chữ ký'},{id:'site-about-showreel-panel',label:'Showreel'},{id:'site-about-credential-panel',label:'Hồ sơ năng lực'}]});
    tabs.panel('site-about-content-panel').append(intro);
    const experience=tools.group(tabs.panel('site-about-experience-panel'),'Dữ kiện và chữ ký','site-about-experience-fields');
    experience.append(siteNode('p','Đối chiếu dữ kiện kinh nghiệm; không suy ra năm thành lập từ con số này.'));
    const factPair=siteNode('div',undefined,{class:'ux-content-pair'});experience.append(factPair);moveFields(factPair,intro,['site-about-experience-value','site-about-experience-label']);
    moveFields(experience,intro,['site-about-experience-copy','site-about-experience-location-enabled','site-about-experience-location','site-about-signature-image-pick','site-about-signature-image-alt','site-about-signature-image-decorative','site-about-signature-image-focal-enabled','site-about-signature-image-focal-x','site-about-signature-image-focal-y']);
    const signature=intro.querySelector('[data-validation-path="'+aboutPath+'.signature.copy"]');if(signature)experience.append(signature);
    const facts=intro.querySelector('#site-about-sources');if(facts)experience.append(facts.closest('details')??facts);
    const reelHeading=intro.querySelector('[data-validation-path="'+aboutPath+'.reelHeading"]');if(reelHeading)reel.prepend(reelHeading);
    moveFields(reel,intro,['site-about-reel-caption']);tabs.panel('site-about-showreel-panel').append(reel);tabs.panel('site-about-credential-panel').append(credential);
    const cta=siteNode('div',undefined,{class:'ux-content-reference'});cta.append(siteNode('p','Nút trên website: Làm quen với Pinky — dùng chung hồ sơ PDF.'),siteNode('a','Chỉnh hồ sơ năng lực',{href:'#site-credential-pick'}));intro.append(cta);
    cta.querySelector('a').addEventListener('click',event=>{event.preventDefault();tabs.select('site-about-credential-panel');container.querySelector('#site-credential-pick')?.focus();});
    const aside=siteNode('aside',undefined,{class:'ux-content-context','aria-label':'Minh họa Giới thiệu'});container.append(aside);
    updateContext=()=>{aside.replaceChildren(siteNode('p','GIỚI THIỆU · XEM NHANH',{class:'ux-content-eyebrow'}),siteHeadingNode(about.heading),siteNode('p',about.lead),siteNode('p',about.experienceFact.value,{class:'ux-context-experience'}),siteNode('strong',about.experienceFact.label));contextThumbnail(aside,content.settings.showreel.poster.assetId,{label:'Poster showreel',slot:content.settings.showreel.poster.derivativeRole==='POSTER'?'VIDEO_POSTER':'IMAGE'});const seconds=content.settings.showreel.durationSeconds,title=siteNode('p',content.settings.showreel.title);title.append(siteNode('span',`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`,{class:'cms-badge'}));aside.append(title);const usage=credential.querySelector('.ux-credential-usage');if(usage)usage.textContent=`${content.projects.filter(project=>Number.isInteger(project.publicCredentialPage)).length} dự án có thông tin tham chiếu Credential.`;};
    for(const panel of ['site-about-content-panel','site-about-experience-panel','site-about-showreel-panel','site-about-credential-panel'])tabs.panel(panel).classList.add('ux-content-surface');
   }else if(mode==='IP'){
    const ipFields=container.querySelector('#site-ip-fields');ipFields.classList.add('ux-content-surface');
    const artwork=tools.group(ipFields,'Artwork và hành động','site-ip-artwork-fields');
    moveFields(artwork,ipFields,['site-ip-image-pick','site-ip-image-alt','site-ip-image-decorative','site-ip-image-focal-enabled','site-ip-image-focal-x','site-ip-image-focal-y','site-ip-action-kind','site-ip-action-label','site-ip-action-section','site-ip-action-pick']);
    const sources=ipFields.querySelector('#site-ip-sources');if(sources)artwork.append(sources.closest('details')??sources);
    const aside=siteNode('aside',undefined,{class:'ux-content-context','aria-label':'Minh họa IP Studio'});container.append(aside);
    updateContext=()=>{aside.replaceChildren(siteNode('p','IP STUDIO · XEM NHANH',{class:'ux-content-eyebrow'}));contextThumbnail(aside,ip.image.assetId,{label:'Artwork IP Studio'});aside.append(siteHeadingNode(ip.heading),siteNode('p',ip.description));const badges=siteNode('div',undefined,{class:'ux-content-badges'});badges.append(...ip.disciplines.map(text=>siteNode('span',text)));aside.append(badges,siteNode('p',ip.action.label));};

   }
  }
  updateContext();
  if(focusId){const target=document.getElementById(focusId);if(target){tabs?.reveal(target);target.focus();}}
 }
 const onInput=()=>updateContext();container.addEventListener('input',onInput);
 redraw();return {revealValidationPath(path){const target=[...container.querySelectorAll('[data-validation-path]')].find(node=>node.dataset.validationPath===path||node.dataset.validationPath.startsWith(path+'.'));if(target){tabs?.reveal(target);for(let parent=target.parentElement;parent&&parent!==container;parent=parent.parentElement)if(parent.tagName?.toUpperCase()==='DETAILS')parent.open=true;return target;}return false;},refreshReferences(){tools.refreshReferences();updateContext();const labels={work:'Dự án',services:'Dịch vụ',about:'Giới thiệu','ip-studio':'IP Studio'};content.sectionOrder.forEach((id,index)=>{const row=container.querySelector(`#site-body-${id} > p`);if(row)row.textContent=`${index+1}. ${labels[id]}${content.sections.find(section=>section.sectionId===id).isVisible?'':' — đang ẩn'}`;});},setDisabled(value){tools.setDisabled(value);},destroy(){disposed=true;container.removeEventListener('input',onInput);clearThumbnail();tools.dispose();container.replaceChildren();}};
}

export const mountSiteAbout=(container,options)=>mountSiteAboutIp(container,{...options,mode:'ABOUT'});
export const mountSiteIp=(container,options)=>mountSiteAboutIp(container,{...options,mode:'IP'});
