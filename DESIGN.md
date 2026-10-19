# DESIGN.md — Pinky Lamb

## D00. Phạm vi và trạng thái

**V2 11/10/2026:** thiết kế baseline được giữ nguyên; CMS chưa triển khai. Các bước sửa thiết kế trong tài liệu chỉ áp dụng sau Approved hợp lệ theo [APPROVAL-PROTOCOL](docs/APPROVAL-PROTOCOL.md); không cấp quyền implementation từ guideline. M1 CMS đang chờ duyệt tại [CMS-001 v2](docs/CMS-PROPOSAL-CMS-001-v2.md).

Tài liệu này ghi lại thiết kế **đang được triển khai** trong bản bàn giao ngày 10/10/2026. Đây là mốc tham chiếu cho Codex phát triển tiếp website Pinky Lamb. Tài liệu không phải bộ brand guideline hoàn chỉnh đã được khách hàng phê duyệt.

Baseline URL lịch sử (read-only): **https://pinky-lamb.web.app/**. Mã giao diện nằm trong [dist/index.html](dist/index.html), [dist/styles.css](dist/styles.css), [dist/app.js](dist/app.js) và [dist/content.js](dist/content.js). CSS hiện tại là nguồn của các thông số layout, spacing, component và breakpoint trong tài liệu này.

Nguồn nhận diện là logo, artwork, hình ảnh do người dùng cung cấp và [Pinky Lamb Credential 2026](dist/assets/Pinky-Lamb-Credential-2026.pdf). Tra cứu file gốc, file dùng trên web và mức độ xác minh tại [docs/ASSET-CATALOG.md](docs/ASSET-CATALOG.md). Mở [ASSET-INDEX.html](ASSET-INDEX.html) để xem tài sản offline.

`source-content.json` là hồ sơ nguồn/provenance. `dist/content.js` được bảo trì thủ công; không có build hoặc pipeline tự sinh nội dung giữa hai file.

Các thay đổi tiếp theo cần có mục đích cụ thể. Cập nhật tài liệu khi thay đổi quy ước chung. Không trình bày các lựa chọn UI hiện tại như quy định thương hiệu chính thức.

## D01. Tinh thần thiết kế

Pinky Lamb là **Independent Creative Production Agency & IP Studio**. Nguồn credential dùng câu “The house of all cutest things”. Giữ nguyên cách viết này khi trích slogan thương hiệu; không tự sửa câu rồi gọi đó là slogan gốc.

Website kết hợp nền trắng ấm, blush pink, chữ charcoal và điểm nhấn rose. Typography lớn tạo nhịp đọc. Ảnh dự án thực tế chứng minh năng lực sản xuất, truyền thông và sự kiện. Mascot cừu hồng tạo cá tính ở hero, khu vực IP và các chi tiết phụ.

Nguồn có mascot 3D chất liệu bóng trong cover/contact và mascot 2D từ PNG người dùng đính kèm. Giữ hai nguồn này đúng vai trò. Các motif khác gồm lông xoắn, hoa anh đào, crystal heart/star, bông trắng, vòng cung và bề mặt pastel mềm. Dùng ảnh nguồn có chọn lọc. Không thay portfolio bằng ảnh stock, hình AI hoặc logo khách hàng vẽ lại. Giữ logo và artwork đúng tỉ lệ.

Các câu “Big ideas. Lovely impact.”, “Good work. Great feelings.” và “From the first spark to the wow.” là nội dung website hiện tại. Không coi các câu này là slogan được tìm thấy trong credential.

## D02. Bằng chứng và giới hạn nguồn

| Nội dung | Đã xác minh | Giới hạn |
|---|---|---|
| Nhận diện tổng thể | Artwork gốc, bìa credential và contact guideline có mascot, sắc hồng và chữ tối | Không có quy tắc đầy đủ về clear space, kích thước logo tối thiểu hoặc grid thương hiệu |
| Màu | Một số màu lấy mẫu từ pixel; một số màu lấy từ text span trong PDF | Không thấy bảng HEX được công bố là palette chính thức |
| Font | Text layer của PDF có Abril Fatface, Montserrat, Montserrat Bold; còn có Arial và Segoe UI Symbol | Nhiều tiêu đề và wordmark đã flatten vào ảnh. Không thể suy font wordmark chỉ từ danh sách font PDF |
| Spacing, breakpoint, component | Đọc trực tiếp CSS trong bản bàn giao | Là quy ước của website hiện tại |
| Khách hàng và case | Có trang nguồn trong credential và `source-content.json` | Không suy diễn vai trò, ngân sách, kết quả, giải thưởng hoặc endorsement ngoài nguồn |

Tên file chứa “Palette” hoặc “Guideline” không tự chứng minh rằng mọi giá trị trong website là quy chuẩn thương hiệu chính thức. Nếu thiếu bản logo Drive gốc, giữ ghi chú thiếu nguồn trong asset catalog; không đổi tên badge trích PDF thành logo master.

## D03. Màu sắc

Các biến dưới đây đang tồn tại trong `dist/styles.css`. Giá trị HEX viết hoa hay viết thường có cùng ý nghĩa.

| CSS token | HEX | Vai trò hiện tại | Nguồn của giá trị |
|---|---|---|---|
| `--paper` | `#FFFAF7` | Nền trang | Lựa chọn UI trắng ấm |
| `--cream` | `#FDFBF9` | Note, nền phụ | Trùng vùng trắng ấm lấy mẫu từ artwork diagonal |
| `--blush` | `#FDE1E1` | Nền accent, control được chọn | Lấy mẫu nền cover |
| `--pink` | `#EE7085` | Accent, hình trang trí, hover | Màu phẳng của chữ LAMB/tagline trên cover |
| `--rose` | `#C1545E` | Tiêu đề lớn và accent rose | Màu text có trong PDF; không phải palette được công bố |
| `--label-rose` | `#A84450` | Nhãn rose cỡ nhỏ và dấu bắt buộc | Điều chỉnh UI nhằm tăng tương phản |
| `--ink` | `#464D55` | Chữ chính, footer | Màu phẳng của chữ PINKY trên cover |
| `--dark` | `#32383F` | Nút chính, nền tối | Lựa chọn UI |
| `--muted` | `#6C6E72` | Nội dung phụ, placeholder | Lựa chọn UI |
| `--line` | `#E5DCD7` | Divider và border | Lựa chọn UI |
| `--soft` | `#F7EFEB` | Nền media khi ảnh chưa tải | Lựa chọn UI |

Một số nền section dùng giá trị riêng: client strip `#FCF5F1`, services `#FCEBE8`, IP `#F8E9E8`. Phần IP còn có artwork diagonal mờ với opacity `0.66`.

Dùng `--label-rose` cho section number, service number, case eyebrow và dấu bắt buộc trong form. Giữ `--rose` cho tiêu đề lớn. Không dùng coral sáng làm chữ nhỏ trên nền blush nếu chưa kiểm tra tương phản.

## D04. Typography

Font được phục vụ từ `dist/assets/`. Không cần tải font từ CDN ở runtime. Giữ [FONT-NOTICES.txt](FONT-NOTICES.txt) khi bàn giao lại.

| Vai trò | Family và weight | Thông số hiện tại |
|---|---|---|
| Display tiếng Anh | `Abril, Georgia, serif`; weight `400` | `h1`, `h2` và footer wordmark |
| Nội dung và điều khiển | `Montserrat, Arial, sans-serif` | Font local có weight `400`, `600`, `700`, `800` |
| Body mặc định | Montserrat `400` | `15px`, line-height `1.8` |
| Hero desktop | Abril `400` | `clamp(78px, 7.8vw, 112px)`, line-height `1.01`, letter-spacing `-4px` |
| Heading section mặc định | Abril `400` | `clamp(42px, 5.05vw, 70px)`, line-height `1.08`, letter-spacing `-0.035em` |
| Đoạn nội dung services/about/IP | Montserrat `400` | Override cuối CSS đưa các đoạn chính về `14px` |
| Tên project desktop | Montserrat `600` | `22px`, line-height `1.45`, letter-spacing `-0.7px` |
| Tên project mobile | Montserrat `600` | Override cuối CSS dùng `20px` ở `≤760px` |
| Eyebrow | Montserrat `700` | `10px`; mobile `9px`; uppercase và tracking rộng |
| Nhãn form | Montserrat `700` | `12px` |
| Input/textarea | Montserrat `400` | `14px`; mobile `16px` |

Một số section có cỡ heading riêng. Ví dụ services dùng `clamp(49px, 5.2vw, 73px)`, contact dùng `clamp(44px, 5.35vw, 76px)`. Đọc selector cụ thể trước khi thay cỡ chữ toàn trang.

Abril được dùng chủ yếu cho headline tiếng Anh. Montserrat dùng cho nội dung tiếng Việt và control. Không ép một font không đủ glyph hiển thị tiếng Việt. Badge logo là ảnh; phần chữ tên agency ở header/footer là cách trình bày của website.

**CSS có các override đọc dễ hơn ở cuối file.** Các rule cuối tăng cỡ chữ và kích thước control. Khi refactor, giữ giá trị sau cascade; không lấy rule đầu tiên làm giá trị cuối cùng.

## D05. Container và khoảng cách

| Vùng | Desktop mặc định | Thay đổi responsive |
|---|---|---|
| `.shell` | `min(1296px, 100% - 112px)`; canh giữa | `≤1199px`: trừ `80px`; `≤760px`: trừ `42px`; `≤360px`: trừ `34px` |
| `.header-inner` | `min(1400px, 100% - 80px)`; cao `90px` | `≤1199px`: trừ `50px`; `≤760px`: trừ `32px`, cao `74px` |
| `.section-space` | Padding trên/dưới `116px` | `≤1020px`: `92px`; `≤760px`: `73px` |
| Hero | Padding trên `56px`, dưới `100px`; min-height `785px` | `≤1199px`: min-height `720px`; `≤1020px`: `695px`; mobile bỏ min-height |
| Khoảng cách tiêu đề → eyebrow | Thường `21–24px` | Theo selector của section |
| Project grid | Row gap `49px`; column gap `30px` | `≤760px`: `32px / 20px`; `≤480px`: một cột, gap `30px` |
| Form row | Hai cột; gap `25px` | `≤480px`: một cột |
| Scroll offset | `html` có scroll-padding-top `110px` | `≤760px`: `91px` |

Không áp một thang spacing mới lên toàn trang chỉ để đồng nhất số. Các khoảng cách hiện tại đi theo bố cục editorial và kích thước ảnh. Khi chỉnh một section, kiểm tra nhịp khoảng trống giữa section đó và hai section liền kề.

## D06. Breakpoint và grid

CSS hiện có các ngưỡng `1600`, `1199`, `1020`, `760`, `480`, `360` px. Đây là ngưỡng implementation, không phải ngưỡng lấy từ brand guideline.

| Viewport | Hành vi chính |
|---|---|
| `≥1600px` | Hero min-height `850px`; H1 `119px`; artwork tối đa cao `650px` |
| `≤1199px` | Giảm lề và gap; hero H1 `90px`; giữ phần lớn layout hai cột |
| `≤1020px` | Ẩn desktop nav, bật menu toggle; hero H1 `79px`; giảm section padding |
| `≤760px` | Hero, services, about, IP, contact chuyển một cột; header CTA ẩn; input `16px` |
| `≤480px` | Project grid và form row chuyển một cột; gallery case một cột |
| `≤360px` | Hero H1 `67px`; giảm thêm cỡ heading và khoảng cách control |

Các grid chính trên desktop:

| Selector | Cột | Gap |
|---|---|---|
| `.hero` | `1.08fr 1fr` | `70px` |
| `.project-grid` | `1fr 1fr` | `49px 30px` |
| `.services-layout` | `0.85fr 1.15fr` | `105px` |
| `.about-layout` | `1.6fr 1fr` | `120px` |
| `.ip-layout` | `0.9fr 1.1fr` | `85px` |
| `.contact-layout` | `1fr 1.17fr` | `93px` |

Ở mobile, phần mô tả IP đứng trước mascot. Không giữ máy móc thứ tự hai cột desktop. Project grid vẫn có hai cột trong dải `481–760px`.

## D07. Components đang có

### D07.1. Header và navigation

Header sticky ở đầu trang. Background paper với opacity nhẹ, border dưới `1px`, blur `12px`. Logo badge đặt cạnh wordmark. Menu chính điều hướng bằng hash anchor, không mở page route mới.

Menu mobile có nút `44 × 44px`, `aria-expanded`, nhãn mở/đóng và danh sách link. Menu đóng khi chọn link hoặc nhấn Escape. Giữ focus dễ nhận biết.

Trong full-site P7, menu desktop nằm giữa header, logo bên trái và nhóm chọn ngôn ngữ/CTA bên phải. Dùng ba cột với hai cột ngoài bằng nhau; không đặt auto margin trước bộ chọn ngôn ngữ làm menu dạt sát logo. Ở breakpoint mobile, giữ nhóm control bên phải, khoảng cách tối thiểu `8px` và không chồng logo. Khi đổi EN/VI/JA, kiểm tâm menu, khoảng cách control và hai phía breakpoint `1020/1021px`; không chỉ kiểm tràn ngang.

### D07.2. Buttons, link và filter

Nút chính dùng nền `--dark`, chữ trắng, radius `6px`, min-height mặc định `56px`, padding `14px 24px`. Nút outline dùng border `1px`. Link hành động có underline và icon mũi tên.

Filter dùng pill radius `30px`, có trạng thái active rõ bằng nền tối và `aria-pressed`. Override cuối CSS đặt min-height `44px`. Interest button cũng có min-height `44px`. Không dùng màu như tín hiệu duy nhất cho trạng thái chọn.

#### Khoảng cách giữa control — áp dụng cho CMS và các UI mới

- Các nút độc lập và tab dạng nút có viền riêng phải cách nhau ít nhất **8 CSS px**, cả theo hàng và giữa các hàng khi xuống dòng. Toolbar/form actions ưu tiên `12px` khi đủ chỗ. Không để hai viền chạm nhau, chồng vùng bấm hoặc dùng khoảng trắng trong HTML làm spacing.
- Đặt `display: flex` hoặc `grid` cùng `gap` trên **container sở hữu nhóm control**. Với CMS, tái sử dụng `.cms-control-group` và token `--cms-control-gap` trong `pinky-lamb-cms/admin/admin.css`; không mượn class chỉ được style dưới ancestor của editor khác. Không đặt `gap` lên container `display: block` rồi coi là đã có khoảng cách.
- Cho nhóm xuống dòng hoặc chuyển cột khi thiếu chỗ; giữ row/column gap tối thiểu `8px`, vùng bấm cao ít nhất `44px`, nhãn đọc đủ và focus-visible không bị cắt. Không ép `nowrap`, thu nhỏ vùng bấm hoặc dùng margin âm để nhét một hàng.
- Segmented control liền khối chỉ là ngoại lệ khi thiết kế đó được duyệt rõ, có container, trạng thái chọn và quy tắc focus riêng. Không gọi hai nút vô tình dính viền là segmented control để bỏ qua lỗi.
- Trước khi báo UI đạt, nhìn bản render và đo mép vùng bấm của từng control lân cận trên desktop và mobile áp dụng; kiểm cả khi nhãn dài hoặc control disabled. **Không tràn ngang không chứng minh rằng các nút đã tách nhau.** Dùng checklist `UI-SPACING-01` trong [QA-AND-DOD](docs/QA-AND-DOD.md). Chỉ kiểm nhóm bị tác động, không mở một vòng full-suite/harness cho sửa spacing.

### D07.3. Hero artwork

Hero có khung vòm với radius `46% 46% 24px 24px`, border `7px`, aspect-ratio `0.94`. Mobile đổi aspect-ratio `1.05`, border `6px`. Ảnh hero đang dùng crop từ artwork nguồn. Orbit, sticker và note là lớp HTML/CSS riêng.

Giữ mascot trong vùng nhìn rõ. Không đặt chữ HTML đè lên chữ đã bake sẵn trong ảnh nguồn. Không kéo giãn ảnh để lấp khung. Khi đổi crop, dùng reference gốc để kiểm tra phần nào bị cắt.

### D07.4. Project card và case dialog

Card là button toàn vùng, có accessible label, thumbnail, client, năm, tên dự án và category. Thumbnail radius `8px`, aspect-ratio `1.78` trên desktop. Sony, Diag và Samsung dùng `object-fit: contain` để giữ artwork; các ảnh sự kiện thường dùng `cover`.

Tên dự án nằm trong `.project-title`; không đặt heading block bên trong button. Filter mặc định hiển thị bốn trong tám project. “Xem thêm” mở toàn bộ tập hiện tại; card mới nhận focus.

Case dùng native `<dialog>`, rộng tối đa `980px`, cao tối đa `90dvh`. Mobile: rộng `100% - 24px`, cao tối đa `92dvh`. Toolbar sticky; nút đóng `44 × 44px`. Gallery chỉ hiển thị ảnh nguồn của case. Khi chuyển từ case sang contact, đóng dialog và chuyển focus đến contact.

### D07.5. Service accordion

Mỗi dịch vụ là native `<details>/<summary>`. Mục đầu mở mặc định. Có số thứ tự, tiêu đề tiếng Anh, tiêu đề tiếng Việt, icon plus, đoạn mô tả và danh sách scope.

Border trên/dưới tạo nhịp phân cách. Padding summary desktop `25px 0`; icon đổi hướng khi mở. Không thay thành bảng dữ liệu hoặc card dày nếu chưa có nhu cầu nội dung mới.

### D07.6. Showreel

Banner dùng poster trích từ showreel thật. Video mở trong dialog tối, rộng tối đa `1120px`. Nút Play do người dùng kích hoạt. `<video>` giữ `controls`, `playsinline`, `preload="none"`. Đóng dialog thì pause video.

File web là bản đầy đủ khoảng 65 giây, 720p, H.264/AAC. Bản video gốc được bàn giao trong references để dựng tiếp. Không dùng bản gốc gần 90 MB làm file phát mặc định trên homepage.

### D07.7. Contact và brief form

Contact dùng thông tin được cung cấp trong guideline và credential. Form có name, email, company, service interests và brief. Input có border dưới, background trong suốt; textarea cho phép resize dọc.

CTA hiện tại là **“Soạn email gửi Pinky”**. Form chuẩn bị email bằng `mailto:`; khách gửi bằng ứng dụng email của họ. Có “Sao chép brief” và vùng nội dung dự phòng. Không đổi nhãn thành “Đã gửi thành công” khi chưa có backend trả kết quả thật.

Label, required state, lỗi validation và focus phải còn đọc được sau khi thay style. Placeholder không thay thế label. Không lưu dữ liệu liên hệ vào client storage khi chưa có yêu cầu chức năng.

### D07.8. Footer

Footer nền `--ink`, chữ paper, wordmark cỡ lớn và rose nhạt. Có link về đầu trang, Facebook và descriptor agency. Giữ bố cục đọc được ở màn hình hẹp; không làm wordmark tạo horizontal scroll.

## D08. Ảnh, logo và media

- Dùng `dist/assets/` cho runtime. Dùng `references/` để đối chiếu, dựng crop mới hoặc tối ưu lại.
- Giữ nguyên ảnh/logo gốc trong references. File web mới cần tên và provenance rõ.
- Giữ tỉ lệ logo. Không tự vẽ lại logo khách hàng, đổi màu bản gốc hoặc ghi nhận badge PDF là logo master.
- Favicon là brand asset cố định: dùng nguyên `dist/assets/favicon.png` / bản
  pin trong `public-baseline/assets/favicon.png` (PNG64×64, SHA256
  `fa1747f42e462ec10b01ae5c81ea7be0ce4b41157aef0ef1ca904a905a893adc`).
  Không thay bằng ảnh Hero, sample image hoặc chuyển định dạng trong fixture.
  Kiểm cả `rel="icon"`, MIME và bytes ở EN/VI/JA; không suy hình tab đúng chỉ
  từ screenshot phần nội dung trang. Thay brand asset cần chỉ đạo riêng.
- Cover và contact guideline chứa chữ đã bake trong ảnh. Dùng live HTML cho nội dung website và dữ liệu liên hệ.
- Không upscale ảnh nhỏ rồi gọi đó là ảnh chụp gốc chất lượng cao. Ảnh trích PDF có độ phân giải của image object trong PDF, không phải RAW từ máy ảnh.
- Khi dùng số trang, hiểu `page` là số trang PDF từ `1`. Giữ link đến trang nguồn của credential nếu case có link đó.
- Giữ PDF/video tải theo nhu cầu; kiểm tra Network thực tế khi đánh giá transfer. Giữ lazy loading cho ảnh ngoài vùng đầu trang và kích thước ảnh để hạn chế layout shift.
- Local exporter chỉ copy public assets cần dùng; references/video gốc private không vào public artifact.

## D09. Motion và feedback

Các chuyển động hiện tại đều ngắn và gắn với hành động. Button hover nhích lên `2px` trong khoảng `0.2s`. Thumbnail project scale `1.035` với transition `0.55s`. Poster showreel scale `1.025` với transition `0.7s`. Dialog xuất hiện trong `0.2s`, từ offset dọc `8px`.

Easing chính là `cubic-bezier(.2,.7,.2,1)`. Native accordion đổi icon plus theo trạng thái. Toast dùng để thông báo kết quả chuẩn bị/sao chép brief.

Giữ `prefers-reduced-motion`. Khi bật chế độ giảm chuyển động, CSS tắt animation dialog, rút transition và bỏ smooth scroll. Tránh tự thêm loop, cursor effect hoặc animation che nội dung mà chưa có mục tiêu UX rõ.

## D10. Accessibility và tính nhất quán

Giữ semantic section, heading, label và native control. Có skip link đến nội dung chính. Các control có focus-visible outline `3px`, offset `5px`. Giữ phần tử thực sự tương tác là button/link; không đổi thành `div` chỉ có click handler.

Native dialog quản lý focus. Không làm mất Escape hoặc focus khi đóng. Không dùng `aria-label` để mô tả thao tác khác với thao tác thật. Các SVG trang trí được ẩn khỏi cây accessibility.

Bản này có điều chỉnh cỡ chữ, độ tương phản và kích thước control trong CSS. Điều đó không phải chứng nhận toàn bộ website đạt WCAG. Khi thay layout, kiểm tra lại đọc tiếng Việt, focus, bàn phím, màn hình hẹp và trạng thái lỗi.

## D11. Quy trình thay đổi thiết kế

STEP 1 — Đọc yêu cầu mới, `DESIGN.md`, asset catalog và component đang tồn tại.

STEP 2 — Chọn asset có nguồn phù hợp. Đối chiếu credential khi thay nội dung case, thông tin công ty hoặc lời hứa dịch vụ.

STEP 3 — Sửa component hoặc token có trách nhiệm trực tiếp. Giữ tên selector và object nhất quán. Không thêm một hệ style khác cho cùng một vai trò.

STEP 4 — Kiểm tra desktop, tablet và mobile; chú ý các breakpoint có rule override ở cuối CSS. Kiểm tra ảnh thật và chữ tiếng Việt.

Với nhóm nút/tab được thêm hoặc đổi layout, kiểm riêng khoảng hở tối thiểu và vùng bấm theo D07.2; chụp nhóm đó trong ngữ cảnh thật. Nếu còn dính viền hoặc chồng vùng bấm, tiêu chí spacing là FAIL dù build/tests xanh hoặc cả trang không tràn ngang.

STEP 5 — Cập nhật tài liệu và asset catalog nếu thay convention hoặc thêm asset. Nêu rõ điều gì là kế thừa nguồn và điều gì là lựa chọn thiết kế mới.

Các trạng thái triển khai, kế hoạch nâng cấp và điều kiện hoàn tất được quản lý ở tài liệu dự án tương ứng. `DESIGN.md` tập trung vào ngôn ngữ thị giác và cách thực hiện giao diện.

## D12. Tiêu đề P7 giữ tiếng Anh — quyết định 17/10/2026

Theo chỉ đạo trực tiếp của Khiêm, các tiêu đề nội dung và dòng chữ nhận diện
trên website giữ tiếng Anh khi người xem chọn EN, VI hoặc JA. Nguồn đối chiếu
là template đang phục vụ tại `http://127.0.0.1:5010/` và các file baseline đã
pin; không tự viết lại tiêu đề theo ý AI hoặc lấy eyebrow thay cho heading.

- Hero: **Big ideas. / Lovely impact.**
- Work: **Good work. / Great feelings.**; **SELECTED WORK** chỉ là eyebrow.
- Services: **From the / first spark / to the wow.**
- About: **Creative at heart. / Hands-on by nature.**
- Showreel: **Made of ideas. / Made with heart.**
- IP: **Little characters. / Endless possibilities.**
- Contact: **Your next big thing / starts with hello.**
- Footer: **LET'S CREATE / SOMETHING MEMORABLE.**

Dấu `/` trong danh sách trên biểu thị xuống dòng gốc, không là ký tự UI.
Giữ nguyên dấu câu, phần nhấn màu, font và bố cục responsive của template.
Tên dự án/dịch vụ kế thừa nguồn gốc; tên riêng như **Thanh Xuân Hoàng Kim**
không bị dịch lại. Heading kinh nghiệm vốn là tiếng Việt được thể hiện bằng
**Years of creative / & production experience.** theo quy tắc tiếng Anh mới.

Body copy, mô tả, alt text, điều hướng, nút và form vẫn theo locale đang chọn.
Fixture tham chiếu dùng đúng 8 dự án, 6 dịch vụ, ảnh và trang credential của
template. Theo **Approved P7 cleanup v1** ngày17/10/2026, nội dung VI lấy nguyên
nguồn đã pin; EN/JA dịch theo từng đối tượng, không dùng chung placeholder hoặc
tự thêm scope, kết quả hay claim. Heading/brand marks vẫn tiếng Anh. Khôi phục
ngắt dòng và nhấn chữ Hero, caption showreel và metadata nguồn.

Tab, SEO, dialog và alt ảnh của bản duyệt không chứa nhãn QA/mẫu. Giữ cờ
`qaFixture`, header nội bộ, `noindex` và chặn activation để phân biệt bản duyệt
với publication thật. Dọn phần trình bày không cấp quyền import/Publish CMS.
Media dùng đúng mapping và hash nguồn; thiếu tài nguyên phải báo lỗi, không
âm thầm thay bằng ảnh Hero. Fixture chữ dài là artifact riêng.

Khi sửa, hoàn tất source rồi kiểm UI thật một campaign theo phạm vi thay đổi:
đối chiếu heading với bản gốc cùng viewport, kiểm cả ba locale và màn hình
hẹp. Không suy tests xanh thành visual parity. Quyết định này không cấp quyền
ghi/import/Publish CMS hoặc activation `:5010`; giữ nguyên backup trước P7.

## Scope v3 LOCAL

**Phạm vi toàn gói: CMS đầy đủ LOCAL.** Chỉ Firebase demo `demo-pinky-lamb-cms` và emulators loopback; không tài khoản thật, Firebase login, Blaze, billing hoặc IAM làm điều kiện local. Production/deploy ngoài gói; chỉ đề xuất riêng sau khi toàn CMS đạt LOCAL_COMPLETE và người dùng nghiệm thu. M1 là first slice, không phải LOCAL_COMPLETE. M2–M4 phải có đặc tả/task/Approved riêng.
Root firebase.json giữ historical read-only; không tạo/sửa product code trong handoff revision.
