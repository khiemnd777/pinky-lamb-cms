# Pinky Lamb CMS — local runtime and recovery runbook

## Cổng hiện hành — 19/10/2026

- Admin/API: `http://127.0.0.1:5273/login`. Website dữ liệu CMS: `http://127.0.0.1:4189/`, `/vi/`, `/ja/`.
- Nếu gõ `http://localhost:5273/` hoặc `/login`, server chuyển hướng sang địa chỉ Admin `127.0.0.1` trước khi dùng phiên đăng nhập. Chỉ GET/HEAD không có Origin được chuyển hướng; API/Auth và assets không dùng hostname `localhost`.
- Preview dùng CSS, font và public legacy assets đã đóng gói trong artifact của `4189`. Media riêng tư tiếp tục đi qua API xác thực của CMS. Các URL nguồn lịch sử trong snapshot không được ghi lại; lớp transport ánh xạ chúng sang cổng hiện hành trước khi tải.
- Không cần chạy template HTTP tại `5010`. CSP của CMS và preview không cho tải từ cổng đó. Khởi tạo nguồn, khi được duyệt riêng, đọc template đóng gói nguyên byte trên ổ đĩa và kiểm tra pin; startup không seed dữ liệu.
- `make run` hiện được cấu hình mở CMS, worker và website `4189` theo pointer `.local/p7-v3/website-current.json`. Pointer phải tồn tại và trỏ đến artifact hợp lệ. Nếu thiếu pointer, launcher từ chối thay vì tự seed hoặc tạo bản website giả.
- Khi chỉ build giao diện cho stack dữ liệu local đã cutover, chạy `npm run build:admin:durable` từ thư mục CMS. Lệnh `npm run build:admin` của profile emulator cũ sẽ từ chối ghi đè `admin-dist` nếu có marker cutover; `make run` vẫn build đúng profile durable tự động.
- `make run` kiểm tra bản Admin vừa build có dấu Auth durable và entry asset trước khi mở website/Admin/worker. Built Admin cũng kiểm tra lại khi khởi động riêng. Nếu bundle sai hoặc thiếu, startup dừng với lỗi rõ ràng; không phục vụ form đăng nhập trỏ đến Auth emulator cũ.
- Khi chạy lại, `make run` dừng CMS, website và worker cũ của đúng dự án, chờ tiến trình thoát và cả hai cổng trống rồi mới mở stack mới. Cơ chế này cũng xử lý launcher đã thoát nhưng server/worker còn chạy hoặc server mở riêng bằng đúng lệnh đã biết. Runner kiểm tra user, pinned Node/command, thư mục CMS, thời điểm tạo PID và chủ cổng; ứng dụng khác vẫn bị từ chối. Không cần sửa/xóa marker hoặc tự kill theo cổng.

### Bảo vệ đăng nhập từ `make run` — 19/10/2026

Sau cutover, `npm run build:admin` của profile emulator đã từng ghi đè bundle trong `admin-dist` mà built Admin phục vụ. Form đăng nhập khi đó dùng Auth emulator cũ; nhập đúng tài khoản local vẫn bị lỗi chung. `make run` nay build profile durable, xác nhận dấu Auth durable cùng entry asset trước khi mở stack; built Admin kiểm tra lại lúc mở riêng. Build profile emulator bị từ chối ghi đè sau cutover. Dấu bundle là kiểm tra tương thích build, không thay thế xác thực backend.

Kiểm chứng: focused Node tests **PASS 20/20**, ESLint và `git diff --check` **PASS**. `make run` thực tế **PASS hai lần liên tiếp**: lần sau dừng stack trước, build lại durable, rồi đạt readiness Admin `5273`, website `4189` và anonymous session 401. Sau mỗi lần, tải lại tab Edge hiện có vẫn vào CMS với role `OWNER` tại `/` mà không nhập lại mật khẩu. Không dùng credential để thử đăng nhập mới trong lần kiểm tra này.

Bằng chứng CMS/preview khi chuyển sang `4189` nằm trong [CMS-LOGO-LOCAL-001](../tasks/CMS-LOGO-LOCAL-001.md). Bằng chứng thay thế stack mới nằm trong mục dưới. Các bằng chứng ngày 17/10 vẫn giữ nguyên phạm vi lịch sử.

### Sửa restart — 19/10/2026

Nguồn yêu cầu: Khiêm giao sửa `make run` để dừng hoàn toàn bản đang chạy trước khi run, sau lỗi `LOCAL_DATA: Stale marker with occupied port`. Phạm vi: launcher, regression tests và hướng dẫn này; giữ nguyên dữ liệu local. Phiên chính triển khai và tự review tuần tự, không có reviewer độc lập.

Nguyên nhân quan sát: marker giữ PID launcher từ 17/10 đã thoát; website `4189` mở riêng và CMS `5273` còn chạy với PPID 1. Nhánh stale marker cũ từ chối khi cổng bận. Launcher mới kiểm tra danh tính component độc lập với marker, tìm cả worker không có cổng, yêu cầu graceful stop và đợi tối đa 30 giây. Khi không chứng minh được quyền sở hữu hoặc stop timeout, lệnh báo lỗi và không khởi động bản mới; không force kill. Marker cũ được giữ dưới tên `run-stale-<uuid>.json`. Không thay Makefile, seed/reset/import/restore hoặc cổng website.

Kiểm chứng trên source hiện tại:

- Pinned Node `--test tests/durable-stack-lifecycle.test.mjs tests/cms-website-origin.test.mjs`: **PASS, 14/14**. Bao gồm marker không còn launcher, worker không có cổng, cổng của app khác/không biết chủ, PID đổi danh tính, stop timeout, parent đang chạy và component mở riêng. Các ca lifecycle dùng runtime giả lập để kiểm tra chính sách signal/chờ; không thay thế bằng chứng chạy thật dưới đây.
- Pinned Node `node_modules/eslint/bin/eslint.js scripts/run-durable-stack.mjs tests/durable-stack-lifecycle.test.mjs`: **PASS**. Pinned Node `--check scripts/run-durable-stack.mjs`: **PASS**.
- `make run` hai lần liên tiếp: **PASS**. Lần đầu thay server cũ dù stale marker; lần sau thay stack đang có launcher hợp lệ. Launcher lần đầu thoát mã 0. Quan sát sau thay thế: đúng một launcher và ba component, không còn các PID server/launcher cũ. Readiness website `/` và Admin `/login` trả 200; anonymous CMS session trả 401.
- SQLite `integrity_check`: `ok`; số dòng và SHA-256 của toàn bộ `cms_documents`, `cms_collection_versions`, `cms_objects` giữ nguyên trước/sau hai lần chạy.

Giới hạn: chưa kiểm thử trình duyệt/authenticated login hoặc toàn bộ nghiệp vụ CMS trong lần sửa lifecycle này. Không có deploy/Git hoặc kiểm chứng mất điện. Stack local mới được giữ chạy để Khiêm sử dụng; chạy lại `make run` sẽ thay stack đó theo cùng cơ chế.

### Sửa shutdown chờ HTTP — 19/10/2026, sau khi chuyển sang built Admin

Khiêm báo `make run` dừng ở `stopping previous Pinky Lamb stack before startup`. Tại lúc kiểm tra không còn stack bị treo. Restart thông thường chạy được; đã tái hiện một nguyên nhân cụ thể bằng HTTP request local gửi thiếu body: website và các worker thoát, riêng built Admin còn chờ `server.close()`, khiến launcher thay thế báo timeout sau 30 giây. Kết nối giả lập vẫn mở đến khi client tự đóng. Các lần PASS ở mục trước không bao phủ ca kết nối này.

Phạm vi sửa theo yêu cầu hiện tại: `cms-api/local-admin-server.mjs`, `scripts/serve-cms-admin-local.mjs`, `scripts/run-durable-stack.mjs`, hai test file tương ứng và runbook này. Giữ các thay đổi UI đang có. Không sửa dữ liệu nguồn, seed/reset/import/migration, quy trình build hoặc quyền sở hữu tiến trình. Phiên chính tự review tuần tự; không có reviewer độc lập.

- Built Admin ngừng nhận request mới; đóng socket chưa gửi đủ header/body để giải phóng shutdown. Request đã đầy đủ vẫn được xử lý và trả kết quả. Theo dõi Promise của CMS/Auth handler, chờ các handler kết thúc cả khi client đã ngắt, rồi entrypoint mới đóng database. Không force kill tiến trình hoặc đóng database để ép vượt tác vụ đang chạy.
- Launcher giữ giới hạn chờ thay thế 30 giây và kiểm tra danh tính/chủ cổng. Mỗi 5 giây khi còn chờ, log tên thành phần và PID; lỗi timeout cũng ghi thành phần/PID. Shutdown của chính launcher dùng chung một Promise khi nhận nhiều signal và báo component chưa thoát.
- Pinned Node `--test tests/local-admin-server.test.mjs tests/durable-stack-lifecycle.test.mjs tests/cms-website-origin.test.mjs`: **PASS 21/21**. Test transport dùng HTTP/socket thật trên cổng tạm với fixture cô lập; kiểm tra thiếu body/header, client ngắt khi command còn chạy và trả đủ response khi request hoàn chỉnh. Test lifecycle kiểm tra log/timeout và các bảo vệ cũ.
- Pinned Node ESLint trên ba source file và hai test file bị sửa: **PASS**. `git diff --check` trên phạm vi sửa: **PASS**.
- `make run` trên retained stack với cùng request giả lập gửi thiếu body: **PASS**; kết nối được đóng, Admin báo `stopped`, launcher cũ thoát mã 0 và stack mới đạt readiness `4189/` 200, `5273/login` 200, anonymous CMS session 401. Build có sẵn trong `make run` hoàn tất thành công. Không gửi command hoàn chỉnh hay đăng nhập bằng credentials thật để tạo ca lỗi.
- Số dòng và SHA-256 toàn bộ `cms_documents`, `cms_collection_versions`, `cms_objects` không đổi sau kiểm chứng; SQLite integrity `ok`. Không suy kết quả này thành kiểm chứng mọi bảng hoặc toàn bộ nghiệp vụ CMS. Không có authenticated browser UAT, Git mutation hoặc deploy.

Stack mới giữ chạy để sử dụng. Nếu một tác vụ thật không kết thúc, launcher vẫn từ chối chạy chồng; dùng tên/PID trong log để điều tra đúng tác vụ, không tự force kill hoặc xóa marker.

### Sửa trang vào CMS qua localhost — 19/10/2026

Khiêm báo ảnh Edge mở `http://localhost:5273/login` trả JSON `FORBIDDEN` sau `make run`. Đã quan sát đúng trang lỗi trong tab của Khiêm và xác định middleware chỉ cho Host `127.0.0.1:5273`. Đây là từ chối ở lớp hostname trước khi xử lý đăng nhập.

Sửa `cms-api/local-admin-server.mjs` và regression test transport: GET/HEAD của đúng `/` hoặc `/login`, với Host `localhost:5273`, không có Origin, không có header trùng và kết nối loopback, nhận 302 đến đường dẫn tương ứng trên `http://127.0.0.1:5273`. Đích là hằng cố định, không lấy từ query; query không được chuyển tiếp. API/Auth, static assets, POST và Origin khác vẫn theo kiểm tra cũ. Cookie/session vẫn chỉ dùng origin chuẩn; không thêm trusted origin hoặc tắt phân quyền. Cập nhật runbook này là hồ sơ duy nhất của lần sửa; phiên chính tự review, không có reviewer độc lập.

Kiểm chứng:

- Pinned Node `--test tests/local-admin-server.test.mjs tests/durable-stack-lifecycle.test.mjs tests/cms-website-origin.test.mjs`: **PASS 21/21**. Đã thấy assertion GET localhost/login thất bại 403 thay vì 302 trước khi sửa. Sau sửa các ca GET/HEAD, query có đích ngoài, API/POST/Origin bị từ chối đều đạt cùng các hồi quy shutdown.
- Pinned Node ESLint trên transport và test: **PASS**; `git diff --check` trên source/test/runbook: **PASS**. `make run` gồm Admin build và readiness: **PASS**.
- Server thật: localhost/login trả 302 đến `http://127.0.0.1:5273/login`; canonical login 200; localhost CMS session 403; canonical anonymous session 401.
- Tải lại đúng tab Edge từng báo lỗi: URL chuyển sang `127.0.0.1:5273/login`, CMS hiện workspace Đầu trang, Hero và SEO với role OWNER từ session có sẵn. Không nhập/xem credentials hoặc sửa/lưu nội dung. Không suy bằng chứng tải trang thành nghiệm thu toàn bộ CMS hay đăng nhập mới bằng mật khẩu.

Stack mới và tab CMS được giữ mở. Không có Git mutation, migration hoặc deploy trong lần sửa này.

## LOCAL-DATA-001 v1 — runtime sau cutover (bằng chứng 17/10/2026)

Từ repository root chạy `make run`. Admin/API mở `http://127.0.0.1:5273/login`, public baseline mở `http://127.0.0.1:5010/`, worker chạy cùng lệnh. Kho dữ liệu hiện hành là `pinky-lamb-cms/.cms-data-local/` (owner-only, Git ignored): `cms.sqlite` ở SQLite WAL/FULL/fullfsync, `auth.secret`, `objects/`, `cutover.json`. `make run` chỉ kiểm tra và mở dữ liệu; không seed, import, reset hoặc restore. Ctrl+C dừng server; dữ liệu không phụ thuộc shutdown hook. Nếu chạy lại khi cùng instance đang mở, runner xác minh marker/PID birth/command/port owner, dừng graceful instance cũ rồi mở mới. Port của ứng dụng khác vẫn bị từ chối.

Cutover từ các emulator demo đã thực hiện sau khi đọc hai lần toàn nguồn và đối chiếu lần cuối: 3.502 collections gồm 48 nested, 17.139 documents thực cùng 48 missing ancestors, 1 Auth user và 221 Storage objects. Bản custody private ở `.local/data-custody/local-data-001-20261017-03/`; SQLite staging ở `.local/data-staging/local-data-001-20261017-03/`; backup riêng ở `.local/data-backups/local-data-001-stage-02/`; bản restore đã đối chiếu ở `.local/data-staging/local-data-001-restored-02/`. Backup nóng sau cutover ở `.local/data-backups/local-data-001-active-01/` cũng đã restore và đối chiếu vào `.local/data-staging/local-data-001-active-restored-01/`. Manifest SHA-256 nguồn `a24f75ac56f651ac5d99fd6c3085b73f8ae127b13cc3ae08b6e7bd454ab58406`. Cutover chỉ gửi SIGINT tới PID legacy 15465 và 65804 sau xác minh birth/command/port owner; hai listener group và Firestore đã đóng. Không xóa custody, backup hay các thư mục attempt không đầy đủ.

Auth emulator phiên bản hiện tại lưu `fakeHash` có thể khôi phục mật khẩu gốc; importer chỉ xử lý định dạng đã kiểm chứng trong bộ nhớ, chuyển qua Better Auth hashing rồi bỏ session migration. **Không đưa `auth-source.json` hoặc manifest custody lên Git, chia sẻ hay log:** nguồn Auth chứa credential tương đương plaintext. Tài khoản OWNER đã đăng nhập thành công qua Better Auth sau import/restart; mật khẩu hiện hữu tiếp tục dùng được. Nên đổi mật khẩu khi có luồng đổi mật khẩu được phê duyệt và kiểm tra riêng.

Backup mới khi app đang chạy: tạo trước một thư mục cha private 0700 ngoài `.cms-data-local`, sau đó chạy từ CMS root bằng Node pin:

```sh
.local/cache/node/node-v22.23.3-darwin-arm64/bin/node scripts/local-data-backup.mjs backup /absolute/private-parent/new-backup
```

Restore chỉ vào đường dẫn **chưa tồn tại** và chỉ sau khi dừng app; dùng `scripts/local-data-backup.mjs restore /absolute/backup /absolute/private-parent/new-restore`, rồi kiểm manifest/hash và chuyển destination theo kế hoạch phục hồi. Không chạy restore vào `.cms-data-local` đang hoạt động. `scripts/local-data-verify.mjs <custody> <destination>` đối chiếu bản đã import với manifest nguồn. Các lệnh `local-data-custody.mjs`, `local-data-init.mjs`, `local-data-migrate.mjs`, `local-data-cutover.mjs` chỉ dành cho lần chuyển nguồn có kiểm soát; không nằm trong startup thường ngày.

Đã quan sát `make run` sáu lần, các lần thay thế sau khi sửa signal làm lệnh cũ thoát mã 0; Admin/public 200, anonymous 401, OWNER session 200, các GET CMS đại diện 200, SQLite integrity `ok`, counts không đổi. Bản restore cách ly đã ACK một document và media object, sau đó process writer bị SIGKILL; cả hai còn nguyên khi mở lại, `journal_mode=wal`, `synchronous=2` (FULL), `fullfsync=1`. Mất điện thật và browser UAT chưa được quan sát. Phần dưới là hồ sơ startup/recovery lịch sử từ trước cutover, không mô tả lệnh `make run` hiện hành.

## LOCAL-STARTUP-001 v3 — canonical launcher (source handoff)

Human trực tiếp ghi “Duyệt `LOCAL-STARTUP-001 v3`” trong chat ngày17/10/2026. Slice này chỉ sửa source/config/docs để bàn giao tự chạy; không chạy tests/build/runtime/emulator/data hoặc Git.

Từ repository root, chạy:

```sh
make run
```

Makefile dùng đúng pinned Node `pinky-lamb-cms/.local/cache/node/node-v22.23.3-darwin-arm64/bin/node`. Runner chuyển cwd vào CMS, chạy `scripts/local-guard.mjs emulators`, chờ readiness rồi chạy `scripts/local-guard.mjs dev`. Logs được giữ trên terminal; runner giữ foreground. Cần có sẵn Node22.23.3, dependencies và JDK/cache emulator theo setup đã được duyệt; lệnh không cài hoặc download prerequisites.

Canonical Admin hiện dùng `http://127.0.0.1:5273/login`; public Hosting dùng `http://127.0.0.1:5010/` với `public-baseline`, chưa phải multilingual release. Runner từ chối nếu bất kỳ cổng `5273/9099/8080/5001/5010/9199/4400/4500/9299/9499` đã có listener hoặc trạng thái không xác định. Runner không attach, stop hoặc restart listener hiện hữu. Không tự dừng Docker/dịch vụ khác để giải phóng cổng.

Readiness chờ tối đa120s cho năm endpoint emulator và Hub4400 (sáu cổng), rồi tối đa60s cho Admin `/login` HTTP200 và anonymous `/api/cms/session` HTTP401; mỗi network probe có timeout riêng. Đây chỉ là điều kiện startup, không xác nhận authenticated login, dữ liệu retained, QA hoặc toàn CMS. Nếu readiness lỗi hoặc một guard thoát, runner trả nonzero và gửi `SIGINT` chỉ tới các guard con do chính lượt chạy tạo. `Ctrl+C`, `SIGTERM` hoặc `SIGHUP` cũng yêu cầu dừng qua các guard đó; guard forward tới child trực tiếp. Các guard được cô lập khỏi signal terminal để tránh forward lặp. Runner chờ shutdown graceful; sau15s chưa đóng chỉ báo trạng thái chưa xác minh và tiếp tục chờ, không force-kill process group/PID tìm theo cổng. `SIGKILL`/mất máy không có bảo đảm cleanup.

Launcher không seed/reset/import/restore, export-on-exit hoặc gọi cloud. Generic emulators không tự nạp dữ liệu của retained runtime trước đó; login/dữ liệu cũ có thể không hiện diện. Không chạy `make run` để thay thế hoặc phục hồi retained runtime đang chạy. Preflight từ chối listener thay vì nhận quyền sở hữu dữ liệu/dịch vụ cũ. Startup không import retained data và shutdown không tạo bản lưu dữ liệu emulator; không dùng launcher cho nội dung cần lưu bền vững trước khi có workflow persistence được duyệt.

V3 giữ nguyên URL descriptor QA `http://127.0.0.1:5173` trong immutable metadata và hashes; transport chỉ kiểm URL/path đã allowlist rồi fetch qua API canonical5273. Không rewrite Snapshot/envelope/QA descriptor để đổi port. M2 recovery5175 và historical receipts/locks giữ riêng.

**Verification:** source/syntax checks được ghi trong handoff của task. Tests/build/startup/emulator/HTTP/data/shutdown chưa chạy trong source slice này: `NOT_RUN`; availability hiện tại `Unknown`. Người dùng có thể tự chạy để kiểm tra khi prerequisites đủ; source handoff không là runtime acceptance.

**Historical admission impact:** `scripts/local-guard.mjs` và runbook này thuộc `RECOVERY_SOURCE_PATHS`. Các sửa v3 làm hash nguồn hiện tại khác source-bound R2/recovery receipts cũ; future admission có thể từ chối. Không re-pin hoặc sửa historical receipt/lock để báo PASS. Historical evidence dưới đây giữ nghĩa tại thời điểm ghi nhận; không cấp quyền recovery/startup mới.

## Historical runtime and recovery records

M1 và M2 đã Accepted/CLOSED. M3 đang IN_PROGRESS; chưa M3 AC/E2E, nghiệm thu toàn CMS hoặc LOCAL_COMPLETE. M3-RUNTIME-01 revision1 đã được human Approved, nhưng01Ra chỉ code/unit/lint;01Rb phải chờ independent High PASS và source-bound release receipt. Chỉ demo `demo-pinky-lamb-cms`/loopback; production, M4, import/full restore ngoài phạm vi.

**Verified historical:** original CLI/Auth/Functions/Hosting đã absent; Firestore Java65804 được giữ riêng và custody Firestore có5files/94366476B. Old Auth history, nguyên nhân exit, completeness và restore của copy vẫn Unknown/NOT_RUN. Native PDF36/36 (gồm18IMAGE/VIDEO) và isolated Storage task03 là proof riêng, không authenticated CMS/E2E. Preview01Va primitive PASS nhưng01Vb resource HOLD; task04/05 product integration chưa mở.

## Runtime và dependencies đã có

Chạy từ `pinky-lamb-cms/`. Node22.23.3/npm10.9.9 đã nằm trong cache riêng; JDK đã kiểm là24.0.1. Exact dependencies/overrides và adapters được ghi ở [DEPENDENCIES](DEPENDENCIES.md). M2 không cài hoặc nâng package/lock. Nếu cache thiếu, cần đối chiếu setup restore riêng; không dùng tài khoản cloud để thay emulator.

```sh
export PATH="$PWD/.local/cache/node/node-v22.23.3-darwin-arm64/bin:$PATH"
node --version
npm --version
```

PATH chỉ áp dụng terminal này. Lệnh `npm ci --ignore-scripts --engine-strict --cache .local/npm-cache --userconfig /dev/null --no-fund --no-audit` là lệnh restore của setup M1 đã duyệt, không phải bước cần chạy lại để nghiệm thu M2. Giữ lifecycle scripts tắt, không Firebase login/global install/account argument/ADC. Guard loại credential/proxy kế thừa, cô lập XDG/cache/log dưới `.local`, không đổi HOME hoặc đọc account store sẵn có. Node fence được nạp trước SDK; fence không phải kiểm soát egress toàn OS/Java.

## Managed recovery: gates and exact commands

Không dùng historical `npm run emulators:local`, `seed:local`, integration hoặc E2E để dựng lại partial runtime. Guard vẫn từ chối generic integration/E2E trước prepare/child và luôn từ chối seed. Không attach/restart/stop/import/reset/reseed existing Firestore65804; không điều khiển Docker TTCons đang chiếm5173. CMS Vite5173 vẫn OFF.

Từ đúng CMS cwd, pinned Node chạy offline selector:

```sh
.local/cache/node/node-v22.23.3-darwin-arm64/bin/node scripts/local-guard.mjs runtime-recovery-unit
```

Live selector dưới đây **chưa được chạy trong01Ra**:

```sh
.local/cache/node/node-v22.23.3-darwin-arm64/bin/node scripts/local-guard.mjs runtime-recovery-live
```

Live gate đọc `.local/cache/m3/runtime-recovery/01Ra-high-release.json` trước fresh dirs/child/SDK/API. Root chỉ tạo receipt sau actual independent High PASS_CODE_UNIT_ONLY. Receipt có `status`, `bundle` (fixed proposal/scope/canonical/approval SHA), `sources` đúng bốn path/bytes/mode/nlink/SHA và `review` path/SHA/atUtc của actual High receipt. Thiếu/lệch/không PASS thì REFUSE; đây là policy binding best effort, không chữ ký/unforgeable hard security.

Recovery dùng fresh private root, exact four CLI targets auth/functions/hosting/storage và tám managed loopback ports9099/5001/5010/9199/4400/4500/9299/9499; Firestore8080 external, không Hub registry member. CLI/Rules JVM/discovery/HTTP worker phải đúng source/argv/cwd/generation/ancestry. Metadata `.env*`, `.secret.local`, `.runtimeconfig.json`, functions.yaml, .pnp.js ở project/API làm HOLD trước start; không đọc secret để tìm workaround. Storage JAR chỉ existing byte-pinned cache và `original.start(false)`, không auto-download.

Darwin UNIX paths: UUID128bit mã hoá lossless22base64url; canonical absolute PORT/TMP/socket vẫn thuộc cùng owned root. Hash/profile/cwd-bound seam chỉ chuyển native syscall sang lexical relative≤103UTF8bytes; không alias/root mới hoặc sửa Shared socket getter. Unit chỉ chứng minh policy/arithmetic, native UNIX support NOT_RUN tới01Rb.

Trước tạo Auth: read-only paged nine-collection inventory + exact seven membership hashes/semantics; current positive authzVersion giữ nguyên. Chỉ exact seven fixed fixtures và get/create-missing; existing mismatch/unexpected user/tenant/pagination→HOLD, không update/delete/reset/revoke/claims/member write. Partial create giữ lại, không rollback bằng xoá; resume chỉ sau fresh exact inventory. Source synthetic inputs lấy từ existing seed exports, không gọi seedFixtures hoặc ghi password/token ra log.

Sau reconstruction: fixed GET session/role denial, Hosting hash, Storage loaded-Rules READ/LIST403; known Firestore before/after exact equality. Fresh Auth tokens memory only. Smoke không phải full ACL/E2E hoặc old-session restore.

Auth custody chỉ exact `--only auth`, fresh nonexisting private destination, no force/import/export-on-exit. CLI exit/close0 + source-bound awaited postExport fulfillment + exact private three-file schema + two hashes cách1s bằng nhau mới custody PASS. Public SDK pagination field là pageToken; zero tenant gates trước/sau/sát export. Raw accounts booleans chỉ actualboolean hoặc absent→false, không coercion.16MiB/32files/256entries và256KiB/stream deadline120s là best-effort admission/observation; không hard producer quota. Failure/cap/timeout→HOLD_WRITER_COMPLETION_UNKNOWN; giữ services/partial artifacts, không suy export client exit là Hub writer đã ngừng.

Sau01Rb PASS giữ detached managed services chạy. Không tự stop, forward signal theo port/group cũ, export-on-exit hoặc cleanup retained media. Unknown lifecycle/retained Storage entry (kể cả0B) cần HOLD và coordinator review; không thao tác existing Firestore/Docker. Capture process/source/listener receipts là non-atomic best effort; không hard sandbox hoặc full loaded-binary attestation.

## Historical M1/M2 review workflows

Các workflows dưới đây mô tả M1/M2 đã Accepted; chỉ sử dụng khi runtime và task tương ứng được gate riêng. Hiện01Ra không chạy CMS UI/session, data workflow hoặc business mutation.

## Import và sửa nội dung toàn site

Nếu `home-v2` chưa có, OWNER chọn **Khởi tạo website từ bản bàn giao**. Đây là import rõ ràng, không tự chạy khi login. API pin baseline/report, dùng CURRENT M1 Hero/SEO tại revision yêu cầu và tạo riêng Draft v2. Baseline gồm 6 services, 8 cases, 5 visible client logos. M1 `home` và history v1 tiếp tục riêng. Runtime bàn giao hiện đã có `home-v2`; không import lại để review.

EDITOR/OWNER có thể sửa Settings/Header/Hero/SEO/Clients/Services/Work/About/Reel/IP/Contact/Footer qua preset baseline. Chọn **Lưu website** rồi reopen hoặc xem bản nháp đã lưu để kiểm giá trị. Record dùng ID ổn định; hỗ trợ thêm, archive/ẩn, reorder và sửa references trong typed patch. Không hard-delete. Cap: 12 services, 24 projects, 12 client logos, 12 ảnh gallery/project. Hoàn tất hoặc bỏ ô thêm record đang nhập trước Save; input chờ sẽ chặn Save. Media chỉ chọn finite catalog hiện có; không upload hoặc tạo artwork mới.

Save là chuỗi typed PATCH tuần tự, không phải transaction cho toàn form. CAS (so revision trước khi ghi) bảo vệ cạnh tranh:

- Nếu 409/conflict, UI giữ fields chưa lưu; đối chiếu current Draft rồi quyết định reconcile/reload. Không retry bằng cách bỏ expected revision.
- Nếu lỗi giữa chuỗi, nhóm đã nhận receipt hợp lệ được ghi nhận; nhóm chưa lưu còn dirty. Không gọi cả form đã Save.
- Nếu mất response,503 hoặc receipt sai, intent giữ nguyên key/body để retry. Không đổi nội dung request đang chờ hoặc coi lỗi là thành công.

Preview Draft chỉ lấy saved content. Chọn Snapshot giữ nguyên content/version/hash của Snapshot dù Draft tiếp tục sửa; **Xem bản nháp đã lưu** mới chuyển lại Draft. PRIVATE iframe sandbox không script, có outer native scroll/pan cho khung390/1440. Logout hoặc response cũ đến muộn không được phục hồi private state.

## Gửi, đối chiếu nguồn và duyệt

1. EDITOR/OWNER chọn **Gửi website đã lưu để duyệt**. Sao chép mã Snapshot trả về; bản gửi bất biến, không tự cập nhật theo sửa Draft.
2. Đăng xuất; REVIEWER hoặc OWNER khác tác giả nhập mã rồi chọn **Mở bản website**. PUBLISHER chỉ đọc. OWNER cũng bị từ chối tự đối chiếu nguồn và tự duyệt cả hai outcome.
3. Đọc authorized source excerpts và PDF credential local. Chọn **Tải chứng cứ**, rồi **Trang tiếp** nếu còn trang. Mỗi thao tác ghi đối chiếu tối đa16 factual groups; tải lại state theo đúng Snapshot/sourceRevision.
4. NEW/CHANGED factual groups, kể cả section/record đang ẩn, cần SOURCE_CHECKED của đúng Snapshot/hash. Tạo đủ chứng cứ cần thiết trước quyết định **Chấp thuận**. Creative-copy declaration cần chọn rõ; nếu chọn SOURCE_CHECKED, creative-copy cũng cần chứng cứ đã pin.
5. Chọn outcome rồi **Lưu quyết định website**. Decision pin content hash, source revision, attestation IDs/set digest. Một terminal decision thắng race; stale check/review không thay proof của bản khác.

SOURCE_CHECKED là lời đối chiếu do reviewer ghi, không tự chứng nhận sự thật hoặc quyền sử dụng artwork. Baseline không đổi vẫn UNVERIFIED theo nhánh legacy explicit; không tự dựng checkedBy/client confirmation. SourceCatalog chỉ summaries hiện có; không fetch Drive URL hoặc mở private filesystem endpoint. Credential xem tại [PDF local](http://127.0.0.1:5010/assets/Pinky-Lamb-Credential-2026.pdf). URL showreel nguồn được pin chỉ là metadata hiện có.

## Tải và export tệp QA v2

Với Snapshot terminal APPROVED, chọn **Chuẩn bị tệp QA đã chấp thuận**, sau đó **Tải tệp QA local**. Tệp tối đa1MiB, không token; exact keys là `qaEnvelopeVersion:2`, `snapshot`, `reviewState`, `review`, `sourceChecks`. Exporter kiểm độc lập version/hash/proof/local bytes. Những checks ghi cho mọi group có thể nhiều hơn subset proof bắt buộc được APPROVED review pin; không thay subset bằng toàn registry mutable.

Sao chép đúng tệp vừa tải vào `.local/cache/m2/site-proof.qa.json`. Đặt `qa_snapshot_id` bằng mã Snapshot trong tệp/CMS, rồi chạy:

```sh
qa_input=".local/cache/m2/site-proof.qa.json"
qa_snapshot_id="ID_COPIED_FROM_CMS"
npm run export:local -- --site-envelope "$qa_input" --out ".preview-output/m2/$qa_snapshot_id"
```

Thay placeholder bằng ID thực; output phải khớp chính xác ID của envelope. V2 dùng `--site-envelope`, không dùng `--snapshot` v1. Guard chỉ nhận input fixture đã allowlist hoặc dưới `.local/cache/m2/` và output `.preview-output/m2/<snapshotId>`. Không export vào baseline/dist hoặc serve CMS/private source làm artifact.

V2 kiểm40 public baseline pins, copy37 file giữ nguyên, thay `index.html` và loại baseline `app.js`/`content.js`; tạo2 interaction files và `qa-manifest.json`. Kết quả40 manifest paths/41 physical files. Đây là artifact manifest công khai, khác mediaManifest của Snapshot vốn còn pin hidden assets. Artifact có metadata/một H1/toàn visible content khi JavaScript tắt; JS chỉ enhance menu/filter/load-more/case/gallery/reel/focus/brief. Contact brief vẫn mailto/copy, chưa có backend nhận lead.

Export offline không gọi Firebase/Hosting/API hoặc đổi current pointer; notice cố định **Bản thử local — chưa xuất bản**. Export kiểm quan hệ proof/hash/local bytes, không chứng minh DB identity của input hoặc nội dung đã được người dùng nghiệm thu. Symlink/path escape/non-file bị từ chối trước writes; unknown regular files giữ nguyên. Known output dùng temporary sibling+rename từng file: không phải transaction atomic toàn export. Test artifact phục vụ tại4173 và tự đóng server; URL4173 không được báo là đang chạy sau test.

M1 legacy command vẫn hỗ trợ:

```sh
npm run export:local -- --snapshot tests/fixtures/approved-hero.json --out .preview-output
```

Fixture là synthetic QA, không phải human editorial approval. M1 exporter và literal v1 hash/receipt compatibility đã được kiểm trong lượt cuối.

## Offline checks and evidence limits

Trong01Ra chỉ chạy exact recovery units, affected local-guard units và focused lint. Generic integration/E2E/seed vẫn REFUSE; healthy TCP/Hub map không cấp quyền suite hoặc reseed. Không native startup/API/Auth-create/export trong code phase.

[QA-M1](QA-M1.md), [QA-M2](QA-M2.md) lưu kết quả lịch sử riêng.153unit/121integration/131browser của M2 không chứng minh runtime hiện tại; dependency audit lịch sử0Critical/3High/2Moderate không phải fresh audit của recovery. Không audit fix/install/upgrade trong slice này.

Four owned paths: local-guard.mjs, recover-auth-local.mjs, runtime-recovery.test.mjs, LOCAL-RUNBOOK.md. Frozen source/evidence và prior source archives được giữ; source-relocation map pin original guard/runbook thay vì rewrite historical indices. Root giữ approval register/review và chỉ mở01Rb sau actual High gate.

## R1 same retained runtime correction — native continuation still gated

First01Rb run is HOLD before Auth-create/smoke/export. Known read-only inventory counted4443 documents. Hub returns all eight fixed name/host/port values; pinned Hub/controller omit undefined own listen for functions/eventarc/tasks because those components are added after the Hub snapshots its initial listen map. The corrected operator permits only this omission. Present listen is strict singleIPv4; the other five require listen. Native source/process/listener ownership remains mandatory for all eight.

The same runtime-recovery-live selector may continue only the internally fixed prior HOLD/index and run token YNT2Wz7uQ3G8sEzkrIxXgg: CLI15465/PGID15465/start Mon Oct12 14:58:14 2026 and RulesJVM15525/parent15465/start14:58:18. Archived operator15456 exit/close1 and recorded reparent toPPID1 bind this exact transition. There is no generic orphan adoption, caller locator/new target/flag, startup/restart/signal or fake ChildProcess/Registry handle. Any unknown generation/owner/listener fails closed.

The old CLI continues its original High-approved loaded policy; no reload is claimed.31 exact policy/preload sections are compared against the archived loaded guard26ee7699…bd33b. Prior High/release hashes, first immutable HOLD evidence and four original source archives are bound separately from the current renewed High release. New HTTP workers load the corrected file under the current source-bound gate, with the same unchanged worker/fence/parser/socket policy.

A continuation creates only fresh append-only operator receipts under this existing owned run root. It never overwrites original runtime-owner.json/recovery-observation.json or the first HOLD index. Fresh external Firestore tuple, full known-history equality against the original before inventory, current Auth/tenant metadata and eight managed proofs must pass before any create. Auth export gets a new nonexisting destination. Interrupted/unknown state stays HOLD; no rollback or implicit stop. This correction phase is code/unit/lint only. Actual continuation, Auth create and custody remain NOT_RUN until root issues the renewed actual High gate and native release.

Single continuation admission uses the fixed continuation-admission.json in that retained run. Atomic wx/no-overwrite wins once before observer directories/SDK/API; any existing/unknown continuation entry refuses. The latch remains unchanged after PASS/HOLD. There is no automatic retry, removal or stale-latch bypass. A later coordinator continuation decision must first establish prior terminal/closed state and absence of any pending create/Hub writer; process exit alone does not establish cancellation. This code gate authorizes no such later lifecycle action.

Before continuation admission and again at ownership barriers, the exact retained root/cwd/tmp/config/configstore/profiles/cache/data/discovery directories must still be no-symlink regular directories owned by the current UID with mode0700. Drift is HOLD; no chmod, repair or adoption. Unit privacy negatives use metadata records only and do not touch the held runtime.


## M3-RUNTIME-02 revision1 / freeze generation3 — source phase

Direct human approval is recorded in `.local/cache/m3/runtime-policy-correction/approved-resume-20261012-1730/approval-observation.json`. Current work is 02a code/pure units only. Technical planning or unit PASS does not release native controls, preservation, signals or fresh startup.

Fixed graph: 02a → independent High → `runtime-policy-control` (02b) → High → `runtime-policy-preserve` (02c) → High → `runtime-policy-stop` (02d) → High → `runtime-policy-recover` (02e) → High. Every later phase requires all prior actual source-bound releases under `.local/cache/m3/runtime-policy-correction/`. These use exact amendment/revision/freezegen3, current four source records, frozen bundle and linked actual High receipt. Later native gates also bind the actual phase evidence bytes. Medium never writes a genuine High release. R1 `runtime-recovery-live` retains its stale/current source gate and cannot bypass R2.

The guard footer now runs an explicit async main without syntactic module-level await. Both UNIX mapping seams preserve Node22.23.3's actual normalized tuple and its marker/callback. The registered CLI binder is shared with the isolated control; the control is not a fabricated production CLI/worker profile. Node test launcher raw argv and actual file child argv/execArgv are attributed separately. Safe pure test receipts show the installed child retains concurrency and one literal name-pattern flag; actual 02b profile mismatch must HOLD.

The 02b control installs HTTP/HTTPS/TCP-client/TCP-server refusal before public synchronous API require. Only one exact internally owned UNIX peer path is then admitted, with private owned Node TMP and exact actor/parent/raw argv/generation evidence. Peer/server close and socket absence require actual observations. The 120-second / 256-KiB-per-stream controls are best-effort observations, not kernel quotas. Timeout or unknown actor closure retains HOLD evidence; no arbitrary signal or hard cleanup claim. Native require/IPC have not run during 02a.

Before any stop, public Auth users and tenants must both be zero. Any existing user, including an expected fixture, forbids stop. Empty Auth custody must be a genuine three-file/two-directory default-schema export with actual fulfilled Hub request, real client exit/close0 and two identical full private tree observations one second apart. No fabrication, import, reset or Auth-history/session restore. New export clients use current R2 source gates and an explicit safe Node environment; the old Hub keeps its pinned old loaded policy.

Storage requires no-follow zero all blob/staging entries, including zero-byte files, directories, links and unknown types. This is combined with exact indexed closed operator/pre-create phase receipts, executed read-only request source and zero active/unexplained owned workers. No-known-owned-upload is derived from that bounded workflow; uploadsMap and external concurrent writers remain UNKNOWN. Diskzero/logabsence alone does not prove global quietness. Unknown source coverage, staging state or producer attribution must HOLD. No additional Storage API, export or memory hook is authorized.

Preservation copies are private, bounded and source-hashed before lifecycle. A stop needs a fresh zero/custody/history/ownership barrier and a final synchronous exact CLI/JVM/listener/source/external tuple check after all awaited work, immediately before one SIGINT to PID15465. The old R1 admission latch is never cleared. No PGID/Java/foreign signal, second signal or escalation. Real old-group/JVM and all-eight-listener absence plus unchanged external Firestore are the oracle; log/allgreen/exit0 is insufficient.

Only a later actual 02d absence PASS permits a fresh fixed eight-service runtime. New workers must load corrected source, with unchanged production CLI flags, SDK versions, fence/parser/config/source closure. Reconstruction remains seven exact missing-only Auth fixtures, no existing updates or Firestore mutation; R1 session/Hosting/Storage/history/custody oracles remain mandatory. Traces contain only fixed probe/stage/component/method/pathname/source-id/status/timeout, never query/headers/token/password/body.

Process `ps` observers explicitly use `Asia/Ho_Chi_Minh` per query; runtime/global TZ is not changed. Historical raw values remain preserved, and current profiles label observer timezone. The pinned Functions worker's TZ=UTC is not normalized away or treated as a generation exemption.

Old source eras (initial ba0, loaded26ee, reviewed R1 e7), code/native HOLD indices, prototype/report receipts, Firestore custody and data remain separate immutable evidence. Original04/05, feature AC/E2E, Accepted/LOCAL_COMPLETE/M4/production/Git remain closed. No native/API/data/export/signal/start/retry was executed by 02a.


### R2 historical input binding correction

The first 02a freeze is historical and remains unchanged. Final High found a runtime binding gap: R2 read original owner/history through an index without independently checking that index's SHA. The R2 historical reader now uses a fixed index-authority allowlist, including the existing first-HOLD index `c4684992548d04ab394d5a7563888820d87fec50987a2840fae5cfae7265f02f`. Original owner, original before/history and both terminal phase proofs use bounded no-follow private typed reads before use. Index and member must match exact bytes/hash/mode/single-link/UID; simultaneous index/member replacement cannot authorize itself. This uses current R2 gates and never invokes the stale R1 release or old-current policy parity. Code/unit correction only; native02b remains pending renewed final High.


### R2 fixed stage trace — source-only correction after 02c HOLD

The first 02c attempt remains `HOLD`; its empty trace does not establish the first failing operation or zero network activity. `R2_OWNERSHIP_UNKNOWN` was a generic fallback, not a verified ownership cause. Its consumed atomic admission, original receipt, source snapshots and actor evidence remain preserved.

The corrected operator records only fixed `stage` and `state` fields (`BEGIN`, `COMPLETED`, `REFUSED`) around the existing prechecks, environment/fence, SDK load and preservation operations. It admits at most 256 trace entries before a stage factory starts, invokes that factory once, and records refusal rather than completion when that factory throws. It does not capture exception messages, classes, stacks, URLs, requests, state payloads or environment values. Existing typed refusal codes remain unchanged; an untyped error is `R2_UNCLASSIFIED_FAILURE`.

These stages have pure fault-injection coverage only. They are not observations from a new native attempt. The source change makes the previous source-bound 02a/02b gates and native control proof historical/stale for this current four-source array. A renewed actual High source gate and separately approved fresh-attempt plan are required; do not clear, overwrite or replay the consumed 02c admission. This correction grants no API, export, Auth mutation, stop, restart or signal authority.

## CMS-RECOVERY-001 v1 — profile song song chỉ xem M2

Scope mới được user Approved ngày quan sát 13/10/2026: đăng nhập và xem dữ liệu M2 hiện hữu qua profile riêng. Không mở lại M1/M2, không nghiệm thu M3/M4 hoặc LOCAL_COMPLETE. Các receipt/latch R1/R2/R3 bên trên giữ nguyên và không cấp quyền cho profile này.

Profile cố định: project `demo-pinky-lamb-cms`; loopback `127.0.0.1`; Admin 5175, Auth 9098, Functions 5002, Hub 4401, Logging 4501, Eventarc 9298, Tasks 9498. Firestore 8080 và Hosting 5010 được giữ lại để đọc. Không stop/restart hoặc ghi old Auth 9099, old Storage 9199, old CLI/JVM, Firestore hay Docker. Backend package `cms-recovery-api` chỉ export một `cmsApi` HTTP, dùng authorization/business modules hiện hữu. Mọi nonGET nhận 405 trước authorize/dispatch. GET Hero cũ bị từ chối; snapshot/source-check phải thuộc catalog M2 hiện hữu.

Source build được phép trước native release, không mở listener hoặc load Firebase SDK. Dùng Node 22.23.3 đã có và Vite 8.3.4 đã pin:

```sh
PINKY_M2_RECOVERY_BUILD_TOKEN=<fresh-uuid-v4> .local/cache/node/node-v22.23.3-darwin-arm64/bin/node node_modules/vite/bin/vite.js build --mode m2-recovery --configLoader native
```

Output riêng tại `.local/test-outputs/cms-recovery-001/builds/<uuid>`; Vite cache ở custody mới. Không overwrite `admin-dist`, không cài dependency hoặc sửa `node_modules`. Mode mặc định vẫn dùng profile lịch sử. Recovery mode define `RECOVERY_READ_ONLY`, chuyển CSP Auth/HMR sang 9098/5175 bằng transform HTML và giữ sandbox iframe rỗng; không đổi source `admin/index.html` hoặc tích hợp M3 Blob CSP.

Native và data/UI selectors **chưa được release chỉ vì source build/unit pass**. Node operator là `scripts/m2-recovery-local.mjs`, nhận đúng một trong:

- `native-controls`: cần current source-bound actual High review và root release; atomic epoch tối đa 3 attempts, completion-unknown không replay.
- `inventory-before <runToken>` / `inventory-after <runToken>`: đọc paged tất cả `cmsMembers` và 9 history collections, page 25, tổng tối đa 20.000 documents/256 MiB/120 giây; giữ content hashes và createTime/updateTime. Đây không phải atomic whole-database backup.
- `fixtures <runToken>`: cần native + BEFORE + High phase gate; tạo đúng 7 fixture mới trong Auth 9098, passwords riêng trong file 0600. Không update/delete/claims hoặc ghi membership/Firestore. Pending create giữ partial state/HOLD, không blind retry.
- `auth-custody <runToken>`: export chỉ Auth mới qua Hub 4401, await writer fulfillment, giữ custody riêng 0600. Pending/timeout không cho export tiếp hoặc stop services; không có selector gửi signal.
- `reconcile <runToken>`: chỉ quan sát current new Auth; không tạo/xóa/stop và không tự xác nhận writer completion.
- `ui-build <runToken>` / `ui-serve <runToken>`: selectors riêng với phase release; native config loader và fixed profile. Actual source/privacy gate bắt buộc trước 5175.
- `ui-privacy <runToken>`: actual 403/CSP/sandbox check ngay sau fresh owned listener, trước authenticated browser.
- `ui-browser <runToken>`: cần typed browser release và genuine High receipt cùng run; BEFORE/AFTER inventory bao quanh tests. TMPDIR/TMP/TEMP/MAC_CHROMIUM_TMPDIR dùng owned runtime `tmp`; native Chromium temp và rendered results phải quan sát thật.

Mỗi selector có phase receipt riêng `phase-release-<selector>.json`, đúng task/revision/project/run/sources. Actual technical High reviewer là `/root/pdf_setup_reviewer`; root coordinator ghi release với route riêng. Không ghi root là High khi observed route là xhigh. Evidence native phân biệt SDK module load với authenticated Auth/Firestore RPC; live data/browser outcomes chỉ ghi khi đã chạy.

Stdout/stderr capture tối đa 256 KiB mỗi stream, giữ byte counts. Deadline dừng diagnostics nhưng giữ partial new services; không force kill, clear latches hay xóa dữ liệu. Runtime đã PASS được giữ để user review. Reports/screenshots phải xuất phát từ giao diện thật; user acceptance luôn riêng và pending tới lời nghiệm thu trực tiếp.


### CMS-RECOVERY-001 routine source repair after attempt1 safe close

Attempt1 was closed by the actual High reviewer as `CLOSED_SAFE_NO_PENDING_OR_LIVE_CHILDREN`; Coordinator released source repair before any source changes. The second source candidate requires a fresh source-bound High review before attempt2.

- Fixed file-output discovery admits only the pinned producer's literal `PORT=80`, exact manifest output path and dedicated source; network `serveAdmin` remains refused.
- Only fixed Hub GET startup requests may retry a request `TimeoutError` while the outer 120-second deadline remains active. Schema, identity, preload and expired outer deadline failures hold immediately.
- The new M2 connect adapter preserves Node's marked TCP tuple/options with `path:null` and maps only registered string Unix paths. Historical R2/R3 adapters and loopback/port fences remain unchanged.
- Hub Auth custody validates the actual public GET config projection (`signIn`, `emailPrivacyConfig`) and raw metadata/accounts with 0..7 owned roster users. `blockingFunctions` is not fabricated; full internal Auth config remains Unknown.

Actual attempt2, fixture/data operations and browser/TMP effectiveness remain `NOT_RUN` until their separate gates release.


### CMS-RECOVERY-001 routine source repair after attempt2 safe close

Coordinator released repair03 after actual High closed attempt2 safely. Hub service readiness precedes Functions discovery completion. The new source-bound startup oracle waits for exact discovery child admission, natural exit0 completion, valid private manifest and completed `controller.startAll` before API/worker ownership probing. Pending fixed startup artifacts are bounded by the existing 120-second operation deadline; malformed identities/schema, nonzero/signal exits and missing manifest after completion hold immediately. No child is stopped by this wait.

The only additional accepted discovery raw argv form is literal `node <CMS>/node_modules/.bin/firebase-functions <CMS>/cms-recovery-api`, produced by the pinned executable's `#!/usr/bin/env node` entry and pinned PATH. Pinned execPath/version/cwd/parent/PGID/source hashes remain mandatory. Raw argv is preserved as observed; it is not rewritten to an absolute executable.

Repair02 PORT80/TCP-null/public Hub export projection controls remain unchanged. Current pure tests cover empty, partial and full7-user raw Auth export validation. Attempt3 remains `NOT_RUN` until fresh source-bound High review and coordinator native release.


## CMS-RECOVERY-001 v2 — current approved recovery lane

v1 history/admissions are immutable and its three-launch budget is exhausted. v2 uses only `.local/cache/cms-recovery-001/v2/` and `.local/test-outputs/cms-recovery-001/v2/`. One exclusive `v2/epoch/attempt-1.json` admission is consumed before directories/spawn; completion or failure never grants another launch. Current source-bound High release must bind immutable `v2/source-base.json`, current9 runtime sources, current39 closure, current genuine High observation, coordinator xhigh observation, retained baseline and SHA256 of `v2/transition/closure-high-review.json`. The mutable approval ledger is not a runtime hash pin.

Startup runs one maintained ordered orchestration: source/CLI identity and fence → exact pending CLI preload receipt → Hub identity → discovery child exit0 + private valid manifest + controller completion → fresh full Hub map → current worker/Unix/anonymous401 → four before-dispatch405 refusals → retained identity. Known pending artifacts wait within120s. Unknown identity/schema/nonzero/signal/deadline stays HOLD. No automatic signal, restart, phase bridge, fixture or SDK RPC is part of native controls. The `native-controls` selector keeps the original parent session alive after PASS until the new CLI exits naturally.

From the CMS directory, use the absolute existing pinned Node:

```sh
/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/pinky-lamb-cms/.local/cache/node/node-v22.23.3-darwin-arm64/bin/node /Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/pinky-lamb-cms/scripts/m2-recovery-local.mjs native-controls
```

Only after the corresponding root release, other selectors use the same absolute Node plus `/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/pinky-lamb-cms/scripts/m2-recovery-local.mjs <selector> <runToken22>`. Selectors: `inventory-before`, `fixtures`, `auth-custody`, `inventory-after`, `reconcile`, `ui-build`, `ui-serve`, `ui-privacy`, `ui-browser`. Fixed gates are `v2/native-control-release.json`, `v2/ui-source-release.json`, `v2/ui-browser-release.json` and `v2/runs/<token>/phase-release-<selector>.json`, all private0600. Schema contract and current source arrays are archived with the final v2 freeze; templates are not release evidence.

Inventory retains all10collections under existing20k-document/256MiB caps. The private read catalogue selects one existing M2 snapshot deterministically byID for representative browser verification, with at most61 current source records. Expected source IDs come from the existing trusted snapshot/review reader: approved pinned review IDs or current active IDs, never all superseded history. Historical documents remain fully inventoried and unchanged. Missing/invalid retained data causes HOLD; no import, seed or repair.

Auth fixture roster remains exact7 newly owned users on9098. Hub custody uses its raw two-field public config projection and exact3file/2directory private tree; two identical snapshots at least1s apart plus fulfilled producer/zero tenants prove custody. Unknown/pending writers preserve partial state; no blind retry or destructive cleanup.

`ui-browser` launches only the pinned Node with explicit `--experimental-vm-modules --test --test-name-pattern=^live:` and v2 opt-in. NODE_OPTIONS remains absent. The child test limit is110s, activity deadline80s, enclosing operation120s. Exit0 alone cannot pass: same-run/current14 typed completion, real four-role/three-denial results and hashed HTML/PNG/screenshots are required. A pending/live/failed child causes HOLD; no force kill. Actual child exit is recorded. The parent performs readonly BEFORE/AFTER comparison; acceptance remains PENDING. Private temporary Chromium scratch retains its approved short-path ownership checks and durable evidence under v2 folders.

Safe checks use pinned Node; UI safe tests additionally need explicit VM flag. Vite source build uses `--mode m2-recovery --configLoader native` and a fresh `PINKY_M2_RECOVERY_BUILD_TOKEN` for each unique v2 output. No original `admin-dist` overwrite. Native/SDK/Auth/HTTP/browser operations remain gated and NOT_RUN during source verification.


### Current v2 amendment — diskCustody focused repair, cumulative slot2

Direct human approval grants exactly one additional emulator launch. Prior v2 attempt1 and its genuine completion stay immutable; the cumulative ceiling is2. Slot2 is the only new admission. A consumed/open/failed/completed slot2 never grants reset, replay or slot3. `v2/epoch/attempt-2.json` is created exclusive0600 only after exact attempt1/completion identity and immutable approval/closure pins match.

New immutable authority/baseline/release live under `.local/cache/cms-recovery-001/v2/disk-custody-fix/`: `approval.json`, `closure-high-review.json`, `source-base.json`, and the new `native-control-release.json`. The old v2 release is retained. The new release binds current source9/closure39, genuine High/coordinator observations, baselineSHA, `additional_attempt:2`, `amendment_sha256`, `symlink_manifest_sha256`, `slot1_completion_sha256`, `slot1_closure_sha256`, retained baseline and prior v1 closure pin. Source/UI/business assertions remain active; no old proof is release authority for new source bytes.

Disk custody now records the complete directory/file/link tree. The only permitted symlink leaves are the exact20 independently verified historical negative fixtures pinned in `ops/symlink-manifest-0be62cea-e7e7-42fc-a73e-3c0a4d240397/symlink-manifest.json`. Their raw target and lstat identity are recorded without opening or following the target. Manifest `sha256` hashes UTF8(rawTarget), not targetfile bytes. Unknown/missing/changed links, special files, aliases, hardlink/type/identity drift and read/membership races remain HOLD. No fixture is skipped or deleted.

Genuine regular bytes are hashed opaquely through `O_NOFOLLOW | O_NONBLOCK` descriptors with pre-read/post-read fstat and path identity checks. Directory membership/identity is compared before and after recursion. Existing20k-entry/256MiB/120s and16MiB per-file limits remain. No account content is parsed or printed. Regression fixtures are created only in new owned `disk-custody-fix/tests` cache; legacy runtime-recovery tests are not run.

One authorized passive whole `.local/emulator-data` scan may prove `PASS_DISK_CONTRACT_ONLY` before the new launch. It does not prove Firestore BEFORE/AFTER, whole-database preservation or user acceptance. Those still require the reviewed native/data/UI chain. UIr3, current read-only roles/API/privacy behavior and source closure remain unchanged. Use absolute pinnedNode plus absolute operator path as above; no SDK/HTTP/Auth/CLI action is authorized by source tests alone.


### Current v2 Vite amendment — recovery public ESM, cumulative slot3

Direct human approval grants exactly one additional emulator launch after the two used admissions. The recovery config now sets `optimizeDeps:{noDiscovery:true,include:[]}`. Public ESM resolves from the permitted `node_modules` tree; private `.local` cache is not a browser module bridge. Default profile, private HTTP/import guards, CSP, empty iframe sandbox, roles and read-only M2 API remain unchanged.

Authority and current source release are under `.local/cache/cms-recovery-001/v2/vite-fix/`: immutable `approval.json`, `approved-base.json`, `closure-high-review.json`, and new `native-control-release.json`. This release binds current source9/closure39 plus `additional_attempt:3`, Vite `amendment_sha256`, `slot2_completion_sha256`, `slot2_closure_sha256`, existing20-link `symlink_manifest_sha256`, `slot1_completion_sha256`, `slot1_closure_sha256`, v1 closure and retained baseline. All old gates/admissions/completions stay immutable. Only `epoch/attempt-3.json` may be appended with exclusive0600; no reset/replay/slot4.

Slot2 closure truthfully records owned processes absent and private export preserved only. Natural CLI exit remains UNKNOWN; no dedicated HTTP200 receipt was captured for the old export flow. These limits are retained, not promoted to a full Auth custody PASS. Slot3 uses only new synthetic Auth fixtures after its genuine source/native/data gates. Old M1/M2 Auth/data are not reseeded.

Before slot3, the opt-in QA test uses the installed Vite API and `createLocalViteConfig` on fixed127.0.0.1:5175 with an owned fresh cache. It performs only public module GET and private403/import-denial checks, then awaits server close. It does not invoke Auth/API/emulators. Command from CMS root: `PINKY_M2_VITE_QA=CMS-RECOVERY-001-v2 /Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/pinky-lamb-cms/.local/cache/node/node-v22.23.3-darwin-arm64/bin/node --experimental-vm-modules --test --test-name-pattern='^dev:' /Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/pinky-lamb-cms/tests/m2-recovery.local.test.mjs`. Runtime permission failures are environment failures, not product RED.

Native and subsequent phase selectors use the absolute pinned Node and absolute operator path above, with separate current root releases. Safe UI tests retain `^safe:` selection; no broad legacy tests. Actual login/M2/screenshots require the reviewed live chain and BEFORE/AFTER preservation. Source tests and dev graph PASS alone do not prove those outcomes.
