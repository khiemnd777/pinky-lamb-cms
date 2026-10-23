import {X,ChevronLeft,ChevronRight,ZoomOut,ZoomIn,MoveHorizontal,Download,RotateCw,FileText} from 'lucide';
import {defaultWorkerUrl} from './pdf-worker-url.mjs';
import {detectFile,fetchExternalFile,readBoundedResponse,sha256,safeDownloadName} from '../contracts/file-detection.mjs';
export const READER_STYLE=`
.pinky-reader{box-sizing:border-box;display:flex;flex-direction:column;width:min(1100px,96vw);max-width:96vw;height:90dvh;max-height:96dvh;padding:0;border:1px solid #e7e2e4;border-radius:20px;background:#fff;color:#423b46;box-shadow:0 24px 80px #16121b33;font:14px Montserrat,Arial,sans-serif}
.pinky-reader:not([open]),.pinky-reader [hidden]{display:none}
.pinky-reader::backdrop{background:#32383fcc}
.pinky-reader header,.pinky-reader nav{display:flex;align-items:center;flex-shrink:0;gap:12px;flex-wrap:wrap;border-bottom:1px solid #eee9ec}
.pinky-reader header{padding:16px 20px}
.pinky-reader h2{flex:1;margin:0;font-size:16px;font-weight:600;letter-spacing:-.02em;overflow-wrap:anywhere}
.pinky-reader-file-icon{display:grid;place-items:center;width:40px;height:44px;flex-shrink:0;border:1px solid #f0dfe5;border-radius:12px;background:#fcf2f5;color:#a24765}
.pinky-reader-file-icon svg{width:21px;height:21px}
.pinky-reader nav{padding:10px 20px;background:#fcfafb}
.pinky-reader-controls{display:flex;align-items:center;gap:8px;padding:2px;border:1px solid #e8e2e6;border-radius:12px;background:#fff}
.pinky-reader button,.pinky-reader input{box-sizing:border-box;min-height:44px;font:inherit}
.pinky-reader button{display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;width:44px;padding:0;border:0;border-radius:9px;background:transparent;color:#5c5360;cursor:pointer;transition:background-color .15s,color .15s,box-shadow .15s}
.pinky-reader button:not(:disabled):hover{background:#f3edf0;color:#8e3f5d}
.pinky-reader button:active:not(:disabled){background:#eadfe5}
.pinky-reader button:disabled{opacity:.3;cursor:default}
.pinky-reader button svg{width:20px;height:20px;pointer-events:none}
.pinky-reader button:focus-visible,.pinky-reader input:focus-visible{outline:3px solid #c1545e;outline-offset:2px}
.pinky-reader input{width:44px;padding:6px;text-align:center;border:0;border-radius:7px;background:#f6f3f5;color:inherit;font-size:13px;font-weight:600;appearance:textfield;-moz-appearance:textfield}
.pinky-reader input::-webkit-inner-spin-button,.pinky-reader input::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
.pinky-reader-controls>span{padding:0 6px;color:#8c818d;font-size:12px;white-space:nowrap;font-variant-numeric:tabular-nums}
.pinky-reader .pinky-reader-download{margin-left:auto;background:#a64b6b;color:#fff;box-shadow:0 2px 4px #76334a1a}
.pinky-reader .pinky-reader-download:not(:disabled):hover{background:#8d3d5a;color:#fff}
.pinky-reader [role=status]{padding:0 16px}
.pinky-reader [role=status]:empty{display:none}
.pinky-reader-viewport{flex:1;min-height:0;overflow:auto;padding:12px;background:#f0edef}
.pinky-reader-page{position:relative;margin:auto;width:fit-content;box-shadow:0 3px 20px #35263112}
.pinky-reader-page canvas,.pinky-reader-page img{display:block}
.pinky-reader-page .textLayer{--total-scale-factor:var(--scale-factor);--scale-round-x:1px;--scale-round-y:1px;position:absolute;inset:0;overflow:hidden;line-height:1;opacity:1}.pinky-reader-page .textLayer :is(span,br){color:transparent;position:absolute;font-size:calc(var(--total-scale-factor) * var(--font-height));transform:rotate(var(--rotate,0deg)) scaleX(var(--scale-x,1));white-space:pre;transform-origin:0 0;cursor:text}.pinky-reader-page .textLayer ::selection{background:#ee708580}
.pinky-reader-error{color:#a84450}
@media(max-width:600px){.pinky-reader{width:100vw;max-width:100vw;height:100dvh;max-height:100dvh;border-radius:0}.pinky-reader header{padding:10px 12px}.pinky-reader nav{padding:8px;gap:8px}.pinky-reader-controls{gap:8px;padding:1px;border-radius:10px}.pinky-reader-controls>span{padding:0 3px}}
@media(prefers-reduced-motion:reduce){.pinky-reader button{transition:none}}
`;
const COPY={vi:{close:'Đóng',prev:'Trước',next:'Sau',fit:'Vừa chiều rộng',download:'Tải xuống',page:'Trang',zoomOut:'Thu nhỏ',zoomIn:'Phóng to',loading:'Đang tải file…',error:'Không thể đọc file. Kiểm tra nguồn hoặc thử lại.',retry:'Thử lại',sent:'Đã chuyển yêu cầu tải cho trình duyệt.',bounds:'Trang yêu cầu không tồn tại. Đang mở trang 1.'},en:{close:'Close',prev:'Previous',next:'Next',fit:'Fit width',download:'Download',page:'Page',zoomOut:'Zoom out',zoomIn:'Zoom in',loading:'Loading file…',error:'Cannot read this file. Check its source or retry.',retry:'Retry',sent:'Download handed to your browser.',bounds:'Requested page does not exist. Opening page 1.'},ja:{close:'閉じる',prev:'前へ',next:'次へ',fit:'幅に合わせる',download:'ダウンロード',page:'ページ',zoomOut:'縮小',zoomIn:'拡大',loading:'読み込み中…',error:'ファイルを読み込めません。再試行してください。',retry:'再試行',sent:'ダウンロードをブラウザーに渡しました。',bounds:'指定ページがありません。1ページ目を表示します。'}};
// Reuse the project's Lucide geometry; the exporter packages only these icon nodes.
const READER_ICONS={close:X,prev:ChevronLeft,next:ChevronRight,minus:ZoomOut,plus:ZoomIn,fit:MoveHorizontal,download:Download,retry:RotateCw,file:FileText};
function readerIcon(document,name){
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
 for(const [key,value] of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.75','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true',focusable:'false'}))svg.setAttribute(key,value);
 for(const [tag,attributes] of READER_ICONS[name]){const node=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attributes))node.setAttribute(key,value);svg.append(node);}return svg;
}
export async function loadFileBytes(resource,{readPrivate,signal}={}){
 signal=signal?AbortSignal.any([signal,AbortSignal.timeout(30000)]):AbortSignal.timeout(30000);
 let bytes;
 if(resource.file?.source.kind==='EXTERNAL')bytes=(await fetchExternalFile(resource.file.source.url,{hosts:[new URL(resource.file.source.url).hostname],signal})).bytes;
 else if(readPrivate)bytes=await readPrivate(resource,{signal});
 else bytes=await readBoundedResponse(await fetch(resource.path??resource.url,{credentials:'same-origin',signal,redirect:'error'}),{signal,limit:64*1048576});
 bytes=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);signal?.throwIfAborted();
 if(bytes.length!==resource.sizeBytes||await sha256(bytes)!==resource.sha256)throw Error('FILE_CHANGED');
 const detected=detectFile(bytes,{maxBytes:resource.file?25*1048576:64*1048576,maxImageBytes:resource.file?10*1048576:12*1048576});if(detected.mimeType!==resource.mimeType||resource.file&&detected.kind!==resource.file.kind)throw Error('FILE_TYPE');return {bytes,...detected};
}
async function deadline(promise,cancel){let timer;try{return await Promise.race([promise,new Promise((_resolve,reject)=>{timer=setTimeout(()=>{cancel?.();reject(Error('FILE_TIMEOUT'));},30000);})]);}finally{clearTimeout(timer);}}
export function createPinkyReader({document=globalThis.document,readPrivate,loadPdf,pdfWorkerUrl,locale=document.documentElement.lang,onError}={}){
 const copy=COPY[locale]??COPY.vi,dialog=document.createElement('dialog');dialog.className='pinky-reader';dialog.setAttribute('aria-label','PinkyLamb reader');const head=document.createElement('header'),title=document.createElement('h2'),nav=document.createElement('nav'),status=document.createElement('p'),viewport=document.createElement('div'),surface=document.createElement('div');status.setAttribute('role','status');viewport.className='pinky-reader-viewport';viewport.id='pinky-reader-'+crypto.randomUUID();surface.className='pinky-reader-page';viewport.append(surface);
 const paging=document.createElement('div'),zoomTools=document.createElement('div');paging.className=zoomTools.className='pinky-reader-controls';nav.append(paging,zoomTools);const badge=document.createElement('span');badge.className='pinky-reader-file-icon';badge.append(readerIcon(document,'file'));head.append(badge);
 const button=(text,icon,fn,parent=nav)=>{const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',text);b.title=text;b.append(readerIcon(document,icon));b.addEventListener('click',fn);parent.append(b);return b;};head.append(title);const close=button(copy.close,'close',()=>dialog.close(),head),prev=button(copy.prev,'prev',()=>void renderPage(page-1),paging),pageInput=document.createElement('input'),total=document.createElement('span');pageInput.type='number';pageInput.min='1';pageInput.setAttribute('aria-label',copy.page);paging.append(pageInput,total);const next=button(copy.next,'next',()=>void renderPage(page+1),paging),minus=button(copy.zoomOut,'minus',()=>{zoom=Math.max(.25,renderedScale-.25);void renderPage(page);},zoomTools),plus=button(copy.zoomIn,'plus',()=>{zoom=Math.min(3,renderedScale+.25);void renderPage(page);},zoomTools),fit=button(copy.fit,'fit',()=>{zoom=0;void renderPage(page);},zoomTools),download=button(copy.download,'download',()=>save()),retry=button(copy.retry,'retry',()=>void open(resource,{initialPage:page}));for(const b of [minus,plus,fit])b.setAttribute('aria-controls',viewport.id);download.className='pinky-reader-download';retry.hidden=true;dialog.append(head,nav,status,viewport);document.body.append(dialog);
 let serial=0,renderSerial=0,controller,pdf,loading,renderTask,textTask,currentBytes,format,resource,page=1,zoom=0,renderedScale=1,opener,imageUrl,destroyed=false,engine;
 const active=n=>!destroyed&&n===serial&&!controller?.signal.aborted;
 function clear(){serial++;renderSerial++;controller?.abort();renderTask?.cancel();textTask?.cancel();void loading?.destroy().catch(()=>{});pdf=loading=renderTask=textTask=null;currentBytes=null;surface.replaceChildren();if(imageUrl)URL.revokeObjectURL(imageUrl);imageUrl=null;download.disabled=true;}
 function save(){if(!currentBytes)return;const url=URL.createObjectURL(new Blob([currentBytes],{type:resource.mimeType})),a=document.createElement('a');a.href=url;a.download=safeDownloadName(resource.file?.downloadName??resource.id,format);a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent=copy.sent;}
 async function renderPage(target){
  if(!currentBytes)return;const n=serial,r=++renderSerial;renderTask?.cancel();textTask?.cancel();surface.replaceChildren();
  try{if(pdf){if(target<1||target>pdf.numPages)return;page=target;pageInput.value=String(page);total.textContent='/ '+pdf.numPages;pageInput.disabled=false;prev.disabled=page===1;next.disabled=page===pdf.numPages;const p=await deadline(pdf.getPage(page),()=>void loading?.destroy().catch(()=>{}));if(!active(n)||r!==renderSerial)return;const natural=p.getViewport({scale:1}),ratio=Math.min(2,document.defaultView.devicePixelRatio||1),maxScale=Math.min(3,Math.sqrt(15000000/(natural.width*natural.height*ratio*ratio))),scale=Math.min(maxScale,zoom||Math.max(.01,(viewport.clientWidth-32)/natural.width)),v=p.getViewport({scale});renderedScale=scale;minus.disabled=scale<=.25;plus.disabled=scale>=maxScale;if(v.width*v.height*ratio*ratio>16000000)throw Error('RENDER_SIZE');const canvas=document.createElement('canvas');canvas.width=Math.ceil(v.width*ratio);canvas.height=Math.ceil(v.height*ratio);canvas.style.width=v.width+'px';canvas.style.height=v.height+'px';surface.style.width=v.width+'px';surface.style.height=v.height+'px';surface.append(canvas);renderTask=p.render({canvasContext:canvas.getContext('2d'),viewport:v,transform:ratio===1?null:[ratio,0,0,ratio,0,0]});await deadline(renderTask.promise,()=>renderTask?.cancel());if(!active(n)||r!==renderSerial)return;const text=document.createElement('div');text.className='textLayer';text.style.setProperty('--scale-factor',String(scale));surface.append(text);const textContent=await deadline(p.getTextContent(),()=>void loading?.destroy().catch(()=>{}));if(!active(n)||r!==renderSerial)return false;textTask=new engine.TextLayer({textContentSource:textContent,container:text,viewport:v});await deadline(textTask.render(),()=>textTask?.cancel());if(!active(n)||r!==renderSerial)return;pageInput.value=String(page);total.textContent='/ '+pdf.numPages;prev.disabled=page===1;next.disabled=page===pdf.numPages;
  }else{const img=document.createElement('img');img.alt=resource.alt??resource.file?.name??resource.id;img.src=imageUrl;await deadline(img.decode(),()=>{img.src='';});if(!active(n)||r!==renderSerial)return;if(img.naturalWidth*img.naturalHeight>40000000||resource.width&&img.naturalWidth!==resource.width||resource.height&&img.naturalHeight!==resource.height)throw Error('IMAGE_SIZE');renderedScale=zoom||Math.min(1,(viewport.clientWidth-24)/img.naturalWidth);minus.disabled=renderedScale<=.25;plus.disabled=renderedScale>=3;img.style.width=img.naturalWidth*renderedScale+'px';img.style.maxWidth='none';surface.style.width=img.naturalWidth*renderedScale+'px';surface.style.height='auto';surface.append(img);}return true;}
  catch(error){if(active(n)&&r===renderSerial&&error.name!=='RenderingCancelledException'){status.textContent=copy.error;onError?.(error);}return false;}
 }
 async function open(input,{initialPage=1}={}){
  const previous=opener??document.activeElement;clear();resource=input;opener=previous;controller=new AbortController();const n=serial;page=initialPage;zoom=0;status.textContent=copy.loading;title.textContent=input.file?.name??input.displayName??input.alt??(input.mimeType==='application/pdf'?'Pinky Lamb · PDF':input.id);total.textContent='/ —';pageInput.value='';prev.disabled=next.disabled=pageInput.disabled=true;retry.hidden=true;
  try{const result=await loadFileBytes(input,{readPrivate,signal:controller.signal});if(!active(n))return false;currentBytes=result.bytes;format=result.format;
   if(result.disposition==='DOWNLOAD'){save();currentBytes=null;return true;}
   if(!dialog.open)dialog.showModal();close.focus();download.disabled=false;
   const isPdf=result.kind==='PDF';paging.hidden=!isPdf;for(const el of [prev,next,pageInput,total])el.hidden=!isPdf;
   if(isPdf){engine??=loadPdf?await loadPdf():await import('./pdf.mjs');if(!active(n))return false;engine.GlobalWorkerOptions.workerSrc=pdfWorkerUrl??defaultWorkerUrl;loading=engine.getDocument({data:currentBytes.slice(),isEvalSupported:false,enableXfa:false,disableFontFace:true,maxImageSize:40000000});pdf=await deadline(loading.promise,()=>void loading?.destroy().catch(()=>{}));if(!active(n))return false;if(pdf.numPages>48||resource.file?.pageCount&&pdf.numPages!==resource.file.pageCount)throw Error('PDF_PAGES');if(page<1||page>pdf.numPages){page=1;status.textContent=copy.bounds;}else status.textContent='';}
   else{imageUrl=URL.createObjectURL(new Blob([currentBytes],{type:result.mimeType}));status.textContent='';}
   const rendered=await renderPage(page);return Boolean(rendered&&active(n));
  }catch(error){if(active(n)){currentBytes=null;download.disabled=true;status.textContent=copy.error;retry.hidden=false;if(!dialog.open)dialog.showModal();close.focus();onError?.(error);}return false;}
 }
 pageInput.addEventListener('change',()=>{const value=Number(pageInput.value);if(Number.isInteger(value)&&value>=1&&value<=pdf?.numPages)void renderPage(value);else pageInput.value=String(page);});
 dialog.addEventListener('close',()=>{clear();opener?.isConnected&&opener.focus();opener=null;});const session=()=>{if(dialog.open)dialog.close();else clear();};document.addEventListener('cms:session',session);
 return {open,close:session,destroy(){destroyed=true;clear();document.removeEventListener('cms:session',session);dialog.remove();}};
}
