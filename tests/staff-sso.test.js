import test from 'node:test';
import assert from 'node:assert/strict';
import { createStaffSso, challengeFor } from '../src/services/staff-sso.js';
import { createSessionClient } from '../src/services/session-client.js';

const ADMIN = 'https://fptux-admin-ui.pages.dev';
const CLUB = 'https://fptux-clubhub-ui.pages.dev';
const staff = { id: 7, roles: ['STUDENT_AFFAIRS_ADMIN'] };
const credentials = { accessToken: 'staff-access', refreshToken: 'staff-refresh', user: staff };
const response = (status, data = {}) => new Response(status === 204 ? null : JSON.stringify(data), { status });
const storage = () => { const map = new Map(); return { getItem: k => map.get(k) ?? null,
  setItem: (k, v) => map.set(k, String(v)), removeItem: k => map.delete(k) }; };
const tick = () => new Promise(r => setTimeout(r, 0));
function environment(origin, peer, fetcher, initialPath = '/', tabStorage = storage(), lifecycle = {}) {
  let time = 1000000;
  const location = { origin, href: `${origin}${initialPath}`, replace(url) { this.navigated = url; } };
  const history = { replaceState(a, b, url) { location.href = new URL(url, origin).href; } };
  const target = new EventTarget(); const document = new EventTarget(); document.visibilityState = 'visible';
  let interval, focusCallback;
  target.setTimeout = callback => { focusCallback = callback; return 1; };
  target.clearTimeout = () => { focusCallback = null; };
  target.setInterval = callback => { interval = callback; return 1; }; target.clearInterval = () => {};
  const session = createSessionClient({ baseUrl: 'https://api.test', storage: storage(), target, fetcher });
  const sso = createStaffSso({ session, peerUrl: peer, location, history, tabStorage, target, document, fetcher, now: () => time, ...lifecycle });
  return { session, sso, location, tabStorage, target, document, poll: () => interval?.(), advance: n => { time += n; },
    flushFocus: async () => { const callback = focusCallback; focusCallback = null; await callback?.(); await tick(); } };
}

test('SSO roundtrip restores the original route, uses PKCE, and never puts tokens in URLs', async () => {
  let expectedChallenge, redeemed = 0;
  const destination = environment(CLUB, ADMIN, async (url, options) => {
    redeemed++;
    assert.ok(url.endsWith('/sso/redeem'));
    const body = JSON.parse(options.body);
    assert.equal(body.code, 'opaque-ticket');
    assert.equal(await challengeFor(body.codeVerifier), expectedChallenge);
    return response(200, credentials);
  }, '/v2/my-clubs/ABC?tab=reports#section');
  assert.equal(await destination.sso.bootstrap(), true);
  const request = new URL(destination.location.navigated);
  expectedChallenge = request.searchParams.get('challenge');
  assert.equal(request.origin, ADMIN);
  const source = environment(ADMIN, CLUB, async (url, options) => {
    const body = JSON.parse(options.body);
    assert.equal(body.targetOrigin, CLUB);
    assert.equal(body.codeChallenge, expectedChallenge);
    assert.equal(body.refreshToken, 'staff-refresh');
    return response(200, { code: 'opaque-ticket' });
  });
  source.session.save(credentials);
  source.location.href = request.href;
  assert.equal(await source.sso.bootstrap(), true);
  assert.equal(source.location.navigated.includes('staff-access'), false);
  assert.equal(source.location.navigated.includes('staff-refresh'), false);
  destination.location.href = source.location.navigated;
  assert.equal(await destination.sso.bootstrap(), false);
  assert.equal(destination.location.href, `${CLUB}/v2/my-clubs/ABC?tab=reports#section`);
  assert.equal(destination.session.read().user.id, 7);
  assert.equal(redeemed, 1);
});

test('anonymous peer returns to login once without creating a redirect loop', async () => {
  const destination = environment(ADMIN, CLUB, async () => { throw new Error('must not call API'); });
  await destination.sso.bootstrap();
  const source = environment(CLUB, ADMIN, async () => { throw new Error('must not call API'); });
  source.location.href = destination.location.navigated;
  await source.sso.bootstrap();
  destination.location.href = source.location.navigated;
  assert.equal(await destination.sso.bootstrap(), false);
  assert.equal(destination.session.read(), null);
  assert.equal(await destination.sso.discover(), false);
});

test('callback rejects wrong state before redemption and removes the code from history', async () => {
  let requests = 0;
  const app = environment(CLUB, ADMIN, async () => { requests++; return response(200, credentials); });
  await app.sso.discover();
  app.location.href = `${CLUB}/?fptux_sso=callback&state=attacker&code=stolen`;
  await app.sso.bootstrap();
  assert.equal(requests, 0);
  assert.equal(app.session.read(), null);
  assert.equal(new URL(app.location.href).searchParams.has('code'), false);
});

test('callback rejects expired tab state and non-staff identities', async () => {
  for (const expired of [true, false]) {
    let requests = 0;
    const app = environment(CLUB, ADMIN, async () => { requests++; return response(200, { ...credentials, user: { id: 9, roles: ['CLUB_MEMBER'] } }); });
    await app.sso.discover();
    const state = new URL(app.location.navigated).searchParams.get('state');
    if (expired) app.advance(120001);
    app.location.href = `${CLUB}/?fptux_sso=callback&state=${state}&code=opaque`;
    await app.sso.bootstrap();
    assert.equal(requests, expired ? 0 : 1);
    assert.equal(app.session.read(), null);
  }
});

test('SSO never replaces an existing different account', async () => {
  const app = environment(CLUB, ADMIN, async () => response(200, credentials));
  app.session.save({ ...credentials, user: { id: 'student', roles: ['CLUB_MEMBER'] } });
  assert.equal(await app.sso.bootstrap(), false);
  assert.equal(app.location.navigated, undefined);
  assert.equal(app.session.read().user.id, 'student');
});

test('cross-app logout check clears revoked staff session, while server failures preserve it', async () => {
  for (const status of [401, 500]) {
    const app = environment(ADMIN, CLUB, async () => response(status));
    app.session.save(credentials);
    const stop = app.sso.watch(); await tick();
    assert.equal(Boolean(app.session.read()), status !== 401);
    stop();
  }
});

test('a rotation racing a failed session-status check does not sign out the new token', async () => {
  let complete;
  const pending = new Promise(resolve => { complete = resolve; });
  const app = environment(ADMIN, CLUB, async () => pending);
  app.session.save(credentials);
  const stop = app.sso.watch();
  app.session.save({ ...credentials, refreshToken: 'rotated' }, app.session.read());
  complete(response(401)); await tick();
  assert.equal(app.session.read().refreshToken, 'rotated'); stop();
});

test('returning from a hidden tab discovers a CTSV login after an earlier anonymous attempt', async () => {
  const app = environment(ADMIN, CLUB, async () => response(204));
  await app.sso.discover(); const first = app.location.navigated;
  app.advance(30001);
  const stop = app.sso.watch();
  app.document.visibilityState = 'hidden';
  app.document.dispatchEvent(new Event('visibilitychange'));
  app.document.visibilityState = 'visible';
  app.document.dispatchEvent(new Event('visibilitychange'));
  app.target.dispatchEvent(new Event('focus')); await app.flushFocus();
  assert.notEqual(app.location.navigated, first); stop();
});

test('returning to an anonymous tab discovers a new peer login immediately within the cooldown', async () => {
  const app = environment(ADMIN, CLUB, async () => response(204));
  await app.sso.discover(); const first = app.location.navigated;
  const stop = app.sso.watch();
  app.document.visibilityState = 'hidden';
  app.document.dispatchEvent(new Event('visibilitychange'));
  app.document.visibilityState = 'visible';
  app.document.dispatchEvent(new Event('visibilitychange'));
  app.target.dispatchEvent(new Event('focus')); await app.flushFocus();
  assert.notEqual(app.location.navigated, first); stop();
});

test('Google popup blur/focus does not bypass the anonymous discovery cooldown', async () => {
  const app = environment(CLUB, ADMIN, async () => response(204));
  await app.sso.discover(); const first = app.location.navigated;
  app.advance(60000);
  const stop = app.sso.watch();
  app.target.dispatchEvent(new Event('blur'));
  app.target.dispatchEvent(new Event('focus')); await app.flushFocus();
  assert.equal(app.location.navigated, first); stop();
});

test('Google callback can establish a student identity before delayed focus discovery', async () => {
  const app = environment(CLUB, ADMIN, async () => { throw new Error('Student must not use staff SSO'); });
  const stop = app.sso.watch();
  app.target.dispatchEvent(new Event('focus'));
  app.session.save({ ...credentials, user: { id: 'student', roles: ['CLUB_MEMBER'] } });
  await app.flushFocus();
  assert.equal(app.location.navigated, undefined);
  assert.equal(app.session.read().user.id, 'student'); stop();
});

test('focus cannot redirect a slow login that is already in flight', async () => {
  const app = environment(CLUB, ADMIN, async () => response(204));
  let complete;
  const login = app.session.authenticate(() => new Promise(resolve => { complete = resolve; }));
  const stop = app.sso.watch();
  app.target.dispatchEvent(new Event('focus')); await app.flushFocus();
  assert.equal(app.location.navigated, undefined);
  complete(); await login;
  assert.equal(app.session.isAuthenticating(), false); stop();
});

test('returning from a Google popup cannot discover SSO before its credential callback starts', async () => {
  const app = environment(CLUB, ADMIN, async () => response(204));
  const release = app.session.beginAuthentication();
  const stop = app.sso.watch();
  app.document.visibilityState = 'hidden';
  app.document.dispatchEvent(new Event('visibilitychange'));
  app.document.visibilityState = 'visible';
  app.document.dispatchEvent(new Event('visibilitychange'));
  await app.flushFocus();
  assert.equal(app.location.navigated, undefined);
  assert.equal(app.session.isAuthenticating(), true);
  release(); release();
  assert.equal(app.session.isAuthenticating(), false); stop();
});

test('simultaneous SSO discoveries only send one navigation', async () => {
  const app = environment(CLUB, ADMIN, async () => response(204));
  assert.deepEqual(await Promise.all([app.sso.discover(true), app.sso.discover(true)]), [true, false]);
});

test('a student session never requests a staff ticket when the peer probes it', async () => {
  const state = 'a'.repeat(43), challenge = 'b'.repeat(43);
  const app = environment(CLUB, ADMIN, async () => { throw new Error('Student must not request an SSO ticket'); },
    `/?fptux_sso=request&state=${state}&challenge=${challenge}`);
  app.session.save({ ...credentials, user: { id: 'student', roles: ['CLUB_MEMBER'] } });
  assert.equal(await app.sso.bootstrap(), true);
  const callback = new URL(app.location.navigated);
  assert.equal(callback.searchParams.get('state'), state);
  assert.equal(callback.searchParams.has('code'), false);
  assert.equal(app.session.read().user.id, 'student');
});

test('a disposed startup cannot redirect after its pending ticket request resolves', async () => {
  let complete, current = true;
  const app = environment(CLUB, ADMIN, () => new Promise(resolve => { complete = resolve; }),
    `/?fptux_sso=request&state=${'a'.repeat(43)}&challenge=${'b'.repeat(43)}`, storage(), { isCurrent: () => current });
  app.session.save(credentials);
  const starting = app.sso.bootstrap();
  current = false; complete(response(200, { code: 'obsolete' }));
  await starting;
  assert.equal(app.location.navigated, undefined);
});

test('a disposed callback cannot restore credentials after a new startup', async () => {
  let complete, current = true;
  const app = environment(CLUB, ADMIN, () => new Promise(resolve => { complete = resolve; }), '/', storage(),
    { isCurrent: () => current });
  await app.sso.discover();
  const state = new URL(app.location.navigated).searchParams.get('state');
  app.location.href = `${CLUB}/?fptux_sso=callback&state=${state}&code=obsolete`;
  const starting = app.sso.bootstrap();
  current = false; complete(response(200, credentials));
  await starting;
  assert.equal(app.session.read(), null);
});

for (const [sourceOrigin, destinationOrigin] of [[ADMIN, CLUB], [CLUB, ADMIN]]) {
  test('Admin SSO accepts the same actor in either direction: ' + sourceOrigin, async () => {
    const adminCredentials = { ...credentials, user: { id: 9, roles: ['ADMIN'] } };
    const destination = environment(destinationOrigin, sourceOrigin, async () => response(200, adminCredentials));
    await destination.sso.discover();
    const source = environment(sourceOrigin, destinationOrigin, async (url, options) => {
      assert.ok(url.endsWith('/sso/tickets'));
      assert.equal(JSON.parse(options.body).refreshToken, adminCredentials.refreshToken);
      return response(200, { code: 'admin-ticket' });
    });
    source.session.save(adminCredentials);
    source.location.href = destination.location.navigated;
    await source.sso.bootstrap();
    destination.location.href = source.location.navigated;
    await destination.sso.bootstrap();
    assert.deepEqual(destination.session.read().user.roles, ['ADMIN']);
    assert.equal(destination.session.read().user.id, 9);
  });
}
