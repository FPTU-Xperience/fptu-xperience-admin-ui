import { AlertCircle, LoaderCircle, ShieldCheck, Users } from 'lucide-react';
import { Button, Field } from '../components/ui/index.js';
import { defaultPathFor } from '../utils/access.js';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function Login() {
  const navigate = useNavigate();
  const { googleLogin, devLogin, isLoading, error, clearError } = useAuth();
  const [loginMode, setLoginMode] = useState('google');
  const [devEmail, setDevEmail] = useState('');
  const [localError, setLocalError] = useState('');
  const [googleReady, setGoogleReady] = useState(false);
  const googleButtonRef = useRef(null);
  const googleScriptRef = useRef(null);

  useEffect(() => {
    if (loginMode !== 'google' || !GOOGLE_CLIENT_ID) return;

    if (window.google?.accounts?.id) {
      initializeGoogle();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onerror = () => setLocalError('Không thể tải đăng nhập Google. Vui lòng thử lại.');
    script.onload = () => {
      googleScriptRef.current = script;
      initializeGoogle();
    };
    document.head.appendChild(script);

    return () => {
      if (googleScriptRef.current) {
        googleScriptRef.current.remove();
      }
    };
  }, [loginMode]);

  function initializeGoogle() {
    if (!window.google?.accounts?.id || !GOOGLE_CLIENT_ID || !googleButtonRef.current) return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleResponse,
    });

    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: 'outline',
      size: 'large',
      shape: 'rectangular',
      text: 'signin_with',
      locale: 'vi',
    });

    setGoogleReady(true);
  }

  async function handleGoogleResponse(response) {
    setLocalError('');
    clearError();

    try {
      const userData = await googleLogin(response.credential);
      navigateAfterLogin(userData);
    } catch (err) {
      setLocalError(err.message || 'Đăng nhập Google thất bại.');
    }
  }

  async function handleDevSubmit(e) {
    e.preventDefault();
    setLocalError('');
    clearError();

    if (!devEmail.trim()) {
      setLocalError('Vui lòng nhập email để đăng nhập dev.');
      return;
    }

    try {
      const userData = await devLogin(devEmail.trim());
      navigateAfterLogin(userData);
    } catch (err) {
      setLocalError(err.message || 'Dev login thất bại.');
    }
  }

  function navigateAfterLogin(userData) {
    navigate(defaultPathFor(userData), { replace: true });
  }

  const displayError = localError || error;

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-4xl grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] bg-surface-card border border-border rounded-2xl overflow-hidden">
        <aside className="p-6 sm:p-8 bg-surface border-b md:border-b-0 md:border-r border-border">
          <p className="text-xs text-accent font-semibold mb-3">FPTU Xperience</p>
          <h1 className="text-2xl font-semibold leading-tight text-ink">Không gian quản trị</h1>
          <p className="text-sm text-muted mt-3">
            Dành cho Công tác sinh viên và quản trị viên hệ thống.
          </p>
          <ul className="hidden md:grid gap-5 mt-10 text-sm text-muted">
            <li className="flex gap-3">
              <Users size={20} className="text-accent" aria-hidden="true" />
              <span>Quản lý câu lạc bộ và trải nghiệm sinh viên</span>
            </li>
            <li className="flex gap-3">
              <ShieldCheck size={20} className="text-accent" aria-hidden="true" />
              <span>Quản lý tài khoản và cấu hình hệ thống</span>
            </li>
          </ul>
        </aside>
        <section className="min-w-0 p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-ink">Đăng nhập</h2>
          <p className="text-sm text-muted mt-2 mb-6">Sử dụng tài khoản được cấp quyền truy cập.</p>
          <div
            className="flex gap-2 border-b border-border mb-6 pb-3"
            role="group"
            aria-label="Phương thức đăng nhập"
          >
            {['google', 'dev'].map((mode) => (
              <Button
                key={mode}
                type="button"
                variant={loginMode === mode ? 'primary' : 'secondary'}
                aria-pressed={loginMode === mode}
                onClick={() => {
                  setLoginMode(mode);
                  setLocalError('');
                  clearError();
                }}
              >
                {mode === 'google' ? 'Google' : 'Dev Login'}
              </Button>
            ))}
          </div>
          {displayError && (
            <p
              role="alert"
              className="flex gap-2 text-sm text-red-text bg-surface p-3 rounded-lg mb-4"
            >
              <AlertCircle size={18} aria-hidden="true" />
              {displayError}
            </p>
          )}
          {loginMode === 'google' ? (
            <div className="space-y-5">
              {!GOOGLE_CLIENT_ID ? (
                <p className="text-sm text-muted">
                  Đăng nhập Google chưa sẵn sàng. Bạn có thể dùng Dev Login trong môi trường phát
                  triển.
                </p>
              ) : (
                <>
                  <div ref={googleButtonRef} className="flex justify-center min-w-0" />
                  {!googleReady && (
                    <p className="flex gap-2 items-center text-sm text-muted" role="status">
                      <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
                      Đang tải đăng nhập Google…
                    </p>
                  )}
                </>
              )}
              <Button className="w-full" onClick={() => setLoginMode('dev')}>
                Chuyển sang Dev Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleDevSubmit} className="space-y-5">
              <p className="text-xs text-muted">
                Chế độ phát triển · Chỉ tài khoản Admin hoặc CTSV được truy cập.
              </p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Tài khoản thử nghiệm">
                <Button type="button" onClick={() => setDevEmail('admin@fpt.edu.vn')}>
                  Admin
                </Button>
                <Button type="button" onClick={() => setDevEmail('ctsv.an@fpt.edu.vn')}>
                  CTSV
                </Button>
              </div>
              <Field label="Email tài khoản">
                <input
                  type="email"
                  required
                  value={devEmail}
                  onChange={(event) => setDevEmail(event.target.value)}
                  autoComplete="email"
                  disabled={isLoading}
                  className="w-full"
                />
              </Field>
              <Button type="submit" variant="primary" className="w-full" busy={isLoading}>
                Đăng nhập
              </Button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
