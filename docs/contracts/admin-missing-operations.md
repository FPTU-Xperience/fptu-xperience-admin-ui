# Remaining authoritative Admin operations

Updated 2026-10-20. **Backend contracts remain missing/partial; JS simulation is now enabled explicitly at the user's request.** No endpoint below is implicitly implemented by this UI change.

The older disabled preparation screens have been replaced by labeled, in-memory workflows. They call no invented endpoints and never serve as a fallback for a failed API request. Real writes still require the contracts below. See [current navigation and simulation boundaries](../admin-workflows-2026-10-20.md).

| Current tab | Present JS simulation | Authoritative capability still required |
| --- | --- | --- |
| `/ctsv/semesters?view=students` | XLSX parsing, validation, preview, omissions, reasoned commit into the mock semester | Server roster, identity reconciliation, preview/commit/result/versioning, official enrollment source. O-04. |
| `/ctsv/semesters?view=rollover` | Preview, explicit confirmation, progress, injected failure/retry, leadership handling, zeroed target balances and preserved source history | Idempotent server job, locks, durable receipts/retry, semester eligibility, inactivity counters and transaction boundaries. FR-028–035. |
| `/ctsv/clubs?view=leadership` | Nomination including nonmembers; explicitly simulated acceptance/decline before membership/office/reactivation | Verified nominee consent, eligibility, acting vice/office history and atomic changes. O-05/O-09. Ordinary transfer/disband requests retain existing API review. |
| `/ctsv/clubs?view=bonus` | Grant/allocation/refund of raw bonus, reason and source history | Durable period balances, versioned allocations, source ledger and exactly-once refunds. O-07. This is not FinanceService money. |
| `/ctsv/activities?view=school` | CTSV-owned planning/publication without club approval; explicit independent reviewer simulation for closing | School activity ownership/capabilities, raw budget, participant/session/action sources, independent review and durable history. FR-011. |
| `/ctsv/activities?view=club&source=mock` | Plan review/revision/rejection, separate publication, evidence quantities, generated closing snapshot, second approval and local raw ledger | Canonical action/staffing rules, versioned plan/closing review, evidence privacy, candidates and authoritative ledger posting/retries. |
| `/ctsv/monitoring?view=anomalies&source=mock` and `view=reconciliation` | Append-only simulated corrections, reverse/adjust/keep, source-to-ledger trace | Full server reconciliation/paging, raw-to-credit conversion, authorized decisions and durable correction receipts. Existing GET contribution lookup stays separate. |
| `/ctsv/clubs/:clubId` | Dedicated API profile with scoped reports/requests; isolated mock activity/leadership/bonus scenario | Existing club GET/PUT, member listing and report/request operations are reused. Mock scenario identity is not a real budget, membership or office record. |

## System role migration

The role/account UX now uses only `SYSTEM_ADMIN`, `STUDENT_AFFAIR`, `STUDENT`, with no cross-workspace UI access. CTSV creation is explicitly Mock JS by default until the backend accepts the canonical role. API mode never silently falls back. Required enum/data/token/policy/creation changes are tracked in [system-roles-admin-accounts](system-roles-admin-accounts.md). Client guards do not implement server authorization.

## Acceptance boundary

### Personal self-declared experience and club reference — 2026-10-21

Navigation/inbox/review now use **Trải nghiệm tự khai** and **Xperience Point**. ClubHub's new personal-experience page reads own reports/records and submits direct external experience with private evidence using declared APIs. Optional reference through an affiliated club still requires distinct referral fields/states, membership validation, a club endorsement audit and forwarding to final CTSV review. Existing external-declaration `ClubId` is not that reference and is rejected by the canonical bridge. See [current ClubHub contract](../../../fptu-xperience-clubhub-ui/docs/contracts/personal-experience-api.md). The UI discloses the missing branch and does not synthesize endorsement.

### XP report extension — 2026-10-21

The activity simulator adds explicit autofill from evidence, draft row editing with reasons, student/action summaries and change records, and frozen closing snapshots. Settlement uses reviewed snapshot values; later corrections preserve originals. The existing report API has no XP rows/edit DTO. Required authoritative DTOs, permissions, versioning and posting are specified in [activity-xp-report](activity-xp-report.md); the UI's XP tab exposes this boundary.

Mock state is React memory scoped by authenticated actor and semester. Refresh/logout resets it; switching semesters keeps separate mock scopes for the current session. No mock record is sent to the backend or persisted in localStorage/sessionStorage. Fixture numeric points are not policy defaults. Imported XLSX data remains on the browser and does not assert official enrollment.

Plan approval and publication never award points. Only closing approval posts local raw ledger entries. Simulated corrections preserve originals and append deltas. Rollover locks source/destination while running or awaiting retry, refuses to overwrite target business data, preserves an imported target roster and keeps source history. These are simulator invariants, not proof of backend guarantees.

## Dependencies and required contracts

- [Product baseline](../../../fptu-xperience-doc/documents/final-product-baseline.md), [SRS](../../../capstone-documents/report/draft/Report3_SRS_Draft_FPTU_Xperience.md), [open decisions](../../../capstone-documents/report/draft/artifact.md).
- Reuse/extend existing [student roster contract](../../../fptu-xperience-clubhub-ui/docs/contracts/semester-student-roster-api.md) and [workspace semester context](../../../fptu-xperience-clubhub-ui/docs/contracts/workspace-semester-context-api.md); do not expose Admin-only student directories to BOD as a shortcut.
- [Action proposal 16/10](../../../fptu-xperience-doc/feature-requests/activity-action-xp-approval-proposal.md) supersedes immediate activity credit for that new action flow; [action/staffing contract](../../../fptu-xperience-clubhub-ui/docs/contracts/activity-action-staffing-api.md) remains active.
- Declaration referral and SA final raw/category editing remain a separate contract gap. Session contributions/assigned verification are not a replacement for in-club self-declaration referral.
- Raw budget/bonus is not FinanceService money or the removed Bonus Matrix page. No requirement here reintroduces “Hệ số cộng điểm”.

Before activating a write: agree canonical IDs/semester/statuses, DTOs, eligibility, permission/capabilities, expectedVersion, idempotency/receipt/retry behavior, private evidence and history projections; implement BE validation and focused tests; then wire the screen and test against ClubHub with two actors. Unknown numeric rules remain open, not frontend defaults.
