# Approval protocol — Pinky Lamb hiện hành

## Nguồn trạng thái và authority

[tasks/plan.md](../tasks/plan.md) ghi lời xác nhận và phạm vi các plan CMS/UI/recovery/đa ngôn ngữ đã đóng ngày 17/10/2026. Không tự mở lại từ proposal, register, checkbox hoặc nhãn chờ duyệt cũ. Trạng thái đóng do human xác nhận giữ riêng với bằng chứng kỹ thuật và release; không viết lại PASS/FAIL/NOT_RUN hay cờ LOCAL_COMPLETE.

Công việc mới bắt đầu từ yêu cầu và quyền hiện tại của human, theo [team policy](agent-kit/team-policy.md) và [workflow duy nhất](agent-kit/team-workflow.md). Đề xuất/material choices được trình khi cần trước dependent execution. Approval hợp lệ bao gồm routine implementation, focused checks và repairs trong scope; không xin lại từng file, bug, function hoặc phase. Không đòi trình lại M1 hay một proposal Closed chỉ để xử lý task mới.

Pause phần bị ảnh hưởng khi thiếu material decision/expanded authority, có dependency sai hoặc không an toàn, hoặc hành động cần release/real-data authority chưa được cấp. Luôn tuân human stop; tiếp tục phần độc lập có quyền. Kết thúc task cũ không cấp quyền vô hạn cho task mới, và approval của task mới không biến kế hoạch lịch sử thành việc phải triển khai lại.

## Các loại quyết định được giữ riêng

| Quyết định | Phạm vi |
| --- | --- |
| Engineering/task authority | Thay đổi source/checks/repairs trong outcome, scope và boundaries được giao |
| Editorial approval | Review immutable snapshot/hash theo ACL/domain rules của CMS; không cấp quyền sửa mã hay bỏ self-review guard |
| Human closure/acceptance | Quyết định hoàn tất hoặc nghiệm thu đúng phạm vi người dùng xác nhận; không tự tạo thêm bằng chứng runtime |
| Release/real-data operation | Git, publication/deploy, migration/retained-data/process/global operations cần authority tương ứng; local checks hoặc closure không tự cấp quyền |

Quyền tools/runtime không thay business approval; không đổi sandbox/approval policy để vượt giới hạn. Giữ baseline/dữ liệu/nghiệp vụ và lịch sử quyết định. Chỉ ghi nguồn human thực tế, không biến ví dụ hoặc reviewer PASS thành lời Approved.

## Protocol và ví dụ lịch sử của gói 11/10/2026

Phần dưới giữ nguyên như tư liệu lịch sử. Các trạng thái chưa triển khai/chờ M1, lifecycle và yêu cầu fresh approval theo milestone trong bản cũ không là workflow/gate cho các plan đã đóng hoặc routine work của task hiện tại. Authority hiện hành theo các mục trên.

# Approved protocol — Pinky Lamb local

Ngày 11/10/2026. User cho phép chuẩn bị/sửa handoff/spec/plan/docs/review và nạp pinned engineering skills. Scope clarification local-only chưa Approved implementation. **CMS-001 v2 AWAITING_APPROVAL; CMS NOT_IMPLEMENTED.** Markdown/ledger là policy/evidence, chưa cài hard CI gate.

## Ba quyết định độc lập trong gói

| Quyết định | Ý nghĩa | Không tự kéo theo |
|---|---|---|
| Engineering Approved | Implement exact local slice/version/environment/paths/tasks/AC còn mở | M2+, variant/schema mới, nghiệm thu toàn CMS |
| Editorial approval | Reviewer duyệt immutable snapshot/hash theo ACL đã implemented | Quyền viết code, tự gán role hoặc bỏ self-review guard |
| Local acceptance | User nghiệm thu toàn CMS sau LOCAL_COMPLETE kỹ thuật và evidence | Deployment |

[CMS-001 v2](CMS-PROPOSAL-CMS-001-v2.md), [scope](../approvals/CMS-001-v2.scope.json) và [register](../approvals/APPROVAL-REGISTER.json) là bundle xin duyệt M1. Agent freeze actual digests sau document review; không tự ghi approval. Source provenance không được giả là HEAD mới; inspect actual worktree/base trước implementation.

```text
Approved CMS-001 v2 — M1 local/emulators
```

**Đây chỉ là ví dụ, chỉ có hiệu lực khi user tự gửi lời duyệt rõ cho bundle này.** User không cần gõ SHA dài; agent ghi digest/version đã trình cùng nguyên lời/reference/người/thời gian thật. “Hướng này ổn”, scope discussion hoặc High review passed không là implementation approval.

## Vòng đời và resume

Draft → Awaiting approval → Approved → In progress → Review-ready → Closed. Rejected/Withdrawn/Superseded không mở lại bằng approval cũ. Chưa có Approved thì đọc/research/spec/plan/doc/review và WAIT trước code/config/infra/install/runtime tests có writes.

Approved M1 cho phép code/tests/fix cần để đạt exact AC trong slice còn mở, gồm approved local dependency/tooling setup; không cần hỏi lại từng fix đúng scope. Session/compaction không hủy Approved còn hiệu lực; resume unfinished slice nếu evidence/base/scope đúng. Base change có ảnh hưởng cần review/revise; material new scope/outside allowlist phải có revised proposal/Approved trước phần mới.

Sau milestone Closed, mọi implementation mới cần fresh Approved, kể cả fix nhỏ. Discussion CMS mới chỉ cho cập nhật tài liệu, không tự cấp quyền code. M2–M4 phải có detailed spec/tasks/paths/AC và Approved riêng; M1 không bao M2+.

Không dùng shell permission thay business approval, không đổi approval_policy/sandbox. Giữ lịch sử superseded decisions, không biến feedback thành consent. Production boundary ở [Ranh giới local](DEPLOYMENT.md).
