# Admin workflow navigation — 2026-10-20

Update 2026-10-21 (personal experience): **Trải nghiệm tự khai** replaces the navigation/queue label Hồ sơ tự khai; displayed XP units now read **Xperience Point**. ClubHub owns direct self-submission with mandatory private evidence. Optional affiliated-club endorsement remains a separate pending contract; CTSV retains final review authority.

Update 2026-10-21: activity closing reports now include explicit XP autofill, per-student/action editing with before/after history, summaries/filters and frozen review snapshots. See [XP report workflow and backend contract](contracts/activity-xp-report.md). This remains an isolated JS simulation; API report detail discloses the missing XP contract.

Implemented frontend navigation and explicitly labeled JS simulation. This document does not claim deployment or live backend acceptance.

## Navigation map

| Workspace | Sidebar group | Tabs / work |
| --- | --- | --- |
| CTSV | Việc cần xử lý | Cần xử lý, Đang chờ phản hồi, Đã xử lý, Số liệu tổng quan |
| CTSV | Học kỳ & sinh viên | Học kỳ, Danh sách sinh viên, Deadline, Chuyển kỳ |
| CTSV | Câu lạc bộ | Danh sách CLB, Báo cáo đầu/cuối kỳ, Hồ sơ & yêu cầu, Lãnh đạo, Ngân sách điểm |
| CTSV | Hoạt động | Hoạt động CLB, Hoạt động cấp trường, Nhiệm vụ & chiến dịch |
| CTSV | Trải nghiệm tự khai | Existing declaration review, preserving its backend contract |
| CTSV | Theo dõi & đối soát | Gắn kết sinh viên, Bất thường, Đối soát đóng góp |
| CTSV | Thang điểm & chính sách | Benchmark, Chính sách hiệu lực, Lịch sử phiên bản |
| Admin | Tài khoản | Chip trạng thái, sort theo header, chỉ tạo CTSV; icon info mở modal 3 role |
| Admin | Cấu hình & tích hợp | Nền tảng, Định danh, Thời khóa biểu |
| Admin | Vận hành hệ thống | Tổng quan, Kết nối / lỗi |
| Admin | Nhật ký & truy vết | Existing audit-event lookup |

`src/routes/navigation.js` is the canonical navigation/legacy alias registry. The header search includes sub-tabs. Frontend guards preserve CTSV/Admin separation; backend authorization remains authoritative. Admin and CTSV routes are mutually isolated, including direct URLs. Mixed administrative claims resolve to the Admin workspace and do not grant CTSV decisions.

## System roles and account scope

Only `SYSTEM_ADMIN`, `STUDENT_AFFAIR`, and `STUDENT` are system roles. Legacy API role values are normalized at read boundaries. Club manager/member/treasurer labels in club membership data remain domain relationships; they do not grant administrative access. The account screen cannot edit, lock, delete, import or assign roles. It creates only CTSV records and shows status/search/filter/sorting. The other three Admin sidebar groups remain available.

Role information is a read-only modal opened by the info icon beside the Accounts tab. Verification assignment is no longer exposed. Accounts whose `isActive` is false are shown separately from locked accounts. API dates are never synthesized as today; missing dates remain last in either sort direction.

The existing backend does not yet declare the new role enum. The CTSV create dialog therefore defaults to explicitly labeled JS simulation; it does not create a real Google allow-list account. API mode submits only `STUDENT_AFFAIR` and preserves errors. Account mocks live only in page memory and are discarded by list reload, refresh or logout. See [required backend alignment](contracts/system-roles-admin-accounts.md).

## Club record

Clicking a club card opens `#/ctsv/clubs/:clubId`, replacing the old information modal. Direct links and `?view=` survive refresh. Legacy `?club=:id` also redirects to the record. Back navigation returns to the registry; report details retain the originating club tab and query.

| Club tab | Available work | Source |
| --- | --- | --- |
| Tổng quan | Read profile/status/contact details; edit basic club data | Existing GET/PUT club APIs; CTSV edit guard |
| Thành viên | Search/paginate membership names, contacts, roles and status | Existing GET club members API; explicitly current roster |
| Báo cáo học kỳ | Filter/review beginning/end-of-term reports | Existing report APIs, fixed club ID and selected reporting period |
| Hoạt động | Review proposal/closing report records; separate action/settlement simulator | API reports or explicit Mock JS source |
| Hồ sơ & yêu cầu | Review transfer/disband requests | Existing request APIs, fixed club filter |
| Lãnh đạo & kế nhiệm | Read current manager, navigate ordinary transfer; simulate emergency nomination/consent | API manager field + isolated JS scenario |
| Ngân sách điểm | Simulate raw bonus grant/allocation/refund and history | Isolated JS scenario, no financial-money claims |

The real profile must load before showing any scenario. A failed/404 profile never becomes a mock club. Starting a scenario is explicit: only the real club ID/name label is reused. Mock personnel, active status, empty activity list and zero starting bonus are disclosed as fictional. Each club uses its own `mock-club:<id>` key. Query tampering cannot change the fixed club filter in record tabs. Club activity work-inbox links return to the corresponding club record.

Personal information ownership is preserved: editing a club does not edit its manager's identity. ClubForm displays manager as read-only and directs changes to governance requests. Member personal-profile editing is not exposed; the inspected backend returns `PERSONAL_PROFILE_SELF_ONLY` for those writes.

## Mock workflow and handoff

`src/workflows/mock-data.js` contains fictional inputs, `workflow-model.js` contains pure transitions, and `WorkflowContext.jsx` holds session memory. UI lives in feature directories under `components/workflow`, each with its own CSS. Source switching never converts an API failure into sample success.

| Journey | Simulator sequence | Boundary for backend integration |
| --- | --- | --- |
| Club action | Submit plan → approve/revise/reject → separate publish → evidence quantities → closing snapshot → independent review → raw ledger | Plan approval never posts XP; closing/retry need durable server contracts |
| School action | CTSV plan → publish → evidence → closing → explicitly simulated independent reviewer | No mandatory club; author/reviewer separation must be enforced by server |
| Roster | Parse XLSX → row errors/duplicates/diff → reason → commit mock roster | Browser import cannot attest official enrollment |
| Emergency succession | Eligible candidate → nomination → pending consent → simulated accept/decline → grant membership/office only after accept | Actual nominee identity/consent/capabilities remain backend work |
| Raw bonus | Grant with reason → allocate to approved matching activity → cancellation refunds once | Mock raw points are neither wallet conversion nor money |
| Rollover | Preview source/target versions → confirm → locked five-step job → optional failure → retry → reconciliation | Preserve source history/imported target roster; refuse overwriting target business data |
| Corrections | Select posted source → keep/reverse/adjust with reason → append delta | Original entry stays immutable; authoritative conversion remains unspecified |

Each scope is keyed by authenticated actor and semester; switching accounts remounts the provider. No workflow mock data enters browser persistence or API payloads. Reload/logout discards it. Explicit reset restores only that semester's fixtures. A running/failed rollover locks its source and destination; retry resumes the same job. A source reset abandons its simulation. Fixtures' numbers are testing inputs and do not resolve open product policy decisions.

The work inbox aggregates independent API sources with per-source errors and separate MOCK labels. Paged API sources show their first 20 records with links to the full source. Reports use the selected period; sources without period filters disclose their API scope. Completed report/declaration previews currently query approved records; rejected outcomes remain accessible at their source. The inbox is not a complete server-wide work index.

Remaining authoritative requirements are tracked in [admin-missing-operations](contracts/admin-missing-operations.md). Existing backend report approval is not proof of action settlement support. Historical audit snapshots dated 2026-10-19 remain historical.

## Verification

- `npm test`: pure transition, role/isolation, two approval gates, bonus/refund, roster, consent, rollover, immutable correction and API error-boundary tests.
- `npm run build`: production bundle compilation.
- `npm run test:ui`: API-fixture browser checks across canonical tabs, club record tabs and legacy aliases; 320/375/414/768/1280 layout checks, interactions and screenshots. Chrome profile and artifacts remain outside source imports.
- `node scripts/audit-admin-pages.mjs`: current source route/declared-operation inventory in `docs/qa/*2026-10-20.*`.

These checks cover frontend and inspected source declarations. They do not prove live gateway, database, OAuth or deployment integration.
