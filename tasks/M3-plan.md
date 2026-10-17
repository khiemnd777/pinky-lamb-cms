# CMS-001 v2 — M3 task plan

## Trạng thái hiện hành — đã hoàn tất theo xác nhận của Khiêm

**ĐÃ HOÀN TẤT / CLOSED_BY_HUMAN_CONFIRMATION — 17/10/2026 (Asia/Ho_Chi_Minh).** Xem [xác nhận trực tiếp, phạm vi đóng và bảng trạng thái hiện hành](../../tasks/plan.md). Khiêm xác nhận các plan đã xong và giao chỉ đồng bộ tài liệu, không sửa code hoặc chạy lại kiểm thử.

Các trạng thái chờ duyệt/chưa hoàn tất, checkbox và bước tiếp theo trong phần bên dưới thuộc lịch sử trước xác nhận đóng; không tự mở lại plan/task từ các ghi nhận đó. Giữ nguyên bằng chứng PASS/FAIL/NOT_RUN, cờ kỹ thuật và giới hạn đã ghi nhận. Lần đồng bộ này không xác minh runtime, không ghi nhận release hoặc cấp quyền thực thi mới.

## Nội dung lịch sử trước xác nhận đóng


**Bundle revision 1 / PLANNED_WAIT_APPROVAL.** Không task nào đang In progress; M3 implementation NOT_STARTED. [Proposal](../docs/CMS-001-v2-M3-PROPOSAL.md) chứa business/state/caps/AC; [scope](../../approvals/CMS-001-v2-M3.scope.json) pin paths/tasks/base. User đã Accepted M2, chỉ yêu cầu planning M3.

## 1. Quyền, owners và thứ tự

Actual High: reasoning/planning/docs/review/audit; actual Medium: coding/generate native fixtures/viết và chạy tests. Không code ở High. Một chủ ghi mỗi file; task reuse files chạy tuần tự, implementation writer dừng trước QA/reviewer. No recursive agents, không nhiều test/emulator/worker runners đồng thời. Independent High read-only; human silence/technical PASS không Approved.

Dependency graph mặc định task sau phụ thuộc task trước để một writer và một runtime; có thể chỉ chạy read-only độc lập. Mỗi task ≤5 source/doc files; generated evidence không cho giấu source mới ngoài union. Đổi material scope/dependencies/caps cần revised bundle/Approved.

M2 app/config/historical docs hiện tại frozen trước Approved. Sau Approved M3 chỉ paths có trong task union được sửa; danh sách app paths mới không có nghĩa đã tạo. Không reset/reseed/delete historical data.

## 2. Tasks và checkpoints

### CMS-M3-00 — Đối chiếu Approved/base và mở execution record

**Owner:** HIGH; **status:** PLANNED_WAIT_APPROVAL. **Prerequisite:** Direct human Approved M3 + accepted M2 base.

**Files (repo-relative; một writer):**

- `pinky-lamb-cms/docs/M3-REVIEW.md` — HIGH
- `approvals/CMS-001-v2-M3-REGISTER.json` — HIGH

**Done:** Direct human Approved đúng bundle còn mở; accepted M1/M2 và base/hash khớp; ghi authority thật trước app writes.

**AC:** M3-AC18.

### CMS-M3-01 — Pin workspace dependencies và native tool inventory

**Owner:** MEDIUM; **status:** PLANNED_WAIT_APPROVAL. **Prerequisite:** CMS-M3-00

**Files (repo-relative; một writer):**

- `pinky-lamb-cms/package.json` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/package-lock.json` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/cms-api/package.json` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/contracts/media-tool-lock.json` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/docs/M3-DEPENDENCIES.md` — MEDIUM_IMPLEMENTATION

**Done:** Chỉ thêm Sharp0.35.5/pdf-lib1.17.1; inspect package/lifecycle/integrity trước approved local install. Native Poppler26.05.0 bundled pin binary/libs, FFmpeg9.0.2 official source/signature local build; audit exact transitive/build/config/licences; existing version pins không đổi ngoài closure của additions.

**AC:** M3-AC01, M3-AC16, M3-AC17.

### CMS-M3-02 — Tool capability audit và resource boundary

**Owner:** MEDIUM; **status:** PLANNED_WAIT_APPROVAL. **Prerequisite:** CMS-M3-01

**Files (repo-relative; một writer):**

- `pinky-lamb-cms/scripts/media-tool-audit.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/tests/media-tools.local.test.mjs` — MEDIUM_QA

**Done:** Actual version/hash/Node22, VideoToolbox encode, local protocol/no external refs, timeout/group reap/output/RSS observations; deterministic small image/PDF/video outputs; residual native risk explicit. Không tool fallback hoặc global install.

**AC:** M3-AC01, M3-AC04, M3-AC05, M3-AC06, M3-AC17.

### CMS-M3-03 — Storage emulator và worker guard

**Owner:** MEDIUM; **status:** PLANNED_WAIT_APPROVAL. **Prerequisite:** CMS-M3-02

**Files (repo-relative; một writer):**

- `pinky-lamb-cms/infra-local/firebase.json` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/infra-local/storage.rules` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/scripts/local-guard.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/tests/local-guard.test.mjs` — MEDIUM_QA
- `pinky-lamb-cms/infra-local/firestore.indexes.json` — MEDIUM_IMPLEMENTATION

**Done:** Storage9199 demo/loopback, logical fixed bucket; no provisioning/live host/ADC; new worker/export modes narrow; JSON64KiB giữ; no reseed/reset existing emulators.

**AC:** M3-AC01, M3-AC02, M3-AC18.

### CMS-M3-04 — Private file routes và Blob feasibility

**Owner:** MEDIUM; **status:** PLANNED_WAIT_APPROVAL. **Prerequisite:** CMS-M3-03

**Files (repo-relative; một writer):**

- `pinky-lamb-cms/vite.config.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/eslint.config.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/tests/media-private-files.local.test.mjs` — MEDIUM_QA
- `pinky-lamb-cms/admin/config-local.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/admin/index.html` — MEDIUM_IMPLEMENTATION

**Done:** Deny new tool/cache/quarantine/private routes incl @fs, traversal, symlink; actual opaque sandbox Blob image/video read test giữ empty sandbox. Nếu không đạt thì chặn dependent preview. Parent admin CSP minimal img-src blob:/media-src blob: chuẩn bị trước feasibility, test đúng parent policy; v1/v2 child CSP giữ restrictive.

**AC:** M3-AC01, M3-AC13, M3-AC18.

### CMS-M3-05 — Contracts media/upload/rights/error

**Owner:** MEDIUM; **status:** PLANNED_WAIT_APPROVAL. **Prerequisite:** CMS-M3-04

**Files (repo-relative; một writer):**

- `pinky-lamb-cms/contracts/media.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/contracts/media-upload.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/contracts/media-rights.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/contracts/errors.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/tests/media-contract.test.mjs` — MEDIUM_QA

**Done:** Strict states/keys/kinds/caps/IDs/part receipts/rights binds; server-owned fields rejected; errors compatible; no LEGACY_READY spoof.

**AC:** M3-AC03, M3-AC08, M3-AC11.

### CMS-M3-06 — Media-aware typed builders giữ legacy defaults

**Owner:** MEDIUM; **status:** PLANNED_WAIT_APPROVAL. **Prerequisite:** CMS-M3-05

**Files (repo-relative; một writer):**

- `pinky-lamb-cms/contracts/hero.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/contracts/site-settings.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/contracts/site-records.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/contracts/site.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/tests/media-content-contract.test.mjs` — MEDIUM_QA

**Done:** Explicit schema3 media resolver cho slots; schema1/2 exact semantics/hashes giữ; unknown refs/kind mismatch và aggregate overbudget fail. New VIDEO poster reference same assetId + derivativeRole POSTER (legacy IMAGE poster unchanged); server duration/hash authority. All publicCredentialPage incl hidden bounded by selected sanitizedPDF pageCount.

**AC:** M3-AC10, M3-AC11.

### CMS-M3-07 — V3 draft/version/hash contracts

**Owner:** MEDIUM; **status:** PLANNED_WAIT_APPROVAL. **Prerequisite:** CMS-M3-06

**Files (repo-relative; một writer):**

- `pinky-lamb-cms/contracts/site-media.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/contracts/site-draft.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/contracts/content-version.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/tests/media-version.test.mjs` — MEDIUM_QA

**Done:** home-v3/schema3/template m3-site-media-v1; canonical hash selected+hidden manifest; measured budgets/envelope version dispatch; independently computed fixtures. Same-version VIDEO poster role pin and PDF page bounds are part of whole-content/hash contract.

**AC:** M3-AC10, M3-AC11, M3-AC12.

**High checkpoint A — tools/local boundary/strict contracts; Unknown prerequisites phải có evidence hoặc blocked trước pipeline.** Root + independent High review evidence; unresolved finding chặn dependent task. Không tự cấp human approval.

### CMS-M3-08 — Storage byte provider và transactional quota

**Owner:** MEDIUM; **status:** PLANNED_WAIT_APPROVAL. **Prerequisite:** CMS-M3-07

**Files (repo-relative; một writer):**

- `pinky-lamb-cms/cms-api/media-storage.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/cms-api/media-quota.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/tests/media-storage.integration.test.mjs` — MEDIUM_QA

**Done:** Actual Storage get/write generation+SHA and bounded stream; fixed keys; 2GiB reservations incl retained/orphan bytes; failure between write/receipt recoverable.

**AC:** M3-AC02, M3-AC03, M3-AC07.

### CMS-M3-09 — Intent và method/action registration

**Owner:** MEDIUM; **status:** PLANNED_WAIT_APPROVAL. **Prerequisite:** CMS-M3-08

**Files (repo-relative; một writer):**

- `pinky-lamb-cms/cms-api/media-intents.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/cms-api/authorization.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/cms-api/routes.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/admin/auth.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/tests/media-intents.integration.test.mjs` — MEDIUM_QA

**Done:** Exact actor/method/path/query CORS/authz allowlists; paged selected API client; idempotent create/cancel/current membership; no public upload URL.

**AC:** M3-AC02, M3-AC03.

### CMS-M3-10 — Binary chunk transport

**Owner:** MEDIUM; **status:** PLANNED_WAIT_APPROVAL. **Prerequisite:** CMS-M3-09

**Files (repo-relative; một writer):**

- `pinky-lamb-cms/cms-api/media-parts.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/cms-api/index.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/cms-api/routes.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/tests/media-parts.integration.test.mjs` — MEDIUM_QA
- `pinky-lamb-cms/scripts/local-guard.mjs` — MEDIUM_IMPLEMENTATION

**Done:** 4MiB raw parser route riêng, actual lengths/hash and offsets; reject before expensive write; duplicate same bytes replay/different409; concurrency/orphan receipt fault injection. Local guard parser seam chỉ exact PUT /api/cms/media/{id}/parts/{index} nhận4MiB; mọi route khác64KiB; guarded helper/source SHA-bound runtime seam giữ.

**AC:** M3-AC02, M3-AC03, M3-AC07.

### CMS-M3-11 — Completion và persistent job claims

**Owner:** MEDIUM; **status:** PLANNED_WAIT_APPROVAL. **Prerequisite:** CMS-M3-10

**Files (repo-relative; một writer):**

- `pinky-lamb-cms/cms-api/media-jobs.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/cms-api/media-intents.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/cms-api/routes.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/tests/media-jobs.integration.test.mjs` — MEDIUM_QA

**Done:** Trusted all parts/total bytes; one queued job/CAS request replay; no incomplete success, stale job finalization; max2 retry attempts.

**AC:** M3-AC03, M3-AC07.

### CMS-M3-12 — Worker lifecycle và owned scratch

**Owner:** MEDIUM; **status:** PLANNED_WAIT_APPROVAL. **Prerequisite:** CMS-M3-11

**Files (repo-relative; một writer):**

- `pinky-lamb-cms/cms-api/media-worker.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/scripts/media-worker-local.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/scripts/local-guard.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/package.json` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/tests/media-worker.integration.test.mjs` — MEDIUM_QA

**Done:** Guarded npm media:worker:local; single persistent lease/heartbeat, exact children timeout/cleanup, retained evidence, bounded filesystem paths; no native sandbox claim.

**AC:** M3-AC01, M3-AC07, M3-AC17.

**High checkpoint B — upload/quota/parts/jobs/worker exact ACL và concurrent/fault cases.** Root + independent High review evidence; unresolved finding chặn dependent task. Không tự cấp human approval.

### CMS-M3-13 — Image processor

**Owner:** MEDIUM; **status:** PLANNED_WAIT_APPROVAL. **Prerequisite:** CMS-M3-12

**Files (repo-relative; một writer):**

- `pinky-lamb-cms/cms-api/media-images.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/tests/fixtures/media-images.mjs` — MEDIUM_QA
- `pinky-lamb-cms/tests/media-images.test.mjs` — MEDIUM_QA

**Done:** Native JPEG/PNG/WebP full decode/reencode metadata strip, orientation/alpha/dimensions no upscale; spoof/animation/overcaps/truncated output verified.

**AC:** M3-AC04.

### CMS-M3-14 — PDF processor

**Owner:** MEDIUM; **status:** PLANNED_WAIT_APPROVAL. **Prerequisite:** CMS-M3-13

**Files (repo-relative; một writer):**

- `pinky-lamb-cms/cms-api/media-pdf.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/tests/fixtures/media-pdf.mjs` — MEDIUM_QA
- `pinky-lamb-cms/tests/media-pdf.test.mjs` — MEDIUM_QA

**Done:** Actual Poppler bounded full-page render; new raster PDF writer only; safe previews/PDF output reinspection, encrypted/malformed/active component fixtures; 1/48pages and caps.

**AC:** M3-AC05.

### CMS-M3-15 — Video processor

**Owner:** MEDIUM; **status:** PLANNED_WAIT_APPROVAL. **Prerequisite:** CMS-M3-14

**Files (repo-relative; một writer):**

- `pinky-lamb-cms/cms-api/media-video.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/tests/fixtures/media-video.mjs` — MEDIUM_QA
- `pinky-lamb-cms/tests/media-video.test.mjs` — MEDIUM_QA

**Done:** Actual ffprobe/full ffmpeg decode/transcode MP4/poster, allowed streams/protocols, duration/encode limits; malformed/oversize/noaudio fixtures; no remux fallback.

**AC:** M3-AC06.

### CMS-M3-16 — READY recovery và immutable safe cache

**Owner:** MEDIUM; **status:** PLANNED_WAIT_APPROVAL. **Prerequisite:** CMS-M3-15

**Files (repo-relative; một writer):**

- `pinky-lamb-cms/cms-api/media-cache.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/cms-api/media-recovery.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/cms-api/media-worker.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/tests/media-recovery.integration.test.mjs` — MEDIUM_QA
- `pinky-lamb-cms/tests/media-cache.test.mjs` — MEDIUM_QA

**Done:** READY only exact Storage+local-cache receipt; crash boundaries/lease theft/stale attempts/quota reconcile; explicit exact-cache rehydrate; no link/path escapes or overwrite ready version.

**AC:** M3-AC07, M3-AC15, M3-AC17.

**High checkpoint C — ba native processors/READY/cache/recovery; native residual explicit.** Root + independent High review evidence; unresolved finding chặn dependent task. Không tự cấp human approval.

### CMS-M3-17 — Non-self rights quyết định terminal

**Owner:** MEDIUM; **status:** PLANNED_WAIT_APPROVAL. **Prerequisite:** CMS-M3-16

**Files (repo-relative; một writer):**

- `pinky-lamb-cms/cms-api/media-rights.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/cms-api/authorization.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/cms-api/routes.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/tests/media-rights.integration.test.mjs` — MEDIUM_QA

**Done:** APPROVED/REJECTED binds exact version/original/output/tool/evidence; uploader/evidence author self denied incl Owner; conflicting decision/replay transaction; rights separate source.

**AC:** M3-AC08, M3-AC12.

### CMS-M3-18 — Library, archive và safe version reads

**Owner:** MEDIUM; **status:** PLANNED_WAIT_APPROVAL. **Prerequisite:** CMS-M3-17

**Files (repo-relative; một writer):**

- `pinky-lamb-cms/cms-api/media-library.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/cms-api/authorization.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/cms-api/routes.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/tests/media-library.integration.test.mjs` — MEDIUM_QA
- `pinky-lamb-cms/infra-local/firestore.indexes.json` — MEDIUM_IMPLEMENTATION

**Done:** Default20/max50 stable createdAt+ID source query; filter-bound validated cursor; ACL before results; archive does not delete/retarget snapshots; selected-only metadata.

**AC:** M3-AC02, M3-AC09.

### CMS-M3-19 — Protected derivative byte/Range API

**Owner:** MEDIUM; **status:** PLANNED_WAIT_APPROVAL. **Prerequisite:** CMS-M3-18

**Files (repo-relative; một writer):**

- `pinky-lamb-cms/cms-api/media-reads.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/cms-api/routes.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/cms-api/index.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/tests/media-reads.integration.test.mjs` — MEDIUM_QA

**Done:** READY current member, pinned generation/hash/safe MIME, no-store/nosniff, bounded full/read and single video Range206/416; no original endpoint/download token.

**AC:** M3-AC02, M3-AC13, M3-AC15.

**High checkpoint D — terminal rights/paged library/archive/private bytes and Range.** Root + independent High review evidence; unresolved finding chặn dependent task. Không tự cấp human approval.

### CMS-M3-20 — Explicit CURRENT v2→v3 import

**Owner:** MEDIUM; **status:** PLANNED_WAIT_APPROVAL. **Prerequisite:** CMS-M3-19

**Files (repo-relative; một writer):**

- `pinky-lamb-cms/cms-api/import-site-media.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/cms-api/import-site.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/cms-api/routes.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/tests/media-import.integration.test.mjs` — MEDIUM_QA
- `pinky-lamb-cms/cms-api/index.mjs` — MEDIUM_IMPLEMENTATION

**Done:** Owner once-only CAS import preserves current v2 including Hero/SEO; immutable source receipt; no home/home-v2/history reseed or stale source fallback.

**AC:** M3-AC10.

### CMS-M3-21 — V3 Draft manual Save/budget

**Owner:** MEDIUM; **status:** PLANNED_WAIT_APPROVAL. **Prerequisite:** CMS-M3-20

**Files (repo-relative; một writer):**

- `pinky-lamb-cms/cms-api/site-media-drafts.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/cms-api/site-drafts.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/cms-api/routes.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/tests/media-drafts.integration.test.mjs` — MEDIUM_QA

**Done:** Partial save/replay/CAS keeps M2 behavior; trusted slot/reference validation, measured budget; READY pending rights allowed Draft, archived change warnings; no autosave.

**AC:** M3-AC10, M3-AC11.

### CMS-M3-22 — V3 immutable Snapshot/media manifest

**Owner:** MEDIUM; **status:** PLANNED_WAIT_APPROVAL. **Prerequisite:** CMS-M3-21

**Files (repo-relative; một writer):**

- `pinky-lamb-cms/cms-api/site-media-snapshots.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/cms-api/site-snapshots.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/cms-api/snapshots.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/tests/media-snapshots.integration.test.mjs` — MEDIUM_QA

**Done:** Trusted exact selected/hidden READY nonarchived refs+rights capture; immutable generations/hashes; concurrent archive/state/source revision rejects; v1/v2 decode/replay compatible.

**AC:** M3-AC08, M3-AC10, M3-AC11.

### CMS-M3-23 — V3 factual source dispatch

**Owner:** MEDIUM; **status:** PLANNED_WAIT_APPROVAL. **Prerequisite:** CMS-M3-22

**Files (repo-relative; một writer):**

- `pinky-lamb-cms/contracts/source-checks.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/cms-api/source-checks.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/cms-api/site-reviews.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/tests/media-source-checks.integration.test.mjs` — MEDIUM_QA

**Done:** Existing factual exact-value requirements preserved incl hidden; uploaded credential media not accepted as new factual evidence; rights proof never SOURCE_CHECKED. Asset-only reference replacements in existing factual groups remain CHANGED and require actual fixed-catalog SOURCE_CHECKED or block; text unchanged/rights approval cannot bypass.

**AC:** M3-AC10, M3-AC12.

### CMS-M3-24 — V3 terminal review and QA proof envelope

**Owner:** MEDIUM; **status:** PLANNED_WAIT_APPROVAL. **Prerequisite:** CMS-M3-23

**Files (repo-relative; một writer):**

- `pinky-lamb-cms/contracts/media-qa.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/cms-api/site-media-reviews.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/cms-api/reviews.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/tests/media-reviews.integration.test.mjs` — MEDIUM_QA
- `pinky-lamb-cms/cms-api/routes.mjs` — MEDIUM_IMPLEMENTATION

**Done:** Non-self Snapshot review exact content/media/source/rights; strict envelope3≤2MiB and bounded proof sets; no stale latest references; v1/2≤1MiB unaffected.

**AC:** M3-AC08, M3-AC11, M3-AC12, M3-AC15.

**High checkpoint E — CURRENT v3 lineage/Save/Snapshot/source/rights terminal proofs và compatibility.** Root + independent High review evidence; unresolved finding chặn dependent task. Không tự cấp human approval.

### CMS-M3-25 — V3 renderer/public projection

**Owner:** MEDIUM; **status:** PLANNED_WAIT_APPROVAL. **Prerequisite:** CMS-M3-24

**Files (repo-relative; một writer):**

- `pinky-lamb-cms/preview/site-media-renderer.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/preview/site-public-data.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/preview/site-sections.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/tests/media-renderer.test.mjs` — MEDIUM_QA

**Done:** Shared typed layout, fixed legacy defaults; hashed safe-media projection only, no provenance/UID/private paths; PDF/video no preload/autoplay, alt/dimensions/hidden bytes semantics.

**AC:** M3-AC10, M3-AC11, M3-AC13, M3-AC15.

### CMS-M3-26 — Authenticated media fetch/object URL ownership

**Owner:** MEDIUM; **status:** PLANNED_WAIT_APPROVAL. **Prerequisite:** CMS-M3-25

**Files (repo-relative; một writer):**

- `pinky-lamb-cms/admin/media-preview.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/admin/auth.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/preview/preview.css` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/tests/media-preview.local.test.mjs` — MEDIUM_QA

**Done:** Parent verifies byte size/SHA/MIME before Blob; retained Blob64MiB + one inflight64MiB (logical, not RSS); parent PDF page/download controls and lazy video; all awaits bound to session+resource generation; logout/deactivate abort+revoke and late results cannot recreate.

**AC:** M3-AC13, M3-AC14.

### CMS-M3-27 — Saved v3 Draft/Snapshot private preview

**Owner:** MEDIUM; **status:** PLANNED_WAIT_APPROVAL. **Prerequisite:** CMS-M3-26

**Files (repo-relative; một writer):**

- `pinky-lamb-cms/admin/preview.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/preview/site-renderer.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/tests/media-private-preview.local.test.mjs` — MEDIUM_QA

**Done:** Version-bound preview calls new byte provider; empty sandbox, exact minimal blob CSP v3 only; original/source files unavailable; legacy preview/CSP stable.

**AC:** M3-AC10, M3-AC13, M3-AC14.

**High checkpoint F — renderer/private Blob/CSP/lifecycle/security theo bytes thực.** Root + independent High review evidence; unresolved finding chặn dependent task. Không tự cấp human approval.

### CMS-M3-28 — Vietnamese media library/upload/rights UI

**Owner:** MEDIUM; **status:** PLANNED_WAIT_APPROVAL. **Prerequisite:** CMS-M3-27

**Files (repo-relative; một writer):**

- `pinky-lamb-cms/admin/media-library.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/admin/media-upload.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/admin/media-rights.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/admin/index.html` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/admin/admin.css` — MEDIUM_IMPLEMENTATION

**Done:** Paged library, chunk progress/retry/cancel/error quota, safe preview and nonself rights decision; long names/mobile keyboard/focus; UI never marks rights by upload alone.

**AC:** M3-AC03, M3-AC08, M3-AC09, M3-AC13.

### CMS-M3-29 — Kind-aware picker

**Owner:** MEDIUM; **status:** PLANNED_WAIT_APPROVAL. **Prerequisite:** CMS-M3-28

**Files (repo-relative; một writer):**

- `pinky-lamb-cms/admin/media-picker.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/admin/site-fields.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/tests/media-picker.local.test.mjs` — MEDIUM_QA

**Done:** M1/v2 legacy picker stable; v3 backend paged kind filtering, READY pending rights warning and no archived selections; avoid loadfull library.

**AC:** M3-AC09, M3-AC10, M3-AC11.

### CMS-M3-30 — V3 editor shell/work/services integration

**Owner:** MEDIUM; **status:** PLANNED_WAIT_APPROVAL. **Prerequisite:** CMS-M3-29

**Files (repo-relative; một writer):**

- `pinky-lamb-cms/admin/site-editor.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/admin/site-work-editor.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/admin/site-services-editor.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/tests/media-editor.local.test.mjs` — MEDIUM_QA

**Done:** Explicit initialized v3 selection/manual CAS/dirty guards, actual selected asset metadata/budget; preserve all M2 records/visibility/source groups.

**AC:** M3-AC09, M3-AC10, M3-AC11.

### CMS-M3-31 — V3 Settings/About/IP/Contact slots

**Owner:** MEDIUM; **status:** PLANNED_WAIT_APPROVAL. **Prerequisite:** CMS-M3-30

**Files (repo-relative; một writer):**

- `pinky-lamb-cms/admin/site-settings-editor.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/admin/site-about-ip-editor.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/admin/site-contact-footer-editor.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/tests/media-editor-sections.local.test.mjs` — MEDIUM_QA

**Done:** Hero/SEO/header/client/work/gallery/IP/contact IMAGE, credential sanitizedPDF, reel VIDEO+server poster/duration; source assertions separate; long text and errors reachable.

**AC:** M3-AC10, M3-AC11, M3-AC13.

### CMS-M3-32 — Snapshot rights/source review UI and download

**Owner:** MEDIUM; **status:** PLANNED_WAIT_APPROVAL. **Prerequisite:** CMS-M3-31

**Files (repo-relative; một writer):**

- `pinky-lamb-cms/admin/review.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/admin/source-review.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/tests/media-review.local.test.mjs` — MEDIUM_QA

**Done:** Exact Snapshot/source/rights status display and proof3 download; no evidence selfdecision bypass; approved draft != new unsaved revisions; historical v1/v2 views compatible.

**AC:** M3-AC08, M3-AC10, M3-AC12, M3-AC14.

### CMS-M3-33 — Offline v3 safe export

**Owner:** MEDIUM; **status:** PLANNED_WAIT_APPROVAL. **Prerequisite:** CMS-M3-32

**Files (repo-relative; một writer):**

- `pinky-lamb-cms/scripts/export-site-media-local.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/scripts/export-local.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/scripts/local-guard.mjs` — MEDIUM_IMPLEMENTATION
- `pinky-lamb-cms/tests/media-export.test.mjs` — MEDIUM_QA
- `pinky-lamb-cms/tests/fixtures/media-tamper.json` — MEDIUM_QA

**Done:** Envelope3+immutable cache rehash trusted selected outputs; no network credentials/sourceoriginal/private projection; path/links/output preflight; per-file atomic and v1/v2 compatible.

**AC:** M3-AC10, M3-AC11, M3-AC15.

**High checkpoint G — complete media UI/slot workflow và offline public-only exporter.** Root + independent High review evidence; unresolved finding chặn dependent task. Không tự cấp human approval.

### CMS-M3-34 — Rules/ACL/guard abuse and compatibility

**Owner:** MEDIUM; **status:** PLANNED_WAIT_APPROVAL. **Prerequisite:** CMS-M3-33

**Files (repo-relative; một writer):**

- `pinky-lamb-cms/tests/acl.rules.test.mjs` — MEDIUM_QA
- `pinky-lamb-cms/tests/media-abuse.integration.test.mjs` — MEDIUM_QA
- `pinky-lamb-cms/tests/m1-compat.integration.test.mjs` — MEDIUM_QA

**Done:** Anonymous/unknown/inactive/unverified/self/Publisher/role-tamper directSDK/API denial, real hosts/missing runtime, multipart oversize and malformed cursor; old hashes/history exact.

**AC:** M3-AC01, M3-AC02, M3-AC03, M3-AC08, M3-AC10, M3-AC18.

### CMS-M3-35 — Independent digest/privacy/resource oracles

**Owner:** MEDIUM; **status:** PLANNED_WAIT_APPROVAL. **Prerequisite:** CMS-M3-34

**Files (repo-relative; một writer):**

- `pinky-lamb-cms/tests/media-hash.test.mjs` — MEDIUM_QA
- `pinky-lamb-cms/tests/media-public.local.test.mjs` — MEDIUM_QA
- `pinky-lamb-cms/tests/media-native-abuse.local.test.mjs` — MEDIUM_QA

**Done:** Independent manifests/proof digests and safe output bytes; native boundary bombs/timeouts/externalref/scratch/process reap; served artifact privacy/JS-off/on and cache loss/tamper.

**AC:** M3-AC04, M3-AC05, M3-AC06, M3-AC07, M3-AC11, M3-AC15.

### CMS-M3-36 — Authenticated full M3 workflow/browser matrix

**Owner:** MEDIUM; **status:** PLANNED_WAIT_APPROVAL. **Prerequisite:** CMS-M3-35

**Files (repo-relative; một writer):**

- `pinky-lamb-cms/tests/m3.e2e.test.mjs` — MEDIUM_QA
- `pinky-lamb-cms/tests/media-workflow.local.test.mjs` — MEDIUM_QA
- `pinky-lamb-cms/tests/media-lifecycle.local.test.mjs` — MEDIUM_QA

**Done:** Actual upload3kinds→rights→v3Save/submit/source/review/PRIVATE/export; desktop/mobile keyboard/error/conflict/lazy/video/PDF/abort/cache; expected console failures separately classified, no unplanned outbound.

**AC:** M3-AC03, M3-AC08, M3-AC09, M3-AC10, M3-AC12, M3-AC13, M3-AC14, M3-AC15.

**High checkpoint H — independent tamper/privacy/ACL/resource/full workflow/served artifact.** Root + independent High review evidence; unresolved finding chặn dependent task. Không tự cấp human approval.

### CMS-M3-37 — Final Medium gates + source/evidence freeze

**Owner:** MEDIUM; **status:** PLANNED_WAIT_APPROVAL. **Prerequisite:** CMS-M3-36

**Files (repo-relative; một writer):**

- Không sửa source; outputs chỉ ở allowlist generated.

**Done:** One owner runs fresh lint/unit/emulators/browser/build/audit+native review against exact source; no skipped required gates; cleanup owned test processes; inventories/version attribution and honest NOT_RUN limits.

**AC:** M3-AC16, M3-AC17, M3-AC18.

### CMS-M3-38 — High final review, QA/runbook và REVIEW_READY

**Owner:** HIGH; **status:** PLANNED_WAIT_APPROVAL. **Prerequisite:** CMS-M3-37

**Files (repo-relative; một writer):**

- `pinky-lamb-cms/docs/M3-REVIEW.md` — HIGH
- `pinky-lamb-cms/docs/QA-M3.md` — HIGH
- `pinky-lamb-cms/docs/LOCAL-RUNBOOK.md` — HIGH
- `pinky-lamb-cms/docs/PROJECT-STATE.md` — HIGH
- `approvals/CMS-001-v2-M3-REGISTER.json` — HIGH

**Done:** Independent High read-only evidence/visual/scope audit; findings closed or explicitly blocked; technical REVIEW_READY only, human Accepted pending; no M4/LOCAL_COMPLETE/production authority.

**AC:** M3-AC16, M3-AC17, M3-AC18.

## 3. Commands và evidence

Lệnh đã có trong repository (gates M2 đã chạy trước đây; **không chạy lại ở planning M3**), từ `pinky-lamb-cms/`:

```sh
npm run lint
npm run test:unit
npm run test:emulators
npm run test:e2e:local
npm run build:admin
```

After Approved: setup/install chỉ packages đã pin; `npm run emulators:local`/`npm run dev:local` giữ demo+loopback. Restart process-owned nếu approved Storage config cần, preserve existing emulator data/export before restart; không blind kill port, không seed existing data. Chứng minh emulator export/import có preserve snapshot trước change; đây là operational preservation cho setup, không claim full backup/restore M4.

Lệnh **Proposed, chưa implemented/run**: `npm run media:worker:local`; local tool audit qua guarded runner; export: `npm run export:local -- --media-envelope <owned-qa-v3.json> --out <owned-m3-output>`. Chốt actual flags trong task12/33, không truyền credential qua CLI/URL hoặc mở host ngoài loopback.

Task evidence: `.local/cache/m3/task<id>-evidence-index.json` pin current source/log/native version/network/artifact/screenshot SHA và exact archives trước overwrite; generated logs/output under `.local/test-outputs/m3/`, `.local/test-results/`, `.preview-output/m3/`. Không ghi credential/raw private evidence vào handoff screenshots/logs. M1/M2 evidence giữ lịch sử, không copy kết quả cũ làm M3 PASS.

Final gates source-frozen: lint/unit/emulator/browser/build; fresh npm audit JSON và native library/build review. Ngày/command/exit/source hashes phải thật, không đặt trước số PASS. Audit remediation trong scope; nếu cần upgrade ngoài pins, báo blocker và trình revision, không --force hoặc weaken tests.

## 4. Bàn giao và đóng mốc

Final Medium freeze/task37 → root và independent High task38 → M3 REVIEW_READY. QA-M3 đối chiếu M3-AC01–18, failures/repaired attribution/source changes/NOT_RUN/known limitations; runbook reproduce managed tools/worker/private cache and explicit recovery. Human rights/factual truth và physical/Safari/OS checks chưa chạy báo riêng.

Người dùng cần Accepted M3 riêng để CLOSED. `cms_complete:false`/`local_acceptance:null` cho đến M4 và toàn CMS được nghiệm thu. M4 publication/history/rollback/backup-restore cần kế hoạch + Approved riêng; production EXCLUDED_NOT_PLANNED.
