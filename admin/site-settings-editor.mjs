import {siteNode,siteButton,SITE_SECTION_LABELS} from './site-fields.mjs';
import {createFormTabs,createFormSorts} from './site-form-ui.mjs';
import {createRecordDialog} from './site-collection-ui.mjs';
import {createCmsIcon} from './cms-icons.mjs';
import {renderSiteSourceBindings} from './site-source-bindings.mjs';
import {stableIdSchema} from '../contracts/site-settings.mjs';
import {openMediaPicker} from './media-picker.mjs';
import {createPinkySelect,disposePinkySelects,closePinkySelects} from './pinky-select.mjs';

const EMPHASIS=[['NONE','Bình thường'],['STRONG','Đậm'],['ACCENT','Nhấn màu']];
const ACTION_SECTIONS=['work','services','about','ip-studio','contact'];
const NAV_SECTIONS=['clients',...ACTION_SECTIONS];

/** Typed DOM controls shared by the section editors. They edit only the working
 * model; the controller owns validation, intents and all network requests. */
export function createSiteFieldTools({content,context,onChange,redraw}){
 let closePicker=null;const cleanups=[];const sorts=createFormSorts({onChange,redraw});const dependentSelects=[],selectControls=new Set(),expandedOrderPaths=new Set();
 function change({refresh=false,focusId}={}){sorts.sync();onChange();if(refresh)redraw(focusId);}
 function group(parent,label,id,path){const section=siteNode('section',undefined,{class:context.siteUx?'editor-group ux-form-card':'editor-group',id});section.append(siteNode('h3',label));if(path)section.dataset.validationPath=path;parent.append(section);return section;}
 function input(parent,id,label,value,set,{max=120,multiline=false,type='text',path,min,maxValue,step,readonly=false,hint}={}){
  const wrapper=siteNode('div',undefined,{class:'editor-field'}),control=siteNode(multiline?'textarea':'input',undefined,{id});
  if(!multiline)control.type=type;if(path)control.dataset.validationPath=path;
  if(type==='number'){if(min!==undefined)control.min=min;if(maxValue!==undefined)control.max=maxValue;if(step!==undefined)control.step=step;}
  else control.maxLength=max;
  control.readOnly=readonly;control.value=value===undefined?'':String(value);
  wrapper.append(siteNode('label',label,{for:id}),control);
  if(hint){const note=siteNode('p',hint,{id:`${id}-hint`,class:'field-hint'});control.setAttribute('aria-describedby',note.id);wrapper.append(note);}
  if(context.siteUx && type!=='number'){const count=siteNode('span',`${control.value.length}/${max}`,{class:'ux-field-counter','aria-hidden':'true'});wrapper.append(count);control.addEventListener('input',()=>{count.textContent=`${control.value.length}/${max}`;});}
  parent.append(wrapper);control.addEventListener('input',()=>{set(type==='number'?(control.value===''?NaN:Number(control.value)):control.value);change();});return control;
 }
 function checkbox(parent,id,label,value,set,{path,refresh=false}={}){
  const wrapper=siteNode('div',undefined,{class:'editor-check'}),control=siteNode('input',undefined,{id,type:'checkbox'});control.checked=value;if(path)control.dataset.validationPath=path;
  wrapper.append(control,siteNode('label',label,{for:id}));parent.append(wrapper);
  control.addEventListener('change',()=>{set(control.checked);change({refresh,focusId:id});});return control;
 }
 function select(parent,id,label,value,options,set,{path,refresh=false}={}){
  const wrapper=siteNode('div',undefined,{class:'editor-field'});
  const choices=()=> (typeof options==='function'?options():options).map(([key,text,disabled=false])=>({value:key,label:text,disabled}));
  const control=createPinkySelect(document,{id,label,value,options:choices(),path});selectControls.add(control);
  function updateOptions(){control.pinkySelect?.setOptions(choices());}
  if(typeof options==='function')dependentSelects.push({control,updateOptions});
  wrapper.append(siteNode('label',label,{for:id}),control);parent.append(wrapper);
  control.addEventListener('change',()=>{set(control.value);change({refresh,focusId:id});});return control;
 }
 function disposeControls(root){
  for(let index=cleanups.length-1;index>=0;index--)if(root.contains(cleanups[index].root)){cleanups[index].cleanup?.();cleanups.splice(index,1);}
  disposePinkySelects(root);
  for(const control of selectControls)if(!control.pinkySelect)selectControls.delete(control);
  for(let index=dependentSelects.length-1;index>=0;index--)if(!dependentSelects[index].control.pinkySelect)dependentSelects.splice(index,1);
 }
 function structural(parent,label,id,action,{disabled=false,focusId=id}={}){
  const button=siteButton(label,id,()=>{action();change({refresh:true,focusId});});button.disabled=disabled;parent.append(button);return button;
 }
 function compactOrder(parent,path,prefix,label){
  parent.classList.add('ux-sort-compact');parent.setAttribute('id',`${prefix}-typed-editor`);
  const expanded=expandedOrderPaths.has(path),bar=siteNode('div',undefined,{class:'ux-rich-toolbar'}),toggle=siteButton('Sắp xếp',`${prefix}-order-toggle`,()=>{
   const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));
   if(open){expandedOrderPaths.add(path);parent.classList.add('ux-order-expanded');}else{expandedOrderPaths.delete(path);parent.classList.remove('ux-order-expanded');closePinkySelects(parent);}
  });
  if(expanded)parent.classList.add('ux-order-expanded');toggle.classList.add('ux-order-toggle');toggle.setAttribute('aria-expanded',String(expanded));toggle.setAttribute('aria-controls',`${prefix}-typed-editor`);toggle.setAttribute('aria-label',`Sắp xếp ${label}`);toggle.setAttribute('data-site-view-only','');toggle.prepend(createCmsIcon('GripVertical'));bar.append(siteNode('span',label),toggle);parent.append(bar);
 }
 function runs(parent,values,path,prefix,label,{maxRuns=8,cap=100,multiline=false,nested=false}={}){
  const block=siteNode('div',undefined,{'data-validation-path':path,class:'ux-run-group'});parent.append(block);if((context.siteUx||context.formSorts)&&!nested)compactOrder(block,path,prefix,label);
  if(context.siteUx||context.formSorts)sorts.mount(block,values,path,`Sắp xếp ${label}`,(_,index)=>`Đoạn ${index+1}`);
  values.forEach((run,index)=>{
   const row=siteNode('div',undefined,{class:'run-row ux-typed-run','data-site-run-path':`${path}.${index}`});block.append(row);
   const text=input(row,`${prefix}-${index}-text`,`${label} — đoạn ${index+1}`,run.text,value=>{run.text=value;},{max:cap,multiline,path:`${path}.${index}.text`,hint:index===0?`Tối đa ${cap} ký tự cho cả nhóm.`:undefined});text.dataset.siteRunText='';
   const emphasis=select(row,`${prefix}-${index}-emphasis`,`${label} — nhấn mạnh ${index+1}`,run.emphasis??'NONE',EMPHASIS,value=>{run.emphasis=value;},{path:`${path}.${index}.emphasis`});emphasis.dataset.siteRunEmphasis='';
   const textField=text.closest('.editor-field'),textLabel=textField.querySelector('label');textField.classList.add('ux-run-text-field');
   textLabel.textContent=`Đoạn ${index+1}`;text.setAttribute('aria-label',`${label} — đoạn ${index+1}`);
   const styleField=emphasis.closest('.editor-field');styleField.classList.add('ux-run-style-field');styleField.querySelector('label').textContent='Kiểu chữ';
   const header=siteNode('div',undefined,{class:'run-field-header'});textLabel.replaceWith(header);header.append(textLabel);const caption=siteNode('div',undefined,{class:'ux-run-caption'});for(const note of [...textField.children].filter(node=>(node.getAttribute('class')??'').split(' ').some(name=>['field-hint','ux-field-counter'].includes(name))))caption.append(note);textField.append(caption);
   const remove=structural(row,`Xóa đoạn ${index+1} của ${label}`,`${prefix}-${index}-remove`,()=>sorts.remove(values,index),{disabled:values.length<=1,focusId:`${prefix}-${Math.max(0,index-1)}-text`});
   remove.classList.add('run-remove');remove.setAttribute('aria-label',remove.textContent);remove.title=remove.textContent;remove.replaceChildren(createCmsIcon('X'));
  });
  structural(block,`Thêm đoạn cho ${label}`,`${prefix}-add`,()=>values.push({text:''}),{disabled:values.length>=maxRuns,focusId:`${prefix}-${values.length}-text`});
  const sortFooter=block.querySelector(':scope > .ux-form-sort');if(sortFooter)block.append(sortFooter);
  if(context.siteUx){const preview=siteNode('div',undefined,{class:'ux-mini-preview','aria-label':`Minh họa ${label}`});const update=()=>{preview.replaceChildren(...values.map(run=>siteNode(run.emphasis==='STRONG'?'strong':'span',run.text,run.emphasis==='ACCENT'?{class:'ux-copy-accent'}:{})));};block.append(preview);block.addEventListener('input',update);block.addEventListener('change',update);update();}
 }
 function heading(parent,value,path,prefix,label,{legacy=false}={}){
  if(context.siteUx||context.formSorts){const wrapper=siteNode('div',undefined,{'data-validation-path':path,class:'ux-rich-heading'});parent.append(wrapper);parent=wrapper;compactOrder(parent,path,prefix,label);}
  if(context.siteUx||context.formSorts)sorts.mount(parent,value.lines,path,`Sắp xếp dòng ${label}`,(_,index)=>`Dòng ${index+1}`);
  value.lines.forEach((line,index)=>{
   const block=siteNode('div',undefined,{class:'heading-line ux-heading-line','data-validation-path':`${path}.lines.${index}`});block.append(siteNode('h4',(context.siteUx||context.formSorts)?`Dòng ${index+1}`:`${label} — dòng ${index+1}`,{'aria-label':`${label} — dòng ${index+1}`}));parent.append(block);
   runs(block,line,`${path}.lines.${index}`,`${prefix}-${index}`,`${label} dòng ${index+1}`,{multiline:legacy,nested:Boolean(context.siteUx||context.formSorts)});
   const remove=structural(block,`Xóa dòng ${index+1} của ${label}`,`${prefix}-${index}-remove-line`,()=>sorts.remove(value.lines,index),{disabled:value.lines.length<=1,focusId:`${prefix}-${Math.max(0,index-1)}-0-text`});if(context.siteUx||context.formSorts){remove.classList.add('ux-heading-remove');remove.setAttribute('aria-label',remove.textContent);remove.title=remove.textContent;remove.replaceChildren(createCmsIcon('Trash2'));const actions=siteNode('div',undefined,{class:'ux-heading-actions'}),addRun=block.querySelector('.ux-run-group').querySelector(':scope > button');if(addRun){addRun.setAttribute('aria-label',addRun.textContent);addRun.title=addRun.textContent;addRun.replaceChildren(createCmsIcon('Plus'));actions.append(addRun);}actions.append(remove);block.append(actions);}
  });
  structural(parent,`Thêm dòng cho ${label}`,`${prefix}-add-line`,()=>value.lines.push([{text:''}]),{disabled:value.lines.length>=3,focusId:`${prefix}-${value.lines.length}-0-text`});
  const sortFooter=parent.querySelector(':scope > .ux-form-sort');if(sortFooter)parent.append(sortFooter);
 }
 function picker(parent,prefix,label,kind,getId,setId,{path,allowedIds,slot=kind}={}){
  const catalog=context.catalog.filter(asset=>asset.status==='LEGACY_READY' && asset.kind===kind && (!allowedIds || allowedIds.includes(asset.id)));
  const mediaField=context.siteUx?siteNode('div',undefined,{class:'ux-media-field'}):parent;if(context.siteUx){parent.append(mediaField);if(typeof context.mountMediaThumbnail==='function'){const preview=siteNode('div',undefined,{class:'ux-media-thumb'});mediaField.append(preview);cleanups.push({root:preview,cleanup:context.mountMediaThumbnail(preview,getId(),{label})});}}
  const selected=siteNode('p',(context.resolveMediaAsset?.(getId())??catalog.find(asset=>asset.id===getId()))?.label??getId(),{id:`${prefix}-selected`});const mediaCopy=context.siteUx?siteNode('div',undefined,{class:'ux-media-copy'}):mediaField;if(context.siteUx)mediaField.append(mediaCopy);mediaCopy.append(selected);
  const button=siteButton(label,`${prefix}-pick`,()=>{closePinkySelects(document);const onSelect=asset=>{setId(asset.id);change({refresh:true,focusId:button.id});};closePicker=typeof context.openMediaPicker==='function'?context.openMediaPicker({kind,slot,path,allowedIds,selectedId:getId(),onSelect}):openMediaPicker({catalog,kind,selectedId:getId(),onSelect});});if(path)button.dataset.validationPath=path;mediaCopy.append(button);
 }
 function image(parent,value,path,prefix,label,{decorative=true}={}){
  const poster=typeof context.openMediaPicker==='function'&&value.derivativeRole==='POSTER';
  picker(parent,prefix,`Chọn ${label}`,poster?'VIDEO':'IMAGE',()=>value.assetId,id=>{value.assetId=id;},{path:`${path}.assetId`,slot:poster?'VIDEO_POSTER':'IMAGE'});
  input(parent,`${prefix}-alt`,`Mô tả ${label}`,value.alt,text=>{value.alt=text;},{max:300,path:`${path}.alt`,hint:decorative?'Ảnh trang trí phải có mô tả rỗng; ảnh nội dung cần mô tả có nghĩa.':'Ảnh nội dung cần mô tả có nghĩa.'});
  if(decorative)checkbox(parent,`${prefix}-decorative`,'Ảnh chỉ để trang trí',value.isDecorative,checked=>{value.isDecorative=checked;},{path:`${path}.isDecorative`});
  checkbox(parent,`${prefix}-focal-enabled`,`Đặt trọng tâm ${label}`,Boolean(value.focalPoint),checked=>{if(checked)value.focalPoint={x:.5,y:.5};else delete value.focalPoint;},{path:`${path}.focalPoint`,refresh:true});
  if(value.focalPoint){
   const horizontal=input(parent,`${prefix}-focal-x`,'Trọng tâm ngang (0–1)',value.focalPoint.x,number=>{value.focalPoint.x=number;},{type:'number',min:0,maxValue:1,step:.01,path:`${path}.focalPoint.x`}),vertical=input(parent,`${prefix}-focal-y`,'Trọng tâm dọc (0–1)',value.focalPoint.y,number=>{value.focalPoint.y=number;},{type:'number',min:0,maxValue:1,step:.01,path:`${path}.focalPoint.y`});
   if((context.siteUx||context.formSorts)&&typeof context.mountMediaThumbnail==='function'){
    const field=siteNode('div',undefined,{class:'ux-focal-control'}),surface=siteNode('button',undefined,{type:'button',class:'ux-focal-surface','aria-label':`Chọn trọng tâm ${label}. Dùng phím mũi tên để điều chỉnh.`}),media=siteNode('span',undefined,{class:'ux-focal-media'}),point=siteNode('span',undefined,{class:'ux-focal-point','aria-hidden':'true'});
    const stage=siteNode('div',undefined,{class:'ux-focal-stage'}),asset=context.resolveMediaAsset?.(value.assetId),hasDimensions=asset?.width>0&&asset?.height>0;if(hasDimensions)stage.style.aspectRatio=`${asset.width} / ${asset.height}`;surface.disabled=!hasDimensions;media.setAttribute('inert','');point.append(createCmsIcon('Crosshair'));surface.append(point);stage.append(media,surface);field.append(siteNode('p',hasDimensions?'Bấm vào ảnh hoặc dùng phím mũi tên để đặt trọng tâm.':'Chưa có kích thước ảnh để đặt trọng tâm trực quan. Dùng tọa độ ngang và dọc.'),stage);parent.append(field);cleanups.push({root:field,cleanup:context.mountMediaThumbnail(media,value.assetId,{label,slot:poster?'VIDEO_POSTER':'IMAGE'})});
    const reflect=()=>{point.style.left=`${value.focalPoint.x*100}%`;point.style.top=`${value.focalPoint.y*100}%`;};
    const place=(x,y)=>{if(surface.disabled||surface.matches(':disabled'))return;value.focalPoint.x=Math.round(Math.max(0,Math.min(1,x))*100)/100;value.focalPoint.y=Math.round(Math.max(0,Math.min(1,y))*100)/100;horizontal.value=String(value.focalPoint.x);vertical.value=String(value.focalPoint.y);reflect();change();surface.dispatchEvent(new Event('input',{bubbles:true}));};
    surface.addEventListener('click',event=>{if(!event.detail)return;const bounds=surface.getBoundingClientRect();if(bounds.width&&bounds.height)place((event.clientX-bounds.left)/bounds.width,(event.clientY-bounds.top)/bounds.height);});
    surface.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();const step=event.shiftKey ? 0.1 : 0.01;place(value.focalPoint.x+(event.key==='ArrowRight'?step:event.key==='ArrowLeft'?-step:0),value.focalPoint.y+(event.key==='ArrowDown'?step:event.key==='ArrowUp'?-step:0));});horizontal.addEventListener('input',reflect);vertical.addEventListener('input',reflect);reflect();
   }
  }
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
 function move(list,index,offset){sorts.move(list,index,offset);}
 return {sortList:(parent,values,path,label,getLabel)=>(context.siteUx||context.formSorts)?sorts.mount(parent,values,path,label,getLabel):null,setDisabled:value=>sorts.setDisabled(value),remove:(values,index)=>sorts.remove(values,index),group,input,checkbox,select,structural,runs,heading,picker,image,action,sectionOptions,move,change,disposeControls,refreshReferences(){for(let index=dependentSelects.length-1;index>=0;index--){const entry=dependentSelects[index];if(entry.control.isConnected)entry.updateOptions();else{entry.control.pinkySelect?.destroy();selectControls.delete(entry.control);dependentSelects.splice(index,1);}}},dispose(){sorts.destroy();for(const entry of cleanups.splice(0))entry.cleanup?.();closePicker?.();closePicker=null;for(const control of selectControls)control.pinkySelect?.destroy();selectControls.clear();dependentSelects.length=0;}};
}

export function mountSiteSettings(container,{content,context,onChange,includeContact=true}){
 let disposed=false,selectedTab='site-settings-header';let tabs;const illustrationCleanups=[];
 function clearIllustrations(){for(const cleanup of illustrationCleanups.splice(0))cleanup?.();}
 function illustrate(panel,kind,fields){
  const layout=siteNode('div',undefined,{class:'ux-settings-layout'}),surface=siteNode('div',undefined,{class:'ux-settings-surface'}),aside=siteNode('aside',undefined,{class:'ux-settings-context','aria-label':`Minh họa ${kind==='header'?'Đầu trang':kind==='hero'?'Hero':'SEO và chia sẻ'} chưa lưu`});
  surface.append(...fields);layout.append(surface,aside);panel.append(layout);
  const text=siteNode('div',undefined,{class:'ux-settings-context-copy'}),media=siteNode('div',undefined,{class:'ux-settings-context-media'});
  aside.dataset.contextKind=kind;
  aside.append(siteNode('p',`${kind==='header'?'ĐẦU TRANG':kind==='hero'?'HERO':'SEO & CHIA SẺ'} · XEM NHANH`,{class:'ux-context-label'}),text,siteNode('p','Minh họa phiên biên tập chưa lưu.',{class:'ux-context-note'}));
  let mountedId=null,cleanup=null;illustrationCleanups.push(()=>cleanup?.());
  const rich=runs=>runs.map(run=>siteNode(run.emphasis==='STRONG'?'strong':'span',run.text,run.emphasis==='ACCENT'?{class:'ux-copy-accent'}:{}));
  const update=()=>{
   const image=kind==='header'?content.settings.brand.logo:kind==='hero'?content.hero.image:content.seo.ogImage;
   if(mountedId!==image.assetId){cleanup?.();media.replaceChildren();mountedId=image.assetId;cleanup=context.mountMediaThumbnail?.(media,image.assetId,{label:kind==='header'?content.settings.brand.name:kind==='hero'?'Ảnh Hero':'Ảnh chia sẻ'});}
   media.style.setProperty('--context-focal-x',`${(image.focalPoint?.x??.5)*100}%`);media.style.setProperty('--context-focal-y',`${(image.focalPoint?.y??.5)*100}%`);
   // Keep the authenticated media host alive when only adjacent copy changes.
   media.remove();text.replaceChildren();
   if(kind==='header'){text.append(media,siteNode('p',content.settings.header.descriptor),siteNode('p',content.settings.nav.map(item=>item.label).join(' · '),{class:'ux-context-menu'}),siteNode('span',content.settings.header.ctaLabel,{class:'ux-context-action ux-context-action-primary'}),siteNode('p',content.settings.brand.tagline,{class:'ux-context-footnote'}));}
   else if(kind==='hero'){text.append(siteNode('p',content.hero.eyebrow,{class:'ux-context-eyebrow'}));const title=siteNode('div',undefined,{class:'ux-context-heading'});for(const line of content.hero.heading.lines){const row=siteNode('div');row.append(...rich(line));title.append(row);}const description=siteNode('p');description.append(...rich(content.hero.description));text.append(title,media,description,siteNode('span',content.hero.primaryAction.label,{class:'ux-context-action ux-context-action-primary'}));if(content.hero.secondaryAction)text.append(siteNode('span',content.hero.secondaryAction.label,{class:'ux-context-action'}));text.append(siteNode('p',content.hero.footnote,{class:'ux-context-footnote'}),siteNode('p',content.hero.note));}
   else{const search=siteNode('div',undefined,{class:'ux-context-search'}),social=siteNode('div',undefined,{class:'ux-context-social'}),socialCopy=siteNode('div',undefined,{class:'ux-context-social-copy'});search.append(siteNode('strong',content.seo.title),siteNode('p',content.seo.description));socialCopy.append(siteNode('h3',content.seo.ogTitle),siteNode('p',content.seo.ogDescription));social.append(media,socialCopy);text.append(siteNode('h4','Kết quả tìm kiếm')); text.append(search,siteNode('h4','Chia sẻ mạng xã hội'),social);}
  };surface.addEventListener('input',update);surface.addEventListener('change',update);update();
 }
 const tools=createSiteFieldTools({content,context,onChange,redraw});
 function redraw(focusId=document.activeElement?.id){
  if(disposed)return;clearIllustrations();tools.disposeControls(container);container.replaceChildren();
  if(context.siteUx)container.classList.add('ux-settings-editor');
  const navigation=siteNode('nav',undefined,{'aria-label':'Cài đặt Header, Hero và SEO',class:'site-section-navigation'});
  for(const [id,label] of [['site-header-fields','Đầu trang'],['site-hero-fields','Hero'],['site-seo-fields','SEO']]){const link=siteNode('a',label,{href:`#${id}`});navigation.append(link);}container.append(navigation);
  const header=tools.group(container,context.siteUx?'Thương hiệu':'Đầu trang và thương hiệu','site-header-fields');
  if(context.siteUx)header.append(siteNode('p','Logo và thông điệp được dùng chung ở đầu trang và chân trang.',{class:'cms-hint'}));
  header.tabIndex=-1;
  const headerPair=context.siteUx?siteNode('div',undefined,{class:'ux-settings-pair'}):header;if(context.siteUx)header.append(headerPair);
  tools.input(headerPair,'site-header-descriptor','Mô tả đầu trang',content.settings.header.descriptor,value=>{content.settings.header.descriptor=value;},{max:120,path:'settings.header.descriptor'});
  tools.input(headerPair,'site-header-cta','Nhãn nút đầu trang',content.settings.header.ctaLabel,value=>{content.settings.header.ctaLabel=value;},{max:80,path:'settings.header.ctaLabel'});
  header.append(siteNode('p',`Tên thương hiệu: ${content.settings.brand.name}`));
  tools.image(header,content.settings.brand.logo,'settings.brand.logo','site-brand-logo','logo thương hiệu');
  if(context.siteUx)header.append(headerPair);
  tools.input(header,'site-brand-tagline','Thông điệp thương hiệu',content.settings.brand.tagline,value=>{content.settings.brand.tagline=value;},{max:300,path:'settings.brand.tagline'});
  const nav=tools.group(container,'Menu website','site-nav-fields','settings.nav');
  tools.sortList(nav,content.settings.nav,'settings.nav','Sắp xếp menu',item=>item.label||SITE_SECTION_LABELS[item.sectionId]);
  content.settings.nav.forEach((item,index)=>{
   const row=siteNode('div',undefined,{class:'heading-line ux-settings-nav-row','data-site-nav-index':String(index),'data-site-nav-id':item.sectionId,'data-validation-path':`settings.nav.${index}`});nav.append(row);
   tools.select(row,`site-nav-${index}-section`,`${index+1}. Mục menu`,item.sectionId,()=>tools.sectionOptions(NAV_SECTIONS,item.sectionId),value=>{item.sectionId=value;},{path:`settings.nav.${index}.sectionId`,refresh:true});
   tools.input(row,`site-nav-${index}-label`,`${index+1}. Nhãn menu`,item.label,value=>{item.label=value;},{max:80,path:`settings.nav.${index}.label`});
   if(context.siteUx)row.prepend(row.lastElementChild);
   if(!context.siteUx){
   tools.structural(row,'Lên',`site-nav-${index}-up`,()=>tools.move(content.settings.nav,index,-1),{disabled:index===0,focusId:`site-nav-${Math.max(0,index-1)}-label`});
   tools.structural(row,'Xuống',`site-nav-${index}-down`,()=>tools.move(content.settings.nav,index,1),{disabled:index===content.settings.nav.length-1,focusId:`site-nav-${index+1}-label`});
   }
   const remove=tools.structural(row,'Bỏ mục khỏi menu',`site-nav-${index}-remove`,()=>tools.remove(content.settings.nav,index),{focusId:'site-nav-add'});
   if(context.siteUx){remove.setAttribute('aria-label',`Bỏ ${item.label} khỏi menu`);remove.replaceChildren(createCmsIcon('Trash2'));}
  });
  const available=()=>tools.sectionOptions(NAV_SECTIONS).filter(([id])=>!content.settings.nav.some(value=>value.sectionId===id));
  tools.structural(nav,'Thêm mục menu','site-nav-add',()=>{const [sectionId,label]=available()[0];content.settings.nav.push({sectionId,label});},{disabled:content.settings.nav.length>=6 || !available().length,focusId:`site-nav-${content.settings.nav.length}-label`});
  const hero=tools.group(container,'Hero của website','site-hero-fields');hero.tabIndex=-1;
  tools.input(hero,'site-hero-eyebrow','Dòng giới thiệu',content.hero.eyebrow,value=>{content.hero.eyebrow=value;},{max:120,path:'hero.eyebrow'});
  tools.heading(hero,content.hero.heading,'hero.heading','site-hero-heading','Tiêu đề Hero',{legacy:true});
  tools.runs(hero,content.hero.description,'hero.description','site-hero-description','Mô tả Hero',{maxRuns:12,cap:1000,multiline:true});
  tools.image(hero,content.hero.image,'hero.image','site-hero-image','ảnh Hero');
  const actions=context.siteUx?tools.group(container,'Nút hành động','site-hero-action-fields'):hero;
  tools.action(actions,content.hero.primaryAction,'hero.primaryAction','site-primaryAction','Nút chính',value=>{content.hero.primaryAction=value;});
  tools.checkbox(actions,'site-secondary-enabled','Hiện nút phụ',Boolean(content.hero.secondaryAction),checked=>{if(checked)content.hero.secondaryAction={kind:'SECTION',sectionId:'contact',label:'Liên hệ'};else delete content.hero.secondaryAction;},{path:'hero.secondaryAction',refresh:true});
  if(content.hero.secondaryAction)tools.action(actions,content.hero.secondaryAction,'hero.secondaryAction','site-secondaryAction','Nút phụ',value=>{content.hero.secondaryAction=value;});
  tools.input(actions,'site-hero-footnote','Chú thích Hero',content.hero.footnote,value=>{content.hero.footnote=value;},{max:240,multiline:true,path:'hero.footnote'});
  tools.input(actions,'site-hero-note','Ghi chú Hero',content.hero.note,value=>{content.hero.note=value;},{max:300,multiline:true,path:'hero.note'});
  const seo=tools.group(container,'SEO và chia sẻ','site-seo-fields');seo.tabIndex=-1;
  for(const [key,label,max] of [['title','Tiêu đề SEO',80],['description','Mô tả SEO',200],['ogTitle','Tiêu đề chia sẻ',80],['ogDescription','Mô tả chia sẻ',200]])tools.input(seo,`site-seo-${key}`,label,content.seo[key],value=>{content.seo[key]=value;},{max,multiline:key.includes('escription'),path:`seo.${key}`});
  tools.image(seo,content.seo.ogImage,'seo.ogImage','site-seo-image','ảnh chia sẻ',{decorative:false});
  // Preserve the task11 contact foundation until the Contact component takes ownership.
  if(includeContact){const contact=tools.group(container,'Thông tin liên hệ','site-contact-settings');for(const [key,label,max] of [['email','Email nhận brief',254],['personName','Người liên hệ',120],['personPhoneE164','Số điện thoại liên hệ (+84…)',16],['personPhoneLabel','Nhãn điện thoại liên hệ',80],['officePhoneE164','Số điện thoại văn phòng (+84…)',16],['officePhoneLabel','Nhãn điện thoại văn phòng',80],['facebookUrl','Địa chỉ Facebook',2048]])tools.input(contact,`site-contact-${key}`,label,content.settings.contact[key],value=>{content.settings.contact[key]=value;},{max,path:`settings.contact.${key}`});}
  if(context.siteUx){
   navigation.remove();tabs=createFormTabs(container,{label:'Đầu trang, Hero và SEO',selected:selectedTab,onSelect:id=>{selectedTab=id;},tabs:[{id:'site-settings-header',label:'Đầu trang'},{id:'site-settings-hero',label:'Hero'},{id:'site-settings-seo',label:'SEO & chia sẻ'}]});
   renderSiteSourceBindings(tools,header,content,context,'settings/brand/facts','site-brand');
   renderSiteSourceBindings(tools,actions,content,context,'hero/facts','site-hero');
   renderSiteSourceBindings(tools,seo,content,context,'seo/facts','site-seo');
   illustrate(tabs.panel('site-settings-header'),'header',[header,nav]);
   illustrate(tabs.panel('site-settings-hero'),'hero',[hero,actions]);
   illustrate(tabs.panel('site-settings-seo'),'seo',[seo]);
  }
  if(focusId){const target=document.getElementById(focusId);tabs?.reveal(target);target?.focus();}
 }
 redraw();return {revealValidationPath(path){const target=[...container.querySelectorAll('[data-validation-path]')].find(el=>el.dataset.validationPath===path||el.dataset.validationPath.startsWith(path+'.'));if(target){tabs?.reveal(target);return target;}return false;},refreshReferences(){tools.refreshReferences();const add=container.querySelector('#site-nav-add');if(add)add.disabled=content.settings.nav.length>=6 || !tools.sectionOptions(NAV_SECTIONS).some(([id])=>!content.settings.nav.some(item=>item.sectionId===id));},setDisabled(value){tools.setDisabled(value);},destroy(){disposed=true;clearIllustrations();tools.dispose();container.classList.remove('ux-settings-editor');container.replaceChildren();}};
}

export function mountSiteClients(container,{content,context,onChange}){
 if(context.siteUx)return mountSiteClientsUx(container,{content,context,onChange});
 let disposed=false,newId='',newName='';let newImage={assetId:'',alt:'',isDecorative:false};const tools=createSiteFieldTools({content,context,onChange,redraw});
 function redraw(focusId=document.activeElement?.id){
  if(disposed)return;tools.disposeControls(container);container.replaceChildren();const index=content.sections.findIndex(section=>section.sectionId==='clients'),section=content.sections[index],path=`sections.${index}`;
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
 redraw();return {hasPendingInput(){return Boolean(newId || newName || newImage.assetId || newImage.alt || newImage.isDecorative || newImage.focalPoint);},setDisabled(value){tools.setDisabled(value);},destroy(){disposed=true;tools.dispose();container.replaceChildren();}};
}

function mountSiteClientsUx(container,{content,context,onChange}){
 let disposed=false,disabled=false,currentId=null,adding=false;const thumbnails=[];
 const tools=createSiteFieldTools({content,context,onChange,redraw});const pendingChanged=()=>{if(context.onPendingChange)context.onPendingChange();else onChange();};
 const dialog=createRecordDialog({title:'Chi tiết khách hàng',render(body,scratch){
  let localTabs,selectedTab='site-client-info-tab';const logo=scratch.logo,localTools=createSiteFieldTools({content,context,onChange:pendingChanged,redraw:draw});
  function draw(focusId=document.activeElement?.id){
   localTools.disposeControls(body);body.replaceChildren();body.classList.add('ux-client-detail');
   const fields=localTools.group(body,'Thông tin khách hàng','site-client-detail'),path=currentId?`settings.clientLogos.${content.settings.clientLogos.findIndex(value=>value.id===currentId)}`:'settings.clientLogos.new';
   const sources=siteNode('div');
   const drawSources=()=>{localTools.disposeControls(sources);sources.replaceChildren();renderSiteSourceBindings(localTools,sources,scratch,context,`clientLogos/${logo.id}/facts`,'site-client-detail');};
   localTools.input(fields,'site-client-detail-id','Mã ổn định',logo.id,value=>{
    logo.id=value;
    // The dialog owns one cloned binding. A new ID only renames that scratch path.
    for(const binding of scratch.claimSources)binding.claimPath=`clientLogos/${value}/facts`;
    drawSources();
   },{readonly:!adding,max:100,path:`${path}.id`,hint:'Mã đã lưu được giữ nguyên. Có thể ẩn logo thay vì xóa.'});
   localTools.input(fields,'site-client-detail-name','Tên khách hàng',logo.clientName,value=>{logo.clientName=value;},{max:120,path:`${path}.clientName`});
   localTools.checkbox(fields,'site-client-detail-visible','Hiện logo',logo.isVisible,value=>{logo.isVisible=value;},{path:`${path}.isVisible`});
   const image=localTools.group(body,'Logo khách hàng','site-client-detail-media');localTools.image(image,logo.image,`${path}.image`,'site-client-detail-image','logo khách hàng');
   drawSources();
   localTabs=createFormTabs(body,{label:'Chi tiết khách hàng',selected:selectedTab,onSelect:id=>{selectedTab=id;},tabs:[{id:'site-client-info-tab',label:'Thông tin'},{id:'site-client-image-tab',label:'Logo'},{id:'site-client-source-tab',label:'Nguồn'}]});
   localTabs.panel('site-client-info-tab').append(fields);localTabs.panel('site-client-image-tab').append(image);localTabs.panel('site-client-source-tab').append(sources);
   const target=document.getElementById(focusId);if(target&&body.contains(target)){localTabs.reveal(target);target.focus();}
  }
  draw();return {destroy(){localTools.dispose();},setDisabled:value=>localTools.setDisabled(value),revealValidationPath(path){const target=[...body.querySelectorAll('[data-validation-path]')].find(node=>node.dataset.validationPath===path||node.dataset.validationPath.startsWith(path+'.'));if(target){localTabs.reveal(target);if(!target.matches('input,textarea,button,select'))target.tabIndex=-1;target.focus();return target;}return false;}};
 },onApply(scratch){
  if(disabled)return false;
  const logo=scratch.logo,existing=content.settings.clientLogos.find(value=>value.id===currentId),asset=context.resolveMediaAsset(logo.image.assetId);
  if(!stableIdSchema.safeParse(logo.id).success||!logo.clientName.trim()||logo.clientName.length>120||adding&&content.settings.clientLogos.some(value=>value.id===logo.id)||!adding&&(!existing||logo.id!==currentId))throw Error('Hãy nhập mã duy nhất và tên khách hàng hợp lệ.');
  if(!asset||asset.kind!=='IMAGE'||!['READY','LEGACY_READY'].includes(asset.status)||asset.isArchived|| (logo.image.isDecorative?logo.image.alt!=='':!logo.image.alt.trim()))throw Error('Hãy chọn ảnh sẵn sàng và nhập mô tả phù hợp.');
  if(adding){if(content.settings.clientLogos.length>=12)throw Error('Tối đa 12 logo, gồm cả logo đang ẩn.');content.settings.clientLogos.push(structuredClone(logo));}else Object.assign(existing,structuredClone(logo));
  // Apply only this logo's fact binding. Preserve every other current binding,
  // including edits made elsewhere while this dialog was open.
  const claimPath=`clientLogos/${logo.id}/facts`,binding=scratch.claimSources.find(value=>value.claimPath===claimPath),index=content.claimSources.findIndex(value=>value.claimPath===claimPath);
  if(binding){if(index<0)content.claimSources.push(structuredClone(binding));else content.claimSources[index]=structuredClone(binding);}
  else if(index>=0)content.claimSources.splice(index,1);
  onChange();redraw();
 },onPendingChange:pendingChanged});
 function open(id){
  if(dialog.close()===false)return;currentId=id;adding=!id;
  const logo=id?content.settings.clientLogos.find(value=>value.id===id):{id:'',clientName:'',image:{assetId:'',alt:'',isDecorative:false},isVisible:true};if(!logo)return;
  dialog.setTitle(adding?'Thêm khách hàng':'Biên tập khách hàng',adding?'Khách hàng mới chỉ được thêm sau khi Áp dụng.':logo.clientName);
  // createRecordDialog clones the entire wrapper for dirty tracking and Cancel.
  dialog.open({logo,claimSources:content.claimSources.filter(binding=>binding.claimPath===`clientLogos/${logo.id}/facts`)});dialog.setDisabled(disabled);
 }
 function redraw(){
  if(disposed)return;for(const cleanup of thumbnails.splice(0))cleanup?.();tools.disposeControls(container);container.replaceChildren();container.classList.add('ux-clients-editor');
  const index=content.sections.findIndex(section=>section.sectionId==='clients'),section=content.sections[index],path=`sections.${index}`;
  const heading=tools.group(container,'Nội dung dải khách hàng','site-clients-fields');heading.classList.add('ux-clients-heading');
  const headingFields=siteNode('div',undefined,{class:'ux-clients-heading-fields'}),visibility=siteNode('div',undefined,{class:'ux-clients-heading-visibility'});heading.append(headingFields,visibility);
  tools.runs(headingFields,section.heading,`${path}.heading`,'site-clients-heading','Tiêu đề Khách hàng');
  tools.checkbox(visibility,'site-clients-visible','Hiện mục Khách hàng',section.isVisible,value=>{section.isVisible=value;},{path:`${path}.isVisible`});
  const toolbar=siteNode('div',undefined,{class:'ux-toolbar ux-clients-toolbar'}),caption=siteNode('div'),add=siteButton('Thêm khách hàng','site-client-add',()=>open(null));
  caption.append(siteNode('h3',`Logo khách hàng · ${content.settings.clientLogos.length}/12`),siteNode('p','Kéo tay nắm để đổi thứ tự trên website. Logo đang ẩn vẫn được giữ.'));
  add.prepend(createCmsIcon('Plus'));add.disabled=disabled||content.settings.clientLogos.length>=12;toolbar.append(caption,add);container.append(toolbar);
  const grid=siteNode('div',undefined,{class:'ux-logo-grid'});container.append(grid);
  for(const [position,logo] of content.settings.clientLogos.entries()){
   const card=siteNode('article',undefined,{class:'ux-logo-card','data-site-client-id':logo.id,'data-validation-path':`settings.clientLogos.${position}`}),thumb=siteNode('div',undefined,{class:'ux-client-thumbnail'}),details=siteNode('div',undefined,{class:'ux-client-card-content'}),actions=siteNode('div',undefined,{class:'ux-client-card-actions'});
   card.append(thumb,details);details.append(siteNode('h4',logo.clientName));
   if(context.mountMediaThumbnail)thumbnails.push(context.mountMediaThumbnail(thumb,logo.image.assetId,{label:logo.clientName}));
   const edit=siteButton('Biên tập',`site-client-${logo.id}-edit`,()=>open(logo.id));edit.prepend(createCmsIcon('Pencil'));edit.setAttribute('data-site-view-only','');
   const visibility=siteButton(logo.isVisible?'Hiện':'Ẩn',`site-client-${logo.id}-visible`,()=>{if(disabled)return;logo.isVisible=!logo.isVisible;tools.change({refresh:true,focusId:`site-client-${logo.id}-visible`});});
   visibility.prepend(createCmsIcon(logo.isVisible?'Eye':'EyeOff'));visibility.setAttribute('aria-label',`${logo.isVisible?'Ẩn':'Hiện'} ${logo.clientName}`);visibility.setAttribute('aria-pressed',String(logo.isVisible));visibility.dataset.validationPath=`settings.clientLogos.${position}.isVisible`;visibility.disabled=disabled;
   actions.append(edit,visibility);details.append(actions);grid.append(card);
  }
  if(!content.settings.clientLogos.length)grid.append(siteNode('p','Chưa có logo khách hàng. Chọn Thêm khách hàng để chọn logo từ thư viện.',{class:'ux-clients-empty',role:'status'}));
  tools.sortList(grid,content.settings.clientLogos,'settings.clientLogos','Thứ tự logo',logo=>logo.clientName);
 }
 redraw();return {hasPendingInput:()=>dialog.hasPendingInput(),revealValidationPath(path){
  if(path.startsWith('claimSources.')){const binding=content.claimSources[Number(path.split('.')[1])],id=binding?.claimPath.match(/^clientLogos\/([^/]+)\/facts$/)?.[1];if(id&&content.settings.clientLogos.some(logo=>logo.id===id)){open(id);return dialog.revealValidationPath('claimSources');}return false;}
  if(!path.startsWith('settings.clientLogos.'))return false;const record=content.settings.clientLogos[Number(path.split('.')[2])];if(record){open(record.id);return dialog.revealValidationPath(path);}return false;
 },setDisabled(value){disabled=value;tools.setDisabled(value);dialog.setDisabled(value);const add=container.querySelector('#site-client-add');if(add)add.disabled=value||content.settings.clientLogos.length>=12;for(const control of container.querySelectorAll('[data-site-client-id] button[data-validation-path]'))control.disabled=value;},destroy(){disposed=true;dialog.destroy();tools.dispose();for(const cleanup of thumbnails.splice(0))cleanup?.();container.classList.remove('ux-clients-editor');container.replaceChildren();}};
}
