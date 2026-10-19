# MULTILINGUAL-001 — P3 Project representative v1

## Trạng thái hiện hành — đã hoàn tất theo xác nhận của Khiêm

**ĐÃ HOÀN TẤT / CLOSED_BY_HUMAN_CONFIRMATION — 17/10/2026 (Asia/Ho_Chi_Minh).** Xem [xác nhận trực tiếp, phạm vi đóng và bảng trạng thái hiện hành](../../tasks/plan.md). Khiêm xác nhận các plan đã xong và giao chỉ đồng bộ tài liệu, không sửa code hoặc chạy lại kiểm thử.

Các trạng thái chờ duyệt/chưa hoàn tất, checkbox và bước tiếp theo trong phần bên dưới thuộc lịch sử trước xác nhận đóng; không tự mở lại plan/task từ các ghi nhận đó. Giữ nguyên bằng chứng PASS/FAIL/NOT_RUN, cờ kỹ thuật và giới hạn đã ghi nhận. Lần đồng bộ này không xác minh runtime, không ghi nhận release hoặc cấp quyền thực thi mới.

## Nội dung lịch sử trước xác nhận đóng


Ngày 16/10/2026. **BUNDLE_PROPOSED / IMPLEMENTATION_NOT_APPROVED**. Bản duyệt kế hoạch P3–P7 cho phép chuẩn bị tài liệu/HTML; không phải quyền sửa ứng dụng. [Canonical WBS](../tasks/MULTILINGUAL-001-v2.md), [template lock](MULTILINGUAL-001-P7-TEMPLATE-v1.md), [exact paths/source pins](../../approvals/MULTILINGUAL-001-P3-REP-v1.scope.json).

## 1. Kết quả và phạm vi trình duyệt

Một lát cắt Project xuyên suốt: danh sách bản ghi thật → chọn đối tượng/ngôn ngữ → biên tập và lưu bản nháp riêng → đọc lại receipt → saved preview theo đúng card/chi tiết Project template → QA local ba locale. CMS giữ tiếng Việt. D3-PROJECT là UI đề nghị; các màn D3-SERVICE/D4-GROUPS/D5-REVIEW đi kèm để duyệt trước thiết kế, chưa được triển khai bởi bundle này.

List lấy tối đa24 shared Project thật; locale summaries tối đa72. Không tạo bản dịch chỉ do GET. Trong UI có thể chọn bất kỳ Project hiện hữu để đọc; kiểm thử retained chỉ ghi đúng `wayfair × en|vi|ja`. Nếu Home v3 không có ID `wayfair`, dừng phần ghi và báo thiếu prerequisite; không chọn ID khác, không seed/reimport để vượt qua. Không thêm Project, sửa shared facts/assets/order/visibility hoặc bản dịch đối tượng khác.

Giữ bảng/entity dialog hiện hữu theo D3, nguồn chung chỉ đọc, một `Lưu bản Anh/Việt/Nhật` trong đúng context. Mount localized workspace trực tiếp tại nhóm Dự án; không dùng scratch→apply→Lưu website của dialog shared cũ làm thao tác localized. Ngoài context Project, tất cả nhóm/shared workflows cũ giữ nguyên. Không thêm link quay về source editor cũ trong workspace. Không có submit/review/publish, Service, Work section editor, full-site assembly, import hoặc activation :5010 trong lát cắt này.

## 2. UI và hành vi cụ thể

- Bảng: Project/tên nguồn, category và shared visibility tách biệt ba trạng thái bản dịch. Chọn một ô locale mở đúng ID/locale. Filter/search chỉ trên tập tối đa24 records; không gọi từng locale để tải toàn bộ copy cho badges.
- Workspace: một locale active; title, eyebrow, summary, scope và alt theo slot ảnh. Source/read-only shared nằm trong đối chiếu, không thành một form thứ hai. Preview hiển thị **bản đã lưu**, không tự đổi khi đang nhập.
- Loading/missing/read-only/error/conflict/source changed/unknown commit có thông báo và hành động riêng. Không fallback tiếng Anh, không dựng fake saved preview khi chưa có bản.
- Đổi locale/entity/nhóm, mở media/review và đóng dialog đều qua một transition controller. Dirty: ở lại/bỏ thay đổi/lưu rồi chuyển. Nếu save thất bại thì giữ chữ và context cũ. Pending/unknown commit giữ intent/key/payload, khóa thao tác gây intent mới; readback/retry cùng key, không tự overwrite bản khác.
- Session change/logout: hủy requests, xóa private preview/URLs, trả budget, ngừng hiển thị nội dung riêng. Không sửa cơ chế Auth/logout hiện hành; thêm cleanup của Project vào lifecycle đang có.
- Desktop form/source/saved preview và mobile edit/saved panels theo mockup. Không thêm per-run block editor, revision IDs hay nút QA kỹ thuật vào hành trình chính. Metadata/QA là phần thứ cấp. Role điều khiển mockup không đưa vào sản phẩm.

## 3. Contract API/storage và bảo toàn dữ liệu

| Route mới, không query/trailing slash/encoded aliases | Method | Quyền và output |
| --- | --- | --- |
| `/api/cms/localizations/projects/status` | GET | MEMBER_READ; bounded ≤24 IDs ×3 locale metadata; no private actor/source documents |
| `/api/cms/localizations/projects/{projectId}/{en|vi|ja}` | GET | MEMBER_READ; typed current source/shared context + nullable saved draft; no writes |
| same entity/locale path | PUT | DRAFT_SAVE = EDITOR/OWNER, kiểm trong transaction; strict body + Idempotency-Key |
| same entity/locale path + `/qa` | GET | MEMBER_READ; saved identity + minimal validated public projection/resources; missing/stale refuses |

Stable ID grammar `^[a-z0-9]+(?:-[a-z0-9]+)*$`, tối đa100; unknown entity/locale/method bị từ chối. Preserve host/origin/method/body-size/timeout/redirect/logout rules. Server route và `admin/auth.mjs` allowlist phải khớp exact bốn patterns; không nới thành generic arbitrary localizations. `cms-api/index.mjs` tiếp tục MEMBER_READ đầu vào; service PUT tự authorize DRAFT_SAVE trước và ngay trước write. Không sửa Auth/ACL, account/member/version rules hoặc Firebase rules.

`content={title,eyebrow,summary,scope,imageAlts}` strict; title/eyebrow≤120 UTF-16 code units; summary≤1000 multiline; scope≤12 entries ×160; alt≤300, slot `cover` và `gallery:<assetId>`; shared decorative ảnh buộc alt rỗng. Gallery identity dựa assetId vì shared schema cấm trùng cover/gallery. Không nhận caption chưa có schema, shared fields hoặc extra keys. Envelope≤64KiB; integer revision có trần hiện hành; malicious HTML được render thành text, không HTML tùy ý.

PUT body gồm `contractRevision:1`, `expectedRevision:null|integer`, `expectedDependencyHash`, `content`; Idempotency-Key dùng schema hiện hành. Digest có version và canonical JSON, gồm Project source copy, factual claim bindings và source revisions/hash liên quan; shared id/slug/client/year/category/relations/credential page + selected cover/gallery/focal/decorative + media derivative generation/hash, PDF identity khi được dùng, template identity. Không đưa toàn bộ Home revision, Hero, Project khác hoặc media không dùng vào điều kiện stale. Home trusted reader vẫn kiểm integrity; projection chọn đúng resource trước media validation. Sửa unrelated group không làm Project stale; đổi facts/media của Project phải chặn save/QA cho tới explicit P5 rebase. Không tự nâng base/hash.

Storage mới: `cmsLocalizedProjectDrafts/home-v3--<projectId>--<locale>` và `cmsLocalizedProjectOperations/ml001-p3-<sha256(actorUid,key)>`. Transaction đọc authorization/current context/prior operation/draft trước ghi; CAS cho phép một winner; create/set đúng một draft + create một operation/audit receipt atomically. Same key+payload trả receipt cũ kể cả source đổi sau commit; key khác payload/entity/locale bị từ chối. Operation chứa audit actor/time/request hash và safe receipt; private actor/source catalog không lọt GET/QA/export. Không ghi `cmsDrafts/home-v3`, Hero sidecars, M3 snapshots/reviews hoặc collections cũ.

## 4. Renderer, tài nguyên và QA

New pure Project renderer lấy markup/classes từ pinned `dist/app.js:projectCard/openProject` + native `#case-dialog` ở index và stylesheet baseline; không tái sử dụng `<details>` Project của `site-sections.mjs`. Card category là localized enum label; modal eyebrow là localized copy. Title/summary/scope/alt phải khớp đúng saved record; shared client/year/media/PDF không đổi. No truncation/font shrink/layout swap. Một Project preview phải có cover, full text, đúng gallery order, PDF page và CTA vị trí template; QA interaction close/Escape/focus return/gallery dùng script đóng gói riêng vì `dist/app.js` toàn trang cần các sections khác. CTA `case-contact` giữ vị trí/label; representative kiểm phát đúng stable serviceId/contact intent và đóng dialog. Không dựng Contact giả trong component artifact. Chọn interest, focus và cuộn tới Contact/Brief thật là full-site integration thuộc P4/P7, bắt buộc kiểm khi consumer đó có thật; component proof không được gọi là parity toàn luồng CTA.

Private preview: iframe `sandbox=""`, scripts/connect/form/object/default none, pinned baseline styles/fonts từ origin5010, ảnh nhận qua verified length/MIME/SHA và data URI; không thêm origin/scheme vào parent CSP. Tái dùng shared binary budget/session cleanup API, không copy Hero's max9-resource envelope cho gallery. New QA envelope giới hạn32 unique resources, mỗi image≤12MiB, aggregate export bytes≤256MiB. Private logical charge `R+B+2H+32768≤64MiB`, giữ reservation đến teardown. Nếu vượt cap phải báo lỗi rõ, không bỏ gallery/giảm ảnh/chữ âm thầm. Không sửa Hero resource/CSP contract hoặc media helper global.

QA export là task-owned exclusive directory, manifest version/hash/path/size/MIME, EN root + VI/JA subpaths cho representative. Chỉ public data, noindex; đóng gói stylesheet/fonts/assets/QA script; validate references/slot cardinality before render; no API/runtime translation. QA server cho phép đúng manifest, loopback4188, không serve repo root/private exports/symlinks/hardlinks/traversal, không overwrite run cũ. QA này là **Project component representative**, không full website/P2 shell hoặc bản phát hành P7. Export không tự bật server hay :5010.

## 5. Patch/tasks và exact files

Không tạo checklist execution thứ hai. Bundle hoàn tất `P3-01a/b`, và thực thi phần Project của `P3-01c`, `P3-02a/b/c`, `P3-03a/b/c` trong canonical WBS. Shared contracts được version riêng Project để Service không bị mở quyền ngầm. Ownership một implementer/slice; root sở hữu ledger/docs; reviewer không sửa ứng dụng.

| Patch trong representative | Files mới/sửa; exact before hashes trong scope JSON | AC liên kết |
| --- | --- | --- |
| R1 typed identity | NEW `contracts/project-localization.mjs`, `project-localization-records.mjs`; contract/context tests | REP01/02/03 |
| R2 trusted context/transaction | NEW `cms-api/project-localization-context.mjs`, `project-localizations.mjs`; EDIT `cms-api/routes.mjs`, `admin/auth.mjs`; API/routes tests | REP02/03/04 |
| R3 template projection/preview | NEW `preview/project-localization-renderer.mjs`, `admin/project-localization-preview.mjs`; renderer/preview tests | REP05/06 |
| R4 workspace/callers | NEW `admin/project-localization-editor.mjs`, `.css`; EDIT `admin/site-media-editor.mjs`, `site-fields.mjs`, `cms-shell.mjs`; editor/browser tests | REP01/07/08/09 |
| R5 scoped export/runner | NEW `scripts/export-project-localization-local.mjs`, `multilingual-p3-project-local.mjs`; EDIT `scripts/local-guard.mjs`; export/runner tests | REP06/10/11/12 |

10 exact new tests: `tests/project-localization-{contract,context,api,routes,editor,preview,renderer,export,runner}.test.mjs` và `tests/project-localization-ui.local.test.mjs`. Existing Hero modules/tests, shared collection/editor modules, baseline, Vite/config, package/lock, all instructions remain read-only. No dependency install/upgrade. Scope JSON lists all26 application/test paths and read-only dependency hashes; unforeseen material control/source changes require concrete delta before code, routine fixes within these paths do not.

## 6. Runtime và ngân sách ghi dữ liệu sau khi bundle được Approved

Current preparation: **application writes0; retained writes0; Auth access0; no emulator lifecycle**. Future implementation permission under this bundle:

- Only Firebase demo `demo-pinky-lamb-cms`, existing loopback Auth9099/Firestore8080/Functions5001/Hosting5010/Storage9199; CMS Vite5173. Do not start/restart/seed/reset/import/clean other emulators or change infra/root config. Readiness checks fail closed on wrong project/process/origin.
- Source/static/unit tests first. One **Vite-only restart if backend ESM cache is stale**, after verifying exact5173 process/workdir/command, before authenticated UAT. No broad kill/port kill; retain command/log and confirm new runtime loads routes. Existing in-memory Auth may need normal re-login once if Vite restart replaces application session; reuse valid session where possible. Never read/copy credentials/tokens from another tab or retain them in evidence. Source/service/renderer freshness is checked before asking login.
- Unit/API contract tests use owned in-memory fixtures0 retained writes; source context tests dependency injection prove projection cases, not actual Firestore semantics. Live OWNER sessions through normal demo Auth exercise actual Firestore CAS/readback/retry. Use an existing suitable session first. Two tabs only if needed for real race; one login setup after runtime stable. No new accounts/roles/members, no user account changes.
- Before first retained PUT, capture private before-images only for `wayfair × en|vi|ja`, version/content hash and source dependency/resource identity; list expected IDs. Counts/live versions are unknown until this read. If before-image cannot be validated, stop writes, continue independent checks. Keep backups private, never public server root.
- **At most12 successful retained commits**, each exactly1 draft document write +1 operation/audit document create = **≤24 Firestore document writes**; ≤12 new immutable operation records. Across exactly3 draft IDs. Planned:3 initial/save checks +3 locale updates +1 concurrent winner +1 response-loss save +≤3 restore commits =≤11; one contingency commit within the same scenarios. Retries/denials/CAS losers must add0 successful commits. Stop before ceiling, record unused budget; do not rerun writes just to obtain fresh screenshots.
- Existing drafts: restore exact content/old dependency only if still compatible, with **new revision and audit**, never rollback history. If concurrent external edit exists, stop restore and preserve report; don't overwrite. Initially absent drafts: at most3 new unpublished QA drafts remain, containing source-based candidate translations; explicitly list them in receipt. Do not delete/create fake old history to pretend zero delta. These are not P6 retained import or human-accepted translations. No writes to other entity/locale/base. No raw secrets in outputs.
- New exclusive private outputs under `.local/test-outputs/multilingual-001/p3-rep-v1/<run-id>/`, `.local/exports/multilingual-001/p3-rep-v1/<run-id>/`, cache under `.local/cache/multilingual-001/p3-rep-v1/`; export public subdirectory contains only manifest-approved files. Loopback QA4188 only; stop owned process at end unless handoff asks to keep it. Do not modify/delete historical outputs.

Other roles: unit/route tests cover actual authorization policy through controlled fixtures; current human only has OWNER. If no suitable EDITOR/REVIEWER/PUBLISHER sessions exist, their real-browser proofs remain NOT_RUN and are carried to P5 role bundle; no account creation workaround. This limitation must be explicit in handoff. Anonymous actual request negative test needs no account; no saving via bearer extraction from user sessions.

## 7. Acceptance criteria và bằng chứng bắt buộc

| ID | Tiêu chí observable | Proof cần đạt trước mở rộng Project consumers |
| --- | --- | --- |
| REP01 | Đúng D3-PROJECT desktop/mobile; list→đúng ID/locale; một save; source/shared readonly; global actions không lẫn localized context | Paired rendered1440/390, bổ sung768/320, source pins và UI interactions |
| REP02 | Strict schema/IDs/limits; decorative alt; image slots không theo index; no HTML/shared field injection | Unit + actual invalid HTTP where no write expected |
| REP03 | Resource dependency digest: unrelated Home edits không stale; related copy/fact/media/relation đổi chặn; no automatic rebase | Context fixtures + identity comparison; không sửa retained Home để tạo case |
| REP04 | Atomic CAS/idempotency/auth checks: same-key replay once; cross-payload/entity/locale denied; response loss retains intent | Unit + real OWNER transaction/race/retry/readback; role proof limits recorded |
| REP05 | Card/modal markup, hierarchy, font/spacing/crop/controls đúng frozen template; full saved text/gallery mapping, EN/VI/JA | Template/app same-data screenshot pairs + semantic assertions; Japanese/long valid copy, no clipping |
| REP06 | Private preview saved identity, scripts0/sandbox/CSP; resources hash/MIME/budget; session cleanup; QA script/assets public-only | Preview/security/resource tamper/budget tests; browser inert versus interactive QA distinction |
| REP07 | Save one locale không đổi other locale/shared/base/history; source corrupt/missing stops | Before/after record hashes + expected audit receipts/write count |
| REP08 | Dirty/failed/CAS/unknown save giữ input+intent; navigation/cancel/save-switch; loading/read-only/missing/source drift đúng | Browser main states, error injection scoped to owned test flow; no repeated retained runs |
| REP09 | Vite fresh code; real Auth session; logout/session change releases preview and memory ownership | Fresh runtime route identity, actual OWNER core flow; unavailable session scenarios NOT_RUN |
| REP10 | Export deterministic3locale safe closure; paths/bytes/MIME/traversal/tamper/overwrite blocked; no fallback | Export/runner tests + HTTP4188 manifest comparison |
| REP11 | Lint/syntax/build/scoped tests; P1/P2 and nonProject caller behavior preserved | Exact commands/logs, affected regression tests; classify existing failures |
| REP12 | Protected baseline/config/media/history and external data unchanged; budget≤12 commits, restored existing content/new IDs listed; root representative review before expansion | Final diff/pins/receipt and canonical task state; human UI/language acceptance separate |

After source complete, proposed new runner commands (not yet implemented): from `pinky-lamb-cms`, pinned Node `.local/cache/node/node-v22.23.3-darwin-arm64/bin/node scripts/local-guard.mjs multilingual-p3-project --mode unit|api|browser|export|build --run-id <exclusive-id>`; export additionally requires explicit task-owned bundle input. Runner cannot auto-seed, auto-login, start/restart emulators, or default to all tests. Build uses the new scoped runner in `--mode build`, with an exclusive task-owned output under the run directory; it must not clean or replace `admin-dist`. Existing Vite config and global build defaults remain read-only. Log actual command/results; a command specified here is not evidence it passed.

## 8. Quyết định cần duyệt

Design bundle D3-PROJECT/D3-SERVICE/D4-GROUPS/D5-REVIEW is presented separately from runtime completion. To open this **Project-only implementation**, exact approval phrase: **`Approved MULTILINGUAL-001 D3-D5 design v1 và P3-REP v1`**. This approves the bounded source/runtime/write budget above, not P3 Service, P4/P5 implementation, P6 import, P7 activation, P1/P2 closure, M3/M4 or LOCAL_COMPLETE. The same approval records D3-SERVICE/D4-GROUPS/D5-REVIEW as design references only; their engineering scopes remain unopened. Service subtitle is an explicit proposed content mapping for its existing secondary template line, not a second language field.
