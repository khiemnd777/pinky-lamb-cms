import {z} from 'zod';
import {strictSiteObject} from './site-settings.mjs';
import {resourceIdSchema,revisionSchema,hashSchema} from './hero.mjs';
import {heroQaV2Schema} from './hero-localization-records.mjs';
import {GROUP_IDS,groupLocaleSchema,GROUP_TEMPLATE_ID} from './group-localization.mjs';
import {groupQaSchema,localizedQaResourceSchema} from './group-localization-records.mjs';
import {workServicesQaSchema,siteLocalePolicySchema} from './site-locale-projection.mjs';
import {canonicalJson} from './draft.mjs';
import {ApiError} from './errors.mjs';
export const localizedResourceIdentitySchema=strictSiteObject({kind:z.enum(['hero','project','service','section','group']),entityId:resourceIdSchema,locale:groupLocaleSchema}).refine(r=>r.kind==='hero'?r.entityId==='home-v3':r.kind==='section'?['work','services'].includes(r.entityId):r.kind==='group'?GROUP_IDS.includes(r.entityId):r.entityId.length<=100&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(r.entityId));
export const fullSiteVectorEntrySchema=strictSiteObject({resource:localizedResourceIdentitySchema,revision:revisionSchema.refine(n=>n>0),dependencyHash:hashSchema,contentHash:hashSchema,snapshotId:resourceIdSchema.nullable(),approval:strictSiteObject({snapshotHash:hashSchema,reviewId:resourceIdSchema,attestationSetHash:hashSchema}).nullable()});
export const fullSiteDependencyVectorSchema=strictSiteObject({sourceHash:hashSchema,availabilityHash:hashSchema,resources:z.array(fullSiteVectorEntrySchema).min(10).max(46)});
export const fullSiteQaSchema=strictSiteObject({contractRevision:z.literal(1),kind:z.literal('LOCALIZED_FULL_SITE_QA'),mode:z.enum(['QA_SAVED','APPROVED_RELEASE']),locale:groupLocaleSchema,ipServiceId:z.literal('original-ip').nullable(),sectionOrder:z.array(z.enum(['work','services','about','ip-studio'])).length(4).refine(v=>new Set(v).size===4),templateIdentity:z.literal(GROUP_TEMPLATE_ID),hero:heroQaV2Schema,groups:strictSiteObject(Object.fromEntries(GROUP_IDS.map(id=>[id,groupQaSchema]))),workServices:workServicesQaSchema,policy:siteLocalePolicySchema,dependencyVector:fullSiteDependencyVectorSchema,dependencyHash:hashSchema,resources:z.array(localizedQaResourceSchema).max(512)}).superRefine((v,ctx)=>{
 const fail=()=>ctx.addIssue({code:'custom',message:'Invalid full-site locale closure'}),parts=[v.hero,...Object.values(v.groups),...Object.values(v.workServices.sections),...v.workServices.projects,...v.workServices.services];if((v.mode==='APPROVED_RELEASE')!==(v.workServices.mode==='APPROVED_RELEASE')||v.workServices.locale!==v.locale||canonicalJson(v.policy)!==canonicalJson(v.workServices.policy))fail();
 if(v.mode==='APPROVED_RELEASE'&&((v.workServices.sections.work.section.isVisible&&v.workServices.projects.length===0)||(v.workServices.sections.services.section.isVisible&&v.workServices.services.length===0)))fail();
 if(v.ipServiceId!==v.groups['ip-studio'].base.source.ipServiceId)fail();
 if(canonicalJson(v.sectionOrder)!==canonicalJson(v.groups.header.base.source.sectionOrder))fail();
 if(parts.some(q=>q.draft.locale!==v.locale)||GROUP_IDS.some(id=>v.groups[id].draft.groupId!==id))fail();
 const union=new Map();for(const q of [...parts,{resources:v.workServices.resources}])for(const r of q.resources){if(union.has(r.id)&&canonicalJson(union.get(r.id))!==canonicalJson(r))fail();union.set(r.id,r);}if(union.size!==v.resources.length||v.resources.some(r=>canonicalJson(r)!==canonicalJson(union.get(r.id)))||new Set(v.resources.map(r=>r.path)).size!==v.resources.length||v.resources.reduce((n,r)=>n+r.sizeBytes,0)>256*1048576)fail();
 const vectors=v.dependencyVector.resources,keys=vectors.map(e=>canonicalJson(e.resource));if(new Set(keys).size!==keys.length||vectors.length!==parts.length||vectors.some(e=>e.resource.locale!==v.locale||v.mode==='APPROVED_RELEASE'&&(!e.snapshotId||!e.approval)||v.mode==='QA_SAVED'&&(e.snapshotId!==null||e.approval!==null)))fail();
 for(const q of parts){const d=q.draft,kind=d.groupId?'group':d.projectId?'project':d.serviceId?'service':d.sectionId?'section':'hero',id=d.groupId??d.projectId??d.serviceId??d.sectionId??'home-v3',entry=vectors.find(e=>e.resource.kind===kind&&e.resource.entityId===id);if(!entry||entry.revision!==d.revision||entry.contentHash!==d.contentHash||(d.dependencyHash&&entry.dependencyHash!==d.dependencyHash))fail();}
});
export function parseFullSiteQa(value){if(new TextEncoder().encode(JSON.stringify(value)).length>4*1048576)throw new ApiError('PAYLOAD_TOO_LARGE');return fullSiteQaSchema.parse(value);}
