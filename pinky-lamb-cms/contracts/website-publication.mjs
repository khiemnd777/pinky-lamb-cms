import {z} from 'zod';
import {localizedPublishSchema} from './localized-review-records.mjs';
import {hashSchema} from './hero.mjs';
export const fileConfirmationSchema=z.strictObject({hash:hashSchema,baseSnapshotSetHash:hashSchema});
export const websitePublishSchema=z.unknown().transform((value,ctx)=>{
 if(!value||typeof value!=='object'||Array.isArray(value)){ctx.addIssue({code:'custom',message:'Invalid publication'});return z.NEVER;}
 const {fileConfirmation,...selection}=value,parsed=localizedPublishSchema.safeParse(selection),confirmation=fileConfirmationSchema.optional().safeParse(fileConfirmation);
 if(!parsed.success||!confirmation.success){ctx.addIssue({code:'custom',message:'Invalid publication confirmation'});return z.NEVER;}return {...parsed.data,...(confirmation.data?{fileConfirmation:confirmation.data}:{})};
});
