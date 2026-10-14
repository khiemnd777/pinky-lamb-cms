import {siteNode} from './site-fields.mjs';
import {createSiteFieldTools} from './site-settings-editor.mjs';
import {renderSiteSourceBindings} from './site-services-editor.mjs';

export const APPROVED_SHOWREEL_SOURCE_URL='https://drive.google.com/file/d/1I5v6s_z_Tbd1l1FVHLkTe7bAd1LQIl7b/view';
export function mountSiteAboutIp(container,{content,context,onChange,mode='ALL'}){
 let disposed=false;const tools=createSiteFieldTools({content,context,onChange,redraw});
 const about=content.sections.find(section=>section.sectionId==='about'),ip=content.sections.find(section=>section.sectionId==='ip-studio');
 const aboutPath=`sections.${content.sections.indexOf(about)}`,ipPath=`sections.${content.sections.indexOf(ip)}`;
 function textList(parent,values,path,prefix,label,{max=12,cap=160,multiline=false}={}){
  values.forEach((text,index)=>{
   const row=siteNode('div',undefined,{class:'run-row'});parent.append(row);
   tools.input(row,`${prefix}-${index}`,`${label} ${index+1}`,text,value=>{values[index]=value;},{max:cap,multiline,path:`${path}.${index}`});
   tools.structural(row,'Đưa nội dung lên',`${prefix}-${index}-up`,()=>tools.move(values,index,-1),{disabled:index===0,focusId:`${prefix}-${index-1}`});
   tools.structural(row,'Đưa nội dung xuống',`${prefix}-${index}-down`,()=>tools.move(values,index,1),{disabled:index===values.length-1,focusId:`${prefix}-${index+1}`});
   tools.structural(row,`Bỏ ${label.toLowerCase()}`,`${prefix}-${index}-remove`,()=>values.splice(index,1),{focusId:`${prefix}-add`});
  });
  tools.structural(parent,`Thêm ${label.toLowerCase()}`,`${prefix}-add`,()=>values.push(''),{disabled:values.length>=max,focusId:`${prefix}-${values.length}`});
 }
 function redraw(focusId=document.activeElement?.id){
  if(disposed)return;container.replaceChildren();
  if(mode!=='IP'){
  const order=tools.group(container,'Thứ tự các mục chính','site-body-order','sectionOrder');
  const labels={work:'Dự án',services:'Dịch vụ',about:'Giới thiệu','ip-studio':'IP Studio'};
  content.sectionOrder.forEach((id,index)=>{
   const row=siteNode('div',undefined,{class:'run-row',id:`site-body-${id}`,tabindex:'-1','aria-label':labels[id]});order.append(row);row.append(siteNode('p',`${index+1}. ${labels[id]}${content.sections.find(section=>section.sectionId===id).isVisible?'':' — đang ẩn'}`));
   tools.structural(row,'Đưa mục lên',`site-body-${id}-up`,()=>tools.move(content.sectionOrder,index,-1),{disabled:index===0,focusId:`site-body-${id}`});
   tools.structural(row,'Đưa mục xuống',`site-body-${id}-down`,()=>tools.move(content.sectionOrder,index,1),{disabled:index===content.sectionOrder.length-1,focusId:`site-body-${id}`});
  });
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
  if(focusId)document.getElementById(focusId)?.focus();
 }
 redraw();return {refreshReferences(){tools.refreshReferences();const labels={work:'Dự án',services:'Dịch vụ',about:'Giới thiệu','ip-studio':'IP Studio'};content.sectionOrder.forEach((id,index)=>{const row=container.querySelector(`#site-body-${id} > p`);if(row)row.textContent=`${index+1}. ${labels[id]}${content.sections.find(section=>section.sectionId===id).isVisible?'':' — đang ẩn'}`;});},setDisabled(){},destroy(){disposed=true;tools.dispose();container.replaceChildren();}};
}

export const mountSiteAbout=(container,options)=>mountSiteAboutIp(container,{...options,mode:'ABOUT'});
export const mountSiteIp=(container,options)=>mountSiteAboutIp(container,{...options,mode:'IP'});
