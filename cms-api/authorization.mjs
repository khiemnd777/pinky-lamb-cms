import {createRequire} from 'node:module';
import {validateRuntime,installNetworkFence,PROJECT} from '../scripts/local-guard.mjs';
import {ApiError} from '../contracts/errors.mjs';
validateRuntime(process.env,undefined,{server:true});installNetworkFence();
process.env.METADATA_SERVER_DETECTION='none';
const require=createRequire(import.meta.url);
const {initializeApp,getApps}=require('firebase-admin/app');
const {getAuth}=require('firebase-admin/auth');
const {getFirestore}=require('firebase-admin/firestore');
const app=getApps().find(app=>app.name==='cms-local') ?? initializeApp({projectId:PROJECT},'cms-local');
export const auth=getAuth(app);
export const db=getFirestore(app);
const permissions={SITE_IMPORT:['OWNER'],MEMBER_READ:['EDITOR','REVIEWER','PUBLISHER','OWNER'],DRAFT_SAVE:['EDITOR','OWNER'],SNAPSHOT_SUBMIT:['EDITOR','OWNER'],SNAPSHOT_REVIEW:['REVIEWER','OWNER'],SOURCE_CHECK:['REVIEWER','OWNER'],MEDIA_UPLOAD:['EDITOR','OWNER'],MEDIA_RETRY:['EDITOR','OWNER']};
const normalized=value=>typeof value==='string'?value.trim().toLowerCase():'';
const credentialErrors=new Set(['auth/argument-error','auth/invalid-id-token','auth/id-token-expired','auth/id-token-revoked','auth/user-disabled','auth/user-not-found','auth/invalid-argument']);
/** Identity comes only from a verified bearer token. Re-read in the mutation transaction. */
export async function authorize(request,action,transaction){
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
