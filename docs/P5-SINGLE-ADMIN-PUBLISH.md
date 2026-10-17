# P5 — Một Admin, Draft → Publish

Quyết định trực tiếp của Khiêm ngày 17/10/2026:
“Bỏ cơ chế duyệt rườm rà, CMS này rất nhỏ chỉ có 1 Admin thôi, Draft -> Publish.”
Giữ giới hạn: không P7, không import dữ liệu, không activation :5010. Danh sách
thiếu chỉ được lập; chưa dịch nội dung.

## Hành vi

- Admin hiện tại là thành viên OWNER đã xác thực. UI có Bản nháp / Đã xuất bản;
  không yêu cầu người duyệt thứ hai, gửi duyệt, khai báo creative-copy hoặc
  source-attestation form trong luồng mới.
- Publish áp dụng đúng resource + locale + revision/content/dependency đã lưu.
  Nguồn stale, draft mới hơn, thiếu draft, role khác OWNER hoặc quyền bị thu
  hồi đều chặn. Factual claims mới/đổi vẫn cần source binding, không tự bịa nguồn.
- POST `/api/cms/localizations/editorial/publish` tạo snapshot nội dung cố định,
  publication proof, pointer, queue và audit trong một transaction. Idempotency
  key giữ nguyên khi kết quả chưa xác định; replay không tạo lần xuất bản thứ hai.
- Bản nháp sửa sau Publish không thay snapshot đã xuất bản. Source drift giữ
  lịch sử và yêu cầu đối chiếu/cập nhật nguồn trước lần Publish tiếp theo.
- Publish ở đây là bản xuất bản nội dung trong CMS local. Website đang phục vụ
  chỉ thay đổi qua bước activation riêng; không chạy bước đó trong task này.

## Tương thích và lịch sử

Snapshot/publication mới có marker `workflow: SINGLE_ADMIN_PUBLISH`. Schema,
trusted reader và hash kiểm marker nhất quán; không biến legacy self-review
thành hợp lệ. Luồng cũ vẫn đọc được để giữ lịch sử, không xóa/migrate records.
Các tên vật lý `cmsLocalizedReviews`, `cmsLocalizedApprovals`, status nội bộ
`APPROVED` và các pin của eligibility được giữ cho compatibility. Record mới
là publication của cùng Admin, không tuyên bố có reviewer độc lập hoặc source
attestation: source checks rỗng và không có creative declaration giả. Receipt
công khai của action mới trả `PUBLISHED`.

Quyết định này thay yêu cầu hai actor của luồng P5 hiện hành. Không thay auth,
member verification, sandbox, session hoặc nguyên tắc kiểm phiên bản/nguồn.
Không sửa source P7 hoặc activation script.

## Bằng chứng

Quyền mutation đã được Khiêm chốt: “Cho phép Publish riêng Wayfair EN v4”.
Chỉ được tạo publication/lịch sử cho bản này trong CMS local; không đổi nội
dung, không import, không activation. Quyền này không cần hỏi lại.

### Kết quả đợt kiểm cuối

- ESLint 14 file liên quan: PASS. Sáu file test được chọn theo bề mặt thay đổi:
  29/29 PASS, gồm publish cùng Admin, replay, source/draft conflict, role khác
  OWNER, membership revoke, legacy integrity, route/browser admission và UI.
  Đây là tests in-memory/contract, không phải giao dịch retained runtime.
- `git diff --check` phần liên quan: PASS. Không full suite/build/harness.
- UI thật desktop 1440×900: menu Xuất bản, hai trạng thái Bản nháp/Đã xuất bản;
  9 đã lưu/63 thiếu; Wayfair EN v4 mở đúng nội dung và có action Xuất bản enabled.
  Không còn form người duyệt/source-attestation trong luồng mới.
- Ảnh: `/private/tmp/pinky-single-admin-publish-desktop-2026-10-17.jpg`.
- Mobile sau sửa: NOT_VERIFIED. Công cụ browser timeout, kernel reset; một lần
  khôi phục đúng tab cũng timeout. Dừng nhánh browser sau cùng lỗi lặp lại,
  không sửa harness hoặc tạo browser/profile mới. Không có ảnh mobile được tạo.
  Trạng thái override viewport sau timeout: Unknown.
- Real Publish POST/readback/audit/eligibility tại retained runtime: NOT_RUN.
  Đã có quyền riêng Wayfair EN v4 nhưng chưa gửi POST từ UI. Cần xác nhận lại
  resource/locale/revision rồi thực hiện đúng thao tác đã duyệt khi UI hoạt động;
  không chạy lại toàn bộ harness.

### Đóng đường ghi cũ và thử UI native

- Các POST gửi duyệt, ghi source-checks và quyết định duyệt cũ đã bị chặn ở
  routes (`METHOD_NOT_ALLOWED`) và browser admission. GET lịch sử vẫn giữ.
  Ba file ESLint PASS; hai test file bị ảnh hưởng 6/6 PASS, có assertion trực
  tiếp rằng các đường ghi cũ không gọi service. Không chạy lại full suite.
- Native Edge bundle ID bị ambiguous; chọn đúng `/Applications/Microsoft Edge.app`
  theo hướng dẫn công cụ trả về. AX phản hồi ở cửa sổ Analytics, không phải CMS.
  Menu Window không có cửa sổ CMS. Thao tác mở Search tabs để tìm tab CMS lỗi
  ScreenCaptureKit `-3811` / Computer Use `-10005` (audio/video capture failure).
- Dừng nhánh UI tại lỗi này. Chưa tới action Publish, chưa xác nhận hộp thoại,
  chưa gửi mutation hoặc quan sát readback. Đây là blocker công cụ điều khiển UI;
  không phải bằng chứng Publish backend lỗi. Không reset browser/profile/runtime.

## Cập nhật hiện hành — Publish và đọc lại thành công

Theo chỉ đạo tiếp tục của Khiêm, một agent khôi phục kết nối UI và thực hiện
đúng Publish Wayfair EN v4. Các lỗi công cụ/NOT_RUN ở trên là lịch sử trước
lần thực hiện này.

- Tab Edge cũ `334097748` mất debugger. Mở tab CMS mới `334098004` trong cùng
  profile, giữ phiên OWNER hiện có; không tạo tài khoản/profile mới.
- Xác nhận bằng UI rằng Wayfair Tiếng Anh có bản lưu phiên bản 4. Hộp confirm
  qua CDP gặp lỗi; đọc danh sách xác nhận chưa có publication. Sau đó dùng
  native Edge để xử lý hộp xác nhận, không tự động replay thao tác ghi.
- Lần POST được xác nhận native đầu tiên trả “Không tìm thấy nội dung.” API
  nhúng trong Vite dùng Node imports đã cache. Khởi động lại riêng admin
  :5173 bằng pinned Node 22.23.3, childEnvironment/validateRuntime và network
  fence hiện hành; không sửa guard hoặc khởi động lại emulator/hosting.
  Phiên server mới: `82784`. Sandbox không cho bind loopback ở lần launch
  đầu; launch được auto-review chấp thuận rồi Vite ready tại :5173.
- Đọc lại queue Đã xuất bản từ runtime mới: rỗng. Mở lại Wayfair EN, xác nhận
  vẫn phiên bản 4 rồi Publish bằng hộp native có đúng tên/ngôn ngữ.
- **Verified UI mutation + readback:** UI hiển thị “Đã xuất bản”, “Phiên bản 4”,
  thời điểm `06:17:11 17/10/2026` (Việt Nam), snapshot
  `lp-20261016231711937-01326461-608a-4155-ade4-9a6ce3cf90f3`.
- Rời chi tiết, đọc lại queue Đã xuất bản / Dự án / Tiếng Anh: đúng một dòng
  Wayfair với cùng snapshot. Mở lại từ dòng đó: bản chỉ đọc vẫn đúng phiên bản
  4, nội dung và thời điểm trên. Đây là dữ liệu UI đọc lại từ CMS local,
  không phải suy từ tests hoặc chỉ từ nút enabled.
- Ảnh readback: `/private/tmp/wayfair-en-v4-published-readback-2026-10-17.png`.
  Giữ tab kết quả cho user. Không chạy tests/build/harness trong lượt này.

Giới hạn: chưa kiểm audit bằng truy vấn riêng, không đánh dấu toàn bộ P5 hoặc
P3–P6 hoàn tất. Chỉ publication đã duyệt được thực hiện; không sửa nội dung,
không import dữ liệu, không P7, không activation :5010. Mobile sau thay workflow
và các criteria còn thiếu khác giữ nguyên trạng thái chưa chứng minh.

Quan sát ảnh readback trước sửa: ảnh bìa trong bản xuất bản tràn khỏi card nội
dung sang khu vực cột bên phải. Lỗi này đã sửa trong lượt tiếp theo bên dưới;
Publish/readback không đồng nghĩa toàn P3–P6 đã đạt nghiệm thu UI.

### Sửa ảnh bìa P5 — kiểm UI cuối ngày 17/10/2026

Theo yêu cầu trực tiếp của Khiêm, một agent sửa CSS trong
`admin/group-localization-editor.css`: card P5 có `min-width:0`; ảnh trong card
có `display:block; max-width:100%; height:auto`. Ảnh thu nhỏ theo vùng nội dung,
giữ tỷ lệ gốc, không cắt ảnh hoặc che overflow để giấu lỗi. Không đổi JS/API/data.

Đợt kiểm UI thật cuối dùng chính snapshot Wayfair EN v4 ở trên. Tab cũ chưa nhận
CSS mới (`max-width:none`), nên reload trang một lần rồi mở lại từ queue Đã xuất
bản. Sau khi CSS mới tải (`max-width:100%`), quan sát và đo:

| Viewport | Ảnh trong vùng nội dung | Card scroll/client | Trang scroll/client | Bố cục |
| --- | --- | --- | --- | --- |
| 1440×900 | x=313…1057, rộng 744, cao 387.5 px | 792/792 | 1440/1440 | Ảnh trước cột trạng thái x=1110; không chồng |
| 390×844 | x=41…348.99, rộng 307.99, cao 160.41 px | 356/356 | 390/390 | Cột trạng thái xuống dưới card |

Ảnh thật tải thành công, tỷ lệ gốc 1.92; tỷ lệ render desktop 1.92, mobile
1.91998 do làm tròn pixel. Đã xem trực tiếp hai screenshot:
`/private/tmp/p5-cover-fixed-desktop-2026-10-17.png` và
`/private/tmp/p5-cover-fixed-mobile-2026-10-17.png`. Viewport override đã reset;
giữ tab kết quả. Scoped `git diff --check` PASS; không tests/build/harness.

Kết quả: lỗi ảnh bìa tràn khung P5 đã sửa và kiểm desktop/mobile. Chỉ đọc bản
đã xuất bản; không Publish thêm, không import, không P7/activation :5010.
Các criteria còn thiếu khác của P3–P6 giữ nguyên, chưa nghiệm thu toàn bộ.
