/** Same-origin, cookie-backed local identity. CMS authorization remains server-side. */
export function createLocalAuthClient(){
 const listeners=new Set();
 let currentUser=null;
 const auth={get currentUser(){return currentUser;},async authStateReady(){
  const response=await fetch('/api/auth/get-session',{credentials:'same-origin',cache:'no-store',redirect:'error'});
  if(!response.ok)throw Object.assign(Error('Local session unavailable'),{status:response.status});
  const body=await response.json();currentUser=body?.user??null;
 }};
 function emit(){for(const callback of listeners)queueMicrotask(()=>callback(currentUser));}
 async function signInWithEmailAndPassword(_auth,email,password){
  const response=await fetch('/api/auth/sign-in/email',{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,rememberMe:true})});
  if(!response.ok)throw Object.assign(Error('Local sign-in failed'),{status:response.status});
  const body=await response.json();if(!body?.user)throw Error('Local identity missing');
  currentUser=body.user;emit();return body;
 }
 async function signOut(){
  const response=await fetch('/api/auth/sign-out',{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',headers:{'Content-Type':'application/json'},body:'{}'});
  if(!response.ok)throw Error('Local sign-out failed');
  currentUser=null;emit();
 }
 function onAuthStateChanged(_auth,callback){listeners.add(callback);queueMicrotask(()=>callback(currentUser));return ()=>listeners.delete(callback);}
 return {auth,signInWithEmailAndPassword,signOut,onAuthStateChanged};
}
