import {createRequire} from 'node:module';
import {validateRuntime,installNetworkFence,PROJECT} from '../scripts/local-guard.mjs';
import {DATA_ROOT,validateLocalDataRuntime,installLocalDataNetworkFence} from '../scripts/local-data-guard.mjs';
import {ApiError} from '../contracts/errors.mjs';
const durable=process.env.PINKY_LOCAL_DATA_MODE==='durable';
const require=createRequire(import.meta.url);
let auth,db,localAuth;
if(durable){
 validateLocalDataRuntime();installLocalDataNetworkFence();
 const [{openLocalDataStore},{openLocalAuth}]=await Promise.all([import('./local-data-store.mjs'),import('./local-auth.mjs')]);
 db=openLocalDataStore(DATA_ROOT);
 localAuth=await openLocalAuth({root:DATA_ROOT,sqlite:db.sqlite});
 auth={getUser:localAuth.getUser};
}else{
 validateRuntime(process.env,undefined,{server:true});installNetworkFence();
 process.env.METADATA_SERVER_DETECTION='none';
 const {initializeApp,getApps}=require('firebase-admin/app');
 const {getAuth}=require('firebase-admin/auth');
 const {getFirestore}=require('firebase-admin/firestore');
 const app=getApps().find(app=>app.name==='cms-local') ?? initializeApp({projectId:PROJECT},'cms-local');
 auth=getAuth(app);db=getFirestore(app);
}
export {auth,db};
export const localAuthServer=durable?localAuth.auth:null;
const permissions={DRAFT_PUBLISH:['OWNER'],SITE_IMPORT:['OWNER'],MEMBER_READ:['EDITOR','REVIEWER','PUBLISHER','OWNER'],DRAFT_SAVE:['EDITOR','OWNER'],SNAPSHOT_SUBMIT:['EDITOR','OWNER'],SNAPSHOT_REVIEW:['REVIEWER','OWNER'],SOURCE_CHECK:['REVIEWER','OWNER'],MEDIA_UPLOAD:['EDITOR','OWNER'],MEDIA_RETRY:['EDITOR','OWNER']};
const normalized=value=>typeof value==='string'?value.trim().toLowerCase():'';
const credentialErrors=new Set(['auth/argument-error','auth/invalid-id-token','auth/id-token-expired','auth/id-token-revoked','auth/user-disabled','auth/user-not-found','auth/invalid-argument']);
/** Identity comes only from a verified bearer token. Re-read in the mutation transaction. */
export async function authorize(request,action,transaction){
 if(durable){
  validateLocalDataRuntime();
  const method=String(request.method??'GET').toUpperCase();
  const host=request.headers?.host;
  const cookies=request.rawHeaders?.filter((_value,index)=>index%2===0&&String(request.rawHeaders[index]).toLowerCase()==='cookie').length;
  if(host!=='127.0.0.1:5273'||cookies>1||request.headers?.authorization!==undefined)throw new ApiError('UNAUTHENTICATED');
  if(!['GET','HEAD','OPTIONS'].includes(method)&&request.headers?.origin!=='http://127.0.0.1:5273')throw new ApiError('FORBIDDEN');
  const identity=await localAuth.getSession(request);
  if(!identity)throw new ApiError('UNAUTHENTICATED');
  if(transaction)transaction.validate(()=>localAuth.sessionActive(identity));
  const reference=db.collection('cmsMembers').doc(identity.legacyUid);
  const snapshot=transaction?await transaction.get(reference):await reference.get();
  const member=snapshot.data();
  if(!member||member.uid!==identity.legacyUid||member.isActive!==true||!Number.isSafeInteger(member.authzVersion)||member.authzVersion<1||!normalized(member.expectedEmail)||normalized(identity.authUser.email)!==normalized(member.expectedEmail)||!permissions[action]?.includes(member.role))throw new ApiError('FORBIDDEN');
  return Object.freeze({uid:identity.legacyUid,role:member.role,authzVersion:member.authzVersion});
 }
 validateRuntime(process.env,undefined,{server:true});
 const bearer=request.headers?.authorization;
 const authorizationCount=request.rawHeaders?.filter((_value,index)=>index%2===0 && String(request.rawHeaders[index]).toLowerCase()==='authorization').length;
 if(authorizationCount!==undefined && authorizationCount!==1)throw new ApiError('UNAUTHENTICATED');
 if(typeof bearer!=='string' || !/^Bearer [A-Za-z0-9_.-]+$/.test(bearer) || bearer.length>16384)throw new ApiError('UNAUTHENTICATED');
 let token,user;
 try{token=await auth.verifyIdToken(bearer.slice(7),true);user=await auth.getUser(token.uid);}catch(error){if(credentialErrors.has(error.code))throw new ApiError('UNAUTHENTICATED');throw error;}
 if(user.disabled)throw new ApiError('UNAUTHENTICATED');
 const reference=db.collection('cmsMembers').doc(token.uid);
 const snapshot=transaction?await transaction.get(reference):await reference.get();
 const member=snapshot.data();
 if(!member || member.uid!==token.uid || user.uid!==token.uid || member.isActive!==true || !Number.isSafeInteger(member.authzVersion) || member.authzVersion<1 || token.email_verified!==true || user.emailVerified!==true || !normalized(member.expectedEmail) || normalized(token.email)!==normalized(member.expectedEmail) || normalized(user.email)!==normalized(member.expectedEmail) || !permissions[action]?.includes(member.role))throw new ApiError('FORBIDDEN');
 return Object.freeze({uid:token.uid,role:member.role,authzVersion:member.authzVersion});
}
