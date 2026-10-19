# MULTILINGUAL-001 — D3/D4/D5 design review v1

**PROPOSED / HUMAN_APPROVAL_PENDING** · 16/10/2026. [Interactive HTML](multilingual-p3-p5-design-v1.html), [P3 Project implementation bundle](../pinky-lamb-cms/docs/MULTILINGUAL-001-P3-REP-v1.md), [P7 template identity/mapping](../pinky-lamb-cms/docs/MULTILINGUAL-001-P7-TEMPLATE-v1.md). Một canonical task record: [MULTILINGUAL-001 v2](../pinky-lamb-cms/tasks/MULTILINGUAL-001-v2.md).

Mở `http://127.0.0.1:4187/mockups/multilingual-p3-p5-design-v1.html`. Server chỉ phục vụ bản sao public của mockup/template/fonts/assets; không phục vụ repository, backups hoặc CMS. Không cần đăng nhập. Mọi save/decision chỉ ở bộ nhớ của trang. Refresh/Đặt lại mô phỏng khôi phục dữ liệu minh họa; không phải đọc hoặc ghi Firestore.

## Các view trình duyệt

| View | Thao tác chính | Nội dung cần duyệt |
| --- | --- | --- |
| D3-PROJECT | D3 · Dự án → ô EN/VI/JA của Wayfair/Sony → edit/source/saved/detail | Entity trước, locale sau; native wide dialog; một save; giữ Project card và case composition của website |
| D3-SERVICE | D3 · Dịch vụ → bản ngôn ngữ; tab Nội dung mục | Một title chính theo locale, subtitle cho dòng phụ template, summary/scope; section Work/Services có bản dịch riêng |
| D4-GROUPS | Chọn sidebar hoặc select Nhóm nội dung trên mobile; Header/Hero/SEO giữ tabs | Header labels theo stable nav target; Clients alt theo logo; About/facts/signature/reel; IP/disciplines; Contact và Footer đúng slots |
| D5-REVIEW | Gửi và duyệt → trạng thái/filter → snapshot → quyết định | Nội dung snapshot readonly; nguồn/identity thứ cấp; lý do yêu cầu sửa; chặn tự duyệt; không có publish |

D4 saved panel là **bảng đối chiếu nội dung**, ghi rõ chưa mô phỏng layout website. P4 implementation sau này vẫn bắt buộc preview qua renderer giữ template đã khóa; design approval của bảng này không cho thay preview website bằng generic cards. D3 Project/Service đã dùng baseline CSS/markup trong inert iframe. Component Project card được trình một mình, không kèm cột trống; grid toàn website vẫn thuộc source lock P7 và không đổi.

### Điểm thiết kế cần xác nhận cùng bộ HTML

Service giữ secondary line của template bằng `Tiêu đề phụ` **cùng locale đang sửa**, thay vì hai field EN/VI trên một form. Đây là đề xuất mapping nội dung; không thêm language switch thứ hai. Duyệt thiết kế này không mở code Service; Service engineering bundle vẫn riêng sau Project representative thật đạt.

## Kịch bản thử trên HTML

1. Mở Wayfair EN, đổi tên, chọn JA: `Ở lại` giữ chữ; `Lưu và chuyển` mới chuyển sang JA. Preview vẫn nhận saved value, không biến thành live unsaved preview. Đổi nguồn/locale/entity không tự sao chép nội dung.
2. Mở `Tình huống thiết kế` trong dialog hoặc cuối màn: xem missing/loading/readonly/network error/conflict/unknown commit/source drift. Các controls này chỉ phục vụ duyệt mockup. Lỗi và unknown commit không cho biến thành saved success.
3. Mobile dùng hai panel `Biên tập`/`Bản đã lưu` và thanh save dưới; cuộn trong dialog để tới tất cả fields và đóng/mở source/detail bằng keyboard. Desktop dùng form và saved panel cạnh nhau.
4. Chọn logo khác: chỉ slot mô tả của logo đó đổi; shared logo/ID/thứ tự không editable. Header chỉ đổi nhãn menu, targets giữ nguyên. Footer không tạo menu mới mà template không có.
5. Review R-014 cho phép quyết định; yêu cầu sửa cần note. R-013 do “Bạn” gửi chặn self-review. Nguồn đổi chặn approve; readonly chặn ghi. Trạng thái đã duyệt không tự thay website.

## Đối chiếu và giới hạn evidence

Root kiểm rendered bằng Edge/CUA ở desktop1440×900 và mobile390×844; kiểm thêm controls hẹp320 và tablet768. Screenshot/AX results cùng source-preservation/HTTP pins nằm trong [evidence preparation](../pinky-lamb-cms/.local/test-outputs/multilingual-001/p3-design-v1/preparation-20261016/). Exact final results/source hashes ghi trong `verification.json` và [design manifest](../approvals/MULTILINGUAL-001-D3-D5-v1.design.json).

Không suy mockup PASS thành CMS runtime PASS. Source ứng dụng mới, Project API, Auth role matrix thật, Firestore save/CAS, export P3, full-site interactions/SEO và P6/P7 đều chưa chạy ở preparation này. Nội dung EN/JA là candidate theo nguồn dùng để duyệt bố cục, chưa được nghiệm thu ngôn ngữ. Hai Project/ba Service và số trạng thái là fixture UI, không phải inventory retained CMS.

Khi chuyển sang ứng dụng, bỏ prototype banner/role giả/scenario/reset, fake revisions/hash/rows và memory save; nối API/controller thật theo đúng P3 bundle. Không chuyển `allow-same-origin` dùng để đo iframe mockup sang private preview sản phẩm: application contract vẫn `sandbox=""`, scripts0, current CSP unchanged. Không giữ sample fallback hoặc silently flatten rich text.

**Approval trình:** `Approved MULTILINGUAL-001 D3-D5 design v1 và P3-REP v1`. Quyền triển khai của câu này chỉ là Project representative +26 exact paths/runtime/budget trong bundle P3. D3-SERVICE/D4/D5 được ghi nhận design reference, chưa mở implementation; P6 import/P7 activation luôn cần bundle và Approved riêng.
