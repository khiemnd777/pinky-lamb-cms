export const PROJECT='demo-pinky-lamb-cms';
export const RECOVERY_READ_ONLY=typeof __PINKY_M2_RECOVERY__!=='undefined' && __PINKY_M2_RECOVERY__===true;
export const LOCAL=Object.freeze({admin:`http://127.0.0.1:${RECOVERY_READ_ONLY?5175:5273}`,auth:`http://127.0.0.1:${RECOVERY_READ_ONLY?9098:9099}`,firestore:'127.0.0.1:8080',functions:`http://127.0.0.1:${RECOVERY_READ_ONLY?5002:5001}`,hosting:'http://127.0.0.1:5010'});
export function assertLocalOrigin(){if(location.origin!==LOCAL.admin || PROJECT!=='demo-pinky-lamb-cms' || Object.values(LOCAL).some(value=>!value.includes('127.0.0.1')))throw new Error('Môi trường local chưa sẵn sàng.');}
export const firebaseConfig=Object.freeze({projectId:PROJECT,apiKey:'demo-local-only',appId:'demo-pinky-lamb-cms-local'});
