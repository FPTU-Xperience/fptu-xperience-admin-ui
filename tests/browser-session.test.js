import assert from 'node:assert/strict';
import test from 'node:test';
import { createBrowserSession, verifyBrowserLogin } from '../src/services/browser-session.js';
import { createSessionClient } from '../src/services/session-client.js';

const reply = (data) => new Response(data ? JSON.stringify(data) : null, { status: data ? 200 : 204 });
const identity = (id) => ({ user: { id, roles: ['ADMIN'] }, browserSessionId: `browser-${id}` });
function app(jar) {
    const map = new Map();
    const target = new EventTarget();
    const document = new EventTarget();
    document.visibilityState = 'visible';
    let poll;
    target.setInterval = (callback) => { poll = callback; return 1; };
    target.clearInterval = () => {};
    const storage = { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, String(value)), removeItem: key => map.delete(key) };
    const calls = [];
    const fetcher = async (url, options) => {
        calls.push(options.method);
        assert.equal(url, 'https://auth.example.edu/api/auth/session');
        assert.equal(options.credentials, 'include');
        assert.equal(options.headers['X-FPTUX-Session'], '1');
        assert.equal(options.cache, 'no-store');
        if (jar.error) return new Response(null, { status: 503 });
        if (!jar.id) return reply(null);
        if (options.method === 'GET') return reply(identity(jar.id));
        return reply({ browserSessionId: `browser-${jar.id}`, session: {
            accessToken: `access-${jar.id}`, refreshToken: `refresh-${jar.id}`, user: identity(jar.id).user,
        } });
    };
    const session = createSessionClient({ baseUrl: 'https://auth.example.edu', storage, target });
    const browser = createBrowserSession({ session, fetcher, target, document });
    return { session, browser, calls, target, document, fetcher, poll: () => poll?.() };
}

test('both sites restore one Auth cookie despite having completely separate local storage', async () => {
    const jar = { id: 'staff' };
    const club = app(jar), admin = app(jar);
    await Promise.all([club.browser.bootstrap(), admin.browser.bootstrap()]);
    assert.equal(club.session.read().user.id, 'staff');
    assert.equal(admin.session.read().user.id, 'staff');
    assert.equal(club.session.read().browserSessionId, admin.session.read().browserSessionId);
    assert.deepEqual(club.calls, ['GET', 'POST']);
    assert.deepEqual(admin.calls, ['GET', 'POST']);
    await admin.browser.sync();
    assert.deepEqual(admin.calls, ['GET', 'POST', 'GET']); // A check never rotates or creates another branch.
});

test('anonymous ClubHub stays anonymous without restoring tokens or navigating', async () => {
    const club = app({});
    assert.equal(await club.browser.bootstrap(), false);
    assert.equal(club.session.read(), null);
    assert.deepEqual(club.calls, ['GET']);
});

test('cookie revocation signs both sites out; transient Auth failures retain local credentials', async () => {
    const jar = { id: 'staff' };
    const club = app(jar), admin = app(jar);
    await Promise.all([club.browser.bootstrap(), admin.browser.bootstrap()]);
    jar.error = true;
    await assert.rejects(admin.browser.sync());
    assert.equal(admin.session.read().user.id, 'staff');
    jar.error = false;
    jar.id = null;
    await Promise.all([club.browser.sync(), admin.browser.sync()]);
    assert.equal(club.session.read(), null);
    assert.equal(admin.session.read(), null);
});

test('a newer shared cookie switches stale local accounts and survives refresh-only token updates', async () => {
    const jar = { id: 'old' };
    const admin = app(jar);
    await admin.browser.bootstrap();
    jar.id = 'new';
    await admin.browser.sync();
    const current = admin.session.read();
    assert.equal(current.user.id, 'new');
    admin.session.save({ accessToken: 'rotated-access' }, current);
    assert.equal(admin.session.read().browserSessionId, 'browser-new');
    const calls = admin.calls.length;
    await admin.browser.sync();
    assert.equal(admin.calls.length, calls + 1);
});

test('cookie checks cannot resurrect a session after logout or replace a login in flight', async () => {
    let complete;
    const local = app({});
    const browser = createBrowserSession({ session: local.session, target: local.target, document: local.document,
        fetcher: () => new Promise(resolve => { complete = resolve; }) });
    const checking = browser.bootstrap();
    local.session.clear();
    complete(reply(identity('stale')));
    await checking;
    assert.equal(local.session.read(), null);
    const release = local.session.beginAuthentication();
    const count = local.calls.length;
    await local.browser.sync();
    assert.equal(local.calls.length, count);
    release();
});

test('explicit sign-in accepts the authenticated response without an extra cookie probe', async () => {
    const local = app({});
    const data = { accessToken: 'token', user: { id: 'staff' } };
    assert.equal(await verifyBrowserLogin(local.session, data, local.fetcher), data);
    assert.deepEqual(local.calls, []);
    await assert.rejects(verifyBrowserLogin(local.session, { user: { id: 'staff' } }), /hợp lệ/);
});

test('existing local session skips cookie discovery, even if discovery would fail', async () => {
    const local = app({ error: true });
    local.session.save({ accessToken: 'existing', refreshToken: 'refresh', user: { id: 'staff' } });
    assert.equal(await local.browser.bootstrap(), true);
    assert.deepEqual(local.calls, []);
});

test('idle time, focus and visibility changes do not poll or validate a session', async () => {
    const local = app({});
    local.target.setInterval = () => { throw new Error('No polling timers allowed'); };
    await local.browser.bootstrap();
    const stop = local.browser.watch();
    for (let i = 0; i < 20; i++) {
        local.target.dispatchEvent(new Event('focus'));
        local.document.dispatchEvent(new Event('visibilitychange'));
        local.poll();
    }
    await Promise.resolve();
    assert.deepEqual(local.calls, ['GET']);
    stop();
});

test('403 from optional initial cookie discovery leaves the app anonymous and does not loop', async () => {
    const local = app({});
    let calls = 0;
    const browser = createBrowserSession({ session: local.session,
        fetcher: async () => { calls++; return new Response(null, { status: 403 }); } });
    assert.equal(await browser.bootstrap(), false);
    const stop = browser.watch();
    local.target.dispatchEvent(new Event('focus'));
    assert.equal(calls, 1);
    assert.equal(local.session.read(), null);
    stop();
});
