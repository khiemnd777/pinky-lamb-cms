/** UI-only comparison. No persisted flags, mutations, requests or revision changes. */
const ids=['settings','clients','work','services','about','ip','contact','footer','structure'];
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function siteDirtyGroups(saved,working){
 if(!saved||!working)return [];
 const section=(content,key)=>content.sections?.find(value=>value.sectionId===(key==='ip'?'ip-studio':key));
 const view=(content,key)=>{const settings=content.settings??{};switch(key){
 case 'settings':return [settings.header,settings.brand,settings.nav,content.hero,content.seo];
 case 'clients':return [section(content,key),settings.clientLogos];
 case 'work':return [section(content,key),content.projects];
 case 'services':return [section(content,key),content.services];
 case 'about':return [section(content,key),settings.credential,settings.showreel];
 case 'contact':return [section(content,key),settings.contact];
 case 'footer':return [section(content,key),settings.copyright,settings.contact?.facebookUrl];
 case 'structure':return content.sectionOrder;
 default:return section(content,key);
 }};
 const bindings=(content,key)=>(content.claimSources??[]).filter(({claimPath:path})=>(path==='creative-copy'&&key==='footer')||(key==='settings'?['hero/facts','seo/facts','settings/brand/facts'].includes(path):key==='clients'?path.startsWith('clientLogos/'):key==='work'?path.startsWith('projects/'):key==='services'?path.startsWith('services/'):key==='about'?['settings/credential/facts','settings/showreel/facts','sections/about/facts'].includes(path):key==='ip'?path==='sections/ip-studio/facts':key==='contact'?path==='settings/contact/facts':key==='footer'?path==='sections/footer/facts':false));
 return ids.filter(key=>!same(view(saved,key),view(working,key))||key!=='structure'&&!same(bindings(saved,key),bindings(working,key)));
}
