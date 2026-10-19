# Pinky Lamb

## Trạng thái và nguồn hiện hành

Các kế hoạch CMS M1–M4, UI/recovery và đa ngôn ngữ P0–P7 trong [bảng trạng thái hiện hành](tasks/plan.md#trạng-thái-hiện-hành--đã-hoàn-tất-theo-xác-nhận-của-khiêm) đã được Khiêm xác nhận hoàn tất ngày 17/10/2026: **CLOSED_BY_HUMAN_CONFIRMATION**. Hồ sơ đó giữ nguyên nguồn xác nhận, phạm vi đóng và các giới hạn bằng chứng.

Các snapshot chưa triển khai/chờ duyệt của gói 11/10 là lịch sử. Không dùng chúng để lập lại M1, mở lại P3 hoặc yêu cầu nghiệm thu lại các plan đã đóng. Công việc tiếp theo bắt đầu từ yêu cầu hiện tại của Khiêm.

## Tiếp tục công việc

1. Đọc [AGENTS](AGENTS.md) và phần trạng thái hiện hành trong [tasks/plan.md](tasks/plan.md).
2. Làm theo [team policy](docs/agent-kit/team-policy.md) và [workflow duy nhất](docs/agent-kit/team-workflow.md). Đọc đúng task, mã nguồn và skill liên quan đến yêu cầu mới.
3. Giữ các quyết định nghiệp vụ, dữ liệu, thiết kế và công việc đã triển khai. Quyền đã duyệt bao gồm routine fixes/checks trong đúng scope; không xin lại theo file, bug hoặc phase.
4. Dùng [START-HERE](START-HERE.md) hoặc [prompt tiếp tục](PROMPT-CODEX-GPT-6.1-SOL-HIGH.md) khi mở phiên khác. Claude dùng cùng instructions qua `CLAUDE.md`.

## Bản đồ tài liệu

| Nguồn | Vai trò |
| --- | --- |
| [tasks/plan.md](tasks/plan.md) | Nguồn trạng thái đóng các plan CMS/UI/recovery/đa ngôn ngữ, có lời xác nhận trực tiếp |
| [Project state](docs/agent-kit/project-state.md), [context](docs/agent-kit/project-context.md), [plan index](docs/agent-kit/project-plan.md) | Index dẫn tới nguồn hiện hành và lịch sử; không tạo tracker hay authority mới |
| [Approval protocol](docs/APPROVAL-PROTOCOL.md) | Quyền cho công việc hiện tại; phân biệt engineering, editorial và nghiệm thu |
| [Engineering guide](docs/ENGINEERING-WORKFLOW.md), [model routing](docs/agent-kit/model-routing.md) | Đường dẫn workflow/skills hiện hành và cấu hình model đã giữ |
| [DESIGN](DESIGN.md), [asset catalog](docs/ASSET-CATALOG.md), [gallery](ASSET-INDEX.html) | Thiết kế và nguồn tài nguyên |
| [QA selection](docs/QA-AND-DOD.md) | Chọn kiểm tra cho phần thực sự bị tác động; không là yêu cầu chạy lại toàn dự án |
| [Snapshot trạng thái cũ](docs/PROJECT-STATE.md), [proposal CMS ban đầu](docs/CMS-PROPOSAL-CMS-001-v2.md) | Bối cảnh và bằng chứng có ngày; không là lệnh triển khai lại |

## Ranh giới vận hành

Giữ local/demo/loopback và các ranh giới dữ liệu hiện hành trong AGENTS và task được giao. `dist/`, references, root Firebase config, vendor/locks và gói handoff/checksums cũ giữ vai trò nguồn/baseline lịch sử. Không cài lại môi trường, seed/reset/import, khởi động/dừng dịch vụ, Git hoặc deploy như tác dụng phụ của việc đọc hướng dẫn.

Đóng hồ sơ theo xác nhận người dùng không tạo thêm kết quả test, cờ kỹ thuật hoặc bằng chứng release/Production. Các PASS/FAIL/NOT_RUN và giới hạn lịch sử giữ nguyên. Chỉ kiểm lại khi yêu cầu mới thực sự tác động đến tiêu chí đó.
