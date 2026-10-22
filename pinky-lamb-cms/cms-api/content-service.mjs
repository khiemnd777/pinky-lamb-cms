import {isYoutubeReel} from '../contracts/showreel-source.mjs';
import {randomUUID,createHash} from 'node:crypto';
import {ApiError,validationError} from '../contracts/errors.mjs';
import {contentGroupSchema,contentGroupSaveSchema} from '../contracts/content-workspace.mjs';
import {parseMediaV3Content} from '../contracts/media-v3-content.mjs';
import {encodeStoredDraftV2} from '../contracts/media-v3-records-v2.mjs';
import {safeMetadataFromReadyVersionV2} from '../contracts/media-v3-contract-v2.mjs';
import {createSiteV3ContextService,selectedSiteV3AssetIds} from './site-v3-context.mjs';
import {mutationIdentity} from './drafts.mjs';

const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const clone=v=>structuredClone(v);
const GROUP_SECTION={clients:'clients',work:'work',services:'services',about:'about',ip:'ip-studio',contact:'contact',footer:'footer'};
const SETTINGS={settings:['header','brand','nav','credential'],clients:[],work:['credential'],services:[],about:['credential','showreel'],ip:['credential'],contact:['contact'],footer:['copyright','contact','brand'],structure:[]};
function ownSettings(group){return group==='footer'?['copyright']:SETTINGS[group].filter(key=>key!=='credential'||group==='about');}
function bindingOwned(group,path){return group==='settings'?['hero/facts','seo/facts','settings/brand/facts'].includes(path):group==='clients'?path.startsWith('clientLogos/'):group==='work'?path.startsWith('projects/'):group==='services'?path.startsWith('services/'):group==='about'?['settings/credential/facts','settings/showreel/facts','sections/about/facts'].includes(path):group==='ip'?path==='sections/ip-studio/facts':group==='contact'?path==='settings/contact/facts':group==='footer'?['sections/footer/facts','creative-copy'].includes(path):false;}
function selectedIds(value){const out=new Set();function walk(v){if(!v||typeof v!=='object')return;if(typeof v.assetId==='string')out.add(v.assetId);for(const child of Object.values(v))walk(child);}walk(value);return out;}
function required(repo,kind,id){const e=repo.readEntity(kind,id);if(!e)throw new ApiError('NOT_FOUND');return e;}
function versionRows(repo,group){
 const keys=[['structure','site']];if(SETTINGS[group].length)keys.push(['settings','site']);if(GROUP_SECTION[group])keys.push(['section',GROUP_SECTION[group]]);if(group==='settings')keys.push(['hero','home'],['seo','site']);
 const values=keys.map(([kind,id])=>required(repo,kind,id));
 for(const [g,kind]of [['work','project'],['services','service'],['clients','client']])if(group===g)values.push(...repo.listEntities(kind));
 return values;
}
function projectContent(repo,group){
 const structure=required(repo,'structure','site').value,settings=SETTINGS[group].length?required(repo,'settings','site').value:{},sections=[];
 if(GROUP_SECTION[group])sections.push(required(repo,'section',GROUP_SECTION[group]).value);
 for(const e of repo.listEntities('section'))if(!sections.some(s=>s.sectionId===e.id))sections.push({sectionId:e.id,isVisible:e.value.isVisible??true});
 const model={schemaVersion:3,locale:structure.locale,sectionOrder:structure.sectionOrder,claimSources:structure.claimSources.filter(b=>bindingOwned(group,b.claimPath)),settings:Object.fromEntries(SETTINGS[group].filter(key=>Object.hasOwn(settings,key)).map(key=>[key,clone(settings[key])])),sections,projects:[],services:[]};
 if(group==='settings'){model.hero=required(repo,'hero','home').value;model.seo=required(repo,'seo','site').value;}
 if(group==='clients')model.settings.clientLogos=repo.listEntities('client').map(e=>e.value);
 if(group==='work')model.projects=repo.listEntities('project').map(e=>e.value);
 else if(group==='about')model.projects=repo.listEntities('project').map(e=>({id:e.id,title:e.value.title,...(e.value.publicCredentialPage!==undefined?{publicCredentialPage:e.value.publicCredentialPage}:{})}));
 if(['work','services','contact'].includes(group))model.services=repo.listEntities('service').map(e=>group==='services'?e.value:{id:e.id,title:e.value.title,...(e.value.titleVi!==undefined?{titleVi:e.value.titleVi}:{}),isVisible:e.value.isVisible??true});
 return model;
}
function sourceContext(db){
 const site=db.content.head();if(!site)throw new ApiError('DRAFT_NOT_INITIALIZED');const metadata=JSON.parse(site.head_json),record=db.row('cmsSiteV3Imports/'+metadata.importLineage.importId);if(!record)throw new ApiError('INTERNAL_ERROR');
 const imported=JSON.parse(record.body);return {metadata,imported,context:{sourceCatalog:imported.sourceCatalog,currentYear:new Date().getUTCFullYear(),...(imported.allowedShowreelSourceUrl?{allowedShowreelSourceUrl:imported.allowedShowreelSourceUrl}:{})}};
}
function catalogFor(db,content,imported){
 const ids=selectedIds(content),entries=[];
 for(const assetId of ids){const legacy=imported.legacyCatalog.find(a=>a.id===assetId);if(legacy){entries.push({source:'LEGACY',asset:{id:legacy.id,kind:legacy.kind,status:'LEGACY_READY',legacyPath:legacy.legacyPath,label:legacy.legacyPath.split('/').at(-1),...Object.fromEntries(['width','height','durationSeconds'].filter(k=>legacy[k]!==undefined).map(k=>[k,legacy[k]]))}});continue;}
  const source=db.row('cmsMediaVersions/'+assetId);if(!source)throw new ApiError('NOT_FOUND');const version=JSON.parse(source.body);
  if(version.status!=='READY')throw new ApiError('VALIDATION_ERROR');
  // Read DTOs expose only public dimensions/status. Authority remains the
  // Media/Publishing command owner's responsibility at the write boundary.
  entries.push({source:'MEDIA_VERSION',asset:safeMetadataFromReadyVersionV2(version.readyVersion)});
 }
 return entries.sort((a,b)=>(a.source+'/'+(a.asset.id??a.asset.assetId)).localeCompare(b.source+'/'+(b.asset.id??b.asset.assetId)));
}

/** Native SQLite read model. No media authority reconstruction, preview or
 * readiness computation is reachable from readGroup/bootstrap. */
export function createContentService({db,authorize,mediaProvider}){
 const repo=db.content;if(!repo)throw new ApiError('LOCAL_RUNTIME_UNAVAILABLE');
 function groupRead(group){
  group=contentGroupSchema.parse(group);const {metadata,imported,context}=sourceContext(db),content=projectContent(repo,group),entities=versionRows(repo,group);
  const index={};for(const [list,kind]of [['projects','project'],['services','service']])index[list]=repo.sql.prepare("SELECT entity_id AS id,json_extract(body,'$.title') AS title FROM cms_content_entities WHERE site_id='home-v3' AND kind=? ORDER BY position,entity_id").all(kind);
  return {contractRevision:1,group,siteRevision:metadata.revision,sourceHash:digest(entities.map(e=>({kind:e.kind,id:e.id,revision:e.revision}))),entities:entities.map(({kind,id,revision})=>({kind,id,revision})),content,catalog:catalogFor(db,content,imported),context:{...context,importLineage:metadata.importLineage,index}};
 }
 async function readGroup({request,group}){await authorize(request,'MEMBER_READ');return groupRead(group);}
 async function bootstrap({request,group='settings'}){const member=await authorize(request,'MEMBER_READ');return {contractRevision:1,member:{...member,isActive:true},navigation:['settings','clients','work','services','about','ip','contact','footer','structure'],group:groupRead(group)};}
 async function saveGroup({request,actor,group,body,key,correlationId}){
  group=contentGroupSchema.parse(group);let input;try{input=contentGroupSaveSchema.parse(body);}catch(e){throw validationError(e);}
  const identity=mutationIdentity(actor.uid,'PATCH /api/cms/content/groups/'+group,key,input),eventId=randomUUID(),at=new Date().toISOString(),trusted=await createSiteV3ContextService({db,authorize,mediaProvider});
  const receipt=await db.runTransaction(async tx=>{
   if((await authorize(request,'DRAFT_SAVE',tx)).uid!==actor.uid)throw new ApiError('FORBIDDEN');
   const intentRef=db.collection('cmsIdempotency').doc(identity.id),prior=await tx.get(intentRef);
   if(prior.exists){const p=prior.data();if(p.requestHash!==identity.requestHash)throw new ApiError('IDEMPOTENCY_PAYLOAD_MISMATCH');return p.response;}
   const currentEntities=versionRows(repo,group),expected=new Map(input.expected.map(e=>[e.kind+'/'+e.id,e.revision]));
   if(expected.size!==input.expected.length||currentEntities.some(e=>expected.get(e.kind+'/'+e.id)!==e.revision)||expected.size!==currentEntities.length)throw new ApiError('REVISION_CONFLICT');
   tx.validate(()=>{const actual=versionRows(repo,group);return actual.length===expected.size&&actual.every(e=>expected.get(e.kind+'/'+e.id)===e.revision);});
   const targetRef=db.collection('cmsDrafts').doc('home-v3'),{current,record,context}=await trusted.readTrustedDraftContext({transaction:tx,target:await tx.get(targetRef)}),next=clone(current.content),submitted=input.content;
   if(!submitted||typeof submitted!=='object'||Array.isArray(submitted))throw new ApiError('VALIDATION_ERROR');
   // A section command can mutate only its owned source fields. Reference
   // indexes in the editor payload never become authority to write siblings.
   for(const key of ownSettings(group)){if(!Object.hasOwn(submitted.settings??{},key))throw new ApiError('VALIDATION_ERROR');next.settings[key]=clone(submitted.settings[key]);}
   if(group==='settings'){next.hero=clone(submitted.hero);next.seo=clone(submitted.seo);}
   if(GROUP_SECTION[group]){const section=submitted.sections?.find(s=>s.sectionId===GROUP_SECTION[group]);if(!section)throw new ApiError('VALIDATION_ERROR');next.sections[next.sections.findIndex(s=>s.sectionId===section.sectionId)]=clone(section);}
   for(const [g,list]of [['work','projects'],['services','services']])if(group===g){if(!Array.isArray(submitted[list])||next[list].some(e=>!submitted[list].some(n=>n.id===e.id)))throw new ApiError('VALIDATION_ERROR');next[list]=clone(submitted[list]);}
   if(group==='clients'){if(!Array.isArray(submitted.settings?.clientLogos)||next.settings.clientLogos.some(e=>!submitted.settings.clientLogos.some(n=>n.id===e.id)))throw new ApiError('VALIDATION_ERROR');next.settings.clientLogos=clone(submitted.settings.clientLogos);}
   if(group==='structure')next.sectionOrder=clone(submitted.sectionOrder);
   if(!Array.isArray(submitted.claimSources)||submitted.claimSources.some(b=>!bindingOwned(group,b.claimPath)))throw new ApiError('VALIDATION_ERROR');
   const bindings=new Map(submitted.claimSources.map(b=>[b.claimPath,b]));
   next.claimSources=next.claimSources.flatMap(b=>{if(!bindingOwned(group,b.claimPath))return [b];const replacement=bindings.get(b.claimPath);bindings.delete(b.claimPath);return replacement?[clone(replacement)]:[];});next.claimSources.push(...clone([...bindings.values()]));
   if(group==='about'&&next.settings.credential.assetId!==current.content.settings.credential.assetId){
    // Credential buttons are references to the shared PDF, not independent
    // selections. Move those references atomically with the owning PDF change.
    const previous=current.content.settings.credential.assetId,nextId=next.settings.credential.assetId;
    const relink=value=>{if(!value||typeof value!=='object')return;if(value.kind==='CREDENTIAL'&&value.assetId===previous)value.assetId=nextId;for(const child of Object.values(value))relink(child);};relink(next);
   }
   const resolved=await trusted.selection(tx,next,record,undefined,selectedSiteV3AssetIds(current.content).filter(id=>!record.legacyCatalog.some(a=>a.id===id)));
   if(!isYoutubeReel(next.settings.showreel)){const reel=resolved.expectedMediaVersions.find(v=>v.assetId===next.settings.showreel.assetId)??record.legacyCatalog.find(v=>v.id===next.settings.showreel.assetId);if(!reel||reel.kind!=='VIDEO'||!Number.isFinite(reel.durationSeconds)||reel.durationSeconds<=0)throw new ApiError('VALIDATION_ERROR');next.settings.showreel.durationSeconds=reel.durationSeconds;}
   const content=parseMediaV3Content(next,context.contentContext),stored=encodeStoredDraftV2({...current,revision:current.revision+1,updatedBy:actor.uid,updatedAt:at,lastEventId:eventId,content},context);
   const response={contractRevision:1,group,siteRevision:stored.revision,lastEventId:eventId,updatedAt:at};
   if((await authorize(request,'DRAFT_SAVE',tx)).uid!==actor.uid)throw new ApiError('FORBIDDEN');tx.set(targetRef,stored);tx.create(db.collection('cmsAudit').doc(eventId),{id:eventId,action:'CONTENT_GROUP_SAVED',actorUid:actor.uid,at,correlationId,group,requestHash:identity.requestHash,receipt:response});tx.create(intentRef,{contractRevision:1,requestHash:identity.requestHash,state:'COMPLETED',response,eventId});return response;
  });
  return {...receipt,read:groupRead(group)};
 }
 return {bootstrap,readGroup,saveGroup,groupRead};
}
