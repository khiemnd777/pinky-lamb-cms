import fs from 'node:fs';
import path from 'node:path';
import {randomBytes,randomUUID} from 'node:crypto';
import {betterAuth} from 'better-auth';
import {fromNodeHeaders} from 'better-auth/node';
import {getMigrations} from 'better-auth/db/migration';
import {createAuthMiddleware} from 'better-auth/api';
import {setSessionCookie} from 'better-auth/cookies';

const BASE_URL='http://127.0.0.1:5273';
const SECRET_NAME='auth.secret';
export const LOCAL_AUTH_COOKIE_PREFIX='pinky-lamb-local';
export const LOCAL_AUTH_SESSION_SECONDS=30*24*60*60;
/** Cookies have no port scope. A separate name prevents other localhost apps
 * from overwriting Pinky's remembered identity. Legacy values still pass the
 * normal signature, expiry and database checks; no identity is reconstructed. */
function sessionHeaders(input){
 const headers=new Headers(input),cookie=headers.get('cookie')??'',parts=cookie.split(';').map(v=>v.trim()),scoped=LOCAL_AUTH_COOKIE_PREFIX+'.session_token';
 if(parts.some(v=>v.startsWith(scoped+'='))||parts.includes(LOCAL_AUTH_COOKIE_PREFIX+'.legacy_retired=1'))return headers;
 const legacy=parts.filter(v=>v.startsWith('better-auth.session_token='));
 if(legacy.length===1)headers.set('cookie',[...parts.filter(Boolean),scoped+legacy[0].slice('better-auth.session_token'.length)].join('; '));
 return headers;
}

function syncDirectory(directory){const fd=fs.openSync(directory,'r');try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}
function readSecret(root,{create=false}={}){
 const destination=path.join(root,SECRET_NAME);
 if(!fs.existsSync(destination)){
  if(!create)throw Error('Local Auth secret is missing');
  const temporary=path.join(root,`.auth-secret-${randomUUID()}`);
  const fd=fs.openSync(temporary,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600);
  try{fs.writeFileSync(fd,randomBytes(32).toString('hex'));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
  fs.renameSync(temporary,destination);syncDirectory(root);
 }
 const stat=fs.lstatSync(destination);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||(stat.mode&0o077)!==0||stat.size!==64)throw Error('Insecure local Auth secret');
 const secret=fs.readFileSync(destination,'utf8');
 if(!/^[a-f0-9]{64}$/.test(secret))throw Error('Invalid local Auth secret');
 return secret;
}

export async function openLocalAuth({root,sqlite,create=false,allowEnrollment=false}){
 if(!path.isAbsolute(root)||!sqlite||typeof sqlite.prepare!=='function')throw Error('Invalid local Auth store');
 const secret=readSecret(root,{create});
 const options={
  database:sqlite,secret,baseURL:BASE_URL,trustedOrigins:[BASE_URL],telemetry:{enabled:false},
  emailAndPassword:{enabled:true,disableSignUp:!allowEnrollment,requireEmailVerification:true,revokeSessionsOnPasswordReset:true},
  advanced:{cookiePrefix:LOCAL_AUTH_COOKIE_PREFIX},
  session:{expiresIn:LOCAL_AUTH_SESSION_SECONDS,updateAge:24*60*60,cookieCache:{enabled:false}},
  hooks:{after:createAuthMiddleware(async ctx=>{
   // Reissue a scoped persistent cookie on normal restoration, including a
   // verified legacy session. Bound the cookie to the real database expiry.
   const value=ctx.context.newSession??ctx.context.session;
   // Never resurrect a different old default-cookie session after logout.
   // This marker only disables compatibility; it never grants authentication.
   if(ctx.path==='/sign-out'||ctx.path==='/sign-in/email'&&ctx.context.newSession||ctx.path==='/get-session'&&value?.session&&new Date(value.session.expiresAt).getTime()>Date.now())ctx.setCookie(LOCAL_AUTH_COOKIE_PREFIX+'.legacy_retired','1',{httpOnly:true,sameSite:'lax',path:'/',maxAge:LOCAL_AUTH_SESSION_SECONDS});
   if(ctx.path==='/get-session'&&value?.session&&value.user){const remaining=Math.floor((new Date(value.session.expiresAt).getTime()-Date.now())/1000);if(remaining>0)await setSessionCookie(ctx,value,false,{maxAge:Math.min(remaining,LOCAL_AUTH_SESSION_SECONDS)});}
  })},
 };
 if(create){
  const migration=await getMigrations(options);
  if(migration.unsafeChanges.length||migration.schemaProblems.length)throw Error('Unsafe local Auth schema migration');
  await migration.runMigrations();
  sqlite.exec(`CREATE TABLE IF NOT EXISTS cms_auth_links(
   auth_user_id TEXT PRIMARY KEY,
   legacy_uid TEXT NOT NULL UNIQUE,
   email_normalized TEXT NOT NULL,
   source_disabled INTEGER NOT NULL CHECK(source_disabled IN (0,1)),
   enrolled INTEGER NOT NULL CHECK(enrolled IN (0,1))
  );
  CREATE TABLE IF NOT EXISTS cms_source_users(
   legacy_uid TEXT PRIMARY KEY,
   email_normalized TEXT NOT NULL UNIQUE,
   email_verified INTEGER NOT NULL CHECK(email_verified IN (0,1)),
   source_disabled INTEGER NOT NULL CHECK(source_disabled IN (0,1)),
   provider_id TEXT NOT NULL,
   enrolled INTEGER NOT NULL DEFAULT 0 CHECK(enrolled IN (0,1))
  );`);
 }
 const engine=betterAuth(options),auth={...engine,handler:request=>engine.handler(new Request(request,{headers:sessionHeaders(request.headers)}))};
 const link=sqlite.prepare('SELECT auth_user_id,legacy_uid,email_normalized,source_disabled,enrolled FROM cms_auth_links WHERE auth_user_id=?');
 const legacy=sqlite.prepare('SELECT auth_user_id,legacy_uid,email_normalized,source_disabled,enrolled FROM cms_auth_links WHERE legacy_uid=?');
 const user=sqlite.prepare('SELECT id,email,emailVerified FROM user WHERE id=?');
 const sessionById=sqlite.prepare('SELECT id FROM session WHERE id=? AND userId=?');
 async function getSession(request){
  const result=await auth.api.getSession({headers:sessionHeaders(fromNodeHeaders(request.headers)),query:{disableCookieCache:true}});
  if(!result?.user||!result?.session)return null;
  const linked=link.get(result.user.id);
  if(!linked||linked.source_disabled||!linked.enrolled||!result.user.emailVerified||linked.email_normalized!==String(result.user.email).trim().toLowerCase())return null;
  return {authUser:result.user,session:result.session,legacyUid:linked.legacy_uid};
 }
 async function getUser(legacyUid){
  const linked=legacy.get(legacyUid),record=linked&&user.get(linked.auth_user_id);
  if(!linked||!record||linked.source_disabled||!linked.enrolled)throw Object.assign(Error('Local Auth user missing'),{code:'auth/user-not-found'});
  return {uid:legacyUid,email:record.email,emailVerified:Boolean(record.emailVerified),disabled:false};
 }
 function sessionActive(identity){return Boolean(identity?.session?.id&&identity?.authUser?.id&&sessionById.get(identity.session.id,identity.authUser.id)&&Date.parse(identity.session.expiresAt)>Date.now());}
 return Object.freeze({auth,getSession,getUser,sessionActive});
}
