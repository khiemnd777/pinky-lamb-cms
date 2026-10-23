import {createCmsIcon} from './cms-icons.mjs';
/** UI-only navigation. Auth owns permissions, requests and resource lifecycle. */
const GROUPS=Object.freeze([['settings','Đầu trang, Hero và SEO','PanelTop'],['clients','Khách hàng','Users'],['work','Dự án','Clapperboard'],['services','Dịch vụ','BriefcaseBusiness'],['about','Giới thiệu','Info'],['ip','IP Studio','Sparkles'],['contact','Liên hệ','Mail'],['footer','Chân trang','PanelBottom']]);
export function mountCmsShell(document,{onResource,closePopups=()=>{},recoveryReadOnly=false}){
 const view=document.defaultView,byId=id=>document.getElementById(id);
 const sidebar=byId('cms-sidebar'),body=byId('cms-body'),opener=byId('cms-menu-open'),closer=byId('cms-menu-close'),backdrop=byId('cms-menu-backdrop'),nav=byId('cms-resource-nav'),grid=byId('cms-content-grid'),toggle=byId('cms-view-toggle'),privateRoot=byId('private-content'),previewHost=byId('cms-preview-host'),actionHost=byId('cms-action-host');
 const tabs=byId('cms-work-tabs'),editTab=byId('cms-edit-tab'),reviewTab=byId('cms-review-tab'),sendShortcut=byId('cms-send-shortcut'),mobileActions=byId('cms-mobile-actions'),mobileHost=byId('cms-mobile-action-host');
 const groupHost=byId('cms-group-nav'),management=byId('cms-management-nav'),legacyHost=byId('cms-legacy-access');
 const sectionDescription=document.createElement('p'),sectionEyebrow=document.createElement('p');sectionDescription.className='cms-section-context';sectionEyebrow.className='cms-section-eyebrow';sectionEyebrow.textContent='BIÊN TẬP WEBSITE';byId('cms-resource-title').parentNode?.append(sectionDescription);byId('cms-resource-title').parentNode?.prepend(sectionEyebrow);for(const id of ['cms-context-status','cms-mobile-status']){byId(id).setAttribute('role','status');byId(id).setAttribute('aria-live','polite');}
 const resources=recoveryReadOnly? [['home-v2','Toàn website — khôi phục','History']]:[['media','Thư viện media','Image']];
 let heroContext=null,projectContext=null,serviceContext=null,groupLocalizationContext=null,reviewLocalizationContext=null,heroGuardPending=false;let previewRequested=false;let groupNode=null,requestedGroup=null,currentGroup='site-component-settings';
 const buttons=new Map(),listeners=[],media=view.matchMedia('(max-width:720px)');
 let active=recoveryReadOnly?'home-v2':'home-v3',work='edit',signedIn=false,readOnly=false,busy=false,drawer=false,restoreFocus=null,overflow='',bodyInert=false,disposed=false,focusFrame=0;
 function listen(target,type,handler,options){target.addEventListener(type,handler,options);listeners.push(()=>target.removeEventListener(type,handler,options));}
 const previousMobileHeight=body.style.getPropertyValue?.('--cms-mobile-actions-height')??'';
 const header=body.querySelector('.admin-header'),previousHeaderHeight=body.style.getPropertyValue?.('--cms-header-height')??'';
 const previewDialog=document.createElement('dialog'),previewHeader=document.createElement('header'),previewTitle=document.createElement('h2'),previewClose=document.createElement('button');let previewOpener=null;
 previewDialog.className='cms-saved-preview-dialog';previewDialog.setAttribute('aria-label','Xem trước bản đã lưu');previewHeader.className='cms-saved-preview-header';previewTitle.textContent='Xem trước bản đã lưu';previewClose.type='button';previewClose.setAttribute('aria-label','Đóng xem trước');previewClose.append(createCmsIcon('X'));previewHeader.append(previewTitle,previewClose);previewDialog.append(previewHeader);document.body.append(previewDialog);
 function closePreview(){if(!previewDialog.open)return;previewDialog.close();}
 listen(previewClose,'click',closePreview);listen(previewDialog,'close',()=>{grid.append(previewHost);setViewWithoutResize('edit');if(previewOpener?.isConnected)previewOpener.focus();previewOpener=null;});
 function presentPreview(){if(active!=='home-v3'||recoveryReadOnly){setViewWithoutResize('preview');return;}closePopups();previewOpener=document.activeElement;previewDialog.append(previewHost);previewHost.hidden=false;setViewWithoutResize('edit');toggle.hidden=true;if(!previewDialog.open)previewDialog.showModal();previewClose.focus();}
 function syncHeaderHeight(){if(disposed||!header)return;const mobileHeight=mobileActions.hidden?0:Math.ceil(mobileActions.getBoundingClientRect?.().height??0);body.style.setProperty('--cms-mobile-actions-height',`${mobileHeight}px`);const height=Math.ceil(header.getBoundingClientRect().height);if(height>0)body.style.setProperty('--cms-header-height',`${height}px`);}
 const headerObserver=header&&typeof view.ResizeObserver==='function'?new view.ResizeObserver(syncHeaderHeight):null;
 headerObserver?.observe(mobileActions);headerObserver?.observe(header);listen(view,'resize',syncHeaderHeight);syncHeaderHeight();
 listeners.push(()=>{headerObserver?.disconnect();if(previousMobileHeight)body.style.setProperty('--cms-mobile-actions-height',previousMobileHeight);else body.style.removeProperty?.('--cms-mobile-actions-height');if(previousHeaderHeight)body.style.setProperty('--cms-header-height',previousHeaderHeight);else body.style.removeProperty?.('--cms-header-height');});


 for(const [key,label,icon] of resources){const button=document.createElement('button');button.type='button';button.dataset.cmsResource=key;button.append(createCmsIcon(icon),document.createTextNode(label));listen(button,'click',()=>{if(busy||button.disabled||!signedIn)return;closePopups();onResource(key);});nav.append(button);buttons.set(key,button);}
 function menuButton(host,label,icon,action){const button=document.createElement('button');button.type='button';button.append(createCmsIcon(icon),document.createTextNode(label));listen(button,'click',()=>{if(busy||!signedIn||button.disabled)return;closePopups();action();});host.append(button);return button;}
 function dispatchGroup(id){view.dispatchEvent(new view.CustomEvent('cms:site-group',{detail:{id}}));}
 async function chooseGroup(id){requestedGroup=id;if(active!=='home-v3'){onResource('home-v3');return;}if(await setWork('edit')===false)return;dispatchGroup(id);closeDrawer();}
 const groupButtons=new Map();let dirtyGroups=new Set();function refreshDirtyMarkers(){const actual=groupHost.querySelectorAll('[data-site-group-target]');const nodes=[...groupButtons.entries(),...Array.from(actual,node=>[node.dataset.siteGroupTarget,node]),...Array.from(management.querySelectorAll('button')).filter(node=>node.dataset.cmsManagement==='structure').map(node=>['site-structure-content',node])];for(const [id,node]of nodes){const key=id==='site-structure-content'?'structure':id.replace('site-component-','');let marker=node.querySelector('.cms-group-dirty');if(dirtyGroups.has(key)){if(!marker){marker=document.createElement('span');marker.className='cms-group-dirty';marker.setAttribute('aria-label','Có thay đổi chưa lưu');marker.title='Có thay đổi chưa lưu';marker.append(createCmsIcon('Circle'));node.append(marker);}}else marker?.remove();}}listen(view,'cms:site-dirty',event=>{dirtyGroups=new Set(event.detail?.groups??[]);refreshDirtyMarkers();});
 if(!recoveryReadOnly){
  for(const [key,label,icon] of GROUPS){const id='site-component-'+key;groupButtons.set(id,menuButton(groupHost,label,icon,()=>chooseGroup(id)));}
  const structure=menuButton(management,'Cấu trúc website','Layers',()=>chooseGroup('site-structure-content'));structure.dataset.cmsManagement='structure';
  const review=menuButton(management,'Xuất bản','ClipboardCheck',()=>{if(active!=='home-v3'){requestedGroup='review';onResource('home-v3');return;}setWork('review');closeDrawer();});review.dataset.cmsManagement='review';
  const legacyLabel=document.createElement('p');legacyLabel.textContent='Lịch sử và nội dung cũ';legacyHost.append(legacyLabel);
  menuButton(legacyHost,'Mở Hero và SEO cũ','History',()=>{if(active==='home')setWork('edit');else onResource('home');});
 }
 const mainHeading=header?.querySelector('h1'),mainBreadcrumb=header?.querySelector('.cms-card-subtitle'),originalHeading=mainHeading?.textContent,originalBreadcrumb=mainBreadcrumb?.textContent;
 function localizedReview(){return active==='home-v3'&&work==='review'&&Boolean(privateRoot.querySelector('.localization-review-editor'));}
 const contentHeader=body.querySelector('.cms-content-header'),contentHeaderHidden=contentHeader?.hidden??false;
 function syncHeroChrome(){const review=localizedReview();if(contentHeader&&contentHeader.hidden!==(review||contentHeaderHidden))contentHeader.hidden=review||contentHeaderHidden;const localizedHero=Boolean(heroContext)&&active==='home-v3'&&work==='edit'&&currentGroup==='site-component-settings',localizedProject=Boolean(projectContext)&&active==='home-v3'&&work==='edit'&&currentGroup==='site-component-work',localizedService=Boolean(serviceContext)&&active==='home-v3'&&work==='edit'&&currentGroup==='site-component-services',localizedGroup=Boolean(groupLocalizationContext)&&active==='home-v3'&&work==='edit'&&groupButtons.has(currentGroup),localized=review||localizedHero||localizedProject||localizedService||localizedGroup;body.dataset.heroContext=String(localizedHero);if(mainHeading){mainHeading.textContent=active==='media'?'Thư viện media':active==='home-v3'?(work==='review'?'Xuất bản':GROUPS.find(([key])=>'site-component-'+key===currentGroup)?.[1]??'Cấu trúc website'):originalHeading;if(mainBreadcrumb&&mainHeading.parentNode?.insertBefore){if(localized)mainHeading.parentNode.insertBefore(mainBreadcrumb,mainHeading);else mainHeading.parentNode.append(mainBreadcrumb);}}if(mainBreadcrumb)mainBreadcrumb.textContent=localized?'Pinky Lamb / Nội dung website':originalBreadcrumb;}
 listen(view,'cms:group-localization-context',event=>{if(event.detail?.active)groupLocalizationContext=event.detail;else if(!event.detail?.groupId||event.detail.groupId===groupLocalizationContext?.groupId)groupLocalizationContext=null;syncHeroChrome();refreshActions();});
 listen(view,'cms:hero-context',event=>{heroContext=event.detail?.active?event.detail:null;syncHeroChrome();refreshActions();});
 listen(view,'cms:service-context',event=>{serviceContext=event.detail?.active?event.detail:null;syncHeroChrome();refreshActions();});
 listen(view,'cms:project-context',event=>{projectContext=event.detail?.active?event.detail:null;syncHeroChrome();refreshActions();});
 listen(view,'cms:localized-review-context',event=>{reviewLocalizationContext=event.detail?.active?event.detail:null;syncHeroChrome();refreshActions();});
 function guardWork(target,commit){const context=(work==='review'?reviewLocalizationContext:null)??groupLocalizationContext??serviceContext??projectContext??heroContext;if(!context)return commit();if(heroGuardPending)return false;heroGuardPending=true;return Promise.resolve(context.requestTransition(target)).then(ok=>ok&&!disposed?commit():false).finally(()=>{heroGuardPending=false;});}
 function markNavigation(){
  refreshDirtyMarkers();
  const contextVisible=active==='home-v3'&&work==='edit'&&groupButtons.has(currentGroup);sectionDescription.textContent=contextVisible?(currentGroup==='site-component-work'?'Quản lý câu chuyện, hình ảnh và thứ tự dự án.':currentGroup==='site-component-services'?'Tổ chức dịch vụ và nội dung khách hàng nhìn thấy.':'Biên tập nội dung theo đúng vị trí trên website.'):'';sectionDescription.hidden=!contextVisible;sectionEyebrow.hidden=!contextVisible;
  for(const [id,button] of groupButtons){const selected=active==='home-v3'&&work==='edit'&&id===currentGroup;if(selected)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');}
  for(const button of management.querySelectorAll('button')){const selected=active==='home-v3'&&(button.dataset.cmsManagement==='review'?work==='review':work==='edit'&&currentGroup==='site-structure-content');if(selected)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');}
  if(groupNode)groupNode.hidden=active!=='home-v3'||work!=='edit';
  for(const button of groupButtons.values())button.hidden=Boolean(groupNode)&&active==='home-v3'&&work==='edit';
 }
 listen(view,'cms:site-navigation',event=>{
  const detail=event.detail??{};
  if(!detail.node){groupNode?.remove();groupNode=null;markNavigation();return;}
  if(groupNode!==detail.node){groupNode?.remove();groupNode=detail.node;groupHost.append(groupNode);}
  currentGroup=detail.groupId??currentGroup;syncHeroChrome();
  if(active==='home-v3'&&work==='edit')byId('cms-resource-title').textContent=GROUPS.find(([key])=>'site-component-'+key===currentGroup)?.[1]??detail.label??'Cấu trúc website';
  markNavigation();
  if(requestedGroup){const next=requestedGroup;requestedGroup=null;if(next==='review')setWork('review');else if(next!==currentGroup){setWork('edit');dispatchGroup(next);}}
 });
 listen(groupHost,'click',event=>{if(event.target.closest?.('[data-site-group-target]')){setWork('edit');closeDrawer();}});
 function focusables(){return [...sidebar.querySelectorAll('button:not(:disabled),a[href],[tabindex="0"]')].filter(node=>!node.hidden&&node.getClientRects().length);}
 function closeDrawer(restore=true){
  if(!drawer)return;drawer=false;view.cancelAnimationFrame(focusFrame);document.body.classList.remove('cms-drawer-open');document.body.style.overflow=overflow;body.inert=bodyInert;backdrop.hidden=true;opener.setAttribute('aria-expanded','false');sidebar.removeAttribute('role');sidebar.removeAttribute('aria-modal');sidebar.inert=media.matches;sidebar.toggleAttribute('aria-hidden',media.matches);
  if(restore&&restoreFocus?.isConnected&&!restoreFocus.hidden)restoreFocus.focus({preventScroll:true});restoreFocus=null;
 }
 function openDrawer(){
  if(!signedIn||!media.matches||drawer)return;closePopups();restoreFocus=document.activeElement;overflow=document.body.style.overflow;bodyInert=body.inert;body.inert=true;document.body.style.overflow='hidden';drawer=true;document.body.classList.add('cms-drawer-open');backdrop.hidden=false;sidebar.inert=false;sidebar.removeAttribute('aria-hidden');sidebar.setAttribute('role','dialog');sidebar.setAttribute('aria-modal','true');opener.setAttribute('aria-expanded','true');
  focusFrame=view.requestAnimationFrame(()=>{focusFrame=view.requestAnimationFrame(()=>{if(drawer)(sidebar.querySelector('[aria-current]')??closer).focus({preventScroll:true});});});
 }
 function setView(value){previewRequested=false;closePopups();if(value==='preview')presentPreview();else{closePreview();setViewWithoutResize(value);}toggle.hidden=!signedIn||value!=='preview'||previewDialog.open;view.dispatchEvent(new Event('resize'));}
 function refreshActions(){
  const localized=localizedReview()||(active==='home-v3'&&work==='edit'&&((Boolean(heroContext)&&currentGroup==='site-component-settings')||(Boolean(projectContext)&&currentGroup==='site-component-work')||(Boolean(serviceContext)&&currentGroup==='site-component-services')||Boolean(groupLocalizationContext)));
  const statusIds=active==='home'?['draft-revision','draft-dirty']:active==='home-v2'?['site-revision','site-dirty']:active==='home-v3'?['v3-status']:[];
  const statusNode=active==='home-v3'?byId('v3-status'):null;if(statusNode){const duplicate=/^Toàn website — phiên bản \d+ — (?:đã lưu|chưa lưu)$/.test(statusNode.textContent);if(statusNode.hidden!==duplicate)statusNode.hidden=duplicate;}
  const summary=statusIds.map(id=>byId(id)?.textContent).filter(Boolean).join(' · ');
  byId('cms-context-status').hidden=localized;byId('cms-context-status').textContent=summary;byId('cms-mobile-status').textContent=summary;
  const ids=active==='home'?['save-draft','reload-draft']:active==='home-v2'?['site-save','site-reload']:active==='home-v3'?['v3-save','v3-reload']:[];
  const sources=ids.map(id=>byId(id)).filter(node=>node&&privateRoot.contains(node)&&!node.hidden);
  syncProxies(actionHost,localized?[]:sources.slice(0,1));syncProxies(mobileHost,localized?[]:sources.slice(0,1));
  const savedPreview=byId(active==='home-v3'?'v3-saved-preview':active==='home-v2'?'site-preview-saved':'preview-draft');byId('cms-preview-shortcut').hidden=localized||!signedIn||!savedPreview;byId('cms-preview-shortcut').disabled=busy||!savedPreview||savedPreview.disabled;
  mobileActions.hidden=localized||!signedIn||!sources.length;
  const reviewAvailable=active!=='media'&&Boolean(privateRoot.querySelector('[data-cms-pane="review"]'));
  tabs.hidden=true;legacyHost.hidden=localizedReview()||!signedIn||!((active==='home-v3'&&work==='review')||active==='home');sendShortcut.hidden=localized||!signedIn||!reviewAvailable;sendShortcut.disabled=busy;byId('cms-mobile-send').hidden=localized||!reviewAvailable;byId('cms-mobile-send').disabled=busy;byId('cms-mobile-preview').hidden=byId('cms-preview-shortcut').hidden;byId('cms-mobile-preview').disabled=byId('cms-preview-shortcut').disabled;
 }
 function syncProxies(host,sources){
  const signature=sources.map(node=>node.id).join('|');
  if(host.dataset.sources!==signature){host.replaceChildren();host.dataset.sources=signature;for(const source of sources){const proxy=document.createElement('button');proxy.type='button';proxy.dataset.sourceAction=source.id;proxy.addEventListener('click',()=>{const target=byId(proxy.dataset.sourceAction);if(target&&privateRoot.contains(target)&&!target.hidden&&!target.matches(':disabled'))target.click();});host.append(proxy);}}
  for(const proxy of host.querySelectorAll('button')){const source=byId(proxy.dataset.sourceAction);if(proxy.textContent!==source?.textContent)proxy.replaceChildren(createCmsIcon('Save'),document.createTextNode(source?.textContent??''));proxy.disabled=busy||!source||source.hidden||source.matches(':disabled');}
 }
 function applyWork(){
  for(const panel of privateRoot.querySelectorAll('[data-cms-pane]')){const hidden=panel.dataset.cmsPane!==work||(localizedReview()&&panel.classList.contains('ux-legacy-history'));if(panel.hidden!==hidden)panel.hidden=hidden;}
  grid.dataset.work=work;syncHeroChrome();markNavigation();privateRoot.setAttribute('aria-labelledby','cms-resource-title');
  for(const [pane,tab] of [['edit',editTab],['review',reviewTab]]){tab.setAttribute('aria-selected',String(work===pane));tab.tabIndex=work===pane?0:-1;}
 }
 function setWork(pane,{focusMessage=false,guarded=false}={}){
  if(!guarded&&(heroContext||projectContext||serviceContext||groupLocalizationContext||reviewLocalizationContext)&&pane!==work)return guardWork(pane,()=>setWork(pane,{focusMessage,guarded:true}));
  previewRequested=false;
  if(!['edit','review'].includes(pane)||active==='media')return false;closePreview();closePopups();work=pane;applyWork();if(pane==='review')byId('cms-resource-title').textContent='Xuất bản';else if(active==='home-v3')byId('cms-resource-title').textContent=GROUPS.find(([key])=>'site-component-'+key===currentGroup)?.[1]??'Cấu trúc website';else if(active==='home')byId('cms-resource-title').textContent='Hero và SEO — nội dung cũ';setViewWithoutResize('edit');refreshPanels();
  if(focusMessage){const message=byId(active==='home'?'submit-message':active==='home-v2'?'site-submit-message':'v3-snapshot');if(message&&!message.matches(':disabled'))message.focus({preventScroll:true});}
  view.dispatchEvent(new Event('resize'));return true;
 }
 function refreshPanels(){if(disposed)return;applyWork();const available=[...previewHost.querySelectorAll(':scope > section')].some(panel=>!panel.hidden),showPreview=available&&(work==='edit'||Boolean(previewHost.querySelector('[data-cms-preview="snapshot"]:not([hidden])')));grid.classList.toggle('cms-has-preview',showPreview);if(previewHost.hidden===showPreview)previewHost.hidden=!showPreview;toggle.hidden=!signedIn||!showPreview||grid.dataset.view!=='preview';if(previewRequested&&showPreview){previewRequested=false;presentPreview();}else if(!showPreview){setViewWithoutResize('edit');const source=byId(active==='home-v3'?'v3-saved-preview':active==='home-v2'?'site-preview-saved':'preview-draft');if(previewRequested&&source&&!source.disabled)previewRequested=false;}refreshActions();}
 function setViewWithoutResize(value){grid.dataset.view=value;for(const button of toggle.querySelectorAll('button'))button.setAttribute('aria-pressed',String(button.dataset.cmsView===value));}
 function setResource(key){closePreview();previewRequested=false;if(recoveryReadOnly?key!=='home-v2':!['home-v3','home','media'].includes(key))return;active=key;body.dataset.cmsResource=key;work='edit';for(const [value,button] of buttons){if(value===key)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');}byId('cms-resource-title').textContent=(key==='home-v3'?GROUPS.find(([id])=>'site-component-'+id===currentGroup)?.[1]??'Cấu trúc website':key==='home'?'Hero và SEO — nội dung cũ':resources.find(item=>item[0]===key)?.[1]??key);setViewWithoutResize('edit');closeDrawer();refreshPanels();}
 function setBusy(value){busy=Boolean(value);for(const [key,button] of buttons)button.disabled=busy||(readOnly&&key!=='home-v2');for(const button of groupButtons.values())button.disabled=busy||readOnly;for(const button of management.querySelectorAll('button'))button.disabled=busy||readOnly;for(const button of legacyHost.querySelectorAll('button'))button.disabled=busy||readOnly;nav.setAttribute('aria-busy',String(busy));refreshActions();}
 function setSession(member,{readOnly:locked=false}={}){closePreview();previewRequested=false;closePopups();closeDrawer(false);signedIn=Boolean(member);readOnly=locked;body.classList.toggle('cms-authenticated',signedIn);byId('cms-top-actions').hidden=!signedIn;sidebar.hidden=!signedIn;opener.hidden=!signedIn;byId('cms-skip').hidden=!signedIn;sidebar.inert=media.matches||!signedIn;sidebar.toggleAttribute('aria-hidden',media.matches||!signedIn);setBusy(false);if(!signedIn){byId('cms-context-status').textContent='';byId('cms-mobile-status').textContent='';actionHost.replaceChildren();mobileHost.replaceChildren();delete actionHost.dataset.sources;delete mobileHost.dataset.sources;mobileActions.hidden=true;tabs.hidden=true;sendShortcut.hidden=true;toggle.hidden=true;}}
 listen(byId('cms-sidebar-logout'),'click',()=>{const source=byId('logout');if(signedIn&&!source.hidden&&!source.matches(':disabled'))source.click();});
 listen(opener,'click',openDrawer);listen(closer,'click',()=>closeDrawer());listen(backdrop,'click',()=>closeDrawer());
 listen(document,'keydown',event=>{if(!drawer)return;if(event.key==='Escape'){event.preventDefault();closePopups();closeDrawer();}else if(event.key==='Tab'){const items=focusables(),first=items[0],last=items.at(-1);if(!items.length){event.preventDefault();return;}if(event.shiftKey&&(document.activeElement===first||!sidebar.contains(document.activeElement))){event.preventDefault();last.focus();}else if(!event.shiftKey&&(document.activeElement===last||!sidebar.contains(document.activeElement))){event.preventDefault();first.focus();}}});
 listen(byId('cms-preview-shortcut'),'click',()=>{const source=byId(active==='home-v3'?'v3-saved-preview':active==='home-v2'?'site-preview-saved':'preview-draft');if(source&&!source.disabled&&!source.hidden){previewRequested=true;source.click();refreshPanels();}});
 listen(byId('cms-mobile-preview'),'click',()=>byId('cms-preview-shortcut').click());
 listen(byId('cms-mobile-send'),'click',()=>setWork('review',{focusMessage:true}));
 listen(editTab,'click',()=>setWork('edit'));listen(reviewTab,'click',()=>setWork('review'));listen(sendShortcut,'click',()=>setWork('review',{focusMessage:true}));
 listen(tabs,'keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?'edit':event.key==='End'?'review':work==='edit'?'review':'edit';setWork(next);(next==='edit'?editTab:reviewTab).focus();});
 listen(document,'cms:show-work',event=>{const apply=allowed=>{if(allowed&&['edit','preview'].includes(event.detail?.view))setView(event.detail.view);};const allowed=setWork(event.detail?.pane);if(allowed?.then)void allowed.then(apply);else apply(allowed);});
 // A pointer click focuses on press, before release. Moving that target here
 // cancels the click at viewport edges; keep scroll correction for keyboard focus.
 let pointerActive=false;
 listen(document,'pointerdown',()=>{pointerActive=true;},true);
 for(const type of ['pointerup','pointercancel'])listen(document,type,()=>{pointerActive=false;},true);
 listen(view,'blur',()=>{pointerActive=false;});
 listen(document,'focusin',event=>{
  if(pointerActive)return;
  const target=event.target,fields=byId('site-fields');
  if(!signedIn||active!=='home-v3'||work!=='edit'||!fields?.contains(target)||!target.matches?.('input,textarea,button,select,a,summary,[role=combobox],[role=checkbox],[role=switch],[role=slider]')||target.closest?.('dialog[open]'))return;
  const rect=target.getBoundingClientRect(),header=body.querySelector('.admin-header'),top=Math.max(0,header?.getBoundingClientRect().bottom??0),bottom=!mobileActions.hidden&&mobileActions.getClientRects().length?Math.min(view.innerHeight,mobileActions.getBoundingClientRect().top):view.innerHeight;
  if(rect.top<top||rect.bottom>bottom)target.scrollIntoView({block:'center',behavior:'instant'});
 });
 listen(document,'cms:content',refreshPanels);
 for(const button of toggle.querySelectorAll('button'))listen(button,'click',()=>setView(button.dataset.cmsView));
 const resize=()=>{closePopups();if(drawer)closeDrawer();sidebar.inert=media.matches||!signedIn;sidebar.toggleAttribute('aria-hidden',media.matches||!signedIn);};media.addEventListener('change',resize);listeners.push(()=>media.removeEventListener('change',resize));
 const observer=new view.MutationObserver(records=>{if(records.some(record=>record.attributeName==='open'))closePopups();refreshPanels();});observer.observe(privateRoot,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','hidden','open','data-cms-pane']});observer.observe(previewHost,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','data-cms-preview']});
 for(const [id,icon,label] of [['cms-menu-open','Menu'],['cms-menu-close','X'],['cms-preview-shortcut','Eye','Xem trước'],['cms-send-shortcut','Send','Xuất bản'],['cms-mobile-preview','Eye','Xem trước'],['cms-mobile-send','Send','Xuất bản']]){byId(id).replaceChildren(createCmsIcon(icon));if(label)byId(id).append(document.createTextNode(label));}
 setResource(active);setSession(null);
 return {setSession,setResource,setBusy,refreshPanels,closeDrawer,destroy(){closePreview();previewDialog.remove();disposed=true;if(contentHeader)contentHeader.hidden=contentHeaderHidden;observer.disconnect();closeDrawer(false);closePopups();for(const remove of listeners)remove();nav.replaceChildren();groupHost.replaceChildren();management.replaceChildren();legacyHost.replaceChildren();sectionDescription.remove();sectionEyebrow.remove();actionHost.replaceChildren();mobileHost.replaceChildren();mobileActions.hidden=true;body.classList.remove('cms-authenticated');sidebar.hidden=true;opener.hidden=true;}};
}
