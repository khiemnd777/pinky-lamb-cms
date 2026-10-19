# CONTENT-ARCHITECTURE-001 — đặc tả và hồ sơ triển khai thống nhất

Trạng thái hiện hành: **LOCAL_CUTOVER_VERIFIED / PERFORMANCE_TARGET_NOT_MET**. Chủ thực hiện và writer: phiên chính. Ngày: 19/10/2026, Asia/Ho_Chi_Minh. Source/caller đã chuyển và kiểm chứng trên dữ liệu retained; chưa xác nhận đạt mọi load end-to-end ≤20 ms hoặc human acceptance.

## Quyền và mục tiêu

Khiêm giao: “dùng kiến trúc này làm đặc tả triển khai thống nhất, bao gồm schema, contracts, chuyển đổi dữ liệu và thay caller. Kiểm chứng nằm trong quá trình thực hiện; không mở thêm vòng đề xuất benchmark hoặc review độc lập cho từng bước.”

Phạm vi: modular monolith Identity/Content/Media/Publishing; SQLite native cho nội dung hiện hành; revision theo thực thể; API và editor theo mục; media authority theo phiên bản; readiness theo dependency; worker local; Admin build và boot dependency trước request. Bao gồm chuyển đổi dữ liệu local có backup và khởi động lại đúng stack khi cần. Không có Git delivery hoặc cloud release trong nhiệm vụ.

Giữ ID, slug, source/media references, phiên/quyền, immutable snapshot/review và quy tắc xuất bản. Hồ sơ CMS cũ đã đóng không được mở lại.

## Schema và nguồn ghi

- `cms_content_sites`: metadata của draft/site và revision tương thích, không chứa toàn bộ content JSON.
- `cms_content_entities`: settings, hero, SEO, cấu trúc, section, project, service, client; ID, thứ tự, revision và body/hash riêng.
- `cms_content_localizations`: các bản dịch hiện hành theo loại/ID/ngôn ngữ, giữ nguyên dữ liệu contract cũ.
- `cms_content_references`: cạnh dependency của content/media và index tra cứu ngược.
- `cms_content_jobs`/kết quả đọc: công việc bền vững có generation, kết quả chỉ được công bố khi source pins còn đúng.
- Bản draft/document đã chuyển được lưu vào archive bất biến; các snapshot/audit/review/media/auth hiện có giữ nguyên.

Một nguồn ghi hiện hành. Adapter document cũ đọc/lắp ghép từ schema mới sau chuyển đổi; không cập nhật đồng thời hai bản current. Migration nguyên tử, lặp lại an toàn, kiểm tra lắp ghép tương đương trước commit; backup dữ liệu riêng trước cutover.

## Contracts và vòng đời

- Bootstrap: member, navigation và mục đầu tiên; không dựng full preview/readiness.
- GET mục/entity: payload đúng phạm vi, revision và dependency identity.
- Save: expected revision, idempotency, validation nghiệp vụ ở owner; receipt chỉ xác nhận sau commit.
- Home v3 tương thích: lắp ghép schema mới theo thứ tự, giữ shape/hash đã xác nhận.
- Readiness: kết quả có source pins; thay đổi làm invalidation trong cùng transaction; worker retry không công bố kết quả cũ.
- Media: profile bất biến đã kiểm tra nội bộ; record mutable và dependency vẫn kiểm tra hiện hành. Không nhận cờ trusted từ client.
- UI: state riêng cho saved/working/pending theo mục và ngôn ngữ; không tải lại toàn website sau từng patch; logout hủy request và xóa dữ liệu riêng.

## Trình tự thực hiện và kiểm chứng tích hợp

1. Schema/repository/migration: tests SQLite thật về round trip, CAS, rollback/idempotency và giữ archive.
2. Media/profile và context: tests giữ rejection đối với dữ liệu/hash không hợp lệ, phiên bản thay đổi và transaction retry.
3. API/content/publication: contracts, quyền, stale, xung đột và retry.
4. Caller/editor: từng mục, unsaved, ngôn ngữ, save receipt, preview và xuất bản hiện có.
5. Worker/runtime/build, backup/cutover local; kiểm tra usable flow và ghi kết quả vào hồ sơ này.

Ngưỡng người dùng yêu cầu: load end-to-end ≤20 ms. Không tự nới ngưỡng hoặc báo đạt từ số đo nội bộ/fixture. Tính đúng đắn, source complete, runtime, human acceptance và release là các trạng thái riêng.

## Bằng chứng đang có

Đã đọc dữ liệu/transaction boundary, contracts Home v3, bộ đọc localization, editor save và publishing. Điểm nghẽn trước sửa được lưu tại `docs/API-LOAD-DIAGNOSIS-2026-10-19.md`.

Chưa có kết quả implementation/test/runtime mới tại thời điểm khởi tạo hồ sơ.

## Quyết định triển khai hiện hành

Trạng thái source: **SOURCE_COMPLETE / LOCAL_CUTOVER_VERIFIED**. Đây không phải xác nhận đạt latency end-to-end hoặc human acceptance. Owner đã tự rà soát tuần tự; không chạy reviewer độc lập. Các blocker và bằng chứng trước cutover bên dưới giữ nguyên theo thời điểm; mục cuối ghi kết quả hiện hành.

### Ranh giới và contracts đã nối

| Owner | Nguồn hiện hành / contract | Tính đúng đắn |
| --- | --- | --- |
| Identity | Better Auth cookie, `cmsMembers`, authzVersion | Mọi HTTP read kiểm tra session/ACL; write kiểm tra lại trong transaction. Worker chỉ có internal read principal, không giữ cookie hay giả owner. |
| Content | `cms_content_sites`, `cms_content_entities`, `cms_content_localizations` | PK theo site/kind/ID, index theo thứ tự; body/hash, revision riêng. Metadata giữ revision Home tương thích. |
| Content read | `GET /api/cms/workspace`, `GET /api/cms/content/groups/{group}` | Bootstrap gồm member/navigation/settings. DTO chỉ gồm mục, revision vector, catalog media an toàn và chỉ mục tham chiếu cần thiết. Không gọi media authority hay readiness. |
| Content command | `PATCH /api/cms/content/groups/{group}` | `expected: [{kind,id,revision}]`, `content`, `Idempotency-Key`; reply receipt + group read. Lọc quyền sở hữu tại server, CAS cả khi commit, audit/idempotency nguyên tử. |
| Media | `cms_media_verified` | Fact gắn source hash của sáu record authority và fingerprint code. Record thay đổi không dùng được fact cũ. Registry profile bất biến được kiểm tra và tái sử dụng. |
| Publishing | `cms_content_jobs`, `cms_readiness_resources` | Resource result pin theo source/media/localization/approval/snapshot/review/check; job có generation/lease. Commit result chỉ khi source vector/generation vẫn khớp. |
| Readiness read | `GET /api/cms/localizations/editorial/readiness` | Native DTO `CONTENT_READINESS_STATUS`: state, generation, updatedAt, readiness hoặc null, errorCode. Không chờ evaluator. Pending/failed không được coi là ready. |
| Release command | Các snapshot/release contracts cũ | Readiness cache không được dùng làm QA payload của release; release vẫn kiểm chứng immutable approved payloads. |

Settings/header/brand/nav/Hero/SEO thuộc mục settings; client list thuộc clients; project list và work section thuộc work; service list và services section thuộc services; credential/showreel/about section thuộc about; IP section thuộc ip; contact thuộc contact; copyright/footer section và creative-copy bindings thuộc footer; thứ tự section thuộc structure. Các tham chiếu đọc kèm không cấp quyền sửa sibling. Khi đổi credential PDF, command cập nhật các nút tham chiếu cùng PDF trong một transaction; không thay nội dung dịch.

Các lỗi quyền/CAS/idempotency/validation giữ semantics API hiện có. Caller giữ riêng saved/working/intent theo mục, chặn thay đổi/chuyển mục khi outcome save chưa rõ và retry đúng key/payload. Tab đang dùng được giữ sau save. Các trạng thái clean ở mục khác được invalidation sau save; bản dirty được giữ để CAS xử lý xung đột. State riêng không được lưu xuống browser storage.

Worker chạy process riêng, không chặn event loop HTTP. Job thất bại retry tối đa ba lần, backoff 5/10 giây; source generation mới đặt lại ngân sách. Lease hết hạn được nhận lại. Source/code đổi làm kết quả cũ không còn current. Kết quả từng resource được ghi cùng transaction công bố job, không ghi dở giữa callback attempt.

### Chuyển đổi và khởi động

`cms-api/content-migration.mjs` kiểm tra toàn bộ logical documents và mọi bảng ngoài phạm vi trong cùng transaction. `scripts/migrate-content-local.mjs` yêu cầu stack đã dừng, tạo backup private gồm SQLite/Auth secret/object bytes bằng công cụ backup hiện có rồi chuyển schema; không seed/reset/reimport. Archive giữ nguyên bytes và version trước chuyển. Chạy lại migration không tạo nguồn current thứ hai.

`make run` giữ cơ chế xác minh PID/birth/cwd/UID/port của launcher. Launcher kiểm tra schema trước khi đụng instance hiện hành, build Admin bằng dependencies đã cài, rồi chạy built Admin/API, content worker, media worker và website hiện có. Built server boot dependencies/profile trước listen. Browser chỉ nhận build assets; private paths, symlinks, Host/Origin và Auth route/body boundaries có test. Vite caller tương thích được giữ cho stack đang chạy; native caller chỉ kích hoạt trong durable Admin build sau migration.

Cutover dự kiến sau khi được phép: dừng đúng instance Pinky Lamb đã xác minh → backup private → chạy pinned Node với `PINKY_LOCAL_DATA_MODE=durable`, `PINKY_LOCAL_DATA_ROOT` đúng `.cms-data-local` và `scripts/migrate-content-local.mjs` → `make run` → kiểm tra authenticated caller trên stack thật. Không Git mutation/cloud release.

## Kết quả kiểm chứng

- **PASS**: 88 tests tích hợp/contract/domain/editor/launcher trong `.local/content-architecture-copy/tests-final.tap`; test HTTP transport riêng PASS 1/1 (`transport-final.tap`). Tổng 89 tests. Các sửa cuối của worker chạy lại nhóm content tests 6/6 (`content-final.tap`).
- **PASS**: ESLint trên toàn bộ files source/test bị tác động (`lint-final.log`), Admin production build (`build-final.log`). Không cài dependency.
- **PASS trên bản sao SQLite thật**: 73 documents chuyển thành 30 entities + 72 localization rows; 17.167 logical documents giữ nguyên; 12 bảng ngoài phạm vi giữ nguyên; `integrity_check=ok`; replay `migrated=0` và logical source hash không đổi. Live DB không bị chuyển đổi.
- **PASS trên bản sao**: 28 media facts được tạo; thử đổi metadata làm authority bị từ chối, khôi phục bytes gốc đọc lại thành công. Không có sửa dữ liệu retained.
- **PASS integration**: thay riêng Hero tính lại 3 resource locale; thay/publish riêng contact EN tính lại 1 resource; nguồn đổi giữa job khiến result không được công bố; lỗi worker retry hữu hạn.
- **Observed trên Edge, fixture tổng hợp tại cổng riêng**: tám nhóm mở được shared forms; native settings save thành công và giữ tab shared. Đã đóng tab/dừng fixture. `ui-synthetic.png` là dữ liệu tổng hợp, không phải bằng chứng UI trên retained CMS.
- **NOT_RUN do fixture thiếu route**: Hero localization và Project/Service status trong fixture UI; không tiếp tục sửa harness. Product paths có test domain/context/editor riêng. Owner tiếp tục kiểm tra các caller này trên stack thật sau cutover.
- **Observed thời gian service trên bản sao, không có HTTP/auth/browser**: settings lần đầu 13,88 ms; nhóm khác 0,23–3,38 ms; readiness 0,22 ms. Worker cold lần đầu 2,14 s chạy tách HTTP. Không dùng các số này để báo đạt yêu cầu end-to-end ≤20 ms.

## Blocker trước quyền tiếp tục — lịch sử đã được giải quyết

Automatic approval review đã từ chối dừng local stack trước migration, với lý do thiếu quyền riêng cho thao tác dừng service theo project instructions. Không thử đường vòng. Instance 5273 vẫn là PID44222 như trước; chưa migrate/restart retained stack.

Cần quyền **dừng/khởi động lại đúng stack local để backup và cutover schema đã kiểm chứng**. Phần còn lại: cutover thật, authenticated native flow, full template/mobile fidelity, latency end-to-end ≤20 ms và human acceptance. Tất cả vẫn **NOT_RUN/Unknown**; không gọi thay đổi đã sửa xong ứng dụng đang chạy.

## Tiếp tục cutover theo quyền trực tiếp — 19/10/2026

Khiêm xác nhận: “Cho phép dừng và khởi động lại đúng stack local để backup, migrate và cutover. Làm tiếp đến khi kiểm chứng xong caller thật, không hỏi lại tao từng bước.” Quyền này giải quyết blocker dừng/restart/migrate local nêu trên. Owner tiếp tục đến caller thật, sửa và kiểm chứng trong phạm vi; không có Git mutation/cloud publication. Trạng thái hiện hành: LOCAL_CUTOVER_IN_PROGRESS.

## Kết quả cutover và caller thật — 19/10/2026

**LOCAL_CUTOVER_VERIFIED.** Đã dừng đúng stack qua cơ chế PID/birth/cwd/UID/port hiện có; backup, migrate rồi chạy Admin build/API/worker/website local. Launcher hiện chạy bằng pinned Node; website vẫn ở `:4189`, CMS ở `:5273/login`. Không seed/reset/reimport retained data.

- Backup private: `.local/content-architecture-backups/2026-10-19T09-14-47.366Z` gồm SQLite, Auth secret và object bytes đã kiểm tra. Không đưa secret vào hồ sơ.
- Migration thật: 73 documents → 30 entities + 72 localization rows; 17.167 logical documents và 12 bảng ngoài phạm vi được giữ; `integrity_check=ok`. Bằng chứng: `.local/content-architecture-copy/live-migration.json`.
- Caller OWNER thật trên Edge: tám mục nội dung và cấu trúc website mở đúng; Hero EN/VI/JA đọc bản lưu; Project/Service status trả dữ liệu; readiness ba ngôn ngữ sẵn sàng; 72 bản lưu chia 3 trang, 24 dòng/trang; mở được chi tiết Hero và preview toàn website EN.
- Save thật: đổi tạm descriptor, bấm Lưu website qua action thật, nhận xác nhận; khôi phục chính xác nội dung gốc bằng caller đó. SHA-256 toàn bộ content trước/sau cùng `dbac4d340ffb2c82fc93cd03a954d5261d8615c09592033a615cb2da565da042`; revision 27→29 và audit của hai thao tác được giữ. `.local/content-architecture-copy/live-preservation.json` ghi `contentRestored=true`, integrity `ok`.
- Boundary sau cutover: anonymous workspace `401`, đường dẫn SQLite qua HTTP `404`, website hiện hành `200`. Không thực hiện lệnh xuất bản. Pointer vẫn `cms-mvet72sd-cf5c7e5b-1`, manifest SHA `8fa5d019f1b080b3b0882d0424fb9398a8e9b04208f9a2ec0de02b870421da2b`. Trạng thái COMPLETED nhìn thấy trong UI là lịch sử retained.

### Sửa lỗi phát hiện trong caller thật

- Lazy mount review gọi load ngay, không chờ mutation đã xảy ra trước mount.
- Worker lưu read DTO hợp lệ và draft status của từng resource; localized GET/status đọc projection hiện hành trong SQLite snapshot. Nếu projection pending thì dùng reader authoritative hiện có. QA/release commands vẫn kiểm tra đầy đủ.
- Hero projection cập nhật global base metadata khi dependency riêng không đổi; không tính lại evaluator không cần thiết.
- Authorization chỉ dùng chung MEMBER_READ thành công trong cùng GET/HEAD request; commands/transaction/request mới kiểm tra lại. Không cache quyền qua request.
- Bảng bản lưu đọc chung projection, phân trang 24 dòng; release preparation và bảng chia sẻ đúng một readiness request đang bay. Kết quả không được cache lâu hơn vòng request.
- Preview controller khóa source action ngay trước lazy import để shell giữ intent mở modal; mở preview thật đã xác nhận sau sửa.

### Kiểm chứng và giới hạn hiện hành

- **PASS 98/98**: bộ content/schema/migration/authority/context/localization/contracts/editor/launcher/readiness/auth tests trong `live-final-suite.tap`; **PASS 1/1** HTTP transport trước đó (source transport không đổi); ESLint files bị tác động PASS; build cuối PASS.
- **PASS 2/2** regression async preview của shell (`live-preview-focused.tap`). Lần chạy toàn file shell ghi **26 PASS / 1 FAIL** (`live-preview-shell.tap`): test cuối mong nhãn cũ `Gửi và duyệt`, source/render hiện dùng `Xuất bản`. Không đổi expected hoặc tắt gate để làm xanh. Shell source/test đó không được sửa trong nhiệm vụ này. Đây là giới hạn của kết quả toàn file, không phải bộ 98 tests nêu trên.
- UI thật: `ui-live.png`, `ui-live-preview.png`; checkpoint và log browser ở `live-browser-evidence.json`. Không thấy warning/error trong lần caller cuối. Các bước caller trước build cuối giữ bằng chứng quan sát; sửa cuối chỉ chạm vòng đời preview và đã chạy lại caller preview/readiness.
- **PERFORMANCE_TARGET_NOT_MET**: trên Admin build cuối, `apiFetch` từ lúc gọi qua HTTP đến giải mã JSON: bootstrap **10,8 ms**, readiness **43,7 ms**. Đây không phải full DOM/cold page end-to-end. Build trước cùng kiến trúc ghi bootstrap 10 ms, readiness 23,6/33,8 ms. Không báo mọi load ≤20 ms; production và mục tiêu end-to-end đó chưa được chứng minh. Đường GET không còn chờ worker evaluator/media scan đồng bộ khoảng 20 giây, nhưng còn overhead HTTP/auth/đọc projection/JSON và dựng UI.
- Full mobile/template fidelity và xuất bản editorial thật **NOT_RUN** trong cutover này. Human acceptance/release chưa xác nhận; không Git mutation hoặc cloud deploy.
