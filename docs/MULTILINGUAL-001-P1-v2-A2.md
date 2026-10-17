# MULTILINGUAL-001 P1 v2 — A2 v1: ảnh trong private preview

## Trạng thái hiện hành — đã hoàn tất theo xác nhận của Khiêm

**ĐÃ HOÀN TẤT / CLOSED_BY_HUMAN_CONFIRMATION — 17/10/2026 (Asia/Ho_Chi_Minh).** Xem [xác nhận trực tiếp, phạm vi đóng và bảng trạng thái hiện hành](../../tasks/plan.md). Khiêm xác nhận các plan đã xong và giao chỉ đồng bộ tài liệu, không sửa code hoặc chạy lại kiểm thử.

Các trạng thái chờ duyệt/chưa hoàn tất, checkbox và bước tiếp theo trong phần bên dưới thuộc lịch sử trước xác nhận đóng; không tự mở lại plan/task từ các ghi nhận đó. Giữ nguyên bằng chứng PASS/FAIL/NOT_RUN, cờ kỹ thuật và giới hạn đã ghi nhận. Lần đồng bộ này không xác minh runtime, không ghi nhận release hoặc cấp quyền thực thi mới.

## Nội dung lịch sử trước xác nhận đóng


Ngày 16/10/2026. **APPROVED / IN_PROGRESS**. Owner: root. Đây là bổ sung cơ chế ảnh preview; thiết kế HTML đã duyệt giữ nguyên.

## Vấn đề đã kiểm chứng

Browser hiện tại tải được hai ảnh Blob trong DOM cha (400/830px), nhưng cùng URL trong iframe `srcdoc` có `sandbox=""` đều có `naturalWidth=0`. Có hai URL còn active, không có revoke sớm; console báo `Not allowed to load local resource`. [Diagnostic](../.local/test-outputs/multilingual-001/p1-v2/browser-v2-image-proof-20261016/browser-results/tests-hero-localization-ui-b0cbc-nd-responsive-saved-preview/image-diagnostic.json).

Thử nghiệm tài liệu HTML Blob cũng bị `frame-src 'self'` chặn; không có tài liệu con được nạp. Cleanup thu hồi cả ba URL, active=0. [Experiment](../.local/test-outputs/multilingual-001/p1-v2/browser-v2-blob-document-experiment-20261016/browser-results/tests-hero-localization-ui-6910f-ge-and-policy-compatibility/blob-document-experiment.json). Kết quả thử nghiệm không phải implementation hoặc preview PASS.

Giới hạn truy cập Blob phụ thuộc môi trường tạo và storage key. [MDN — Blob storage partitioning](https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Schemes/blob#storage_partitioning). Đây là nguồn giải thích cơ chế; kết luận lỗi của dự án dựa trên browser evidence ở trên.

## Thay đổi xin duyệt

1. Giữ private preview QA2 trong `srcdoc`, sandbox rỗng và các kiểm tra locale/revision/base/content/presentation/hash hiện có. API/QA bundle vẫn trả metadata và bytes theo contract hiện hành; không nhận data URL từ người biên tập hoặc API.
2. Sau khi đọc và xác minh kích thước/SHA-256 của từng ảnh cùng MIME từ **authority metadata**, controller tạo `data:<MIME>;base64,<bytes>` chuẩn tắc từ chính bytes đó. Resource MIME, derivative MIME (nếu có) và data-URI MIME phải bằng nhau. Không tuyên bố source hiện tại đã sniff chữ ký bytes. Chỉ bốn MIME ảnh đã có trong resource schema: WebP, PNG, JPEG, SVG. SVG chỉ được nhận nếu không có derivative và URL là trusted legacy5010 đã xác minh; chỉ dùng ngữ cảnh `<img>`, không chèn markup SVG vào DOM. Derivative upload tiếp tục dùng safe derivative hiện hành. Fixture WebP phải khai `image/webp`; không dùng fixture sai MIME để chứng minh pipeline.
3. Renderer QA2 PRIVATE chỉ nhận data-image URI có MIME khớp resource, base64 chuẩn tắc và decoded byte length chính xác; không nhận HTML/script MIME, URI tùy ý hoặc dạng percent-encoded. Authority/hash của bytes thuộc `readHeroQaResource` và controller; renderer không thay kiểm tra hash bằng regex. Nội dung text tiếp tục escape.
4. Thêm duy nhất `data:` vào **`img-src` của parent và private child**. Parent dự kiến: `img-src 'self' http://127.0.0.1:5010 blob: data:`. Child dự kiến: `img-src http://127.0.0.1:5010 blob: data:`. Giữ nguyên mọi directive/origin khác và một fixed style hash đã duyệt. Không đổi `default-src`, `script-src`, `connect-src`, `frame-src`, sandbox hoặc Auth/ACL. [CSP3 — img-src](https://www.w3.org/TR/CSP3/#directive-img-src).
5. Tính chi phí logical trong **cùng shared budget 64 MiB**, bằng công thức và lifecycle bên dưới. Vượt budget thì từ chối preview rõ ràng, giữ form/bản lưu, không cắt ảnh hoặc tăng cap. Gói ảnh lớn có thể bị từ chối do chi phí encoding; không hứa giới hạn heap/RSS hoặc thời điểm GC.
6. QA1 parsing/renderer/export và QA2 export vẫn dùng profile/resource closure/static relative paths hiện có. Thay đổi này không đưa data URI vào QA export hoặc kích hoạt website :5010.

**Tác động bảo mật cần duyệt:** parent cho phép thêm scheme ảnh `data:` trên toàn tài liệu CMS. Đây là mở rộng chính sách ảnh, dù script, frame, kết nối, sandbox và validation của các luồng khác giữ nguyên. Không gọi đây là CSP không đổi.

### Budget cụ thể

Mỗi resource ảnh có `n_i=sizeBytes`, `b_i=length('data:'+mime+';base64,')+4*ceil(n_i/3)`. Dedupe theo resource ID. Gọi `R=sum(n_i)`, `B=sum(b_i)`. `H0` là UTF-8 byte length của chính renderer QA2 PRIVATE với các resource URL an toàn hiện có, trước fetch ảnh. `o_i` là số lần ảnh được tham chiếu trong hai slot brand/Hero (có thể2 nếu dùng chung ID). Dùng upper bound `H=H0+sum(o_i*b_i)`; không trừ URL cũ nên không đánh giá thiếu. Một reservation tổng **`Q=R+B+2*H+32768`** tính raw bytes, unique encoded URI, srcdoc, measurement representation và32KiB scratch.

- Kiểm integer/overflow và `Q<=64*1024*1024` trước image fetch hoặc encoding. Metadata/QA read vẫn được phép; oversize không bắt đầu fetch ảnh.
- Gọi **một** `acquireMediaPreviewBinary(Q,clear,{signal})`; không acquire lồng nhau hoặc mỗi ảnh. Giữ binary lock qua các Promise fetch/hash/encoding thực tế; chỉ `settle()` khi những Promise đó settle. Encoding dùng chunk có giới hạn, không spread toàn bộ ảnh.
- Khi render thành công, giữ reservation đến teardown. Khi lỗi/stale/Auth/destroy, gỡ srcdoc và measurement DOM, xóa tham chiếu URI; release đúng một lần khi phần đang chạy đã settle. Không release lock sớm chỉ vì abort.
- Kiểm ranh giới ngay dưới/trên64MiB, duplicate ảnh hai slot, oversize không fetch, failure giữa ảnh, abort trong hash, queued owner và teardown không double-release. Đây là logical accounting phù hợp shared helper, không chứng minh physical memory hoặc GC.

### Các phương án đã loại

URL công khai5010 chỉ giải quyết legacy, không giải quyết derivative cần Auth. HTML Blob document hiện bị frame-src chặn; mở `frame-src blob:` tạo delta khác và chưa chứng minh ảnh con hoạt động. `allow-same-origin` thay ranh giới sandbox đã chốt. Vì vậy đề xuất chỉ mở scheme **ảnh** `data:` với verified bytes và budget; chưa khẳng định runtime đạt trước khi triển khai/kiểm thử A2.

## Exact paths, tasks và tiêu chí nghiệm thu

Chỉ sáu file, đều nằm trong allowlist P1 v2 hiện hành; quyền mới là delta `img-src` và representation/budget ảnh nêu trên:

- `admin/index.html` — thêm `data:` vào đúng `img-src`, không đổi directive khác.
- `admin/hero-localization-preview.mjs` — tạo data image từ verified bytes, budget/cleanup/generation fencing.
- `preview/hero-localization-renderer.mjs` — QA2 PRIVATE validator và child policy; QA1/export giữ nguyên.
- `tests/hero-localization-preview.test.mjs`, `tests/hero-localization-renderer.test.mjs`, `tests/hero-localization-ui.local.test.mjs` — contract, budget, cleanup và browser.

Thứ tự: freeze sáu source digests → triển khai lát cắt preview/renderer → unit/tamper/budget tests → browser positive/negative → actual human demo save/preview/export trong ngân sách P1 còn lại → cập nhật AC/evidence. Không ghi dữ liệu emulator trước khi browser preview đạt.

| AC A2 | Bằng chứng bắt buộc |
| --- | --- |
| 01 — Ảnh thật | Actual private controller + saved QA2; Hero/logo có `complete=true`, `naturalWidth>0`, đúng hash/locale; EN/VI/JA, desktop/mobile |
| 02 — Chính sách | Parent chỉ thêm `data:` trong `img-src`; child sandbox rỗng; style fixed hash chạy; extra style/script/event/connect/frame vẫn bị chặn. Không giảm assertion để có PASS |
| 03 — Authority | Wrong MIME/base64/size/hash/URL/unknown resource bị từ chối; data URI không đi qua API/user inputs; QA1/export profile không bị diễn giải lại |
| 04 — Tài nguyên | Tính cả encoded/HTML cost vào 64 MiB; oversize bị từ chối trước allocation phù hợp; stale/Auth/destroy gỡ private DOM và release đúng, không claim heap/GC |
| 05 — Giao diện | Đúng mockup đã duyệt, nội dung dài không bị cắt; saved preview giữ nguyên khi form dirty; UI không thêm control mới |

Các giới hạn live data của P1 v2 giữ nguyên: tối đa16 successful commits tổng cộng, chỉ ba sidecars, không đổi base/role/tài khoản/audit lịch sử. Hiện chưa có commit dữ liệu của v2; source data/hash phải kiểm lại trước live test. Chỉ có OWNER thật hiện tại; role runtime khác và IME chưa kiểm vẫn ghi NOT_RUN.

## Quyền và trạng thái

[P0 §7](MULTILINGUAL-001-P0-v2.md) chỉ duyệt một style hash và ghi **“Mọi directive/origin khác giữ nguyên.”** [APPROVAL-PROTOCOL](../../docs/APPROVAL-PROTOCOL.md) yêu cầu **“material new scope/outside allowlist phải có revised proposal/Approved trước phần mới.”** Vì vậy A2 chưa được triển khai bằng lời duyệt P1 v2 hiện có.

Lời duyệt đề nghị sau khi bundle cuối đã freeze: **`Approved MULTILINGUAL-001 P1 v2-A2 v1`**. Người dùng giữ quyền duyệt; reviewer hoặc kết quả experiment không thay approval. P1 vẫn IN_PROGRESS, chưa nghiệm thu hoặc đóng milestone; P2–P7/cloud/Production không được mở.


### Approval hiện hành — 16/10/2026

Người dùng đã gửi trực tiếp **`Approved MULTILINGUAL-001 P1 v2-A2 v1`**. Quyền triển khai chỉ bao delta A2 và sáu file nêu trên; P1 v2 vẫn đang mở. Bản tài liệu đã trình cùng sáu source digest đã đối chiếu và lưu nguyên trạng tại [snapshot A2](../.local/test-outputs/multilingual-001/p1-v2/a2-approved-20261016/). Các đoạn xin duyệt ở trên được giữ làm lịch sử; approval hiện hành được ghi trong scope JSON.

### Kiểm chứng source và fixture sau A2 — 16/10/2026

Đã triển khai đúng sáu file; một one-shot guard bảo đảm chỉ trả reservation một lần, giữ lock đến Promise thật settle. Unit cuối64/64; lint scoped đạt; browser21PASS/1AuthNOT_RUN, không expectedfailure. Actual private controller dùng bytes/hash thật trong fixture, hai ảnh có naturalWidth>0 cho EN/VI/JA, bốn viewport và nội dung dài; không thay public URLs trong case này. Mười hai browser cases khác là QA1 replay lịch sử; experiment Blob chỉ chứng minh chặn navigation. Build đúng thư mục riêng r2 đạt2.079modules/28files; lần build A2 đầu vướng lỗi logger của Coordinator, đã giữ evidence, không phải source product repair.

[Source freeze](../.local/test-outputs/multilingual-001/p1-v2/source-a2-final-20261016.json), [review](../.local/test-outputs/multilingual-001/p1-v2/security-review-a2-20261016.json), [browser](../.local/test-outputs/multilingual-001/p1-v2/browser-a2-final-20261016/browser.log). Dữ liệu/Hosting5010 giữ nguyên trước live;0commits v2. Lượt live `live-a2-20261016` được chặn ở đăng nhập demo bình thường; tối đa8commits gồm khôi phục. Actual saved QA2 endpoint/export, các role khác và IME thật chưa được coi là PASS.

### Kết quả cuối lượt A2 — CODE_COMPLETE / P1 OPEN

Final source: [32pins](../.local/test-outputs/multilingual-001/p1-v2/source-a2-final-r2-20261016.json). Unit64/64; finalheadlessbrowser22PASS/1AuthSKIP; lint/build/review đạt. ActualOWNER proof có10corecases PASS,8successfulcommits và8audit khớprequestHash/receipt; restoreoriginalhash EN9/VI3/JA3. QA2 export30HTTPfiles/12views đạt; website5010/mockup/protectedsources nguyên.

Toàn bộ live suite **20PASS/2FAIL**, không phải PASS: publicreplay navigation đã sửa/rerun; actualAuthcase timeout15phút do tabBcleanup chưa chứng minh. TabA logout và gỡ2dataimages/2measurementimages đãPASS. Không kết luận nguyên nhân ở tabB từ ảnh pageA. Testharness mới cótimeout15s quan sát/checkpoint/finalproof, chỉ source/fixture verified; không xác minh hồi tốB. Marker đãconsume, không ghi thêm. [Coreproof](../.local/test-outputs/multilingual-001/p1-v2/live-core-validation-a2-20261016.json).

P1/T10/T11 chưa đóng. Owner root; bước tiếp theo là read-only cleanupB trong normaldemo session khi có, không lặp8lầnghi. Otherroles/IME/humanvisual/languageacceptance giữNOT_RUN/chưanghiệmthu. Không xin thêm quyềnAuth, không cloud/Production hoặc P2–P7.
