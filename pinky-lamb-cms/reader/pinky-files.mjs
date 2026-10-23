import {createPinkyReader,loadFileBytes} from './pinky-reader.mjs';
export function installFileReader(document){
 const policy=JSON.parse(document.getElementById('pinky-file-policy')?.textContent??'[]'),byId=new Map(policy.map(r=>[r.id,r])),reader=createPinkyReader({document});
 document.addEventListener('click',event=>{const link=event.target.closest('[data-pinky-open]');if(!link)return;const r=byId.get(link.dataset.pinkyOpen);if(!r)return;event.preventDefault();void reader.open(r,{initialPage:Number(link.dataset.pinkyPage??1)});});
 let active=0;const queue=[];function drain(){while(active<2&&queue.length){const img=queue.shift();active++;void (async()=>{try{const r=byId.get(img.dataset.pinkyImage),{bytes}=await loadFileBytes(r),url=URL.createObjectURL(new Blob([bytes],{type:r.mimeType}));img.src=url;img.addEventListener('load',()=>URL.revokeObjectURL(url),{once:true});img.addEventListener('error',()=>URL.revokeObjectURL(url),{once:true});}catch{img.setAttribute('data-file-error','');}finally{active--;drain();}})();}}
 const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);queue.push(entry.target);}drain();},{rootMargin:'150px'});
 for(const img of document.querySelectorAll('img[data-pinky-image]'))observer.observe(img);
 // Only existing project/gallery viewing points gain image reader behavior.
 document.addEventListener('click',event=>{const img=event.target.closest('.case-gallery img,.case-main-image');if(!img||event.defaultPrevented)return;const r=img.dataset.pinkyImageId?byId.get(img.dataset.pinkyImageId):img.dataset.pinkyImage?byId.get(img.dataset.pinkyImage):policy.find(r=>r.mimeType.startsWith('image/')&&new URL(r.path,document.baseURI).pathname===new URL(img.getAttribute('src')??'',document.baseURI).pathname);if(r)void reader.open({...r,alt:img.alt});});
 document.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)&&event.target.matches('.case-gallery img[role=button],img.case-main-image[role=button]')){event.preventDefault();event.target.click();}});
 return {destroy(){observer.disconnect();reader.destroy();}};
}
installFileReader(document);
