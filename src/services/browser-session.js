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

export async function verifyBrowserLogin(session, data, fetcher = (...args) => fetch(...args)) {
    const status = await request(session, 'GET', fetcher);
    if (!status || String(status.user.id) !== String(data.user?.id))
        throw new Error('Không thể lưu phiên đăng nhập trên trình duyệt này. Vui lòng thử lại hoặc liên hệ hỗ trợ.');
    return { ...data, browserSessionId: status.browserSessionId };
}

export function createBrowserSession({ session, fetcher = (...args) => fetch(...args),
    target = window, document = window.document, isCurrent = () => true }) {
    let checking;
    async function sync() {
        if (!isCurrent() || session.isAuthenticating() || session.isLoggingOut()) return Boolean(session.read());
        if (checking) return checking;
        const version = session.version();
        const current = () => isCurrent() && version === session.version()
            && !session.isAuthenticating() && !session.isLoggingOut();
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
    function watch() {
        const check = () => {
            if (document?.visibilityState !== 'hidden') sync().catch(() => {});
        };
        target.addEventListener('focus', check);
        document?.addEventListener('visibilitychange', check);
        const interval = target.setInterval(check, 15000);
        return () => {
            target.removeEventListener('focus', check);
            document?.removeEventListener('visibilitychange', check);
            target.clearInterval(interval);
        };
    }
    return { bootstrap: sync, sync, watch };
}
