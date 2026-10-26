// Kept identical in Admin and ClubHub: each app is built and deployed independently.
export const SESSION_KEY = 'fptux:session:v1';
const GENERATION_KEY = 'fptux:session:generation';
const SESSION_EVENT = 'fptux:session-changed';

export function createSessionClient({ baseUrl, storage = globalThis.localStorage, target = globalThis.window,
  locks = globalThis.navigator?.locks, fetcher = (...args) => fetch(...args), authTimeoutMs = 20000 }) {
  let refreshing = null;
  let loggingOut = false;
  let authenticating = 0;
  function beginAuthentication(timeoutMs = 300000) {
    authenticating++;
    let finished = false, timer;
    const release = () => {
      if (finished) return;
      finished = true;
      authenticating--;
      clearTimeout(timer);
    };
    if (timeoutMs > 0) {
      timer = setTimeout(release, timeoutMs);
      timer.unref?.();
    }
    return release;
  }
  async function authenticate(action) {
    const release = beginAuthentication(0);
    try { return await action(); }
    finally { release(); }
  }
  async function fetchAuth(input, options) {
    try { return await fetcher(input, options); }
    catch (error) {
      if (error.name === 'TimeoutError') throw Object.assign(
        new Error('Máy chủ xác thực phản hồi quá chậm. Vui lòng thử lại.'), { status: 504 });
      throw error;
    }
  }
  const url = (path) => `${baseUrl.replace(/\/+$/, '')}${baseUrl.endsWith('/api') ? path.replace(/^\/api/, '') : path}`;
  const read = () => {
    try {
      const record = storage.getItem(SESSION_KEY);
      const generation = storage.getItem(GENERATION_KEY);
      if (record) {
        const parsed = JSON.parse(record);
        return !generation || generation === parsed.id ? parsed : null;
      }
      // A tombstone prevents stale legacy-key writes from reviving a signed-out session.
      if (generation) return null;
      const accessToken = storage.getItem('accessToken');
      const refreshToken = storage.getItem('refreshToken');
      return accessToken || refreshToken ? { accessToken, refreshToken, id: `legacy:${refreshToken || accessToken}` } : null;
    } catch { return null; }
  };
  const notify = () => target?.dispatchEvent(new Event(SESSION_EVENT));
  function save(data, previous = null) {
    if (!data?.accessToken) throw new Error('Phản hồi đăng nhập thiếu access token.');
    const record = { id: previous?.id || crypto.randomUUID(), accessToken: data.accessToken,
      refreshToken: data.refreshToken || (previous ? previous.refreshToken : null), user: data.user || previous?.user || null };
    // The record is the authoritative atomic write; legacy keys serve existing readers only.
    if (!previous) storage.setItem(GENERATION_KEY, record.id);
    storage.setItem('accessToken', record.accessToken);
    if (record.refreshToken) storage.setItem('refreshToken', record.refreshToken);
    else storage.removeItem('refreshToken');
    storage.setItem(SESSION_KEY, JSON.stringify(record));
    notify();
    return record;
  }
  function clear(expectedId) {
    if (expectedId && read()?.id !== expectedId) return;
    storage.setItem(GENERATION_KEY, crypto.randomUUID());
    storage.removeItem('accessToken');
    storage.removeItem('refreshToken');
    storage.removeItem('user');
    storage.removeItem('fptu-auth-user');
    storage.removeItem(SESSION_KEY);
    notify();
  }
  function subscribe(callback) {
    const changed = (event) => {
      if (event.type === 'storage' && event.key !== SESSION_KEY && event.key !== null) return;
      callback(read());
    };
    target?.addEventListener(SESSION_EVENT, changed);
    target?.addEventListener('storage', changed);
    return () => {
      target?.removeEventListener(SESSION_EVENT, changed);
      target?.removeEventListener('storage', changed);
    };
  }
  const error = (status) => Object.assign(new Error(status === 401 ? 'Phiên đăng nhập đã hết hạn.' : 'Không thể làm mới phiên đăng nhập.'), { status });
  async function refresh(rejectedToken = read()?.accessToken) {
    if (refreshing) return refreshing;
    const initial = read();
    const rotate = async () => {
      const current = read();
      if (!initial || current?.id !== initial.id) throw error(401);
      if (current.accessToken && current.accessToken !== rejectedToken) return current.accessToken;
      if (!current.refreshToken) { clear(current.id); throw error(401); }
      const response = await fetchAuth(url('/api/auth/refresh'), { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: current.refreshToken }),
        signal: AbortSignal.timeout(authTimeoutMs) });
      // Never revive a session after logout/account switching while refresh was in flight.
      const latest = read();
      if (latest?.id !== current.id) throw error(401);
      if (latest.refreshToken !== current.refreshToken) return latest.accessToken;
      if (!response.ok) {
        console.warn('[auth] Refresh rejected:', response.status);
        if (response.status === 401 || response.status === 403) clear(current.id);
        throw error(response.status);
      }
      const data = await response.json();
      const afterParse = read();
      if (afterParse?.id !== current.id) throw error(401);
      if (afterParse.refreshToken !== current.refreshToken) return afterParse.accessToken;
      return save(data, current).accessToken;
    };
    refreshing = (locks ? locks.request('fptux:refresh', rotate) : rotate()).finally(() => { refreshing = null; });
    return refreshing;
  }
  async function authFetch(input, options = {}, { anonymous = false, bodyFactory } = {}) {
    const initial = read();
    const send = (token) => {
      const headers = new Headers(options.headers);
      if (anonymous) headers.delete('Authorization');
      if (!anonymous && token) headers.set('Authorization', `Bearer ${token}`);
      const authRequest = /\/api\/(?:auth\/(?:google|email-login)|users\/me|v1\/me)(?:[?#]|$)/.test(String(input));
      return fetchAuth(input, { ...options, ...(authRequest && !options.signal ? { signal: AbortSignal.timeout(authTimeoutMs) } : {}),
        headers, ...(bodyFactory ? { body: bodyFactory() } : {}) });
    };
    let response = await send(initial?.accessToken);
    if (!anonymous && initial && read()?.id !== initial.id) throw error(401);
    if (response.status !== 401 || anonymous || !initial) return response;
    if (read()?.id !== initial.id) throw error(401);
    const token = await refresh(initial.accessToken);
    if (read()?.id !== initial.id) throw error(401);
    response = await send(token);
    // Permission, validation and server errors must not log the user out.
    if (response.status === 401) {
      console.warn('[auth] Request rejected after refresh:', new URL(input, baseUrl).pathname);
      // A downstream service can reject its own JWT/configuration while Auth still
      // accepts this login. Only an authoritative identity rejection expires it.
      const identityPath = /\/api\/(?:users\/me|v1\/me)\/?$/.test(new URL(input, baseUrl).pathname);
      let identityRejected = identityPath;
      if (!identityPath) {
        try {
          const identity = await fetchAuth(url('/api/users/me'), {
            headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(authTimeoutMs),
          });
          identityRejected = identity.status === 401;
        } catch { /* An unavailable identity service is not a definitive session rejection. */ }
      }
      const latest = read();
      if (identityRejected && latest?.id === initial.id && latest.accessToken === token) clear(initial.id);
    }
    return response;
  }
  async function logout() {
    const current = read();
    loggingOut = true;
    clear();
    // Revocation works even after access-token expiry, without restoring local state.
    let credentials = current;
    const revoke = () => fetcher(url('/api/auth/logout'), { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${credentials?.accessToken}` },
      body: JSON.stringify({ refreshToken: credentials?.refreshToken || '' }), signal: AbortSignal.timeout(10000) });
    try {
      if (!current) return;
      const result = await revoke();
      if (result.status === 401 && current.refreshToken) {
        const rotated = await fetcher(url('/api/auth/refresh'), { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: current.refreshToken }), signal: AbortSignal.timeout(10000) });
        if (rotated.ok) { credentials = await rotated.json(); await revoke(); }
      }
    } catch { /* The browser session stays signed out when the server is unreachable. */ }
    finally { loggingOut = false; notify(); }
  }
  const version = () => `${storage.getItem(GENERATION_KEY)}:${read()?.id || ''}`;
  const acceptLogin = (data, expectedVersion) => {
    if (version() !== expectedVersion) throw error(409);
    return save(data);
  };
  return { read, save, clear, subscribe, refresh, authFetch, logout, url, version, acceptLogin, authenticate, beginAuthentication,
    isAuthenticating: () => authenticating > 0, isLoggingOut: () => loggingOut };
}

export function watchSessionRedirect(client, { destination, location = globalThis.window.location }) {
  let hadSession = Boolean(client.read());
  let pending = false;
  return client.subscribe(record => {
    if (record) { hadSession = true; pending = false; return; }
    if (!hadSession && !pending) return;
    hadSession = false;
    pending = true;
    // Finish server revocation before the initiating tab navigates away.
    if (!client.isLoggingOut()) { pending = false; location.replace(destination); }
  });
}

// Ignore refresh-only changes; invalidate in-flight identity reads on account changes/logout.
export function observeSession(client, { loadUser, onUser, onError = () => {}, target = globalThis.window }) {
  let currentId;
  let generation = 0;
  let disposed = false;
  const retryPending = Symbol('retry');
  const sync = async (record) => {
    if (record?.id === currentId) return;
    currentId = record?.id;
    const ticket = ++generation;
    onUser(null, Boolean(record));
    if (!record) return;
    try {
      if (!record.accessToken) await client.refresh();
      const user = await loadUser();
      if (!disposed && ticket === generation && client.read()?.id === record.id) {
        const latest = client.read();
        if (!latest.user) client.save({ ...latest, user }, latest);
        onUser(user, false);
      }
    } catch (error) {
      if (!disposed && ticket === generation) {
        if (client.read()) currentId = retryPending;
        onUser(null, false);
        onError(error);
      }
    }
  };
  const unsubscribe = client.subscribe(sync);
  const retry = () => { if (currentId === retryPending && !client.isAuthenticating()) sync(client.read()); };
  target?.addEventListener('focus', retry);
  // A distinct initial sentinel makes the anonymous state observable too.
  currentId = Symbol('initial');
  sync(client.read());
  return () => { disposed = true; generation++; unsubscribe(); target?.removeEventListener('focus', retry); };
}
