# Admin route and API declaration audit — 2026-10-20

Source-only inventory; not runtime/OpenAPI, DTO validation, authorization or live acceptance. Known dynamic method/path composition is checked explicitly below.

## Navigation and registered pages

| Route | Label | Registered |
| --- | --- | --- |
| `/ctsv/work` | Việc cần xử lý | true |
| `/ctsv/semesters` | Học kỳ & sinh viên | true |
| `/ctsv/clubs` | Câu lạc bộ | true |
| `/ctsv/activities` | Hoạt động | true |
| `/ctsv/declarations` | Hồ sơ tự khai | true |
| `/ctsv/monitoring` | Theo dõi & đối soát | true |
| `/ctsv/policies` | Thang điểm & chính sách | true |
| `/admin/accounts` | Tài khoản & quyền | true |
| `/admin/configuration` | Cấu hình & tích hợp | true |
| `/admin/operations` | Vận hành hệ thống | true |
| `/admin/audit` | Nhật ký & truy vết | true |

Detail: `/ctsv/reports/:reportId` = true.

Club detail: `/ctsv/clubs/:clubId` = true.

## API operations used by connected screens

| HTTP | Path | Declaration evidence |
| --- | --- | --- |
| GET | `/api/clubs` | src/Services/ClubService/Endpoints/ClubEndpoints.cs:29 |
| GET | `/api/clubs/{}` | src/Services/ClubService/Endpoints/ClubEndpoints.cs:60 |
| PUT | `/api/clubs/{}` | src/Services/ClubService/Endpoints/ClubEndpoints.cs:76 |
| GET | `/api/clubs/{}/members` | src/Services/ClubService/Endpoints/MemberManagementEndpoints.cs:31 |
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
- Missing-backend workflows use explicitly labeled in-memory JS simulation; real API failures never trigger mock fallback. Club detail uses existing club/member/report endpoints and scoped mock scenarios.
- No source references remain for the removed Bonus Matrix feature: true. Historical audit documents may retain its removal history.
