/** Auth identity and backend authorization have separate lifetimes. No token storage here. */
const terminalAuthCodes=new Set(['auth/user-disabled','auth/user-not-found','auth/user-token-expired','auth/invalid-user-token','auth/invalid-id-token','auth/id-token-revoked','auth/invalid-refresh-token','auth/user-signed-out']);
export function authFailureAction(error){
 if(terminalAuthCodes.has(error?.code)||error?.status===401||(error?.status===403&&error?.code!=='SELF_REVIEW_FORBIDDEN'))return 'SIGN_OUT';
 return 'KEEP_IDENTITY';
}
export function localSignInMessage(error){
 if(error?.status===400)return 'Yêu cầu đăng nhập không hợp lệ (400). Vui lòng kiểm tra địa chỉ email rồi thử lại.';
 if(error?.status===401)return 'Máy chủ Auth local từ chối thông tin đăng nhập (401). Vui lòng kiểm tra tài khoản và mật khẩu trong kho Auth local.';
 if(error?.status===429)return 'Có quá nhiều lần đăng nhập. Vui lòng đợi rồi thử lại; phiên đã lưu không bị xóa.';
 if(error?.status===403)return 'Yêu cầu đăng nhập bị từ chối (403). Hãy kiểm tra địa chỉ http://127.0.0.1:5273/login và quyền tài khoản.';
 return 'Không thể kết nối dịch vụ đăng nhập local. Phiên đã lưu không bị xóa; vui lòng thử lại sau khi dịch vụ sẵn sàng.';
}
export function persistenceHierarchy(sdk){return [sdk.indexedDBLocalPersistence,sdk.browserLocalPersistence,sdk.inMemoryPersistence];}
/** Probe only a disposable application-owned marker, never SDK/session data. */
export async function rememberingAvailable({indexedDB=globalThis.indexedDB,storage=()=>globalThis.localStorage}={}){
 if(indexedDB)try{
  const available=await new Promise(resolve=>{
   const unique=globalThis.crypto?.randomUUID?.()??`${Date.now()}-${Math.random().toString(36).slice(2)}`;
   const name=`pinky-local-auth-storage-check-${unique}`;let database=null,settled=false;
   const cleanup=()=>{try{database?.close();}catch{}try{indexedDB.deleteDatabase(name);}catch{}};
   const done=value=>{if(!settled){settled=true;clearTimeout(timer);cleanup();resolve(value);}};
   const timer=setTimeout(()=>done(false),1500);
   try{
    const request=indexedDB.open(name,1);
    request.onerror=()=>done(false);request.onblocked=()=>done(false);
    request.onupgradeneeded=()=>{try{if(settled){request.transaction?.abort();return;}request.result.createObjectStore('probe');}catch{done(false);}};
    request.onsuccess=()=>{
     database=request.result;if(settled){cleanup();return;}
     try{
      const transaction=database.transaction('probe','readwrite');
      transaction.oncomplete=()=>done(true);transaction.onerror=()=>done(false);transaction.onabort=()=>done(false);
      transaction.objectStore('probe').put('1','available');
     }catch{done(false);}
    };
   }catch{done(false);}
  });
  if(available)return true;
 }catch{}
 try{const target=storage(),key=`pinky-local-auth-storage-check-${Date.now()}-${Math.random()}`;target.setItem(key,'1');target.removeItem(key);return true;}catch{return false;}
}
