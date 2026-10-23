import {z} from 'zod';
import {hashSchema,resourceIdSchema} from './hero.mjs';
import {localizedResourceIdentitySchema} from './full-site-localization.mjs';
export const sharedFileSummarySchema=z.strictObject({hash:hashSchema,baseSnapshotSetHash:hashSchema,changes:z.array(z.strictObject({from:resourceIdSchema,to:resourceIdSchema})).max(64),files:z.array(z.strictObject({id:resourceIdSchema,name:z.string().min(1).max(256),kind:z.enum(['IMAGE','PDF','WORD','EXCEL'])})).min(1).max(64),resources:z.array(localizedResourceIdentitySchema).min(1).max(138)});
