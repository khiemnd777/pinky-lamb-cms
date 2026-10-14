import {siteNode,siteButton,SITE_SECTION_LABELS} from './site-fields.mjs';
import {stableIdSchema} from '../contracts/site-settings.mjs';
import {openMediaPicker} from './media-picker.mjs';

const EMPHASIS=[['NONE','Bình thường'],['STRONG','Đậm'],['ACCENT','Nhấn màu']];
const ACTION_SECTIONS=['work','services','about','ip-studio','contact'];
const NAV_SECTIONS=['clients',...ACTION_SECTIONS];

/** Typed DOM controls shared by the section editors. They edit only the working
 * model; the controller owns validation, intents and all network requests. */
export function createSiteFieldTools({content,context,onChange,redraw}){
 let closePicker=null;const dependentSelects=[];
 function change({refresh=false,focusId}={}){onChange();if(refresh)redraw(focusId);}
 function group(parent,label,id,path){const section=siteNode('section',undefined,{class:'editor-group',id});section.append(siteNode('h3',label));if(path)section.dataset.validationPath=path;parent.append(section);return section;}
 function input(parent,id,label,value,set,{max=120,multiline=false,type='text',path,min,maxValue,step,readonly=false,hint}={}){
  const wrapper=siteNode('div',undefined,{class:'editor-field'}),control=siteNode(multiline?'textarea':'input',undefined,{id});
  if(!multiline)control.type=type;if(path)control.dataset.validationPath=path;
  if(type==='number'){if(min!==undefined)control.min=min;if(maxValue!==undefined)control.max=maxValue;if(step!==undefined)control.step=step;}
  else control.maxLength=max;
  control.readOnly=readonly;control.value=value===undefined?'':String(value);
  wrapper.append(siteNode('label',label,{for:id}),control);
  if(hint){const note=siteNode('p',hint,{id:`${id}-hint`,class:'field-hint'});control.setAttribute('aria-describedby',note.id);wrapper.append(note);}
  parent.append(wrapper);control.addEventListener('input',()=>{set(type==='number'?(control.value===''?NaN:Number(control.value)):control.value);change();});return control;
 }
 function checkbox(parent,id,label,value,set,{path,refresh=false}={}){
  const wrapper=siteNode('div',undefined,{class:'editor-check'}),control=siteNode('input',undefined,{id,type:'checkbox'});control.checked=value;if(path)control.dataset.validationPath=path;
  wrapper.append(control,siteNode('label',label,{for:id}));parent.append(wrapper);
  control.addEventListener('change',()=>{set(control.checked);change({refresh,focusId:id});});return control;
 }
 function select(parent,id,label,value,options,set,{path,refresh=false}={}){
  const wrapper=siteNode('div',undefined,{class:'editor-field'}),control=siteNode('select',undefined,{id});if(path)control.dataset.validationPath=path;
  function updateOptions(){const selected=control.value || value;control.replaceChildren();for(const [key,text,disabled=false] of (typeof options==='function'?options():options)){const option=siteNode('option',text,{value:key});option.disabled=disabled;control.append(option);}control.value=selected;}
  updateOptions();if(typeof options==='function')dependentSelects.push({control,updateOptions});
  control.value=value;wrapper.append(siteNode('label',label,{for:id}),control);parent.append(wrapper);
  control.addEventListener('change',()=>{set(control.value);change({refresh,focusId:id});});return control;
 }
 function structural(parent,label,id,action,{disabled=false,focusId=id}={}){
  const button=siteButton(label,id,()=>{action();change({refresh:true,focusId});});button.disabled=disabled;parent.append(button);return button;
 }
 function runs(parent,values,path,prefix,label,{maxRuns=8,cap=100,multiline=false}={}){
  const block=siteNode('div',undefined,{'data-validation-path':path});parent.append(block);
  values.forEach((run,index)=>{
   const row=siteNode('div',undefined,{class:'run-row','data-site-run-path':`${path}.${index}`});block.append(row);
   const text=input(row,`${prefix}-${index}-text`,`${label} — đoạn ${index+1}`,run.text,value=>{run.text=value;},{max:cap,multiline,path:`${path}.${index}.text`,hint:`Tối đa ${cap} ký tự cho cả nhóm.`});text.dataset.siteRunText='';
   const emphasis=select(row,`${prefix}-${index}-emphasis`,`${label} — nhấn mạnh ${index+1}`,run.emphasis??'NONE',EMPHASIS,value=>{run.emphasis=value;},{path:`${path}.${index}.emphasis`});emphasis.dataset.siteRunEmphasis='';
   structural(row,`Xóa đoạn ${index+1} của ${label}`,`${prefix}-${index}-remove`,()=>values.splice(index,1),{disabled:values.length<=1,focusId:`${prefix}-${Math.max(0,index-1)}-text`});
  });
  structural(block,`Thêm đoạn cho ${label}`,`${prefix}-add`,()=>values.push({text:''}),{disabled:values.length>=maxRuns,focusId:`${prefix}-${values.length}-text`});
 }
 function heading(parent,value,path,prefix,label,{legacy=false}={}){
  value.lines.forEach((line,index)=>{
   const block=siteNode('div',undefined,{class:'heading-line','data-validation-path':`${path}.lines.${index}`});block.append(siteNode('h4',`${label} — dòng ${index+1}`));parent.append(block);
   runs(block,line,`${path}.lines.${index}`,`${prefix}-${index}`,`${label} dòng ${index+1}`,{multiline:legacy});
   structural(block,`Xóa dòng ${index+1} của ${label}`,`${prefix}-${index}-remove-line`,()=>value.lines.splice(index,1),{disabled:value.lines.length<=1,focusId:`${prefix}-${Math.max(0,index-1)}-0-text`});
  });
  structural(parent,`Thêm dòng cho ${label}`,`${prefix}-add-line`,()=>value.lines.push([{text:''}]),{disabled:value.lines.length>=3,focusId:`${prefix}-${value.lines.length}-0-text`});
 }
 function picker(parent,prefix,label,kind,getId,setId,{path,allowedIds,slot=kind}={}){
  const catalog=context.catalog.filter(asset=>asset.status==='LEGACY_READY' && asset.kind===kind && (!allowedIds || allowedIds.includes(asset.id)));
  const selected=siteNode('p',(context.resolveMediaAsset?.(getId())??catalog.find(asset=>asset.id===getId()))?.label??getId(),{id:`${prefix}-selected`});parent.append(selected);
  const button=siteButton(label,`${prefix}-pick`,()=>{const onSelect=asset=>{setId(asset.id);change({refresh:true,focusId:button.id});};closePicker=typeof context.openMediaPicker==='function'?context.openMediaPicker({kind,slot,path,allowedIds,selectedId:getId(),onSelect}):openMediaPicker({catalog,kind,selectedId:getId(),onSelect});});if(path)button.dataset.validationPath=path;parent.append(button);
 }
 function image(parent,value,path,prefix,label,{decorative=true}={}){
  const poster=typeof context.openMediaPicker==='function'&&value.derivativeRole==='POSTER';
  picker(parent,prefix,`Chọn ${label}`,poster?'VIDEO':'IMAGE',()=>value.assetId,id=>{value.assetId=id;},{path:`${path}.assetId`,slot:poster?'VIDEO_POSTER':'IMAGE'});
  input(parent,`${prefix}-alt`,`Mô tả ${label}`,value.alt,text=>{value.alt=text;},{max:300,path:`${path}.alt`,hint:decorative?'Ảnh trang trí phải có mô tả rỗng; ảnh nội dung cần mô tả có nghĩa.':'Ảnh nội dung cần mô tả có nghĩa.'});
  if(decorative)checkbox(parent,`${prefix}-decorative`,'Ảnh chỉ để trang trí',value.isDecorative,checked=>{value.isDecorative=checked;},{path:`${path}.isDecorative`});
  checkbox(parent,`${prefix}-focal-enabled`,`Đặt trọng tâm ${label}`,Boolean(value.focalPoint),checked=>{if(checked)value.focalPoint={x:.5,y:.5};else delete value.focalPoint;},{path:`${path}.focalPoint`,refresh:true});
  if(value.focalPoint){input(parent,`${prefix}-focal-x`,'Trọng tâm ngang (0–1)',value.focalPoint.x,number=>{value.focalPoint.x=number;},{type:'number',min:0,maxValue:1,step:.01,path:`${path}.focalPoint.x`});input(parent,`${prefix}-focal-y`,'Trọng tâm dọc (0–1)',value.focalPoint.y,number=>{value.focalPoint.y=number;},{type:'number',min:0,maxValue:1,step:.01,path:`${path}.focalPoint.y`});}
 }
 function sectionOptions(ids,current){return ids.filter(id=>id===current || content.sections.find(section=>section.sectionId===id)?.isVisible===true).map(id=>{const hidden=content.sections.find(section=>section.sectionId===id)?.isVisible!==true;return [id,`${SITE_SECTION_LABELS[id]}${hidden?' — đang ẩn':''}`,hidden];});}
 function action(parent,value,path,prefix,label,set){
  select(parent,`${prefix}-kind`,`${label} — loại`,value.kind,()=>[['SECTION','Đi đến mục'],['SHOWREEL','Xem showreel',content.sections.find(section=>section.sectionId==='about')?.isVisible!==true],['CREDENTIAL','Hồ sơ năng lực']],kind=>{
   if(kind==='SECTION')set({kind,sectionId:sectionOptions(ACTION_SECTIONS).at(0)?.[0]??'contact',label:value.label});
   else if(kind==='CREDENTIAL')set({kind,assetId:content.settings.credential.assetId,label:value.label});
   else set({kind,label:value.label});
  },{path:`${path}.kind`,refresh:true});
  input(parent,`${prefix}-label`,`${label} — nhãn`,value.label,text=>{value.label=text;},{max:80,path:`${path}.label`});
  if(value.kind==='SECTION')select(parent,`${prefix}-section`,`${label} — mục`,value.sectionId,()=>sectionOptions(ACTION_SECTIONS,value.sectionId),id=>{value.sectionId=id;},{path:`${path}.sectionId`});
  if(value.kind==='CREDENTIAL')picker(parent,prefix,`Chọn PDF cho ${label}`,'PDF',()=>value.assetId,id=>{value.assetId=id;},{path:`${path}.assetId`,allowedIds:[content.settings.credential.assetId]});
 }
 function move(list,index,offset){const target=index+offset;if(target<0 || target>=list.length)return;[list[index],list[target]]=[list[target],list[index]];}
 return {group,input,checkbox,select,structural,runs,heading,picker,image,action,sectionOptions,move,change,refreshReferences(){for(let index=dependentSelects.length-1;index>=0;index--){const entry=dependentSelects[index];if(entry.control.isConnected)entry.updateOptions();else dependentSelects.splice(index,1);}},dispose(){closePicker?.();closePicker=null;}};
}

export function mountSiteSettings(container,{content,context,onChange,includeContact=true}){
 let disposed=false;
 const tools=createSiteFieldTools({content,context,onChange,redraw});
 function redraw(focusId=document.activeElement?.id){
  if(disposed)return;container.replaceChildren();
  const navigation=siteNode('nav',undefined,{'aria-label':'Cài đặt Header, Hero và SEO',class:'site-section-navigation'});
  for(const [id,label] of [['site-header-fields','Đầu trang'],['site-hero-fields','Hero'],['site-seo-fields','SEO']]){const link=siteNode('a',label,{href:`#${id}`});navigation.append(link);}container.append(navigation);
  const header=tools.group(container,'Đầu trang và thương hiệu','site-header-fields');
  header.tabIndex=-1;
  tools.input(header,'site-header-descriptor','Mô tả đầu trang',content.settings.header.descriptor,value=>{content.settings.header.descriptor=value;},{max:120,path:'settings.header.descriptor'});
  tools.input(header,'site-header-cta','Nhãn nút đầu trang',content.settings.header.ctaLabel,value=>{content.settings.header.ctaLabel=value;},{max:80,path:'settings.header.ctaLabel'});
  header.append(siteNode('p',`Tên thương hiệu: ${content.settings.brand.name}`));
  tools.image(header,content.settings.brand.logo,'settings.brand.logo','site-brand-logo','logo thương hiệu');
  tools.input(header,'site-brand-tagline','Thông điệp thương hiệu',content.settings.brand.tagline,value=>{content.settings.brand.tagline=value;},{max:300,path:'settings.brand.tagline'});
  const nav=tools.group(container,'Menu website','site-nav-fields','settings.nav');
  content.settings.nav.forEach((item,index)=>{
   const row=siteNode('div',undefined,{class:'heading-line','data-site-nav-index':String(index),'data-site-nav-id':item.sectionId});nav.append(row);
   tools.select(row,`site-nav-${index}-section`,`${index+1}. Mục menu`,item.sectionId,()=>tools.sectionOptions(NAV_SECTIONS,item.sectionId),value=>{item.sectionId=value;},{path:`settings.nav.${index}.sectionId`,refresh:true});
   tools.input(row,`site-nav-${index}-label`,`${index+1}. Nhãn menu`,item.label,value=>{item.label=value;},{max:80,path:`settings.nav.${index}.label`});
   tools.structural(row,'Lên',`site-nav-${index}-up`,()=>tools.move(content.settings.nav,index,-1),{disabled:index===0,focusId:`site-nav-${Math.max(0,index-1)}-label`});
   tools.structural(row,'Xuống',`site-nav-${index}-down`,()=>tools.move(content.settings.nav,index,1),{disabled:index===content.settings.nav.length-1,focusId:`site-nav-${index+1}-label`});
   tools.structural(row,'Bỏ mục khỏi menu',`site-nav-${index}-remove`,()=>content.settings.nav.splice(index,1),{focusId:'site-nav-add'});
  });
  const available=()=>tools.sectionOptions(NAV_SECTIONS).filter(([id])=>!content.settings.nav.some(value=>value.sectionId===id));
  tools.structural(nav,'Thêm mục menu','site-nav-add',()=>{const [sectionId,label]=available()[0];content.settings.nav.push({sectionId,label});},{disabled:content.settings.nav.length>=6 || !available().length,focusId:`site-nav-${content.settings.nav.length}-label`});
  const hero=tools.group(container,'Hero của website','site-hero-fields');hero.tabIndex=-1;
  tools.input(hero,'site-hero-eyebrow','Dòng giới thiệu',content.hero.eyebrow,value=>{content.hero.eyebrow=value;},{max:120,path:'hero.eyebrow'});
  tools.heading(hero,content.hero.heading,'hero.heading','site-hero-heading','Tiêu đề Hero',{legacy:true});
  tools.runs(hero,content.hero.description,'hero.description','site-hero-description','Mô tả Hero',{maxRuns:12,cap:1000,multiline:true});
  tools.image(hero,content.hero.image,'hero.image','site-hero-image','ảnh Hero');
  tools.action(hero,content.hero.primaryAction,'hero.primaryAction','site-primaryAction','Nút chính',value=>{content.hero.primaryAction=value;});
  tools.checkbox(hero,'site-secondary-enabled','Hiện nút phụ',Boolean(content.hero.secondaryAction),checked=>{if(checked)content.hero.secondaryAction={kind:'SECTION',sectionId:'contact',label:'Liên hệ'};else delete content.hero.secondaryAction;},{path:'hero.secondaryAction',refresh:true});
  if(content.hero.secondaryAction)tools.action(hero,content.hero.secondaryAction,'hero.secondaryAction','site-secondaryAction','Nút phụ',value=>{content.hero.secondaryAction=value;});
  tools.input(hero,'site-hero-footnote','Chú thích Hero',content.hero.footnote,value=>{content.hero.footnote=value;},{max:240,multiline:true,path:'hero.footnote'});
  tools.input(hero,'site-hero-note','Ghi chú Hero',content.hero.note,value=>{content.hero.note=value;},{max:300,multiline:true,path:'hero.note'});
  const seo=tools.group(container,'SEO và chia sẻ','site-seo-fields');seo.tabIndex=-1;
  for(const [key,label,max] of [['title','Tiêu đề SEO',80],['description','Mô tả SEO',200],['ogTitle','Tiêu đề chia sẻ',80],['ogDescription','Mô tả chia sẻ',200]])tools.input(seo,`site-seo-${key}`,label,content.seo[key],value=>{content.seo[key]=value;},{max,multiline:key.includes('escription'),path:`seo.${key}`});
  tools.image(seo,content.seo.ogImage,'seo.ogImage','site-seo-image','ảnh chia sẻ',{decorative:false});
  // Preserve the task11 contact foundation until the Contact component takes ownership.
  if(includeContact){const contact=tools.group(container,'Thông tin liên hệ','site-contact-settings');for(const [key,label,max] of [['email','Email nhận brief',254],['personName','Người liên hệ',120],['personPhoneE164','Số điện thoại liên hệ (+84…)',16],['personPhoneLabel','Nhãn điện thoại liên hệ',80],['officePhoneE164','Số điện thoại văn phòng (+84…)',16],['officePhoneLabel','Nhãn điện thoại văn phòng',80],['facebookUrl','Địa chỉ Facebook',2048]])tools.input(contact,`site-contact-${key}`,label,content.settings.contact[key],value=>{content.settings.contact[key]=value;},{max,path:`settings.contact.${key}`});}
  if(focusId)document.getElementById(focusId)?.focus();
 }
 redraw();return {refreshReferences(){tools.refreshReferences();const add=container.querySelector('#site-nav-add');if(add)add.disabled=content.settings.nav.length>=6 || !tools.sectionOptions(NAV_SECTIONS).some(([id])=>!content.settings.nav.some(item=>item.sectionId===id));},setDisabled(){/* Parent fieldset applies permissions and pending lock. */},destroy(){disposed=true;tools.dispose();container.replaceChildren();}};
}

export function mountSiteClients(container,{content,context,onChange}){
 let disposed=false,newId='',newName='';let newImage={assetId:'',alt:'',isDecorative:false};const tools=createSiteFieldTools({content,context,onChange,redraw});
 function redraw(focusId=document.activeElement?.id){
  if(disposed)return;container.replaceChildren();const index=content.sections.findIndex(section=>section.sectionId==='clients'),section=content.sections[index],path=`sections.${index}`;
  const heading=tools.group(container,'Khách hàng trên website','site-clients-fields');
  tools.checkbox(heading,'site-clients-visible','Hiện mục Khách hàng',section.isVisible,value=>{section.isVisible=value;},{path:`${path}.isVisible`});
  tools.runs(heading,section.heading,`${path}.heading`,'site-clients-heading','Tiêu đề Khách hàng');
  content.settings.clientLogos.forEach((logo,position)=>{
   const card=tools.group(container,`Logo ${position+1}` ,`site-client-${logo.id}`,`settings.clientLogos.${position}`);card.dataset.siteClientId=logo.id;
   tools.input(card,`site-client-${logo.id}-id`,'Mã ổn định',logo.id,()=>{},{readonly:true,max:100,path:`settings.clientLogos.${position}.id`,hint:'Mã đã lưu được giữ nguyên. Có thể ẩn logo thay vì xóa.'});
   tools.input(card,`site-client-${logo.id}-name`,'Tên khách hàng',logo.clientName,value=>{logo.clientName=value;},{max:120,path:`settings.clientLogos.${position}.clientName`});
   tools.image(card,logo.image,`settings.clientLogos.${position}.image`,`site-client-${logo.id}-image`,'logo khách hàng');
   tools.checkbox(card,`site-client-${logo.id}-visible`,'Hiện logo',logo.isVisible,value=>{logo.isVisible=value;},{path:`settings.clientLogos.${position}.isVisible`});
   tools.structural(card,'Đưa logo lên',`site-client-${logo.id}-up`,()=>tools.move(content.settings.clientLogos,position,-1),{disabled:position===0,focusId:`site-client-${logo.id}-name`});
   tools.structural(card,'Đưa logo xuống',`site-client-${logo.id}-down`,()=>tools.move(content.settings.clientLogos,position,1),{disabled:position===content.settings.clientLogos.length-1,focusId:`site-client-${logo.id}-name`});
  });
  const add=tools.group(container,'Thêm logo khách hàng','site-client-add-fields');
  tools.input(add,'site-client-add-id','Mã logo mới',newId,value=>{newId=value;},{max:100,hint:'Chữ thường, số và dấu gạch ngang; mã không được trùng.'});
  tools.input(add,'site-client-add-name','Tên khách hàng mới',newName,value=>{newName=value;},{max:120});
  tools.image(add,newImage,'settings.clientLogos.new.image','site-client-add-image','logo mới');
  const error=siteNode('p','',{id:'site-client-add-error',role:'alert'});add.append(error);
  const button=siteButton('Thêm logo','site-client-add',()=>{
   if(!stableIdSchema.safeParse(newId).success || content.settings.clientLogos.some(logo=>logo.id===newId) || !newName.trim() || newName.length>120){error.textContent='Hãy nhập mã duy nhất và tên khách hàng hợp lệ.';document.getElementById('site-client-add-id')?.focus();return;}
   const asset=typeof context.resolveMediaAsset==='function'?context.resolveMediaAsset(newImage.assetId):context.catalog.find(value=>value.id===newImage.assetId && value.kind==='IMAGE' && value.status==='LEGACY_READY');
   if(typeof context.resolveMediaAsset==='function'&&(!asset||asset.kind!=='IMAGE'||!['READY','LEGACY_READY'].includes(asset.status)||asset.isArchived)){error.textContent='Hãy chọn ảnh sẵn sàng, chưa lưu trữ trước khi thêm logo.';return;}
   if(!asset || (newImage.isDecorative?newImage.alt!=='' : !newImage.alt.trim())){error.textContent='Hãy chọn ảnh và nhập mô tả phù hợp trước khi thêm logo.';document.getElementById('site-client-add-image-pick')?.focus();return;}
   content.settings.clientLogos.push({id:newId,clientName:newName,image:structuredClone(newImage),isVisible:true});const id=newId;newId='';newName='';newImage={assetId:'',alt:'',isDecorative:false};tools.change({refresh:true,focusId:`site-client-${id}-image-pick`});
  });button.disabled=content.settings.clientLogos.length>=12;add.append(button);
  const cancel=siteButton('Bỏ logo chưa thêm','site-client-add-cancel',()=>{newId='';newName='';newImage={assetId:'',alt:'',isDecorative:false};tools.change({refresh:true,focusId:'site-client-add-id'});});add.append(cancel,siteNode('p',`${content.settings.clientLogos.length}/12 logo, gồm cả logo đang ẩn.`));
  if(focusId)document.getElementById(focusId)?.focus();
 }
 redraw();return {hasPendingInput(){return Boolean(newId || newName || newImage.assetId || newImage.alt || newImage.isDecorative || newImage.focalPoint);},setDisabled(){/* Parent fieldset applies permissions and pending lock. */},destroy(){disposed=true;tools.dispose();container.replaceChildren();}};
}
