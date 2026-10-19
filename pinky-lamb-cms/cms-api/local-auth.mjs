import fs from 'node:fs';
import path from 'node:path';
import {randomBytes,randomUUID} from 'node:crypto';
import {betterAuth} from 'better-auth';
import {fromNodeHeaders} from 'better-auth/node';
import {getMigrations} from 'better-auth/db/migration';

const BASE_URL='http://127.0.0.1:5273';
const SECRET_NAME='auth.secret';

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
  session:{cookieCache:{enabled:false}},
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
 const auth=betterAuth(options);
 const link=sqlite.prepare('SELECT auth_user_id,legacy_uid,email_normalized,source_disabled,enrolled FROM cms_auth_links WHERE auth_user_id=?');
 const legacy=sqlite.prepare('SELECT auth_user_id,legacy_uid,email_normalized,source_disabled,enrolled FROM cms_auth_links WHERE legacy_uid=?');
 const user=sqlite.prepare('SELECT id,email,emailVerified FROM user WHERE id=?');
 const sessionById=sqlite.prepare('SELECT id FROM session WHERE id=? AND userId=?');
 async function getSession(request){
  const result=await auth.api.getSession({headers:fromNodeHeaders(request.headers),query:{disableCookieCache:true}});
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
