# MULTILINGUAL-001 v1 — Tasks P1 Hero local/emulators

> **Cập nhật 16/10/2026:** mockup HTML sửa đã được người dùng duyệt. Kế hoạch hiện hành là [MULTILINGUAL-001 v2](../docs/MULTILINGUAL-001-v2.md), tasks tại [v2](MULTILINGUAL-001-v2.md), [design record](../../approvals/MULTILINGUAL-001-v2.design.json). Tài liệu v1 dưới đây giữ lịch sử; UI P1 sản phẩm cũ vẫn bị từ chối, rework implementation HOLD chờ scope/Approved mới. Không dùng checklist v1 để resume.

Ngày 16/10/2026. **IN_PROGRESS / UI_ACCEPTANCE_REJECTED / DESIGN_REPLAN_REQUIRED**. Người dùng đã Approved P1 và amendment A1 v1 trong chat hiện hành; Source và luồng OWNER có bằng chứng kỹ thuật; người dùng đã từ chối UI/UX và yêu cầu thiết kế trước sửa. Product implementation bị HOLD; AC04 role runtime chưa chạy. [Scope và AC canonical](../docs/MULTILINGUAL-001-P1-v1.md), [kế hoạch tổng thể](../docs/MULTILINGUAL-001-v1.md), [allowlist/digests/approval quote](../../approvals/MULTILINGUAL-001-P1-v1.scope.json).


## Human design hold — 16/10/2026

UI/UX hiện tại bị người dùng từ chối. Xem [đề xuất thiết kế và trạng thái hiện hành](../docs/MULTILINGUAL-001-P1-v1.md#human-ui-review--16102026-thay-thế-trạng-thái-acceptance-trước-đó). Chỉ tiếp tục inspect/design/documentation; không sửa sản phẩm hoặc chạy luồng ghi dữ liệu trước Approved thiết kế mới. Các PASS bên dưới là bằng chứng kỹ thuật đã chạy, không phải human visual acceptance. Không có child đang chạy.

- [ ] Trình mockup CMS desktop/mobile và Hero EN/VI/JA cùng các trạng thái thao tác.
- [ ] Nhận duyệt thiết kế, scope/tasks/AC sửa trước triển khai.
- [ ] Kiểm chứng lại phần bị ảnh hưởng sau triển khai được duyệt; human UI acceptance vẫn mở.

## Thực thi hiện hành

Root giữ approval/shared records và preflight; `p1_implementation` là sole writer source/test P1, native kit-implementer có tool-selected GPT-6.1 Sol Medium; independent provider telemetry Unknown. Không child delegation. A1 thêm `admin/auth.mjs` cho exact transport routes, giữ các controls khác; kiểm trong test paths P1 hiện có, không có file test mới ngoài manifest.

Preflight ban đầu trước ghi P1 (lịch sử): CMS anonymous `/api/cms/session` HTTP401; Hosting :5010 HTTP200; existing Edge tab có OWNER/Home v3revision0; Firestore operator inventory xác nhận ba draft IDs P1 đều404/absent. Đây là inventory operator và quan sát phiên, không phải real-save/ACL proof của tính năng mới. Retained counts: cmsDrafts3/cmsSiteV3Imports1; snapshots/reviewStates/reviewsV3 đều0. Evidence tại `.local/test-outputs/multilingual-001/p1-v1/preflight/`; không đổi dữ liệu.

## Quyền và ownership

Coordinator/root sở hữu scope, contract decision và shared index. Một implementation owner tuần tự sở hữu các product/test paths được giao sau Approved, không revert thay đổi của người khác. Planning/review High, implementation/unit tests Medium theo runtime thực. Native implementer/reviewer đã được giao ownership giới hạn; không child delegation, không có quyền delegate tự động cho scope mới. Nếu delegation sau này được giao, child không delegate tiếp và không tự ghi shared records.

Không chỉnh approval ledgers CMS lịch sử, archived checksums, global config, dist/public-baseline hoặc data cũ. Mỗi task thường ≤5 file; suffix NEW trong manifest là trạng thái tại thời điểm duyệt; các file P1 đã được tạo. T01 sở hữu canonical contract; T02 trở đi dùng contract này, không tự tạo competing locale model.

## T00 — Preflight đúng nguồn và prerequisite

- [x] Kiểm document/source digests, drift và task ownership; soát actual model/effort trước coding.
- [x] Ghi source/data/process before-image ở destination P1; kiểm Home v3 và trusted media/base, ba localized IDs chưa tồn tại, demo/emulators, :5010 chỉ đọc và sessions/roles có thể dùng.
- [x] Chỉ activate đúng canonical Vite khi cần và được scope cho phép; nếu thiếu emulator/login/guard thì ghi điều kiện thiếu, owner và bước chẩn đoán hữu hạn. Không reset/reseed/recovery.
- **Files:** chỉ task/evidence P1; đọc product base, chưa ghi product/data trong preflight.
- **Depends:** human Approved bundle P1. **AC:** tiền điều kiện AC02/04/07/10. **Verify:** sanitized observations/hashes, không token/content private.

## T01 — Contract Hero localized và persistence shape

- [x] Thêm locale/field registry, draft/read/save/QA/operation schemas và JSON-string storage theo scope; không đổi schema3 hiện hành.
- [x] Kiểm wrong locale/extra key/missing field/UTF-8 encoded budget/HTML injection/action-target tamper/base mismatch.
- **Files (3):** `contracts/hero-localization.mjs` NEW; `contracts/hero-localization-records.mjs` NEW; `tests/hero-localization-contract.test.mjs` NEW.
- **Depends:** T00. **AC:** AC01/06/08. **Verify:** focused contract tests; exact code-point/UTF-16 semantics theo schema được tái sử dụng.

## T02 — Trusted context và API persistence

- [x] Reuse validated Home v3 context/media selection; không đọc raw Firestore làm public API, không ghi base.
- [x] Thêm read/atomic create-save/idempotency/audit; first-create không ghi đè; conflict/base drift có error rõ.
- [x] Tích hợp exact route/method/body validation và canonical dependency/dispatch; không sửa auth/role/HTTP controls của route khác.
- **Files (5):** `cms-api/hero-localization-context.mjs` NEW; `cms-api/hero-localizations.mjs` NEW; `cms-api/routes.mjs`; `tests/hero-localization-api.test.mjs` NEW; `tests/hero-localization-routes.test.mjs` NEW.
- **Depends:** T01. **AC:** AC02/03/04/06. **Verify:** transaction tests, route/ACL negatives, duplicate/reordered/concurrent/mismatched requests; supplement real HTTP in T07.

## T03 — Panel CMS ba ngôn ngữ nối API thật

- [x] Mount panel P1 ở đúng group Home v3; dùng callback/API/session từ controller thật, không mock persistence/localStorage.
- [x] Lưu riêng locale, display revision, missing/dirty/read-only/error states; ba lựa chọn chuyển bản; ignore stale response; dispose sạch.
- **Files (5):** `admin/hero-localization-editor.mjs` NEW; `admin/hero-localization-editor.css` NEW; `admin/site-media-editor.mjs`; `tests/hero-localization-editor.test.mjs` NEW; `tests/hero-localization-ui.local.test.mjs` NEW.
- **T03-A1 transport (sequential subtask, human Approved):** thêm exact Hero route/method admission trong `admin/auth.mjs`, regression bằng hai P1 test files ở trên. Không raw transport khác và không thay Auth/ACL/timeout/logout/host/origin/sandbox/CSP.
- **Depends:** T02. **AC:** AC01/02/05/09/11. **Verify:** source/caller wiring và browser nhỏ nhất save→reload→đổi locale; runtime prerequisite chưa đạt thì giữ NOT_RUN, tiếp tục phần độc lập được phép.

## T04 — Saved Hero preview và safe QA envelope

- [x] Renderer chỉ Hero, locale + UI dictionary nhỏ cho QA/aria; reuse template logic phù hợp, không nhân bản markup không cần thiết.
- [x] Authenticated preview đúng saved locale/revision/base/hash; sandbox/CSP nguyên ranh giới, logout/dispose clear; envelope chỉ public-safe refs.
- **Files (5):** `preview/hero-localization-renderer.mjs` NEW; `preview/hero-localization-copy.mjs` NEW; `admin/hero-localization-preview.mjs` NEW; `tests/hero-localization-preview.test.mjs` NEW; `tests/hero-localization-renderer.test.mjs` NEW.
- **Integration:** API `/qa` ở file service T02, button/controller ở T03 do cùng owner nối sau khi renderer có; không thêm file ngoài allowlist. Nếu T02/T03 đã review, chỉ review lại delta liên quan.
- **Depends:** T01/T02, CMS mounting T03 cho browser. **AC:** AC06/07/08/09. **Verify:** source isolation checks + authenticated browser saved proof, unsafe refs/text fixtures và generation cleanup.

## T05 — Export artifact QA riêng, không phục vụ :5010

- [x] CLI nhận safe envelope đã tải từ API thật; validate/hash/containment và render ba Hero artifacts vào output run mới; không secret argument hoặc access cloud.
- [x] Badge QA/noindex/lang đúng; safe asset URLs, CTA không thực hiện hành động ngoài mẫu Hero; không private originals/metadata, không overwrite run cũ.
- **Files (2):** `scripts/export-hero-localization-local.mjs` NEW; `tests/hero-localization-export.test.mjs` NEW.
- **Depends:** T04. **AC:** AC08/10/11. **Verify:** positive/negative export + inspect HTML/resources; explicit partial Hero output, không coi là website ba ngôn ngữ hoàn chỉnh.

## T06 — Lệnh kiểm tra và guard integration tối thiểu

- [x] Thêm runner P1 có các mode rõ và exact output/data delta theo scope; reuse runtime/network fence, không yêu cầu reviewer/session receipts ở app runtime.
- [x] Thêm selector P1 tối thiểu trong guard; không sửa historical admissions/budget, không tắt existing gates, không chạy full suite có seed/reset như fallback.
- **Files (3):** `scripts/multilingual-p1-local.mjs` NEW; `scripts/local-guard.mjs`; `tests/hero-localization-runner.test.mjs` NEW.
- **Depends:** T01; enumerate suite sau T02–T05. **AC:** AC03/04/08/10/11. **Verify:** command-plan negatives, wrong project/host/path/role, no retained writes. Nếu guard cần material control change, pause runner và trình delta; không nâng quyền để tránh failure.

## T07 — Tích hợp thật, rendered checks và bảo toàn

- [ ] Browser thật: Editor/Owner lưu đủ ba locale và reload; dirty/failure/concurrency/response-loss/stale/base drift; Reviewer/Publisher/anonymous denies khi có prerequisites.
- [x] Xem saved Hero và QA artifact tại 1440/768/390/320 px; tiếng Việt/Nhật, keyboard/focus, reachability, logout cleanup; không chỉ screenshot/page-width assertion.
- [x] Before/after retained source/data/runtime; chỉ ba new drafts và declared operations thay đổi. Existing whole-site preview kiểm chỉ đọc; save cũ kiểm caller/route và controlled service fixture, không ghi thử base thật hoặc gọi đó là live mutation proof. Không mutation base để giả lập drift: dùng controlled service fixture cho case đó.
- **Files:** tests/runner ở T02/T03/T04/T06 đã sở hữu; evidence dưới `.local/test-outputs/multilingual-001/p1-v1/<run-id>/` (runtime output, không source allowlist mở rộng).
- **Depends:** T03–T06. **AC:** AC01–AC11. **Verify:** real HTTP/SDK/emulator/browser và inventory deltas; synthetic/mocked tests phải được ghi riêng, không thay real-save criterion.

## T08 — Review và bàn giao

- [x] Source review rủi ro contract/ACL/CAS/idempotency/private projection; kiểm diff đúng scope, source preservation và evidence từng AC.
- [x] Ghi commands thật, URL/prerequisites, roles, manual review, limits và next action; cập nhật task/scope state từ evidence, không tự ghi human Accepted.
- [ ] Chỉ trình P1 technical complete khi đủ AC; language acceptance PENDING. P2–P7/M3/M4/LOCAL_COMPLETE không đổi.
- **Files:** task/scope/tài liệu MULTILINGUAL hiện hành, không ledgers CMS cũ. **Depends:** T07 để kết luận verified; source review có thể làm sớm khi input ổn định.

## Commands đã triển khai và kiểm chứng trong phạm vi P1

Chạy từ `pinky-lamb-cms/` với Node/npm pinned và runtime guard hợp lệ. Các selector P1 dưới đây đã tồn tại và đã chạy theo evidence. Dùng executable Node pinned `.local/cache/node/node-v22.23.3-darwin-arm64/bin/node` thay cho system node. Scoped lint dùng ESLint API trên các files P1 (các lint.json); scoped build dùng Vite API/config hiện hành với outDir task-only `.local/test-outputs/multilingual-001/p1-v1/build-hero-overflow-repair-20261016/`. `npm run lint` và `npm run build:admin` tổng quát **NOT_RUN trong P1**; không dùng build mặc định ghi admin-dist hoặc full suite làm fallback.

```sh
node scripts/local-guard.mjs multilingual-p1 --mode unit --run-id <run-id>
node scripts/local-guard.mjs multilingual-p1 --mode api --run-id <run-id>
node scripts/local-guard.mjs multilingual-p1 --mode browser --run-id <run-id>
node scripts/local-guard.mjs multilingual-p1 --mode export --run-id <run-id> --bundle <task-owned-json-path>
```

Runner unit chỉ chọn các pure suites: contract, API, routes, renderer, export, runner và editor/preview khi dependency phù hợp; browser `.local.test.mjs` không bị chạy nhầm như unit. API/browser dùng actor/session qua cơ chế local được phép, không token trên CLI/log. Runner export lấy safe envelope qua caller authenticated hoặc input file trong run root, rồi gọi exporter nội bộ; không gọi full existing export/recovery suite.

Frontend activation sau T00 khi cần: `npm run dev:local` qua guard hiện có, đúng process :5173. QA HTTP sau export, khi :4173 rảnh:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory .local/exports/multilingual-001/p1-v1/<run-id>
```

Nhãn `<run-id>` là placeholder để operator thay bằng ID run thực, không phải chuỗi CLI literal. URLs QA: `http://127.0.0.1:4173/en/`, `/vi/`, `/ja/`; không phải URL final website. Nếu guarded build/lint có lỗi cũ, phân biệt bằng source/evidence và không sửa ngoài allowlist. Full CMS suite, seed, recovery và emulator lifecycle không phải gate mặc định của P1.

## Bằng chứng hiện tại

**OWNER_RUNTIME_VERIFIED / AC04_ROLE_RUNTIME_NOT_RUN.** P1 vẫn **IN_PROGRESS**. Không đóng technical acceptance toàn P1; human UI acceptance **REJECTED — DESIGN_REPLAN_REQUIRED**; language acceptance **PENDING**. Người dùng xác nhận chỉ có OWNER hiện tại; không tạo hoặc sửa tài khoản/role để thay bằng chứng.

Evidence root: `.local/test-outputs/multilingual-001/p1-v1/`; tổng hợp ở `execution-summary.json`. T01–T06 đã triển khai; phần OWNER của T07 đã kiểm chứng; T07 còn role matrix. T08 source/evidence review và tài liệu đã có, full P1 acceptance chưa đóng.

### Kết quả chính

- **Unit 38/38 PASS**: `unit-hero-overflow-green-20261016/unit.log`. Các fixture contract/controller/service/export là bằng chứng riêng, không giả thành Auth/emulator thật.
- **Scoped lint PASS**, gồm freeze check cuối của test tại `real-ui-source-20261016/freeze-check.json`. **Task-only build PASS,2077 modules**, `build-hero-overflow-repair-20261016/`. Product source không đổi sau build; chỉ bổ sung test. Không ghi `admin-dist`, dist/baseline hoặc dependencies.
- **Browser17/17 PASS**: `browser-authenticated-20261016-r1/browser.log`. Thành phần: 1 anonymous +2 controlled DOM/CSP +12 artifact replay +1 barrier cancellation +1 serial authenticated case. Không gọi cả17 là17 authenticated tests.
- **Authenticated thật:** hai tab dùng OWNER đăng nhập bình thường, không đọc password/token/Auth headers/storageState. Proof: `browser-authenticated-20261016-r1/browser-results/tests-hero-localization-ui-6f273-CAS-and-guarded-restoration/real-authenticated-p1.json`. Dirty Stay/Discard, abort trước delivery giữ text, retry cùng key/payload, commit rồi mất response/retry revision3, CAS hai tab cùng expected3 có đúng200/409, Save-and-switch thành công sang VI và loser giữ EN/text, delayed GET khóa switch đều PASS.
- **Bốn commits thật**, revisions EN2/3/4/5. Retry trả lại revision3, không thêm commit. EN đã khôi phục đúng contentHash ban đầu ở revision5; VI/JA vẫn1. Hai mutation drains SETTLED/pending0, không unknown commit. Hai tab test đã logout; preview bị gỡ và observer URL ghi active0/revoke được gọi. Không tuyên bố đã đo heap/GC. Tab Edge OWNER của người dùng được giữ; đã reload/readback EN5 và preview đúng hash.
- **Rendered UI PASS:** `resume-ui-20261016/cms-viewports.json` và PNG có actual1440/768/390/320, không page overflow, controls trong viewport. Native dialog có focus cycle/Enter discard ở cả4widths (`dialog-all-viewports.json`). Private preview cả3locale đúng lang/revision/hash, sandbox rỗng/scripts0 (`private-preview.json`). Old whole-site preview read-only giữ revision0/Hero nguồn (`whole-site-preview.json`). Viewport đã reset thành công.
- **Final QA export PASS:** `.local/exports/multilingual-001/p1-v1/live-qa-final-20261016/`, revisions EN5/VI1/JA1. Input `latest-qa-bundle.json` được tải qua UI authenticated sau restore. Exporter xác minh envelope/assets/hash/size/containment. `resume-ui-20261016/final-http.json`:24/24file HTTP khớp export. Final EN qua HTTP thật ở4widths không overflow (`qa-final-http-render.json` +PNG). So với run đã replay12cases, chỉ `en/index.html` đổi badge revision1→5; VI/JA và assets byte-identical (`final-artifact-delta.json`). QA chỉ Hero, noindex/CTA inert; không phải website public đa ngôn ngữ.
- **Preservation PASS:** `preflight/preservation-after-authenticated.json`, `source-checks-final-after-auth.json`:346protected source records không đổi ngoài24paths. Retained cmsDrafts3/import1/snapshots-reviewStates-reviews0 giữ hash/updateTime; Homev3 revision0. VI/JA giữ nguyên toàn record. Ops3→7, bốn mới đều EN, prefix đúng và requestHash khớp requests commit thật; ba ops cũ giữ nguyên. Operator inventory chỉ đọc, không thay Auth-session proof. Hosting5010 SHA giữ nguyên; emulators PID15465/65804 và Vite87801 không restart trong lượt cuối.
- **Independent review PASS_SOURCE/PASS_SCOPED** cho source và evidence theo digest đã đọc. Source/exports/data được kiểm riêng. Không gán editorial approval hoặc human Accepted.

### Matrix nghiệm thu hiện tại

| AC | Bằng chứng | Trạng thái / giới hạn |
| --- | --- | --- |
| AC01 | Contract + panel thật, CMS tiếng Việt/default EN/locale registry | PASS |
| AC02 | Ba save/readback thật; EN sau test khôi phục hash; VI/JA/base bảo toàn | PASS |
| AC03 | First-create thật từ3IDs absent; CAS/retry/response-loss thật + controlled transaction fixtures | PASS cho cases đã chạy; forced unknown-commit interruption runtime NOT_RUN |
| AC04 | OWNER thật và anonymous HTTP6/browser denied; role guards controlled fixtures | PARTIAL: EDITOR/REVIEWER/PUBLISHER và invalid-member runtime NOT_RUN do không có phiên demo; không đóng full role matrix |
| AC05 | Ba lựa chọn dirty, failure/retry/CAS giữ text, delay/pending gates thật; generation fencing fixtures | PASS cho UI khả dụng; forced stale Auth/destroy delivery runtime NOT_RUN, không giả Auth event để ép case |
| AC06 | Reject drift/tamper fixtures + shared fields chỉ đọc + before/after | PASS trong phạm vi đã duyệt; không sửa base thật để giả drift |
| AC07 | Private preview3locale + normal logout DOM/URL revoke counts thật, sandbox/CSP giữ nguyên | PASS cho lifecycle đã chạy; không claim heap/GC hoặc forced lifecycle chưa chạy |
| AC08 | Final bundle/export/HTTP24files;12artifact replay và finalEN4widths | PASS; artifacts QA không có editorial approval |
| AC09 | CMS/Hero actual1440/768/390/320, glyph VI/JA, rect/controls/focus/native dialog | Kiểm tra kỹ thuật đã PASS; human UI REJECTED, thiết kế cần làm lại; human language acceptance PENDING |
| AC10 |346protected records, olddata/HostingSHA, oldpreviewread-only; save cũ controlled fixtures | PASS; không claim ghi thử base thật |
| AC11 | Source/callers/routes/commands/manual steps/source+evidence review đầy đủ | PASS cho handoff với limits; human P1/language acceptance PENDING |

### Giới hạn và bước tiếp theo

Thiết kế và human UI acceptance phải được xử lý sau yêu cầu làm lại. AC04 role runtime cũng còn thiếu để kết luận đầy đủ P1. Chỉ tiếp tục role runtime khi có phiên demo hiện hữu phù hợp và được sử dụng đúng quy trình; không yêu cầu gửi credentials trong chat, không tự tạo account/custom token hoặc đổi quyền. Không mở P2–P7, activation5010, migration/editorial, M3/M4 hoặc LOCAL_COMPLETE từ kết quả OWNER.

Exact opt-in `real-ui-request.json` đã được archive thành `resume-ui-20261016/real-ui-request-consumed.json` sau run. Chạy browser selector bình thường sẽ skip test ghi thật; không tự bật lại marker vì baseline hiện EN5. Runner API mode chỉ kiểm anonymous; không mang token trên CLI. Replay fixture pin immutable run `live-qa-bounded-20261016`; artifact mới chỉ đổi badge EN và đã được kiểm HTTP/render riêng.

QA đang phục vụ tại `http://127.0.0.1:4173/en/`, `/vi/`, `/ja/`; source xuất cuối ở run `live-qa-final-20261016`. CMS tại `http://127.0.0.1:5173/login`, phiên in-memory: reload toàn tab sẽ cần đăng nhập lại. Dùng panel Hero đa ngôn ngữ P1; không dùng Lưu website để sửa base khi kiểm bản dịch.

### Lịch sử sửa và proof không được suy rộng

Giữ nguyên evidence FAIL/attempts: test-oracle lúc đầu; child native sandbox launch/connect; response-loss/later-writer; implicit rebase; same-identity session clear; nav guard bắt outermain; CORS CSS bytes; Vite inlineCSS bị CSP chặn; decorative overflow. Các repair nằm trong allowlist và có focused plan/regression/review; không giảm Auth/ACL/CSP/guard.

Bốn ảnh CMS cũ `live-20261016/cms-{1440,768,390,320}.png` đều actual1874, không dùng như proof responsive; lượt resume có số đo thật thay thế. Edge timeout đã khôi phục trên tab hiện tại. Harness pre-run collectionerror và CAScancel/unknowncommit findings giữ tại `resume-ui-20261016/real-ui-pre-run-repair.json`; sửa trước activation, marker-absent smoke16PASS/1skip rồi actual17PASS. Không claim full TDD cho source viết trước tests; các regression sau có RED/GREEN phù hợp.
