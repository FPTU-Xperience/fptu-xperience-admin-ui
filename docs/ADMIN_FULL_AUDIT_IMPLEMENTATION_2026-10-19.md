# Full Admin audit and missing-page implementation — 2026-10-19

This follow-up implements the user's priority: a real report inbox/read/review surface for CLB reports and activity proposals, then the missing Admin entries. It includes the subsequent request to remove the complete Bonus Matrix / “Hệ số cộng điểm” feature.

## Result and scope

- **24 navigation pages + one report detail route**, all registered with guards; 9 new navigation entries, a new report detail screen, and replacement of the old `/ctsv/reports` Engagement alias.
- **15 operations used by the new connected screens have matching BE declarations**, including the club-directory filter, checked by the bounded source extractor. DTO/state handling was manually inspected; this is not deployment acceptance.
- Bonus Matrix component, route, navigation entry, API namespace and active UI links removed. Historical audit evidence is retained with removal status, not reactivated.
- Existing unrelated local changes were preserved. No commit/push, backend logic change, migration, live review or production mutation.

## Implemented pages versus remaining backend gaps

| Route | Result | Current boundary |
| --- | --- | --- |
| `/ctsv/reports` | Report inbox: club/status/period/type filters, paging, error/empty/retry, current semester or all periods. | Type filtering traverses server pages because BE has exact tag only; catalog failure falls back explicitly to all periods, not fake data. |
| `/ctsv/reports/:reportId` | Structured content, authenticated PDF preview, original/attachment download, lifecycle dates, feedback, SA approve/reject confirmation. | Pre-read version is not atomic concurrency; legacy report DTO/idempotency hardening remains. Feedback is not the complete audit-event log. |
| `/ctsv/activity-approvals` | Dedicated FUTURE_EVENT review inbox using existing report resources. | Current BE approval couples money finance and activity creation. This is not action/raw-XP approval or completion settlement. |
| `/ctsv/club-requests` | Disband and ordinary owner-transfer list/detail/approve/reject, required adminNote, result validation and error preservation. | No new expectedVersion protocol in BE; emergency nomination is a separate unavailable flow. |
| `/ctsv/experience-audit` | Contribution ID lookup, source identity/raw points, decision history and ledger effects from authorized API. | Not a complete systemwide roster/wallet/rollover reconciliation page. |
| `/ctsv/student-roster` | Local Excel draft/template/row errors/duplicate identity/paging; clears on actor or semester change. | Official read/import/preview/commit/carry-forward API absent; save disabled; local preview does not establish enrollment. |
| `/ctsv/activity-dossiers` | Dedicated two-gate action/settlement page with links to existing proposal/report inbox. | Queue, plan review, candidate settlement and posting BE missing; action unavailable. |
| `/ctsv/rollover` | Source/target semester preparation and workflow. | No authoritative job/impact preview/status/retry API; execution unavailable. |
| `/ctsv/leadership` | Separate emergency succession/reactivation entry. | No authoritative active-roster nomination/consent/reactivation operations. |
| `/ctsv/club-bonuses` | Separate raw-bonus operation entry. | No authoritative grant/allocation/refund balances/ledger; writes unavailable. |
| `/ctsv/global-activities` | Dedicated school-activity entry. | No SA-owned club-independent activity/budget flow; creation unavailable. |

New decision controls require independent `STUDENT_AFFAIRS_ADMIN`; ADMIN-only is read-only on the new screens. Existing older guards/reviewer permissions remain a separate gap; the task does not claim to fix all backend authorization by hiding buttons.

## Full-audit findings still open

The [initial 15-group audit](ADMIN_DOCUMENT_CLUBHUB_FLOW_AUDIT_2026-10-19.md) remains the before-state evidence. This table updates its implementation status:

| Finding | Current disposition |
| --- | --- |
| A01 roster | Page/local preparation added; authoritative workflow not implemented. |
| A02 rollover/leadership/pause/refund | Dedicated pages added; BE/lifecycle flow not implemented. |
| A03 activity approval | Existing FUTURE_EVENT flow integrated; action-dossier gate, global activity and correct unpublish remain gaps. |
| A04 settlement | Clear dedicated entry; generic report/PDF is not action settlement. |
| A05 scoring model | Still open: old benchmark categories/weights/bonusCap differ from canonical contribution categories and target coefficient/T7 model. Existing snapshot versioning retained. |
| A06 semester | New report filters bind to header/reset page and preserve all-period reading on catalog failure; older declaration/rubric/anomaly/engagement scoping remains open. |
| A07 authority | New writes require CTSV and report non-author; older ADMIN→CTSV presentation and BE reviewer policies remain open. |
| A08 declaration | Outside declaration submit/review exists; in-club referral/final raw/category/source feedback journey still incomplete. |
| A09 raw bonus/wallet | Dedicated page, still BE gap. Bonus Matrix removed at user request and is not a dependency. |
| A10 club applications | Disband/ordinary transfer screens integrated; establishment revision/V2 entrypoint and office-history acceptance remain open. |
| A11 anomaly/correction | Contribution lookup added; anomaly decision writer remains disabled; no local ledger substitution. |
| A12 metrics | High/low still both use membership; user directory is first 500. Correction: current GET `/api/clubs` and establishment applications return arrays and do not honor the FE's page/pageSize arguments; it was inaccurate to infer truncation of these two lists only from those arguments. They still are not semester-active-roster aggregate metrics. |
| A13 account import | Existing per-row create loop still loses runtime errors and may overstate toast success; not conflated with roster. |
| A14 health/settings | Service badge based on URL presence and silent settings-load failure remain open. |
| A15 audit | Source-level lookup added; global operation/policy/raw-credit/rollover reconciliation remains open. |

Additional BE observation: legacy student-affairs anomaly/XP-ledger reads call a default-seeding helper. They must not be presented as proven real student contribution history. The new reconciliation page uses authorized `/api/contributions/{id}` instead. Source read is not approval of the seed behavior or live-data accuracy.

## Contracts

- [Report and club review hardening](contracts/admin-report-review-hardening.md): current URLs/DTOs/states, stale-view preflight limits, server idempotency/concurrency/query/audit TODOs.
- [Remaining operation contracts](contracts/admin-missing-operations.md): unavailable operations, local roster draft boundary, canonical dependencies and acceptance before activation.
- Existing ClubHub action, roster and semester contracts remain active. No guessed endpoint is called merely to populate an otherwise empty page.

## Validation

Final executed results are recorded after the last code change. Browser fixture uses the real UI components with a replaced API module and **never contacts the real API**. Its mutations are synthetic only.

| Check | Evidence / result |
| --- | --- |
| Route and declaration audit | `node scripts/audit-admin-pages.mjs`: 24/24 navigation routes registered, report detail present, 15/15 declared BE operations, zero unresolved handled receivers, no removed-feature source references. [Inventory](qa/admin-page-inventory-2026-10-19.md). |
| Unit/client tests | `node --test --test-isolation=none tests/*.test.js`: **34 passed, 0 failed**. Covers DTOs, state/actor/self-review gates, stale preflight, failed writes, acknowledgement validation, all-page type filtering, malformed responses, unsafe links, local roster identity validation and real XLSX parsing. |
| Production build | `npm run build`: **passed**, 2551 transformed modules, 21.91s; existing large-bundle warnings remain. |
| Desktop browser | All 18 CTSV and 6 System Admin routes navigated at 1280px, expected heading present and scrollWidth <= clientWidth. Empty/sample fixture data is not CRUD/live acceptance for old modules. |
| Mobile browser | New operation pages at 320px, report list/detail/modal at 320px; no horizontal page overflow. Header semester select remains in header; removed feature absent. |
| Report behavior fixture | Pagination, semester reset, all-status/type/club filtering; structured content, safe evidence links, PDF iframe; approve/reject updates feedback/status; failed save retains dialog/draft and no success toast; ADMIN-only sees no SA approval button; list error/retry; catalog error still permits all-period report reading. |
| Club request fixture | Read disband/transfer details, reject/approve with adminNote and explicit consequences; pending item disappears only after acknowledged result. |
| Reconciliation fixture | Source ID lookup, raw value and policy/effect history rendered. |
| Cross-repo source/contract checks | Source inventory regenerated: 285 declarations / 269 public declarations, 307 literal references, 22 unmatched literals requiring contextual review. ClubHub contract checker: 39 files, 322 links and 36 JSON examples valid. Admin contract/audit local links checked; tracked whitespace and fixture syntax checks passed. |

Earlier fixture and hot-reload errors occurred while fixture namespaces/files were being edited; the corrected fixture was reloaded and route navigation repeated. Historical console entries are not counted as current production defects or evidence of a clean log history.

No screenshot/fixture, build, source declaration match or unit test proves Gateway identity, DB migrations, finance/activity cross-service atomicity, report/club concurrent review, real file ownership or ClubHub refresh across separate accounts. These require controlled service/live acceptance from the contracts. GitNexus runner/tool was unavailable; no BE edit or graph verdict is claimed.
