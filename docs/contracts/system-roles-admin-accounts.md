# System roles and Admin account scope

2026-10-20. Frontend implemented; backend migration pending. No backend files were changed by this UI task.

## Canonical model

| System role | Responsibility |
| --- | --- |
| `SYSTEM_ADMIN` | Account status lookup, CTSV account creation, system configuration, operations and audit |
| `STUDENT_AFFAIR` | CTSV workspace and its business decisions |
| `STUDENT` | Student actor; club capabilities require separate membership/office conditions |

`CLUB_MANAGER`, `CLUB_MEMBER`, vice-manager and treasurer describe club relationships or assignments, not system roles. Do not infer a club manager's global administrative access from those relationships.

The account page exposes only reads/filter/sort and CTSV creation. It does not expose account updates/deletion/locking, Excel import, role assignment or verification assignment. Role documentation is a modal opened from the Accounts tab info icon. Configuration, operations and audit remain available by explicit user instruction.

## Read compatibility

`src/utils/roles.js` normalizes legacy API values when displaying accounts and resolving the authenticated actor: `ADMIN` → `SYSTEM_ADMIN`, `STUDENT_AFFAIRS_ADMIN` → `STUDENT_AFFAIR`, legacy club roles → `STUDENT`. Unknown values grant no role. These aliases are read compatibility only; creation sends the canonical CTSV role. There are exactly three canonical role constants/labels.

Client route guards reject Admin access to `/ctsv/*` and CTSV access to `/admin/*`, including legacy URLs. Mixed Admin/CTSV claims resolve to the Admin workspace; they do not grant CTSV business decisions. This does not modify server policies or sanitize existing JWT claims at the backend.

## Observed backend gap

Inspected local source still declares the old role set in `fptu-xperience-clubhub-api/src/Shared/ClubReportHub.Shared/Auth/AuthConstants.cs`. `AuthService/Endpoints/UserEndpoints.cs` validates creation against `ActorAccountPolicy`, queries the role table and requires exactly one allowed role. The new `STUDENT_AFFAIR` name is not declared by that source. This is source evidence, not a live deployment check.

The creation dialog defaults to **Mock JS**, explicitly stating that no real login access is created. Mock records carry a `MOCK` label, remain only in page memory and disappear on list reload/refresh/logout. API mode remains separate: it sends only username/fullName/email and `roles: ['STUDENT_AFFAIR']`, validates the returned actor and displays failures inline. An API failure never becomes a mock success.

## Required server work before enabling real creation by default

1. Migrate role data, validators, claims and token issuance to the three canonical roles. Resolve existing multi-role accounts explicitly. Preserve historical club relationship data rather than converting offices into global roles.
2. Separate system administration and CTSV policies at gateway and service handlers. `SYSTEM_ADMIN` must not inherit CTSV decision capabilities; `STUDENT_AFFAIR` must not inherit system account administration.
3. Permit only `SYSTEM_ADMIN` to create accounts through this administrative entry, require exactly `STUDENT_AFFAIR`, reject other/multiple roles and enforce normalized identity uniqueness atomically. Return the committed canonical account. Keep other account mutation authorization consistent with the read/create-only product scope.
4. Evaluate club capabilities using authenticated user + club membership/assignment/semester conditions. Do not replace old manager checks with unrestricted `STUDENT` checks.
5. Test direct HTTP requests, old/new JWTs, mixed claims, cross-workspace attempts, duplicate creation and student attempts. Then perform focused live acceptance before changing the UI default from mock to API.

Frontend fixture tests do not prove any of these server changes have happened.
