import {siteNode} from './site-fields.mjs';

/** A binding selects candidate evidence only. It does not verify any claim. */
export function renderSiteSourceBindings(tools,parent,content,context,claimPath,prefix,label='Nguồn cho dữ kiện'){
 const compact=context.siteUx||context.formSorts;let summary;const host=compact?siteNode('details',undefined,{class:'ux-source-disclosure'}):parent;if(compact){summary=siteNode('summary',label);host.append(summary);parent.append(host);}const group=tools.group(host,label,`${prefix}-sources`,'claimSources');
 const currentPath=()=>typeof claimPath==='function'?claimPath():claimPath;const supported=source=>source.supportedClaimPaths.includes(currentPath()) || ['projects','services','clientLogos'].some(family=>currentPath().startsWith(family+'/') && source.supportedClaimPaths.includes(`${family}/*/facts`));
 function refresh(){
  const focusId=document.activeElement?.id;tools.disposeControls(group);group.replaceChildren(siteNode('h3',label));
  const path=currentPath(),binding=content.claimSources.find(value=>value.claimPath===path),selected=binding?.sourceIds??[];if(summary){summary.textContent=`${label} · ${selected.length} nguồn đã chọn`;group.querySelector('h3')?.setAttribute('hidden','');}
  for(const source of context.sourceCatalog.filter(value=>context.sourceIds.includes(value.id))){
   const eligible=supported(source),checked=selected.includes(source.id);
   if(!eligible && !checked)continue;
   const control=tools.checkbox(group,`${prefix}-source-${source.id}`,`${source.title}${eligible?'':' — không hỗ trợ nhóm này; bỏ lựa chọn'}`,checked,value=>{
    let current=content.claimSources.find(entry=>entry.claimPath===path);
    if(value){if(!eligible || (current?.sourceIds.length??0)>=8)return;if(!current){current={claimPath:path,sourceIds:[]};content.claimSources.push(current);}if(!current.sourceIds.includes(source.id))current.sourceIds.push(source.id);}
    else if(current){current.sourceIds=current.sourceIds.filter(id=>id!==source.id);if(!current.sourceIds.length)content.claimSources.splice(content.claimSources.indexOf(current),1);}
    refresh();
   });control.dataset.siteSourceId=source.id;control.disabled=!checked && selected.length>=8;
  }
  group.append(siteNode('p','Chỉ chọn nguồn đang được cấp. Lựa chọn này chưa phải xác minh dữ kiện hay quyền sử dụng.'));
  if(focusId)document.getElementById(focusId)?.focus();
 }
 refresh();return {refresh};
}
