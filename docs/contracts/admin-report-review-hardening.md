# Admin report and club-request review contract

Status: **PARTIAL / source-integrated UI; BE hardening pending**. Updated 2026-10-19.

## Implemented consumers

- `/ctsv/reports`: report inbox, server status/period/club filters and pagination; type filter traverses all matching server pages because the API supports exact tag, not reportType/prefix. Activity report tags can include `:activityId`.
- `/ctsv/reports/:reportId`: structured content, authenticated PDF preview/original/attachment downloads, feedback history and final SA decision.
- `/ctsv/activity-approvals`: FUTURE_EVENT reports through the same report resource. This is the existing combined report/FinanceService workflow, **not** action/raw-XP approval.
- `/ctsv/club-requests`: disband/ordinary ownership transfer list/detail/approve/reject.

## Existing inspected operations

| Method | Path | DTO / response |
| --- | --- | --- |
| GET | `/api/reports` | `clubId,status,period,tag,page,pageSize`; `{items,total,page,pageSize}` |
| GET | `/api/reports/{id}` | ReportResponse with version, details, attachments, uploadedFile, feedback |
| POST | `/api/reports/{id}/approve` | `{feedback}`; committed ReportResponse, only Under Review |
| POST | `/api/reports/{id}/reject` | `{feedback}`; SA path is Under Review → Rejected; Submitted belongs to manager review |
| GET | `/api/reports/{id}/file/preview` | Authenticated PDF; alias of uploaded-file/preview |
| GET | `/api/reports/{id}/file/download` | Authenticated original file |
| GET | `/api/reports/{id}/attachments/{attachmentId}/download` | Authenticated attachment |
| GET | `/api/clubs/disband-requests` | Full list, not a server-paged report envelope |
| POST | `/api/clubs/disband-requests/{id}/approve` or `/reject` | `{adminNote}`; committed DisbandRequestResponse |
| GET | `/api/clubs/transfer-requests` | Full list |
| POST | `/api/clubs/transfer-requests/{id}/approve` or `/reject` | `{adminNote}`; committed TransferRequestResponse |

Evidence: ReportService ReportQueryEndpoints, ReportWorkflowEndpoints, ReportFileEndpoints, ReportContracts; ClubService DisbandEndpoints, TransferEndpoints and ClubContracts in the designated ClubHub API. The generated [declaration inventory](../qa/admin-page-inventory-2026-10-19.md) verifies 15 read/write declarations used by the new screens, including contribution detail and GET `/api/clubs` for the named club filter.

## States and authority

Current report states are `Draft`, `Awaiting Finance`, `Submitted`, `Under Review`, `Approved`, `Rejected`, `Archived` (including spaces). Admin final review is enabled only for a non-author with `STUDENT_AFFAIRS_ADMIN` and status `Under Review`. ADMIN-only can read according to existing access guards but receives no new SA decision control.

The current API has **no separate REQUEST_REVISION operation for reports**. The UI labels rejection as “Yêu cầu chỉnh sửa / từ chối”, requires feedback, sends `/reject`, and explains that the CLB can edit/re-submit the rejected report. No invented transition or status is sent. Existing club establishment request-revision is a separate resource.

FUTURE_EVENT final approval calls FinanceService and creates an activity through the current BE workflow. UI confirms that consequence and labels money VNĐ; it does not report a raw-XP budget, candidate settlement or report-gated ledger posting. Do not use this route to simulate the missing action application approval gate.

## Remaining backend work

1. **Atomic concurrency:** current Report ReviewRequest accepts only feedback; club lifecycle DTOs accept only adminNote. FE re-reads current report version/status or request status before posting and uses a synchronous click lock. This reduces stale-view mistakes but is not atomic and does not eliminate cross-admin races. Add/agree expectedVersion and committed response version for each decision, and transactionally reject stale writes with 409.
2. **Server idempotency:** report requests attach the existing workflow idempotency header; these old BE handlers do not implement a replay receipt contract. Define scoped actor/resource/operation/body keys and stable replay results. Do not claim double-click prevention proves exactly-once distributed effects.
3. **Cross-service approval:** Finance approval, activity creation, report approval and notification need consistent resumable operation identity/outbox semantics. A 503 after one upstream step must not duplicate publication, finance changes or final decisions on retry.
4. **Permissions:** generic report reviewer helper currently includes ADMIN. The target product separates SA decision authority from System Admin. Agree/enforce this at the API, including rejected-report paths and scope, and expose decision capabilities in reads. FE hiding is not the enforcement boundary.
5. **Query:** add explicit reportType filter (separate from exact tag) and stable pagination/snapshot ordering, with total for the selected filters. A report inbox must not silently drop activity-tagged rows. Current FE reads all server pages when filtering a type and rejects known count/duplicate-page drift.
6. **Full audit history:** ReportResponse exposes lifecycle dates and feedback, not all audit events. A full report audit trail/actor history needs an explicit authorized projection; do not label feedback alone as complete backend audit.

These are contract TODOs, not implemented BE changes. Keep current raw-XP proposal separate: [activity-action-staffing contract](../../../fptu-xperience-clubhub-ui/docs/contracts/activity-action-staffing-api.md).

## Acceptance

- Two independent SA accounts approve/reject the same version; stale actor receives 409 and current state, with no duplicate upstream mutation.
- Same idempotency key and body replays original receipt; changed body/key misuse cannot create a second outcome.
- ADMIN-only, self author, cross-club/campus and expired credentials cannot decide or download unauthorized files.
- Uploaded PDF preview, original file and each attachment all use bearer-authenticated requests; blob URLs are revoked on close/navigation.
- Failed write keeps dialog/feedback and does not show success. Approved/rejected response is checked before refreshing the inbox; CLB sees the same server state/feedback.
- Submitted and Awaiting Finance are readable but cannot be skipped into final approval from Admin.
- Activity type filtering includes tags containing activity IDs, across all pages; changing semester resets page; unavailable semester catalog does not block reading all-period reports.

Validation so far: unit/injected-client tests and browser fixture; no real review, finance approval, account change or publication has been executed by this task.
