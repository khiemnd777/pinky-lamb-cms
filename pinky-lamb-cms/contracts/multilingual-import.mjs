import {z} from 'zod';
import {localizedResourceIdentitySchema} from './full-site-localization.mjs';
import {localizedHeroContentSchema} from './hero-localization.mjs';
import {localizedServiceContentSchema} from './service-localization.mjs';
import {localizedProjectContentSchema} from './project-localization.mjs';
import {localizedWorkServicesContentSchema} from './work-services-localization.mjs';
import {groupContentSchema} from './group-localization.mjs';

const hash=z.string().regex(/^[a-f0-9]{64}$/);
const pointer=z.string().max(400).regex(/^(?:\/(?:[^~\u0000-\u001f]|~[01])*)*$/);
const language=z.enum(['en','vi','ja','mixed','proper-name']);
const reviewer=z.string().trim().min(1).max(160);
const mapping=z.strictObject({sourcePath:pointer,sha256:hash,sourceLanguage:language,targetPath:pointer,treatment:z.enum(['COPY','TRANSLATE','PRESERVE_NAME']),reviewedBy:reviewer});
const item=z.strictObject({
  kind:z.enum(['hero','project','service','section','group']),
  id:z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/),locale:z.enum(['en','vi','ja']),
  expectedRevision:z.number().int().nonnegative().nullable(),expectedDependencyHash:hash,
  baseRevision:z.number().int().nonnegative().optional(),content:z.unknown(),
  source:z.strictObject({origin:z.literal('RETAINED_HOME_V3'),path:pointer,sha256:hash,language,reviewer,factsReviewed:z.literal(true),mediaReviewed:z.literal(true)}),
  mappings:z.array(mapping).min(1).max(512),
});
export const importPlanSchema=z.strictObject({contractRevision:z.literal(2),kind:z.literal('MULTILINGUAL_SELECTED_IMPORT'),planId:z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/),sourceHash:hash,maxCommits:z.number().int().min(1).max(200),items:z.array(item).min(1).max(200)});

export function readSourcePointer(source,pointer) {
  if (pointer==='') return source;
  const keys=pointer.slice(1).split('/').map(key=>key.replaceAll('~1','/').replaceAll('~0','~'));
  let value=source;
  for(const key of keys){
    if(!value||typeof value!=='object'||!Object.hasOwn(value,key)||['__proto__','prototype','constructor'].includes(key))throw Error(`Missing source path: ${pointer}`);
    if(Array.isArray(value)&&! /^(?:0|[1-9][0-9]*)$/.test(key))throw Error(`Invalid array path: ${pointer}`);
    value=value[key];
  }
  return value;
}

export function stringFields(content,pointer='') {
  if(typeof content==='string')return [{path:pointer,value:content}];
  if(Array.isArray(content))return content.flatMap((value,index)=>stringFields(value,`${pointer}/${index}`));
  if(content&&typeof content==='object')return Object.entries(content).flatMap(([key,value])=>stringFields(value,`${pointer}/${key.replaceAll('~','~0').replaceAll('/','~1')}`));
  return [];
}

/** Shared keys and formatting enums have schema-owned identities, not translation decisions. */
export const localizedTextFields=content=>stringFields(content).filter(field=>!/(?:^|\/)(?:sectionId|clientId|projectId|serviceId|assetId|emphasis)$/.test(field.path));

export function parseImportPlan(input) {
  const plan=importPlanSchema.parse(input),seen=new Set();
  if(plan.items.length>plan.maxCommits)throw Error('Import budget exceeded');
  for(const item of plan.items){
    localizedResourceIdentitySchema.parse({kind:item.kind,entityId:item.id,locale:item.locale});
    const key=`${item.kind}/${item.id}/${item.locale}`;
    if(seen.has(key))throw Error('Duplicate import target');seen.add(key);
    const schema={hero:localizedHeroContentSchema,project:localizedProjectContentSchema,service:localizedServiceContentSchema,section:localizedWorkServicesContentSchema}[item.kind]??groupContentSchema(item.id);
    schema.parse(item.content);
    if(item.kind==='hero'&&(item.id!=='home-v3'||item.baseRevision===undefined))throw Error('Hero base identity required');
    if(item.kind==='section'&&(!['work','services'].includes(item.id)||Object.hasOwn(item.content,'loadMoreLabel')!==(item.id==='work')))throw Error('Section copy mismatch');
    const fields=localizedTextFields(item.content),mapped=new Set(item.mappings.map(row=>row.targetPath));
    if(mapped.size!==item.mappings.length||fields.length!==mapped.size||fields.some(field=>!mapped.has(field.path)))throw Error('Every target text field requires one reviewed source mapping');
    for(const row of item.mappings)if(item.source.path&&row.sourcePath!==item.source.path&&!row.sourcePath.startsWith(item.source.path+'/'))throw Error('Mapping outside pinned source');
  }
  return plan;
}

/** Validate bytes and per-field editorial decisions, never infer language from the default URL. */
export function verifyImportSource(plan,source,hashValue) {
  if(hashValue(source)!==plan.sourceHash)throw Error('Source changed');
  for(const item of plan.items){
    if(hashValue(readSourcePointer(source,item.source.path))!==item.source.sha256)throw Error('Pinned source hash mismatch');
    for(const row of item.mappings){
      const value=readSourcePointer(source,row.sourcePath),target=readSourcePointer(item.content,row.targetPath);
      if(typeof value!=='string'||typeof target!=='string'||hashValue(value)!==row.sha256)throw Error('Mapped source hash or text mismatch');
      if(row.treatment==='COPY'&&(row.sourceLanguage!==item.locale||value!==target))throw Error('COPY requires identical same-language text');
      if(row.treatment==='PRESERVE_NAME'&&(row.sourceLanguage!=='proper-name'||value!==target))throw Error('Proper names require an explicit unchanged-name decision');
      if(['mixed','proper-name'].includes(row.sourceLanguage)&&row.treatment==='COPY')throw Error('Mixed copy and proper names require an explicit decision');
    }
  }
  return plan;
}
