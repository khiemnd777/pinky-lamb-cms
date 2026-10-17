/** Keep the established shared editor and locale editor on separate save paths. */
export function mountSharedLocalizationWorkspace(root,options,{mountShared,mountLocalized,key}){
 const doc=root.ownerDocument,host=doc.createElement('div'),tabs=doc.createElement('div'),sharedHost=doc.createElement('div'),localizedHost=doc.createElement('div');
 host.className='shared-localization-workspace';tabs.className='cms-control-group workspace-mode-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Chế độ biên tập');
 let selected='localized',active=false,switching=false,disposed=false;
 const panels={localized:localizedHost,shared:sharedHost},buttons={};
 for(const [id,label]of [['localized','Bản dịch'],['shared','Dữ liệu dùng chung']]){
  const b=doc.createElement('button');b.type='button';b.textContent=label;b.id=`${key}-workspace-${id}-tab`;b.setAttribute('role','tab');b.dataset.siteViewOnly='';b.setAttribute('aria-controls',`${key}-workspace-${id}`);buttons[id]=b;tabs.append(b);
  panels[id].id=`${key}-workspace-${id}`;panels[id].setAttribute('role','tabpanel');panels[id].setAttribute('aria-labelledby',b.id);b.addEventListener('click',()=>select(id));
 }
 host.append(tabs,localizedHost,sharedHost);root.append(host);
 const hint=doc.createElement('p');hint.textContent='Dữ liệu này dùng chung cho mọi ngôn ngữ. Áp dụng thay đổi trong hộp thoại nếu có, rồi chọn Lưu website.';hint.className='cms-hint';sharedHost.append(hint);
 const sharedBody=doc.createElement('div');sharedHost.append(sharedBody);
 const shared=mountShared(sharedBody,options),localized=mountLocalized(localizedHost,{...options,onContext:detail=>options.onContext?.({...detail,active:active&&selected==='localized'&&detail.active!==false})});
 function sync(){for(const id of Object.keys(panels)){panels[id].hidden=id!==selected;buttons[id].setAttribute('aria-selected',String(id===selected));buttons[id].tabIndex=id===selected?0:-1;}localized.setGroupActive?.(active&&selected==='localized');shared.setGroupActive?.(active&&selected==='shared');}
 async function guardTransition(target){return (await localized.requestTransition?.(target)??true)&&(await shared.requestTransition?.(target)??true);}
 async function requestTransition(target){return !switching&&await guardTransition(target);}
 async function select(id){if(disposed||selected===id||switching)return;switching=true;try{if(!await guardTransition(`group:site-component-${key}`)||disposed)return;selected=id;sync();buttons[id].focus();}finally{switching=false;}}
 tabs.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();void select(event.key==='Home'?'localized':event.key==='End'?'shared':selected==='localized'?'shared':'localized');});
 sync();
 return {requestTransition,canLeave:()=>localized.canLeave?.()!==false&&shared.canLeave?.()!==false,hasPendingInput:()=>Boolean(localized.hasPendingInput?.()||shared.hasPendingInput?.()),setGroupActive(value){active=value;sync();},setDisabled(value){shared.setDisabled?.(value);localized.setDisabled?.(value);},refreshReferences(){shared.refreshReferences?.();localized.refreshReferences?.();},async revealValidationPath(path){if(!await requestTransition(`group:site-component-${key}`))return false;selected='shared';sync();return shared.revealValidationPath?.(path)??false;},destroy(){disposed=true;localized.destroy();shared.destroy();host.remove();}};
}
