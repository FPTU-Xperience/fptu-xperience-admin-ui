# Remaining Admin operations and page availability

Status: **NOT YET / screens present, authoritative workflows missing**. Updated 2026-10-19.

No endpoint in this file is implicitly declared implemented. The new screens intentionally call no guessed roster, rollover, bonus, global-activity or action-settlement endpoints. Their write controls remain unavailable until the relevant contract is agreed and implemented.

| Admin route | Present UI | Authoritative capability still required |
| --- | --- | --- |
| `/ctsv/student-roster` | Local .xlsx draft preparation, row validation, duplicate-code/email detection, paging and template. No upload to API or persistence. | Server roster read, import preview/commit/results, identifier reconciliation, additions/omissions, carry-forward provenance; semester and actor scope. O-04. |
| `/ctsv/rollover` | Semester source/target preparation and visible operation sequence; no execution. | Idempotent preview/job/start/status/retry and action log; reset period balances, preserve lifetime/history, inactivity counters and succession. FR-028–035. |
| `/ctsv/leadership` | Emergency nomination/acceptance journey described separately from ordinary transfer. | Active-roster search including nonmembers, office history/acting vice/promotion, paused clubs, nominee consent, atomic membership/office/reactivation. O-05/O-09. |
| `/ctsv/club-bonuses` | Raw-bonus grant/allocation/refund scope and unavailable action. | Server balances, grant reason/period, approved-activity allocation, source ledger, refunds exactly once, SA inspection. O-07. |
| `/ctsv/global-activities` | Dedicated school-activity entry, no substitution with a club or quest. | SA-owned activities without mandatory clubId, raw budget, publication, participant/session/action sources and authorized history. FR-011. |
| `/ctsv/activity-dossiers` | Separate entry for two approval gates; links to existing report review. | Plan queue/detail/versioned three-way review; snapshot/action rules/staffing; closing report/candidate award snapshot/second SA approval/ledger posting state/retry. |
| `/ctsv/experience-audit` | Authorized contribution ID lookup, decisions and ledger effects through existing GET `/api/contributions/{id}`. | Global reconciliation of roster/jobs/raw→credited/corrections with server paging, filters and drill-down; not satisfied by one source lookup. |

## UI acceptance boundary

The roster draft schema (`studentCode,fullName,email`) is explicitly preparatory, not the official server import contract. Local checks do not assert active enrollment, detect database omissions or reconcile identities. No student record is persisted in localStorage or transmitted. Changing actor/semester clears the draft. File type/size/row limits apply before preview; the final authoritative format and upload timing remain O-04.

Adding semester metadata does not run rollover. Selecting a target semester in the preparation screen does not simulate an executed preview. Missing histories and balances are not rendered as zeroes or fixture successes.

## Dependencies and required contracts

- [Product baseline](../../../fptu-xperience-doc/documents/final-product-baseline.md), [SRS](../../../capstone-documents/report/draft/Report3_SRS_Draft_FPTU_Xperience.md), [open decisions](../../../capstone-documents/report/draft/artifact.md).
- Reuse/extend existing [student roster contract](../../../fptu-xperience-clubhub-ui/docs/contracts/semester-student-roster-api.md) and [workspace semester context](../../../fptu-xperience-clubhub-ui/docs/contracts/workspace-semester-context-api.md); do not expose Admin-only student directories to BOD as a shortcut.
- [Action proposal 16/10](../../../fptu-xperience-doc/feature-requests/activity-action-xp-approval-proposal.md) supersedes immediate activity credit for that new action flow; [action/staffing contract](../../../fptu-xperience-clubhub-ui/docs/contracts/activity-action-staffing-api.md) remains active.
- Declaration referral and SA final raw/category editing remain a separate contract gap. Session contributions/assigned verification are not a replacement for in-club self-declaration referral.
- Raw budget/bonus is not FinanceService money or the removed Bonus Matrix page. No requirement here reintroduces “Hệ số cộng điểm”.

Before activating a write: agree canonical IDs/semester/statuses, DTOs, eligibility, permission/capabilities, expectedVersion, idempotency/receipt/retry behavior, private evidence and history projections; implement BE validation and focused tests; then wire the screen and test against ClubHub with two actors. Unknown numeric rules remain open, not frontend defaults.


### XP report extension — 2026-10-21

The activity simulator adds explicit autofill from evidence, draft row editing with reasons, student/action summaries and change records, and frozen closing snapshots. Settlement uses reviewed snapshot values; later corrections preserve originals. The existing report API has no XP rows/edit DTO. Required authoritative DTOs, permissions, versioning and posting are specified in [activity-xp-report](activity-xp-report.md); the UI's XP tab exposes this boundary.
