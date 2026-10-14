import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateMediaApplicationRuntime,ENDPOINTS,PROJECT} from './local-guard.mjs';

/** A manual canonical worker entry. It does not launch/adopt emulators, seed
 * Auth/Firestore, reset queues, release uncertain slots or inspect other PIDs. */
export async function runMediaWorkerLocal(argv=process.argv.slice(2)) {
  if(!Array.isArray(argv) || argv.length!==0)throw new Error('MEDIA_WORKER_LOCAL: no command arguments accepted');
  validateMediaApplicationRuntime();
  process.umask(0o077);
  // Delay every SDK and processor import until the local runtime guard passed.
  const [{db,auth},{createLocalMediaUploadStorage},{createMediaCache},{createMediaRecovery},{startMediaJobPump},{J1_LIMITS}]=await Promise.all([
    import('../cms-api/authorization.mjs'),
    import('../cms-api/media-upload-storage.mjs'),
    import('../cms-api/media-cache.mjs'),
    import('../cms-api/media-recovery.mjs'),
    import('../cms-api/media-worker.mjs'),
    import('../cms-api/media-jobs-domain.mjs')
  ]);
  const storage=createLocalMediaUploadStorage(),cache=createMediaCache(),recovery=createMediaRecovery({db});
  const pump=await startMediaJobPump({db,auth,storage,cache,recovery});
  // The worker's bounded pump timer is unref'ed for API callers. This dedicated
  // manual entry stays alive while waiting for queued jobs without opening HTTP.
  const keepAlive=setInterval(()=>{},J1_LIMITS.heartbeatMs);
  let stopped=false;
  const stop=()=>{
    if(stopped)return;stopped=true;pump.stop();clearInterval(keepAlive);
    process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);
    // Existing owned work completes through its worker fencing/quiescence path.
    // No forced exit, process signal, quota release or fake READY is performed.
    console.log('MEDIA_WORKER_LOCAL: queue scanning stopped; active work retains its normal completion path');
  };
  process.on('SIGINT',stop);process.on('SIGTERM',stop);
  console.log(`MEDIA_WORKER_LOCAL: ${PROJECT} queue pump; Auth 127.0.0.1:${ENDPOINTS.auth}, Firestore 127.0.0.1:${ENDPOINTS.firestore}, Storage 127.0.0.1:${ENDPOINTS.storage}`);
  return Object.freeze({stop});
}

if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  runMediaWorkerLocal().catch(error=>{
    console.error('MEDIA_WORKER_LOCAL: startup unavailable',{code:error.code??'LOCAL_RUNTIME_UNAVAILABLE'});
    process.exitCode=1;
  });
}
