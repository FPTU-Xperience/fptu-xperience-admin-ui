import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const modulePath = process.env.PLAYWRIGHT_MODULE;
const { chromium } = await import(modulePath ? pathToFileURL(modulePath).href : 'playwright');
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const base = process.env.DISCOVERY_SMOKE_BASE_URL || 'https://fptux-admin-ui.pages.dev';
const original = '11111111-1111-4111-8111-111111111111';
const replacement = '22222222-2222-4222-8222-222222222222';
try {
  for (const role of ['SYSTEM_ADMIN', 'STUDENT_AFFAIR']) {
    const page = await browser.newPage({ serviceWorkers: 'block' });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    let writes = 0;
    let discoveryCapture = { clickEnabled: true, viewEnabled: true, viewSeconds: 5, visiblePercent: 50, version: original };
    await page.addInitScript(() => localStorage.setItem('fptux:session:v1',
      JSON.stringify({ id: 'discovery-capture-smoke', accessToken: 'intercepted-not-a-real-token' })));
    await page.route('**/*', async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (!path.startsWith('/api/')) return route.continue();
      const ok = (json) => route.fulfill({ status: 200, json });
      if (path === '/api/v1/admin/settings' && request.method() === 'PUT') {
        assert.equal(role, 'SYSTEM_ADMIN');
        assert.deepEqual(request.postDataJSON().discoveryCapture,
          { clickEnabled: true, viewEnabled: false, viewSeconds: 7, visiblePercent: 75, expectedVersion: original });
        writes++;
        discoveryCapture = { ...discoveryCapture, viewEnabled: false, viewSeconds: 7, visiblePercent: 75, version: replacement };
        return ok({ discoveryCapture });
      }
      if (request.method() !== 'GET') return route.abort();
      if (path === '/api/users/me')
        return ok({ id: 901, fullName: 'QA Capture', email: 'qa@example.test', roles: [role], isActive: true, campusCode: 'HAN' });
      if (path === '/api/v1/admin/settings') return ok({ discoveryCapture });
      if (path === '/api/v1/student-affairs/campuses') return ok({ actorId: 901, campusCode: 'HAN',
        canSelectCampus: role === 'SYSTEM_ADMIN', campuses: [{ code: 'HAN', name: 'Hà Nội' }] });
      return ok({ items: [], page: 1, totalPages: 0 });
    });
    await page.goto(`${base}/#/admin/configuration?view=platform`, { waitUntil: 'domcontentloaded' });
    if (role === 'SYSTEM_ADMIN') {
      await page.getByText('Ghi nhận tương tác', { exact: true }).waitFor();
      await page.getByLabel('Thời gian tối thiểu (giây)').fill('7');
      await page.getByLabel('Phần mục cần hiển thị (%)').fill('75');
      await page.getByRole('switch', { name: 'Ghi nhận lượt xem' }).click();
      const response = page.waitForResponse((value) => value.url().endsWith('/api/v1/admin/settings') && value.request().method() === 'PUT');
      await page.getByRole('button', { name: 'Lưu cấu hình', exact: true }).click();
      assert.equal((await response).status(), 200);
      await page.reload();
      await page.getByText('Ghi nhận tương tác', { exact: true }).waitFor();
      assert.equal(await page.getByLabel('Thời gian tối thiểu (giây)').inputValue(), '7');
      assert.equal(await page.getByRole('switch', { name: 'Ghi nhận lượt xem' }).getAttribute('aria-checked'), 'false');
      assert.equal(writes, 1);
    } else {
      await page.waitForURL('**/#/ctsv/work');
      assert.equal(await page.getByText('Ghi nhận tương tác', { exact: true }).count(), 0);
      assert.equal(writes, 0);
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('DISCOVERY_CAPTURE_ADMIN_BROWSER_OK: settings save and reload as Admin, CTSV route denied.');
} finally {
  await browser.close();
}
