# FPTU Xperience — Admin & Công tác sinh viên

Giao diện React cho hai actor **Công tác sinh viên (CTSV)** và **Admin**, thiết kế dựa trên `FA26SE224.docx` và tham khảo frontend `FPT_FE`.

## Chạy dự án

Yêu cầu Node.js 22.12 trở lên.

```bash
npm ci
npm run dev
```

Mở [bản xem thử](http://127.0.0.1:5174). Bộ chọn **Chế độ xem thử** ở thanh bên chuyển giữa CTSV và Admin. Trên điện thoại, mở menu góc trên bên trái để đổi actor.

```bash
npm run build
npm run preview
npm test
```

## Chức năng đã xây dựng

### Công tác sinh viên

- Dashboard tổng quan, tỷ lệ tham gia, nhóm chưa tham gia và việc chờ xử lý.
- Danh mục CLB, thêm/sửa thông tin và trạng thái, phân loại CLB, duyệt hoặc từ chối hồ sơ thành lập kèm nhận xét.
- Thêm loại CLB cùng bản nháp thang XP tương ứng.
- Thang XP theo loại CLB, tiêu chí, trọng số, ngưỡng chuẩn hóa, ngày hiệu lực và lịch sử phiên bản. Tổng trọng số phải bằng 100%.
- Cấu hình học kỳ, XP mỗi cấp độ, ngưỡng cần kết nối và hiển thị xếp hạng.
- Tạo và chỉnh sửa nhiệm vụ cá nhân, theo nhóm hoặc chiến dịch toàn trường; lưu nháp, công bố, tạm dừng.
- Theo dõi sinh viên theo ngành, khóa, mức độ gắn kết, bao gồm sinh viên chưa tham gia CLB; xuất dữ liệu đang lọc thành Excel.
- Xem xét bất thường; giữ nguyên, điều chỉnh giảm hoặc thu hồi XP có lý do. Điều chỉnh ghi thêm bút toán tham chiếu bản gốc.

### Admin

- Danh sách toàn bộ tài khoản, tìm kiếm, lọc vai trò/trạng thái và phân trang.
- Thêm, sửa, khóa/mở khóa, xóa từng tài khoản hoặc nhiều tài khoản.
- Chặn xóa/khóa/đổi vai trò tài khoản Admin đang xem và bảo vệ Admin hoạt động cuối cùng.
- Nhập tài khoản từ Excel với tải mẫu, kéo thả/chọn file, xem trước, kiểm tra từng dòng, thêm dòng hợp lệ và tải danh sách lỗi.
- Ma trận quyền bốn actor, cấu hình thông báo, giới hạn yêu cầu và thông tin tích hợp.
- Nhật ký hoạt động và màn hình trạng thái dịch vụ.

## Cách nhập Excel

1. Chuyển sang **Admin hệ thống → Quản lý tài khoản**.
2. Chọn **Tải file mẫu** hoặc **Nhập từ Excel → Tải file mẫu**.
3. Điền danh sách vào trang `TaiKhoan` (nếu không có, ứng dụng đọc trang đầu tiên).
4. Chọn/kéo thả file `.xlsx`, tối đa 5 MB và 1.000 dòng dữ liệu.
5. Kiểm tra các dòng hợp lệ/lỗi. Chọn **Thêm N tài khoản hợp lệ** để thêm vào danh sách.

| Cột | Bắt buộc | Nội dung |
| --- | --- | --- |
| `username` | Có | Mã tài khoản/MSSV, 3–50 ký tự chữ, số, `.`, `_`, `-` |
| `fullName` | Có | Họ tên, ít nhất 2 ký tự |
| `email` | Có | Email hợp lệ và duy nhất, không phân biệt hoa/thường |
| `role` | Có | `ADMIN`, `STUDENT_AFFAIRS_ADMIN`, `CLUB_MANAGER`, `CLUB_MEMBER` |
| `status` | Không | `active` (mặc định) hoặc `locked` |

Hỗ trợ tên cột tiếng Việt: `MSSV`, `Mã tài khoản`, `Họ tên`, `Họ và tên`, `Email`, `Vai trò`, `Trạng thái`. Dòng 1 là tiêu đề; không dùng công thức. File `.xls` cũ cần lưu lại thành `.xlsx`.

Email và mã tài khoản được kiểm tra trùng cả trong file lẫn danh sách hiện có. Dòng lỗi được bỏ qua khi nhập và có thể tải về để sửa; không tự ghi đè tài khoản đang có.

## Phạm vi của bản thiết kế

Đây là **frontend tương tác dùng dữ liệu mẫu**, chưa kết nối backend và chưa triển khai xác thực. Bộ chọn actor chỉ dùng xem thử. Không dùng bản này như cơ chế phân quyền cho dữ liệu thật.

- Dữ liệu và thay đổi lưu tại `localStorage`, khóa `fptu-xperience-demo-v1`. Actor xem thử lưu trong `sessionStorage`.
- Dữ liệu sinh viên, chỉ số sức khỏe CLB, số lượt nhiệm vụ và trường hợp bất thường là minh họa.
- Tạo học kỳ mở một phạm vi dữ liệu mới; chưa có job máy chủ để chuyển mùa, tính XP, trao badge hoặc gửi thông báo.
- Cấu hình tích hợp chỉ lưu tại trình duyệt. Màn hình dịch vụ hiển thị **Chưa kết nối**.
- Sổ cái và audit trong bản mẫu thể hiện cách ứng xử của giao diện; tính bất biến và kiểm tra quyền thực tế phải được thực thi tại backend.
- Bộ đọc Excel được tải khi cần để không làm chậm tải giao diện ban đầu. Font được phục vụ cùng ứng dụng, không phụ thuộc Google Fonts.

Xem [đối chiếu tài liệu và kế hoạch nối API](docs/INTEGRATION.md).

## Cấu trúc mã nguồn

```text
src/
  main.jsx                 Điểm vào: HashRouter + WorkspaceProvider
  App.jsx                  Ghép AppLayout và AppRoutes
  assets/
    styles/global.css      Kiểu toàn cục (giao diện, bảng, modal…)
    fonts/                 Font được đóng gói cùng ứng dụng
  components/
    ui/                    Nút, modal, bảng, bộ lọc, phân trang (một file mỗi component)
    modals/                Tìm nhanh, hướng dẫn, trung tâm thông báo
  context/
    WorkspaceContext.jsx   Trạng thái, audit và lưu localStorage (provider + useWorkspace)
  hooks/
    useAction.js           Bọc thao tác đồng bộ với toast thành công/lỗi
  layouts/
    AppLayout.jsx          Khung: sidebar, topbar, context bar, toast, modal toàn cục
    Sidebar.jsx            Điều hướng và bộ chọn actor xem thử
    Topbar.jsx             Breadcrumb, tìm nhanh, thông báo
    ContextBar.jsx         Học kỳ đang xem / ghi chú dữ liệu mẫu
  pages/                   Một file cho một trang
    Accounts.jsx           Quản lý tài khoản và quy trình nhập Excel
    Dashboard.jsx          Tổng quan CTSV
    Clubs.jsx              Danh mục CLB và duyệt hồ sơ
    Engagement.jsx         Gắn kết sinh viên, xuất Excel
    Quests.jsx             Nhiệm vụ & chiến dịch
    Rubrics.jsx            Thang điểm XP
    Seasons.jsx            Học kỳ & mùa giải
    Anomalies.jsx          Đối soát bất thường XP
    Audit.jsx              Nhật ký hoạt động
    RoleMatrix.jsx         Vai trò & phân quyền
    SystemSettings.jsx     Cấu hình, tích hợp, tình trạng hệ thống
  routes/
    index.jsx              Định tuyến và giới hạn theo actor xem thử
    navigation.js          Danh sách điều hướng theo không gian làm việc
  services/
    api.js                 Lớp API dự phòng cho phần nối backend
  utils/
    format.js              ROLES, MAJORS, SEASONS, định dạng số/ngày, normalize
    seed.js                Dữ liệu minh họa (createSeed) và studentXP
    accounts.js            Kiểm tra tài khoản và các ràng buộc Admin
    excel.js               Đọc/ghi Excel
    governance.js          Kiểm tra thang điểm và ghi bút toán đảo
tests/                    Kiểm thử dữ liệu tài khoản, Excel và sổ cái
```

Logic thuần (không phụ thuộc React) nằm ở `utils/` để tách được cho kiểm thử với Node. Dữ liệu mẫu sinh từ `createSeed` trong `utils/seed.js`, không còn nằm cùng component.

## Kiểm tra

`npm test` gồm 16 kiểm thử cho tài khoản, file Excel thực và các ràng buộc sổ cái. Các luồng thêm/khóa/mở khóa/xóa tài khoản, nhập file có dòng lỗi, tải lại dữ liệu, duyệt CLB, tạo phiên bản XP và thu hồi XP đã được kiểm tra trên trình duyệt.

Thiết kế có thanh điều hướng thu gọn, bảng cuộn ngang và modal phù hợp màn hình nhỏ. Giao diện dùng tiếng Việt và định dạng số/ngày Việt Nam.
