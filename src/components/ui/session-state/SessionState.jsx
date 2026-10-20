import './SessionState.css';
import { LoaderCircle, ShieldAlert } from 'lucide-react';
import { Button } from '../button/Button.jsx';

export function SessionLoading() {
  return (
    <div className="session-state-content" role="status">
      <div className="session-state-content-2">
        <LoaderCircle className="session-state-loader-circle" size={24} aria-hidden="true" />
        Đang tải phiên đăng nhập…
      </div>
    </div>
  );
}

export function AccessDenied({ onLogout }) {
  return (
    <main className="session-state-main">
      <section className="session-state-section">
        <ShieldAlert className="session-state-shield-alert" size={32} aria-hidden="true" />
        <h1 className="session-state-title">Tài khoản chưa có quyền truy cập</h1>
        <p className="session-state-description">
          Không gian này dành cho Công tác sinh viên và quản trị viên hệ thống.
        </p>
        <Button onClick={onLogout}>Đăng nhập bằng tài khoản khác</Button>
      </section>
    </main>
  );
}
