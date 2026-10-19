import {readFileSync} from 'node:fs';
import {createHostingSourceCopy} from '../../scripts/hosting-source-copy.mjs';
const source=createHostingSourceCopy(readFileSync(new URL('../../public-baseline/index.html',import.meta.url),'utf8'),readFileSync(new URL('../../public-baseline/content.js',import.meta.url),'utf8'));
export const p7TemplateData=()=>structuredClone(source.templateData);
export const p7QaCopy=locale=>source.localeCopy(locale);
