# Trạng thái dự án Pinky Lamb

## Trạng thái hiện hành — đã hoàn tất theo xác nhận của Khiêm

**ĐÃ HOÀN TẤT / CLOSED_BY_HUMAN_CONFIRMATION — 17/10/2026 (Asia/Ho_Chi_Minh).** Xem [xác nhận trực tiếp, phạm vi đóng và bảng trạng thái hiện hành](../tasks/plan.md). Khiêm xác nhận các plan đã xong và giao chỉ đồng bộ tài liệu, không sửa code hoặc chạy lại kiểm thử.

Các trạng thái chờ duyệt/chưa hoàn tất, checkbox và bước tiếp theo trong phần bên dưới thuộc lịch sử trước xác nhận đóng; không tự mở lại plan/task từ các ghi nhận đó. Giữ nguyên bằng chứng PASS/FAIL/NOT_RUN, cờ kỹ thuật và giới hạn đã ghi nhận. Lần đồng bộ này không xác minh runtime, không ghi nhận release hoặc cấp quyền thực thi mới.

## Nội dung lịch sử trước xác nhận đóng


Baseline lịch sử: **10/10/2026** (Asia/Ho_Chi_Minh); tài liệu v3 local cập nhật **11/10/2026**. Đây là ảnh chụp trạng thái tại thời điểm bàn giao; Codex cần kiểm tra lại môi trường local và baseline khi bắt đầu phiên tiếp theo.

## Quyền hiện tại

CMS **NOT_IMPLEMENTED**, CMS-001 v2 **AWAITING_APPROVAL**. Chỉ chuẩn bị proposal/workflow; mandate tự sửa local/preview của bản cũ hết hiệu lực. Agent inspect/read/report và kiểm approval; WAIT nếu chưa có Approved hợp lệ, resume cùng slice còn mở khi evidence/base/scope đúng. [CMS-001 v2](CMS-PROPOSAL-CMS-001-v2.md) xin duyệt M1 local/emulators; M2–M4 cần spec/tasks/Approved riêng; deployment ngoài gói. Các evidence production bên dưới là lịch sử 10/10, chưa được xác minh mới trong lượt v3 local.

## 1. Website đã được xuất bản

| Hạng mục | Trạng thái đã ghi nhận |
| --- | --- |
| Production | https://pinky-lamb.web.app |
| Firebase project ID | `pinky-lamb` |
| Firebase Hosting site | `pinky-lamb` |
| Gói Firebase | Spark, được xác nhận trong Console ở phiên triển khai trước |
| Lần triển khai thành công | Người dùng chạy Firebase CLI trên Mac ngày 10/10/2026; log xác nhận 39 file, hoàn thành upload, finalize version và release |
| Kiểm tra HTTP sau triển khai | `GET https://pinky-lamb.web.app` trả `200`, `Content-Type: text/html; charset=utf-8`, body 18.385 byte |
| Tiêu đề nhận được | `Pinky Lamb — Creative, Media & Events` |
| Snapshot mã nguồn được xuất | Commit `739fbe1752fdda64e328f4b46cecd292059b05b1` |

Bằng chứng triển khai và HTTP ở trên do phiên bàn giao ghi nhận; ảnh tài khoản và ảnh terminal có thông tin cá nhân không được đưa vào gói tài nguyên. HTTP 200 xác nhận trang chủ truy cập được, chưa chứng minh mọi tương tác hoặc layout đều đạt yêu cầu.

Thư mục checkout cũ mang tên `/workspace/sites/pinky-lamb-agency`; tên đó không phải project đích của Firebase. Không dùng project lịch sử cho runtime CMS local; chỉ `demo-pinky-lamb-cms`. Nội dung README cũ nói website chưa được xuất bản đã lỗi thời. Các trở ngại đăng nhập/Cloud Shell của môi trường trước không chứng minh rằng môi trường Codex mới bị chặn.

Gói này là bản xuất mã nguồn, không mang lịch sử `.git` hoặc thông tin đăng nhập. Nếu người dùng mở checkout Git đang dùng, ưu tiên kiểm tra trạng thái checkout và các thay đổi chưa commit trước khi áp dụng bản xuất.

## 2. Kiến trúc hiện có

Website tĩnh, một trang, dùng HTML, CSS và JavaScript thuần. Không có bước build bắt buộc, backend, Firebase SDK, Firebase Authentication, Firestore hoặc Cloud Functions trong mã được bàn giao.

| Đường dẫn | Vai trò |
| --- | --- |
| [`dist/index.html`](../dist/index.html) | Cấu trúc trang, metadata, contact, form brief, các dialog và điểm gắn nội dung động |
| [`dist/styles.css`](../dist/styles.css) | Font cục bộ, token màu, layout, responsive, focus và reduced motion |
| [`dist/content.js`](../dist/content.js) | `window.PINKY_CONTENT`: 6 dịch vụ và 8 dự án hiển thị |
| [`dist/app.js`](../dist/app.js) | Render nội dung, lọc dự án, dialog, video, menu mobile và brief mailto/copy |
| [`dist/assets/`](../dist/assets/) | 35 file ảnh, font, showreel và credential PDF dùng trên web |
| [`firebase.json`](../firebase.json) | Historical read-only Hosting baseline, giữ nguyên; không dùng làm emulator config |
| [`source-content.json`](../source-content.json) | Nguồn nội dung, trang PDF đối chiếu, ghi chú giới hạn claim; không tải vào trang web |
| [`FONT-NOTICES.txt`](../FONT-NOTICES.txt) | Thông tin giấy phép font |

`dist/` có **39 file**, tổng **30.844.037 byte**. Trong đó credential PDF là **17.349.548 byte**, MP4 là **11.403.830 byte**, phần còn lại là **2.090.659 byte**. Đây là kích thước file trên đĩa, không phải số byte tải ở lần mở trang đầu tiên. PDF được mở qua link; video khai báo `preload="none"`. Cần đo Network thực tế nếu đánh giá tốc độ.

Mở local bằng HTTP server với public root `dist`, ví dụ từ thư mục dự án:

```bash
python3 -m http.server 8080 --directory dist --bind 127.0.0.1
```

Sau đó mở `http://127.0.0.1:8080`. Dùng công cụ tương đương nếu môi trường không có Python. Không cần cài framework để chạy bản hiện tại.

## 3. Chức năng đã có trong mã

| Khu vực | Hành vi được triển khai | Bằng chứng mã |
| --- | --- | --- |
| Điều hướng | Anchor tới dự án, dịch vụ, giới thiệu, IP Studio, liên hệ; menu mobile đóng sau khi chọn link, Escape hoặc click ngoài header | `index.html`, `app.js`: `closeMenu`, media query 1021px |
| Dự án | Mặc định 4/8; mở đủ 8; bộ lọc events/film/communications | `app.js`: `state`, `pageSize`, `renderProjects` |
| Chi tiết dự án | Native `<dialog>`, nội dung, ảnh chính, gallery nếu có, scope có nguồn, link credential đúng trang | `app.js`: `openProject`; `content.js`: `sourcePage` |
| CTA trong case | Đóng dialog, chọn nhóm dịch vụ tương ứng, chuyển tới phần liên hệ | `app.js`: `case-contact`, `selectInterest` |
| Dịch vụ | 6 mục `<details>`; mục đầu mở mặc định | `app.js`: render `service-list` |
| Showreel | Hai nút mở cùng dialog; video có controls, playsinline; đóng dialog thì pause | `index.html`, `app.js`: `data-showreel`, `videoDialog` |
| Credential | PDF cục bộ, mở tab mới; case link kèm `#page=` | `index.html`, `app.js`: `credentialUrl` |
| Brief | Tên, email, công ty, dịch vụ chọn nhiều, nội dung brief; validation; soạn email hoặc sao chép | `index.html`: `brief-form`; `app.js`: `validateForm`, `briefText` |
| Hỗ trợ thao tác | Skip link, focus-visible, aria-pressed/expanded, status toast, native dialog và reduced motion | `index.html`, `styles.css`, `app.js` |

**Form hiện tại chỉ soạn email và sao chép brief.** Dữ liệu chưa được ghi vào hệ thống lead. Website tạo link `mailto:pinkylamb.co@gmail.com`; khách gửi thật bằng ứng dụng email của họ. Nếu clipboard không khả dụng, website hiện textarea để khách tự copy. Câu chữ trên giao diện hiện đã giải thích điều này.

## 4. Nội dung và tài nguyên có nguồn

Nguồn chính là [Credential 2026, 48 trang](../dist/assets/Pinky-Lamb-Credential-2026.pdf), cùng bộ nhận diện và hình gốc do người dùng cung cấp. Xem [ASSET-CATALOG](ASSET-CATALOG.md) và [DESIGN](../DESIGN.md) cho bản đồ tài nguyên và hệ thống thị giác.

| Dự án | ID | Nhóm | Trang credential | Số ảnh trong gallery nguồn |
| --- | --- | --- | --- | --- |
| Wayfair Global Selling Vietnam Summit | `wayfair` | events | 21 | 3 |
| Karaoke ULT Speakers — Sony | `sony` | film | 6 | 1 |
| Brand Awareness Strategy — Diag | `diag` | communications | 7–8; link mở trang 7 | 1 |
| VIFA EXPO 2026 | `vifa` | events | 22 | 2 |
| New Year Party — Petrosetco Distribution | `petrosetco` | events | 20 | 3 |
| Thanh Xuân Hoàng Kim — VARNA ELITE | `varna` | communications | 9 | 3 |
| Samsung Flip 2 · Teacher’s Day | `samsung` | film | 14 | 1 |
| Partner Year End Party — PSD · Dell · Microsoft | `psd` | events | 23 | 3 |

Các gallery trên bao gồm ảnh chính; dialog loại ảnh chính khỏi phần gallery phụ để tránh lặp. Wayfair, Petrosetco và PSD có `scope: []` vì trang nguồn không xác nhận chi tiết vai trò thực hiện. Giữ trạng thái này nếu chưa có nguồn bổ sung.

Claim 15+ năm là kinh nghiệm do credential tự giới thiệu, không phải năm thành lập đã được xác minh. Không suy diễn Pinkyverse hoặc một franchise IP cụ thể từ định hướng Original IP Development. Thông tin liên hệ đối chiếu credential trang 47. Các màu trong giao diện được lấy mẫu từ tài nguyên thương hiệu và điều chỉnh cho UI; không gọi đó là bảng HEX chính thức đã được khách duyệt.

## 5. Giới hạn và khoảng trống kiểm chứng

| Phân loại | Tình trạng tại bàn giao | Việc Codex cần làm |
| --- | --- | --- |
| Đã xác nhận | Release Firebase thành công và trang chủ HTTP 200 | Evidence lịch sử; không cần cloud verification để làm CMS local |
| Đã đọc mã | Các chức năng trong bảng trên tồn tại; 6 dịch vụ, 8 dự án; file nguồn có đủ đường dẫn cấu hình | Chạy và tương tác, không dùng việc đọc mã để tuyên bố QA hoàn tất |
| Kiểm tra trước release | Phiên trước đã có kiểm tra tĩnh về link/anchor/asset, logic form và một số màu | Chưa phải báo cáo kiểm thử trình duyệt đầy đủ, không suy ra chứng nhận accessibility |
| Chưa kiểm tra có hệ thống | Desktop/mobile rendering, Safari/iOS, focus/keyboard thực tế, clipboard và mail client, Network/console ở mọi luồng | Theo [QA-AND-DOD](QA-AND-DOD.md) |
| Giới hạn thiết kế đã biết | Nội dung dự án và dịch vụ được chèn bằng JS; khi tắt JS, dự án có link credential trong `noscript`, danh sách dịch vụ không được render | Ghi nhận khi audit; cân nhắc cải thiện progressive enhancement nếu có giá trị và giữ stack tĩnh |
| Điểm bảo trì | Số `08` trên bộ lọc “Tất cả” nằm trong HTML; số đếm kết quả được tính trong JS; `source-content.json` và `content.js` chưa có cơ chế đồng bộ tự động | Khi đổi danh sách dự án, cập nhật đồng bộ và kiểm tra số lượng |
| Chưa có trong baseline; scope mới đang đề xuất | CMS, dashboard admin, Auth/roles và quản trị nội dung chưa triển khai; lead/email/booking/analytics không tự nằm trong M1 | Xem CMS-001 v2; WAIT trước implementation |

Chưa có lỗi tương tác production cụ thể nào được tái hiện trong lượt soạn gói này. Mốc tiếp theo là review proposal và chờ Approved theo [IMPLEMENTATION-PLAN](IMPLEMENTATION-PLAN.md).

## LOCAL_COMPLETE và nghiệm thu

LOCAL_COMPLETE chỉ được ghi khi toàn CMS local đã đạt:

- Editor quản lý toàn bộ section và variant đã engineered/Approved; schema, nguồn claim và asset refs đúng, không arbitrary theme/code.
- Media local có quarantine, MIME/size/decode validation, derivatives, rights/provenance; original/private metadata không lọt public projection.
- Authenticated full-site preview đúng revision; logout xóa private preview/token; ACL chặn anonymous/unknown/inactive/unverified, role tamper và self-review kể cả OWNER.
- Save có revision conflict/idempotency; immutable snapshot và exact-hash review; local publication tạo full-site static artifact, history/current pointer và rollback giữ draft hiện tại.
- Unit, Rules/ACL, API integration, browser desktop/mobile và static SEO/XSS/workflow/rollback regressions có evidence thật; runbook setup/backup/restore lặp lại được; usability và limitations được báo rõ.

High technical review đạt và LOCAL_COMPLETE kỹ thuật chưa phải nghiệm thu người dùng. Ghi user local acceptance riêng bằng lời/reference thực tế; không tự điền vào ledger. M1 closed không cho phép tự implement M2–M4.
