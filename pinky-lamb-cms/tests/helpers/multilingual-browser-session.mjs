/** Process-owned browser. Never serialize a context, credentials, page content or errors. */
export class MultilingualBrowserSession {
 #phases;#checkpoint;#dispose;#completed=new Set();#attemptedWrites=new Set();#readonly=false;#failure=false;#permit=false;#busy=false;#allowsMutation=null;#state='READY';#blocked=0;
 constructor({browser,context,page,phases={},checkpoint=()=>{},dispose}){
  this.browser=browser;this.context=context;this.page=page;this.#checkpoint=checkpoint;this.#dispose=dispose??(()=>browser.close());
  for(const name of Object.keys(phases))if(!/^[a-z0-9-]+$/.test(name))throw Error('Invalid local phase name');
  this.#phases=Object.freeze({...phases});
 }
 async installFence(){
  await this.context.route('**/api/cms/**',async route=>{
   if(['GET','HEAD','OPTIONS'].includes(route.request().method())||(this.#permit&&this.#allowsMutation?.(route.request())===true))return route.continue();
   this.#blocked++;return route.abort('blockedbyclient');
  });
 }
 async status(){
  const browserConnected=this.browser.isConnected(),pageOpen=!this.page.isClosed(),alive=browserConnected&&pageOpen;
  let responsive=false;if(alive)try{responsive=await this.page.evaluate(()=>true);}catch{}
  return {state:alive?this.#state:browserConnected?'PAGE_CLOSED':'CLOSED',browserConnected,pageOpen,alive,responsive,mode:this.#readonly?'READ_ONLY':'DEFAULT_DENY',mutationsAllowed:this.#permit,busy:this.#busy,blockedMutations:this.#blocked,completedStages:[...this.#completed],attemptedWriteStages:[...this.#attemptedWrites]};
 }
 async waitForLogin(isReady,timeoutMs=600000){
  if(this.#busy)throw Error('Session busy');
  if(this.#state==='LOGIN_WAIT_EXPIRED')throw Error('Use explicit confirmLogin after expiry');
  this.#busy=true;this.#state='AWAITING_LOGIN';
  const deadline=Date.now()+timeoutMs;
  try{
   do{if(!(await this.status()).alive)throw Error('Browser unavailable');if(await isReady()){this.#state='AUTHENTICATED';return true;}await new Promise(resolve=>setTimeout(resolve,Math.min(100,timeoutMs)));}while(Date.now()<deadline);
   this.#readonly=true;this.#state='LOGIN_WAIT_EXPIRED';return false;
  }catch{this.#failure=true;this.#readonly=true;this.#state='HELD_READ_ONLY';throw Error('Login readiness failed; browser retained if alive');}
  finally{this.#busy=false;}
 }
 async confirmLogin(isReady){
  if(this.#busy)throw Error('Session busy');
  if(this.#state!=='LOGIN_WAIT_EXPIRED'||this.#failure||this.#attemptedWrites.size)throw Error('Login expiry revalidation unavailable');
  this.#busy=true;
  try{
   const status=await this.status();if(!status.alive||!status.responsive)throw Error('Browser unavailable');
   if(!await isReady())throw Error('Normal login not ready');
   await this.#checkpoint({stage:'login-revalidated',state:'AUTHENTICATED'});
   this.#readonly=false;this.#state='AUTHENTICATED';
  }finally{this.#busy=false;}
 }
 async runPhase(name,{readonly=false}={}){
  const phase=this.#phases[name];if(!phase)throw Error('Unknown local phase');
  if(this.#busy)throw Error('Session busy');if(!(await this.status()).alive)throw Error('Browser unavailable');
  if(this.#busy)throw Error('Session busy');
  if(phase.kind==='write'){
   if(readonly||this.#readonly)throw Error('Session is read-only');
   if(this.#completed.has(name)||this.#attemptedWrites.has(name))throw Error('Write stage already attempted; replay forbidden');
   if(phase.authorize?.()!==true)throw Error('Write stage lacks explicit task authorization');
  }
  this.#busy=true;this.#state='RUNNING';
  try{
   if(phase.kind==='write'){this.#attemptedWrites.add(name);await this.#checkpoint({stage:name,state:'WRITE_ATTEMPT_STARTED'});this.#allowsMutation=phase.allowsMutation;this.#permit=true;}
   await phase.run({page:this.page,context:this.context});this.#permit=false;
   // Commit the immutable checkpoint BEFORE any later visual phase can run.
   await this.#checkpoint({stage:name,state:'COMPLETE',kind:phase.kind==='write'?'write':'readonly'});
   this.#completed.add(name);this.#state='READY';
  }catch{
   this.#permit=false;this.#failure=true;this.#readonly=true;this.#state='HELD_READ_ONLY';
   await this.#checkpoint({stage:name,state:'HELD_READ_ONLY'});
   throw Error('Phase failed; retained session is read-only; inspect local stage');
  }finally{this.#permit=false;this.#busy=false;}
 }
 async resumeReadonly(name){return this.runPhase(name,{readonly:true});}
 async replaceReadonlyPhases(replacements){
  if(this.#busy)throw Error('Session busy');
  const names=Object.keys(replacements);
  if(!names.length)throw Error('No readonly phases supplied');
  for(const name of names){
   if(!Object.hasOwn(this.#phases,name))throw Error('Unknown local phase');
   if(this.#phases[name].kind==='write'||replacements[name].kind==='write'||replacements[name].authorize||replacements[name].allowsMutation)throw Error('Write phase replacement forbidden');
   if(typeof replacements[name].run!=='function')throw Error('Invalid readonly phase');
  }
  this.#busy=true;
  try{
   await this.#checkpoint({stage:'readonly-reloaded',state:'READ_ONLY_CONSUMER_REPLACED'});
   this.#phases=Object.freeze({...this.#phases,...replacements});
  }finally{this.#busy=false;}
 }
 async finish(cleanup){
  if(this.#busy)throw Error('Session busy');this.#busy=true;this.#readonly=true;
  try{
   await cleanup();await this.#checkpoint({stage:'finish',state:'CLEANUP_VERIFIED'});
   await this.#dispose();this.#state='CLOSED';
  }catch{this.#failure=true;this.#state='HELD_READ_ONLY';throw Error('Cleanup unverified; browser retained if alive');}
  finally{this.#busy=false;}
 }
 async close(){if(this.#busy)throw Error('Session busy');this.#permit=false;this.#readonly=true;await this.#dispose();this.#state='CLOSED';}
}
