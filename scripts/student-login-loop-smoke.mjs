// Real ClubHub entrypoint, isolated browser and simulated auth. No production credentials.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const clubUrl = process.env.CLUB_QA_URL || 'http://localhost:5273/v2';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext();
const actor = { id: 41, fullName: 'Student Loop QA', email: 'student-loop@example.test', roles: ['CLUB_MEMBER'], campusCode: 'CAN', isActive: true, isLocked: false };
const requests = [];
try {
    await context.route('https://**/*', route => route.abort());
    await context.route('**/api/**', async route => {
        const request = route.request(), path = new URL(request.url()).pathname;
        requests.push(path);
        const headers = { 'Access-Control-Allow-Origin': request.headers().origin || '*', 'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Methods': '*', 'Content-Type': 'application/json' };
        const reply = (status, data) => route.fulfill({ status, headers, body: status === 204 ? '' : JSON.stringify(data) });
        if (request.method() === 'OPTIONS') return reply(204);
        if (path === '/api/auth/google' || path === '/api/auth/refresh') return reply(200, {
            accessToken: 'isolated-access', refreshToken: 'isolated-refresh', user: actor,
        });
        if (path === '/api/users/me' || path === '/api/v1/me') return reply(200, actor);
        // Simulate a downstream service rejecting the bearer although Auth still accepts the identity.
        if (path === '/api/users/me/profile') return reply(401, { message: 'Downstream authentication configuration mismatch' });
        return reply(200, []);
    });
    await context.addInitScript(() => {
        window.google = { accounts: { id: {
            initialize(options) { window.__fixtureCredential = options.callback; },
            renderButton(element, options) {
                const button = document.createElement('button'); button.textContent = 'Fixture Google sign in';
                button.onclick = () => { options.click_listener?.(); window.__fixtureCredential({ credential: 'isolated-fixture' }); };
                element.replaceChildren(button);
            },
        } } };
    });
    const page = await context.newPage();
    await page.goto(clubUrl);
    await page.getByRole('button', { name: 'Fixture Google sign in' }).click();
    await page.waitForResponse(response => response.url().includes('/api/users/me/profile') && response.request().method() === 'GET');
    await page.waitForFunction(() => document.body.innerText.includes('HỒ SƠ SINH VIÊN') || document.body.innerText.includes('THÔNG TIN TỪ EMAIL'), null, { timeout: 5000 });
    assert.equal(await page.getByRole('button', { name: 'Fixture Google sign in' }).count(), 0, 'A downstream 401 must not return a valid student session to login');
    assert.equal(await page.evaluate(() => Boolean(localStorage.getItem('fptux:session:v1'))), true);
    console.log(JSON.stringify({ result: 'passed', case: 'Student Google login survives downstream 401 with valid Auth identity', requests }, null, 2));
} finally { await context.close(); await browser.close(); }
