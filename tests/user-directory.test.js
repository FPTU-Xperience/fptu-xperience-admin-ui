import test from 'node:test';
import assert from 'node:assert/strict';
import { loadUserDirectory } from '../src/services/user-directory.js';
test('directory includes users beyond the first API page before applying client filters', async () => {
  const calls = [];
  const rows = Array.from({ length: 501 }, (_, id) => ({ id: id + 1 }));
  const api = {
    users: {
      list: async (params) => {
        calls.push(params);
        return {
          items: rows.slice((params.page - 1) * 500, params.page * 500),
          page: params.page,
          pageSize: 500,
          total: 501,
        };
      },
    },
  };
  assert.equal((await loadUserDirectory(api)).at(-1).id, 501);
  assert.deepEqual(calls, [
    { page: 1, pageSize: 500 },
    { page: 2, pageSize: 500 },
  ]);
});
test('directory rejects changed totals or duplicate pages instead of presenting a partial list', async () => {
  for (const second of [
    { items: [{ id: 1 }], page: 2, total: 501 },
    { items: [{ id: 501 }], page: 2, total: 502 },
  ]) {
    const api = {
      users: {
        list: async ({ page }) =>
          page === 1
            ? {
                items: Array.from({ length: 500 }, (_, i) => ({ id: i + 1 })),
                page: 1,
                pageSize: 500,
                total: 501,
              }
            : second,
      },
    };
    await assert.rejects(loadUserDirectory(api));
  }
});
test('directory retains campus filter across every fetched page', async () => {
  const calls = [];
  await loadUserDirectory({ users: { list: async (params) => { calls.push(params); return { page: params.page, pageSize: 1, total: 2, items: [{ id: params.page }] }; } } }, { campus: 'HCM' });
  assert.deepEqual(calls.map((value) => value.campus), ['HCM', 'HCM']);
});
