import { LoaderCircle, ShieldAlert } from 'lucide-react';
import { Button } from './Button.jsx';

export function SessionLoading() {
  return (
    <div className="min-h-screen grid place-items-center bg-surface text-muted" role="status">
      <div className="flex items-center gap-3">
        <LoaderCircle className="animate-spin" size={24} aria-hidden="true" />
        Đang tải phiên đăng nhập…
      </div>
    </div>
  );
}

export function AccessDenied({ onLogout }) {
  return (
    <main className="min-h-screen grid place-items-center bg-surface p-6">
      <section className="max-w-md text-center space-y-4">
        <ShieldAlert className="mx-auto text-accent" size={32} aria-hidden="true" />
        <h1 className="text-2xl font-semibold">Tài khoản chưa có quyền truy cập</h1>
        <p className="text-muted">
          Không gian này dành cho Công tác sinh viên và quản trị viên hệ thống.
        </p>
        <Button onClick={onLogout}>Đăng nhập bằng tài khoản khác</Button>
      </section>
    </main>
  );
}
