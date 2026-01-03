# Hướng Dẫn Sử Dụng Trang Admin

##  Thông Tin Đăng Nhập Admin

- **Username:** `admin1`
- **Password:** `admin123`

## 📋 Bước 1: Tạo Tài Khoản Admin

Chạy script sau để tạo tài khoản admin trong database:

```bash
cd backend
node seedAdmin.js
```

Script này sẽ:
- Tạo tài khoản admin với username `admin1` và password `admin123`
- Nếu tài khoản đã tồn tại, nó sẽ cập nhật role thành `admin`

## 🚀 Bước 2: Truy Cập Trang Admin

1. Khởi động server backend và frontend như bình thường
2. Đăng nhập bằng tài khoản admin1/admin123
3. Truy cập trang admin tại: `http://localhost:5173/admin`

##  Tính Năng Trang Admin

Trang admin cho phép quản lý tất cả các tài khoản user:

### Dashboard
- Tổng số người dùng
- Số lượng admin
- Số lượng user thường

### Quản Lý Users
- **Xem danh sách:** Xem tất cả users với thông tin chi tiết
- **Tìm kiếm:** Tìm kiếm theo username, tên hoặc email
- **Chỉnh sửa:** Cập nhật thông tin user (username, tên, email, role)
- **Đặt lại mật khẩu:** Reset mật khẩu cho user bất kỳ
- **Xóa user:** Xóa tài khoản user (không thể tự xóa chính mình)
- **Phân quyền:** Thay đổi role user thành admin hoặc ngược lại

##  Bảo Mật

- Tất cả API admin yêu cầu JWT token với role `admin`
- Middleware `verifyAdmin` kiểm tra quyền truy cập
- Admin không thể tự xóa chính mình
- Password được hash bằng bcrypt

##  API Endpoints

Tất cả endpoints admin có prefix `/api/admin` và yêu cầu token với role admin:

- `GET /api/admin/dashboard/stats` - Lấy thống kê tổng quan
- `GET /api/admin/users` - Lấy danh sách tất cả users
- `GET /api/admin/users/:id` - Lấy thông tin chi tiết 1 user
- `PUT /api/admin/users/:id` - Cập nhật thông tin user
- `DELETE /api/admin/users/:id` - Xóa user
- `POST /api/admin/users/:id/reset-password` - Đặt lại mật khẩu

##  Lưu Ý Quan Trọng

1. **Không để lộ mật khẩu admin:** Thay đổi mật khẩu mặc định trong môi trường production
2. **Backup database:** Luôn backup trước khi xóa users
3. **Kiểm tra role:** Đảm bảo chỉ người được ủy quyền mới có role admin
4. **Môi trường .env:** Đảm bảo JWT_SECRET và MONGO_URL được cấu hình đúng

## 🛠️ Troubleshooting

### Lỗi "Bạn không có quyền truy cập"
- Kiểm tra xem tài khoản có role `admin` trong database
- Chạy lại script `node seedAdmin.js`
- Đăng xuất và đăng nhập lại để lấy token mới

### Không thấy trang admin
- Kiểm tra routes đã được thêm vào AppRoutes.jsx
- Xóa cache trình duyệt và refresh lại

### API trả về 401/403
- Kiểm tra token trong localStorage
- Đảm bảo middleware verifyAdmin đang hoạt động
- Kiểm tra backend logs
