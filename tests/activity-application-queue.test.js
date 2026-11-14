import assert from 'node:assert/strict';
import test from 'node:test';
import { loadSubmittedApplications } from '../src/workflows/activity-application-queue.js';

test('loads every submitted page and shows the newest updated application first', async () => {
  const requests = [];
  const older = { id: 30, updatedAt: '2026-11-12T02:00:00Z' };
  const newest = { id: 20, updatedAt: '2026-11-14T02:00:00Z' };
  const applications = {
    async list(params) {
      requests.push(params);
      if (params.clubId === 1) return { items: [older], totalPages: 2 };
      return { items: [newest], totalPages: 1 };
    },
  };

  const result = await loadSubmittedApplications(applications, [{ id: 1 }, { id: 2 }], () => true);

  assert.deepEqual(result, { items: [newest, older], failedClubs: [] });
  assert.deepEqual(
    requests.map(({ clubId, page }) => [clubId, page]),
    [
      [1, 1],
      [2, 1],
      [1, 2],
    ],
  );
  assert.ok(requests.every(({ status, pageSize }) => status === 'SUBMITTED' && pageSize === 100));
});

test('keeps previously loaded pages and other clubs when a later page fails', async () => {
  const error = new Error('Dịch vụ tạm thời gián đoạn');
  const applications = {
    async list({ clubId, page }) {
      if (page === 2) throw error;
      return { items: [{ id: clubId }], totalPages: clubId === 1 ? 2 : 1 };
    },
  };

  const result = await loadSubmittedApplications(
    applications,
    [
      { id: 1, name: 'CLB Một' },
      { id: 2, name: 'CLB Hai' },
    ],
    () => true,
  );

  assert.deepEqual(
    result.items.map(({ id }) => id),
    [2, 1],
  );
  assert.deepEqual(result.failedClubs, [{ name: 'CLB Một', error }]);
});
