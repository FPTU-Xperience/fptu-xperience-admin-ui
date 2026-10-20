<!-- Hallmark · genre: modern-minimal · existing FPT orange / Be Vietnam Pro · pre-emit critique: P4 H4 E4 S5 R5 V3 -->

# Admin UI baseline — 2026-10-15

Branch: `cuongnk21/implement-sa-features`, từ `origin/main` tại `0326552`.

## Phạm vi và bằng chứng

Đọc cấu trúc route, layout, context, component dùng chung và toàn bộ màn được đăng ký trong navigation. Dùng Hallmark để kiểm tra hierarchy, tính trung thực của số liệu/copy, tokens và responsive. Sửa trong ranh giới component/route hiện có, giữ màu FPT và font Be Vietnam Pro.

Phân biệt ba mức: **source audit** (đọc code), **browser fixture** (render component thật với API thay thế), và **live integration** (backend/OAuth thực). Đợt này không xác nhận live integration. Không thay đổi API backend, không triển khai SSO chung hai ứng dụng, không deploy và không commit/push.

## Kết quả đối chiếu và refactor

| Mức      | Phát hiện ban đầu                                                                                           | Chỉnh sửa                                                                                                                                     |
| -------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Critical | App có hai route trees; tree đang chạy bỏ qua guard Admin/CTSV                                              | `App` chỉ xử lý phiên; `routes/index.jsx` sở hữu routing và kiểm tra policy từ `utils/access.js`                                              |
| Critical | Workspace lấy actor từ session/localStorage; Dev Login có fallback tự gán ADMIN khi không đọc được identity | Dùng claims của AuthContext; không tự gán role khi thiếu identity                                                                             |
| Major    | Shell mobile vẫn giữ margin 245px, sidebar không dùng trạng thái mở/đóng                                    | Drawer dưới 1024px, inert khi đóng, focus containment/restore, backdrop và Escape; cleanup cuộn khi mở modal từ drawer; main/toast responsive |
| Major    | **Invented metrics**: tỷ lệ tham gia/phân bố dùng hệ số 50%, 42%, 26%                                       | Gỡ các phép ước lượng; phân bố chưa có dữ liệu được thể hiện rõ, radar vẫn dùng API                                                           |
| Major    | Màn có cấu hình mẫu khi request lỗi, học kỳ mặc định không khớp bộ lọc                                      | Học kỳ từ API; bỏ fallback cấu hình lưu sẵn ở Seasons/Bonus/Benchmark; đồng bộ bộ chọn tại các màn liên quan                                  |
| Major    | Lưu học kỳ thất bại vẫn đóng modal/báo thành công; kiểm duyệt XP chỉ ghi ledger ở trình duyệt               | Lỗi save được giữ lại và hiển thị trong dialog; kiểm duyệt trở thành chỉ xem cho đến khi xác minh hợp đồng máy chủ                            |
| Major    | UI/help nói toàn bộ ứng dụng dùng demo; chuông lấy số đếm từ cache không phải API thông báo                 | Help/copy cập nhật; thông báo dùng API client và có tải/rỗng/lỗi/thử lại; dữ liệu CLB không đi vòng qua demo store                            |
| Major    | Rule nền CSS ngoài layer ghi đè Tailwind utilities; body min-width làm clip nội dung khi có scrollbar       | Đưa base rules vào `@layer base`, để body co theo vùng hiển thị và đo viewport khả dụng trong browser test                                    |
| Minor    | **Generic emoji as feature icon**, **transition-all**, palette riêng trong trang đăng nhập                  | Dùng Lucide, Button/Field và tokens đã có; giữ Google/Dev flow hiện tại                                                                       |
| Minor    | Vite 5173 lệch README và va chạm ClubHub                                                                    | 5174 + strictPort; ignore `.qa` và `.tmp` trong watcher                                                                                       |

2 critical · 6 major · 2 minor đã xử lý ở phạm vi baseline. Đây là punch list gộp vấn đề code/UI; severity Hallmark không phải đánh giá bảo mật backend.

## Đối chiếu 16 route

| Route                 | Code/UI hiện tại                                              | Giới hạn cần lưu ý                                                                                                  |
| --------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `/ctsv/overview`      | Radar/overview và các danh sách qua API; dùng học kỳ chung    | KPI từ danh sách giới hạn trang chưa phải tổng hợp toàn trường; không suy ra sinh viên đang tham gia từ leaderboard |
| `/ctsv/clubs`         | CLB, danh mục, hồ sơ thành lập; phê duyệt qua API hiện có     | Cần kiểm thử chi tiết hồ sơ và approve/reject với backend thực                                                      |
| `/ctsv/declarations`  | Queue tự khai và UI xét duyệt đã có                           | Chưa xác nhận hợp đồng minh chứng, review và phân trang trên server                                                 |
| `/ctsv/engagement`    | Danh sách sinh viên/CLB, radar cá nhân, export                | Membership chưa đủ để phân loại gắn kết; filter cao/thấp hiện cần thay bằng dữ liệu aggregate có thẩm quyền         |
| `/ctsv/bonus-matrix`  | Danh sách/tạo/sửa/xóa ngưỡng qua API client                   | Cần kiểm thử drag, retry/concurrency và validation server; đã rollback vị trí khi save lỗi                          |
| `/ctsv/quests`        | Nhiệm vụ qua `/api/v1/quests`, không lấy báo cáo làm nhiệm vụ | Mapper/trạng thái, paging và phạm vi học kỳ cần xác minh backend                                                    |
| `/ctsv/rubrics`       | Benchmark 6+1 qua API; draft mới có tổng trọng số 100         | Quy tắc khóa/version và payload lưu cần kiểm thử integration                                                        |
| `/ctsv/seasons`       | Học kỳ và deadline qua API                                    | Không còn báo save thành công khi request lỗi; mã học kỳ hiện theo quy ước form cũ, cần thống nhất với backend      |
| `/ctsv/anomalies`     | Read-only anomalies + ledger qua API client đúng namespace    | Write decision chưa bật; không được thay backend ledger bằng localStorage                                           |
| `/ctsv/reports`       | Dùng `Engagement reports` theo route hiện có                  | Chưa phải module báo cáo độc lập; không coi route hiện diện là đủ chức năng báo cáo                                 |
| `/admin/accounts`     | Danh sách, form, batch và Excel theo implementation hiện có   | Cần xác minh policy backend: self/last admin, batch/import partial success, paging                                  |
| `/admin/roles`        | Ma trận UI và API role stats                                  | Ma trận mô tả frontend không phải nguồn enforcement; cần thống nhất quyền Admin với CTSV                            |
| `/admin/integrations` | `SystemSettings type=integrations`                            | Kiểm tra lưu settings và cấu hình production thực                                                                   |
| `/admin/settings`     | `SystemSettings type=settings`                                | Validation/persistence cần integration test                                                                         |
| `/admin/health`       | `SystemSettings type=health`                                  | Số liệu API và khả dụng deployment chưa xác minh                                                                    |
| `/admin/audit`        | Nhật ký API và UI lọc                                         | Cần đối chiếu paging/filter, danh tính actor và quyền đọc backend                                                   |

## Chuẩn repo giữ lại

- HashRouter và routes hiện có; không đổi đường dẫn deep link.
- React + Tailwind v4, token block ở `styles/theme.css`, quy tắc nền ở `styles/base.css`, Be Vietnam Pro tự phục vụ. CSS riêng nằm cạnh JSX theo thư mục chức năng.
- `layouts/` sở hữu shell; `components/ui` sở hữu primitive; `services/api.js` là API boundary; logic thuần ở `utils`.
- State không thể chứng minh thay đổi server thành công; chỉ đóng form hoặc cập nhật UI sau request thành công.
- Mọi actor/permission trong browser chỉ là presentation guard. API phải tự kiểm tra claims và campus.

## Ưu tiên triển khai CTSV tiếp theo

1. Xác minh contracts cho queue tự khai, benchmark, bonus, XP ledger/resolve (payload, status, paging, concurrency).
2. Định nghĩa aggregate engagement/overview thật, thống nhất semester/campus; bỏ các phép phân loại dựa riêng vào membership.
3. Kiểm kê chức năng cấp trường (hoạt động, phần thưởng) và quan hệ điều hướng với ClubHub; không coi route quests là đã cover hai module này.
4. Kiểm thử auth refresh/logout, Google trên deployment, CORS và server-side role enforcement. SSO chung vẫn để sau theo quyết định hiện tại.

## Kiểm tra

- Unit: `npm test`.
- Build: `npm run build`.
- Browser: `npm run test:ui`; render 16 route × 5 viewport (320, 375, 414, 768, 1280), kiểm tra guard frontend, drawer, login, trạng thái lỗi cấu hình và modal thông báo.
- Artifacts: `.qa/baseline/` được gitignore; script fixture chỉ phục vụ kiểm thử, không được import bởi production.

Một lượt UI smoke không chứng minh toàn bộ hành vi CRUD, hiệu năng dữ liệu lớn hoặc API contract đúng. Contrast/copy/tokens rải rác ở các màn cũ vẫn cần một lượt polish riêng; không tuyên bố toàn bộ 58 gate Hallmark đã đạt.
