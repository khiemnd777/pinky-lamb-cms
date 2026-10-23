# Chuẩn bị triển khai Firebase — Pinky Lamb

Ngày đối chiếu nguồn: 20/10/2026. Trạng thái: **tài liệu chuẩn bị; chưa có tài khoản, billing, Firebase project, bản build phát hành hoặc deployment nào được xác minh trong nhiệm vụ này**. Người sở hữu tài khoản và phát hành thực hiện các bước có ghi rõ bên dưới sau khi duyệt phạm vi phát hành. Tài liệu này không cấp quyền deploy.

## 1. Chọn phạm vi trước khi tạo tài nguyên

| Phạm vi | Hiện trạng đã kiểm tra trong repo | Điều kiện trước khi phát hành |
| --- | --- | --- |
| Website tĩnh lịch sử | `firebase.json` ở root chỉ mô tả Hosting site `pinky-lamb`, thư mục `dist`. Đây là nguồn baseline được bảo vệ theo `docs/DEPLOYMENT.md`. | Xác nhận đúng artifact tĩnh, nội dung, quyền xuất bản, domain/site ID và người phát hành. Không sửa hoặc dùng lại baseline chỉ để thử CLI. |
| Website do CMS xuất bản | Website CMS hiện chạy local ở `:4189`; CMS/Admin/API và dữ liệu vẫn thuộc `pinky-lamb-cms/` local/emulators. | Thiết kế riêng pipeline tạo artifact Hosting từ bản publish đã duyệt, lưu revision/locale/media, kiểm tra URL và rollback. Chưa có cấu hình cloud tương ứng được xác minh. |
| CMS/Admin/API trên cloud | `pinky-lamb-cms/infra-local/firebase.json` là cấu hình emulator `demo-pinky-lamb-cms`, loopback và `public-baseline`; script/build có guard local và dữ liệu durable local. | Thiết kế, bảo mật, dữ liệu, Auth, Storage, Functions/runtime, backup, quan sát và migration cloud riêng. Không deploy trực tiếp cấu hình `infra-local`. Cloud Functions cần Blaze. |

**Quyết định còn thiếu:** bản phát hành đầu tiên là website tĩnh hay toàn bộ luồng CMS? Chọn Firebase project ID, Hosting site ID, domain, người sở hữu billing, ngân sách chấp nhận được, nơi lưu dữ liệu và kế hoạch phục hồi. Các giá trị này không được suy ra từ `demo-pinky-lamb-cms` hoặc site ID lịch sử.

## 2. Đăng ký tài khoản và tạo Firebase project

1. Người sở hữu dùng Google Account do tổ chức quản lý để đăng nhập [Firebase console](https://console.firebase.google.com/). Nếu chưa có Google Account, tạo tại trang đăng ký Google theo hướng dẫn trên màn hình; bật xác minh nhiều bước và đặt ít nhất một quản trị viên dự phòng của tổ chức. Không chia sẻ mật khẩu hoặc mã xác minh trong repo/chat.
2. Trong Firebase console, chọn **Add project** hoặc thêm Firebase vào Google Cloud project đã có. Đặt tên và chọn **project ID** cẩn thận; đối chiếu với tổ chức và môi trường dự kiến. Tùy chọn Analytics chỉ bật khi có nhu cầu và quyết định về dữ liệu đo lường. Xem [hướng dẫn tạo project và đăng ký web app](https://firebase.google.com/docs/web/setup).
3. Vào **Build → Hosting**, tạo hoặc chọn đúng Hosting site và ghi nhận **site ID**. Từ 15/10/2026, Firebase không tự tạo default Hosting site cho project mới; không giả định site đã tồn tại. Xem [default Hosting site](https://firebase.google.com/docs/hosting/default-site) và [multi-site targets](https://firebase.google.com/docs/hosting/multisites).
4. Phân quyền project và billing theo nhiệm vụ. Chỉ người phát hành cần quyền deploy; người quản lý thanh toán cần quyền billing. Kiểm tra project ID và site ID hiển thị trong console trước mọi lệnh có tác dụng ghi.

## 3. Gói dịch vụ và cách thanh toán

- **Hosting tĩnh:** đánh giá gói Spark trước, theo hạn mức/giá hiện hành. Không gắn billing chỉ vì tài liệu này. Xem [Firebase pricing](https://firebase.google.com/pricing) và [pricing plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans).
- **Cloud Functions:** dự án phải ở **Blaze**. Nâng cấp Blaze trong Firebase console sẽ liên kết project với **Google Cloud Billing account**; đây là tính phí theo mức dùng, không phải giá cố định hằng tháng. Các dịch vụ Google Cloud khác trong cùng project cũng có thể phát sinh phí. Xem [Firebase pricing plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans) và [Cloud Functions](https://firebase.google.com/docs/functions).
- **Tạo billing account:** người có quyền vào [Manage billing accounts](https://console.cloud.google.com/billing), chọn **Create account**, đặt tên, chọn quốc gia/đơn vị nếu được hỏi, chọn hoặc tạo Google payments profile, nhập thông tin thuế/thanh toán theo giao diện, rồi xác nhận **Submit and enable billing**. Quốc gia quyết định tiền tệ và phương thức thanh toán; theo Google, không thể đổi quốc gia của billing account sau khi tạo. Xem [hướng dẫn chính thức](https://cloud.google.com/billing/docs/how-to/create-billing-account).
- **Phương thức thanh toán:** tại **Cloud Billing → Payment method**, chọn đúng billing account và thêm thẻ/phương thức được hỗ trợ tại quốc gia đã chọn. Self-serve billing cần một phương thức hợp lệ dù chu kỳ có số dư 0. Không ghi số thẻ, CVV, địa chỉ thanh toán hoặc ảnh chụp hóa đơn vào repo/chat. Xem [quản lý phương thức thanh toán](https://cloud.google.com/billing/docs/how-to/payment-methods).
- **Liên kết và kiểm tra:** trong Firebase console, chọn project → **Settings → Usage and billing** → nâng cấp/chọn Blaze nếu phạm vi đã duyệt cần Functions. Xác nhận đúng billing account, project và chủ tài khoản trước khi bấm xác nhận. Kiểm tra lại trạng thái gói và billing link trong cả Firebase và Google Cloud console.
- **Theo dõi chi phí:** tạo budget theo **project** và **all services**, mức tiền do người sở hữu ngân sách quyết định; gửi cảnh báo cho người chịu trách nhiệm. Budget loại **alerts-only không giới hạn chi tiêu và không tự dừng dịch vụ**. Nếu cần chặn chi phí, xem điều kiện áp dụng và ảnh hưởng gián đoạn của spend cap cho dịch vụ đủ điều kiện. Xem [Firebase budget alerts](https://firebase.google.com/docs/projects/billing/budget-alerts) và [Google Cloud budgets](https://cloud.google.com/billing/docs/how-to/budgets).

## 4. Trình tự phát hành sau khi đã duyệt

1. Chốt phạm vi, project/site IDs, tài nguyên tính phí, quyền, domain, nguồn dữ liệu, bản build, tiêu chí nghiệm thu và kế hoạch phục hồi. Chụp lại trạng thái artifact/config đã kiểm, không dùng `dist` lịch sử làm bản build mới nếu chưa xác nhận nguồn của nó.
2. Chuẩn bị cấu hình phát hành tách khỏi `infra-local`, giữ các file baseline được bảo vệ. Với nhiều Hosting sites, khai báo target tường minh. Không dùng lệnh `firebase deploy` không giới hạn vì CLI có thể triển khai mọi dịch vụ được cấu hình; xem [CLI deploy scopes](https://firebase.google.com/docs/cli).
3. Kiểm tra artifact và Hosting config tại local. Nếu dùng preview channel, nhớ rằng URL preview **công khai** và có thể gọi backend thật; không dùng preview như môi trường giả lập dữ liệu. Xem [preview và deploy](https://firebase.google.com/docs/hosting/test-preview-deploy).
4. Người phát hành kiểm tra lại project/site đích, sau đó phát hành đúng **Hosting target** hoặc tập dịch vụ đã duyệt. Ghi revision, thời điểm, actor, URL và release ID. Kiểm tra trang, asset, locale, link, domain/TLS và luồng chính trên URL thật. Chỉ báo Released sau khi có bằng chứng vận hành.
5. Nếu lỗi, dùng release history/rollback của Hosting cho website tĩnh khi phù hợp. Rollback Hosting không tự khôi phục Firestore, Storage, Auth hoặc dữ liệu CMS; mỗi phần cần kế hoạch phục hồi riêng. Xem [quản lý Hosting releases](https://firebase.google.com/docs/hosting/manage-hosting-resources).

## 5. Trạng thái và hành động tiếp theo

**Verified:** repo có Hosting root lịch sử và cấu hình CMS local/emulators tách biệt; tài liệu hiện hành không có cloud release đã được chấp thuận. **Proposed:** chốt website tĩnh trước nếu mục tiêu chỉ là public website; lập thiết kế cloud riêng nếu cần CMS online. **Unknown:** tài khoản/project/billing/domain thực tế, ngân sách, artifact phát hành và nghiệm thu Production.

Người sở hữu sản phẩm chọn phạm vi phát hành và tài khoản sở hữu. Kỹ thuật sau đó chuẩn bị cấu hình phát hành, kiểm tra artifact và kế hoạch rollback để duyệt trước thao tác cloud có phí hoặc deploy.
