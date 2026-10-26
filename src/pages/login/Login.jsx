import './Login.css';
import { AlertCircle, LoaderCircle, ShieldCheck, Users } from 'lucide-react';
import { Button, Field } from '../../components/ui/index.js';
import { defaultPathFor } from '../../utils/access.js';
import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import Brand from '../../components/common/brand/Brand.jsx';
import { session } from '../../services/api.js';
import { bindGoogleSignIn } from '../../services/google-signin.js';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function Login() {
  const navigate = useNavigate();
  const { googleLogin, emailLogin, isLoading, isSigningIn, error, clearError } = useAuth();
  const busy = isLoading || isSigningIn;
  const [loginMode, setLoginMode] = useState('google');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const shortcuts = import.meta.env.VITE_LOGIN_ACCOUNT_SHORTCUTS === 'true';
  const [localError, setLocalError] = useState('');
  const [googleReady, setGoogleReady] = useState(false);
  const googleButtonRef = useRef(null);
  const popupAuthEnd = useRef(null);
  const credentialHandler = useRef(null);
  credentialHandler.current = handleGoogleResponse;
  const panelContentRef = useRef(null);
  const [panelHeight, setPanelHeight] = useState(null);

  useLayoutEffect(() => {
    const content = panelContentRef.current;
    const updateHeight = () => setPanelHeight(content.offsetHeight + 2);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (loginMode !== 'google' || !GOOGLE_CLIENT_ID) return;

    let disposed = false, unbind;
    const initialize = () => {
      if (disposed || !googleButtonRef.current || !window.google?.accounts?.id) return;
      unbind?.();
      unbind = bindGoogleSignIn(window.google.accounts.id, GOOGLE_CLIENT_ID,
        response => credentialHandler.current?.(response));
      googleButtonRef.current.replaceChildren();
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline', size: 'large', shape: 'rectangular', text: 'signin_with', locale: 'vi',
        click_listener: () => {
          popupAuthEnd.current?.();
          popupAuthEnd.current = session.beginAuthentication();
        },
      });
      setGoogleReady(true);
    };
    const onError = () => setLocalError('Không thể tải đăng nhập Google. Vui lòng thử lại.');
    let script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener('load', initialize);
    script.addEventListener('error', onError);
    if (window.google?.accounts?.id) initialize();
    return () => {
      disposed = true;
      unbind?.();
      popupAuthEnd.current?.();
      popupAuthEnd.current = null;
      script.removeEventListener('load', initialize);
      script.removeEventListener('error', onError);
    };
  }, [loginMode]);

  async function handleGoogleResponse(response) {
    setLocalError('');
    clearError();

    try {
      const userData = await googleLogin(response.credential);
      navigateAfterLogin(userData);
    } catch (err) {
      setLocalError(err.message || 'Đăng nhập Google thất bại.');
    } finally {
      popupAuthEnd.current?.();
      popupAuthEnd.current = null;
    }
  }

  async function handleEmailSubmit(e) {
    e.preventDefault();
    setLocalError('');
    clearError();

    if (!email.trim() || !password) {
      setLocalError('Vui lòng nhập email và mật khẩu.');
      return;
    }

    try {
      const userData = await emailLogin(email.trim(), password);
      setPassword('');
      navigateAfterLogin(userData);
    } catch (err) {
      setLocalError(err.message || 'Đăng nhập email thất bại.');
    }
  }

  function navigateAfterLogin(userData) {
    navigate(defaultPathFor(userData), { replace: true });
  }

  const displayError = localError || error;

  return (
    <main className="login-page login-main">
      <div
        className="login-panel login-content"
        style={{ height: panelHeight === null ? 'auto' : panelHeight }}
      >
        <div ref={panelContentRef} className="login-content-2">
          <aside className="login-aside">
            <div className="login-content-3">
              <Brand />
            </div>
            <h1 className="login-title">Không gian quản trị</h1>
            <p className="login-description">
              Dành cho Công tác sinh viên và quản trị viên hệ thống.
            </p>
            <ul className="login-list">
              <li className="login-item">
                <Users size={20} className="login-users" aria-hidden="true" />
                <span>Quản lý câu lạc bộ và trải nghiệm sinh viên</span>
              </li>
              <li className="login-item">
                <ShieldCheck size={20} className="login-users" aria-hidden="true" />
                <span>Quản lý tài khoản và cấu hình hệ thống</span>
              </li>
            </ul>
          </aside>
          <section className="login-section">
            <h2 className="login-heading">Đăng nhập</h2>
            <p className="login-description-2">Sử dụng tài khoản được cấp quyền truy cập.</p>
            <div className="login-content-4" role="group" aria-label="Phương thức đăng nhập">
              {['google', 'email'].map((mode) => (
                <Button
                  key={mode}
                  type="button"
                  variant={loginMode === mode ? 'primary' : 'secondary'}
                  aria-pressed={loginMode === mode}
                  className="login-method-button"
                  disabled={busy}
                  onClick={() => {
                    setLoginMode(mode);
                    setLocalError('');
                    clearError();
                  }}
                >
                  {mode === 'google' ? 'Google' : 'Email'}
                </Button>
              ))}
            </div>
            {displayError && (
              <p role="alert" className="login-description-3">
                <AlertCircle size={18} aria-hidden="true" />
                {displayError}
              </p>
            )}
            <div key={loginMode} className="login-method-content">
              {loginMode === 'google' ? (
                <div className="login-content-5">
                  {!GOOGLE_CLIENT_ID ? (
                    <p className="login-description-4">
                      Đăng nhập Google chưa sẵn sàng. Bạn có thể đăng nhập bằng email và mật khẩu.
                    </p>
                  ) : (
                    <>
                      <div ref={googleButtonRef} className="login-content-6" />
                      {!googleReady && (
                        <p className="login-description-5" role="status">
                          <LoaderCircle
                            size={16}
                            className="login-loader-circle"
                            aria-hidden="true"
                          />
                          Đang tải đăng nhập Google…
                        </p>
                      )}
                    </>
                  )}
                  <Button className="login-button" onClick={() => setLoginMode('email')}>
                    Chuyển sang Đăng nhập bằng email
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleEmailSubmit} className="login-content-5">
                  <p className="login-description-6">
                    Dùng email và mật khẩu của tài khoản được cấp quyền.
                  </p>
                  {shortcuts && <div className="login-content-7" role="group" aria-label="Điền nhanh email">
                    <Button type="button" disabled={busy} onClick={() => setEmail('admin@fpt.edu.vn')}>
                      Admin
                    </Button>
                    <Button type="button" disabled={busy} onClick={() => setEmail('ctsv.an@fpt.edu.vn')}>
                      CTSV
                    </Button>
                  </div>}
                  <Field label="Email tài khoản">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="username"
                      disabled={busy}
                      className="login-input"
                    />
                  </Field>
                  <Field label="Mật khẩu">
                    <input type="password" required maxLength={128} value={password}
                      onChange={event => setPassword(event.target.value)} autoComplete="current-password"
                      disabled={busy} className="login-input" />
                  </Field>
                  <Button type="submit" variant="primary" className="login-input" busy={busy} disabled={busy}>
                    Đăng nhập
                  </Button>
                </form>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
