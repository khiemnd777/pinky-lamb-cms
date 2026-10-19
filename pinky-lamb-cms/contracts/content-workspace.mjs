import {z} from 'zod';
import {localizedResourceIdentitySchema} from './full-site-localization.mjs';
import {revisionSchema,resourceIdSchema,hashSchema} from './hero.mjs';
import {strictMediaV2JsonSchema} from './media-v3-metadata-v2.mjs';

export const CONTENT_GROUPS=Object.freeze(['settings','clients','work','services','about','ip','contact','footer','structure']);
export const contentGroupSchema=z.enum(CONTENT_GROUPS);
export const contentEntityKindSchema=z.enum(['settings','hero','seo','structure','section','project','service','client']);
export const contentEntitySchema=z.strictObject({kind:contentEntityKindSchema,id:resourceIdSchema,revision:revisionSchema});
export const contentGroupSaveSchema=z.strictObject({expected:z.array(z.strictObject({kind:contentEntityKindSchema,id:resourceIdSchema,revision:revisionSchema})).max(96),content:strictMediaV2JsonSchema});
export const contentGroupReadSchema=z.strictObject({contractRevision:z.literal(1),group:contentGroupSchema,siteRevision:revisionSchema,sourceHash:hashSchema,entities:z.array(contentEntitySchema).max(96),content:strictMediaV2JsonSchema,catalog:z.array(strictMediaV2JsonSchema).max(128),context:strictMediaV2JsonSchema});
export const contentGroupReceiptSchema=z.strictObject({contractRevision:z.literal(1),group:contentGroupSchema,siteRevision:revisionSchema,lastEventId:resourceIdSchema,updatedAt:z.string().datetime(),read:contentGroupReadSchema});
const draftStatus=z.strictObject({resource:localizedResourceIdentitySchema,draft:z.strictObject({revision:revisionSchema,stale:z.boolean()}).nullable()});
export const contentReadinessStatusSchema=z.strictObject({contractRevision:z.literal(1),kind:z.literal('CONTENT_READINESS_STATUS'),state:z.enum(['PENDING','RUNNING','COMPLETED','FAILED']),generation:revisionSchema,updatedAt:z.string().datetime(),readiness:strictMediaV2JsonSchema.nullable(),draftStatuses:z.array(draftStatus).max(144).optional(),errorCode:z.string().nullable()});
