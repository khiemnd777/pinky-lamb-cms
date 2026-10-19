import {SITE_SOURCE_TRANSLATIONS as P7_TEMPLATE_TRANSLATIONS} from './site-source-translations.mjs';
/** Parse captured, pinned source bytes without evaluating its JavaScript. */
export function createHostingSourceCopy(templateHtml,templateDataText){
const templateData=JSON.parse(/^window\.PINKY_CONTENT = ([\s\S]*);\s*$/.exec(templateDataText)[1]);
const decode=value=>value.replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"');
const capture=(html,pattern)=>{const value=pattern.exec(html)?.[1];if(value===undefined)throw Error('Pinned template fragment missing');return value;};
const plain=html=>decode(html.replace(/<br\s*\/?\s*>/g,'\n').replace(/<[^>]+>/g,''));
const runs=html=>[...html.matchAll(/<strong>([^<]*)<\/strong>|([^<]+)/g)].map(match=>({text:decode(match[1]??match[2]),...(match[1]!==undefined?{emphasis:'STRONG'}:{})}));
const section=id=>capture(templateHtml,new RegExp('<section[^>]* id="'+id+'"[\\s\\S]*?>([\\s\\S]*?)<\\/section>'));
const headingFromTemplate=id=>({lines:capture(templateHtml,new RegExp('<h[12] id="'+id+'"[^>]*>([\\s\\S]*?)</h[12]>')).replace(/<svg[\s\S]*?<\/svg>/g,'').split('<br>').map(line=>[...line.matchAll(/<span class="(?:pink-text|hero-last)">([^<]*)<\/span>|([^<]+)/g)].map(match=>({text:decode(match[1]??match[2]),...(match[1]!==undefined?{emphasis:'ACCENT'}:{})}))) });
const templateHeadings=Object.fromEntries(['hero-title','work-title','services-title','about-title','ip-title','contact-title'].map(id=>[id,headingFromTemplate(id)]));
const about=section('about'),ip=section('ip-studio'),contact=section('contact');
const nativeVi={
 heroDescription:runs(capture(templateHtml,/<p class="hero-description">([\s\S]*?)<\/p>/)),
 about:{lead:plain(capture(about,/<p class="about-lead">([\s\S]*?)<\/p>/)),paragraphs:[plain(capture(about,/<p class="about-lead">[\s\S]*?<\/p><p>([\s\S]*?)<\/p>/))],experienceCopy:plain(capture(about,/<div class="experience-block">[\s\S]*?<\/h3><p>([\s\S]*?)<\/p>/)),reelCaption:plain(capture(templateHtml,/<div class="video-caption"><span>([\s\S]*?)<\/span>/)),reelPosterAlt:capture(about,/<img src="assets\/showreel-poster.webp"[^>]*alt="([^"]*)"/ )},
 ipDescription:plain(capture(ip,/<h2[\s\S]*?<\/h2><p>([\s\S]*?)<\/p>/)),
 contactIntro:plain(capture(contact,/<h2[\s\S]*?<\/h2><p>([\s\S]*?)<\/p>/)),
 workIntro:plain(capture(section('work'),/<div class="intro-aside"><p>([\s\S]*?)<\/p>/)),
 servicesIntro:plain(capture(section('services'),/<h2[\s\S]*?<\/h2><p>([\s\S]*?)<\/p>/)),
 seo:{description:decode(capture(templateHtml,/<meta name="description" content="([^"]*)"/)),ogDescription:decode(capture(templateHtml,/<meta property="og:description" content="([^"]*)"/))},
 projects:Object.fromEntries(templateData.projects.map(project=>[project.id,{eyebrow:project.eyebrow,summary:project.summary,scope:project.scope}])),
 services:Object.fromEntries(templateData.services.map(service=>[service.id,{subtitle:service.titleVi,summary:service.summary,scope:service.scope}]))
};
const labels={
 en:{heroAlt:'Pinky Lamb pink sheep mascot in the Crystal Blossom identity',heroPrimary:'Explore our work',heroSecondary:'Watch showreel',cta:'Tell us your idea',credential:'View credential 2026',logo:'Pinky Lamb logo',ipAction:'Let’s develop an idea',ipAlt:'Pinky Lamb pink sheep mascot',office:'Office: ',address:['981 Hồng Bàng, Bình Tây Ward,','Ho Chi Minh City, Vietnam'],back:'BACK TO TOP',copyright:'Pinky Lamb. All rights reserved.',loadMore:'Load more projects',nav:{work:'Work',services:'Services',about:'About Pinky','ip-studio':'IP Studio',clients:'Clients',contact:'Contact'},logoPrefix:'',logoSuffix:' logo',imagePrefix:'Project image: '},
 vi:{heroAlt:'Mascot cừu hồng Pinky Lamb trong bộ nhận diện Crystal Blossom',heroPrimary:'Khám phá dự án',heroSecondary:'Xem showreel',cta:'Kể ý tưởng của bạn',credential:'Xem credential 2026',logo:'Logo Pinky Lamb',ipAction:'Cùng phát triển một ý tưởng',ipAlt:'Mascot cừu hồng của Pinky Lamb',office:'Văn phòng: ',address:['981 Hồng Bàng, Phường Bình Tây,','TP. Hồ Chí Minh, Việt Nam'],back:'VỀ ĐẦU TRANG',copyright:'Pinky Lamb. Bảo lưu mọi quyền.',loadMore:'Xem thêm dự án',nav:{work:'Dự án',services:'Dịch vụ',about:'Về Pinky','ip-studio':'IP Studio',clients:'Khách hàng',contact:'Liên hệ'},logoPrefix:'Logo ',logoSuffix:'',imagePrefix:'Ảnh dự án: '},
 ja:{heroAlt:'Crystal Blossomのブランドデザインに登場するPinky Lambのピンクの羊のマスコット',heroPrimary:'実績を見る',heroSecondary:'映像を見る',cta:'アイデアを聞かせてください',credential:'会社案内2026を見る',logo:'Pinky Lambのロゴ',ipAction:'一緒にアイデアを育てる',ipAlt:'Pinky Lambのピンクの羊のマスコット',office:'事務所：',address:['981 Hồng Bàng, Bình Tây,','ベトナム・ホーチミン市'],back:'ページの先頭へ',copyright:'Pinky Lamb. 無断転載を禁じます。',loadMore:'実績をもっと見る',nav:{work:'実績',services:'サービス',about:'Pinkyについて','ip-studio':'IPスタジオ',clients:'クライアント',contact:'お問い合わせ'},logoPrefix:'',logoSuffix:'のロゴ',imagePrefix:'プロジェクト画像：'}
};
function templateDataCopy(){return structuredClone(templateData);}
function localeCopy(locale){
 if(!Object.hasOwn(labels,locale))throw Error('Unsupported source locale');
 const body=structuredClone(locale==='vi'?nativeVi:P7_TEMPLATE_TRANSLATIONS[locale]),label=labels[locale];
 const projects=Object.fromEntries(templateData.projects.map(project=>{
  const translated=body.projects[project.id];if(!translated)throw Error('Project translation missing: '+project.id);
  return [project.id,{title:project.title,...translated,imageAlts:Object.fromEntries([['cover',label.imagePrefix+project.title],...project.gallery.filter(asset=>asset!==project.image).map((asset,index)=>['gallery:'+asset,label.imagePrefix+project.title+' — '+(index+2)])])}];
 }));
 const services=Object.fromEntries(templateData.services.map(service=>{const translated=body.services[service.id];if(!translated)throw Error('Service translation missing: '+service.id);return [service.id,{title:service.title,...translated}];}));
 return {
  hero:{heading:structuredClone(templateHeadings['hero-title']),eyebrow:'INDEPENDENT MINDS. MEMORABLE EXPERIENCES.',description:body.heroDescription,footnote:'BASED IN VIETNAM. CREATING FOR THE WORLD.',note:'The house of\nall cutest things.',primaryAction:{label:label.heroPrimary},secondaryAction:{label:label.heroSecondary},image:{alt:label.heroAlt}},
  groups:{
   header:{descriptor:'CREATIVE AGENCY & IP STUDIO',tagline:'A LITTLE CUTE. A LOT OF CREATIVE.',ctaLabel:label.cta,credentialLabel:label.credential,logoAlt:label.logo},
   clients:{heading:[{text:'Brands that'},{text:'made an impact with us.',emphasis:'STRONG'}]},
   about:{heading:structuredClone(templateHeadings['about-title']),...body.about,experienceLabel:'Years of creative & production experience.',experienceLocationLabel:'HO CHI MINH CITY, VIETNAM',signatureCopy:[{text:'Independent minds.\n'},{text:'A shared creative heart.',emphasis:'STRONG'}],signatureAlt:'',reelHeading:{lines:[[{text:'Made of ideas.'}],[{text:'Made with heart.'}]]},reelTitle:'Pinky Lamb / Showreel 2025'},
   'ip-studio':{heading:structuredClone(templateHeadings['ip-title']),description:body.ipDescription,disciplines:['CREATIVE CONCEPTS','CONTENT FORMATS','LONG-TERM EXPERIENCES'],ctaLabel:label.ipAction,imageAlt:label.ipAlt},
   contact:{heading:structuredClone(templateHeadings['contact-title']),intro:body.contactIntro,officePhonePrefix:label.office,addressLines:label.address,illustrationAlt:''},
   footer:{heading:{lines:[[{text:"LET'S CREATE"}],[{text:'SOMETHING MEMORABLE.'}]]},descriptor:'INDEPENDENT CREATIVE PRODUCTION AGENCY & IP STUDIO',backToTopLabel:label.back,copyrightLabel:label.copyright},
   seo:{title:decode(capture(templateHtml,/<title>([^<]*)<\/title>/)),ogTitle:decode(capture(templateHtml,/<meta property="og:title" content="([^"]*)"/)),...body.seo,shareAlt:label.heroAlt}
  },
  nav:label.nav,logoPrefix:label.logoPrefix,logoSuffix:label.logoSuffix,
  sections:{work:{heading:structuredClone(templateHeadings['work-title']),eyebrow:'SELECTED WORK',intro:body.workIntro,loadMoreLabel:label.loadMore},services:{heading:structuredClone(templateHeadings['services-title']),eyebrow:'WHAT WE DO',intro:body.servicesIntro}},
  projects,services
 };
}

return {templateData:templateDataCopy(),localeCopy};
}
