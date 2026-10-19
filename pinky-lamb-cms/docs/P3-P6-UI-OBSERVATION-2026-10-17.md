# Kết quả kiểm UI P3–P6 thực tế — 17/10/2026

Kiểm trực tiếp trên tab Edge có phiên OWNER do Khiêm đăng nhập, tại
`http://127.0.0.1:5173/login`. Một agent. Không dùng kết quả unit tests làm
bằng chứng UI; không chạy harness, tests hoặc build trong lượt kiểm này.

## Đã quan sát

- Project list có 8 đối tượng. Wayfair mở được dữ liệu EN/VI/JA; `lang` của
  control đổi đúng locale, nội dung ba ngôn ngữ khác nhau.
- Nhập tạm vào tên Project EN rồi chuyển VI mở dirty dialog. “Ở lại” giữ bản
  nhập; “Bỏ thay đổi và chuyển” bỏ bản nhập. Mở lại EN và màn P5 đều còn tên
  gốc, không có chuỗi nhập tạm. Không bấm Lưu.
- Shared Project và Shared Service mở được form Thêm; đóng bằng Hủy, không
  Áp dụng. Shared list giữ 8 Projects/6 Services.
- Shared Contact mở được email, người liên hệ, điện thoại, địa chỉ, Facebook;
  controls không disabled/readonly. Nút chọn ảnh tồn tại.
- Service Brand & Creative EN mở được dữ liệu đã lưu; VI chưa có draft được
  hiển thị trống và không tự sao chép EN.
- Header/Hero/SEO, Clients, About, IP, Contact, Footer và nội dung mục Services
  mở được editor. Nhiều nhóm báo chưa có bản dịch; không coi đó là code lỗi.
- Hero VI có form và ảnh/bố cục saved preview thực sự render. Đây chưa phải
  bằng chứng cho hành vi thay nguồn rồi save/rebase.
- P5 hàng đợi tải được. Filter Ngôn ngữ/Loại nội dung và textbox Ghi chú gửi
  duyệt có `labels` liên kết đúng trên DOM thật. Mở được bản Project đã lưu.
- P5 Đã duyệt, ở mọi loại/ngôn ngữ, trả empty state. Không tạo snapshot để
  lấp dữ liệu kiểm và không thao tác duyệt.
- Mobile 390×844: P5 document width 390; Project dialog clientWidth/scrollWidth
  đều 390, phủ đúng viewport. Nút Bản đã lưu mở được card Project có ảnh.
  Đã trả viewport về kích thước cũ, đóng mọi dialog, giữ phiên đăng nhập.

## Hai lỗi UI được xác nhận

1. **P2 — Service thiếu bản dịch báo sai về nguồn.** Brand & Creative VI có
   scope trống và hiển thị “Nguồn chưa có phạm vi công việc. Không tự thêm dữ
   kiện.” Nhưng shared list ghi 3 hạng mục và dialog Nội dung gốc hiển thị
   Ý tưởng & concept / Nhân vật thương hiệu / Key visual. UI đang dùng độ dài
   scope của bản dịch để kết luận về nguồn.
   Source liên quan: `admin/service-localization-editor.mjs`, điều kiện
   `key==='scope'&&!s.working.scope.length`.
2. **P2 — P5 hiển thị field kỹ thuật cho người biên tập.** Màn bản Project
   đã lưu, trên desktop và mobile, hiện `title`, `eyebrow`, `summary`,
   `imageAlts`, `cover`, `gallery:wayfair-team-2026` thay vì nhãn nghiệp vụ.
   Source liên quan: `admin/localization-review-editor.mjs`, hàm `typed`.

## Blocker và phần chưa được chứng minh

- Nút Xem trước mở dialog toàn site nhưng kết quả là “Không tìm thấy nội dung”.
  Các nhóm thiếu bản dịch đã được quan sát riêng. Chưa xác định đây chỉ là
  thiếu nội dung hay còn lỗi tích hợp; không tự import/seed để vượt blocker.
- Save/readback mới, source drift do sửa Contact/Footer, rebase, submit/review
  và nhãn trong form review snapshot chưa được kiểm bằng mutation thực tế.
- P6 selected import/recovery/source-pin concurrency trên retained runtime:
  NOT_RUN, giữ đúng lệnh không import. Không suy từ tests xanh thành PASS.
- Không bấm Lưu, Áp dụng, Gửi bản chụp, Duyệt; không đổi account/role, không
  logout, không đọc/copy token, không import hoặc activation :5010, không P7.

## Ảnh bằng chứng

Các ảnh chụp UI thực trong lượt này, tại `/private/tmp/`:

- `pinky-p3-project-live-2026-10-17.jpg`
- `pinky-p3-shared-project-create-2026-10-17.jpg`
- `pinky-p3-service-missing-vi-2026-10-17.jpg`
- `pinky-p3-service-source-contradiction-2026-10-17.jpg`
- `pinky-p3-project-mobile-2026-10-17.jpg`
- `pinky-p4-shared-contact-live-2026-10-17.jpg`
- `pinky-p4-hero-live-2026-10-17.jpg`
- `pinky-p4-full-preview-not-found-2026-10-17.jpg`
- `pinky-p5-project-submit-view-2026-10-17.jpg`
- `pinky-p5-mobile-live-2026-10-17.jpg`

Kết luận: đã có bằng chứng UI chạy thật cho các thao tác đọc/biên tập không lưu
nêu trên; chưa đủ điều kiện chốt toàn bộ P3–P6 đạt. Lượt này không sửa source.

## Cập nhật sau sửa hai lỗi UI — 17/10/2026

Phạm vi được người dùng duyệt: một agent sửa cả hai lỗi rồi kiểm UI thật một
đợt cuối; không P7, không import dữ liệu, không activation :5010.

- Đã sửa `service-localization-editor.mjs`: cảnh báo thiếu phạm vi dựa vào
  `record.base.service.scope`, không dựa vào ô bản dịch trống. Quan sát Brand &
  Creative VI trên 1440×900 và 390×844: ô phạm vi vẫn trống, cảnh báo sai không
  còn; hộp đối chiếu nguồn có 3 mục Ý tưởng & concept / Nhân vật thương hiệu /
  Key visual. Không nhập hay lưu nội dung.
- Đã thay renderer nội dung trong `localization-review-editor.mjs` bằng
  `localized-review-content.mjs`: nhãn biên tập tiếng Việt, thư viện ảnh đánh
  số theo ảnh nguồn, giữ nguyên các giá trị và định dạng rich text. Phần
  metadata kỹ thuật vẫn nằm trong disclosure riêng.
- Quan sát Wayfair EN đã lưu ở màn Gửi và duyệt: Tiêu đề, Nhãn đầu mục, Mô tả
  tóm tắt, Phạm vi công việc, Mô tả ảnh, Ảnh bìa, Ảnh thư viện 1/2. Desktop
  1440×900 và mobile 390×844 hiển thị đúng; mobile khối nội dung rộng 358px,
  không overflow và không cắt nhãn. Hero VI đã lưu còn 4 đoạn đậm/màu nhấn;
  console error được thu thập: 0. Đã trả viewport về mặc định.
- ESLint 3 file source sửa/thêm và `git diff --check` phần liên quan: PASS.
  Không chạy full suite/build/harness. Không tạo snapshot, gửi duyệt hay duyệt.
- Bằng chứng UI: `/private/tmp/pinky-service-scope-fixed-desktop-2026-10-17.jpg`,
  `/private/tmp/pinky-service-scope-fixed-mobile-2026-10-17.jpg`,
  `/private/tmp/pinky-review-labels-fixed-desktop-2026-10-17.jpg`,
  `/private/tmp/pinky-review-labels-fixed-mobile-2026-10-17.jpg`.

Giới hạn: kết quả xác nhận hai lỗi hiển thị trên các màn nêu trên; không phải
nghiệm thu toàn P3–P6. Nhánh nguồn thực sự rỗng chưa quan sát trên dữ liệu hiện
có; luồng ghi, snapshot đã gửi và các blocker tích hợp cũ chưa được kiểm lại.
