import test from 'node:test';
import assert from 'node:assert/strict';
import { createImplementedContracts } from '../src/services/implemented-contracts.js';

test('roster preview and commit preserve campus, source version and retry key', async () => {
  const calls = [];
  const client = createImplementedContracts({
    upload: async (...args) => calls.push(args),
    request: async (...args) => calls.push(args),
  });
  const file = new File(['email,studentCode,campusCode,status'], 'roster.csv');
  await client.roster.preview('FA26', file, 'v1', 'HAN');
  assert.equal(calls[0][1].get('expectedRosterVersion'), 'v1');
  assert.deepEqual(calls[0][2], { campusCode: 'HAN' });
  await client.roster.commit(
    'FA26',
    { importId: 'preview', baseVersion: 'v1' },
    'HAN',
    'retry-key',
  );
  assert.deepEqual(calls[1][1].body, { expectedRosterVersion: 'v1' });
  assert.equal(calls[1][1].headers['Idempotency-Key'], 'retry-key');
  assert.throws(
    () => client.roster.preview('FA26', new File(['x'], 'old.xlsx'), 'v1', 'HAN'),
    /CSV/,
  );
});

test('application review sends integer application version and no estimated award payload', async () => {
  let captured;
  const client = createImplementedContracts({
    request: async (...args) => {
      captured = args;
    },
  });
  await client.applications.review(
    { id: 12, version: 3, expectedRawXp: null },
    'APPROVED',
    ' verified ',
    'review-key',
  );
  assert.equal(captured[0], '/api/activity-applications/12/review');
  assert.deepEqual(captured[1].body, {
    expectedVersion: 3,
    decision: 'APPROVED',
    reason: 'verified',
  });
  assert.equal(captured[1].headers['Idempotency-Key'], 'review-key');
});
