import {z} from 'zod';
import {createMediaV3ContentSchemas} from '../contracts/media-v3-content.mjs';
import {strictMediaV2JsonSchema} from '../contracts/media-v3-metadata-v2.mjs';
import {v2MediaManifestSchema} from '../contracts/media-v3-contract-v2.mjs';
import {escapeHtml} from './hero-renderer.mjs';
import {SITE_SVG_DEFS,renderSiteHeader,renderSiteHero,renderSiteSections,renderSiteFooter} from './site-sections.mjs';

export const SITE_MEDIA_TEMPLATE_VERSION='m3-site-media-v1';
const fail=()=>{throw new Error('SITE_MEDIA_RENDER: invalid public projection');};
const idOf=e=>e.source==='LEGACY'?e.asset.id:e.asset.assetId;
const own=shape=>strictMediaV2JsonSchema.pipe(z.strictObject(shape));
const resourceSchema=own({image:z.string().optional(),download:z.string().optional(),video:z.string().optional(),poster:z.string().optional()});
function baseUrl(value,mode){
 const base=new URL(value);
 if(base.href!==value||base.protocol!=='http:'||base.hostname!=='127.0.0.1'||base.username||base.password||base.search||base.hash||base.pathname!=='/'||base.port!==(mode==='PRIVATE'?'4189':'4173'))fail();
 return base;
}
function safeUrl(value,mode,base){
 if(typeof value!=='string')fail();
 if(mode==='QA_EXPORT'){if(!/^assets\/[A-Za-z0-9][A-Za-z0-9._-]*$(?![\s\S])/.test(value))fail();return value;}
 if(/^blob:http:\/\/127\.0\.0\.1:5273\/[A-Za-z0-9_-]+$(?![\s\S])/.test(value))return value;
 if(/^assets\/[A-Za-z0-9][A-Za-z0-9._-]*$(?![\s\S])/.test(value))return new URL(value,base).href;
 const url=new URL(value);
 if(url.href!==value||url.origin!==base.origin||!/^\/assets\/[A-Za-z0-9][A-Za-z0-9._-]*$(?![\s\S])/.test(url.pathname)||url.search||url.hash||url.username||url.password)fail();
 return url.href;
}
/** All references, including hidden projects/sections, are checked before visibility filtering. */
export function collectSiteMediaReferenceIds(content){
 strictMediaV2JsonSchema.parse(content);
 const refs=[],use=(value,kind,poster=false)=>{if(!value||typeof value.assetId!=='string')fail();refs.push({id:value.assetId,kind,poster});};
 use(content.hero.image,'IMAGE');use(content.seo.ogImage,'IMAGE');use(content.settings.brand.logo,'IMAGE');use(content.settings.contact.illustration,'IMAGE');
 use(content.settings.credential,'PDF');use(content.settings.showreel,'VIDEO');
 use(content.settings.showreel.poster,content.settings.showreel.poster.derivativeRole==='POSTER'?'VIDEO':'IMAGE',content.settings.showreel.poster.derivativeRole==='POSTER');
 content.settings.clientLogos.forEach(v=>use(v.image,'IMAGE'));
 content.projects.forEach(v=>{use(v.cover,'IMAGE');v.gallery.forEach(g=>use(g,'IMAGE'));});
 content.sections.forEach(v=>{if(v.signature)use(v.signature.image,'IMAGE');if(v.image)use(v.image,'IMAGE');if(v.action?.kind==='CREDENTIAL')use(v.action,'PDF');});
 for(const action of [content.hero.primaryAction,content.hero.secondaryAction])if(action?.kind==='CREDENTIAL')use(action,'PDF');
 refs.push({id:'brand-diagonal',kind:'IMAGE',poster:false},{id:'favicon',kind:'IMAGE',poster:false});
 return refs;
}
/** Same visibility rules as the full-site sections. PDF/VIDEO are lazy parent
 * intents in PRIVATE mode; a VIDEO POSTER remains an ordinary visible image. */
export function collectVisibleSiteMediaReferences(content){
 strictMediaV2JsonSchema.parse(content);
 const refs=[],use=(v,kind,poster=false)=>{if(!v||typeof v.assetId!=='string')fail();refs.push({id:v.assetId,kind,poster});};
 const sections=content.sections.filter(s=>s.isVisible!==false),visible=new Set(sections.map(s=>s.sectionId));
 use(content.hero.image,'IMAGE');use(content.seo.ogImage,'IMAGE');use(content.settings.brand.logo,'IMAGE');use(content.settings.contact.illustration,'IMAGE');
 for(const action of [content.hero.primaryAction,content.hero.secondaryAction,...sections.map(s=>s.action)])if(action?.kind==='CREDENTIAL')use(action,'PDF');
 if(visible.has('clients'))content.settings.clientLogos.filter(v=>v.isVisible).forEach(v=>use(v.image,'IMAGE'));
 if(visible.has('work')){use(content.settings.credential,'PDF');content.projects.filter(v=>v.isVisible).forEach(v=>{use(v.cover,'IMAGE');v.gallery.forEach(g=>use(g,'IMAGE'));});}
 if(visible.has('about')){
  const about=sections.find(s=>s.kind==='ABOUT');use(about.signature.image,'IMAGE');use(content.settings.credential,'PDF');use(content.settings.showreel,'VIDEO');
  const p=content.settings.showreel.poster;use(p,p.derivativeRole==='POSTER'?'VIDEO':'IMAGE',p.derivativeRole==='POSTER');
 }
 if(visible.has('ip-studio'))use(sections.find(s=>s.kind==='IP').image,'IMAGE');
 refs.push({id:'brand-diagonal',kind:'IMAGE',poster:false},{id:'favicon',kind:'IMAGE',poster:false});
 return refs.filter((r,i)=>refs.findIndex(v=>v.id===r.id&&v.kind===r.kind&&v.poster===r.poster)===i);
}
/** Browser-safe renderer capability: resources contain URLs only, never Storage/cache paths.
 * The caller owns authenticated reads, object URL lifetime and revision fencing.
 */
export function projectSiteMediaPublicData(content,options){
 strictMediaV2JsonSchema.parse(options);
 const o=own({mediaManifest:v2MediaManifestSchema,resources:z.record(z.string(),resourceSchema),contentContext:z.unknown(),localBaseUrl:z.string(),mode:z.enum(['PRIVATE','QA_EXPORT'])}).parse(options);
 const base=baseUrl(o.localBaseUrl,o.mode),value=createMediaV3ContentSchemas(o.contentContext).contentSchema.parse(content);
 const manifest=new Map(o.mediaManifest.map(e=>[idOf(e),e])),refs=collectSiteMediaReferenceIds(value);
 const selected=new Set(refs.map(r=>r.id));
 if(selected.size!==manifest.size||[...manifest.keys()].some(id=>!selected.has(id))||Object.keys(o.resources).some(id=>!selected.has(id)))fail();
 for(const ref of refs){const e=manifest.get(ref.id);if(!e||e.asset.kind!==ref.kind||(ref.poster&&e.source!=='MEDIA_VERSION'))fail();}
 const visibleRefs=collectVisibleSiteMediaReferences(value),visibleIds=new Set(visibleRefs.map(r=>r.id));
 if(o.mode==='PRIVATE'&&Object.keys(o.resources).some(id=>!visibleIds.has(id)))fail();
 if(o.mode==='QA_EXPORT'&&[...manifest].some(([id,e])=>e.asset.kind==='PDF'&&!o.resources[id]?.download))fail();
 for(const ref of visibleRefs){
  if(['PDF','VIDEO'].includes(ref.kind)&&!ref.poster&&o.mode==='PRIVATE')continue;
  const field=ref.poster?'poster':ref.kind==='IMAGE'?'image':ref.kind==='PDF'?'download':'video';
  if(!o.resources[ref.id]?.[field])fail();
 }
 const reel=value.settings.showreel,video=manifest.get(reel.assetId).asset,pdf=manifest.get(value.settings.credential.assetId).asset;
 if(video.durationSeconds!==reel.durationSeconds||value.projects.some(p=>p.publicCredentialPage!==undefined&&p.publicCredentialPage>(pdf.pageCount??48)))fail();
 const assets={};
 for(const [id,e] of manifest){
  const a=e.asset,r=o.resources[id],field=a.kind==='IMAGE'?'image':a.kind==='PDF'?'download':'video';
  if(r&&(Object.keys(r).length===0||Object.keys(r).some(k=>!([field,...(a.kind==='VIDEO'&&e.source==='MEDIA_VERSION'?['poster']:[])].includes(k)))))fail();
  const d=e.source==='MEDIA_VERSION'?a.derivatives.find(v=>v.role===(a.kind==='IMAGE'?'IMAGE':a.kind==='PDF'?'PDF_DOWNLOAD':'VIDEO')&&(a.kind!=='IMAGE'||v.targetWidth===1920)):a;
  if(!d)fail();
  assets[id]={id,kind:a.kind,...(r?.[field]!==undefined?{path:safeUrl(r[field],o.mode,base)}:{}),...(d.width?{width:d.width,height:d.height}:{}),...(a.durationSeconds?{durationSeconds:a.durationSeconds}:{})};
  if(a.kind==='VIDEO'&&e.source==='MEDIA_VERSION'&&r?.poster!==undefined){
   const poster=a.derivatives.find(v=>v.role==='POSTER');if(!poster)fail();
   // Generated alias exists only in this public render map, never in persisted content.
   const alias=`poster_${id}`;if(manifest.has(alias)||Object.hasOwn(assets,alias))fail();
   assets[alias]={id:alias,kind:'IMAGE',path:safeUrl(r.poster,o.mode,base),width:poster.width,height:poster.height};
  }
 }
 const sections=value.sections.filter(s=>s.isVisible!==false),visible=new Set(sections.map(s=>s.sectionId));
 const services=visible.has('services')?value.services.filter(s=>s.isVisible):[],serviceIds=new Set(services.map(s=>s.id));
 const projects=visible.has('work')?value.projects.filter(p=>p.isVisible):[],projectIds=new Set(projects.map(p=>p.id));
 const contact=value.sections.find(s=>s.kind==='CONTACT'),interestIds=new Set(contact.serviceOptionIds.filter(id=>serviceIds.has(id)));
 const settings={header:value.settings.header,brand:value.settings.brand,credential:value.settings.credential,contact:value.settings.contact,nav:value.settings.nav.filter(n=>n.sectionId!=='services'||services.length>0),copyright:value.settings.copyright,clientLogos:visible.has('clients')?value.settings.clientLogos.filter(l=>l.isVisible):[]};
 if(visible.has('about')){
  settings.showreel={...value.settings.showreel};
  if(settings.showreel.poster.derivativeRole==='POSTER')settings.showreel.poster={...settings.showreel.poster,assetId:`poster_${settings.showreel.poster.assetId}`};
  // Never project the private source URL into the browser/artifact.
  delete settings.showreel.originalSourceUrl;
 }
 const publicSections=sections.map(s=>s.kind==='CONTACT'?{...s,serviceOptionIds:s.serviceOptionIds.filter(id=>serviceIds.has(id))}:s.kind==='SERVICES'?{...s,serviceOrder:s.serviceOrder.filter(id=>serviceIds.has(id))}:s.kind==='WORK'?{...s,featuredIds:s.featuredIds.filter(id=>projectIds.has(id))}:s);
 const data=structuredClone({hero:value.hero,seo:value.seo,settings,services,projects:projects.map(p=>({...p,serviceIds:p.serviceIds.filter(id=>interestIds.has(id))})),sections:publicSections,sectionOrder:value.sectionOrder.filter(id=>visible.has(id))});
 // This is public intent metadata for the parent's existing guarded controls,
 // not a child script/message capability or an authenticated derivative URL.
 const mediaIntents=o.mode==='PRIVATE'?visibleRefs.filter(r=>['PDF','VIDEO'].includes(r.kind)&&!r.poster).map(r=>({assetId:r.id,action:r.kind==='PDF'?'PDF_DOWNLOAD':'VIDEO'})):[];
 return {data,publicAssets:assets,visibleReferences:visibleRefs,mediaIntents,localBaseUrl:base.href,mode:o.mode};
}
export function renderSiteMediaDocument(content,options){
 const projection=projectSiteMediaPublicData(content,options),{data,publicAssets:assets,mode}=projection,base=new URL(projection.localBaseUrl);
 const context={assets,mode,localBaseUrl:base.href},e=escapeHtml,resource=p=>e(new URL(p,base).href),og=assets[data.seo.ogImage.assetId];
 const csp=mode==='PRIVATE'?`default-src 'none'; script-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'; style-src ${base.origin}; style-src-attr 'unsafe-inline'; img-src ${base.origin} blob:; font-src ${base.origin}; media-src ${base.origin} blob:`:`default-src 'self'; script-src 'self'; connect-src 'none'; form-action mailto:; base-uri 'none'; object-src 'none'; style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self'; font-src 'self'; media-src 'self'`;
 const seo=`<title>${e(data.seo.title)}</title><meta name="description" content="${e(data.seo.description)}"><meta property="og:title" content="${e(data.seo.ogTitle)}"><meta property="og:description" content="${e(data.seo.ogDescription)}"><meta property="og:image" content="${resource(og.path)}"><meta property="og:image:alt" content="${e(data.seo.ogImage.alt)}">`;
 let body=`${renderSiteHeader(data,context)}<main id="main" style="overflow-x:clip">${renderSiteHero(data,context)}${renderSiteSections(data,context)}</main>${renderSiteFooter(data,context)}`;
 // Parent fetches VIDEO only on user intent and rerenders with the authenticated
 // URL. Before that, keep the actual poster/banner and omit a video src entirely.
 if(mode==='PRIVATE'&&data.settings.showreel){const reel=data.settings.showreel,video=assets[reel.assetId],poster=assets[reel.poster.assetId];if(video?.path)body=body.replace('<div id="showreel"',`<video controls playsinline preload="none" poster="${resource(poster.path)}" aria-label="${e(reel.title)}" style="max-width:100%"><source src="${resource(video.path)}" type="video/mp4"></video><div id="showreel"`);}
 if(mode==='PRIVATE')body+=projection.mediaIntents.map(i=>`<span hidden data-media-intent="${i.action}" data-media-asset-id="${e(i.assetId)}"></span>`).join('');
 const notice=mode==='QA_EXPORT'?'<p id="local-qa-notice" role="note">Bản thử local — chưa xuất bản</p>':'';
 const html=`<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${e(csp)}">${seo}<link rel="icon" href="${resource(assets.favicon.path)}"><link rel="stylesheet" href="${resource('styles.css')}"></head><body>${notice}${SITE_SVG_DEFS}${body}</body></html>`;
 if((html.match(/<h1\b/g)??[]).length!==1||/<script\b|<base\b/i.test(html))fail();
 // M2 section helpers suppress link hrefs in PRIVATE mode. Pending PDF/VIDEO
 // must remain metadata only; never serialize an absent path as a URL.
 if(mode==='PRIVATE'&&/(?:href|src|poster)="(?:|[^"]*\/undefined(?:[?#][^"]*)?)"/i.test(html))fail();
 return html;
}
