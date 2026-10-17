# MULTILINGUAL-001 — P2 v1: switch ngôn ngữ và điều hướng website

## Trạng thái hiện hành — đã hoàn tất theo xác nhận của Khiêm

**ĐÃ HOÀN TẤT / CLOSED_BY_HUMAN_CONFIRMATION — 17/10/2026 (Asia/Ho_Chi_Minh).** Xem [xác nhận trực tiếp, phạm vi đóng và bảng trạng thái hiện hành](../../tasks/plan.md). Khiêm xác nhận các plan đã xong và giao chỉ đồng bộ tài liệu, không sửa code hoặc chạy lại kiểm thử.

Các trạng thái chờ duyệt/chưa hoàn tất, checkbox và bước tiếp theo trong phần bên dưới thuộc lịch sử trước xác nhận đóng; không tự mở lại plan/task từ các ghi nhận đó. Giữ nguyên bằng chứng PASS/FAIL/NOT_RUN, cờ kỹ thuật và giới hạn đã ghi nhận. Lần đồng bộ này không xác minh runtime, không ghi nhận release hoặc cấp quyền thực thi mới.

## Nội dung lịch sử trước xác nhận đóng


Ngày 16/10/2026, Asia/Ho_Chi_Minh. **CODE_COMPLETE / VERIFIED_LOCAL_SCOPED / READY_FOR_HUMAN_REVIEW**. Owner: root. Người dùng duyệt trực tiếp ngày16/10/2026: `Approved MULTILINGUAL-001 P2 v1 — switch/navigation QA local theo mockup và scope đã trình`. Approval chỉ mở P2 QA local; P1 acceptance vẫn mở.

## Trạng thái P1 và ranh giới chuyển tiếp

P1 source và luồng OWNER chính đã hoàn tất: unit64/64, browser22PASS/1AuthSKIP,10corecases thật đạt,8commits khôi phục đúng nội dung; QA2 có30file khớp hash và12view hiển thị đạt. Whole live test chưaPASS vì cleanupB chưa chứng minh; logoutA/privateDOMremoval đạt. Role khác/IME/human visual acceptance vẫn mở. [AC P1 hiện hành](MULTILINGUAL-001-P1-v2.md#9-evidence-hiện-hành--p1-chưa-đóng). Không lặp flow ghi dữ liệu để kiểm logout. P1 vẫn IN_PROGRESS.

P2 được triển khai theo đúng HTML và bundle đã duyệt; bản bundle trước cập nhật trạng thái được giữ trong evidence preflight. P2 không sửa CMS/P1 Hero UI, Auth/ACL/CSP private, dữ liệu hay Hosting5010. Activation website5010 thuộc P7. M3/M4/LOCAL_COMPLETE/cloud/Production giữ nguyên.

## Kết quả người dùng nhìn thấy

- Desktop: switch sau nav, trước CTA; nút hiện EN/VI/JA. Popup có English, Tiếng Việt, 日本語, đánh dấu ngôn ngữ đang chọn; không dùng cờ.
- Mobile: switch luôn thấy ngoài hamburger. Nav mở/đóng riêng; chọn ngôn ngữ không cần đi qua menu. Footer có cùng lựa chọn, cùng nguồn state.
- Hero giữ composition đã duyệt. Nội dung mẫu trong mockup là minh họa, không phải bản dịch editorial đã nghiệm thu.
- Website đích: `/`=EN, `/vi/`=VI, `/ja/`=JA. URL là nguồn locale; không IP/browser auto-switch, không preference hoặc brief vào localStorage/sessionStorage/cookie.
- Mockup dùng `?locale=...` dưới đường HTML để duyệt tương tác/back-forward; dòng route đích chỉ minh họa. Mockup không chứng minh direct route của sản phẩm đã tồn tại.

## Quy tắc tương tác xin duyệt

1. Chọn locale hiện tại: đóng popup, không reset form/modal/filter hoặc thêm history. Escape/click ngoài đóng popup; focus trở về opener. Native dialog giữ focus và Escape=ở lại.
2. Chuyển locale khác: giữ section và filter stableID hợp lệ. URL query chỉ allowlist trường đã định nghĩa, không sao chép query tùy ý hoặc dữ liệu cá nhân. Một điều hướng chỉ thêm một history entry; back/forward đồng bộ locale/UI/context.
3. Project modal có bản đích: giữ đúng entityID. Thiếu bản đích: đóng modal, về `#work`, giữ filter nếu hợp lệ, thông báo bằng ngôn ngữ đích; không mở item khác hoặc fallback text tiếng Anh âm thầm.
4. Brief có dữ liệu chưa gửi: **Ở lại** (mặc định) / **Bỏ nội dung và chuyển**. Ở lại giữ cả locale/context/input. Chỉ explicit discard mới xóa brief và chuyển. Back/forward cũng qua guard; nếu ở lại thì phục hồi history cursor, không tạo vòng lặp hay duplicate entry. Reload/tabclose dùng beforeunload khi dirty; không hứa giữ input sau người dùng xác nhận reload/close.
5. Không thực hiện fetch hoặc dịch tự động khi chọn locale. Dictionary chỉ dịch nhãn UI/nav/aria/notice/brief validation; nội dung doanh nghiệp chưa có bản dịch sẽ theo availability. Các bản projection P3/P4 sẽ cung cấp dữ liệu cùng stableID.

## Phạm vi implementation đề nghị

Một lát cắt QA của website: resolver/locale dictionary → header/mobile/footer controls → context/brief guard → export ba routes trên output riêng. P2 xây cơ chế thật và kiểm trên QA, không phục vụ toàn bộ nội dung đa ngôn ngữ đã duyệt ở5010.

- Tái sử dụng helper renderer, artwork/fonts có sẵn; sửa header/footer/interactions theo context tùy chọn cho locale shell. Callers hiện tại không truyền context giữ hành vi cũ; không đổi contract/port allowlist của full-site media renderer.
- Module QA riêng ghép Hero QA2 đã được xác minh với shell/section/project minh họa có nhãn rõ. Chỉ đọc safe QA bundle có sẵn hoặc fixture; không raw private snapshot, không thêm authenticated endpoint. Thiếu mandatory locale content vẫn không eligible cho P7.
- QA top-level giữ chính sách tương đương export site hiện có: script/style/font/image cùng origin, connect/object/base deny; không sửa CSP của CMS hoặc sandbox/private preview. JS xuất file ngoài, không inline script, không wildcard/origin mới. Không kích hoạt chức năng gửi brief thật trong kiểm thử.
- Xuất `/index.html`, `/vi/index.html`, `/ja/index.html` với resource paths đúng theo độ sâu; noindex và nhãn QA. Unknown locale path trả404 trên QA server; resolver từ chối locale/query/URL không hợp lệ. Không đánh đồng mockup query với contract route sản phẩm.

**Không thuộc P2:** CMS nội dung ngoài Hero/P3/P4; gửi duyệt/P5; import/migration/P6; activation5010/P7; SEO canonical/hreflang/sitemap hoàn chỉnh/P4; publish/cloud; media processing; sửa Auth hoặc private CSP. Không thêm account/role/token hoặc ghi CMS data.

## Files dự kiến và ownership

Đây là allowlist **đã được duyệt** trong P2 v1. Một implementer giữ source; root giữ records. Chỉ giới hạn các phần cần cho P2, không refactor modules chung.

Existing: `pinky-lamb-cms/preview/site-sections.mjs`, `pinky-lamb-cms/preview/site-interactions.mjs`, `pinky-lamb-cms/preview/site-interactions.css`.

New: `pinky-lamb-cms/preview/site-locale.mjs`, `pinky-lamb-cms/preview/site-locale-copy.mjs`, `pinky-lamb-cms/preview/site-localized-qa.mjs`, `pinky-lamb-cms/scripts/export-multilingual-shell-local.mjs`, `pinky-lamb-cms/tests/site-locale.test.mjs`, `pinky-lamb-cms/tests/site-locale-ui.local.test.mjs`, `pinky-lamb-cms/tests/multilingual-shell-export.test.mjs`.

Protected: tất cả `admin/**`, `cms-api/**`, `contracts/hero-localization*`, P1 Hero renderer/presentation/preview, `site-media-renderer.mjs`, `site-public-data.mjs`, exporters hiện có, `dist/**`, `public-baseline/**`, infra/config, mockup P1 và evidence lịch sử. Nếu cần sửa ngoài10files phải trình delta trước.

## Tasks và AC

| Task | Files | Điều kiện đạt và kiểm |
| --- | --- | --- |
| T00 — Design/baseline | mockup3files +scope/docs | HTML desktop/mobile/footer và2guard được duyệt; ghi hashes; source/data/5010 read-only trước triển khai |
| T01 — Locale/context rules | site-locale.mjs, site-locale-copy.mjs, site-locale.test.mjs | ROOT/VI/JA strict; query/section/filter/entity allowlist; same-locale no-op; history/dirty decisions; Unicode labels; unit rules |
| T02 — Controls và guards | site-sections.mjs, site-interactions.mjs, site-interactions.css, site-locale-ui.local.test.mjs | Desktop1440/mobile390 +768/320; popup/menu/footer/focus/Escape; dirty ở lại/discard; same entity hoặc missing fallback đúng; old callers regression |
| T03 — QA ba routes | site-localized-qa.mjs, export-multilingual-shell-local.mjs, multilingual-shell-export.test.mjs, UItest | Safe bundle/resource length/hash; exclusive output/no symlink/no overwrite; direct/refresh/back-forward3routes, UTF8/font/assets/subpaths; noindex, no private leak; chưaactivation5010 |
| T04 — Review/handoff | scoped evidence +records | Source allowlist, protected hashes và retaineddata không đổi; actualcommands/results; FAIL/NOT_RUN riêng; human UI/design approval khác product acceptance |

AC bắt buộc: đúng mockup; EN default không flash VI; locale URL authoritative; hai guard không làm mất input/ngữ cảnh ngoài explicit choice; context giữ stableIDs; labels/aria cùng locale; keyboard/touch targets không bị cắt; cả3routes/resources đúng; old callers không đổi; không private data/PII storage/CMS writes/5010 activation. Chọn checks theo rủi ro; không chạy lại P1 mutation test hay M3 fullsuite.

## Runtime, dữ liệu và bàn giao

Chỉ local; pinned Node22.23.3/tooling hiện có, không install/dependency mới. Unit/contract không network; browser phục vụ task-owned QA output loopback4175 sau Approved, không dùng/cắt4173/4174/4186/5010. Output mới trong `.local/test-outputs/multilingual-001/p2-v1/`, `.local/exports/multilingual-001/p2-v1/`, `.local/cache/multilingual-001/p2-v1/`. Không overwrite output cũ. Dataset giả mang nhãn minh họa; không test gửi email/brief thật.

**Retained CMS writes:0. Emulator lifecycle:0. Auth/session/account changes:0.** Không cần đăng nhập OWNER hoặc chờ role mới để kiểm switch QA. Kết quả chưa chạy ghi NOT_RUN. Source-only/documentation/design không tạo quyền product implementation.

## Phê duyệt

Sau khi HTML, source pins và scope được freeze, lời duyệt đề nghị: **`Approved MULTILINGUAL-001 P2 v1 — switch/navigation QA local theo mockup và scope đã trình`**. Người dùng đã gửi nguyên câu này; approval hiện hành được ghi trong scope manifest. P1 không bị đóng hoặc xóa các tiêu chí còn mở bằng lời duyệt này.

## Kiểm chứng mockup trước duyệt

Đã xem browser tại1440/390/768/320px: switch/popup không bị cắt, ảnh/font đủ; Stay/discard, giữCASE1 EN→VI, thiếuJA vềWork+notice, back/forward và dirtyback Stay/discard đạt trong dữ liệu minh họa. Viewport đãreset. [Evidence](../.local/test-outputs/multilingual-001/p2-v1/design-review-20261016/render-result.json). Đây không phải P2applicationruntimePASS. Mockup server4186 phục vụ snapshot chỉ14file publicdesign/assets, không expose sourceCMS/private.


## Kết quả thực thi — 16/10/2026

P2 hoàn tất source và kiểm thử đúng 10 paths, bám mockup đã duyệt. [Tổng evidence](../.local/test-outputs/multilingual-001/p2-v1/implementation-20261016/execution-summary.json). QA chạy tại **http://127.0.0.1:4175/**: `/` = EN, `/vi/` = VI, `/ja/` = JA.

Trang QA ghép Hero QA2 đã lưu của P1 với shell, project và brief minh họa. Nội dung này chưa phải toàn bộ website đa ngôn ngữ hoặc bản dịch đã được duyệt editorial. CMS và website :5010 giữ nguyên.

| Kiểm tra | Kết quả và giới hạn |
| --- | --- |
| Unit/export và legacy renderer | **30/30 PASS**. Lệnh: pinned Node22 `--test tests/site-locale.test.mjs tests/multilingual-shell-export.test.mjs tests/site-renderer.test.mjs` |
| Browser hiện hành | **8 ca đạt qua các lượt kiểm**: r5 có 7 PASS/1 FAIL do điểm click bị popup che. R6 sửa điểm click vào QA banner, giữ nguyên assertions; ca bị ảnh hưởng đạt 1/1. Product bytes r5 không đổi. Không tuyên bố có một full run mới đạt 8 PASS |
| Hủy reload | Listener dialog giữ liên tục; sau khi hủy, brief và document identity giữ nguyên. Lệnh reload của Playwright timeout 10 giây vì không có navigation hoàn tất; không giảm assertions |
| Lint | **9 JS files PASS**. Không cần build CMS cho các module/export QA độc lập này |
| UI | Root đối chiếu 1440×900 và 390×844 trước mở rộng; đã xem hai PNG cuối từ browser test. Browser bổ sung 768/320px, trigger tối thiểu 44px, popup không bị cắt, menu/footer/focus đúng |
| Điều hướng | Direct/refresh, Back/Forward, guard brief, giữ entity/filter và missing JA về Work có thông báo đều đạt. Switch không tạo request mới hoặc lưu preference/brief vào storage |
| Export/HTTP | **17 files** khớp hash/size qua HTTP :4175. Route/query không hợp lệ trả 404. Input/output/manifest, symlink, overwrite và integrity được kiểm trước phục vụ |
| Preservation | **398 protected hashes và 2.193 retained-disk entries giữ nguyên**; HTTP :5010 giữ nguyên hash. Live database inventory chưa chạy; so sánh disk không phải bằng chứng toàn bộ database |
| Review | Native `kit-reviewer`: **PASS_SOURCE**, không còn finding cần sửa trong 10 paths. Source review không thay nghiệm thu của người dùng |

Giữ layout header theo thứ tự nav → switch → CTA; mobile switch ngoài hamburger; footer có ba lựa chọn. Dirty dialog dùng native dialog, mặc định “Ở lại”, Escape giữ dữ liệu. Loại phần debug/query locale chỉ dành cho prototype; thay bằng route thật và nhãn QA. Hero lấy từ safe QA2, không sửa media hoặc dữ liệu nguồn P1.

**Thử trực tiếp:** đổi EN → VI → JA ở header/footer; nhập brief giả rồi chọn “Ở lại” hoặc “Bỏ nội dung và chuyển”; mở CASE1 ở EN/VI rồi chuyển JA để kiểm thông báo, vị trí Work và filter. Form QA không gửi thông tin.

**Bàn giao:** source đã tích hợp; chức năng/UI trong phạm vi QA local đã kiểm chứng; human acceptance **PENDING**. P1 giữ các tiêu chí còn mở; P3–P7 chưa Approved. Không có Auth/data write, emulator restart, install, Git, deploy hoặc activation :5010. Native roles Medium/High đã được chọn; provider telemetry vẫn Unknown.
