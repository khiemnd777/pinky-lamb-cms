# HOME-V3-RECOVERY-001 — Home v3 LOCAL recovery

## Current v2 — RECOVERY_VERIFIED_LOCAL / READY_FOR_HUMAN_REVIEW

Direct human approval15/10/2026: “Approved HOME-V3-RECOVERY-001 v2 — kiểm tra fixture, sửa persistence, restart riêng Vite 5173 và retry import Home v2 revision 778, local/emulators. Giữ nguyên emulator và dữ liệu hiện có.”

Actual fixture on retained Firestore: raw `baselineContent` rejected code3 `INVALID_ARGUMENT: Property baselineContent contains an invalid nested entity`; encoded `initialDraft.contentJson` create/readback PASS. Both owned fixture records removed and absent; no historical fixture cleanup.

Medium worker changed exactly writer/reader and existing API test. Persisted raw baseline removed; reader hydrates immutable initial content, preserves revision0/actor/time/event/lineage/audit and legacy raw equality. Original UI/error correction unchanged. RED3fails before repair; final14/14focusedtests,syntax4/4,staticbuild158modules/25outputs PASS. Scoped lint FAIL3 pre-existing unused variables retained. Independent observed High source review PASS;4/4owned hashes match.295before source records:3approved files changed,292protected unchanged.

Root verified old Vite34164/guard34155 identity and sent SIGTERM only to Vite. New guarded dev session71718, Vite41438 listens127.0.0.1:5173. Auth/Storage15465 and Firestore65804 retained at original endpoints; no emulator signal/restart/reset/seed. Identity checker initially compared relative argv against absolute paths; corrected only path resolution against observed cwd, before any signal. Guard/policy/config source unchanged.

Retained browser retry controller sent held body/key. Actual import and subsequent UI read succeeded: Home v3 revision0, lineage Home v2 revision778, schema3/contractRevision2,8projects/6services; all8editor groups populated and saved status observed. Root readback matches current M2 converted schema3 and immutable initial content; raw persisted baseline absent. BEFORE14,666/AFTER14,670 top-level CMS documents:0changed/0missing; exactly4approved records added in cmsDrafts/cmsSiteV3Imports/cmsAudit/cmsIdempotency. No new review/snapshot/save/upload mutation.

**Verified UI:** Người dùng đã đăng nhập lại trực tiếp trong Edge. Phiên OWNER mới tải đúng Home v3 revision0; cả tám nhóm có dữ liệu trên desktop1440×900 và mobile390×844. Preview hiển thị “Bản xem trước khớp bản đã lưu.” và revision0; 28/28 ảnh tải thành công. Shell không tràn ngang ở hai kích thước; frame có scrollWidth/clientWidth tương ứng429/429px và322/322px. Ảnh desktop/mobile đã được root và reviewer độc lập đọc. Viewport override đã reset; Edge giữ phiên OWNER tại Toàn website — media, Biên tập, có preview bản đã lưu.

**Giới hạn:** Reviewer ghi nhận P2: hàng nút PDF/video bị cắt bên phải trong preview ở các khung đã chụp. Metrics shell/frame không chứng minh hàng nút vừa khung; khả năng truy cập đầy đủ nút, tải PDF/video và playback chưa kiểm chứng. Phần này cần UI follow-up riêng nếu được duyệt; không làm mất proof import → tải nội dung → xem bản đã lưu. Các thao tác lưu mới, gửi/duyệt, roles khác, concurrency và full suite NOT_RUN trong recovery này. Kiểm kê dữ liệu bao phủ các top-level CMS records đã đọc, không phải backup đầy đủ hoặc audit subcollections. Whole CMS acceptance/M3/M4/LOCAL_COMPLETE/production giữ nguyên.

**Lịch sử đăng nhập:** Root đã reload trước khi kiểm tra `inMemoryPersistence`, khiến phiên OWNER trong bộ nhớ mất. Người dùng đăng nhập lại và kiểm tra UI sau đó đã hoàn tất. Không thay auth persistence, đọc credentials hoặc tạo account. Evidence trước reload và v1 HOLD giữ nguyên.

**Kết luận:** Implementation và kiểm chứng recovery LOCAL trong phạm vi v2 đã hoàn tất; chờ người dùng xem kết quả, không đồng nghĩa nghiệm thu toàn CMS. Nguyên nhân persistence đã được actual Firestore fixture xác nhận; bản import hiện dùng immutable `initialDraft.contentJson`, reader hydrate baseline đã validation. Không có mutation tiếp theo để kiểm chứng preview.

Current evidence: `.local/test-outputs/home-v3-recovery-001/v2/` approval,source-before/after/final,data-before/after,fixture-probe,review,artifact-review,retry-preflight,import-readback,Vite identity/stop/listeners, desktop/mobile groups/AX/JPG/preview metrics, final-ui và summary; worker tests/build. [Desktop](../.local/test-outputs/home-v3-recovery-001/v2/desktop-preview.jpg), [mobile editor](../.local/test-outputs/home-v3-recovery-001/v2/mobile-editor.jpg), [mobile preview](../.local/test-outputs/home-v3-recovery-001/v2/mobile-preview.jpg). Historical v1 records below remain unchanged evidence.

Lệnh kiểm tra của observed Medium worker tại `pinky-lamb-cms`: pinned Node22.23.3 `--experimental-vm-modules --test tests/home-v3-recovery-api.test.mjs tests/home-v3-recovery-ui.test.mjs` PASS14/14; `node --check` cho4owned files PASS4/4; isolated `node .local/test-outputs/home-v3-recovery-001/v2/worker/build-check.mjs` PASS158modules/25outputs. Scoped ESLint FAIL3 lỗi unused có sẵn, được đối chiếu beforecopies. Các receipts ghi commands và giới hạn thực tế; không có full-suite PASS claim.

## Historical v1 — SOURCE_VERIFIED / IMPORT_HOLD (resolved by approved v2)

Trạng thái 15/10/2026: **SOURCE_VERIFIED / IMPORT_HOLD**. Chưa hoàn tất recovery hoặc nghiệm thu CMS.

## Quyền và phạm vi

Direct human approval trong chat: “Approved HOME-V3-RECOVERY-001 v1 — sửa trạng thái UI và import Home v2 revision 778, local/emulators.”

Phạm vi nguồn: `contracts/errors.mjs`, `cms-api/site-v3-context.mjs`, `admin/site-media-editor.mjs`, tối đa hai tests mới. Chỉ `demo-pinky-lamb-cms` và loopback. Import một lần qua API hiện có; giữ Home/Home v2/lịch sử; không seed/reset/restart emulator, Git hoặc production.

Coordinator giữ evidence/shared state; implementer `home_v3_fix` sole writer năm files; reviewer `home_v3_review` chỉ đọc. Native observed implementer GPT-6.1 Sol Medium, reviewer High; parent XHigh được ghi riêng, không suy là High/Medium.

## Verified

- Trước thao tác: Home revision159, Home v2 revision778, Home v3 không tồn tại. Current-M2 trusted-context và conversion schema3 PASS; 8 projects,6 services,2 source references.
- Nguồn sửa có `DRAFT_NOT_INITIALIZED` riêng, HTTP404. Missing media vẫn `NOT_FOUND`; UI không coi mọi404 là thiếu draft. OWNER-only import và stale-error clearing được giữ trong controller thật.
- RED API1fail/UI4fail tái hiện trước sửa. GREEN10/10; syntax5/5; static build158modules/25outputs PASS. Scoped lint FAIL1 lỗi `safeCatalog` unused ở context line52, có nguyên trong beforecopy.
- Independent source review PASS, không finding blocking trong diff v1. 293 source records:3owned files changed,290protected unchanged;2owned tests added.
- Chỉ một actual POST import đã quan sát, xác nhận revision778. Browser Console xác nhận HTTP500. Home v3 vẫn không tồn tại; không retry. Held idempotency intent trong browser được giữ; HMR beforeunload navigation đã dismiss để không mất intent.
- BEFORE/AFTER 14,666 top-level CMS documents thuộc3,422collections khớp:0changed/0missing/0added. Đây là hash preservation, không phải full database backup hoặc subcollection audit.

Evidence root: `.local/test-outputs/home-v3-recovery-001/v1/`. `approval.json`, `routing.json`, `source-before.json`, `source-after.json`, `data-before.json`, `data-after.json`, `http-console.txt`, `import-hold.jpg`, `import-diagnostic.json`, `import-sdk-diagnostic.json`, `review.json`, `summary.json`; worker owns `worker/` tests/build evidence. Không rewrite historical CMS/Kit ledgers.

## Blocker và giới hạn

Importer `cms-api/site-v3-drafts.mjs:48` ghi raw `baselineContent` có trực tiếp array-in-array trong Hero/section heading lines. Firestore Standard không hỗ trợ dạng này; Enterprise có hỗ trợ theo [official data types](https://firebase.google.com/docs/firestore/manage-data/data-types). Đây là source incompatibility được xác minh, và giả thuyết phù hợp với HTTP500. **Exact backend cause Unknown:** không có raw server error. Read-only simulation và SDK batch validation đều PASS nhưng không commit; không chứng minh Firestore storage acceptance.

Import/recovery và desktop/mobile populated UI vẫn mở. Fresh backend activation/new empty-state rendered proof NOT_RUN; retained browser vẫn giữ failed intent. M3/M4/LOCAL_COMPLETE và production không đổi.

## Historical v2 proposal — subsequently Approved and executed as recorded above

Mục tiêu: import revision778 thành Home v3 revision0 và kiểm chứng readback/preview, giữ toàn bộ dữ liệu cũ.

1. Xác minh persistence bằng fixture tổng hợp riêng trong namespace task trên emulator hiện có: một negative array-shape probe, tối đa một positive record, rồi chỉ xóa record mới do probe tạo; giữ evidence và dừng nếu kết quả không xác nhận giả thuyết. Không dùng dữ liệu editorial cho probe.
2. Khi probe xác nhận incompatibility, bổ sung ownership `cms-api/site-v3-drafts.mjs`; bỏ persisted raw baselineContent. Trong `site-v3-context.mjs`, decode/validate immutable `initialDraft.contentJson`, hydrate domain baseline từ initial content; giữ revision0/actor/time/event/lineage/audit và validation/equality cho historical raw baseline nếu có. Snapshot baseline không lấy từ current M2/current draft.
3. Bổ sung regression trong hai tests v1: Firestore-compatible stored shape, malformed initial draft, legacy mismatch, baseline after draft edits; scoped build/review.
4. Cho phép restart riêng retained Vite dev server trên5173 sau kiểm process/cwd/ownership, bằng guarded dev command đã có. Guard chuẩn bị configstore local theo hành vi hiện có; emulator/Auth/Storage giữ nguyên, không đổi config/guard/policy. Backend activation phải có observation mới.
5. Recheck Home v2 revision778/Home v3 absent và hashes; chỉ retry import qua API với idempotency/CAS. Commit/readback phải tạo đúng draft/import/audit/idempotency, revision0/lineage778; UI8groups/preview desktop-mobile; before/after chỉ bốn records được thêm.

v2 thay đổi representation và thêm writer file/lifecycle/probe ngoài v1. Cần direct human Approved v2 theo APPROVAL-PROTOCOL; source review không cấp quyền execution. Nếu revision đổi hoặc Home v3 đã xuất hiện, dừng phần mutation để đối chiếu.
