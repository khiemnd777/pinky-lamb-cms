# Điều tra hai API tải chậm — 19/10/2026

## Kết luận — Verified

Điểm nghẽn là công việc xác thực media lặp lại trên luồng JavaScript của server Node.js local. SQLite không phải phần chiếm phần lớn thời gian trong phép đo.

- `GET /api/cms/drafts/home-v3` đọc và xác thực đầy đủ 28 media, tốn khoảng 2,2 giây khi đo riêng phần dịch vụ.
- `GET /api/cms/localizations/editorial/readiness` duyệt 24 đối tượng × 3 ngôn ngữ. API xác thực 28 media thành 198 lượt, tốn khoảng 15,4 giây khi đo riêng phần dịch vụ.
- Các lượt xác thực liên tục xử lý lại manifest bộ công cụ bất biến khoảng 300 KB cho ảnh: duyệt JSON, kiểm tra schema, sao chép, chuẩn hóa và tính hash.
- Khi CMS mở editor, phần xuất bản được mount và gọi readiness ngay. Công việc CPU này ảnh hưởng các API cùng tiến trình. Số gần 20 giây trong Network là thời gian phản hồi khi các request chạy cùng nhau, không phải hai thời gian xử lý độc lập để cộng thành 40 giây.

## Phạm vi và phương pháp

Yêu cầu hiện hành: tự điều tra đến khi có nguyên nhân và bằng chứng; người dùng review kết quả. Không triển khai bản sửa hiệu năng trong lượt điều tra này.

Server quan sát: PID 44222, Node 22.23.3, Admin/API `127.0.0.1:5273`. Các phép đo bổ sung dùng chính mã dịch vụ và dữ liệu SQLite local hiện hành.

Để đo nội bộ mà không sửa/restart server:

1. Chạy một tiến trình chẩn đoán riêng, không mở HTTP listener.
2. Tạo bản module data-store trong `/private/tmp` với `readonly: true`, `query_only = ON`, transaction deferred. Chặn mọi phương thức ghi trong callback.
3. Dùng dependency injection cho actor của phép đo offline. Không sử dụng hay thay đổi xác thực của HTTP server. Không đọc credential, cookie, bảng tài khoản hoặc secret.
4. Giữ nguyên các hàm dịch vụ và validation nghiệp vụ; bọc đo thời gian media trong bản module tạm, dùng V8 CPU profiler nội bộ không mở cổng debug.
5. Đối chiếu bằng request HTTP dùng phiên đăng nhập sẵn có trên Edge, lấy mẫu tiến trình server và request session độc lập không đăng nhập.

Số đo offline có overhead profiler và không gồm toàn bộ middleware/xác thực/HTTP của server. Đây là bằng chứng định vị chi phí bên trong dịch vụ, không thay thế số đo end-to-end.

## Kết quả đo riêng

| Phép đo | home-v3 | readiness |
| --- | ---: | ---: |
| Thời gian dịch vụ, lần 1 | 2.196 ms | 15.446 ms |
| Thời gian dịch vụ, lần 2 | 2.256 ms | 15.370 ms |
| CPU, lần 2 | 2.481 ms | 16.454 ms |
| Transaction | 1 | 1 |
| Lượt đọc document | 171 | 1.986 |
| Thời gian đo trong transaction.get, lần 2 | 4,63 ms | 80,50 ms |
| Lượt resolveSelection | 1 | 48 |
| Thời gian resolveSelection, lần 2 | 2.209 ms | 13.594 ms |
| Số media khác nhau | 28 | 28 |
| Tổng lượt xác thực media | 28 | 198 |

CPU có thể lớn hơn wall time vì bao gồm công việc ở các thread phụ, ví dụ GC. Thời gian transaction.get bao gồm đọc và tạo snapshot theo adapter; không phải chỉ riêng thời gian SQL engine.

Hai lần đo riêng tạo cùng hash kết quả cho từng API:

- Draft: `ffae461b33368f3654f0e147c6a16cf74dff7497ba1bf64abb628090e0f1a0d9`.
- Readiness: `cf89ff846c44e21da356d6023461f1ad441c01ed2234d68915243b637bf163b5`.

Trong lần 2, thời gian đọc document chỉ khoảng 0,2% thời gian draft và 0,5% thời gian readiness. Riêng resolveSelection chiếm khoảng 98% và 88% tương ứng.

## Chuỗi gây tốn thời gian

### 1. home-v3 luôn đi qua toàn bộ media được dùng

`cms-api/site-v3-drafts.mjs:54`, `readDraft()`:

`readTrustedDraftContext → selection → resolveSelection → readAuthority`.

`cms-api/site-v3-media-provider.mjs:74`, mỗi `readAuthority()` đọc sáu document: version, mapping, upload, job, metadata, processing evidence. Sau đó hàm dựng profile xử lý và xác thực authority envelope.

Với 28 media, có 168 lượt đọc media cộng ba document draft/import/audit = 171 lượt đọc. Chi phí chủ yếu xuất hiện sau khi đọc, trong validation/canonicalization.

### 2. Một lượt media xử lý lại manifest lớn ở nhiều lớp

`cms-api/site-v3-media-provider.mjs:86` gọi `loadMediaProcessingProfile()`; dòng 88 gọi `validateAuthorityEnvelopeV2()`.

`cms-api/media-processing-profile.mjs:18` tạo bản sao manifest, gọi validateToolSetManifest/validateProcessingProgram và tính các hash. Authority validator lại xác thực manifest/program trước khi đối chiếu binding.

Manifest tĩnh đo từ exports hiện hành:

| Loại | JSON bytes | Số object/array | Số trường/phần tử được duyệt |
| --- | ---: | ---: | ---: |
| IMAGE | 300.008 | 1.814 | 9.046 |
| VIDEO | 303.850 | 1.840 | 9.183 |
| PDF R0 | 379.540 | 2.390 | 11.566 |

PDF R0 là số đo export tĩnh để so sánh; không suy ra media PDF đang dùng profile R0. Dữ liệu hiện hành có thể chọn profile PDF local theo binding.

`contracts/media-v3-metadata-v2.mjs:10` và `contracts/media-v3-metadata.mjs:8` duyệt descriptor đệ quy bằng Reflect.ownKeys/Object.getOwnPropertyDescriptors. `contracts/media-v3-contract-v2.mjs:143` kiểm tra JSON, sao chép descriptor rồi chuẩn hóa trước khi hash.

CPU profiler lần 2 ghi nhận riêng hai hàm plainJson chiếm khoảng 1.074 ms ở draft và 7.408 ms ở readiness. Ngoài ra còn có structuredClone, dataCopy, canonicalJson và garbage collection.

Phần profile/hash và authority validation của IMAGE trong readiness lần 2 tốn khoảng 4.696 + 7.319 = 12.015 ms. Đây là phần lớn của khoảng 15.370 ms.

### 3. Readiness nhân số lượt xác thực theo resource và ngôn ngữ

`cms-api/localized-eligibility.mjs:17` duyệt ba ngôn ngữ và 24 đối tượng mỗi ngôn ngữ: hero, bảy group, hai section, tám project, sáu service.

`cms-api/localized-resource-context.mjs:32` đọc home rồi gọi readBase của từng loại. readBase lại đọc trusted home context và resolve media tương ứng. Kết quả đo:

- Home draft/import/audit mỗi loại bị đọc 145 lần trong một readiness transaction.
- 48 lượt resolveSelection dẫn đến 198 lượt readAuthority cho cùng 28 media.
- Một media bị xác thực 30 lần, một media 12 lần, 26 media còn lại sáu lần mỗi media.
- 72 snapshot/review/approval được kiểm tra theo từng đối tượng và ngôn ngữ.

Việc cần kiểm tra đủ đối tượng/ngôn ngữ và giữ tính toàn vẹn vẫn hợp lệ. Nguyên nhân hiệu năng là lặp tính toán dữ liệu dùng chung và profile bất biến, không phải bằng chứng cho phép bỏ kiểm tra.

### 4. Eager load và luồng CPU dùng chung làm cả hai request chậm

`admin/localization-review-editor.mjs:24` mount release preparation. `admin/localized-release-preparation.mjs:77` gọi load ngay khi mount; dòng 40 gửi readiness và website/status.

Trong khi đó editor tải home-v3. Hai API cùng chạy trên một luồng JavaScript của cùng tiến trình Vite/Node. Các chuỗi await trên thao tác SQLite đồng bộ tiếp tục qua microtask; async không tự đưa validation CPU sang worker hay nhường xử lý socket.

Đối chiếu:

- Phép đo concurrent trong tiến trình riêng hoàn thành sau 17.941 ms. Promise của draft hoàn thành ở khoảng 4.091 ms, readiness ở 17.940 ms. Thời điểm Promise hoàn thành không đồng nghĩa byte HTTP đã đến trình duyệt.
- Network của lần mở CMS đã quan sát: home-v3 19,98 s, readiness 20,00 s, website/status 19,99 s.
- Trên server thật, trong lúc chỉ mở readiness bằng phiên Edge hiện hành, 73 request session không đăng nhập được quan sát trong cửa sổ 30 giây. Một request mất 14.846,78 ms rồi trả HTTP 401 đúng quy định. Điều này chứng minh tác vụ readiness làm chậm cả request độc lập.
- CPU live quan sát khoảng 102,4%, tương đương dùng mạnh khoảng một lõi. Mẫu tiến trình ghi nhận chuỗi RunMicrotasks và ObjectGetOwnPropertyDescriptors, khớp CPU profiler trong phép đo riêng.

Khoảng chờ gần 20 giây ban đầu có chi phí các request đồng thời và HTTP. Không quy từng mili giây của chênh lệch giữa 15,4 s và 20 s cho một hàm khi chưa có trace từng request ở chính lần đo ban đầu.

## Hướng sửa — Proposed, chưa triển khai

1. Tái sử dụng profile/manifest tĩnh đã xác thực theo identity/version bất biến, tránh dựng lại và duyệt toàn bộ manifest cho mỗi media ở nhiều lớp.
2. Dùng context đọc dùng chung trong một lần thực thi transaction để tái sử dụng trusted home và media đã kiểm tra. Không dùng cache dựa trên object transaction vì transaction có thể retry; không lưu quyền hay kết quả mutable xuyên request tùy tiện.
3. Chỉ gọi readiness khi người dùng cần phần xuất bản; đồng thời tối ưu chính API này. Chuyển thời điểm gọi không tự sửa chi phí CPU của API.
4. Đo lại response và số lượt xử lý, đối chiếu nội dung/hash/kết quả eligibility, stale và quyền. Timeout/báo lỗi là phục hồi, không phải bản sửa nguyên nhân CPU.

## Bằng chứng và giới hạn bàn giao

Các file tạm phục vụ chẩn đoán trên máy này:

- `/private/tmp/pinky-api-diagnose.mjs`: phép đo, kết nối read-only, profiler nội bộ.
- `/private/tmp/pinky-api-diagnose-output.jsonl`: kết quả lần đo có phân đoạn.
- `/private/tmp/pinky-draft-alone-metrics.json`, `/private/tmp/pinky-readiness-alone-metrics.json`, `/private/tmp/pinky-concurrent-metrics.json`: số đo và top CPU frames.
- `/private/tmp/pinky-draft-alone.cpuprofile`, `/private/tmp/pinky-readiness-alone.cpuprofile`, `/private/tmp/pinky-concurrent.cpuprofile`: CPU samples.
- `/private/tmp/pinky-live-node-sample.txt`: mẫu tiến trình server thật.
- `/private/tmp/pinky-api-source-sha256.json`: fingerprint các source liên quan tại thời điểm tổng hợp.

Đã điều tra nguyên nhân; chưa sửa hành vi ứng dụng, chưa chạy regression suite vì không có bản sửa sản phẩm. Không restart/kill server, seed/import/reset dữ liệu, migration hoặc deploy. Các script/module chẩn đoán nằm trong `/private/tmp`; ngoài báo cáo này không có thay đổi source sản phẩm do lượt điều tra.

Tiếp theo: review kết luận và số đo trong báo cáo. Việc triển khai các hướng sửa cần yêu cầu tương ứng; không suy ra từ phạm vi điều tra hiện tại.
