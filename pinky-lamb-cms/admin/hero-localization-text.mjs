/** Plain-text editing with per-code-unit provenance. No HTML parsing or normalization. */
export function createHeroText(input,{heading=false}={}){
 let serial=0;const original=structuredClone(input),initial=[];
 const lines=heading?input:[input];
 lines.forEach((line,i)=>{if(i)initial.push({char:'\n',origin:++serial});for(const run of line){const origin=++serial;for(let j=0;j<run.text.length;j++)initial.push({char:run.text[j],origin,...(run.emphasis===undefined?{}:{emphasis:run.emphasis})});}});
 let chars=initial,history=[structuredClone(initial)],index=0;
 const text=()=>chars.map(c=>c.char).join('');
 const remember=()=>{history.splice(index+1);history.push(structuredClone(chars));if(history.length>100)history.shift();index=history.length-1;};
 function boundaries(value){return [0,...[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(value)].map(x=>x.index+x.segment.length)];}
 function expand(start,end){const b=boundaries(text());return [b.filter(x=>x<=start).at(-1)??0,b.find(x=>x>=end)??text().length];}
 return {
  get text(){return text();},
  replace(next){
   const prev=text();if(next===prev)return;let start=0,oldEnd=prev.length,newEnd=next.length;
   while(start<oldEnd&&start<newEnd&&prev[start]===next[start])start++;
   while(oldEnd>start&&newEnd>start&&prev[oldEnd-1]===next[newEnd-1]){oldEnd--;newEnd--;}
   // A changed grapheme is indivisible: retain only complete surrounding graphemes.
   const [safeStart,safeEnd]=expand(start,oldEnd);newEnd+=safeEnd-oldEnd;start=safeStart;oldEnd=safeEnd;
   const origin=++serial,insert=Array.from({length:newEnd-start},(_,i)=>({char:next[start+i],origin}));
   chars=[...chars.slice(0,start),...insert,...chars.slice(oldEnd)];remember();
  },
  format(start,end,emphasis){
   if(!['NONE','STRONG','ACCENT'].includes(emphasis))throw Error('Định dạng không hợp lệ.');
   [start,end]=expand(start,end);if(start===end)return false;
   chars=chars.map((c,i)=>i>=start&&i<end&&(!heading||c.char!=='\n')?{...c,emphasis}:c);remember();return true;
  },
  undo(){if(index===0)return false;chars=structuredClone(history[--index]);return true;},
  redo(){if(index===history.length-1)return false;chars=structuredClone(history[++index]);return true;},
  serialize(){
   if(JSON.stringify(chars)===JSON.stringify(initial))return structuredClone(original);
   const out=[[]];let current=out[0],previous;
   for(const c of chars){if(heading&&c.char==='\n'){current=[];out.push(current);previous=undefined;continue;}
    if(previous&&(previous.emphasis??'NONE')===(c.emphasis??'NONE'))current.at(-1).text+=c.char;
    else current.push({text:c.char,...(c.emphasis===undefined?{}:{emphasis:c.emphasis})});previous=c;
   }
   for(const line of out){if(!line.length)line.push({text:''});if(line.length>(heading?8:12))throw Error(`Nội dung vượt ${heading?8:12} vùng định dạng. Gộp hoặc bỏ định dạng trước khi lưu.`);if(line.map(x=>x.text).join('').length>(heading?100:1000))throw Error(`Nội dung tối đa ${heading?100:1000} ký tự${heading?'/dòng':''}.`);}
   if(heading&&out.length>3)throw Error('Tiêu đề tối đa 3 dòng.');return heading?out:out[0];
  }
 };
}
