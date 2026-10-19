# CMS-001 v2 — canonical M1 task list

## Trạng thái hiện hành — đã hoàn tất theo xác nhận của Khiêm

**ĐÃ HOÀN TẤT / CLOSED_BY_HUMAN_CONFIRMATION — 17/10/2026 (Asia/Ho_Chi_Minh).** Xem [xác nhận trực tiếp, phạm vi đóng và bảng trạng thái hiện hành](plan.md). Khiêm xác nhận các plan đã xong và giao chỉ đồng bộ tài liệu, không sửa code hoặc chạy lại kiểm thử.

Các trạng thái chờ duyệt/chưa hoàn tất, checkbox và bước tiếp theo trong phần bên dưới thuộc lịch sử trước xác nhận đóng; không tự mở lại plan/task từ các ghi nhận đó. Giữ nguyên bằng chứng PASS/FAIL/NOT_RUN, cờ kỹ thuật và giới hạn đã ghi nhận. Lần đồng bộ này không xác minh runtime, không ghi nhận release hoặc cấp quyền thực thi mới.

## Nội dung lịch sử trước xác nhận đóng


**AWAITING_APPROVAL; mọi task chưa bắt đầu implementation.** Chỉ phân công sau lời duyệt `Approved CMS-001 v2 — M1 local/emulators`. Đọc [proposal](../docs/CMS-PROPOSAL-CMS-001-v2.md), [architecture](../docs/CMS-ARCHITECTURE.md), [approval](../docs/APPROVAL-PROTOCOL.md), [plan](plan.md).

Các paths trong bảng là **relative với isolated root `pinky-lamb-cms/` tương lai**, chưa tồn tại và không phải cho phép sửa website original hoặc baseline handoff. Files chốt trong task nếu phát sinh phải nằm trong scope/allowlist được duyệt. Task thường ≤5 files; tách trước code nếu lớn hơn. Checkpoint QA note dùng `docs/CHECKPOINT-A.md`/`docs/CHECKPOINT-B.md` thuộc isolated root.

## Task theo dependency, owner và file budget

High chỉ reasoning/architecture/review/audit; Medium viết app/config, generate UI/draw, unit/integration test code theo yêu cầu. QA phân tích bằng chứng/gate là High; thực thi/code tests là Medium. Không agent High viết app code “cho nhanh”.

| Task ID | Owner | Dependency | Likely files (tối đa ~5/task) | Acceptance cụ thể | Verify |
|---|---|---|---|---|---|
| CMS-M1-00 | High | Approval CMS-001 v2/M1 | `docs/SPEC-cms-identity.md`, `docs/SPEC-cms-content.md`, `docs/ADR-001.md` | Chốt mode local, action/role matrix, Hero contract/limits, test oracle, no-cloud boundary | Review trace yêu cầu→AC; không cloud writes |
| CMS-M1-01a | Medium | 00 | `package.json`, `package-lock.json`, `.gitignore`, `docs/DEPENDENCIES.md`, `cms-api/package.json` | Node/npm/package versions pin; JDK21+ java -version/exact patch/CLI-emulator compatibility preflight; manifest và lock được tạo trước npm ci; scripts disabled trước dependency audit; frozen install reproducible | Compatibility/engine audit; lock-only bootstrap; npm ci --ignore-scripts và native audit |
| CMS-M1-01b | Medium | 01a | `infra-local/firebase.json`, `scripts/local-guard.mjs`, `vite.config.mjs`, `cms-api/index.mjs`, `tests/local-guard.test.mjs` | Demo project/loopback; four emulator config; HTTP onRequest adapter + Vite proxy; missing emulator từ chối | Guard tests real ID/missing host; no production request; basic local handler smoke |
| CMS-M1-02 | Medium | 01b | `contracts/hero.mjs`, `contracts/errors.mjs`, `tests/hero-contract.test.mjs`, `eslint.config.mjs`, `tests/fixtures/malicious-hero.json` | Typed runtime validator cho Hero/SEO; unknown keys/script CTA/oversize/invalid asset rejected | Positive/negative tests; encoding payload fixtures |
| CMS-M1-03 | Medium | 01b,02 | `infra-local/firestore.rules`, `scripts/seed-emulators.mjs`, `tests/acl.rules.test.mjs`, `cms-api/authorization.mjs` | UID membership; active/verified; browser cannot assign role; deny anonymous/unlisted; API honors same policy | Auth/Firestore emulator tests bao gồm direct SDK bypass, disabled member/token |
| CMS-M1-04 | Medium | 03 | `admin/index.html`, `admin/auth.mjs`, `admin/admin.css`, `admin/config-local.mjs`, `tests/login.local.test.mjs` | Email/Password local; memory persistence; login errors generic; signout clear preview; no signup UI/no privilege from signup API | Browser login/logout; unauthorized selfsignup UID denied; inspect storage/network |
| **Checkpoint A** | High | 01a–04 | QA note | Auth boundary và local guard có bằng chứng; unknown UID không đọc draft | Review tests + real browser evidence, sửa blocker rồi mới tiếp |
| CMS-M1-05 | Medium | 02,03 | `cms-api/drafts.mjs`, `cms-api/routes.mjs`, `tests/drafts.integration.test.mjs`, `contracts/draft.mjs` | Save expectedRevision; server actor/time; one concurrent winner; stable retry no duplicate mutation | Emulator two-client conflict; same key changed body; forbidden fields |
| CMS-M1-06 | Medium | 04,05 | `admin/hero-editor.mjs`, `admin/media-picker.mjs`, `contracts/legacy-assets.json`, `tests/hero-editor.local.test.mjs` | Form Hero/SEO uses legacy asset refs; inline errors/save state; keyboard usable; no live publish claim | Edit/save/reload; long content; picker keyboard; dirty-leave handling |
| CMS-M1-07 | Medium | 02,06 | `preview/hero-renderer.mjs`, `admin/preview.mjs`, `preview/preview.css`, `tests/hero-renderer.test.mjs` | Desktop/mobile preview same Hero data; encode malicious strings; one h1; metadata local export; no unauth/private URL | Snapshot fixture render + browser 390/1440 width; XSS payload không execute |
| **Checkpoint B** | High | 05–07 | QA note | Hero edit→save→private preview đúng revision; baseline other sections rõ read-only | Review visual/keyboard/conflict evidence |
| CMS-M1-08 | Medium | 05,07 | `cms-api/snapshots.mjs`, `cms-api/reviews.mjs`, `admin/review.mjs`, `tests/review.integration.test.mjs`, `infra-local/firestore.rules` | Immutable snapshot; reviewer approves exact hash; editor edits later not change snapshot; self-review blocked | Edit-after-submit test; direct mutate snapshot denied; review role tamper |
| CMS-M1-09 | Medium | 08 | `scripts/export-local.mjs`, `tests/m1.e2e.test.mjs`, `docs/LOCAL-RUNBOOK.md`, `docs/QA-M1.md`, `tests/fixtures/approved-hero.json` | Local artifact title/OG/Hero static; login edit/review journey; no cloud/API calls beyond localhost; runbook reproducible | Focused tests, local browser/network; malicious preview fixture; HTML parse |
| CMS-M1-10 | High | 09 | `docs/M1-REVIEW.md`, `docs/PROJECT-STATE.md` | Findings triaged; observed vs unrun rõ; accept/reject M1; prepare batch M2 proposal | Read diff/logs/evidence; report no unauthorized resource changes |

Chỉ phân công sau approval. Nếu một task thực tế vượt 5 file, tách trước khi code. Không tự tạo tracker/todo của scope khác hoặc overwrite plan cũ; canonical proposal/task index CMS-001 là plan mới, isolation riêng. Bảng này là task budget, không giả mọi exact path đã tồn tại.


## Acceptance và rollback M1


M1 đạt khi: fixture member login; editor sửa/lưu Hero và SEO; reopen giữ đúng revision; desktop/mobile preview đúng; anonymous/unlisted/inactive không đọc hoặc mutate; client không tự cấp reviewer/owner; snapshot không đổi sau submit; self-review bị cấm cả owner; XSS/script URL bị chặn/encode; hai editor không overwrite; mọi Firebase request chỉ emulator; baseline public và checkout cũ không thay đổi. Report phải phân biệt unit, Rules, API integration và browser QA; không gọi local pass là production readiness.

M1 rollback: dừng dev/emulator processes, discard isolated implementation branch/copy khi user yêu cầu; trước discard bảo toàn user edits và evidence. Không có cloud data/schema/IAM cần rollback vì M1 không cloud writes. Fixture reset/export chứa user giả, không thông tin thật. Nếu guard phát hiện attempt gọi cloud thì dừng, ghi finding và không tiếp tục tới milestone khác.




**Tooling preflight M1-01a:** Node22 ≥22.12/npm và **JDK 21+** (đề nghị Java21 LTS, exact patch ghi lại); kiểm `java -version` và compatibility chosen pinned CLI/emulator binaries trước start. Root đối chiếu CLI firebase-tools 15.33.0 local có `MIN_SUPPORTED_JAVA_MAJOR_VERSION=21` tại `lib/emulator/commandUtils.js`; không chỉ dựa generic webdocs về transition Java21. Không cài Java/tooling trong lượt handoff.

`cms-api/package.json` là npm workspace member và Functions source metadata: main/type=module/engines Node22, runtime dependencies firebase-admin/firebase-functions/zod; **chỉ root package-lock.json**, không tạo API lockfile khác. Lint dùng `eslint.config.mjs` được viết trong CMS-M1-02 và source allowlist, với ESM/browser/Node contexts đúng thực tế. Malicious synthetic fixture thuộc CMS-M1-02; approved Hero fixture thuộc CMS-M1-09 để mỗi task ≤5 files. Fixture JSON đã commit là input có nguồn synthetic, không generated-output permission.

## Local generated outputs và dependency setup

Trong scope M1 Approved, ordinary local writes được phép tại isolated root: root/API `node_modules/`, `.local/` cache/log/emulator data, `.preview-output/`, `admin-dist/`, `test-results/`, `playwright-report/` và local npm cache được đặt trong `.local/npm-cache/`. Synthetic committed fixture inputs ở `tests/fixtures/approved-hero.json` và `tests/fixtures/malicious-hero.json`; runtime seed/export data chỉ dưới `.local/`; `public-baseline/` là bản sao read-only không sửa. Những outputs không phải source allowlist mở cho feature mới; không ghi original repo/handoff payload. Dependency/docs downloads và audited package bootstrap/install trong M1 setup được phép; Firebase runtime app/API traffic vẫn chỉ demo+loopback. Không cloud runtime request/ADC/real credentials.

M1 setup cho phép **một lần khởi tạo** `public-baseline/` bằng copy byte-identical 39 file từ bundled `dist/` và `FONT-NOTICES.txt` nếu cần; xác minh SHA từng file rồi giữ read-only. Đây là faithful setup copy, không quyền sửa/rewrite public baseline hoặc website original. Cũng có thể dùng read-only reference/mount tới bundled dist nếu môi trường hỗ trợ. Official JDK21/emulator/Playwright browser binaries và dependency/docs downloads/cache có thể đặt dưới `.local/` trong tooling setup đã duyệt; Firebase app/API runtime vẫn chỉ demo+loopback, không bypass guard.

## Trạng thái task

CMS-M1-00, CMS-M1-01a, CMS-M1-01b và CMS-M1-02 đến CMS-M1-10: **PENDING_APPROVAL**. Checkpoint A/B: **NOT_RUN**. Không có unit/Rules/API/browser tests đã chạy cho CMS. M2 trở đi chỉ roadmap, không task đã được duyệt. Ledger ở [APPROVAL-REGISTER](../approvals/APPROVAL-REGISTER.json).
