# P7 v3 — kết quả LOCAL ngày 17/10/2026

## Trạng thái hiện hành — đã hoàn tất theo xác nhận của Khiêm

**ĐÃ HOÀN TẤT / CLOSED_BY_HUMAN_CONFIRMATION — 17/10/2026 (Asia/Ho_Chi_Minh).** Xem [xác nhận trực tiếp, phạm vi đóng và bảng trạng thái hiện hành](../../tasks/plan.md). Khiêm xác nhận các plan đã xong và giao chỉ đồng bộ tài liệu, không sửa code hoặc chạy lại kiểm thử. Ghi nhận chờ nghiệm thu P7 v3 bên dưới đã được thay bằng xác nhận hoàn tất này; không có lần chạy hoặc activation mới.

Các trạng thái chờ duyệt/chưa hoàn tất, checkbox và bước tiếp theo trong phần bên dưới thuộc lịch sử trước xác nhận đóng; không tự mở lại plan/task từ các ghi nhận đó. Giữ nguyên bằng chứng PASS/FAIL/NOT_RUN, cờ kỹ thuật và giới hạn đã ghi nhận. Lần đồng bộ này không xác minh runtime, không ghi nhận release hoặc cấp quyền thực thi mới.

## Nội dung lịch sử trước xác nhận đóng


**Trạng thái kỹ thuật: READY_FOR_USER_ACCEPTANCE. Người dùng chưa nghiệm thu P7 v3.**

Website [http://127.0.0.1:4189/](http://127.0.0.1:4189/) đang phục vụ release CMS thật `cms-mvbw7erw-27ea14c2`, `qaFixture: false`. Admin vẫn tại :5173. Luồng vận hành là **Lưu Draft → Xuất bản website**; nội dung Draft không tự đổi website.

## Kết quả có bằng chứng

| Phần | Kết quả thực tế |
| --- | --- |
| Nội dung CMS | Đọc lại 72/72 bản EN/VI/JA và đối chiếu JSON với nguồn :5010 đã khóa. Nội dung gốc đã được khôi phục sau phép thử. |
| Media | 28/28 media thật READY, gồm ảnh thương hiệu, khách hàng, dự án và video. Các tài nguyên template như favicon/font giữ pin gốc. |
| Credential | PDF công khai được đọc lại: đủ 48 trang, raster 1280px. PDF 51.955.159 byte; WebP 27.826.670 byte; tổng 79.781.829 byte, trong trần 64/64/96 MiB. |
| Website | Mỗi locale đủ 8 dự án và 6 dịch vụ. Ba HTML EN/VI/JA cuối cùng khớp hash artifact. 84 file đã được kiểm HTTP; bằng chứng 81 tài nguyên không đổi được tái sử dụng cho release cuối. |
| UI Edge | Đã mở cả 8 modal dự án EN; Wayfair EN/VI/JA giữ đúng ngữ cảnh và liên kết trang credential. Đã kiểm 6 dịch vụ, lọc/load more, menu mobile, form/clipboard và cảnh báo bỏ brief. |
| Video | Video derivative CMS phát thật: duration 65,344 giây, readyState 4, không có media error. Biểu tượng Play hiển thị. |
| Responsive | Các phép đo sau khi CSS tải xong tại 320/390/768/1440px không có tràn ngang. Modal JA 320px có clientWidth = scrollWidth = 284px. Menu desktop lệch tâm 0px. |
| Draft/Publish | Draft EN tạm không đổi website A. Publish B tạo đúng 1 snapshot Liên hệ EN, giữ 71 snapshot khác, và câu mới xuất hiện trên website. |
| Rollback | UI rollback trả đúng artifact A, releaseId/snapshotSetHash và SHA-256 toàn bộ HTML qua HTTP. Draft vẫn giữ câu thử. Sau đó Draft đã được khôi phục nguyên văn và Publish C thành công. |
| Lịch sử | Snapshot Wayfair EN v4 trước seed được đọc lại và so sánh nguyên dữ liệu với before-image: không đổi. Lịch sử job PDF cũ được giữ. |
| Runtime | Dừng riêng Admin: :4189 vẫn trả đúng HTML C. Khởi động lại riêng host :4189: pointer và SHA giữ nguyên. Admin đã được khôi phục. |
| Ranh giới | Private paths trả 404, POST ở :4189 trả 405, anonymous CMS trả 401. :5010 vẫn PID 15465 và hash gốc; không activation, cloud hay Git delivery. |
| Backup gốc | 43 mục SHA-256 khớp; file/thư mục vẫn chỉ đọc. Archive SHA `c716955e11c9d9549361adc00757d6cf09e86ecab408061d6b8b3c1f99582584`. |

## Các sửa tích hợp đã hoàn tất

- Dùng runtime PDF riêng và các binding bất biến đến LOCAL-5; giữ nguyên locks/lịch sử cũ. Sửa race khi quan sát file raster tạm và chỉ loại bỏ mảng annotation rỗng do pdf-lib tự tạo trên trang raster mới.
- Chuẩn hóa khoảng trắng nhãn kinh nghiệm vào trường một dòng; kiểm full Home trước seed và giữ payload/key thất bại cũ.
- Chuẩn hóa danh sách ID media tại context Group/Project. Contract PDF download cho phép đúng derivative đã xác thực trong trần 64 MiB; ảnh/legacy giữ giới hạn cũ. Renderer Work dùng cùng contract thay điều kiện URL :5010 cũ.
- Đóng gói media dùng chung một lần; locale-relative assets chỉ ánh xạ tới file có trong manifest. Không tăng trần release 256 MiB.
- Chuyển neo `top` từ header sticky sang body. UI thật đã xác nhận bấm về đầu trang trả `scrollY = 0`.
- Rollback khôi phục cả metadata release và snapshot set, cùng artifact.

Build Admin và lint phần ảnh hưởng đã qua. Các nhóm regression tập trung đã qua: release preparation/export (6), media contexts (9), Work/Services renderer (7), full-site renderer (6). Không chạy lại historical harness hoặc full suite theo thói quen. Kết luận runtime dựa trên dữ liệu/UI/HTTP nêu trên.

## Bằng chứng local

- [Kết quả cuối](../.local/test-outputs/p7-v3-final/current-outcome.json)
- [Đọc lại CMS cuối](../.local/test-outputs/p7-v3-final/cms-final-readback.json)
- [Draft → Publish → rollback → khôi phục](../.local/test-outputs/p7-v3-final/lifecycle.json)
- [HTTP và chặn truy cập](../.local/test-outputs/p7-v3-final/http-release.json)
- [Quan sát UI](../.local/test-outputs/p7-v3-final/ui-observations.json)
- [Runtime độc lập và restart](../.local/test-outputs/p7-v3-final/runtime-continuity.json)
- [Desktop EN](../.local/test-outputs/p7-v3-final/final-desktop-en.png), [mobile JA](../.local/test-outputs/p7-v3-final/final-mobile-ja.png)

Không còn blocker kỹ thuật được quan sát trong các luồng đã kiểm. EN/JA được agent triển khai rà theo nguồn; chưa có rà độc lập bởi người bản ngữ. PDF 1280px là mức chất lượng đã được duyệt. Đây là nghiệm thu local/noindex ở :4189; chưa phải cloud/Production hoặc activation :5010.

Bước tiếp theo: người dùng xem bản :4189 và xác nhận nghiệm thu P7 v3; không có quyền activation mới từ báo cáo này.
