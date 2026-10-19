# M3-PARALLEL-V3-01 v1 — C0

## Result and authority — completed IMAGE alignment pure recheck

Current revision: `M3-C0-IMAGE-ALIGNMENT-01 v1`, Coordinator Approved source-only. IMAGE schema/fixtures đã sửa; Recheck theo `M3-PURE-POOL-04` đã đạt16/16testsPASS, syntax2/2/ESLintexit0; current stage `C0_GEOMETRY_PURE_RECHECK_PASS_NOT_INTEGRATED`. High delta review `PASS_SOURCE_GOLDEN_DELTA_ONLY` và geometry source reuse vẫn valid, không Required findings. Historical15tests/HighPASS chỉ cho original era, không áp vào changed source. C0 cung cấp validators và projections thuần cho metadata/ref/manifest `home-v3 / 3 / m3-site-media-v1`. Chưa tích hợp CMS. A/B/C/I chưa được release trong task này. Không thay dispatch schema1/2 hoặc historical M1/M2.

Authority là `HUMAN_DELEGATED_COORDINATOR_APPROVAL`, không phải direct human Approved riêng từng slice: [register](../../approvals/M3-PARALLEL-COORDINATION-01-REGISTER.json) và operative lines 1–44 của [frozen coordination snapshot](M3-PARALLEL-COORDINATION-01.md). Whole snapshot SHA256 `69db3eceaee253c42c09740de4ecbe38fd620d8a02c27091d77defc106c9d8a2`. Coordinator gửi release C0 và spec trong nhánh V3. Implementer sole writer: `contracts/media-v3-contract.mjs`, `tests/media-v3-contract.test.mjs`, `tests/fixtures/media-v3-contract.json`, tài liệu này. Không writer khác bị revert.

Observed own `turn_context`: session `01a13604-d138-7ea0-b890-1536b0c65582`, turn `01a13607-ce6d-7a53-95ca-7b930ca09ce0`, actual `gpt-6.1-sol / medium`. Parent quan sát route riêng trước release; implementer kiểm lại latest own context trước ghi. Historical original-era independent exact High review đã hoàn tất `PASS_SOURCE_ONLY_C0`, không Required findings; reviewer session `01a1360a-388b-70f3-b9fa-d257f878835f`, turn `01a13611-ceaa-71e1-b872-3a75c2e89b9f`. Parent actual route `gpt-6.1-sol / xhigh` được ghi riêng, không gọi là exact High.

Skills đã đọc/applied: `using-agent-skills`, `api-and-interface-design`, `test-driven-development`, `incremental-implementation`, `technote`. User chọn level; silence không là approval.

## Exact exports — Verified source, compatibility freeze pending

| Export | Shape hoặc trách nhiệm |
| --- | --- |
| `V3_DESCRIPTOR` | Frozen `{draftId:'home-v3',schemaVersion:3,templateVersion:'m3-site-media-v1'}` |
| `V3_CAPS` | Frozen `references:64`, `derivatives:256`, `rightsProofs:64`, `sourceProofs:61`, `sourceRefs:600`, `max_processing_attempts:2` tổng attempts |
| `V3_BUDGET_PROFILE` | Frozen `storedDraft:262144`, `storedSnapshot:262144`, `privateJSON:262144`, `qaEnvelopeVersion3:2097152`, `qaEnvelopeLegacy:1048576` bytes |
| `V3_MEDIA_LIMITS` | Frozen IMAGE/PDF/VIDEO input/output caps; riêng với serialized-record caps |
| `V3_MANIFEST_ORDER` | Entry ordering source rồi identity; derivative role rồi numeric IMAGE targetWidth, numeric PDF page rồi key; content array order nguyên trạng |
| `imageReferenceSchema` | Strict `{assetId,alt,isDecorative,focalPoint?}` |
| `identityReferenceSchema` | Strict `{assetId}` cho PDF/VIDEO identity |
| `videoPosterReferenceSchema` | Strict `{assetId,derivativeRole:'POSTER',alt,isDecorative,focalPoint?}` |
| `derivativeSchema` | Strict output entry, role/MIME/metadata/caps theo bảng dưới |
| `readyVersionSchema` | Strict IMAGE/PDF/VIDEO union; chỉ kiểm cấu trúc `READY` |
| `mediaBindingSchema` | Strict flat immutable binding bên dưới |
| `bindingFromReadyVersion` | Validate ReadyVersion rồi trả binding mới; không giữ UID |
| `safeMetadataFromReadyVersion` | Validate rồi trả `{assetId,kind,status,archived,revision}` + kind dimensions/duration/pageCount; IMAGE dimensions là oriented originals; rendering dùng derivative dimensions; không digests/UID/derivatives/paths |
| `mediaV3ContextSchema` | Strict `{legacyCatalog:siteMediaEntrySchema[],readyVersions:ReadyVersion[]}`, mỗi array ≤64; reject duplicate/cross-catalog identities; fixed `brand-diagonal`, `favicon` phải thuộc legacy IMAGE |
| `immutableManifestAssetSchema` | ReadyVersion immutable fields/kind metadata, bỏ `status`, `archived`, `revision`, `uploaderUid`, `rightsEvidenceSubmittedBy` |
| `v3MediaManifestEntrySchema` | Strict union `{source:'LEGACY',asset:siteMediaEntrySchema}` hoặc `{source:'MEDIA_VERSION',asset:immutableManifestAssetSchema}` |
| `v3MediaManifestSchema` | 1–64 selected identities; không trùng legacy/new asset ID; tổng new derivative entries ≤256 |
| `canonicalMediaV3Json` | JSON-tree guard rồi reuse canonicalJson hiện hành; không SHA adapter |
| `safeMediaDiagnosticSchema` | Strict `{code,path}` allowlisted; không raw values/messages/SDK/storage/tool paths |

Refs không thêm `source` discriminator. `assetId` 1–100 ASCII `[A-Za-z0-9_-]`; `alt` giữ UTF-16/plainText rules hiện hành, tối đa300, không controls. `isDecorative:true` yêu cầu `alt:''`; false yêu cầu nonblank. `focalPoint` strict `{x,y}` finite trong0..1. SEO decoration refusal, slot traversal, selected+hidden collection và same-version poster resolution chờ A. Context dùng legacy manifest metadata import nguyên `siteMediaEntrySchema`; trusted assembly/`LEGACY_READY` và READY custody do integration bên ngoài kiểm.

**ReadyVersion exact fields:** `assetId`, `kind`, `status:'READY'`, `archived:boolean`, `revision` theo existing `revisionSchema` (0..MAX_SAFE_INTEGER−1), `uploaderUid`, `rightsEvidenceSubmittedBy` theo existing `resourceIdSchema`; `originalSha256`, `originalSizeBytes`, `processingRecipeSha256`, `toolSetSha256`, `derivativeSetSha256`, `evidenceSha256`, `derivatives`. Kind metadata: IMAGE `width,height` là oriented original dimensions, mỗi edge≤8192 và tổng≤40,000,000pixels; PDF `pageCount`1..48; VIDEO `width,height,durationSeconds`. Digests là lowerhex64. Bytes/dimensions/page numbers là positive safe integers; duration finite, positive,≤300. Unknown fields bị reject. Archived record có thể đúng cấu trúc; eligibility chờ A/server. Caller khai `READY` không trở thành authenticated proof.

**Binding:** `{assetId,kind,originalSha256,derivativeSetSha256,processingRecipeSha256,toolSetSha256,evidenceSha256}`. UID/submitter ở trusted actor context riêng; không đưa vào binding. Raw processor receipt chưa có server identity/generation/custody không được parse thành ReadyVersion. Không thay thuật toán `recipeSha256` hiện có của processors.

**Derivative exact fields:** `{key,role,mimeType,sizeBytes,sha256,generation,width?,height?,durationSeconds?,pageNumber?,targetWidth?}`. `key` là logical ID1..128 `[A-Za-z0-9][A-Za-z0-9_-]*`, không filename/FS path. Generation là opaque nonzero decimal string1..128 digits, không leading zero, không `Number` conversion; test vượt Number.MAX_SAFE_INTEGER giữ nguyên bytes.

| Kind/role | Caps và quan hệ |
| --- | --- |
| IMAGE / IMAGE | Original≤10MiB, oriented original metadata mỗi edge≤8192/≤40Mpixels; total outputs≤12MiB. Đúng3entries: `targetWidth`320/960/1920, key tương ứng `image-320`/`image-960`/`image-1920`; width=min(targetWidth,originalwidth), height=max(1,round(originalheight×width/originalwidth)); width≤1920, height≤8192 và≤originalheight, pixels≤40M; không upscale. Duplicate effective dimensions/SHA hợp lệ, không dedup. `targetWidth` bị cấm ở mọi role khác, kể cả explicit undefined. |
| PDF / PDF_DOWNLOAD + PDF_PAGE | Original≤25MiB; đúng1 download application/pdf≤64MiB và pageCount image/webp pages liên tục1..pageCount,≤48; tổng pages≤32MiB, tổng≤96MiB; page edge≤1600, pixels≤4M. Download không page/dimensions/duration; pages không duration. |
| VIDEO / VIDEO + POSTER | Original≤128MiB; đúng1 video/mp4≤48MiB và1 image/webp poster≤1MiB; safe output≤1280×720, duration≤300; VIDEO dimensions/duration bằng version metadata; poster dimensions bằng video; poster không duration/page. |

IMAGE tiny outputs giữ đủ3 distinct keys/targets kể cả byteSHA giống nhau. Portrait2000×3000 tạo320×480,960×1440,1920×2880; tiny120×80 tạo3outputs120×80. Revision theo source `cms-api/media-images-runtime.mjs`:147/160/164 và `validateImageCandidate` trong `cms-api/media-images.mjs`:96–100. Native geometry/output behavior chưa được C0 kiểm. Candidate IMAGE library subset và legacy contracts không đổi.

## Canonical bytes and digests — Verified vectors, Proposed binding definition

`canonicalMediaV3Json` nhận chỉ plain finite JSON tree (Object.prototype/Array.prototype), không cycles/accessors/symbols/sparse arrays/nonenumerable extra fields/undefined/BigInt/nonfinite; depth≤64. Guard không đọc accessor. Object keys sort theo JavaScript `.sort()`; arrays giữ order; strings không trim/normalize Unicode/whitespace. `JSON.stringify` giữ escape semantics hiện hành, gồm lone surrogate `\\ud800` và −0→0. Không đổi encoder schema1/2.

Full private manifest B phải bao tất cả content-selected versions, kể cả hidden và fixed assets; không toàn library. C0 không collect refs hoặc build/sort manifest. B canonical ordering: source ASCII, asset identity ASCII; trong mỗi new asset: derivative role ASCII, IMAGE targetWidth numeric, PDF_PAGE pageNumber numeric, key ASCII. Schema C0 chỉ kiểm shape/count/uniqueness, không tự reorder input. Private manifest giữ original hash; chưa có public projection claim.

Hash payload cho B:

```text
mediaManifestHash = SHA256(canonicalJSON(mediaManifest))
contentHash = SHA256(canonicalJSON({content,mediaManifestHash,schemaVersion:3,templateVersion:'m3-site-media-v1'}))
```

SHA256 dùng UTF-8 exact canonical bytes, lowerhex64; không hashing helper nào được thêm vào production C0. Fixture gồm expected canonical strings/UTF8 byte lengths/hash cho Unicode, combining characters, content array/hidden record, full private manifest, content payload và lone surrogate. Expected vectors được tạo bằng independent Python encoder, test dùng independent encoder + `node:crypto`; không dùng C0 helper để tính expected hashes.

**Proposed derivativeSetSha256 input cho compatibility review:** toàn bộ normalized derivative entries, gồm `key,role,mimeType,sizeBytes,sha256,generation` và IMAGE `targetWidth`, kind-specific `width,height,durationSeconds,pageNumber` khi có. Full3bucket processed set được đưa vào digest, không rights-selected subset. Canonical object keys; list ordering role→IMAGE targetWidth numeric→PDF_PAGE pageNumber numeric→key như trên; missing optional field không encode thành null. Generation inclusion giữ binding storage byte identity. **Unknown:** Coordinator chưa freeze việc included generation có hợp với U0/rights server binding và processor receipt normalization hay cần server manifest digest riêng. C0 không recompute/verify supplied digest này. `processingRecipeSha256`, `toolSetSha256`, `evidenceSha256` là externally verified authorities; không suy/recompute từ raw native receipts.

## Budget envelope — Proposed pending concrete record/proof freeze

C sẽ đo `Buffer.byteLength(JSON.stringify(actualRecord),'utf8')` ở Node tương ứng với UTF-8 encoding tại runtime contract. StoredDraft/StoredSnapshot đã chứa serialized `contentJson` string; escaping do outer JSON counts. Private response phải đo whole actual response. QA v3 whole `Snapshot + reviewState + review + sourceChecks + mediaRightsChecks`,≤2MiB; legacy QA≤1MiB. Count profile: rights proofs64, source proofs61, source refs600.

Fixture chỉ có synthetic exact262144-byte/cap+1 stored record vectors và quoted Vietnamese/emoji escaping example. Đây không phải valid full Draft/Snapshot schema hoặc proof-record schema. Hash64chars, IDs/timestamps, lineage/sourceRefs/evidence/proof maps và bounded metadata cần đo/reserve actual worst-case serialized sizes, không fixed legacy reserve.

**Dependencies cần Coordinator freeze trước C/I:** exact full storedDraft fields; storedSnapshot fields và lineage; private read response fields/catalog placement; QA Snapshot domain-vs-stored representation; reviewState/review shapes; sourceChecks attestation/evidence fields; mediaRightsChecks binding/UID/revision/event/evidence fields; sourceRef schema; metadata bounds và proof count+record byte maximum. C0 không export permissive full V3 snapshot/proof schema hoặc budget assertion/estimate algorithm.

## Safe diagnostics and idempotency

Codes: `UNKNOWN_ASSET`, `KIND_MISMATCH`, `POSTER_VERSION_MISMATCH`, `PDF_PAGE_OUT_OF_BOUNDS`, `MEDIA_NOT_READY`, `MEDIA_ARCHIVED`, `REFERENCE_LIMIT`, `DERIVATIVE_LIMIT`, `BYTE_LIMIT`, `INVALID_BINDING`.

Paths allowlist: `hero.image`, `seo.ogImage`, `settings.brand.logo`, `settings.credential`, `settings.showreel.assetId`, `settings.showreel.poster`, `settings.contact.illustration`, `settings.clientLogos.0..11.image`, `projects.0..23.cover`, `projects.0..23.gallery.0..11`, `projects.0..23.publicCredentialPage`, `sections.0..6.signature.image`, `sections.0..6.image`, `fixedAssets.0..1`. Numeric indices không leading zeros. Đây là diagnostic DTO riêng; existing `errors.mjs` allowlist chưa hỗ trợ một số paths và được giữ nguyên. Future HTTP adapter cần explicit bounded integration approval.

Đã đọc `M3-IDEMPOTENCY-DECISION-01` trong coordination register: header `Idempotency-Key` M1/M2 giữ transport authority; pure normalized operation key gọi `requestId`, khác asset/version identity. Future mirrored body key phải equal validated header trước effects. Rights bind actor+operation+resource+key và exact validated payload; changed payload422, duplicate part/different bytes409 giữ. C0 không thêm routes/idempotency logic. Clarification không là full contract freeze hoặc release A/B/C/I.

## Historical original-era verification and custody

Evidence private namespace: [C0 evidence](../.local/test-outputs/m3/parallel-v3-01/c0-01a13604-d138-7ea0-b890-1536b0c65582/). Directories0700/files0600, logs mỗi≤64KiB. One pure runner, concurrency1, Node heap256MiB, Node test timeout30000ms/file, wrapper deadline30s/command. Mọi worker commands đã trả exit; pure slot `RELEASED_BY_COORDINATOR`, worker ACK không có in-flight hoặc scheduled follow-up runner do worker quản lý. Whole OS process absence **Unknown** vì parent passive `ps` bị managed sandbox EPERM; không escalation/fallback/kill/cleanup. Closeout chỉ Python/file metadata, không Node rerun. No native/Sharp/Firebase/browser/emulator/build/install/data/Git/global mutations.

| Check | Actual result |
| --- | --- |
| Own runtime route | `gpt-6.1-sol / medium` latest own turn_context Verified |
| Node runtime | v22.23.3; tar archive SHA matches frozen toolchain-evidence; installed binary SHA matches archived member; no extraction/write |
| zod | Installed4.6.5 matches package-lock; full frozen package-byte closure NOT_RUN, không selected archive record |
| RED | exit1 missing C0 module; retained `red.log/red.json`; no environmental failure treated as product RED |
| GREEN1 |12/12 PASS; `green-1.log/json` |
| GREEN2 after cap tests |15/15 PASS,0skip; `green-2.log/json` |
| Syntax | Node `--check` contract+test,2/2 exit0 |
| Focused lint | Node `node_modules/eslint/bin/eslint.js contracts/media-v3-contract.mjs tests/media-v3-contract.test.mjs`, exit0; no fix |
| Preservation | BEFORE/AFTER18 protected regular files compared in evidence; final result recorded by completion receipt |
| Independent exact High source review | `PASS_SOURCE_ONLY_C0`, không Required findings; reused15/15 test evidence, reviewer không rerun |
| A/B/C/I; runtime/eligibility; CMS acceptance | NOT_RUN / pending Coordinator compatibility freeze and scope release |

Pure test command: pinned `.local/cache/node/node-v22.23.3-darwin-arm64/bin/node --max-old-space-size=256 --test --test-concurrency=1 --test-timeout=30000 tests/media-v3-contract.test.mjs`. Commands, UTC actual starts/completions/exits, routing and hashes thuộc evidence JSON. Protected set: hero/site-settings/site-records/site/site-draft/content-version/draft/errors; package/API manifests and root lock; approved-hero/approved-site fixtures; root approval/M2/M3 ledger and M3 scope; frozen coordination snapshot. PDF/IMAGE standalone changes ngoài protected set được giữ; không rebaseline old records.

**Next:** parent bàn giao C0 source review PASS và exact field/digest/envelope decisions cho Coordinator cùng U0/rights. Chỉ Coordinator freeze/release dependent tasks và update shared ledger/index. Historical original-era status `C0_PURE_STRUCTURES_VERIFIED_NOT_INTEGRATED`; current revision `SOURCE_REVISION_WRITTEN_CHECKS_QUEUED`; CMS-M3-06–07/M3 acceptance/LOCAL_COMPLETE chưa đạt.

## Factual closeout — Verified, source review only

[Independent High observation](../.local/test-outputs/m3/parallel-v3-01/c0-01a13604-d138-7ea0-b890-1536b0c65582/independent-high-review-observation.json) SHA256 `ad4f320a604fcdaace9dc54f3688b49ccce331322fa9cdfc2671389767b6c317`; [parent custody observation](../.local/test-outputs/m3/parallel-v3-01/c0-01a13604-d138-7ea0-b890-1536b0c65582/root-candidate-custody-observation.json) SHA256 `a8230e642b626697b046d5a92f25400e55ea55248a55346056ffb4ce5244d732`. Custody receipt ghi review còn in-progress tại thời điểm quan sát; receipt High sau đó ghi verdict cuối. Không sửa receipt cũ.

Reviewer source-only xác nhận strict shapes, output caps, redaction, safe diagnostics, canonical guard và pending interface boundaries. Limit giữ nguyên: full Zod package-byte closure NOT_RUN; effective permission enforcement NOT_PROBED; Python golden generation provenance không được reviewer kiểm độc lập; không runtime/Auth/native/rights/custody claim. Prior reviewer xhigh `NOT_RUN_ROUTE_MISMATCH` giữ lịch sử; exact High reviewer là lần tạo source verdict.

First freeze `owned-manifest.json` và `completion.json` được giữ nguyên. Additive `final-owned-manifest.json` pin final factual doc; `final-completion.json` ghi reused source review/15tests, không rerun và18 protected files comparison. Contract/test/fixture hashes không đổi tại factual closeout era đó; revision hiện tại archived era đó rồi tạo new source hashes. Derivative-set generation inclusion, full record/proof/lineage/envelope shapes và IMAGE full3bucket geometry đã source-aligned; normalization/digest compatibility vẫn pending freeze; A/B/C/I chưa release.

## M3-C0-IMAGE-ALIGNMENT-01 v1 — pre-recheck source revision history

Phần này và Source review closeout kế tiếp ghi trạng thái tại thời điểm **trước recheck**. NOT_RUN/queued bên dưới là lịch sử; current16PASS được ghi trong M3-PURE-POOL-04 recheck sau đó.

**Verified authority:** decision `M3-C0-IMAGE-ALIGNMENT-01` trong coordination register; source-only revision, không compatibility freeze. Worker latest own context turn `01a1361e-fd99-76f1-80af-acbda4a25519` actual `gpt-6.1-sol / medium`; parent currentxhigh riêng, revision independent reviewer exactHigh đã PASS source/golden delta, turn `01a13624-9683-7a33-b850-87b79d5866ec`. One writer/bốn files và private evidence namespace giữ nguyên.

**Correction impact:** previous largest-output/both-edge1920 metadata và effective-width dedup provisional shape mâu thuẫn approved IMAGE width-only recipe. ReadyVersion/immutable IMAGE metadata giờ là oriented originals≤8192edge/40Mpixels. `safeMetadataFromReadyVersion` IMAGE trả oriented originals; consumers phải dùng derivatives để render public image dimensions. Không sửa IMAGE processor/candidate/legacy contracts. Strict3targets giữ mọi bucket kể cả effective geometry/digest bằng nhau; `targetWidth` thuộc immutable projection/manifest/golden vectors. Không routes/Storage/native adapter được thêm.

Raw producer handoff `file,targetWidth,width,height,mime,bytes,sha256` sẽ được future trusted adapter map vào `key,targetWidth,width,height,mimeType,sizeBytes,sha256`. Adapter lấy approved file stem→logicalkey, bổ sung Storage generation/serveridentity/custody sau khi trusted server kiểm. C0 không thực hiện mapping/integration hoặc authenticate receipt. Generation opaque decimal string, không numeric coercion. Proposed derivative ordering role→IMAGE targetWidth numeric→PDF_PAGE pageNumber numeric→key; full normalized3bucket entries, gồm generation, vào proposed derivative-set digest. Digest field inclusion vẫn cần freeze cùng U0/rights.

**Authored expected geometry:** portrait2000×3000→320×480,960×1440,1920×2880; tiny120×80→3keys/targets cùng120×80/cùngSHA. Testsource thêm missingbucket/duplicatetarget/keytargetmismatch/upscale/wrongaspect/invalidtarget/targetWidthonotherroles(includingundefined)/8192edge/40Mp cases. Aggregate byte cap trừ cả2otherbucket sizes. Valid256derivatives gồm5PDF48page(245entries)+3IMAGE3buckets(9entries)+1PDF1page(2entries); thêmpage2 vào lastPDF→257, vẫn validperversion shape.

**Checks:** testsource viết trước contract correction; RED execution queued, không gọi failing test verified. `TESTS_NOT_RUN_FOR_REVISION`; Node moduleeval/test/syntax/lint/build và alternate-language C0test execution NOT_RUN vì pure slot RELEASED. Python stdlib chỉ archive/hash metadata và author expected fixture data độc lập, không invoke C0. Historical15pass/HighPASS/source receipts được giữ nguyên, không dùng làm revisionPASS. High source/golden delta review đã PASS, không execution claim.

**Evidence:** additive [image-alignment-01](../.local/test-outputs/m3/parallel-v3-01/c0-01a13604-d138-7ea0-b890-1536b0c65582/image-alignment-01/) giữ `source-before/` bốn files era reviewed, `before.json`, `source-revision-manifest.json`, `source-freeze.json`. Directories0700/files0600, không sửa old logs/receipts. New source SHA256:

- `contracts/media-v3-contract.mjs`: `37aa05c9f5f66ce8d3940964e05a289a44a733f255f2313cd098a4a14d03d00d`
- `tests/media-v3-contract.test.mjs`: `4863cb881f27043b842c61f305142511df4a7c570c913fcd2896e17c1f68e895`
- `tests/fixtures/media-v3-contract.json`: `d4219f98d6f9cb8ea95333a01431dbaef05cebbe499cdf749bf180679acb1049`

New authored data mediaManifestHash `5b2176ec3bb93479c13d9ff1cc5a9b67baea44c5a10c9d62b3697a21f0e18e7a`, contentHash `6db75a76de63f931e91cb70afa19739a0f54748c09395a3256cb7ff7ef6497e2`; đây là oracle data, C0 execution chưa xác minh.

**Next — REQUEST_PURE_RECHECK_SLOT:** parent/Coordinator cấp admission mới trước Node recheck. Exact High delta review PASS; full C0/U0/rights/recordproof compatibility freeze pending. A/B/C/I không release; CMS/M3 acceptance/LOCAL_COMPLETE chưa đạt.

## Pre-recheck history — SOURCE_REVIEWED_CHECKS_QUEUED

[Independent High delta observation](../.local/test-outputs/m3/parallel-v3-01/c0-01a13604-d138-7ea0-b890-1536b0c65582/image-alignment-01/independent-high-delta-review-observation.json) SHA256 `09c133d8b94c48c1a25936a7dee1bb8e5f40a5671af956570e7f6b587949f067`: actual reviewer turn `01a13624-9683-7a33-b850-87b79d5866ec`, `PASS_SOURCE_GOLDEN_DELTA_ONLY`, không Required findings. Review chỉ source/golden-data inspection; revision tests, Node module evaluation, syntax/lint và golden hash-bytes execution **NOT_RUN**. Historical15pass/HighPASS chỉ original era.

Code/test/fixture pins unchanged từ source revision; doc-only factual update sau review. Additive `final-source-review-manifest.json` và `source-review-closeout.json` pin finaldoc/unchanged3sources,20protected/source comparison và reused review receipt; old archives/freezes/logs/receipts giữ nguyên. Pure slot RELEASED, no worker-managed in-flight/scheduled follow-up runner; whole OS process absence vẫn Unknown do parent psEPERM. Không kill/cleanup hoặc checks.

**Next — REQUEST_PURE_RECHECK_SLOT:** Coordinator admission cần trước revision runtime/pure/static checks. Generation+targetWidth derivative-set binding và fullrecord/proofs/lineage/envelope freeze do Coordinator quyết định. A/B/C/I chưa release; LOCAL_COMPLETE false.

## M3-PURE-POOL-04 recheck — Verified pure/static only

Coordinator admission `M3-PURE-POOL-04 v1`, `HUMAN_DELEGATED_COORDINATOR_APPROVAL`, observed2026-10-13T17:24:15Z; register predispatchSHA `ad7459c80538912f4b975c88fd851f84173f53f8a63ab7f92aa20044925ecbf9`. Worker observed latestownturn `01a1364d-af7e-7e53-b686-1e210f202001`, actualgpt-6.1-sol/medium. Recheckauthorizes one revised focused suite and ownedstaticchecks sequential; authored suite actually16tests, no filters/deletions to fabricate15.

PinnedNode22.23.3 SHA `68f4d07ca49e0500cc135c7e0a445093e228e42e126ac22306d045f0a8c2636b`; zod4.6.5 installed/version/lock/package metadata hash unchanged, full package-byte closure stillNOT_RUN. Commands heap256MiB, concurrency1, deadline30s, mergedlogcap64KiB; Popen ownPID/start/wait/reap evidence. [Recheck evidence](../.local/test-outputs/m3/parallel-v3-01/c0-01a13604-d138-7ea0-b890-1536b0c65582/image-alignment-01/recheck-01/):

- `tests`: PID38647 exit0,16pass/0fail/0skip, actual145.2475ms reported duration; revised canonical/golden hash/bytes assertions executed.
- `node --check`: contractPID38652 and testPID38653,2/2exit0.
- focused ESLint nofix: PID38654exit0.
- private golden projection using builtins/currentC0canonical encoder: PID38655exit0, no B source/adapter added.

Allcommands returned/reaped; slot returned immediately to parent before factualdoccloseout. No ownedinflight/scheduledfollowuprunner. WholeOSabsence remainsUnknown_psEPERM; no workaround/escalation/kill/cleanup. Archivedera/oldreceipts/testlogs unchanged. Sourcecode/test/fixture remain reviewed pins, no repair.

Protected18 match historical baseline. Peer IMAGE FINALIZE source delta attributed separately: oldsourcepin in alignmentbefore retained; current `cms-api/media-images.mjs` SHA `24254aac46a7985b86842d5d9ce23f6085fa7a2de6af1ab8e01a0db4a05bb89d`; runtimeSHA `15a77787f5c663791ad260df18a5613a33a5135c9175aa3d25ec9d91655c6f8d`. Current source unchanged during recheck, recipe retains3widths and withoutEnlargement. C0 imports neither IMAGE module. Parent received exactHigh reuse verdict `REVIEW_REUSED_GEOMETRY_ALIGNMENT`, turn `01a1364d-dbce-7703-9fff-cc6cc6855eec`, Required[]; candidategeometry/keytarget and width-onlyrecipe remain valid. This reuse does not review IMAGEfinalization correctness or run reviewer tests/static/native. Parent supplies additive observation separately.

**Proposed normalized derivative golden:** [golden-derivative-projection.json](../.local/test-outputs/m3/parallel-v3-01/c0-01a13604-d138-7ea0-b890-1536b0c65582/image-alignment-01/recheck-01/golden-derivative-projection.json) contains exactcanonical bytes/entries. Select all `key,role,mimeType,sizeBytes,sha256,generation,targetWidth,width,height,durationSeconds,pageNumber` whenpresent, retain whole3bucket processedset. Order roleASCII→IMAGEtargetWidthnumeric→PDF_PAGEpageNumbernumeric→keyASCII; canonicalobjectkeys viaC0; SHA256UTF8lowerhex. These are syntheticgeneration fixtures; futuregeneration comes trustedStorage/server and is never Numbercoerced. Observed vector sizes/hashes:

- `image`: 696 UTF8bytes; SHA256 `aea0028233526f8ddeb9358c9aafee5a61aeec075bf8fdec2c2182bbf408ac82`.
- `tinyImage`: 693 UTF8bytes; SHA256 `aaa3c53b4e177a5edac2d9fb3e514a5f215b8958b1c0be34d834a6282f3f9a44`.
- `portraitImage`: 699 UTF8bytes; SHA256 `e71e70f49d4dbba136b8ea8bf5110884314348a2d3c707ef43a950c9bb5c3544`.

**Proposed strict7binding/UID authority:** [binding-authority-proposal.json](../.local/test-outputs/m3/parallel-v3-01/c0-01a13604-d138-7ea0-b890-1536b0c65582/image-alignment-01/recheck-01/binding-authority-proposal.json): exactly `assetId,kind,originalSha256,derivativeSetSha256,processingRecipeSha256,toolSetSha256,evidenceSha256`; rejectunknownkeys. Serverpinned immutable assetidentity and externallyverified immutable digestauthorities; uploader/evidencesubmitter/currentreviewer UID belong separatetrustedcontext, never clientattested or bindingfields. Rights nonself/currentpermission/proof validation remains rightscontract. Digestcomputation/structuralREADY is not ownership/authproof. Fixture derivativeSetSha256 fields remain synthetic supplied digests; computed goldens are separate proposedprojectiondata, not automatic replacement.

**Current result:** `C0_GEOMETRY_PURE_RECHECK_PASS_NOT_INTEGRATED`. Original15pass stays historical; revised16pass nowverified. Generation+targetWidthbinding and fullrecord/proof/lineage/envelope freeze remainCoordinator. A/B/C/I HOLD; no native/Auth/rights/serverintegration/CMSacceptance/LOCAL_COMPLETE claim.

### Final factual doc clarification

Current stage là completed16/16pure recheck, không revisionchecks pending. Pre-recheck NOT_RUN/original15PASS records giữ lịch sử. `operationKey` trong private binding-authority proposal chỉ contextual **Proposed**, không C0 freeze requirement hoặc U0 transport/domainauthority mở rộng. Freeze request C0 chỉ strict7binding/UIDauthority/trustedgeneration/normalizedwholederivativeprojection; Coordinator quyết định fullrecord/proof envelope riêng. Doc-only correction, không Node/check/rerun.

### Coordinator bounded core/projection ACK — current authority

Đã đọc [coordination register](../../approvals/M3-PARALLEL-COORDINATION-01-REGISTER.json) decisions `M3-PURE-RIGHTS-BINDING-01 v1` và `M3-DERIVATIVE-PROJECTION-01 v1`, authority `HUMAN_DELEGATED_COORDINATOR_APPROVAL`; không giả directhuman Approved riêng. Bounded pure structural/projection freeze đã recorded: normative strict7fields `assetId,kind,originalSha256,derivativeSetSha256,processingRecipeSha256,toolSetSha256,evidenceSha256`, assetIdASCII1..100 và trustedUIDASCII1..128 theo existingresourceIdSchema khớp currentC0. UIDactor/uploader/evidencesubmitter ở separatetrustedcontext; structural/digest equality không tự chứng minh quyền/custody.

Normalized wholeprocessedset projection select đúng presentfields `key,role,mimeType,sizeBytes,sha256,generation,width?,height?,durationSeconds?,pageNumber?,targetWidth?`; không selectedsubset/dedup, giữ3IMAGElogicalbuckets. Sort roleASCII→IMAGEtargetWidthnumeric hoặc PDF_PAGEpageNumbernumeric→keyASCII; generationtrustedStorage exactdecimalstring, không Numberconversion. Derivative-setdigest normative SHA256UTF8 existingcanonicalJson(orderednormalizedentries). Separate newer decision approve synthetic exactgoldens: image696bytes/SHA `aea0028233526f8ddeb9358c9aafee5a61aeec075bf8fdec2c2182bbf408ac82`; tinyImage693bytes/SHA `aaa3c53b4e177a5edac2d9fb3e514a5f215b8958b1c0be34d834a6282f3f9a44`; portraitImage699bytes/SHA `e71e70f49d4dbba136b8ea8bf5110884314348a2d3c707ef43a950c9bb5c3544`. ArtifactSHA `b23c16b8de3b0547352e464915b5020304d2020aa167f1db2cf1ad5c3b77f000`; originalartifact PROPOSED label/history giữ nguyên, newerdecision chỉ cấp normativespec/syntheticgoldenapproval.

**Current summary:** bounded pure core/projection freeze recorded; fullproducer/tool/recipe/evidence/Storage/runtimeadapter/recordproof/lineage/envelope/budget/composition freeze vẫn incomplete. Không actualproducer normalization/READY/rights/runtime acceptance. C0 A/B/C/I HOLD; không Nodechecks mới cho đến pooladmission. Doc-only ACK, source/test/fixture và earlierreceipts không đổi.

## C0-META-01 v1 — source-only slice STOPPED

Coordinator authority `M3-C0-COMMON18-SOURCE-01 v1`, `HUMAN_DELEGATED_COORDINATOR_APPROVAL`; dispatch chỉ META. Đã đọc v1 Highhandoff/mandatoryactors clarification, frozen metadata normative và own taskdoc. Actual ownroute `gpt-6.1-sol / medium`, turn `01a1378a-2f89-7003-afe7-963c6640aa53`; rollout `01a13604-d138-7ea0-b890-1536b0c65582`.

Exact new3files frozen:

- `contracts/media-v3-metadata.mjs`: 5167bytes; SHA256 `b03b246ad3c79d9dc919685a4a89a72205ce147b8ad20139014b351b47b01a9c`; initialexclusive write1.
- `tests/media-v3-metadata.test.mjs`: 9422bytes; SHA256 `6754ff6947ba379f4db86d2e3ea4291bf3407b34f2312377d10a22ba0dcbfa79`; initialexclusive write1.
- `tests/fixtures/media-v3-metadata.json`: 987bytes; SHA256 `56f8d680d65f9695946d43e25fdc0098b76355ce21392580d84b27233ea53a0d`; initialexclusive write1.

Exports: `strictMediaV3JsonSchema`, `mediaMetadataSchema`, `uploadActorsSchema`, `rightsReferenceAllowlistSchema`, `parseMediaMetadata`, `metadataDigestProjection`, `evidenceDigestProjection`, `hashMediaMetadata`. Strict descriptor-safe plainJSONguard (wellformedstrings/depth64), metadataUTF16/plaintext/ref bounds, UID actors outside metadata, sortedunique allowlist, MDfullmetadata and EVexactrights+submitter/wholeactual4096 projection. No provenance mint; serverowner must verify allowlist origin before context. Missing/corruptcontext fails closed evenemptyrefs; no trustflag/privateconfig/loader. InjectedhashCanonical is existing canonicalJSON UTF8 SHA256 capability, not clientalgorithm; resultlowerhex64 checked.

Imports only `zod`, existing errors/scalars/site-settings plaintext. No budget/records/cms-api/private/.local production import, no newdependency/file19. API contexts remain structural parseddata; module does not authenticate actor/READY/tool/native/evidence legality.

Behavioral test SOURCE authored 12 cases: immutableMD/EVgoldens, exactUnicode/whitespace/newline, submitter/uploader effects, actor equality/separation, declarationrefsorder, missing/corruptallowlist, unknownauthorityfields, UTF16/control/ref caps, descriptorgetters/symbols/nullproto/classes/sparse/cycles, EVcombinedmax refusal+actualcap/cap+1, hashcallback failures. Fixture copied selected immutable reviewedgolden metadata/actors/MD/EV, no runtime privateartifact dependency.

Read-only pre/post stat/SHA comparison 38 explicit protectedinput records equal: core/isolatedsource+9datasets, golden3, package manifests/lock, M1M2 approvals and selected engineeringlocks/vendorREADME/LICENSE. This is bounded filepreservation, not wholeDB/vendor/native audit. Initial3owned and other15common destinations absent; other15 remain absent. Fixture JSONparsed withduplicate-key refusal. Commands completed under60s; no source/module execution or Node/syntax/lint/tests/build.

Source retained 15576bytes,3writes/cumulative same; withinperfile262144/524288/4194304,retained4980736,cumulative19922944,max4writes/file. Datareceipts private [c0-meta-01](../.local/test-outputs/m3/parallel-v3-01/common18-source-01/c0-meta-01/) directories0700/files0600.

**Verification:** SOURCE_WRITTEN/fixtureJSON+statSHA preservation Verified; tests/staticexecution **NOT_RUN**, affected exactHigh review pending. **STOPPED** at META3freeze; no nextslice/runner dispatch. Parent coordinates High review and separate future pure admission. A/B/C/I/U1integrationV1/producer/runtime/LOCAL_COMPLETE unchangedHOLD.

## C0-TOOLS-01 v1 — source-only slice STOPPED

Approved `M3-C0-COMMON18-SOURCE-01 v1`; META preceding exactHigh `SOURCE_ONLY_REQUIRED_0`, Required[], turn `01a1378d-7701-7a22-a127-148b2a410d90`. TOOLS fieldbounds clarified actualHigh `01a13790-7a7e-7aa1-b2e6-294859086d0c`: FileRef/Pin.path1..1024ASCIIrelativePOSIX/no leadingtrailing slash/empty-dot-dotdot/backslash/colon/control; fixedrootsCMS/PDF_R0/BUNDLE_R0/HEADERS_R0, bytesnonnegative safeint, lowerhex64. No new generic string/count caps. Freshworker routeactualMedium turn `01a13791-56e8-7943-899a-9eebc3646be8`, rollout `01a13604-d138-7ea0-b890-1536b0c65582`.

Exactnew3files frozen:

- `contracts/media-v3-toolset.mjs`: 27631bytes, SHA256 `85d9c11b3d29ea2f88879ca59117ff775844647719d56f55b407a3c613839e3c`, sourcewrites2.
- `tests/media-v3-toolset.test.mjs`: 9495bytes, SHA256 `c289c034f1f8be6408a6b4de1f0043bbea3d1268d49cc298a27c269a3a5a5244`, sourcewrites1.
- `tests/fixtures/media-v3-toolset.json`: 1542862bytes, SHA256 `6ec4a0fc4dc691965d0e5ca8b9d31235fc9778c176ba9be8e4555103a9509725`, sourcewrites1.

Exports: `fileRefSchema`, `filePinSchema`, `r0ToolSetManifestSchema`, `toolSetDigestProjection`, `validateToolSetManifest`, `processingRecipeSchema`, `processingRecipeDigestProjection`, `validateProcessingRecipe`. Fixed source-owned R0profile identity validates strict schema/fieldtypes, frozen normalized count1723package/61aux/11roots/2native, sortedunique FilePin sets, cross-subset equality and orderedargv/binaryOrder, then injectedcanonicalSHAclosedexpected identity. Body hashes remain structural static evidence, not actualnative/loader proof. Toolset processing recipe schema owns IMAGE/PDF strictliterals and VIDEOoriginalmetadata/geometry/audio/orderedarg relations; outer source/helper/tool pins fixed. PDFrawtools remains ordered{path,type,bytes,sha256}; ToolSetbinaryOrder FileRefs separate. No rawrecipeSHA rewrite/alias.

Recipecontext originalMetadata typed IMAGE{width,height} orientedinput<=8192/40Mp; PDF{pageCount}1..48; VIDEO{width,height,duration,fps,audio} withinfrozeninputcaps. VIDEOwidth/height evenrounding/noupscale andfps=min(source,30) reproduceownerformula, A/B/C fixturecases are expectations not hardcodedbusinessbranches. Returnparseddata; no productionfile I/O/loader/rootselector/R1placeholder/privateconfig/authoritymint.

Imports only existing `zod`, reviewedMETA `strictMediaV3JsonSchema`, existingC0 `canonicalMediaV3Json`; no reverse/records/budget/.local/cms-api imports. Fixturecontains three normalizedToolSets rebuilt as AUTHORINGdata from exactfrozenJSON/logmetadata, Policy2identicalduplicates1736→1723, copied independentlyaccepted expectedhashes, and IMAGE/PDF/VIDEOA/B/Crecipe subsets. Notwhole4Mgoldencopy, notruntimeprivateartifact dependency, no newhashoracle/productevaluation. FixedR0values are normative immutabletechnicalscope, not genericfixtureexample businessrules.

BehavioraltestSOURCE authored14cases: threeclosedR0hashes/bytes, FileRefboundaries/roots, zero/safe bytepins, duplicate/order/count refusalbeforehash, commonNative/packageRoot equality, kind/profile/contextflags, orderedPDFbinaryrefs, linkage/font/mode/pinrelations, VIDEOargv/config, recipe/rawcanonical distinction, source/helper/toolmismatch, originalVIDEOgeometry/audioA/B/C/edge refusals, descriptors/getters/nullproto/cycles/hashcapfailures. **Tests execution NOT_RUN**. No Node/syntax/lint/moduleeval/build.

Read-onlycheck: fixtureJSONparse withduplicate-key refusal, exact3stat/SHA/caps and 41protectedinputrecords equal includingMETAexact3 and oldgolden3/core/M1M2/packages/selectedvendorlocks. Remaining12sourcepaths absent. This is scopedpreservation, notwholeDB/vendor/nativeaudit. Commandsunder60s; sourcewritecounts4total (module2/test1/fixture1), retained1579988bytes/cumulative1604639bytes withincaps; perfile<=4writes. PrivateDATAreceipts [c0-tools-01](../.local/test-outputs/m3/parallel-v3-01/common18-source-01/c0-tools-01/)0700/0600.

**STOPPED:** TOOLS sourcefreeze, affectedexactHigh reviewpending; no nextslice/runner dispatch. ExistingMETAHigh reusedvalid, no rerun/review imposed. Fullcommon/applicationbehavior tests/CodeAcceptance/producer/READY/native remainsUnknown/NOT_RUN. A/B/C/I/U1integrationV1 unchangedHOLD.


### C0-CONTENT-01 v1 — source-only freeze

Approved `M3-C0-COMMON18-SOURCE-01 v1`, `HUMAN_DELEGATED_COORDINATOR_APPROVAL`; dispatch chỉ CONTENT sau TOOLS actualHigh `SOURCE_ONLY_REQUIRED_0`/Required[], turn `01a13796-a63a-7c52-afb2-b571f95d8f0c`. Worker observed actual `gpt-6.1-sol / medium`, turn `01a1379b-5dcb-7e92-9eef-afe135a70230`, session `01a13604-d138-7ea0-b890-1536b0c65582`. Routine contentContext clarification actualHigh turn `01a1379b-776c-76d2-af49-4b242512d94f`: ONE required `sourceCatalog`, strict baseline factual catalog, explicit currentYear, optional exact allowedShowreelSourceUrl. No sourceIds input alias/trust flag.

Exports `createMediaV3ContentSchemas(contentContext)->{contentSchema}`, `parseMediaV3Content(input,contentContext)`, `projectClaimGroupsV3(parsedContent)`. Imports zod/errors, hero scalar IDs/hashes, site-settings primitives, META strict JSON guard and existing C0 image/POSTER refs. The local V3 counterpart retains baseline copy, counts, UTF16 rules, sections/actions/identity relations, factual/creative claim taxonomy and hidden facts. Descriptor is schemaVersion3; media refs remain structural with no source discriminator. Hero multiline heading and section single-line heading remain distinct. Catalog provenance, source evidence, media kind/readiness/eligibility, selected manifests and traversal diagnostics are outside this module; no V2 casting or higher record import. Raw LEGACY sourceRefs, Rights allowlist and factual sourceCatalog stay separate.

Test SOURCE AUTHORED: 17 cases, five immutable golden content/catalog/expected claimHash subsets; independent canonical/hash oracle is test source only. Includes context refusal, strict descriptors/Unicode/UTF16, POSTER/legacy shapes, SEO decoration, business relations, hidden projections and factual/creative mutations. No product module evaluation, Node/tests/syntax/lint/build or arbitrary golden regeneration ran. All execution checks **NOT_RUN**; independent affected High review pending.

- `contracts/media-v3-content.mjs`: 18073B, SHA256 `8828ebdd34245007561da9e670947c22598d12239f7431b99f04fd9cfb98e671`, writes 2.
- `tests/media-v3-content.test.mjs`: 10537B, SHA256 `eb0b0ee3160ef5b1e82ae779f34e9a3071eabe77093a5679dac71dff5bb333c1`, writes 1.
- `tests/fixtures/media-v3-content.json`: 169426B, SHA256 `7074842d92a314bedbf97c4991f97b19a1a4a3972b73c3d36e8bb1cfe1875038`, writes 1.

Read-only checks: exact3 lstat/SHA/size, fixture JSON duplicate-key refusal PASS; 44 protected inputs unchanged PASS. Retained source 198036B; four source writes cumulative 215888B, max2/file, within approved caps. Evidence [source-freeze.json](../.local/test-outputs/m3/parallel-v3-01/common18-source-01/c0-content-01/source-freeze.json) and [manifest.json](../.local/test-outputs/m3/parallel-v3-01/common18-source-01/c0-content-01/manifest.json). No in-flight/scheduled runner. Worker STOPPED after source freeze, awaiting parent affected High0; ATTEST not dispatched. A/B/C/I/U1 integration/V1 HOLD.


### C0-ATTEST-01 v1 — source-only freeze

Approved `M3-C0-COMMON18-SOURCE-01 v1`, `HUMAN_DELEGATED_COORDINATOR_APPROVAL`; dispatch only ATTEST after CONTENT actualHigh `SOURCE_ONLY_REQUIRED_0`/Required[], turn `01a1379b-776c-76d2-af49-4b242512d94f`. Worker actual `gpt-6.1-sol / medium`, turn `01a137a2-047c-7af1-ada4-251ceb1b7034`, session `01a13604-d138-7ea0-b890-1536b0c65582`. Routine public context/view clarification actualHigh turn `01a137a2-2147-7991-8e6e-80d53a8f5a04` (native2037); no new domain/authority.

Exports strict schemas `sourceCheckV3Schema`, `reviewStateV3Schema`, `reviewV3Schema`; functions `validateSourceCheckV3`, `selectSourceChecksV3`, `validateSourceAttestationsV3`, `attestationDigestProjection`. Exact claimContext keys: `snapshot:{id,contentHash,schemaVersion:3,templateVersion:m3-site-media-v1,submittedBy,submittedAt}`, `currentClaimGroups`, `baselineClaimGroups`, `claimSources`, `sourceCatalog`, `hashCanonical`. Groups are exact `{claimPath,value}` DATA produced by CONTENT; module derives classification/change/required and claims hash internally. Context owner must verify origin and complete projection; no trust flag or provenance mint. Descriptors are checked before hash capability extraction. Baseline factual comparison is separate from CURRENTM2 import identity. Module imports zod/errors, hero scalars, draft canonical primitive, site-settings scalar primitives, META JSON guard. Test source uses reviewed CONTENT parser/projection; no higher record or private implementation import.

Explicit options `{proofView:ALL|APPROVED}`, no aliases/defaults. Public selection returns validated view records sorted ASCII claimPath/id: ALL exact active∪pinned, APPROVED exact approved terminal pins. Terminal digest uses separate internal required-active selection (changed/new facts; creative-copy only when SOURCE_CHECKED); sourceCheckIds ASCII-sorted exact pins, full selected record projection claimPath/id sorted. Never hash the private union as terminal digest; never reorder evidence arrays. Retains actor/submission/time/sourceRevision/reviewrev0/1 rules, IN_REVIEW null-review state, terminal pairing, catalog-supported source/binding/SHA/pages, and intrinsic 8192B proof cap. Hashes and SOURCE_CHECKED shape are structural, not evidence authentication. Raw LEGACY refs and Rights allowlist remain separate from factual catalog. Whole record/envelope budget ownership remains C.

17 cases test SOURCE AUTHORED, including five immutable terminal golden sets/claim/set digests, ALL extra active vs QA pins, in-review revision0/active states, changes requested empty pins, self-check/reviewer/time refusal, context descriptors, source/catalog/page bindings, exact sets, creative attestation and complete projection. Fixture is an immutable golden subset plus baseline copy; no runtime .local dependency or new golden oracle execution. Source/test/module/Node/syntax/lint/build execution **NOT_RUN**. Affected independent source High review pending.

- `contracts/media-v3-attestations.mjs`: 13220B, SHA256 `e24cbb33df598beaf127d0edd57e481755ddbffc942b619861f6c9a860bd30e9`, writes1.
- `tests/media-v3-attestations.test.mjs`: 14265B, SHA256 `3fa65dda4cee097155cce2cd7bd2b610f146b1fa582e20f75876dbc49fc58507`, writes1.
- `tests/fixtures/media-v3-attestations.json`: 207256B, SHA256 `e2b1ddbe70afa10570b5cb38cf2465b27d2af9e76dce21ae356c0f02367a18c0`, writes1.

Read-only exact3 stat/SHA/size and fixture duplicate-key-refusing JSON PASS; 47 protected inputs unchanged PASS. Source retained/cumulative 234741B; three writes, one/file, approved caps preserved. Evidence [manifest.json](../.local/test-outputs/m3/parallel-v3-01/common18-source-01/c0-attest-01/manifest.json) and [source-freeze.json](../.local/test-outputs/m3/parallel-v3-01/common18-source-01/c0-attest-01/source-freeze.json). No in-flight/scheduled runner; worker STOPPED after freeze awaiting affected High0. AUTHORITY not dispatched. A/B/C/I/U1 integration/V1 HOLD.


### C0-AUTHORITY-01 v1 — source-only freeze

Approved `M3-C0-COMMON18-SOURCE-01 v1`, `HUMAN_DELEGATED_COORDINATOR_APPROVAL`; dispatch only AUTHORITY after ATTEST exactHigh `SOURCE_ONLY_REQUIRED_0`/Required[], turn `01a137a6-f837-7251-837b-6fa1fab17ef6`. Worker actual `gpt-6.1-sol / medium`, turn `01a137a9-da9d-7552-8429-223f9114a9f4`, session `01a13604-d138-7ea0-b890-1536b0c65582`. Routine context/error clarification actualHigh `01a137ab-d39f-7962-9aaf-26175e0e2655`/native2175 and existing relation confirmation `01a137ae-78fd-7de1-b95d-add3bbb91aeb`/native2225. No new business/adapter/authority.

Nine public schemas: `attemptTupleSchema`, `frozenInputSchema`, `storageFactSchema`, `cacheFactSchema`, `quiescenceFactSchema`, `readyFactSchema`, `mediaRightsProofV3Schema`, `authorityEnvelopeSchema`, `readyDetailSchema`. Functions `validateAuthorityEnvelope`, `validateTerminalRightsProofV3`, `validateReadyDetail` return parsed structural data. Envelope exact `{readyVersion,actors,metadata,readyFact}`; no caller Auth/READY flag. Imports metadata public guard/actors/MD-EV helpers, ToolSet public schemas/validators, existing C0 ReadyVersion/7binding/projections/limits, public Rights validator, existing zod/error/scalar/canonical helpers. No private U0/J1/native/records imports or side effects.

Authority options exact `{expectedUpload,expectedJob,profileId,hashCanonical}`. `expectedUpload` exact `{intent,referenceAllowlist}` retains FULL typed persisted U0 intent and owner-verified retained CREATE declaration reference identities. It does not load current config or create append-only policy. `expectedJob` exact `{record,toolSetManifest,processingRecipe,originalMetadata}` retains FULL typed J1 READY record, including queue fingerprint and attempt2 retry request/hash/revision/history/quiescence/tuple. Descriptors/exact keys checked before reading hash capability. U0 intent part indices/layout/full QUEUED count/TTL86400000ms/per-kind bytes stay unchanged, without array-order requirement or originalSHA computation from part digests. Original input identity/bytes/hash/recipe/tool/EV match independently supplied frozen Job input, ReadyVersion and 7binding. Original byte concatenation/Storage/native proof remains Unknown.

READY fact tuple/binding/MD/storage-cache manifest receipt/quiescence equality is exact. Normalized derivative digest projects all present normalized fields key/role/mimeType/sizeBytes/sha256/generation/targetWidth/width/height/durationSeconds/pageNumber, full processed set; role ASCII then IMAGE targetWidth/PDF_PAGE pageNumber numeric then key ASCII. Generation remains opaque decimal string. Tiny full3 IMAGE outputs remain distinct logical rows. TOOLS owns fixed R0 static identity and processing recipe validation; raw native recipe hashes are not canonical wrapper hashes. IMAGE oriented original dimensions and PDF pageCount match originalMetadata. VIDEO output derivative dimensions/duration match ReadyVersion via existing C0; TOOLS originalMetadata binds exact recipe geometry/fps/audio. No outputDuration===originalMetadata.duration rule or producer tolerance proof is added.

Terminal Rights context exact `{binding,actors,originalCheckerUid,hashCanonical}`; original checker independent from input/current actor. Direct invalid proof retains public Rights `VALIDATION_ERROR`; corrupt context/stored records/cross-relations return `INTERNAL_ERROR`. `validateReadyDetail` options exact `{authorityEnvelope,rightsState,hashCanonical}` consume previously validated envelope DATA and independently trusted persisted strict `{status,revision,proof}`: PENDING0/null, APPROVED1/full proof, REJECTED1/full proof. Detail full proof must exactly equal original stored context proof; checker comes from context proof, never detail/current actor. It cannot re-establish upstream U0/J1/tool/native provenance. Public Rights validator keeps its existing validation behavior; new actual whole detail/proof8192B checks are deferred to C composition, EV4096 guard reused. No truncation/reserve/maxima-fit claim.

18 behavioral test cases SOURCE AUTHORED: five immutable full chains, nine shapes, descriptors/hash guard, contexts/allowlist, persisted metadata/actors, U0 multipart layout, J1 queue/attempt2 retry, ReadyFact mutations, normalized generations/full derivatives, ToolSet/recipe refusal, original Rights checker/errors/self-check, three detail states, exact original proof and unsafe JSON. Fixture reuses frozen5 full authority/proof/detail subsets and reviewed ToolSet/recipe expected inputs, with no runtime .local dependency. Tests/Node/syntax/lint/build/module evaluation **NOT_RUN**. Affected independent source review pending; structural source does not establish actual READY/Auth/Storage/native capability.

- `contracts/media-v3-authority.mjs`: 17630B, SHA256 `579eb978e5dc76bf93234e259cb84c08ebb3137bde4e63cd64062e3bc22cf59d`, writes2.
- `tests/media-v3-authority.test.mjs`: 15273B, SHA256 `57987a29185432ee95a88430a7ae712f7ef1054a68da2fb33e062b8c1ef87b45`, writes1.
- `tests/fixtures/media-v3-authority.json`: 1647837B, SHA256 `a26ae361c8ece635722d15bf275b5ca5a1a511f4df748745470292477ea5e808`, writes1.

Read-only exact3 lstat/SHA/size and fixture duplicate-key-refusing JSON PASS; 50 protected inputs unchanged PASS. Retained 1680740B, cumulative source writes 1698132B across four writes (max2/file), approved caps preserved. Evidence [manifest.json](../.local/test-outputs/m3/parallel-v3-01/common18-source-01/c0-authority-01/manifest.json) and [source-freeze.json](../.local/test-outputs/m3/parallel-v3-01/common18-source-01/c0-authority-01/source-freeze.json). Worker STOPPED; no runner in-flight/scheduled. RECORDS not dispatched. A/B/C/I/U1 integration/V1 HOLD.


### C0-RECORDS-01 v1 — source-only freeze, final common slice

Approved `M3-C0-COMMON18-SOURCE-01 v1`, `HUMAN_DELEGATED_COORDINATOR_APPROVAL`; dispatch only RECORDS after AUTHORITY exactHigh `SOURCE_ONLY_REQUIRED_0`/Required[], turn `01a137b0-af78-7403-9745-970d6532cca5`. Worker observed actual `gpt-6.1-sol / medium` before initial authoring turn `01a137b2-8e18-7210-9971-49247bd4c5e3` and before resume turn `01a137b8-0c86-7a90-b715-074edc92bd71`, same session `01a13604-d138-7ea0-b890-1536b0c65582`. Concrete context/DTO/serialization clarification actualHigh turn `01a137b3-c9eb-7c02-97f2-3690145531d9`/native2327.

Temporary affected sorting/hash HOLD retained partial fixture/before receipt without overwrites or generation. High turn `01a137b6-de64-7c83-9d6b-110427596c25`/native2388 refuted the reported mismatch: oracle281 sorts then282–283 assigns generations/projects before284 hash; actual frozen G_VIDEO rows POSTER→VIDEO,432canonicalB/SHA `4bd44d732d2713543d55ec48b6e1f4796518982bdb305f67d378a604fe3643f5`. Original goldens/oracle/High receipts stayed unchanged. Routine resume under SAME approval; no binding freeze invalidation or artifact regeneration. READY raw arrays get no new sort gate; selected manifest retains declared role→IMAGEtarget/PDFpage→key order.

Public schemas `v3ImportLineageSchema`, `mediaRightsProofPinSchema`, `safeCatalogV3Schema`; factory exact names `{domainDraftSchema,storedDraftSchema,snapshotSchema,storedSnapshotSchema,draftReadSchema,snapshotReadSchema,qaSchema}`. Functions `validateDraftV3`, `validateSnapshotV3`, `validateDraftReadV3`, `validateSnapshotReadV3`, `validateQaV3`, four stored encode/decode counterparts, `contentDigestProjection`, `rightsPinsDigestProjection`. Imports reviewed CONTENT/ATTEST/AUTHORITY/META public contracts, existing C0 manifest/binding and lower zod/error/scalar/canonical helpers; no private, protected builder, reverse record/budget or provider import.

BASE context exact `{contentContext,expectedImport,hashCanonical}`. expectedImport is independent owner-derived complete strict V3ImportLineage from CURRENT M2, including untouched strict nested M1 history; common only parses/compares all fields, without loading/transforming M2 or deriving importer identity. Its sourceRefsHash is NOT compared with new selected V3 Snapshot refs. Snapshot contexts add `{selectedAssetIds,orderedManifest,expectedSourceRefs,originalTerminalProofs}`; selection/ref/manifest inputs come independently from A/B/I. Terminal entries ONE exact `{proof,context:{binding,actors,originalCheckerUid}}`, max64 unique asset/proof IDs, original APPROVED proof and binding match selected MEDIA_VERSION pins. No proof/context derived solely from record input or current actor. Legacy entries receive no minted Rights proof.

DraftRead adds `{expectedSafeCatalog,expectedSourceCatalog}`. SnapshotRead adds `{expectedSourceCatalog,sourceAttestations:{sourceChecks,claimContext}}`, fixed ALL active∪pinned; QA adds `{sourceAttestations:{sourceChecks,claimContext}}`, fixed APPROVED frozen pins. claimContext uses the exact ATTEST callback-bearing shape and must match snapshot identity, current CONTENT projection, claimSources and factual catalog; baseline facts remain distinct from CURRENTM2 import identity. QA full Rights and source record sets match independent expected frozen sets. SnapshotRead/QA exactfive fields remain unchanged, without inline proofs in private SnapshotRead. Raw LEGACY UNVERIFIED refs, Rights declaration allowlist and factual source catalog remain separate.

Safe catalog exact wrappers LEGACY/baseline safe asset (public legacyPath retained) and MEDIA_VERSION/safeMetadata; max64each/128total, source/effectiveID ASCII order, global ID uniqueness/collision refusal, strict kind metadata and no private actor/digest/derivative/provenance payload. DraftRead uses catalog. Snapshot validates independent selected-ID bijection, fixed legacy brand-diagonal/favicon policy, ordered full manifest including hidden refs, content/manifest/pins frozen digest formulas and original proofs. It does not traverse slots, build manifests, decide live archive eligibility or run importer transactions. Archived safe version metadata remains inspectable in retained Draft; A owns new-reference eligibility.

Serialization: descriptor/JSON guard then order-preserving DATA capture before every injected callback, including original-proof hashes. Schema parsing validates but its reordered output is not serialized; JSON.stringify uses captured raw content. Decoder JSON.parse/guard/validation returns captured raw-parsed order. Compact frozen vectors roundtrip; no arbitrary formatting/Unicode/array normalization promise. Raw duplicate-key refusal remains upstream encoded transport/storage precondition; this slice does not claim a new raw JSON duplicate-key parser. Validators return independent stable DATA; corrupt contexts/persisted/read/QA relations→INTERNAL_ERROR, submitted domain encoding invalidity→baseline VALIDATION_ERROR. Whole actualJSON/stored/private/QA/detail budgets remain C, with no reserve/truncate/capraise.

21 cases test SOURCE AUTHORED, five frozen six-stage family records with independent expected canonicalhash/rawUTF8bytes, authored DraftRead safe projection marked separately from serialized golden stages. Covers raw stored key order/callback capture, currentM2+M1 lineage, selected hidden/fixed/order identities, full Rights pins/hashes/proofs, source namespace refusal,64+64safe catalog/privacy/archive inspection, SnapshotRead ALL/QA APPROVED, claim-context equality, errors and unsafe JSON. Fixture has no runtime .local dependency; no new golden/reproducer executed. Tests/Node/syntax/lint/build/module evaluation **NOT_RUN**, affected independent source High review pending.

- `contracts/media-v3-records.mjs`: 19320B, SHA256 `d1b870044ce4abd44ed6b35a20d2d7beab7d6ca17f7cb6aeb21f402f9101b6d7`, writes3.
- `tests/media-v3-records.test.mjs`: 18412B, SHA256 `866ce7a0c708598f2cbc9f73ba3b330732382f30ab14b3f23a1e9182b4a42665`, writes1.
- `tests/fixtures/media-v3-records.json`: 2464568B, SHA256 `78eebd221800e33bd1a398887d1a64fb2e1873c5a2befe572681789f84ae7936`, writes2.

Read-only exact3 stat/SHA/size and duplicate-key-refusing fixtureJSON PASS; 53 protected inputs unchanged PASS. Retained 2502300B, cumulative source writes 4475816B across six writes (max3/file), approved caps preserved. Original before receipt/partial history retained. Evidence [manifest.json](../.local/test-outputs/m3/parallel-v3-01/common18-source-01/c0-records-01/manifest.json) and [source-freeze.json](../.local/test-outputs/m3/parallel-v3-01/common18-source-01/c0-records-01/source-freeze.json). Worker STOPPED after final common source freeze; no runner in-flight/scheduled. Private control SOURCE4 queued for separate parent dispatch; none authored here. A/B/C/I/U1 integration/V1 and actual runtime/production remain HOLD.


## PRIVATE4 source closeout — 14/10/2026

Verified: Coordinator `M3-C0-META-NODE-CONTROL-SOURCE-01 v1` và `M3-C0-META-NODE-CONTROL-SOURCE-READ-AMENDMENT-01 v1` cho phép source preparation; authority là human-delegated Coordinator, không phải execution admission. Worker observed `gpt-6.1-sol/medium`, turn `01a137e1-5447-7772-8f36-01e54524c457`. Bốn private files ở `common18-pure-control-01-01a13604-d138-7ea0-b890-1536b0c65582/source-01/` đã authored và STOPPED cho affected High review. Supervisor/test/child/DATA có writes 4/2/1/1; source4 cumulative writes 596366 bytes, retained 479493 bytes.

Verified: matrix có 20 groups và 52 finite variants (12 pure negative groups/36 variants, 2 pure positive groups/10 variants, 6 synthetic process groups/6 variants). Fixed production target chỉ META12; control import không tự spawn META. DATA có three code pins và 60 frozen inputs, không có own DATA SHA; source code không hardcode DATA SHA. Ba helper `errors.mjs`, `hero.mjs`, `site-settings.mjs` đã được bổ sung vào closure. Old protected56 và toàn bộ COMMON18 giữ nguyên. Source-before SHA `604f82d5b4903c5148322271b74ef3b5f63867d57438b115360c44d4ecc18086` được giữ.

Verified: installed Zod inventory có 840 regular files/30 directories/6140311 unique bytes. Ba scans tiêu thụ 18420933 bytes theo bounded amendment. Original canonical inventory 238461 bytes, SHA `068b83251afe25296ac4824368d019728e9682303dc4dca906fbb883f832ad82` MATCH. Final postflight dùng STAT ONLY, không fourth byte scan. DATA exclusive-create ngay sau capture/validation; tất cả source files mode0600/nlink1, directories0700. Conservative whole-package coverage không chứng minh actually loaded module list.

Unknown: failure chunk `ada319` exit1 xảy ra trước DATA publication; exact failing member/changed stat field chưa xác định. `atime` là hypothesis, không được ghi là verified cause. History và consumed counters được giữ nguyên. Root external four-hash seal và riêng control20/META12 admissions còn pending. Node/tests/syntax/lint/module evaluation/controls/META12 đều NOT_RUN; không tạo runtime attempt. A/B/C/I/U1 integration/V1 tiếp tục HOLD.
