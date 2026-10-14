# SPEC-cms-content — M1 Hero/SEO, revision and review

Date: 2026-10-11. Task: `CMS-M1-00`. Modules: `cms-content`, M1 boundaries of `cms-preview` and `cms-review`.

**Verified:** M1 is open and approved in the [register](../../approvals/APPROVAL-REGISTER.json). The [frozen scope](../../approvals/CMS-001-v2.scope.json) authorizes only Hero/SEO, legacy catalog selection, private preview, immutable review and a local QA artifact. Baseline `dist/index.html` supplies the existing Hero and SEO markup. Other sections remain read-only.

**Proposed implementation contract:** details below refine approved task 00. **Unknown / NOT_RUN:** no test or runtime result is implied by this specification. M1 completion is not `LOCAL_COMPLETE`, user acceptance or publication.

## Objective, ownership and dependencies

An EDITOR or OWNER reads the current draft, changes Hero/SEO, saves one revision, previews that saved revision, and submits an immutable snapshot. A different REVIEWER or OWNER reviews that exact snapshot hash. A later draft edit cannot change the submitted snapshot or review target.

Identity supplies verified Actor/action authorization according to [SPEC-cms-identity](SPEC-cms-identity.md). Content owns typed draft validation and optimistic revisions. Review owns immutable snapshot/review records and a separate mutable current decision. Preview/export consume a public projection and the read-only baseline; they do not write Firestore or authorize publication.

Only allowlisted `.mjs`, JSON fixtures/catalog and documents from the canonical M1 tasks may be created. Use vanilla ESM + JSDoc and Zod. Type notation in this document does not add TypeScript tooling or extra source paths.

## M1 content and exact bounds

`HeroSeoContent = {schemaVersion: 1, locale: 'vi-VN', hero: Hero, seo: Seo}`. Keep the architecture's `Hero`, `Heading`, `TextRun`, `Action`, `AssetUse` and `Seo` names and fields. No services/projects/settings/section-order writes or generic block/theme engine.

Every object is strict: reject unknown keys at all nesting levels. All strings are plain text, not trusted HTML. Do not strip HTML-like text and then claim input was safe; encode that text on output. Required strings must have non-whitespace content. Caps use JavaScript string length (UTF-16 code units), with exact submitted string content preserved. Reject NUL and control characters except LF/CR/TAB in copy fields; labels/title/alt/IDs remain single-line. No coercion, automatic truncation or silent field removal.

| Field | Contract |
| --- | --- |
| `hero.kind`, `hero.variant` | Exact `HERO`, `hero-split` |
| `hero.heading.lines` | 1–3 lines; each line 1–8 `TextRun`; combined text length 1–100 per line; at least one visible character per line |
| `TextRun.text` | Nonempty string within parent aggregate cap; whitespace run permitted when parent has visible content |
| `TextRun.emphasis` | Optional `NONE | STRONG | ACCENT`; absence renders as NONE |
| `hero.eyebrow` | Required 1–120 |
| `hero.description` | 1–12 `TextRun`; aggregate 1–1000; visible content required |
| `hero.primaryAction` | One required Action |
| `hero.secondaryAction` | Optional Action; omit to remove; null invalid |
| Action `label` | 1–80, single-line |
| `hero.footnote`, `hero.note` | Required strings, 0–240 and 0–300 respectively; empty hides that copy element |
| `hero.image` | Required IMAGE `AssetUse`; `LEGACY_READY` catalog asset only |
| `seo.title`, `seo.ogTitle` | Required 1–80, single-line |
| `seo.description`, `seo.ogDescription` | Required 1–200, single-line |
| `seo.ogImage` | Required IMAGE `AssetUse`; `LEGACY_READY` only; not decorative |
| `AssetUse.assetId` | Catalog ID, 1–100, ASCII `[A-Za-z0-9_-]`; must exist and have required kind/status |
| `AssetUse.alt` | Required string 0–300, single-line; nondecorative requires visible alt; decorative requires exactly empty alt |
| `AssetUse.isDecorative` | Required boolean; only Hero image may be decorative |
| `AssetUse.focalPoint` | Optional strict `{x,y}`; finite numbers, each 0..1; default center is renderer behavior, not persisted mutation |
| `message` on submit | Optional plain text, 0–500 |
| `note` on review | Optional plain text, 0–1000; no markup, no public rendering |
| Revisions | Integer 0..`Number.MAX_SAFE_INTEGER - 1`; seeded draft revision 0; increment exactly one on mutation |

Action is exactly one strict discriminated union:

```text
SECTION:    {kind:'SECTION', sectionId:'work'|'services'|'about'|'ip-studio'|'contact', label}
SHOWREEL:   {kind:'SHOWREEL', label}
CREDENTIAL: {kind:'CREDENTIAL', assetId, label}
```

`SECTION` produces a known baseline anchor. `SHOWREEL` resolves the baseline catalog showreel; it accepts no URL or asset override. `CREDENTIAL` accepts only a catalog `PDF` asset, currently the baseline credential. No `href`, script/data URL, arbitrary target, external import or raw HTML is accepted. Different anchors, variants or new asset uploads need a later engineered/approved change.

Limit each HTTP JSON mutation body to 64 KiB UTF-8 bytes before parsing. Limit decoded logical draft/snapshot envelopes and the actual persisted draft/snapshot envelopes to 256 KiB each, measured as compact UTF-8 JSON bytes. The actual persisted measurement includes the escaping of the storage-only `contentJson` string, metadata and resolved manifests/provenance. Reject oversize before transaction writes instead of splitting documents or uploading chunks. M1 has no binary/base64 input. These are application limits, not Firebase's document limit.

## Legacy catalog

`contracts/legacy-assets.json` is a finite metadata catalog assembled from baseline files. Records retain architecture notation: `id`, `kind: IMAGE|VIDEO|PDF`, `legacyPath`, `mimeType`, `sizeBytes`, dimensions/duration where applicable, `status: LEGACY_READY`, `derivatives`, `rights`, `sourceRefs`, `createdBy`, `createdAt`. Add the measured lower-case `sha256` needed to pin legacy bytes; it is server/catalog metadata, never editable draft input. Catalog `createdBy` is a synthetic bootstrap UID. Rights/source entries describe supplied provenance; do not manufacture legal verification or new claim approval.

Only raster IMAGE files may be selected for Hero/OG; no SVG image selection, font, remote URL or user-defined output path. The fixed baseline PDF/video may serve controlled actions. All `legacyPath` values resolve below `public-baseline/`, contain no traversal or absolute path, and refer to an existing regular file. Verify realpath containment and SHA-256; reject symlink/path escapes. Paths are resolved by catalog lookup, not concatenated from a client string. The picker cannot upload, archive, rename or write catalog records.

The artifact copies/references only public baseline assets. Preserve brand artwork, logo and `FONT-NOTICES.txt` bytes. Private catalog rights evidence, sourceRefs and bootstrap actor fields never enter public projection. The public baseline remains the faithful setup copy; it is not the generated output directory.

The full `contracts/legacy-assets.json` is private server/exporter input. Never import it into admin JavaScript, shared browser schema modules or the Vite build dependency graph. The browser receives a sanitized catalog through the authenticated GET draft response below. Shared Hero validation receives explicit safe ID/kind/status metadata from that response; the server separately validates against the complete fixed catalog. Browser validation does not grant trust to client-supplied catalog records.

## HTTP contract

Function `cmsApi` is Firebase Functions v2 `onRequest` in the Functions emulator. Vite `/api/cms` proxy forwards to `http://127.0.0.1:5001/demo-pinky-lamb-cms/us-central1/cmsApi` and preserves `/api/cms/...` suffix. No standalone Express service, callable alternative or additional API endpoint is required for M1.

All six endpoints require the identity checks. GET endpoints take no body. No query filtering/listing interface is added. Unknown route returns 404 `NOT_FOUND`; recognized route with unsupported method returns 405 `METHOD_NOT_ALLOWED` with an Allow header. Auth/ACL is checked before private resource lookup. Malformed JSON returns 400; non-JSON mutation content type returns 415; body size beyond cap returns 413. Semantic schema failures return 422.

**Verified transport constraint / proposed local adapter:** pinned Firebase CLI15.33.0 registers its32MiB JSON parser before the CMS handler; malformed JSON can otherwise return framework HTML400 rather than the required envelope. Its runtime loads cms-api/index.mjs before parser registration. Adapt only the exact cmsApi HTTP runtime's first known JSON factory to the installed raw parser with `type:()=>true`, limit65536bytes, inflatefalse and the original rawBodySaver verify callback. Every incoming body, including missing/unsupported Content-Type, is collected as raw bytes; the installed parser's parsed-body flag makes subsequent framework text/form/raw parsers skip. CMS still performs current Auth/action checks, method/content-type checks, strict UTF8/JSON parsing and schema validation. Unsupported JSON charset/type returns415 from the CMS contract; compressed request transport is unsupported and returns400 BAD_REQUEST. Oversize wire input returns413 PAYLOAD_TOO_LARGE before JSON parsing or application mutation. Mutation payloads remain bounded even if supplied with Content-Length or chunked transfer.

The adapter is an in-process, source/version/hash-checked factory replacement, not a node_modules change. The argv entry must be exactly the fixed absolute installed functionsEmulatorRuntime.js path or that same path with its .js suffix omitted; the installed CLI passes the extensionless form. Resolve that entry through createRequire's module resolver and require its realpath to equal the exact reviewed .js file. Never accept a basename/pattern or arbitrary resolved source. Cwd must equal the fixed cms-api directory, FUNCTIONS_EMULATOR must be true, FUNCTION_TARGET must be cmsApi and FUNCTION_SIGNATURE_TYPE must be http. Discovery, CLI, Auth emulator and other body-parser factories retain original behavior. Resolve body-parser through createRequire(runtimePath), assert its exact1.20.8 package/path and reviewed index/raw/read sources, capture original factories, then replace the configurable json export with Object.defineProperty. Only the known first factory with limit32mb and verify callback namedrawBodySaver is adapted; otherwise delegate the original. Installation is idempotent. CLI runtime source SHA256 is224e604c745fd538ce13b56ea651aa9c955cd32b8e629d8e118f6564c6f9c50a; body-parser index/raw/read hashes are recorded with implementation evidence. Keep the helper in allowed scripts/local-guard.mjs and invoke it from allowed cms-api/index.mjs before the SDK import; no extra source path.

Raw-parser callback errors must terminate with existing safe errorEnvelope, correlationId, no-store and nosniff: entity.too.large/status413 maps to413 PAYLOAD_TOO_LARGE; other transport failures map to400 BAD_REQUEST. Never pass parser errors to Express's HTML handler or return raw exceptions, rejected bytes or credentials. A disconnected client cannot receive an envelope, but no mutation may occur. Collection failures precede application authorization without exposing private resource data. This mechanism does not replace Auth verification or relax any validation. Actual malformed/invalidUTF8/missing-type/non-JSON/form/compressed/oversize transport and valid API behavior require emulator tests; source inspection alone does not prove the adapter.

| Method and route | Exact request | Success response | Action |
| --- | --- | --- | --- |
| `GET /api/cms/session` | Bearer token | 200 `{uid,role,isActive:true,authzVersion}` | MEMBER_READ |
| `GET /api/cms/drafts/home` | — | 200 `DraftRead` | MEMBER_READ |
| `PATCH /api/cms/drafts/home` | `{expectedRevision,patch}` + `Idempotency-Key` | 200 `{revision,updatedAt}` | DRAFT_SAVE |
| `POST /api/cms/snapshots` | `{draftRevision,message?}` + key | 201 `SnapshotSummary` | SNAPSHOT_SUBMIT |
| `GET /api/cms/snapshots/{id}` | Valid opaque ID | 200 `{snapshot,reviewState}` | MEMBER_READ |
| `POST /api/cms/reviews` | `{snapshotId,contentHash,expectedReviewRevision,outcome,note?}` + key | 201 `Review` | SNAPSHOT_REVIEW |

`HeroSeoPatch` has only optional `hero` and `seo`; at least one is required. Each supplied object is a complete validated replacement. Omitted object is preserved. No nested partial merge, JSON pointer, server metadata, schemaVersion, locale, UID, role, status, revision or timestamps are accepted inside patch. After replacement validate the entire resulting content and all catalog references. A semantic no-op still creates exactly one revision for its keyed save intent; UI avoids dispatching unchanged forms.

`Draft = {content:HeroSeoContent,revision,updatedBy,updatedAt,lastEventId}`. Metadata is server-owned. `updatedAt` and other HTTP timestamps are UTC RFC 3339 strings; use one trusted server timestamp value per committed mutation.

`DraftRead` is exactly `{content,revision,updatedBy,updatedAt,lastEventId,catalog:CatalogSummary[]}`. The first five fields are the decoded logical Draft; `catalog` is a response-only server projection and is never saved inside Draft or accepted by PATCH. Each strict `CatalogSummary` is `{id,kind,status:'LEGACY_READY',legacyPath,label,width?,height?,durationSeconds?}`. `legacyPath` is a verified relative public-baseline resource path, not a private filesystem path; `label` is a plain display filename/label, 1–160 characters, without claims about rights. Positive dimensions/duration are included only when present in verified fixed metadata. Array order is catalog ID lexical order. No rights, evidenceRef, sourceRefs, createdBy, createdAt, private originals, derivatives metadata or source-document paths are returned. IMAGE records use legacyPath as their public thumbnail; no additional media endpoint is created. All members may read this sanitized catalog through the same authenticated request; no public catalog fetch is used.

`SnapshotSummary = {id,draftRevision,contentHash,mediaManifestHash,schemaVersion,templateVersion,submittedBy,submittedAt}`. The full immutable Snapshot adds `content`, `mediaManifest`, `sourceRefs` and optional submit `message`. M1 `sourceRefs` is a captured array from the fixed seed/catalog provenance; it has no edit endpoint. Source notes remain private.

`Review = {snapshotId,outcome,contentHash,reviewedBy,reviewedAt,note?}`; the immutable record document ID is referenced by `ReviewState.activeReviewId`. `outcome` accepts only `APPROVED | CHANGES_REQUESTED`. `ReviewState = {snapshotId,status,revision,activeReviewId,updatedAt}`. M1 states are `IN_REVIEW | APPROVED | CHANGES_REQUESTED`; cancellation/publish states are roadmap only. A submitted snapshot starts IN_REVIEW, revision 0, activeReviewId null. One committed decision sets outcome, increments review revision to 1 and binds the new immutable record. A terminal state cannot be reviewed again; changes require a new snapshot. Do not add a cancel endpoint or mutable snapshot status.

Snapshot IDs and review IDs are server-generated opaque IDs, 1–128 characters from `[A-Za-z0-9_-]`. Never allow slashes, percent-decoded traversal or arbitrary Firestore paths. Hashes are 64 lower-case hexadecimal characters. Resource IDs are not authorization credentials.

## Firestore storage codec

**Verified compatibility constraint:** the actual local seed was rejected for `hero.heading.lines: TextRun[][]`, before any Draft commit. Firestore Standard does not support an array directly containing another array. Preserve the approved Hero/Heading domain notation and adapt persistence only. [Firestore supported data types](https://firebase.google.com/docs/firestore/manage-data/data-types)

`StoredDraft` is exactly `{contentJson:string,revision,updatedBy,updatedAt,lastEventId}`. `StoredSnapshot` is the full logical Snapshot with `content` replaced by `contentJson:string`; its other metadata, manifest and provenance fields remain unchanged. No stored document has both representations. `contentJson = JSON.stringify(validated HeroSeoContent)` is a private storage field. The HTTP contracts, fixture/export contract, renderer interfaces and hash envelopes still use decoded `content:HeroSeoContent`. Never return `contentJson` to the browser or accept it in a write request. M1 queries by fixed draft ID, snapshot ID and metadata only; no query/filter/index contract is added for copy fields.

Implement the reusable codec in the already allowed `contracts/draft.mjs` at task05; snapshot task08 reuses it. Exact conceptual exports are `encodeStoredContent(content,{catalog}) -> contentJson:string` and `decodeStoredContent(contentJson,{catalog}) -> HeroSeoContent`. Encoding strictly validates the exact content and catalog references before JSON.stringify. Decoding requires a bounded string, uses JSON.parse, then the same strict content/catalog validation without coercion, truncation, fallback or normalization. Reject malformed JSON, unknown keys, wrong schema/asset references and oversize stored/decoded envelopes. Validate stored metadata separately. Invalid stored data is a server integrity failure: return generic500 `INTERNAL_ERROR`, omit raw persisted values and perform no mutation; exporter rejects the fixture/input. Request validation remains422. Task03 seed may use JSON.stringify for the verified baseline before the shared codec exists; task05 adopts the shared codec without another source file.

Read transactions decode and validate the stored content before revision/hash/business checks. Prepare the validated replacement and actual complete stored envelope, enforce both byte caps, then commit only its encoded representation in the same effect/audit/idempotency transaction. Hashes always use canonical decoded content, never raw contentJson bytes or its JSON key order. Equivalent content with different JSON serialization order must produce the same contentHash. TextRun order, submitted Unicode, quotes and backslashes must round-trip exactly. The rejected first draft seed produced no valid draft requiring migration; existing synthetic identity fixtures are independent.

All errors have exactly `{error:{code,message,fieldErrors?,correlationId}}`. `fieldErrors` maps safe dotted paths such as `hero.heading.lines.0` to arrays of short strings; it excludes rejected values, credentials and source paths. `correlationId` is a server-generated opaque ID. Human messages are safe Vietnamese UI copy; automated clients use `code`. Never return a stack or raw SDK exception.

| HTTP | Stable code | Meaning |
| --- | --- | --- |
| 400 | `BAD_REQUEST` | Malformed JSON or invalid transport |
| 401 | `UNAUTHENTICATED` | Missing/invalid/expired/revoked/disabled token |
| 403 | `FORBIDDEN`, `SELF_REVIEW_FORBIDDEN` | Identity or action policy denies access |
| 404 | `NOT_FOUND` | Authorized resource/route not found |
| 405 / 413 / 415 | `METHOD_NOT_ALLOWED` / `PAYLOAD_TOO_LARGE` / `UNSUPPORTED_MEDIA_TYPE` | Transport bound |
| 409 | `REVISION_CONFLICT`, `REVIEW_REVISION_CONFLICT`, `REVIEW_STATE_CONFLICT`, `IDEMPOTENCY_IN_PROGRESS` | Stale expected state or short mutation currently in progress |
| 422 | `VALIDATION_ERROR`, `IDEMPOTENCY_PAYLOAD_MISMATCH`, `SNAPSHOT_HASH_MISMATCH` | Invalid schema/key reuse/exact-hash mismatch |
| 429 | `RATE_LIMITED` | Only if an implemented local limiter triggers; not proof of a distributed limiter |
| 500 / 503 | `INTERNAL_ERROR` / `LOCAL_RUNTIME_UNAVAILABLE` | Generic failure / required emulator guard unavailable |

Revision conflict response does not expose another author's unsaved content. The client retains dirty edits, fetches the current saved draft separately, and asks the user to reconcile. It never increments expectedRevision automatically to force overwrite.

## Transactions, revision and retry

All three mutations require one stable `Idempotency-Key` per user intent, 8–128 ASCII characters `[A-Za-z0-9_-]`; the client generates it once, then reuses it for bounded retries with the identical body. A new deliberate save/submit/decision uses a new key. Invalid/missing key is 422 `VALIDATION_ERROR`.

The trusted API uses `cmsIdempotency/{sha256(canonicalJson({uid,operation,key}))}`, with operation containing HTTP method and canonical resource. `requestHash = sha256(canonicalJson(body))`; include expected revision and optional message/note. Transport token/header/correlation metadata is excluded. Record `{requestHash,state:'COMPLETED',statusCode,response,createdAt,eventId}` with the exact response in the same Firestore transaction as the effect and audit. The record is private and retained for the lifetime of the local fixture dataset; no TTL in M1.

For every mutation, perform all transaction reads before writes. Check current membership/role and resource-specific self-review before replay. Existing completed record with same requestHash replays original status/body without another revision/snapshot/review/audit. Different requestHash returns 422 `IDEMPOTENCY_PAYLOAD_MISMATCH`. M1 effects are entirely Firestore transactions, so no committed pending record or external side effect is needed. Concurrent identical requests converge to one commit and replay through transaction retry; if bounded processing cannot settle, return 409 `IDEMPOTENCY_IN_PROGRESS` or 503, never duplicate the effect or steal a key. A timed-out client retries its identical intent; timeout is not evidence that no commit occurred.

Save transaction reads member, idempotency record and `cmsDrafts/home`; validates expectedRevision; creates replacement content; commits revision+1, server actor/time/event ID, audit and completed response together. Two different keys using the same current revision produce one winner and one 409. Keep generated IDs stable across Firestore callback retries; callback must not mutate UI/process state. Firestore may rerun transaction functions, so external side effects must not occur in the callback. [Firebase transactions](https://firebase.google.com/docs/firestore/manage-data/transactions)

Submit transaction reads member, idempotency and exact draft revision. It resolves immutable legacy media/provenance from the trusted fixed catalog whose file hashes were verified. Commit a new Snapshot, ReviewState revision0, audit and idempotency result together. Submission does not increment/change draft revision. Different deliberate submit intents may create separate snapshots at the same draft revision; repeated delivery of one intent creates only one. Every snapshot captures `submittedBy`; owner review checks that exact UID.

Review transaction reads member, idempotency, Snapshot and ReviewState. Require the supplied contentHash equals the stored/recomputed snapshot hash, expectedReviewRevision equals current revision, state IN_REVIEW, and actor differs from submittedBy. Commit immutable Review, terminal ReviewState revision+1, audit and response together. Two concurrent reviewers with different keys/revision0 produce one decision; loser gets 409. Check self-review on both APPROVED and CHANGES_REQUESTED. A later draft save cannot redirect the review to new content.

Audit is server-only append-only `{id,action,actorUid,resourceId,fromRevision?,toRevision?,contentHash?,at,correlationId}` with no tokens/passwords/raw body/private paths. Denied requests do not create an editorial success audit or modify content. Error diagnostics remain sanitized.

## Canonical hash and immutability

Use one `canonicalJson` definition across API, fixture verification and export: recursively sort object keys by JavaScript default lexical sort, preserve array order, preserve submitted strings and finite numeric values, and serialize with JSON.stringify to compact UTF-8. Do not locale-sort, normalize case/text, reorder TextRuns, include undefined values or encode timestamps differently during rehash. Optional absent keys stay absent; null is permitted only where specified. Duplicate JSON keys must not be relied on as a supported input form.

`mediaManifest` is a unique asset list sorted by asset ID for Hero image, OG image, credential actions and the fixed SHOWREEL assets when used. Each entry captures resolved `{id,kind,legacyPath,mimeType,sizeBytes,sha256,width?,height?,durationSeconds?,rights,sourceRefs}`. The private rights/source fields stay inside the snapshot. Never resolve media later from a mutable draft or untrusted caller path.

`mediaManifestHash = sha256(canonicalJson(mediaManifest))`.

`contentHash = sha256(canonicalJson({content,mediaManifestHash,schemaVersion:1,templateVersion:'m1-hero-split-v1'}))`.

This envelope binds all content, schema, renderer version and media/provenance manifest. It excludes submitter/time/message, review note/state and draft envelope metadata. Snapshot's separate `sourceRefs` captures only the provenance already represented in the fixed manifest; M1 does not introduce new editable claim/source records. SHA-256 is an integrity identifier, not a signature or proof of source validity. Renderer changes that affect output require a new template version and fresh snapshot; incompatible version/hash is rejected at preview/export.

Snapshot `sourceRefs` follows the architecture's `SourceReference[]` notation; manifest `sourceRefs` remains an array of private reference strings. Project each unique exact string from the captured manifest, sort strings with default JavaScript lexical order, and compute `digest = sha256(UTF8(reference))` without JSON quoting or normalization. Each entry is exactly `{id:'source-'+digest,kind:'SUPPLIED_FILE',privateDocumentId:'legacy-source-'+digest,claimBindings:[],verification:'UNVERIFIED'}`. Omit pages, notes, checkedBy and checkedAt. Recompute this complete deterministic projection when validating a snapshot; clients cannot supply a different mapping. These opaque IDs describe snapshot lineage only. They do not assert that a private source registry/document has been created, that a claim or legal right has been verified, or that the reference target was inspected. The digest identifies the reference string, not source file bytes; verified asset bytes are pinned separately by the media manifest's SHA-256. Do not create a source collection/file or new endpoint in M1. Original reference paths and the private projection never enter public HTML, JavaScript or export manifests.

Snapshot and Review documents are create-only trusted API outputs. No update/delete path exists, and browser writes are denied. Editing after submit changes Draft only. Export validates the snapshot shape, recomputes both hashes, validates catalog bytes and template version, and rejects tampered content/manifest.

## Renderer and local export contract

Place pure shared rendering in `preview/hero-renderer.mjs`; no Firebase/auth/filesystem imports or server access there. It consumes parsed HeroSeoContent and explicit resolved public asset mappings. It produces encoded HTML, never accepts executable user templates.

Conceptual interfaces, implemented within the existing allowed files:

```text
renderHero(content, {publicAssets, assetBaseUrl}) -> heroHtml
renderSeo(content.seo, {publicAssets, localBaseUrl}) -> metadataHtml
composeDocument(baselineHtml, content, {publicAssets, localBaseUrl, mode}) -> html
```

`publicAssets` is a plain object keyed by catalog asset ID. Each value is exactly `{id,kind,path,width?,height?,durationSeconds?}`, projected from the authenticated CatalogSummary for browser preview or verified manifest for filesystem export; `path` is the relative public-baseline path, never a private filesystem path. The browser adapter maps summary legacyPath to path, excluding label/status. `assetBaseUrl` and `localBaseUrl` are system config, validated HTTP loopback origin/paths, never editor input. `composeDocument` uses localBaseUrl to resolve public resources; private preview may use the configured loopback baseline asset prefix. URLs use percent encoding and catalog lookup. `localBaseUrl` ends in `/`; generated canonical/og:url use it and og:image uses its verified public path. Do not fetch baseline historical canonical or OG URLs. Both render methods return strings and composition returns one complete HTML string. Modes are exactly `PRIVATE_PREVIEW | QA_EXPORT`.

Render heading lines as one H1 using only fixed emphasis elements/classes and line breaks. Encode `& < > " '` in text/attributes as appropriate. A plain `<script>` or `</script>` copy string appears as text, never markup. Decorative images use empty alt; nondecorative images retain validated alt; focal point becomes numeric controlled object-position. CTA dispatch uses the known SECTION fragment, SHOWREEL `data-showreel` and allowlisted credential path with `noopener noreferrer` for new tabs. No arbitrary style attribute or URL interpolation from a text field. Baseline ornamental artwork may remain fixed trusted markup; it is not an editable field.

Composition replaces exactly one baseline Hero section and each existing SEO metadata/title/canonical slot. Missing/duplicate required baseline slots fail rather than producing a second H1 or silently omitting metadata. Add exactly one `og:image:alt` metadata tag, because the baseline does not contain that slot; if a fixture supplies one, replace it and reject duplicates. Keep other section HTML/CSS/app/content scripts and baseline asset bytes intact except system URL substitutions required for local canonical/OG. Fixed noneditable Hero decoration remains baseline-derived; do not invent additional editable schema for artwork labels. M1 is Hero/SEO managed with a baseline view of the other sections.

For `mode:'PRIVATE_PREVIEW'`, use the same rendered Hero/SEO within the baseline document but remove executable scripts, inline handler attributes and actionable form/navigation behavior from the preview shell. Set CSP `default-src 'none'`, `script-src 'none'`, `connect-src 'none'`, `form-action 'none'`, `base-uri 'none'`; allow only required configured loopback image/style/font/media resources. A sandbox iframe without permissions contains this document. An inert preview does not claim to test baseline JavaScript interactions; those are checked separately in the local artifact. Use a saved Draft or exact Snapshot object; display its saved revision/snapshot ID outside the iframe. Dirty unsaved form text is not labeled as the saved preview. Logout removes all private preview state and races are generation guarded.

The desktop/mobile selector configures actual child viewports1440×900 and390×844. A narrower CMS shell may contain horizontal scrolling for the fixed desktop view, but the parent scroll viewport must have an accessible name, keyboard focus and visible focus indication. Browser proof must show natural Tab access and ArrowRight increasing its scrollLeft without changing child viewport or relaxing the iframe sandbox. Screenshot-only parent clipping/outer-size adjustments must be restored and reported; they do not prove the normal editor's keyboard behavior.

The srcdoc document inherits the parent policy container, so a child meta CSP cannot relax a blocked parent resource. The admin parent must permit the fixed Hosting origin5010 for baseline styles as well as required images/fonts; media5010 is permitted only when preview actually includes that media. If the renderer uses a numeric object-position style attribute for exact validated focalPoint, both parent and child may use `style-src-attr 'unsafe-inline'` for that controlled attribute. Keep style blocks restricted to explicit sources and scripts unchanged; no user-defined CSS/HTML is accepted. Rewrite public stylesheet/asset URLs directly to the configured loopback source without inserting a base element, and preserve local SVG fragment references. Browser tests must verify loaded CSS/fonts/image, computed focal position, no unexpected CSP console errors, no script/connect/form activity and the empty sandbox before CheckpointB. [HTML policy container](https://html.spec.whatwg.org/multipage/browsers.html#policy-container), [CSP style attributes](https://www.w3.org/TR/CSP3/#directive-style-src-attr).

The parent preview adapter fetches only the fixed public baseline `http://127.0.0.1:5010/index.html` with no credentials and no private API token. Its parent `connect-src` may permit that exact configured Hosting origin. Local Hosting may add only an exact `/index.html` header rule with `Access-Control-Allow-Origin: http://127.0.0.1:5173`, without `Access-Control-Allow-Credentials`; keep the existing public asset header rule and require the local guard to validate the complete fixed header list. This is a public baseline transport allowance, not a private content endpoint or API CORS change. Keep the child's `connect-src 'none'` and empty sandbox unchanged. Baseline HTML and assets remain byte-identical. Runtime restart evidence must show index200, exact allowed origin, matching baseline SHA-256, API200 and passing guard tests before browser preview acceptance. Strip inline event-handler attributes case-insensitively, including uppercase/mixed-case names, and retain a corresponding renderer/browser oracle.

For `mode:'QA_EXPORT'`, compose a static local page from a validated snapshot fixture and retain baseline public interactions. The pure renderer and static SEO are shared; export does not call Functions/Firebase/Hosting APIs. The worker's CLI is `npm run export:local -- --snapshot tests/fixtures/approved-hero.json --out .preview-output`. The synthetic fixture follows Snapshot contract and pins verified manifest/hash; a fixture filename or optional captured review metadata does not claim a live editorial approval. The real review workflow is independently tested through emulators.

Write only below `.preview-output/`, with normalized/realpath containment, never baseline/dist/source. Fail if output is an escaping symlink or baseline destination. Do not recursively delete an arbitrary existing output directory; overwrite only exporter-owned files safely and preserve unknown files. Copy required byte-identical public baseline resources/font notice; a local QA manifest contains public file paths/hashes/templateVersion only, not private Snapshot/Review data. Static HTML has no Auth/Firebase SDK, private provenance, UID, bearer token, admin email or review note. Public contact details already in baseline remain public.

The artifact has static title, description, OG title/description/image/alt, canonical and the saved Hero before JavaScript. It is served only on loopback for QA. There is no current-publication pointer, release history, rollback, publish API, deployment or button claiming `Đã xuất bản`; UI identifies `Bản thử local — chưa xuất bản`.

## Required test oracles and delivery

| Oracle | Required result | Test level / task |
| --- | --- | --- |
| C-01: valid baseline-derived Hero/SEO; min/max caps | Parse/save/reopen exact content; one revision per keyed intent | Unit 02; API 05; UI 06 |
| C-02: unknown/server keys, arbitrary variant/URL, missing/wrong-kind asset, oversize | 422/413; no partial write; field feedback | Unit 02; API 05 |
| C-03: `<script>`, `</script>`, quotes, ampersands and event-like copy | Encoded visible text; no script execution; CTA URL input rejected | Unit 02/07; browser 09 |
| C-04: two editors using same revision | Exactly one save; loser 409; dirty edits preserved | API 05; browser 06/09 |
| C-05: same key/body retry, concurrent retries, same key/different body | One effect/audit; same response; mismatch 422; no key stealing | API 05/08 |
| C-06: submit then edit draft | Snapshot content/manifest/hash unchanged; draft revision advances | API 08 |
| C-07: wrong hash, wrong reviewer, owner self-review, two competing reviewers | No unauthorized decision; exact hash enforced; one terminal decision | API + Rules 08 |
| C-08: authenticated saved preview, logout while request pending | Exact saved revision at 1440×900 and 390×844; no leaked private state after logout | Browser 07/09 |
| C-09: static QA artifact and bytes | One H1; metadata/Hero in HTML with JS off; no private payload; assets exist; baseline unchanged | Renderer 07; export/browser 09 |
| C-10: missing emulator / real project / network capture | Guard fails; Firebase runtime confined to demo+loopback | Unit 01b; API/browser 09 |
| C-11: catalog projection/build/dev serving | GET draft returns only CatalogSummary fields; no rights/sourceRefs/createdBy in admin bundle or responses; private source/.local HTTP requests are denied | API 05; build/browser 06/09 |
| C-12: storage codec, nested heading lines and escaped/Unicode copy | Firestore save/reopen preserves exact logical content; no contentJson in HTTP; decoded hashes match independent canonical values; malformed/tampered/oversize persisted content fails closed without a write | Unit + API 05/08 |
| C-13: emulator framework transport boundary | Malformed JSON/invalidUTF8400, unsupported/missing mutation type415, compressed transport400 and oversize413 use exact safe JSON envelope without writes; valid PATCH and direct Auth behavior remain verified | Guard + API 05 |

**Verified task05 local evidence (2026-10-11):** Medium's `.local/cache/task05-final.tap` records focused lint exit0, then twelve guard, ten current Auth/Rules/API and eight Draft groups passing. Artifact SHA256 is `e78fb0aabf3a80c4bfaefd6a2232a9ac01c5aa6d8e63c954384e384a109a1a28`. High reviewed current source and artifacts without executing tests. Storage codec round-trip/corruption and actual escaped-envelope caps, transactional membership/replay/CAS/audit, sanitized catalog response, exact404/405 dispatch, safe malformed/invalidUTF8/gzip/type/charset/oversize/chunked transport and no-write state/audit/idempotency assertions have evidence. The version/hash-bound runtime adapter is active with the installed CLI's exact extensionless entry. Its reviewed guard/index SHA256 values are `977b26ebd7ed73df35692b6b475da23b3871377a7699915514d5dd5c2c63f4f5` and `889748c5154df9b8cae1a258e6f9c5d3fc599e196b14d392d7b4c24f12bd96be`. Future editor/renderer/review/export acceptance and CheckpointB remain NOT_RUN; pending snapshot/review handlers correctly return503. This evidence is local only and does not close M1.

Meaningful malicious and approved synthetic fixtures are committed inputs in the two allowlisted fixture paths. Generated evidence/data stay in designated `.local/`, test and preview output paths. Node `node --test` runs units; emulator integrations and Playwright/browser tests run with the guarded local wrapper. Planned commands: `npm run lint`, `npm run test:unit`, `npm run test:emulators`, `npm run test:e2e:local`, `npm run build:admin`, and the export command above. Command existence and results are recorded by the implementation worker, not inferred here.

High reviews Checkpoints A/B and final evidence. Record unit, Rules, API, browser, baseline-hash and network evidence separately. Failed/not-run gates remain explicit. M2+ schemas/media/publication require their own specification/tasks and user Approved after this still-open M1 closes.
