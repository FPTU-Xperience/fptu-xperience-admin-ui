// Browser fixture for the real app entry points. API/OAuth responses are simulated.
// Start Admin/ClubHub Vite on the URLs below with peer overrides matching each other.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const adminUrl = process.env.ADMIN_QA_URL || 'http://localhost:5274/';
const clubUrl = process.env.CLUB_QA_URL || 'http://localhost:5273/v2';
const actor = { id: 7, username: 'qa-staff', fullName: 'Session QA CTSV', email: 'session@example.test',
  campusCode: 'HCM', roles: ['STUDENT_AFFAIRS_ADMIN'], isActive: true, isLocked: false };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const tokens = new Map(), codes = new Map();
const issue = (family = randomUUID()) => {
  const value = { accessToken: randomUUID(), refreshToken: randomUUID(), user: actor, family };
  tokens.set(value.refreshToken, value); return value;
};
const results = [];
try {
  for (const direction of ['admin-to-club', 'club-to-admin']) {
    const context = await browser.newContext();
    const errors = [];
    context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
    await context.route('https://**/*', route => route.abort());
    await context.route('**/api/**', async route => {
      const request = route.request(), url = new URL(request.url()), origin = request.headers().origin || '*';
      const body = request.postDataJSON();
      const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS', 'Content-Type': 'application/json' };
      const reply = (status, json) => route.fulfill({ status, headers, body: status === 204 ? '' : JSON.stringify(json ?? {}) });
      if (request.method() === 'OPTIONS') return reply(204);
      if (url.pathname === '/api/auth/sso/tickets') {
        const source = tokens.get(body.refreshToken);
        if (!source || source.revoked) return reply(401);
        const code = randomUUID(); codes.set(code, { family: source.family, challenge: body.codeChallenge, target: body.targetOrigin });
        return reply(200, { code });
      }
      if (url.pathname === '/api/auth/sso/redeem') {
        const ticket = codes.get(body.code); codes.delete(body.code);
        if (!ticket || ticket.target !== origin || ticket.challenge !== createHash('sha256').update(body.codeVerifier).digest('base64url')) return reply(401);
        return reply(200, issue(ticket.family));
      }
      if (url.pathname === '/api/auth/sso/status') return reply(tokens.get(body.refreshToken)?.revoked ? 401 : 204);
      if (url.pathname === '/api/auth/refresh') {
        const old = tokens.get(body.refreshToken); if (!old || old.revoked) return reply(401);
        return reply(200, issue(old.family));
      }
      if (url.pathname === '/api/auth/logout') {
        const current = tokens.get(body.refreshToken);
        for (const token of tokens.values()) if (token.family === current?.family) token.revoked = true;
        return reply(204);
      }
      if (['/api/v1/me', '/api/users/me'].includes(url.pathname)) {
        const bearer = request.headers().authorization?.replace('Bearer ', '');
        const active = [...tokens.values()].find(x => x.accessToken === bearer && !x.revoked);
        return reply(active ? 200 : 401, actor);
      }
      if (url.pathname === '/api/users/me/profile') return reply(200, { userId: 7, profile: {}, academic: {}, images: {} });
      return reply(200, []);
    });
    const sourceUrl = direction === 'admin-to-club' ? adminUrl : clubUrl;
    const destinationUrl = direction === 'admin-to-club' ? clubUrl : adminUrl;
    const credentials = issue();
    // Seed only the source app, once. Target must obtain its own branch through the real SSO flow.
    await context.route(`${new URL(sourceUrl).origin}/`, async route => route.continue());
    await context.addInitScript(({ origin, credentials }) => {
      if (location.origin === origin && !sessionStorage.getItem('qa-seeded')) {
        localStorage.setItem('fptux:session:v1', JSON.stringify({ ...credentials, id: 'qa-session' }));
        sessionStorage.setItem('qa-seeded', 'true');
      }
    }, { origin: new URL(sourceUrl).origin, credentials });
    const source = await context.newPage(); await source.goto(sourceUrl);
    await source.waitForFunction(() => document.body.innerText.includes('Session QA CTSV'), null, { timeout: 30000 });
    const destination = await context.newPage(); await destination.goto(destinationUrl);
    await destination.waitForFunction(() => document.body.innerText.includes('Session QA CTSV'), null, { timeout: 30000 });
    const targetRecord = await destination.evaluate(() => JSON.parse(localStorage.getItem('fptux:session:v1')));
    assert.equal(targetRecord.user.id, 7);
    assert.notEqual(targetRecord.refreshToken, credentials.refreshToken);
    assert.equal(tokens.get(targetRecord.refreshToken).family, credentials.family);
    assert.equal(new URL(destination.url()).origin, new URL(destinationUrl).origin);
    assert.equal(new URL(destination.url()).searchParams.has('code'), false);

    // Same-origin login and logout are observable in an already-open second tab.
    const second = await context.newPage(); await second.goto(destinationUrl);
    await second.waitForFunction(() => document.body.innerText.includes('Session QA CTSV'));
    const fresh = issue(credentials.family);
    await destination.evaluate(async credentials => {
      const { session } = await import('/src/services/api.js');
      session.acceptLogin(credentials, session.version());
    }, fresh);
    await second.waitForFunction(refreshToken => JSON.parse(localStorage.getItem('fptux:session:v1'))?.refreshToken === refreshToken, fresh.refreshToken);
    await second.waitForFunction(() => document.body.innerText.includes('Session QA CTSV'));
    await destination.evaluate(async () => { const { session } = await import('/src/services/api.js'); await session.logout(); })
      .catch(error => { if (!/Execution context was destroyed/.test(error.message)) throw error; });
    await second.waitForURL(url => url.origin === new URL(clubUrl).origin && url.pathname === '/v2');
    await second.waitForFunction(() => !document.body.innerText.includes('Session QA CTSV'));
    await second.waitForFunction(() => localStorage.getItem('fptux:session:v1') === null);

    // The other origin rechecks its revoked family on focus/visibility.
    await source.bringToFront();
    await source.evaluate(() => window.dispatchEvent(new Event('focus')))
      .catch(error => { if (!/Execution context was destroyed/.test(error.message)) throw error; });
    await source.waitForURL(url => url.origin === new URL(clubUrl).origin && url.pathname === '/v2', { timeout: 20000 });
    await source.waitForFunction(() => localStorage.getItem('fptux:session:v1') === null, null, { timeout: 20000 });
    assert.equal(errors.length, 0, errors.join('\n'));
    results.push({ direction, sso: 'passed', sameOriginLogin: 'passed', sameOriginLogout: 'passed', crossOriginLogout: 'passed', signedOutDestination: '/v2' });
    await context.close();
  }
  for (const entryUrl of [adminUrl, clubUrl]) {
    const context = await browser.newContext();
    let expired = false;
    await context.route('https://**/*', route => route.abort());
    await context.route('**/api/**', route => {
      const pathname = new URL(route.request().url()).pathname;
      const me = ['/api/v1/me', '/api/users/me'].includes(pathname);
      if (pathname === '/api/auth/sso/status' && !expired) return route.fulfill({ status: 204 });
      const status = expired || pathname.startsWith('/api/auth/') ? 401 : 200;
      return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(me ? actor : []) });
    });
    await context.addInitScript(({ origin, credentials }) => {
      if (location.origin === origin && !sessionStorage.getItem('qa-timeout-seeded')) {
        localStorage.setItem('fptux:session:v1', JSON.stringify({ ...credentials, id: 'timeout-fixture' }));
        sessionStorage.setItem('qa-timeout-seeded', 'true');
      }
    }, { origin: new URL(entryUrl).origin, credentials: issue() });
    const page = await context.newPage(); await page.goto(entryUrl);
    await page.waitForFunction(() => document.body.innerText.includes('Session QA CTSV'));
    expired = true;
    await page.evaluate(async () => {
      const { session } = await import('/src/services/api.js');
      await session.authFetch(session.url('/api/users/me')).catch(() => {});
    }).catch(error => { if (!/Execution context was destroyed/.test(error.message)) throw error; });
    await page.waitForURL(url => url.origin === new URL(clubUrl).origin && url.pathname === '/v2');
    await page.waitForFunction(() => localStorage.getItem('fptux:session:v1') === null);
    results.push({ entry: new URL(entryUrl).origin, timeoutDestination: '/v2' });
    await context.close();
  }
  console.log(JSON.stringify({ browserFixture: true, results }, null, 2));
} finally { await browser.close(); }
