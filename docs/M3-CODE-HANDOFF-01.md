# M3 — Bàn giao code và tích hợp local

**Trạng thái bàn giao: CODE_COMPLETE_UNTESTED / READY_FOR_USER_TEST.** Code và integration trong D01–D12 đã hoàn tất ở mức source. Không còn source/caller blocker được các owner ghi nhận.

Phạm vi và tiêu chí duy nhất: [M3-BOUNDARY-DOD-CHECKLIST-01](../../docs/agent-kit/ad-hoc/M3-BOUNDARY-DOD-CHECKLIST-01.md). Bản bàn giao này tổng hợp kết quả theo các ID của checklist; không tạo DoD mới.

Khiêm tự khởi động, kiểm thử và nghiệm thu. Tests, build, lint, diagnostics, HTTP/SDK/native/emulator/browser dưới chỉ thị FAST đều **NOT_RUN**. Không có runtime PASS, Accepted M3 hoặc LOCAL_COMPLETE.

## Kết quả theo checklist hiện hành

| ID | Kết quả code/integration |
|---|---|
| D01 | Metadata/Core/Authority/Records/PROGRAM v2 và upload/job contracts đã nối actual consumers. Authority và worker dùng cùng processingProgram; dữ liệu M1/M2 không bị reinterpret/migrate. |
| D02 | API upload/chunk/complete/cancel/retry, Storage/quarantine, quota/idempotency/conflict và authorization đã nối. |
| D03 | IMAGE/PDF/VIDEO producers/runtime được actual worker gọi; validation/decode/re-encode/hash và tool-byte refusal giữ trong code. |
| D04 | Claim/lease/quota trước xử lý, Storage generations/cache/index, technical READY, bounded queue pump và recovery đã nối; không fake quiescence/release. |
| D05 | Library/list/filter/cursor/private reads, job revision và soft archive đã nối. Historical Snapshot giữ pinned immutable media. |
| D06 | Canonical admin mount/menu/auth đã nối upload/library/picker vào home-v3, gồm image/PDF/video và project ADD. |
| D07 | Import CURRENT home-v2 rõ ràng; home-v3 Save/CAS/Snapshot/source checks/editorial review và actual media provider đã nối. Server derive showreel duration từ selected trusted asset. |
| D08 | Saved Draft preview có authenticated revision-bound manifest endpoint; Snapshot có pinned derivative endpoint. Private preview tải visible images/posters; PDF/VIDEO tải qua parent action; clear/abort/revoke được viết. |
| D09 | Authorized APPROVED QA bundle → actual download → cache-backed safe exporter/renderer → artifact riêng. Không publication/current pointer/M4. |
| D10 | Actual guard/package/API/admin/worker/export entries đã nối; canonical configured URLs và manual prerequisites/commands được bàn giao. |
| D11 | Các owner và hai Coordinator đã review source ngắn. Mismatch PROGRAM, summary draftId, selected source refs, showreel duration, archive/history, saved preview, lazy resources và QA acquisition đã sửa. |
| D12 | Hai manual docs cùng báo cáo này đã hoàn tất; Khiêm tự chạy và ghi kết quả. |

Đây là mapping kết quả vào checklist canonical, không phải checklist mới hoặc bằng chứng chạy thành công.

## Components và files chính

- Contracts: `contracts/media-v3-metadata-v2.mjs`, `media-v3-contract-v2.mjs`, `media-v3-authority-v2.mjs`, `media-v3-records-v2.mjs`, `media-v3-toolset-v2.mjs`, `media-processing-r0-static-v2.mjs`; upload/quota/jobs theo existing domain modules.
- Integration/backend: `cms-api/routes.mjs`, `index.mjs`, `authorization.mjs`, `media-upload-service.mjs`, `media-upload-storage.mjs`; năm `site-v3-*.mjs` services, `site-v3-media-provider.mjs` và `site-v3-media-reads.mjs`.
- Media: IMAGE/PDF/VIDEO producers/runtime; `media-worker.mjs`, `media-processing-profile.mjs`, `media-cache.mjs`, `media-recovery.mjs`, `media-library.mjs`, `media-reads.mjs`, `media-archive.mjs`.
- UI: canonical `admin/index.html`/`auth.mjs`, upload/library/private previews, `site-media-editor.mjs`, `site-media-preview.mjs`, `media-slot-picker.mjs` và minimal M2 component hooks với default cũ được giữ.
- Entry/export: `scripts/local-guard.mjs`, `media-worker-local.mjs`, `export-site-media-local.mjs`, `preview/site-media-renderer.mjs`, `package.json`.

Handoff source từ C0, Upload, Coordinator 2 và QA đã nhận; Root đọc composition/consumer seams cần thiết. Không dùng thread status, test receipt hoặc ACK làm approval/acceptance sản phẩm.

Manual chi tiết và các ca invalid/denied/error: [M3-PARALLEL-QA-01-RUNBOOK](M3-PARALLEL-QA-01-RUNBOOK.md). Phần bỏ workflow media rights và các invariants còn giữ: [M3-RIGHTS-REMOVAL-QA-01](M3-RIGHTS-REMOVAL-QA-01.md).

## URL và điều kiện chạy local

- CMS canonical theo cấu hình: http://127.0.0.1:5173/.
- API đi qua proxy /api/cms tới Functions demo tại 127.0.0.1:5001.
- Hosting/assets baseline: http://127.0.0.1:5010/.
- QA artifact có base local 127.0.0.1:4173; chỉ serve thư mục artifact đã export.
- Recovery UI 5175 là workflow lịch sử riêng; không thay cho CMS M3 canonical.

Các URL trên là cấu hình source, **availability Unknown**. Chưa khởi động hoặc probe cổng. Cần runtime demo hợp lệ, Auth local/membership đã cấu hình và các cache/tool dependencies hiện có. Không dùng Firebase thật/login/ADC/billing/IAM. Không tự nhận quyền sở hữu runtime/process/data retained; không reset, reseed, import, kill hoặc đổi pins để chạy.

Từ thư mục pinky-lamb-cms:

```sh
export PATH="$PWD/.local/cache/node/node-v22.23.3-darwin-arm64/bin:$PATH"
npm run dev:local
```

Trong terminal khác, sau khi runtime demo hợp lệ sẵn có:

```sh
npm run media-worker:local
```

Generic emulators:local chỉ dành cho một runtime canonical mới, đã biết an toàn và không xung đột retained state. Không dùng lệnh này để tiếp quản hoặc dựng lại trạng thái partial/Unknown lịch sử. Hướng dẫn manual hiện hành sẽ ghi prerequisites cụ thể; không chạy seed:local.

## Luồng tự kiểm thử

1. Đăng nhập bằng tài khoản local có role và membership hợp lệ. Kiểm tra denied/deactivated role theo runbook; không dùng tài khoản cloud.
2. Upload một ảnh hợp lệ; kiểm tra trạng thái job, library, preview và cancel/retry. Lặp với PDF/video và invalid file.
3. Chọn media đúng slot trong home-v3; lưu draft và mở lại bằng **Lưu thay đổi Home v3** / **Tải lại bản đã lưu**. Kiểm tra revision conflict và media đang archive.
4. Gửi Snapshot; dùng reviewer khác tác giả để đối chiếu nguồn và review. Snapshot giữ immutable manifest dù Draft/media archive thay đổi.
5. Xem saved Draft/Snapshot trong private full-site preview. VIDEO tải khi người dùng chọn control. Logout/chuyển revision/unmount phải clear/abort/revoke Blob.
6. Với Snapshot APPROVED, chọn **Đọc QA snapshot** rồi **Tải QA bundle**. Giữ nguyên private file `qa-<snapshotId>.json`, đặt dưới `.local/` rồi export:

```sh
npm run export:media:local -- --media-envelope .local/qa-ID_SNAPSHOT.json --out .preview-output/m3/ID_SNAPSHOT
```

Thay ID_SNAPSHOT bằng đúng ID trong envelope. Output phải là thư mục mới; không ghi đè baseline, private source hoặc artifact cũ. Export QA chưa publish, không thay current pointer hoặc mở M4.

## Giới hạn đã biết

- Verifier vẫn fail-closed với tool bytes không khớp; lịch sử ghi 12 bundled PDF dylibs lệch SHA. Không repair/rebaseline/bypass tools trong chỉ thị này.
- Retained IMAGE parent và closure của VIDEO cũ chưa được chứng minh kết thúc. Không probe, signal, kill hoặc cleanup.
- Runtime/Auth fixtures, ports, Storage/cache availability và hành vi UI/native chưa được xác minh dưới chỉ thị FAST.
- Source/wiring hoàn thành không chứng minh thực thi hoặc nghiệm thu. Khiêm ghi kết quả kiểm thử và quyết định bước tiếp theo.

Nguồn authority hiện hành: FAST-CODE-HANDOFF và direct human message `01a138a1-b45d-7210-8371-422b30519717` trong chat báo cáo. Bản bàn giao không đóng M3 register, không thay historical approvals/receipts và không mở M4.

