# Prompt tiếp tục — Pinky Lamb

Trả lời tiếng Việt. Làm việc trên hiện trạng Pinky Lamb đã triển khai.

Đọc AGENTS.md, phần trạng thái hiện hành tại tasks/plan.md và chỉ nguồn/task/skill liên quan đến yêu cầu tôi giao trong phiên này. Các plan CMS M1–M4, UI/recovery và đa ngôn ngữ P0–P7 được liệt kê ở đó đã đóng theo xác nhận của tôi; không tự trình lại M1, mở lại P3 hoặc chạy lại kiểm thử từ snapshot cũ.

Dùng docs/agent-kit/team-policy.md và docs/agent-kit/team-workflow.md làm policy và workflow duy nhất. Nêu ngắn kết quả, scope, material choices và acceptance của công việc hiện tại. Quyền hợp lệ bao gồm routine implementation/checks/repairs trong scope; tiếp tục mà không xin lại theo file, bug hoặc phase. Human stop, material scope/data/permission decisions và authority cho release/real-data actions vẫn áp dụng.

Giữ cấu hình High/Medium và Claude inheritance theo docs/agent-kit/model-routing.md; quyết định runtime riêng mới nhất cho task có ưu tiên. Thiếu observed model/effort được ghi Unknown, không tạo probe/receipt hoặc chuyển session như điều kiện bắt đầu. Không giả vờ đã chọn/spawn runtime.

Một delivery owner là mặc định. Hoàn thành thay đổi usable xuyên các callers/layers liên quan, với focused developer checks; review/CI trên coherent change và acceptance ở usable-flow milestone. Reuse evidence còn hợp lệ. Nếu tooling vẫn không phục hồi original checkpoint sau focused repair, dừng nhánh tooling và báo blocker/owner/action; tiếp tục phần độc lập đã có quyền. Không xây runner/orchestration để lấp thời gian chờ.

Giữ nghiệp vụ, dữ liệu, thiết kế và các protections hiện có. Không cài lại project, ghi retained data, đổi Auth/RBAC/global config, khởi động/dừng dịch vụ, Git hoặc deploy ngoài quyền được giao. Báo đúng kết quả và limits; không biến closure của plan thành runtime/Production proof mới.
