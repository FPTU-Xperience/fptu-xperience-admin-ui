# FPTUX Admin final product requirements

Status: target product artifact, 2026-10-02. This document records intended scope, not a claim that the current local/demo UI implements it. Source authority: registration v1.3, the owner-confirmed decisions and Report 3 SRS draft in `capstone-documents`.

## Place in the product

FPTUX Admin web serves **System Admin** and **Student Affair (SA)** for central system information, active-student semester rosters, scoring policy and audit. ClubHub web owns SA's operational review of clubs, activity dossiers, global activities, bonuses and self-declarations. Both web apps and FPTUX Mobile use the authoritative FPTUX API in `fptu-xperience-clubhub-api`. A System Admin account does not automatically inherit an SA decision right or a Club BOD office.

## Required Admin workflows

| Area | Target behavior | SRS |
| --- | --- | --- |
| Active-student roster | SA imports a semester list, previews additions, omissions and identifiers, and receives row-level validation. If SA takes **no new import action**, the API carries the previous roster forward with audit provenance. Exact file schema and timing remain O-04. | FR-028–FR-029 |
| Semester transition | Show current/previous semester, rollover decision, preserved history and reset current-period points, activity availability, raw budgets and club bonus balance. Rollover must be idempotent and expose inactivity/succession effects. | FR-030–FR-035 |
| Scoring policy | Authorized Admin/SA policy operators manage versioned coefficients for the six radar categories and the positive real-world-work threshold. Effective dates/semesters are explicit; new versions do not silently rewrite earlier credited records. | FR-042–FR-048 |
| System management | System Admin manages accounts, access and operational settings under approved role policy, with audit of protected actions. Detailed identity provider and account-lifecycle rules remain O-13. | FR-001; NFR-01–NFR-10 |
| Audit and reconciliation | Inspect roster import/carry-forward provenance, policy versions, raw-versus-credited results, correction links and rollover outcomes within authorized scope. | FR-035–FR-041 |

## Scoring boundary

Six experience categories make the semester radar and the six-category mean/evenness. Real-World Work Experience is a separate seventh point column that contributes only a capped ERI multiplier. The draft expression is `ERI = Depth × (0.5 + 0.5 × J) × W`, with `W = 1 + 0.30 × min(S7 / T7, 1)` and positive versioned threshold `T7`. A coefficient changes how a verified raw award is credited to the student's wallet; it **does not cap an activity's raw-point budget**. Club bonuses and activity budgets remain raw. Full wallet-conversion arithmetic, coefficients, rounding and zero cases require decisions O-01/O-11.

## Authorization and state

- The API verifies every protected operation. A demo actor picker or disabled control is not an authorization boundary.
- The active roster is semester-scoped. A student missing for one semester remains a visible inactive club member; after two consecutive inactive semesters the current membership ends but history remains. Only an active-roster student may be queried for SA emergency-president nomination, including a nonmember.
- ClubHub, not Admin, is the primary SA decision UI for activity dossiers and self-declarations. Admin may show audit/status information but must not imply an independent second approval gate.
- Student experience credits, raw budgets and any legacy finance amounts are distinct values. Admin screens must label them accordingly.

The existing Admin UI README and `docs/INTEGRATION.md` describe a local sample-data design. Club-type XP rubrics, quests, reward shops, leaderboards, anomaly dashboards and automatic external experience sync in that design are **not confirmed core acceptance criteria**. The required API payloads, file schema, numeric quality targets and operational permissions still need review; see O-01–O-14.
