# CMS-RECOVERY-001 — current v2 and historical v1 review

## Trạng thái hiện hành — đã hoàn tất theo xác nhận của Khiêm

**ĐÃ HOÀN TẤT / CLOSED_BY_HUMAN_CONFIRMATION — 17/10/2026 (Asia/Ho_Chi_Minh).** Xem [xác nhận trực tiếp, phạm vi đóng và bảng trạng thái hiện hành](../../tasks/plan.md). Khiêm xác nhận các plan đã xong và giao chỉ đồng bộ tài liệu, không sửa code hoặc chạy lại kiểm thử.

Các trạng thái chờ duyệt/chưa hoàn tất, checkbox và bước tiếp theo trong phần bên dưới thuộc lịch sử trước xác nhận đóng; không tự mở lại plan/task từ các ghi nhận đó. Giữ nguyên bằng chứng PASS/FAIL/NOT_RUN, cờ kỹ thuật và giới hạn đã ghi nhận. Lần đồng bộ này không xác minh runtime, không ghi nhận release hoặc cấp quyền thực thi mới.

## Nội dung lịch sử trước xác nhận đóng


## Kết quả hiện hành — sửa Vite và kiểm thử CMS local, 13/10/2026

**Verified: PASS kỹ thuật; chờ Khiêm review/nghiệm thu.** [Approval Vite](../.local/cache/cms-recovery-001/v2/vite-fix/approval.json), [register hiện hành](../../approvals/CMS-RECOVERY-001-v2-REGISTER.json) và [High final review](../.local/cache/cms-recovery-001/v2/vite-fix/final-high-review.json) là nguồn thật. Đúng một emulator thêm theo lần duyệt Vite đã dùng; cumulative v2 3/3. CLI94803/worker95035 và Vite96430 tại127.0.0.1:5175 giữ hoạt động; không restart/native slot4.

Nguyên nhân startup UI: Vite tối ưu Firebase/Zod vào cache dưới `.local`, rồi guard browser chặn chính đường dẫn private đó. Recovery-only config tắt dependency optimizer discovery/include; giữ private403, CSP, sandbox và cấu hình5173 cũ. Actual dev graph RED500→GREEN200, rồi real browser bootstrap và login/M2 PASS; không nâng Zod/dependency hoặc nới quyền `.local`.

Actual Medium: runtime50/50, UI-safe14/14, lint/syntax/build phù hợp PASS. Một số lỗi tiếp theo thuộc bộ test do agent viết: thiếu public fixture roster; click trước module init; cuộn từng ảnh trong iframe; iframe RAF thiếu deadline; kỳ vọng sai success label thay vì self-review guard đúng nghiệp vụ. Các lỗi test đã sửa trong scope; guards/backend/accepted data giữ nguyên. Raw lỗi và history/inode/manifest trước đó được giữ; timeout2124/wrapper auto-kill UI operator và scratch private cleanupUnknown còn là lịch sử, không được đổi thành natural exit/cleanup PASS.

**E2E thật PASS**, direct child4314 exit0/null: OWNER/EDITOR/REVIEWER/PUBLISHER đọc M2 revision778, đủ8components, hai viewport1440/390,28ảnh legacy loaded/0broken, Snapshot có sẵn và2source checks mỗi role, reload/logout/relogin,5client pre-network refusals mỗi role,4authenticated write405 củaOWNER,3membership403 và private content cleared. 1967 requests chỉ loopback; unexpected console/page/blocked0; private storage0, một SDK heartbeat record đúng benign schema. [39 ảnh/HTML thật](../.local/test-outputs/cms-recovery-001/v2/ui/ui-2026-10-13T12-08-57-019Z-ae886e35a9f9/report.html), [manifest42payloads](../.local/test-outputs/cms-recovery-001/v2/ui/ui-2026-10-13T12-08-57-019Z-ae886e35a9f9/manifest.json). Root và High kiểm hashes/ảnh thật. Raw `PASS_UI_PENDING_PRESERVATION` giữ nguyên; AFTER và High final đã hoàn thành gate bảo toàn.

BEFORE/AFTER full known inventory bằng nhau:10collections/4531docs/9973673canonical bytes; logical2dbe…7040. Disk747entries/84182bytes/20symlinks no-follow giữ hash0891…3832. Đây là bảo toàn phạm vi đã kiểm, không phải wholeDB backup/atomic/global writer audit. Final browser scratch cleanup thực đã hoàn tất.

**Giới hạn:** mode chỉ xem; iframe1440/390 bị clip ngang trong host hẹp236.8/282px; section lớn có ảnh bounded viewport, mobile overview là viewport đã cuộn tới preview. Chưa claim UX responsive hoàn chỉnh. Chỉ demo-pinky-lamb-cms/localhost; production NOT_RUN. M1/M2 Closed/Accepted giữ nguyên, M3/M4 không đổi, LOCAL_COMPLETE false; không Git mutation.

**Báo cáo review cuối:** [HTML tổng hợp](../.local/test-outputs/cms-recovery-001/v2/final-vite-fix-20261013/report.html), [PNG1440×1984](../.local/test-outputs/cms-recovery-001/v2/final-vite-fix-20261013/report.png), [evidence](../.local/test-outputs/cms-recovery-001/v2/final-vite-fix-20261013/evidence.json). Đúng4artifacts; ảnh nguồn nguyên bytes/date/clip ghi rõ. Root và High đã kiểm ảnh/hashes; [factual report review PASS12:22:29UTC](../.local/cache/cms-recovery-001/v2/vite-fix/final-report-high-review.json). Raw39-image report vẫn giữ nguyên.

## Lịch sử trước lần sửa Vite đã duyệt

**Current outcome (2026-10-13): diskCustody repaired; authenticated UI goal HOLD.** [Direct approval receipt](../.local/cache/cms-recovery-001/v2/disk-custody-fix/approval.json) authorized exactly one additional emulator launch. Both cumulative v2 slots are consumed, 2/2. Attempt1 closed safely; attempt2 CLI35660 / worker35886 and Vite40015 retained after actual gates. No third launch or further signal. [Current register](../../approvals/CMS-RECOVERY-001-v2-REGISTER.json) is authoritative; older observations below are historical.

**Verified:** actual Medium implemented the four-file disk fix, reproduced the old symlink refusal and added no-follow/nonblocking regressions. 49 runtime tests PASS; High source review at06:56:08 UTC. Exact20 historical symlink leaves remain unchanged, without dereferencing. Native attempt2 passed ownership/discovery/worker/Unix/anonymous401/four405 controls; High review at07:07:59 UTC. BEFORE inventoried10 known collections /4531 documents; the failed-browser-admission finally AFTER comparison matched the logical hash and747-entry disk hash. This is bounded preservation evidence, not a whole-DB backup. Exactly7 synthetic Auth fixtures were created only in new Auth9098; postfixture comparison also matched. HTTP privacy verified seven403 responses and fixed CSP/sandbox. Accepted M1/M2 data were not reseeded or changed.

**Verifier correction:** BEFORE proof2235187 bytes exceeded the browser reader's2MiB cap. The feature-test attempt refused before opening a browser or logging in. A UI-test-only correction gives BEFORE16MiB while retaining2MiB for native/privacy/high proofs. 11 safe UI tests, lint and syntax PASS; independent High review at07:39:23 UTC. Core9/closure39 unchanged; [r4 freeze](../.local/cache/cms-recovery-001/v2/ui-before-cap-fix-r4/freeze.json). Old privacy/browser releases were not relabeled or rebound to changed UI-test bytes.

**Actual UI failure:** real anonymous desktop/mobile captures show the login shell and `Private/server import forbidden in browser graph` at `contracts/site-records.mjs:1:17`, importing `zod`. `auth.mjs`, `contracts/hero.mjs` and `preview/site-public-data.mjs` returned500. Recovery config places optimizer cache under private `.local`; actual metadata contains optimized `firebase/app`, `firebase/auth` and `zod` there, while browser guards reject that location. Installed Vite resolver source supports this cache/privacy conflict; raw resolved-ID trace was not instrumented. No credentials or login were submitted in diagnostic capture. Mobile390px full-page PNG is1857px wide from real error overflow, without cropping/simulation.

**Report:** [HTML with genuine screenshots](../.local/test-outputs/cms-recovery-001/v2/final-disk-fix-ui-hold-20261013-r2/report.html) and [hash manifest](../.local/test-outputs/cms-recovery-001/v2/final-disk-fix-ui-hold-20261013-r2/manifest.json), six files; source and all three actual images inspected by root and independent High. Final factual review PASS at07:52:20 UTC,15 evidence pins and six report files with zero hash mismatches. This review grants no implementation/lifecycle release. No authenticated M2 image or E2E PASS claim.

**Proposed correction:** reconcile public optimizer with private policy; a minimal candidate `optimizeDeps.noDiscovery:true, include:[]` requires real dev-module GET/browser validation. Retain private403, fixed Auth/CSP and empty iframe sandbox. `vite.config.mjs` is in active core9 binding; editing invalidates that generation. A replacement exceeds2/2 and needs separately approved source/lifecycle/budget scope. No `.local` exposure, guard disabling, hotpatch, third launch or acceptance. Login/M2 HOLD/NOT_RUN; M3/M4 unchanged; LOCAL_COMPLETE false.

## Historical v2 observations before focused disk fix — 2026-10-13

**Verified authority:** direct human Approved CMS-RECOVERY-001 v2 local/emulators authorizes complete startup repair, exactly one new native launch, preserved M1/M2 and actual login/M2 screenshot checks. [Current register](../../approvals/CMS-RECOVERY-001-v2-REGISTER.json) records wording, seven-file scope and execution order.

**Current disposition: DEPENDENT_DATA_UI_HOLD.** The sole V2 CLI24639 and parent session12998 were verified at 2026-10-13T05:45:01.160Z; later ps inspection was denied by the OS, so liveness after that capture is Unknown. Actual High verified startup READY, worker/Unix, anonymous401 and four before-dispatch405 at 2026-10-13T05:36:08.745786Z; budget 1/1. Inventory-before failed at `diskCustody()` because the whole emulator-data scanner rejects all symlinks, including 20 deliberately preserved historical M3 negative fixtures. Independent High confirmed the contract mismatch at 2026-10-13T05:41:22.648799Z; first exact throw path was not captured. No complete BEFORE/AFTER receipt, Auth fixtures, login/M2, HTTP privacy or actual product screenshots. This is not evidence of data loss. No fixture deletion, core hotpatch, extra CLI or signal to current runtime. Actual High confirmed independent Auth custody with zero users/tenants and fulfilled stable private files at 2026-10-13T05:47:18.787415Z. A new preservation amendment is planning-only and needs fresh human approval. Human acceptance **PENDING**; LOCAL_COMPLETE false.

**Historical correction:** v1 was stopped by the human before v2. All three v1 admissions were consumed. Runtime3 wrote `M2_RECOVERY_HOLD: new Hub exact service map` at 2026-10-13T04:36:21.734Z; later discovery/controller completion does not prove API/login/M2. The production operator calls full-map validation before its discovery wait. Initial failing map keys were not captured. Original v1 freeze/admissions/HOLD records stay unchanged; earlier status fields below describe their recorded source phases, not current authority or feature completion.

**V2 source progress:** production-order regression reproduced the old failure; current interim runtime unit checks 42 PASS and safe UI checks 10 PASS. The whole-chain pass found and is correcting the missing explicit Node VM flag and skipped-live-test false-PASS risk. These are source checks; final source freeze/High review are pending. V2 native/SDK/Auth/Chromium/login/M2/screenshots remain NOT_RUN and the single new CLI budget remains unused.

**Current final V2 source:** [r2 freeze](../.local/cache/cms-recovery-001/v2/final-source-freeze-r2/freeze.json), SHA256 `c52d09c9491291cb8c6c8e9dfca7e99f9d60ad7e19c2ef4412248ce3c09374c4`. Actual High reviewed full startup/data/UI/report chain and reconciled 138 live/archive source checks with zero mismatches at 2026-10-13T05:31:28.022234Z. Final 46 runtime unit and 10 safe UI tests PASS; lint/syntax six files and native-loader build PASS. Startup pending callback, current ACTIVE/APPROVED source catalogue, VM flag, typed real report completion and absolute operator commands are corrected. [Source review](../.local/cache/cms-recovery-001/v2/source-high-review.json) is source-only; the one native launch is released, but authenticated data/UI remain NOT_RUN until actual evidence. Earlier progress above is historical.

**Final safety review:** actual High at 2026-10-13T05:47:18.787415Z confirmed `PASS_OWNED_EMPTY_AUTH_PRIVATE_CUSTODY_ONLY` and retained `DEPENDENT_DATA_UI_HOLD`. Auth export producer fulfilled; zero users/tenants, three private files255B and two typed trees equal after1001ms. Current CLI24639/parent24581/worker24865 and parent toolsession12998 are retained; old emulator generations/listeners unchanged in captured metadata. No current signal/restart/create-account permission. [Final review](../.local/cache/cms-recovery-001/v2/runs/awCdMpT2JHUTLvxwQPnUtw/final-high-review.json). UI-only manifest oracle r3 has source-only High PASS with loaded core9/closure39 unchanged; no UI release. Actual login/M2/CMS screenshots and completed data-preservation receipts remain NOT_RUN/HOLD. A four-file type-aware custody fix and one explicitly approved replacement CLI is planning-only; no implementation until fresh direct human approval.

## Historical v1 records (unchanged content below)

**Verified:** user Approved scope local/emulators trong parent chat; approval mới được ghi riêng ở `../../approvals/CMS-RECOVERY-001-v1-REGISTER.json`. Actual coding route của implementer được quan sát `gpt-6.1-sol / medium`. Đây là recovery chỉ xem M2 hiện hữu, không mở lại milestone hoặc cấp acceptance.

Current code freeze: `../.local/cache/cms-recovery-001/final-code-20261013/freeze.json`, SHA256 `c8b095fdd4feb32a85362407213c9eb801e20dcaab7eedd1941b202fb779f409`. Runtime/config/backend source array có 9 files; bounded business/package closure có 39 files. Source bytes đã archive riêng. UI array 14 files có ownership riêng; final Chromium TMP-binding source supplement đang chờ owner freeze, không suy ra integrated UI PASS.

## Verification của source increment

- Pure tests: 33 PASS, 0 FAIL, 0 SKIP. Auth/Firestore fixtures trong các test này là in-memory test doubles; không phải dữ liệu emulator thật.
- ESLint trên 7 JavaScript files: exit 0. Node syntax checks: 7/7 exit 0.
- Vite source build bằng pinned Node, `--mode m2-recovery --configLoader native`: exit 0, 139 modules. Output mới `../.local/test-outputs/cms-recovery-001/builds/bf9c321b-9cbb-4a5e-909e-520f979371ec`.
- Static built HTML CSP dùng Auth 9098/HMR 5175 và giữ iframe sandbox rỗng. Đây chưa phải rendered/browser hoặc HTTP403 proof.
- 13 selected protected historical records giữ nguyên hashes. Không gọi đó là whole-database backup hoặc global zero-wire proof.

High review findings được sửa trong scope: HOME thực được giữ; deadline dừng diagnostics; streams bị cap 256 KiB mỗi stream; atomic epoch tối đa 3 native attempts chặn active/completion-unknown/replay; malformed Hub state HOLD ngay và chỉ retry classified connect-stage refusal. Receipt của actual High reviewer và coordinator route được tách riêng.

## Unknown / NOT_RUN

Native CLI/listener/ownership/discovery/worker/Unix socket/401/405, SDK RPC, new Auth fixtures/custody, live Firestore/disk BEFORE/AFTER, Vite serve/HTTP privacy, actual Chromium temp, desktop/mobile, screenshots và báo cáo giao diện thật đều chưa chạy trong increment này. Các selectors đã viết nhưng chỉ thực thi sau current genuine High source/phase release bằng actual Medium operations worker.

Initial increment01 giữ nguyên hashes/logs nhưng thiếu archive original 5 source files; không tái tạo hoặc claim đã capture. Correction01 và pre-operator archives được giữ bất biến. First source build dùng default bundle loader tạo/xóa temporary Vite config theo installed primary source; không sửa dependency hoặc cleanup node_modules. Final source/build/serve sử dụng native config loader và owned cache mới.

**Proposed next action:** actual High source review current freeze, coordinator release native controls, sau đó từng preservation/fixture/privacy/browser gate. Giữ source cố định sau native freeze để tránh invalidating loaded runtime. Mọi HOLD/pending writer giữ partial new state; không blind retry, không force kill hoặc tác động old runtime/data.

User acceptance **PENDING**. CMS M3/M4, LOCAL_COMPLETE, cloud/production/deployment và Git đều ngoài kết quả này.


## Current routine source candidate — repair02

**Verified:** Coordinator released source repair after actual High closed attempt1 as `CLOSED_SAFE_NO_PENDING_OR_LIVE_CHILDREN`. Current immutable source freeze: `../.local/cache/cms-recovery-001/source-repair-02-freeze/freeze.json`, SHA256 `180025e1bd472cc3d17d34e687dd63ccad73efd7a643afa66dafb69ff8df5dca`. Current9 runtime, UI14 and closure39 exact bytes archived; UI5 and closure39 unchanged.

Four owned paths changed: leaf profile, operator, pure unit tests and runbook. The candidate fixes literal PORT80 file-output discovery, bounded fixed Hub GET request timeout retry, M2-only normalized TCP null path preservation, and strict raw Hub Auth public GET export config projection. Historical helpers/fences remain unchanged. Full internal Auth config is **Unknown**, not reconstructed from the public projection.

Regression RED: 32 PASS / 5 FAIL. Current GREEN: 37 PASS / 0 FAIL / 0 SKIP. Three changed JS files pass lint and syntax checks. Pinned Node Vite source build with `--mode m2-recovery --configLoader native` passes: 139 modules, 132ms; new output `../.local/test-outputs/cms-recovery-001/builds/12ab8fae-8279-4614-bd3e-1f4d017cc8ef`. These are source/unit checks, not live feature verification.

**Unknown / NOT_RUN:** attempt2 on current bytes, SDK Auth/Firestore RPC, fixture creation, UI server/privacy/browser and actual TMP effectiveness. Coordinator confirmed private short tooling scratch `/private/tmp` within approved scope; durable evidence remains in approved CMS folders. Current source-bound High review and release are pending. Earlier freezes and attempt1 evidence remain unchanged; acceptance remains **PENDING**.


## Current routine source candidate — repair03

**Verified:** Coordinator released repair03 after actual High closed attempt2 safely. Exact source candidate: `../.local/cache/cms-recovery-001/source-repair-03-freeze/freeze.json`, SHA256 `eae7a740f2c7a1a396889ce31fe860118517d5a1ee034191e539c747e8b5cfb5`; current9/UI14/closure39 bytes archived, UI5 and closure39 unchanged.

The startup oracle waits for source-bound discovery child admission, natural exit0 completion, valid private manifest and completed controller startup before API/worker ownership probing. The exact observed shebang raw argv variant is admitted only with mandatory pinned execPath/version/cwd/parent/PGID/source proofs. Raw argv is preserved. Malformed identity/schema, nonzero/signal exits and missing manifest after completion hold immediately. Readiness polling stays inside the existing 120-second deadline and stops after cancellation. Prior repair02 controls remain unchanged.

RED: 37 PASS / 2 FAIL. GREEN: 39 PASS / 0 FAIL / 0 SKIP. Lint/syntax of3 changed JavaScript files exit0. Native-loader source build passes139 modules91ms at `../.local/test-outputs/cms-recovery-001/builds/39702f21-17aa-4367-b642-320e1dcd6eac`. Full7-user raw Hub export validation remains covered alongside empty/partial exports and unknown/duplicate/claim refusals.

**Unknown / NOT_RUN:** attempt3 on current bytes, actual fixtures/preservation/privacy/browser and TMP effectiveness. Attempt2 native observations and empty owned Auth custody are preserved as separate evidence from ops/High; they do not release changed sources. Current source-bound High gate is pending; source writes are stopped. Acceptance remains **PENDING**.

## Diagnostic handoff — current V2 HOLD

[HTML report](../.local/test-outputs/cms-recovery-001/v2/hold-20261013-055017/report.html) and [manifest](../.local/test-outputs/cms-recovery-001/v2/hold-20261013-055017/manifest.json) are source-backed diagnostics, not CMS screenshots. Six file hashes match; factual independent High source review PASS at2026-10-13T05:56:16.176841Z. Actual product UI/images remain NOT_RUN. Diagnostic PNG is NOT_RUN: existing cached Chromium closed before page/context creation; native cause was not retained in full and remains Unknown. Later default ps inspection also returned OS denial; last successful native snapshot remains05:45:01.160Z. No fresh liveness, cleanup, whole-data preservation, browser visual QA or goal completion claim. No escalation, install, source/core hotpatch, signal or extra CLI. Any proposed amendment must first prove allowed process/browser/capture capability offline before close/core edits or exclusive replacement slot2.
