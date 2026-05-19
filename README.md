VNU-LEO Dashboards
===================

Giới thiệu
- Đây là monorepo chứa các giao diện dashboard React/Vite cho dự án VNU-LEO. Giao diện chính hợp nhất là `vnu-leo-dashboard` (mặc định chạy trên cổng 5174) — nó hiển thị cả phần router và gateway.

Yêu cầu
- Node.js (khuyến nghị >= 18) và npm.

Cài đặt
- Ở thư mục gốc, cài tất cả phụ thuộc của workspace:

```bash
npm install
```

Chạy trong môi trường phát triển
- Chạy giao diện hợp nhất (mặc định của repo):

```bash
cd vnu-leo-dashboard
npm install    # nếu chưa cài ở bước gốc
npm run dev    # chạy trên http://127.0.0.1:5174
```

- Hoặc chạy từng app riêng biệt (nếu cần debug cụ thể):

```bash
# Gateway
cd apps/gateway-dashboard
npm install
npm run dev    # chạy trên 127.0.0.1:3000

# Router
cd apps/router-dashboard
npm install
npm run dev    # chạy trên 127.0.0.1:3001
```

Chạy nhiều server song song
- Mở nhiều terminal và chạy các lệnh tương ứng như trên, hoặc thêm script `dev:all` sử dụng `concurrently` (ví dụ bên dưới).

Thêm script `dev:all` (tùy chọn)
- Cài `concurrently` và thêm script để chạy cả 3 app cùng lúc từ gốc:

```bash
npm install -D concurrently

# trong package.json (gốc) thêm vào scripts:
"dev:all": "concurrently \"npm run dev -w apps/gateway-dashboard\" \"npm run dev -w apps/router-dashboard\" \"npm run dev -w vnu-leo-dashboard\""
```

Build & Preview
- Build và preview từng app:

```bash
cd apps/gateway-dashboard && npm run build && npm run preview
cd apps/router-dashboard && npm run build && npm run preview
cd vnu-leo-dashboard && npm run build && npm run preview
```

Tệp cấu hình quan trọng
- Workspace: [package.json](package.json)
- Gateway: [apps/gateway-dashboard/package.json](apps/gateway-dashboard/package.json)
- Router: [apps/router-dashboard/package.json](apps/router-dashboard/package.json)
- Giao diện chung: [vnu-leo-dashboard/package.json](vnu-leo-dashboard/package.json)

Ghi chú và khắc phục sự cố
- Mặc định hiện tại:
	- `vnu-leo-dashboard`: `127.0.0.1:5174`
	- `apps/gateway-dashboard`: `127.0.0.1:3000`
	- `apps/router-dashboard`: `127.0.0.1:3001`
- Nếu truy cập `localhost:5173` thay vì `5174`, thử kiểm tra xem bạn có chạy `vite` ở thư mục khác không — `vnu-leo-dashboard` giờ đã cấu hình cố định cổng 5174.
- Một số module (Cesium, vite-plugin-cesium) có thể cần cấu hình tĩnh hoặc xử lý sourceMap khi build; nếu gặp lỗi bản đồ/asset, kiểm tra `vite.config.js` của app tương ứng.


