# CMS-001 v2 — QA M2 local/emulators

**Verified: M2 REVIEW_READY / technical PASS ngày11/10/2026.** M1 đã được người dùng Accepted/CLOSED. M2 chưa có lời nghiệm thu; milestone còn mở, toàn CMS chưa LOCAL_COMPLETE. Authority là direct human Approved M2 bundle revision1, không phải review APPROVED của synthetic Snapshot. [Proposal frozen](CMS-001-v2-M2-PROPOSAL.md), [plan frozen](../tasks/M2-plan.md), [active register](../../approvals/CMS-001-v2-M2-REGISTER.json), [runbook](LOCAL-RUNBOOK.md).

High giữ planning/audit/review; Medium thật viết code và chạy tests. Reviewer High độc lập đã kiểm checkpointsA–H và task18. Task19 chốt đúng5 docs/ledger, không đổi app. Không install/upgrade/lock drift/login/cloud/deploy; chỉ `demo-pinky-lamb-cms` và loopback.

## Lượt cuối thực tế — task18

Các lệnh npm chạy từ isolated root bằng Node22.23.3/npm10.9.9/JDK24.0.1. Thời gian dưới đây UTC; elapsed là npm process, không phải tổng TAP nếu hai số khác nhau.

| Lệnh | UTC bắt đầu | Elapsed | Kết quả |
|---|---|---|---|
| `npm run lint` |14:42:05.611|1.515s|exit0, trước delta test |
| `npm run test:unit` |14:42:13.486|15.466s|153/153 PASS,0skip |
| `npm run test:emulators` |14:42:42.994|234.420s|121/121 PASS,0skip |
| `npm run build:admin` |14:46:44.552|1.053s|exit0 |
| `npm run test:e2e:local`, lần đầu |14:46:52.562|408.850s|130PASS/1FAIL/0skip, giữ evidence |
| `npm run lint`, sau sửa oracle |15:06:22.560|1.508s|exit0 |
| `npm run test:e2e:local`, cuối |15:06:43.809|413.196s|131/131 PASS,0skip |

Unit/integration/build PASS dưới E2E test f66; app không đổi. Lượt lint/browser cuối dưới test b873. Không nói unit/integration/build đã rerun sau b873. Delta chỉ thay immediate `paused===true` bằng bounded `expect.poll` cho cùng điều kiện, không tăng timeout hoặc giảm assertion. Native dialog close handler chạy sau lúc dialog.open thànhfalse;5 read-only cycles xác nhận pause+restore sau4.2–7.4ms. Lần browser đầu và diagnostic giữ nguyên, không đổi source reel để làm test xanh.

[Final task18 index](../.local/cache/m2/task18-evidence-index.json), SHA256 `4443ac3a93529a2ad832c0976747e25759366522a8404e80db2bff10f9f89de1`: **1171 pins** root và High độc lập khớp SHA/bytes; reviewer kiểm thêm577 archive copies. Index chứa exact command/time/log hash và output paths. [Final browser log](../.local/cache/m2/task18-browser-final.log) SHA `9be491a8d9e4402aaff5ffdbd11505a89e42b478637ec943b58f4366ce6f8e10`.

10 browser suites gồm9full-workflow,17records,19sections,15settings,18source-workflow,11login,17Hero,9M1,4privacy,12public interaction. **17622 response chính +549 artifact response** ghi riêng; không outbound/page/route/unexpected-console errors. Có7 console errors login denial dự kiến, không gọi tổng console bằng0. Private HTTP22×403;32 private-value checks,24 resolver-private cases,6 synthetic-secret cases PASS. Không đọc hoặc tạo secret thật.

## Requirements → implementation → evidence

PASS dưới đây là tiêu chí kỹ thuật trong môi trường local đã duyệt. Không thay human factual/rights decision, milestone acceptance hoặc production verification.

| AC | Hành vi và oracle đã kiểm | Evidence chính |
|---|---|---|
|01|Demo/loopback/exact runner/no credential discovery; frozen baseline/vendor và readonly copies giữ nguyên|00/00b/16/18 + final19 preservation audit |
|02|Explicit OWNER import6services/8cases/5visible logos; report/lineage pin; CURRENT M1 Hero/SEO giữ lại|02 mapping literal oracle;03 real importer/retry/CAS/concurrent |
|03|`home`/v1 Snapshot/review/receipt/replay/hash riêng, không mutate để đọcv2|03/06/16/17 + final18 M1 suites |
|04|Strict versions/unknown keys/caps/IDs/refs/order/URLs/server fields; corrupt persisted fail closed|01a/01b/04/06/16/17 contract/abuse/hash suites |
|05|All listed sections Save/reopen; stable ADD/archive/order/reference updates atomic per patch|11–15 protected actual UI;17 full workflow/max/hidden |
|06|CAS race/conflict giữ dirty; lost response samekey; truthful partial Save|04 real transactions;11–15 error/receipt/intent UI;18 |
|07|Roles/inactive/unknown/unverified/direct SDK denied; OWNER self-check/self-review denied|03–07/15/16;330 direct SDK denials,128 API responses task16 |
|08|NEW/CHANGED kể cả hidden cần exact Snapshot SOURCE_CHECKED; immutable/pinned attestations; creative declaration|05a/05b/07/15/17 actual source/reviewer/terminal workflow |
|09|All hidden/fixed media traversal và canonical full-content hash; public projection loại private fields|06/08/10 +17 independent literal manifest/hash/privacy oracles |
|10|Saved Draft vs fixed Snapshot; later edit/selection/logout/late parsed responses không leak private state|11/15/17 authenticated preview/races |
|11|JS-off metadata/một H1/all visible services/cases; text/attribute/JSON XSS encoded|08/10/17 actual served artifacts and independent HTML oracle |
|12|JS-on nav/filter/count/load-more/case/gallery/keyboard/reel/mailto/copy dùng CMS data|09/10/17/18; native Escape eventual oracle corrected |
|13|Exact5-key APPROVED QA envelope; proof/version/bytes/ownership/path fail closed; unpublished artifact|10/15/17 actual downloads, offline export and served tree |
|14|320/390/768/1024/1440, keyboard/focus/labels/errors/maximum/hidden, Contact fit/deep forms|12–17 captures/DOM; root High visual audit và scoped renderer08 repair |
|15|Fresh M1+M2 gates, truthful audit/residuals, scope/source preservation/docs/High review|18 fresh logs/index;19 final audit/register/QA/runbook |

[Execution review](M2-REVIEW.md) giữ từng task/checkpoint/finding và superseding evidence. Không cộng kết quả từng task thành một số tests mới; số153/121/131 là lượt final thực tế.

## Full workflow, artifact và visual proof

Task17/H index SHA `023203535c7ff405e8e82e09b886ef8080117eb38c0e916e1b59eff13fd116bf`:1180 historical pins/470archive copies,15unit+9browserPASS; old E2E f66 pin đã được lưu exact trước b873 và đối chiếu relocation. Root kiểm3 canonical QA envelopes và3 artifact trees, mỗi tree40manifest/41physical files. Một workflow ghi29source groups; APPROVED QA chỉ pin6required proofs, không phải tất cả29checks. Maximum và all-hidden namespace dùng real default Auth/Firestore service factories, không phải canonical public HTTP bridge. Canonical UI/Save/source/review vẫn có actual protected HTTP evidence riêng.

Authenticated normal CMS có captures tại5widths, decision/proof/deep Contact; fixed PRIVATE child390/1440 dùng native outer pan. Auxiliary capture chỉ đổi parent để nhìn toàn child, giữ srcdoc/styles/sandbox; không dùng auxiliary làm bằng chứng normal parent layout. Maximum PRIVATE literal script-free harness là QA riêng, không phải CMS private JSON endpoint. Root đã xem normal và qualified auxiliary/public JS-off/on captures; Contact mascot fit được sửa trong một renderer file, desktop nav max-copy có native scroll. Artwork/template/baseline không đổi.

Các extra public top contexts được kiểm không localStorage/sessionStorage/IndexedDB/CacheStorage/cookies. Không gộp authenticated CMS vào claim empty storage; opaque PRIVATE child không được enumerate storage riêng.

## Preservation, cleanup và scope

Final task18 bảo toàn nội dung hai canonical Draft và membership chính xác. **3184 preexisting nonDraft docs** trước lượt đầu và **3908** trước browser rerun không thiếu/không đổi hash. Test tạo thêm immutable history; revision metadata tăng qua supported CAS (`home`159,`home-v2`778 tại audit), không xóa history. Namespace fixture sở hữu được phục hồi/ẩn; identity task16 sở hữu inactive/disabled. Final owned4173 đóng/ECONNREFUSED. Vite5173 và Hosting5010HTTP200; anonymous đúng Functions `us-central1/cmsApi`401 tại15:13:58.577Z. Đây là observation thời điểm đó, không đảm bảo runtime sống sau restart.

[Task19 final audit](../.local/cache/m2/task19-final-audit.json) pin109source union (52M1 +57newM2),34unaffected M1 exact,3frozen planning files,93baseline,18frozen root docs,212vendor entries,40readonly public copies,package lock và exact M1 acceptance-ledger delta. Three frozen planning docs làm actual isolated source count112, không unexpected source. Không có `.git`; không invent commit/head hoặc push. Baseline/root handoff cũ vẫn là historical snapshot; active isolated docs/register mới ghi trạng thái.

Task19 chỉ sửa4isolated docs và M2register; exact pre-documentation bytes được giữ tại `.local/cache/m2/task19-docs-pre-handoff/index.json`. Final audit không hash ledger chính nó để tránh hash cycle; active register pin auditSHA. Production/rootfirebase/artwork/fonts/source-content/vendor đều giữ nguyên.

## Dependency audit và giới hạn còn lại

Fresh `npm audit --json --ignore-scripts` chạy **2026-10-11T14:54:24.188Z–14:54:25.632Z**, exit1 vì advisories: **0Critical/3High/2Moderate/5total**. [Audit JSON](../.local/cache/m2/task18-audit.json) SHA `0c3b7aabf544ee39573dbb8316d544d4b7a17705bafc0f2e379f2813ccf378fa`. JSON trùng bytes lịch sử M1 nhưng command/registry query mới được ghi, không copy audit cũ để gọi fresh.

| Đường dependency đã pin | Residual và reachability review |
|---|---|
|firebase-tools→chokidar→braces|3High gồm aggregate; GHSA-vfj7-8cjw-p6xm liên quan deeply nested patterns. Guard dùng fixed paths/exact selectors; CMS typed text không được đưa thành watch glob. Điều này giảm untrusted-input surface, không chứng minh advisory unreachable. |
|firebase-tools→@google-cloud/pubsub→@opentelemetry/core|2Moderate; GHSA-8988-4f7v-96qf liên quan W3C Baggage allocation. M2 không cấu hình PubSub/telemetry/Baggage pipeline. Đây là source reachability review, không phải runtime proof exploit không thể xảy ra. |

Public renderer/export dùng fixed pure projection/bytes, không Firebase SDK/API fetch. Không dependencyfix/upgrade/`audit fix --force`; remaining advisories chưa clean và cần scoped decision riêng nếu xử lý dependencies.

- Functions emulator normalize duplicate Authorization thành credential đầu. Direct raw authorizer trả401; wire Publisher-first không nâng thành OWNER, PATCH403no-write. Không claim wire duplicate luôn401.
- Auth emulator sau fresh signin có thể cho old refresh token thừa hưởng new auth_time. Pre-reauth old token/refresh401 rồi fresh signin200 đã kiểm; không claim production-provider parity.
- Chromium automated desktop/mobile-width và keyboard đã kiểm. Safari/iOS/physical devices, native OS email và physical clipboard: **NOT_RUN**. Encoded recipient/body/copy fallback dùng browser intercept/controlled fixtures.
- SOURCE_CHECKED/creative declaration là hành động reviewer, chưa xác minh factual truth/rights; không có human editorial approval từ test. Sole PDF/video catalog: alternate identity **NOT_RUN**.
- Task11 có historical generated-byte gap: old M1 screenshots/runtime,5 workflow JSON, Snapshot-review desktop/mobile và09cleanup không được copy hết trước overwrite. Logs/indices/immutable fixture/source/history còn; current rerun không phục dựng missing original bytes. Synthetic M1 note hồi phục từ prior immutable Snapshot, không có capturedpre-task equality. Generated console task11 **NOT_CAPTURED**.
- Task18prearchive còn thiếu4 old fixed M2privacy00b JSON trước browser đầu. Bốn JSON current từ lần đầu được lưu trước rerun, không suy chúng là original historical bytes. Fresh final privacy PASS chứng minh current behavior riêng.
- Export atomic từng file, không transaction toàn directory; Node fence không OS/Java egress fence. M3upload/quarantine/derivatives và M4publication/currentpointer/history/rollback/fullbackup-restore chưa có.

**Bước tiếp theo:** người dùng review/Accepted M2 riêng nếu đạt yêu cầu. M3/M4 cần plan và Approved riêng; `cms_complete:false`, `local_acceptance:null`, `milestone_closed:false`, `milestone_acceptance:null` vẫn giữ. Không lập hoặc triển khai production trong gói này.
