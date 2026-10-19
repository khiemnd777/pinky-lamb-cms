# M3 — Boundary và DoD bàn giao code

**ID:** M3-BOUNDARY-DOD-CHECKLIST-01 v1. **Ngày:** 14/10/2026, Asia/Ho_Chi_Minh.

**Quyền:** Khiêm trực tiếp yêu cầu trong chat `01a13866-fa1c-7c23-b30d-67516d60fc22`:

> Hợp nhất boundary và DoD M3 hiện hành thành một checklist duy nhất, gửi cho cả hai Coordinator áp dụng. Chỉ hoàn thành code và tích hợp đúng checklist, không mở rộng scope hay chạy thêm tests; tôi tự kiểm thử.

Đây là checklist duy nhất để hai Coordinator đối chiếu **bàn giao code M3 hiện hành**. Không phải proposal chờ duyệt, kế hoạch kiểm thử hoặc quyền mở rộng sản phẩm. Tài liệu này hợp nhất phạm vi sản phẩm đã duyệt, quyết định bỏ workflow rights riêng và chỉ thị FAST-CODE-HANDOFF. Proposal/AC/register cũ được giữ làm lịch sử; các test gates và media-rights workflow cũ không được dùng để mở lại công việc đã dừng.

## Boundary

**Đích M3:** code media local được tích hợp xuyên suốt từ upload → xử lý → lưu/READY → thư viện → chọn trong editor → saved draft/Snapshot/private preview → export QA offline chưa publish.

Trong M3:

- Upload được xác thực, private quarantine, validation/xử lý ảnh JPEG/PNG/static WebP, PDF tối đa 48 trang, video MP4 H.264/AAC; originals và derivatives bất biến, quota/jobs/cancel/retry/recovery theo quy tắc đã chốt.
- Thư viện media có phân trang/filter/trạng thái kỹ thuật, đọc derivative có phân quyền, archive mềm và chọn media đúng slot của editor toàn site.
- Nội dung `home-v3`, import rõ ràng từ CURRENT `home-v2`, Save/revision conflict, immutable Snapshot/review/source checks hiện có, private full-site preview đúng revision. Giữ M1/M2 và lịch sử cũ.
- Export QA offline với safe derivatives và public projection; output QA riêng, không release/publication hoặc đổi current pointer.
- Metadata media theo phương án A đã chốt: `name`, server-owned `uploaderUid`; bỏ workflow duyệt rights riêng và declaration/sourceRefs của media. Factual source checks/editorial review của nội dung M2 vẫn giữ.
- Local/demo `demo-pinky-lamb-cms`, loopback; giữ file validation, Auth/ACL, privacy và sandbox trong application code.

Ngoài M3:

- **M4:** publication/current pointer, releases/version history/rollback, full backup/restore và nghiệm thu toàn CMS.
- Production/cloud/deploy; Firebase thật/login/ADC/Blaze/billing/IAM; Git delivery, global config/plugin/sandbox changes và destructive data/process operations.
- Membership administration/owner override; theme/variant hoặc arbitrary HTML/CSS/SVG/font upload mới; remote URL import/artwork generation; lead/email/payment/blog/portal/analytics/AI.
- Tests/diagnostics/build/lint/runtime experiments và mọi harness/supervisor/controller, Python version/map/provider, golden/admission/evidence-publication infrastructure chỉ phục vụ mở kiểm thử. Không chạy lại hoặc tiếp tục xây các phần này.

## Checklist DoD hiện hành

Mỗi ô chỉ được đánh dấu khi **source đã viết và được nối vào consumer/entry thực tế**, có owner xác nhận và brief source/diff review. Giao task, viết module standalone, để source trong staged workspace chưa được canonical entry dùng, hoặc giữ placeholder không hoàn tất một ô. Không cần execution/test receipt, hash ceremony, independent review chain hoặc gate mới để đánh dấu code.

Các ô khởi tạo chưa đánh dấu để không giả kết quả. Chat phát hành giữ sole-writer của checklist; Coordinator ghi kết quả theo ID trong status/handoff của mình, không tạo checklist cạnh tranh hoặc sửa chồng file này. Việc cập nhật ô không là gate trước code.

- [x] **M3-D01 — Contracts và tương thích.** Canonical metadata/media/upload/job/draft/Snapshot contracts hiện hành do C0 sở hữu; consumers dùng actual exports và cùng shape. Giữ đọc/compatibility dữ liệu M1/M2, import v2→v3 rõ ràng, không migration/reset thực tế hoặc workflow rights riêng. **Owner: C1/C0.**
- [x] **M3-D02 — Upload/API/Storage.** Routes, authorization, service và Storage adapter đã nối để nhận upload hợp lệ, quarantine private, chunk/hash/size/quota/idempotency/conflict/cancel đúng quy tắc hiện hành. Không fake upload hoặc SDK bypass. **Owner: C1/Upload.**
- [x] **M3-D03 — Processors ảnh/PDF/video.** Ba processors có validation/decode/re-encode, output/recipe/hash và cancellation/error handling; actual worker gọi chúng, không chỉ có definition. Giữ từ chối tool bytes không hợp lệ. **Owner: C2/MEDIA.**
- [x] **M3-D04 — Jobs/worker/READY/cache/recovery.** Job claim/lease và quota/global slot xảy ra trước native processing trong code; output ghi actual Storage generations/cache bytes; chỉ commit technical READY khi đủ dữ liệu hợp lệ. Retry/recovery không giả quiescence, release hoặc thành công. Worker có actual enqueue/start consumer. **Owner: C1/Upload + C2/worker/cache/recovery, một writer mỗi file.**
- [x] **M3-D05 — Library và private reads.** Library/list/filter/cursor/archive/read routes dùng persisted media records và generation-bound derivatives; Auth/ACL và safe DTO không lộ originals, actor/private paths/metadata. Malformed v2 không fallback giả thành công. **Owner: C2/library/reads; C1/Upload nối common routes/Auth.**
- [x] **M3-D06 — Media UI và picker.** Canonical admin entry mount actual library/upload/picker/preview modules; file chọn được đưa vào đúng slot ảnh, credential PDF hoặc reel video của editor, có trạng thái/error/cancel trong UI. Không chỉ sửa candidate chưa được dùng. **Owner: C2/media UI + C1/editor integration; giữ owner common entry đã thống nhất.**
- [x] **M3-D07 — Draft/Snapshot/review.** Home-v3 services và API/UI dùng actual contracts cho Save/revision conflict, immutable Snapshot/media manifest, source/editorial review hiện có, selected và hidden media refs. Không chỉ bàn giao schemas chưa có caller. **Owner: C1/C0/integration.**
- [x] **M3-D08 — Private full-site preview.** Saved draft/Snapshot preview tải safe image/PDF/video đúng revision qua authenticated reads; public projection/sandbox không chứa token/original/private metadata. Logout/deactivate/revision-switch/unmount/late async có clear/revoke/abort trong code. **Owner: C1/site preview + C2/media reads/UI.**
- [x] **M3-D09 — Offline QA export.** M3 exporter đọc envelope và safe derivative cache đúng manifest, tạo full-site QA artifact riêng, không originals/private JSON/UID/paths/tokens. Guard/package/API/UI entry thực sự dispatch M3 exporter; legacy export M1/M2 hoặc mode luôn refuse không thay thế. Không publish/current pointer/history/rollback. **Owner: C1/export/integration.**
- [x] **M3-D10 — Local entry và startup instructions.** Actual package/guard/API/admin/worker entry nối các module trên; không thiếu import/route/mount hoặc placeholder cho đường bắt buộc. Runbook có exact configured URL/ports, prerequisites và commands để Khiêm tự khởi động, phân biệt canonical CMS với recovery UI. URL availability/startup chưa chạy phải ghi Unknown, không probe/launch để chứng minh. **Owner: C1/common integration, C2 cung cấp worker/UI interface và yêu cầu khởi động.**
- [x] **M3-D11 — Review nguồn ngắn.** Hai Coordinator rà phần code của mình về imports/callers/shapes/ownership, validation/Auth/privacy, known source defects và preservation M1/M2. Sửa lỗi source bắt buộc trong scope; không full audit, test gate hoặc reviewer chain mới. **Owner: C1 và C2 độc lập.**
- [x] **M3-D12 — Báo cáo và bàn giao cho người dùng.** Một báo cáo tổng theo D01–D12: code/files/integration đã hoàn thành; remaining source blockers nếu có; URL local từ config, startup prerequisites/commands và manual steps upload → library → editor → Save/Snapshot → private preview/logout → QA export, kèm file-invalid/denied/error cases để Khiêm tự làm. Tests/build/lint/diagnostics/runtime dưới mandate này đều NOT_RUN. Ghi tool drift/retained process/availability limits riêng, không lộ secrets. **Owner: C1 tổng hợp; C2 gửi handoff thông tin, không xin C1 duyệt.**

## Quy tắc kết thúc và điều phối

- Chỉ thị tiếp theo của Khiêm ngày 14/10/2026: khép ngay mismatch contract–worker và wiring UI còn lại theo D01–D12, không thêm gate/tests. Chỉ thông báo người dùng khi code và tích hợp đã xong, kèm URL local và hướng dẫn tự kiểm thử; không gửi routine/progress reports. Các owner vẫn trao đổi concrete interfaces nội bộ để hoàn thành code.
- Chỉ khi D01–D12 đạt ở mức code/integration và báo cáo được giao mới dùng **CODE_COMPLETE_UNTESTED / READY_FOR_USER_TEST**. Thiếu source, caller, route, UI hoặc exporter bắt buộc phải ghi chưa hoàn tất; không biến thiếu chức năng thành limitation để đóng ô.
- Tool/runtime/environment chưa được chạy có thể ghi prerequisite/Unknown trong bàn giao khi source đầy đủ. Không sửa/rebaseline native tools, kill/restart retained processes hoặc chạy diagnostics để che giới hạn. Nếu thiếu code xử lý/prerequisite/start entry cần thiết, ô liên quan vẫn chưa hoàn tất.
- Khiêm tự khởi động, kiểm thử và quyết định Accepted M3. Không tự ghi runtime PASS, milestone Accepted/CLOSED, LOCAL_COMPLETE hoặc nghiệm thu toàn CMS. M3 code completion không mở M4.
- C0 là một owner canonical contract; consumers đọc shared source/current interface, trả concrete mismatch trực tiếp cho owner hoặc qua một relay nếu messaging bị runtime từ chối. Không joint ratification/golden/cross-chat ACK prerequisite.
- Coordinator 2 tự quyết định media source/ownership/order. Coordinator 1 giữ common integration và báo cáo tổng. Chỉ giải quyết actual file/interface conflict; không chờ ratification/ledger/test slots hoặc proposal mới cho routine code/repair trong checklist.
- Không thêm capability, constraints, tooling, dependency, variant hoặc nhiệm vụ mới dưới danh nghĩa DoD. Yêu cầu ngoài boundary phải trình riêng; các phần đã được giao tiếp tục độc lập.

## Nguồn và supersession

- [Phạm vi và 18 AC gốc M3](../../../pinky-lamb-cms/docs/CMS-001-v2-M3-PROPOSAL.md): dùng để giữ product boundary, không chạy lại technical test gates hoặc rights workflow đã bị thay.
- [M3/M4 plan](../../../tasks/plan.md), [task plan M3](../../../pinky-lamb-cms/tasks/M3-plan.md): giữ lịch sử, không tự mở M4.
- [Quyết định bỏ rights](../../../pinky-lamb-cms/docs/M3-RIGHTS-WORKFLOW-REMOVAL-01.md): bỏ media-rights workflow, không bỏ factual/editorial checks hiện có.
- [FAST-CODE Coordinator 1](M3-FAST-CODE-HANDOFF-01-COORDINATOR-1.md), [FAST-CODE Coordinator 2](M3-FAST-CODE-HANDOFF-01-COORDINATOR-2.md): authority/ownership hiện hành; boundary và DoD bàn giao được hợp nhất tại file này.
- Chỉ thị trực tiếp hiện tại ở đầu file có ưu tiên nếu wording lịch sử yêu cầu agents chạy tests/runner/golden trước giao code. Không rewrite frozen proposals, approval receipts hoặc historical evidence.

## Bàn giao code ngày 14/10/2026

D01–D12 được đối chiếu với handoff hoàn tất của hai Coordinator và actual source/callers liên quan. Báo cáo tổng: [M3-CODE-HANDOFF-01](../../../pinky-lamb-cms/docs/M3-CODE-HANDOFF-01.md); hướng dẫn tự kiểm thử: [M3-PARALLEL-QA-01-RUNBOOK](../../../pinky-lamb-cms/docs/M3-PARALLEL-QA-01-RUNBOOK.md).

**CODE_COMPLETE_UNTESTED / READY_FOR_USER_TEST.** Các ô xác nhận source và integration, không xác nhận runtime. Tests/build/lint/diagnostics/runtime đều NOT_RUN dưới chỉ thị FAST. URL availability, native-tool compatibility và retained process closure vẫn Unknown; tool drift không được rebaseline. Khiêm tự khởi động, kiểm thử và nghiệm thu; không Accepted M3/CLOSED, LOCAL_COMPLETE hoặc M4.
