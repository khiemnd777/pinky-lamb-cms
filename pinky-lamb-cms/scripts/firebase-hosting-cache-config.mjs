import {PUBLIC_ASSET_CACHE_CONTROL,PUBLIC_DOCUMENT_CACHE_CONTROL} from './public-cache-policy.mjs';

/** Cache headers for a CMS artifact package, never for the historical root dist site. */
export function firebaseHostingCacheConfig({indexing='noindex'}={}){
 if(!['noindex','index'].includes(indexing))throw Error('Explicit indexing mode required');
 const header=(source,value)=>({source,headers:[{key:'Cache-Control',value}]});
 return {hosting:{public:'public',ignore:['firebase.json','**/.*','**/node_modules/**'],headers:[
  {source:'**',headers:[{key:'Cache-Control',value:'no-store'},{key:'X-Content-Type-Options',value:'nosniff'},...(indexing==='noindex'?[{key:'X-Robots-Tag',value:'noindex, nofollow'}]:[])]},
  ...['/','/index.html','/vi/','/vi/index.html','/ja/','/ja/index.html','/sitemap.xml'].map(source=>header(source,PUBLIC_DOCUMENT_CACHE_CONTROL)),
  header('/assets/cache/**',PUBLIC_ASSET_CACHE_CONTROL)
 ]}};
}
