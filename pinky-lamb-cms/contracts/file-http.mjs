export function isAllowedFileRequest(path,method){
 if(typeof path!=='string'||path.length>4096||path.includes('#')||!path.startsWith('/api/cms/files'))return false;
 const url=new URL(path,'http://127.0.0.1:5273');if(path!==url.pathname+url.search)return false;
 if(url.pathname==='/api/cms/files'&&method==='GET'){const keys=[...url.searchParams.keys()];return keys.length===new Set(keys).size&&keys.every(k=>['kind','source','cursor'].includes(k))&&(!url.searchParams.has('kind')||['IMAGE','PDF','WORD','EXCEL'].includes(url.searchParams.get('kind')))&&(!url.searchParams.has('source')||['EXTERNAL','HOSTED'].includes(url.searchParams.get('source')))&&(!url.searchParams.has('cursor')||/^[A-Za-z0-9_-]{1,100}$/.test(url.searchParams.get('cursor')));}
 if(url.search)return false;if(url.pathname==='/api/cms/files')return method==='POST';if(url.pathname==='/api/cms/files/policy')return method==='GET';
 return method==='GET'&&/^\/api\/cms\/files\/[A-Za-z0-9_-]{1,100}(?:\/bytes)?$/.test(path)||method==='POST'&&/^\/api\/cms\/files\/[A-Za-z0-9_-]{1,100}\/(?:complete|archive)$/.test(path)||method==='PUT'&&/^\/api\/cms\/files\/[A-Za-z0-9_-]{1,100}\/parts\/[0-6]$/.test(path);
}
