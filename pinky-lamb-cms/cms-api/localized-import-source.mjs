import {createHash} from 'node:crypto';
import {canonicalJson} from '../contracts/draft.mjs';
import {ApiError} from '../contracts/errors.mjs';

/** Read the retained source in the target transaction, including every retry. */
export async function assertLocalizedImportSource(trusted,transaction,expectedSourceHash){
 if(expectedSourceHash===undefined)return;
 const target=await transaction.get(trusted.db.collection('cmsDrafts').doc('home-v3'));
 const {current}=await trusted.readTrustedDraftContext({transaction,target});
 const actual=createHash('sha256').update(canonicalJson(current.content)).digest('hex');
 if(actual!==expectedSourceHash)throw new ApiError('REVISION_CONFLICT');
}
