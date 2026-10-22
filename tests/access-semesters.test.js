import {
  ROLE_IDS,
  normalizeSystemRole,
  normalizeActor,
  systemRolesFor,
} from '../src/utils/roles.js';
import { canReviewMock } from '../src/workflows/workflow-model.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccessPath, defaultPathFor, workspaceRoleFor } from '../src/utils/access.js';
import { mapSemesterOptions, selectAvailableSemester } from '../src/utils/semesters.js';

test('CTSV cannot access admin URLs; admin aliases are isolated from CTSV URLs', () => {
  const staff = { roles: ['STUDENT_AFFAIR'] };
  assert.equal(canAccessPath(staff, '/admin/accounts'), false);
  assert.equal(canAccessPath(staff, '/ctsv/clubs'), true);
  for (const role of ['ADMIN', 'SYSTEM_ADMIN']) {
    const user = { roles: [role] };
    assert.equal(canAccessPath(user, '/admin/accounts'), true);
    assert.equal(canAccessPath(user, '/ctsv/clubs'), false);
    assert.equal(defaultPathFor(user), '/admin/accounts');
    assert.equal(workspaceRoleFor(user, '/ctsv/clubs'), 'SYSTEM_ADMIN');
  }
});

test('missing and student-only claims never grant an admin workspace', () => {
  for (const user of [null, {}, { roles: [] }, { roles: ['STUDENT'] }, { roles: 'SYSTEM_ADMIN' }]) {
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

test('only three canonical system roles exist; legacy club roles normalize to students without management authority', () => {
  assert.deepEqual(Object.values(ROLE_IDS), ['SYSTEM_ADMIN', 'STUDENT_AFFAIR', 'STUDENT']);
  assert.equal(normalizeSystemRole('CLUB_MANAGER'), 'STUDENT');
  assert.equal(normalizeSystemRole('CLUB_MEMBER'), 'STUDENT');
  assert.deepEqual(systemRolesFor({ roles: ['STUDENT', 'CLUB_MANAGER', 'CLUB_MEMBER'] }), [
    'STUDENT',
  ]);
  for (const role of ['STUDENT', 'CLUB_MANAGER', 'CLUB_MEMBER', 'TREASURER']) {
    assert.equal(canAccessPath({ roles: [role] }, '/ctsv/clubs'), false);
    assert.equal(canReviewMock({ roles: [role] }), false);
  }
  assert.equal(normalizeSystemRole('__proto__'), null);
  assert.equal(normalizeSystemRole('constructor'), null);
  assert.deepEqual(normalizeActor({ id: 1, roles: ['ADMIN'] }).roles, ['SYSTEM_ADMIN']);
});
test('mixed administrative claims do not let a system admin enter CTSV or review mock business decisions', () => {
  const actor = { roles: ['SYSTEM_ADMIN', 'STUDENT_AFFAIR'] };
  assert.equal(canAccessPath(actor, '/admin/accounts'), true);
  assert.equal(canAccessPath(actor, '/ctsv/work'), false);
  assert.equal(canReviewMock(actor), false);
});
