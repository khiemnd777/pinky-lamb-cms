import {createHash} from 'node:crypto';
import {readdirSync,readFileSync} from 'node:fs';
/** Derived results are pinned to the actual compiled-in validators as well as
 * data versions. A source update cannot reuse an old authority/readiness fact. */
const digest=createHash('sha256');
for(const directory of ['.','../contracts','../preview','../reader']){
 const root=new URL(directory+'/',import.meta.url);
 for(const name of readdirSync(root).filter(name=>name.endsWith('.mjs')).sort())digest.update(directory+'/'+name).update(readFileSync(new URL(name,root)));
}
digest.update(readFileSync(new URL('../package.json',import.meta.url)));
export const CONTENT_CODE_VERSION=digest.digest('hex');
