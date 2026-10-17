import {localizedResourceTransportUrl} from './localized-resource-transport.mjs';
import {HERO_PRESENTATION_CSS,HERO_PRESENTATION_CSP_HASH,HERO_PRESENTATION_SHA256} from './hero-localization-presentation.mjs';
import {parseHeroQa} from '../contracts/hero-localization-records.mjs';
import {localizedHeroFromBase} from '../contracts/hero-localization.mjs';
import {canonicalJson} from '../contracts/draft.mjs';
import {createHeroSchemas} from '../contracts/hero.mjs';
import {escapeHtml} from './hero-renderer.mjs';
import {renderSiteHero,SITE_SVG_DEFS} from './site-sections.mjs';
import {HERO_QA_COPY} from './hero-localization-copy.mjs';
export function validateHeroQaRelationships(input){
 const qa=parseHeroQa(input),image=qa.resources.find(r=>r.id===qa.hero?.image?.assetId);
 if(!image||!image.mimeType.startsWith('image/')||canonicalJson(localizedHeroFromBase(qa.hero))!==canonicalJson(qa.draft.content))throw Error('Nội dung QA không khớp bản đã lưu.');
 const catalog=[{id:image.id,kind:'IMAGE',status:'LEGACY_READY'},...[qa.hero.primaryAction,qa.hero.secondaryAction].filter(a=>a?.kind==='CREDENTIAL').map(a=>({id:a.assetId,kind:'PDF',status:'LEGACY_READY'}))];
 createHeroSchemas(catalog).heroSchema.parse(qa.hero);if(qa.contractRevision===2){const stylesheet=qa.resources.find(r=>r.id===qa.presentation.stylesheetResourceId);const expected=new TextEncoder().encode(HERO_PRESENTATION_CSS);let raw='';for(const byte of expected)raw+=String.fromCharCode(byte);if(stylesheet.sha256!==HERO_PRESENTATION_SHA256||stylesheet.sizeBytes!==expected.length||stylesheet.inlineBase64!==btoa(raw))throw Error('Presentation stylesheet không khớp nguồn.');}return qa;
}
function renderLegacyLocalizedHeroDocument(input,{mode='PRIVATE',resourceUrls={}}={}){
 const qa=validateHeroQaRelationships(input),e=escapeHtml,copy=HERO_QA_COPY[qa.draft.locale];
 if(!['PRIVATE','QA_EXPORT'].includes(mode))throw Error('Chế độ không hợp lệ.');
 const assets={};for(const r of qa.resources){const value=resourceUrls[r.id]??(mode==='QA_EXPORT'?r.path:localizedResourceTransportUrl(r));
  if(mode==='PRIVATE'&&!/^blob:http:\/\/127\.0\.0\.1:5273\/[A-Za-z0-9_-]+$/.test(value)&&value!==localizedResourceTransportUrl(r))throw Error('Tài nguyên không hợp lệ.');
  if(mode==='QA_EXPORT'&&value!==r.path)throw Error('Tài nguyên không hợp lệ.');
  assets[r.id]={id:r.id,kind:'IMAGE',path:value,...(r.width?{width:r.width,height:r.height}:{})};
 }
 // Actions are inert: Hero QA does not expose incomplete sections/PDF/video.
 for(const action of [qa.hero.primaryAction,qa.hero.secondaryAction])if(action?.kind==='CREDENTIAL')assets[action.assetId]??={path:'assets/qa-inert.pdf'};
 let hero=renderSiteHero({hero:qa.hero,settings:{brand:{tagline:copy.tagline}},sections:[],sectionOrder:[]},{assets,mode:'PRIVATE',localBaseUrl:mode==='PRIVATE'?'http://127.0.0.1:5010/':'http://127.0.0.1:4173/'});
 hero=hero.replace('MEET PINKY / OUR CREATIVE SPIRIT',e(copy.credit)).replace(/<a class="scroll-cue"[\s\S]*?<\/a>/,'');
 if(mode==='QA_EXPORT')for(const r of qa.resources)hero=hero.replaceAll(`http://127.0.0.1:4173/${r.path}`,r.path);
 const csp=mode==='PRIVATE'?"default-src 'none'; script-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'; style-src http://127.0.0.1:5010; style-src-attr 'unsafe-inline'; img-src http://127.0.0.1:5010 blob:; font-src http://127.0.0.1:5010; media-src 'none'":"default-src 'none'; script-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'; style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self'; font-src 'self'; media-src 'none'";
 const css=resourceUrls.styles??(mode==='QA_EXPORT'?'styles.css':qa.resources.find(r=>r.id==='styles').url);
 return `<!doctype html><html lang="${qa.draft.locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="${e(csp)}"><title>${e(copy.title)}</title><link rel="stylesheet" href="${e(css)}"></head><body><p role="note">Bản thử Hero — chưa xuất bản · ${qa.draft.locale} · revision ${qa.draft.revision}</p>${SITE_SVG_DEFS}<main style="overflow-x:clip">${hero}</main></body></html>`;
}

/** MIME authority is metadata, not a byte-signature sniff. SVG remains an img-only trusted legacy resource. */
export function validateHeroPreviewImageResource(r){
 if(!['image/webp','image/png','image/jpeg','image/svg+xml'].includes(r.mimeType)||r.derivative&&r.derivative.mime!==r.mimeType)throw Error('Invalid image MIME');
 if(r.mimeType==='image/svg+xml'&&(r.derivative||r.url!==`http://127.0.0.1:5010/${r.path}`))throw Error('Invalid SVG authority');
}
function validPrivateImageData(value,r){
 validateHeroPreviewImageResource(r);const prefix=`data:${r.mimeType};base64,`;if(!value.startsWith(prefix))return false;
 const raw=value.slice(prefix.length),expected=4*Math.ceil(r.sizeBytes/3);if(raw.length!==expected||!raw.length)return false;
 // Linear alphabet scan avoids large recursive regular expressions and decoded copies.
 const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',padding=(3-r.sizeBytes%3)%3;
 for(let i=0;i<raw.length-padding;i++)if(!alphabet.includes(raw[i]))return false;
 if(raw.slice(raw.length-padding)!=='='.repeat(padding))return false;
 if(padding&&alphabet.indexOf(raw[raw.length-padding-1])%(padding===2?16:4)!==0)return false;
 return raw.length/4*3-padding===r.sizeBytes;
}
/** Revision2 is an approved composition, independent of the legacy renderer. */
export function renderLocalizedHeroDocument(input,{mode='PRIVATE',resourceUrls={}}={}){
 const qa=validateHeroQaRelationships(input);if(qa.contractRevision===1)return renderLegacyLocalizedHeroDocument(qa,{mode,resourceUrls});
 if(!['PRIVATE','QA_EXPORT'].includes(mode))throw Error('Chế độ không hợp lệ.');const e=escapeHtml;
 const resource=id=>{const r=qa.resources.find(value=>value.id===id);if(!r)throw Error('Missing presentation resource');const value=resourceUrls[id]??(mode==='QA_EXPORT'?r.path:localizedResourceTransportUrl(r));if(mode==='QA_EXPORT'&&value!==r.path)throw Error('Invalid export resource');if(mode==='PRIVATE'&&value!==localizedResourceTransportUrl(r)&&!/^blob:http:\/\/127\.0\.0\.1:5273\/[A-Za-z0-9_-]+$/.test(value)&&!validPrivateImageData(value,r))throw Error('Invalid private resource');return e(value);};
 const rich=runs=>runs.map(run=>run.emphasis==='ACCENT'?`<span class="lhv2-emphasis">${e(run.text)}</span>`:run.emphasis==='STRONG'?`<strong>${e(run.text)}</strong>`:e(run.text)).join('');
 const h=qa.hero,brand=qa.presentation.brand,html=`<article class="lhv2-art" lang="${qa.draft.locale}"><div class="lhv2-brand"><img src="${resource(brand.logoResourceId)}" alt="">${e(brand.name)}</div><div class="lhv2-content"><div class="lhv2-copy"><p class="lhv2-intro">${e(h.eyebrow)}</p><h1 class="lhv2-title">${h.heading.lines.map(rich).join('<br>')}</h1><p class="lhv2-description">${rich(h.description)}</p><div class="lhv2-ctas"><span class="lhv2-cta">${e(h.primaryAction.label)} ↗</span>${h.secondaryAction?`<span class="lhv2-cta secondary">▷ ${e(h.secondaryAction.label)}</span>`:''}</div><p class="lhv2-footnote">${e(h.footnote)}</p></div><div class="lhv2-illustration"><img src="${resource(h.image.assetId)}" alt="${e(h.image.alt)}"></div></div><div class="lhv2-bottom"><span>${e(brand.tagline)}</span><span>${qa.draft.locale.toUpperCase()} · ${mode==='PRIVATE'?'BẢN ĐÃ LƯU':'BẢN NHÁP'}</span></div></article>`;
 const csp=mode==='PRIVATE'?`default-src 'none'; script-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'; style-src http://127.0.0.1:5010 '${HERO_PRESENTATION_CSP_HASH}'; style-src-attr 'unsafe-inline'; img-src http://127.0.0.1:5010 blob: data:; font-src http://127.0.0.1:5010; media-src 'none'`:"default-src 'none'; script-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'; style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self'; font-src 'self'; media-src 'none'";
 const styles=mode==='PRIVATE'?`<link rel="stylesheet" href="${resource('styles')}"><style>${HERO_PRESENTATION_CSS}</style>`:`<link rel="stylesheet" href="${resource('styles')}"><link rel="stylesheet" href="assets/hero-presentation-v1.css">`;
 return `<!doctype html><html lang="${qa.draft.locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="${e(csp)}"><title>${e(HERO_QA_COPY[qa.draft.locale].title)}</title>${styles}</head><body data-presentation="${qa.presentation.id}"><main>${html}</main></body></html>`;
}
