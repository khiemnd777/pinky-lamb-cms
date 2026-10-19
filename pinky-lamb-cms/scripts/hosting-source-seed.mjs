import {parseMediaV3Content} from '../contracts/media-v3-content.mjs';
import {readFileSync,existsSync} from 'node:fs';
import {BASELINE_FILES} from './export-local.mjs';
import {readPinnedReleaseResource} from './export-multilingual-site-local.mjs';
import {digest,ownedFile,writeExclusive,writeJsonExclusive,readPrivateBytes} from './multilingual-release-files.mjs';
import {createHostingSourceCopy} from './hosting-source-copy.mjs';
import {GROUP_IDS,groupSourceFromHome,groupContentFromSource} from '../contracts/group-localization.mjs';

/** Capture the pinned bundled template offline. No template HTTP service or script evaluation. */
export async function captureHostingSource(relativeRoot){
 const files=[];
 for(const pin of BASELINE_FILES){
  const bytes=readPinnedReleaseResource(pin);if(bytes.length>32*1048576||digest(bytes)!==pin.sha256)throw Error('Source pin changed: '+pin.path);
  const stored=relativeRoot+'/'+pin.path;if(existsSync(ownedFile(stored,{missing:true}))){if(digest(readPrivateBytes(stored,32*1048576))!==pin.sha256)throw Error('Captured source changed');}else writeExclusive(stored,bytes);files.push({...pin,sizeBytes:bytes.length});
 }
 const manifest={kind:'APPROVED_HOSTING_SOURCE',origin:'LOCAL_PINNED_TEMPLATE',capturedAt:new Date().toISOString(),files};
 const manifestPath=relativeRoot+'/source-manifest.json';if(existsSync(ownedFile(manifestPath,{missing:true})))return JSON.parse(readPrivateBytes(manifestPath).toString('utf8'));writeJsonExclusive(manifestPath,manifest);return manifest;
}
export function loadHostingSeed(relativeRoot,assetMap={}){
 const source=createHostingSourceCopy(readPrivateBytes(relativeRoot+'/index.html').toString('utf8'),readPrivateBytes(relativeRoot+'/content.js').toString('utf8'));
 const home=JSON.parse(readFileSync(new URL('../contracts/baseline-site.json',import.meta.url),'utf8'));
 // The normalized baseline supplies contracts and source claim bindings. The captured source supplies all project and service copy.
 for(const project of home.projects){const original=source.templateData.projects.find(p=>p.id===project.id);if(!original||original.title!==project.title||original.client!==project.client||original.year!==project.year)throw Error('Project source facts changed');Object.assign(project,{eyebrow:original.eyebrow,summary:original.summary,scope:original.scope});}
 for(const service of home.services){const original=source.templateData.services.find(s=>s.id===service.id);if(!original||original.title!==service.title)throw Error('Service source changed');Object.assign(service,{titleVi:original.titleVi,summary:original.summary,scope:original.scope});}
 home.schemaVersion=3;const vi=source.localeCopy('vi');home.hero={...home.hero,...vi.hero,primaryAction:{...home.hero.primaryAction,...vi.hero.primaryAction},secondaryAction:{...home.hero.secondaryAction,...vi.hero.secondaryAction},image:{...home.hero.image,...vi.hero.image}};
 for(const id of ['work','services']){const section=home.sections.find(s=>s.sectionId===id);section.heading=vi.sections[id].heading;section.intro=vi.sections[id].intro;}
 const clients=home.sections.find(s=>s.sectionId==='clients');clients.heading=vi.groups.clients.heading;
 const about=home.sections.find(s=>s.sectionId==='about'),copy=vi.groups.about;Object.assign(about,{heading:copy.heading,lead:copy.lead,paragraphs:copy.paragraphs,reelHeading:copy.reelHeading,reelCaption:copy.reelCaption});Object.assign(about.experienceFact,{label:copy.experienceLabel,copy:copy.experienceCopy});about.signature.copy=copy.signatureCopy;
 const ip=home.sections.find(s=>s.sectionId==='ip-studio');Object.assign(ip,{heading:vi.groups['ip-studio'].heading,description:vi.groups['ip-studio'].description});
 const contact=home.sections.find(s=>s.sectionId==='contact');Object.assign(contact,{heading:vi.groups.contact.heading,intro:vi.groups.contact.intro});
 home.sections.find(s=>s.sectionId==='footer').heading=vi.groups.footer.heading;
 const replace=value=>{if(Array.isArray(value))return value.map(replace);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,v])=>[key,key==='assetId'?(assetMap[v]??v):replace(v)]));return value;};
 const normalized=replace(home),provenance=JSON.parse(readFileSync(new URL('../contracts/baseline-provenance.json',import.meta.url),'utf8'));
 parseMediaV3Content(normalized,{sourceCatalog:provenance.sourceCatalog,currentYear:new Date().getUTCFullYear(),...(home.settings.showreel.originalSourceUrl?{allowedShowreelSourceUrl:home.settings.showreel.originalSourceUrl}:{})});
 return {home:normalized,source,assetMap};
}
export function seedResources(home){return ['en','vi','ja'].flatMap(locale=>[{kind:'hero',entityId:'home-v3',locale},...GROUP_IDS.map(entityId=>({kind:'group',entityId,locale})),...['work','services'].map(entityId=>({kind:'section',entityId,locale})),...home.projects.map(p=>({kind:'project',entityId:p.id,locale})),...home.services.map(s=>({kind:'service',entityId:s.id,locale}))]);}
export function seedContent(seed,resource){
 const c=seed.source.localeCopy(resource.locale),id=resource.entityId;
 if(resource.kind==='hero')return c.hero;
 if(resource.kind==='section')return c.sections[id];
 if(resource.kind==='service')return c.services[id];
 if(resource.kind==='project'){const p=c.projects[id];return {...p,imageAlts:Object.fromEntries(Object.entries(p.imageAlts).map(([key,value])=>[key.startsWith('gallery:')?'gallery:'+(seed.assetMap[key.slice(8)]??key.slice(8)):key,value]))};}
 const base=groupSourceFromHome(seed.home,id),value={...groupContentFromSource(id,base),...c.groups[id]};
 if(id==='header'){value.logoAlt=base.brand.logo.isDecorative?'':value.logoAlt;value.navLabels=base.nav.map(n=>({sectionId:n.sectionId,label:c.nav[n.sectionId]}));}
 if(id==='clients')value.logoAlts=base.logos.map(l=>({clientId:l.id,assetId:l.image.assetId,alt:l.image.isDecorative?'':c.logoPrefix+l.clientName+c.logoSuffix}));
 if(id==='contact'){value.personPhoneLabel=base.contact.personPhoneLabel;value.officePhoneLabel=value.officePhonePrefix+base.contact.officePhoneLabel.replace(/^Văn phòng:\s*/, '');delete value.officePhonePrefix;}
 return value;
}
