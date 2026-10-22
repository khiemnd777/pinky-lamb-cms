/** One HTTP byte range, bounded to a previously integrity-checked video. */
export function videoByteRange(header,size){
 if(header===undefined)return null;
 const match=typeof header==='string'&&/^bytes=(\d*)-(\d*)$/.exec(header);
 if(!match||!match[1]&&!match[2]||!Number.isSafeInteger(size)||size<1)throw new RangeError('Invalid video range');
 const first=match[1]?Number(match[1]):null,last=match[2]?Number(match[2]):null;
 if(first!==null&&!Number.isSafeInteger(first)||last!==null&&!Number.isSafeInteger(last))throw new RangeError('Invalid video range');
 const start=first===null?Math.max(0,size-last):first,end=first===null||last===null?size-1:Math.min(last,size-1);
 if(last===0&&first===null||start>=size||end<start)throw new RangeError('Unsatisfiable video range');
 return {start,end};
}
