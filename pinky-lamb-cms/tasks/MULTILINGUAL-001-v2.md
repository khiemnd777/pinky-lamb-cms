# MULTILINGUAL-001 v2 — Tasks P0–P7

## Trạng thái hiện hành — đã hoàn tất theo xác nhận của Khiêm

**ĐÃ HOÀN TẤT / CLOSED_BY_HUMAN_CONFIRMATION — 17/10/2026 (Asia/Ho_Chi_Minh).** Xem [xác nhận trực tiếp, phạm vi đóng và bảng trạng thái hiện hành](../../tasks/plan.md). Khiêm xác nhận các plan đã xong và giao chỉ đồng bộ tài liệu, không sửa code hoặc chạy lại kiểm thử.

Các trạng thái chờ duyệt/chưa hoàn tất, checkbox và bước tiếp theo trong phần bên dưới thuộc lịch sử trước xác nhận đóng; không tự mở lại plan/task từ các ghi nhận đó. Giữ nguyên bằng chứng PASS/FAIL/NOT_RUN, cờ kỹ thuật và giới hạn đã ghi nhận. Lần đồng bộ này không xác minh runtime, không ghi nhận release hoặc cấp quyền thực thi mới.

## Nội dung lịch sử trước xác nhận đóng


## Execution hiện hành — solo rework P3–P7

Khiêm yêu cầu rework toàn bộ P3–P7, tự lập kế hoạch và tự triển khai, không dùng subagent. Chỉ đạo effort mới nhất: **High cho toàn bộ rework**, thay routing Medium đối với đúng nhiệm vụ này. Đây không phải thay đổi global config hoặc sandbox. Approval source P3–P7 và mockup/template đã duyệt tiếp tục là ranh giới nghiệp vụ; retained import, activation `:5010`, accounts/roles, Git và cloud chưa được phép.

Phiên cũ đã nhận stop. Bốn child đã được quan sát ở trạng thái idle/notLoaded với turn hoàn tất; không giao việc mới. Chat này là sole writer. Những kết luận source-complete và evidence cũ bên dưới giữ làm lịch sử, không được dùng để đóng rework.

Trình tự thực hiện, không chạy checks giữa các phần. Checkboxes dưới đây chỉ ghi source; không đóng acceptance/runtime của phase:

- [x] **P3 source:** tự đối chiếu và rework Project/Service/Work/Services từ typed contracts, transaction/CAS/idempotency đến controller, mounts, saved preview, availability, renderer và export. Giữ IDs, sidecar stores và dữ liệu đang có; không fallback sang locale khác.
- [x] **P4 source:** một locale nội dung trong bộ nhớ phiên, truyền nhất quán qua nhóm/tab/entity; rework bảy group contracts/API/editors, dictionary, SEO và full-site saved preview. Giữ trường shared chỉ đọc, dirty/unknown-outcome guards và template.
- [x] **P5 source:** rework đường resource → immutable snapshot → source attestation → review → eligibility; UI/callers/routes đúng từng đối tượng/locale, chặn self-review và stale source, rebase có xác nhận, không đọc latest draft vào release.
- [x] **P6 source:** hoàn chỉnh inventory và mapping nguồn có path/hash kiểm được; validate toàn bộ selected plan, dry-run không ghi, selective import/CAS/idempotency/before-image/partial recovery; có commands/callers thực cho inventory và recovery. Chỉ viết source và test source, không thực thi import.
- [x] **P7 source:** rework composer/export/resource closure/SEO/routes và activation/recovery tooling; đóng băng approved snapshot set ba locale, adapt đủ template, bảo toàn public baseline. Không thực thi activation.
- [x] **Source handoff:** tự rà source và toàn bộ callers/imports/routes/UI/commands theo từng yêu cầu, liệt kê đúng phần còn thiếu. Chỉ ghi CODE_COMPLETE_UNTESTED khi không còn thiếu source thuộc phạm vi.
- [ ] **Một đợt kiểm cuối:** scoped static/unit/contract/integration/build và UI khi đủ quyền/prerequisites. Sửa lỗi sản phẩm và chỉ kiểm lại phần ảnh hưởng; không mở vòng sửa harness. Thiếu proof giữ NOT_RUN/Unknown; không import retained data/activation để lấy PASS.

Source ownership: localization modules dưới `contracts/`, `cms-api/`, `admin/`, `preview/`, tooling dưới `scripts/` và tests bị tác động; shared mounts/router/admission chỉ sửa để nối các luồng trên. Không sửa Auth/session policy, RBAC/rules, baseline `dist/`/`public-baseline`, root Firebase config hoặc lịch sử approvals/evidence. Các bước nội bộ không tạo checkpoint xin duyệt mới. Cập nhật task này tại mốc source hoàn chỉnh và kết quả cuối.

Trạng thái bắt đầu: **SOLO_REWORK_IN_PROGRESS; source chưa hoàn tất; checks của rework NOT_RUN**.

**Trạng thái bàn giao solo rework: SOURCE_REWORK_IMPLEMENTED; LOCAL_CHECKS_PASS; RUNTIME_UI_NOT_RUN.** Không gán ACCEPTED/LOCAL_COMPLETE cho P3–P7.

Đợt kiểm cuối có một lượt chung 235 tests: 234 PASS, 1 assertion cũ của Project route sai vì coi endpoint Service đã duyệt là route bị cấm. Sửa testcase để kiểm cả Project/Service và vẫn từ chối singular alias/method sai; nhóm route/contract bị ảnh hưởng 13/13 PASS. Rà cuối bổ sung xử lý lost readback của selected import thành PARTIAL có stage/index/outcomeUnknown; nhóm import/recovery cuối 8/8 PASS trên service thật với transaction store trong bộ nhớ. Không thực thi retained import. ESLint source/tests bị ảnh hưởng PASS. Build admin PASS; sửa URL artwork trong preview measurement CSS sang asset baseline hiện có, build lại phần bị ảnh hưởng và không còn cảnh báo asset đó. Không sửa runtime harness hoặc chạy lại toàn bộ suite sau mỗi thay đổi.

Logs và kết quả: `.local/test-outputs/multilingual-001/solo-high-rework-20261016/{results.json,lint.log,unit.log,route-contract-rerun.log,import-final.log,build-final.log}`. Build kiểm source: `.local/test-outputs/multilingual-001/solo-high-rework-20261016/admin-build-final/`, chưa thay admin-dist/deploy. Browser thử mở `http://127.0.0.1:5173` trả ERR_CONNECTION_REFUSED; authenticated UI/desktop-mobile/parity/end-to-end NOT_RUN. Không sửa profile, không mở tài khoản/role, không khởi động lại emulators, không retained import/activation5010. Điều kiện tiếp: runtime CMS tại :5173 và phiên biên tập/reviewer có sẵn cho UAT đúng scope. Owner: runtime local hiện hành và Khiêm cho tài khoản/nghiệm thu; code rework do chat này giữ trách nhiệm.

Mốc source của solo rework: đã nối một content-locale owner vào vòng đời phiên và các mounts; thay năm controller bằng command/readback dùng chung; thêm chỉnh sửa + xác nhận rebase; guard input đối chiếu nguồn; import contract revision 2 với mapping từng trường + xác minh nguồn thật; inventory/recover command; exporter lấy frozen release/media qua transport loopback đã xác thực; Hosting byte preflight và recovery reconciliation. Không chạy checks giữa các phần. Bắt đầu một đợt kiểm cuối sau mốc này; chưa có kết quả kiểm của rework.

Commands source hiện hành (chưa thực thi retained import/activation): `local-guard.mjs multilingual-import <validate|inventory|dry-run|apply|recover> .local/<input>.json --run-id <id>`; `export-multilingual-site <--bundle|--release|--fetch> ...`; `activate-multilingual-site <prepare|serve> ...`. Inventory request: `{contractRevision:1,kind:"RETAINED_HOME_V3_INVENTORY_REQUEST"}`; fetch request: `{contractRevision:1,kind:"FROZEN_LOCALIZED_RELEASE_REQUEST"}`. Session token chỉ qua stdin/memory. Import v1 chỉ có path/hash tổng không đủ evidence; v2 bắt buộc source origin/path/hash và mapping mọi trường dịch (sourcePath/hash/language → targetPath/treatment/reviewedBy). `recover` chọn đúng journalRunId/index và cần approval corrective save riêng. `serve` chỉ bind cổng trống sau exact approval, không dừng/adopt retained Hosting. Controller switch/restore yêu cầu owner Hosting độc lập; chưa khẳng định runtime hiện có đáp ứng.


---

Ngày 16/10/2026. **P3–P7 INCOMPLETE / P7 SOURCE_PARTIAL / :5010 BASELINE_UNCHANGED**. [Plan/AC canonical](../docs/MULTILINGUAL-001-v2.md), [manifest kế hoạch lịch sử](../../approvals/MULTILINGUAL-001-P3-P7-v1.plan.json). P1/P2 có task thực thi riêng; các bảng P0–P2 và preparation bên dưới là mapping/snapshot lịch sử. Quyền code P3–P7 đã được mở bằng chỉ đạo trực tiếp ghi trong phần execution; quyền retained import và activation vẫn chưa mở. Bảng đối soát ngay dưới đây là trạng thái hiện hành, thay các mô tả NOT_STARTED hoặc “all P3–P7 source complete” cũ cho mục đích bàn giao hiện tại. Không thay đổi approval/evidence lịch sử.

## Đối soát trạng thái hiện hành — sửa báo cáo P7 quá mức

Đích P7 giữ nguyên: dữ liệu CMS được áp vào đúng template đã duyệt và phục vụ thật tại `/`, `/vi/`, `/ja/` trên :5010; có kiểm chứng UI/nội dung/tương tác. Viết source/tooling không thay thế kết quả này.

| Phase | Phần đã có bằng chứng | Phần còn thiếu để kết thúc |
| --- | --- | --- |
| P3 | Project representative ACCEPTED_SCOPED; source Service/Work/Services và API/renderer đã tích hợp; actual3ENcommits/6writes, scoped unit/read-only/UI evidence | P3 remainder chưa nghiệm thu đầy đủ; VI/JA writes/CAS/retry còn thiếu; hai browser regressions đã dừng vẫn FAIL, không chạy lại harness để đổi nhãn |
| P4 | Source7groups/dictionary/SEO/fullrenderer; actual26reads và scoped empty-workspace locale/UI checks sau Vite reload |21group drafts (7×3locales) còn ABSENT theo lượt đọc cuối; chưa có fullsite populated parity và actual group-save proof |
| P5 | Source immutable snapshots/review/rebase/eligibility; contract/API fixture tests; actual queue empty và eligibility false | Chưa kiểm luồng submit→reviewer khác→approved bằng dữ liệu/session thật; hiện mới xác nhận OWNER, không tự tạo account hoặc lách self-review |
| P6 | Source dry-run/import/journal/recovery và scoped synthetic tests | Chưa chốt/chấp nhận mapping và nội dung EN/VI/JA đầy đủ; chưa chạy retained import hoặc nghiệm thu ngôn ngữ |
| P7 | Template pins; renderer/export/sitemap/resource handler và controller fixture tests | Chưa có release thật từ dữ liệu CMS; fullsite runtime parity chưa đạt; CHƯA có operational caller/controller cho Hosting hiện chạy; chưa activation/HTTP/UAT :5010 |

**P7 source gap xác nhận bằng source search:** `activateMultilingualSite()` và `startStandaloneReleaseHosting()` chỉ xuất hiện ở định nghĩa và tests; command hiện hành chỉ `prepare`. `activateMultilingualSite()` nhận controller được inject, tests cung cấp controller giả. Không có production/local application caller cung cấp `identity/inspectHosting/capture/stopHosting/startRelease/verifyRelease/restoreHosting` cho tiến trình Hosting hiện tại. Listener Hosting/Functions/Auth/Storage cùng PID15465 ở lượt quan sát cuối, không thỏa giả định independentlyManaged của tooling. Standalone listener chỉ hỗ trợ cổng5010 đang trống; nó không giải quyết chuyển nguồn phục vụ trên tiến trình hiện tại. Vì vậy báo cáo “all P3–P7 source complete” là quá mức và được đính chính thành **P7 SOURCE_PARTIAL / OPERATIONAL_INTEGRATION_NOT_IMPLEMENTED**. Không được coi thiếu quyền activation là nguyên nhân duy nhất của P7 chưa xong.

Điểm tiếp tục phải dựa trên WBS P7 đã duyệt: hoàn thiện operational binding phù hợp runtime thực tế, chuẩn bị nội dung/approved dataset còn thiếu, kiểm CMS→template trên dữ liệu thật, rồi mới thực thi chuyển :5010 sau approval tương ứng. Không đổi template, bỏ kiểm quyền, dùng mock/sample/fallback để che dữ liệu thiếu, restart emulator parent hoặc thêm vòng harness/hồ sơ. Chưa sửa source/dữ liệu/process trong lần đối soát này. P1/P2/M3/M4 và LOCAL_COMPLETE giữ nguyên.

## Cách dùng và ownership

- Đây là checklist rework duy nhất; [tasks P1 v1](MULTILINGUAL-001-P1-v1.md) giữ evidence/history, không cấp quyền tiếp tục UI cũ.
- **R:** root, owner plan/design mapping/scope/shared records. **I:** một implementer được giao cho slice; sole writer source trong slice đó. **Q:** người kiểm/reviewer được giao; chưa có nghĩa đã chạy reviewer độc lập. **H:** người dùng duyệt design/scope; người rà nội dung ngôn ngữ theo nhiệm vụ. Có thể thực hiện các vai trò tuần tự theo routing thật; không tự tạo đội.
- Source paths trong bảng là **dự kiến để lập scope**, không phải execution allowlist. Prefix mặc định là `pinky-lamb-cms/`; đường mới ghi `(mới)`. Trước phase implementation phải chốt exact paths, expected source digests, source/caller/auth transport/tests, runtime/data writes và cleanup boundaries. Thay scope/control đáng kể cần Approved; routine repair trong scope còn hiệu lực không xin lại từng bug/file.
- Mỗi task kế thừa invariant/data/security và UX01–UX12 áp dụng trong plan. Cột “AC và proof” là tiêu chí kết thúc, **không phải kết quả PASS hiện tại**. Handoff ghi criterion, locale/entity, role/state, viewport, evidence, PASS/FAIL/NOT_RUN, owner và bước tiếp theo.
- Tránh tập hợp nhiều trách nhiệm vào một task: khi exact ownership vượt một lát cắt review được, chia task con trước triển khai; thường 3–5 file/slice. Không mở rộng bằng cleanup, dependency upgrades hoặc framework mới.

## P0 — chuẩn thiết kế và contracts

| Task | Owner / trạng thái | Kết quả và source dự kiến | Depends | AC và proof |
| --- | --- | --- | --- | --- |
| P0-01 | R — [x] DOCUMENTED | Pin HTML/CSS/JS và quote duyệt trong `approvals/MULTILINGUAL-001-v2.design.json`; mapping UX trong plan; giữ lịch sử P1 | Human duyệt mockup | Ba source hashes khớp approval record; chỉ ghi design approval, implementation=false; kiểm static và links |
| P0-02 | R — [x] DOCUMENTED | UI mới thay form cũ; shared/source read-only; toolbar/state mapping theo mockup, không thêm entry/HTML | P0-01 | Contract P0 đã chốt theo direct human correction; không yêu cầu giữ source editor cũ hoặc duyệt lại mockup |
| P0-03 | R — [x] DOCUMENTED | Chốt contract adapter rich text, shared/localized/entity keys, CSS resource/CSP hash và projection interface; đọc `contracts/hero-localization*.mjs`, `cms-api/hero-localization-context.mjs`, `admin/hero-localization-preview.mjs` | P0-01 | Có mapping lossless cùng limits; threat cases/style source/byte identity rõ; P3/P5 dùng contract owner duy nhất, không generic model ép mọi nhóm |
| P0-04 | R — [x] BUNDLE_READY | Freeze P1 v2 scope/task allowlist + current digests + data/runtime plan; lập scope các phase sau khi tới lượt | P0-02/03 | Concrete bundle review được; liệt kê cả source mount/toolbar/transport/renderer/style/QA callers/tests; human Approved đúng slice trước ghi sản phẩm |

## P1 — rework Hero xuyên suốt

| Task | Owner | Kết quả / files dự kiến | Depends | AC và proof |
| --- | --- | --- | --- | --- |
| P1-01 [ ] | I | Đưa bản dịch vào đúng Hero tab; context actions và source entry đã chốt. `admin/site-settings-editor.mjs`, `site-media-editor.mjs`, `cms-shell.mjs` nếu thực sự cần, scoped UI test | P0-04 + Approved P1 v2 | UX01/02/04: không append dưới Đầu trang/SEO, không giữ source form cũ trong Hero hoặc thêm entry ngoài mockup; save semantics nhóm khác giữ; rendered cả ba tab và dirty group navigation |
| P1-02 [ ] | I | Workspace form/locale/state + toolbar rich text. `admin/hero-localization-editor.mjs`, `.css`, adapter text riêng nếu cần, controller/editor tests | P1-01; P0-03 | UX03/05/06/08: input liền mạch; format/paste/IME round-trip; field/run/bytes limits giữ; không arbitrary HTML hoặc mất format im lặng |
| P1-03 [ ] | I/Q | Nối request intent, loading/read-only/error/dirty guard vào controls thật; `admin/hero-localization-editor.mjs`, editor/UI tests, API test nếu logic liên quan đổi | P1-02 | UX10/11: lưu đúng locale, lỗi giữ chữ; same-key retry/response loss/CAS; navigation pending/unknown commit không thất thoát intent; backend ACL không dựa vào UI |
| P1-04 [ ] | I | Hero renderer và stylesheet approved composition. `preview/hero-localization-renderer.mjs`, stylesheet Hero riêng (mới), `cms-api/hero-localization-context.mjs`, resource contract/test khi cần | P0-03; P1-02 | UX12: EN/VI/JA, title dài hợp lệ, artwork không đổi binary; CSS resource đúng hash/size, không sửa CSS baseline; renderer/resource tests có tamper cases |
| P1-05 [ ] | I/Q | Private preview faithful + scaled/full/mobile, hash-pinned style và lifecycle. `admin/hero-localization-preview.mjs`, preview/renderer tests, scoped integration test | P1-04/03 | UX07/09: đúng saved locale/revision/hash; dirty preview không tự đổi; sandbox rỗng/scripts0, CSP thực thi; origin allowlist, Blob/budget/session cleanup giữ. Delta CSP phải nằm trong approved scope |
| P1-06 [ ] | I/Q | Export QA cùng composition/CSS, task-owned new run. `scripts/export-hero-localization-local.mjs`, runner/local-guard selectors nếu cần, export/runner tests | P1-04/05 | Ba locale/asset bytes khớp, integrity/containment checks giữ; noindex/CTA inert đúng ranh giới; không overwrite cũ hoặc :5010 |
| P1-07 [ ] | Q/R/H | Representative comparison và handoff: `tests/hero-localization-ui.local.test.mjs`, phase task/evidence paths được duyệt | P1-01…06 | Đủ UX01–12; so mockup/app riêng tại 1440×900 và390×844, bổ sung768/320; controls/focus không bị cắt trong container; saved data/other locales/base bảo toàn. Role runtime thiếu ghi NOT_RUN; human UI acceptance riêng |

**Checkpoint P1:** chỉ mở rộng primitive sang các nhóm khác khi representative đã nối data path thật và có evidence đạt criterion. Root xác nhận evidence trong approved scope; đây không phải human approval mới cho mỗi repair. Approval của phase kế tiếp vẫn theo scope riêng. P1 không gửi duyệt bản dịch, không switch public, không migration.

## P2 — switch website và navigation context

| Task | Owner | Kết quả / files dự kiến | Depends | AC và proof |
| --- | --- | --- | --- | --- |
| P2-01 [ ] | R/H | HTML switch desktop/mobile/footer, missing-destination và brief-dirty flow; contract URL/navigation trong phase scope | P1 representative + P0 locale contract | Human thấy và duyệt switch trong ngữ cảnh website; tên bản địa, thứ tự nav/switch/CTA rõ; không coi nút review EN/VI/JA trong mockup Hero là switch đã xong |
| P2-02 [ ] | I | Locale URL resolver/UI dictionary và QA projection shell. `preview/site-media-renderer.mjs`, `site-public-data.mjs`, dictionary/resolver nhỏ (mới), tests | Approved P2 + P2-01 | Root EN, `/vi/` VI, `/ja/` JA, direct/refresh/history đúng; unknown locale từ chối hoặc route hợp lệ đã chốt; không browser/IP auto-redirect |
| P2-03 [ ] | I | Switch header/footer/mobile + context/brief guards. `preview/site-sections.mjs`, `site-interactions.mjs`, scoped styles/tests | P2-02 | Keyboard/touch, native names/aria; section/filter/entity ID giữ khi hợp lệ; missing translation có thông báo, brief dirty không mất dữ liệu hoặc ghi storage |
| P2-04 [ ] | Q/R | QA full-shell export/replay và visual comparison switch | P2-03 | Ba routes/asset subpaths/back-forward/dirty/context cases đúng; desktop/mobile không cắt controls; chưa đổi Hosting5010 hoặc claim content/site complete |

## P3–P7 — cách thực hiện WBS chi tiết v1

Nguồn nghiệp vụ, field matrix, kiến trúc và tiêu chí phase tại [plan §10](../docs/MULTILINGUAL-001-v2.md). Các IDs P3-01…P7-04 được giữ làm parent mapping; hậu tố a/b/c là task thực thi, không tạo checklist thứ hai. Project representative trong [P3-REP v1](../docs/MULTILINGUAL-001-P3-REP-v1.md) giữ VERIFIED_LOCAL_SCOPED và human ACCEPTED_SCOPED. Trạng thái các phần còn lại xem bảng đối soát hiện hành đầu file; các bảng preparation sau đây giữ giá trị lịch sử.

- **R/H:** root chuẩn bị, người dùng duyệt thiết kế/scope; không có implicit approval. **I:** một implementer sole writer trong slice. **Q:** người kiểm/reviewer; dự kiến, chưa đồng nghĩa đã chạy độc lập. **E:** người rà nội dung ngôn ngữ được chỉ định.
- Mỗi hàng có output, dependency, AC và proof; exact paths/hashes và authority được freeze trước phase code. Paths là **candidates**, không phải allowlist đã cấp quyền. Prefix files mặc định `pinky-lamb-cms/`.
- Size **S** là một contract/control nhỏ; **M** là một slice review được. Slice dọc có nhiều lớp được chia patch schema/service/UI/tests trong cùng ownership; không mở rộng sang nhóm kế tiếp trước khi representative nối thật đạt. Không dùng số file cứng làm lý do bỏ caller/test/transport.
- Quyền chung của mọi task sản phẩm: local demo/emulator, output riêng, không secret/PII trong evidence, không overwrite evidence/baseline, không reset/seed, không tự thêm Auth role, cloud/production/Git/dependency upgrades. Retained writes, fixtures và process actions phải được nêu trong bundle tương ứng.
- Lưu lỗi/CAS/unknown commit giữ input/intent; source shared và locale khác phải bảo toàn. Các invariants này áp dụng mọi task dù không lặp trong từng hàng. Tests dự kiến không phải kết quả PASS.

### Snapshot preparation lịch sử sau duyệt kế hoạch — 16/10/2026

Một record này giữ cả trạng thái preparation và execution; bundle không tạo task checklist thứ hai.

| Task canonical | Trạng thái tại thời điểm preparation — không phải hiện hành | Evidence / giới hạn |
| --- | --- | --- |
| P7-00a | SOURCE_IDENTITY_LOCKED / MAPPING_RECORDED | [39 baseline file pins + scoped Hero/switch deltas](../../approvals/MULTILINGUAL-001-P7-template-v1.pins.json), [mapping và reference1440/390](../docs/MULTILINGUAL-001-P7-TEMPLATE-v1.md); không phải implemented parity |
| P3-01a, P4-01a, P5-01a | DESIGN_APPROVED / MOCKUP_BROWSER_VERIFIED | [D3/D4/D5 HTML](../../mockups/multilingual-p3-p5-design-v1.html); design-only mockup, không API/data thật |
| P3-01b | BUNDLE_APPROVED / PROJECT_REP_VERIFIED_LOCAL_SCOPED | [Project-only scope/tasks/AC/runtime/budget](../docs/MULTILINGUAL-001-P3-REP-v1.md), [26 exact paths/pins](../../approvals/MULTILINGUAL-001-P3-REP-v1.scope.json) |
| P3-01c, P3-02a…03c | PROJECT_REP_ACCEPTED_SCOPED | 26 paths; unit68/68, focused final9/9, lint25 và build PASS. Actual OWNER save EN/VI/JA, invalid422, CAS409, response-loss replay và restore đạt; 6 commits/12 document writes, EN4/VI1/JA1. QA HTTP36/36 + browser12/12; template14pairs; protected357+readonly27+mockup3 hashes khớp. Final actual OWNER post-CSS UI EN/VI/JA×1440/390 và normal logout/private cleanup PASS;0writes. Human “Duyệt nghiệm thu” đã ACCEPTED_SCOPED ngày16/10. [Final source manifest](../.local/test-outputs/multilingual-001/p3-rep-v1/final-20261016-v1/source-manifest.json) |
| P3-04a…05b | APPROVED / IN_PROGRESS | [Toàn bộ P3 còn lại](../docs/MULTILINGUAL-001-P3-REMAINDER-v1.md); Service/Work/Services/real locale consumers và scopedQA; source chưa triển khai |
| P3 Service/section, P4/P5 engineering, P6/P7 runtime | NOT_STARTED / SEPARATE_BUNDLE_REQUIRED | Design prep không mở implementation/import/activation; P1/P2/M3/M4/LOCAL_COMPLETE không đổi |


### P3-REP v1 — kết quả thực thi 16/10/2026

**Nghiệm thu người dùng — 16/10/2026:** nguyên lời “Duyệt nghiệm thu”, phản hồi trực tiếp bàn giao Project đại diện. [Acceptance record](../../approvals/MULTILINGUAL-001-P3-REP-v1.acceptance.json) ghi scope/evidence/giới hạn; P3-REP đóng ACCEPTED_SCOPED. Các phần chưa kiểm giữ NOT_RUN; không đổi kết quả lỗi lịch sử hoặc mở quyền implementation mới.

**SOURCE_COMPLETE / VERIFIED_LOCAL_SCOPED / HUMAN_ACCEPTED_SCOPED.** Project đại diện `wayfair` nối API/Firestore thật, không mở Service/sections. Một workspace locale, một save, đối chiếu nguồn chỉ đọc; card/modal adapt đầy đủ title/summary/alt/gallery2 và PDF trang21 vào frozen template. CSS context loại tiêu đề/actions cũ bị lặp trong Project; review/settings giữ context riêng. Không thu font, scale hoặc cắt nội dung để vượt overflow.

| AC | Kết quả và evidence trong `.local/test-outputs/multilingual-001/p3-rep-v1/` |
| --- | --- |
| REP01 | Fixture actual saved data ×3locale ×1440/390/768/320 đạt12flows; `integrated-saved-ui-20261016-v7/verification.private.json`. Actual OWNER post-CSS EN/VI/JA×1440/390 đạt6flows ở `live-readonly-20261016-v3/verification.private.json`; root đã xem ảnh1440/390, không dùng fixture thay actual session proof. |
| REP02–04 | Unit contract/context/API và actual OWNER initial EN/VI/JA, invalid422 không ghi, two-tab CAS một winner/một409, committed response bị mất rồi cùng intent replay không ghi thêm. `live-owner-20261016-v1/request-*.private.json`, checkpoints/receipts và `retained-after-20261016-v1/retained-after.private.json`. |
| REP05 | `template-parity-20261016-v2/results.json`:14 same-data pairs gồm12saved-candidate pairs và2 synthetic-long-JA pairs có nhãn riêng; geometry/semantic đạt, modal interiors pixel-identical. Sai khác rất nhỏ ở backdrop/rounded edge được ghi `pixel-analysis.json`; không suy thành full-site/P7 parity. |
| REP06 | Unit private sandbox/scripts0/resource tamper/budget và saved identity đạt; normal logout actual OWNER xác nhận private root rỗng, iframe srcdoc0, session panel ẩn và role trống. QA interactive được kiểm riêng, không suy private preview có script. |
| REP07 | Ba sidecars ban đầu ABSENT; giữ lại3 unpublished QA candidates: `home-v3--wayfair--en` revision4, `--vi`1, `--ja`1. EN khôi phục exact candidate bằng revision4; audit/history không rollback. Home-v3 và3Hero hashes unchanged; không ghi project khác. `approved-20261016/write-budget-final.json`. |
| REP08 | Dirty/read-only/missing/source drift qua fixture/unit; actual invalid/CAS/unknown outcome giữ input/intent đạt trước lỗi assertion ở bước screenshot. Không chạy lại retained writes. |
| REP09 | Một Vite restart đúng bundle, actual normal OWNER two-tab core đạt. Final post-CSS UI6flows + normal OWNER logout/private cleanup PASS ở `live-readonly-20261016-v3/verification.private.json`; browser exit0,0retainedwrites/0mutation attempts, không đọc/copy credentials. Session revocation và các role khác vẫn NOT_RUN. |
| REP10 | Export36public files/53,963,061bytes; HTTP36/36 hash/MIME và7negative paths/Host đạt; browser12/12 EN/VI/JA×1440/768/390/320. `qa-http-browser-20261016-v1/{http-results,browser-results}.json`; QA4188 owned server đã dừng, artifact còn ở `.local/exports/multilingual-001/p3-rep-v1/qa-public-20261016-v1/public/`. |
| REP11 | Guarded unit68/68, final affected9/9, scoped ESLint25files và final build PASS. `integrated-unit-final-20261016/unit.log`, `measurement-lang-final-20261016-v1/build.log`, `final-20261016-v1/lint.log`. Build warning brand-diagonal có sẵn; không sửa baseline để tắt. Independent High source review không còn finding actionable. |
| REP12 | `final-20261016-v1/source-manifest.json`:26source paths,357protected+27readonly+3mockup hashes match; approval document/template-pin hashes match.6/12 permitted commits,12/24 document writes,6new operation records. Human nghiệm thu Project representative ngày16/10; editorial snapshot/release theoP5 vẫn riêng, chưa mở rộng consumers. |

**Phân biệt test failure và proof đã đạt:** whole run `live-owner-20261016-v1` vẫn FAILED_AFTER_CORE vì harness hardcode card padding17px, trái pinned CSS ở iframe nhỏ. Sáu commit và restore đã xong trước failure; receipt/DB đối chiếu độc lập xác nhận. Harness assertion đã sửa theo breakpoints, source frozen; không relabel run cũ PASS. UI chrome sửa CSS sau đó được fixture kiểm12flows và actual OWNER read-only v3 kiểm6flows + logout đạt, không ghi thêm và không lặp CAS. VI/JA QA export đầu vào ban đầu tái dựng bằng trusted read-only saved projection, có provenance riêng; EN đối chiếu actual Auth QA response khớp. Lượt v3 đã nhận actual Auth GET/QA cả3locale, saved revision/contentHash đúng EN4/VI1/JA1; không rewrite provenance lịch sử của export ban đầu.

Retained before/after proof xác nhận lúc10:48:49UTC; refresh read-only cuối không trả kết quả trong lượt quan sát có giới hạn và được root interrupt(exit130), nguyên nhân Unknown/không có proof mới. Dùng lại comparison còn hợp lệ; không phát sinh thao tác ghi. [Attempt record](../.local/test-outputs/multilingual-001/p3-rep-v1/final-20261016-v1/retained-refresh-attempt.json).

**Kết quả final OWNER:** read-only v3 PASS1test/6locale-viewport flows trong40.1s; normal login1/logout1,0writes. [Receipt tổng hợp](../.local/test-outputs/multilingual-001/p3-rep-v1/final-20261016-v1/final-readonly-20261016-v3.json), [actual desktop](../.local/test-outputs/multilingual-001/p3-rep-v1/live-readonly-20261016-v3/actual-ja-1440.png), [actual mobile](../.local/test-outputs/multilingual-001/p3-rep-v1/live-readonly-20261016-v3/actual-ja-390.png). Run v1 login timeout600s và v2 Chromium launch bị sandbox chặn trước test giữ nguyên; v3 dùng approved managed escalation cho launch, không đổi sandbox policy/CSP/Auth hoặc application source. Root xác nhận Project representative đạt technical scope để chuẩn bị bundle consumer tiếp theo; không tự mở implementation ngoài26paths.

**Giới hạn và bước tiếp theo:** Project representative đã được anh nghiệm thu trong phạm vi bàn giao; phaseP3 đầy đủ còn Service/sections và consumer projection, phải có exact bundle trước triển khai. EDITOR/REVIEWER/PUBLISHER actual sessions, physical touch/IME và session-revocation scenarios NOT_RUN; controlled-role fixture/unit không thay proof actual role, phần liên quan chuyển scope P5. Ba candidates vẫn là bản nháp local; nghiệm thu slice không tạo editorial snapshot/release theoP5 hoặc publish/activate5010; Project Contact CTA chỉ xác minh stable IDs, full Brief/Contact thuộc P4/P7. P1/P2 human acceptance, M3/M4 và LOCAL_COMPLETE giữ nguyên.

### Sửa harness và chuẩn bị toàn bộ P3 còn lại — human giao trực tiếp16/10/2026

**Ưu tiên mới trước P3:** user yêu cầu tự nhớ đăng nhập; [CMS-AUTH-REMEMBER-001](CMS-AUTH-REMEMBER-001.md) đã Approved và source complete; runtime/acceptance theo task Auth, không suy thành hoàn tất P3. P3-REMAINDER giữ AWAITING_APPROVAL, re-pin dependencies bị ảnh hưởng sau Auth implementation; không dùng Auth scope để mở P3.

**HARNESS_COMPLETE_VERIFIED / P3_REMAINDER_BUNDLE_READY_AWAITING_APPROVAL.** Chỉ harness được giao quyền sửa; P3 sản phẩm còn lại chưa triển khai. Nguyên lời: “Vậy sửa cách kiểm thử đó trước, rồi lập bundle cho toàn bộ P3 còn lại để tao duyệt. Tao không muốn mất thời gian đăng nhập lặp lại vì lỗi harness của mày nữa. Tao không muốn mày lập lại lỗi này cho các P4-P7.”

Focused repair: runner Playwright đang sở hữu browser/context trong test nên teardown sau assertion hoặc login timeout mất phiên. Tách owner giữ browser trong RAM, checkpoint write trước UI, mặc định chặn CMS mutations; lỗi chỉ đọc giữ cùng context/page để retry riêng stage lỗi; không replay write. Xác nhận cửa sổ/page sẵn sàng trước handoff login; hết thời gian chờ phải báo trạng thái, không tự đóng browser còn sống. Logout/close ở bước kết thúc rõ ràng; crash/expiry thật phải báo giới hạn, không export token/storageState hoặc sửa Auth/CSP.

Ownership implementation Medium, không sửa application source: `scripts/multilingual-browser-session.mjs`, `tests/helpers/multilingual-browser-session.mjs`, `tests/helpers/project-localization-live.mjs`, `tests/multilingual-browser-session.test.mjs`, `tests/multilingual-browser-session.local.test.mjs` (mới), và `tests/project-localization-ui.local.test.mjs` (sửa). Paths dưới `pinky-lamb-cms/`. Root giữ canonical task, policy kiểm thử xuyênP3–P7 và bundle P3 còn lại. Không ghi CMS, không login/demo credentials, không emulator/Vite lifecycle; browser fixture và unit được phép trong output task riêng. Không mở lại quyền ghi P3-REP đã nghiệm thu.

AC harness: injected read-only assertion failure → same browser/context/page/state, retry riêng read-only đạt; timeout login không đóng phiên; stage write đã complete không thể replay; default write fence deny, failure chuyển read-only; status không chứa secrets và phân biệt sống/closed; explicit finish kiểm cleanup. Source/unit/browser fixture chứng minh riêng; actual Auth reuse chưa kiểm trong correction này. Áp dụng runner + policy này cho bundles P3–P7, không chỉ ghi lời hứa trong chat.

**Kết quả correction:** unit10/10, lint6files, Chromium fixture1/1 đạt sau source reload fix. Cố ý assertion sai → sửa helper → reload readonly callbacks → retry đạt trong cùng browser/context/page/RAM, synthetic write chỉ1lần; login expiry giữ phiên; explicit cleanup. Actual startup API401/modules/title/liveness/status/close đạt không login; actual Auth reuse NOT_RUN. [Repair record](../../approvals/MULTILINGUAL-001-HARNESS-v1.repair.json), [policy P3–P7](../docs/MULTILINGUAL-001-TESTING-v2.md).357protected files và25accepted application/test sources giữ hash, chỉ legacy LIVE test entry thuộc6ownedpaths thay đổi. Không CMS writes/account/config/emulator/Vite changes. Historical failures giữ nguyên.

**Áp dụng xuyên P3–P7:** mọi bundle P3/P4/P5/P6/P7 phải kế thừa policy này: preflight trước login, owner độc lập, write/checkpoint tách visual, readonly helper reload cùng session, không replay completed/unknown writes, finish/close rõ; chỉ kiểm lại evidence bị ảnh hưởng. P6 import và P7 activation có checkpoint/approval riêng, không gắn replay vào UI failures.

**Bundle toàn bộ P3 còn lại:** [P3-REMAINDER v1](../docs/MULTILINGUAL-001-P3-REMAINDER-v1.md), [52exactpaths/pins/API/runtime/write budget](../../approvals/MULTILINGUAL-001-P3-REMAINDER-v1.scope.json). Canonical tasks P3-04a/P3-04b/P3-05a/P3-05b; một approval cho Service+Work/Services+real projection/consumers+QA. Inventory read-only Home0:8Project/6Service; proposed9targets ABSENT. Planned14commits/max16,≤32document writes, Project retained writes0. **Implementation NOT_STARTED / AWAITING_APPROVAL**; R01–R12 trong bundle là AC chưa thực thi.

## P3 — dự án và dịch vụ

**Kết quả phase:** Project/Service và nội dung mục Work/Services được quản lý đúng locale, saved preview thật, P2 đọc stable IDs/availability thật. Dependencies: P0 identity, primitives/representative P1 liên quan còn hợp lệ, mockup P3 được duyệt. Không bắt các role/IME còn thiếu của P1 thành PASS để mở P3.

| Task / owner / size | Output và files candidates | Depends | AC cụ thể | Verification để kết thúc |
| --- | --- | --- | --- | --- |
| P3-01a · R · S | Field ownership, typed Project/Service shape, nguồn/title/titleVi/asset-slot mapping trong scope P3 | Plan review; P7-00a; source inspection | Mỗi field map đúng vị trí template và thuộc shared/localized/dictionary; creation/visibility không nhân entity theo locale | Schema-to-field/renderer mapping và source references; Unknown được gắn owner |
| P3-01b · R/H · M | HTML D3-PROJECT/D3-SERVICE: list → entity+locale → form/saved preview/source; empty/error/readonly/conflict/dirty | 01a | Giữ workspace mới; không có hai editor dịch cạnh tranh hoặc hai tên Anh/Việt trong cùng locale | Render 1440/390 +768/320; keyboard/dialog/clipping; human duyệt HTML/hash |
| P3-01c · R · S | Bundle P3 representative: exact files/digests, routes/auth transport/mounts/tests, runtime/read/write budgets | 01a/b | Tất cả callers có trong allowlist; chỉ quyền local được mô tả; baseline/runtime readiness chốt trước login | Scope/static/link/hash review; Approved đúng bundle trước code |
| P3-02a · I · M | Project typed localization + metadata/intent/source-digest helpers; `contracts/project-localization.mjs` (mới), records/tests liên quan | Approved 01c | Logical key strict; caps/bytes/Unicode/source/media identity; unknown/shared fields bị từ chối | Contract tests: missing/create/update, hostile/oversize, hash tamper, same-key cross-locale/resource |
| P3-02b · I · M | Project GET/PUT/QA service; `cms-api/project-localizations.mjs` (mới), `routes.mjs`, `admin/auth.mjs`, API tests | 02a | GET không tạo; save transaction + audit/receipt; ACL/CAS/idempotency, source drift và response loss chính xác | Real scoped transaction/denied API tests; readback một locale, before/after shared và locale khác |
| P3-02c · I · M | Bounded status endpoint/read model cho bảng; service/context + `admin/site-collection-ui.mjs` caller | 02a/b | Metadata đủ badge của 3 locale; caps 24/12, page/filter/order stable ID; không tải full content ba locale hoặc N+1 không giới hạn | Query bounds/count/sort/authorization tests, empty/last page/status refresh |
| P3-03a · I · M | Project list status/chọn bản trong `admin/site-work-editor.mjs`, `site-collection-ui.mjs`, scoped CSS/test | 01b,02c | Chọn đúng entity+locale; visibility khác trạng thái dịch; list không mất filter/selection sau save | Browser list→editor→list, empty/readonly/status error và320px controls |
| P3-03b · I · M | Project workspace/controller, text adapter phù hợp; `admin/project-localization-editor.mjs` (mới), mount/dirty/tests | 02b,03a | Một save theo locale; nguồn/ảnh/targets readonly; guard qua entity/locale/group; late response/logout không remount | Save/readback/reload + mạng/CAS/unknown outcome; paste/IME/Undo/limits theo input được dùng |
| P3-03c · I/Q · M | Project saved preview/QA typed projection + renderer/resource tests, mounted vào workspace | 03b | Preview đúng saved key/revision/hash; dirty text không thành saved preview; media byte/hash/lifecycle giữ | Root so HTML/app 1440×900/390×844; populated/long/missing/readonly; representative PASS trước mở rộng |
| P3-04a · I/Q · M | Service contract/service/controller/transport tests theo P3 shape, schema riêng | 02a pattern; 03c representative | Một title/locale; service IDs/quan hệ/order chung không đổi khi dịch; không import nguyên titleVi lên mọi locale | Service riêng: save1 locale, first create, CAS/retry, source refs/limits/denied cases |
| P3-04b · I/Q · M | Service list/editor/saved preview và bản dịch nội dung mục Work/Services; existing `site-services-editor.mjs`, typed adapters/tests | 04a; 01b | Đúng D3-SERVICE, scope text liền mạch; section heading/intro có bản riêng; service interest labels theo locale | Render và state transitions riêng Service/section; không suy PASS từ Project |
| P3-05a · I/Q · M | Locale projection/availability policy thực; `preview/site-locale.mjs`, `site-interactions.mjs`, typed projection module/tests | 03c,04b | P2 controls nguyên; real category/entity/section IDs; thiếu bản đích không fallback; counts/featured/relations cùng eligible set | EN→VI same entity, JA missing, filter rỗng/invalid, `ip-studio`, direct/refresh/history/dirty; fixtures CASE1 chỉ còn trong QA fixture |
| P3-05b · Q/R · S | QA export/HTTP/parity và handoff P3, protected/deltas/evidence | 05a | Complete CMS→saved→QA cho cả hai loại entity và sections; không mutation ngoài write set; chưa :5010 | Scoped unit/API/browser/export/lint; actual commands + source pins; human review riêng |

**Exit P3:** các task trên đạt AC hoặc phần thiếu không liên quan được ghi rõ; Project representative được root xác nhận trước mở rộng, Service/section có evidence riêng. Scope phase kế tiếp không tự mở từ P3 Approved.

## P4 — các nhóm còn lại, UI dictionary và SEO

**Kết quả phase:** tám nhóm CMS và full website QA cùng locale. P4-02/03 là từng vertical slice, không một patch chung thay toàn bộ editors. P3 section Work/Services là owner nội dung hai mục đó, P4 không tạo sidecar cạnh tranh.

| Task / owner / size | Output và files candidates | Depends | AC cụ thể | Verification để kết thúc |
| --- | --- | --- | --- | --- |
| P4-01a · R/H · M | HTML D4-GROUPS và field matrix cuối cho Header/SEO/Clients/About/IP/Contact/Footer | P7-00a; P3-01a; workspace representative phù hợp | Giữ 8 nhóm/tab, source chung readonly, một save/locale; không lặp tiêu đề/run forms | Human duyệt view khác biệt; desktop/mobile đủ empty/dirty/readonly/source-drift |
| P4-01b · R · S | Scope từng group hoặc nhóm scope đã cụ thể: schemas/routes/transport/renderer/CSS/CSP/digests/tests/runtime | 01a; P3 contracts | Không bỏ sót `cms-shell/site-media-editor`, auth và private preview/resource callers nếu bị ảnh hưởng | Static mapping + approved exact bundle; control delta nêu trước code |
| P4-02a · I/Q · M | Header/nav/marketing text; `site-settings-editor.mjs`, typed group localization/service/projection/tests | Approved 01b; P2 switch | Labels dịch theo sectionID; brand/legal/logo/target/order nguyên; Hero/SEO tab không bị append form | Save/readback một locale; nav/CTA target thực tế; sibling tabs/P1 regressions |
| P4-02b · I/Q · M | Clients heading/intro/alt theo logoID; existing Clients mount + group adapters | 01b; group schema | Tên pháp lý/logo/visibility chung; decorative alt rỗng; không map bằng index | Logo thêm/ẩn/đổi thứ tự không gắn nhầm alt; missing/long/Japanese preview |
| P4-02c · I/Q · M | Footer copy/link labels/copyright; `site-contact-footer-editor.mjs` + group/service/renderer/tests | 01b | Link target/brand/start year chung; footer locale sync với switch | Source/ref preservation và preview/footer controls ở 390/320 |
| P4-03a · I/Q · M | About text/experience labels/signature/reel captions; `site-about-ip-editor.mjs` + adapters | 01b; factual source map | Facts và media không đổi khi dịch; round-trip nhấn mạnh giữ; nguồn rõ | Claim-diff negative cases, saved preview, long copy/glyph/private resource policy |
| P4-03b · I/Q · M | IP Studio copy/scope/CTA label; same editor boundaries, writer tuần tự | 01b; section identity P3-05a | `ip-studio` ổn định; CTA kind/target/media/claims không thành localized edits | UI/renderer cả 3 locale, action target và source parity |
| P4-03c · I/Q · M | Contact content/display labels; `site-contact-footer-editor.mjs` + typed adapters | 01b | Email/phone/address gốc/URLs nguyên; locale instructions rõ; không thêm lead backend | Escape/hostile copy, save/preview; data capture không có trong luồng QA |
| P4-04a · I/Q · M | Full UI dictionary và real interaction labels; `site-locale-copy.mjs`, `site-interactions.mjs`, tests | P3-05a; contact/service IDs | Real categories, modal/gallery/counter/brief/interests/validation/clipboard/aria cùng locale; không dùng mockup strings cho dữ liệu thật | Dictionary key parity và browser happy/error/fallback; không lưu brief/preference, không gọi API/dịch runtime khi switch; static loads theo manifest |
| P4-04b · I/Q · M | Full locale projection/renderer và saved private preview resource contract; `preview/`, admin preview adapter mới theo scope | 02a–03c; P3 real collection output | Tách QA_SAVED và APPROVED_RELEASE; adapt đúng template đã khóa; representative thật đạt trước mở rộng; không raw private/sample fallback; private sandbox/script = 0 và CSS đúng version/hash | Privacy/CSP/closure/tamper tests; đủ 8 nhóm/3 locale trong full QA |
| P4-04c · I/Q · M | SEO locale metadata/canonical/alternate/sitemap, SEO CMS tab; `site-settings-editor.mjs`, renderer/export tests | 04b; contract completeness/approval đã chốt, không đợi P5 runtime | Canonical bỏ query/hash; x-default = root EN; chỉ include route phù hợp mode; QA noindex, không prod domain tự đoán | Parse ba HTML được sinh/sitemap, OG assets/subpath, locale thiếu deny/omit đúng contract |
| P4-05a · Q/R · M | So từng group + full assembly, chốt compatibility tài nguyên CMS :5010 | 04a–c | Không suy từ Hero; media có chữ ghi đúng language limits; không clipping hoặc error | 1440/390 +768/320, mỗi group có evidence; scripts đầy đủ/font/assets/private preview source/resource review |

**Exit P4:** full QA từ header đến footer đúng locale và saved identities; cả8 nhóm có evidence, không đồng nghĩa approved release hoặc activation. P5 editorial và P6 nội dung thật vẫn phải đạt riêng.

## P5 — editorial theo đối tượng/ngôn ngữ

**Kết quả phase:** workflow thật trong “Gửi và duyệt”; saved draft, immutable approved snapshot và served release độc lập. Khởi đầu Hero + Project để kiểm contract trước khi thêm Service/groups.

| Task / owner / size | Output và files candidates | Depends | AC cụ thể | Verification để kết thúc |
| --- | --- | --- | --- | --- |
| P5-01a · R/H · M | HTML D5-REVIEW queue/detail/source drift; status/role matrix và submit scope | P0 identity; P3 schema | Đúng object/locale/version; nguồn/shared/media đọc được, hành động đúng role; không button publish giả | Render pending/approved/changes requested/stale/self-review/denied; human duyệt |
| P5-01b · R · S | Bundle roles/fixtures/versions/path/runtime + retained write budget cho test | 01a; readonly check demo prerequisites | Ưu tiên demo có sẵn; nếu thiếu, chỉ tạo fixtures nêu rõ trong Approved; không đổi tài khoản người dùng | Freeze source/readiness trước login; không gửi/read/dump credentials; thiếu role NOT_RUN rõ |
| P5-02a · I/Q · M | Typed localized snapshot/review records; `contracts/localized-review-records.mjs` (mới), source/media identity adapters/tests | Approved 01b; P3/P4 schema phù hợp | Resource/locale/content/shared/source/media/renderer identities đóng băng; M3 records hiện tại không bị rewrite | Strict/hash/version/tamper tests; draft mutate không đổi snapshot |
| P5-02b · I/Q · M | Submit service/routes/transport; `cms-api/localized-snapshots.mjs` (mới), `routes.mjs`, `admin/auth.mjs`, tests | 02a | Atomic expected draft/source + snapshot/review state/audit; double click/response loss không tạo hai snapshot | Real transaction/CAS/idempotency tests và immutable readback |
| P5-02c · I/Q · M | Review/source-attestation service; `cms-api/localized-reviews.mjs` (mới), existing source adapters, routes/tests | 02b; M3 hiện tại claim contract | Reviewer khác submitter; exact snapshot/source/hash/outcome; concurrent approve/reject chỉ một kết quả | Cùng OWNER bị chặn self-review, reviewer khác được phép, revoked/invalid/anonymous/PUBLISHER bị từ chối, stale source/CAS/replay |
| P5-03a · I/Q · M | Submit action/editor trạng thái + review queue/detail trong `admin/review.mjs`, `source-review.mjs`, adapters/tests | 02b/c; D5-REVIEW | Đúng locale/object; draft edit không đổi review detail; một trạng thái/hành động rõ trong context | Browser submit→reviewer→decision, denied/error/conflict; saved draft và snapshot hiển thị khác |
| P5-03b · I/Q · M | Luồng đối chiếu/rebase có kiểm, gồm adapter Hero base toàn document; typed service/UI/tests | 02a,c; P1/P3/P4 source digest mapping | Không tự nâng base/hash; dependency không đổi và dependency thay đổi khác nhau; sửa/rebase tạo revision mới | Base edit unrelated vs fact/asset/target related; source stale đang review; saved/approved/served cũ không đổi |
| P5-04a · I/Q · M | Eligibility API/projection: approved snapshot còn tương thích, mandatory/optional rules | 02c,03b; P4 mandatory-field contract; có thể kiểm Hero/Project trước | Approve VI không approve EN/JA; drafts không lọt export; project/service thiếu bản dịch prune đồng bộ | Cross-locale, stale/invalid source hoặc media, collection rỗng, không fallback EN fixtures |
| P5-04b · Q/R/H · M | Runtime role matrix + Hero/Project/Service/group representative review/handoff | 03a/b,04a; exact demo fixtures | Mọi resource adapter và role cần thiết có proof; không chỉ tests mocks; OWNER không tự duyệt | API  + authenticated UI bằng sessions phù hợp, preservation/audit expected deltas; NOT_RUN nếu prerequisite thiếu |

**Exit P5:** approved eligibility từ immutable snapshots, rebase rõ, roles/self-review chứng minh; không mở CMS M4 hoặc tự thêm quyền PUBLISHER.

## P6 — nội dung cũ, bản dịch và import

**Kết quả phase:** nội dung thật được mapping và rà nghĩa, import theo plan/version có thể nhận diện partial commits; không chuyển toàn bộ nguồn trộn ngôn ngữ vào EN.

| Task / owner / size | Output và files candidates | Depends | AC cụ thể | Verification để kết thúc |
| --- | --- | --- | --- | --- |
| P6-01a · R · S | Inventory chỉ đọc từng field/entity/locale/source/media/revision, target gap report | Source/read scope tương ứng; có thể làm sớm | Counts thực tế lúc đọc; ngôn ngữ từng field/proper name/mixed/unknown ghi riêng; không lộ credentials/private data ra QA | Readonly count/hash manifest; không lấy counts baseline làm bằng chứng live database |
| P6-01b · R/H/E · M | Mapping source→target, title/titleVi, asset-slot/factual refs, translation ownership | 01a; P3/P4 target schema | Mỗi target có source path/hash, locale, quyết định và người rà; loại P1 QA/mockup/sample khỏi import | Human chốt mapping, ngoại lệ, proper names và media có chữ; chưa mutation |
| P6-02a · I/Q · M | Dry-run tool/schema/report/tests mới dưới `scripts/` và task-owned outputs | Approved dry-run scope; 01b | Validate toàn bộ items/schema/IDs/source/media/conflicts; expected write set/hash; retained writes = 0 | Malformed/mixed language/unknown ID/oversize/stale revisions và byte-for-byte preservation |
| P6-02b · I/Q · M | Backup minimum  + restore/rollforward rehearsal trong owned fixture store | 02a; fixture write budget | Đọc lại được before-image; interrupted/resumed run không ghi trùng; không phục vụ private backup | Failure injection/partial commit/concurrent edit/retry; recovery cho existing/new record và audit append |
| P6-03a · R/H · S | Exact retained import scope: plan hash, selected IDs/locales, expected versions, writes/audit/idempotency budget, destinations | 02a/b PASS; mapping đã chốt | Conflict không tự overwrite; runtime/process/cleanup rõ; không seed/reset Home v3 | Human Approved đúng write set trước retained mutation |
| P6-03b · I/Q · M | Selective importer  + checkpoint receipt và before/after/corrective procedure | Approved 03a | Transaction từng item; retries cùng plan/key; dừng và báo partial result khi lỗi; không giả batch atomic | Chạy đúng selected set, so IDs/hashes/media/source và locale khác; rerun không duplicate; không overwrite bản mới hơn |
| P6-04a · E/R · M | Rà và sửa draft EN/VI/JA theo nguồn, rồi submit/approve qua P5 | 03b; P5; người rà được chỉ định | Không đánh dấu đã dịch chỉ vì đã import; nội dung và claims đúng nghĩa; bản thiếu giữ thiếu | Checklist từng locale/content  + immutable approval IDs/hashes; ghi đúng khả năng có người rà tiếng Nhật |
| P6-04b · Q/R/H · S | Coverage/import acceptance report cho release candidate | 04a | Mandatory của 3 locale đủ; optional missing có danh sách và lý do; exact delta/recovery evidence đầy đủ | Quyết định nội dung đã xác nhận và P5 eligibility report; chưa activation |

**Exit P6:** nội dung đủ điều kiện theo P5 và phạm vi đã duyệt; human language acceptance riêng với UI acceptance. Không gọi dịch vụ dịch/LLM bên ngoài hoặc thêm paid API trong gói mặc định.

## P7 — full artifact :5010 và UAT

**Kết quả phase:** đúng ba URL tại Hosting local phục vụ frozen approved release; không tự deploy production, không thay trạng thái toàn CMS.

| Task / owner / size | Output và files candidates | Depends | AC cụ thể | Verification để kết thúc |
| --- | --- | --- | --- | --- |
| P7-00a · R/Q · S | Khóa source/version/hash template website đã duyệt và delta Hero/switch; map section/component → data field/ID → renderer | Source/approval đã có; thực hiện trước consumer P3/P4 | Đúng template gốc, không lấy shell CASE1 làm full site; giữ layout/visual/interaction contract P7-T01…T10; chưa mở quyền code | Source identity + paired reference desktop/mobile + data-to-UI matrix; không hỏi duyệt lại template đã duyệt |
| P7-01a · I/Q · M | Release composer/manifest typed + approved projection cho 3 locale; `contracts/`, `preview/` modules mới theo scope | P7-00a; P3/P4; P5 eligible; P6 accepted content | Giữ template P7-T01…T10; mandatory đủ 3 locale, snapshots/shared/source/media compatible; working draft không tham gia | Reject missing/stale/unapproved/hash mismatch; manifest cố định, deterministic; counts/relations nhất quán |
| P7-01b · I/Q · M | Full-site exporter mới và pure static server/resource closure; `scripts/` module mới/tests | 01a | Exclusive output/hash/size/MIME/path; styles/fonts/assets/origin/self CSP/noindex; không private data | Tamper/traversal/symlink/hardlink/duplicate/overwrite/invalid route tests; không export authenticated/raw private data |
| P7-01c · Q/R · M | Full QA trên cổng loopback riêng được freeze; preview compatibility public resources :5010 | 01b | Từng section/control/state và ba locale đúng template, adapt đúng dữ liệu thật; mọi file khớp manifest; ba URL và CMS preview hợp lệ | Paired reference/app cùng data/viewport/zoom/state; section × locale × viewport × state; long text/Japanese/nested clipping; HTTP closure và legacy resource compatibility |
| P7-02a · R · S | Inspect Hosting/process coupling readonly, before-image config/HTTP/resources và phương án switch/restore | 01c | Biết process identity/capability; không đoán có thể tách Hosting; baseline/runtime khác giữ nguyên | Evidence capability và known limits; nếu HOLD thì trình focused operational delta |
| P7-03a · I/Q · M | Rehearsal generation/restore trên public server/config copy riêng; chưa đổi :5010 | P7 engineering scope đã duyệt; 01c,02a | Khôi phục được nguồn phục vụ của fixture; không đụng retained DB hoặc tiến trình hiện tại. Không suy rehearsal server riêng thành proof process coupling :5010 | Compare manifest/HTTP trước–sau; lưu rõ giới hạn và exact actions |
| P7-02b · R/H · S | Activation bundle: frozen release hash, exact config/path/port/process actions và recovery | 01c,02a,03a | Chỉ Hosting :5010; không ghi root firebase/dist/public-baseline; giữ CMS asset compatibility/CORS; restore không rollback DB | Người dùng Approved activation riêng sau QA, readiness và rehearsal |
| P7-03b · I/Q · M | Activate Hosting :5010 generation đã duyệt và readback | Approved 02b; 03a | HTTP `/`, `/vi/`, `/ja/` và resources đúng frozen manifest; giữ generation cũ; CMS saved preview còn hoạt động | Post-activation hash/CORS/CSP/404; protected source và retained-data comparison đúng scope |
| P7-04a · Q/R/H · M | UAT CMS save → submit → review → export → :5010; site ba locale/desktop/mobile | 03b; exact role/data fixtures | Context/brief/history/media/clipboard/mailto/validation/aria đúng; save draft mới không đổi active bundle | Real flow với versions/receipts và screenshots; brief giả, không gửi email hoặc thông tin thật |
| P7-04b · R/H · S | Final coverage, known limits, acceptance và runbook bàn giao | 04a | UI acceptance và language acceptance riêng; không fake PASS criterion thiếu; đủ nội dung ba locale | Nghiệm thu explicit, manifest/version/recovery/manual steps; không tự đóng M3/M4/LOCAL_COMPLETE/production |


**Exit P7:** chỉ ghi MULTILINGUAL_LOCAL_COMPLETE khi P7-T01…T10, AC liên quan và nghiệm thu chức năng đạt. Lệch template chưa được duyệt là FAIL của criterion bị ảnh hưởng; build hoặc dữ liệu đúng không bù cho UI/UX lệch. Trạng thái toàn CMS vẫn do ledger riêng quyết định.

## Phạm vi source dự kiến và cách freeze

- **P3:** typed entity contracts/records; API services/status/context; `routes.mjs`, `admin/auth.mjs`; Project/Service collection editors và shared collection controls; mounts/controller/dirty nếu bị ảnh hưởng; typed preview/projection/locale và tests.
- **P4:** typed group contracts/services; settings, About/IP, Contact/Footer editors; full dictionary/interactions/renderer/private preview/styles và tests đúng delta. Chỉ sửa P1 nếu có dependency thật và scope nêu rõ.
- **P5:** localized snapshot/review/source/eligibility modules; review/source UI/routes/transport; Hero rebase adapter và tests/fixtures được duyệt. Không rewrite historical M3 snapshots.
- **P6:** inventory/dry-run/import/recovery scripts/contracts/tests và private task-owned outputs; chỉ records trong approved write set. Không reset, reseed hoặc reimport Home v3.
- **P7:** release/export/server/activation modules/config riêng và tests. Không ghi `dist/`, `public-baseline/`, root `firebase.json` hoặc global config. Exact lifecycle cần quyền activation riêng.

Phase bundle phải bao gồm đầy đủ caller, transport và tests cần thiết. Không freeze hashes source P7 từ hôm nay rồi xem là quyền ghi, vì P3–P6 sẽ thay source. Mỗi bundle lấy observed base mới và mở đúng slice. Có thể gom nhiều phase khi tất cả scope đã cụ thể và người dùng duyệt rõ; routine fixes trong Approved đang mở không cần duyệt lại từng file.

## Ma trận nghiệm thu cuối cùng và trạng thái

| AC | Yêu cầu cuối | Task owner/proof chính |
| --- | --- | --- |
| E2E-01 | CMS tiếng Việt, workspace theo HTML duyệt, một save/object/locale | P3-03/04, P4-02/03; rendered 8 groups/3 locales |
| E2E-02 | Strict IDs/ACL/CAS/idempotency/audit; lỗi giữ text/intent | P3-02, P5-02; actual API và browser negative cases |
| E2E-03 | Shared/locale khác không đổi khi save một bản; nguồn đổi có rebase đúng | P3/P4 preservation, P5-03b; source change không liên quan/có liên quan |
| E2E-04 | Snapshot review immutable, self-review bị chặn, approve một locale không approve bản khác | P5-02/04; actual roles/receipts |
| E2E-05 | Mapping đúng ngôn ngữ/nội dung thật; import không trùng hoặc overwrite bản mới hơn | P6-01…04; counts/hashes/partial/recovery/human content review |
| E2E-06 | Root EN, /vi/, /ja/; nội dung/UI/SEO toàn site đúng locale; không mixed fallback | P4 full QA và P7 HTTP/metadata/browser |
| E2E-07 | Switch/context/brief/history/modal/filter/media/copy/mailto đúng mockup | P3-05/P4-04/P7-04; keyboard/touch targets/nested clipping |
| E2E-08 | Chỉ approved eligible bundle ra :5010; mandatory của 3 locale đủ; draft save không tự đổi active release | P5-04/P7-01/04; manifest/snapshot/HTTP hash |
| E2E-09 | Không private leak, safe closure/CSP/sandbox/font/assets; CMS preview sau activation vẫn đúng | P4-04b/P7-01…03; source+negative tests+actual browser |
| E2E-10 | Baseline/data/process ngoài phạm vi task giữ nguyên; operational restore và handoff đủ | P6/P7 before/after và rehearsal; human acceptance explicit |

Toàn bộ E2E-01…10 hiện **NOT_RUN cho P3–P7**. Evidence P1/P2 chỉ được tái dùng đúng phần/hashes còn hợp lệ, không chuyển thành nghiệm thu toàn site.

## Snapshot checkpoints khi lập plan ban đầu — giữ lịch sử

1. **Hiện tại:** mockup/plan v2 được duyệt; P0 hoàn tất tài liệu/contract và bundle P1. Không task sản phẩm nào đã chạy theo v2.
2. **Trước P1 code:** người dùng duyệt concrete P1 v2 bundle đã trình, gồm QA2/stylesheet-CSP delta. P0-02/03 đã chốt, không hỏi lại mockup hoặc giữ form cũ.
3. **Trước mở rộng UI:** P1 representative thật đạt UX/data/lifecycle criteria; phần thiếu role/human acceptance giữ trạng thái thực, không fake PASS. Trình HTML cho màn hình/luồng mới của phase tiếp theo.
4. **Trước retained migration/activation:** scope cụ thể, integrity/rehearsal và Approved riêng. Chỉ đọc/thiết kế không cấp quyền ghi dữ liệu hoặc đổi server.
5. Mỗi checkpoint chỉ chặn consumer phụ thuộc tiêu chí chưa đạt. Không dừng phần độc lập đã được giao quyền vì harness hoặc role thiếu không liên quan.

**Kết quả kiểm của lượt replan:** static PASS cho 138 local links, design/document digests, 37 task IDs duy nhất đủ P0–P7 và approval boundaries; ba file mockup, ba frozen approval snapshots và 27 source/template/asset hashes giữ nguyên. Không chạy CMS tests/build/HTTP/emulators và không mutate nội dung trong lượt này. Kết quả static không chứng minh implementation hoặc acceptance của sản phẩm. Chi tiết ở design record.


## Cập nhật hiện hành — P2 design review, 16/10/2026

P1 code/core đãhoàn tất, nghiệmthu còn mở theo [AC P1](../docs/MULTILINGUAL-001-P1-v2.md); không chuyển role/IME/cleanupB chưa kiểm thànhPASS. Đã chuẩn bị [mockup/scope P2 v1](../docs/MULTILINGUAL-001-P2-v1.md) và [task record](../tasks/MULTILINGUAL-001-P2-v1.md) theo yêu cầu chuyển tiếp. [P2manifest](../../approvals/MULTILINGUAL-001-P2-v1.scope.json) freeze3mockup/10candidatepaths, implementation_authorized=false; HTML desktop/mobile và dirty/missing/history mockup đã kiểm, chờ duyệt. Không applicationwrites/datawrites/activation5010 hoặc đóngP1 từ bước này. Các câu trạng thái trước đây giữ bối cảnh lúc trình; đoạn này là cập nhật hiện hành.

## P2 approval hiện hành — 16/10/2026

P2 v1 đã được duyệt trực tiếp theo [scope10paths](../../approvals/MULTILINGUAL-001-P2-v1.scope.json). Theo dõi thực thi tại [task P2 duy nhất](MULTILINGUAL-001-P2-v1.md); mapping P2 trên đây không cấp quyền sửa full-site renderer/public-data. P1 acceptance còn mở; P3–P7 không đổi.

**P2 handoff16/10:** source +scopedQAverified; [kết quả P2](../docs/MULTILINGUAL-001-P2-v1.md#kết-quả-thực-thi--16102026).30unit/export/legacyPASS,8browsercasesvalid theoaffectedrerun,17HTTPfiles/398protected/2193disk/5010giữnguyên. HumanacceptancePENDING; P1open/P3–P7khôngđổi.


## Trạng thái lập kế hoạch P3–P7 hiện hành — 16/10/2026

WBS P3–P7 chi tiết v1 đã được viết theo yêu cầu lập kế hoạch. Chưa tạo HTML D3/D4/D5; chưa chạy product tests/build/API/browser/emulators, chưa ghi nội dung hoặc đổi :5010 trong lượt này. Plan/proposed filenames không phải implementation authority. Tiếp theo là review kế hoạch, HTML design pack và freeze P3 representative scope; các bước retained import/activation vẫn cần quyền cụ thể như plan §10.12.

### P3-REMAINDER v1 — execution16/10/2026

Direct human Approved: `Approved MULTILINGUAL-001 P3-REMAINDER v1 — toàn bộ P3 còn lại local/emulators`. Before pins410entries và35create targetsABSENT đối chiếu trước ghi; snapshot `p3-remainder-v1/approved-20261016-v1/`.52application paths; kế hoạch/ngân sách/AC R01–R12 giữ nguyên.

Ownership: root giữ shared/canonical task, approval/evidence/review/runtime và data budget; existing Medium worker API/contracts owns groups API/contracts + runner/export, API/contract/context/projection tests, export/runner/live adapter tests; existing Medium frontend worker owns CMS/renderer/navigation + remaining editor/preview/renderer/navigation tests. One writer/path; contracts publish trước consumer. Không child delegation. Source changes first, no retained writes until runtime preflight + immutable intent/budget journal. Service representative real data/parity checkpoint trước mở rộng dependent consumers. P3-REP writes0;9exact draft targets, max16commits/32document writes.

Next proof: implement Service/section contracts/API, representative D3Service và source-based saved preview; preserve Auth remembered session. R01–R12 hiện NOT_RUN cho implementation mới; không đóng human acceptance/milestone khác.

**P3-REMAINDER representative checkpoint:** actual OWNER reused persistentprofile, AUTH_RESTORED_READY,0newlogin. ActualServiceEN initial UI save/readback revision1 + private sandbox/scripts0 + source fields1440/390 PASS; root visually inspected. ControlledD3Service pair and pinned nativeaccordion4viewports PASS2/2 (`frontend-service-fixture-20261016-v2`); delta5px fixed by matching subtitle subtle margin, outer preview border and saved caption, nofont/layout replacement. Dependent Work/Services assembly opened withincurrentapproval. Section saved rightpane is approvedtypedreadonlysnapshot, notwebsitepreview: directtext/runs DOM matchesmockup; websiteiframe/sandbox requirements applyProject/Service, while savedidentity/content/generationcleanup applySection.

**Current retained writes:**3commits/6documentwrites: service/work/services EN initial, receipts+readbacks immutable in `actual-owner-20261016-v1/`. ServiceVI failed beforeadmission whenmobile previewpanel remainedselected; owner15433/browser alive HELD_READ_ONLY. Root stoppedfurtherwrites; trustedDB reconciliation confirmsVIABSENT, only3ENoperations andHome/Hero/Project5collections hashesunchanged (`runtime-preflight-20261016-v1/partial-reconciliation.private.json`). Focusedroutineplan: selectBiên tập beforefill; bounded immutablejournal continuation restoresTOTALbudget/completedstages, rejectsunknownadmittedintents andsource/record drift; finishkeepsAuth andsameprofile reopenswithoutnewlogin. No ownercore/Auth/ACL change, no replayofcompletedwrites. Runtime/newslice stillIN_PROGRESS, nohumanacceptanceclose.

**Runtime lifecycle:** approved Vite-onlyrestart1/1 consumed after exactPID85519/pinnedNode/cwd verification; newprocess receipt in runtime-preflight output. OldNode ESMroute cache lacked invalidation. Noemulatorrestart/:5010activation. Beforecaptured collections: Home3/HeroDraft3/HeroOps15/ProjectDraft3/ProjectOps6; newService/Section collections0. SourceHomecontentJSONhash matchespreparedinventory.

**P3 source handoff — CODE_COMPLETE_UNTESTED (final integration pending):** Service/section contracts, transactional API, exact transport/routes, CMS mounts/guards, saved previews, real availability/projection, template renderers/navigation and closed export/commands are connected within the52approved paths. Existing scoped unit/review evidence remains historical evidence; it does not prove the final integrated runtime. Human code-first correction applies: source completion before one final integration verification; no further intermediate harness development/reviews/hash or documentation cycles. All three workers were observed completed and received stop instructions for outstanding checks. No mutation is in flight or Unknown; original journal retains3commits/6document writes. Prior browser owner finished with Auth preserved; Vite/emulators remain running. Final verification reuses the persistent profile and immutable original journal, never replays completed writes or requests another login for assertion failures. Automation-only failures remain NOT_RUN if existing equivalent tools cannot prove the criterion. No P4–P7 implementation, P6 import or P7 activation authority is inferred.

### P3–P7 source completion — approval superseding P3-only boundary

Direct human instruction verified in chat “Tìm nguyên nhân triển khai chậm”, turn01a14521-b147-79c0-9756-c0aae71c0952: “Approved hoàn tất code P3–P7 theo kế hoạch và mockup đã duyệt. Chỉ đạo nó code xong toàn bộ rồi mới kiểm một đợt cuối, không kiểm riêng P3, không sửa harness vòng lặp. Chưa cho phép import dữ liệu hay activation :5010.” This opens application source P4–P7 beyond the historical P3 exact52paths; it does not authorize retained import, activation, accounts/roles, cloud, Git or global configuration. Earlier approval records remain historical.

**CODE_COMPLETE_UNTESTED — all P3–P7 source integrated before final verification.** Backend: typed7groups, group/status/QA and fullsavedprojection;5resource adapters, immutable localized snapshots/source checks/reviews, self-review denial, explicit rebase, bounded queue, eligibility and frozen3locale release. Main sources: `contracts/{group-localization,group-localization-records,full-site-localization,localized-review-records}.mjs`; `cms-api/{group-localization-context,group-localizations,full-site-localizations,localized-resource-context,localized-editorial,localized-eligibility}.mjs`; exact routes/Auth transport and existing projection consumers. Enabled Work/Services require at least one eligible respective record for release; QA partial remains separate.

Frontend: D4group workspace/settings tabs and D5review UI replace corresponding legacy forms; existing CMS mounts/chrome/guards and savedfullpreview connected. Sources: `admin/{group-localization-editor,localization-settings-editor,localization-review-editor,full-site-localization-preview}.mjs` plus scopedCSS; `preview/{full-site-localization-renderer,full-site-interactions,full-site-locale-copy}.mjs` plus existing locale/P3 consumers. Fullwebsite uses native pinnedHero artwork/note/scrollcue and localized P1fields; approved P1CMS illustration remains unchanged. Header→footer, Brief/video, stableIP interest, dictionary/SEO and source order are wired; no P2shell substitute.

P6/P7 tooling: `scripts/{multilingual-release-files,multilingual-import-local,export-multilingual-site-local,activate-multilingual-site-local}.mjs`; commands registered through pinned `local-guard.mjs`: `multilingual-import validate|dry-run|apply`, `export-multilingual-site --bundle|--release`, `activate-multilingual-site prepare`. Selected importer has source/version preflight, durable before-images and immutable per-item intent/CAS/idempotency/readback/partial resume; retained execution requires separate exact approval. Export accepts frozen approved3locale snapshots/resources, preserves legacypublic bytes and separates overlay. Activation source requires separately approved independently managed Hosting identity and refuses sharedemulatorparent control. Actual isolation remains Unknown until separately authorized execution.

Test source was added for groups/context/API/editor, fullsite/renderer, localized snapshot/editorial/eligibility, importer and release tooling. No tests/lint/build/browser/runtime/hash commands or new retained writes ran during this source completion. All three implementation owners handed off source complete, checks NOT_RUN. Final integration now may run once across the completed source, reusing valid historical evidence. Product defects get scoped repairs/rechecks; repeated tool failures do not reopen harness work or login loops. Retained import/activation, runtime criteria without suitable data/roles and human UI/language acceptance remain open; no P1/P2/M3/M4/LOCAL_COMPLETE closure is claimed.

### Final integration result — P3–P7 source complete, runtime acceptance open

Evidence directory: `.local/test-outputs/multilingual-001/p3-p7-final-v1/`. One combined unit invocation selected27files:115tests,113PASS/2FAIL/0SKIP; original RED log retained. Both failures were test assumptions, not application changes: decorative logo alt negative fixture, and raw `&` versus safe `&amp;` About lead serialization. Focused corrections preserve both decorative/nondecorative rules and exact full DOM text including all Hero note lines: groupcontract4/4PASS; renderer/groupeditor7/7PASS. No repeat of the entire unit batch. Backend/API/editorial/eligibility/import tests passed in the original batch. Scoped lint120uniqueJS/MJS files PASS; focused changed-test lint PASS.

Independent final source review found two concrete tooling defects: approved exporter omitted required canonical/alternate options; activation stop happened outside recovery. Both were repaired within tooling ownership; recovery now explicitly reconciles ABSENT/PRESENT/UNKNOWN before restoring and cannot kill/start over foreign/unknown listeners. Final source completeness also required real `sitemap.xml`, added for fixed local EN/VI/JA canonical routes with all alternates/x-default and manifest/hash/MIME/handler closure. Focused real renderer/export/handler and activation-controller fixture tests9/9PASS; lint affected3pathsPASS. These are synthetic store/controller proofs, not retained import or actual Hosting activation.

Vite build PASS,2116modules; output relocated to task-owned `build-final/`, raw log `build-final.log`. Build warning: `assets/brand-diagonal.webp` remains resolved at runtime; public legacy file is still pinned. Final byte verification: original `dist/`39files and `public-baseline/`39files match locked SHA256,78/78PASS (`template-preservation-final.json`). No baseline edits or silent font/layout changes are accepted by this source/build evidence.

**Actual CMS read-only attempt:** existing approved persistentprofile restored OWNER automatically (`AUTHORIZED`),0newlogin,0CMS mutations/0blockedmutation attempts. Result `cms-readonly-final/result.private.json`: new group status/Header GET return404 from the still-running dev process; navigation action also timed out because source navigation intercepted a proxy button. This attempt is INCOMPLETE, not PASS. Browser closed with SDK profile preserved. No source/harness/selector repair, reload/login loop, extra Vite restart, emulator restart or data reset followed. The canonical API imports Node ESM modules by stable URL; the running process predates new routes, so new-route runtime availability remains unproved. Existing Vite-onlyrestart budget1/1 is already consumed; any additional process reload requires explicit scope before execution.

**Controlled browser regression:** existing two Work/Services tests ran once (`browser-components-final.log`) and both FAILED: image/font settlement timed out at120seconds; paired hierarchy test expectedMontserrat but observedAbril. These are unresolved browser proof gaps; no product parity or successful interaction claim is inferred. Stop this harness branch under the human code-first/bounded-verification instruction; do not repair/retry it or ask another login as a consequence. Fullsite section×locale×viewport/state runtime/UAT remains NOT_RUN beyond reused prior scoped evidence. Actual other-role review, retained import, linguistic acceptance and :5010activation remain NOT_RUN/not authorized as applicable.

Retained P3 history remains the known3commits/6documentwrites; final checks performed no further CMS writes, imports, review submissions or activation. Before-image reconciliation is reused and is not relabelled a newly read DB audit. Source completion is **CODE_COMPLETE / FINAL_CHECKS_PARTIAL / RUNTIME_ACCEPTANCE_OPEN**, not Accepted or LOCAL_COMPLETE. Next recommended action: review code/evidence, then explicitly authorize a Vite-only reload if completing new-route authenticated UI verification is desired; preserve the existing profile and all emulator processes/data. Retained import and activation still require their separate exact approvals.

### Approved Vite reload and focused read-only runtime continuation

Human replied “Duyệt.” to the concrete request to reload only Vite and verify new API/UI with remembered profile. Verified PID21039, pinnedNode/cwd/command and sole5173listener before SIGTERM; started Vite PID54116, ready162ms. This approval consumed exactly one additional Vite reload. Final listener observation: Functions/Auth/Storage/Hosting remain PID15465 at5001/9099/9199/5010; Firestore remains PID65804 at8080. No emulator restart, import, activation, account or data action. Evidence: `p3-p7-final-v1/vite-reload-approved-v1/{before,started}.json`.

**Verified authenticated read-only API:** OWNER restored automatically, no manual login or token extraction.26/26reads succeeded: groups/status,7groups×3locales, submitted queue, eligibility×3locales (`read-only/result.private.json`). New-route404 is resolved by the approved process reload. All21group drafts are absent, submitted queue empty and release eligibility false with explicit missing eligible Work/Services reasons; no fallback, draft creation or automatic approval occurred. These observations prove read paths/current missing-content state, not save/review/release execution.

Runtime revealed a product caller defect: settings sent `settings:*` to Hero's strict transition guard and used the wrong activation method. Fixed only `admin/localization-settings-editor.mjs`; retained existing Hero protocol/layout/guard. Added `tests/localization-settings-editor.test.mjs`:3/3PASS and affected lintPASS. Rendered check then reached Hero/SEO and all other groups; one premature Header return while SEO was still loading remained in the raw partial result, not relabelled PASS. Final settled check subsequently proved Hero→SEO→Header3/3visible without weakening loading guards.

Rendered D5 also exposed old global actions/history chrome beside the new review workspace. Fixed `admin/cms-shell.mjs` only: localized review owns the heading/actions/context; old header, global save/preview/send and history cards are excluded from that view and restored outside it. Controllers/history records/Auth/transport remain unchanged. Focused `tests/cms-ux-003-shell.test.mjs`:26/26PASS and lint2filesPASS; logs `frontend-d5-shell-{focused-v2,lint}-20261016.log`. No repeat of whole unit/build/browser regression batch.

**Verified read-only UI, bounded scope:**7non-settings groups visible at1440px; Clients/About/IP/Contact/Footer switched VI→JA→EN with matching locale fields; About/Footer observed390px without horizontal overflow (`ui-after-tab-fix/`). Final `settled-ui-final/result.private.json` is PASS_READ_ONLY_FOCUSED_UI: remembered OWNER, Hero/SEO/Header3tabs, review queue visible at1440/390, correct heading, no legacy/global actions, no horizontal overflow or JavaScript errors. Root visually inspected final desktopD5 and mobileFooter screenshots.0CMS mutations/0blockedmutation attempts; browser closed with remembered profile preserved, Vite remains available at5173. Historical failed/partial observations are retained.

Current handoff: **SOURCE_COMPLETE / API_READ_VERIFIED_SCOPED / UI_READ_VERIFIED_SCOPED / HUMAN_ACCEPTANCE_PENDING**. Earlier two stopped Work/Services browser regression failures, missing translated content, actual save/review/other-role workflows, full populated website parity, retained import and activation remain open/NOT_RUN as previously stated. This continuation does not claim P3–P7 human acceptance or close P1/P2/M3/M4/LOCAL_COMPLETE. Next options: human inspect the CMS empty/saved workspaces and screenshots; prepare/select P6 content mapping/dry-run and exact import approval before any retained content import. :5010 activation retains its separate approval boundary.

## Amendment hiện hành — P5 một Admin, 17/10/2026

Quyết định trực tiếp của Khiêm: “Bỏ cơ chế duyệt rườm rà, CMS này rất nhỏ chỉ
có 1 Admin thôi, Draft -> Publish.” Thay yêu cầu hai actor trong luồng P5 mới
bằng Admin OWNER xuất bản trực tiếp bản đã lưu. Giữ auth, source/version CAS,
idempotency, immutable publication và audit; lịch sử duyệt cũ không rewrite.
Source/contract/tương thích và kết quả scoped checks tại
[Single Admin Publish](../docs/P5-SINGLE-ADMIN-PUBLISH.md).

User chọn chỉ lập [danh sách thiếu](../docs/P3-P6-CONTENT-GAPS-2026-10-17.md),
chưa dịch. Giới hạn không import, không P7/activation :5010 còn hiệu lực.
Khiêm đã duyệt riêng “Publish Wayfair EN v4” và yêu cầu khôi phục UI để thực
hiện. Đã mở tab Edge mới cùng profile/OWNER, khởi động lại riêng admin :5173
để nạp API mới, Publish đúng Wayfair EN v4 và mở lại từ queue Đã xuất bản.
UI xác nhận phiên bản 4, `06:17:11 17/10/2026` (Việt Nam), snapshot
`lp-20261016231711937-01326461-608a-4155-ade4-9a6ce3cf90f3`; queue lọc EN/project
có đúng một publication. Xem proof/ảnh và giới hạn tại Single Admin Publish.
Không chạy harness/tests/build, không đổi nội dung/import/P7/activation.
Mobile sau thay workflow, P6 import/recovery và toàn P3–P6 vẫn chưa hoàn tất.
Các đường POST duyệt cũ đã retired; 6/6 scoped checks liên quan là evidence
source/contract trước đó, tách biệt với lần UI mutation/readback thành công này.


## P7 v2 — engineering + QA :4189, Approved 17/10/2026

Quyền trực tiếp trong chat: “Approved P7 v2 — hoàn thiện code và QA riêng tại :4189. Một mình mày làm ở effort xHigh, code xong toàn bộ rồi kiểm một đợt cuối. Không lặp harness, không import, không Publish thêm, không activation :5010; giữ nguyên backup.”

Một agent thực hiện; không delegation. Runtime không có công cụ đổi effort trong lượt, đã báo không thể xác nhận xHigh. User instruction thay routing Medium và lịch kiểm từng slice cho đúng task này. Engineering gồm readiness/release handoff từ session CMS, frozen composer/export, renderer/interaction corrections cần thiết, server QA :4189 và rehearsal trên artifact riêng. Hoàn tất source trước đợt kiểm cuối; không CMS mutations/import/Publish/activation.

Backup trước P7: `.local/backups/hosting-5010/20261017-062442-before-p7`, archive SHA256 `c716955e11c9d9549361adc00757d6cf09e86ecab408061d6b8b3c1f99582584`, 40 file/30.844.370 byte; 40 HTTP hashes khớp; extraction/readback PASS; đã đặt chỉ đọc. Backup không thuộc write set P7. Dist/public-baseline/root firebase giữ nguyên.

Trạng thái bắt đầu: implementation; chưa chạy đợt kiểm cuối. Các evidence P3–P6 và acceptance còn mở giữ nguyên. Nội dung thật thiếu không chặn source/fixture QA độc lập, nhưng chặn release dữ liệu thật. Hosting :5010 đang chung PID với emulator khác; không có quyền kill/adopt/restart tiến trình đó.

**Kết quả P7 v2 — 17/10/2026:** SOURCE_COMPLETE /
QA_FIXTURE_VERIFIED_SCOPED / REAL_CONTENT_BLOCKED. Readiness GET ba locale trong
một transaction, browser download frozen handoff không mang session, exact
offline baseline completion, content/resource/closure validation và QA owner
riêng4189 đã nối đủ callers/commands. CLI import vòng được sửa bằng tách
artifact module; lệnh guard --serve thật đã chạy, không dùng operator script
thay proof CLI. Language controls44px và Hero label wrapping đã kiểm sau sửa.

59 distinct test cases có PASS sau focused corrections; lint/build và3affected
artifact/export regression PASS; không rerun toàn suite hoặc lặp emulator
harness. Actual UI fixture đã kiểm load-more/filter/entity/missing/Services,
showreel phát/dừng, brief validation/dirty/copy, mobilemenu/dialog, refresh và
Back/Forward. 12locale×viewport geometry cases không clipping control/heading;
chữ Nhật dài ở320px không tràn card/dialog. Tràn trang1–7px bằng template
vẫn còn và không được gán PASS zero-overflow. Native cancel reload/clipboard
denied fallback/OS mail client chưa kiểm. Full populated parity và language
acceptance không được suy từ fixture.

Actual CMS OWNER readiness tại desktop/mobile báo cả3locale thiếu publication;
download disabled và danh sách thiếu theo tên mục. Không save/import/Publish
hoặc export release nội dung thật. QA4189 phục vụ107files khớp HTTP manifest,
base→long→restore rehearsal PASS. Base manifest
`a5bee2fa0b2dd3f1716fbd79c989409c9a32236f53997254aaf5c0eee362a506`.
Backup43checksum entries/read-only, HTTP5010 40/40, root và template39+40pins
giữ nguyên; Hosting vẫnPID15465. Không activation hoặc emulator restart.

Chi tiết evidence, source, lệnh vận hành và giới hạn tại
[P7 v2 local QA](../docs/P7-v2-LOCAL-QA.md). Chưa đóng P7 full acceptance hoặc
MULTILINGUAL_LOCAL_COMPLETE. Next: Khiêm rà engineering/fixture QA riêng; rồi
chốt nội dung/Publish scope và xử lý Hosting ownership bằng proposal/approval
riêng trước release thật. Giữ nguyên quyền cấm import/Publish thêm/activation
và bản backup hiện tại.

### P7 v2 — focused overflow repair, 17/10/2026

User giao sửa dứt điểm tràn1–7px và rà UI thật4189, một agent, requested xHigh,
code trước một campaign cuối; không import/Publish/activation5010, giữ backup.
Đây là routine UI repair trong P7 đang mở; không đổi runtime effort/config.

Đã sửa đúng `preview/full-site-localization-renderer.mjs`: orbit decoration
dùng SVG rounded rect xoay bên trong, hộp layout giữ inset và không xoay. Root
cause là bounding box DIV xoay12° gây scroll; không dùng page overflow mask.
36locale×width cases từ320→1440 (gồm breakpoint boundaries) và6long-copy cases
đều scrollWidth=innerWidth, không clipping heading/controls/cards. JA long
dialog320px không tràn. Native viewport1874 cũng không tràn; console errors0.

UI thực đã rà header/mobile/footer switch, nav/load-more/filter/project dialog/
Escape focus, Services, showreel play/pause, IP artwork, brief validation và
Stay/Copy/Discard bằng dữ liệu giả. Renderer4/4tests, lint và whitespacePASS;
không lặp full suite/build/harness. Backup43checksum/read-only và HTTP5010
40/40, dist39+Hosting40pins giữ nguyên; Hosting PID15465. Không CMS writes.

Trạng thái hiện hành: **OVERFLOW_FIXED / RENDERED_UI_VERIFIED_SCOPED**; lỗi tràn
ngang trước đó đã đóng trong phạm vi kiểm. QA4189 đang phục vụ fixture base
`p7-overflow-20261017-base`, manifest
`4a3f9e22bad6eed1429dcdfcdb46fb609adc74c50544f8ea38da2a7bae597bc7`.
Evidence `.local/test-outputs/p7-overflow-20261017/`, chi tiết
[QA update](../docs/P7-v2-LOCAL-QA.md#cập-nhật-hiện-hành--sửa-tràn-ngang-p7-17102026).
Nội dung thật/linguistic acceptance/activation còn mở như cũ. Next: Khiêm rà
UI engineering trên4189; không suy bước này thành quyền ghi dữ liệu hoặc
activation5010.

### P7 v2 — display fixture locale correction, 17/10/2026

Theo yêu cầu trực tiếp, một agent sửa fixture hiển thị EN/VI/JA sau khi user
thấy tiêu đề Nhật tại routeEN. Requested xHigh; effort runtime không xác nhận
được. Không sửa CMS business data/application renderer/import/Publish/5010.

Đã tách `tests/helpers/p7-qa-copy.mjs`, cập nhật `p7-qa-fixture.mjs` dùng đúng
bộ chữ cho mọi localized slot và recalculate nested/content/snapshot hashes;
thêm `tests/p7-qa-fixture-copy.test.mjs` giữ contracts/identity/missing policy.
2/2tests +lint3paths PASS. Source xong rồi kiểm một campaign cuối, không full
suite/build/harness. UI phát hiện client lặp trong project eyebrow; sửa đúng
3sample strings và kiểm dialog v2, không đổi test assertions hoặc chạy lại
matrix không bị ảnh hưởng.

Actual UI: rootEN hiển thị Selected work./What we create.; VI Dự án tiêu
biểu./Dịch vụ sáng tạo.; JA さまざまな制作実績。/私たちがつくるもの。Hero/nav/Project/
Service/About/IP/Contact/Footer/SEO/alt đều dùng locale copy riêng.36geometry
cases và6long-copy cases không tràn/clipping;3long dialogs320px284=284. Actual
dialog switch giữ Wayfair và đổi title/summary/scope đúng từng locale; native
1874px không tràn, console errors0. Proper names/media gốc giữ nguyên.

Trạng thái **FIXTURE_LOCALE_COPY_FIXED / ACTUAL_UI_VERIFIED_SCOPED**.4189 đang
phục vụ fixture thường `p7-fixture-locales-20261017-v2-base`, manifest
`a3646c3c42d3c279d3e62ca642a2b8db30aab7fd58b21cd0053c888e13b00d4c`.
Backup43checksum/read-only, HTTP5010 40/40 và39+40pins giữ nguyên; HostingPID15465.
Evidence `.local/test-outputs/p7-fixture-locales-20261017/`; chi tiết trong
[P7 QA](../docs/P7-v2-LOCAL-QA.md#cập-nhật-fixture-en--vi--ja--17102026).
Next: Khiêm rà fixture/UI trên4189; content thật và activation còn mở riêng,
không tự import/Publish hoặc gán MULTILINGUAL_LOCAL_COMPLETE.

### P7 v2 — original English template titles, 17/10/2026

Chỉ đạo trực tiếp mới: “đối chiếu với http://127.0.0.1:5010/ để sửa lại hết
các tiêu đề cho giống với :5010 … các tiêu đề luôn luôn là tiếng Anh, dù user
có thay đổi ngôn ngữ nào đi nữa.” Chỉ đạo này thay quyết định dịch heading
của fixture ở snapshot trước. Một agent; requested xHigh, actual effort không
xác nhận được. Không import/Publish/activation5010, giữ backup.

Source hoàn tất rồi kiểm một campaign cuối: khôi phục title text/line-breaks/
accents từ pinned template cho8vị trí, giữ đúng8project/6service names, ảnh,
client, năm và credential pages. Body/actions vẫn theo locale. Heading kinh
nghiệm dịch sang tiếng Anh; proper names giữ nguyên. DESIGN D12 ghi quy tắc.

14/14scoped tests và lint5paths PASS. Actual UI so với live5010:48paired title
comparisons tại1440/390px không differences;36responsive cases và6long-copy
cases không tràn/clipping;3long dialogs320px không tràn. Wayfair JA→VI→EN giữ
English title/SCOPE OF WORK, đổi đúng body/actions; Escape focus và đủ8cards
đã quan sát. Không lặp full suite/build/emulator/harness.

Trạng thái **TEMPLATE_HEADINGS_RESTORED / ACTUAL_UI_VERIFIED_SCOPED**.
4189 phục vụ `p7-template-headings-20261017-base`, manifest
`08d8b27ffd1676332d423bab8711785201aaefde59eeb6b6f5a7c574a2877e30`.
Backup43checksum/read-only và archive hash giữ nguyên;5010HTTP40/40,
39dist+40Hosting pins và PID15465 giữ nguyên. QA135files khớp HTTP.
Evidence `.local/test-outputs/p7-template-headings-20261017/`; chi tiết trong
[QA correction](../docs/P7-v2-LOCAL-QA.md#khôi-phục-tiêu-đề-template--17102026).
Next: Khiêm nghiệm thu correction tiêu đề/fixture tại4189. Content thật và
activation còn mở riêng; không gán MULTILINGUAL_LOCAL_COMPLETE.

### P7 cleanup v1 — Approved, 17/10/2026

Khiêm duyệt trực tiếp cleanup v1 chỉ4189, một agent/requested xHigh, source
xong rồi một campaign UI; không import/Publish/activation5010, giữ backup.
Đã bỏ prefix QA ở title, khôi phục VI gốc và EN/JA theo từng8Project/6Service,
body công ty/SEO/alt/brand marks, bỏ generic media fallback và giữ internal
fixture/noindex/activation guards. Không đổi runtime effort/config.

Actual UI:3locale sạch QA/sample;11field VI+6services khớp native5010text,
24project dialogs và36responsive cases không tràn/clipping; switch/video
đã quan sát. UI phát hiện cover height620 kế thừa source; sửa CSS P7 riêng,
kiểm đúng6dialog desktop/mobile sau sửa (mobile354×228.383), không lặp full
campaign/harness. 11content/renderer tests PASS; extra release-preparation
suite NOT_RUN do thiếu demo env ở invocation, giữ log/exit1, không bypass.

Trạng thái **CLEANUP_IMPLEMENTED / ACTUAL_UI_VERIFIED_SCOPED**. Artifact
`p7-cleanup-v1-20261017-final`, manifest
`bca9a29055c975785408d1102760ee7d596db91c5bb2e0710bfdf9e7395e06c4`.
Backup43checksum/read-only/archive và5010HTTP40/40+root/39+40pins/PID15465
giữ nguyên. Evidence `.local/test-outputs/p7-cleanup-v1-20261017/` và
[QA cleanup](../docs/P7-v2-LOCAL-QA.md#p7-cleanup-v1--17102026).
Next: Khiêm nghiệm thu bản cleanup4189; không gán full P7 acceptance hoặc
MULTILINGUAL_LOCAL_COMPLETE, không mở thêm quyền CMS/activation.


### P7 cleanup v1 — header center correction, 17/10/2026

User yêu cầu menu ở giữa, đối chiếu5010. Đã sửa full-site P7 renderer và
DESIGN D07.1 trong scope4189: nav desktop đúng tâm, actions riêng bên phải;
mobile gap≥8px.27actual UI header cases +3scoped320px repair checks; final
native1874 nav/header center937px. Không báo full P7 Accepted. Chi tiết và
proof giới hạn tại `docs/P7-v2-LOCAL-QA.md` mục header center correction;
evidence `.local/test-outputs/p7-header-center-20261017/`. Backup/5010 giữ
nguyên, không import/Publish/activation, không subagent hoặc harness loop.


### Human acceptance — header P7 tại :4189, 17/10/2026

Khiêm: “đã xem và nghiệm thu.” Header correction chuyển sang
**HUMAN_ACCEPTED**, đúng phạm vi header vừa bàn giao, artifact
`p7-header-center-20261017-final`, manifest
`cea276e421134dde7f9eb0a4dcc52a10e4eddee517ac2de6f5d6e7a1da0376c3`.
Không suy rộng thành full P7 acceptance/MULTILINGUAL_LOCAL_COMPLETE hoặc
quyền import/Publish/activation5010. Chỉ cập nhật hồ sơ, không chạy lại
checks/runtime hoặc sửa ứng dụng. Chi tiết tại QA record cùng ngày.


## P7 v3 — Approved 17/10/2026 — CMS thật → :4189

Nguyên lời Khiêm: “Approved P7 v3 — hoàn thiện code, seed dữ liệu và media thật từ :5010 vào CMS, dịch/rà EN/JA, cập nhật có kiểm soát dữ liệu thử, Publish local và nối release CMS thật vào :4189 để nghiệm thu toàn chuỗi. Một mình xHigh, code xong toàn bộ rồi QA một đợt cuối. Không activation :5010, không cloud; giữ nguyên backup gốc.”

Một writer /root; không subagent. Requested effort xHigh; tool không xác nhận/đổi effort runtime. Approval này bao code, backup CMS riêng, seed có kiểm soát, Publish local, release/rollback riêng4189 và các thao tác QA có hoàn nguyên. Không đổi Auth/roles, runtime chung5010, backup gốc hoặc cloud. Giữ lịch sử Wayfair EN v4 và các release cũ.

Trình tự: (1) khóa nguồn5010 và before-images; (2) hoàn tất code nguồn/seed/media/tiêu đề/release/UI; (3) một campaign cuối bắt đầu source checks, sau đó preflight dữ liệu → seed/readback → rà nội dung → Publish/release4189 → UI/lifecycle/rollback. Không chạy tests/build sau mỗi edit. Required missing evidence vẫn mở.

- [ ] Code toàn chuỗi và meaningful regression coverage.
- [ ] Seed đủ72bản EN/VI/JA từ nguồn gốc; media thật và nguồn đối chiếu.
- [ ] Rà nội dung và Publish snapshot thật; export qaFixture=false.
- [ ] UI và sửa Draft→Publish→website, restart QA host, rollback4189.
- [ ] Backup gốc/5010 giữ nguyên; báo kết quả thật và giới hạn.

### P7 v3 actual execution — 17 October 2026, blocked before content import

- Source :5010 captured and verified against 40 fixed source hashes. Original hosting backup remains read-only and passes all 43 checksum entries.
- Source-bound seed, shared English headings, EN/JA copy, immutable release packaging and :4189 pointer host are written. Admin build and scoped lint pass. Source conversion validates 72 locale records. This is not full runtime acceptance.
- Five client-logo media reached READY through the real upload/processing/storage pipeline. Credential PDF upload retained five parts and original, then became RECOVERY_REQUIRED with TOOL_BYTES. Twelve linked native libraries differ from historical pins; the reason is unknown. No silent pin update or PDF retry followed this finding.
- No source content update, new Publish, real CMS release switch, full UI campaign or real-release rollback/restart acceptance completed. :4189 still serves the previous QA artifact. P7 remains IN_PROGRESS / BLOCKED_FOR_NATIVE_RUNTIME_DECISION, not complete or accepted.
- Recovery proposal: docs/P7-v3-PDF-RECOVERY-PROPOSAL.md. Evidence: .local/test-outputs/p7-v3-final/. Source, before-images, prepared 72-record review and operation journal: .local/p7-v3/.

### PDF local recovery approval and execution — 17 October 2026

User reply: “Duyệt recovery PDF local để hoàn tất P7 v3 (đề nghị)”. Solo implementation retains the original lock, global runtime and backup. A repository-owned profile is registered beside historical R0. Twelve conda-forge packages (13 selected dependency files) were archive/file SHA-verified before relocation/signing. Runtime closure: 15 native objects, 312 files; runtime manifest SHA `5838808add7e765b25c2d6ac4a86713508c6882f4ed9e0a8c4f0891622c1cfe2`; PROGRAM SHA `39f0197b2e4f56499aa4a204b5899bea78b93b72d80231c1e3021f3514a9ca4f`.

Scoped lint, five regressions, Admin build and non-executing runtime custody verification passed. The recovery service initially refused its scratch traversal guard because it counted all 387 historical artifacts; the correction bounds and filters server-allocated worker UUID directories without deleting anything or bypassing custody. The authenticated OWNER recovery then committed an immutable audit and released the slot. Old job `5a4c6354-3173-4b27-b60e-f9b35122aa25` remains RECOVERY_REQUIRED; 34,995,488 retained bytes and version accounting were preserved. New credential job `259047bb-f62d-4bed-ac48-8c80bc01b182` uses the isolated profile. Seed has resumed; final acceptance remains open until its actual results are recorded.

### Actual native result — output-size blocker, 17 October 2026

The isolated runtime processed the real 48-page, 17,349,548-byte credential. LOCAL-1 wrote 38 page WebPs (32,597,900 bytes) and refused page39 at the aggregate 32 MiB bound: PDF_WEBP_LIMIT, duration63,385ms. The private receipt proves native parent exit/close/reap and no remaining PIDs; no READY was granted. The failed immutable job is `259047bb-f62d-4bed-ac48-8c80bc01b182`. No automatic retry followed. Seed remains 5/28 READY media, 0/72 imported copy; no new publication or real CMS artifact on4189. Runtime hash recovery is complete; overall P7 v3 is BLOCKED_FOR_PDF_OUTPUT_ALLOCATION_DECISION, not complete. Concrete proposal: `docs/P7-v3-PDF-OUTPUT-BUDGET-PROPOSAL.md` (32→64 MiB page-WebPs inside unchanged96MiB combined derivative budget). No policy bound changed by the proposal.

### Approved output allocation and current remaining blocker — 17 October 2026

Direct user reply approved “Duyệt WebP 64 MiB trong tổng 96 MiB; tiếp tục P7 v3 (đề nghị)”. Registered LOCAL-2 separately; LOCAL-1/R0 DATA and old job identities remain preserved. The 64 MiB allocation is synchronized across producer, PROGRAM and structural custody; combined96MiB and per-page32MiB limits remain in force. Regression covers aggregate acceptance inside96MiB and rejection beyond page/combined bounds. Retired jobs are denied normal retry before quota reservation; the real upload-service regression verifies no data/quota/queue mutation.

LOCAL-2 converted all48pages to39,528,268WebPbytes. Native output then refused PDF_OUTPUT_LIMIT after72,956ms; exit1/close/reaped/no remainingPIDs are recorded. Size reconstruction using only existing lossless WebPs measured rasterPDF78,299,784bytes and combined117,828,052bytes. This exceeds PDF64MiB and combined96MiB. No increase or same-condition retry followed.

Audited retirement released the slot while preserving104,393,680retainedbytes and all job/history records. Credential is explicitly held. Independent media processing completed **27/28 READY**, including video and project imagery. No new locale import (0/72), Publish, real CMS artifact switch or final UI acceptance ran. :4189 still serves the prior QA artifact. Native-runtime recovery and independent media are real outcomes; P7 v3 remains **BLOCKED_FOR_PDF_RESOLUTION_DECISION**.

Concrete decision pending: output-budget proposal v2 (1280px public raster, all48pages, current byte/RAM/time/quota caps unchanged). Source original remains intact. Current scoped lint,4affected regressions and Admin build pass; these do not prove full P7 acceptance. Backup last verification43checksums/read-only;5010root matches baseline4de13ed9a2b513458574b16fdaf9410422eb311ea23a0c4bce45b50a5d4630de. No cloud/Git/activation occurred. Evidence remains `.local/test-outputs/p7-v3-final/` and `.local/p7-v3/`.

### Approved raster1280 — 17 October 2026

Direct user reply: “Duyệt raster 1280px, giữ mọi trần hiện tại (đề nghị)”. Registered immutable `M3-PDF-LOCAL-3`; LOCAL-1, LOCAL-2 and R0 DATA remain unchanged. Native argv, candidate validation and PROGRAM use1280px; all48pages, lossless encoding, raster-only PDF, pixel checks and existing byte/RAM/scratch/time/quota caps remain. PROGRAM SHA `c8093af40910207753f8de12cd95e0e4d83c470f1429601ea986ea82bd217ca5`, tool-set SHA `c9ed4670cc9dadfaf3240be09011cc3c90e31b507a59ddea898bb7faaf122a45`. Scoped lint,6affected regressions, Admin build and non-executing runtime/source custody verification passed. Sole root resumed the original seed through authenticated OWNER UI; actual PDF/seed/publication/UI outcome remains pending, not acceptance.

### Focused runtime repair — scratch observation race

The first LOCAL-3 actual attempt stopped with ENOENT after45pages. Its receipt records SIGTERM, close/reaped=true and no remaining PIDs. Source inspection localizes the only ENOENT-capable operation in the 50ms watchdog sample to lstat after readdir; the producer normally unlinks `raster.png`/`proof.png` between these operations. This is a product-runtime race, not a harness failure. Repair only this observation: missing known transient files count as absent; missing permanent files, links, nonregular files and other errors remain failures. Register new immutable source bindings beside LOCAL-3, preserve its failed job and retire only with persisted quiescence/pinned receipt. Check deterministic unlink-race and refusal cases, then run the real credential once under the corrected source. Do not change limits or rerun the historical harness.

### Focused runtime repair — empty annotation scaffolding

LOCAL-4 converted all48pages inside current limits (WebP27,826,670bytes; PDF51,955,735bytes) but refused PDF_OUTPUT_ACTIVE. Read-only inspection of its generated raster PDF found exactly48 `Annots` entries, each an empty PDFArray; no other blocked key was present. Pinned pdf-lib1.17.1 `PDFPageLeaf.normalize()` unconditionally creates that empty array during drawing. Repair the producer to remove only an existing empty annotation array from each newly created raster page. Nonempty/wrong-type annotations remain a failure; preserve the global post-save active-content rejection and full pixel verification. Use deterministic real pdf-lib regression, validate the existing failed raster output without native reexecution, then resume one actual credential upload with new immutable source bindings. No limits, quality or public-source policy change.

### Focused seed repair — source line break in single-line field

Native LOCAL-5 completed: all28media are READY, including the48-page credential. Shared source writes reached revision23; the About section was refused because the template-derived English experience label contains a newline while HomeV3 defines that label as a single-line plainText field. Normalize that label's whitespace without changing words/facts; validate the full source Home against its actual structural content contract before any seed writes. Preserve the failed operation payload/key; use a new deterministic repair key only for the changed, uncommitted patch. Resume from revision23 and existing READY media, with no native reprocessing or historical mutation.

### P7 v3 actual local outcome — 17 October 2026

Sole root completed the approved raster1280 continuation and real CMS path. Final DB readback proves72/72 EN/VI/JA records match captured source and28/28 real media are READY. Public credential contains48pages; PDF51,955,159bytes plus27,826,670WebPbytes totals79,781,829bytes, within approved64/64/96MiB caps. Old Wayfair ENv4 snapshot is byte-equivalent to its before-image.

Runtime integration repairs also corrected unsorted/duplicate media context IDs, a legacy24MiB/5010-only credential guard in the public renderer, resource descriptor PDF limits, shared-resource duplication across locales, and sticky-header top anchoring. Failed publication kept the old website; existing72snapshots were reused after repair. No historical harness or native-processing retry of the same unchanged failure was run.

Actual releaseA `cms-mvbvuepp-7e1d9c2c` served the full source copy. A saved ENcontact Draft did not change it. PublishB `cms-mvbw3aua-92799f4f` changed that sentence on4189 and created only1new snapshot, retaining71. UI rollback restored exactA manifest, metadata and whole-HTML HTTP SHA. Restored Draft copy was then published as finalC `cms-mvbw7erw-27ea14c2`; final source copy is exact, with no temporary QA sentence. Manifest SHA `6551cc68b11183a4b617c30f9fc9af09ebe222b86535475b5a82531752e889a9`; snapshot-set SHA `e55697a08dc2682317980460379d4bd8bfbe2e43e6bb5b71c2099a5a92f17080`.

Actual Edge QA coveredEN/VI/JA, all8ENproject modals,6services, filters/load-more, showreel playback, brief validation/copy/discard guard, mobile navigation and settled320/390/768/1440px layouts. Header center offset0px; Play triangle visible; Back-to-top returns0. HTTP verified84files;81unchanged resource checks were reused for finalC and all3changed documents were read again. Private/anonymous denials passed. Stopping ownedAdmin did not affect4189; restarting only the owned4189host preservedC. Admin restored. Original5010PID15465/root hash and43-checksum read-only backup remain unchanged. No5010activation, cloud, Git delivery or user acceptance was performed.

Technical status: **READY_FOR_USER_ACCEPTANCE**, human acceptance pending. Details and evidence: `docs/P7-v3-LOCAL-ACCEPTANCE.md` and `.local/test-outputs/p7-v3-final/`. This does not close unrelated historical approval registers or set global LOCAL_COMPLETE. EN/JA review is by the implementing agent; independent native-language review remains unclaimed.
