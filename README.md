# FPTU Xperience — Admin & Công tác sinh viên

Frontend React cho **Công tác sinh viên (CTSV)** và **Admin**, dùng HashRouter, Tailwind CSS v4 và API client tại `src/services/api.js`.

Luồng báo cáo XP (2026-10-21): [tự điền, chỉnh sửa theo sinh viên/action và lịch sử thay đổi](docs/contracts/activity-xp-report.md). Thử tại Hoạt động → nguồn MOCK; chưa ghi XP chính thức qua backend.

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
  components/workflow/    Các luồng JS mô phỏng; mỗi component có JSX + CSS riêng
  workflows/              Fixture JS, reducer và kho mô phỏng trong bộ nhớ
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
- Ba role hệ thống: `SYSTEM_ADMIN`, `STUDENT_AFFAIR`, `STUDENT`. Admin và CTSV không truy cập chéo workspace. Role cũ từ API được chuẩn hóa khi đọc qua `utils/roles.js`; quan hệ chủ nhiệm/thành viên CLB không phải role hệ thống. Backend vẫn cần đồng bộ mô hình và policy mới.
- Dùng component tại `components/ui`, tokens Tailwind và Be Vietnam Pro đã có; không tạo hệ màu/font riêng cho từng màn.
- Logic thuần đặt tại `utils`; trạng thái tải/rỗng/lỗi cần phân biệt. API lỗi không được hiển thị cấu hình mẫu như dữ liệu đã lưu.
- Thay đổi cần có kiểm tra phù hợp. Không dùng seed hoặc browser fixture làm fallback cho production.

## Trang Tài khoản

Trang chỉ có xem trạng thái, tìm kiếm/lọc và tạo tài khoản CTSV; đã gỡ sửa/khóa/xóa/nhập hàng loạt. Trạng thái dùng chip (tất cả, hoạt động, đã khóa, ngừng hoạt động). Bấm header Người dùng/Vai trò/Trạng thái/Ngày thêm để đảo tăng/giảm trước phân trang; ngày API không cung cấp hiển thị `—`, luôn ở cuối khi sort ngày.

Tab Vai trò được thay bằng icon thông tin cạnh tab Tài khoản, mở modal chỉ đọc về 3 role. Phân công xác minh và liên kết chuyển workspace được gỡ khỏi UI. Các mục Cấu hình, Vận hành, Nhật ký vẫn giữ.

Backend hiện còn enum/policy role cũ. Form tạo CTSV mặc định **Mock JS**, không tạo quyền đăng nhập thật và mất khi tải lại. Nguồn API là lựa chọn riêng, chỉ gửi `roles: ['STUDENT_AFFAIR']`; lỗi không tự đổi sang mock. Xem [hợp đồng cần đồng bộ](docs/contracts/system-roles-admin-accounts.md).

## Trạng thái tích hợp

Repo đã có xác thực và nhiều API-backed pages; README cũ mô tả toàn bộ ứng dụng là bản demo đã không còn chính xác.

- CLB, tài khoản, học kỳ, nhiệm vụ, benchmark, thông báo… gọi API qua client hiện có. Việc có request trong code **không chứng minh** endpoint đang chạy đúng trên deployment.
- Workspace không còn đọc/ghi kho demo `fptu-xperience-demo-v1` để điều khiển dữ liệu và quyền.
- Tổng quan không còn tự ước lượng tỷ lệ tham gia/phân bố gắn kết. Khi chưa có dữ liệu tổng hợp, UI thể hiện chưa có dữ liệu.
- Kiểm duyệt bất thường có nguồn API chỉ đọc và nguồn Mock JS để thử quyết định, bút toán đảo/điều chỉnh. Mock không ghi lên API hoặc ví điểm thật.
- Một số quy tắc nghiệp vụ, phép tổng hợp từ danh sách phân trang và phân loại gắn kết vẫn cần hoàn thiện. Xem [báo cáo baseline](docs/ADMIN_UI_BASELINE.md).

## Điều hướng và hồ sơ CLB

Sidebar gồm 7 nhóm CTSV và 4 nhóm Admin. Các mục con được chuyển thành tab; URL cũ chuyển hướng sang nhóm tương ứng và giữ bộ lọc. Xem [bảng điều hướng và giới hạn tích hợp](docs/admin-workflows-2026-10-20.md).

Click toàn bộ card CLB mở `#/ctsv/clubs/:clubId`, có 7 tab: tổng quan, thành viên, báo cáo học kỳ, hoạt động, hồ sơ & yêu cầu, lãnh đạo & kế nhiệm, ngân sách điểm. Thông tin, thành viên và hồ sơ API được giữ đúng phạm vi CLB; mở báo cáo rồi quay lại giữ URL/bộ lọc của trang CLB.

Theo yêu cầu thử các luồng chưa có backend, UI cung cấp **Mock JS có nhãn riêng** cho roster, chuyển kỳ, kế nhiệm, bonus điểm thô, hoạt động action/quyết toán và đối soát. Kho mock chỉ tồn tại trong bộ nhớ, tách theo tài khoản và học kỳ; tải lại hoặc đăng xuất sẽ mất dữ liệu. Các tab API không dùng mock khi request lỗi. Mô phỏng riêng một CLB chỉ lấy tên/ID thật làm ngữ cảnh; nhân sự, số dư và hoạt động đều là mẫu JS. Không ghi XP hoặc thay đổi quyền thật.

## Kiểm tra

```bash
npm test
npm run build
npm run test:ui
```

`test:ui` dùng Chrome headless với dữ liệu fixture, kiểm tra route, guard frontend, drawer, modal và responsive. Trên Windows, script dùng Chrome ở đường dẫn cài đặt mặc định; có thể chỉ định executable qua `CHROME_PATH`. Script mở Vite riêng ở 5189, Chrome CDP ở 9341 và ghi ảnh/metrics vào `.qa/baseline/` (gitignored). Chrome profile nằm trong thư mục tạm của hệ điều hành.

Test và build không xác nhận Google OAuth, policy backend, dữ liệu thật, CORS hoặc deployment. [INTEGRATION.md](docs/INTEGRATION.md) giữ các đối chiếu lịch sử; ưu tiên báo cáo baseline mới cho tình trạng code hiện tại.
