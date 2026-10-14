import {validateContent,MAX_BODY_BYTES} from '../contracts/hero.mjs';
import {openMediaPicker} from './media-picker.mjs';

const emphasisOptions=[['NONE','Bình thường'],['STRONG','Đậm'],['ACCENT','Nhấn màu']];
const kinds=[['SECTION','Đi đến mục'],['SHOWREEL','Xem showreel'],['CREDENTIAL','Hồ sơ năng lực']];
const sections=[['work','Dự án'],['services','Dịch vụ'],['about','Giới thiệu'],['ip-studio','IP Studio'],['contact','Liên hệ']];
function node(tag,text,attributes={}){const element=document.createElement(tag);if(text!==undefined)element.textContent=text;for(const [name,value] of Object.entries(attributes))element.setAttribute(name,value);return element;}
function button(label,id,action){const element=node('button',label,{type:'button'});if(id)element.id=id;element.addEventListener('click',action);return element;}

/** Private state belongs to one mounted session and is never persisted. */
export function mountHeroEditor(container,{apiFetch,session}) {
  let draft=null,content=null,dirty=false,pending=false,disposed=false,intent=null,closePicker=null;
  const editable=['EDITOR','OWNER'].includes(session.role);
  const root=node('section',undefined,{id:'hero-editor','aria-label':'Biên tập Hero và SEO'});
  const heading=node('h2','Hero và SEO');
  const revision=node('p',undefined,{id:'draft-revision'});
  const dirtyLabel=node('p','', {id:'draft-dirty'});
  const status=node('p','Đang tải bản nháp…',{id:'editor-status',role:'status','aria-live':'polite'});
  const errors=node('div',undefined,{id:'editor-errors',role:'alert'});
  const form=node('form',undefined,{id:'hero-form'});form.noValidate=true;
  const fields=node('fieldset');
  const actions=node('div',undefined,{class:'editor-actions'});
  const save=button('Lưu bản nháp','save-draft',()=>void saveDraft());
  const reload=button('Tải lại bản nháp','reload-draft',()=>{if(canLeave())void load();});
  form.addEventListener('submit',event=>{event.preventDefault();void saveDraft();});
  form.append(fields);actions.append(save,reload);root.append(heading,revision,dirtyLabel,status,errors,form,actions);container.append(root);
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
      const label=controls[0]?.closest('.editor-field,.editor-check')?.querySelector('label')?.textContent??controls[0]?.textContent??'Nội dung';
      errors.append(node('p',`${label}: ${messages.join(' ')}`));
      for(const control of controls){
        const id=`field-error-${sequence++}`;const message=node('p',messages.join(' '),{id,class:'field-error'});
        control.setAttribute('aria-invalid','true');control.setAttribute('aria-describedby',id);const wrapper=control.closest('.editor-field,.editor-check');if(wrapper)wrapper.append(message);else control.after(message);
      }
    }
    fields.querySelector('[aria-invalid=true]')?.focus();
  }
  function group(title){const section=node('section',undefined,{class:'editor-group'});section.append(node('h3',title));fields.append(section);return section;}
  function input(parent,id,label,value,onChange,{multiline=false,max,type='text',step,min}={}){
    const wrapper=node('div',undefined,{class:'editor-field'});const control=node(multiline?'textarea':'input',undefined,{id});
    if(!multiline)control.type=type;if(max)control.maxLength=max;if(step)control.step=step;if(min!==undefined)control.min=min;if(type==='number')control.max='1';
    registerField(control);control.value=String(value??'');wrapper.append(node('label',label,{for:id}),control);parent.append(wrapper);
    control.addEventListener('input',()=>{onChange(type==='number'?(control.value===''?NaN:Number(control.value)):control.value);changed();});return control;
  }
  function checkbox(parent,id,label,value,onChange){const wrapper=node('div',undefined,{class:'editor-check'});const control=node('input',undefined,{id,type:'checkbox'});registerField(control);control.checked=value;wrapper.append(control,node('label',label,{for:id}));parent.append(wrapper);control.addEventListener('change',()=>{onChange(control.checked);changed();});return control;}
  function select(parent,id,label,value,options,onChange){const wrapper=node('div',undefined,{class:'editor-field'});const control=node('select',undefined,{id});for(const [key,text] of options)control.append(node('option',text,{value:key}));registerField(control);control.value=value;wrapper.append(node('label',label,{for:id}),control);parent.append(wrapper);control.addEventListener('change',()=>{onChange(control.value);changed();});return control;}
  function runs(parent,values,path,label,maxRuns,maxText){
    values.forEach((run,index)=>{
      const row=node('div',undefined,{class:'run-row','data-run-path':`${path}.${index}`});parent.append(row);
      const textControl=input(row,`${path.replaceAll('.','-')}-${index}-text`,`${label} — đoạn ${index+1}`,run.text,value=>{run.text=value;},{multiline:true,max:maxText});textControl.dataset.runText='';registerField(textControl,`${path}.${index}.text`);
      const emphasisControl=select(row,`${path.replaceAll('.','-')}-${index}-emphasis`,`${label} — nhấn mạnh ${index+1}`,run.emphasis??'NONE',emphasisOptions,value=>{run.emphasis=value;});emphasisControl.dataset.runEmphasis='';registerField(emphasisControl,`${path}.${index}.emphasis`);
      const remove=button(`Xóa đoạn ${index+1} của ${label}`,undefined,()=>{values.splice(index,1);changed();render();document.getElementById(`${path.replaceAll('.','-')}-${Math.min(index,values.length-1)}-text`)?.focus();});remove.disabled=values.length===1;row.append(remove);
    });
    const add=button(`Thêm đoạn cho ${label}`,undefined,()=>{values.push({text:'',emphasis:'NONE'});changed();render();document.getElementById(`${path.replaceAll('.','-')}-${values.length-1}-text`)?.focus();});add.disabled=values.length>=maxRuns;parent.append(add);
  }
  function picker(parent,prefix,label,kind,getId,setId){
    const current=node('span',draft.catalog.find(asset=>asset.id===getId())?.label??getId(),{id:`${prefix}-selected`});
    const pick=button(label,`${prefix}-pick`,()=>{closePicker=openMediaPicker({catalog:draft.catalog,kind,selectedId:getId(),onSelect:asset=>{setId(asset.id);changed();render();}});});registerField(pick,prefix==='hero-image'?'hero.image.assetId':prefix==='seo-image'?'seo.ogImage.assetId':`hero.${prefix}.assetId`);parent.append(current,pick);
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
    fields.replaceChildren();if(!content){updateState();return;}
    const hero=group('Nội dung Hero');input(hero,'hero-eyebrow','Dòng giới thiệu',content.hero.eyebrow,value=>{content.hero.eyebrow=value;},{max:120});
    content.hero.heading.lines.forEach((line,index)=>{const lineGroup=node('div',undefined,{class:'heading-line'});lineGroup.append(node('h4',`Dòng tiêu đề ${index+1}`));hero.append(lineGroup);runs(lineGroup,line,`hero.heading.lines.${index}`,`Dòng tiêu đề ${index+1}`,8,100);const remove=button(`Xóa dòng tiêu đề ${index+1}`,undefined,()=>{content.hero.heading.lines.splice(index,1);changed();render();document.getElementById(`hero-heading-lines-${Math.min(index,content.hero.heading.lines.length-1)}-0-text`)?.focus();});remove.disabled=content.hero.heading.lines.length===1;lineGroup.append(remove);});
    const addLine=button('Thêm dòng tiêu đề','add-heading-line',()=>{content.hero.heading.lines.push([{text:'',emphasis:'NONE'}]);changed();render();document.getElementById(`hero-heading-lines-${content.hero.heading.lines.length-1}-0-text`)?.focus();});addLine.disabled=content.hero.heading.lines.length>=3;hero.append(addLine);
    const description=group('Mô tả Hero');runs(description,content.hero.description,'hero.description','Mô tả',12,1000);
    const ctas=group('Nút hành động');action(ctas,'primaryAction','Nút chính');checkbox(ctas,'secondary-enabled','Hiện nút phụ',Boolean(content.hero.secondaryAction),value=>{if(value)content.hero.secondaryAction={kind:'SECTION',sectionId:'contact',label:'Liên hệ'};else delete content.hero.secondaryAction;render();});action(ctas,'secondaryAction','Nút phụ');
    input(hero,'hero-footnote','Chú thích',content.hero.footnote,value=>{content.hero.footnote=value;},{multiline:true,max:240});input(hero,'hero-note','Ghi chú',content.hero.note,value=>{content.hero.note=value;},{multiline:true,max:300});
    image(group('Ảnh Hero'),content.hero.image,'hero','ảnh Hero',true);
    const seo=group('SEO');for(const [key,label,max] of [['title','Tiêu đề SEO',80],['description','Mô tả SEO',200],['ogTitle','Tiêu đề chia sẻ',80],['ogDescription','Mô tả chia sẻ',200]])input(seo,`seo-${key.replace(/[A-Z]/g,letter=>`-${letter.toLowerCase()}`)}`,label,content.seo[key],value=>{content.seo[key]=value;},{multiline:key.includes('escription'),max});
    image(group('Ảnh chia sẻ'),content.seo.ogImage,'seo','ảnh chia sẻ',false);updateState();if(focusedId)document.getElementById(focusedId)?.focus();
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
    catch(error){if(!disposed && error.name!=='AbortError')showError(error);}finally{if(!disposed){pending=false;updateState();fields.querySelector('[aria-invalid=true]')?.focus();}}
  }
  void load();
  return {canLeave,destroy(){disposed=true;closePicker?.();window.removeEventListener('beforeunload',beforeUnload);content=null;draft=null;intent=null;root.remove();}};
}
