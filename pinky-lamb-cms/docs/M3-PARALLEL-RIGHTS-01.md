# M3-PARALLEL-RIGHTS-01 v1 — Bounded pure core

**Verified current disposition:** `BOUNDED_PURE_RIGHTS_CORE_COMPLETE_SOURCE_AND_UNIT_EVIDENCE`. Final actual High verdict `PASS_BOUNDED_RIGHTS_CORE_SOURCE_AND_UNIT_EVIDENCE`, Required0; [final receipt](#final-bounded-rights-core--verified-source-and-unit-evidence). GREEN153/153 (contract66 + policy87), syntax3/ESLint3 exit0; eight processes reaped, slot RETURNED. Đây là bounded structural pure core, không CMS LOCAL_COMPLETE/full integration hoặc user acceptance.

**Current limits:** old RED151 vẫn `LOG_CAP_NOT_ENFORCED`. Overflow/termination/timeout/exception cleanup branches `NOT_EXERCISED`; OS-wide process absence Unknown. Producer/Auth/ACL/Storage/backend/UI/native/emulator/browser/CMS acceptance NOT_RUN/HOLD.

**Current next owner:** Coordinator cập nhật shared ledger và quyết định riêng future integration scope. Không automatic continuation, Node rerun hoặc producer/adapter authority từ kết quả này. Older phase/HOLD/release prose bên dưới là lịch sử theo thời điểm.

## Quyền và ownership — Verified

Coordinator quyết định `PREPARATION_APPROVED_DEPENDENT_IMPLEMENTATION_WAIT_MEDIA_BINDING_FREEZE` trong [register](../../approvals/M3-PARALLEL-COORDINATION-01-REGISTER.json). Đây là `COORDINATOR_APPROVED_UNDER_DIRECT_HUMAN_DELEGATION`, không phải Khiêm trực tiếp duyệt từng slice.

Nguồn delegation là direct human message của Khiêm trong Coordinator chat `01a135e2-c142-7842-ae74-e1d8998bb073`, được parent xác minh ở message `userMessage01a135fe-29c1-7252-83f1-e8f05f2f8e6c`. Observation time của register: `2026-10-13T16:01:25Z`, không phải server timestamp. Snapshot [coordination](M3-PARALLEL-COORDINATION-01.md) SHA256 `69db3eceaee253c42c09740de4ecbe38fd620d8a02c27091d77defc106c9d8a2`; parent đã kiểm hash.

Worker `/root/rights_preparation` là sole writer được parent giao cho:

- `contracts/media-rights.mjs`
- `tests/media-rights-contract.test.mjs`
- `tests/media-rights-policy.test.mjs`
- `docs/M3-PARALLEL-RIGHTS-01.md`

Bốn paths chưa tồn tại lúc kiểm tra trước write. Không ghi ledger/index, `errors.mjs`, IMAGE/PDF/V3/upload/QA, packages, config hoặc runtime data. Không Git, cloud, native/emulator/browser, build, downloads/install. Evidence namespace nếu cần: `.local/test-outputs/m3/parallel-rights-01/<run-id>/`; lượt này không tạo evidence directory.

Actual native rollout của worker: `rollout-2026-10-13T23-08-04-01a13605-6114-7ca1-8687-5e45534d5d8c.jsonl`: line1 ghi parent `01a135ee-96d2-7e51-a189-f19f4e328020`, agent path `/root/rights_preparation`; line8 ghi current `turn_context.model=gpt-6.1-sol`, `effort=medium`. Parent xác minh độc lập cùng lines trước write. Không suy route từ TOML hoặc model self-report.

Skills đã đọc/applied: `using-agent-skills`, `incremental-implementation`, `test-driven-development`, `technote`; workflow overlay giữ giới hạn PREPARATION. TechNote Level1 tiếng Việt; user chọn progression, silence không approval.

## Nguồn hiện hành và legacy — Verified

[M3-plan CMS-M3-05](../tasks/M3-plan.md:89) là contracts task còn phụ thuộc04; [CMS-M3-17](../tasks/M3-plan.md:277) backend phụ thuộc16. Batch cho ngoại lệ preparation thuần; không mở integration05/17 hoặc đánh LOCAL_COMPLETE.

Schema1 trong `contracts/hero.mjs` dùng `schemaVersion:1`, `LEGACY_READY` catalog và `isDecorative`. Schema2 source checks trong `contracts/source-checks.mjs` dùng `verification:SOURCE_CHECKED`, exact factual catalog/content binding, review/source revisions. `cms-api/source-checks.mjs` kiểm current authorization, proof/audit/receipt trong transaction trước replay. Không sửa hai schema hoặc biến legacy thành media rights APPROVED.

M2 `mutationIdentity(uid,operation,key,body)` tại `cms-api/drafts.mjs` dùng SHA256 `canonicalJson({uid,operation,key})` cho identity và SHA256 `canonicalJson(body)` cho payload. `contracts/draft.mjs` cung cấp canonical JSON; không trim/normalize strings. Existing `resourceIdSchema`: `[A-Za-z0-9_-]`, 1–128 units; `hashSchema`: lowercase hex64; `idempotencyKeySchema`: `[A-Za-z0-9_-]{8,128}`. Error codes/status bên dưới tồn tại trong `contracts/errors.mjs`; file đó READ_ONLY.

`READY_RECEIPT_IS_NOT_RIGHTS`: processor/READY receipt không là rights proof. Rights `MEDIA_RIGHTS_CHECK` không là `SOURCE_CHECKED`, không mở rộng factual catalog và không thay Snapshot review. REJECTED vẫn là terminal proof nhưng không đáp ứng requirement APPROVED. Archive không được diễn giải thành rights revocation.

## API và exact shapes — Proposed, chưa freeze

Module chỉ export `ProposedMediaRightsPreparation`, một descriptor object; không export hàm runtime, schema parser, fake stub hoặc fallback. Planned APIs:

| Planned export | Input / output |
| --- | --- |
| `parseMediaRightsRequest(input)` | Strict object request → request giữ exact values; throws existing ApiError |
| `validateMediaRightsProof(proof,{context,hashCanonical})` | Strict terminal proof → validated exact proof; kiểm digest và binding/trusted UID |
| `evaluateMediaRightsDecision({request,context,hashCanonical})` | Decision plan; không ghi storage, sinh proof, timestamp hoặc event |

`hashCanonical(value)` là pure SHA256 của existing `canonicalJson(value)`; caller có trách nhiệm cung cấp trusted implementation. Synthetic tests dùng actual `node:crypto` + `canonicalJson`, không canned-success mocks.

Strict Proposed binding:

```text
{
  assetId: resourceIdSchema,                    // exact immutable MediaVersion.id
  originalSha256: hashSchema,
  derivativeSetSha256: hashSchema,             // full immutable processed output set
  processingRecipeSha256: hashSchema,
  toolSetSha256: hashSchema,
  evidenceSha256: hashSchema
}
```

Strict Proposed request:

```text
{
  expectedBinding: binding,
  expectedRightsRevision: 0,
  decision: 'APPROVED' | 'REJECTED',
  note?: well-formed multiline string, <=1000 UTF-16 units
}
```

`derivativeSetSha256` pin toàn bộ immutable processed output set của exact `MediaVersion`, khác với selected references/derivatives của site manifest. Không hash riêng tập vừa được chọn vào site để làm rights binding. Canonical set ordering, exact entry projection và digest golden vectors vẫn WAIT C0/U0 freeze.

Không body `requestId`, actor, reviewer, time, status, proof, `allowSelfReview` hoặc client-owned identity. Domain `context.requestId` derive từ existing M2 `Idempotency-Key` header; không tạo second key/body fallback. Reject unknown keys ở mọi nested object.

Strict Proposed server-trusted context:

```text
{
  binding,
  mediaStatus: current server media state,
  actorUid: resourceIdSchema,
  uploaderUid: resourceIdSchema,
  evidenceSubmittedBy: resourceIdSchema,
  rights: {status:'PENDING'|'APPROVED'|'REJECTED', revision:0|1, proof:proof|null},
  operation: 'POST /api/cms/media/{exact assetId}/rights-checks',
  requestId: idempotencyKeySchema,
  requestHash: hashSchema,                      // server SHA256 canonical request
  replay: completedRecord|null
}
```

`evidenceSubmittedBy` nghĩa là tài khoản CMS nộp evidence, không phải tác giả pháp lý của tài liệu. Không thiếu UID nào được coi là non-self. Context chưa phải confirmed media adapter; field names/status mapping cần C0/U0 freeze.

Strict Proposed proof:

```text
{
  id: resourceIdSchema, verification:'MEDIA_RIGHTS_CHECK', binding,
  uploaderUid: resourceIdSchema, evidenceSubmittedBy: resourceIdSchema,
  checkedBy: resourceIdSchema, decision:'APPROVED'|'REJECTED',
  checkedAt: ISO UTC timestamp, 24 characters,
  rightsRevision:1, eventId:resourceIdSchema,
  note?: exact request note,
  proofDigest:hashSchema                       // SHA256 canonical proof minus proofDigest
}
```

Receipt: `{assetId:resourceIdSchema,rightsRevision:1,proofId:resourceIdSchema,proofDigest:hashSchema}`.

Completed record: `{identity:{actorUid,operation,assetId,requestId},requestHash,state:'COMPLETED',statusCode:201,response:receipt,eventId,createdAt}`. Identity strings dùng schemas phía trên; `createdAt` bằng `proof.checkedAt`, eventId bằng proof.eventId. Record là dữ liệu backend kiểm, không nhận receipt do client tự khai.

Decision plan mới: `{action:'CREATE_TERMINAL',decision,fromRevision:0,toRevision:1}`. Replay plan: `{action:'REPLAY',receipt:validated original receipt}`. Cả APPROVED và REJECTED append-only; file/evidence/recipe mới tạo version mới.

## Call order và lỗi — Proposed

1. Backend xác minh current authenticated actor + active Reviewer/Owner membership; kiểm ACL trước pure evaluator và trong transaction. Pure context không cấp quyền.
2. Parse exact request, verify current version/binding, trusted UIDs và server-computed identity/payload hash. Actor bằng uploader hoặc evidenceSubmittedBy: `SELF_REVIEW_FORBIDDEN`403, kể cả Owner.
3. Nếu có exact actor/operation/version/intent completed record, kiểm payload hash; payload khác: `IDEMPOTENCY_PAYLOAD_MISMATCH`422. Kiểm strict record/proof, recomputed proofDigest, decision/note/current binding/UID/receipt/time/event relations. Chỉ trả original validated receipt.
4. Replay valid được xử lý trước fresh-request comparison `expectedRightsRevision:0` với stored terminal revision1. Không làm retry hợp lệ thành stale-revision conflict; không bỏ current authorization hoặc proof checks.
5. Nếu không replay, yêu cầu READY + PENDING revision0 + exact binding; plan transition0→1. Terminal mới: `REVIEW_STATE_CONFLICT`409; stale binding: `REVISION_CONFLICT`409. Không overwrite quyết định.

Malformed client/proof: `VALIDATION_ERROR`422. Oversize: `PAYLOAD_TOO_LARGE`413. Missing/corrupt trusted context hoặc completed relation: `INTERNAL_ERROR`500. Đây là Proposed error mapping dựa existing codes; không thêm public codes hoặc sửa safe field-message allowlist.

Limit Proposed: request64KiB; provenance/evidence4KiB; private detail gồm proof8KiB. Đo UTF-8 của whole serialized record, gồm JSON escaping; Unicode phải well-formed, không silently trim/normalize. Proof standalone cũng bị giới hạn8KiB nhưng full detail cần cả envelope metadata. Exact provenance/evidence projection và full detail shape chờ freeze; chưa invent parser cho hai shapes đó.

## Dependency freeze — Unknown / HOLD

| Dependency | Owner / yêu cầu Coordinator |
| --- | --- |
| C0 | `01a135ee-9f2c-78b1-9026-447e6b87a018`; `contracts/media-v3-contract.mjs`; exact immutable version/status/ref/digest mapping |
| U0 | `01a135ee-8f22-70f1-8016-92ca2a782719`; isolated upload candidate; uploader/evidence submitter, original/recipe/output/tool/evidence digest semantics |
| Rights | `01a135ee-96d2-7e51-a189-f19f4e328020`; strict shapes/proof/replay above |
| Release | Coordinator records compatible C0/U0/rights freeze + explicit dependent implementation release |

C0/U0 chưa sẵn lúc initial source inspection. Parent báo U0 unfrozen candidate tồn tại ở `.local/test-outputs/m3/parallel-upload-01/run-e24857a3-3225-4a57-b213-507b3f0d8ed2/workspace/pinky-lamb-cms/contracts/media-upload.mjs`; worker không import/copy candidate hoặc coi đây là authority.

Parent observation: U0 `outputBindingSchema` có `{inputSha256,metadataDigest,recipeDigest,outputSetDigest}`, identity `{actorId,operation,resourceId,requestId}`. Proposed mapping để Coordinator quyết định: `originalSha256↔inputSha256`, `derivativeSetSha256↔outputSetDigest`, `processingRecipeSha256↔recipeDigest`; metadataDigest chưa được coi là evidence/tool digest. U0 chưa chốt `toolSetSha256`, evidence digest/submitter hoặc versionID vs intentID mapping.

**Verified source observation, chưa freeze:** candidate C0 `contracts/media-v3-contract.mjs` hiện dùng `assetIdSchema`1–100 tại line18; rights Proposed dùng `resourceIdSchema`1–128. C0 server field `rightsEvidenceSubmittedBy` tại line51 khác `evidenceSubmittedBy`. C0 binding tại lines82–83 có bảy fields gồm `kind`, rights Proposed strict sáu fields không `kind`. PREPARATION không import C0 hoặc chọn schema nào thắng. **Proposed alignment:** Coordinator và owners chốt shared media-ID cap, evidence-submitter adapter/name và whether `kind` thuộc exact binding; sau release mới sửa APIs/fixtures theo contract đã freeze. Không coi Proposed alignment là quyết định hiện hành.

**Verified clarification — `RESOLVED_TRANSPORT_RULE_ONLY`:** `M3-IDEMPOTENCY-DECISION-01 v1` hiện có trong register `decisions[]`, observed `2026-10-13T16:11:04Z`, status `COORDINATOR_APPROVED_CONTRACT_CLARIFICATION_NOT_FULL_FREEZE`. Existing `Idempotency-Key` header là transport authority. Pure `requestId` là normalized operation key, tách khỏi immutable asset/version/resource ID. Rights context dùng cùng validated key; identity bind actor+operation+resource+key, fingerprint bind exact validated payload. Upload có thể giữ domain requestId; future adapter phải truyền validated header. Body mirror nếu có phải equal header trước side effects. Không body alias/fallback trong rights.

Clarification giữ mismatch422 và duplicate-part/different-bytes409; current authorization vẫn cần khi replay. Quyết định này không cấp adapter implementation, test slot, full binding freeze hoặc dependent release. SnapshotSHA bên trên giữ historical value; register được Coordinator append decision, worker không sửa shared sources. Tool closure digest/golden vector, evidence serialized bytes/hash, submittedBy names, READY receipts, operation/resource field mapping, proof revision/canonical digest và full detail envelope còn Unknown.

Freeze PASS chỉ khi ba owners nhận exact fields/types/hash definitions/golden vectors và Coordinator release. Thay media bytes, derivative set, recipe/tool closure hoặc evidence invalidates binding; không suy compatibility từ naming gần giống. Backend Auth/ACL/transaction/routes/UI là tương lai của17; pure tests không chứng minh concurrency/integration.

## Kiểm chứng và bàn giao

**Verified:** source authored; chỉ syntax/lint không execute tests. Node pinned22.23.3; installed ESLint10.12.0, nofix; heap<=256MiB, sequential, timeout60s/file, group<=5min. Không gọi local-guard/import app scripts hoặc broad suite. Initial group0.558s; mọi command exit0, stdout/stderr rỗng trừ version. Sau idempotency clarification và ba policy cases bổ sung, recheck chỉ hai source files đã đổi; results bên dưới.

**NOT_RUN_QUEUED:** RED/GREEN Node tests, unit runtime; slots đang được Coordinator cấp V3/U0. Namespace import cho phép syntax parse dù planned exports chưa tồn tại; assertions target future APIs, không `skip/todo` hoặc hardcoded-success implementation. RED candidates chưa được chạy nên không báo FAIL/PASS.

Authored cases: strict/unknown/server fields; malformed SHA/Unicode; exact whitespace/composition; UTF-8 and escaping overflow; each binding tamper kể cả recomputed proofDigest; SOURCE_CHECKED/PENDING/revision/UID rejection; non-self including Owner; READY/state matrix; terminal APPROVED/REJECTED; exact replay, changed payload422, terminal new-intent409; stored identity/receipt/event/time/proof tamper; input immutability.

Future cases sau freeze: inclusive request/provenance/detail boundary bytes (byte budget vs smaller semantic string caps phải được phân biệt); exact evidence/tool digest golden vectors; full detail+proof budget; closed-world fields/duplicate raw JSON at transport; all replay proof relation paths, missing actor and forged hash callback controls. Khi được release/admitted, chạy scoped Node test concurrency1 và giữ actual RED evidence trước implementation. Chưa có accepted 4KiB provenance projection để viết executable assertion mà không tự chọn media contract.

**NOT_RUN:** backend/API/ACL/race, native, emulator, browser, build, broader regression, deployment/Git, M3 acceptance và LOCAL_COMPLETE. Không application functionality hoặc acceptance claim từ preparation này.

**Next:** parent High review bốn files và Proposed shapes; Coordinator freeze C0/U0/rights binding, rồi cấp dependent implementation và pure runner. Intent transport rule đã chốt; exact resource mapping vẫn chờ. Chỉ Coordinator cập nhật shared indices/register. Hold không chặn hoàn tất scoped syntax/lint và handoff hiện tại.

### Scoped command receipt — Verified

CWD `pinky-lamb-cms/`. Trong table, `NODE` là exact executable `.local/cache/node/node-v22.23.3-darwin-arm64/bin/node`, không biến môi trường đã thay đổi. Executable SHA256 `68f4d07ca49e0500cc135c7e0a445093e228e42e126ac22306d045f0a8c2636b`, khớp pin tại `scripts/media-tool-audit.mjs`. Python orchestration chỉ gọi từng subprocess tuần tự, timeout60s mỗi command; không execute source/test modules. Initial elapsed0.558s, recheck elapsed0.372s.

| Exact scoped command | Exit / output |
| --- | --- |
| `NODE --version` | 0; `v22.23.3` |
| `NODE --max-old-space-size=256 --check contracts/media-rights.mjs` | 0; empty; recheck0 sau clarification |
| `NODE --max-old-space-size=256 --check tests/media-rights-contract.test.mjs` | 0; empty |
| `NODE --max-old-space-size=256 --check tests/media-rights-policy.test.mjs` | 0; empty; recheck0 sau thêm cases |
| `NODE --max-old-space-size=256 node_modules/eslint/bin/eslint.js --no-fix contracts/media-rights.mjs` | 0; empty; recheck0 |
| `NODE --max-old-space-size=256 node_modules/eslint/bin/eslint.js --no-fix tests/media-rights-contract.test.mjs` | 0; empty |
| `NODE --max-old-space-size=256 node_modules/eslint/bin/eslint.js --no-fix tests/media-rights-policy.test.mjs` | 0; empty; recheck0 |

Initial source SHA256 tại handoff trước High findings (giữ lịch sử; doc hash gửi riêng để tránh self-reference):

| Source | SHA256 |
| --- | --- |
| `contracts/media-rights.mjs` | `b42fe610d8e7354cfa766dc7af601df2be8fc575b9beb041e8144cdae46b633e` |
| `tests/media-rights-contract.test.mjs` | `e891d9d03cf5f7e44870f44e27a420fdc093a48408912044a7a9f0b1b8f03602` |
| `tests/media-rights-policy.test.mjs` | `38fcbd9b280946aac9d10342cdcaf4aa53e72aff8ed8cfec4a1c814f29d85f6d` |

Không có test command được chạy. Source freeze tại handoff chỉ nhằm review PREPARATION, không là Coordinator binding freeze hoặc dependent release.

### Routine Required repair — Verified source authoring, review còn HOLD

Parent báo actual High reviewer kết luận `HOLD_PREPARATION_SOURCE_REVIEW_REQUIRED`, hai Required P2: (1) descriptor không được dùng selected subset cho derivative-set binding; (2) thiếu replay semantic negatives, kể cả khi proof digest được tính lại. Parent đã verify reviewer rollout `rollout-2026-10-13T23-15-35-01a1360c-4238-7b70-a1f0-98818b221106.jsonl` lines1/8 và bốn initial pins. Đây là evidence review parent chuyển; worker không tự claim High PASS.

Worker sửa trong cùng PREPARATION approval: descriptor pin full immutable processed output set; doc phân biệt site-selected references và ghi C0 differences; policy tests bổ sung từng current/proof binding field, missing trusted UID, current self, reviewer/submitter UID mismatch, decision vs request/status, current/proof revision, proofID/time/event receipt relations. Semantic proof-tamper cases tính lại SHA bằng actual `canonicalJson` + `node:crypto`, cập nhật receipt proofDigest để checks không chỉ bắt digest mismatch. Positive identical APPROVED/REJECTED replay giữ nguyên. Existing error codes explicit: stale current binding409, self403, corrupt replay relations500. Không thay contract-test file.

Actual worker route latest turn: own rollout nêu trên line143 `turn_context.model=gpt-6.1-sol`, `effort=medium`; initial lines1/8 giữ historical proof. Required source repairs đã authored; final affected High review vẫn PENDING. Node tests `NOT_RUN_QUEUED`, chưa thực tế chứng minh assertions fail/pass. C0/U0 compatibility freeze và dependent implementation chưa release.

Initial doc SHA trước Required repair: `dec6d266b06ccc88e85f4e84719d96da98497d1a8f8d167760df3314d8b6a15e`. Initial source pins ở table trên giữ lịch sử, không ghi đè để diễn giải High HOLD thành PASS.

Repair checks CWD/executable/heap/timeout giống receipt trên, tuần tự và nofix:

| Exact scoped command | Actual result |
| --- | --- |
| `NODE --max-old-space-size=256 --check contracts/media-rights.mjs` | exit0, empty output |
| `NODE --max-old-space-size=256 node_modules/eslint/bin/eslint.js --no-fix contracts/media-rights.mjs` | exit0, empty output |
| `NODE --max-old-space-size=256 --check tests/media-rights-policy.test.mjs` | exit0, empty output; final thêm current-actor-self/PENDING replay cases recheck exit0 |
| `NODE --max-old-space-size=256 node_modules/eslint/bin/eslint.js --no-fix tests/media-rights-policy.test.mjs` | exit0, empty output; final recheck exit0 |

Repair initial group0.379s, final policy recheck0.155s; không test runner, external call hoặc runtime behavior execution. Contract-test file giữ byte-identical, không rerun checks cho source không đổi.

| Latest repair source | SHA256 |
| --- | --- |
| `contracts/media-rights.mjs` | `194fc9b14a43cc28c733af66d73b2079c2b64cd2c27e57cb4449775b2d8d5f9e` |
| `tests/media-rights-contract.test.mjs` (unchanged) | `e891d9d03cf5f7e44870f44e27a420fdc093a48408912044a7a9f0b1b8f03602` |
| `tests/media-rights-policy.test.mjs` | `94c5b5b8ede9c84f0e27c8aaf37fb365b26972456ec1d158957c82e7a1e2e3b5` |

Worker source repair READY_FOR_AFFECTED_REVIEW; actual High kết luận mới chưa nhận. Parent gửi ba changed files cho cùng reviewer, reuse unaffected contract-test review. Không acceptance, binding freeze hoặc dependent implementation release từ repair này.

### Required replay case isolation — Verified source fix, final High PENDING

Parent chuyển affected review mới: output-binding P2 đã closed; replay coverage phần lớn đạt source review, còn một Required P2 ở opposite-proof-decision case vì case cũng sai proof–state relation. Worker sửa duy nhất case đó: đổi cả `proof.decision` và `context.rights.status` sang opposite terminal decision; giữ nguyên request, `context.requestHash` và `replay.requestHash`; helper tính lại proofDigest và receipt pin. Expected `INTERNAL_ERROR`500 kiểm proof–request relation độc lập. Case kế tiếp kiểm proof–state mismatch giữ nguyên. Positive identical replay không đổi.

Latest observed worker route: own native rollout line199 `gpt-6.1-sol / medium`. Same PREPARATION authority; không application implementation hoặc test admission. Trạng thái source fix READY_FOR_EXACT_CASE_REVIEW; remaining Required closure phải chờ same High reviewer, không writer tự claim PASS. Node tests vẫn `NOT_RUN_QUEUED`; C0/U0 binding freeze/dependent implementation vẫn HOLD.

Chỉ policy file đổi được kiểm lại, CWD/exact NODE/heap256MiB/timeout60s/no-fix như receipt trước: `NODE --max-old-space-size=256 --check tests/media-rights-policy.test.mjs` exit0 và `NODE --max-old-space-size=256 node_modules/eslint/bin/eslint.js --no-fix tests/media-rights-policy.test.mjs` exit0; cả hai empty output, sequential group0.166s. Không chạy lại checks của contracts hoặc contract-test unchanged. Previous review states/pins/receipts giữ historical.

Latest policy SHA256 `65900ebb44d2487ddae8ee5d542482b8e1d7b0af87fe7bfcfa3ffee36ec44210`; doc SHA gửi riêng. Previous policy pin `94c5b5b8ede9c84f0e27c8aaf37fb365b26972456ec1d158957c82e7a1e2e3b5` và previous doc pin `80383457f2777ba93a35fbf5d64c4b8fc5226b35d2f7e180fdec8f9970969a15` là before-fix history. Parent gửi exact one-case/doc delta cho same reviewer; không mở gate mới hoặc shared-record write.

### Final PREPARATION source review — Verified

Parent chuyển final verdict của same reviewer: `PASS_PREPARATION_SOURCE_ONLY`; hai Required P2 đã closed, không finding mới. Actual reviewer native rollout `rollout-2026-10-13T23-15-35-01a1360c-4238-7b70-a1f0-98818b221106.jsonl` latest turn_context line144 `gpt-6.1-sol / high`. Reviewer xác nhận final worker check commands tại own rollout line211 exit0, group0.166s. Root kiểm độc lập bốn reviewed pins và worker route own turn_context line199 `gpt-6.1-sol / medium`. Đây là received reviewer verdict được ghi lại; không thêm review hoặc runtime gate.

| Final reviewed source | SHA256 |
| --- | --- |
| `contracts/media-rights.mjs` | `194fc9b14a43cc28c733af66d73b2079c2b64cd2c27e57cb4449775b2d8d5f9e` |
| `tests/media-rights-contract.test.mjs` | `e891d9d03cf5f7e44870f44e27a420fdc093a48408912044a7a9f0b1b8f03602` |
| `tests/media-rights-policy.test.mjs` | `65900ebb44d2487ddae8ee5d542482b8e1d7b0af87fe7bfcfa3ffee36ec44210` |
| `docs/M3-PARALLEL-RIGHTS-01.md` before this verdict-only update | `6d0f84729cc9c7cf2b7c662ecad072a0460d1c6de4a9a3b294737e7160e6c5af` |

Current phase `PREPARATION_COMPLETE_SOURCE_REVIEWED`; old HOLD/review/checks/pins ở trên là history. Final receipt chỉ chứng minh source preparation đã review. Không code/test edit hoặc check rerun trong verdict-only update này; final doc hash gửi riêng cho Coordinator.

**NOT_RUN:** Node tests/RED/GREEN, behavior, runtime/integration, native, browser, emulator, build. Runner `QUEUED`, no slot consumed. Không product functionality complete, M3 acceptance hoặc LOCAL_COMPLETE.

**Unknown / remaining HOLD:** full C0/U0/rights binding freeze và dependent implementation chưa release. C0 bảy binding fields gồm `kind` vs Proposed rights sáu; media assetID cap100 vs resourceID128; `rightsEvidenceSubmittedBy` vs `evidenceSubmittedBy` mapping chưa chốt. Exact evidence/tool/full-output canonical digest semantics vẫn chờ Coordinator/owners. `M3-IDEMPOTENCY-DECISION-01 v1` chỉ resolve transport rule; không giải phóng các holds đó.

Approval provenance giữ `COORDINATOR_APPROVED_UNDER_DIRECT_HUMAN_DELEGATION` cho PREPARATION; verdict không tạo direct human approval mới. Coordinator nhận receipt này để cập nhật shared state khi được phép. Worker finished; next action Coordinator compatibility freeze/release, rồi runner admission và approved implementation tương ứng.

### C0 IMAGE alignment handoff — Verified decision, Proposed compatibility

Worker đọc `M3-C0-IMAGE-ALIGNMENT-01 v1` trong register `decisions[]`, status `COORDINATOR_APPROVED_C0_REVISION_SOURCE_ONLY_NOT_COMPATIBILITY_FREEZE`, authority `HUMAN_DELEGATED_COORDINATOR_APPROVAL`. Parent đã verify register/source evidence: `cms-api/media-images-runtime.mjs` line147 resize theo width, without enlargement; lines160–164 exact ba buckets với targetWidth. V3 owner `01a135ee-9f2c-78b1-9026-447e6b87a018` sửa C0, rights chỉ ghi handoff này trong owned doc. Worker latest own native turn_context line252 ghi `gpt-6.1-sol / medium` trước write.

Rights `derivativeSetSha256` đã mô tả full immutable processed output set của exact MediaVersion. IMAGE binding phải giữ cả ba distinct logical keys `image-320`, `image-960`, `image-1920` với targetWidth320/960/1920, kể cả tiny originals cho effective dimensions bằng nhau. Không deduplicate outputs hoặc dùng site-selected subset. Descriptor hiện hành giữ nguyên, không cần sửa ba `.mjs`.

**Approved revision rules, chưa là revised C0 source proof:** strict `targetWidth` chỉ thuộc IMAGE derivative metadata; PDF/VIDEO không nhận field đó. Effective width bằng `min(targetWidth, oriented original width)`; giữ aspect ratio với rounding<=1px, no-upscale. Effective width<=1920; output height có thể vượt1920 nếu vẫn trong oriented-original8192-edge/40Mp caps. Không đổi IMAGE recipe để làm provisional C0 pass.

| PURE expected input geometry | targetWidth | Expected effective geometry |
| --- | --- | --- |
| Portrait2000×3000 | 320 | 320×480 |
| Portrait2000×3000 | 960 | 960×1440 |
| Portrait2000×3000 | 1920 | 1920×2880 |
| Tiny120×80 | 320 | 120×80 |
| Tiny120×80 | 960 | 120×80 |
| Tiny120×80 | 1920 | 120×80 |

Vectors là expected geometry để owner dùng sau admission; không executed test hoặc native output proof. Parent source observation lúc steering vẫn là C0 pre-revision:1–3 IMAGE entries, unique effective widths và both-edge1920. Không claim revised C0 source implemented/PASS từ decision này.

**Proposed / HOLD:** V3 phải đề xuất revised derivative-set canonical projection/order gồm `targetWidth` và trusted Storage generation. Exact golden digest compatibility cần Coordinator freeze với U0/rights trước dependent use. C0 bảy binding fields gồm `kind`, media-ID cap100 vs resourceID128, `rightsEvidenceSubmittedBy` vs `evidenceSubmittedBy`, tool/evidence canonical digest semantics vẫn chưa freeze; không tự align schemas hoặc import candidate.

**Verified preservation:** ba `.mjs` byte-identical với final reviewed pins:

- `contracts/media-rights.mjs`: `194fc9b14a43cc28c733af66d73b2079c2b64cd2c27e57cb4449775b2d8d5f9e`
- `tests/media-rights-contract.test.mjs`: `e891d9d03cf5f7e44870f44e27a420fdc093a48408912044a7a9f0b1b8f03602`
- `tests/media-rights-policy.test.mjs`: `65900ebb44d2487ddae8ee5d542482b8e1d7b0af87fe7bfcfa3ffee36ec44210`

Prior High `PASS_PREPARATION_SOURCE_ONLY` tái sử dụng cho unchanged rights source; compatibility digest không frozen. No code/test/C0 edit, syntax/lint rerun, tests/fixtures/evidence additions hoặc slot consumed trong doc-only update. Current pool IMAGE/VIDEO là allocation mới; earlier V3/U0 initial pool là history, không rewrite receipts. Rights runner vẫn QUEUED.

Quyết định không cấp full freeze, dependent implementation, test re-admission, V3 A/B/C/I, native/runtime/cloud/Git hoặc acceptance. Coordinator tiếp tục phối hợp C0 revision và U0/rights compatibility; rights giữ PREPARATION_COMPLETE_SOURCE_REVIEWED với dependent HOLD.

### Conditional continuation handoff — Verified dispatch, Proposed alignment

Direct human request mới tại rights chat:

> Gửi handoff cho Coordinator, phối hợp chốt C0/U0/rights rồi tiếp tục triển khai và chạy pure tests khi được freeze và cấp slot, trong đúng phạm vi đã giao.

Parent thực sự gọi `send_message_to_thread` gửi handoff tới Coordinator `01a135e2-c142-7842-ae74-e1d8998bb073`, coordination requests tới C0 `01a135ee-9f2c-78b1-9026-447e6b87a018` và U0 `01a135ee-8f22-70f1-8016-92ca2a782719`; tool trả successful dispatch. Worker ghi parent-observed dispatch evidence, không tự message threads hoặc spawn children. Human request cho phép messaging và conditional continuation trong scope cũ; không mở thêm file, runtime hoặc product scope.

**Verified distinction:** handoff SENT/successful dispatch; recipient ACK chưa nhận; Coordinator Approved full compatibility freeze, rights dependent implementation release và pure slot admission chưa nhận. Dispatch không thay ACK, approval hoặc admission. Worker đọc register hiện hành: rights `PREPARATION_APPROVED_DEPENDENT_IMPLEMENTATION_WAIT_MEDIA_BINDING_FREEZE`, pure runner `QUEUED`. Root tiếp tục coordination đến khi release.

**Proposed alignment đã được parent gửi, chưa Approved:** request/context/proof dự kiến dùng C0 exact binding bảy fields `{assetId,kind,originalSha256,derivativeSetSha256,processingRecipeSha256,toolSetSha256,evidenceSha256}`, media assetId1–100 và tên `rightsEvidenceSubmittedBy` đồng nhất. Existing rights strict sáu fields/resourceID128/`evidenceSubmittedBy` vẫn là authored Proposed source đã review; chưa sửa trước Coordinator decision. Idempotency transport clarification vẫn chỉ resolve normalized operation key, không freeze binding/proof digests.

Coordinator cần freeze exact current context/proof/request, source pin/metadata/digest semantics và semantic conflicts giữa C0/U0/rights trước implementation. Whole immutable processed output set, IMAGE ba targetWidth buckets, trusted Storage generation và tool/evidence digest canonical projection phải có exact agreed shapes/golden vectors. Không chọn mapping dựa naming hoặc coi Proposed gửi đi là Approved.

Sau full freeze + explicit rights implementation release + slot admission, Medium sole writer mới cập nhật trong bốn owned files và chạy focused pure RED→GREEN với approved caps; real results khi đó phải phân biệt RED/GREEN, source review và behavior evidence. Hiện tại không thực thi continuation phụ thuộc. Backend/transport/ACL/routes/UI vẫn ngoài phạm vi; không runtime/native/cloud/Git authority từ request này.

Latest own observed native turn_context line281 `gpt-6.1-sol / medium` trước doc-only write. Ba `.mjs` được đọc hash, byte-identical với final reviewed pins ở section trước; prior `PASS_PREPARATION_SOURCE_ONLY` vẫn áp dụng source chưa đổi. Phase `PREPARATION_COMPLETE_SOURCE_REVIEWED`, conditional work WAIT; Node tests `NOT_RUN_QUEUED`, không slot tiêu thụ.

Lượt này chỉ sửa task doc: không code/test edit, syntax/lint/test/native/emulator/browser/build execution, fixtures/evidence additions, shared-record/Git hoặc new source paths. Old source pins, review states và receipts giữ history. Coordinator là owner next decision; final doc SHA gửi riêng cùng handoff line anchor.

### Coordinator ACK — bounded pure core Proposed

**Verified received steering:** Coordinator source `01a135e2-c142-7842-ae74-e1d8998bb073` trực tiếp ACK trong rights chat: latest four-file preparation/source High review và derivative projection agreement đã acknowledged. Parent xác minh current register: rights decision vẫn `PREPARATION_APPROVED_DEPENDENT_IMPLEMENTATION_WAIT_MEDIA_BINDING_FREEZE`, runner `QUEUED_CORE_BINDING_FREEZE`. `M3-PURE-POOL-04` hiện admitted QA `01a135ee-a794-7541-9bb6-e0b81141ae45` và C0 `01a135ee-9f2c-78b1-9026-447e6b87a018`; worker đọc cùng register. Historical initial V3/U0 và later IMAGE/VIDEO pool receipts giữ nguyên theo thời điểm.

**Current boundary:** pending C0 revised recheck/golden result, Coordinator sẽ chốt bounded pure-core seven-field shape, trusted supplied digests và UID authorities, rồi gửi concrete rights source release. Không đợi CREATE/PART engine hoàn chỉnh cho CORE. Chưa có rights Node admission/source release; ACK không tạo application functionality, tests PASS hoặc native/authenticated evidence.

#### CurrentProposedCoreShapes — pending Coordinator freeze

```text
binding = {
  assetId: ASCII [A-Za-z0-9_-]{1,100}, kind: IMAGE|VIDEO|PDF,
  originalSha256, derivativeSetSha256, processingRecipeSha256,
  toolSetSha256, evidenceSha256: lowercase SHA256 hex64
}
request = {
  expectedBinding: binding, expectedRightsRevision:0,
  decision:APPROVED|REJECTED, note?:well-formed multiline string <=1000 UTF-16 units
}
context = {
  binding, mediaStatus, actorUid, uploaderUid, rightsEvidenceSubmittedBy,
  rights:{status:PENDING|APPROVED|REJECTED, revision:0|1, proof:proof|null},
  operation, requestId:validated-header-derived operation key,
  requestHash:SHA256 canonicalJson(exact validated request), replay:completed|null
}
proof = {
  id, verification:MEDIA_RIGHTS_CHECK, binding,
  uploaderUid, rightsEvidenceSubmittedBy, checkedBy,
  decision:APPROVED|REJECTED, checkedAt:UTC ISO timestamp24,
  rightsRevision:1, eventId, note?:exact request note,
  proofDigest:SHA256 canonicalJson(proof minus proofDigest)
}
receipt = {assetId, rightsRevision:1, proofId, proofDigest}
completed = {
  identity:{actorUid,operation,assetId,requestId},
  requestHash:SHA256 canonicalJson(exact validated request),
  state:COMPLETED, statusCode:201, response:receipt, eventId, createdAt
}
```

Other IDs/UIDs (`id`, proofId, eventId, actorUid, uploaderUid, rightsEvidenceSubmittedBy) retain `resourceIdSchema` ASCII1–128. `requestId` là existing validated `Idempotency-Key` ASCII8–128 operation key, distinct immutable assetId. Operation là exact version rights-check endpoint; completed event/time/proof/receipt/identity/payload relations vẫn phải validate trước replay. Shapes này Proposed, chưa đổi six-field authored descriptors/tests để giả frozen contract.

Full processed IMAGE set gồm ba distinct logical buckets targetWidth320/960/1920. Derivative projection/order agreement Proposed gồm `targetWidth` và trusted Storage generation; exact canonical golden compatibility cần pending C0 result + Coordinator core freeze. Trusted core digests và UIDs do caller cung cấp không tạo Auth/ACL, Storage ownership, native READY hoặc producer evidence proof.

**FUTURE_INTEGRATION_HOLD:** evidence/tool/recipe producer normalization, full native READY receipt trust và CREATE/PART effects vẫn cần future integration authority/compatibility. CORE release không mặc nhiên cho phép transport/backend/routes/UI/transactions hoặc producer implementation. Old full-freeze wording là earlier dependency history; current bounded core chỉ cần prerequisites và concrete release Coordinator vừa chỉ định.

Worker latest native own turn_context line310 `gpt-6.1-sol / medium` trước write. Ba `.mjs` byte-identical với final reviewed hashes: contract `194fc9b14a43cc28c733af66d73b2079c2b64cd2c27e57cb4449775b2d8d5f9e`, contract-test `e891d9d03cf5f7e44870f44e27a420fdc093a48408912044a7a9f0b1b8f03602`, policy `65900ebb44d2487ddae8ee5d542482b8e1d7b0af87fe7bfcfa3ffee36ec44210`. Chúng hiện là historical six-field Proposed preparation + unrun RED; chỉ align sau concrete source release. Source-only High PASS vẫn valid cho unchanged preparation.

Doc-only record; không source/test/schema edit, check rerun, test/native/emulator/browser/build, extra fixtures/evidence, messages/children/shared records hoặc Git. `PREPARATION_COMPLETE_SOURCE_REVIEWED` giữ phase hiện tại; tests `NOT_RUN_QUEUED`, no rights slot consumed. Next owner Coordinator: C0 result → bounded core freeze → explicit rights source release + Node admission; Medium writer tiếp tục approved RED→GREEN trong four-file ownership khi các điều kiện thực sự nhận được.

### R0 structural core release and admission — Verified

Worker đọc normative `M3-PURE-RIGHTS-BINDING-01 v1`, status `COORDINATOR_APPROVED_BOUNDED_STRUCTURAL_CORE_FREEZE_AND_RIGHTS_SOURCE_RELEASE`, và `M3-DERIVATIVE-PROJECTION-01`, authority `HUMAN_DELEGATED_COORDINATOR_APPROVAL`. C0 source pin `37aa05c9f5f66ce8d3940964e05a289a44a733f255f2313cd098a4a14d03d00d`; C0 pure16/16 và earlier Required0 là Coordinator-recorded evidence, không worker test claim. Authoritative five digests là typed opaque supplied inputs; rights không raw normalize outputs/tools/evidence hoặc native receipts.

Current seven-field binding, ID cap100, named `rightsEvidenceSubmittedBy`, exact request/proof/receipt/completed `response` và fixed replay relations/errors được align trong ba source files. Planned exports vẫn absent để real RED bắt thiếu implementation, không fake stubs/skip/todo. Negative tests assert intended existing ApiError codes; missing export TypeError không được coi behavior PASS. R0 vectors gồm kind/cap100/UID128, UTF16 cap1000 vs astral500, malformed Unicode/date/symbol/accessor/undefined/cycle, trusted hash failures and replay semantic tamper with recomputed digest.

Standalone `validateMediaRightsProof` nhận strict authority projection `{binding,actorUid,uploaderUid,rightsEvidenceSubmittedBy}` only; không full evaluator context hoặc fallback stripping unknown keys. Evaluator nhận strict ten-field frozen context rồi explicit derive four-field projection. Parent High assessed API/test-intent compatibility; tránh recursion state→proof→state. Malformed trusted authority/capability =>INTERNAL_ERROR500; malformed untrusted proof=>VALIDATION_ERROR422/cap413. Source callback phải là trusted SHA256 UTF8 existing canonicalJson, không caller-controlled HTTP algorithm.

Note cap1000 đếm `.length` UTF16 theo existing `plainText`, không Zod `.max` code-point semantics. Timestamp phải actual calendar-valid UTC ISO24 exact round-trip; regex không đủ. Strict plain JSON tree kiểm own/nested descriptors, symbol/nonplain/cycle/undefined trước JSON/Zod để getter không execute. Existing shared validators/source-error definitions giữ nguyên.

`M3-PURE-POOL-06` đọc từ register đã admitted rights; parent explicit permission received. Không Node command trước R0-ready; capture actual command/pins/PID/observed start/wait/reap trong own evidence namespace. Latest worker native turn_context339 `gpt-6.1-sol / medium` trước source writes. Prior QUEUED source messages/pool/full-freeze prose là historical; current admission chỉ focused pure TDD, không native/Sharp/audit/providers/HTTP/SDK.

Whole provenance4KiB và private detailIncludingProof8KiB vẫn adapter obligations vì frozen pure shapes không chứa raw provenance/detail; không invent fields để pretend enforcement. Pure request64KiB, proof8KiB và completed-response bytes bounded; full producer normalized projection/order trusted generations remains future integration HOLD. Normalized projection spec canonical sorted full output set gồm targetWidth+generation được Coordinator approve synthetic golden only, không native READY proof.

Before current release top disposition/dependencies retained as historical text:

**Verified current disposition:** `PREPARATION_COMPLETE_SOURCE_REVIEWED` — same High reviewer trả `PASS_PREPARATION_SOURCE_ONLY`, hai Required P2 closed, không finding mới; [final receipt](#final-preparation-source-review--verified). Bốn file chuẩn bị Proposed contract và synthetic RED candidates; không parser/evaluator/terminal proof builder được triển khai. Đây chỉ là hoàn tất phase PREPARATION, không hoàn tất slice/product functionality. Dependent implementation `WAIT_MEDIA_BINDING_FREEZE`; Node tests `NOT_RUN_QUEUED`, không slot nào tiêu thụ.

**Current dependency:** [Coordinator ACK / bounded pure core](#coordinator-ack--bounded-pure-core-proposed) đã nhận; pending C0 recheck/golden result để freeze bounded seven-field core/trusted digests/UID authorities. Current `M3-PURE-POOL-04` cấp QA+C0; rights `QUEUED_CORE_BINDING_FREEZE`. Prior pool/full-integration freeze wording bên dưới là historical handoffs, không current authority.

**Current next action:** sau C0 result, Coordinator freeze bounded pure core và gửi concrete rights source release + Node admission. CORE không cần đợi full CREATE/PART engine hoặc producer integration freeze; native READY/evidence/tool/recipe producer normalization vẫn `FUTURE_INTEGRATION_HOLD`. ACK không là source release hoặc test slot.


### Actual RED and control HOLD — Verified

Evidence `.local/test-outputs/m3/parallel-rights-01/core-45b53c0f-5705-4ed8-b782-778a045d1fb1/red.result.json`: pinned Node PID40169, `communicate` returned/reaped exit1, elapsed0.249785s;151 tests0pass151fail0skip0todo. Failures are actual missing planned exports before implementation; intended ApiError negative assertions did not pass on TypeError. Command pinnedNode `--max-old-space-size=256 --test --test-concurrency=1 --test-timeout=60000 tests/media-rights-contract.test.mjs tests/media-rights-policy.test.mjs`; C0 pin37aa...d00d and own4pins before/after equal.

**LOG_CAP_NOT_ENFORCED:** actual stdout280149bytes; retained65536bytes/truncated, stderr0. `communicate` buffered beyond admitted64KiB ceiling; truncating stored log did not enforce runtime output ceiling. RED run/counts/exit remain evidence, log control NOT PASS. Preserve old receipt/stdout/stderr unchanged; no RED rerun required. Coordinator CONTROL HOLD received before any GREEN/static Node command; no such command started. RED process reaped, no owned Node process in-flight; OS-wide other-process absence Unknown.

Current implementation source has strict seven-field schemas and parse/proof/evaluate authored under frozen core; no GREEN claim. Coordinator recorded `M3-RIGHTS-PROOF-CONTEXT-CLARIFICATION-01`: public proof validator strict4 projection, evaluator strict10 deriving4; no fallback/recursion/export expansion. High source correction: fresh terminal intent from another non-self reviewer validates stored historical checker/binding/state/digest then409; replay still binds checker to current actor and rejects different checker500. Added separate APPROVED/REJECTED fresh-reviewer vectors; existing replaydifferentchecker vector preserved. These two new tests not yet executed; prior RED151 is preserved historical test pin, current count not claimed before run.

Required repair is native-free evidence-only runner/reporter with streaming observed byte ceilings, per-file60s wall and cumulative300s group, own process/session identity before signals, retained bounded diagnostic and final cumulative summary only. No unbounded communicate buffers. Harness authoring authorized for concrete plan/hash/High review, no execution until explicit renewed Coordinator release. Slot returned by parent while review pending; no automatic repeat. Normative producer/provenance/detail obligations unchanged; no extra application source or raw adapter schema.

### Bounded GREEN control repair plan — authored, NOT_RUN

Coordinator `M3-RIGHTS-OUTPUT-CAP-REPAIR-01` giữ next GREEN CONTROL HOLD, source authoring approved; rights slot đã RETURNED, không Node in-flight. Evidence-only controls được author trong existing run namespace, không application source:

- `supervise.py` SHA256 `63ee6762e2407c9e98313688e2113e9ef3a2535c8c205db3fa1a66fa8c199c9e`
- `compact-reporter.mjs` SHA256 `0498a3c9c301fe7b12af06839246d9d6e770905d689f3eed2c358fc4f9e89148`
- `control-plan.json`: exact argv/pins/caps/release HOLD manifest; final hash handoff riêng.

`supervise.py` chỉ spawn own pinned Node commands tuần tự. Dedicated session PID=PGID; before every command verify own4paths+C0+Node+reporter/supervisor pins. stdout/stderr dùng selectors, each read<=4096B, no `communicate`. Cumulative whole-group mỗi stream retains/accepts<=65536B; crossing observed ceiling lập tức stops only verified unreaped Popen-owned PID/session group. SIGTERM, grace0.5s, guarded SIGKILL trước reap; nếu kernel PID/PGID/session identity không xác minh được =>`CONTROL_OWNERSHIP_UNKNOWN`, không foreign signal hoặc command kế tiếp. PID/start observation/wait/reap/signals/outcome/source-before-after ghi riêng mỗi command.

Actual60s WALL mỗi separate Node file/static command và cumulative300s group, thêm Node `--test-timeout=60000` cho test subprocess; timeout triggers same guarded stop. Stop/cap/identity/summary error không retry hoặc báo aggregate PASS; killed/controlled runs aggregateUnknown. Bounded drains max3s, reap max2s after control; unknown reap/EOF giữ Unknown. Không kill existing/unknown processes hoặc claim OS-wide process-group absence.

Compact native-free reporter giữ bounded actual failure name/errorcode/message, không raw huge stack. Chỉ final `test:summary` với `data.file===undefined` sinh typed cumulative `counts`/`success`; không doublecount per-file summary, không suy counts từ dot output. Supervisor validates nonnegative integer counts, success boolean, nonempty test count và exit/count consistency. [Official Node22.23.3 summary contract](https://nodejs.org/download/release/v22.23.3/docs/api/test.html#event-testsummary) đã đọc; report fields `counts`, không invented `counters`. [Pinned CLI flags](https://nodejs.org/download/release/v22.23.3/docs/api/cli.html) là source cho heap/timeouts; parent đã verify flags. Reporter không đổi cases/assertions; High-authorized two historical-other-reviewer vectors là source repair trước current plan, không suppression.

Proposed exact GREEN argv, CWD `pinky-lamb-cms/`, absolute pinned NODE như prior receipt, REPORTER exact run-namespace path:

```text
NODE --max-old-space-size=256 --test --test-concurrency=1 --test-timeout=60000 --test-reporter=REPORTER tests/media-rights-contract.test.mjs
NODE --max-old-space-size=256 --test --test-concurrency=1 --test-timeout=60000 --test-reporter=REPORTER tests/media-rights-policy.test.mjs
NODE --max-old-space-size=256 --check contracts/media-rights.mjs
NODE --max-old-space-size=256 --check tests/media-rights-contract.test.mjs
NODE --max-old-space-size=256 --check tests/media-rights-policy.test.mjs
NODE --max-old-space-size=256 node_modules/eslint/bin/eslint.js --no-fix contracts/media-rights.mjs
NODE --max-old-space-size=256 node_modules/eslint/bin/eslint.js --no-fix tests/media-rights-contract.test.mjs
NODE --max-old-space-size=256 node_modules/eslint/bin/eslint.js --no-fix tests/media-rights-policy.test.mjs
```

Nonzero test/static/control result stops batch without automatic repeats. Only explicit renewed Coordinator GREEN release/readmission after affected High exact-control/source review can activate manifest. Current repair/source NOT_RUN; no syntax/lint/native/HTTP/SDK/probe command executed after HOLD. Two test files expect current153 authored cases but actual counts remain Unknown until typed run result; original RED151 stays original receipt.

Current source pins for control/source review: `contracts/media-rights.mjs` `d90c1c27aede2043b24ec1a0d31df6c1a16aba3098547c3b485c5758ef0a21ba`; contract tests `c32d78b97169ab332df6df3f3f78a984d4429d0e58d6bffa400185080c8e66e4`; policy tests `2bd123d0662ebca5f226fb4b81193913e86e033b3dd1949de341d550b370f7b3`. C0 normative pin37aa...d00d unchanged. Public proof authority projection strict4 and evaluator strict10 deriving4 follows recorded `M3-RIGHTS-PROOF-CONTEXT-CLARIFICATION-01`. Source/library date/Unicode/cap behavior chưa GREEN, no producer integration claim.

### Affected control P2 repair — authored, awaiting High/release

Parent High functional review: current three application sources `PASS_SOURCE_ONLY`, Required0 at frozen d90c...21ba/c32d...66e4/2bd1...f7b3 pins; behavior vẫn chưa GREEN. Three control P2s corrected without changing current153 cases or functional sources:

1. Supervisor không dùng mutable manifest `releaseState` tự cấp quyền. Đọc actual Coordinator register decision `M3-RIGHTS-GREEN-CONTROL-RELEASE-01 v1`, status `COORDINATOR_APPROVED`, authority `HUMAN_DELEGATED_COORDINATOR_APPROVAL`, owner rights thread. External `approved_plan:{path,sha256}` phải bằng exact relative plan path và SHA256 raw plan bytes. External `commands_sha256` khóa exact eight command records bằng UTF8 JSON `sort_keys=True`, `separators=(',',':')`, `ensure_ascii=False`; manifest caps và release caps phải bằng fixed controls, commands bằng hardcoded owned argv. Current rights admission và latest `M3-PURE-POOL-*` phải khớp `admission_decision_id`/admitted rights. Không fallback/stripping hoặc circular plan-selfhash; pending template trong manifest không là authority.
2. Preopen log files/selector trước spawn. Guarded try/except/finally bao post-spawn setup, read/write, snapshots, wait/reap và resource cleanup; mọi lỗi giữ bounded failure receipt và stops/reaps only authenticated unreaped own dedicated-session group. Ownership Unknown => không foreign signal, không next command. Receipt write failure có bounded stdout fallback; no unbounded traceback. Controls/harness chưa được execute để claim cleanup PASS.
3. Reporter cắt UTF16 input prefix trước `Buffer.from`, rồi byte truncate; entire serialized record gồm JSON escaping+newline<=4096B. Bounded failure diagnostic có truncation marker nếu serialized strings cần giảm tiếp. Typed final summary explicit numeric counts/duration/success projection; không raw arbitrary event object hoặc huge stack.

Corrected supervisor SHA256 `1761a5050e211cc67fdaf32bada2d4fa1369e3adb2419ba7ff0dc430ee9f8cc2`; reporter SHA256 `a456c9f56638b6fbf468ec37d708849b3380344b1a389df311f9adfe30d006dd`. Initial controls/manifest giữ `.initial` copies trong same evidence namespace; RED151 receipt/stdout/stderr không đổi. Supervisor Python AST parse valid là authoring-only, không runtime/resource enforcement proof. Own latest native turn_context559 `gpt-6.1-sol / medium` verified before corrections.

Concrete Proposed external release record schema, chỉ Coordinator được ghi register:

```text
{
  id:'M3-RIGHTS-GREEN-CONTROL-RELEASE-01', version:1,
  status:'COORDINATOR_APPROVED', authority:'HUMAN_DELEGATED_COORDINATOR_APPROVAL',
  owner_thread:'01a135ee-96d2-7e51-a189-f19f4e328020',
  approved_plan:{path:'pinky-lamb-cms/.local/test-outputs/m3/parallel-rights-01/core-45b53c0f-5705-4ed8-b782-778a045d1fb1/control-plan.json',sha256:EXTERNAL_FINAL_PLAN_SHA256},
  commands_sha256:EXTERNAL_EXACT_COMMAND_RECORDS_SHA256,
  caps:{readBytes:4096,streamBytesWholeGroup:65536,wallSecondsPerFile:60,wallSecondsWholeGroup:300,heapMiB:256,testConcurrency:1},
  admission_decision_id:CURRENT_LATEST_APPROVED_POOL_ID_WITH_RIGHTS_ADMITTED
}
```

Raw plan contains frozen four-source/C0/Node/control pins and exact argv/caps. Release record references final plan hash after source freeze; plan does not contain its own hash. No self-asserted release flag controls execution. Parent will send corrected exact package to High control review/Coordinator; GREEN/Node/static still HOLD, slot RELEASED. No app source edits, dependency/config/shared/Git writes or new runtime scope from control repair.

### Final bounded rights core — Verified source and unit evidence

Final actual High verdict: `PASS_BOUNDED_RIGHTS_CORE_SOURCE_AND_UNIT_EVIDENCE`, Required0; source/control review reuse đúng frozen pins và direct execution receipt matched. Parent verify actual reviewer latest turn_context line711 High; executing writer own turn_context line662 `gpt-6.1-sol / medium` được xác minh trước batch. Source and unit evidence chỉ chứng minh bounded pure core, không independent runtime fault-control PASS hoặc full CMS acceptance.

Coordinator external record `M3-RIGHTS-GREEN-CONTROL-RELEASE-01 v1` + `M3-PURE-POOL-09` thực sự cấp exact eight commands. External plan seal `c9a40ff44466db0041ebb4c8a10b910f66f9b302ad0d1532e73bd826b7213c9d`, command-record SHA `94284851ab710a497cef8e412ed9f55c58bdd2cdb47cfbf1b13368b57afd955f`. Supervisor đọc unique actual register release/current admission, external plan/argv/caps và exact eight source/control/Node pins trước mỗi spawn; no mutable manifest self-approval. Historical execution doc pin `95de830584e6943dfe2260807c8dabe29d2e677b6ac4b7949759adef99b0421f` giữ nguyên trong sealed plan/receipts; closeout doc mới không được rebaseline vào seal.

Actual execution evidence: `.local/test-outputs/m3/parallel-rights-01/core-45b53c0f-5705-4ed8-b782-778a045d1fb1/green-sealed-01/group-result.json`, SHA256 `9c5741143e1a5b645ab6cde1e7f23c43210a3a89f7e96e7c819e57e5ca37664f`.

| Executed command | Actual result / PID |
| --- | --- |
| Frozen contract tests (compact final typed summary) |66tests/66passed;0failed/skipped/todo/cancelled; exit0; PID43862 reaped |
| Frozen policy tests (compact final typed summary) |87tests/87passed;0failed/skipped/todo/cancelled; exit0; PID43864 reaped |
| Syntax contracts/media-rights.mjs |exit0, empty streams; PID43876 reaped |
| Syntax tests/media-rights-contract.test.mjs |exit0, empty streams; PID43877 reaped |
| Syntax tests/media-rights-policy.test.mjs |exit0, empty streams; PID43878 reaped |
| Existing ESLint nofix contracts/media-rights.mjs |exit0, empty streams; PID43879 reaped |
| Existing ESLint nofix tests/media-rights-contract.test.mjs |exit0, empty streams; PID43880 reaped |
| Existing ESLint nofix tests/media-rights-policy.test.mjs |exit0, empty streams; PID43881 reaped |

Exact argv/caps giữ trong sealed `control-plan.json` và từng command `result.json`; không extra argv/probe hoặc automatic repeat. Total153/153 PASS, whole-group1.601292125s, actual/retained stdout346B (two final summaries173B mỗi file), stderr0B. All eight controls null, signal lists empty, waits reaped và sourceBefore/sourceAfter bằng exact sealed plan pins. No own pending command; parent đã RETURN rights slot trước doc closeout/lengthy review. OS-wide or all-process-group absence không được suy ra từ exact child reaps.

Frozen source/control pins unchanged trong batch và closeout:

- `contracts/media-rights.mjs`: `d90c1c27aede2043b24ec1a0d31df6c1a16aba3098547c3b485c5758ef0a21ba`
- `tests/media-rights-contract.test.mjs`: `c32d78b97169ab332df6df3f3f78a984d4429d0e58d6bffa400185080c8e66e4`
- `tests/media-rights-policy.test.mjs`: `2bd123d0662ebca5f226fb4b81193913e86e033b3dd1949de341d550b370f7b3`
- C0 `contracts/media-v3-contract.mjs`: `37aa05c9f5f66ce8d3940964e05a289a44a733f255f2313cd098a4a14d03d00d`
- Node: `68f4d07ca49e0500cc135c7e0a445093e228e42e126ac22306d045f0a8c2636b`
- `compact-reporter.mjs`: `a456c9f56638b6fbf468ec37d708849b3380344b1a389df311f9adfe30d006dd`
- `supervise.py`: `1761a5050e211cc67fdaf32bada2d4fa1369e3adb2419ba7ff0dc430ee9f8cc2`

Original actual RED151/0pass/151fail exit1 remains original receipt/logs, `LOG_CAP_NOT_ENFORCED`; retained red.result.json SHA `e37bf852ab9b2c5abad78e032ce697566fd29a7421d09d79c3b1f84f3000a12d`. Current153 includes two later High-authorized historical-other-reviewer regression cases; no old RED rerun, no assertion weakening or fake cap PASS.

**NOT_EXERCISED / Unknown:** output overflow stop, SIGTERM/SIGKILL, timeout and exception-cleanup fault branches. Healthy bounded execution does not prove those fault paths; no signals were sent. Source/control review is separate from runtime fault proof.

**NOT_RUN / HOLD:** normalized producer/evidence/tool/recipe/trusted Storage-generation end-to-end adapters, Auth/ACL/membership, backend/routes/transactions/persistence/UI, native processors, emulators, browser, integrated V3/QA composition, CMS acceptance/LOCAL_COMPLETE and cloud/Git. Opaque supplied digests/UIDs không là bytes/custody/authorization evidence. Request/proof pure bounds verified by tests; full provenance4KiB/detailIncludingProof8KiB remain future adapter obligations.

Doc-only closeout giữ all source/control/plan/receipts byte-identical; không Node/static/test/probe rerun hoặc shared-record write. Coordinator là next owner cập nhật ledger và future scope riêng; bounded core complete không cấp automatic continuation. Final doc hash gửi riêng tránh circular self-reference.

Previous current-state text before closeout, retained history:

**Verified current disposition:** actual RED151/151 failed, exit1/reaped; pure functions đã authored nhưng chưa GREEN. `LOG_CAP_NOT_ENFORCED`: REDstdout280149B vượt stream64KiB dù retained log65536B. Old RED evidence giữ nguyên. **CONTROL HOLD** mọi Node/test/static command đến bounded harness/control-review release.

**Current next:** evidence-only streaming runner/reporter repair plan → affected High control review + Coordinator explicit GREEN release/slot → bounded GREEN + scoped static checks. Structural source authority giữ `M3-PURE-RIGHTS-BINDING-01`; producer integration vẫn HOLD. Historical preparation source PASS không là current implementation/behavior PASS.

