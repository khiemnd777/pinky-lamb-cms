# P7 v2 — engineering và QA riêng

**Cập nhật mới nhất:** [P7 cleanup v1](#p7-cleanup-v1--17102026) đã dọn bản duyệt
4189 theo nội dung gốc5010, bỏ nhãn/sample copy khỏi UI/metadata, giữ internal
fixture guards. Mục này ghi artifact đang chạy và bằng chứng mới nhất.
Tiêu đề giữ tiếng Anh trên EN/VI/JA; body và thao tác theo locale.
Các mục [favicon correction](#khôi-phục-favicon-gốc--17102026) và
[Play correction](#khôi-phục-icon-play--17102026) giữ snapshot sửa lỗi trước.
Artifact hiện hành chỉ được xác định trong mục cleanup v1 ở cuối tài liệu.
Các quyết định dịch heading ở snapshot cũ bên dưới đã được thay thế bởi chỉ
đạo mới này; các giới hạn content thật và activation vẫn giữ nguyên.

## Quyền và phạm vi

Approved trực tiếp 17/10/2026: một agent; hoàn tất source trước một đợt kiểm
cuối tại loopback :4189. Không import, không Publish thêm, không activation
:5010, không sửa backup. Nguyên lời duyệt ở canonical
[task record](../tasks/MULTILINGUAL-001-v2.md#p7-v2--engineering--qa-4189-approved-17102026).
Không có quyền cloud/production hoặc đổi model/config/sandbox toàn cục.

Backup trước P7: `.local/backups/hosting-5010/20261017-062442-before-p7`.
Archive SHA256 `c716955e11c9d9549361adc00757d6cf09e86ecab408061d6b8b3c1f99582584`.
40 files/30.844.370 byte, khớp HTTP và giải nén thử; đã đặt chỉ đọc. Backup
không thuộc bất kỳ output root hoặc write set nào bên dưới.

## Luồng sản phẩm

1. Admin vào Xuất bản → Bản website ba ngôn ngữ → Kiểm tra điều kiện.
   `GET /api/cms/localizations/editorial/readiness` trả ba locale trong một
   transaction, chỉ rõ mandatory còn thiếu/stale và section thiếu record hợp lệ.
2. Chỉ khi cả ba locale đủ điều kiện, OWNER có thể Tải gói website. Gói dùng
   release API đọc immutable published snapshots; không save/Publish/import.
   API tái kiểm eligibility khi tải, không tin trạng thái UI đã đọc trước đó.
3. Browser kiểm snapshot-set digest, resource identity/bytes/hash, session và
   abort. Chỉ authenticated derivatives và inline resources cần đi cùng gói.
   Exporter bổ sung tài nguyên legacy từ exact baseline pins tại máy local;
   browser không fetch stylesheet cross-origin và không xuất token.
4. Exporter kiểm copy hash, identity, locale, source/policy/media consistency,
   output paths/budgets và độc quyền generation. Artifact không gọi CMS API
   lúc người xem chuyển locale. Lệnh transport cũ cũng dùng canonical :5173,
   không dùng Functions :5001 đang giữ module cũ.
5. QA host chỉ bind 127.0.0.1:4189, chỉ GET/HEAD các file trong manifest; không
   phục vụ manifest/private inputs và từ chối traversal/foreign request target.
   Switch/restore chỉ tác động artifact của listener :4189 do nó sở hữu.

Template: giữ source website 10/10 cùng mapping đã khóa, không đổi thiết kế
section khác. Hero workspace/private preview P1 v2 giữ nguyên; không transplant
stylesheet P1 có global resets vào website public. Public renderer giữ Hero
composition của template website và adapt typed localized fields, không đưa
nhãn BẢN NHÁP hoặc controls của editor lên website.

## Lệnh vận hành sau khi có gói thật

Chép gói tải từ CMS vào một file mới trong `.local/release-inputs/`; không chép
credentials/session. Dùng pinned Node và existing guard:

```sh
.local/cache/node/node-v22.23.3-darwin-arm64/bin/node scripts/local-guard.mjs export-multilingual-site --bundle .local/release-inputs/site.json --run-id release-id
```

Ghi receipt `relativeRoot`/`manifestSha256` vào private `artifact.json`, rồi:

```sh
.local/cache/node/node-v22.23.3-darwin-arm64/bin/node scripts/local-guard.mjs export-multilingual-site --serve .local/release-inputs/artifact.json --run-id release-id
```

Chỉ khởi động nếu :4189 trống. Không kill/adopt listener có sẵn. `--serve`
kiểm toàn bộ file và generation identity trước bind. SIGINT/SIGTERM đóng riêng
QA host; không chạm emulator hoặc :5010.

## QA fixtures và giới hạn nghiệm thu

Fixture test-owned gồm ba locale, nhiều Projects/Services, record thiếu ở JA,
related service thiếu và bản chữ dài. Dùng media public đã có; không ghi CMS.
Artifact mang `qaFixture:true`, tiêu đề `[QA fixture]`, HTTP header riêng, và
bị từ chối nếu chọn phục vụ tại :5010 hoặc lập activation plan. Fixture không
phải nội dung đã được người dùng Publish hoặc duyệt ngôn ngữ.

Kết quả đợt kiểm cuối nằm bên dưới. Các fixture chỉ phục vụ kiểm kỹ thuật;
không dùng fixture làm bằng chứng nội dung thật đã xuất bản hoặc được duyệt.

Hosting hiện tại dùng chung PID cho :5010/Auth/Functions/Storage. Code activation
cũ cần controller sở hữu Hosting độc lập, chưa có adapter đã chứng minh cho
retained runtime này. Installed Firebase Hosting stop là method nội bộ trong
tiến trình, không là quyền hoặc cơ chế điều khiển an toàn từ phiên hiện tại.
Giữ operational activation bị chặn; không kill/restart parent hoặc lách qua
debugger. Rehearsal :4189 không chứng minh khả năng tách :5010.

Nội dung thật: inventory trước P7 còn 63/72 bản lưu thiếu; Wayfair EN v4 đã
Publish riêng. Chưa đủ release ba locale. `CODE_COMPLETE` và fixture QA không
đồng nghĩa content acceptance, active release hoặc MULTILINGUAL_LOCAL_COMPLETE.

## Kết quả thực tế — 17/10/2026

**SOURCE_COMPLETE / QA_FIXTURE_VERIFIED_SCOPED / REAL_CONTENT_BLOCKED.** Một
agent thực hiện, không delegation. Không có công cụ đổi/xác nhận effort thực
tế của phiên; không tuyên bố runtime xHigh. Không import, Publish, activation,
đổi Auth/roles hoặc restart emulator. Chỉ reload Vite để nạp readiness API.

Evidence: `.local/test-outputs/p7-v2/`. Các log RED/partial giữ nguyên, không
ghi đè thành PASS. Sau khi source hoàn chỉnh, chạy một campaign cuối; sửa đúng
lỗi phát hiện và chỉ kiểm lại phần bị ảnh hưởng, không chạy lại toàn suite.

| Phần | Bằng chứng và kết quả | Giới hạn |
| --- | --- | --- |
| Rules/contracts/export/transport | 59 test cases khác nhau có PASS trong `verification-summary.json`; 54 ở batch gốc, 4 ở followup preparation, 1 negative derivative ở followup cuối | Batch gốc có file test không khởi động do import browser Auth; đã bỏ import có side effect. Fixture derivative sai metadata đã sửa theo contract thật; không giảm assertion |
| Lint/build | Lint 18 paths PASS; lint 6 paths thay đổi cuối PASS; Admin build 2123 modules PASS trong `final-admin-build.log`; `git diff --check` PASS | Build chạy trước hai rule CSS của public QA và tách artifact module; runtime artifact sau sửa đã được kiểm riêng. Không full-suite/emulator harness |
| CLI bàn giao | Lệnh guard `export-multilingual-site --serve` thực sự trả `QA_READY`, bind riêng 4189, phục vụ cả long/base artifact | Lần đầu CLI dừng vì dynamic import vòng. Đã tách `multilingual-site-artifact.mjs`; host không import ngược exporter. Lệnh thật sau sửa và 3 affected artifact/export tests PASS (`final-artifact-followup.log`) |
| HTTP artifact và restore | 107 file khớp SHA/size qua HTTP; base → long → restore base tại riêng 4189: `QA_RESTORE_VERIFIED` | Rehearsal không điều khiển Hosting 5010, không chứng minh restore DB hoặc khả năng tách emulator |
| CMS thật | OWNER sẵn có → Xuất bản → Kiểm tra điều kiện: cả EN/VI/JA chưa đủ; download disabled; mở danh sách thiếu theo tên nội dung. Desktop và mobile 390px; panel không tràn, actions cao44px | Không tạo nội dung để mở nút tải. Download thật với toàn bộ publications đủ điều kiện chưa chạy |
| UI tương tác fixture | Load more4→8; filter Film; đúng entity khi EN→VI; thiếu JA đóng modal, giữ filter và thông báo; Services native details; showreel thực phát/dừng; validation focus; dirty brief Stay/Discard/same-locale; copy brief giả có toast thành công | Không gửi email. Native cancel reload, clipboard-denied fallback và OS email app chưa chạy |
| Mobile/history | Menu mở/đóng khi chọn Work; dialog390px client/scroll354px; refresh deep link giữ Wayfair; Back/Forward phục hồi đúng EN/VI và entity; footer switch JA giữ Work | Không suy representative này thành mọi tổ hợp history/media/keyboard |
| Responsive fixture | EN/VI/JA tại1440/768/390/320: không clipped interactive controls hoặc heading overflow; targeted UI sau sửa xác nhận language buttons tối thiểu44px, Hero label wrapping. Chữ Nhật dài ở320px: project/card/dialog không tràn; ảnh tải thật | Có tràn ngang trang1/7/5/3px tương ứng1440/768/390/320, bằng template5010. Strict zero-overflow criterion còn mở; không thêm overflow:hidden để che |
| Bảo lưu | `preservation-final.json`: 43 checksum entries backup PASS/read-only; 40/40 HTTP5010 và `/` giữ nguyên; 39 dist pins +40 Hosting pins PASS; Hosting vẫn PID15465 | Backup chỉ website/config. Không phải audit lại toàn bộ CMS DB |

Artifact đang phục vụ: `http://127.0.0.1:4189/`, `/vi/`, `/ja/` — tất cả là
**QA fixture**, có title/header riêng. Base manifest SHA256
`a5bee2fa0b2dd3f1716fbd79c989409c9a32236f53997254aaf5c0eee362a506`;
long fixture `f36bbd71104f4c5be7154fc3af3e2d029ee83685af6e0ffa1e1d591ee1e8143d`.
Base receipt: `fixed/base-artifact.json`; rehearsal: `fixed/qa-restore.json`.
Không sửa hoặc ghi đè generation cũ. QA fixture bị từ chối ở activation plan
và listener5010. Lệnh dừng QA chỉ đóng listener4189 do command sở hữu.

Ảnh/DOM measurements lưu tại `ui/`: `fixed-en-desktop-hero.png`,
`fixed-en-mobile-hero.png`, `fixed-en-mobile-dialog.png`,
`fixed-ja-320-long-dialog.png`, `cms-release-readiness-{desktop,mobile}.png`,
`fixed-target-metrics.json`, `viewport-matrix-final.json`. Matrix đầu
`viewport-matrix.json` không hợp lệ vì resize tab reference thay vì QA; giữ
dấu vết nhưng không dùng làm proof. Matrix `-final` đo đúng innerWidth; hai
rule CSS sau đó được đo lại đúng phần bị ảnh hưởng trong `fixed-target-metrics`.

## Tiêu chí còn mở và người quyết định

- **Nội dung thật / T04,T05,T06,T08:** CMS hiện không đủ publication ba locale.
  T06 từ chối release đã được quan sát thật; full content mapping, ngôn ngữ và
  paired parity mọi section với cùng dataset còn mở. Fixture cố ý có dữ liệu
  test trộn ngôn ngữ; không phải bộ EN/VI/JA đã rà nghĩa. Khiêm quyết định nội
  dung/nhân sự rà và exact write/Publish scope ở bước sau; hiện chỉ danh sách
  thiếu được phép, không tự dịch hoặc bổ sung dữ liệu.
- **UI parity / T01,T02,T03,T05,T08,T10:** source/template pins và các ca UI trên
  đã kiểm; chưa có bộ paired screenshots cùng nội dung thật cho mọi section,
  locale, state. Tràn ngang trang kế thừa template vẫn còn; cần quyết định
  có mở riêng repair template hay giữ baseline khi nghiệm thu. Không gọi
  toàn bộ T01–T10 PASS hoặc coi screenshot Hero thay full-site acceptance.
- **Activation / T09:** không được phép trong slice này. Shared PID15465 là
  blocker vận hành thật; trước khi xét activation cần phương án sở hữu/chuyển
  Hosting độc lập có recovery cụ thể, readiness thật và approval riêng. Chưa
  kiểm CMS saved preview sau activation vì chưa có activation.
- **Human acceptance:** Khiêm rà UI và ngôn ngữ riêng. Không đóng P1/P2/M3/M4,
  P6 content acceptance hoặc MULTILINGUAL_LOCAL_COMPLETE từ kết quả P7 này.

Next options: (1) rà bản QA4189 và các giới hạn trên để nghiệm thu riêng phần
engineering; (2) chốt phạm vi nội dung/Publish còn thiếu trước khi chuẩn bị
release thật. Cả hai không tự cấp quyền import hoặc activation5010.

## Cập nhật hiện hành — sửa tràn ngang P7, 17/10/2026

User giao trực tiếp: “Sửa dứt điểm tràn ngang 1–7px rồi rà UI P7 thật tại
:4189. Một mình mày làm ở effort xHigh, sửa xong mới kiểm một đợt cuối. Không
lặp harness, không import, không Publish thêm, không activation :5010; giữ
nguyên backup.” Một agent thực hiện; runtime effort vẫn không xác nhận được.

**OVERFLOW_FIXED / RENDERED_UI_VERIFIED_SCOPED.** Đoạn này thay trạng thái
tràn ngang còn mở trong kết quả trước. Chỉ sửa source
`preview/full-site-localization-renderer.mjs`; không sửa pinned template.

Nguyên nhân quan sát được: `.hero-orbit` là DIV có border bo48% và transform
rotate(-12deg). Góc hộp chữ nhật sau xoay tạo scrollable overflow dù đường
trang trí nằm gần artwork. Trước sửa, right edge1441.154/775.383/394.805/323.345px
ở viewport1440/768/390/320; mọi HTML element khác nằm trong viewport.

Sửa bằng SVG rounded rect bên trong hộp orbit giữ nguyên inset. Xoay nét vector
thay vì xoay hộp layout; giữ màu, độ dày, radius và góc12°. Hộp orbit không
transform. Không đặt overflow hidden/clip trên trang hoặc Hero; SVG cũng
overflow visible. Artwork, nhãn, note, nội dung và controls không bị cắt.

Sau khi source hoàn chỉnh, một campaign cuối gồm:

- **36 geometry cases PASS:** EN/VI/JA ×320/360/361/390/760/761/768/1020/1021/
  1199/1200/1440px. Document scrollWidth bằng innerWidth ở tất cả các ca;
  không heading/control tràn hoặc nội dung control bị cắt; đủ7section.
  Body/root overflowX vẫn visible. `ui/viewport-matrix.json`.
- **6 long-copy cases PASS:** EN/VI/JA tại1440/320px; card không tràn. Dialog
  tiếng Nhật dài320px: clientWidth=scrollWidth=284; title238=238. Ảnh tải thật.
  `ui/long-copy-matrix.json`, `ui/ja-320-long-dialog.png`.
- **UI thật trên artifact sửa:** header EN→VI, menu mobile→Work đóng đúng;
  load-more4→8, Film filter, đúng dự án VI→JA; Escape trả focus đúng card và
  giữ filter; footer JA→EN. Services details mở được; showreel readyState4,
  paused=false khi mở và true sau Escape. IP image tải được; validation có
  thông báo locale và focus name; brief giả Stay giữ nguyên, Copy có toast
  “Brief copied.”, Discard→VI xóa fields. Không gửi email hoặc ghi CMS.
- **Final native viewport1874px:** scrollWidth1874, root/body overflow visible,
  không dialog còn mở, console errors0. Đã trả viewport override và để QA tab
  mở. Không gọi kết quả này là Safari/iOS hoặc nghiệm thu nội dung thật.
- **Scoped checks:** renderer tests4/4PASS, lint file sửaPASS, diff whitespace
  PASS. Chỉ chạy một lượt; không chạy lại full suite/build/emulator harness.
- **Preservation PASS:** backup43checksum entries/read-only, archive hash cũ
  giữ nguyên; HTTP5010 40/40 và root giữ nguyên;39dist+40Hosting pins khớp,
  PID5010 vẫn15465. QA107files khớp HTTP hashes. `preservation-final.json`.

Evidence đợt này: `.local/test-outputs/p7-overflow-20261017/`. UI before giữ ở
`ui/before.json`; ảnh sau sửa `ui/desktop-hero.png`, `ui/mobile-hero.png`,
`ui/mobile-dialog.png`, `ui/mobile-contact-validation.png`. Lint/test logs
`lint.log`, `renderer-test.log`. Không ghi đè generations hoặc backup cũ.

QA đang phục vụ base artifact `p7-overflow-20261017-base`, manifest SHA256
`4a3f9e22bad6eed1429dcdfcdb46fb609adc74c50544f8ea38da2a7bae597bc7`.
Long artifact `p7-overflow-20261017-long`, manifest
`9a7993adf8fe84c4459d507c7a407e5c48bc37a32c3d84b2239040ce9ba74c27` đã kiểm,
rồi trả lại base bằng CLI4189. Cả hai vẫn là QA fixture có nhãn riêng.

Không còn lỗi tràn ngang trong phạm vi đã kiểm. Các giới hạn không liên quan
vẫn giữ: nội dung thật chưa đủ publication3locale; full paired parity cùng
nội dung thật/human language acceptance, native cancel reload/clipboard-denied
fallback/OS mail app và activation5010 chưa được chứng minh hoặc không được
phép. Không mở lại các nhánh đó chỉ vì sửa geometry. Không đóng P7 full
acceptance hoặc MULTILINGUAL_LOCAL_COMPLETE.

Next: Khiêm rà bản QA4189 đã sửa để nghiệm thu UI engineering; nội dung thật
và activation vẫn cần phạm vi/quyết định riêng như trên.

## Cập nhật fixture EN / VI / JA — 17/10/2026

User giao sửa fixture hiển thị đúng3locale, một agent, requested xHigh, source
xong trước một campaign cuối; không import/Publish/activation5010, giữ backup.
Một agent thực hiện; không có công cụ xác nhận effort thực tế. Không sửa CMS
business records hoặc application renderer trong lượt này.

**FIXTURE_LOCALE_COPY_FIXED / ACTUAL_UI_VERIFIED_SCOPED.** Nguyên nhân cũ là
`p7QaFixture` kế thừa raw unit-test content: section heading Nhật cố định,
Service trộn Nhật/Việt và các group lấy source baseline trộn ngôn ngữ. Route
mặc định vẫn EN; dữ liệu fixture không được chuẩn bị đúng locale.

Đã thêm `tests/helpers/p7-qa-copy.mjs` cho ba bộ chữ độc lập: Hero, header/nav,
clients, Work/Services intro, Project title/summary/scope/alt, Service copy,
About/IP, Contact/Footer và SEO. Fixture dùng các merge/validation contracts
thật, tính lại content hashes, section/project/service dependency vectors và
frozen snapshot-set hash. Không thay unit fixtures cũ để làm tests xanh.

Proper names, source phone numbers, năm và media/PDF gốc giữ nguyên. Nhãn
ngôn ngữ trong picker và brand/template marks vẫn có tên riêng; không xem đó
là English fallback. Bản chữ dài là artifact riêng, lặp copy đúng locale của
nó, không đưa câu Nhật sang EN/VI. Đây vẫn là sample QA, không phải business
translations hoặc publications đã được Khiêm chấp thuận.

**Đợt kiểm cuối:**

| Phần | Kết quả thực tế |
| --- | --- |
| Content/contract |2/2tests PASS (`copy-test.log`): locale-specific values, không unit placeholders/CJK trong EN/VI content drafts, không đổi IDs/missing-JA policy; real composer kiểm toàn nested hashes/renderer contracts; long copy giữ locale và không đổi fixture thường |
| Static | Lint3source paths PASS (`lint.log`), whitespace PASS; không full suite/build/emulator harness |
| Actual default/root |`/` có html lang=en, headerEN, Work “Selected work.”, Services “What we create.”, nav Work/Services/About Pinky/IP Studio. EN/VI main DOM không có CJK unit text |
| VI/JA actual |VI “Dự án tiêu biểu.” / “Dịch vụ sáng tạo.”; JA “さまざまな制作実績。” / “私たちがつくるもの。”; Hero/About/IP/Contact,6Service titles/subtitles và image alts đúng bộ chữ tương ứng (`ui/locale-content.json`) |
| Responsive |36locale×width cases tại320/360/361/390/760/761/768/1020/1021/1199/1200/1440px: scrollWidth=innerWidth, không clipped heading/control (`ui/locale-matrix.json`) |
| Actual dialog switch |JA→EN→VI và final VI→JA→EN giữ Wayfair; title/summary/scope đổi đúng locale; mobile390px dialog354=354. Phát hiện tên khách hàng lặp trong eyebrow fixture, bỏ tên đó vì renderer đã thêm client; final actual eyebrow chỉ còn “Wayfair / QA SAMPLE”, “Wayfair / MẪU QA”, “Wayfair / QAサンプル” (`ui/final-dialogs.json`) |
| Long boundary |6locale×viewport cases1440/320px không page/card overflow; cả3long dialogs320px clientWidth=scrollWidth=284, đúng ngôn ngữ (`ui/long-copy.json`) |
| Final browser |Trả viewport, để EN/#work trên bản thường: native1874px scrollWidth1874, heading Selected work.; console errors0. Không email hoặc CMS mutation |
| Preservation |Backup43checksum/read-only PASS; archive hash giữ nguyên; HTTP5010 40/40 và root,39dist+40Hosting pins khớp; PID5010 vẫn15465. QA107files khớp HTTP hash (`preservation-final.json`) |

Evidence `.local/test-outputs/p7-fixture-locales-20261017/`. Bản đầu ở thư mục
generation `p7-fixture-locales-20261017-{base,long}` giữ nguyên; v2 sửa đúng
eyebrow chứa client lặp, không đổi source/UI layout hoặc tiêu đề trên trang.
Matrix main-page36cases vì vậy còn hiệu lực; long/dialog kiểm trên v2. Không
rerun toàn bộ sau correction3strings. Ảnh Work ba locale và mobile Hero lưu
trong `ui/`; `ui/vi-mobile-dialog.png` là trước correction client lặp, không
dùng làm ảnh final. `ui/final-en-desktop-work.png` là bản đang phục vụ.

Artifact hiện hành tại4189: `p7-fixture-locales-20261017-v2-base`, manifest
`a3646c3c42d3c279d3e62ca642a2b8db30aab7fd58b21cd0053c888e13b00d4c`.
Long v2 đã kiểm riêng, manifest
`fcc2844720a04861c834c2e3e5fc625d166f0334fa0a95dbe64287e6568b2cf4`.
Đã trả server về base; giữ các generations cũ, backup và5010 nguyên trạng.

Không còn blocker cho sửa fixture này trong phạm vi kiểm. Nội dung CMS thật,
human linguistic acceptance và activation vẫn là các phạm vi riêng còn mở;
không suy sample copy thành P6 content acceptance hoặc P7 full acceptance.
Next: Khiêm rà ba URL4189 để nghiệm thu fixture/UI riêng; chưa ghi/import/
Publish nội dung thật hay activation5010.

## Khôi phục tiêu đề template — 17/10/2026

Chỉ đạo mới trực tiếp của Khiêm: đối chiếu `http://127.0.0.1:5010/`, khôi phục
“Good work. Great feelings.” và tất cả tiêu đề gốc; **tiêu đề luôn tiếng Anh
dù đổi ngôn ngữ**. Đây là sửa tiếp P7 đang mở, một agent, requested xHigh;
không có công cụ xác nhận hoặc đổi effort runtime. Source hoàn tất trước một
campaign kiểm cuối. Không import, Publish, activation5010 hoặc sửa backup.

**TEMPLATE_HEADINGS_RESTORED / ACTUAL_UI_VERIFIED_SCOPED.** Nguyên nhân bản cũ
là helper fixture tự đặt các heading mới, nhầm “Selected work.” thành heading
lớn và dùng dữ liệu dự án/service tổng hợp. Không phải route mặc định Nhật.

Đã sửa 5 source paths: `tests/helpers/p7-qa-copy.mjs` đọc heading/runs trực tiếp
từ baseline đã pin; `p7-qa-fixture.mjs` dùng đúng 8 dự án/6 dịch vụ, tên, client,
năm, ảnh và trang credential gốc; `preview/full-site-locale-copy.mjs` chia sẻ
các editorial marks tiếng Anh; `preview/project-localization-renderer.mjs`
giữ “SCOPE OF WORK”; `tests/p7-qa-fixture-copy.test.mjs` xác minh quyết định mới
và real composer contracts. Không execute baseline content JS; chỉ parse dữ
liệu từ wrapper tĩnh đã biết. Hashes/dependencies được tính lại đúng contract.

Hero, Work, Services, About, Showreel, IP, Contact và Footer khôi phục câu,
ngắt dòng và phần nhấn màu gốc. Heading kinh nghiệm vốn tiếng Việt được dịch
sang “Years of creative / & production experience.” để tuân chỉ đạo tiếng Anh.
Giữ proper name “Thanh Xuân Hoàng Kim”. Body/labels/actions theo EN/VI/JA;
mô tả dự án/dịch vụ vẫn là sample QA, không phải nội dung khách hàng đã duyệt.
Quy tắc được ghi ở [DESIGN D12](../../DESIGN.md#d12-tiêu-đề-p7-giữ-tiếng-anh--quyết-định-17102026).

| Phần kiểm | Kết quả thực tế |
| --- | --- |
| Scoped checks | Lint 5 source paths PASS; 14/14 tests trong 3 files PASS; whitespace PASS. Không full suite/build/emulator harness. `lint.log`, `tests.log` |
| Live reference | Đọc UI5010 tại1440/390px; ghi 8 vị trí tiêu đề, text/markup/font/font-size/kích thước/accents và tên dự án/dịch vụ. Chỉ đọc, đóng tab tham chiếu sau khi lấy evidence. `ui/reference.json` |
| Paired title comparison | 8 vị trí ×3 locale ×2 viewport=48 comparisons: text, font, font-size, width, height khớp; không differences. Đây là parity của tiêu đề, không phải pixel parity toàn trang. `ui/title-pairs.json` |
| Responsive base | 36cases EN/VI/JA ×320/360/361/390/760/761/768/1020/1021/1199/1200/1440px: page width=viewport, không heading/control tràn hoặc bị cắt. `ui/geometry.json` |
| Actual controls/dialog | Mở Wayfair JA→VI→EN: tên dự án và “SCOPE OF WORK” giữ tiếng Anh; mô tả/nút đúng locale; 3 ảnh tải được, credential page21. Escape trả focus về card; Load more hiện đủ8 tên gốc. `ui/dialogs.json` |
| Long boundary | Artifact riêng, 6cases EN/VI/JA ×320/1440px không page/card overflow. 3dialogs320px: dialog284=284, title238=238, ảnh tải được, SCOPE OF WORK English. `ui/long-copy.json` |
| Final browser | Đã trả viewport override, EN/#work trên bản thường: native1874px=page1874px, root/body overflow visible, không dialog mở, console errors0. `ui/final-browser.json` |
| Preservation | Backup43checksum/read-only PASS, archive hash cũ giữ nguyên; HTTP5010 40/40 và root khớp;39dist+40Hosting pins khớp; PID5010 vẫn15465. QA135files khớp HTTP hash. `preservation-final.json` |

Evidence `.local/test-outputs/p7-template-headings-20261017/`. Ảnh final
`ui/final-vi-desktop-work.png` thể hiện VI đang chọn nhưng heading gốc tiếng
Anh, đúng ảnh Wayfair/Sony; `ui/final-ja-mobile-work.png` thể hiện cùng heading
trên JA390px, filter xuống dòng không dính nhau. Những ảnh trước có tên
`en-desktop-work.png`, `vi-desktop-work.png`, `ja-desktop-work.png` là
quan sát trung gian do smooth-scroll/resize, không dùng làm paired screenshot
hoặc ảnh final. So sánh DOM của48titles không phụ thuộc góc scroll đó.

4189 đang phục vụ fixture thường `p7-template-headings-20261017-base`, manifest
`08d8b27ffd1676332d423bab8711785201aaefde59eeb6b6f5a7c574a2877e30`.
Long artifact đã kiểm riêng rồi ngừng phục vụ, manifest
`c6d98cf02f5a2635c716a5ec160dedf62eec8dfd5cadbc476a792fcfb9c9f1dc`.
Giữ nguyên các generations cũ và backup. Không sửa harness hoặc test/code loop.

Không thấy lỗi/blocker trong phạm vi tiêu đề/locale/geometry đã kiểm. Nội dung
CMS thật, linguistic acceptance của sample body, full parity bằng nội dung
thật và activation5010 vẫn chưa được nghiệm thu hoặc không được phép. Không
gán P7 full acceptance hoặc MULTILINGUAL_LOCAL_COMPLETE.

Next: Khiêm rà bản4189 để nghiệm thu correction tiêu đề/fixture; mọi thao tác
CMS hoặc activation tiếp theo cần quyết định/phạm vi riêng.

## Khôi phục favicon gốc — 17/10/2026

Khiêm phát hiện favicon bị thay mà báo cáo trước không nêu. Lỗi được xác nhận:
unit fixture mô tả mọi image là `.webp`, tạo resource `assets/favicon.webp`.
Helper hiển thị P7 không tìm thấy file đó nên rơi vào fallback ảnh Hero
`pinky-hero.webp` (51.282bytes), rồi hydrate thành hash hợp lệ của ảnh sai.
Kiểm integrity trước đó chỉ chứng minh bytes khớp descriptor, không chứng
minh đó là đúng brand asset. Tôi bỏ sót kiểm identity này trong báo cáo trước.

Đã sửa `tests/helpers/p7-qa-fixture.mjs`: resource favicon lấy đúng
`assets/favicon.png`, MIME `image/png`; đọc bản baseline và bắt buộc khớp pin
gốc trước khi dựng fixture, không đi qua alias ảnh mẫu. Thêm regression case
trong `tests/p7-qa-fixture-copy.test.mjs` kiểm cả fixture thường/chữ dài, byte
PNG gốc, MIME/path và link cả EN/VI/JA. DESIGN D08 ghi favicon là brand asset
cố định và không được tự đổi ảnh/định dạng. Không sửa renderer, CSS hoặc copy.

Sau khi hoàn tất source, kiểm đúng một đợt liên quan:

- 4/4fixture tests PASS; lint2source paths PASS.
- HTTP5010 và cả3route4189 trả `rel="icon" href="assets/favicon.png"`, declared
  và response MIME `image/png`, PNG64×64,6.186bytes; SHA256 cùng
  `fa1747f42e462ec10b01ae5c81ea7be0ce4b41157aef0ef1ca904a905a893adc`.
- Edge tải/giải mã PNG thật64×64; các route EN/VI/JA vẫn giữ đúng heading.
  Trong tab đang bị công cụ điều khiển, DOM icon có `data-codex-favicon-badge`
  do công cụ trình duyệt chèn. Không gọi badge đó là favicon từ website hoặc
  tuyên bố đã quan sát tab chrome sau khi nhả điều khiển.
- So artifact cũ/mới: 3HTML chỉ khác icon href; thêm2PNG theo locale, bỏ3WebP
  favicon sai. Tất cả assets/script/style khác giữ nguyên hash. Evidence UI
  geometry/headings từ đợt trước vẫn có giá trị; không chạy lại full campaign.
- Backup43checksum/read-only/archive hash,5010HTTP40/40+root và39+40pins giữ
  nguyên, PID5010 vẫn15465. QA134files khớp HTTP. Không CMS writes/import/
  Publish/activation5010 hoặc sửa harness.

Evidence `.local/test-outputs/p7-favicon-20261017/`: `fixture-tests.log`,
`lint.log`, `favicon-http.json`, `edge-proof.json`, `edge-icon.png`,
`artifact-delta.json`, `preservation-final.json`. Bản đang phục vụ tại4189 là
`p7-favicon-20261017-base`, manifest
`f914d074f40bf09b18d26d6549c38efb806b37d07e1dc65b501c85b61d639c6b`.
Trạng thái **FAVICON_RESTORED_HTTP_VERIFIED**; không suy thành nghiệm thu P7
toàn bộ. Các generations cũ được giữ làm lịch sử, không ghi đè.

Next: Khiêm rà favicon gốc trên QA4189 để nghiệm thu correction; không mở
thêm quyền dữ liệu hoặc activation.

## Khôi phục icon Play — 17/10/2026

Khiêm phát hiện banner showreel có nút tròn nhưng không có tam giác Play.
Nguyên nhân: full-site renderer lấy SVG definitions từ document Work/Services
chỉ có arrow/plus/close/spark, trong khi Hero và banner dùng `<use href="#play">`.
Trên bản cũ có 2use nhưng không có definition Play. Đây là lỗi integration
renderer, không phải lỗi màu hoặc thiếu file video. Tôi bỏ sót visual state này.

Sửa `preview/full-site-localization-renderer.mjs` dùng `SITE_SVG_DEFS` hiện có
của template đầy đủ, thay vì trích subset từ Work/Services. Tam giác dùng đúng
path gốc `m9 5 11 7-11 7Z`; không đổi CSS, màu, layout hoặc video interactions.
Regression trong `tests/full-site-localization-renderer.test.mjs` kiểm tất cả
SVG uses resolve đúng1definition có path; Play khớp template và đủ2chỗ dùng,
cho3locale ×PRIVATE/QA_EXPORT. Một agent, source xong trước đợt kiểm liên quan.

- 9/9tests trong renderer+fixture-copy PASS, gồm regression favicon; lint2paths
  PASS. Không full suite/build/emulator hoặc harness loop.
- Edge desktop1440px: tam giác tối hiện rõ trên nút banner; cả Hero và banner
  có SVG Play. Actual click mở dialog, video readyState4, paused=false,
  currentTime7.237855s, error=null. Escape đóng, paused=true, focus trở lại
  `.reel-banner`. `desktop-play.png`, `ui-proof.json`.
- MobileVI390px: tam giác hiện trên banner; SVG banner21×21/Hero16×16, fill
  tối, document390=viewport390. JA390px đúng1Play definition/path gốc, không
  SVG reference thiếu, page390=viewport390. `mobile-play.png`, `ui-proof.json`.
- Artifact cũ/mới chỉ đổi SVG definitions trong3HTML. Không thêm/xóa file;
  mọi resource/style/script/favicons còn lại giữ hash. `artifact-delta.json`.
- Backup43checksum/read-only/archive hash, HTTP5010 40/40+root,39+40pins và
  PID15465 giữ nguyên. QA134files khớp HTTP. `preservation-final.json`.
  Không import, Publish, activation5010 hoặc sửa backup.

Evidence `.local/test-outputs/p7-play-20261017/`. 4189 hiện phục vụ
`p7-play-20261017-base`, manifest
`25447942061f764831c7d693ba499c8bcacefbba95056c1a22ab642d7c378de4`.
Đã trả viewport về native và để EN/#about. Source fix này dùng chung cho
artifact release và private preview; actual private UI không kiểm riêng.
Các giới hạn nội dung thật/full P7 acceptance vẫn giữ; không đóng toàn P7.

Next: Khiêm rà banner Play tại4189 để nghiệm thu correction này.

## P7 cleanup v1 — 17/10/2026

Nguyên lời duyệt: “Approved P7 cleanup v1 — chỉ :4189. Một mình xHigh, dọn hết
theo bản gốc :5010 rồi kiểm UI một đợt cuối. Không lặp harness, không import,
Publish hay activation :5010; giữ nguyên backup.” Một agent thực hiện; không
có công cụ xác nhận hoặc đổi effort runtime. Không subagent/CMS writes.

**CLEANUP_IMPLEMENTED / ACTUAL_UI_VERIFIED_SCOPED / READY_FOR_USER_ACCEPTANCE.**
Source hoàn tất trước một campaign cuối; chỉ sửa thêm lỗi ảnh bìa được chính
UI campaign phát hiện rồi kiểm lại phần ảnh hưởng như ghi dưới đây.

Các phần đã dọn:

- Exporter giữ title gốc, bỏ `[QA fixture]`; metadata description/OG description
  và OG title lấy nguồn template, có bản dịch hiển thị theo locale.
- `tests/helpers/p7-qa-copy.mjs` đọc nội dung VI/rich text/ngắt dòng từ pinned
  HTML và từng Project/Service từ `content.js`. EN/JA ở
  `p7-template-translations.mjs`, đủ8project/6service riêng; bảo toàn số lượng
  scope và dữ kiện nguồn. Wayfair/Petrosetco/PSD không có scope vẫn giữ trống.
- Hero note/tagline khôi phục br/strong, Hero description giữ nhấn Pinky;
  showreel banner giữ `PINKY LAMB SHOWREEL / 2025`; dialog giữ tên showreel.
  Không sửa baseline/static artwork hoặc thay heading tiếng Anh đã duyệt.
- Project eyebrow/summary/scope/image alts,6Service subtitle/summary/scope và
  body công ty/SEO không còn placeholder QA/mẫu; không bịa kết quả khách hàng.
- Media chỉ đọc đúng baseline pins. Hai alias Hero/credential có source/path
  tường minh; sai identity/MIME/hash hoặc thiếu pin báo lỗi. Bỏ fallback theo
  MIME và fallback mọi image sang Hero. Generated presentation CSS giữ riêng.
- Giữ `qaFixture:true`, HTTP `X-Pinky-Content`, noindex và code chặn fixture
  tại5010/activation. Xóa nhãn trình bày không biến dữ liệu thành publication.

Đợt kiểm cuối và giới hạn:

| Phần | Bằng chứng thực tế |
| --- | --- |
| Source checks | 11test cases renderer/content PASS; lint7source paths PASS. Command chung còn import `p7-release-preparation.test.mjs` nhưng suite bổ sung **NOT_RUN**, bị guard chặn trước test do invocation thiếu demo-project env; process exit1. Không sửa/bypass/rerun harness hoặc gọi đây là toàn suite xanh. `tests.log`, `lint.log` |
| Actual title/metadata | EN/VI/JA title đúng `Pinky Lamb — Creative, Media & Events`; body/alt/metadata không còn các chuỗi QA/sample đã tìm. HTTP3route giữ fixture header/noindex và favicon PNG/hash gốc. `ui/content.json`, `http.json` |
| Native source match | Đọc UI5010 chỉ đọc. 11field VI (Hero/note/art label, Work/Services intro, About, experience copy, IP, Contact, reel label) khớp text; cả6service title/subtitle/summary/scope khớp. Đây là đối chiếu text, không khẳng định pixel parity toàn trang. `ui/native-reference.json`, `ui/content.json` |
| Responsive | 36cases EN/VI/JA ×320/360/361/390/760/761/768/1020/1021/1199/1200/1440px; page=viewport, không clipped heading/control. Không SVG use thiếu definition. `ui/geometry.json` |
| All projects | Mở đủ24dialogs=8projects×3locale; summary/eyebrow/scope/alt/page riêng, không tràn ngang.3Diag mobile390px giữ6scope, dialog354=354, title308=308, không clipping. `ui/projects.json`, `ui/mobile-dialogs.json` |
| Interactions | Header VI→JA, footer JA→EN giữ context/title sạch. Play mở video readyState4, paused=false,currentTime7.243086,error=null; Escape pause, đóng và focus về banner. `ui/interactions.json` |
| Image repair found in UI | Ảnh bìa có attr height620 kế thừa markup gốc, làm cover mobile cao620 thay vì tỷ lệ1.55. Chỉ thêm scoped `height:auto` cho `.case-main-image` trong full-site P7 CSS; không sửa renderer P3/P5, baseline hoặc5010. Actual3locale×2viewport: desktop980×521.273≈1.88; mobile354×228.383≈1.55, ảnh tải, không overflow/clipping. Lint file sửa PASS; chỉ kiểm lại6case dialog, không rerun toàn36matrix hoặc tests không bị ảnh hưởng. `ui/final-cover-geometry.json`, `dialog-css-lint.log` |
| Preservation | Backup43checksum/read-only/archive hash giữ nguyên; HTTP5010 40/40+root,39dist+40Hosting pins và PID15465 giữ nguyên. QA134files khớp HTTP manifest. `preservation-final.json` |
| Final browser | Đã trả viewport gốc: native1874=page1874, root/body overflow visible, title sạch, VI/#services, không dialog mở, console errors0. `ui/final-browser.json` |

Evidence `.local/test-outputs/p7-cleanup-v1-20261017/`. Bản đầu cleanup base giữ
nguyên làm lịch sử. Bản cuối chỉ thêm rule height:auto cho cover; content,
script và geometry trang chính không đổi, nên tái sử dụng evidence còn hợp lệ.
Ảnh `ui/ja-mobile-project.png` là trước sửa620px, không dùng làm ảnh final;
`ui/final-ja-mobile-project.png` là sau sửa. Các ảnh final khác:
`ui/en-desktop-hero.png`, `ui/final-vi-services.png`.

Artifact đang phục vụ4189: `p7-cleanup-v1-20261017-final`, manifest
`bca9a29055c975785408d1102760ee7d596db91c5bb2e0710bfdf9e7395e06c4`.
Không còn blocker cần Khiêm quyết định trong cleanup scope đã kiểm. Đề nghị
Khiêm nghiệm thu bản duyệt này; bản dịch hiển thị chưa là CMS publication,
chưa đóng P7 full acceptance/MULTILINGUAL_LOCAL_COMPLETE hoặc cho activation.

Next: Khiêm rà/nhận P7 cleanup v1 tại4189; mọi import/Publish/activation tiếp
theo vẫn cần phạm vi/quyền riêng.


## P7 cleanup v1 — sửa căn giữa header, 17/10/2026 08:49 VN

User chỉ ra menu P7 sát logo và yêu cầu đối chiếu5010. Routine repair trong
cleanup4189 đang được duyệt; một agent, không import/Publish/activation.

**Verified:** cùng viewport width1874px,5010 có tâm header937px và tâm menu
949.352px (bố cục gốc space-between, lệch hình học12.352px); P7 EN trước sửa
có tâm menu630.563px, lệch trái306.437px. Height viewport khác1034/991px,
header cùng90px; bằng chứng này đối chiếu layout ngang, không pixel parity
nguyên trang. CSS auto margin trước language-picker dồn khoảng trống sau nav.

Sửa `preview/full-site-localization-renderer.mjs`: gom language/CTA/menu vào
`.header-actions`; desktop ba cột, hai cột ngoài bằng nhau giữ nav đúng tâm;
mobile giữ flex và gap tối thiểu8px. `DESIGN.md` D07.1 ghi invariant và tiêu chí
kiểm tâm/control/breakpoint, vì page không overflow vẫn có thể căn sai.

Source xong trước một UI campaign header có giới hạn:27cases EN/VI/JA ×
1440/1200/1199/1021/1020/761/760/390/320px.12desktop cases có sai lệch tâm0px;
control không chồng. Campaign phát hiện nhóm nút320px vượt mép trong header
1.48–6.40px dù chưa tràn viewport. Sửa padding inline language-trigger và gap
header riêng≤360px; chỉ kiểm lại3cases320px: cả3 nằm trong header, gap giữa
nút8px, gap logo/actions tối thiểu9.60px, touch targets≥44×44px.24cases ngoài
320 tái sử dụng proof còn hiệu lực vì media query sửa chỉ≤360px. Không lặp
harness, không chạy full-suite hoặc dùng test xanh thay UI.

Thao tác UI thật: mobile menu mở, Escape đóng và trả focus; language popover
trong viewport320px (x84..290); EN→VI thành công. Trả viewport native1874px,
nav center=header center=937px, page1874px, menu mobile đóng. Header không
đổi nội dung, artwork hoặc template5010.

Lint file sửa PASS; scoped whitespace PASS. Final artifact so với candidate
đầu chỉ3full-site-qa.css đổi,131files còn lại không đổi. Final134HTTP files
khớp manifest. Backup43checksum/read-only/archive hash và HTTP5010 40files+
root,39dist+40Hosting pins, PID15465 giữ nguyên.

Evidence: `.local/test-outputs/p7-header-center-20261017/`; `ui/before.json`,
`ui/header-geometry.json` giữ cả phát hiện ban đầu (không xóa failures),
`ui/compact-final.json` chứng minh sửa320px, `ui/interactions.json`,
`ui/final-header.png`, `scoped-review.json`, `preservation-final.json`.
Final manifestSHA `cea276e421134dde7f9eb0a4dcc52a10e4eddee517ac2de6f5d6e7a1da0376c3`.
Chỉ xác nhận header P7 đã sửa/kiểm UI trong phạm vi này; chưa human acceptance,
chưa full P7 activation/CMS publication.


### Human acceptance — header P7 tại :4189, 17/10/2026

Khiêm xác nhận trực tiếp sau khi xem bản sửa: “đã xem và nghiệm thu.”
Phạm vi lời xác nhận là header vừa bàn giao tại4189, theo next action
“nghiệm thu riêng header”. Trạng thái header: **HUMAN_ACCEPTED**.
Bản được nghiệm thu: `p7-header-center-20261017-final`, manifestSHA
`cea276e421134dde7f9eb0a4dcc52a10e4eddee517ac2de6f5d6e7a1da0376c3`.
Mục này cập nhật trạng thái chưa human acceptance của bản ghi header bên trên.
Không suy rộng thành nghiệm thu toàn P7/MULTILINGUAL_LOCAL_COMPLETE hoặc
quyền import, Publish hay activation5010. Chỉ ghi nhận tài liệu; không chạy
lại UI/tests, thay source ứng dụng, runtime,5010 hoặc backup.
