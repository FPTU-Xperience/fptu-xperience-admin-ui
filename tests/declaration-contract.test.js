import test from 'node:test';
import assert from 'node:assert/strict';
import { mapDeclaration, declarationReview } from '../src/utils/declaration-contract.js';

test('club referrals show their actual stage and cannot be finalized before forwarding', () => {
  const source = {
    referringClubId: 7,
    status: 'SUBMITTED',
    clubReviewStatus: 'PENDING',
    ctsvSubmissionStatus: 'NOT_SUBMITTED',
    version: 'current-server-version',
  };
  assert.equal(mapDeclaration(source).canFinalReview, false);
  const forwarded = mapDeclaration({
    ...source,
    clubReviewStatus: 'APPROVED',
    ctsvSubmissionStatus: 'SUBMITTED',
    capabilities: { canFinalReview: true },
    clubReviewReason: 'Verified at club',
    clubReviewedBy: 10,
    ctsvSubmittedBy: 11,
  });
  assert.equal(forwarded.canFinalReview, true);
  assert.match(forwarded.referenceLabel, /#7/);
  assert.equal(forwarded.clubReviewReason, 'Verified at club');
  assert.match(forwarded.referenceStateLabel, /chuyển CTSV/);
  assert.equal(
    mapDeclaration({ ...source, capabilities: { canFinalReview: false } }).canFinalReview,
    false,
  );
});

test('historical declarations cannot receive decisions or display a preview as ledger XP', () => {
  const pending = mapDeclaration({ status: 'Submitted', sourceNamespace: 'LEGACY_DECLARATION', isAuthoritative: false, canUpgradeLegacy: true });
  assert.equal(pending.canFinalReview, false);
  assert.throws(() => declarationReview(pending, 'APPROVED', 'Historical record'));
  assert.equal(mapDeclaration({ status: 'Approved', isAuthoritative: false, rawPoints: 42 }).awardedScore, null);
});

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
