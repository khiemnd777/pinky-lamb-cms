# CMS-UX-003 — Preview navigation delta v1

Status: **PROPOSED / AWAITING_HUMAN_DECISION**. Đây chưa phải scope đã Approved. Phần section navigation tiếp tục HOLD. Recovery v2 đã sửa container: global Xem trước mở native dialog, tái sử dụng đúng viewer/controller saved revision; ảnh mobile xác nhận revision0 và đóng được. Không đổi backend, sandbox, CSP hoặc transport. Modal container PASS không xóa FAIL tự nhảy section.

Follow-up16/10/2026 chỉ sửa form/Dịch vụ/fixture/focus; không triển khai proposal navigation này. Quyết định preview được trình riêng, không là điều kiện để hoàn tất các routine repairs đã duyệt.

## Chênh lệch đã xác minh

Mockup có **Xem mục này**, section picker và tự cuộn tới nhóm đang biên tập. `drawPreview()` gọi `scrollPreview(active)` trên DOM mô phỏng cùng trang (`mockups/toan-website-v1.html:129,159–160`).

CMS hiện có global **Xem trước**: mở toàn bản nháp đã lưu hoặc snapshot đúng revision/hash. `cms-shell.mjs:104` gọi controller gốc; `site-media-editor.mjs:181` không nhận section target. Preview thật dùng iframe `sandbox=""` và `srcdoc`; public surface tại `site-media-preview.mjs:215` chỉ có showSaved/showSnapshot/showThumbnail/clear/destroy. PRIVATE renderer chặn script và bỏ href của link. Chưa có section-navigation API hoặc bridge để tái sử dụng.

V6 xác nhận một action cluster và preview đã lưu thật. T01/D08 chưa ghi rõ disposition của thao tác nhảy section. Vì vậy không được tự ghi khác biệt này là đã được human chấp thuận, hoặc gọi toàn bộ template parity PASS. [Matrix](../.local/test-outputs/cms-ux-003/v6/evidence/acceptance-matrix.json) giữ criterion này **FAIL / capability absent**; các group/sort/source/data checks đã PASS vẫn giữ đúng giá trị của chúng.

## Phương án đề xuất

Bổ sung một slice frontend preview navigation riêng, sau khi người dùng đồng ý scope contract. Kết quả mong muốn: **Xem mục này** ở nhóm mở đúng saved revision rồi nhảy tới nhóm đó; PinkySelect trong preview đổi nhóm mà không biến nội dung chưa lưu thành bản đã lưu.

1. Chốt contract chỉ đọc: `sectionTarget` là UI state có allowlist tám nhóm, không persist vào content/snapshot và không gửi command ghi dữ liệu. Target phải ánh xạ tới section thực sự có trong đúng saved document; nhóm đang ẩn có phản hồi rõ ràng.
2. Kiểm chứng kỹ thuật riêng bằng nội dung tổng hợp trong fixture trước khi sửa CMS. Ưu tiên điều hướng fragment với document delivery hiện có nếu chứng minh được mà không đổi isolation. Không hứa rằng `srcdoc` hiện tại đã hỗ trợ cách này. Nếu cần đổi cơ chế document/transport, trình thiết kế cụ thể cùng trade-off trước implementation.
3. Chỉ sau khi thiết kế và proof được duyệt, triển khai caller/controller/preview navigation như một slice có chủ ghi rõ. Giữ nguyên quyền, saved revision/hash/manifest, queue/binary cleanup, sandbox và CSP. Không thêm script bridge hoặc nới sandbox/CSP như phương án mặc định; không sửa renderer được bảo vệ trong scope v6 hiện tại.
4. Kiểm tám target ở desktop/mobile, nhóm ẩn, snapshot, stale revision, invalid target, keyboard/focus, PinkySelect, media failure và destroy/cleanup. Mọi ghi thử vẫn ở fixture; không sửa dữ liệu giữ lại hay chạy lại emulator.

## Quyết định cần người dùng

- **Bổ sung slice preview navigation:** duyệt riêng giai đoạn thiết kế/proof trên; implementation chỉ bắt đầu khi cơ chế/contract cụ thể đã được duyệt. Đây là phương án đề xuất để hoàn thiện chênh lệch với mockup.
- **Chấp nhận chênh lệch trong bản đang review:** dùng global Xem trước toàn bản đã lưu; ghi rõ user chấp thuận ngoại lệ này, không xóa kết quả thiếu trước đó.

Điểm dừng này theo yêu cầu trực tiếp trong approval: “Nếu cần thay đổi đáng kể thiết kế, contract, quyền, dữ liệu hoặc runtime controls, dừng phần bị ảnh hưởng và trình phương án.” Các phần độc lập của tám nhóm đã được triển khai và kiểm chứng; human acceptance và LOCAL_COMPLETE vẫn chưa được đánh dấu.
