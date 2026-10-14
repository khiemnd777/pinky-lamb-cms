# M3-RIGHTS-WORKFLOW-REMOVAL-01 — A supersedes media-rights workflow

**Verified:** Khiêm chọn A: bỏ media-rights declaration và bước duyệt rights riêng; giữ kiểm tra file và phân quyền. `SOURCE1` ghi quyết định và handoff trong đúng tài liệu này. Chưa thay active contracts/imports hoặc thực hiện yêu cầu code+QA. Exact C0 source/full freeze và pure admissions vẫn tách khỏi direction approval.

**Current next:** Coordinator/C0 chốt exact revised contract/source plan; C0 sửa common/golden và active references trong scope riêng, Upload/J1 đồng bộ owned adapters, QA kiểm acceptance độc lập. Rights ACK/domain doc không cấp implementation hoặc test slot cho các owners.

## Quyết định và quyền — Verified

Nguồn hiện hành: [Coordinator register](../../approvals/M3-PARALLEL-COORDINATION-01-REGISTER.json).

- Direct human A tại Rights turn `01a1382f-4d26-7a40-a4b9-6f83bc0fd8ad`, ghi trong `M3-NO-RIGHTS-A-DIRECT-HUMAN-CHOICES-01`: “Chọn phương án A: bỏ declaration/sourceRefs, không làm allowlist/loader. Phối hợp Coordinator/C0 chốt full freeze, rồi triển khai và chạy pure tests khi đúng scope được Approved và có slot.”
- Earlier direct code+QA request tại QA turn `01a13824-a477-76a2-955b-52cb4924e6c3`: “Tự phối hợp với Coordinator để bỏ duyệt rights, cập nhật code và QA đồng bộ, giữ kiểm tra file và phân quyền, rồi báo kết quả cho tôi.” Record `M3-RIGHTS-REMOVAL-IMPLEMENTATION-HUMAN-AUTHORITY-01` giữ authority và nghĩa vụ này.
- `M3-NO-RIGHTS-V2-CONTRACT-DIRECTION-01` là Coordinator semantics/design direction theo quyền được Khiêm giao; không là exact contract source freeze.
- `M3-RIGHTS-WORKFLOW-REMOVAL-01-SOURCE1 v1`, status `COORDINATOR_APPROVED_ONE_NEW_DOMAIN_SUPERSESSION_DOC_ONLY`, chỉ cho sole Medium writer tạo file này, UTF-8<=16384B và passive preservation/link checks. Không ghi shared records, old core/tests/docs hoặc thực thi runtime.

Lý do: active media chỉ cần tên, authenticated uploader và technical integrity/custody. Không duy trì một quy trình approval riêng hoặc bắt metadata khai quyền sử dụng làm prerequisite thay thế.

## A thay đổi semantics nào — Verified direction

Loại khỏi active media plan: declaration/basis/evidence, media `sourceRefs`, `rightsEvidenceSubmittedBy`, EV/evidence digest binding; manual reviewer, rights status/revision/proof và rights useability gate. Metadata giữ `{name}`; authenticated actors giữ `{uploaderUid}` do server authorization cung cấp.

Không thêm optional rights substitute, checkbox, attribution prerequisite, empty allowlist, auto `APPROVED` hoặc dummy hash. Private rightsReferenceAllowlist config/loader/tests: **NOT_NEEDED**; không triển khai stale empty-allowlist gate. Không thay thế bằng eligibility evaluator mới hoặc deprecation marker trong old source.

Đây là direction supersession của [historical bounded rights core](M3-PARALLEL-RIGHTS-01.md), không xóa lịch sử hoặc gọi old evidence là kết quả A.

## Active source snapshot — Verified read, chưa retirement

Inspection snapshot của SOURCE1, chỉ bounded source reads/search:

| Nguồn hiện tại | Quan sát |
| --- | --- |
| [media-v3-authority.mjs](../contracts/media-v3-authority.mjs) line9 | Import `validateMediaRightsProof` từ old rights core vẫn tồn tại. |
| [media-v3-authority.test.mjs](../tests/media-v3-authority.test.mjs) line5/32 | Import/consume V3 terminal rights validators vẫn tồn tại. |
| [media-rights-contract.test.mjs](../tests/media-rights-contract.test.mjs) line6 | Namespace import old rights core vẫn tồn tại. |
| [media-rights-policy.test.mjs](../tests/media-rights-policy.test.mjs) line6 | Namespace import old rights core vẫn tồn tại. |
| `cms-api/`, `admin/`, `scripts/` | Exact media-rights/rights-checks search không có matches; exit1 là no matches, không runtime test. |

Actual search command: `rg -n 'media-rights|rights-checks' pinky-lamb-cms/cms-api pinky-lamb-cms/admin pinky-lamb-cms/scripts`.

Current metadata source vẫn gồm name+rights/sourceRefs và actors gồm uploader/evidence submitter. Existing `name` validator dùng well-formed, nonblank, single-line text1–240 UTF-16 units. Snapshot không chứng minh active imports đã retired hoặc existing endpoint đã bị xóa.

C0 là sole writer phải bỏ active references qua exact future revised source plan. Planned `POST /api/cms/media/{id}/rights-checks` bỏ khỏi future API plan; SOURCE1 không claim xóa endpoint hiện hữu.

## Retirement handoff — Proposed exact source work

Old public APIs không còn được dùng bởi active v2 plan: `parseMediaRightsRequest`, `validateMediaRightsProof`, `evaluateMediaRightsDecision`. C0 plan cần retire `mediaRightsProofV3Schema`, `validateTerminalRightsProofV3`, rights state/detail, Snapshot rights `proofPins`+hash và QA `mediaRightsChecks` consumers.

Giữ old core/tests/doc và receipts nguyên bytes tại chỗ. Không sửa chúng thành fake success, không rename bằng deprecation marker, không tạo replacement eligibility evaluator. C0/common/golden revisions cần phiên bản và Approved riêng đúng source ownership; dependent adapters/tests chỉ chạy sau exact freeze/admission.

## Contract alignment đang chờ C0 — Proposed

| Boundary | Target để C0 chốt exact signatures/version/goldens |
| --- | --- |
| Metadata | Strict `{name}`; giữ existing well-formed, nonblank, single-line1–240 UTF-16 validation; không trim/normalization. |
| Actors | Strict `{uploaderUid}` authoritative từ authenticated server actor; không body-owned actor hoặc evidence submitter substitute. |
| Technical binding | Strict sáu fields `assetId`, `kind`, `originalSha256`, `derivativeSetSha256`, `processingRecipeSha256`, `toolSetSha256`; không EV. |
| MD | Proposed `SHA256(UTF8(canonicalJson(validated {name})))`; không newline/actor/request/time/native facts trong projection. |
| U0/J1/READY | Immutable intent, J1 frozen input, ReadyFact và ReadyVersion giữ cùng MD/actor/full processed output binding; không “latest” hoặc site-selected subset. |
| READY private detail | Proposed reduced `{summary,binding,metadata,actors}`, actual serialized UTF-8<=8192B; không rights state/proof. |

Các mục trên là Proposed exact alignment khi C0 freeze còn pending. SOURCE1 không tự chọn capability signatures, custody projection, consumer versions hoặc golden bytes/hashes. MD không xác nhận bytes/custody hoặc factual truth. Common technical authority và full immutable processed output/Storage-cache/quiescence vẫn cần cùng version/attempt, không giả producer evidence từ tên mới.

## Những kiểm soát phải giữ — Verified direction, execution chưa chứng minh

Giữ filename/MIME/size/hash validation, Auth/ACL/authenticated uploader, quota/idempotency/revision/concurrency, technical READY, quiescence, full-output Storage/cache custody và archive. **Q1 technical file-write/quota declaration RETAINED**: đó là kiểm soát ghi file/quota, không phải media-rights declaration bị A loại bỏ.

Giữ factual `SOURCE_CHECKED` và editorial M1/M2 Snapshot/review. READY không là factual approval; bỏ rights không miễn technical integrity hoặc nguồn factual. Không sửa factual-source catalog thành media evidence catalog.

Future public projection/QA artifact phải loại private media metadata/UID, internal custody, original bytes và storage paths. Đây là acceptance boundary cần QA xác minh trong scope mới, không privacy PASS từ source doc hoặc old153 tests.

## Lịch sử giữ nguyên — Verified preservation

Historical bytes/SHA được đối chiếu trước/sau SOURCE1; file cũ không bị supersession doc chỉnh sửa:

| Historical file | Bytes | SHA256 |
| --- | ---: | --- |
| [contracts/media-rights.mjs](../contracts/media-rights.mjs) |12586|`d90c1c27aede2043b24ec1a0d31df6c1a16aba3098547c3b485c5758ef0a21ba`|
| [tests/media-rights-contract.test.mjs](../tests/media-rights-contract.test.mjs) |11965|`c32d78b97169ab332df6df3f3f78a984d4429d0e58d6bffa400185080c8e66e4`|
| [tests/media-rights-policy.test.mjs](../tests/media-rights-policy.test.mjs) |16957|`2bd123d0662ebca5f226fb4b81193913e86e033b3dd1949de341d550b370f7b3`|
| [docs/M3-PARALLEL-RIGHTS-01.md](M3-PARALLEL-RIGHTS-01.md) |60068|`e51e2f715f0de27dc82b503e16aea39f3a339a065646083166cc84b5a6a2f13b`|

Old rights153/153 là bounded source/unit evidence của old workflow. Original RED giữ `LOG_CAP_NOT_ENFORCED`; fault cleanup `NOT_EXERCISED`, OS-wide absence Unknown. Không reinterpret thành A acceptance. Common18/golden1/prior receipts giữ nguyên; SOURCE1 không rewrite/version-reset hoặc chạy lại chúng.

## Ownership, verification và next — Verified / Unknown

Rights sở hữu ACK/domain supersession doc; C0 sở hữu common contracts/goldens/active reference retirement; Upload/J1 sở hữu adapters được giao; QA sở hữu independent acceptance. Coordinator giữ approval/full freeze/scheduling/shared ledger. Không scope đụng writer khác hoặc child delegation.

Observed runtime trước write: native `rollout-2026-10-13T23-08-04-01a13605-6114-7ca1-8687-5e45534d5d8c.jsonl` tại `.codex/sessions/2026/10/13/` của host, line751 current turn `01a1383d-d570-7063-bfcd-1b63b679c991`: `gpt-6.1-sol / medium`. Model route không suy từ TOML/self-report. Preflight target absent kể cả dangling symlink; project root/CMS/docs là directories non-symlink. New doc UTF-8 readback/size/hash và relative-link existence được kiểm passive; final bytes/SHA gửi parent để tránh self-hash.

**NOT_RUN / Unknown:** current v2 pure/runtime/integration/privacy acceptance, exact full freeze, backend/UI/local flow và LOCAL_COMPLETE. Không Node/doc-unit tests/build/HTTP/browser/emulator/native/Git trong SOURCE1; document không cần pure slot. Chỉ report source inventory và preservation, không claim code+QA yêu cầu user hoàn tất.

**Next:** parent High affected-doc review; Coordinator/C0 chốt exact v2 source plan/full freeze rồi các owners triển khai/kiểm theo Approved và slot riêng. SOURCE1 là intermediate handoff của yêu cầu code+QA. TechNote Level1; user chọn next level, silence không approval hoặc understanding.
