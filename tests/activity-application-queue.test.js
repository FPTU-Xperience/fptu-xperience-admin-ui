import assert from 'node:assert/strict';
import test from 'node:test';
import { loadSubmittedApplications } from '../src/workflows/activity-application-queue.js';

test('loads every submitted page and shows the newest updated application first', async () => {
  const requests = [];
  const older = { id: 30, updatedAt: '2026-11-12T02:00:00Z' };
  const newest = { id: 20, updatedAt: '2026-11-14T02:00:00Z' };
  const firstPage = Array.from({ length: 100 }, (_, index) => ({
    id: 130 - index,
    updatedAt: '2026-11-11T02:00:00Z',
  }));
  const applications = {
    async list(params) {
      requests.push(params);
      if (params.clubId === 1) {
        return { items: params.page === 1 ? firstPage : [older], totalItems: 101, totalPages: 2 };
      }
      return { items: [newest], totalItems: 1, totalPages: 1 };
    },
  };

  const result = await loadSubmittedApplications(applications, [{ id: 1 }, { id: 2 }], () => true);

  assert.deepEqual(result, { items: [newest, older, ...firstPage], failedClubs: [] });
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
  const firstPage = Array.from({ length: 100 }, (_, index) => ({ id: 102 - index }));
  const applications = {
    async list({ clubId, page }) {
      if (page === 2) throw error;
      if (clubId === 1) return { items: firstPage, totalItems: 101, totalPages: 2 };
      return { items: [{ id: clubId }], totalItems: 1, totalPages: 1 };
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

  assert.deepEqual(result.items, [...firstPage, { id: 2 }]);
  assert.deepEqual(result.failedClubs, [{ name: 'CLB Một', error }]);
});

test('restarts an affected club when a review changes the total between offset pages', async () => {
  const requests = [];
  let pending = Array.from({ length: 101 }, (_, index) => ({ id: 101 - index }));
  const applications = {
    async list({ page, pageSize }) {
      requests.push(page);
      const rows = pending;
      if (requests.length === 1) pending = rows.slice(1);
      return {
        items: rows.slice((page - 1) * pageSize, page * pageSize),
        totalItems: rows.length,
        totalPages: Math.ceil(rows.length / pageSize),
      };
    },
  };

  const result = await loadSubmittedApplications(applications, [{ id: 1 }], () => true);

  assert.deepEqual(requests, [1, 2, 1]);
  assert.deepEqual(result, { items: pending, failedClubs: [] });
});

test('reports only one retry when offset pages still overlap with the same total', async () => {
  const requests = [];
  const firstPage = Array.from({ length: 100 }, (_, index) => ({ id: 101 - index }));
  const club = { id: 1, name: 'CLB Một' };
  const applications = {
    async list({ page }) {
      requests.push(page);
      return { items: page === 1 ? firstPage : [{ id: 2 }], totalItems: 101, totalPages: 2 };
    },
  };

  const result = await loadSubmittedApplications(applications, [club], () => true);

  assert.deepEqual(requests, [1, 2, 1, 2]);
  assert.deepEqual(result.items, firstPage);
  assert.equal(result.failedClubs.length, 1);
  assert.equal(result.failedClubs[0].name, club.name);
  assert.match(result.failedClubs[0].error.message, /Danh sách thay đổi/);
});
