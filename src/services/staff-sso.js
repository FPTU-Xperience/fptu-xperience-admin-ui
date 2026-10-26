const PENDING_KEY = 'fptux:sso:pending';
const LAST_ATTEMPT_KEY = 'fptux:sso:last-attempt';
const MODE = 'fptux_sso';
export const isStaff = (user) => user?.roles?.some(role => ['ADMIN', 'SYSTEM_ADMIN', 'STUDENT_AFFAIRS_ADMIN', 'STUDENT_AFFAIR'].includes(role)) === true;
const encode = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const random = () => encode(crypto.getRandomValues(new Uint8Array(32)));
export const challengeFor = async (verifier) => encode(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));

// Only an opaque, single-use, PKCE-bound code crosses app URLs. Tokens stay in API responses.
// Top-level navigation works even when third-party cookies/storage are blocked.
export function createStaffSso({ session, peerUrl, landingPath = '/', signedOutUrl = landingPath,
  location = window.location, history = window.history, tabStorage = window.sessionStorage,
  target = window, document = window.document, fetcher = (...args) => fetch(...args), now = Date.now,
  isCurrent = () => true }) {
  const peer = new URL(peerUrl);
  let discovering = false;
  if (!['https:', 'http:'].includes(peer.protocol) || peer.origin === location.origin) throw new Error('Invalid SSO peer origin.');
  const callback = (state, code) => {
    if (!isCurrent()) return;
    const url = new URL('/', peer.origin);
    url.searchParams.set(MODE, 'callback');
    url.searchParams.set('state', state);
    if (code) url.searchParams.set('code', code);
    location.replace(url.href);
  };
  async function discover(force = false) {
    if (!isCurrent() || discovering || session.read() || session.isAuthenticating?.()) return false;
    const lastAttempt = Number(tabStorage.getItem(LAST_ATTEMPT_KEY) || 0);
    if (!force && now() - lastAttempt < 30000) return false;
    discovering = true;
    try {
      const verifier = random(), state = random();
      tabStorage.setItem(PENDING_KEY, JSON.stringify({ verifier, state, returnUrl: location.href, createdAt: now() }));
      tabStorage.setItem(LAST_ATTEMPT_KEY, String(now()));
      const url = new URL('/', peer.origin);
      url.searchParams.set(MODE, 'request');
      url.searchParams.set('state', state);
      url.searchParams.set('challenge', await challengeFor(verifier));
      if (!isCurrent() || session.read() || session.isAuthenticating?.()) {
        tabStorage.removeItem(PENDING_KEY);
        return false;
      }
      location.replace(url.href);
      return true;
    } finally { discovering = false; }
  }
  async function bootstrap() {
    const url = new URL(location.href);
    const mode = url.searchParams.get(MODE);
    if (mode === 'request') {
      const state = url.searchParams.get('state') || '';
      const challenge = url.searchParams.get('challenge') || '';
      // This app has exactly one configured peer; caller-supplied redirect URLs are never used.
      if (!/^[\w-]{43}$/.test(state) || !/^[\w-]{43}$/.test(challenge)) {
        history.replaceState(null, '', landingPath); return false;
      }
      let code;
      const record = session.read();
      if (record?.refreshToken && (!record.user || isStaff(record.user))) {
        try {
          // authFetch may rotate; build the source refresh token at send time.
          const result = await session.authFetch(session.url('/api/auth/sso/tickets'), {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(10000),
          }, { bodyFactory: () => JSON.stringify({ refreshToken: session.read()?.refreshToken,
            targetOrigin: peer.origin, codeChallenge: challenge }) });
          if (result.ok) code = (await result.json()).code;
        } catch { /* Return to the requesting app's login screen if SSO is unavailable. */ }
      }
      callback(state, code); return true;
    }
    if (mode === 'callback') {
      let pending;
      try { pending = JSON.parse(tabStorage.getItem(PENDING_KEY)); } catch { /* Invalid/expired tab state. */ }
      tabStorage.removeItem(PENDING_KEY);
      // Clean the code from browser history before making network requests or rendering the app.
      const safeReturn = pending?.returnUrl && new URL(pending.returnUrl).origin === location.origin
        ? pending.returnUrl : landingPath;
      history.replaceState(null, '', safeReturn);
      if (!pending || pending.state !== url.searchParams.get('state') || now() - pending.createdAt > 120000) return false;
      const code = url.searchParams.get('code');
      if (!code || session.read()) return false;
      try {
        const result = await fetcher(session.url('/api/auth/sso/redeem'), { method: 'POST',
          signal: AbortSignal.timeout(10000),
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, codeVerifier: pending.verifier }) });
        if (result.ok) {
          const data = await result.json();
          if (isCurrent() && isStaff(data.user) && !session.read()) session.save(data);
        }
      } catch { /* The normal login screen remains usable. */ }
      return false;
    }
    // A stale local session must not hide a valid CTSV session in the other app.
    const existing = session.read();
    if (existing) {
      try {
        const result = await session.authFetch(session.url('/api/users/me'), { signal: AbortSignal.timeout(10000) });
        if (result.status === 401) session.clear(existing.id);
      } catch { /* Retain credentials on transient failure; authFetch clears definitive rejection. */ }
      if (!isCurrent() || session.read()) return false;
      location.replace(signedOutUrl);
      return true;
    }
    return discover();
  }
  function watch() {
    let checking = false;
    let lostFocus = false;
    let focusTimer;
    let resumeDiscovery = false;
    const schedule = target.setTimeout?.bind(target) || globalThis.setTimeout;
    const cancel = target.clearTimeout?.bind(target) || globalThis.clearTimeout;
    const check = async () => {
      if (checking || session.isAuthenticating?.() || document?.visibilityState === 'hidden') return;
      const record = session.read();
      if (!record?.refreshToken || !isStaff(record.user)) return;
      checking = true;
      try {
        // Status does not rotate tokens. A rotation racing this read cannot sign the tab out.
        const result = await fetcher(session.url('/api/auth/sso/status'), { method: 'POST',
          signal: AbortSignal.timeout(10000),
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: record.refreshToken }) });
        const latest = session.read();
        if (result.status === 401 && !session.isAuthenticating?.() && latest?.id === record.id && latest.refreshToken === record.refreshToken) {
          console.warn('[auth] Staff SSO status rejected the current session.');
          session.clear(record.id);
        }
      } catch { /* Offline/server errors do not expire a valid local session. */ }
      finally { checking = false; }
    };
    const onFocus = () => {
      if (document?.visibilityState === 'hidden') return;
      resumeDiscovery ||= lostFocus;
      lostFocus = false;
      cancel(focusTimer);
      // Google popup callbacks must be allowed to start/finish sign-in before SSO can navigate.
      focusTimer = schedule(() => {
        const force = resumeDiscovery;
        resumeDiscovery = false;
        if (session.read()) return check();
        // Mere window focus (DevTools/Google popup) is not a peer-login signal.
        if (force) return discover(true).catch(() => {});
      }, 250);
    };
    const unsubscribe = session.subscribe(record => {
      if (!record) tabStorage.setItem(LAST_ATTEMPT_KEY, String(now()));
    });
    target.addEventListener('focus', onFocus);
    const visible = () => {
      if (document?.visibilityState === 'hidden') lostFocus = true;
      else if (document?.visibilityState === 'visible') onFocus();
    };
    document?.addEventListener('visibilitychange', visible);
    const interval = target.setInterval(check, 15000);
    check();
    return () => {
      unsubscribe(); target.removeEventListener('focus', onFocus);
      cancel(focusTimer);
      document?.removeEventListener('visibilitychange', visible); target.clearInterval(interval);
    };
  }
  return { bootstrap, discover, watch };
}
