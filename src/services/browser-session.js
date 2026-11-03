// Kept identical in both UIs. Cookies belong to Auth; no cross-site navigation,
// document.cookie access, or tokens in URLs are involved in session discovery.
async function request(session, method, fetcher) {
    const response = await fetcher(session.url('/api/auth/session'), {
        method, credentials: 'include', cache: 'no-store',
        headers: { 'X-FPTUX-Session': '1' }, signal: AbortSignal.timeout(15000),
    });
    if (response.status === 204) return null;
    if (!response.ok) throw Object.assign(new Error('Không thể kiểm tra phiên đăng nhập. Vui lòng thử lại.'), { status: response.status });
    const data = await response.json();
    if (!data?.browserSessionId || !(method === 'GET' ? data.user?.id != null : data.session?.accessToken))
        throw new Error('Phản hồi kiểm tra phiên đăng nhập không hợp lệ.');
    return data;
}

export async function verifyBrowserLogin(session, data) {
    // The authenticated login response is authoritative. Cookie discovery is optional SSO,
    // not a second gate which can reject a valid login with an origin/cookie 403.
    if (!data?.accessToken || data.user?.id == null)
        throw new Error('Phản hồi đăng nhập không hợp lệ.');
    return data;
}

export function createBrowserSession({ session, fetcher = (...args) => fetch(...args),
    isCurrent = () => true }) {
    let checking;
    async function sync() {
        if (!isCurrent() || session.isAuthenticating() || session.isLoggingOut() || session.isExpired?.())
            return Boolean(session.read());
        if (checking) return checking;
        const version = session.version();
        const current = () => isCurrent() && version === session.version()
            && !session.isAuthenticating() && !session.isLoggingOut() && !session.isExpired?.();
        checking = (async () => {
            const status = await request(session, 'GET', fetcher);
            if (!current()) return Boolean(session.read());
            if (!status) {
                const existing = session.read();
                if (existing) session.clear(existing.id);
                return false;
            }
            const existing = session.read();
            if (existing?.browserSessionId === status.browserSessionId
                && String(existing.user?.id) === String(status.user.id)) return true;
            const restored = await request(session, 'POST', fetcher);
            if (!current()) return Boolean(session.read());
            if (!restored) {
                if (existing) session.clear(existing.id);
                return false;
            }
            session.acceptLogin({ ...restored.session, browserSessionId: restored.browserSessionId }, version);
            return true;
        })().finally(() => { checking = null; });
        return checking;
    }
    async function bootstrap() {
        // Existing credentials are validated by the next protected API request.
        if (session.read()) return true;
        try { return await sync(); }
        catch (error) {
            // A rejected optional cookie-discovery origin must not block explicit token login.
            // Do not grant a session, alter the backend allow-list, or retry in the background.
            if (error.status === 403) return false;
            throw error;
        }
    }
    // Compatibility surface only: no timers, focus/visibility handlers or background requests.
    const watch = () => () => {};
    return { bootstrap, sync, watch };
}
