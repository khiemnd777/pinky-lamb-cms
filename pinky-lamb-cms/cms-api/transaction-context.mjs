/** Context belongs to one callback attempt, never to a reused transaction ID.
 * Native writes change the namespace so a post-write computation is not reused.
 */
export function transactionValue(transaction,key,load){
 if(!(transaction?.context instanceof Map))return load();
 const scoped=(transaction.writes?.length??0)+':'+key;
 if(!transaction.context.has(scoped))transaction.context.set(scoped,Promise.resolve().then(load));
 return transaction.context.get(scoped);
}
