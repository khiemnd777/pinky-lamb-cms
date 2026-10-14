/** Show only the public-safe catalog supplied by the authenticated API. */
export function openMediaPicker({catalog,kind,selectedId,onSelect}) {
  const previous=document.activeElement;
  const dialog=document.createElement('dialog');
  dialog.id='media-picker';
  const title=document.createElement('h2');title.id='media-picker-title';title.textContent=kind==='PDF'?'Chọn hồ sơ năng lực':'Chọn hình ảnh';
  dialog.setAttribute('aria-labelledby',title.id);
  const label=document.createElement('label');label.htmlFor='media-filter';label.textContent='Tìm tài nguyên';
  const filter=document.createElement('input');filter.id='media-filter';filter.type='search';
  const list=document.createElement('div');list.className='media-options';list.setAttribute('role','listbox');list.setAttribute('aria-label','Tài nguyên có sẵn');
  const close=document.createElement('button');close.type='button';close.textContent='Đóng';
  dialog.append(title,label,filter,list,close);document.body.append(dialog);
  let removed=false;
  function finish(){if(removed)return;removed=true;dialog.remove();const target=previous?.isConnected?previous:previous?.id?document.getElementById(previous.id):null;target?.focus();}
  function choose(asset){onSelect(asset);dialog.close();}
  function render(){
    list.replaceChildren();
    const query=filter.value.toLocaleLowerCase('vi');
    for(const asset of catalog.filter(asset=>asset.kind===kind && asset.status==='LEGACY_READY' && `${asset.label} ${asset.id}`.toLocaleLowerCase('vi').includes(query))){
      const option=document.createElement('button');option.type='button';option.dataset.assetId=asset.id;option.setAttribute('role','option');option.setAttribute('aria-selected',String(asset.id===selectedId));
      option.textContent=asset.label;option.addEventListener('click',()=>choose(asset));list.append(option);
    }
    if(!list.children.length){const empty=document.createElement('p');empty.textContent='Không có tài nguyên phù hợp.';list.append(empty);}
  }
  dialog.addEventListener('keydown',event=>{
    const options=[...list.querySelectorAll('button')];const index=options.indexOf(document.activeElement);
    if(['ArrowDown','ArrowUp','Home','End'].includes(event.key) && options.length){
      event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?options.length-1:event.key==='ArrowDown'?(index+1)%options.length:index<0?options.length-1:(index-1+options.length)%options.length;options[next].focus();
    }
  });
  filter.addEventListener('input',render);close.addEventListener('click',()=>dialog.close());dialog.addEventListener('close',finish);render();dialog.showModal();filter.focus();
  return ()=>{if(!removed){dialog.close();finish();}};
}
