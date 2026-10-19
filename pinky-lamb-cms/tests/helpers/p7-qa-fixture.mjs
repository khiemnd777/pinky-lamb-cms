import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fullSiteFixture} from '../full-site-localization-contract.test.mjs';
import {assembleFullSiteQa} from '../../cms-api/full-site-localizations.mjs';
import {buildSiteLocalePolicy} from '../../contracts/site-locale-projection.mjs';
import {hashProjectValue as hash} from '../../cms-api/project-localization-context.mjs';
import {releaseSnapshotSetHash} from '../../cms-api/localized-eligibility.mjs';
import {CMS_ROOT,digest} from '../../scripts/multilingual-release-files.mjs';
import {BASELINE_FILES} from '../../scripts/export-local.mjs';
import {mimeFor} from '../../scripts/multilingual-site-artifact.mjs';
import {mergeLocalizedGroup} from '../../contracts/group-localization.mjs';
import {mergeLocalizedHero} from '../../contracts/hero-localization.mjs';
import {mergeLocalizedProject} from '../../contracts/project-localization.mjs';
import {mergeLocalizedService} from '../../contracts/service-localization.mjs';
import {mergeLocalizedSection} from '../../contracts/work-services-localization.mjs';
import {p7QaCopy,p7TemplateData} from './p7-qa-copy.mjs';

function replaceCopy(qa,content,key,merge,source){qa.draft.content=content;qa.draft.contentHash=hash(content);qa[key]=merge(source,content);}
const alt=(image,text)=>image.isDecorative?'':text;

const resourceAliases={
 'asset-image-g01':{path:'assets/qa-hero-cover.webp',source:'assets/pinky-hero.webp'},
 credential:{path:'assets/credential.pdf',source:'assets/Pinky-Lamb-Credential-2026.pdf'}
};
/** Only explicit source identities and pinned bytes are accepted; missing media never becomes a different image. */
export function readP7ResourceBytes(resource){
 if(resource.id==='hero-presentation-v1'&&resource.inlineBase64!==undefined){
  if(resource.path!=='assets/hero-presentation-v1.css'||resource.mimeType!=='text/css')throw Error('Invalid inline presentation identity');
  return Buffer.from(resource.inlineBase64,'base64');
 }
 const alias=resourceAliases[resource.id];if(alias&&resource.path!==alias.path)throw Error('QA resource alias identity mismatch');
 const source=alias?.source??resource.path,pin=BASELINE_FILES.find(entry=>entry.path===source);
 if(!pin||mimeFor(source)!==resource.mimeType)throw Error('QA resource has no exact baseline pin: '+resource.path);
 const bytes=readFileSync(path.join(CMS_ROOT,'public-baseline',source));
 if(digest(bytes)!==pin.sha256)throw Error('QA resource baseline bytes changed: '+source);
 return bytes;
}

/** Test-owned full-site data. No Admin request, database, import, publication or production content approval is involved. */
export function p7QaFixture({longCopy=false}={}){
 // Brand identity must use the pinned original, never the generic sample-image alias.
 const faviconPath='assets/favicon.png',faviconPin=BASELINE_FILES.find(pin=>pin.path===faviconPath),faviconBytes=readFileSync(path.join(CMS_ROOT,'public-baseline',faviconPath));
 if(!faviconPin||digest(faviconBytes)!==faviconPin.sha256)throw Error('QA favicon baseline pin mismatch');
 const template=p7TemplateData(),projectIds=template.projects.map(project=>project.id),serviceIds=template.services.map(service=>service.id);
 const policy=buildSiteLocalePolicy({projectLocales:Object.fromEntries(projectIds.map(id=>[id,['en','vi','ja']])),serviceLocales:Object.fromEntries(serviceIds.map(id=>[id,['en','vi','ja']]))});
 const entries=['en','vi','ja'].map(locale=>{
  const original=fullSiteFixture(locale,'APPROVED_RELEASE'),work=original.workServices,copy=p7QaCopy(locale);
  Object.assign(original.groups.header.resources.find(resource=>resource.id==='favicon'),{path:faviconPath,url:'http://127.0.0.1:5010/'+faviconPath,mimeType:'image/png',sizeBytes:faviconBytes.length,sha256:faviconPin.sha256});
  copy.hero.image.alt=alt(original.hero.hero.image,copy.hero.image.alt);
  replaceCopy(original.hero,copy.hero,'hero',mergeLocalizedHero,original.hero.hero);
  original.hero.presentation.brand.tagline=copy.groups.header.tagline;
  for(const [id,qa] of Object.entries(original.groups)){
   const source=qa.base.source,content={...qa.draft.content,...copy.groups[id]};
   if(id==='header'){content.logoAlt=alt(source.brand.logo,content.logoAlt);content.navLabels=source.nav.map(item=>({sectionId:item.sectionId,label:copy.nav[item.sectionId]}));}
   if(id==='clients')content.logoAlts=source.logos.map(item=>({clientId:item.id,assetId:item.image.assetId,alt:alt(item.image,(copy.logoPrefix??'')+item.clientName+copy.logoSuffix)}));
   if(id==='about'){content.signatureAlt=alt(source.section.signature.image,content.signatureAlt);content.reelPosterAlt=alt(source.showreel.poster,content.reelPosterAlt);if(!source.section.experienceFact.location)delete content.experienceLocationLabel;}
   if(id==='ip-studio')content.imageAlt=alt(source.section.image,content.imageAlt);
   if(id==='contact'){content.officePhoneLabel=content.officePhonePrefix+source.contact.officePhoneLabel.replace(/^[^()\d+]+/u,'');delete content.officePhonePrefix;content.illustrationAlt=alt(source.contact.illustration,content.illustrationAlt);}
   if(id==='seo')content.shareAlt=alt(source.seo.ogImage,content.shareAlt);
   replaceCopy(qa,content,'group',(source,value)=>mergeLocalizedGroup(id,source,value),source);
  }
  for(const [id,qa] of Object.entries(work.sections)){
   const source={...qa.section};delete source.eyebrow;delete source.loadMoreLabel;
   replaceCopy(qa,copy.sections[id],'section',mergeLocalizedSection,source);
  }
  work.projects=template.projects.map((project,index)=>{
   const qa=structuredClone(work.projects[0]),gallery=project.gallery.filter(asset=>asset!==project.image);
   const projectCopy=copy.projects[project.id];
   qa.draft.projectId=project.id;qa.projectIndex=index;
   const image=assetId=>({assetId,alt:projectCopy.imageAlts[assetId===project.image?'cover':'gallery:'+assetId],isDecorative:false});
   qa.project={id:project.id,slug:project.id,title:project.title,client:project.client,year:project.year,category:{events:'EVENTS',film:'FILM',communications:'COMMUNICATIONS'}[project.category],eyebrow:project.eyebrow,summary:project.summary,scope:project.scope,cover:image(project.image),gallery:gallery.map(image),serviceIds:[{events:'events-experiences',film:'film-content',communications:'integrated-communications'}[project.category]],publicCredentialPage:project.sourcePage,isVisible:true};
   qa.credential={resourceId:'credential',page:project.sourcePage};
   qa.resources=qa.resources.filter(resource=>!resource.mimeType.startsWith('image/'));
   for(const assetId of [project.image,...gallery]){
    const resourcePath='assets/'+assetId+'.webp',bytes=readFileSync(path.join(CMS_ROOT,'public-baseline',resourcePath));
    qa.resources.push({id:assetId,path:resourcePath,url:'http://127.0.0.1:5010/'+resourcePath,mimeType:'image/webp',sizeBytes:bytes.length,sha256:digest(bytes)});
   }
   const content={...projectCopy,title:longCopy?copy.longTitle.repeat(6)+(index+1):project.title};
   replaceCopy(qa,content,'project',mergeLocalizedProject,qa.project);return qa;
  });
  work.services=serviceIds.map((id,index)=>{const qa=structuredClone(work.services[0]),source=template.services[index];qa.draft.serviceId=id;qa.serviceIndex=index;qa.service={id,title:source.title,titleVi:source.titleVi,summary:source.summary,scope:source.scope,isVisible:true};replaceCopy(qa,copy.services[id],'service',mergeLocalizedService,qa.service);return qa;});
  work.policy=policy;work.sections.work.section.featuredIds=projectIds;work.sections.work.section.initialVisibleCount=4;work.sections.services.section.serviceOrder=serviceIds;
  work.excluded={projects:[],services:[]};
  work.relations=Object.fromEntries(work.projects.map(qa=>[qa.project.id,{eligibleServiceIds:qa.project.serviceIds.filter(id=>serviceIds.includes(id)),missingServiceIds:qa.project.serviceIds.filter(id=>!serviceIds.includes(id))}]));
  const vector=(id,draft)=>({id,revision:draft.revision,dependencyHash:draft.dependencyHash,contentHash:draft.contentHash});
  work.dependencyVector.sections=Object.entries(work.sections).map(([id,qa])=>vector(id,qa.draft));
  work.dependencyVector.projects=work.projects.map(qa=>vector(qa.project.id,qa.draft));work.dependencyVector.services=work.services.map(qa=>vector(qa.service.id,qa.draft));
  work.dependencyHash=hash({dependencyVector:work.dependencyVector,policy,relations:work.relations,excluded:work.excluded});
  const resources=new Map([[work.workCredential.resourceId,work.resources.find(resource=>resource.id===work.workCredential.resourceId)]]);
  for(const qa of [...Object.values(work.sections),...work.projects,...work.services])for(const resource of qa.resources)resources.set(resource.id,resource);
  work.resources=[...resources.values()];
  const pairs=[['hero','home-v3'],...Object.keys(original.groups).map(id=>['group',id]),...['work','services'].map(id=>['section',id]),...work.projects.map(qa=>['project',qa.project.id]),...work.services.map(qa=>['service',qa.service.id])];
  const snapshotIds=Object.fromEntries(pairs.map(([kind,id])=>[`${kind}/${id}`,`qa-snap-${kind}-${id}-${locale}`])),approvalPins=Object.fromEntries(Object.entries(snapshotIds).map(([key,id])=>[key,{snapshotHash:'1'.repeat(64),reviewId:'qa-review-'+id,attestationSetHash:'2'.repeat(64)}]));
  return assembleFullSiteQa({locale,hero:original.hero,groups:original.groups,workServices:work,mode:'APPROVED_RELEASE',snapshotIds,approvalPins,sourceHash:'d'.repeat(64),availabilityHash:'e'.repeat(64),heroDependencyHash:'f'.repeat(64)});
 });
 for(const qa of entries){const heroResource=qa.hero.resources.find(resource=>resource.id===qa.hero.hero.image.assetId);heroResource.path='assets/qa-hero-cover.webp';heroResource.url='http://127.0.0.1:5010/'+heroResource.path;heroResource.mimeType='image/webp';const shared=qa.resources.find(resource=>resource.id===heroResource.id);Object.assign(shared,heroResource);}
 const bytesByPath=new Map();
 for(const qa of entries)for(const resource of qa.resources){
  if(bytesByPath.has(resource.path))continue;
  bytesByPath.set(resource.path,readP7ResourceBytes(resource));
 }
 function hydrate(value){if(!value||typeof value!=='object')return;if(typeof value.path==='string'&&typeof value.mimeType==='string'&&Object.hasOwn(value,'sha256')&&Object.hasOwn(value,'sizeBytes')){const bytes=bytesByPath.get(value.path);if(!bytes)throw Error('QA bytes missing');value.sizeBytes=bytes.length;value.sha256=digest(bytes);if(value.inlineBase64!==undefined)value.inlineBase64=bytes.toString('base64');}for(const item of Object.values(value))hydrate(item);}
 entries.forEach(hydrate);
 return {qaFixture:true,release:{contractRevision:1,kind:'MULTILINGUAL_SITE_RELEASE_BUNDLE',mode:'APPROVED_RELEASE',entries,snapshotSetHash:releaseSnapshotSetHash(entries)},files:[...bytesByPath].map(([name,bytes])=>({path:name,base64:bytes.toString('base64')}))};
}
