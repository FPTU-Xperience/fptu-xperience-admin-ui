import assert from 'node:assert/strict';

export async function checkNoSimulation({ open, evaluate }) {
  const routes = [
    '/ctsv/work?view=actionable',
    '/ctsv/semesters?view=rollover',
    '/ctsv/clubs?view=bonus',
    '/ctsv/clubs?view=leadership',
    '/ctsv/activities?view=school',
    '/ctsv/activities?view=club&source=mock&record=mock-plan',
    '/ctsv/monitoring?view=reconciliation&source=mock',
    '/ctsv/clubs/1?view=activities&source=mock',
    '/ctsv/clubs/1?view=leadership',
    '/ctsv/clubs/1?view=bonus',
  ];
  for (const route of routes) {
    await open(route, 'staff', 1280);
    const result = await evaluate(`({
      text:document.querySelector('main').textContent,
      links:[...document.querySelectorAll('.feature-workspace-tabs a')].map(a=>a.href),
      rows:[...document.querySelectorAll('.work-inbox tbody tr')].map(r=>r.textContent)
    })`);
    assert.doesNotMatch(result.text, /mô phỏng|mock-|MOCK-SE|Mock JS|200 điểm mẫu/i, route);
    assert.ok(
      result.links.every(
        (link) => !/[?&](?:view=(?:rollover|bonus|school)|source=mock)(?:&|$)/.test(link),
      ),
      route,
    );
    assert.ok(
      result.rows.every((row) => !row.includes('MOCK')),
      route,
    );
  }
  await open('/ctsv/work?view=actionable', 'staff', 1280, 'reports');
  const failed = await evaluate(`document.querySelector('main').textContent`);
  assert.match(failed, /Lỗi API kiểm thử/);
  assert.doesNotMatch(failed, /mô phỏng|mock-|MOCK-SE/i);
  console.log(
    'PASS removed simulator routes, stale source links, API-only inbox and preserved real club leadership',
  );
}
