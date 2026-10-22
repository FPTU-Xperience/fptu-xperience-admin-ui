# Activity Xperience Point report — 2026-10-21

Contract tổng hợp 2026-10-22: [Báo cáo Xperience Point và trải nghiệm tự khai](../../../fptu-xperience-doc/docs/contracts/xperience-report-and-self-declaration-contract.md) — phạm vi Admin/ClubHub, một quyền xử lý CLB, mismatch 403 và backend acceptance.

## Current implementation and scope

The Admin JS workflow now includes a closing Xperience Point report. Available in `#/ctsv/activities?view=club&source=mock`, school simulations, and explicitly initialized scenarios at `#/ctsv/clubs/:clubId?view=activities&source=mock`. All values remain session-only fictional raw points. Refresh/logout discards them; no new network endpoints or official wallet mutations are implemented.

The existing API report detail has an Xperience Point tab explaining the missing data contract. Inspected source: `ReportService/Contracts/ReportContracts.cs`, `ReportResponse`, `ReportDetailResponse`, `ReviewRequest`. They do not include student/action Xperience Point rows or Xperience Point editing. Existing report approval still sends only `{feedback}` and must not be presented as action settlement.

## Workflow

1. Add action rules before plan approval. Each rule carries its category, raw points per completion, estimated completions and budget. Approved rules are locked. Multiple actions can belong to one activity.
2. Record evidence against an active semester student and the selected action. Duplicate student/action evidence is rejected. Evidence alone does not post points.
3. Explicitly autofill the Xperience Point draft from evidence. One row per source contains student, action, quantity, approved unit points, raw total and evidence. No roster-wide participation or attendance is invented.
4. Review individual rows, or aggregate by student/action. Filter both summaries and change records by student/action. Edit quantities and evidence with a reason of at least five characters; raw points are recomputed from the approved rule. Zero completions excludes that row's points while retaining its source/history. This is the requested extension to the earlier narrative-only editing proposal; the final production authorization policy still needs agreement.
5. Autofill again merges newly recorded evidence and preserves reviewed rows. It appends initial-fill history only for new sources. New evidence makes the old draft stale and blocks submission until refreshed. Edits require the activity version, active enrollment and remaining raw budget.
6. Submit a closing report with narrative and a copied Xperience Point snapshot/change history. Plan narrative is preserved. Review state locks Xperience Point edits. Returning the report reopens its draft; resubmission copies a new snapshot.
7. Independent closing approval posts the reviewed snapshot values, with activity/student/action/source identity. It does not recompute from original evidence and cannot post a source twice. Post-approval corrections append ledger deltas and preserve the submitted report and original entries.

The change list records source, student/action, before/after quantities, before/after raw points and evidence, actor, timestamp and reason. The report also exposes ledger awards/adjustments/reversals. The original evidence remains separate from the reviewed Xperience Point draft.

## Required backend contract (proposal, not implemented routes)

Implement in dependency order:

1. Stable semester enrollment, activity/action/completion identities and server capabilities: view, prepare/autofill, edit draft, submit, return, independently approve and correct posted sources. Enforce ownership and prevent self-review on the server; a browser simulator checkbox is not identity evidence.
2. Versioned Xperience Point draft read/autofill. Return `reportId`, `activityId`, `semesterCode`, `version`, `sourceVersion`, `status`, `budgetRaw`, `rows`, `changes`, `capabilities`. Bind rows to stable completion sources; expose safe evidence references with appropriate authorization. Specify treatment of source edits/deletions: the current UI only supports adding evidence and preserving existing source rows.
3. Atomic row edit accepting `sourceId`, `expectedVersion`, `quantity`, evidence reference and reason. Derive student/action/unit points from authoritative sources; never trust arbitrary browser totals. Append before/after history transactionally. Reject stale drafts, invalid enrollment, negative/fractional counts, rule changes and overspending with structured errors.
4. Versioned closing submission freezes narrative, rows, rule/source versions, change history, budget and identity. Return/revision must preserve prior submitted versions. Approval accepts the frozen version and an idempotency key; review plus durable posting/outbox must have defined atomicity and retry receipts.
5. Ledger entries and corrections retain `activityId`, `reportId`, closing version, `actionId`, `studentId`, `sourceId`, `originalId`, signed raw delta, actor/time/reason. Return effective totals separately from the immutable approved snapshot. Define raw-to-official-Xperience Point conversion separately; simulated raw values do not establish that policy.

No URL is assigned here because no authoritative endpoint is declared in the inspected backend. The production adapter must be added only after the DTOs, authorization, concurrency and settlement behavior exist.

## Verification scope

Pure workflow coverage includes multiple actions/students, explicit autofill, retained edits, stale source/version guards, required reason, budget/count checks, return/resubmit, frozen snapshots, posting reviewed amounts once, and immutable post-approval corrections. Browser fixture coverage exercises the same report views, filters, edit dialog, autofill preservation and independent closing approval with responsive geometry. These are frontend/source checks, not authenticated backend or deployment acceptance.
