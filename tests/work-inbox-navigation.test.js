import test from 'node:test';
import assert from 'node:assert/strict';
import { loadWorkInbox } from '../src/workflows/work-inbox.js';
import {
  affairsNav,
  adminNav,
  featureTabs,
  legacyDestination,
  navigationItemFor,
} from '../src/routes/navigation.js';

test('navigation has seven CTSV and four admin groups; old filters and links retain their owner', () => {
  assert.equal(affairsNav.length, 7);
  assert.equal(adminNav.length, 4);
  assert.equal(
    legacyDestination('/ctsv/club-requests', '?type=transfer&clubId=42'),
    '/ctsv/clubs?type=transfer&clubId=42&view=requests',
  );
  assert.equal(
    legacyDestination('/ctsv/activity-dossiers', '?source=mock&record=mock-plan'),
    '/ctsv/activities?view=club',
  );
  assert.equal(
    navigationItemFor('/ctsv/reports/42', { navigationOwner: 'clubs' }).path,
    '/ctsv/clubs',
  );
  assert.equal(navigationItemFor('/ctsv/reports/42').path, '/ctsv/activities');
  assert.equal(new Set(featureTabs.clubs.map((t) => t.id)).size, featureTabs.clubs.length);
});

test('the work inbox preserves source failures and never turns an API error into a mock API row', async () => {
  const missing = async () => {
    throw Error('API unavailable');
  };
  const client = {
    studentAffairs: {
      declarations: {
        list: async () => ({ items: [{ id: 1, status: 'Submitted', title: 'Hồ sơ cần CTSV' }] }),
      },
    },
    clubs: {
      applications: { list: missing },
      disbandRequests: { list: async () => [] },
      transferRequests: { list: async () => [] },
    },
  };
  const result = await loadWorkInbox(
    client,
    { list: missing },
    { bucket: 'actionable', semester: 'FALL2026' },
  );
  assert.equal(result.find((s) => s.id === 'reports').error, 'API unavailable');
  assert.equal(result.find((s) => s.id === 'reports').rows.length, 0);
  assert.equal(result.find((s) => s.id === 'declarations').rows[0].source, 'API');
  assert.equal(result.find((s) => s.id === 'declarations').rows[0].bucket, 'actionable');
  assert.ok(result.flatMap((source) => source.rows).every((row) => row.source === 'API'));
});
