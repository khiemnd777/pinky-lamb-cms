const authorizedReads=new WeakMap();
/** One authorization point per read-only HTTP request. Never reuse identity
 * across requests or transaction attempts; commands always recheck membership. */
export function authorizeReadRequest(request,action,transaction,resolve){
 if(transaction||action!=='MEMBER_READ'||!['GET','HEAD'].includes(request?.method))return resolve();
 let result=authorizedReads.get(request);if(!result){result=Promise.resolve().then(resolve);authorizedReads.set(request,result);result.catch(()=>authorizedReads.delete(request));}return result;
}
