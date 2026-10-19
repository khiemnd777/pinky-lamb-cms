import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ROOT} from './local-data-guard.mjs';
import {openLocalDataStore} from '../cms-api/local-data-store.mjs';
import {openLocalAuth} from '../cms-api/local-auth.mjs';

const STAGING=path.join(ROOT,'.local','data-staging');
function secretFromTty(){
 if(!process.stdin.isTTY||!process.stdout.isTTY)throw Error('Interactive terminal required');
 process.stdout.write('Mật khẩu mới (không hiển thị): ');
 return new Promise((resolve,reject)=>{
  let value='';const input=process.stdin;input.setRawMode(true);input.resume();
  const finish=(error)=>{input.removeListener('data',onData);input.setRawMode(false);input.pause();process.stdout.write('\n');error?reject(error):resolve(value);};
  const onData=bytes=>{for(const character of bytes.toString('utf8')){
   if(character==='\r'||character==='\n'){finish(value.length>=12&&value.length<=256?null:Error('Password length must be 12 to 256'));return;}
   if(character==='\u0003'){finish(Error('Enrollment cancelled'));return;}
   if(character==='\u007f'){value=value.slice(0,-1);continue;}
   if(character<' '||value.length>=256){finish(Error('Invalid password input'));return;}value+=character;
  }};input.on('data',onData);
 });
}
export async function enrollLocalUser(stage,uid,email,password){
 if(!path.isAbsolute(stage)||!stage.startsWith(STAGING+path.sep)||fs.realpathSync(stage)!==stage||!fs.lstatSync(stage).isDirectory())throw Error('Invalid staging path');
 const store=openLocalDataStore(stage);
 try{
  const sql=store.sqlite,source=sql.prepare('SELECT * FROM cms_source_users WHERE legacy_uid=?').get(uid);
  if(!source||source.email_normalized!==email||source.email_verified!==1||source.source_disabled!==0||source.enrolled!==0||source.provider_id!=='password')throw Error('Source user is not eligible for enrollment');
  const member=await store.collection('cmsMembers').doc(uid).get(),value=member.data();
  if(!member.exists||value?.uid!==uid||value?.expectedEmail?.trim().toLowerCase()!==email||value?.isActive!==true||!Number.isSafeInteger(value.authzVersion)||value.authzVersion<1)throw Error('CMS membership does not match source user');
  if(sql.prepare('SELECT id FROM user WHERE email=?').get(email))throw Error('Auth identity already exists; manual review required');
  const {auth}=await openLocalAuth({root:stage,sqlite:sql,allowEnrollment:true});
  const result=await auth.api.signUpEmail({body:{email,password,name:email}});
  if(!result?.user?.id||result.user.email!==email)throw Error('Auth enrollment result is incomplete');
  sql.transaction(()=>{
   sql.prepare('UPDATE user SET emailVerified=1 WHERE id=? AND email=?').run(result.user.id,email);
   sql.prepare('DELETE FROM session WHERE userId=?').run(result.user.id);
   sql.prepare('INSERT INTO cms_auth_links(auth_user_id,legacy_uid,email_normalized,source_disabled,enrolled) VALUES (?,?,?,?,1)').run(result.user.id,uid,email,0);
   const changed=sql.prepare('UPDATE cms_source_users SET enrolled=1 WHERE legacy_uid=? AND enrolled=0').run(uid).changes;
   if(changed!==1)throw Error('Source enrollment conflict');
  }).immediate();
  return {uid,enrolled:true};
 }finally{store.close();}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==5||process.version!=='v22.23.3'||fs.realpathSync(process.cwd())!==ROOT||process.execArgv.length||process.env.NODE_OPTIONS!==undefined)throw Error('Pinned local enrollment invocation required');
  const [stage,uid,email]=process.argv.slice(2),password=await secretFromTty();
  console.log(await enrollLocalUser(path.resolve(stage),uid,email,password));
 }catch(error){console.error(`LOCAL_DATA_ENROLL: ${error.message}`);process.exitCode=1;}
}
