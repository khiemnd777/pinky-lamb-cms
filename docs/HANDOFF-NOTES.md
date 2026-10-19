# Phạm vi và lineage — handoff v3 LOCAL

Ngày 11/10/2026. Baseline xuất 10/10 từ commit `739fbe1752fdda64e328f4b46cecd292059b05b1`, package root `pinky-lamb/`. Toàn bộ `dist/`, `references/`, `firebase.json`, `source-content.json`, `FONT-NOTICES.txt` và asset manifest giữ byte nguyên vẹn. Production/CLI/Spark/HTTP evidence là lịch sử 10/10, không phải hậu kiểm mới.


GPT-6.1 Sol High làm reasoning/plan/review/audit; Medium làm coding/draw/generate/unittest. Tên prompt HIGH giữ vì nhận diện, không chứng minh cấu hình runtime. [APPROVAL-PROTOCOL](APPROVAL-PROTOCOL.md) quản lý quyền; các ví dụ config là docs, chưa cài.

## Snapshot engineering

Source: https://github.com/addyosmani/agent-skills.git tại commit `1be8e34187e34647bb83adc3a1323b26ae6f6abe`. Full tracked snapshot ở `engineering/vendor/agent-skills`, gồm LICENSE/README và supporting references, không Git history. [SKILLS-LOCK](../engineering/SKILLS-LOCK.json) ghi inventory/loaded skills; snapshot chưa được cài hoặc kích hoạt runtime. Không sửa upstream SKILL files.

Tracked symlink `.opencode/skills → ../skills` được giữ nguyên bên trong vendor và chỉ resolve nội bộ. ZIP giữ Unix symlink metadata; giải nén bằng công cụ hỗ trợ khi cần giữ topology. Trên hệ thống không hỗ trợ symlink, đọc trực tiếp `engineering/vendor/agent-skills/skills/`; không dùng link này để kích hoạt config.

SHA256SUMS chỉ regular files, loại chính nó và symlink. Type/target/hash symlink ghi trong manifest và lock; ZIP kiểm riêng mọi entry. `sha256sum -c SHA256SUMS` hoặc `shasum -a 256 -c SHA256SUMS` kiểm payload regular files. Portable project doc/gallery links được kiểm riêng; vendor repo-specific links giữ nguyên upstream.

## Nguồn tài nguyên

Drive nguồn người dùng: https://drive.google.com/drive/folders/1JOINBjiM8DsXvqddNYNko5LiMySc5UWz. Credential 2026 local và mapping ở [ASSET-CATALOG](ASSET-CATALOG.md). Main Logo Drive bản master riêng chưa tìm thấy trong bộ nguồn 10/10; không gọi badge trích PDF là logo master. Giữ các giới hạn claim/source-content, không tái dùng URL Facebook CDN hết hạn làm runtime asset.

**Phạm vi toàn gói: CMS đầy đủ LOCAL.** Chỉ Firebase demo `demo-pinky-lamb-cms` và emulators loopback; không tài khoản thật, Firebase login, Blaze, billing hoặc IAM làm điều kiện local. Production/deploy ngoài gói; chỉ đề xuất riêng sau khi toàn CMS đạt LOCAL_COMPLETE và người dùng nghiệm thu. M1 là first slice, không phải LOCAL_COMPLETE. M2–M4 phải có đặc tả/task/Approved riêng.
Scope clarification không là implementation approval. Không CMS tests hoặc local runtime được chạy trong handoff preparation; final technical review và integrity được ghi trong HANDOFF-REVIEW/manifest.
