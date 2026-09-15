import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeed, studentXP } from '../src/lib/data.js';
import { resolveAnomaly, validateRubric } from '../src/lib/governance.js';

test('rubric weights must total 100 and scoring values must be valid', () => {
  const rubric = createSeed().rubrics[0];
  assert.doesNotThrow(() => validateRubric(rubric));
  rubric.criteria[0].weight = 0;
  assert.throws(() => validateRubric(rubric), /100%/);
  rubric.criteria[0].weight = 20;
  rubric.cap = 0;
  assert.throws(() => validateRubric(rubric), /lớn hơn 0/);
});
test('revocation preserves original ledger and appends exactly one reversing entry', () => {
  const state = createSeed();
  const originals = structuredClone(state.ledger);
  const student = state.accounts.find((a) => a.id === 'student-7');
  const before = studentXP(student, 'FALL2026', state.ledger);
  resolveAnomaly(
    state,
    'case-1',
    'revoke',
    'Đã đối chiếu và xác định ghi nhận trùng.',
    0,
    'SUMMER2026',
    'CTSV',
  );
  assert.deepEqual(state.ledger.slice(0, originals.length), originals);
  const correction = state.ledger.at(-1);
  assert.equal(correction.originalId, originals[0].id);
  assert.equal(correction.amount, -400);
  assert.equal(correction.season, 'FALL2026');
  assert.equal(studentXP(student, 'FALL2026', state.ledger), before - 400);
  assert.throws(
    () =>
      resolveAnomaly(
        state,
        'case-1',
        'revoke',
        'Duplicate decision not allowed',
        0,
        'FALL2026',
        'CTSV',
      ),
    /đã được xử lý/,
  );
});
test('adjustments write only the delta and require a valid amount and justification', () => {
  const state = createSeed();
  assert.throws(
    () =>
      resolveAnomaly(state, 'case-2', 'adjust', 'Đã kiểm tra minh chứng', 500, 'FALL2026', 'CTSV'),
    /số nguyên/,
  );
  assert.throws(() => resolveAnomaly(state, 'case-2', 'keep', '', 0, 'FALL2026', 'CTSV'), /lý do/);
  resolveAnomaly(
    state,
    'case-2',
    'adjust',
    'Đã kiểm tra minh chứng, một đóng góp hợp lệ.',
    80,
    'FALL2026',
    'CTSV',
  );
  assert.equal(state.ledger.at(-1).amount, -80);
});
test('keep decision logs resolution without changing the XP ledger', () => {
  const state = createSeed();
  const ledger = structuredClone(state.ledger);
  resolveAnomaly(
    state,
    'case-3',
    'keep',
    'Minh chứng cho ba sản phẩm đều hợp lệ.',
    0,
    'FALL2026',
    'CTSV',
  );
  assert.deepEqual(state.ledger, ledger);
  assert.equal(state.anomalies[2].status, 'resolved');
});
