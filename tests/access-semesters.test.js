import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccessPath, defaultPathFor, workspaceRoleFor } from '../src/utils/access.js';
import { mapSemesterOptions, selectAvailableSemester } from '../src/utils/semesters.js';

test('CTSV cannot access admin URLs; admin aliases can access both workspaces', () => {
  const staff = { roles: ['STUDENT_AFFAIRS_ADMIN'] };
  assert.equal(canAccessPath(staff, '/admin/accounts'), false);
  assert.equal(canAccessPath(staff, '/ctsv/clubs'), true);
  for (const role of ['ADMIN', 'SYSTEM_ADMIN']) {
    const user = { roles: [role] };
    assert.equal(canAccessPath(user, '/admin/accounts'), true);
    assert.equal(canAccessPath(user, '/ctsv/clubs'), true);
    assert.equal(defaultPathFor(user), '/admin/accounts');
    assert.equal(workspaceRoleFor(user, '/ctsv/clubs'), 'STUDENT_AFFAIRS_ADMIN');
  }
});

test('missing and student-only claims never grant an admin workspace', () => {
  for (const user of [null, {}, { roles: [] }, { roles: ['CLUB_MEMBER'] }, { roles: 'ADMIN' }]) {
    assert.equal(canAccessPath(user, '/admin/accounts'), false);
    assert.equal(canAccessPath(user, '/ctsv/clubs'), false);
    assert.equal(workspaceRoleFor(user, '/admin/accounts'), null);
  }
});

test('semester options use remote codes and preserve only available selections', () => {
  const options = mapSemesterOptions({
    items: [
      { semesterCode: 'FA26', label: 'Fall 2026' },
      { semesterCode: 'SP27' },
      { semesterCode: 'FA26' },
      {},
    ],
  });
  assert.deepEqual(
    options.map((item) => item.id),
    ['FA26', 'SP27'],
  );
  assert.equal(selectAvailableSemester(options, 'SP27', 'FA26'), 'SP27');
  assert.equal(selectAvailableSemester(options, 'FALL2026', 'FA26'), 'FA26');
  assert.equal(selectAvailableSemester([], 'FALL2026', 'FA26'), '');
});
