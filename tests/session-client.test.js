import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionClient, observeSession, watchSessionRedirect, SESSION_KEY } from '../src/services/session-client.js';

const response = (status, data = {}) => new Response(status === 204 ? null : JSON.stringify(data), { status,
  headers: { 'Content-Type': 'application/json' } });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const tick = () => new Promise(r => setTimeout(r, 0));
const credentials = (name) => ({ accessToken: `access-${name}`, refreshToken: `refresh-${name}`, user: { id: name } });
function fixture(fetcher, shared = new Map(), target = new EventTarget(), locks, authTimeoutMs) {
  const storage = { getItem: k => shared.get(k) ?? null, setItem: (k, v) => shared.set(k, String(v)), removeItem: k => shared.delete(k) };
  return { client: createSessionClient({ baseUrl: 'https://api.test', storage, target, fetcher, locks, authTimeoutMs }), storage, target, shared };
}

test('downstream 401 after a successful refresh does not log out an identity still accepted by Auth', async () => {
  for (const identityStatus of [200, 503]) {
    const { client } = fixture(async url => {
      if (url.endsWith('/refresh')) return response(200, credentials('new'));
      if (url.endsWith('/api/users/me')) return response(identityStatus, { id: 'new' });
      return response(401);
    });
    client.save(credentials('old'));
    const visited = [];
    const stop = watchSessionRedirect(client, { destination: '/v2', location: { replace: url => visited.push(url) } });
    const result = await client.authFetch('https://api.test/api/users/me/profile');
    assert.equal(result.status, 401);
    assert.equal(client.read().accessToken, 'access-new');
    assert.deepEqual(visited, []);
    stop();
  }
});

test('an Auth identity 401 after refresh still expires the session without an extra identity probe', async () => {
  let identityReads = 0;
  const { client } = fixture(async url => {
    if (url.endsWith('/refresh')) return response(200, credentials('new'));
    identityReads++;
    return response(401);
  });
  client.save(credentials('old'));
  assert.equal((await client.authFetch('https://api.test/api/users/me')).status, 401);
  assert.equal(client.read(), null);
  assert.equal(identityReads, 2);
});

test('a stale Auth probe cannot clear credentials rotated while the probe is pending', async () => {
  const pending = deferred();
  const { client } = fixture(async url => {
    if (url.endsWith('/refresh')) return response(200, credentials('new'));
    if (url.endsWith('/api/users/me')) return pending.promise;
    return response(401);
  });
  client.save(credentials('old'));
  const request = client.authFetch('https://api.test/api/users/me/profile');
  await tick();
  client.save(credentials('newer'), client.read());
  pending.resolve(response(401));
  await request;
  assert.equal(client.read().accessToken, 'access-newer');
});

test('authentication timeout releases the login guard and keeps existing credentials', async () => {
  const { client } = fixture((url, options) => new Promise((resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
  }), new Map(), new EventTarget(), undefined, 5);
  client.save(credentials('existing'));
  const keepAlive = setTimeout(() => {}, 1000);
  try {
    const login = client.authenticate(() => client.authFetch('https://api.test/api/auth/google', {}, { anonymous: true }));
    assert.equal(client.isAuthenticating(), true);
    await assert.rejects(login, error => error.status === 504 && /Vui lòng thử lại/.test(error.message));
    assert.equal(client.isAuthenticating(), false);
    assert.equal(client.read().user.id, 'existing');
  } finally { clearTimeout(keepAlive); }
});

test('refresh timeout preserves credentials and permits a later retry', async () => {
  let attempts = 0;
  const { client } = fixture((url, options) => {
    if (++attempts > 1) return response(200, credentials('new'));
    return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true }));
  }, new Map(), new EventTarget(), undefined, 5);
  client.save(credentials('old'));
  const keepAlive = setTimeout(() => {}, 1000);
  try {
    await assert.rejects(client.refresh(), error => error.status === 504);
    assert.equal(client.read().refreshToken, 'refresh-old');
    assert.equal(await client.refresh(), 'access-new');
  } finally { clearTimeout(keepAlive); }
});

test('parallel expired requests share one refresh, retry once, and keep rotated credentials', async () => {
  let rotations = 0;
  const { client } = fixture(async (url, options) => {
    if (url.endsWith('/refresh')) { rotations++; await tick(); return response(200, credentials('new')); }
    return response(options.headers.get('Authorization') === 'Bearer access-new' ? 200 : 401);
  });
  client.save(credentials('old'));
  const results = await Promise.all([1, 2, 3].map(() => client.authFetch('/protected')));
  assert.deepEqual(results.map(x => x.status), [200, 200, 200]);
  assert.equal(rotations, 1);
  assert.equal(client.read().refreshToken, 'refresh-new');
});

for (const status of [400, 403, 500]) test(`retry ${status} preserves session and original response status`, async () => {
  const { client } = fixture(async (url, options) => url.endsWith('/refresh') ? response(200, credentials('new'))
    : response(options.headers.get('Authorization') === 'Bearer access-new' ? status : 401));
  client.save(credentials('old'));
  assert.equal((await client.authFetch('/protected')).status, status);
  assert.equal(client.read().accessToken, 'access-new');
});

test('network and refresh server errors preserve stored credentials', async () => {
  for (const failure of [() => { throw new TypeError('offline'); }, () => response(503)]) {
    const { client } = fixture(async url => url.endsWith('/refresh') ? failure() : response(401));
    client.save(credentials('old'));
    await assert.rejects(client.authFetch('/protected'));
    assert.equal(client.read().refreshToken, 'refresh-old');
  }
});

test('invalid refresh and repeated authenticated 401 expire the local session', async () => {
  for (const refreshStatus of [200, 401, 403]) {
    const { client } = fixture(async url => url.endsWith('/refresh') ? response(refreshStatus, credentials('new')) : response(401));
    client.save(credentials('old'));
    await client.authFetch('/protected').catch(() => {});
    assert.equal(client.read(), null);
  }
});

test('anonymous failed login does not refresh or attach another account bearer', async () => {
  let requests = 0;
  const { client } = fixture(async (url, options) => { requests++; assert.equal(options.headers.has('Authorization'), false); return response(401); });
  client.save(credentials('existing'));
  assert.equal((await client.authFetch('/login', { headers: { Authorization: 'stale' } }, { anonymous: true })).status, 401);
  assert.equal(requests, 1);
  assert.equal(client.read().user.id, 'existing');
});

test('logout while refresh is in flight cannot restore a session', async () => {
  const gate = deferred();
  const { client } = fixture(async url => url.endsWith('/refresh') ? gate.promise : response(401));
  client.save(credentials('old'));
  const request = client.authFetch('/protected');
  await tick(); client.clear(); gate.resolve(response(200, credentials('new')));
  await assert.rejects(request);
  assert.equal(client.read(), null);
});

test('account switch while a request is in flight never retries it under the new account', async () => {
  const gate = deferred(); let requests = 0;
  const { client } = fixture(async () => { requests++; return gate.promise; });
  client.save(credentials('a'));
  const request = client.authFetch('/protected');
  client.save(credentials('b')); gate.resolve(response(401));
  await assert.rejects(request);
  assert.equal(requests, 1);
  assert.equal(client.read().user.id, 'b');
});

test('Web Locks prevent duplicate rotations across app tabs', async () => {
  let tail = Promise.resolve(), rotations = 0;
  const locks = { request: (name, callback) => { const next = tail.then(callback); tail = next.catch(() => {}); return next; } };
  const fetcher = async (url, options) => {
    if (url.endsWith('/refresh')) { rotations++; await tick(); return response(200, credentials('new')); }
    return response(options.headers.get('Authorization') === 'Bearer access-new' ? 200 : 401);
  };
  const shared = new Map();
  const a = fixture(fetcher, shared, new EventTarget(), locks).client;
  const b = fixture(fetcher, shared, new EventTarget(), locks).client;
  a.save(credentials('old'));
  await Promise.all([a.authFetch('/a'), b.authFetch('/b')]);
  assert.equal(rotations, 1);
});

test('cross-tab login/logout revalidates identity and ignores stale user responses', async () => {
  const { client, target, storage } = fixture(async () => response(200));
  const pending = deferred(); const seen = [];
  const stop = observeSession(client, { loadUser: () => pending.promise, onUser: (user, loading) => seen.push({ user, loading }) });
  // Another tab writes the atomic session record, then the browser emits a storage event.
  const record = { ...credentials('a'), id: 'remote-tab-session' };
  storage.setItem(SESSION_KEY, JSON.stringify(record));
  const event = new Event('storage'); Object.defineProperty(event, 'key', { value: SESSION_KEY }); target.dispatchEvent(event);
  storage.removeItem(SESSION_KEY); target.dispatchEvent(event);
  pending.resolve({ id: 'a' }); await tick();
  assert.deepEqual(seen.at(-1), { user: null, loading: false });
  assert.equal(seen.filter(x => x.user?.id === 'a').length, 0);
  stop();
});

test('refresh-only changes do not repeatedly load the current user', async () => {
  const { client } = fixture(async () => response(200));
  client.save(credentials('a')); let loads = 0;
  const stop = observeSession(client, { loadUser: async () => { loads++; return { id: 'a' }; }, onUser() {} });
  await tick(); client.save(credentials('rotated'), client.read()); await tick();
  assert.equal(loads, 1); stop();
});

test('a retained stale identity cannot unmount Google login by retrying on popup focus', async () => {
  const { client, target } = fixture(async () => response(200));
  client.save(credentials('retained'));
  let loads = 0;
  const stop = observeSession(client, { target, loadUser: async () => {
    if (++loads === 1) throw new Error('transient identity failure');
    return { id: 'retained' };
  }, onUser() {} });
  await tick();
  const release = client.beginAuthentication();
  target.dispatchEvent(new Event('focus')); await tick();
  assert.equal(loads, 1);
  release(); target.dispatchEvent(new Event('focus')); await tick();
  assert.equal(loads, 2); stop();
});

test('logout with expired access revokes the rotated refresh token without saving it locally', async () => {
  const sent = [];
  const { client } = fixture(async (url, options) => {
    if (url.endsWith('/refresh')) return response(200, credentials('new'));
    sent.push(JSON.parse(options.body).refreshToken);
    return response(sent.length === 1 ? 401 : 204);
  });
  client.save(credentials('old')); await client.logout();
  assert.deepEqual(sent, ['refresh-old', 'refresh-new']);
  assert.equal(client.read(), null);
});

test('refresh-only legacy storage can restore a session without an access token', async () => {
  const shared = new Map([['refreshToken', 'refresh-old']]);
  const { client } = fixture(async () => response(200, credentials('new')), shared);
  assert.equal(await client.refresh(), 'access-new');
});

test('logout invalidates an in-flight login even when initially anonymous', () => {
  const { client } = fixture(async () => response(204));
  const version = client.version(); client.clear();
  assert.throws(() => client.acceptLogin(credentials('late'), version));
  assert.equal(client.read(), null);
});

test('stale legacy tokens and an old atomic record cannot revive the logout tombstone', () => {
  const { client, storage } = fixture(async () => response(204));
  const old = client.save(credentials('old')); client.clear();
  storage.setItem('accessToken', old.accessToken); storage.setItem('refreshToken', old.refreshToken);
  assert.equal(client.read(), null);
  storage.setItem(SESSION_KEY, JSON.stringify(old));
  assert.equal(client.read(), null);
});

test('session expiry redirects to /v2, but initial anonymous state does not navigate', () => {
  const { client } = fixture(async () => response(204));
  const visited = [];
  const stop = watchSessionRedirect(client, { destination: '/v2', location: { replace: path => visited.push(path) } });
  client.clear(); assert.deepEqual(visited, []);
  client.save(credentials('a')); client.clear();
  assert.deepEqual(visited, ['/v2']); stop();
});

test('initiating logout completes server revocation before redirecting to ClubHub /v2', async () => {
  const gate = deferred();
  const { client } = fixture(async () => gate.promise);
  client.save(credentials('a')); const visited = [];
  const stop = watchSessionRedirect(client, { destination: 'https://fptux-clubhub-ui.pages.dev/v2', location: { replace: path => visited.push(path) } });
  const signingOut = client.logout();
  assert.equal(client.read(), null); assert.deepEqual(visited, []);
  gate.resolve(response(204)); await signingOut;
  assert.deepEqual(visited, ['https://fptux-clubhub-ui.pages.dev/v2']); stop();
});
