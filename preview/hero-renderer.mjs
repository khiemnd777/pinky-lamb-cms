import {createHeroSchemas,validateContent} from '../contracts/hero.mjs';
export const TEMPLATE_VERSION='m1-hero-split-v1';
const keys=new Set(['id','kind','path','width','height','durationSeconds']);
const arrow='<svg class="icon" aria-hidden="true"><use href="#arrow"/></svg>';
const spark='<svg class="hero-spark" viewBox="0 0 80 80" aria-hidden="true"><path d="M40 1 47 29 72 12 55 36 79 43 51 49 67 73 43 56 35 79 30 52 7 67 23 44 1 35 28 29Z"/></svg>';
export function escapeHtml(value){return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
function fail(){throw new Error('Nội dung hoặc mẫu xem trước không hợp lệ.');}
function configuredBase(value){
  if(typeof value!=='string' || value.includes('..') || !/^http:\/\/(?:127\.0\.0\.1|localhost|\[::1\])(?::[0-9]{1,5})?\/[A-Za-z0-9/_-]*$/.test(value) || !value.endsWith('/'))fail();
  const url=new URL(value);if(url.username || url.password || url.search || url.hash)fail();return url;
}
function assetContext(publicAssets){
  if(!publicAssets || ![Object.prototype,null].includes(Object.getPrototypeOf(publicAssets)))fail();
  const catalog=[];
  for(const [id,asset] of Object.entries(publicAssets)){
    if(!asset || Object.keys(asset).some(key=>!keys.has(key)) || asset.id!==id || !/^[A-Za-z0-9_-]{1,100}$/.test(id) || !['IMAGE','VIDEO','PDF'].includes(asset.kind) || !/^assets\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(asset.path))fail();
    for(const key of ['width','height','durationSeconds'])if(asset[key]!==undefined && (!Number.isFinite(asset[key]) || asset[key]<=0))fail();
    catalog.push({id,kind:asset.kind,status:'LEGACY_READY'});
  }
  return catalog;
}
function assetUrl(asset,base){return new URL(asset.path.split('/').map(encodeURIComponent).join('/'),base).href;}
function lookup(publicAssets,id,kind){if(!Object.hasOwn(publicAssets,id) || publicAssets[id].kind!==kind)fail();return publicAssets[id];}
function runHtml(run){const text=escapeHtml(run.text);return run.emphasis==='STRONG'?`<strong>${text}</strong>`:run.emphasis==='ACCENT'?`<span class="pink-text">${text}</span>`:text;}
function duration(value){if(!Number.isFinite(value))fail();const seconds=Math.floor(value);return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}
function actionHtml(action,primary,publicAssets,base){
  const label=escapeHtml(action.label);
  if(action.kind==='SECTION')return `<a class="${primary?'button button-dark':'text-button'}" href="#${action.sectionId}">${label} ${arrow}</a>`;
  if(action.kind==='CREDENTIAL')return `<a class="${primary?'button button-dark':'text-button'}" href="${escapeHtml(assetUrl(lookup(publicAssets,action.assetId,'PDF'),base))}" target="_blank" rel="noopener noreferrer">${label} ${arrow}</a>`;
  const reel=lookup(publicAssets,'showreel-2025','VIDEO');
  return `<button class="${primary?'button button-dark':'text-button'}" type="button" data-showreel><span class="mini-play"><svg class="icon" aria-hidden="true"><use href="#play"/></svg></span> ${label} <small>${duration(reel.durationSeconds)}</small></button>`;
}
export function renderHero(content,{publicAssets,assetBaseUrl}){
  const base=configuredBase(assetBaseUrl);validateContent(content,assetContext(publicAssets));
  const hero=content.hero;const image=lookup(publicAssets,hero.image.assetId,'IMAGE');
  const lines=hero.heading.lines.map((line,lineIndex)=>line.map((run,index)=>lineIndex===hero.heading.lines.length-1 && index===line.length-1?`<span class="hero-last">${runHtml(run)}${spark}</span>`:runHtml(run)).join('')).join('<br>');
  const focal=hero.image.focalPoint;const position=focal?` style="object-position:${Number((focal.x*100).toFixed(10))}% ${Number((focal.y*100).toFixed(10))}%"`:'';
  const dimensions=image.width && image.height?` width="${image.width}" height="${image.height}"`:'';
  return `<section class="hero shell" aria-labelledby="hero-title">
<div class="hero-copy"><p class="eyebrow"><span class="small-star">✳</span> ${escapeHtml(hero.eyebrow)}</p>
<h1 id="hero-title">${lines}</h1><p class="hero-description">${hero.description.map(runHtml).join('')}</p>
<div class="hero-actions">${actionHtml(hero.primaryAction,true,publicAssets,base)}${hero.secondaryAction?actionHtml(hero.secondaryAction,false,publicAssets,base):''}</div>
<div class="hero-footnote"><span class="tiny-dot"></span> ${escapeHtml(hero.footnote)}</div></div>
<div class="hero-visual"><div class="hero-orbit" aria-hidden="true"></div><div class="hero-art"><img src="${escapeHtml(assetUrl(image,base))}"${dimensions} alt="${escapeHtml(hero.image.alt)}" fetchpriority="high"${position}></div>
<span class="hero-art-label">A LITTLE CUTE.<br>A LOT OF CREATIVE.</span><a class="pinky-note" href="#ip-studio"><span class="note-star">✳</span><span>${escapeHtml(hero.note)}</span>${arrow}</a><span class="hero-image-credit">MEET PINKY / OUR CREATIVE SPIRIT</span></div>
<a class="scroll-cue" href="#clients" aria-label="Khám phá thêm"><span>SCROLL TO FEEL THE PINKY</span><span>↓</span></a></section>`;
}
export function renderSeo(seo,{publicAssets,localBaseUrl}){
  const base=configuredBase(localBaseUrl);createHeroSchemas(assetContext(publicAssets)).seoSchema.parse(seo);
  const image=assetUrl(lookup(publicAssets,seo.ogImage.assetId,'IMAGE'),base);
  return `<title>${escapeHtml(seo.title)}</title>
<meta name="description" content="${escapeHtml(seo.description)}">
<meta property="og:title" content="${escapeHtml(seo.ogTitle)}">
<meta property="og:description" content="${escapeHtml(seo.ogDescription)}">
<meta property="og:url" content="${escapeHtml(base.href)}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta property="og:image:alt" content="${escapeHtml(seo.ogImage.alt)}">
<link rel="canonical" href="${escapeHtml(base.href)}">`;
}
function replaceSlot(html,pattern,replacement,{optional=false}={}){
  const matches=[...html.matchAll(pattern)];if(matches.length>1 || (!optional && matches.length!==1))fail();
  return matches.length?html.replace(pattern,()=>replacement):html.replace('</head>',`${replacement}\n</head>`);
}
function metaPattern(name,attribute='property'){return new RegExp(`<meta\\b[^>]*\\b${attribute}=["']${name}["'][^>]*>`, 'gi');}
function privateTags(html,base){
  const origin=base.origin;
  html=html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,'');
  html=html.replace(/<\/?form\b/gi,tag=>tag.replace(/form/i,'div'));
  // Read complete attribute tokens so event-like copy inside quoted metadata is untouched.
  html=html.replace(/<(?:[^>"']|"[^"]*"|'[^']*')*>/g,tag=>{
    const opening=/^<([A-Za-z][A-Za-z0-9:-]*)([\s\S]*?)(\/?)>$/.exec(tag);if(!opening)return tag;
    const [,name,source,selfClosing]=opening;const lowerName=name.toLowerCase();const attributes=[];
    for(const attribute of source.matchAll(/\s+([^\s=/>]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s>]+))?/g)){
      const [,key,raw]=attribute;const lowerKey=key.toLowerCase();
      if(/^on/i.test(key) || (lowerName==='a' && ['href','target','download','rel'].includes(lowerKey)) || (['video','source'].includes(lowerName) && ['src','poster','autoplay','preload'].includes(lowerKey)))continue;
      let value=raw;
      if(['src','href','poster'].includes(lowerKey) && raw){
        const text=/^["']/.test(raw)?raw.slice(1,-1):raw;
        if(/^(?:assets\/[A-Za-z0-9._-]+|styles\.css)$/.test(text))value=`"${escapeHtml(new URL(text,base).href)}"`;
      }
      attributes.push({key,value});
    }
    if(['button','input','select','textarea'].includes(lowerName) && !attributes.some(attribute=>attribute.key.toLowerCase()==='disabled'))attributes.push({key:'disabled'});
    return `<${name}${attributes.map(({key,value})=>` ${key}${value!==undefined?`=${value}`:''}`).join('')}${selfClosing}>`;
  });
  const csp=`default-src 'none'; script-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'; style-src ${origin}; style-src-attr 'unsafe-inline'; img-src ${origin}; font-src ${origin}; media-src 'none'`;
  return html.replace(/<head>/i,`<head>\n<meta http-equiv="Content-Security-Policy" content="${csp}">`);
}
export function composeDocument(baselineHtml,content,{publicAssets,localBaseUrl,mode}){
  if(typeof baselineHtml!=='string' || !['PRIVATE_PREVIEW','QA_EXPORT'].includes(mode) || (baselineHtml.match(/<\/head>/g)??[]).length!==1 || /<base\b/i.test(baselineHtml))fail();
  const base=configuredBase(localBaseUrl);const seo=renderSeo(content.seo,{publicAssets,localBaseUrl});
  let html=replaceSlot(baselineHtml,/<section\b[^>]*class="hero shell"[^>]*>[\s\S]*?<\/section>/gi,renderHero(content,{publicAssets,assetBaseUrl:localBaseUrl}));
  const seoSlots=[[/<title>[\s\S]*?<\/title>/gi,/<title>[\s\S]*?<\/title>/i],[metaPattern('description','name'),metaPattern('description','name')],...['og:title','og:description','og:url','og:image','og:image:alt'].map(name=>[metaPattern(name),metaPattern(name)]),[/<link\b[^>]*rel=["']canonical["'][^>]*>/gi,/<link\b[^>]*rel=["']canonical["'][^>]*>/i]];
  for(const [slot,replacementPattern] of seoSlots){const replacement=seo.match(replacementPattern)?.[0];if(!replacement)fail();html=replaceSlot(html,slot,replacement,{optional:replacement.includes('og:image:alt')});}
  if((html.match(/<h1\b/gi)??[]).length!==1)fail();
  return mode==='PRIVATE_PREVIEW'?privateTags(html,base):html;
}
