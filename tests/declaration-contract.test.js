import test from 'node:test';
import assert from 'node:assert/strict';
import { mapDeclaration, declarationReview } from '../src/utils/declaration-contract.js';

test('versioned canonical declaration is displayed without fabricating a score or public evidence URL', () => {
  const mapped = mapDeclaration({
    id: 'c1',
    userId: 8,
    title: 'Project',
    status: 'REVISION_REQUESTED',
    rawPoints: 0,
    evidenceRefs: ['private-id'],
    proposedAttributes: { pillarWeights: [{ pillar: 'Research', weight: 1 }] },
  });
  assert.equal(mapped.activityName, 'Project');
  assert.equal(mapped.status, 'NEED_CLARIFICATION');
  assert.equal(mapped.awardedScore, null);
  assert.deepEqual(mapped.evidenceUrls, []);
  assert.deepEqual(mapped.evidenceRefs, ['private-id']);
});

test('canonical review carries server version and verified attributes; revision/reject do not award', () => {
  const row = { version: 'v1' },
    attributes = {
      tier: 'T2',
      role: 'Participant',
      scale: 'Club',
      result: 'None',
      pillarWeights: [{ pillar: 'Research', weight: 1 }],
    };
  assert.deepEqual(declarationReview(row, 'APPROVED', 'Checked evidence', attributes), {
    decision: 'APPROVE',
    expectedVersion: 'v1',
    reason: 'Checked evidence',
    verifiedAttributes: attributes,
  });
  assert.equal(
    declarationReview(row, 'NEED_CLARIFICATION', 'Clarify source').decision,
    'REQUEST_REVISION',
  );
  assert.equal(
    Object.hasOwn(declarationReview(row, 'REJECTED', 'Invalid'), 'verifiedAttributes'),
    false,
  );
  assert.throws(() => declarationReview(row, 'APPROVED', 'Check'));
});
