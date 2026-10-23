import {escapeHtml} from './hero-renderer.mjs';
export function fileReaderPolicy(resources,{publicMode=false}={}){
 return resources.filter(r=>r.file||r.mimeType==='application/pdf'||/^image\/(webp|jpeg|png)$/.test(r.mimeType)).map(r=>publicMode?{id:r.id,path:'/'+r.path,mimeType:r.mimeType,sizeBytes:r.sizeBytes,sha256:r.sha256,...(r.width?{width:r.width,height:r.height}:{}),...(r.file?{file:Object.fromEntries(Object.entries(r.file).filter(([key])=>key!=='rightsConfirmed'))}:{})}:r);
}
export function attachFileReaderHooks(html,resources,{privateMode=false,readerIds=[],locale='vi'}={}){
 for(const r of resources){
  if(!privateMode&&r.mimeType.startsWith('image/'))html=html.replaceAll('src="'+escapeHtml(r.path)+'"','data-pinky-image-id="'+escapeHtml(r.id)+'" src="'+escapeHtml(r.path)+'"');
  if(!privateMode&&r.file?.source.kind==='EXTERNAL'&&r.mimeType.startsWith('image/')){
   const escaped=escapeHtml(privateMode?r.url:r.path);
   html=html.replaceAll('src="'+escaped+'"','data-pinky-image="'+escapeHtml(r.id)+'"');
  }
  if(r.mimeType==='application/pdf'||r.file||readerIds.includes(r.id)){
   const paths=[r.path,r.url];for(const path of paths){const escaped=escapeHtml(path);html=html.replace(new RegExp('href="'+escaped.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?:#page=(\\d+))?"','g'),(_match,page)=>`data-pinky-open="${escapeHtml(r.id)}"${page?` data-pinky-page="${page}"`:''} href="${r.file?.source.kind==='EXTERNAL'?'#pinky-file':escaped+(page?'#page='+page:'')}"`);}
  }
 }
 if(!privateMode){const label={vi:'Xem ảnh',en:'View image',ja:'画像を表示'}[locale]??'View image',enhance=tag=>tag.includes('data-pinky-image-id=')?tag.replace('<img ',`<img role="button" tabindex="0" aria-label="${label}" `):tag;html=html.replace(/<img\b[^>]*class="case-main-image"[^>]*>/g,enhance).replace(/<div class="case-gallery">[\s\S]*?<\/div>/g,part=>part.replace(/<img\b[^>]*>/g,enhance));const noScript={vi:'JavaScript cần được bật để đọc và kiểm tra file.',en:'Enable JavaScript to read and verify files.',ja:'ファイルの閲覧と確認にはJavaScriptを有効にしてください。'}[locale]??'Enable JavaScript to read and verify files.',data=JSON.stringify(fileReaderPolicy(resources,{publicMode:true})).replaceAll('<','\\u003c');html=html.replace('</body>',`<script id="pinky-file-policy" type="application/json">${data}</script><noscript><p>${noScript}</p></noscript></body>`);}
 return html;
}
