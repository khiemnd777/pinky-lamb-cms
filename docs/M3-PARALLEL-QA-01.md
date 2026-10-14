# M3-PARALLEL-QA-01 v1 — QA preparation

**Current state:** `QA_PREPARATION_READY` — chỉ approved generic/source preparation. [Generic9/9](../.local/test-outputs/m3/parallel-qa-01/run-c5e9cd3a-34e9-434a-88b9-813fb077056d/worker/admitted-checks.json), [capped static3](../.local/test-outputs/m3/parallel-qa-01/run-c5e9cd3a-34e9-434a-88b9-813fb077056d/worker/static-cap-repair-result.json), [High final repair review](../.local/test-outputs/m3/parallel-qa-01/run-c5e9cd3a-34e9-434a-88b9-813fb077056d/reviewer/static-cap-repair-review.json). Các QUEUED/pending/nonREADY sections bên dưới là historical timelines; current final status supersedes phần current preparation gate, không rewrite receipts. Preparation gồm matrix AC01–18, generic independent oracle/tests và runbook draft. Chưa chứng minh sản phẩm CMS.

## Authority và ownership — Verified

Authority kind `HUMAN_DELEGATED_COORDINATOR_APPROVAL`, không direct human slice approval. Khiêm giao quyền điều phối trong source chat `01a135e2-c142-7842-ae74-e1d8998bb073`, userMessage `01a135fe-29c1-7252-83f1-e8f05f2f8e6c`; Coordinator ghi `M3-PARALLEL-BATCH-01 v1` ở [register](../../approvals/M3-PARALLEL-COORDINATION-01-REGISTER.json), key `qa`: `PREPARATION_GENERIC_ORACLE_APPROVED_SCHEMA_CASES_WAIT_FREEZE_INTEGRATED_QA_HOLD`. Frozen [proposal](M3-PARALLEL-COORDINATION-01.md) SHA256 `69db3eceaee253c42c09740de4ecbe38fd620d8a02c27091d77defc106c9d8a2`; parent đã xác nhận snapshot. Không mở native/runtime, Git/cloud/production/M4 hoặc human acceptance.

Task Owner chat `01a135ee-a794-7541-9bb6-e0b81141ae45`; worker `/root/qa_medium` sole writer đúng năm file dưới `pinky-lamb-cms/`:

1. `docs/M3-PARALLEL-QA-01.md`
2. `tests/fixtures/m3-parallel-qa-matrix.json`
3. `tests/helpers/m3-parallel-qa-oracle.mjs`
4. `tests/m3-parallel-qa-oracle.test.mjs`
5. `docs/M3-PARALLEL-QA-01-RUNBOOK.md`

Requested route actual `gpt-6.1-sol / medium`. Own session `01a13609-ade4-7753-b912-1273d00858b8` current turn_context observed `model:gpt-6.1-sol`, `effort:medium`; parent independently confirmed trước source writes. Previous `/root/qa_preparation` full-history worker bị interrupt vì observed xhigh; parent báo cả năm paths chưa tồn tại khi handoff. Không kế thừa ownership/execution của worker đó.

Evidence chỉ `.local/test-outputs/m3/parallel-qa-01/run-c5e9cd3a-34e9-434a-88b9-813fb077056d/worker/`. Parent owns preflight/review/preservation; parent-preflight 171 protected records là source protection, không data/runtime proof. Worker không ghi registers/shared indices/M3-REVIEW/QA-M3/LOCAL-RUNBOOK/history/tool pins/backend/runtime.

## Kết quả và giới hạn

**Verified — written:** QA-P1 matrix gồm 20 scenario groups, explicit input/steps/expected/oracle/dependency/evidence/side effects, trace AC01–18 và frozen resource caps. Mọi product scenario `NOT_RUN`, authorization `HOLD`. `max_processing_attempts:2` nghĩa TOTAL attempts. M3-IDEMPOTENCY-DECISION-01 được mô tả: header Idempotency-Key authority; requestId normalized operation key distinct asset/version; optional body mirror equality; current auth on replay; actor+operation+resource+key+exact payload fingerprint; changed payload 422, changed part bytes409. Full binding freeze chưa release.

**Verified — written:** QA-P2 tests authored trước helper. `RED_NOT_RUN_QUEUED`, không giả failed RED hoặc GREEN. Helper chỉ import `node:crypto`, không production validator/hash/SDK/guard/server. Literal SHA empty/abc/canonical JSON vectors; rejects cycles/custom/nonJSON/undefined/sparse/accessor/symbol properties; UTF-8 bytes, safe cap accounting; exact caller-supplied public inventory rehash actual Uint8Array bytes, rejects duplicate/missing/extra/unsafe paths/non-files/hash/type/size/MIME mismatch. Public paths reject `%`, query/fragment để tránh served alias. Inventory không tự đọc filesystem và không chứng minh type metadata thật; caller cần no-follow custody evidence. Metadata MIME không native decode proof. Controlled synthetic sentinel scan không full leak proof.

**Verified — written:** QA-P3 [runbook draft](M3-PARALLEL-QA-01-RUNBOOK.md) giữ preservation/readiness/lifecycle/cache/retention boundaries. Không đoán integrated ports/commands/flags. Historical IMAGE candidate ownership và PDF handoff không là QA product PASS: PDF `BLOCKED_TOOL_BYTES`, 12 dylib drift/cause Unknown, native0; không sanitized proof. M3-REVIEW R2 HOLD/R3 awaiting approval; LOCAL_COMPLETE false.

**Unknown / BLOCKED_CONTRACT:** schemaV3 golden vectors, sourceChecks, proofKeys, exact machine error contracts, lease/quota receipts và exporter flags chờ Coordinator C0/U0/rights freeze. **NOT_RUN:** oracle tests đang QUEUED; integrated/native/emulator/browser/network/Firebase/data checks, build/audit, Safari/physical/human acceptance. Không cấp quyền từ silence.

## Checks và bàn giao

Static checks PASS: cached Node `--check tests/helpers/m3-parallel-qa-oracle.mjs`, `--check tests/m3-parallel-qa-oracle.test.mjs`, và cached Node `node_modules/eslint/bin/eslint.js tests/helpers/m3-parallel-qa-oracle.mjs tests/m3-parallel-qa-oracle.test.mjs`: mỗi exit0, stdout/stderr rỗng. [Exact results](../.local/test-outputs/m3/parallel-qa-01/run-c5e9cd3a-34e9-434a-88b9-813fb077056d/worker/static-checks.json). Không `--fix`. Pure runner cần admission riêng: concurrency1, heap256 MiB, deadline60s, fixture≤1 MiB, evidence≤10 MiB. Không Python substitute tests. Parent source review đã PASS_SOURCE_ONLY; slot release còn pending; routine repairs chỉ năm file. Material approach change phải báo Coordinator trước dependent execution.

Coordinator next action: cấp pure slot admission sau khi kiểm custody/preservation; source candidate đã independent High review PASS_SOURCE_ONLY. Integrated 34→35→36→37→38 vẫn chờ modules/exporter/runtime authority. Chỉ Coordinator cập nhật shared state; user quyết định TechNote level và nghiệm thu.

## Routine repair P2 — Verified source delta, tests QUEUED

Independent High `reviewer/source-review.json` ghi `HOLD_SOURCE_ONLY_REQUIRED_P2`, finding `QA-SOURCE-P2-01`: empty sentinel list trả no-hits và `.some` bỏ qua sparse holes. Tests regression được thêm trước helper repair (`RED_NOT_RUN_QUEUED`). `scanSyntheticPrivacy` giờ yêu cầu nonempty list và từng own data element là nonempty string; reject empty/sparse/inherited/nonstring/accessor elements, giữ controlled-marker-only limitation. Không thực thi oracle để suy PASS.

Optional `QA-OPTIONAL-01`: matrix bổ sung frozen spec line141 caps library200versions, active intents2/uploader và4/project, global processor1; quota/library scenarios mô tả boundary/cap+1. Không cấp product execution hoặc dựng machine contract.

Own current turn_context vẫn observed `gpt-6.1-sol / medium` trước repair writes. Original `source-freeze.json`, original/final static receipts và reviewer finding được giữ; additive `worker/source-freeze-v2.json` và `worker/static-repair-checks.json` ghi repaired source/checks. Runbook unchanged. Source-only syntax/lint PASS vẫn không là pure test PASS; preparation chưa READY/Closed, integrated/native/product checks NOT_RUN. Parent repair delta review đã PASS_SOURCE_ONLY; pure slot admission còn pending.

Adjacent repair cùng finding: parent phát hiện caller-controlled `Symbol.iterator` có thể trả empty khi dedup sentinel array. Regression custom iterator và accessor được viết trước (`RED_NOT_RUN_QUEUED`). Helper collect validated descriptor values vào internal plain array, dedup/scan chỉ array nội bộ. Current own turn_context reverified actual Medium trước writes. Matrix/runbook giữ nguyên; additive `worker/static-repair2-checks.json` và `worker/source-freeze-v3.json` giữ provenance. Syntax/lint repaired helper/tests PASS exit0; pure execution vẫn QUEUED; High delta review đã PASS_SOURCE_ONLY.


## Final source review — Verified source only

Independent actual High receipt [source-repair2-review.json](../.local/test-outputs/m3/parallel-qa-01/run-c5e9cd3a-34e9-434a-88b9-813fb077056d/reviewer/source-repair2-review.json), SHA256 `60bf874158876baedb1f3511a660f018010aeaf159e5e67d32d7ae8b0263df3d`, verdict `PASS_REPAIR2_SOURCE_ONLY_TEST_QUEUED`. Reviewer session `01a1360f-d3af-7310-af77-7b8b885f1b53`, observed actual High at `2026-10-13T16:27:14.543Z`; provenance theo parent independently verified receipt/route. `QA-SOURCE-P2-01` và adjacent iterator `P2-02` addressed source-only; không còn Required source finding trên frozen v3. Review tái sử dụng unchanged conclusions, không chuyển source proof thành runtime proof.

Current state tại final source review trước alignment là `PREPARATION_SOURCE_WRITTEN_STATIC_VERIFIED_TEST_QUEUED`. Oracle execution `NOT_RUN_QUEUED`; không `QA_PREPARATION_READY`, Closed, M3 acceptance hoặc LOCAL_COMPLETE. Chỉ taskdoc thay đổi ở final state update; helper/tests/matrix/runbook hashes giữ nguyên. Own actual Medium reverified trước doc write. Không rerun checks cho docs-only update và không check/process đang chạy. Additive `worker/source-freeze-final.json` ghi final doc SHA cùng preserved source hashes. Next owner Coordinator: final preservation/evidence handoff, rồi cấp admission riêng cho bounded pure tests; không tự mở integrated/native/product checks.


## Source/recipe/contract handoff — IMAGE alignment

**Verified — authority/source inspection:** `M3-C0-IMAGE-ALIGNMENT-01 v1` trong coordination register là `HUMAN_DELEGATED_COORDINATOR_APPROVAL`, status `COORDINATOR_APPROVED_C0_REVISION_SOURCE_ONLY_NOT_COMPATIBILITY_FREEZE`. Source `cms-api/media-images-runtime.mjs:147` resize width-only `withoutEnlargement:true`; line160 push mỗi bucket với `targetWidth`. Source inspection không chạy processor. C0 doc tại inspection còn provisional both-edge1920/unique-effective-width/1..3/dedup constraints; quyết định mới áp cho forthcoming C0 revision, không xác nhận delivery.

**Proposed — descriptive QA alignment:** IMAGE-01/V3-01 giờ giữ exactly3 IMAGE entries, distinct targetWidth320/960/1920 và logical keys. Effective width=min(targetWidth, oriented original width), aspect ratio rounding≤1px, no upscale; oriented original8192edge/40Mp caps giữ, height có thể>1920. Expected portrait2000x3000→1920x2880; tiny120x80→cả3buckets120x80, equal effective widths hợp lệ. Không dedup outputs; rights pin whole processed set cả3entries, không selected subset. targetWidth forbiddenPDF/VIDEO. Proposed revised projection/order gồm targetWidth và trusted Storage generation do V3 owner phụ trách. Đây là planned inputs/expected, không executable golden hoặc native proof.

**Unknown/NOT_RUN:** exact hash/golden full binding `BLOCKED_CONTRACT` đến Coordinator C0/U0/rights freeze; native actual output proof absent, pure execution `NOT_RUN_QUEUED`. IMAGE candidate fixture subset/legacy contracts không thay. Không ghi C0/processor/candidate/legacy. Helper/oracle tests/runbook và historical source/static/review receipts giữ nguyên. Own runtime actual Medium reverified trước hai writes. No Node/syntax/lint rerun cho docs/data-only delta, no product checks hoặc active checks. Additive `worker/image-alignment-handoff.json` pin hai changed hashes và ba preserved hashes. Current `SOURCE_PREPARATION_REVIEWED_TEST_QUEUED`, alignment source/doc reviewed `PASS_DOC_DATA_ALIGNMENT_ONLY`; không QA_READY/Closed. Next owner Coordinator xử lý pending pure admission; alignment review không cấp execution.


**Verified — alignment review:** [image-alignment-review.json](../.local/test-outputs/m3/parallel-qa-01/run-c5e9cd3a-34e9-434a-88b9-813fb077056d/reviewer/image-alignment-review.json) ghi `PASS_DOC_DATA_ALIGNMENT_ONLY`, no Required findings, observed `2026-10-13T16:39:16.527206Z`; actual High session `01a1360f-d3af-7310-af77-7b8b885f1b53`. Generic oracle review được reuse vì helper/tests/runbook unchanged. Optional dependency wording đã làm rõ `standalone IMAGE processor frozen full three-bucket recipe`, tách khỏi read-only IMAGE fixture subset. Own actual Medium reverified trước final text/data writes. `worker/image-alignment-handoff-final.json` pin hai changed và ba preserved hashes; không rerun checks. Pure tests QUEUED, C0 full freeze/revised delivery Unknown, native proof NOT_RUN; source/doc PASS không QA_READY/Closed hoặc product acceptance. No active checks.


## Current coordination handoff — runner QUEUED

Direct human request theo parent: “Tự phối hợp với Coordinator để nhận slot chạy pure tests, hoàn tất QA preparation theo scope đã duyệt và báo kết quả cho tôi.” Parent đã gửi ba direct slot requests qua app send_message_to_thread tới Coordinator chat `01a135e2-c142-7842-ae74-e1d8998bb073`; tool dispatch accepted, chưa nhận Coordinator admission/ACK. Đây là parent-reported coordination provenance, không tự đặt timestamp cho original human message và không coi dispatch hay elapsed time là admission.

Current pool theo parent: IMAGE `01a135ee-860c-7631-9452-05ec59c52995` và recovery A `01a135ca-5716-7c20-9920-bbd64ddcbbfa`; QA register vẫn QUEUED. Own observed actual Medium được reverify trước doc write. Read-only preflight trước đó năm hashes match, matrix23420B, evidence78824B; chưa có source change trước handoff update. No active checks/process do worker chạy; pure tests `NOT_RUN_QUEUED`. Không Node/tests/checks execution trong handoff này.

Current state `SOURCE_PREPARATION_REVIEWED_TEST_QUEUED`; preparation chưa READY/Complete/Closed. Next owner Coordinator cấp explicit admission rồi Medium chạy focused owned test file, concurrency1/heap256MiB/deadline60s/fixture≤1MiB/evidence≤10MiB trong existing namespace. Parent yields queued handoff để nhận admission reply; không cần human confirmation mới khi cùng approved approach/scope/limits còn valid. Không tự mở native/integrated/product checks. Additive `worker/runner-request-handoff.json` ghi observation UTC từ actual local clock, không original message time, current source hashes và no active worker process.


## Admitted preparation verification — current result

**Verified:** Coordinator `M3-PURE-POOL-04 v1`, `COORDINATOR_APPROVED`, authority `HUMAN_DELEGATED_COORDINATOR_APPROVAL`, branch QA `ADMITTED_GENERIC_ORACLE` được đọc fresh trước execution. Own current turn_context actual `gpt-6.1-sol / medium`; năm source pins khớp `worker/runner-request-handoff.json` trước và sau checks, trước result doc writes. Parent independently observed Medium `2026-10-13T17:28:04.957Z`; parent-admission-preflight SHA `6dc70823ee81e331c2d44906605ca0a8111f1c4b1147848c23c5268322020b6c`, protected171records0mismatch theo parent. Đó là scoped non-atomic source/disk proof, không live data/runtime proof.

Actual focused command `.local/cache/node/node-v22.23.3-darwin-arm64/bin/node --max-old-space-size=256 --test --test-concurrency=1 tests/m3-parallel-qa-oracle.test.mjs`: exit0, tests9/pass9/fail0/cancelled0/skipped0/todo0. Cached Node `--check` helper và test, rồi existing ESLint hai owned files tuần tự: cả3 exit0. [Command/result receipts](../.local/test-outputs/m3/parallel-qa-01/run-c5e9cd3a-34e9-434a-88b9-813fb077056d/worker/admitted-checks.json) và `worker/admitted-command-1..4.json` giữ exact command/start/end UTC/TAP/stdout/stderr/PID/PGID/custody. Direct child PID38687/38689/38690/38691 đã wait/reaped; PGID=PID quan sát ngay sau spawn và stdout/stderrEOF đã đọc. Không có active/pending command do worker giữ; không có post-exit group probe hoặc OS-wide absence proof. No signal/timeout/output cap. Minimal env không inherited NODE_OPTIONS/hooks/credentials; suite concurrency1 và --max-old-space-size=256. Hai syntax commands và lint không có heap flag: heap256MiB NOT_ENFORCED/NOT_VERIFIED cho ba static commands này. Inline orchestration tổng deadline60s, stdout/stderr≤64KiB mỗi command, fixture≤1MiB và evidence≤10MiB.

Các QUEUED/NOT_RUN oracle statements và failed-source reviews trước đây là historical, được current admitted results này thay cho current oracle state; RED vẫn `RED_NOT_RUN_QUEUED`, không dựng retroactive RED failure. Generic oracle/source reviews được reuse vì helper/tests không đổi. Source preparation checks passed; final High evidence review và Coordinator control interpretation của static heap limit pending trước READY/closure. Slot đã báo release ngay sau suite+static, không giữ chờ final review.

**Unknown/NOT_RUN:** schemaV3/sourceChecks/proofKeys/exact digest full binding vẫn `BLOCKED_CONTRACT`; mọi20 product scenario vẫn NOT_RUN/HOLD. Native/emulator/browser/integrated QA, real data preservation, CMS acceptance/M3 Closed/M4/LOCAL_COMPLETE/production chưa chứng minh. Generic9/9 chỉ kiểm oracle và matrix invariant, không processor decode/privacy đầy đủ. Next owner parent Coordinator: final scoped preservation/evidence audit và preparation handoff; human chọn TechNote levels/acceptance, không inferred từ silence.


## Historical evidence accuracy correction — docs only

**Verified:** exact admitted suite có heap256 flag; ba static checks trước đó không có heap flag, nên static heap256 `NOT_ENFORCED/NOT_VERIFIED`. Không rewrite command receipts hoặc giả enforce retroactive. Direct-child wait/reaped và stdout/stderrEOF cùng PGID=PID at spawn là custody observation thực; không postexit group/OS-wide absence proof. No active/pending worker command chỉ mô tả trạng thái orchestration, không all-process proof.

Parent đã disclose Coordinator và xin narrow3static admission nếu limit áp dụng. Slot đã RELEASED; chưa có additional Node admission. No Node/check rerun hoặc behavior/source edits trong correction này. Current preparation còn pending High evidence review + Coordinator control interpretation, chưa READY. Historical receipts giữ nguyên. Own actual Medium reverified trước hai docs writes; additive private0600 correction freeze pin changed docs và preserved matrix/helper/test.


## Final preparation handoff — QA_PREPARATION_READY

**Verified:** Approved QA-P1/P2/P3 preparation đã viết và kiểm: matrix20groups trace18AC, generic oracle9/9 PASS, runbook draft. `M3-PURE-POOL-06 / M3-QA-STATIC-CAP-REPAIR-01` exact3 new checks: cached Node22.23.3 `--max-old-space-size=256 --check` helper/test và `--max-old-space-size=256 node_modules/eslint/bin/eslint.js` hai files; mỗi exit0, stdout/stderr rỗng, no stopReason. V8 old-space256 là explicit flag, không process/RSS quota hoặc peak heap measurement. Source5pins unchanged trước mỗi command và sau repair; no suite rerun. Historical oldstatic3 không heapflag vẫn `NOT_ENFORCED/NOT_VERIFIED`; bounded repair supersedes current static gate only.

[High repair review](../.local/test-outputs/m3/parallel-qa-01/run-c5e9cd3a-34e9-434a-88b9-813fb077056d/reviewer/static-cap-repair-review.json) SHA `4e094c99c6bf5289da94d8e9015a2c5d3c72d0dd36849fa96b7986b4f998ca34`: `PASS_EXACT3_STATIC_CAP_REPAIR_ONLY`, Required[]/Optional[], actualHigh/source/generic9/9/IMAGEalignment conclusions reused. Parent final [preservation](../.local/test-outputs/m3/parallel-qa-01/run-c5e9cd3a-34e9-434a-88b9-813fb077056d/parent-static-cap-final-preservation.json) SHA `f0ba4b6fb608b5e9974265f331349bbc84fca042415d5d443823bfd6a06b25e7`,171protectedrecords0mismatch theo parent, scoped non-atomic source/disk, không DB preservation. Parent observed evidence120471B/44files/allregular0600 trước closure. Worker directory0755→0700 metadata-only; historical receipt bytes/hash giữ nguyên, sourcefiles0644 giữ. Additive `worker/final-preparation-handoff.json` mode0600 pin final5files và proof links.

Coordinator direct final ACK theo parent: completion received, result read, slot RELEASE recordedPool07, finish own docs/preservation không cần additional Node. Direct children39883/39884/39885 wait/reaped, stdout/stderrEOF và PGID=PID at spawn; no active/pending worker command. Descendant/group/postexit/OS-wide absence Unknown. Final docs-only closure actualMedium reverified; không Node/check rerun hoặc behavior changes.

**Unknown/NOT_RUN:**20 product scenarios vẫn NOT_RUN/HOLD; full schema/hash/proof binding `BLOCKED_CONTRACT`; integrated/native/browser/emulator/data/operational reproduction và CMS acceptance chưa chạy. Runbook là DRAFT, không claim reproduced. M3 chưa Accepted/Closed, LOCAL_COMPLETEfalse, không M4/production authority. PreparationREADY không user acceptance và không cấp future runtime authority. Next Coordinator tích hợp preparation receipt; dependent QA chỉ sau contract/module/exporter freeze và separate admission. User quyết định TechNote level/acceptance; silence không approval.
