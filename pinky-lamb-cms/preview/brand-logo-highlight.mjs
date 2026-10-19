export const BRAND_LOGO_HIGHLIGHT_STYLE=`
html[data-work-services-qa] .client-strip .client-logos img{filter:grayscale(1);opacity:.7;transform:scale(1);transition:filter 1.2s cubic-bezier(.4,0,.2,1),opacity 1.2s cubic-bezier(.4,0,.2,1),transform 1.3s cubic-bezier(.4,0,.2,1)}
html[data-work-services-qa] .client-strip .client-logos img:is(.is-active,:hover){filter:grayscale(0);opacity:1;transform:scale(1.04)}
@media(prefers-reduced-motion:reduce){html[data-work-services-qa] .client-strip .client-logos img{filter:none;opacity:1;transition:none}html[data-work-services-qa] .client-strip .client-logos img:is(.is-active,:hover){transform:none}}
`;

export function nextBrandLogoOrder(count,previous=-1,random=Math.random){
 const order=Array.from({length:count},(_,index)=>index);
 for(let index=order.length-1;index>0;index--){const other=Math.floor(random()*(index+1));[order[index],order[other]]=[order[other],order[index]];}
 if(order.length>1&&order[0]===previous)[order[0],order[1]]=[order[1],order[0]];
 return order;
}

export function installBrandLogoHighlight(document){
 const section=document.querySelector('#clients');
 if(!section||section.hidden)return;
 const logos=[...section.querySelectorAll('.client-logos img')];
 if(!logos.length)return;
 const window=document.defaultView,reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 let remaining=[],previous=-1,timer=null;
 const advance=()=>{
  if(!remaining.length)remaining=nextBrandLogoOrder(logos.length,previous);
  const active=remaining.shift();
  logos.forEach((logo,index)=>logo.classList.toggle('is-active',index===active));
  previous=active;
 };
 const stop=()=>{if(timer!==null){window.clearInterval(timer);timer=null;}};
 const sync=()=>{
  stop();
  if(reduced.matches){logos.forEach(logo=>logo.classList.remove('is-active'));return;}
  if(previous<0)advance();else logos[previous].classList.add('is-active');
  if(!document.hidden&&logos.length>1)timer=window.setInterval(advance,3400);
 };
 reduced.addEventListener('change',sync);
 document.addEventListener('visibilitychange',sync);
 window.addEventListener('pagehide',stop);
 window.addEventListener('pageshow',sync);
 sync();
}
