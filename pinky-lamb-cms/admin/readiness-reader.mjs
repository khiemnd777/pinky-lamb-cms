/** Share only an in-flight readiness read inside one editorial workspace.
 * Results are never retained after completion. Each caller keeps cancellation;
 * closing the workspace aborts the shared transport. */
export function createReadinessReader(upstream){
 const owner=new AbortController();let current=null;
 function apiFetch(path,options={}){
  if(path!=='/api/cms/localizations/editorial/readiness'||(options.method??'GET')!=='GET')return upstream(path,options);
  const signal=options.signal;signal?.throwIfAborted();owner.signal.throwIfAborted();
  if(!current){const pending=upstream(path,{...options,signal:owner.signal});current=pending;pending.finally(()=>{if(current===pending)current=null;}).catch(()=>{});}
  const pending=current;if(!signal)return pending;
  return new Promise((resolve,reject)=>{const abort=()=>reject(new DOMException('Đã hủy.','AbortError'));signal.addEventListener('abort',abort,{once:true});pending.then(value=>{if(signal.aborted)abort();else resolve(value);},reject).finally(()=>signal.removeEventListener('abort',abort));});
 }
 return {apiFetch,destroy:()=>owner.abort()};
}
