# Ranh giới local

Gói v3 chỉ triển khai và nghiệm thu CMS local. Deployment production, Blaze, billing, cloud IAM/provisioning và cloud release automation nằm ngoài gói; không có lệnh deploy để chạy từ handoff này.

Chỉ sau khi toàn CMS đạt **LOCAL_COMPLETE** và người dùng nghiệm thu local, agent mới đưa ra đề xuất production riêng nếu người dùng muốn. Nghiệm thu local không tự cấp quyền deploy.

`firebase.json` ở root là historical read-only baseline, giữ byte-identical để bảo toàn source export; không dùng nó làm config emulator. Local implementation được duyệt dùng `infra-local/firebase.json` trong isolated root, với `demo-pinky-lamb-cms` và loopback.
