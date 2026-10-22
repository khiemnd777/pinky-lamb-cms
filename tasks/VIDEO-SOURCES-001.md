# VIDEO-SOURCES-001 — Hai nguồn video và giữ phiên local

Ngày: 22/10/2026. Chủ triển khai/hồ sơ: phiên chính. Trạng thái: source và kiểm thử local hoàn tất; thumbnail VIDEO và bộ nút icon đã kiểm chứng trên Edge. Lưu YouTube → reload → bản dịch → Preview CMS → website QA đã kiểm chứng bằng kho thử riêng. Phiên CMS thật vẫn tự khôi phục sau `make run`; IAB không gửi cookie phiên và chưa được khôi phục. Không lưu/publish nội dung vào kho hiện tại. Chưa deploy. Khiêm đã yêu cầu commit/push; kết quả Git được báo riêng trong bàn giao.

## Quyền và phạm vi

Khiêm duyệt: “Approve implement local theo kế hoạch hai nguồn: user chọn Firebase hoặc YouTube trong CMS, website tự dùng player tương ứng. Giữ nguyên upload hiện tại, dùng bộ nút Pinky Lamb cho cả hai, không tự fallback và chưa deploy.”

Trong lúc triển khai, Khiêm yêu cầu sửa cơ chế nhớ đăng nhập và cấm hỏi lại đăng nhập. Phần sửa phiên local được thực hiện trong cùng công việc. Không đọc/hiển thị credential người dùng, không tạo phiên thay người dùng, không bypass Auth. Kiểm thử Auth dùng tài khoản tổng hợp trong database tạm, không ghi credential vào hồ sơ.

Không sửa root `dist/`, root Firebase config, public-baseline, hồ sơ đóng cũ, dữ liệu nội dung đang giữ hoặc website pointer. Không seed/reset/reimport/migrate dữ liệu thật. Không tạo worktree hoặc delegate. Tài liệu chuẩn bị Firebase và prototype YouTube có sẵn được giữ nguyên.

## Hành vi đã nối

- About → Showreel có nguồn `FIREBASE` hoặc `YOUTUBE`. Nguồn vắng trong dữ liệu cũ vẫn là upload; parser không thêm defaults làm đổi hash snapshot lịch sử.
- Firebase giữ upload/picker/READY/rights, poster và thời lượng từ media server. Chuyển nguồn không xóa file trong Library. Editor giữ lựa chọn từng nguồn trong lần biên tập; nguồn đang chọn là nguồn được lưu.
- YouTube chỉ lưu video ID chuẩn hóa từ link HTTPS được cho phép. Không nhận iframe HTML, nguồn tùy ý hoặc dữ liệu trộn `assetId`/duration của Firebase với YouTube. YouTube dùng poster ảnh riêng; không tải video về Firebase.
- Cả native Content workspace và caller Home v3 đều xử lý nguồn theo schema/authority thật. Các collectors, localized About, snapshot/preview/export không đòi VIDEO asset cho YouTube.
- Website đa ngôn ngữ và QA media export dùng chung UI điều khiển: play/pause, ±10s, seek, volume/mute, fullscreen; nhánh HTML5 hoặc IFrame API theo nguồn. Không fallback provider.
- YouTube chỉ được khởi tạo khi người xem yêu cầu phát. Không cắt/che iframe, không dùng `showinfo`/`modestbranding`. Có tùy chọn mở controls chính thức cho settings/captions. Callback cũ không thể phát audio sau close/destroy.
- Preview toàn website vẫn là iframe không thực thi script. Video tương tác nằm cạnh iframe, với private byte reads có Auth, hash, budget và session/revision fence. Preview canonical cũ cũng dùng bộ nút chung.
- Xuất bản riêng cho phép đổi dependency chỉ khi thay Showreel trong About; các source facts/media khác vẫn giữ kiểm tra. Media mới chỉ được đọc từ slot Showreel/poster đã đóng băng, xác minh derivative/generation/hash. Nội dung và locale không chọn được giữ nguyên.
- Public handler hỗ trợ single HTTP Range cho MP4 (206/416, suffix/open ended, If-Range và HEAD), phục vụ byte sau kiểm tra hash. HTML có referrer policy tương thích YouTube.

## Ghi nhớ đăng nhập

Mã cũ đã gửi `rememberMe:true`, lưu session/secret trên SQLite nhưng dùng cookie prefix mặc định Better Auth. Cookie trên cùng host không được phân tách theo port. Đây là nguy cơ trùng cookie giữa các ứng dụng local; chưa chứng minh mọi lần mất phiên trước đây có cùng nguyên nhân.

- Cookie riêng `pinky-lamb-local`, HttpOnly, SameSite=Lax; session 30 ngày, gia hạn sau khoảng cập nhật 24 giờ khi hoạt động.
- Cookie cũ còn hợp lệ được đưa qua kiểm tra chữ ký/expiry/database thông thường rồi cấp cookie tên riêng; không tạo danh tính từ metadata.
- Marker chỉ vô hiệu hóa đường tương thích cũ sau khi chuyển đổi/login/logout, tránh đăng xuất xong bị khôi phục từ một cookie cũ khác. Marker không cấp quyền truy cập.
- Hydration tự thử lại tối đa 3 lần khi lỗi kết nối/5xx, có timeout; không tự retry mutation đăng nhập/đăng xuất, không xóa danh tính vì lỗi mạng tạm thời.
- Không thay secret, credentials, enrollment, verification, roles hoặc authorization. Session đã hết hạn/thu hồi vẫn bị từ chối.

## Bằng chứng

Node dùng: `pinky-lamb-cms/.local/cache/node/node-v22.23.3-darwin-arm64/bin/node` (22.23.3).

| Kiểm tra | Kết quả và phạm vi |
| --- | --- |
| Regression RED trước sửa nguồn | Firebase explicit/YouTube chưa parse được, sau sửa qua |
| RED trước sửa persistence | Cookie chưa có prefix riêng/không upgrade tên, sau sửa qua |
| 25 file test liên quan, `node --experimental-vm-modules --test …` | 137/137 PASS; TAP tại `.local/test-outputs/video-sources-001/final-tests.tap` |
| About controller sau sửa cuối trường URL/thời lượng chưa chọn | 9/9 PASS, không giảm assertions cũ; dùng helper thật trong VM boundary |
| ESLint các file MJS thay đổi | PASS, 0 errors; HTML không thuộc cấu hình ESLint, được Vite build |
| `git diff --check` | PASS |
| Build cuối | Vite PASS; log `.local/test-outputs/video-sources-001/final-build.log` |
| `make run` | Build Admin PASS; khởi động CMS 5273, website 4189, workers; pointer website cũ được giữ |
| Auth thật + SQLite tạm | Cookie persistent, reopen DB/server, legacy upgrade, renewal, app isolation, logout, revocation và chống phục hồi phiên cũ đều PASS |
| API Content thật + media resolver thật + SQLite tạm | Save YouTube, từ chối nguồn trộn, CAS/replay, chuyển lại Firebase và server-derived duration PASS |
| Native HTML5 trên Chrome desktop | Phát, tạm dừng, tua 10s, mute, kết thúc/phát lại đã quan sát |
| YouTube thật trên Chrome desktop | Phát, tạm dừng, tua, đóng/mở lại; iframe được hủy khi đóng đã quan sát |
| Chrome mobile viewport 390/320 px | Hai nguồn phát được, không overflow trang; controls cao ít nhất 44px ở 390; iframe/stage cao tối thiểu 200px |
| Fullscreen | Đã quan sát fallback mở rộng khi browser từ chối native fullscreen |

Bằng chứng ảnh tại `.local/test-outputs/video-sources-001/evidence/`: `firebase-desktop.jpg`, `firebase-mobile.jpg`, `youtube-desktop.jpg`, `youtube-mobile.jpg`.

Trang kiểm thử được tạo từ renderer hiện tại và media công khai đã kiểm hash của release local, chỉ ghi vào test-outputs. Có nhãn kiểm thử rõ ràng; bản YouTube dùng video mẫu API Google, không giả thành showreel Pinky Lamb. Hai URL: `http://127.0.0.1:4198/vi/` và `http://127.0.0.1:4199/vi/`. Không dùng các trang này làm bằng chứng đã xuất bản từ CMS thật.

Một giới hạn của server Python dùng ban đầu là thiếu HTTP Range: phát được nhưng seekable kết thúc ở 0. Đã dùng Express static hỗ trợ Range cho trang kiểm thử Firebase và quan sát tua đến 10 giây thành công. Handler website thật có regression test riêng cho Range, không dùng khả năng của Express để thay cho bằng chứng handler.

## Review và giới hạn còn lại

Tự review tuần tự, không có reviewer độc lập. Đã rà callers thật, compatibility/hash, input validation, source/byte pins, session disposal, lỗi API, quyền/CAS và logout.

- NOT_RUN: thao tác CMS → xuất bản qua UI bằng phiên người dùng. Phiên thật trên Edge hiện vào được workspace; chưa lưu hoặc xuất bản nội dung trong lần điều tra Auth này.
- NOT_RUN: thiết bị thật/Safari iOS, video YouTube private/cấm nhúng thực tế, mất mạng thực tế và native fullscreen trên thiết bị thật. Error/callback fencing đã có tests; không coi mock là proof YouTube trực tiếp cho các lỗi đó.
- Thông tin/branding/quảng cáo/video liên quan do YouTube quản lý vẫn có thể hiện; không cam kết loại bỏ. Khả năng nhúng và nội dung phía YouTube có thể đổi sau publish; snapshot giữ ID, không giữ byte YouTube.
- Chưa có nghiệm thu người dùng, Firebase cloud integration hoặc Production release.

## Điều tra LOGIN_REQUIRED trên trình duyệt thật — tiếp tục 22/10/2026

Yêu cầu hiện tại: khôi phục trên trình duyệt hiện tại và chứng minh qua restart; không hỏi đăng nhập, không bypass Auth.

- Phát hiện sai lệch trong kiểm chứng trước: profile từng giữ phiên CMS là Edge, nhưng lần kiểm tra trước dùng Chrome và IAB. Cookie của các profile không dùng chung; không thể kết luận server mất phiên từ tab mới ở profile khác.
- Mở CMS trên Edge đang tồn tại, không nhập credential: vào workspace thật, hiển thị `OWNER`. Trạng thái DOM `AUTHORIZED`.
- Chẩn đoán tạm tại request `GET /api/auth/get-session` chỉ ghi cờ có/không, không ghi cookie/token, danh tính hoặc dữ liệu session. Edge: `scoped=true, legacy=true, retired=true`. IAB: cả ba `false`. IAB trả `LOGIN_REQUIRED` vì không cung cấp cookie phiên; chưa có bằng chứng xác định cookie IAB từng tồn tại rồi bị xóa hay profile này chưa đăng nhập.
- Chạy `make run` hai lần trong lần điều tra này; reload cùng tab Edge sau mỗi lần. Cả hai lần workspace tự khôi phục, lần cuối `AUTHORIZED` tại `/`, không đăng nhập lại. IAB reload sau lần cuối vẫn `LOGIN_REQUIRED`.
- Đã bỏ hoàn toàn mã chẩn đoán tạm; `local-admin-server.mjs` không còn diff. Không thêm đường cấp phiên/copy token/cơ chế vượt Auth. Không thay secret, user, quyền, nội dung hoặc website pointer. Các lần đọc phiên hợp lệ dùng cơ chế cookie renewal thông thường đã triển khai.
- Log: `.local/test-outputs/video-sources-001/auth-browser-diagnostic.log` và `auth-restart-final.log`. Ảnh: `evidence/auth-edge-after-restart.png`. Build trong cả hai lần `make run` PASS; `git diff --check` PASS. Các test Auth trước đó giữ nguyên giá trị; không dùng test tạm để thay thế bằng chứng browser.
- Giới hạn: đã kiểm chứng restart stack/server, chưa restart toàn bộ ứng dụng trình duyệt/OS. Không tuyên bố IAB đã được khôi phục. IAB không có credential phiên để server xác minh; tự chọn một session từ database và cấp cho IAB sẽ vượt Auth. Không thực hiện và không hỏi người dùng đăng nhập.

Bước tiếp theo: dùng tab Edge đang `AUTHORIZED` để tiếp tục kiểm tra CMS hai nguồn trong phạm vi local đã duyệt. Mục tiêu IAB vẫn mở với giới hạn nêu trên; không giải quyết bằng cấp phiên thay người dùng. Deploy/Git delivery cần yêu cầu riêng.

## Kiểm tra bằng phiên Edge — giữ dữ liệu, không publish/deploy

Khiêm yêu cầu tiếp tục CMS → Website với cả Firebase và YouTube bằng phiên Edge sẵn có; giữ dữ liệu, không publish/deploy và không hỏi đăng nhập. Lần này không sửa mã ứng dụng, không lưu form, không upload file hoặc thay source đã lưu. Chỉ cập nhật hồ sơ và bằng chứng kiểm tra.

| Checkpoint | Kết quả thực tế |
| --- | --- |
| Phiên Edge | Vào CMS bằng phiên sẵn có, `OWNER`, không nhập credential |
| CMS → Giới thiệu → Dữ liệu dùng chung → Showreel | Nguồn đang lưu là Firebase; video `894a94fb-78d7-4d98-914a-af1294ea8062`, duration readonly `65.344`, poster riêng được giữ |
| CMS → Xem trước bản đã lưu → Xem video đã lưu | PASS: website EN render; private video tải qua Auth; video thật có `readyState=4`, duration `65.344`, đang phát rồi tạm dừng |
| Bộ nút Pinky Lamb trong CMS | PASS: `+10s` đổi `11.759993` → `21.759993`, vẫn paused; tắt tiếng đổi `muted=true` |
| Form YouTube chưa lưu | PASS: chuyển nguồn hiện URL, bỏ picker VIDEO và duration Firebase; nhập URL mẫu `M7lc1UVf-VE`; không bấm Lưu website |
| Preview khi form đang chọn YouTube chưa lưu | PASS: vẫn dùng bản Firebase đã lưu, không dùng dữ liệu nhập chưa lưu; HTML5 video duration `65.344`, iframe YouTube bằng 0 |
| Chuyển lại Firebase | PASS: video, poster, duration và liên kết gốc ban đầu được phục hồi; Lưu website disabled, không còn dirty marker |
| Preview CMS mobile 390 px | PASS: dùng `cms-mobile-preview`; video thật phát/tạm dừng; page width 390, nút cao 44 px và nằm trong viewport |
| YouTube thật trên renderer website local, cùng Edge | Ban đầu iframe chưa ready trong 45 s → trạng thái lỗi; không fallback. Một lần bấm Thử lại sau đó phát được; nguyên nhân timeout lần đầu chưa xác định |
| Bộ nút website YouTube | PASS sau retry: phát/tạm dừng, tua `00:07` → `00:17`, mute/unmute; đóng dialog hủy iframe (count 0) |
| YouTube mobile 390 px | PASS: mở trang QA mới, xác minh viewport và scrollWidth đều 390; iframe cao 200 px, controls cao 44 px, video thật phát và tạm dừng |
| Regression contracts/renderer/player/selected media | `node --experimental-vm-modules --test tests/showreel-sources.test.mjs tests/showreel-renderer.test.mjs tests/pinky-video-player.test.mjs tests/selected-publication-media.test.mjs`: 12/12 PASS; log `edge-ui-contract-tests.tap` |
| Bảo toàn dữ liệu | SHA-256 trước/sau của toàn bộ rows trong `cms_content_sites`, `cms_content_entities` (30), `cms_content_localizations` (72), `cms_documents` (17099), `cms_objects` (221) đều bằng nhau; website pointer không đổi |

Bằng chứng trong `.local/test-outputs/video-sources-001/`: `data-before-ui.json`, `data-after-ui.json`, `data-final-ui.json`; ảnh `evidence/cms-firebase-paused.png`, `cms-firebase-mobile-paused.png`, `cms-youtube-unsaved.png`, `edge-youtube-desktop-playing.png`, `edge-youtube-desktop-paused.png`, `edge-youtube-mobile-paused.png`. Viewport override đã reset. Tab CMS giữ dữ liệu Firebase gốc; tab QA YouTube giữ paused. Chỉ mở lại server QA static loopback 4199; không thay website 4189 hoặc CMS stack.

Giới hạn và phát hiện:

- NOT_RUN: lưu YouTube → preview CMS từ bản YouTube đã lưu. Preview chỉ đọc bản đã lưu; dữ liệu hiện tại là Firebase. Không bấm lưu rồi phục hồi vì yêu cầu giữ nguyên dữ liệu. YouTube thực tế được kiểm tra bằng trang QA từ renderer hiện tại, không coi đó là bằng chứng đã lưu/publish từ CMS.
- NOT_RUN: publish/deploy, upload file mới, luồng Firebase cloud và kiểm tra trên điện thoại vật lý.
- Thumbnail ở ô chọn VIDEO trên CMS báo “Không thể xem ảnh”, dù private video trong preview phát bình thường. Source hiện tại của `content-workspace-editor.mjs` dùng `createImagePreview` cho mọi MEDIA_VERSION, chưa phân nhánh VIDEO/PDF; đây là phát hiện UI còn mở, chưa sửa trong lượt chỉ kiểm tra này.
- Mở trực tiếp URL embed YouTube ở tab riêng hiện Error 153; kiểm tra đó không có ngữ cảnh nhúng/referrer và không được dùng để kết luận nguyên nhân timeout. Đã đóng tab đối chiếu. Lần retry trong website có referrer phát được.

Bước tiếp theo: ưu tiên sửa thumbnail VIDEO đúng loại và kiểm tra lại trên Edge, không thay dữ liệu. Muốn chứng minh riêng bước lưu YouTube qua UI cần cho phép bộ dữ liệu kiểm thử tách biệt; dữ liệu hiện tại và website đang phục vụ tiếp tục giữ nguyên.

## Sửa thumbnail, icon và kiểm chứng lưu YouTube — 22/10/2026

Quyền mới của Khiêm: “Sửa luôn lỗi thumbnail VIDEO và kiểm chứng lưu YouTube → preview CMS bằng dữ liệu thử tách biệt. Thay thế text bằng player controller icon. Kể cả trong Preview và ngoài Website.” Giữ giới hạn không publish/deploy và không hỏi đăng nhập lại. Phiên chính triển khai và tự review tuần tự; không delegate, Git mutation hoặc cài dependency.

### Thay đổi và nguyên nhân

- `admin/media-image-preview.mjs`: thumbnail VIDEO chọn derivative `POSTER` WebP thay vì đòi `IMAGE`. Tái sử dụng Auth, schema, kích thước, hash, decode và ngân sách hiện có; không tải MP4 để dựng thumbnail. Cùng bộ chọn hỗ trợ ảnh trang 1 của PDF khi gọi thumbnail; bộ xem ảnh đầy đủ vẫn từ chối VIDEO/PDF.
- `preview/pinky-video-player.mjs` và CSS mirror: các nút play/pause, ±10 giây, mute/unmute, fullscreen, YouTube settings và retry dùng SVG Lucide. Nhãn `aria-label`, tooltip, trạng thái và mốc thời gian vẫn giữ. Icon đổi theo trạng thái; mỗi nút ít nhất 44 px. Geometry nằm trong hàm player để bản export không phụ thuộc closure hoặc thêm thư viện CDN.
- Khi tạo bản About đầu tiên ở kho thử, UI hiển thị tiêu đề nguồn chỉ đọc nhưng working copy lại chứa chuỗi rỗng, khiến validation từ chối trước khi gửi API. `admin/group-localization-editor.mjs` giữ đúng `heading`, `reelHeading`, `experienceLabel` của nguồn trong bản mới. Các trường cần dịch vẫn bắt đầu trống; không tự sao chép nội dung biên tập.
- Các lỗi trên có regression RED đúng assertion trước sửa, sau đó GREEN. Không thay contracts lưu nguồn hoặc Auth của CMS thật.

### Kho thử và bằng chứng xuyên suốt

`tests/helpers/video-cms-browser-fixture.mjs` chạy fixture có chủ đích ở `127.0.0.1:5283`, SQLite trong thư mục tạm riêng từ helper hiện có, tài khoản tổng hợp `.invalid`, Better Auth riêng với cookie prefix riêng và kiểm tra member/quyền/session trong transaction. Không đọc/copy user, credential, session, secret hoặc database hiện tại. Fixture dùng controller CMS, Content service, media resolver, localization services và full-site preview thật qua HTTP adapter thử; không thay canonical transport hoặc mở route publish. Dữ liệu nền và các bản dịch ngoài About là prerequisites được tạo trong fixture. Không dùng fixture này làm bằng chứng cho toàn bộ CMS hoặc transport Production.

Đã thao tác bằng Edge:

1. Đăng nhập tài khoản tổng hợp qua endpoint Better Auth bình thường; không yêu cầu Khiêm thao tác. Request không có session và cookie giả đều nhận 401.
2. Qua controller About thật: chọn YouTube, nhập `M7lc1UVf-VE`, chọn Lưu website. SQLite nhận nguồn YouTube, site revision 1.
3. Reload trình duyệt; nguồn YouTube, URL và tên vừa lưu vẫn tồn tại, nút Lưu website disabled.
4. Tạo và lưu bản About EN với nội dung tổng hợp: localized revision 1. Đã tái hiện và sửa lỗi trường chỉ đọc nêu trên.
5. Bấm Xem bản đã lưu → Xem video đã lưu. Full-site QA đọc nguồn `YOUTUBE`, ID đúng, About revision 1; YouTube thật phát được. Icon tạm dừng hoạt động; tua `00:40` → `00:50`; mute đổi trạng thái; không có thẻ video Firebase trong player này.
6. `tests/helpers/export-video-cms-browser-fixture.mjs` đăng nhập bằng tài khoản thử qua Auth, đọc chính full-site QA đã lưu, kiểm hash/kích thước các byte baseline hoặc APPLICATION_INLINE và tạo website QA riêng. Không gọi publish, release hoặc thay website pointer.
7. Website QA ở **http://127.0.0.1:5293/**. Tiếng Anh dùng route chuẩn `/`; thư mục output EN được phục vụ như root. Khởi tạo YouTube lần đầu timeout 45 s, nút Retry icon hoạt động và sau đó phát được. Play/pause, tua `00:16` → `00:26`, mute/unmute hoạt động. Không fallback nguồn. Nguyên nhân lần tải đầu chậm chưa xác định.
8. Website QA mobile: viewport và scrollWidth đều 390 px, stage 200 px, controls 44 px; không có chữ bên trong các nút, mỗi nút có một SVG và tên trợ năng. Video phát/tạm dừng được. Viewport đã reset.

### CMS hiện tại và kiểm tra cuối

- Trên CMS thật 5273, thumbnail đã hiển thị poster cho `showreel-2025.mp4`, hết thông báo lỗi ảnh. Không đổi asset, poster hoặc duration `65.344`.
- Preview Firebase của CMS thật dùng icon, phát/tạm dừng được. Kiểm tra riêng giao diện mobile 390 px qua menu và nút preview mobile: page width 390, nút 44 px, mỗi nút một SVG và text rỗng, video paused thật.
- `make run` build cuối PASS; Edge reload vẫn `AUTHORIZED`/`OWNER`, không nhập lại credential. Website 4189 vẫn trỏ cùng release cũ. Bản đang phục vụ chưa được publish lại nên không được dùng làm bằng chứng icon mới.
- 37/37 focused tests PASS: thumbnail, player, exported renderer/CSS parity, About/localization controller, localization API, About form và Content service. Log `icon-thumbnail-final-tests.tap`.
- ESLint 8 file source/test/fixture thay đổi PASS; `git diff --check` PASS. Build log `icon-thumbnail-final-stack.log`.
- Fingerprints của `cms_content_sites`, `cms_content_entities`, `cms_content_localizations`, `cms_documents`, `cms_objects` và website pointer đều giữ nguyên; `data-after-icons.json`. Cache readiness được worker cập nhật theo source code; không coi byte toàn bộ SQLite là bất biến.

Ảnh trong `.local/test-outputs/video-sources-001/evidence/`: `cms-video-thumbnail-fixed.png`, `cms-firebase-icons.png`, `cms-firebase-icons-mobile.png`, `isolated-cms-youtube-saved-icons.png`, `website-saved-youtube-icons-desktop.png`, `website-saved-youtube-icons-mobile.png`. Log `isolated-cms.log` ghi riêng `QA_SOURCE_SAVED`, `QA_LOCALIZED_SAVED`, `QA_PREVIEW_READ`, không ghi cookie hoặc credential. Website QA lưu `qa-identity.json` với source/ID/revision/dependency hash.

Giới hạn: không upload file mới, không publish/deploy, không kiểm thử thiết bị vật lý hoặc Firebase cloud. Branding/tiêu đề bên trong iframe vẫn do YouTube quản lý theo giới hạn API. Fixture browser chỉ dùng nội dung tổng hợp cho About và các service thật; HTTP adapter thử không thay thế kiểm chứng canonical transport 5273. Nghiệm thu người dùng chỉ giới hạn ở bộ icon theo xác nhận dưới đây; không suy rộng thành nghiệm thu toàn bộ luồng video/Auth hoặc phát hành Production.

### Xác nhận bộ icon — 22/10/2026

Khiêm xác nhận: “Duyệt bộ icon”. Ghi nhận bộ icon điều khiển Pinky Lamb trong Preview CMS và Website QA đã được người dùng duyệt. Xác nhận này không cấp quyền publish, deploy hoặc thao tác Git.

Bước tiếp theo: giữ bản local đã duyệt để nghiệm thu phần còn lại khi có yêu cầu; publish/deploy tiếp tục cần yêu cầu riêng.

### Phạm vi Git — 22/10/2026

Khiêm yêu cầu: “commit, push.” Phạm vi commit gồm thay đổi hai nguồn video, nhớ đăng nhập, thumbnail, icon, tests/fixtures và hồ sơ này. Tài liệu `docs/FIREBASE-DEPLOY-PREPARATION.md` và `mockups/youtube-player-v1/` có sẵn được giữ ngoài commit. Tái sử dụng bằng chứng kiểm thử/build đã ghi ở trên vì source không đổi trong lần bàn giao Git. Không cấp quyền publish/deploy.
