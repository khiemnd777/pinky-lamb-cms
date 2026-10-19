# Engineering workflow — Pinky Lamb hiện hành

## Nguồn thực thi

[Team workflow](agent-kit/team-workflow.md) là workflow duy nhất; [policy](agent-kit/team-policy.md) giữ authority/safety. [tasks/plan.md](../tasks/plan.md) ghi trạng thái đóng các kế hoạch hiện hành. Dùng [AGENTS](../AGENTS.md), task hiện tại và [catalog 17 skills](agent-kit/skills-catalog.md); chỉ đọc phần giúp hoàn thành yêu cầu mới.

Một owner thực hiện coherent change với focused checks, review/CI trên kết quả hoàn chỉnh và acceptance tại usable-flow milestone. Routine repairs trong quyền còn hiệu lực không cần plan document, review chain hoặc approval round mới. Reuse evidence còn hợp lệ; tooling failure theo điểm dừng của workflow, không mở harness để tiếp tục chờ.

## Routing đang áp dụng

Giữ Codex gpt-6.1-sol High cho native explorer/reviewer và Medium cho native implementer; Claude giữ model inherit. Phiên chính dùng runtime đang chọn; quyết định riêng mới nhất của Khiêm cho task vẫn có hiệu lực. [Model routing](agent-kit/model-routing.md) là nguồn chi tiết. Không yêu cầu provider identity/effort proof, chuyển worker/session hoặc tạo probes như điều kiện tiếp tục. Không quan sát được thì ghi Unknown. Actual runtime/tool rejection vẫn phải tuân thủ; không bypass permissions.

Không cài plugin/skills, đổi global settings hoặc cấu hình sandbox để bắt đầu công việc. Những ví dụ cấu hình và nguồn upstream bên dưới là tài liệu có ngày, không là active routing, lệnh cài đặt hoặc gate cho phiên mới.

## Tư liệu lịch sử trước đồng bộ entrypoint 17/10/2026

Toàn bộ phần dưới giữ nguyên để truy vết nguồn của gói cũ. Các chỉ dẫn M1, Medium capability-stop, phase routing và setup examples trong phần lịch sử đã được thay thế bởi các nguồn hiện hành ở trên. Chúng không tạo authority, nhiệm vụ hoặc điều kiện chặn mới.

# Engineering workflow — source pin và routing

Snapshot 11/10/2026: tài liệu/workflow được chuẩn bị; **chưa cài plugin, chưa tạo active .codex config và chưa triển khai sản phẩm** tại thời điểm đó. Routing hiện hành bên dưới được sửa theo [AGENT-POLICY-LOOP-001](agent-kit/tasks/AGENT-POLICY-LOOP-001.md); quyền implementation sản phẩm vẫn theo [APPROVAL-PROTOCOL](APPROVAL-PROTOCOL.md) và approval hiện hành.

## Nguồn và nạp skill

Dùng https://github.com/addyosmani/agent-skills.git tại `1be8e34187e34647bb83adc3a1323b26ae6f6abe`. Full tracked snapshot ở `engineering/vendor/agent-skills`: 212 entries, 211 files + symlink `.opencode/skills → ../skills`, MIT LICENSE/README/supporting references nguyên vẹn. [SKILLS-LOCK](../engineering/SKILLS-LOCK.json) ghi file digest, loaded-by evidence và install status. Upstream metadata version **0.6.12**, **25 skills**, commit là source lock.

Nguồn thực thi là [router local](../.agents/skills/using-agent-skills/SKILL.md), [catalog 17 skills](agent-kit/skills-catalog.md) và [effective manifest](agent-kit/skills-manifest-current.json), theo [team policy](agent-kit/team-policy.md). Đọc đúng skill cần cho task; không nạp toàn lifecycle. Vendor/router, `SKILLS-LOCK.json` và các pins cũ ở trên giữ vai trò provenance/lịch sử; không bổ sung gate runtime/full-suite hoặc tự kích hoạt skill chưa có trong catalog. Upstream root AGENTS dành cho phát triển repo upstream. User approval và policy hiện hành ưu tiên trên các ví dụ auto-build/ship. “Available in archive”, “read for provenance” và “discovered in runtime” là các trạng thái khác nhau.

| Phase | Nạp theo việc thực tế | Vai trò |
| --- | --- | --- |
| Spec/plan/research | using-agent-skills, spec-driven-development, planning-and-task-breakdown, context-engineering, source-driven-development; API/security khi cần | High |
| Approved implementation | incremental-implementation, context-engineering; frontend/API theo slice; Git chỉ khi được giao riêng, không tự nạp workflow vendor | Medium |
| Unit test/debug | test-driven-development, debugging-and-error-recovery | Medium; High review |
| Review/audit/QA verdict | code-review-and-quality; security/performance theo rủi ro; browser được phép và có sẵn khi cần chứng minh rendered behavior | High |

Task có inputs/outputs/AC/dependencies/owner; số file thường ≤5 là ước lượng để chia việc, không tự tạo phase/approval/checkpoint. Không nới scope để vừa workflow. Ghi evidence thật; không tự chạy upstream scripts hoặc mutation experiments. Reviewer không sửa code ứng dụng; mutation cần task được phép và bản sao/fixture do implementer sở hữu. Source-driven xác minh phần API/version bị thay đổi hoặc chưa chắc chắn; tái sử dụng tài liệu đúng version còn hợp lệ. Routine repair trong approval còn mở không khởi động lại spec/plan/task approvals.

## Setup tham khảo — chưa chạy

Upstream [Codex setup](https://github.com/addyosmani/agent-skills/blob/1be8e34187e34647bb83adc3a1323b26ae6f6abe/docs/codex-setup.md) nêu CLI ≥0.122. Trước tooling setup có quyền, kiểm CLI/help thực tế; lệnh này chỉ là fenced example, không chạy trong bàn giao:

```bash
codex --version
codex plugin --help
codex plugin marketplace add ./engineering/vendor/agent-skills
codex plugin add agent-skills@agent-skills
```

Sau cài hợp lệ, mở session mới để discovery nhận plugin. Native Codex dùng `@skill-name` như `@spec-driven-development`; không coi `/spec` hoặc `/build` wrappers Claude là native Codex. Đọc source pinned/nạp relevant skills hiện đã được người dùng cho phép. Nếu host có sẵn capability được phép thì dùng trong quyền hiện hành, không hỏi lại chỉ để nạp. Plugin install/config example chưa thực hiện; đánh giá quyền tooling hiện có trước thao tác setup mới, không tự mở rộng scope sản phẩm.

## Routing và cấu hình minh họa

GPT-6.1 Sol High: reasoning/plan/review/audit. Medium: coding/vẽ/generate/unit test. Kiểm requested vs observed runtime; prompt không đổi model. Image tool có runtime riêng; Medium orchestration không chứng minh generator model là GPT-6.1 Sol. Có delegation khi môi trường/yêu cầu hiện hành cho phép; nếu không, chọn role qua worker/session/runtime chuyển được High/Medium thật. Nếu không chọn được Medium thì báo capability gap và làm planning/review độc lập, không âm thầm code ở High hoặc claim đã spawn.

Official custom agent shape: standalone `.codex/agents/*.toml`, cần name/description/developer_instructions; model/effort fields theo docs. **Các ví dụ chỉ nằm trong Markdown, chưa tạo file config và không thay approval/sandbox controls.**

```toml
# Minh họa .codex/agents/pinky-reviewer.toml — CHƯA CÀI
name = "pinky_reviewer"
description = "Reasoning, planning, review and audit for Pinky Lamb"
model = "gpt-6.1-sol"
model_reasoning_effort = "high"
developer_instructions = """
Read current project policy, pinned skill lock, proposal and approval ledger.
Load relevant skills. Review in read/research/design mode; report evidence.
Technical review passed never supplies the user's Approved.
"""
```

```toml
# Minh họa .codex/agents/pinky-worker.toml — CHƯA CÀI
name = "pinky_worker"
description = "Coding, drawing, generation and unit tests for an approved slice"
model = "gpt-6.1-sol"
model_reasoning_effort = "medium"
developer_instructions = """
Verify valid user Approved, exact slice/version, base, paths and environment.
Load pinned phase skills. Write only assigned approved scope, usually <=5 files.
Resume an unfinished same approved slice across sessions when evidence remains valid.
Use only demo-pinky-lamb-cms and loopback emulators; deployment excluded.
After milestone closed or material new scope, require fresh Approved.
"""
```

## Nguồn và giới hạn

High governance reviewer đã đối chiếu 11/10/2026:

- https://learn.chatgpt.com/docs/agent-configuration/subagents
- https://learn.chatgpt.com/docs/config-file/config-sample
- https://github.com/addyosmani/agent-skills/blob/1be8e34187e34647bb83adc3a1323b26ae6f6abe/README.md
- https://github.com/addyosmani/agent-skills/blob/1be8e34187e34647bb83adc3a1323b26ae6f6abe/LICENSE

Review này là evidence tài liệu, chưa xác minh client người nhận, browser QA, test implementation hay deployment. Không có CI/business approval enforcement cứng mới được cài.

## Local tooling boundary

**Phạm vi toàn gói: CMS đầy đủ LOCAL.** Chỉ Firebase demo `demo-pinky-lamb-cms` và emulators loopback; không tài khoản thật, Firebase login, Blaze, billing hoặc IAM làm điều kiện local. Production/deploy ngoài gói; chỉ đề xuất riêng sau khi toàn CMS đạt LOCAL_COMPLETE và người dùng nghiệm thu. M1 là first slice, không phải LOCAL_COMPLETE. M2–M4 phải có đặc tả/task/Approved riêng.
Dependency/docs/JDK/emulator/Playwright downloads sau Approved setup là tooling, không Firebase cloud runtime permission. Root firebase.json historical read-only; config local infra-local riêng.
