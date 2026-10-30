import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveGuideSteps } from '../src/components/guided-help/guide-model.js';
import { adminGuidePlan } from '../src/components/guided-help/guide-plans.js';

test('only current-role guide steps are included and unavailable DOM targets are skipped', () => {
  const staff = adminGuidePlan('/ctsv/work', 'STUDENT_AFFAIR');
  const admin = adminGuidePlan('/admin/accounts', 'SYSTEM_ADMIN');
  assert.ok(staff.some((item) => item.element === '.context-bar-field'));
  assert.ok(!admin.some((item) => item.element === '.context-bar-field'));
  assert.equal(
    resolveGuideSteps(
      admin,
      () => [],
      () => true,
    ).length,
    1,
  );
  const target = {};
  const resolved = resolveGuideSteps(
    staff,
    (selector) => (selector === '.work-inbox-filters' ? [target] : []),
    () => true,
  );
  assert.equal(resolved.length, 2);
  assert.equal(resolved[1].element, target);
  assert.equal(
    staff.find((item) => item.element === '.work-inbox-filters').element,
    '.work-inbox-filters',
  );
});
