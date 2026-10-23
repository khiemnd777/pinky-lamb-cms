import {selectedResource} from './project-localization-context.mjs';
import {fileQaResource} from '../contracts/file-resource.mjs';
import {hashHeroValue,heroDependencyHash} from './hero-localization-dependency.mjs';
export {hashHeroValue} from './hero-localization-dependency.mjs';
import {HERO_PRESENTATION_ID,HERO_PRESENTATION_RESOURCE_ID,HERO_PRESENTATION_CSS,HERO_PRESENTATION_SHA256} from '../preview/hero-localization-presentation.mjs';
import {createHash} from 'node:crypto';
import {readFileSync,lstatSync,realpathSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ApiError} from '../contracts/errors.mjs';
import {heroQaResourceSchema} from '../contracts/hero-localization-records.mjs';
const ROOT=fileURLToPath(new URL('../',import.meta.url));
function staticResource(id,relative,mimeType){
 const root=path.resolve(ROOT,'public-baseline'),file=path.resolve(root,relative);
 if(!file.startsWith(root+path.sep))throw new ApiError('INTERNAL_ERROR');
 let current=root;for(const segment of relative.split('/')){current=path.join(current,segment);if(lstatSync(current).isSymbolicLink()||realpathSync(current)!==current)throw new ApiError('INTERNAL_ERROR');}
 const stat=lstatSync(file);if(!stat.isFile()||stat.nlink!==1||stat.size>12*1024*1024)throw new ApiError('INTERNAL_ERROR');
 const bytes=readFileSync(file);return heroQaResourceSchema.parse({id,path:relative,url:`http://127.0.0.1:5010/${relative}`,mimeType,sizeBytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),...(id==='styles'&&relative==='styles.css'&&mimeType==='text/css'?{inlineBase64:bytes.toString('base64')}:{})});
}
/** Reuse the exact trusted Home v3 reader and media authority checks. No writes. */
export async function createHeroLocalizationContext(options){
 const {createSiteV3ContextService,selectedSiteV3AssetIds}=await import('./site-v3-context.mjs');
 const trusted=await createSiteV3ContextService(options);
 async function readBase(transaction){
  const {current,record}=await trusted.readTrustedDraftContext({transaction,target:await transaction.get(trusted.db.collection('cmsDrafts').doc('home-v3'))});
  const selected=await trusted.selection(transaction,current.content,record,undefined,selectedSiteV3AssetIds(current.content).filter(id=>!record.legacyCatalog.some(a=>a.id===id)));
  return projectHeroQaContext(current,record,selected);
 }
 return {...trusted,readBase};
}

/** Projects only already-authorized media selections into the closed QA resource set. */
export function projectHeroQaContext(current,record,selected){
  function selectedImage(imageId){const entry=selected.orderedManifest.find(e=>(e.source==='LEGACY'?e.asset.id:e.asset.assetId)===imageId);
  if(!entry||entry.asset.kind!=='IMAGE')throw new ApiError('VALIDATION_ERROR');
  let image;
  if(entry.source==='FILE_RESOURCE')return fileQaResource(entry.asset);
  if(entry.source==='LEGACY'){
   const asset=record.legacyCatalog.find(a=>a.id===imageId);if(!asset)throw new ApiError('INTERNAL_ERROR');
   image=heroQaResourceSchema.parse({id:imageId,path:asset.legacyPath,url:`http://127.0.0.1:5010/${asset.legacyPath}`,mimeType:asset.mimeType,sizeBytes:asset.sizeBytes,sha256:asset.sha256,width:asset.width,height:asset.height});
  }else{
   const d=entry.asset.derivatives.find(d=>d.role==='IMAGE'&&d.targetWidth===960);if(!d)throw new ApiError('VALIDATION_ERROR');
   image=heroQaResourceSchema.parse({id:imageId,path:`assets/${imageId}-${d.key}.webp`,url:`http://127.0.0.1:5173/api/cms/media/${imageId}/derivatives/${d.key}`,mimeType:d.mimeType,sizeBytes:d.sizeBytes,sha256:d.sha256,width:d.width,height:d.height,derivative:{key:d.key,role:d.role,mime:d.mimeType,bytes:d.sizeBytes,sha256:d.sha256,generation:d.generation,width:d.width,height:d.height,targetWidth:d.targetWidth}});
  }
  return image;}
  const image=selectedImage(current.content.hero.image.assetId),logo=selectedImage(current.content.settings.brand.logo.assetId),css=Buffer.from(HERO_PRESENTATION_CSS);
  const presentation={id:HERO_PRESENTATION_ID,brand:{name:current.content.settings.brand.name,tagline:current.content.settings.brand.tagline,logoResourceId:logo.id},stylesheetResourceId:HERO_PRESENTATION_RESOURCE_ID};
  const resources=[image,...(logo.id===image.id?[]:[logo]),{id:HERO_PRESENTATION_RESOURCE_ID,path:'assets/hero-presentation-v1.css',sourceKind:'APPLICATION_INLINE',mimeType:'text/css',sizeBytes:css.length,sha256:HERO_PRESENTATION_SHA256,inlineBase64:css.toString('base64')},staticResource('styles','styles.css','text/css'),...['abril-fatface-400','montserrat-400','montserrat-600','montserrat-700','montserrat-800'].map(name=>staticResource(name,`assets/${name}.woff`,'font/woff'))];
  for(const action of [current.content.hero.primaryAction,current.content.hero.secondaryAction].filter(a=>a?.kind==='FILE')){const entry=selected.orderedManifest.find(e=>e.asset.assetId===action.assetId);if(!entry||!['IMAGE','PDF','WORD','EXCEL'].includes(entry.asset.kind))throw new ApiError('VALIDATION_ERROR');const resource=selectedResource(entry,entry.asset.kind);if(!resources.some(r=>r.id===resource.id))resources.push(resource);}
  const base={revision:current.revision,contentHash:hashHeroValue(current.content),hero:current.content.hero};
  base.dependencyHash=heroDependencyHash(current,record,{base,resources,presentation});
  return {base,resources,presentation};
}
