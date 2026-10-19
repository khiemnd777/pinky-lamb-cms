# MULTILINGUAL-001 v1 — Website và quản lý nội dung Anh–Việt–Nhật

> **Cập nhật 16/10/2026:** mockup HTML sửa đã được người dùng duyệt. Kế hoạch hiện hành là [MULTILINGUAL-001 v2](MULTILINGUAL-001-v2.md), tasks tại [v2](../tasks/MULTILINGUAL-001-v2.md), [design record](../../approvals/MULTILINGUAL-001-v2.design.json). Tài liệu v1 dưới đây giữ lịch sử; UI P1 sản phẩm cũ vẫn bị từ chối, rework implementation HOLD chờ scope/Approved mới. Không dùng checklist v1 để resume.

Ngày: **16/10/2026**, Asia/Ho_Chi_Minh. Owner tài liệu/index: **Project Coordinator / root**.

## 1. Quyết định và quyền

**Phương án tổng thể v1 đã được đồng ý; UI P1 bị người dùng từ chối ngày 16/10/2026. P1 IN_PROGRESS / UI_ACCEPTANCE_REJECTED / DESIGN_REPLAN_REQUIRED.** Approval P1+A1 lịch sử giữ nguyên; dừng implementation phần bị ảnh hưởng, trình thiết kế sửa và chờ Approved trước sửa source. P2–P7 chưa được Approved. Quyền P1 hiện hành theo [đặc tả P1](MULTILINGUAL-001-P1-v1.md) và manifest; phần dưới ghi nguồn chấp thuận phương án ban đầu. Người dùng đã đồng ý phương án v1 và giao lưu kế hoạch, lập phạm vi/tasks/tiêu chí nghiệm thu P1 để duyệt trước triển khai:

> Đồng ý phương án v1. Lưu kế hoạch vào tài liệu dự án và lập phạm vi, tasks, tiêu chí nghiệm thu P1 để tôi duyệt trước khi triển khai.

Nguồn: lời người dùng trong chat hiện hành ngày 16/10/2026. Đây là chấp thuận phương án tổng thể và quyền ghi tài liệu; **không phải Approved triển khai P1 hoặc P2–P7**. Không tự ghi editorial approval, nghiệm thu, đóng M3/mở M4 hoặc LOCAL_COMPLETE.

Nguồn quyết định tổng thể là tài liệu này. Nguồn scope/AC P1 là [đặc tả P1](MULTILINGUAL-001-P1-v1.md); checklist thực hiện là [tasks P1](../tasks/MULTILINGUAL-001-P1-v1.md); digest và allowlist là [scope manifest](../../approvals/MULTILINGUAL-001-P1-v1.scope.json). [Index dự án](../../docs/agent-kit/project-plan.md) chỉ liên kết, không tạo checklist cạnh tranh.

## 2. Hiện trạng và giới hạn bằng chứng

**Verified — source inspected, không phải runtime:**

- [Content v3](../contracts/media-v3-content.mjs) khóa `locale: 'vi-VN'`, dịch vụ có `title` và `titleVi`.
- [Renderer v3](../preview/site-media-renderer.mjs) xuất `lang="vi"`; [section renderer](../preview/site-sections.mjs) còn chữ giao diện cố định và trình bày tên dịch vụ song ngữ.
- [Hosting local](../infra-local/firebase.json) phục vụ `public-baseline` trên `127.0.0.1:5010`; đường QA export hiện có dùng base riêng. Không được suy rằng lưu CMS tự cập nhật :5010.
- [CMS shell](../admin/cms-shell.mjs) có tám nhóm nội dung. Preview private dùng iframe sandbox; giữ các ranh giới hiện có.
- [Giới hạn request/envelope](../contracts/hero.mjs) hiện là 64 KiB/256 KiB; phải đo encoded bytes của thiết kế mới, không nhân ba payload mặc định.
- [M1 register](../../approvals/APPROVAL-REGISTER.json) CLOSED; [M3 register](../../approvals/CMS-001-v2-M3-REGISTER.json) IN_PROGRESS. Các lịch sử HOLD/NOT_RUN và human acceptance của công việc khác không thay đổi.

**Unknown:** lần thử kết nối :5010 trong lượt khảo sát trước không thành công. Lượt lưu tài liệu này không chạy HTTP, browser, CMS build/tests, đọc dữ liệu emulator hoặc khởi động process. Runtime, login, bản nguồn hiện tại, font Nhật và chất lượng bản dịch chưa được xác minh mới. Checkout hiện không có `.git`; dùng digest file cho bundle, không bịa commit SHA.

## 3. Quy tắc đã chốt ở mức phương án

| Thành phần | Thiết kế v1 |
| --- | --- |
| Website | Anh, Việt, Nhật; mặc định tiếng Anh |
| URL đích | `/` = `en`; `/vi/` = `vi`; `/ja/` = `ja` |
| Giao diện CMS | Tiếng Việt, không đổi theo ngôn ngữ nội dung |
| Nội dung CMS | Ba bản ngôn ngữ trên cùng ID và cấu trúc |
| Dữ liệu chung | Cấu trúc, thứ tự, quan hệ, tài nguyên và dữ kiện chung |
| Bản dịch | Biên tập, lưu, theo dõi và duyệt theo ngôn ngữ |
| Default và nguồn dịch | Tiếng Anh là default website; tài liệu nguồn có thể bằng tiếng Việt |
| Phát hành | Chỉ phiên bản được phép phục vụ; không tự đưa bản nháp ra website |
| Hạ tầng | `demo-pinky-lamb-cms`, loopback; không Firebase thật/cloud/production |

URL quyết định ngôn ngữ. Không tự chuyển theo IP/trình duyệt hoặc ghi nhớ lựa chọn để âm thầm thay nội dung của cùng URL. Tiếng Nhật dùng mã `ja`, không dùng `jp`.

## 4. Bố trí switch website

Desktop: sau điều hướng và trước CTA; trạng thái chọn rõ nhưng nhỏ hơn CTA.

```text
LOGO | Work  Services  About  IP Studio | [EN] VI 日本語 | [Let’s talk]
```

Mobile: dropdown nằm ngoài hamburger, nhìn thấy ngay.

```text
LOGO                              [EN ▾] [☰]
                                 ✓ English
                                   Tiếng Việt
                                   日本語
```

- Danh sách dùng tên bản địa `English`, `Tiếng Việt`, `日本語`; accessible name đầy đủ. Không dùng cờ làm ký hiệu ngôn ngữ.
- Switch là liên kết tới URL tương ứng; footer có liên kết bổ sung. Giữ keyboard/focus và thao tác cảm ứng.
- Giữ section anchor, category filter hợp lệ và cùng project ID khi chuyển bản. Nếu đích không có cùng mục, giải thích rõ và về section hợp lệ, không mở mục không tồn tại.
- Nếu form brief có thay đổi, cảnh báo trước khi chuyển trang; không tự lưu dữ liệu cá nhân vào browser storage.
- Refresh, mở tab mới và Back/Forward giữ ngôn ngữ URL. Ngưỡng thu gọn phải được kiểm bằng layout thật, không suy từ source.

## 5. Bản đồ nội dung

| Nhóm | Theo ngôn ngữ | Dùng chung |
| --- | --- | --- |
| Header | Điều hướng, mô tả, nhãn CTA | Logo, đích điều hướng |
| Hero | Tiêu đề/runs, eyebrow, mô tả, nhãn nút, ghi chú, alt | Artwork, loại/đích hành động |
| Khách hàng | Tiêu đề, giới thiệu, alt cần thiết | ID/danh tính, logo, thứ tự |
| Dự án | Tên hiển thị, tóm tắt, scope có nguồn, caption/alt | ID, khách hàng, năm, category, gallery, service IDs |
| Dịch vụ | Tên hiển thị, mô tả, scope có nguồn | ID, thứ tự, quan hệ |
| Giới thiệu | Tiêu đề, đoạn văn, nhãn thông tin | Dữ kiện và nguồn kiểm chứng |
| IP Studio | Tiêu đề, mô tả, nhãn CTA | Artwork, đích liên kết |
| Liên hệ | Nội dung, nhãn form, hướng dẫn, thông báo | Email, số điện thoại, contact mode |
| Footer | Mô tả, nhãn liên kết/về đầu trang | Logo, đích liên kết, năm |
| SEO | Title/description, nội dung chia sẻ, alt | Quy tắc URL và tài nguyên chung |

Tên thương hiệu, tên pháp lý/khách hàng và địa chỉ không được biến thành dữ kiện khác khi dịch. Chữ cố định của website (mở/đóng, bộ lọc, validation, copy brief, aria labels) thuộc từ điển ứng dụng, không phải CMS tùy ý sửa.

Kiểm kê PDF/video/artwork có chữ bên trong riêng. Đổi ngôn ngữ trang không dịch các tài nguyên này. Mặc định dùng chung binary; biến thể tài nguyên ngôn ngữ cần thiết kế và quyền riêng nếu phát sinh.

## 6. CMS quản lý bản dịch

Giữ tám nhóm hiện có. Thanh **Ngôn ngữ nội dung** dưới tên nhóm; không tạo switch ngôn ngữ giao diện CMS.

```text
Sidebar hiện có | DỰ ÁN / TÊN DỰ ÁN
               | Ngôn ngữ nội dung: [Tiếng Anh] [Tiếng Việt] [Tiếng Nhật]
               | [Biên tập] [Gửi và duyệt]
               | Form bản đang chọn | Preview hoặc bản nguồn chỉ đọc
               | [Lưu bản tiếng Anh] [Xem trước] [Gửi duyệt]
```

- Chọn ngôn ngữ rồi đổi nhóm vẫn giữ lựa chọn; lưu từng bản, không ghi đè bản khác.
- Có thay đổi chưa lưu: **Lưu và chuyển / Bỏ thay đổi / Ở lại**. Lưu lỗi giữ dữ liệu nhập và lựa chọn hiện tại.
- Preview ghi rõ ngôn ngữ, saved revision/hash. Đối chiếu nguồn chỉ đọc thay thế vùng preview; không ép ba cột.
- Dữ liệu chung có khối riêng, thông báo tác động cả ba bản và nút lưu riêng khi có thao tác ghi chung.
- Mobile một cột; mở preview/đối chiếu bằng chế độ riêng. Label, validation, trạng thái CMS vẫn tiếng Việt.
- Danh sách dự án/dịch vụ thêm cột Anh/Việt/Nhật, trạng thái có thể bấm vào đúng bản. Lọc ngôn ngữ, trạng thái, mục thiếu/cần cập nhật. Chưa tạo dashboard dịch thuật riêng.

## 7. Dữ liệu, duyệt và nội dung chưa sẵn sàng

Tách dữ liệu chung, các bản localized và thông tin phiên bản/nguồn dịch. Không tạo ba project/service IDs; không mở rộng bằng hàng loạt `titleJa`/`summaryJa`. Backend xác thực locale, quyền, CAS revision, idempotency và kích thước encoded JSON. Không thay validation chỉ tại UI.

Luồng đích: **Chưa dịch → Bản nháp → Chờ duyệt → Đã duyệt**, với nhánh Yêu cầu sửa. `Cần cập nhật` là cờ do nguồn thay đổi; trạng thái đang phục vụ tách khỏi editorial approval. Snapshot phải gắn locale, revision dữ liệu chung, media/source và hash tương ứng.

Giữ Editor/Reviewer/Owner/Publisher theo quyền hiện có; không thêm role chỉ vì có ngôn ngữ. Giữ self-review guard. Duyệt bản Việt không tự duyệt bản Anh/Nhật. Nội dung nguồn thay đổi không làm mất bản đã duyệt đang phục vụ.

- Thiếu Hero/nav/contact/SEO bắt buộc: chặn bật ngôn ngữ đó trên website.
- Mục dự án/dịch vụ thiếu bản dịch hợp lệ: ẩn khỏi locale tương ứng, đồng bộ filter/count/featured/form references.
- Không âm thầm trộn tiếng Anh vào trang Việt/Nhật. Đích cuối phải có đủ ba bản; bật dần chỉ phục vụ giai đoạn chuẩn bị.
- P1 chỉ có draft/preview/QA Hero, **chưa triển khai editorial workflow hay kích hoạt locale website**. Artifact thử nghiệm không được gắn nhãn đã duyệt/đã phát hành.

## 8. Renderer, export, SEO và bảo toàn

Luồng đích: CMS → snapshot duyệt → public projection từng locale → HTML → artifact local → Hosting :5010. Renderer nhận locale và UI dictionary; modal, filters, form và aria labels dùng cùng ngôn ngữ. Giữ HTML/CSS/vanilla JS.

Tạo output riêng; không sửa `dist/`, `public-baseline` hoặc root `firebase.json`. P7 mới đề xuất config local phục vụ output tại :5010, cách chuyển đổi/khôi phục baseline và authority runtime cụ thể. Không tự triển khai publication machinery của M4.

HTML ngôn ngữ có metadata ngay từ đầu; asset paths hoạt động ở thư mục con. Canonical riêng từng locale, hreflang hai chiều và x-default tới bản Anh; chỉ liệt kê bản đang phục vụ. Artifact local phải noindex và ghi rõ QA. Form vẫn mailto/copy, không có backend nhận lead mới.

Nguồn thiết kế đã tra trong lượt khảo sát: [Google multilingual sites](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites), [Google localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions), [W3C internationalization quick tips](https://www.w3.org/International/quicktips/). Nguồn ngoài không xác minh implementation local. Kiểm tra lại khi triển khai phần phụ thuộc phiên bản.

## 9. Trình tự và kết quả

| Bước | Kết quả | Phụ thuộc / giới hạn |
| --- | --- | --- |
| P0 — Contract | Mapping trường, nguồn dịch, URL và AC bắt buộc | Mapping Hero và contract chi tiết nằm trong bundle P1 để duyệt cùng; phần ngoài Hero vẫn Proposed |
| P1 — Hero | CMS lưu độc lập en/vi/ja → readback → private preview → artifact QA Hero | Slice riêng đang AWAITING_APPROVAL; không phục vụ tại :5010 |
| P2 — Switch website | Header/mobile/footer, URL và giữ ngữ cảnh | Sau P1; cần scope/Approved riêng |
| P3 — Dự án/dịch vụ | Bản dịch theo ID, trạng thái và đối chiếu nguồn | Sau contract P1; cần scope/Approved riêng |
| P4 — Nhóm còn lại | Khách hàng, About, IP, Contact, Footer, SEO, UI text | Theo contracts P2/P3; kiểm glyph/font/licensing |
| P5 — Editorial | Snapshot locale, nguồn tham chiếu, cảnh báo stale, review | Có contract từ P0/P1; không được dùng P1 để nhận là hoàn thành |
| P6 — Chuyển nội dung cũ | Mapping/migration thử và nhập bản dịch đã rà | Sau các contracts/luồng cần thiết; không dùng fixture làm bản dịch được nghiệm thu |
| P7 — :5010/UAT | Bộ website ba bản phục vụ đúng output | Sau các bước trước; approval riêng cho activation và bảo toàn |

P1 chứng minh một luồng thật trước khi mở rộng. Không cần hoàn tất P0 toàn site để kiểm chứng riêng Hero. Mỗi task thường ≤5 file, một writer mỗi file; không suy có delegation hoặc runtime từ tên vai trò.

## 10. Chuyển đổi và nghiệm thu toàn chức năng

Nội dung cũ có Anh/Việt trộn: kiểm kê/backup → phân loại ngôn ngữ thực tế → map trường → để thiếu bản chưa dịch → chạy thử có idempotency → đối chiếu ID/media/nguồn → human rà ngôn ngữ. Không chỉ đổi `locale` thành `en`.

Toàn chức năng chỉ đạt khi: ba URL đúng; CMS tiếng Việt; lưu riêng, conflict/retry an toàn; preview đúng revision; draft/private không lọt output; switch/modal/filter/mailto/copy/validation đúng; không mất dấu/glyph Nhật/tràn ở 1440/768/390/320 px; migration bảo toàn và khôi phục có chứng cứ; kỹ thuật và human language acceptance được ghi riêng.

**Current:** phương án đã được đồng ý, P1/A1 đã Approved và source đã triển khai. OWNER runtime PASS: ba bản riêng, retry/response-loss/CAS/delay/logout, responsive và final QA. EN5 khôi phục hash, VI/JA1/base0; unit38/browser17/lint/build PASS theo proof boundaries trong tasks. P1 chưa đóng vì role runtime AC04 thiếu (chỉ có OWNER); human/language acceptance PENDING. P2–P7 chưa được duyệt; production ngoài phạm vi; M3/M4/LOCAL_COMPLETE giữ nguyên. Approval digests/snapshots ban đầu được giữ.
