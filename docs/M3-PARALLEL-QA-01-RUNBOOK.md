# M3 — Hướng dẫn kiểm thử thủ công

**Current:** `QA SOURCE_HANDOFF_READY_FOR_USER_MANUAL_VERIFICATION` — source đã nối theo owner handoff, chưa được agent thực hiện. Khiêm tự kiểm thử theo [canonical D12](../../docs/agent-kit/ad-hoc/M3-BOUNDARY-DOD-CHECKLIST-01.md). Tests/build/lint/diagnostics/runtime đều NOT_RUN. QA handoff này không tự xác nhận trạng thái code tổng của M3; Coordinator báo trạng thái đó riêng. Nghiệm thu và LOCAL_COMPLETE chưa được xác nhận.

## Setup đã cấu hình

Từ repository root, dùng cached Node22.23.3/npm10.9.9 và dependencies/tools local hiện có. Các commands bên dưới dành cho Khiêm, agent NOT_RUN:

```sh
cd pinky-lamb-cms
export PATH="$PWD/.local/cache/node/node-v22.23.3-darwin-arm64/bin:$PATH"
npm run dev:local
```

Ở terminal khác, cùng CMS cwd/cached PATH:

```sh
npm run media-worker:local
```

Canonical admin configured `http://127.0.0.1:5173`, project `demo-pinky-lamb-cms`; Auth9099, Functions5001, Firestore8080, Hosting5010, Storage9199. Worker entry gọi `startMediaJobPump`, không tự launch/adopt emulators hoặc reset queue. Recovery admin5175/Auth9098/Functions5002 là read-only M2, không dùng cho M3 upload.

Prerequisites: canonical local services do Khiêm quản lý, tài khoản demo có membership/role phù hợp, native tools hợp lệ. Availability/Auth/ports/process/tool compatibility hiện Unknown. `npm run emulators:local` chỉ dành cho fresh known user-managed canonical runtime; không adopt/reset/reseed/import/kill/restart unknown retained runtime. Không Firebase login, install dependencies hoặc chỉnh loader/security env để vượt lỗi. [LOCAL-RUNBOOK](LOCAL-RUNBOOK.md) giữ lịch sử runtime/recovery riêng.

## Main flow để Khiêm tự kiểm — theo labels source hiện có

Các bước này mô tả actual source UI/callers, chưa được agent chạy. Nếu bản đang dùng khác source bàn giao hoặc runtime báo lỗi, Khiêm ghi lỗi thực tế; không coi source là runtime PASS.

1. Mở canonical5173, **Đăng nhập**, chọn **Thư viện media**. Ở **Tải media lên**, chọn **Loại tài nguyên** (Ảnh/PDF/Video), **Tên tài nguyên**, **Tệp** rồi **Tải lên**. Khi uncertain request dùng **Tiếp tục gửi**; có thể **Hủy tải lên**. Bấm **Cập nhật trạng thái xử lý**; **Thử xử lý lại** chỉ theo server canRetry. Không rights declaration/review/proof.
2. Trong thư viện, dùng **Loại media** chọn Ảnh/PDF/Video, **Trạng thái**, **Tải lại thư viện**, **Trang trước/Trang sau**. Chọn tên tài nguyên để preview. **Lưu trữ** chỉ có khi server canArchive; không xóa bytes/history.
3. Chọn **Toàn website — media** để mở **Website Home v3**. Nếu chưa có Draft, OWNER chỉ chọn **Nhập Home v2 hiện tại** khi muốn import CURRENT rõ ràng; không import lại hoặc reset dữ liệu hiện có. Mở nhóm nội dung cần sửa; picker dùng **Chọn ảnh**, **Chọn PDF**, **Chọn video** (credential có **Chọn hồ sơ PDF**). Picker phân biệt **Tài nguyên LEGACY đã lưu** và **Tài nguyên READY hiện tại**, có **Lọc tài nguyên trong trang hiện tại**, **Trang trước/Trang sau**, **Đóng**. New selection phải READY/nonarchived và đúng slot; PDF page links sai phải sửa, không tự xóa. Showreel duration lấy từ selected VIDEO trusted data, không nhập số tùy ý.
4. Bấm **Lưu thay đổi Home v3**, rồi **Tải lại bản đã lưu** để đối chiếu revision. Nếu conflict, giữ thay đổi để đối chiếu, không ghi đè mù. **Xác nhận lại thao tác đang giữ** dùng cùng request khi kết quả chưa rõ. Bấm **Tạo snapshot bản đã lưu**; hoặc nhập **Mã snapshot** và **Mở snapshot**.
5. Reviewer/OWNER khác submitter dùng **Factual claim**, **Nguồn đối chiếu**, **Trang nguồn, ngăn bằng dấu phẩy** → **Ghi nhận đối chiếu nguồn**, **Đọc đối chiếu nguồn**. Editorial dùng **Khai báo nội dung sáng tạo**, **Ghi chú review**, **Chấp thuận snapshot** hoặc **Yêu cầu sửa**. Đây là factual/editorial content review được giữ, không media rights approval.
6. Snapshot mở private preview đúng immutable manifest. Chỉ visible references và fixed artwork cần tải bytes ban đầu; selected/hidden manifest vẫn được validate đầy đủ. VIDEO poster trước, parent action **Tải và xem video** mới tải actual Blob; không URL giả cho hidden media. PDF có **Xem các trang PDF**, **Trang trước/Trang sau**, **Chuẩn bị tải PDF**, **Tải PDF đã xử lý** theo source. Kiểm **Đăng xuất**/đổi selection hủy requests và dọn preview. Archived historical Snapshot dùng pinned-context authenticated route, không global allowArchived.
7. Khi Snapshot APPROVED, bấm **Đọc QA snapshot** (GET `/api/cms/media-site/snapshots/:snapshotId/qa`), rồi **Tải QA bundle**. Link tải Blob từ full authorized QA response, filename `qa-<snapshotId>.json`; session/snapshot changes clear/revoke link. Giữ private file, không public upload, sửa hoặc tự tạo JSON/proof từ summary. Copy đúng downloaded file vào `.local/qa-<snapshotId>.json` dưới CMS cwd.
8. Dùng đúng private downloaded bundle với export command bên dưới; Khiêm mở offline artifact để xem safe derivatives/public projection. Export chưa publish hoặc đổi current pointer. Đây là source instructions, runtime outcome NOT_RUN by agent.

C1 handoff xác nhận năm services/provider/common dispatch, saved-Draft preview-manifest caller và Snapshot-pinned reader đã nối; canonical editor/picker/preview/QA-download source cũng đã có. Actual source paths: admin/site-media-editor.mjs, media-slot-picker.mjs, site-media-preview.mjs, auth.mjs. Không runtime PASS từ source reads.

## Source API reference — không live URL proof

Mutations dùng current `Authorization: Bearer` header và `Idempotency-Key`; không token trong URL/log/public artifact. JSON body≤64KiB, strict fields/duplicate-key refusal. Service recheck membership/role trong transaction sau authorization middleware.

| Method / relative path | Body hoặc headers |
| --- | --- |
| POST `/api/cms/media/uploads` | `{name,requestId,kind,declaredMime,inputBytes}`; requestId bằng Idempotency-Key; actor server-owned. |
| PUT `/api/cms/media/uploads/:intentId/parts/:index` | Raw1..4MiB, index0..31; application/octet-stream, exact Content-Length, X-Part-SHA256, X-Expected-Intent-Revision, X-Part-Offset-Bytes, Idempotency-Key. |
| POST `/api/cms/media/uploads/:intentId/complete` hoặc `/cancel` | `{expectedIntentRevision}`. |
| POST `/api/cms/media/jobs/:jobId/retry` | `{expectedJobRevision}`. |
| GET `/api/cms/media/jobs/:jobId` | Job status/revision/canRetry. |
| GET `/api/cms/media` | Library kind/status/pageSize/cursor. |
| GET `/api/cms/media/:assetId` | Private safe detail. |
| GET `/api/cms/media/:assetId/derivatives/:logicalKey` | Authenticated derivative bytes. |

GET reads đã source-dispatch qua `handleMediaReadRequest`. C1 source handoff xác nhận Snapshot-pinned reader dispatch đã nối; GET `/api/cms/media-site/snapshots/:snapshotId/media/:assetId/derivatives/:logicalKey` dùng immutable Snapshot context và current Auth. Đây không live/runtime proof.

## Bảy ca manual cần kiểm

1. **Auth:** Positive uploader và OWNER COMPLETE/RETRY cho uploader khác; giữ original uploader và actual actor riêng. EDITOR khác uploader, revoked/inactive/anonymous phải bị từ chối. Recheck current Auth trước upload/private reads.
2. **Ảnh hợp lệ, không rights gate:** JPEG/PNG/static WebP, input≤10MiB, mỗi cạnh≤8192px,≤40.000.000pixels, nonanimated/singlepage. Upload→process→READY→library/private preview. Expected đủ3 WebP targetWidth320/960/1920, không upscale, tổng≤12MiB; tiny vẫn giữ3 buckets dù effective width trùng. Không declaration/review/proof/checkbox/fakeAPPROVED.
3. **File lỗi:** Ảnh JPEG/PNG/static WebP input≤10MiB/8192px/40MP; PDF input≤25MiB/48trang; VIDEO MP4 input≤128MiB/duration≤300s. Sai MIME/magic, quá các limits, malformed/decode hoặc integrity lỗi phải từ chối rõ ràng; không falseREADY/partial complete/original fallback.
4. **Name/history/archive:** Name giữ Unicode/whitespace, cap240; client không đổi uploader. LEGACY/M1M2 history/sourceRefs giữ nguyên. Archive chặn new use nhưng historical Snapshot đọc immutable manifest dưới current Auth, không global allowArchived.
5. **Privacy/lifecycle:** Private URL cần quyền hiện hành; logout/deactivate/selection/late async không phục hồi private preview. Public artifact không lộ private name/UID/path/token/original/internal binding. Private authorized QA/ReadyDetail khác public output.
6. **Expiry/CANCEL/settled replay:** Sau current Auth/version/fingerprint/historical receipt relations, valid SETTLED replay trả exact stored receipt dù current expiry/CANCEL, không fresh state/time/CAS prerequisite. Không reactivate intent hoặc mutate quota/current state. Fresh operations vẫn validate state/time; không reset/reseed để né conflict.
7. **Content/editorial/offline QA:** Chọn đúng slot → Save/revision conflict → Snapshot/source checks/editorial/self-review → private full-site preview/logout → offline QA. Factual SOURCE_CHECKED/editorial rules giữ riêng. Khiêm ghi lỗi thực tế nếu flow không đạt; không thay runtime failure bằng source PASS.

## Offline QA và phần còn lại

Export consumer/guard/launcher/package và backend QA producer/UI-download source đã nối. Sau khi tải `qa-<snapshotId>.json` và copy nguyên file vào `.local/`, dùng command template sau, thay snapshot ID thực:

```text
npm run export:media:local -- --media-envelope .local/qa-<snapshotId>.json --out .preview-output/m3/<snapshotId>
```

Thay placeholders bằng private producer file và snapshot ID hợp lệ; không tự dựng envelope/proof. Portable input consumer là `{qaEnvelopeVersion:3,contractRevision:2,qa,validationContext}` với DATA không callbacks. Output riêng safe derivatives/public projection, không originals/private JSON/token, không publication/current pointer.

C1 báo services/provider/common dispatch/Snapshot-pinned reader/export và saved preview caller đã nối; source QA-download hiện có full authorized response, không summary-only pending. C2 source-fit handoff là thông tin, không gate mới. Lazy visible PDF/VIDEO tải khi parent click; hidden refs vẫn validate nhưng hidden bytes không bị tải trước. Không hứa working PDF/VIDEO/native hoặc full CMS chỉ từ source. Khiêm ghi kết quả/lỗi và quyết định nghiệm thu; agent không chạy flow thay người dùng.

**Historical:** [Original QA task](M3-PARALLEL-QA-01.md) và old receipts/before archives giữ nguyên attribution; prior9PASS không current v2 proof. QA9/Metadata20 CANCELLED/NOT_RUN, không test/golden/admission infrastructure mới. Local/demo only; không M4/production/Git/global/destructive actions.
