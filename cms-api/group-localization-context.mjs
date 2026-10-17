import {ApiError} from '../contracts/errors.mjs';
import {groupIdSchema,groupSourceFromHome,groupContentFromSource,groupSourceMediaUses,groupBaseSchema,GROUP_TEMPLATE_ID} from '../contracts/group-localization.mjs';
import {localizedQaResourceSchema} from '../contracts/group-localization-records.mjs';
import {hashProjectValue,projectTemplateResources,PROJECT_TEMPLATE_PINS} from './project-localization-context.mjs';
import {publicMediaDerivative} from '../contracts/media-read-public.mjs';
export const hashGroupValue=hashProjectValue;
export function groupClaimPaths(id,source){const paths={header:['settings/brand/facts','settings/credential/facts'],clients:(source.logos??[]).map(l=>`clientLogos/${l.id}/facts`),about:['sections/about/facts','settings/showreel/facts'],'ip-studio':['sections/ip-studio/facts'],contact:['settings/contact/facts'],footer:['sections/footer/facts'],seo:['seo/facts']};return ['creative-copy',...paths[groupIdSchema.parse(id)]];}
export {groupSourceMediaUses as groupAssetUses} from '../contracts/group-localization.mjs';
export function localizedMediaResource(entry,role){
 if(!entry)throw new ApiError('VALIDATION_ERROR');const a=entry.asset,id=entry.source==='LEGACY'?a.id:a.assetId;
 if(entry.source==='LEGACY'){const expected=role==='IMAGE'?'IMAGE':role==='VIDEO'?'VIDEO':role==='PDF_DOWNLOAD'?'PDF':null;if(a.kind!==expected)throw new ApiError('VALIDATION_ERROR');return localizedQaResourceSchema.parse({id,...(role==='VIDEO'?{assetId:id}:{}),path:a.legacyPath,url:`http://127.0.0.1:5010/${a.legacyPath}`,mimeType:a.mimeType,sizeBytes:a.sizeBytes,sha256:a.sha256,...(role==='IMAGE'?{width:a.width,height:a.height}:{}),...(role==='VIDEO'&&a.durationSeconds?{durationSeconds:a.durationSeconds}:{})});}
 const d=a.derivatives.find(d=>role==='IMAGE'?d.role==='IMAGE'&&d.targetWidth===960:d.role===role);if(!d)throw new ApiError('VALIDATION_ERROR');const ext=role==='VIDEO'?'mp4':role==='PDF_DOWNLOAD'?'pdf':'webp',alias=role==='POSTER'?id+'-poster':id;
 return localizedQaResourceSchema.parse({id:alias,...(['VIDEO','POSTER'].includes(role)?{assetId:id}:{}),path:`assets/${id}-${d.key}.${ext}`,url:`http://127.0.0.1:5173/api/cms/media/${id}/derivatives/${d.key}`,mimeType:d.mimeType,sizeBytes:d.sizeBytes,sha256:d.sha256,...(d.width?{width:d.width,height:d.height}:{}),...(d.durationSeconds?{durationSeconds:d.durationSeconds}:{}),derivative:publicMediaDerivative(d)});
}
export function projectGroupQaContext(current,record,selected,groupId){
 const source=groupSourceFromHome(current.content,groupId);groupContentFromSource(groupId,source);const uses=groupSourceMediaUses(groupId,source),resources=new Map(projectTemplateResources().map(r=>[r.id,r])),mediaSlots=[];
 for(const use of uses){const entry=selected.orderedManifest.find(e=>(e.source==='LEGACY'?e.asset.id:e.asset.assetId)===use.assetId),resource=localizedMediaResource(entry,use.role);if(resources.has(resource.id)&&hashGroupValue(resources.get(resource.id))!==hashGroupValue(resource))throw new ApiError('INTERNAL_ERROR');resources.set(resource.id,resource);mediaSlots.push({...use,resourceId:resource.id});}
 const paths=groupClaimPaths(groupId,source),bindings=current.content.claimSources.filter(b=>paths.includes(b.claimPath)),sourceIds=new Set(bindings.flatMap(b=>b.sourceIds)),sources=record.sourceCatalog.filter(s=>sourceIds.has(s.id));if(!bindings.length||sources.length!==sourceIds.size)throw new ApiError('INTERNAL_ERROR');
 const media=selected.orderedManifest.filter(e=>uses.some(u=>u.assetId===(e.source==='LEGACY'?e.asset.id:e.asset.assetId))),dependencyHash=hashGroupValue({kind:'GROUP_DEPENDENCY',groupId,source,bindings,sources,media,template:{id:GROUP_TEMPLATE_ID,pins:PROJECT_TEMPLATE_PINS}});
 return {base:groupBaseSchema.parse({groupId,source,dependencyHash,templateIdentity:GROUP_TEMPLATE_ID}),resources:[...resources.values()],mediaSlots};
}
export async function createGroupLocalizationContext(options={}){
 const trusted=options.trustedContext??await (await import('./site-v3-context.mjs')).createSiteV3ContextService(options);
 async function readBase(tx,id){groupIdSchema.parse(id);const {current,record}=await trusted.readTrustedDraftContext({transaction:tx,target:await tx.get(trusted.db.collection('cmsDrafts').doc('home-v3'))}),source=groupSourceFromHome(current.content,id),uses=groupSourceMediaUses(id,source),projected={schemaVersion:3};
  // Keep actual source paths so the existing media authority validates each role.
  if(id==='header')projected.settings={brand:{logo:source.brand.logo},credential:source.credential};
  if(id==='clients')projected.settings={clientLogos:source.logos};
  if(id==='about'){projected.sections=[source.section];projected.settings={showreel:source.showreel};}
  if(id==='ip-studio')projected.sections=[source.section];
  if(id==='contact')projected.settings={contact:source.contact};
  if(id==='seo')projected.seo=source.seo;
  const selected=await trusted.selection(tx,projected,record,undefined,[...new Set(uses.map(u=>u.assetId))].filter(id=>!record.legacyCatalog.some(a=>a.id===id)).sort());return projectGroupQaContext(current,record,selected,id);
 }
 return {...trusted,readBase,load:async tx=>trusted.readTrustedDraftContext({transaction:tx,target:await tx.get(trusted.db.collection('cmsDrafts').doc('home-v3'))})};
}
