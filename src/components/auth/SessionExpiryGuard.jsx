import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SessionExpiryGuard.css';

export default function SessionExpiryGuard({ session, loginTo, children }) {
    const [expired, setExpired] = useState(() => session.isExpired());
    const loginButton = useRef(null);
    const navigate = useNavigate();
    useEffect(() => {
        const update = () => setExpired(session.isExpired());
        update();
        return session.subscribe(update);
    }, [session]);
    useEffect(() => {
        if (!expired) return undefined;
        const previous = document.activeElement;
        loginButton.current?.focus();
        return () => { if (previous?.isConnected) previous.focus?.(); };
    }, [expired]);
    return <>
        <div className="session-expiry-content" {...(expired ? { inert: '', 'aria-hidden': true } : {})}>{children}</div>
        {expired && <div className="session-expiry-backdrop">
            <section className="session-expiry-dialog" role="alertdialog" aria-modal="true" aria-labelledby="session-expiry-title" aria-describedby="session-expiry-description" onKeyDown={(event) => {
                if (event.key === 'Tab') { event.preventDefault(); loginButton.current?.focus(); }
                if (event.key === 'Escape') event.preventDefault();
            }}>
                <span className="session-expiry-icon" aria-hidden="true">!</span>
                <h1 id="session-expiry-title">Phiên đăng nhập đã hết hạn</h1>
                <p id="session-expiry-description">Vui lòng đăng nhập lại để tiếp tục. Thao tác vừa rồi chưa được xác nhận thành công.</p>
                <button ref={loginButton} type="button" onClick={() => {
                    session.acknowledgeExpiry();
                    navigate(loginTo, { replace: true });
                }}>Đăng nhập lại</button>
            </section>
        </div>}
    </>;
}
