# Admin XP report verification — 2026-10-21

Scope: isolated JS activity workflow and the explicit missing-contract state in API report detail. Existing worktree changes were retained. No commit, push, backend deployment or official XP write was performed.

- `node --test --test-isolation=none tests/*.test.js`: 54 passed. The normal isolated Node runner could not spawn its test subprocess inside the sandbox; the documented non-isolated runner passed.
- `npm run build`: passed; existing large-chunk warning remains.
- `npm run test:ui`: passed canonical route/role/error/interaction checks and responsive geometry at 320/375/414/768/1280. The focused interaction rerun also passed after final XP total/action selection changes.
- XP browser journey: add second action → approve plan → record evidence for two students/actions → autofill 13 raw points → edit one row to reduce total to 8 → autofill preserves edit → aggregate/filter/history → submit immutable snapshot → independent second approval posts 8. No mock API writes.
- Visual inspection: `.qa/baseline/xp-report-edit-1280.png`, `xp-report-changes-1280.png`, `xp-report-changes-375.png`. The change list wraps controls and scrolls wide tables internally on mobile.
- `git diff --check`: passed for Admin and documentation repositories.
- Central `python scripts/sync-admin-audit-docs.py --check`: passed after refreshing six snapshots/manifest. New XP contract also copied to central `docs/contracts/activity-xp-report.md` and linked from its README/status page.
- Optional `node scripts/audit-admin-pages.mjs`: unavailable because its existing cross-repository import `fptu-xperience-clubhub-ui/scripts/source-route-inventory.mjs` is missing. No source inventory success is claimed.

These results prove frontend behavior against browser fixtures and local workflow transitions only. Backend capabilities, durable history, independent reviewer identity and atomic settlement still require the [XP report contract](../contracts/activity-xp-report.md).
