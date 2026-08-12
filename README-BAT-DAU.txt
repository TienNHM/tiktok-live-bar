TIKTOK LIVE BAR - FULL SOURCE, GIẤY PHÉP MIT

Nội dung gói:
- UnityProject: toàn bộ source Unity, scene, script và asset của game.
- TikTokBridge: Node.js bridge, TikTok/TikFinity, Control và Master Rules.
- DJ_MUSIC: thả file MP3, WAV hoặc OGG của bạn vào đây.
- DJ_VIDEO: thả video MP4 hoặc ảnh PNG/JPG của bạn vào đây.
- LiveAssets: các ảnh hướng dẫn có thể đặt trong TikTok LIVE Studio.

Yêu cầu:
- Unity 6000.x (Unity 6) hoặc bản tương thích.
- Node.js 20 trở lên.
- TikFinity nếu sử dụng LIVE_PROVIDER=tikfinity.

Chạy nhanh trên Windows:
1. Nhấn đúp run.bat.
2. Launcher tự kiểm tra Node.js, cài thư viện nếu thiếu, mở Bridge, Game và Control Panel.
3. Nếu cổng 3000 đang bị chiếm, đóng đúng chương trình được báo rồi chạy lại.
   Launcher không tự tắt chương trình khác để tránh mất dữ liệu.

Chạy Node Bridge thủ công:
1. Mở PowerShell tại thư mục TikTokBridge.
2. Chạy: npm ci
3. Chạy: npm start
4. Mở: http://127.0.0.1:3000/control.html

Mở source Unity:
1. Mở Unity Hub.
2. Add project from disk và chọn thư mục UnityProject.
3. Mở scene trong Assets/Scenes.
4. Build Windows theo nhu cầu.

Bản source này không có khóa máy, không khóa TikTok, không cần kích hoạt.
Người dùng có thể tự thêm hệ thống license, đổi tên, sửa code và build sản phẩm.

Lưu ý:
- Thư mục DJ_MUSIC không kèm bài nhạc thương mại. Hãy tự thêm nhạc có bản quyền.
- Tài nguyên bên thứ ba vẫn phải tuân theo điều khoản của nhà cung cấp.
- Xem file LICENSE để biết chi tiết giấy phép MIT.
