# CMS-001 v2 — M3 local/emulators

Bundle revision 1, ngày 11/10/2026. **PROPOSED / AWAITING_APPROVAL; implementation NOT_STARTED.** M2 đã được người dùng Accepted/CLOSED. Văn bản này và [M3 plan](../tasks/M3-plan.md) là phạm vi mới để duyệt, không phải quyền triển khai. [Register](../../approvals/CMS-001-v2-M3-REGISTER.json) ghi riêng engineering approval, technical readiness và human acceptance. `cms_complete:false`, `local_acceptance:null`.

## 1. Mục tiêu và đối chiếu hiện trạng

M3 hoàn thiện **media library local, upload/quarantine/processing ảnh–PDF–video, quyền sử dụng media, lựa chọn media trong editor toàn site, authenticated private preview và unpublished QA export**. Đây là mốc media/private preview của [CMS-001 v2](../../docs/CMS-PROPOSAL-CMS-001-v2.md), tiếp nối nội dung/templates M2.

**Verified:** M2 có toàn site editor, manual Save/CAS, immutable Snapshot/review/source checks, private preview và offline static QA. Media mới chỉ là catalog legacy 30 asset; các contract/manifest/exporter pin đường dẫn baseline. Chưa có Storage emulator, upload, decoder, derivatives hoặc rights approval của file mới. M2 accepted ledger và nguồn hiện hành được pin ở `.local/cache/m3/planning-base-audit.json`; export không có `.git`, không giả provenance thành HEAD.

**Verified:** M2 final gates ghi 153 unit, 121 integration, 131 browser PASS; đây là evidence trước acceptance, không phải chạy lại trong lượt M3. Audit trước M3 còn 0 Critical/3 High/2 Moderate trong dependency tree; [QA-M2](QA-M2.md) giữ attribution và giới hạn provider/browser/OS/historical bytes. Planning chỉ sửa trạng thái acceptance, lập hồ sơ và kiểm bytes; không chạy runtime M3.

**Proposed:** thêm Storage emulator `127.0.0.1:9199` cùng demo project `demo-pinky-lamb-cms`. Admin SDK dùng host không có scheme và fixed logical bucket `demo-pinky-lamb-cms.appspot.com`; không gọi bucket provisioning/IAM/CORS/lifecycle APIs. Demo project không cần tài khoản hoặc live resources để sử dụng emulator. Các giới hạn tương thích của Storage emulator vẫn phải kiểm bằng integration thật sau Approved. [Firebase Storage emulator](https://firebase.google.com/docs/emulator-suite/connect_storage).

## 2. Phạm vi triển khai và phạm vi giữ lại

Trong M3:

1. Thư viện media có phân trang/filter, upload status, preview derivative, provenance/rights status và archive mềm.
2. Upload qua API được xác thực; private quarantine; validation/decode/re-encode; immutable originals và derivatives có digest; job/recovery/quota local.
3. Ảnh JPEG/PNG/static WebP; PDF tối đa 48 trang; video MP4 H.264/AAC. Bảng giới hạn bên dưới là **chính sách đề xuất của dự án**, không phải giới hạn Firebase.
4. Reviewer/Owner kiểm quyền sử dụng exact asset version; không tự duyệt file/evidence mình nộp. READY kỹ thuật và quyền sử dụng là hai trạng thái riêng.
5. Draft `home-v3`, schema 3, template `m3-site-media-v1`; explicit import từ CURRENT `home-v2`; không sửa/reset home/home-v2 hay history cũ.
6. Editor dùng media mới cho đúng slot ảnh, credential PDF và reel video. Snapshot/review pin cả media ẩn; preview tải byte riêng tư; export QA chỉ derivative đã được duyệt.
7. Unit/Rules/API/native processor/browser/privacy/export/compatibility checks, High review, runbook và bàn giao M3.

Giữ ngoài M3: publication/current pointer/releases/rollback/full backup-restore và nghiệm thu toàn CMS (M4); production planning/deploy; Firebase thật/login/ADC/Blaze/billing/IAM; membership admin/self-review override; theme/variant mới, arbitrary HTML/CSS/SVG/font upload, remote URL import, artwork generation; backend lead/email/payment/blog/portal/analytics/AI. Không thay source chứng cứ factual baseline bằng PDF mới: PDF media dùng để hiển thị/download credential; `SOURCE_CHECKED` vẫn theo cơ chế M2 và không được suy ra từ rights approval.

## 3. Actor, quyền và hành vi người dùng

Mọi API media kiểm Auth emulator + active/verified membership hiện hành ở backend, không chỉ token claim/UI. Direct Firestore/Storage SDK deny-all cho private collections/objects; trusted backend kiểm ACL riêng vì Admin SDK bypass Rules. Không cấp browser object target hoặc Firebase download token.

| Hành động | Editor | Reviewer | Publisher | Owner |
|---|---|---|---|---|
| Đọc thư viện/metadata an toàn/derivative private | Có | Có | Có | Có |
| Tạo intent/upload/cancel intent của mình | Có | Không | Không | Có |
| Chọn media, sửa/save/submit Draft | Theo quyền M2 | Không | Không | Theo quyền M2 |
| Gửi quyết định rights APPROVED/REJECTED | Không | Có, non-self | Không | Có, non-self |
| Archive asset | Asset mình upload | Không | Không | Bất kỳ asset |
| Retry processing lỗi có thể retry | Asset mình upload | Không | Không | Bất kỳ asset |

Owner cũng không được duyệt upload hoặc evidence do mình nộp. Role vẫn đơn trị theo M2; không đổi policy bằng role combination. Archive không xóa bytes/history hoặc thu hồi retrospective proof. Asset archived bị ẩn khỏi picker, chặn selection/submit mới; saved Draft chỉ hiện cảnh báo và cho thay media. Snapshot cũ giữ proof và derivative đọc/export theo trạng thái thời điểm submit.

Luồng chuẩn: Editor chọn file → nhập tên và cơ sở quyền sử dụng/evidence → upload có tiến độ → QUEUED/PROCESSING → READY → Reviewer xem derivative và evidence, APPROVED rights → Editor chọn slot, Save → submit Snapshot → reviewer kiểm nguồn factual và Snapshot như M2 → private preview / tải tệp QA → offline QA export. Editor có thể chọn READY còn PENDING rights để soạn Draft; submit bị chặn cho đến khi mọi asset mới, kể cả hidden, có rights APPROVED.

UI tiếng Việt; tên gốc chỉ metadata encoded, không quyết định đường dẫn. Hiển thị lý do từ chối, quota, retry và conflict rõ ràng; không hiển thị stack, storage path, token hoặc lỗi giả thành công. Có keyboard, focus restore, progress/status accessible và mobile/long-name/error states.

Layout đề xuất cho phần admin mới; giữ controls/navigation/style hiện có và template website M2. Đây là sơ đồ review, chưa rendered UI:

```text
Desktop — Thư viện media
+------------------------------------------------------------------+
| Nội dung | Thư viện media | Xem trước | Duyệt    [Tài khoản]        |
| Thư viện media          Dung lượng đã dùng / giới hạn   [Tải lên]  |
| Loại [Tất cả v]  Xử lý [Tất cả v]                                |
+--------------------------------------+---------------------------+
| Thumbnail / Tên / Loại              | File đang chọn            |
| Xử lý / Quyền sử dụng / Thao tác    | Preview derivative         |
| ... tối đa 20 items mặc định        | Kích thước / trang / dài  |
| [Trang trước] [Trang tiếp]          | Nguồn và quyền sử dụng     |
|                                      | [Chọn] hoặc [Duyệt quyền] |
|                                      | [Lưu trữ] theo quyền actor |
+--------------------------------------+---------------------------+
Upload: Chọn file → tên + cơ sở quyền + evidence → [Tải lên]
        progress → đang xử lý / sẵn sàng / lỗi có lý do
```

```text
Mobile — cùng workflow, một cột
+-----------------------------+
| Điều hướng CMS / Tài khoản  |
| Thư viện media   [Tải lên]   |
| Dung lượng / giới hạn       |
| Loại [v]  Xử lý [v]         |
| [thumb] Tên được xuống dòng |
| Loại / Xử lý / Quyền        |
| [Xem chi tiết]              |
| ... cards / [Trang tiếp]    |
+-----------------------------+
| Chi tiết file đã chọn       |
| Preview / PDF trang [<][>]  |
| Evidence / trạng thái quyền |
| Action theo actor / [Đóng]  |
+-----------------------------+
```

Trong editor, picker chỉ hiện kind phù hợp và trả về exact version; pending rights có warning. Detail/drawer không làm mất input đang nhập; dialog focus trap/restore, close bằng Escape. Reviewer nhìn exact hashes/evidence và quyết định rõ APPROVED/REJECTED; tự duyệt bị backend từ chối dù UI bị tamper. Parent private preview có controls tải video/xem từng trang PDF/download sanitized PDF ngoài iframe, không đưa controls privileged vào website public.

## 4. Dữ liệu, upload và bất biến

`MediaVersion` có ID server, uploader UID, original byte count/SHA-256, declared và detected kind/MIME, immutable processing recipe/tool hashes, derivative-set hash, safe dimensions/duration/page count, state và createdAt. Một upload là một version mới; không overwrite version cũ hoặc tìm “latest asset” khi render Snapshot. `UploadIntent`, `UploadPart`, `ProcessingJob`, quota ledger và append-only `MediaRightsCheck` là dữ liệu riêng tư. Provenance là plain text tối đa 4 KiB và source references allowlisted, không remote fetch hoặc executable links.

Các state độc lập:

- Upload: `UPLOADING → QUEUED`; hoặc `CANCELLED`. Intent hết hạn sau 24 giờ không tự xóa bytes.
- Processing: `QUEUED → PROCESSING → READY | REJECTED | RECOVERY_REQUIRED`. REJECTED validation không retry bằng cùng bytes. Lỗi hạ tầng được retry tối đa 2 attempts; hết mức báo recovery cần xử lý.
- Rights: `PENDING → APPROVED | REJECTED`, terminal append-only, pin exact original hash, derivative-set hash, evidence digest, submitter và reviewer. Sửa evidence/file tạo version mới. Không có rights revocation policy mới trong M3; archive không được trình bày như thu hồi quyền. Rights approval là quyết định của người dùng CMS, không chứng nhận pháp lý.

JSON mutations giữ giới hạn 64 KiB của M2. Raw upload route riêng nhận tối đa **4 MiB/part**, exact `Content-Length` và `X-Chunk-SHA256`; server tự tính digest. Tổng parts/size phải khớp intent, không tin client “đã upload”. Body/header/query/method/path được allowlist, reject duplicate hoặc unknown keys, route chỉ tiếp nhận sau ACL. Nếu framework buffer trước ACL, parser phải chặn kích thước từ đầu; vẫn kiểm lại byte thực tế và không nới global JSON limit.

API additions (contracts strict; `requestId`/expected revision là input, actor/time/path/state là server-owned):

| Route | Input/response chính | Điều kiện |
|---|---|---|
| `POST /api/cms/media` | name, kind, MIME, size, rights basis/evidence, requestId → intent/revision/part count | Editor/Owner; quota transaction; same request+body replay |
| `PUT /api/cms/media/{id}/parts/{index}` | raw bytes + exact size/hash → part receipt | Intent uploader, UPLOADING; fixed index/size; identical replay only |
| `POST /api/cms/media/{id}/completions` | expected upload revision, requestId → 202 QUEUED/job | Same uploader; all accepted parts verified; repeat returns same job |
| `POST /api/cms/media/{id}/cancel` | expected revision, requestId → CANCELLED | Same uploader; not PROCESSING/READY; release only unconsumed reservation |
| `POST /api/cms/media/{id}/retry` | expected job revision, requestId → queued attempt | Owner hoặc uploader; retryable failure; bounded attempts |
| `GET /api/cms/media` | cursor, pageSize 1–50, kind/status allowlist → summaries/nextCursor | Default 20, stable createdAt+ID; cursor bound filter; ACL trước query |
| `GET /api/cms/media/{id}` | exact version summary, bounded private provenance/evidence và current terminal rights proof/status | Member; ≤8 KiB evidence/proof detail, không original bytes/full private paths; không đưa detail vào iframe/public projection |
| `GET /api/cms/media/{id}/derivatives/{key}` | safe bytes, fixed MIME/SHA/generation | READY, member; video single byte Range có 206/416; no-store/nosniff |
| `POST /api/cms/media/{id}/rights-checks` | expected version/evidence digests, decision, note, requestId → terminal proof | Reviewer/Owner non-self; transactional no conflicting terminal writes |
| `POST /api/cms/media/{id}/archive` | expected revision, requestId → archived marker | Owner hoặc uploader; không delete objects |
| `POST /api/cms/site-drafts/home-v3/import` | expected v2 revision/hash, requestId → initialization receipt | Explicit Owner; once-only; conflict nếu current source đổi |

Chốt exact machine request/response keys trong task contract trước API; không đổi actor/quyền/state/caps đã duyệt. Không thêm original download endpoint. Private derivative reads đều recheck current membership. 401/403/404/409/413/415/422/429/503 được map vào error contract; không lộ existence cho caller bị từ chối quyền.

Không giả Storage và Firestore là một transaction: quota/intents/attempt claim bằng Firestore transaction trước object write; mỗi attempt có object prefix riêng. Pin returned generation + actual byte digest; replay compare stored receipt. Recovery phát hiện object/receipt lệch, quota và worker lease; không tự đánh READY cho partial data. Mỗi part có một writer; trùng digest replay, payload khác 409. READY commit chỉ sau toàn bộ outputs và local safe-cache index đã kiểm đủ. Lease một worker, heartbeat; stale worker không được finalise. Retry trước READY dùng frozen tool recipe; reprocess READY hoặc đổi recipe tạo version mới và rights proof mới. Không hứa exactly-once.

## 5. Decoder, derivatives và giới hạn tài nguyên

| Kind | Input được nhận | Derivatives và giới hạn |
|---|---|---|
| IMAGE | JPEG/PNG/static WebP ≤10 MiB; mỗi cạnh ≤8192; ≤40 triệu pixel; một frame | Decode + orientation + sRGB + WebP 320/960/1920, không upscale; giữ alpha; bỏ EXIF/metadata. Tổng outputs ≤12 MiB |
| PDF | PDF ≤25 MiB; 1–48 trang; không encrypted; page boxes hữu hạn | Full render từng trang, preview WebP tối đa 1600px cạnh dài; rebuild PDF chỉ ảnh; preview set ≤32 MiB, PDF ≤64 MiB; tổng ≤96 MiB. Mỗi trang ≤4 triệu pixel; output không copy actions/forms/attachments/source metadata |
| VIDEO | MP4; H.264 video, AAC hoặc không audio; ≤128 MiB; ≤300s; ≤1920×1080; ≤60fps | Full decode/transcode H.264/AAC MP4 faststart tối đa 1280×720/30fps, không upscale; strip metadata/extra streams; MP4 ≤48 MiB + WebP poster ≤1 MiB |

Reject SVG/GIF/animation/font/HTML/ZIP/HEIC, type spoofing, malformed/truncated data, unsupported streams và input vượt caps trước expensive processing khi xác định được. Kiểm magic và declared MIME nhưng **decode thực tế là gate**, không chỉ extension/header. Full validation output decode lại, byte count và SHA; không copy original thành “derivative”. Không gọi đây là antivirus hoặc OS sandbox.

Ảnh dùng **Sharp 0.35.5** pin workspace dependency; `failOn:'warning'`, `unlimited:false`, input pixel/page limits; pixel metadata limit không tự chứng minh chống mọi bomb. Native process và watchdog vẫn cần adversarial fixtures. [Sharp constructor](https://sharp.pixelplumbing.com/api-constructor/), [Sharp 0.35.5](https://sharp.pixelplumbing.com/changelog/v0.35.5/).

PDF dùng `pdfinfo`/`pdftoppm` **Poppler 26.05.0** của bundled runtime; manifest/header/pkgconfig đã đọc và khớp version, executable/library/config chưa audit hoặc chạy. Pin bytes và audit sau Approved; version này cũ hơn release chính thức 26.10.0, không tự nâng cấp. Nếu known decoder issue ảnh hưởng accepted input, block PDF và trình tool revision thay vì bỏ gate. Raster ≤1600px cạnh dài và ≤4 triệu pixel/trang, không tăng DPI để vượt cap; PDFDocument.create → embed raster, tuyệt đối không load/copyPages source PDF. **pdf-lib 1.17.1 chỉ viết PDF mới từ ảnh đã decode**. PDF derivative mất search/selectable text/forms; original giữ private để truy vết. [Poppler releases](https://poppler.freedesktop.org/releases/), [pdf-lib](https://pdf-lib.js.org/).

Video dùng **FFmpeg/ffprobe 9.0.2**, official source/signature và local build dưới `.local/tools/m3/` nếu cần; không Homebrew/global install/third-party binary tự động. Native encode macOS VideoToolbox được kiểm capability; không fallback copy original hoặc thay codec/caps nếu thiếu. Protocol/demuxer allowlist local file/pipe, fixed argv không shell, không URL/network inputs, local working directory và bounded logs. [Official FFmpeg downloads](https://ffmpeg.org/download.html), [FFmpeg](https://ffmpeg.org/ffmpeg.html), [ffprobe](https://ffmpeg.org/ffprobe.html).

**Verified tooling discovery, chưa chạy:** bundled runtime 26.1009.11318 có metadata Sharp 0.35.5/pdf-lib 1.17.1 và wrappers tới Poppler 26.05.0; repo chưa cài hai packages. ffmpeg/ffprobe chưa được tìm thấy ở các PATH đã khảo sát. Native binary identity, compatibility, encoders và sandboxed Blob behavior vẫn **Unknown**, kiểm tại checkpoint A sau Approved. Không cần Firebase account để giải quyết tool gap. Nếu exact tool/decoder/byte containment không đạt, báo capability gap và dừng phần phụ thuộc; không tự đổi security policy/dependencies ngoài phạm vi.

Caps vận hành đề xuất:

- Library ≤200 versions; tối đa 2 active intents/uploader, 4 toàn project; một processor job tại một thời điểm.
- Retained Storage ≤2 GiB, tính cả parts/quarantine/originals/derivatives, cancelled/rejected/orphan bytes. Reserve transaction ban đầu `2 × declared input + kind max derivative bytes`; settle chỉ theo bytes verified. Retry giữ bytes attempt cũ và phải reserve thêm worst-case outputs trước khi chạy, có thể bị từ chối vì quota; không overwrite bản cũ hoặc dùng lại reservation đã tiêu thụ. Không reset quota để né lỗi; không physical GC trong M3. Local derivative cache ≤2 GiB; job scratch ≤256 MiB, vượt thì reject/recovery rõ ràng.
- IMAGE timeout 30s, PDF 120s, VIDEO 600s; tối đa 2 CPU threads, child heap 256 MiB và native RSS watchdog 768 MiB; stdout/stderr mỗi stream ≤64 KiB. Watchdog là giới hạn giám sát best-effort, không kernel memory limit; process/resource behavior cần native tests thực.
- Quarantine/private-cache directories mode tối thiểu có thể áp dụng, không Vite/Hosting serve; owned process tree được stop/reap khi cancel/timeout/exit. Retained Storage originals/parts/quarantine/derivatives và historical evidence giữ đến policy M4; retry không overwrite/delete bản cũ. **Scratch intermediates tạm thời** được cleanup trong owned job directory sau khi input đã pin persistent và evidence cần thiết được ghi, không xóa retained media. PDF render từng trang rồi encode/embed, không giữ 48 full-resolution rasters đồng thời để né scratch cap. Full backup/restore không thuộc M3.

Native libraries/build flags/protocols/external references và process-group reap thuộc tool audit; Node network fence không ngăn mọi native filesystem/network syscall. Đây là residual local decoder risk nếu thiếu OS isolation/hard memory cap, cần ghi trong High checkpoint và handoff, không tuyên bố native sandbox. [Sharp security](https://sharp.pixelplumbing.com/security/), [FFmpeg protocols](https://ffmpeg.org/ffmpeg-protocols.html).

## 6. Tương thích content, Snapshot và proofs

OWNER khởi tạo `home-v3` từ **CURRENT** home-v2 trong transaction kiểm expected revision/hash; receipt pin source schema/template/hash/revision. Legacy media refs giữ nguyên; không reimport baseline thay content hiện tại. Home/home-v2, snapshots/reviews/source checks/import receipts cũ giữ semantic/hash/replay; codec dispatch theo schema/template, không giả upload là `LEGACY_READY`.

V3 validators tái sử dụng rules typed fields hiện có với media resolver rõ kind/cap. Slots ảnh chỉ IMAGE derivative, credential chỉ PDF safe derivative, reel chỉ VIDEO safe MP4/poster/duration server-owned. **Exception riêng reel poster:** legacy VIDEO giữ AssetUse IMAGE poster như v2; new VIDEO dùng cùng version cho MP4 và poster, với v3 poster reference `{assetId: <same video version>, derivativeRole: 'POSTER', alt, decorative}`. Backend resolve key/dimensions/hash, kiểm same version; không require upload IMAGE riêng hoặc nhận client poster digest/duration làm authority. Editor giữ text alt, tự cập nhật reference và duration từ trusted metadata. Không ảnh hưởng artwork/fonts legacy hoặc variant baseline.

Whole-content v3 validation kiểm `publicCredentialPage` của mọi project **kể cả hidden** không vượt actual sanitized pageCount của PDF mới được chọn; legacy credential giữ page bound M2. Thay PDF 48 trang bằng PDF 1 trang phải báo cụ thể các page links sai trước Save/submit, không để public dangling links.

V3 content max 64 distinct referenced versions tính cả hidden/fixed; derivative manifest max 256 entries. Save kiểm thực tế UTF-8/escaped persisted Draft và dự toán Snapshot/proofs ≤256 KiB; không dùng fixed reserve legacy để giả manifest mới vừa budget. UI kiểm cùng rules, backend authoritative; caps record M2 giữ nguyên và aggregate byte cap có thể chặn tổ hợp quá lớn.

Snapshot mới pin asset version, original digest (private), processing recipe digest, immutable output storage generation/hash/size/MIME và derivative-set digest; **chỉ include selected references**, không full library. PDF gồm derivative download + preview-set digest; exact selected entry list bounded manifest. Hidden assets có rights requirement như visible. Snapshot submit capture trusted READY metadata/nonarchived status + immutable APPROVED rights proof in transaction, không nhận client-generated generation/hash/proof. Rights revision racing submit gây conflict, không approve stale evidence.

Rights proof và source proof factual là độc lập. **Asset-only replacement vẫn làm factual group CHANGED khi asset ref nằm trong exact-value group của M2**; group đó cần actual SOURCE_CHECKED qua existing fixed source catalog, hoặc bị chặn nếu không đủ chứng cứ. Không coi text không đổi là miễn source checks, không dùng PDF media mới mở rộng factual evidence catalog. Terminal Snapshot approval pin exact content hash + full media manifest hash + exact source and rights proof IDs/digests. Review không tự quyết định rights cho asset pending. Media technical READY không thay `SOURCE_CHECKED`; source check không thay rights. Legacy refs tiếp tục UNVERIFIED warning như M2; không “xác nhận” retrospectively. M3 QA là unpublished, không chứng minh điều kiện publication legacy của M4.

V3 QA envelope có `qaEnvelopeVersion:3`, Snapshot, terminal APPROVED review/state, exact source checks và media rights checks; strict unknown-key/duplicate/hash/schema/template checks, ≤2 MiB. Tối đa 64 rights proofs; factual proofs giữ cap M2. V1/v2 input ≤1 MiB và validators/export semantics cũ không đổi. Offline proof xác minh consistency, không thay authenticated historical identity hoặc quyết định human.

## 7. Private preview và offline QA

Private parent admin dùng Bearer qua current API client để tải **safe derivative**; verify size/SHA trước tạo object URL. Iframe chỉ nhận public HTML projection + object URLs, không token/original/rights/source metadata. Sandbox vẫn empty. Task04 sửa **parent admin CSP** tối thiểu `img-src blob:`/`media-src blob:` trước feasibility vì srcdoc bị parent policy ràng buộc; v3 child CSP cũng chỉ thêm blob cho image/media cần thiết, không arbitrary origins/scripts/object/embed. V1/v2 **child** CSP giữ contract cũ. Blob rendering trong opaque sandbox phải được test bằng đúng parent CSP thực ở checkpoint A; nếu không đạt, không tự thêm allow-same-origin/allow-scripts.

Budget **retained Blob bytes** ≤64 MiB; tối đa một download đang chạy ≤64 MiB, evict/revoke trước khi tải file lớn và release hash buffers sau verify. Đây là logical byte accounting, không hard browser RSS/GC cap: ArrayBuffer/Blob/hash/decode có transient copies cần đo và ghi giới hạn thực. Tải video bằng control ở parent khi click, không preload; sau đó native video controls trong sandbox. PDF viewer dùng ảnh từng trang với Previous/Next ở parent; download sanitized PDF cũng ở parent authenticated UI. PRIVATE credential links trong site giữ preview-only như M2, không nới sandbox để download; QA_EXPORT mới có link file hoạt động. Logout/deactivate/selection revision change/unmount/failed auth hủy requests, xóa preview và revoke object URLs; late completion không tạo lại preview. Existing loaded bytes không bị “thu hồi từ thiết bị” bằng deactivate; cleanup ở lần authorization/lifecycle kiểm tiếp theo và session poll như M2. Không browser storage cache/service worker hoặc token trong DOM/download URL.

Worker tạo immutable **safe derivative cache** riêng dưới `.local/media-cache/m3/derivatives/`, index pin asset/key/generation/hash, containment/no symlink/hardlink checks. READY chỉ commit sau cache và Storage đủ bytes. Quarantine/originals/scratch nằm ở đường dẫn private khác. Exporter đọc cache đã pin, không đọc arbitrary path từ input, không Firebase/token/cloud fetch; cache mất/corrupt thì fail rõ ràng, không fallback original. Rehydrate cache từ immutable Storage qua trusted worker recovery với exact manifest là một thao tác explicit, không mutate historical Snapshot.

Offline QA v3 dùng file envelope được tải qua API hiện hành và local cache exact bytes; output riêng `.preview-output/m3/<id>/`. Public projection chỉ copy **visible public derivatives cần dùng** theo digest names; vẫn validate toàn manifest hidden. Không original/quarantine/evidence/UID/storage paths/Firebase SDK/private JSON trong artifact. Legacy public assets tiếp tục exact-pinned như M2. Output preflight/containment/owned-directory và per-file atomic behavior giữ guards M2; không hứa whole-directory transaction. Test serve artifact thật JS-off/on qua owned loopback server, xong đóng server.

Đây là **QA export chưa publish**. Hosting5010 giữ public baseline; không switch current pointer/history. Full-site media load, download sanitized PDF và native video controls có keyboard/mobile/error behavior, alt/decorative/dimensions/lazy rules như M2; không autoplay.

## 8. Acceptance criteria kỹ thuật M3

Mọi AC hiện tại **NOT_RUN**; PASS planning không phải PASS implementation.

| ID | Điều kiện đạt | Evidence tối thiểu sau Approved |
|---|---|---|
| M3-AC01 | Demo+loopback kể cả Storage/worker; missing/real project/host/ADC/outbound bị chặn | Guard unit, native tool audit, actual emulator/API network |
| M3-AC02 | Upload/private reads đúng role/current member; SDK deny-all; no original/download token leak | Rules + API + browser denial matrix |
| M3-AC03 | Strict chunks/replay/size/hash/quota/conflict/cancel, không nhận partial complete | Actual Storage/Firestore integration và concurrent clients |
| M3-AC04 | JPEG/PNG/static WebP decode/re-encode đúng orientation/alpha/caps, spoof/bomb/malformed rejected | Native good/bad fixtures + output decode/hash |
| M3-AC05 | PDF 1/48 pages sanitize raster; active/encrypted/malformed/oversize fail phù hợp | Native full-page fixtures, output inspection/no source actions |
| M3-AC06 | MP4 good/no-audio/max duration; bad streams/malformed/overcaps rejected; safe transcode/poster | Actual ffprobe/full decode/output metadata/caps |
| M3-AC07 | Lease/retry/stale finalizer/crash giữa object/cache/receipt/READY không false success/quota leak | Failure injection + restart/recovery evidence |
| M3-AC08 | Rights terminal exact version/evidence, non-self kể cả Owner, race/replay; READY ≠ rights | Unit + role/API/UI decision matrix |
| M3-AC09 | Paginated library/cursor scope, archive không xóa retained refs; errors/mobile/keyboard | Integration + actual authenticated UI |
| M3-AC10 | Explicit CURRENT v2→v3 import preserves content; v1/v2 hashes/replays/render/export tương thích | Current baseline pins + compatibility regressions |
| M3-AC11 | Typed slot validation, hidden media, measured budgets; immutable media manifest/Snapshot/review | Unit/independent hash + API race/tamper |
| M3-AC12 | V3 source và rights proofs tách riêng, terminal review đúng full hash | Workflow integration và tamper rejection |
| M3-AC13 | Private image/PDF/video correct revision; empty sandbox/CSP/no token; bounded memory/lazy | Actual Chromium opaque frame + network/console/lifecycle |
| M3-AC14 | Logout/deactivate/revision-switch/late async clear media và revoke URLs | Browser two-session/error/abort regressions |
| M3-AC15 | Offline QA exact safe bytes, no private leakage/online credentials; missing cache/tamper fail | Independently hashed served artifact JS-off/on + privacy scan |
| M3-AC16 | M1/M2 applicable gates và new gates pass, lint/build; fresh dependency/native review có limits | Medium real command outputs + High review/evidence index |
| M3-AC17 | Runbook reproduce tools/start/stop/cache-recovery; retention/resource/errors rõ | Owned setup/recovery observations, human usability limits |
| M3-AC18 | No frozen baseline/vendor/root/M2history edits; all task ownership/base hashes traceable | Before/after inventories, independent High final review |

Browser matrix: Chromium 390/768/1440, thêm narrow 320 và wide 1920 ở material media dialogs/private view, keyboard, long Vietnamese copy/name, denied/processing/rejected/quota/conflict/missing bytes, JS-off/on artifact. Physical devices/Safari/OS clipboard và human rights/factual truth không được suy ra từ tests; chưa chạy ghi NOT_RUN. Audit phát hiện trong approved scope được xử lý/review; không forced dependency upgrade hoặc hạ gate cho xanh.

## 9. Điều phối, approval và bàn giao

Root actual High giữ reasoning/spec/task/review/audit và tài liệu. Actual Medium coding, native fixture generate, viết/chạy unit/integration/browser tests. Mỗi task thường ≤5 files, một chủ ghi/file; implementation/test owner tuần tự, không nhiều runner hay decoder writes cùng lúc. Independent actual High read-only review checkpoints, không tự tạo engineering approval. [Task plan](../tasks/M3-plan.md) và [scope paths/base](../../approvals/CMS-001-v2-M3.scope.json) là danh sách đóng.

Checkpoint A chứng minh prerequisites trước mở pipeline; các checkpoints sau chặn task phụ thuộc khi có unresolved finding. Material thay scope/caps/roles/dependency ngoài allowlist cần revised bundle và Approved mới. Chỉ đổi task nhỏ trong cùng exact scope sau High review/ledger, không tự thêm source path. Sau technical gates, trình REVIEW_READY M3; chỉ người dùng Accepted mới đóng milestone. Không ghi LOCAL_COMPLETE ở M3.

Theo [APPROVAL-PROTOCOL](../../docs/APPROVAL-PROTOCOL.md), agent WAIT trước code/config/install/runtime writes. Lời duyệt riêng cho **bundle M3 revision 1 đang trình**, ví dụ sau, chỉ có hiệu lực khi người dùng trực tiếp gửi:

```text
Approved CMS-001 v2 — M3 local/emulators
```

Sau Approved hợp lệ, ghi nguyên lời/reference và document/scope digests, đối chiếu current base rồi triển khai/kiểm thử đến đúng AC. M4 cần proposal/task/Approved riêng. Không lập hoặc triển khai production trong gói này.
