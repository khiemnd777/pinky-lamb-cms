# M3 — QA source và bàn giao kiểm thử thủ công

**Trạng thái hiện hành:** `QA SOURCE_HANDOFF_READY_FOR_USER_MANUAL_VERIFICATION`. Source flow đã nối theo C1 handoff; toàn bộ chưa được agent chạy. Khiêm tự kiểm thử theo [canonical D12](../../docs/agent-kit/ad-hoc/M3-BOUNDARY-DOD-CHECKLIST-01.md). Agent không chạy tests, build, lint, diagnostics hoặc runtime. Không claim global CODE_COMPLETE, acceptance hay LOCAL_COMPLETE.

## Source đã có và phần còn lại

Theo source reads và owner handoff: Metadata/Core/Authority/Records/PROGRAM v2 đã viết; Authority và worker dùng cùng `expectedJob.processingProgram` và `executionRecipe`. Năm home-v3 services đã có. Upload/chunk/complete/cancel/retry, job status, worker, library/private reads và upload/archive UI đã được owners bàn giao source. Export consumer, guard, launcher và package entry cũng đã viết. Đây là source attribution, không runtime PASS.

C1 xác nhận năm services/provider/common dispatch, saved-Draft preview-manifest caller, Snapshot-pinned reader và exporter/launcher đã nối. Source admin có home-v3 editor/picker/private preview và QA-download đầy đủ; C2 final source-fit là thông tin bàn giao, không gate mới. Runbook ghi main flow theo exact labels, không claim global CODE_COMPLETE hoặc runtime PASS.

## Nghiệp vụ phải giữ khi Khiêm kiểm

- Active media chỉ có metadata `name` với validation hiện hành 240 UTF-16 units, `uploaderUid` do server xác định. Không declaration, rights review/state/proof hoặc allowlist/checkbox/fakeAPPROVED thay thế.
- Technical READY, archive, MIME/size/decode/hash, complete derivatives/recipe/tool, quota/retry và Auth/ACL vẫn giữ. Factual SOURCE_CHECKED và editorial Snapshot/self-review của M1/M2 là quy trình riêng.
- Uploader và OWNER được phép thao tác COMPLETE/RETRY theo quyền hiện hành; OWNER thao tác upload của người khác phải giữ original uploader và actual operation actor riêng. EDITOR khác uploader, revoked/inactive/anonymous bị từ chối.
- Sau current Auth/version/fingerprint và historical receipt relations, valid SETTLED replay trả exact stored receipt kể cả expiry/CANCEL, không fresh state/time/CAS prerequisite. Receipt replay không reactivate intent hoặc mutate quota/current state; fresh operations vẫn kiểm state/time.
- Archive chặn new selection/use. Historical Snapshot dùng immutable manifest và current Auth; không bật global allowArchived hoặc thay lịch sử bằng current mutable state.
- Private technical DTO khác public artifact. Public preview/export không chứa private name/UID/path/token/original/internal binding; LEGACY/factual sourceRefs không bị cấm hoặc xóa chỉ vì active media bỏ rights.

## Bàn giao sử dụng

[Runbook manual](M3-PARALLEL-QA-01-RUNBOOK.md) ghi main flow upload → library Ảnh/PDF/Video → Toàn website — media/picker → Lưu thay đổi Home v3 → Snapshot/source/editorial → private preview/logout → Đọc QA snapshot → Tải QA bundle → offline export, với exact source labels/API và invalid/denied/error cases. Canonical UI `http://127.0.0.1:5173` và same-origin API `http://127.0.0.1:5173/api/cms/**`: Vite middleware gọi actual cms-api/index.handleRequest, không Functions5001 proxy/dependency. Prerequisites Auth9099/Firestore8080/Storage9199/Hosting5010, bounded local tools và current membership. Recovery5175→Functions5002 giữ historical read-only M2. Không adopt/restart/rebind retained5001, không5003/new command hoặc fake password/reset/seed. dev:local/media-worker/export commands giữ nguyên. API readiness/account/runtime/PIDs chưa được QA xác minh ở đây; actual owner observations nếu có có attribution riêng, không suy global chưa ai login. QA không probe hoặc launch.

Source GET `/api/cms/session` có deadline15s; timeout báo “Không thể kết nối API kiểm tra quyền. Vui lòng thử đăng nhập lại.”, clear session/show login và fence late private completion. Đây không deadline chung mọi API hoặc runtime PASS. QA test/fixture source hiện có được giữ nguyên, tests NOT_RUN. Không thêm primitive tests trùng C0 hoặc biến test/golden/admission thành điều kiện chặn application code. QA9/Metadata20 operators đã CANCELLED/NOT_RUN; không resume từ tài liệu cũ.

## Lịch sử

Original generic QA preparation PASS và các before archives/receipts thuộc source cũ, không chứng minh current v2/full flow. Xem [historical task record](M3-PARALLEL-QA-01.md); evidence cũ không sửa. Handoff này chỉ sửa hai QA docs, không sửa contracts/API/admin/tests/fixtures/shared checklist. Khiêm quyết định nghiệm thu và TechNote level; silence không approval.
