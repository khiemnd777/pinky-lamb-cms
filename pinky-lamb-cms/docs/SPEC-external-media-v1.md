# CMS → Website: tự nhận diện file, đọc ảnh/PDF và tải Word/Excel

Ngày: 22/10/2026, Asia/Ho_Chi_Minh. Chủ đặc tả: phiên chính.

**Trạng thái: LOCAL_VALIDATED — đã hoàn thiện phương án 1 và kiểm thử luồng CMS → Preview → Website bằng fixture local. Chưa deploy; chưa xuất bản thay đổi nội dung retained.**

Nguồn quyền trực tiếp: “Approve implement theo đặc tả đã cập nhật cho cả CMS, Preview và Website. Triển khai và kiểm thử local, chưa deploy.” Phiên chính giữ quyền ghi/tích hợp; không tạo worktree hoặc tự commit/push.
Phạm vi hiện hành: triển khai và kiểm thử local theo đặc tả đã cập nhật. Cho phép các sửa ứng dụng/dependencies và dịch vụ test local cần thiết trong phạm vi; không reset/seed retained data, migration dữ liệu thật, Git mutation, cloud action hoặc deploy. Phần khảo sát bên dưới giữ bằng chứng tại thời điểm trước triển khai. Không mở lại các plan đã đóng trong [tasks/plan.md](../../tasks/plan.md).

## 1. Yêu cầu đã xác nhận

- CMS hỗ trợ hai nguồn tài nguyên: upload trực tiếp và liên kết ngoài.
- Phạm vi phiên bản này: ảnh, PDF, Word và Excel từ cả hai nguồn. Reader tự nhận diện loại file; PDF và ảnh mở bằng PinkyLamb reader, Word/Excel chỉ tải xuống.
- Word/Excel v1 gồm DOC/DOCX và XLS/XLSX. Không tự thêm PowerPoint, CSV, archive, định dạng macro riêng DOCM/XLSM hoặc file tùy ý.
- Tự nhận diện quyết định cách mở, không thay quyền hoặc quy tắc loại file của từng vị trí nội dung.
- Phạm vi áp dụng thống nhất cho **CMS, Preview và Website**, với cả nguồn upload và liên kết ngoài. Trong CMS gồm thao tác mở file ở thư viện/picker và màn hình biên tập; Preview gồm xem bản nháp đã lưu và snapshot đang review; Website gồm bản xuất theo snapshot đã duyệt. Mọi bề mặt dùng cùng quy tắc nhận diện và điều hướng, nhưng giữ quyền truy cập/danh tính dữ liệu riêng của từng bề mặt.
- Giữ stack, quyền, review/snapshot, IDs, bản dịch và publication hiện có. Không đổi nguồn PDF/ảnh hiện tại khi chưa có thao tác biên tập được duyệt.
- Thiết kế kỹ thuật dưới đây đã được duyệt triển khai local. Vướng mắc publication tại mục 12 là lịch sử; quyết định phương án 1 và triển khai tiếp theo được ghi ở mục 13.

## 2. Reader trước triển khai — bằng chứng khảo sát lịch sử

### Verified bằng mã nguồn và artifact local

- [Con trỏ website](../scripts/local-website-pointer.mjs) dùng `.local/p7-v3/website-current.json`. Tại lần khảo sát, con trỏ chọn `.local/releases/multilingual-001/brand-logo-highlight-20261019-v2/public`, port 4189, activation=false. Đây là cấu hình/artifact local, không phải bằng chứng Production.
- HTML của artifact trên có 10 thẻ link PDF ở mỗi locale EN/VI/JA, bao gồm link trong template chi tiết dự án. Các link mở PDF trực tiếp với `target="_blank"`; link dự án có `#page=N`.
- Module được HTML hiện hành nạp không có các marker `pdfjs`, `PDFDocument`, `data-pdf`, `pdf-reader`, `credential-reader`. Luồng nguồn tương ứng trong [full-site-localization-renderer.mjs](../preview/full-site-localization-renderer.mjs), [project-localization-renderer.mjs](../preview/project-localization-renderer.mjs), [work-services-localization-renderer.mjs](../preview/work-services-localization-renderer.mjs) và các module interactions không triển khai reader PDF riêng. Có Pinky video player; đó không phải reader PDF.
- [Preview PDF trong CMS](../admin/media-file-preview.mjs) đọc derivatives `PDF_PAGE` và cung cấp `PDF_DOWNLOAD`; không đọc PDF ngoài. Đây là preview trang ảnh đã xử lý, không phải public PDF reader.
- [Public asset schema](../preview/site-public-data.mjs) dùng đường dẫn `assets/...`; [exporter](../scripts/export-multilingual-site-local.mjs) đóng gói tài nguyên theo bytes/hash. Chưa có contract ảnh/PDF ngoài dùng chung từ CMS đến website.

**Kết luận nguồn:** chưa tìm thấy một public component PinkyLamb PDF reader để tái sử dụng trong phiên bản local đang được con trỏ chọn. Hiện tại, website giao việc đọc PDF cho trình duyệt/ứng dụng PDF khi mở link. Yêu cầu dùng PinkyLamb reader cần bổ sung component website; không được mô tả là chỉ đổi URL.

### Unknown / NOT_RUN

- GET `http://127.0.0.1:4189/` không kết nối được trong môi trường khảo sát (`curl`, exit 7, HTTP 000). Không suy ra dịch vụ đã tắt; không khởi động hoặc thay đổi process.
- Module entry trong artifact tham chiếu `assets/cache/5a2a324a9ddfda0500bdb66fc410f6eaec9fce2d4fc802b4cab4f92343566974.mjs`, nhưng không tìm thấy file tại đường dẫn đó khi đọc trực tiếp. Chưa xác minh host có cách resolve khác hay không; không coi artifact đã đủ điều kiện chạy. Đây là giới hạn khảo sát hiện trạng, không tự sửa release trong task đặc tả.
- Chưa quan sát click/reader trên trình duyệt, chưa kiểm tra Production hoặc một phiên bản ngoài checkout này.
- Chưa có URL ảnh/PDF ngoài cụ thể để chứng minh tương thích, thời gian tải hoặc chất lượng đọc.

## 3. Trải nghiệm CMS

Trong picker tài nguyên, hiển thị hai lựa chọn **Tải lên** / **Liên kết ngoài**. Giữ khả năng chọn lại tài nguyên thư viện. CMS tự nhận diện và hiển thị loại, không bắt editor chọn loại để ép file đi theo một nhánh xử lý khác. Slot ảnh chỉ nhận IMAGE; slot Credential và mapping trang dự án vẫn chỉ nhận PDF. Action tài liệu dùng chung có thể nhận PDF/WORD/EXCEL. Chỉ mở rộng action tài liệu trong phạm vi này, không thêm module quản lý tài liệu hoặc vị trí tài liệu khắp website.

Nguồn upload ảnh/PDF giữ quy trình quarantine, xử lý, derivatives, READY và quyền hiện có. Bổ sung nhánh upload Word/Excel riêng cho download-only: quarantine → kiểm loại/container, dung lượng, tên file và quyền → bản download bất biến có hash. Không đưa Office vào pipeline ảnh/PDF, không chuyển đổi Office sang PDF và không giả gọi bước nhận diện là malware scan. Nhánh Office được bổ sung riêng; trạng thái INSPECTED không giả làm READY của pipeline ảnh/PDF.

Nguồn ngoài có các trường:

| Trường | Quy tắc |
| --- | --- |
| Loại | Tự phát hiện IMAGE/PDF/WORD/EXCEL, chỉ đọc trong form; phải phù hợp slot |
| URL | HTTPS công khai, ổn định, trực tiếp trả về nội dung file |
| Tên | Bắt buộc; dùng trong thư viện và tiêu đề reader |
| Quyền sử dụng | Theo chính sách media đang áp dụng; URL công khai không đồng nghĩa được phép sử dụng |
| Ảnh | Mô tả alt hoặc đánh dấu trang trí theo slot; kích thước lấy từ decode, không tin riêng dữ liệu nhập |
| PDF | Nhãn hiển thị, edition hiện có; số trang lấy từ parser; trang mở ban đầu lấy từ vị trí sử dụng |
| Word/Excel | Nhãn tải, tên file download an toàn và định dạng phát hiện; không có số trang/preview nội dung |

Nút **Kiểm tra file** thực sự tải/đọc tài nguyên trong trình duyệt. PDF phải render được bằng component reader đề xuất; ảnh phải decode và hiển thị được. Word/Excel hiển thị metadata và thao tác **Tải xuống**, không render nội dung. URL hợp lệ về cú pháp chưa đủ điều kiện duyệt.

### Tự nhận diện và điều hướng

| Loại đã kiểm tra | Khi khách bấm mở file |
| --- | --- |
| PDF | Mở PinkyLamb reader ở chế độ tài liệu |
| JPEG/PNG/WebP | Mở PinkyLamb reader ở chế độ ảnh |
| DOC/DOCX | Tải xuống; không mở reader nội dung |
| XLS/XLSX | Tải xuống; không mở reader nội dung |
| Không xác định, không được hỗ trợ hoặc sai nội dung | Báo lỗi, không tự tải hoặc cố mở |

Nhận diện từ signature và cấu trúc file bằng parser có giới hạn tài nguyên; Content-Type, tên file và đuôi URL chỉ là tín hiệu phụ. ZIP header không đủ để kết luận DOCX/XLSX: phải xác định cấu trúc gói tài liệu; container Office cũ cũng phải kiểm cấu trúc để phân biệt DOC/XLS. Không giải nén tùy ý, không thực thi macro hoặc nội dung Office. Nếu không xác định được chắc chắn thì từ chối, không fallback thành generic download. MIME cụ thể mâu thuẫn với nội dung thì báo lỗi; MIME chung như application/octet-stream chỉ được chấp nhận nếu kiểm nội dung xác định được định dạng hỗ trợ. URL không có đuôi vẫn được hỗ trợ nếu các kiểm tra khác đạt.

Website dùng descriptor loại đã duyệt để chọn nhánh nhưng vẫn kiểm bytes/hash và loại trước khi mở/tải. Không tin đuôi URL hoặc metadata client tự khai. Ảnh trên trang vẫn hiển thị inline; chỉ các điểm vốn mở/xem ảnh mới gọi reader, không tự biến logo/ảnh trang trí thành nút bấm.

### Ma trận CMS / Preview / Website

| Bề mặt | Dữ liệu được mở | PDF / ảnh khi mở file | Word / Excel |
| --- | --- | --- | --- |
| CMS: thư viện, picker, biên tập | Phiên bản tài nguyên được actor có quyền chọn/xem | PinkyLamb reader ở chế độ tương ứng | Tải xuống sau kiểm tra |
| Preview bản nháp | Đúng revision đã lưu được yêu cầu | Cùng reader, không đọc draft mới hơn ngầm định | Tải xuống sau kiểm tra và kiểm quyền |
| Preview snapshot/review | Đúng snapshot bất biến đang xem | Cùng reader, đúng source/hash đã pin | Tải đúng phiên bản trong snapshot |
| Website | Descriptor công khai từ snapshot được duyệt | Cùng reader, đúng source/hash đã pin | Tải đúng phiên bản được công khai |

“Cùng reader” nghĩa là dùng chung component/chế độ và quy tắc điều hướng, không phải dùng chung URL công khai hay bỏ Auth. Private HOSTED trong CMS/Preview đi qua transport có authorization hiện có; public HOSTED trên Website dùng tài nguyên đã xuất. EXTERNAL dùng transport đã kiểm tra cho bề mặt tương ứng, không gửi thông tin xác thực CMS ra ngoài. Thumbnail/picker card và ảnh inline không bắt buộc mở dialog khi chỉ chọn hoặc hiển thị ảnh; thao tác mở/xem file mới gọi reader.

Cho phép lưu nháp khi chưa kiểm tra hoặc kiểm tra lỗi để sửa tiếp. Không cho submit/review approval với tài nguyên ngoài chưa qua kiểm tra cần thiết. UI nêu lỗi tải chung khi trình duyệt không phân biệt được lỗi mạng/CORS; không gán chắc chắn nguyên nhân CORS chỉ từ một fetch failure.

## 4. Contract nguồn và danh tính nội dung

Giữ `assetId` làm liên kết từ nội dung/slot tới thư viện; không rải URL tự do vào từng renderer/action. Thêm union nguồn trong model tài nguyên và public descriptor, không ép tài nguyên ngoài vào private Storage record hoặc giả trạng thái upload READY.

```text
source.kind = HOSTED | EXTERNAL
HOSTED: bindings/derivatives/generation/hash như hiện tại
EXTERNAL: url, kind IMAGE|PDF|WORD|EXCEL, mimeType, sizeBytes, sha256,
          width/height cho IMAGE hoặc pageCount cho PDF
HOSTED/EXTERNAL Word/Excel: detectedFormat DOC|DOCX|XLS|XLSX,
                          safeDownloadName, disposition DOWNLOAD
IMAGE/PDF: disposition READER khi người xem mở file
```

Đây là contract logic đề xuất; tên fields/schemaVersion chính xác phải theo conventions khi triển khai. Metadata nội bộ có revision, actor và lần kiểm tra; public projection chỉ xuất thông tin cần đọc file, không xuất actor, bằng chứng quyền hoặc auth metadata.

- URL, loại, nội dung/hash hoặc metadata ảnh hưởng hiển thị thay đổi thì tạo revision mới, làm mất hiệu lực kiểm tra và approval phụ thuộc. Không sửa hồi tố tài nguyên trong snapshot cũ.
- Snapshot pin `assetId` + revision + source descriptor/hash. Reader/ảnh/download chỉ sử dụng bytes khớp hash và loại đã duyệt. URL đổi file thì báo lỗi, không âm thầm hiển thị hoặc tải file mới.
- Hash bên client là dấu nội dung, không phải chứng nhận malware hay attestation từ worker upload. Reviewer phải tải, tự tính lại hash và xem đúng bytes trong revision/snapshot đang duyệt; backend giữ quyền và danh tính revision nhưng không giả báo đã kiểm file bằng trusted processor.
- Bằng chứng kiểm tra ở editor/reviewer không bảo đảm nguồn ngoài luôn truy cập được. Publication đóng băng descriptor đã duyệt, không tuyên bố vừa kiểm tra tính sẵn sàng ngoài mạng.
- Các nguồn ngoài phải được ghi nhận riêng trong manifest. Hash artifact bao gồm descriptors; không coi URL ngoài là file local đã được copy/verify. Rollback khôi phục descriptor cũ, không khôi phục được file đã bị xóa ở nguồn ngoài.

## 5. PinkyLamb reader v1 — Proposed

Một component reader dùng chung trong **CMS, Preview và Website** cho ảnh/PDF HOSTED và EXTERNAL, với giao diện Pinky Lamb; dispatcher tự chọn READER hoặc DOWNLOAD theo định dạng đã kiểm tra. Đề xuất dùng PDF.js làm engine PDF parse/render, ảnh dùng decoder ảnh của trình duyệt, đóng gói cùng từng ứng dụng/artifact cần dùng, không tải runtime script từ CDN. Chưa chọn/cài phiên bản dependency; kiểm tra phiên bản, license và hỗ trợ browser trong bước triển khai được duyệt.

- Mở dạng dialog toàn màn hình trên mobile và dialog rộng trên desktop; ở lại website.
- Trong CMS/Preview, mở trên bề mặt đang xem và giữ ngữ cảnh biên tập/review. Đóng reader không mất nội dung đang nhập, không lưu/submit/approve tự động. Logout, mất quyền hoặc đổi phiên phải hủy request, đóng reader và giải phóng private bytes; không cho request cũ dựng lại nội dung.
- Điều khiển: đóng, trước/sau, nhập số trang, tổng số trang, thu/phóng, vừa chiều rộng, tải PDF. Không thêm tìm kiếm, annotation, sửa PDF hoặc document manager trong v1.
- Chế độ ảnh: đóng, thu/phóng, vừa khung và tải ảnh; giữ đúng tỉ lệ/alt. Ẩn điều khiển số trang PDF; không thêm carousel/gallery mới chỉ vì có reader.
- Word/Excel: không mở dialog reader trống. Sau click, tải bytes có giới hạn, kiểm hash/loại rồi download bằng blob với tên file an toàn và đúng đuôi đã phát hiện; giải phóng blob sau khi bàn giao cho trình duyệt. Không phụ thuộc thuộc tính download trên URL khác origin và không gửi file tới dịch vụ chuyển đổi bên ngoài. UI chỉ thông báo đã chuyển yêu cầu tải cho trình duyệt, không tuyên bố người dùng đã lưu file thành công.
- Có text layer phục vụ chọn chữ và hỗ trợ khả năng tiếp cận khi PDF có text; không tự OCR file scan.
- Bảo toàn mở tại trang dự án: `#page=N`/trang nguồn hiện có được chuyển thành tham số reader, không đưa fragment vào URL tải bytes. Trang ngoài phạm vi báo rõ và cho về trang 1; không âm thầm ghi lại mapping dự án.
- Mọi caller phải thống nhất: Credential ở Work/About, Hero/IP action khi dùng CREDENTIAL, và chi tiết dự án. Hỗ trợ EN/VI/JA theo locale website hiện có.
- Chỉ tải khi người xem mở; không preload PDF trên trang chủ. Hủy tải/render khi đóng, giải phóng tài nguyên và trả focus về nút mở. Chuyển nguồn/trang nhanh không cho kết quả request cũ ghi đè reader mới.
- V1 tải bytes có giới hạn và kiểm hash trước khi hiển thị. Không hứa streaming/range hay trang đầu xuất hiện trước khi tải hết; file khoảng 17 MB vẫn phải truyền khoảng 17 MB. Chỉ render trang đang xem và vùng lân cận có giới hạn, không render toàn bộ tài liệu cùng lúc.
- Không thực thi JavaScript, embedded file hay action tùy ý trong PDF. Link nội dung nếu được hỗ trợ phải qua chính sách URL an toàn; không thực thi URL/action từ PDF tự động.
- Khi lỗi: reader hiển thị lỗi và nút thử lại theo thao tác người dùng. Không tự chuyển khách sang dịch vụ đọc bên ngoài hoặc trình PDF mặc định rồi báo thành công. Nút tải chỉ dùng bytes đã kiểm tra; không bảo đảm cấm sao chép PDF công khai.
- Khi JavaScript bị tắt: hiển thị hướng dẫn cần JavaScript để dùng reader và xác minh/tải file; không đưa link raw external bỏ qua hash/type check. Fallback tải trực tiếp chỉ áp dụng HOSTED đã xử lý, có nhãn rõ; không gọi fallback đó là reader.

## 6. Nguồn ngoài, bảo mật và giới hạn

**Thiết kế v1 đề xuất:** trình duyệt đọc nguồn ngoài trực tiếp; CMS backend/exporter không tải URL tùy ý, không proxy, không import/cache file lên host. Với ảnh cũng tải qua cùng transport có CORS, kiểm bytes/hash rồi tạo blob cho hiển thị; không dùng raw `<img src>` để bỏ kiểm danh tính.

- Nguồn phải hỗ trợ CORS cho origin CMS preview và website mục tiêu. CORS chỉ cho local không chứng minh Production. Không dùng HEAD hoặc đuôi `.pdf` làm kiểm tra duy nhất.
- Allowlist domain do người có quyền cấu hình trong phạm vi tích hợp được duyệt, không cho editor tự mở quyền domain. Danh sách cụ thể còn chờ URL nguồn thực tế.
- Chỉ HTTPS, cổng mặc định; chặn credentials trong URL, localhost, IP literal và host nội bộ. Không hỗ trợ URL chứa token/chữ ký/thông tin xác thực hoặc URL có thời hạn. Query không nhạy cảm chỉ được hỗ trợ theo rule provider đã duyệt; không log nguyên URL chưa validate.
- V1 không tự theo redirect; yêu cầu URL cuối trực tiếp. Không tự chuyển link chia sẻ Drive/Dropbox thành link download và không coi HTML của trang chia sẻ là PDF/ảnh.
- `credentials: omit`, không gửi token/cookie CMS; chính sách referrer không gửi referrer. Người xem vẫn kết nối trực tiếp tới bên cung cấp, nên nguồn ngoài nhận thông tin mạng của request; điều này cần được nêu rõ khi chọn provider.
- Kiểm MIME, signature, decode/parse, kích thước và hash; không gọi những bước này là quét malware. PDF có mật khẩu, Office mã hóa/không nhận diện được, file lỗi, HTML giả tài liệu, SVG/HTML hoặc định dạng ngoài allowlist bị từ chối. Word/Excel chỉ download là file không tin cậy; không hứa file không có macro/malware nếu chưa có bộ kiểm tương ứng.
- Giới hạn EXTERNAL đề xuất: ảnh JPEG/PNG/WebP ≤10 MiB và ≤40 MP; PDF ≤25 MiB và ≤48 trang; Word/Excel ≤25 MiB/file. Nhánh upload Office mới cũng đề xuất ≤25 MiB/file. Không viết lại giới hạn upload ảnh/PDF hiện hành. Parser Office phải giới hạn entries/expanded bytes/độ sâu/thời gian; chọn ngưỡng cụ thể cùng parser trước triển khai, không coi cap file nén là đủ bảo vệ decode.
- Giới hạn đọc bằng stream, hủy ngay khi vượt cap kể cả thiếu/sai Content-Length; timeout request 30 giây, không tự retry. Người dùng có thể thử lại. Render/decode cũng phải có timeout/cancel và ngân sách bộ nhớ; cap pixels không phải cam kết RAM thực tế.
- Ảnh ngoài: lazy-load ngoài hero; giữ width/height để tránh xê dịch layout; ảnh lỗi giữ khung và alt, không tự thay bằng ảnh khác. Không tạo srcset giả hoặc tuyên bố đã tối ưu như ảnh upload. Giới hạn concurrency và không giữ đồng thời toàn bộ gallery dạng blob.
- CSP của CMS preview và website phải chỉ mở đúng origin đã duyệt trong `connect-src`, cho `blob:` ở `img-src` theo nhu cầu và worker reader từ chính website; không mở `*`, không nới frame/object policy để nhúng trình PDF bên thứ ba.
- Không đưa bytes external chưa xử lý vào private preview đã có sandbox nghiêm ngặt. Tạo transport/adapter preview riêng có giới hạn, dùng chung reader/ảnh và session lifecycle; giữ nguyên bảo vệ private media upload. Không để auth token đi vào document public hoặc request ngoài.

## 7. Quyền, workflow và publication

1. Actor có quyền biên tập media/nội dung hiện có tạo/chọn nguồn. Viewer/read-only không được thêm URL. Backend kiểm quyền và loại slot, không chỉ dựa UI.
2. Editor lưu revision; kiểm tra external và xem đúng bytes. Kiểm tra không tự submit hoặc approval.
3. Submit tạo immutable snapshot. Reviewer theo quyền hiện có xem snapshot, kiểm hash/nội dung và duyệt; không thêm self-review/override.
4. Publication dùng đúng snapshot đã duyệt. HOSTED được đóng gói như hiện tại; EXTERNAL chỉ đóng gói descriptor. Không đọc draft mới nhất hoặc tự đổi URL.
5. Website tải source khi cần, nhận diện/kiểm loại và hash rồi mở reader cho PDF/ảnh hoặc tải Word/Excel. Mất mạng, 403/404, timeout, sai loại hoặc hash mismatch đều là lỗi thật, không fallback giả thành công.

Save đồng thời dùng revision guard hiện có, conflict không ghi đè. Request lặp theo conventions idempotency hiện hành không sinh bản ghi/revision trùng cho cùng intent. Kết quả kiểm tra cũ không được gắn vào URL/revision mới. Archive/thay nguồn phải tôn trọng dependency và giữ phiên bản cần cho snapshot/lịch sử.

Không migration phá dữ liệu: bản ghi cũ tiếp tục parse theo schema cũ; thêm version/adapter có chủ đích. Renderer mới đọc được HOSTED cũ và EXTERNAL mới; lịch sử artifact cũ giữ nguyên. Website mới dùng reader cho PDF upload cũ khi được publish theo thẩm quyền, không sửa artifact lịch sử tại chỗ.

## 8. Ranh giới thay đổi khi được duyệt triển khai

| Thành phần | Công việc bắt buộc |
| --- | --- |
| Contracts/library/API | Union nguồn và loại tự nhận diện, nhánh Office download-only, revisions/ACL, validation URL/slot, public descriptor, compatibility |
| CMS picker/editor | Hai nguồn, metadata, nhận diện/dispatcher, reader ảnh/PDF và tải Office tại thư viện/picker/biên tập; lỗi, trạng thái draft/review |
| Preview draft/snapshot | Cùng reader/dispatcher, transport đúng quyền và revision/snapshot; không đổi bề mặt xem thành dữ liệu công khai |
| Snapshot/review/localization | Pin source/hash và dependency; reviewer đọc đúng file; EN/VI/JA |
| Release/export/cache | Tách external descriptors khỏi packaged bytes; hash manifest; không fetch external trên server; giữ publication/rollback |
| Website renderer/interactions | Dispatcher theo loại, reader ảnh/PDF chung, download Word/Excel, tất cả callers và mở tại trang dự án |
| CSP/runtime dependencies | Chính sách origin cụ thể và worker local; chỉ sửa/cài sau khi được duyệt |
| Tests/docs | Regression qua từng lớp, runbook kiểm URL và khắc phục lỗi nguồn |

Không giới hạn công việc vào các file minh họa trong khảo sát: cần theo caller thực tế của full-site multilingual và selected publication. Không chỉ sửa baseline `dist` hoặc tạo UI chưa nối dữ liệu.

## 9. Tiêu chí nghiệm thu — đối chiếu kết quả local tại mục 12

| ID | Hành vi phải chứng minh |
| --- | --- |
| AC01 | Ảnh và PDF upload cũ vẫn chọn/lưu/duyệt/publish được; dữ liệu và nguồn hiện tại không bị đổi |
| AC02 | Ảnh ngoài JPEG/PNG/WebP đi từ picker tới snapshot và website, đúng alt/kích thước/hash; host không chứa bản copy |
| AC03 | PDF upload và PDF ngoài cùng mở PinkyLamb reader; trước/sau/trang/zoom/tải/đóng hoạt động |
| AC04 | Tất cả CTA tài liệu ở EN/VI/JA, kể cả modal dự án và mapping trang, dùng đúng PDF/revision |
| AC05 | URL login/share HTML, redirect, credentials/token, domain không được phép, loại sai, file lỗi/password, oversize bị từ chối đúng lớp |
| AC06 | CORS/mạng/timeout/404 lỗi thật; ảnh giữ khung/alt, reader giữ lỗi/thử lại; không tự chuyển sang viewer ngoài |
| AC07 | Thay bytes tại cùng URL gây hash mismatch, không hiển thị nội dung mới; URL/revision đổi làm approval cũ không dùng được |
| AC08 | ACL API, snapshot bất biến, save conflict, thao tác lặp, archive/dependency và response cũ không ghi đè state mới |
| AC09 | External bytes không vào release bundle; metadata/hash có trong manifest; HOSTED vẫn được kiểm bytes/hash và rollback đúng source |
| AC10 | CMS, Preview draft, Preview snapshot và Website cùng quy tắc reader/dispatcher; đúng revision/source/hash của từng bề mặt; không lộ auth/private bytes hoặc nới sandbox sẵn có |
| AC11 | Desktop/mobile, bàn phím, focus/ESC, text layer, zoom và lỗi; ảnh/video/menu/brief/language switch không regression |
| AC12 | Không tải PDF trước click; tải/render có cap/cancel, gallery có giới hạn; kiểm PDF Credential khoảng 17 MB và case sát giới hạn |
| AC13 | Link được kiểm trong CMS và origin website mục tiêu; local PASS không thay Production evidence; fallback no-JS có nhãn đúng |
| AC14 | Cả upload/link ngoài tự nhận diện PDF/IMAGE/WORD/EXCEL từ nội dung; URL không đuôi vẫn hoạt động; file đổi đuôi/MIME giả, ZIP không phải Office hoặc container mơ hồ không bị nhận nhầm |
| AC15 | Ảnh từ hai nguồn mở reader tại điểm xem ảnh, zoom/vừa khung/tải/đóng đúng; ảnh inline, logo và ảnh trang trí không tự có tương tác mới |
| AC16 | DOC/DOCX/XLS/XLSX từ hai nguồn tải bằng bytes khớp hash với tên an toàn; không mở viewer Office/reader trống, không convert/proxy; lỗi không tự tải file |
| AC17 | Credential và mapping trang vẫn chỉ nhận PDF; slot ảnh từ chối Office; action tài liệu chung điều hướng đúng theo loại; parser Office có bounds và nhánh upload Office không làm yếu pipeline ảnh/PDF |
| AC18 | Ma trận CMS/Preview draft/Preview snapshot/Website × HOSTED/EXTERNAL × IMAGE/PDF/WORD/EXCEL đều được kiểm; logout/mất quyền/đổi phiên hủy private reads, đóng reader; mở/đóng không mất form hoặc tự lưu/submit/approve |

Tests khi triển khai: unit/contract cho detection/container/union/URL/slot/identity; integration API/upload Office/snapshot/export/compatibility và concurrency; browser cho reader ảnh/PDF, download Word/Excel, locale/CSP/CORS. Dùng nguồn HTTP fixture local có kiểm soát cho lỗi và hash; thử provider thật chỉ với URL công khai được Khiêm cho phép. Không tải dữ liệu riêng hoặc phát hành để kiểm thử.

## 10. Nguồn kỹ thuật và giới hạn đặc tả

- [Mozilla PDF.js examples](https://mozilla.github.io/pdf.js/examples/): API load document/page/render hỗ trợ xây reader; không chứng minh component đã có trong Pinky Lamb.
- [MDN CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS): script đọc nguồn khác origin cần quyền CORS; lỗi CORS không cho JavaScript luôn xác định nguyên nhân chi tiết. Ảnh external ở thiết kế này cần CORS do chủ đích fetch/hash, không phải mọi thẻ img trên web đều cần CORS.
- Parser container Office dựa trên [Microsoft CFB](https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-cfb/bc33425a-fbb9-4f73-911f-2662c7a14060), [DOC FibBase](https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-doc/26fb6c06-4e5c-4778-ab4e-edbf26a545bb) và [XLS FilePass](https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-xls/cf9ae8d5-4e8c-40a2-95f1-3b31f16b5529). Chỉ kiểm container/signature và dấu hiệu mã hóa; không thực thi Office và không tuyên bố quét malware.
- Cài đúng `pdfjs-dist@6.4.299` và `fflate@0.8.2`, không chạy install scripts. Tự rà soát tuần tự; không có reviewer độc lập.

## 11. Vận hành local

- `make run` dựng Admin durable và chạy Admin/API tại `http://127.0.0.1:5273/login`, Website tại `http://127.0.0.1:4189/`, các worker hiện có. Không seed/reset dữ liệu.
- Allowlist liên kết ngoài mặc định rỗng. Cấu hình `PINKY_EXTERNAL_FILE_HOSTS` bằng danh sách hostname công khai phân cách dấu phẩy, rồi chạy `make run`. Chỉ thêm domain nguồn thực tế đã được chọn; không dùng wildcard. Fixture `media.example.org` trong tests không phải provider đã cấu hình cho retained CMS.
- Nguồn ngoài phải là URL HTTPS trực tiếp, ổn định, không query/fragment/credentials/redirect; trả MIME khớp hoặc `application/octet-stream`; cho phép CORS từ origin Admin và Website. Share page/login HTML bị từ chối.
- Trong CMS, dùng **Ảnh và tài liệu** để kiểm/lưu nguồn ngoài hoặc upload Office. Upload ảnh/PDF tiếp tục dùng pipeline hiện có, tự nhận diện bytes. Chọn tài nguyên vào slot tương ứng, lưu nháp, xem Preview rồi thực hiện review hiện có.
- Lỗi nguồn: kiểm URL/allowlist/CORS/kích thước/loại; nếu bytes thay tại cùng URL thì phải tạo tài nguyên mới và duyệt lại. Reader không tự mở viewer ngoài hoặc bỏ hash.
- Office chỉ download, không convert/preview nội dung. Giới hạn hiện tại: file 25 MiB, ảnh ngoài 10 MiB, ảnh tối đa 8192 px/cạnh và 40 megapixel, PDF tối đa 48 trang. Giới hạn HOSTED ảnh/PDF cũ theo pipeline cũ.

## 12. Kết quả giai đoạn trước — lịch sử trước duyệt phương án 1

### Đã triển khai

- Contract FILE_RESOURCE với nguồn EXTERNAL hoặc HOSTED Office; immutable asset/hash, thư viện riêng và API có ACL/idempotency/CAS/archive. Không lộ private Storage keys qua descriptor.
- Tự nhận diện PDF/JPEG/PNG/WebP/DOC/DOCX/XLS/XLSX; có bounds cho ZIP/CFB, từ chối container mơ hồ, dấu hiệu mã hóa/macro OOXML và đường dẫn sai. Đây không phải bộ kiểm toàn bộ nội dung hay malware scan.
- Nối content/provider/slot/QA/snapshot và các Preview hiện có. Reader dùng chung ảnh/PDF, kiểm bytes/hash trước hiển thị; Office tải bằng bytes đã kiểm. Giữ sandbox iframe của Preview, đặt reader controls trong parent có quyền.
- Website renderer/export có dispatcher và runtime PDF.js/worker local. External chỉ xuất metadata; HOSTED xuất bytes đã kiểm. Runtime được băm từ dependency tới entry để retained release không dùng nhầm engine/worker sau lần publish khác.
- CMS ảnh/PDF upload cũ giữ pipeline; nhận diện không phụ thuộc OS MIME hoặc tên file. Default external allowlist rỗng.

### Kiểm chứng đã quan sát

| Kiểm tra | Kết quả và giới hạn |
| --- | --- |
| `node --test` trên 13 test files liên quan | 83/83 PASS: detection, API+SQLite+local Storage thật, content save/snapshot/archive, media contract/upload, renderer, exporter/cache và selected-publication guard. Log `/tmp/pinky-files-final-tests.log`. |
| `node --test tests/file-reader.local.test.mjs` với Playwright cache sẵn có | 2/2 PASS: reader PDF HOSTED/EXTERNAL, ảnh, Word download, hash mismatch, trang/text/focus, mobile; component CMS thật qua API/SQLite fixture, ảnh ngoài → Preview, upload/download XLSX và auto-detect PDF MIME chung. Provider ngoài được intercept bằng bytes fixture. Log `/tmp/pinky-files-final-browser.log`. |
| PDF Credential thực tế trong browser fixture | 17,349,548 bytes, 48 trang; hiển thị tại mobile 390×844; ảnh chụp `.local/test-results/external-media-v1/reader-mobile.png` đã xem. Đây là runtime proof của reader, không phải toàn bộ kiểm tra chất lượng từng trang. |
| ESLint các module `.mjs` thay đổi | 61 module PASS; không hạ rules. |
| `make run` | Admin Vite build PASS; Admin/API và worker khởi động; readiness worker recomputed 72. Log `/tmp/pinky-external-media-runtime-final.log`. |
| HTTP stack local | Admin login 200, Website 200; `/api/cms/files` không auth trả 401. Không đăng nhập hoặc đọc credentials. |
| `git diff --check` | PASS; không commit/push. |

Kết quả 83/83 không đồng nghĩa tất cả AC01–AC18 đã nghiệm thu. AC02–AC04/AC09/AC10/AC14–AC17 có source và fixture proof theo từng lớp; chưa có full retained-data CMS → approved publication → live Website với file đổi mới. AC05–AC08/AC11–AC13/AC18 mới kiểm một phần; chưa chạy toàn bộ ma trận lỗi, đổi quyền, mọi locale/slot và mọi tổ hợp nguồn/loại ở mọi bề mặt. Không đổi NOT_RUN thành PASS.

Kiểm tra rộng trước đó: lint toàn repo có 6 findings trong file không sửa (`media-worker`, `site-v3-snapshots`, `media-v3-toolset-v2`); `multilingual-release-local.test.mjs` có 2 lỗi kỳ vọng port 5010 so với exporter HEAD vốn dùng 4189. Không sửa unrelated gates/expected chỉ để xanh. Bộ focused cuối ở bảng trên đạt.

### Vướng mắc publication tại thời điểm giai đoạn trước

`cms-api/selected-publication.mjs::targetPin()` từ chối single-content publication khi dependency hash của nguồn/media dùng chung đổi. Ngoại lệ hiện có chỉ dành cho Showreel; thay Credential, ảnh hoặc FILE action có thể đổi nguồn dùng chung. Bỏ guard sẽ cho phép nội dung/ngôn ngữ khác giữ pins không nhất quán, trái phạm vi bảo toàn publication đã duyệt.

Đặc tả ban đầu chưa chốt cách cập nhật nguồn dùng chung xuyên locale/nội dung. Phiên chính đã yêu cầu quyết định: (1) đối chiếu và xác nhận tất cả nơi phụ thuộc trong một lần cập nhật, hoặc (2) chỉ cập nhật nơi được chọn và cho phép các nơi giữ nguồn khác nhau. Đang chờ phản hồi. Khuyến nghị (1), nhưng cần thiết kế bundle các phụ thuộc đã duyệt; tuyệt đối không tự xuất bản draft không liên quan. Chưa sửa guard hoặc giả thành công.

Website local đang chạy vẫn trỏ tới `.local/releases/multilingual-001/brand-logo-highlight-20261019-v2/public`, hash manifest `b57fd097a0201a4befc55b0d31a1f3464c8836d1b2b4992ba077da619947b226`. Reader mới đã chạy trong artifact/browser fixture, **chưa được kích hoạt trên live Website :4189**. Không có publish/deploy/cloud action hoặc seed/reset retained data.

### Bước tiếp theo đã được chốt bằng yêu cầu tại mục 13

1. **Khuyến nghị tại thời điểm cũ:** chốt cập nhật tất cả nơi dùng chung file trong một lần xác nhận, hoặc chọn tách nguồn theo từng nơi. Sau quyết định này, hoàn thiện publisher và regression tests trong phạm vi local đã được duyệt; không cần duyệt lại các phần implementation hiện có.
2. Cung cấp hostname/URL file công khai thực tế để cấu hình allowlist và kiểm CORS từ Admin/Website local. Không cần gửi credentials; không deploy để kiểm.


## 13. Phương án 1 — publisher cập nhật file dùng chung

Nguồn quyền trực tiếp ngày 22/10/2026, Asia/Ho_Chi_Minh:

> Approve phương án 1: cập nhật tất cả nơi dùng chung file trong một lần xác nhận. Hoàn thiện publisher và kiểm thử local toàn bộ luồng CMS → Preview → Website, không tự publish draft không liên quan, chưa deploy.

Phiên chính là người triển khai/ghi hồ sơ. Không tạo worktree, không commit/push, không deploy. Quyết định này thay trạng thái chờ của mục 12.

### Luồng và invariants

1. Editor lưu thay đổi file vào nguồn CMS bằng các đường save hiện có; bản được chọn cần hết stale và có revision/hash xác định. Slot ảnh/Credential/FILE vẫn giữ ràng buộc loại.
2. **Xuất bản** gọi `POST /api/cms/localizations/website/prepare`. Owner đọc release đang chạy, dựng phạm vi từ consumer đã công khai trên EN/VI/JA và trả hash của phạm vi. Bước chuẩn bị không tạo snapshot hoặc cập nhật Website.
3. Mỗi consumer phụ thuộc lấy nội dung từ QA/snapshot trong release đang chạy. Publisher chỉ thay file và các giá trị dẫn xuất bắt buộc của binding. Riêng bản được chọn dùng bản nháp đã lưu đúng revision/hash người dùng chọn. Các draft khác không được dùng làm nội dung và không bị sửa/rebase.
4. Giao diện hiển thị file, danh sách nội dung/ngôn ngữ và nút **Xem trước EN/VI/JA**. Preview dùng đúng candidate đã chuẩn bị, không nạp toàn bộ draft hiện tại; giữ iframe sandbox rỗng và reader được kiểm quyền ở parent. Nút **Xác nhận cập nhật N nội dung** là xác nhận xuất bản duy nhất của nhánh dùng chung.
5. `POST /api/cms/localizations/website/publish` mang `fileConfirmation = {hash, baseSnapshotSetHash}`. Server tính lại phạm vi trong transaction, kiểm Owner/revision/hash/source và ghi nguyên tử các snapshot/review/audit của lần cập nhật. Snapshot phụ thuộc giữ nội dung đang công khai; không ghi các collection draft hoặc thay latest-approval pointer của các draft phụ thuộc. Gallery thay ID nhưng giữ nguyên alt text tương ứng.
6. Publisher lắp các snapshot cùng lúc thành release nhất quán, kiểm resource union và đóng gói. External vẫn chỉ xuất descriptor/hash; HOSTED lấy đúng bytes thế hệ bất biến từ live artifact hoặc descriptor được xác nhận trong plan. Không mở quyền đọc media tùy ý.
7. Trước và sau HTTP verification, publisher kiểm lại bản chọn, phạm vi file, quyền và con trỏ. Nếu đóng gói lỗi, Website giữ bản trước. Nếu xác minh thất bại/source phụ thuộc đổi khi xác minh, phục hồi con trỏ cũ khi vẫn sở hữu candidate đó. Không ghi đè một con trỏ do thao tác độc lập vừa thay. Retry cùng intent dùng lại snapshot/artifact, không tự retry một job bị chặn.
8. Nội dung không đổi nguồn file tiếp tục đi qua selected-publication cũ. Ngoại lệ Showreel hiện có được giữ; không gỡ `targetPin` một cách tổng quát.

Nguồn phải thay file đồng nhất ở các binding dùng chung. Nếu một consumer vẫn giữ ID cũ, hoặc phần nguồn liên quan có thay đổi khác ngoài file/binding, bước prepare chặn và nêu consumer cần đối chiếu. Không tự hợp nhất, tự xuất bản hoặc xóa thay đổi đang biên tập. Hash xác nhận bao gồm source/provenance hiện tại; source đổi sau khi xem Preview yêu cầu chuẩn bị lại.

### Thành phần chính

- `cms-api/shared-file-publication.mjs`: phạm vi file, consumer, giữ copy frozen, dựng resource union và release.
- `cms-api/localized-editorial.mjs`: snapshot bundle trong transaction và replay có audit; không sửa draft phụ thuộc.
- `cms-api/selected-publication.mjs`, `cms-api/local-website.mjs`, `cms-api/selected-publication-media.mjs`: job tiếp tục được, export theo phạm vi và kiểm/khôi phục con trỏ.
- `contracts/website-publication.mjs`, `contracts/shared-file-publication.mjs`: xác nhận plan và receipt; API/Auth allowlist có prepare.
- `admin/website-publication-preparation.mjs`, review editor và full-site Preview: đối chiếu phạm vi, Preview candidate và một xác nhận.
- Admin CSP pin hash chính xác của `FULL_SITE_QA_STYLE`; không thêm quyền chạy script trong iframe hoặc nới worker-src.

### Kiểm chứng và giới hạn

| Kiểm tra cuối | Kết quả thực tế |
| --- | --- |
| Bộ regression 18 test files: nguồn file, content/media, renderer/export/cache, editorial, selected/shared publisher và UI | **118/118 PASS**, log `/tmp/pinky-shared-verified-tests.log`. Bao gồm source drift trong lúc HTTP verification, rollback pointer, replay cùng intent, draft không liên quan, upload Office → Hero/IP FILE action, gallery alt text và bytes/generation của hosted PDF/ảnh. |
| Contract xác nhận Website bổ sung | **3/3 PASS**, log `/tmp/pinky-shared-contract-final.log`; hai test trong số này trùng coverage của bộ regression. Chỉ Website nhận `fileConfirmation`, editorial submit cũ vẫn strict; body/hash sai bị từ chối. |
| Playwright: `file-reader.local.test.mjs` và `shared-file-publication.local.test.mjs` | **3/3 PASS**, log `/tmp/pinky-shared-final-browser.log`. Có nguồn ảnh ngoài, upload/download Excel, PDF 17 MB/48 trang, lỗi hash; chuỗi CMS → Preview candidate → một xác nhận → artifact Website với reader đúng PDF ở EN/VI/JA, draft dịch vụ mới hơn không bị công khai. Không có page error hoặc lỗi CSP trong chuỗi shared-file cuối. |
| ESLint các module `.mjs` thay đổi | **76 module PASS**; sau các chỉnh sửa cuối chỉ chạy lại lint trên module đổi tiếp và đạt. Không hạ rules. |
| `make run` | Admin build PASS, durable Admin/API/worker sẵn sàng, readiness worker recomputed 72; log `/tmp/pinky-shared-runtime-final.log`. |
| HTTP thực tế sau restart | Admin login **200**, Website **200**; Files API không auth **401**; prepare POST thiếu Origin **403**, cùng Origin nhưng chưa đăng nhập **401**. |
| Diff/phạm vi | `git diff --check` PASS. Protected `dist/`, baseline và Website pointer không đổi; không seed/reset, commit/push hoặc deploy. |

Ảnh browser tại `.local/test-results/external-media-v1/shared-publication-website.png` đã được xem. Đây là dữ liệu/locale fixture, không phải bằng chứng dịch thuật hoặc nghiệm thu từng trang của nội dung retained. Các lỗi trung gian đã được sửa trong product hoặc adapter fixture; không thay expected nghiệp vụ để lấy PASS.

Website retained vẫn dùng artifact `brand-logo-highlight-20261019-v2` có hash manifest `b57fd097a0201a4befc55b0d31a1f3464c8836d1b2b4992ba077da619947b226`. Admin/API local đã nạp mã publisher mới. Reader mới xuất hiện trên Website khi một publication nội dung cụ thể được xác nhận qua CMS; task này không tự chọn draft retained để xuất bản.

- Browser fixture chạy HTTP riêng để không thay listener/con trỏ retained `:4189`. Adapter test cung cấp Host local cố định cho public handler hiện có; không thay gate Host trong ứng dụng.
- Fixture dùng SQLite, local Storage, content/provider/editorial, exporter, public handler và component CMS/Preview/reader thật. Actor/provider bên ngoài được thay bằng identity tổng hợp và bytes HTTP có kiểm soát; không đăng nhập retained CMS hoặc đọc credentials.
- Chưa có URL provider công khai thực tế từ Khiêm. Allowlist retained vẫn rỗng. Chưa kiểm CORS/uptime/provider thật hoặc Production.
- Browser proof không thay thế nghiệm thu toàn bộ AC01–AC18 ở mọi slot/locale, mọi lỗi mạng/quyền và từng tổ hợp dữ liệu thực tế. Không tự công bố tất cả AC đã nghiệm thu.
- Tự rà soát tuần tự bằng skill code-review-and-quality; không có reviewer độc lập. Các lỗi lint toàn repo/port của kiểm tra rộng ở mục 12 vẫn là bằng chứng lịch sử, không bị sửa để làm xanh task này.

### Bước tiếp theo

1. **Khuyến nghị:** Khiêm nghiệm thu tại Admin local bằng một thay đổi file cụ thể, xem phạm vi và Preview rồi chủ động xác nhận xuất bản local; các draft khác được giữ nguyên.
2. Khi có URL nguồn công khai thực tế, cấu hình allowlist domain và kiểm CORS/hash từ origin Admin/Website local. Không gửi credentials và không cần deploy cho bước kiểm này.

## 14. Reader dùng biểu tượng — 23/10/2026

Yêu cầu trực tiếp của Khiêm: “Iconify this reader.” Phạm vi là giao diện reader dùng chung cho CMS, Preview và Website; chỉ triển khai/kiểm thử local, không publish nội dung retained hoặc deploy.

- Thay nút chữ bằng SVG cho đóng, trang trước/sau, thu/phóng, vừa chiều rộng, tải xuống và thử lại. Giữ số trang, trạng thái và thông báo lỗi bằng chữ.
- Mỗi nút có `aria-label` và tooltip theo locale VI/EN/JA; SVG ẩn khỏi accessibility tree. Giữ bàn phím/focus, disabled state và vùng chạm tối thiểu 44 × 44 px.
- Toolbar gọn trên mobile; viewport dùng phần chiều cao còn lại. SVG nằm trong reader, không thêm package/CDN hoặc phụ thuộc vào bundle CMS.
- Cập nhật hash CSP chính xác của `FULL_SITE_QA_STYLE` trong Admin. Không nới quyền inline script/style để vượt kiểm tra.

Kiểm chứng local: `node --test tests/file-reader.local.test.mjs` **2/2 PASS** (nút/nhãn SVG, zoom/fit, hosted/external PDF, ảnh, Office download, lỗi hash và focus; tất cả nút trong viewport 320/390 px). `node --test tests/shared-file-publication.local.test.mjs` **1/1 PASS** sau cập nhật hash CSP (CMS → Preview → Website EN/VI/JA, không page error/CSP error và không publish draft không liên quan). `node --test tests/file-export.test.mjs` **3/3 PASS**, gồm exact stylesheet hash và public runtime export. ESLint reader/test và `git diff --check` PASS. Các lệnh dùng Node/cache Playwright hiện có; browser tests chạy server fixture loopback riêng.

Ảnh thực tế đã xem: `.local/test-results/reader-review/icon-pdf-mobile.png` và `icon-pdf-desktop.png`, dùng Credential PDF 48 trang. Tự review tuần tự; không có reviewer độc lập. Chưa nghiệm thu trên thiết bị vật lý và chưa kích hoạt artifact mới trên Website retained.

Bước tiếp theo: Khiêm xem ảnh mobile/desktop để nghiệm thu giao diện biểu tượng; publication nội dung và deploy vẫn theo quyền riêng.

### 14.1. Tinh chỉnh theo phản hồi về độ chuyên nghiệp — 23/10/2026

Khiêm yêu cầu bộ biểu tượng và giao diện chỉn chu hơn. Thay SVG tự vẽ ở mục 14 bằng hình học Lucide 1.57.0 đang có trong dự án: X, ChevronLeft/Right, ZoomOut/In, MoveHorizontal, Download, RotateCw và FileText. Tách nhóm chuyển trang/zoom; nút tải xuống dùng màu thương hiệu, thêm badge tài liệu và tinh chỉnh trạng thái hover/pressed/disabled/focus. Giữ labels, keyboard và vùng chạm 44 px; tôn trọng reduced motion.

Reader import icon nodes từ dependency hiện có. Public exporter đóng gói đúng chín icon nodes thành module content-hashed riêng và kèm giấy phép Lucide; không đưa toàn bộ thư viện vào Website, không thêm dependency/CDN. Cập nhật lại exact stylesheet CSP hash; không nới policy.

Kiểm chứng revision này: `node --test tests/file-reader.local.test.mjs tests/shared-file-publication.local.test.mjs tests/file-export.test.mjs` **6/6 PASS**; ESLint reader/exporter và `git diff --check` PASS. Ảnh mobile/desktop đã được xem tại `.local/test-results/reader-review/lucide-pdf-mobile.png` và `lucide-pdf-desktop.png`. Tự review tuần tự, chưa có reviewer độc lập hoặc nghiệm thu thiết bị vật lý. Không publish retained content hoặc deploy.

Bước tiếp theo: Khiêm nghiệm thu giao diện qua hai ảnh mới; chỉ sửa tiếp nếu có phản hồi cụ thể.

### 14.2. Xác nhận thiết kế của Khiêm — 23/10/2026

Khiêm xác nhận trực tiếp: “Looks better. Keep this design for both PDF and image readers across CMS, Preview and Website. No deploy yet.”

Thiết kế Lucide ở mục 14.1 được duyệt và giữ thống nhất cho reader PDF/ảnh trên cả ba bề mặt. Reader ảnh giữ zoom, vừa chiều rộng, tải xuống và đóng; các điều khiển số trang chỉ xuất hiện với PDF. Đây là xác nhận thiết kế, không phải nghiệm thu trên thiết bị vật lý hoặc cấp quyền publish/deploy. Không thay mã ứng dụng hoặc chạy lại kiểm thử trong lần ghi nhận này; giữ nguyên bằng chứng kiểm thử của revision ở mục 14.1.

Bước tiếp theo: Khiêm có thể nghiệm thu luồng sử dụng với nội dung cụ thể trên local; publish nội dung và deploy cần chỉ đạo riêng.

## Bổ sung UI-LAYOUT-004 — 23/10/2026, local only

Kế hoạch v4 được Khiêm duyệt triển khai. `GET /api/cms/files` bổ sung query tùy chọn `source=EXTERNAL|HOSTED`, cùng `kind` và `cursor` hiện có. Backend authorize trước query, lọc source/kind trước limit 21 (trả tối đa 20 và nextCursor). Tham số lạ/lặp bị từ chối; enum không hợp lệ dùng lỗi validation hiện có. Không đổi descriptor, quyền ghi, immutable snapshots hoặc publication semantics.

Thư viện CMS hợp nhất các trang nguồn có giới hạn: IMAGE/PDF/VIDEO qua API media và file qua API file, tối đa 80 items/lần ở bộ lọc Tất cả. Mỗi stream có cursor riêng, stream hết trang không được tự quay về đầu; đổi filter reset toàn bộ cursor. Thứ tự theo từng stream, không hứa global chronological order/snapshot nhất quán. Search ghi rõ trong trang hiện tại; không tải hết dataset. File đã inspect được ánh xạ READY, không đưa vào filter trạng thái xử lý của media queue.

Intake thiết bị nhận diện loại theo xử lý hiện có; Word/Excel dùng file service, ảnh/PDF/video dùng media upload service. Tiếp tục không ghi upload; người dùng chọn Thêm vào thư viện mới gửi. Luồng retry/idempotency/expected revision vẫn ở service sở hữu. Liên kết ngoài giữ kiểm tra policy, quyền sử dụng và reader trước lưu. Quy ước UI: `docs/agent-kit/ui-layout-contract.md`; kết quả kiểm chứng hiện hành: `pinky-lamb-cms/tasks/UI-LAYOUT-004.md`. Không có publish/deploy từ bổ sung này.
