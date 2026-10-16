import {validateContent,MAX_BODY_BYTES} from '../contracts/hero.mjs';
import {openMediaPicker} from './media-picker.mjs';
import {createPinkySelect,closePinkySelects,disposePinkySelects} from './pinky-select.mjs';

const emphasisOptions=[['NONE','Bình thường'],['STRONG','Đậm'],['ACCENT','Nhấn màu']];
const kinds=[['SECTION','Đi đến mục'],['SHOWREEL','Xem showreel'],['CREDENTIAL','Hồ sơ năng lực']];
const sections=[['work','Dự án'],['services','Dịch vụ'],['about','Giới thiệu'],['ip-studio','IP Studio'],['contact','Liên hệ']];
function node(tag,text,attributes={}){const element=document.createElement(tag);if(text!==undefined)element.textContent=text;for(const [name,value] of Object.entries(attributes))element.setAttribute(name,value);return element;}
function button(label,id,action){const element=node('button',label,{type:'button'});if(id)element.id=id;element.addEventListener('click',action);return element;}

/** Private state belongs to one mounted session and is never persisted. */
export function mountHeroEditor(container,{apiFetch,session}) {
  let draft=null,content=null,dirty=false,pending=false,disposed=false,intent=null,closePicker=null,selectedGroup='hero';
  const accordionState=new Map([['description',true],['notes',false]]);
  const editable=['EDITOR','OWNER'].includes(session.role);
  const root=node('section',undefined,{id:'hero-editor',class:'cms-editor-card','data-cms-pane':'edit','aria-label':'Biên tập Hero và SEO'});
  const heading=node('h2','Biên tập nội dung');
  const cardHead=node('div',undefined,{class:'cms-card-head'}),headingCopy=node('div');
  headingCopy.append(heading);
  cardHead.append(headingCopy,node('span','BẢN NHÁP',{class:'cms-badge'}));
  const navigation=node('nav',undefined,{class:'cms-section-nav','aria-label':'Các nhóm nội dung'});
  for(const [key,label] of [['hero','Hero'],['actions','Nút hành động'],['images','Ảnh'],['seo','SEO']]){
    const tab=button(label,`hero-group-${key}`,()=>selectGroup(key));tab.dataset.heroGroup=key;tab.setAttribute('aria-controls',`hero-fields-${key}`);navigation.append(tab);
  }
  const revision=node('p',undefined,{id:'draft-revision'});
  const dirtyLabel=node('p','', {id:'draft-dirty'});
  const status=node('p','Đang tải bản nháp…',{id:'editor-status',class:'cms-card-subtitle',role:'status','aria-live':'polite'});headingCopy.append(status);
  const errors=node('div',undefined,{id:'editor-errors',role:'alert'});
  const form=node('form',undefined,{id:'hero-form'});form.noValidate=true;
  const fields=node('fieldset');
  const actions=node('div',undefined,{class:'editor-actions'});
  const save=button('Lưu bản nháp','save-draft',()=>void saveDraft());
  const reload=button('Tải lại bản nháp','reload-draft',()=>{if(canLeave())void load();});
  form.addEventListener('submit',event=>{event.preventDefault();void saveDraft();});
  form.append(fields);actions.append(save,reload);root.append(cardHead,navigation,revision,dirtyLabel,errors,form,actions);container.append(root);
  function canLeave(){return !dirty || window.confirm('Bạn có thay đổi chưa lưu. Bỏ thay đổi này?');}
  function beforeUnload(event){if(dirty){event.preventDefault();event.returnValue='';}}
  window.addEventListener('beforeunload',beforeUnload);
  function updateState(){
    revision.textContent=draft?`Phiên bản: ${draft.revision}`:'';dirtyLabel.textContent=dirty?'Có thay đổi chưa lưu.':'Đã lưu.';
    fields.disabled=!editable || pending || !content;save.disabled=!editable || pending || !dirty;reload.disabled=pending;
  }
  function emitContent(){if(content)document.dispatchEvent(new CustomEvent('cms:content',{detail:{content:structuredClone(draft.content),catalog:draft.catalog,revision:draft.revision,dirty}}));}
  function clearErrors(){
    errors.replaceChildren();for(const field of fields.querySelectorAll('[aria-invalid]')){field.removeAttribute('aria-invalid');field.removeAttribute('aria-describedby');}
    for(const message of fields.querySelectorAll('.field-error'))message.remove();
  }
  function changed(){dirty=true;intent=null;clearErrors();updateState();emitContent();}
  function fieldPath(id){
    const paths={'hero-eyebrow':'hero.eyebrow','hero-footnote':'hero.footnote','hero-note':'hero.note','hero-image-alt':'hero.image.alt','hero-image-decorative':'hero.image.isDecorative','hero-focal-enabled':'hero.image.focalPoint','hero-focal-x':'hero.image.focalPoint.x','hero-focal-y':'hero.image.focalPoint.y','seo-title':'seo.title','seo-description':'seo.description','seo-og-title':'seo.ogTitle','seo-og-description':'seo.ogDescription','seo-image-alt':'seo.ogImage.alt','seo-focal-enabled':'seo.ogImage.focalPoint','seo-focal-x':'seo.ogImage.focalPoint.x','seo-focal-y':'seo.ogImage.focalPoint.y','secondary-enabled':'hero.secondaryAction'};
    if(paths[id])return paths[id];
    const action=/^(primaryAction|secondaryAction)-(kind|label|section)$/.exec(id);
    return action?`hero.${action[1]}.${action[2]==='section'?'sectionId':action[2]}`:'';
  }
  function registerField(control,path=fieldPath(control.id)){if(path)control.dataset.validationPath=path;}
  function showFieldErrors(fieldErrors){
    clearErrors();let sequence=0;
    for(const [rawPath,messages] of Object.entries(fieldErrors)){
      const path=rawPath.replace(/^patch\./,'');
      const controls=[...fields.querySelectorAll('[data-validation-path]')].filter(control=>control.dataset.validationPath===path || control.dataset.validationPath.startsWith(`${path}.`));
      const label=controls[0]?.getAttribute('aria-label')??controls[0]?.closest('.editor-field,.editor-check')?.querySelector('label')?.textContent??controls[0]?.textContent??'Nội dung';
      const summary=node('p');if(controls.length){const target=button(`${label}: ${messages.join(' ')}`,undefined,()=>focusField(controls[0]));target.className='cms-error-link';summary.append(target);}else summary.textContent=`${label}: ${messages.join(' ')}`;errors.append(summary);
      for(const control of controls){
        const id=`field-error-${sequence++}`;const message=node('p',messages.join(' '),{id,class:'field-error'});
        control.setAttribute('aria-invalid','true');control.setAttribute('aria-describedby',id);const wrapper=control.closest('.editor-field,.editor-check');if(wrapper)wrapper.append(message);else control.after(message);
      }
    }
    focusField(fields.querySelector('[aria-invalid=true]'));
  }
  function selectGroup(key){
    selectedGroup=key;closePinkySelects();
    for(const section of fields.querySelectorAll('[data-hero-section]'))section.hidden=section.dataset.heroSection!==key;
    for(const tab of navigation.querySelectorAll('[data-hero-group]'))tab.setAttribute('aria-pressed',String(tab.dataset.heroGroup===key));
  }
  function focusField(control){
    if(!control)return;const section=control.closest('[data-hero-section]');if(section)selectGroup(section.dataset.heroSection);
    for(let parent=control.parentElement;parent && parent!==fields;parent=parent.parentElement){if(parent.tagName==='DETAILS')parent.open=true;}
    document.dispatchEvent(new CustomEvent('cms:show-work',{detail:{pane:'edit'}}));control.focus();
  }
  function group(key,title,number,hint){
    const section=node('section',undefined,{id:`hero-fields-${key}`,class:'editor-group cms-field-group','data-hero-section':key});
    const header=node('div',undefined,{class:'cms-section-heading'}),copy=node('div');copy.append(node('p',number,{class:'cms-step-label'}),node('h3',title));header.append(copy,node('span',hint,{class:'cms-hint'}));section.append(header);fields.append(section);return section;
  }
  function accordion(parent,key,title){const details=node('details',undefined,{class:'cms-accordion','data-hero-accordion':key});details.open=accordionState.get(key);details.append(node('summary',title));const body=node('div',undefined,{class:'cms-accordion-body'});details.append(body);parent.append(details);return body;}

  function input(parent,id,label,value,onChange,{multiline=false,max,type='text',step,min}={}){
    const wrapper=node('div',undefined,{class:'editor-field'});const control=node(multiline?'textarea':'input',undefined,{id});
    if(!multiline)control.type=type;if(max)control.maxLength=max;if(step)control.step=step;if(min!==undefined)control.min=min;if(type==='number')control.max='1';
    registerField(control);control.value=String(value??'');wrapper.append(node('label',label,{for:id}),control);parent.append(wrapper);
    control.addEventListener('input',()=>{onChange(type==='number'?(control.value===''?NaN:Number(control.value)):control.value);changed();});return control;
  }
  function checkbox(parent,id,label,value,onChange){const wrapper=node('div',undefined,{class:'editor-check'});const control=node('input',undefined,{id,type:'checkbox'});registerField(control);control.checked=value;wrapper.append(control,node('label',label,{for:id}));parent.append(wrapper);control.addEventListener('change',()=>{onChange(control.checked);changed();});return control;}
  function select(parent,id,label,value,options,onChange){const wrapper=node('div',undefined,{class:'editor-field'});const control=createPinkySelect(document,{id,label,value,options:options.map(([value,label])=>({value,label}))});registerField(control);wrapper.append(node('label',label,{for:id}),control);parent.append(wrapper);control.addEventListener('change',()=>{onChange(control.value);changed();});return control;}
  function runs(parent,values,path,label,maxRuns,maxText){
    values.forEach((run,index)=>{
      const row=node('div',undefined,{class:'run-row','data-run-path':`${path}.${index}`});parent.append(row);
      const textControl=input(row,`${path.replaceAll('.','-')}-${index}-text`,`${label} — đoạn ${index+1}`,run.text,value=>{run.text=value;},{multiline:true,max:maxText});textControl.dataset.runText='';registerField(textControl,`${path}.${index}.text`);
      const emphasisControl=select(row,`${path.replaceAll('.','-')}-${index}-emphasis`,`${label} — nhấn mạnh ${index+1}`,run.emphasis??'NONE',emphasisOptions,value=>{run.emphasis=value;});emphasisControl.dataset.runEmphasis='';registerField(emphasisControl,`${path}.${index}.emphasis`);
      const remove=button(`Xóa đoạn ${index+1} của ${label}`,undefined,()=>{values.splice(index,1);changed();render();document.getElementById(`${path.replaceAll('.','-')}-${Math.min(index,values.length-1)}-text`)?.focus();});remove.setAttribute('aria-label',remove.textContent);remove.title=remove.textContent;remove.textContent='×';remove.disabled=values.length===1;const textField=textControl.closest('.editor-field');textField.classList.add('run-text-field');const textLabel=textField.querySelector('label');textControl.setAttribute('aria-label',textLabel.textContent);textLabel.textContent=`Đoạn ${index+1}`;const header=node('div',undefined,{class:'run-label-row'});textLabel.replaceWith(header);header.append(textLabel,remove);const styleField=emphasisControl.closest('.editor-field');styleField.classList.add('run-style-field');styleField.querySelector('label').textContent='Kiểu chữ';
    });
    const add=button(`Thêm đoạn cho ${label}`,undefined,()=>{values.push({text:'',emphasis:'NONE'});changed();render();document.getElementById(`${path.replaceAll('.','-')}-${values.length-1}-text`)?.focus();});add.disabled=values.length>=maxRuns;add.className='cms-add';add.setAttribute('aria-label',add.textContent);add.textContent='＋ Thêm đoạn';parent.append(add);
  }
  function picker(parent,prefix,label,kind,getId,setId){
    const current=node('span',draft.catalog.find(asset=>asset.id===getId())?.label??getId(),{id:`${prefix}-selected`});
    const pick=button(label,`${prefix}-pick`,()=>{closePinkySelects();closePicker=openMediaPicker({catalog:draft.catalog,kind,selectedId:getId(),onSelect:asset=>{setId(asset.id);changed();render();}});});registerField(pick,prefix==='hero-image'?'hero.image.assetId':prefix==='seo-image'?'seo.ogImage.assetId':`hero.${prefix}.assetId`);parent.append(current,pick);
  }
  function image(parent,image,prefix,title,decorative){
    picker(parent,`${prefix}-image`,`Chọn ${title}`,'IMAGE',()=>image.assetId,id=>{image.assetId=id;});
    input(parent,`${prefix}-image-alt`,`Mô tả ${title}`,image.alt,value=>{image.alt=value;},{max:300});
    if(decorative)checkbox(parent,`${prefix}-image-decorative`,'Ảnh chỉ để trang trí',image.isDecorative,value=>{image.isDecorative=value;if(value)image.alt='';render();});
    const enabled=checkbox(parent,`${prefix}-focal-enabled`,`Đặt điểm trọng tâm ${title}`,Boolean(image.focalPoint),value=>{if(value)image.focalPoint={x:.5,y:.5};else delete image.focalPoint;render();});enabled.dataset.focalToggle=prefix;
    if(image.focalPoint){input(parent,`${prefix}-focal-x`,'Điểm trọng tâm ngang (0–1)',image.focalPoint.x,value=>{image.focalPoint.x=value;},{type:'number',min:0,step:.01});input(parent,`${prefix}-focal-y`,'Điểm trọng tâm dọc (0–1)',image.focalPoint.y,value=>{image.focalPoint.y=value;},{type:'number',min:0,step:.01});}
  }
  function action(parent,key,title){
    const value=content.hero[key];if(!value)return;
    select(parent,`${key}-kind`,`${title} — loại`,value.kind,kinds,kind=>{content.hero[key]=kind==='SECTION'?{kind,sectionId:'work',label:value.label}:kind==='CREDENTIAL'?{kind,assetId:draft.catalog.find(asset=>asset.kind==='PDF')?.id??'',label:value.label}:{kind,label:value.label};render();});
    input(parent,`${key}-label`,`${title} — nhãn`,value.label,text=>{value.label=text;},{max:80});
    if(value.kind==='SECTION')select(parent,`${key}-section`,`${title} — mục`,value.sectionId,sections,id=>{value.sectionId=id;});
    if(value.kind==='CREDENTIAL')picker(parent,key,`Chọn PDF cho ${title}`,'PDF',()=>value.assetId,id=>{value.assetId=id;});
  }
  function render(){
    const focusedId=document.activeElement?.id;
    for(const details of fields.querySelectorAll('[data-hero-accordion]'))accordionState.set(details.dataset.heroAccordion,details.open);
    disposePinkySelects(fields);fields.replaceChildren();if(!content){updateState();return;}
    const hero=group('hero','Nội dung Hero','01 / NỘI DUNG','Văn bản & cách nhấn mạnh');input(hero,'hero-eyebrow','Dòng giới thiệu',content.hero.eyebrow,value=>{content.hero.eyebrow=value;},{max:120});
    content.hero.heading.lines.forEach((line,index)=>{
      const lineGroup=node('div',undefined,{class:'heading-line'}),header=node('div',undefined,{class:'cms-line-head'});header.append(node('h4',`Dòng tiêu đề ${index+1}`));lineGroup.append(header);hero.append(lineGroup);
      const remove=button(`Xóa dòng tiêu đề ${index+1}`,undefined,()=>{content.hero.heading.lines.splice(index,1);changed();render();document.getElementById(`hero-heading-lines-${Math.min(index,content.hero.heading.lines.length-1)}-0-text`)?.focus();});remove.setAttribute('aria-label',remove.textContent);remove.title=remove.textContent;remove.textContent='Xóa dòng';remove.className='cms-delete-line';remove.disabled=content.hero.heading.lines.length===1;header.append(remove);
      runs(lineGroup,line,`hero.heading.lines.${index}`,`Dòng tiêu đề ${index+1}`,8,100);
    });
    const addLine=button('Thêm dòng tiêu đề','add-heading-line',()=>{content.hero.heading.lines.push([{text:'',emphasis:'NONE'}]);changed();render();document.getElementById(`hero-heading-lines-${content.hero.heading.lines.length-1}-0-text`)?.focus();});addLine.disabled=content.hero.heading.lines.length>=3;addLine.className='cms-add';addLine.setAttribute('aria-label','Thêm dòng tiêu đề');addLine.textContent='＋ Thêm dòng tiêu đề';hero.append(addLine);
    const description=accordion(hero,'description','Mô tả Hero');runs(description,content.hero.description,'hero.description','Mô tả',12,1000);
    const notes=accordion(hero,'notes','Chú thích & ghi chú');input(notes,'hero-footnote','Chú thích',content.hero.footnote,value=>{content.hero.footnote=value;},{multiline:true,max:240});input(notes,'hero-note','Ghi chú',content.hero.note,value=>{content.hero.note=value;},{multiline:true,max:300});
    const ctas=group('actions','Nút hành động','02 / HÀNH ĐỘNG','Nhãn & đích đến');action(ctas,'primaryAction','Nút chính');checkbox(ctas,'secondary-enabled','Hiện nút phụ',Boolean(content.hero.secondaryAction),value=>{if(value)content.hero.secondaryAction={kind:'SECTION',sectionId:'contact',label:'Liên hệ'};else delete content.hero.secondaryAction;render();});action(ctas,'secondaryAction','Nút phụ');
    const images=group('images','Ảnh','03 / HÌNH ẢNH','Hero & ảnh chia sẻ');const heroImage=node('section',undefined,{class:'cms-image-fields'});heroImage.append(node('h4','Ảnh Hero'));images.append(heroImage);image(heroImage,content.hero.image,'hero','ảnh Hero',true);
    const shareImage=node('section',undefined,{class:'cms-image-fields'});shareImage.append(node('h4','Ảnh chia sẻ'));images.append(shareImage);image(shareImage,content.seo.ogImage,'seo','ảnh chia sẻ',false);
    const seo=group('seo','SEO','04 / TÌM KIẾM & CHIA SẺ','Tiêu đề & mô tả');for(const [key,label,max] of [['title','Tiêu đề SEO',80],['description','Mô tả SEO',200],['ogTitle','Tiêu đề chia sẻ',80],['ogDescription','Mô tả chia sẻ',200]])input(seo,`seo-${key.replace(/[A-Z]/g,letter=>`-${letter.toLowerCase()}`)}`,label,content.seo[key],value=>{content.seo[key]=value;},{multiline:key.includes('escription'),max});
    selectGroup(selectedGroup);updateState();if(focusedId){const focused=document.getElementById(focusedId);if(focused && !focused.closest('[hidden]'))focused.focus();}
  }
  function showError(error){
    status.textContent=error.code==='REVISION_CONFLICT'?'Bản nháp đã thay đổi. Nội dung của bạn vẫn được giữ; tải lại khi sẵn sàng.':error.code?error.message:'Không thể tải hoặc lưu nội dung. Vui lòng thử lại.';
    showFieldErrors(error.fieldErrors??{});
  }
  async function load(){
    pending=true;updateState();status.textContent='Đang tải bản nháp…';
    try{const result=await apiFetch('/api/cms/drafts/home');if(disposed)return;validateContent(result.content,result.catalog);draft=result;content=structuredClone(result.content);dirty=false;intent=null;errors.replaceChildren();status.textContent=editable?'Bạn có thể chỉnh sửa nội dung.':'Bạn có quyền xem nội dung.';render();emitContent();}
    catch(error){if(!disposed && error.name!=='AbortError')showError(error);}finally{if(!disposed){pending=false;updateState();}}
  }
  async function saveDraft(){
    if(!editable || pending || !dirty)return;
    let body;
    try{validateContent(content,draft.catalog);body=JSON.stringify({expectedRevision:draft.revision,patch:{hero:content.hero,seo:content.seo}});if(new TextEncoder().encode(body).length>MAX_BODY_BYTES)throw new Error('Nội dung vượt giới hạn cho phép.');}
    catch(error){const issues=Object.fromEntries((error.issues??[]).map(issue=>[issue.path.join('.'),['Giá trị không hợp lệ.']]));showFieldErrors(issues);status.textContent='Vui lòng kiểm tra các trường nội dung.';return;}
    if(!intent || intent.body!==body)intent={body,key:crypto.randomUUID()};
    pending=true;updateState();status.textContent='Đang lưu bản nháp…';
    try{const result=await apiFetch('/api/cms/drafts/home',{method:'PATCH',headers:{'Content-Type':'application/json','Idempotency-Key':intent.key},body:intent.body});if(disposed)return;draft={...draft,...result,content:structuredClone(content)};dirty=false;intent=null;errors.replaceChildren();status.textContent='Đã lưu bản nháp.';render();emitContent();}
    catch(error){if(!disposed && error.name!=='AbortError')showError(error);}finally{if(!disposed){pending=false;updateState();focusField(fields.querySelector('[aria-invalid=true]'));}}
  }
  void load();
  return {canLeave,destroy(){disposed=true;closePicker?.();disposePinkySelects(root);window.removeEventListener('beforeunload',beforeUnload);content=null;draft=null;intent=null;root.remove();}};
}
