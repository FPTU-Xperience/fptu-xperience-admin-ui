import assert from 'node:assert/strict';
import fs from 'node:fs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.ADMIN_BASE_URL || 'https://fptux-admin-ui.pages.dev';
const browser = await chromium.launch();
const users = Array.from({ length: 32 }, (_, i) => ({
  id: i + 10,
  username: 'SE' + String(i + 1).padStart(3, '0'),
  fullName: 'Student ' + String(i + 1).padStart(2, '0'),
  email: 's' + i + '@example.test',
  roles: ['STUDENT'],
  isActive: true,
  campusCode: 'HAN',
  clubIds: [],
  major: i % 2 ? 'Trí tuệ nhân tạo' : 'Kỹ thuật phần mềm',
  cohort: i % 2 ? 'K21' : 'K20',
}));
try {
  fs.mkdirSync('TestResults/list-state-online', { recursive: true });
  for (const width of [1440, 390])
    for (const role of ['STUDENT_AFFAIR', 'SYSTEM_ADMIN']) {
      const page = await browser.newPage({
        viewport: { width, height: 1000 },
        serviceWorkers: 'block',
      });
      page.setDefaultTimeout(45000);
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.addInitScript(() =>
        localStorage.setItem(
          'fptux:session:v1',
          JSON.stringify({
            id: 'isolated-list-validation',
            accessToken: 'intercepted-not-a-real-token',
          }),
        ),
      );
      await page.route('**/*', async (route) => {
        const request = route.request(),
          url = new URL(request.url()),
          path = url.pathname;
        if (!path.startsWith('/api/')) return route.continue();
        // Every API request is isolated; no synthetic identity reaches production.
        assert.equal(request.method(), 'GET', 'Unexpected mutation is blocked');
        const ok = (body) =>
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(body),
          });
        if (path === '/api/v1/me')
          return ok({
            id: 999999,
            fullName: 'Isolated list reviewer',
            email: 'reviewer@example.test',
            roles: [role],
            isActive: true,
            campusCode: 'HAN',
          });
        if (path === '/api/v1/student-affairs/campuses') return ok({ actorId: 999999, campusCode: 'HAN', canSelectCampus: role === 'SYSTEM_ADMIN', campuses: [{ code: 'HAN', name: 'Hà Nội' }] });
        if (path === '/api/users') {
          const page = Number(url.searchParams.get('page') || 1),
            pageSize = Number(url.searchParams.get('pageSize') || 500);
          return ok({
            items: users.slice((page - 1) * pageSize, page * pageSize),
            page,
            pageSize,
            total: users.length,
          });
        }
        if (path === '/api/clubs')
          return ok([
            { id: 1, code: 'TEST', name: 'Isolated Test Club', isActive: true, campusCode: 'HAN' },
          ]);
        const semester = {
          semesterCode: 'FALL2026',
          label: 'Fall 2026',
          start: '2026-08-15',
          end: '2026-12-31',
          isActive: true,
        };
        if (path === '/api/v1/semesters') return ok([semester]);
        if (path === '/api/v1/semesters/active') return ok(semester);
        if (path === '/api/notifications')
          return ok({ items: [], totalItems: 0, page: 1, totalPages: 0 });
        return ok([]);
      });
      const path =
        role === 'SYSTEM_ADMIN'
          ? '/admin/accounts?view=accounts&page=3&query=Student'
          : '/ctsv/monitoring?view=engagement&page=3&season=FALL2026&keep=yes';
      await page.goto(base + '/#' + path, { waitUntil: 'domcontentloaded' });
      await page.getByText('Trang 3 / 4', { exact: true }).waitFor();
      await page.reload();
      await page.getByText('Trang 3 / 4', { exact: true }).waitFor();
      if (role === 'STUDENT_AFFAIR') {
        assert.equal(await page.getByLabel('Ngành học', { exact: true }).isDisabled(), true);
        assert.equal(await page.getByLabel('Khóa sinh viên', { exact: true }).isDisabled(), true);
        await page.getByPlaceholder('Tìm tên, tài khoản, email…').fill('Student 1');
        await page.getByText('Trang 1 / 2', { exact: true }).waitFor();
        await page.getByRole('button', { name: 'Trang sau', exact: true }).click();
        await page.getByText('Trang 2 / 2', { exact: true }).waitFor();
        const saved = page.url();
        await page.getByPlaceholder('Tìm tên, tài khoản, email…').fill('missing');
        await page.getByText('Không có sinh viên phù hợp', { exact: true }).waitFor();
        await page.goBack();
        await page.getByText('Trang 2 / 2', { exact: true }).waitFor();
        assert.equal(page.url(), saved);
        await page.reload();
        await page.getByText('Trang 2 / 2', { exact: true }).waitFor();
        assert.equal(
          await page.getByPlaceholder('Tìm tên, tài khoản, email…').inputValue(),
          'Student 1',
        );
        assert.equal(await page.getByLabel('Campus', { exact: true }).inputValue(), 'HAN');
        assert.ok(page.url().includes('season=FALL2026'));
        assert.ok(page.url().includes('keep=yes'));
      } else
        assert.equal(
          await page.getByRole('searchbox', { name: 'Tìm tài khoản' }).inputValue(),
          'Student',
        );
      assert.deepEqual(errors, []);
      await page.screenshot({
        path: `TestResults/list-state-online/${role}-${width}.png`,
        fullPage: true,
      });
      console.log(
        'DEPLOYED_ADMIN_LIST_STATE_OK',
        JSON.stringify({ base, role, width, apiTraffic: 'isolated' }),
      );
      await page.close();
    }
} finally {
  await browser.close();
}
