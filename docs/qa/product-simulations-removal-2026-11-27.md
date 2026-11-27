# Product simulation removal — 27 November 2026

## Result

Removed the in-product workflow simulator, its fictional data, state provider, commands and UI components. The work inbox now contains only API-backed records. CTSV account creation always calls the backend; it cannot fabricate an account in browser state.

Removed navigation entries for simulated rollover, global leadership, raw bonus and school activities. Removed source switches and simulation shortcuts from activity review, reconciliation, anomalies, club details and report details. Existing simulator URLs fall back to supported views; legacy source/record parameters cannot enable a simulator. Real club vice-president review and transfer-request handling remain available in club details.

Removed the unused seed-backed anomalies facade. Existing anomaly reads continue through the real student-affairs API. Seed data and local validation examples used by isolated tests are located under `tests/fixtures`, outside the application source graph.

Removed the Demo option from policy creation; new policy requests use the existing PROJECT environment. Existing policy-version history is retained.

These removals do not implement rollover, emergency succession, raw funding or settlement gaps.

## Verification

- Baseline before removal: 130 Node tests passed.
- After removal: 115 Node tests passed, zero failures or skips. Removed tests exercised deleted simulator behavior; retained inbox/navigation tests exercise production code.
- Production build passed. Checked generated JavaScript for the removed simulator's identifying strings; none were present.
- Browser fixtures on `http://localhost:5173`: club formation, governance and list state passed at desktop/mobile sizes.
- Account-table browser checks passed, including backend creation failure/retry and absence of a mock-account creation option.
- Product-boundary browser checks passed for ten current/stale routes, API-only inbox, API failure visibility and preserved real club leadership.

Browser checks use isolated API fixtures, not real student/CTSV acceptance or deployed-site verification. Local linked dependencies caused font serving warnings in the fixture server; these do not establish deployed font behavior.

Backend checks are tracked separately in `E:/FPTU-Xperience/TestResults`. Full SQL Server acceptance requires an available test SQL Server; this machine lacks the LocalDB instance expected by SQL-only tests. No production data was changed.
