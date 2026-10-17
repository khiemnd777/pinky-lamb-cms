// Frozen QA URLs remain part of persisted snapshot/hash identity. Resolve only
// their closed derivative capability into the current same-origin transport.
export function localizedPrivateResourcePath(resource){
 const url=new URL(resource.url),match=/^\/api\/cms\/media\/([A-Za-z0-9_-]{1,100})\/derivatives\/([A-Za-z0-9][A-Za-z0-9_-]{0,127})$/.exec(url.pathname);
 if(url.href!==resource.url||url.username||url.password||url.origin!=='http://127.0.0.1:5173'||url.search||url.hash||!resource.derivative||!match||match[1]!==String(resource.assetId??resource.id)||match[2]!==resource.derivative.key)throw Error('Invalid frozen private resource');
 return url.pathname;
}
export function localizedResourceTransportUrl(resource){
 if(resource.derivative)return `http://127.0.0.1:5273${localizedPrivateResourcePath(resource)}`;
 const url=new URL(resource.url);
 if(url.href!==resource.url||url.username||url.password||url.origin!=='http://127.0.0.1:5010'||url.pathname!==`/${resource.path}`||url.search||url.hash)throw Error('Invalid static resource');
 return url.href;
}
