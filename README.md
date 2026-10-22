# FPTU Xperience — Admin & Công tác sinh viên

Luồng báo cáo XP (2026-10-21): [tự điền, chỉnh sửa theo sinh viên/action và lịch sử thay đổi](docs/contracts/activity-xp-report.md). Thử tại Hoạt động → nguồn MOCK; chưa ghi XP chính thức qua backend.

Frontend React cho **Công tác sinh viên (CTSV)** và **Admin**, dùng HashRouter, Tailwind CSS v4 và API client tại `src/services/api.js`.

## Chạy dự án

Node.js 22.12+ và npm.

```bash
npm ci
npm run dev
```

Admin UI chạy tại **http://127.0.0.1:5174/**, tách với ClubHub UI ở 5173. Vite bật `strictPort`: nếu 5174 đang dùng, lệnh báo lỗi thay vì tự đổi cổng.

Các biến môi trường hiện có:

| Biến                    | Mục đích                                                    |
| ----------------------- | ----------------------------------------------------------- |
| `VITE_API_BASE_URL`     | API gateway; mặc định phát triển là `http://localhost:7000` |
| `VITE_GOOGLE_CLIENT_ID` | Google Identity Services client hiện tại                    |

Chưa thay đổi phương án Google SSO giữa Admin UI và ClubHub. Dev Login vẫn là luồng có sẵn của repo; backend phải kiểm soát việc bật endpoint này.

## Cấu trúc và quy ước

```text
src/
  main.jsx                 HashRouter + AuthProvider + WorkspaceProvider
  App.jsx                  Trạng thái phiên đăng nhập và quyền vào ứng dụng
  routes/index.jsx         Bộ định tuyến duy nhất, dùng guard theo quyền tài khoản
  routes/navigation.js     Danh mục route/nhãn/icon cho từng workspace
  layouts/<feature>/       AppLayout, Topbar, ContextBar: JSX + CSS cùng thư mục
  components/common/brand/ Brand.jsx + Brand.css
  components/common/sidebar/ Sidebar.jsx + Sidebar.css
  components/common/search-modal/ SearchModal.jsx + SearchModal.css
  components/ui/<feature>/ Button, Modal, Field, PageHeader…: JSX + CSS cùng thư mục
  components/modals/       Thông báo từ API: JSX + CSS cùng thư mục; exports modal
  components/operations/   Mỗi component có JSX + CSS; Operations.css là style dùng chung
  context/                 Phiên đăng nhập, học kỳ được chọn và toast
  pages/<feature>/         Tất cả màn CTSV/Admin: JSX + CSS cùng thư mục
  pages/login/             Login.jsx + Login.css
  services/api.js          API client và token/request handling
  utils/                   Logic thuần có thể kiểm thử bằng Node
  styles/theme.css         Theme tokens dùng chung
  styles/base.css          Reset, typography, form defaults và reduced motion
  index.css                Entry CSS: Tailwind và hai stylesheet nền
tests/                     Kiểm thử tài khoản, Excel, sổ cái và policy frontend
scripts/ui-smoke.mjs        Browser checks với API fixture, không phải live integration
```

Tất cả component có giao diện, layout và trang đều đặt JSX + CSS cạnh nhau trong thư mục theo chức năng, theo cách tổ chức `components/v2` của ClubHub. JSX dùng class theo component; layout, responsive, trạng thái và biến thể màu được khai báo trong CSS tương ứng bằng `@apply`. Mỗi CSS tham chiếu `index.css` để dùng chung token Tailwind v4. Primitive dùng layer `components`, style từ nơi sử dụng dùng layer `utilities` để giữ khả năng override. CSS nền được import đầu tiên trong `main.jsx`; theme được xuất tĩnh và tắt tự sinh utility từ JSX. Chỉ các giá trị thay đổi theo dữ liệu như chiều cao panel, tỷ lệ tiến độ và màu biểu đồ dùng inline style. `index.js` trong UI và modal giữ API export dùng chung.

- Dùng API client hiện có; không coi localStorage hay bộ chọn actor là nguồn quyền.
- Quyền Admin gồm `ADMIN` và alias `SYSTEM_ADMIN`; CTSV dùng `STUDENT_AFFAIRS_ADMIN`. Admin có thể vào hai workspace theo policy frontend hiện hành. Backend vẫn là nơi kiểm tra quyền thực tế.
- Dùng component tại `components/ui`, tokens Tailwind và Be Vietnam Pro đã có; không tạo hệ màu/font riêng cho từng màn.
- Logic thuần đặt tại `utils`; trạng thái tải/rỗng/lỗi cần phân biệt. API lỗi không được hiển thị cấu hình mẫu như dữ liệu đã lưu.
- Thay đổi cần có kiểm tra phù hợp. Không dùng seed hoặc browser fixture làm fallback cho production.

## Trạng thái tích hợp

Repo đã có xác thực và nhiều API-backed pages; README cũ mô tả toàn bộ ứng dụng là bản demo đã không còn chính xác.

- CLB, tài khoản, học kỳ, nhiệm vụ, benchmark, bonus, thông báo… gọi API qua client hiện có. Việc có request trong code **không chứng minh** endpoint đang chạy đúng trên deployment.
- Workspace không còn đọc/ghi kho demo `fptu-xperience-demo-v1` để điều khiển dữ liệu và quyền.
- Tổng quan không còn tự ước lượng tỷ lệ tham gia/phân bố gắn kết. Khi chưa có dữ liệu tổng hợp, UI thể hiện chưa có dữ liệu.
- Kiểm duyệt bất thường hiện **chỉ xem** danh sách và sổ cái từ API. Đã gỡ hành vi báo lưu thành công bằng localStorage; hợp đồng lưu quyết định cần được xác minh trước khi bật lại.
- Một số quy tắc nghiệp vụ, phép tổng hợp từ danh sách phân trang và phân loại gắn kết vẫn cần hoàn thiện. Xem [báo cáo baseline](docs/ADMIN_UI_BASELINE.md).

## Kiểm tra

```bash
npm test
npm run build
npm run test:ui
```

`test:ui` dùng Chrome headless với dữ liệu fixture, kiểm tra route, guard frontend, drawer, modal và responsive. Trên Windows, script dùng Chrome ở đường dẫn cài đặt mặc định; có thể chỉ định executable qua `CHROME_PATH`. Script mở Vite riêng ở 5189, Chrome CDP ở 9341 và ghi ảnh/metrics vào `.qa/baseline/` (gitignored). Chrome profile nằm trong thư mục tạm của hệ điều hành.

Test và build không xác nhận Google OAuth, policy backend, dữ liệu thật, CORS hoặc deployment. [INTEGRATION.md](docs/INTEGRATION.md) giữ các đối chiếu lịch sử; ưu tiên báo cáo baseline mới cho tình trạng code hiện tại.
