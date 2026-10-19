# Admin route and API declaration audit — 2026-10-19

Source-only inventory; not runtime/OpenAPI, DTO validation, authorization or live acceptance. Known dynamic method/path composition is checked explicitly below.

## Navigation and registered pages

| Route | Label | Registered |
| --- | --- | --- |
| `/ctsv/overview` | Tổng quan | true |
| `/ctsv/reports` | Báo cáo từ CLB | true |
| `/ctsv/activity-approvals` | Phê duyệt hoạt động | true |
| `/ctsv/activity-dossiers` | Action & quyết toán XP | true |
| `/ctsv/declarations` | Duyệt hồ sơ tự khai | true |
| `/ctsv/clubs` | Quản lý câu lạc bộ | true |
| `/ctsv/club-requests` | Hồ sơ quản trị CLB | true |
| `/ctsv/global-activities` | Hoạt động cấp trường | true |
| `/ctsv/student-roster` | Sinh viên theo học kỳ | true |
| `/ctsv/rollover` | Chuyển học kỳ | true |
| `/ctsv/leadership` | Kế nhiệm & khôi phục CLB | true |
| `/ctsv/club-bonuses` | Ngân sách điểm CLB | true |
| `/ctsv/engagement` | Gắn kết sinh viên | true |
| `/ctsv/quests` | Nhiệm vụ & chiến dịch | true |
| `/ctsv/rubrics` | Thang điểm XP | true |
| `/ctsv/seasons` | Học kỳ & mùa giải | true |
| `/ctsv/anomalies` | Kiểm duyệt bất thường | true |
| `/ctsv/experience-audit` | Đối soát trải nghiệm | true |
| `/admin/accounts` | Quản lý tài khoản | true |
| `/admin/roles` | Vai trò & phân quyền | true |
| `/admin/integrations` | Tích hợp hệ thống | true |
| `/admin/settings` | Cấu hình nền tảng | true |
| `/admin/health` | Tình trạng hệ thống | true |
| `/admin/audit` | Nhật ký hoạt động | true |

Detail: `/ctsv/reports/:reportId` = true.

## API operations used by new connected screens

| HTTP | Path | Declaration evidence |
| --- | --- | --- |
| GET | `/api/clubs` | src/Services/ClubService/Endpoints/ClubEndpoints.cs:29 |
| GET | `/api/reports` | src/Services/ReportService/Endpoints/ReportQueryEndpoints.cs:17 |
| GET | `/api/reports/{}` | src/Services/ReportService/Endpoints/ReportQueryEndpoints.cs:21 |
| POST | `/api/reports/{}/approve` | src/Services/ReportService/Endpoints/ReportWorkflowEndpoints.cs:24 |
| POST | `/api/reports/{}/reject` | src/Services/ReportService/Endpoints/ReportWorkflowEndpoints.cs:26 |
| GET | `/api/reports/{}/file/preview` | src/Services/ReportService/Endpoints/ReportFileEndpoints.cs:30 |
| GET | `/api/reports/{}/file/download` | src/Services/ReportService/Endpoints/ReportFileEndpoints.cs:31 |
| GET | `/api/reports/{}/attachments/{}/download` | src/Services/ReportService/Endpoints/ReportFileEndpoints.cs:39 |
| GET | `/api/clubs/disband-requests` | src/Services/ClubService/Endpoints/DisbandEndpoints.cs:35 |
| POST | `/api/clubs/disband-requests/{}/approve` | src/Services/ClubService/Endpoints/DisbandEndpoints.cs:41 |
| POST | `/api/clubs/disband-requests/{}/reject` | src/Services/ClubService/Endpoints/DisbandEndpoints.cs:47 |
| GET | `/api/clubs/transfer-requests` | src/Services/ClubService/Endpoints/TransferEndpoints.cs:44 |
| POST | `/api/clubs/transfer-requests/{}/approve` | src/Services/ClubService/Endpoints/TransferEndpoints.cs:50 |
| POST | `/api/clubs/transfer-requests/{}/reject` | src/Services/ClubService/Endpoints/TransferEndpoints.cs:56 |
| GET | `/api/contributions/{}` | src/Services/AdminService/Endpoints/VerifiedContributionEndpoints.cs:24 |

## Limits

- Report type filtering traverses all matching server pages; current BE only has exact tag filtering.
- Report/club decisions pre-read current state; current BE DTOs do not provide atomic expectedVersion/idempotency receipts. See the active contract.
- Planned operation pages intentionally call no invented BE endpoints.
- No source references remain for the removed Bonus Matrix feature: true. Historical audit documents may retain its removal history.
