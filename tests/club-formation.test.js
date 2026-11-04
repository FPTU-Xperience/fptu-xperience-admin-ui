import test from 'node:test';
import assert from 'node:assert/strict';
import { mapFormationApplications, formationReviewBody } from '../src/utils/club-formation.js';
const version = '11111111-1111-4111-8111-111111111111';
test('formation queue maps the real request fields and all persisted statuses', () => {
  const [pending, revision] = mapFormationApplications([
    {
      id: 4,
      name: 'Club',
      code: 'CLB',
      status: 'Submitted',
      requesterName: 'Full Name',
      requesterUserId: 100,
      foundingMemberCount: 15,
      purpose: 'Purpose',
      mainActivities: 'Workshops',
      submittedAtUtc: '2026-11-04T00:00:00Z',
      campusCode: 'HCM',
      version,
    },
    { id: 5, status: 'NeedsRevision' },
  ]);
  assert.equal(pending.status, 'pending');
  assert.equal(pending.applicant, 'Full Name');
  assert.equal(pending.members, 15);
  assert.equal(pending.plan, 'Workshops');
  assert.equal(pending.submitted, '2026-11-04T00:00:00Z');
  assert.equal(pending.code, 'CLB');
  assert.equal(pending.campusCode, 'HCM');
  assert.equal(revision.status, 'revision');
  assert.throws(() => mapFormationApplications([{ id: 4, status: 'pending' }]));
});
test('formation review carries current version and explicit chosen manager', () => {
  assert.deepEqual(formationReviewBody({ version }, '  Approved club  ', '200'), {
    expectedVersion: version,
    note: 'Approved club',
    managerUserId: 200,
  });
  assert.deepEqual(formationReviewBody({ version }, 'Needs correction', null), {
    expectedVersion: version,
    note: 'Needs correction',
  });
  for (const args of [
    [{}, 'Approved club', '200'],
    [{ version }, 'bad', '200'],
    [{ version }, 'Approved club', ''],
  ])
    assert.throws(() => formationReviewBody(...args));
});
