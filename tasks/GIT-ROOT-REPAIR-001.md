# GIT-ROOT-REPAIR-001 — Git tại gốc dự án

Ngày thực hiện: 19/10/2026, Asia/Ho_Chi_Minh. Chủ thực hiện: phiên chính.

## Yêu cầu và phạm vi

Khiêm yêu cầu sửa `.git` vì Codex không nhận diện repo. Khi được hỏi chọn gốc Git, Khiêm chọn thư mục dự án `pinky-lamb/` chứa `AGENTS.md`, `Makefile` và `pinky-lamb-cms/`.

Phạm vi: chuyển metadata Git hiện có từ `pinky-lamb-cms/.git/` lên `.git/` tại gốc dự án; bảo toàn lịch sử, cấu hình và thay đổi chưa commit; cập nhật hướng dẫn không còn đúng. Không commit hoặc push.

## Nguyên nhân đã xác minh

Thư mục dự án không có `.git`, trong khi thư mục con `pinky-lamb-cms/` có repository hoạt động. `git rev-parse` tại thư mục dự án báo `not a git repository`; cùng lệnh tại CMS nhận diện thư mục con làm gốc. Hướng dẫn gốc còn mô tả dự án là bản export không có Git metadata.

## Đã thực hiện

- Sao lưu đầy đủ metadata Git trước thay đổi.
- Chuyển `.git/` lên gốc; không di chuyển hoặc thay nội dung file CMS.
- Ánh xạ toàn bộ 554 mục index sang tiền tố `pinky-lamb-cms/`, giữ nguyên mode và blob của từng mục. Vì không tạo commit, 554 lần đổi đường dẫn đang staged; các sửa đổi nội dung trước đó vẫn unstaged.
- Giữ nguyên HEAD `b8b7cfa0ba37d68e1a86084533b37d1b2e40a7ff`, nhánh `main`, toàn bộ refs và nội dung cấu hình Git local.
- Sửa câu mô tả Git trong `AGENTS.md`; giữ nguyên hồ sơ và bằng chứng lịch sử.

Bản sao lưu: `.git/root-repair-backup/20261019T080626Z/`. `original-git.tar` chứa metadata ban đầu, `original-index` chứa index ban đầu, `verification.json` ghi kết quả và hashes kiểm tra. Metadata sao lưu được giữ local trong `.git/`, không đưa vào vùng staged.

## Kiểm chứng

| Kiểm tra | Kết quả |
| --- | --- |
| `git rev-parse --show-toplevel` từ gốc và từ CMS | PASS: cùng trả về gốc dự án đã chọn |
| HEAD, nhánh, toàn bộ refs và cấu hình local trước/sau | PASS: không đổi |
| Index trước/sau | PASS: 554 mục giữ nguyên mode/blob, chỉ thêm tiền tố đường dẫn |
| `git diff --cached --name-status --find-renames=100%` | PASS: đúng 554 lần R100, không thay nội dung staged |
| Diff nội dung unstaged trước/sau, dùng `--relative --binary --no-ext-diff --no-textconv --no-renames` tại CMS | PASS: giống byte; SHA-256 `51ea0d6e84726520135b29c7c17034cf6b769186d0b23a0c8b3ca8dd9f72bc3c` |
| Danh sách file CMS chưa được theo dõi trước/sau tại thời điểm chuyển | PASS: giữ nguyên 27 file |
| Hash/nội dung symlink và mode của các file CMS được theo dõi/chưa được theo dõi tại thời điểm chuyển | PASS: 581 mục được kiểm tra, không đổi |
| `git fsck --connectivity-only --no-dangling` sau chuyển | PASS |
| `git diff --cached --check` | PASS |
| Codex `list_projects` tại đúng đường dẫn dự án | PASS: `isGitRepository: true` |

Đối chiếu bảo toàn nội dung ở bảng trên áp dụng tại thời điểm chuyển metadata. Lần kiểm tra sau đó phát hiện `pinky-lamb-cms/cms-api/local-data-store.mjs` được sửa sau checkpoint, làm diff unstaged thay đổi; tác nhân chưa xác định. Phiên sửa Git không ghi vào file này và giữ nguyên thay đổi mới. 580 mục còn lại trong inventory vẫn khớp checkpoint khi kiểm tra. Phần staged được kiểm tra lại vẫn chỉ gồm 554 lần R100; HEAD không đổi.

Tự kiểm tra tuần tự trong phiên chính; không có reviewer độc lập. Không chạy ứng dụng, không can thiệp dịch vụ hoặc dữ liệu runtime. Codex đã nhận diện project là Git repository qua công cụ quản lý project; chưa quan sát trực tiếp tab Changes trong giao diện.

## Bước tiếp theo

Kiểm tra tab Changes tại project gốc trong Codex. File ngoài CMS hiện chưa được theo dõi; cần rà phạm vi trước khi đưa vào commit. Khi Khiêm yêu cầu commit, kiểm tra riêng 554 lần đổi đường dẫn và các thay đổi nội dung cần giao; push cần yêu cầu tương ứng.
