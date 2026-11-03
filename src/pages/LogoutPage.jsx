import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { session } from '../services/api.js';

export default function LogoutPage() {
    const location = useLocation();
    const denied = new URLSearchParams(location.search).get('reason') === 'forbidden';
    const [status, setStatus] = useState('loading');
    const [attempt, setAttempt] = useState(0);
    const request = useRef(null);
    useEffect(() => {
        let active = true;
        setStatus('loading');
        request.current ||= session.logout();
        request.current.then((result) => { if (active) setStatus(result?.confirmed ? 'done' : 'error'); });
        return () => { active = false; };
    }, [attempt]);
    return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
        <section style={{ maxWidth: 480 }}>
            <h1>{denied ? 'Không có quyền truy cập' : 'Đăng xuất'}</h1>
            {denied && <p>Không gian Admin dành cho CTSV và quản trị viên. Phiên tài khoản này đang được đăng xuất.</p>}
            <p role={status === 'error' ? 'alert' : 'status'}>{status === 'loading' ? 'Đang đăng xuất và vô hiệu hóa phiên trên máy chủ…' : status === 'done' ? 'Máy chủ đã xác nhận đăng xuất.' : 'Đã xóa phiên trên thiết bị. Chưa xác nhận được vô hiệu hóa trên máy chủ; hãy thử lại.'}</p>
            {status === 'error' && <button type="button" onClick={() => { request.current = null; setAttempt((value) => value + 1); }}>Thử lại đăng xuất</button>}
            {status === 'done' && <Link to="/">Đăng nhập bằng tài khoản khác</Link>}
        </section>
    </main>;
}
