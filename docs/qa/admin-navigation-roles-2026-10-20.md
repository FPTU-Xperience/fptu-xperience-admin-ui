# Current Admin navigation and system roles

2026-10-20. Source-only frontend snapshot after the role/account changes.

- `/ctsv/work` — Việc cần xử lý: Cần xử lý, Đang chờ phản hồi, Đã xử lý, Số liệu tổng quan
- `/ctsv/semesters` — Học kỳ & sinh viên: Học kỳ, Danh sách sinh viên, Deadline, Chuyển kỳ
- `/ctsv/clubs` — Câu lạc bộ: Danh sách CLB, Báo cáo đầu / cuối kỳ, Hồ sơ & yêu cầu, Lãnh đạo, Ngân sách điểm
- `/ctsv/activities` — Hoạt động: Hoạt động CLB, Hoạt động cấp trường, Nhiệm vụ & chiến dịch
- `/ctsv/declarations` — Hồ sơ tự khai
- `/ctsv/monitoring` — Theo dõi & đối soát: Gắn kết sinh viên, Bất thường, Đối soát đóng góp
- `/ctsv/policies` — Thang điểm & chính sách: Benchmark, Chính sách hiệu lực, Lịch sử phiên bản
- `/admin/accounts` — Tài khoản: Tài khoản
- `/admin/configuration` — Cấu hình & tích hợp: Nền tảng, Định danh, Thời khóa biểu
- `/admin/operations` — Vận hành hệ thống
- `/admin/audit` — Nhật ký & truy vết

Canonical system roles: `SYSTEM_ADMIN`, `STUDENT_AFFAIR`, `STUDENT`.

No missing navigation routes. Frontend Admin-to-CTSV and CTSV-to-Admin checks both deny access. This does not verify server authorization.

The API inventory script could not rerun because its sibling source-route-inventory.mjs dependency is absent. The earlier admin-page-inventory-2026-10-20 files are historical, predating this role/account update; their backend results were not reverified here.
