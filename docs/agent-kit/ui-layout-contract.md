# Quy ước UI — Pinky Lamb

Nguồn chuẩn cho bố cục UI hiện tại và page/module mới. Khiêm duyệt triển khai kế hoạch v4 ngày 23/10/2026, chỉ local, giữ dữ liệu, chưa publish/deploy. Hồ sơ thực hiện: [UI-LAYOUT-004](../../pinky-lamb-cms/tasks/UI-LAYOUT-004.md). Quy ước không mở lại các kế hoạch đã đóng và không cấp quyền ghi dữ liệu/release.

## Đường dẫn áp dụng bắt buộc

`AGENTS.md → tài liệu này → checklist bên dưới → kiểm chứng → báo cáo có bằng chứng`.

Áp dụng khi tạo/sửa page, module, component, CSS, dialog, reader, hoặc hành vi responsive. Agent đọc tài liệu trước thay đổi; không phụ thuộc agent tự chọn skill hoặc nhớ lịch sử chat. Skill frontend chỉ hướng dẫn kỹ thuật và trỏ về đây. Không áp workflow UI vào thay đổi không ảnh hưởng giao diện.

## Trách nhiệm layout

- Page sở hữu lề ngoài và chiều rộng nội dung. Section/card sở hữu khoảng cách bên trong. Nhóm trường/nhóm nút sở hữu gap của các phần tử con. Không cộng hai lớp padding cho cùng ranh giới.
- Component dùng lại tự có layout nội bộ; không dựa vào tên trang cha như `.media-upload`. Biến thể embedded chỉ bỏ vỏ ngoài có chủ đích, giữ gap nội bộ.
- `.cms-control-group` quản lý nhóm nút độc lập, gap cả hàng/cột và wrap. Dùng `--cms-control-gap`, không thêm margin vào mọi button.
- Checkbox/radio có style riêng với text/file input. Vùng nhấn gồm nhãn tối thiểu 44px, ô chọn khoảng 18–20px.
- Selector phải giới hạn đúng component/biến thể. Không xóa padding/border của toàn bộ `.cms-editor-card` trong một trang để sửa một editor.
- Mỗi vùng có một chủ sở hữu scroll. Footer/header cố định không che control cuối, thông báo hoặc focus. Dùng chiều cao đo thực tế cho vùng tránh thanh cố định.
- `margin:0`, `padding:0`, `gap:0` không tự là lỗi: cho phép với tab nối nhau, bảng phân cách, ảnh phủ card, wrapper không có vỏ và mobile dialog toàn màn hình. Ghi ngoại lệ trong task/CSS tại nơi quyết định; không cấm số 0 hoặc thay hàng loạt.
- Giữ template/thiết kế đã duyệt; ngoại lệ material cần quyết định của Khiêm. Không dùng chuẩn spacing làm lý do thiết kế lại toàn bộ UI đã đúng.

## Spacing (CSS px)

| Ranh giới | Desktop / tablet | Mobile |
|---|---|---|
| Lề ngang page | 32 / 24 | 16; 320px dùng 12 |
| Section cùng cấp | 24 | 24 |
| Card / thân dialog | 24 | 16 |
| Header/footer dialog | 16 dọc, 24 ngang | 16 |
| Heading section → nội dung | 16 | 16 |
| Heading → mô tả | 4 | 4 |
| Nhóm trường / trường | 24 / 16 | 24 / 16 |
| Nhãn → control / control → hint,lỗi | 8 / 4 | 8 / 4 |
| Nút độc lập, ngang và dọc | 8 | 8 |
| Nội dung → nhóm thao tác | 16 | 16 |
| Checkbox → nhãn / icon → chữ | 8 | 8 |
| Control / nút icon | cao ≥44 / ≥44×44 | cao ≥44 / ≥44×44 |
| Padding dọc hàng danh sách | 12 | 12 |
| Grid tài nguyên | 16 | 12 |

Nội dung cuối tránh thanh cố định bằng chiều cao thực tế +16 và safe area khi áp dụng. Tokens trong `admin/ui-layout.css`; `--cms-control-gap` đã có, tái sử dụng thay vì tạo hệ song song. Các renderer Preview/Website cô lập có contract riêng; chỉ sửa khi có tác động được xác minh.

## Checklist trước khi sửa hoặc tạo page/module

- [ ] Đọc instructions và quy ước này; xác định mục tiêu, thao tác chính và hierarchy page/section/card.
- [ ] Tìm component hiện có và liệt kê các nơi dùng chung chịu tác động.
- [ ] Chỉ định nơi sở hữu padding/gap, width, scroll, sticky và responsive; ngoại lệ có lý do.
- [ ] Chọn các trạng thái có/không dữ liệu, loading, lỗi, disabled/busy, dữ liệu dài, ngôn ngữ/quyền liên quan.
- [ ] Chọn rows component × nơi dùng × trạng thái × viewport trong cùng task; không tạo tracker/receipt thứ hai.

## Checklist trong khi làm và trước bàn giao

- [ ] Dùng tokens/component đúng; component embedded giữ layout nội bộ.
- [ ] Nút giữ gap khi wrap; label/control, hint/error và nhóm tiếp theo không dính nhau.
- [ ] Mở từng nơi dùng chung bị tác động, không suy picker PDF đúng thì picker ảnh đúng.
- [ ] Kiểm keyboard/focus, control cuối, dialog footer, scroll lồng nhau; page-level no-overflow không đủ.
- [ ] Kiểm rendered UI theo ma trận; ảnh trước/sau cùng viewport/zoom/state khi sửa lỗi.
- [ ] Regression tests cho lỗi thực tế; test assertions phải bắt overlap, clipping, spacing hoặc hành vi, không chỉ tìm chuỗi CSS.
- [ ] Review diff và ghi rõ self-review/independent review. Không tự sinh thêm agents hoặc workflow gates.
- [ ] Báo PASS/FAIL/NOT_RUN có bằng chứng. Source/build không chứng minh UI; chưa mở giao diện không báo UI đã kiểm chứng.

## Ma trận kiểm chứng

D=1440×900, T=768×1024, M=390×844, N=320×720, Z=desktop zoom 200%. Reflow viewport nhỏ là bằng chứng phụ, không đồng nghĩa đã thử browser zoom. Kiểm trước/sau breakpoint bị tác động. Trang/consumer bị tác động có kiểm tra layout nền ở D/T/M/N/Z; trạng thái động chọn theo rủi ro thay vì tích Descartes toàn bộ tổ hợp. D/M kiểm lỗi/loading/wrap; N/Z kiểm trạng thái gây áp lực layout lớn nhất. Không chạy lại toàn app cho thay đổi cục bộ không có tác động chung.

| Component × nơi dùng | Trạng thái |
|---|---|
| Shell, section/card trong các mục CMS | trang/heading dài, mở/thu gọn, sidebar |
| Form, checkbox, nút trong editor/dialog | validation, disabled, busy, nhãn dài, wrap |
| File trong media/picker ảnh/PDF/trường FILE | populated/empty, loading/error, xem/chọn/lưu trữ |
| Library/media picker | filter, pagination, selected/unselected, tên dài |
| Thêm/xóa, sort trong form/table/gallery | đầu/giữa/cuối, expand, disabled, Undo |
| Toolbar/table/dialog | populated/empty, nhiều nút, dirty/error, tab đầu/cuối |
| Editor bản dịch | nội dung dài, missing/stale, ngôn ngữ hỗ trợ |
| Chuẩn bị xuất bản | loading/error, preview ngôn ngữ, confirm/cancel |
| Reader/Preview/fixed actions | loading/error, nội dung dài, scroll, bàn phím ảo |

## Evidence và quyền dữ liệu

Mỗi finding có component/consumer/state/viewport/zoom, expected/actual, nguyên nhân xác minh, ảnh và kết quả. Bằng chứng từ revision cũ là reuse candidate, không tự PASS revision mới. Lỗi còn thiếu proof giữ NOT_RUN và nêu owner/next action.

Không ghi/archive/publish retained data để tạo states. Dùng fixture cô lập và quyền thực tế cho writes. Không cài dependency hay restart dịch vụ ngoài scope. Tooling failure theo team workflow; không xây runner mới hoặc sửa locks để qua gate. Memory hỗ trợ nhắc nhớ; nguồn quy tắc là repo này.
