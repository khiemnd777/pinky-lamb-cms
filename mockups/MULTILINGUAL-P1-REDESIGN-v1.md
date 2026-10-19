# MULTILINGUAL P1 — thiết kế sửa v1

Ngày 16/10/2026. **MOCKUP_APPROVED / PLAN_V2_APPROVED / P0_COMPLETE / P1_IMPLEMENTATION_AWAITING_APPROVAL**. Người dùng đã duyệt chính mockup HTML này ngày 16/10/2026 và yêu cầu rework kế hoạch P0–P7. [Design approval/digests](../approvals/MULTILINGUAL-001-v2.design.json), [plan v2](../pinky-lamb-cms/docs/MULTILINGUAL-001-v2.md), [tasks v2](../pinky-lamb-cms/tasks/MULTILINGUAL-001-v2.md). Quyền này chỉ dành cho bản thiết kế; implementation ứng dụng P1 tiếp tục HOLD. Không phải bản dịch được nghiệm thu hoặc website đã triển khai đa ngôn ngữ.

## Tự review

Nguồn: hai ảnh CMS do người dùng cung cấp và ảnh Hero Nhật lưu trong evidence P1. Các nhận xét dưới đây là đánh giá thiết kế, tách khỏi kết quả kiểm thử chức năng trước đó.

| Vấn đề quan sát | Hệ quả với người biên tập | Quyết định trong mockup |
| --- | --- | --- |
| Tab Đầu trang đang chọn nhưng panel Hero bản dịch vẫn nằm dưới form menu | Sai ngữ cảnh, cuộn dài và không biết đang sửa phần nào | Bản dịch chỉ xuất hiện trong tab Hero |
| Tiêu đề nhóm lặp nhiều tầng, metadata kỹ thuật nằm trước nội dung | Nội dung chính bị đẩy xuống, khó quét màn hình | Một tiêu đề trang, một ngữ cảnh Hero, trạng thái lưu ngắn gọn |
| Mỗi đoạn chữ thành một textarea và dropdown riêng, nhiều nút thêm/xóa | Người dùng phải hiểu cấu trúc dữ liệu để soạn một câu | Vùng biên tập tiêu đề/mô tả liền mạch, công cụ nhấn mạnh gắn với chữ |
| Lưu website, Lưu Hero, preview chung và preview Hero cùng tồn tại mà thiếu phân biệt | Không rõ thao tác nào lưu/xem bản nào | Hành động theo đúng ngữ cảnh và ngôn ngữ; ghi rõ preview là bản đã lưu |
| QA, revision, target kỹ thuật lẫn với biên tập | Tăng nhiễu và hiểu nhầm về xuất bản | Chi tiết kỹ thuật không nằm trong luồng chính; tình huống giả lập ở vùng review riêng |
| Hero Nhật dùng cỡ chữ lớn và ngắt “ヒーロー” giữa từ | Khó đọc, mất cân đối chữ/ảnh | Bản trình bày riêng theo locale, kiểm cả desktop/mobile |
| Dùng dữ liệu “P1 LOCAL QA” để đánh giá giao diện | Không thể đánh giá bố cục với nội dung biên tập có độ dài thực tế | Nội dung minh họa EN/VI/JA có nhãn thiết kế, không tuyên bố đã duyệt nội dung |

## Bài học và thay đổi cách làm

- Bắt đầu từ tác vụ: chọn ngôn ngữ → biên tập → lưu đúng bản → xem đúng bản đã lưu. Không bắt đầu từ schema hoặc số trường API.
- Giữ ngữ cảnh và thành phần của CMS đã có. Tính năng mới phải nằm đúng tab, không ghép một form độc lập vào cuối màn hình.
- Thiết kế rõ những trạng thái ảnh hưởng dữ liệu trước khi nối API: chưa có bản dịch, chưa lưu, đang lưu, lỗi, xung đột và chỉ đọc.
- Render và thao tác HTML ở desktop/mobile trước khi giao duyệt. Không coi build, screenshot không tràn hoặc functional PASS là human visual acceptance.
- Mockup được duyệt mới làm nguồn cho kế hoạch sửa sản phẩm; không tự chuyển phê duyệt thiết kế thành quyền triển khai.

## Phạm vi bản thiết kế

- CMS giữ giao diện tiếng Việt, ngôn ngữ nội dung EN/VI/JA, mặc định EN.
- Chỉnh nhãn CTA, nội dung và alt theo contract P1; artwork, mục tiêu CTA và bố cục nguồn được dùng chung, chỉ đọc.
- Preview CMS minh họa bản đã lưu. Chỉnh form không âm thầm thay preview; trạng thái nhắc người dùng lưu.
- Chuyển ngôn ngữ có thay đổi chưa lưu: ở lại, bỏ thay đổi hoặc lưu rồi chuyển. Mô phỏng lỗi giữ nguyên nội dung.
- Một view Hero đầy đủ để review bố cục từng ngôn ngữ và khổ màn hình. Bộ chọn ngôn ngữ trong view này là công cụ review, không phải triển khai switch website thuộc P2.
- Toàn bộ thao tác chỉ ở bộ nhớ tab, không API, không localStorage, không đọc phiên đăng nhập, không gửi duyệt/xuất bản. Reload xóa thay đổi minh họa.

## Tiêu chí review

1. Mở lên nhận ra ngay đang sửa Hero và ngôn ngữ nào; chỉ có một hành động lưu chính theo ngữ cảnh.
2. Một tiêu đề có thể soạn liên tục mà không quản lý “đoạn chữ” hay mảng runs.
3. Thấy rõ nội dung đang sửa khác với bản đã lưu; lỗi không làm mất nội dung.
4. Hero EN/VI/JA cân đối ở desktop/mobile, chữ không bị cắt hoặc tràn và CTA không lẫn ngôn ngữ.
5. Mobile có đường biên tập/xem trước rõ ràng, các thao tác lưu/chuyển bản và dialog vẫn dùng được.
6. Các nút trong mockup có phản hồi hoặc bị vô hiệu rõ lý do. Keyboard/focus, console và ảnh asset được kiểm ở phạm vi prototype.
7. Human duyệt hoặc yêu cầu sửa thiết kế sau khi xem HTML. Các tiêu chí trên chưa tự động là PASS chỉ vì đã viết file.

## Handoff

Entry: [multilingual-p1-redesign-v1.html](multilingual-p1-redesign-v1.html). CSS/JS riêng cùng thư mục; ảnh/font tham chiếu tương đối tới assets sẵn có trong `dist/assets/`, chỉ đọc. Không tải tài nguyên từ bên ngoài. Chất lượng bản dịch tiếng Nhật và khả năng tích hợp thực tế vẫn cần đánh giá riêng; dữ liệu minh họa không thay dữ liệu CMS.

Preview local: http://127.0.0.1:4186/mockups/multilingual-p1-redesign-v1.html. Server riêng chỉ phục vụ ba file prototype và ảnh/font sẵn có; không dùng server CMS hoặc QA P1.

## Kết quả tự review prototype

**Verified, 16/10/2026:** đã render bằng Codex In-app Browser tại 1440×900 và 390×844; xem Hero EN/VI/JA ở cả hai khổ. Đã thao tác chọn ngôn ngữ, lưu mô phỏng, giữ/bỏ thay đổi khi chuyển, Escape, preview bản đã lưu khi form đang sửa, lỗi lưu, xung đột giữ chữ, trạng thái chỉ đọc, bản dịch trống và định dạng tiêu đề. Có ảnh trong [thư mục review](review/multilingual-p1-v1/) và [kết quả có giới hạn](review/multilingual-p1-v1/verification.json). JS syntax và HTML id duy nhất PASS; 27 file source/template/asset hiện có được đối chiếu hash, không thay đổi.

Các lỗi phát hiện rồi sửa ngay trên prototype: preview hình quá mờ/khác composition đầy đủ; sidebar dùng glyph thiếu nhất quán; thao tác sửa chữ làm mất định dạng ngoài vùng sửa; mobile khó tiếp cận nút lưu khi cuộn; bản trống báo nhầm đã lưu. Preview hiện thu nhỏ cùng composition desktop 1200px, ghi rõ kích thước và có nút mở rộng. Công cụ định dạng là mô phỏng thiết kế giới hạn, chưa phải implementation rich text nối contract/backend.

**Approved:** bố cục và luồng thao tác trong ba file mockup đã được người dùng duyệt; hash/provenance ghi tại design record. **Unknown/PENDING:** UI sản phẩm sau rework, editorial acceptance của nội dung mẫu và kết quả tích hợp thật. Historical verification JSON ghi trạng thái pending ở thời điểm tự review trước human approval; giữ nguyên receipt đó. Không chạy CMS tests hoặc ghi dữ liệu emulator trong lượt thiết kế. Để tiếp tục sửa ứng dụng cần duyệt phạm vi triển khai cụ thể theo plan v2; không hỏi lại mockup đã được duyệt và không dùng approval thiết kế thay quyền implementation.
