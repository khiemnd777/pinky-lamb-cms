# Bắt đầu và tiếp tục — Pinky Lamb

Pinky Lamb đã có CMS và chức năng đa ngôn ngữ. [Trạng thái hiện hành và phạm vi đóng plan](tasks/plan.md) ghi **CLOSED_BY_HUMAN_CONFIRMATION** ngày 17/10/2026. Bắt đầu trên dự án hiện có và công việc mới được giao.

## Mở phiên

1. Mở thư mục dự án hiện tại; đọc [AGENTS.md](AGENTS.md).
2. Đọc phần trạng thái hiện hành ở [tasks/plan.md](tasks/plan.md), rồi task/nguồn cần cho yêu cầu hiện tại. Các [index](docs/agent-kit/project-state.md) hỗ trợ tìm nguồn.
3. Dùng [policy](docs/agent-kit/team-policy.md) và [team workflow](docs/agent-kit/team-workflow.md). Chọn đúng skill từ [catalog local](docs/agent-kit/skills-catalog.md); không nạp tất cả tài liệu hoặc lifecycle vendor.
4. Nêu ngắn kết quả/scope/kiểm tra cần thiết. Khi scope có quyền hợp lệ, thực hiện liên tục và sửa routine defects trong scope. Chỉ dừng phần phụ thuộc khi thiếu quyết định material, có lỗi không an toàn, thiếu authority cho hành động thực tế hoặc có human stop.

## Model và runtime

Giữ cấu hình Codex High explorer/reviewer, Medium implementer và Claude inheritance theo [model routing](docs/agent-kit/model-routing.md). Một owner trong phiên chính là mặc định; không bắt tạo thêm Coordinator hoặc chuyển session để chứng minh model. Model/effort không quan sát được là Unknown, không là lý do dừng công việc đã có quyền. Quyết định runtime riêng mới nhất của Khiêm cho task vẫn được giữ; restriction thực tế của runtime vẫn phải tuân thủ.

## Nguồn lịch sử và bảo vệ

Các mô tả NOT_IMPLEMENTED/AWAITING_APPROVAL, ví dụ Approved M1 và task chưa đánh dấu trong snapshot 11/10 thuộc lịch sử. Không trình lại M1, tiếp tục plan P3 đã đóng hoặc chạy kiểm thử cũ chỉ vì thấy các nhãn đó. Đọc hồ sơ cũ khi cần hiểu contract/quyết định/bằng chứng của task hiện tại.

Giữ mã/dữ liệu đang có, baseline/provenance và task/evidence lịch sử. Dùng quyền thực tế cho thao tác local/data/process; Git, global config, publication/deployment cần phạm vi tương ứng. Không mở harness mới để bắt đầu phiên hoặc báo trạng thái. [Prompt tiếp tục](PROMPT-CODEX-GPT-6.1-SOL-HIGH.md) dùng cho cả công việc bảo trì và tính năng mới được giao; prompt không cấp quyền hay cấu hình runtime.
