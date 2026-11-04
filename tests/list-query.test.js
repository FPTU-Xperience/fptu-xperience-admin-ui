import test from 'node:test';
import assert from 'node:assert/strict';
import { readListQuery, updateListQuery } from '../src/utils/list-query.js';

const defaults = { query: '', group: 'all', major: 'all', cohort: 'all', page: 1 };
test('list state survives URL reconstruction with semester and unrelated detail state', () => {
  const url = new URLSearchParams(
    'season=FA2026&view=members&query=Nguy%E1%BB%85n&major=SE&cohort=K20&page=3',
  );
  assert.deepEqual(readListQuery(url, defaults), {
    query: 'Nguyễn',
    group: 'all',
    major: 'SE',
    cohort: 'K20',
    page: 3,
  });
  const next = updateListQuery(url, { page: 4 }, defaults);
  assert.equal(next.get('season'), 'FA2026');
  assert.equal(next.get('view'), 'members');
  assert.equal(readListQuery(new URLSearchParams(next.toString()), defaults).page, 4);
  assert.equal(readListQuery(url, defaults).page, 3, 'original navigation entry remains intact');
});
test('filter changes reset page atomically and preserve other filters', () => {
  const before = 'page=3&query=An&major=SE&season=FA2026';
  const next = updateListQuery(before, { group: 'no-club', cohort: 'K20' }, defaults);
  assert.deepEqual(readListQuery(next, defaults), {
    query: 'An',
    group: 'no-club',
    major: 'SE',
    cohort: 'K20',
    page: 1,
  });
  assert.equal(next.get('season'), 'FA2026');
  assert.equal(
    readListQuery(updateListQuery(before, { major: 'SE' }, defaults), defaults).page,
    3,
    'unchanged filter does not reset a restored page',
  );
});
test('invalid, fractional, unbounded and unsafe pages fall back to page one', () => {
  for (const value of ['0', '-1', '2x', '1.5', 'Infinity', '999999999999999999999999', '100001'])
    assert.equal(readListQuery('page=' + value, defaults).page, 1);
  assert.equal(readListQuery('page=100000', defaults).page, 100000);
});
test('embedded list state is isolated from report pagination and functional changes merge', () => {
  const memberDefaults = { search: '', page: 1 };
  const original = 'page=7&status=Under+Review&members_page=3&members_search=An&season=FA2026';
  const next = updateListQuery(
    original,
    (current) => ({ page: current.page + 1 }),
    memberDefaults,
    'members_',
  );
  assert.equal(next.get('page'), '7');
  assert.equal(next.get('status'), 'Under Review');
  assert.deepEqual(readListQuery(next, memberDefaults, 'members_'), { search: 'An', page: 4 });
  const filtered = updateListQuery(next, { search: 'Bình' }, memberDefaults, 'members_');
  assert.deepEqual(readListQuery(filtered, memberDefaults, 'members_'), {
    search: 'Bình',
    page: 1,
  });
  assert.equal(filtered.get('page'), '7');
});
test('boolean filters are explicit and clearing defaults removes their query keys', () => {
  const values = { urgent: false, page: 1 };
  const next = updateListQuery('season=FA2026&page=2', { urgent: true }, values);
  assert.equal(next.get('urgent'), '1');
  assert.equal(readListQuery(next, values).urgent, true);
  const cleared = updateListQuery(next, { urgent: false }, values);
  assert.equal(cleared.has('urgent'), false);
  assert.equal(cleared.get('season'), 'FA2026');
});
