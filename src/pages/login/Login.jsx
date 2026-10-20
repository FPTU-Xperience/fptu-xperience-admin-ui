import './Login.css';
import { AlertCircle, LoaderCircle, ShieldCheck, Users } from 'lucide-react';
import { Button, Field } from '../../components/ui/index.js';
import { defaultPathFor } from '../../utils/access.js';
import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import Brand from '../../components/common/brand/Brand.jsx';

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
              {['google', 'dev'].map((mode) => (
                <Button
                  key={mode}
                  type="button"
                  variant={loginMode === mode ? 'primary' : 'secondary'}
                  aria-pressed={loginMode === mode}
                  className="login-method-button"
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
                      Đăng nhập Google chưa sẵn sàng. Bạn có thể dùng Dev Login trong môi trường
                      phát triển.
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
                  <Button className="login-button" onClick={() => setLoginMode('dev')}>
                    Chuyển sang Đăng nhập bằng email
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleDevSubmit} className="login-content-5">
                  <p className="login-description-6">
                    Chế độ phát triển · Chỉ tài khoản Admin hoặc CTSV được truy cập.
                  </p>
                  <div className="login-content-7" role="group" aria-label="Tài khoản thử nghiệm">
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
                      className="login-input"
                    />
                  </Field>
                  <Button type="submit" variant="primary" className="login-input" busy={isLoading}>
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
