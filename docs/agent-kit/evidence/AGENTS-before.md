# Pinky Lamb — chỉ dẫn dự án v3 LOCAL

## Trạng thái và quyền hiện tại

Bản bàn giao 11/10/2026 chỉ chuẩn bị tài liệu; website tĩnh 10/10 được giữ nguyên. **Snapshot 11/10/2026: CMS NOT_IMPLEMENTED; CMS-001 v2 AWAITING_APPROVAL.** Không có quyền triển khai sản phẩm từ prompt hoặc kế hoạch cũ. Trả lời tiếng Việt.

Bắt đầu bằng inspect/read/report và đối chiếu approval hiện hành: đọc chỉ dẫn workspace, tài liệu theo thứ tự dưới đây, kiểm tra trạng thái thực tế, báo phạm vi/đề xuất. **WAIT nếu chưa có Approved hợp lệ; nếu cùng slice đã Approved còn mở và evidence/base/scope đúng, resume slice đó.** Chỉ triển khai khi người dùng ghi Approved cho đúng proposal/version/milestone. Mỗi thay đổi mới sau khi milestone đóng cần Approved mới. Quyền M1 không bao M2–M4.

## Thứ tự đọc

1. [START-HERE](START-HERE.md), [PROJECT-STATE](docs/PROJECT-STATE.md).
2. [APPROVAL-PROTOCOL](docs/APPROVAL-PROTOCOL.md), [ENGINEERING-WORKFLOW](docs/ENGINEERING-WORKFLOW.md), [SKILLS-LOCK](engineering/SKILLS-LOCK.json).
3. Đọc `engineering/vendor/agent-skills/skills/using-agent-skills/SKILL.md`; nạp skill liên quan theo workflow, không nạp toàn repo cùng lúc.
4. [CMS-001 v2](docs/CMS-PROPOSAL-CMS-001-v2.md), [plan](tasks/plan.md), [todo](tasks/todo.md), [QA](docs/QA-AND-DOD.md).
5. [DESIGN](DESIGN.md), [IMPLEMENTATION-PLAN](docs/IMPLEMENTATION-PLAN.md); đọc đúng source/reference khi cần.

## Routing và ranh giới

GPT-6.1 Sol **High**: reasoning, lập kế hoạch, review, audit. **Medium**: coding, vẽ, generate, unit test. Kiểm tra lựa chọn runtime thật; file này không đổi model. Không có delegation thì chuyển role tuần tự bằng worker/session/runtime có thể chọn effort thật. Không âm thầm code ở High; nếu không chọn được Medium, báo capability gap và hoàn thành planning/review độc lập.

Dùng task nhỏ, thường không quá 5 file; một chủ ghi mỗi file. User approval ưu tiên hơn hướng dẫn workflow upstream. Không tự cài skill, chạy script upstream, kích hoạt `.codex`/plugin, đổi approval policy hoặc sandbox. Vendor là snapshot tham khảo có README/LICENSE/references nguyên vẹn, chưa cài vào runtime.

Baseline dùng HTML/CSS/vanilla JS; `dist/` là static source/public baseline read-only. Form brief chỉ mailto/copy, chưa có backend nhận lead. Không hứa tính năng chưa có. Giữ artwork/logo, source provenance và dữ kiện có căn cứ; không thêm scope case, testimonial, kết quả hoặc claim thiếu nguồn.

**Phạm vi toàn gói: CMS đầy đủ LOCAL.** Chỉ Firebase demo `demo-pinky-lamb-cms` và emulators loopback; không tài khoản thật, Firebase login, Blaze, billing hoặc IAM làm điều kiện local. Production/deploy ngoài gói; chỉ đề xuất riêng sau khi toàn CMS đạt LOCAL_COMPLETE và người dùng nghiệm thu. M1 là first slice, không phải LOCAL_COMPLETE. M2–M4 phải có đặc tả/task/Approved riêng.

Báo bằng chứng kiểm thử thực tế, phần chưa chạy và trạng thái local/emulator/cloud/production chính xác. Không đọc/xuất credentials, không đổi quyền để vượt giới hạn môi trường.

Root `firebase.json` historical read-only; local dùng `infra-local/` riêng. Không cần Firebase login/account thật để làm local. Dependency/docs/JDK/emulator/Playwright downloads sau Approved setup.
