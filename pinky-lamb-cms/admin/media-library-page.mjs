import {mediaPublicSchema} from '../contracts/media-read-public.mjs';
import {fileAssetSchema} from '../contracts/file-resource.mjs';

/** One bounded page per eligible server stream. Cursors never cross kind/source filters. */
export async function readLibraryPage({apiFetch,kind='ALL',source='ALL',status='ALL',cursors={},signal}){
 const streams=[];
 if(source!=='EXTERNAL')for(const type of ['IMAGE','PDF','VIDEO']){
  if(kind!=='ALL'&&kind!==type)continue;
  streams.push({key:type,path:'/api/cms/media',query:{kind:type,status,pageSize:'20'},file:false});
 }
 if(kind!=='VIDEO'&&['ALL','READY'].includes(status))streams.push({key:'FILES',path:'/api/cms/files',query:{...(kind==='ALL'?{}:{kind}),...(source==='ALL'?{}:{source:source==='EXTERNAL'?'EXTERNAL':'HOSTED'})},file:true});
 const pages=await Promise.all(streams.filter(stream=>cursors[stream.key]!==null).map(async stream=>{
  const query=new URLSearchParams(stream.query);if(cursors[stream.key])query.set('cursor',cursors[stream.key]);
  const result=await apiFetch(stream.path+(query.size?'?'+query:''),{signal});
  if(!Array.isArray(result.items)||result.items.length>20||!(result.nextCursor===null||typeof result.nextCursor==='string'&&/^[A-Za-z0-9_-]{1,2048}$/.test(result.nextCursor)))throw Error('Invalid library page');
  const items=result.items.map(input=>{
   if(!stream.file)return {...mediaPublicSchema.parse(input),source:'MEDIA_VERSION'};
   const asset=fileAssetSchema.parse(input);return {id:asset.assetId,name:asset.name,kind:asset.kind,status:'READY',revision:asset.revision,source:'FILE_RESOURCE',asset,canArchive:result.canArchiveIds?.includes(asset.assetId)===true};
  });return {key:stream.key,items,cursor:result.nextCursor};
 }));
 return {items:pages.flatMap(page=>page.items),cursors:Object.fromEntries(streams.map(stream=>[stream.key,pages.find(page=>page.key===stream.key)?.cursor??null])),hasNext:pages.some(page=>page.cursor!==null)};
}
