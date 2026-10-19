# QA và điều kiện hoàn tất

Baseline test matrix: **10/10/2026**; cập nhật gate **11/10/2026**.

**Snapshot khi đóng gói 11/10/2026: CMS-001 v2 AWAITING_APPROVAL / CMS NOT_IMPLEMENTED.** Matrix website bên dưới giữ làm regression plan; chưa chạy và không cấp quyền sửa source. Acceptance/tests M1 theo [CMS-001 v2](CMS-PROPOSAL-CMS-001-v2.md) và [tasks/todo](../tasks/todo.md). Chỉ chạy implementation/tests có writes sau Approved M1 hợp lệ; M2–M4 cần Approved riêng; deployment ngoài gói.

**Trạng thái ban đầu:** đây là test plan cho phiên Codex tiếp theo, không phải báo cáo đã pass. Bằng chứng hiện có là release Firebase thành công, HTTP 200 và các kiểm tra tĩnh đã nêu trong [PROJECT-STATE](PROJECT-STATE.md). Chưa có một lượt browser QA desktop/mobile đầy đủ.

**Cách áp dụng hiện hành:** matrix lịch sử này là thư viện checks cho scope phù hợp, không là gate toàn trang sau mỗi edit. Chọn checks theo acceptance criteria, phần thay đổi và rủi ro trong [policy hiện hành](agent-kit/team-policy.md#verification-scope-and-completion). Điều kiện LOCAL_COMPLETE cuối tài liệu vẫn áp dụng cho toàn CMS; không tự trở thành prerequisite cho một sửa policy hoặc visual parity độc lập. Giữ bằng chứng chưa chạy/chưa đạt đúng trạng thái và không bỏ các controls quyền/dữ liệu.

## 1. Cách ghi nhận

Mỗi kết quả cần có: mã kiểm tra, browser/version, hệ điều hành hoặc chế độ mô phỏng, viewport, URL/commit, pass/fail/chưa chạy, bằng chứng ngắn. Phân biệt thử trên thiết bị thật với viewport giả lập. Với lỗi, thêm bước tái hiện, expected/actual và file sửa. Không cần ảnh cho mọi phép kiểm tra; ưu tiên ảnh lỗi, trạng thái tương tác quan trọng và bố cục sau sửa.

Gợi ý cột báo cáo:

| ID | Môi trường | Kết quả | Bằng chứng | Ghi chú/lỗi còn lại |
| --- | --- | --- | --- | --- |
| NAV-01 | Điền browser, viewport, URL | Chưa chạy | Điền khi đã chạy | Không suy ra pass từ mã nguồn |

Chạy bản local HTTP trước. Dùng dữ liệu giả như “Khách thử”, `qa@example.com`, “Thương hiệu thử”, “Tổ chức sự kiện giới thiệu sản phẩm thử nghiệm.” Không gửi email thật, gọi điện hoặc nhắn Facebook trong QA; xác nhận href/encoding và hành vi mở ứng dụng là đủ. Intercept `mailto:` trong automation nếu cần để tránh gửi ra ngoài.

## 2. Ma trận viewport và môi trường

| Môi trường đề xuất | Mục đích | Phạm vi tối thiểu |
| --- | --- | --- |
| Desktop 1440 × 900 | Header, hero, hai cột dự án, services/contact, dialog rộng | Toàn bộ luồng chính, keyboard, console/Network |
| Tablet 768 × 1024 | Menu mobile ở layout tablet, khoảng hẹp trước breakpoint 760px | Toàn trang, menu, case dài, form |
| Mobile 390 × 844 | Layout một cột, touch controls, input, video | Toàn bộ luồng chính |
| Mobile 360 × 800 | Text wrap và control trên màn hình hẹp | Hero, filter, cards, contact, dialog |
| Chiều rộng 320px | Kiểm tra cuộn ngang/cắt nội dung và reflow | Các section, menu, form, dialog |
| Gần 480/760/1020px | Hành vi chuyển layout và menu | Cặp viewport sát hai phía của breakpoint vừa sửa |

Đây là tập kiểm tra đề xuất. Dùng Chromium khả dụng trước; bổ sung Safari/iOS hoặc WebKit nếu môi trường hỗ trợ vì dialog, mailto, video inline và clipboard có khác biệt theo browser. Chỉ báo browser đã kiểm tra thật. Với zoom desktop, thử ít nhất 200%; dùng 320 CSS px để xem reflow, không gọi đó là một audit WCAG đầy đủ.

## 3. Luồng chức năng

### Điều hướng và layout

| ID | Thao tác | Kết quả mong đợi dựa trên bản hiện có |
| --- | --- | --- |
| NAV-01 | Dùng link logo, Dự án, Dịch vụ, Về Pinky, IP Studio, các CTA liên hệ và Back to top | Đúng anchor; nội dung đích không bị header che; URL fragment hợp lệ |
| NAV-02 | Mobile: mở menu, chọn từng link | `aria-expanded`/label đúng; menu hiện rồi đóng sau navigation; CTA contact dùng được |
| NAV-03 | Mở menu, Escape; mở menu rồi click ngoài header | Escape đóng và đưa focus về toggle; click ngoài đóng menu |
| NAV-04 | Mở menu mobile rồi tăng viewport qua 1021px | Menu đóng; nav desktop dùng được; không để lớp/element ẩn chặn thao tác |
| VIEW-01 | Cuộn toàn trang ở các viewport chính | Không chồng chữ, mất CTA, crop sai chủ thể nghiêm trọng, tràn ngang không cần thiết hoặc khoảng trắng do asset hỏng |
| VIEW-02 | Reload, font swap và ảnh tải chậm | Nội dung còn đọc được; glyph tiếng Việt đúng; ghi mọi layout shift quan sát được |

### Dự án, filter và services

| ID | Thao tác | Kết quả mong đợi |
| --- | --- | --- |
| WORK-01 | Mở trang mới | Tất cả được chọn; 4 card: Wayfair, Sony, Diag, VIFA; counter `04 / 08 PROJECTS` |
| WORK-02 | Xem thêm, rồi thu gọn | 8 card và `08 / 08`; focus tới card thứ 5 khi mở thêm; thu về 4 card và cuộn tới toolbar; control không bị mất khả năng dùng |
| WORK-03 | Chọn Events, Film, Communications | Lần lượt 4, 2, 2 case; counter đúng; nút mở thêm ẩn vì mỗi nhóm ≤ 4; đúng `aria-pressed` |
| WORK-04 | Mở đủ 8, đổi filter, trở lại Tất cả | Mỗi lần đổi filter reset trạng thái mở rộng; về Tất cả hiển thị lại 4/8 |
| WORK-05 | Mở từng card trong cả 8 case | Đúng title/client/year/summary/ảnh; không có gallery trùng ảnh chính; không lỗi tài nguyên |
| WORK-06 | Kiểm tra scope và link nguồn của 8 case | Wayfair/Petrosetco/PSD không tự xuất hiện scope; các link PDF mở đúng `sourcePage` theo dữ liệu |
| WORK-07 | CTA “Cùng tạo dự án của bạn” trong case thuộc mỗi nhóm | Dialog đóng; tới contact; focus vào heading; chọn Events & Experiences, Film & Content Production hoặc Integrated Communications tương ứng |
| SERV-01 | Mở/đóng từng service bằng pointer và keyboard | Đủ 6 service; mục đầu mở ban đầu; summary điều khiển nội dung đúng, scope không bị cắt |
| IP-01 | Chọn CTA Original IP | Tới contact và chọn Original IP Development; các lựa chọn trước đó vẫn được giữ |

Các số lượng trên đúng với snapshot 8 case. Nếu người dùng bổ sung dự án có nguồn, cập nhật cả expected result và số hiển thị tương ứng.

### Dialog, video và credential

| ID | Thao tác | Kết quả mong đợi |
| --- | --- | --- |
| DLG-01 | Mở case, Tab/Shift+Tab, Escape, mở lại rồi nút đóng | Focus nằm trong dialog khi mở, nền không thao tác được, đóng được và focus trở về ngữ cảnh gọi hợp lý |
| DLG-02 | Click backdrop và click nội dung bên trong | Click ngoài bounds đóng; click nội dung không vô tình đóng; cuộn dialog dài được |
| DLG-03 | Đóng case/video rồi cuộn trang | Body scroll được khôi phục; không còn class/trạng thái khóa trang |
| MEDIA-01 | Mở showreel từ cả nút hero và banner | Cùng video; controls và phát nội tuyến hoạt động khi browser cho phép; nếu play bị chặn, người dùng có thể bấm Play |
| MEDIA-02 | Play/pause, seek, đóng video, mở lại | Video usable; đóng là pause, không để âm thanh chạy nền; không yêu cầu tự reset thời gian vì mã hiện chưa đặt hành vi đó |
| MEDIA-03 | Quan sát Network trước/sau khi mở showreel | Ghi lượng tải thực tế; `preload="none"` được giữ; không kết luận “không tải byte nào” nếu chưa đo |
| PDF-01 | Mở credential từ trang và case | PDF tải được; 48 trang theo bản nguồn; fragment trang đúng. Việc browser PDF viewer có thực hiện jump là kết quả cần ghi nhận riêng |
| FALLBACK-01 | Nếu có môi trường phù hợp: thử dialog không hỗ trợ hoặc kiểm tra nhánh fallback bằng test có kiểm soát | Case mở PDF đúng trang, showreel mở MP4; không phá runtime production để ép test |

### Brief và contact

| ID | Dữ liệu/thao tác | Kết quả mong đợi |
| --- | --- | --- |
| FORM-01 | Submit trống; tên chỉ whitespace; email sai định dạng; brief dưới 10 ký tự sau trim | Bị chặn bằng validation; focus/thông báo hướng dẫn đúng; không tạo mailto sai |
| FORM-02 | Sửa trường sau lỗi | Custom validity được xóa đúng khi nhập lại; dữ liệu hợp lệ tiếp tục được |
| FORM-03 | Nhập hợp lệ, chọn nhiều dịch vụ rồi bỏ một | `aria-pressed` và danh sách brief khớp đúng các dịch vụ đang chọn |
| FORM-04 | Soạn email với tên/brief tiếng Việt và ký tự `&`, `+`, xuống dòng; có và không có công ty | Recipient đúng, subject dùng công ty hoặc tên, body giữ nội dung/encoding; fallback brief xuất hiện; không báo đã gửi mail |
| FORM-05 | Sao chép trên secure context cho phép clipboard | Nội dung clipboard đủ tên/email/công ty nếu có/dịch vụ/brief; toast nói đúng việc đã copy |
| FORM-06 | Clipboard bị từ chối/không khả dụng | Textarea fallback xuất hiện, nhận focus và chọn text; người dùng copy thủ công được |
| FORM-07 | Brief gần maxlength 1800, tên 80, email 120, công ty 100 | Không vỡ layout; dữ liệu giữ đúng giới hạn; nếu mail client giới hạn URL dài, fallback vẫn lấy được brief |
| CONTACT-01 | Kiểm tra email, hotline, văn phòng, Facebook và link video gốc | Href đúng dữ liệu nguồn; external tab có `noopener noreferrer`; không thực hiện cuộc gọi/gửi tin thử |

Native validation cho email phụ thuộc browser; xác nhận input `type=email` và hành vi thực tế, không tự viết parser mới nếu không có vấn đề cần giải quyết.

## 4. Accessibility, nội dung và vận hành

| ID | Kiểm tra | Điều kiện đánh giá |
| --- | --- | --- |
| A11Y-01 | Keyboard từ đầu trang, skip link, focus-visible, controls | Hoàn thành luồng chính; focus nhìn thấy; phần tử ẩn không nằm trong đường Tab ngoài ý muốn |
| A11Y-02 | Accessible name, heading, image alt, trạng thái filter/menu, status toast | Tên tương tác rõ; hierarchy hợp lý; alt phân biệt ảnh nội dung/trang trí; thông báo không gây spam |
| A11Y-03 | Reduced motion | Khi bật, giảm animation/transition và dùng scroll không mượt theo mã; thao tác vẫn dùng được |
| A11Y-04 | Contrast, zoom, touch target | Ghi cặp màu/kích thước/trạng thái cụ thể; sửa vấn đề đo được; không dùng audit tự động đơn lẻ để tuyên bố đạt chuẩn toàn diện |
| UI-SPACING-01 | Nhóm nút độc lập/tab dạng nút vừa thêm hoặc đổi layout, desktop và mobile áp dụng | Theo DESIGN D07.2: mép vùng bấm cách nhau ít nhất 8 CSS px theo hàng/cột; không dính viền, không overlap, xuống dòng vẫn có gap; target cao ≥44px, nhãn và focus không bị cắt. Kiểm render và đo từng cặp trong nhóm, cả nhãn dài/disabled khi áp dụng; ghi viewport, gap đo được và ảnh. Không suy PASS từ build/tests hoặc page-level no-overflow. Chỉ kiểm nhóm bị tác động, không tự chạy lại full suite/harness. |
| CONTENT-01 | Đối chiếu case, dịch vụ và contact với source JSON/PDF | Không thêm scope/kết quả/testimonial/claim IP thiếu nguồn; provenance metadata không bị đưa lên UI |
| TECH-01 | Console và Network khi tải, filter, mở case, play, copy | Không có uncaught error hoặc asset nội bộ 404 liên quan luồng; phân biệt vấn đề extension, mail handler và third party |
| TECH-02 | Metadata và canonical | Preserved baseline URL values là historical read-only; generated CMS artifact dùng validated local config. Kiểm static title/description/OG/canonical values và local asset existence, không fetch live canonical/og:image |
| TECH-03 | Kiểm tra khi tắt JS | Ghi chính xác giới hạn hiện có: project có link PDF noscript, services động trống; không tuyên bố tương tác hoạt động không cần JS |
| PERF-01 | Đo tải trang với điều kiện ghi rõ | Ghi browser/throttle/cache/viewport và số đo thực tế; phân biệt dung lượng bundle với transfer ban đầu |

Website chưa có file `404.html`, `robots.txt` hoặc sitemap trong snapshot. Firebase có thể xử lý URL không tồn tại bằng trang mặc định; không coi thiếu custom 404 là outage. Nếu thêm routing/path mới trong scope Approved, cập nhật local serving/export tests và local config theo hành vi thật; root Hosting config là historical read-only. Không tự thêm SPA rewrite cho trang anchor hiện tại.

## 5. Điều kiện hoàn tất mốc phát triển

- Local chạy được; các thay đổi đáp ứng mục tiêu cụ thể và giữ kiến trúc/nguồn thương hiệu đã thống nhất.
- Mọi lỗi nghiêm trọng phát hiện trong phạm vi đã chạy được sửa và retest; lỗi còn lại có mô tả rõ, mức ảnh hưởng và quyết định giữ/hoãn.
- Ma trận luồng chính có kết quả thực tế trên desktop và mobile khả dụng. Hạng mục không chạy được mang nhãn “chưa chạy” cùng lý do; không được ghi pass hộ.
- Các vùng layout vừa sửa có ảnh trước/sau hoặc bằng chứng tương đương, được kiểm tra lại ở breakpoint liên quan.
- Dữ liệu nội dung, asset, source JSON và số lượng trên UI đồng bộ; form vẫn đúng khả năng mailto/copy.
- Diff không chứa credential, token, key, dữ liệu thật của khách hoặc thay đổi ngoài scope; chỉ có thư mục public dự định được phục vụ.
- Báo cáo cuối nêu thay đổi, lý do, cách kiểm tra, giới hạn còn lại và trạng thái URL local/preview/production thật. Việc hoàn tất mốc local không đồng nghĩa đã release.

Deployment ngoài gói theo [Ranh giới local](DEPLOYMENT.md).

## LOCAL_COMPLETE và nghiệm thu

LOCAL_COMPLETE chỉ được ghi khi toàn CMS local đã đạt:

- Editor quản lý toàn bộ section và variant đã engineered/Approved; schema, nguồn claim và asset refs đúng, không arbitrary theme/code.
- Media local có quarantine, MIME/size/decode validation, derivatives, rights/provenance; original/private metadata không lọt public projection.
- Authenticated full-site preview đúng revision; logout xóa private preview/token; ACL chặn anonymous/unknown/inactive/unverified, role tamper và self-review kể cả OWNER.
- Save có revision conflict/idempotency; immutable snapshot và exact-hash review; local publication tạo full-site static artifact, history/current pointer và rollback giữ draft hiện tại.
- Unit, Rules/ACL, API integration, browser desktop/mobile và static SEO/XSS/workflow/rollback regressions có evidence thật; runbook setup/backup/restore lặp lại được; usability và limitations được báo rõ.

High technical review đạt và LOCAL_COMPLETE kỹ thuật chưa phải nghiệm thu người dùng. Ghi user local acceptance riêng bằng lời/reference thực tế; không tự điền vào ledger. M1 closed không cho phép tự implement M2–M4.
