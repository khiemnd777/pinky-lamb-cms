# Thiết kế thumbnail CMS v1 — mockup tĩnh

Đây là **bố cục đề xuất**, không phải ảnh chụp CMS đang chạy. Mockup không đổi dữ liệu, route, quyền hoặc trạng thái xuất bản của CMS.

| Màn hình | PNG desktop | PNG mobile | HTML responsive |
| --- | --- | --- | --- |
| Thư viện media | [media-desktop.png](media-desktop.png) | [media-mobile.png](media-mobile.png) | [media.html](media.html) |
| Dự án | [projects-desktop.png](projects-desktop.png) | [projects-mobile.png](projects-mobile.png) | [projects.html](projects.html) |
| Khách hàng | [clients-desktop.png](clients-desktop.png) | [clients-mobile.png](clients-mobile.png) | [clients.html](clients.html) |

PNG desktop rộng 1440 px. PNG mobile rộng 390 px và thể hiện toàn trang đề xuất. [overview.png](overview.png) tập hợp cả sáu ảnh. Ba file HTML dùng chung [style.css](style.css), với breakpoint 1050 và 700 px. Nút, ô nhập và nhãn trạng thái chỉ minh họa phần nhìn.

Ảnh và font Montserrat lấy từ `pinky-lamb-cms/public-baseline/assets/`; mockup tham chiếu các file này mà không sao chép hoặc sửa ảnh gốc. Tám media, tám dự án và năm logo là mẫu từ baseline local. Ảnh chụp lấp đầy khung thumbnail; khi triển khai, người dùng cần mở ảnh đầy đủ qua luồng xem trước có phân quyền. Logo dùng `contain` và không bị cắt.

Các file PNG được vẽ trực tiếp từ tài nguyên local bằng [render_png.py](render_png.py) với Python và Pillow có sẵn trong workspace. HTML responsive là nguồn thiết kế nhưng chưa được render bằng trình duyệt trong phiên này: chính sách trình duyệt chặn URL `file://`, còn Chrome headless thoát trước khi mở trang. Chưa kiểm tra CMS đang chạy hoặc luồng tải lên/lưu trữ. PNG và HTML có thể khác nhau ở chi tiết hiển thị.

Điểm cần đánh giá: nhận diện ảnh nhanh, tên tệp dài, trạng thái bản dịch, logo không bị cắt và thứ tự đọc trên mobile. Triển khai ứng dụng cần phê duyệt riêng và so sánh trong trình duyệt ở viewport tương ứng.
