# CMS-LOGO-LOCAL-001 — Logo, font và artwork cùng origin; rà phụ thuộc :5010

Ngày: 19/10/2026, Asia/Ho_Chi_Minh. Chủ thực hiện và ghi hồ sơ: phiên chính.

## Trạng thái hiện hành — preview dùng :4189

Theo chỉ đạo tiếp theo của Khiêm, CMS `5273` và website dữ liệu `4189` hiện không cần template HTTP `5010`. Preview lấy stylesheet/public assets từ `4189`; media riêng tư giữ API xác thực CMS. Đã kiểm tra trực tiếp preview Dự án, Dịch vụ và Hero trên Edge khi `5010` tắt; 66 tests liên quan, lint và build PASS. Backend CMS đã được nạp lại. Source launcher cũng đã chuyển sang `4189`, nhưng chưa chạy thay thế toàn bộ stack bằng launcher mới.

Snapshot/artifact cũ không bị ghi lại: URL nguồn và SEO metadata lịch sử được giữ nguyên trong bản đã khóa. Lớp transport không tải từ URL nguồn `5010`; export mới dùng metadata `4189`. Chi tiết và giới hạn nằm trong mục “Bổ sung — CMS và preview độc lập template HTTP :5010” ở cuối hồ sơ. Các mục trước đó là bằng chứng từng lần sửa, không thay thế chỉ đạo hiện hành này.

## Yêu cầu và quyền thực hiện

Khiêm duyệt trực tiếp: “Duyệt sửa để CMS tự phục vụ logo, không phụ thuộc cổng 5010. Sửa và kiểm tra lại trên giao diện. Sau đó tìm những thứ cũng đang phụ thuộc 5010 trên CMS này!”

Phạm vi: sửa logo sidebar, kiểm tra local và rà mã nguồn các phụ thuộc :5010 còn lại. Các phụ thuộc khác chỉ được khảo sát trong nhiệm vụ này. Không mở lại kế hoạch CMS đã đóng; không đổi dữ liệu, seed, publication, services hoặc Git.

## Kết quả — Verified

- `admin/index.html`: đổi nguồn mascot từ `http://127.0.0.1:5010/assets/pinky-mascot.webp` sang `/assets/pinky-mascot.webp`.
- `admin/assets/pinky-mascot.webp`: bản sao nguyên byte từ `public-baseline/assets/pinky-mascot.webp`. SHA-256 cả hai: `a7b5dbd5ce3aba41395f8d48416f312fec1542af04c57afa49e1e961f2744d00`. Không thay file nguồn.
- Vite hiện có dùng `admin` làm root và cho phép phục vụ file bên trong root. Không sửa Vite config, CSP, quyền filesystem hoặc API.
- Edge, tab CMS đã đăng nhập tại `http://127.0.0.1:5273/login`: ảnh có `src=http://127.0.0.1:5273/assets/pinky-mascot.webp`, `complete=true`, kích thước ảnh gốc 969 × 905, khung hiển thị 42 × 42. Form biên tập đã tải xong. Không bấm lưu/publish.
- `lsof -nP -iTCP:5010 -sTCP:LISTEN` không có listener tại thời điểm kiểm tra. Logo vẫn hiển thị. Vite tự nạp lại HTML; không khởi động lại dịch vụ.
- Ảnh giao diện: [logo-edge.png](evidence/CMS-LOGO-LOCAL-001/logo-edge.png).

## Kiểm tra

Các lệnh dưới chạy trong `pinky-lamb-cms`, dùng Node có sẵn `.local/cache/node/node-v22.23.3-darwin-arm64/bin/node` (gọi là `$NODE` trong mô tả).

| Kiểm tra | Kết quả |
| --- | --- |
| `$NODE --experimental-vm-modules --test --test-name-pattern='sidebar mascot' tests/cms-ux-003-shell.test.mjs`, trước sửa HTML | FAIL đúng nguyên nhân: origin thực tế :5010 thay vì :5273 |
| `$NODE --experimental-vm-modules --test --test-name-pattern='sidebar mascot\|template sidebar branding' tests/cms-ux-003-shell.test.mjs`, sau sửa | PASS, 2/2; kiểm tra cùng origin, file thực và byte ảnh gốc |
| `$NODE --experimental-vm-modules --test tests/cms-ux-003-shell.test.mjs` | 26 PASS, 1 FAIL có sẵn; không báo cả bộ PASS |
| Bản test gốc trước sửa, chạy bằng Node ESM eval tại thư mục tests | 25 PASS, cùng 1 FAIL về nhãn review; bản gốc lưu tạm tại `/private/tmp/pinky-logo-local-before/` |
| `$NODE node_modules/eslint/bin/eslint.js tests/cms-ux-003-shell.test.mjs` | PASS |
| `$NODE scripts/local-guard.mjs build` | PASS; sinh `admin-dist/assets/pinky-mascot-C8Qs_uKQ.webp`, HTML build tham chiếu ảnh này, byte ảnh build khớp ảnh nguồn CMS |
| Edge quan sát ảnh và màn hình CMS đã đăng nhập | PASS cho logo desktop trên tab hiện tại |

Lỗi test có sẵn: `localized D5 owns review chrome synchronously and after async context events, then restores other views` mong nhãn `Gửi và duyệt`, thực tế `Xuất bản`. Bản trước thay đổi cũng lỗi giống hệt. Không sửa hành vi hoặc assertion không liên quan.

Review tuần tự bởi chính phiên thực hiện: diff HTML chỉ đổi URL ảnh; test thêm kiểm tra regression; asset nguyên byte. Không có reviewer độc lập. Build không phải release hoặc nghiệm thu toàn CMS. Mobile và toàn bộ luồng preview/publication không chạy trong nhiệm vụ logo.

## Phụ thuộc :5010 còn lại — Verified từ source

Đây là khảo sát sau lần sửa logo, trước lần chuyển font/artwork được Khiêm duyệt tiếp. Kết quả thực hiện mới nằm trong mục “Bổ sung — chuyển font và artwork giao diện CMS” ở cuối hồ sơ; các dòng tham chiếu bên dưới là bằng chứng tại thời điểm khảo sát cũ.

Đây là các nhóm chức năng, không phải số lỗi runtime. File có URL/allowlist/nhãn :5010 chưa tự chứng minh có request ở mọi thao tác. Phân biệt phụ thuộc HTTP với cấu hình, ràng buộc nguồn và metadata xuất bản.

| Nhóm | Nguồn chính | Ảnh hưởng/điều kiện |
| --- | --- | --- |
| Font giao diện CMS | `admin/admin.css:1–3`, `admin/cms-studio-shell.css:2` | Montserrat 400/600/700 và PinkyStudio 400 tải từ :5010. Nếu font chưa có cache và :5010 không phục vụ, trình duyệt dùng font dự phòng. Chưa xác minh font thực tế được render. |
| Font và artwork đo bố cục bản dịch | `admin/project-localization-editor.css:146–150,338`, `admin/service-localization-editor.css:146–150,338` | Abril Fatface, Montserrat 400/600/700/800 và `brand-diagonal.webp` còn URL :5010; bề mặt dùng các rule này có thể mất artwork hoặc đo dòng khác. |
| Preview website/đối chiếu nội dung gốc | `admin/config-local.mjs:3`, `admin/preview.mjs:51–55`, `admin/hero-localization-preview.mjs:26`, `admin/project-localization-preview.mjs:17`, `admin/full-site-localization-preview.mjs:15` | Luồng legacy Hero đọc `/index.html`; các preview tải CSS/font/media nguồn khi cần. Backend dựng URL :5010 trong `cms-api/hero-localization-context.mjs`, `project-localization-context.mjs`, `group-localization-context.mjs`, `site-locale-projections.mjs`. CSS có thể đã inline, ảnh có thể đã thành data/blob hoặc media CMS, nên mức phụ thuộc tùy tài nguyên và luồng. |
| Media legacy trong preview | `admin/site-media-preview.mjs:123,188`, `preview/localized-resource-transport.mjs:11` | Tài nguyên `LEGACY` còn tải từ :5010; media derivative qua API CMS là nhánh khác. Không kết luận mọi media trong thư viện đều phụ thuộc :5010. |
| Chuẩn bị bản xuất và khởi tạo từ nguồn gốc | `admin/localized-release-preparation.mjs:24,62`, `scripts/hosting-source-seed.mjs:12`, `cms-api/local-website.mjs:40,63` | Release preparation kiểm tra/tải resource nguồn :5010 khi cần. Seed capture thực sự fetch file nguồn qua :5010; các bước dùng nguồn đã capture có thể đọc từ disk. Không chạy seed hoặc xuất bản để kiểm tra. |
| Hợp đồng nguồn, bảo vệ preview | `admin/index.html:6`, `contracts/*localization-records.mjs`, `preview/*renderer.mjs`, `preview/localized-resource-transport.mjs` | CSP, URL schemas, pin và origin checks vẫn cố định :5010. Đây là ràng buộc nguồn/an toàn, không phải toàn bộ đều là request. Nếu chuyển preview sang nguồn khác phải sửa đồng bộ producer, consumer và checks; không chỉ thay chuỗi port. |
| Vận hành website local, export và metadata | `scripts/run-durable-stack.mjs:41,112`, `scripts/serve-public-baseline-local.mjs`, `scripts/export-multilingual-site-local.mjs:32–50`, `scripts/activate-multilingual-site-local.mjs`, `scripts/multilingual-site-artifact.mjs` | Runner quản lý/check readiness website :5010. Artifact listener/activation dùng :5010 có chủ đích; canonical/hreflang/sitemap còn ghi origin local :5010. Metadata là phụ thuộc địa chỉ, không đồng nghĩa build cần server đang chạy. |

Phạm vi rà: `.mjs/.css/.html/.json` trong `admin`, `preview`, `contracts`, `cms-api`, `scripts`, tìm `5010` và `LOCAL.hosting`, rồi đọc các nguồn liên quan. Không tính kết quả test/docs/archive/build thành phụ thuộc đang chạy. Các tham chiếu provenance, runtime attestation và công cụ recovery được giữ là nguồn lịch sử/cấu hình, không được suy thành tính năng đang dùng. Danh sách theo file ở dưới chỉ là chỉ mục tìm kiếm, không phải 50 phụ thuộc runtime.

## Giới hạn và bước tiếp theo

- Verified: logo CMS đã độc lập :5010. Các phụ thuộc khác được xác định từ source.
- Unknown: từng luồng preview, seed, release hoạt động ra sao khi :5010 tắt; chưa chạy các luồng đó. Không suy tất cả đều hỏng từ một lần scan.
- Đề xuất ưu tiên: Khiêm duyệt chuyển font/artwork thuộc giao diện CMS sang cùng origin, để giao diện ổn định khi website local tắt.
- Tùy chọn tiếp theo: Khiêm duyệt phạm vi tách tài nguyên preview legacy khỏi HTTP :5010; cần giữ resource identity, MIME, hash, ACL và CSP. Website được xuất bản tại :5010 có thể giữ vai trò riêng.


## Chỉ mục tham chiếu theo file sau khi sửa logo

50 file khớp trong phạm vi tìm kiếm; một file có thể chỉ chứa cấu hình hoặc ghi nhận nguồn.

| File | Dòng |
| --- | --- |
| `admin/admin.css` | 1, 2, 3 |
| `admin/cms-studio-shell.css` | 2 |
| `admin/config-local.mjs` | 3 |
| `admin/full-site-localization-preview.mjs` | 15 |
| `admin/hero-localization-preview.mjs` | 26 |
| `admin/index.html` | 6 |
| `admin/localized-release-preparation.mjs` | 24, 62 |
| `admin/preview.mjs` | 51, 54, 55 |
| `admin/project-localization-editor.css` | 146, 147, 148, 149, 150, 338 |
| `admin/project-localization-preview.mjs` | 17 |
| `admin/service-localization-editor.css` | 146, 147, 148, 149, 150, 338 |
| `admin/site-media-preview.mjs` | 123, 188 |
| `preview/full-site-localization-renderer.mjs` | 45, 47 |
| `preview/hero-localization-renderer.mjs` | 26, 29, 37, 56 |
| `preview/localized-resource-transport.mjs` | 11 |
| `preview/project-localization-renderer.mjs` | 12, 13, 35 |
| `preview/service-localization-renderer.mjs` | 13, 19 |
| `preview/site-media-renderer.mjs` | 15 |
| `preview/site-renderer.mjs` | 9 |
| `preview/work-services-localization-renderer.mjs` | 30, 51 |
| `contracts/baseline-provenance.json` | 3327 |
| `contracts/group-localization-records.mjs` | 13 |
| `contracts/hero-localization-records.mjs` | 27, 30 |
| `contracts/localized-review-records.mjs` | 16 |
| `contracts/media-pdf-local-runtime-v1.json` | 1 |
| `contracts/media-v3-attestations.mjs` | 21 |
| `contracts/media-v3-content.mjs` | 20 |
| `contracts/media-v3-records-v2.mjs` | 32 |
| `contracts/media-v3-records.mjs` | 36 |
| `contracts/project-localization-records.mjs` | 20 |
| `contracts/site-draft.mjs` | 16 |
| `cms-api/group-localization-context.mjs` | 11 |
| `cms-api/hero-localization-context.mjs` | 16, 37 |
| `cms-api/local-website.mjs` | 40, 63 |
| `cms-api/project-localization-context.mjs` | 13, 15 |
| `cms-api/site-locale-projections.mjs` | 16 |
| `scripts/activate-multilingual-site-local.mjs` | 10, 16, 24, 25, 36, 61, 75, 76, 95, 103 |
| `scripts/export-multilingual-site-local.mjs` | 32, 33, 50 |
| `scripts/hosting-source-seed.mjs` | 8, 12, 18 |
| `scripts/local-data-cutover.mjs` | 28, 47 |
| `scripts/local-guard.mjs` | 16, 86, 626, 1163 |
| `scripts/m2-recovery-profile.mjs` | 82, 216, 234 |
| `scripts/map-baseline-site.mjs` | 114 |
| `scripts/multilingual-browser-session.mjs` | 39 |
| `scripts/multilingual-qa-host.mjs` | 7 |
| `scripts/multilingual-site-artifact.mjs` | 17, 19 |
| `scripts/recover-auth-local.mjs` | 172 |
| `scripts/run-durable-stack.mjs` | 41, 51, 58, 61, 112, 113 |
| `scripts/run-local-stack.mjs` | 11, 115 |
| `scripts/serve-public-baseline-local.mjs` | 13, 15, 33 |


## Bổ sung — chuyển font và artwork giao diện CMS

Ngày 19/10/2026. Chủ thực hiện/ghi hồ sơ: phiên chính. Khiêm duyệt trực tiếp: “Duyệt chuyển font và artwork của giao diện CMS sang cùng origin, không phụ thuộc 5010. Sửa và kiểm tra lại trên giao diện.”

### Kết quả và phạm vi

- Đổi 16 URL trong bốn stylesheet `admin.css`, `cms-studio-shell.css`, `project-localization-editor.css`, `service-localization-editor.css` sang `/assets/...` cùng origin. Rà tất cả CSS trong `admin`: không còn URL :5010.
- Thêm bản sao nguyên byte của năm font WOFF (Abril Fatface 400; Montserrat 400/600/700/800) và `brand-diagonal.webp` vào `admin/assets`.
- Giữ nguyên family, weight, kích thước, selector, breakpoint và mọi CSS khác. Đối chiếu với bản trước sửa tại `/private/tmp/pinky-cms-fonts-before` cho thấy các stylesheet chỉ đổi tiền tố URL.
- Sao chép `FONT-NOTICES.txt` vào `admin/assets` và thêm `link rel="license"` trong HTML để bảo toàn thông báo nguồn font cả bản dev và build. File notices gốc không thay đổi.
- Không sửa Vite config, CSP, API, contracts, renderer hoặc dữ liệu CMS. Không khởi động/restart/kill dịch vụ; không seed/lưu nội dung/xuất bản/deploy/Git. Chỉ thao tác mở/đóng các màn hình đọc dữ liệu.

### Kiểm chứng — Verified

Chạy từ `pinky-lamb-cms`, `$NODE` dưới đây là `.local/cache/node/node-v22.23.3-darwin-arm64/bin/node` có sẵn.

- Trước sửa, `$NODE --test tests/cms-ui-assets.test.mjs`: FAIL đúng assertion origin của font trong `admin.css` là :5010.
- Sau sửa, `$NODE --experimental-vm-modules --test tests/cms-ui-assets.test.mjs tests/project-localization-editor.test.mjs tests/service-localization-editor.test.mjs tests/work-services-localization-editor.test.mjs`: **19/19 PASS**.
- Kiểm tra cuối bằng `--test-name-pattern` cho `CMS styles`, `sidebar mascot`, `template sidebar branding` trong `cms-ui-assets.test.mjs` và `cms-ux-003-shell.test.mjs`: **3/3 PASS**. Đây là kiểm tra phạm vi liên quan; không chạy lại toàn bộ bộ test sidebar hoặc sửa lỗi nhãn review có sẵn đã ghi bên trên.
- `$NODE node_modules/eslint/bin/eslint.js tests/cms-ui-assets.test.mjs`: **PASS**.
- `$NODE scripts/local-guard.mjs build`: **PASS**. Kiểm tra nội dung build: cả sáu tài nguyên mới có file tương ứng nguyên byte, CSS build không còn :5010, thông báo nguồn font được bảo toàn trong link license của HTML build (Vite inline nội dung notices thành data URL).
- `lsof -nP -iTCP:5010 -sTCP:LISTEN`: không có listener tại thời điểm kiểm tra.
- Edge tab đã đăng nhập ở `http://127.0.0.1:5273/login`: `body` dùng `PinkyStudio, Arial, sans-serif`; `document.fonts.status=loaded`; `document.fonts.check` cho PinkyStudio 400 và Montserrat 400/600/700 đều `true`. CSSOM của trang xác nhận nguồn font đều `/assets/...`.
- Đã mở danh sách Dự án, form Wayfair, danh sách Dịch vụ và form Brand & Creative. Font đo bố cục `ProjectMeasureMontserrat 600` và `ServiceMeasureMontserrat 400` báo đã tải. Không sửa trường hoặc bấm lưu. Trang chính và form dịch vụ không tràn ngang ở viewport desktop hiện có.
- CSSOM của trang xác nhận cả hai rule artwork dùng `url("/assets/brand-diagonal.webp")`. Mở ảnh trực tiếp trên origin CMS trong tab kiểm tra tạm: tải/giải mã thành công, `complete=true`, kích thước 1672 × 941. Đã đóng tab tạm và trả tab CMS về Đầu trang.
- `dev.logs` trả danh sách rỗng ở kiểm tra cuối. Kết luận về thiếu CSS trong iframe bên dưới dựa trên quan sát giao diện và URL nguồn trong source, không dựa vào việc console không có log.

Ảnh bằng chứng:

- [Giao diện CMS sau khi chuyển font](evidence/CMS-LOGO-LOCAL-001/fonts-edge.png).
- [Form dịch vụ](evidence/CMS-LOGO-LOCAL-001/service-fonts-edge.png).
- [Artwork được phục vụ trực tiếp từ CMS](evidence/CMS-LOGO-LOCAL-001/artwork-cms-origin.png).

### Giới hạn và review

- Review tuần tự bởi chính phiên thực hiện; không có reviewer độc lập. Không đổi layout hoặc nghiệp vụ; giữ nguyên byte nguồn và các bảo vệ hiện có.
- Mobile/responsive viewport riêng: **NOT_RUN**; bằng chứng giao diện trực tiếp là desktop hiện tại. Tests không thay thế kiểm chứng mobile.
- Các font measurement chỉ tải khi có nội dung dùng tới. `ProjectMeasureAbril`/`ServiceMeasureAbril` chưa báo loaded trong các form đã mở; không suy ra đã kiểm chứng render mọi font và mọi weight. Nguồn file, byte, CSS wiring và đóng gói của cả năm font đã được kiểm tra.
- `brand-diagonal` nằm trong rule của vùng đo bố cục ẩn; không có `.ip-section` trong dự án Wayfair vừa mở. Bằng chứng artwork là rule CSS thực tế cùng origin và ảnh HTTP giải mã được; không tuyên bố đã quan sát mọi vị trí artwork hiển thị.
- Preview website bên trong iframe vẫn dùng nguồn template/CSS :5010 theo hợp đồng riêng, giữ nguyên từ trước nhiệm vụ. Đã quan sát preview chi tiết Wayfair thiếu định dạng khi :5010 tắt. Lần sửa này không hoàn tất việc tách toàn bộ preview website khỏi :5010, và không tuyên bố toàn CMS độc lập cổng này.

### Bước tiếp theo

1. Khiêm xem/ nghiệm thu font và artwork CMS tại :5273; không cần thay đổi dữ liệu.
2. Nếu cần preview website hoạt động khi :5010 tắt, Khiêm duyệt riêng phần tách tài nguyên preview; giữ hash, MIME, ACL, CSP và resource identity.

### Hash tài nguyên được sao chép

| File | SHA-256 |
| --- | --- |
| `abril-fatface-400.woff` | `69bcdad947bd8e75608dd9b9c9316a52810a4741138dd8bb09b75408c30f7357` |
| `montserrat-400.woff` | `42970cee008d8fd45a7bb2836ea3212c11402aaa17a708990f68034846eda0f1` |
| `montserrat-600.woff` | `361d93dee1189f66e5ba91ac8eb3e0f99f599875b807e07e5738f3acb7ae861f` |
| `montserrat-700.woff` | `d0b09855fddfa2deb3cc3a5ca576d8d830d436178e39920c04a1526e1c46ec03` |
| `montserrat-800.woff` | `ccaac20ea18265a297ff438ab2954f2395c97512c8b1f6ac862ad8363fd3a1d1` |
| `brand-diagonal.webp` | `db4e953807bccc00738d0ef86abf0bfb10b064ca87766d7fe24a6d014425252a` |
| `FONT-NOTICES.txt` | `a6851476c9681331829c76cfce22722c1d0f582e97a0e12e8aebbb719dfe2eff` |


## Bổ sung — CMS và preview độc lập template HTTP :5010

Ngày 19/10/2026. Khiêm xác nhận vai trò cổng: :5010 là template gốc, :4189 là website hiển thị dữ liệu. Sau khi dừng hướng đề xuất trước, Khiêm giao trực tiếp: “Tao không muốn 5273 và 4189 còn đụng đến 5010 nữa. Preview phải dùng 4189.” Đây là phạm vi thực hiện mới trong cùng hồ sơ; không lấy quyền từ các plan CMS đã đóng.

### Thiết kế và thay đổi

- `preview/localized-resource-transport.mjs`: URL :5010 trong resource DTO là danh tính đã khóa. Kiểm tra origin/path/credentials/query/hash như trước, rồi ánh xạ đường dẫn public sang :4189 trước mọi tải hoặc render. Không sửa descriptor đầu vào, dependency hash hoặc snapshot. Derivative riêng tư vẫn được xác thực và tải qua CMS :5273.
- Cập nhật các reader Hero, Project, Full-site, Media legacy; `LOCAL.hosting`; renderer Hero/Project/Service/Work-Services/Full-site và các private site renderer để URL stylesheet, ảnh, font và CSP dùng :4189. Cả stylesheet Service và Work/Services được đưa qua resolver chung, không dùng trực tiếp `descriptor.url`.
- `admin/index.html`: CSP cho phép nguồn website :4189 và bỏ nguồn HTTP :5010. Giữ sandbox iframe rỗng, script/form/object bị từ chối trong private preview; không thêm quyền thực thi mã.
- `scripts/hosting-source-seed.mjs`: source capture đọc template đóng gói bằng reader kiểm tra file/pin hiện hữu. Không có fetch tới template server. Manifest mới dùng origin `LOCAL_PINNED_TEMPLATE`; không viết lại manifest cũ. Chỉ test việc capture vào thư mục test dùng UUID, không chạy nghiệp vụ seed retained data.
- `scripts/run-durable-stack.mjs`: thay dependency/readiness/port ownership của public website từ 5010 sang 4189 và chạy `serve-cms-website-local.mjs`. Giữ kiểm tra birth/command/PID/foreign listener và dữ liệu.
- `scripts/serve-cms-website-local.mjs`: hỗ trợ durable local guard và khởi động từ pointer hiện hữu không cần initial receipt; thiếu pointer thì từ chối, không tự tạo nội dung/seed. Lối nhận initial receipt cũ vẫn giữ cho caller đã có quyền.
- Export mới dùng canonical/hreflang/sitemap :4189. Không export hoặc activate lại bản website đang giữ trong nhiệm vụ này.
- Sửa nhãn nguồn khởi tạo trong CMS/backend thành template đóng gói; cập nhật phần hiện hành đầu `docs/LOCAL-RUNBOOK.md`, giữ phần bằng chứng cũ ngày 17/10.

### Kiểm tra developer

Các lệnh dùng Node 22.23.3 có sẵn tại `.local/cache/node/node-v22.23.3-darwin-arm64/bin/node`, chạy từ CMS root.

- Test mới `tests/cms-website-origin.test.mjs` tái hiện FAIL trước sửa: resolver/fetch/render dùng :5010 thay vì :4189. Sau sửa kiểm tra URL thực tế truyền cho fetch, không đổi QA đã khóa, từ chối path/origin/credentials/query tamper, giữ redirect error/omit credentials và sandbox/CSP.
- Ma trận renderer Service, Work/Services và Full-site cho EN/VI/JA xác nhận stylesheet :4189, HTML private không có URL :5010, DTO đầu vào không đổi. Test offline source capture đặt fetch thành hàm ném lỗi: vẫn capture đúng pinned bytes và retry giữ danh tính.
- Focused suite cuối: **66/66 PASS**, 0 FAIL, 0 SKIP. Gồm `cms-website-origin`, `hero-localization-preview`, `project-localization-preview`, `service-localization-renderer`, `work-services-localization-renderer`, `full-site-localization-renderer`, `p7-release-preparation`, `hosting-source-seed`, `site-renderer`.
- Suite chạy bằng `spawnSync` với `childEnvironment()` có sẵn của `scripts/local-guard.mjs`, không gỡ network fence hoặc sửa guard. Lần gọi trực tiếp thiếu demo environment đã được thay bằng môi trường test chuẩn. Không cần tạo/sửa harness.
- Các expected URL của private renderer/SEO đã đổi theo yêu cầu mới. Fixture/hash của export M1 lịch sử giữ nguyên, không rebaseline hash để có kết quả xanh.
- ESLint **PASS**, 24 file MJS thay đổi; `node --check` cho hai launcher **PASS**.
- `node scripts/local-guard.mjs build`: **PASS** sau thay đổi cuối.
- Logs focused checks trong `/private/tmp/pinky-4189-tests-final.log` và `/private/tmp/pinky-4189-build-final.log`; bản trước sửa của các file liên quan ở `/private/tmp/pinky-4189-before/`. Đây là bản tạm để đối chiếu, không là Git revision.

### Áp dụng runtime và bằng chứng Edge

- Trước áp dụng backend: xác minh PID 30725 là pinned Node/Vite của đúng project ở :5273, đúng thời điểm bắt đầu/command/port owner. Journal seed và publish đều `COMPLETED`.
- Chỉ gửi SIGTERM graceful tới PID CMS đó, không force signal. Mở lại cùng Vite entry/config/port bằng pinned Node và durable local guard. CMS mới PID 40971 đã listen và nhận lại session OWNER. Không sửa durable marker cũ để ép quyền sở hữu.
- Website :4189 giữ PID 30833; :5010 không có listener trước và sau kiểm tra. Không điều khiển tiến trình :4189/:5010.
- Pointer website giữ nguyên SHA-256 `915453fc961f3f79058eb4ce1925a228bf51029fa1ba2ee7012c248a25dc70a9`, artifact manifest vẫn `8fa5d019f1b080b3b0882d0424fb9398a8e9b04208f9a2ec0de02b870421da2b`. Không ghi nội dung/snapshot hoặc publish.
- Sau reload CMS, Edge xác nhận CSP không cho :5010. Preview thẻ dự án, chi tiết Wayfair, Service Brand & Creative và Hero có `href=http://127.0.0.1:4189/styles.css`, srcdoc không có URL :5010 và vẫn có `sandbox=""`. Quan sát được định dạng, font và ảnh trên preview.
- Website :4189 đang hiển thị dữ liệu CMS. Rà resource CSS/script của active artifact không có URL :5010. DOM website không có :5010 trong src tài nguyên, stylesheet hoặc liên kết thao tác của người dùng.
- Kiểm tra console cuối qua `dev.logs`: danh sách rỗng. Trả CMS về tab Đầu trang.

Bằng chứng ảnh:

- [Preview chi tiết Wayfair có định dạng từ :4189](evidence/CMS-LOGO-LOCAL-001/preview-4189-project.png).
- [Preview Service sau backend restart](evidence/CMS-LOGO-LOCAL-001/preview-4189-service.png).
- [Preview Hero dùng :4189](evidence/CMS-LOGO-LOCAL-001/preview-4189-hero.png).

### Giới hạn và bảo toàn lịch sử

- Current runtime dependency và preview đã kiểm chứng như trên. Không tuyên bố đã xóa mọi chuỗi “5010” trong repository: DTO, snapshot, provenance, runtime attestation, emulator/recovery config và records lịch sử vẫn cần danh tính gốc. Các descriptor nguồn này không phải URL được dùng để tải tài nguyên.
- Artifact website hiện hành còn 5 canonical/alternate link và một og:url trỏ origin cũ trong SEO metadata đã khóa. Các link metadata này không là request tài nguyên của CMS/website; artifact chưa được phát hành lại. Export mới đã dùng :4189. Không sửa byte/hash artifact hiện hành để che lịch sử.
- Thay thế toàn stack bằng `make run` mới: **NOT_RUN**. Hai server hiện được mở thủ công; runner đúng thiết kế phải từ chối listener không thuộc instance của nó. Cấu hình, cú pháp và dependency launcher đã kiểm tra; không suy thành startup lifecycle PASS.
- Browser full-site saved preview và mobile: **NOT_RUN**. Nút full-site saved preview không hiển thị trong workspace hiện tại; không gọi API hoặc dispatch sự kiện ẩn để giả lập thao tác người dùng. Full-site renderer có regression test EN/VI/JA; bằng chứng browser là Hero, Project và Service desktop.
- Không chạy business seed, publish, rollback, migration hoặc Git. Kiểm tra capture nguồn chỉ dùng thư mục test có UUID rồi xóa bằng cleanup của test.
- Self-review tuần tự: producer/consumer resource URL, identity/hash, ACL private media, CSP/sandbox, startup ownership và phạm vi diff. Không có reviewer độc lập; không tuyên bố acceptance của Khiêm hoặc release.

### Bước tiếp theo

1. Khiêm nghiệm thu preview tại :5273 và website dữ liệu :4189 khi template :5010 tắt.
2. Nếu muốn cập nhật cả SEO metadata của artifact đang chạy, Khiêm duyệt riêng xuất bản lại đúng bộ nội dung đã khóa; source exporter đã sẵn sàng dùng :4189.
