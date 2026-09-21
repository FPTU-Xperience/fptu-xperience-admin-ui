import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

// Google OAuth Client ID - should be in env variable
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

export default function Login() {
  const navigate = useNavigate()
  const { googleLogin, devLogin, isLoading, error, clearError } = useAuth()
  const [ loginMode, setLoginMode ] = useState('google') // 'google' | 'dev'
  const [ devEmail, setDevEmail ] = useState('')
  const [ localError, setLocalError ] = useState('')
  const [ googleReady, setGoogleReady ] = useState(false)
  const googleButtonRef = useRef(null)
  const googleScriptRef = useRef(null)

  // Load Google Identity Services script
  useEffect(() => {
    if (loginMode !== 'google' || !GOOGLE_CLIENT_ID) return

    // Check if already loaded
    if (window.google?.accounts?.id) {
      initializeGoogle()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
      googleScriptRef.current = script
      initializeGoogle()
    }
    document.head.appendChild(script)

    return () => {
      if (googleScriptRef.current) {
        document.head.removeChild(googleScriptRef.current)
      }
    }
  }, [ loginMode ])

  function initializeGoogle() {
    if (!window.google?.accounts?.id || !GOOGLE_CLIENT_ID || !googleButtonRef.current) return

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleResponse,
    })

    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: 'outline',
      size: 'large',
      shape: 'rectangular',
      text: 'signin_with',
      locale: 'vi',
    })

    setGoogleReady(true)
  }

  async function handleGoogleResponse(response) {
    setLocalError('')
    clearError()

    try {
      const userData = await googleLogin(response.credential)
      navigateAfterLogin(userData)
    } catch (err) {
      setLocalError(err.message || 'Đăng nhập Google thất bại.')
    }
  }

  const handleDevSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')
    clearError()

    if (!devEmail.trim()) {
      setLocalError('Vui lòng nhập email để đăng nhập dev.')
      return
    }

    try {
      const userData = await devLogin(devEmail.trim())
      navigateAfterLogin(userData)
    } catch (err) {
      setLocalError(err.message || 'Dev login thất bại.')
    }
  }

  const navigateAfterLogin = (userData) => {
    const roles = userData?.roles || []

    // Check for admin or system admin role
    const isAdminRole = roles.includes('SYSTEM_ADMIN') || roles.includes('ADMIN')

    // Navigate to appropriate page - HashRouter handles the hash automatically
    if (isAdminRole) {
      navigate('/admin/accounts', { replace: true })
    } else {
      navigate('/ctsv/overview', { replace: true })
    }
  }

  const displayError = localError || error

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Left side - Branding */}
        <div className="login-brand">
          <div className="brand-content">
            <div className="brand-logo">
              <span>F</span>
            </div>
            <h1>FPTU Xperience</h1>
            <p>Hệ thống quản lý câu lạc bộ sinh viên</p>
          </div>

          <div className="brand-features">
            <div className="feature-item">
              <div className="feature-icon">📊</div>
              <div>
                <strong>Quản lý báo cáo</strong>
                <span>Theo dõi và xét duyệt báo cáo hoạt động</span>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">💰</div>
              <div>
                <strong>Quản lý tài chính</strong>
                <span>Đề xuất và quyết toán ngân sách</span>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">📈</div>
              <div>
                <strong>Đánh giá KPI</strong>
                <span>Theo dõi và xếp hạng câu lạc bộ</span>
              </div>
            </div>
          </div>

          <div className="brand-footer">
            <span>© 2026 FPTU Xperience</span>
          </div>
        </div>

        {/* Right side - Login form */}
        <div className="login-form-wrapper">
          <div className="login-form-container">
            <div className="login-header">
              <h2>Đăng nhập</h2>
              <p>Đăng nhập để truy cập hệ thống quản trị</p>
            </div>

            {/* Login mode tabs */}
            <div className="login-mode-tabs">
              <button
                type="button"
                className={loginMode === 'google' ? 'active' : ''}
                onClick={() => { setLoginMode('google'); setLocalError(''); clearError() }}
              >
                Google
              </button>
              <button
                type="button"
                className={loginMode === 'dev' ? 'active' : ''}
                onClick={() => { setLoginMode('dev'); setLocalError(''); clearError() }}
              >
                Dev Login
              </button>
            </div>

            {/* Error message */}
            {displayError && (
              <div className="login-error">
                <span>⚠️</span>
                {displayError}
              </div>
            )}

            {/* Google OAuth login */}
            {loginMode === 'google' && (
              <div className="login-form">
                {!GOOGLE_CLIENT_ID ? (
                  <div className="dev-notice">
                    <span>⚠️</span>
                    <p>
                      <strong>Chưa cấu hình Google OAuth</strong>
                      <small>Đặt VITE_GOOGLE_CLIENT_ID trong .env hoặc sử dụng Dev Login.</small>
                    </p>
                  </div>
                ) : (
                  <>
                    <div ref={googleButtonRef} className="google-button-container" />
                    {!googleReady && (
                      <div className="google-loading">
                        <span className="spinner"></span>
                        Đang tải đăng nhập Google...
                      </div>
                    )}
                  </>
                )}

                <button
                  type="button"
                  className="btn-switch-mode"
                  onClick={() => setLoginMode('dev')}
                >
                  Hoặc sử dụng Dev Login
                </button>
              </div>
            )}

            {/* Dev login form */}
            {loginMode === 'dev' && (
              <form onSubmit={handleDevSubmit} className="login-form">
                <div className="dev-notice">
                  <span>🔧</span>
                  <p>
                    <strong>Chế độ phát triển</strong>
                    <small>Chỉ tài khoản ADMIN hoặc CTSV mới được truy cập.</small>
                  </p>
                </div>

                {/* Test accounts */}
                <div className="test-accounts">
                  <span className="test-label">Tài khoản test:</span>
                  <div className="test-account" onClick={() => setDevEmail('systemadmin@club.local')}>
                    <span className="test-role">SYSTEM_ADMIN</span>
                    <code>systemadmin@club.local</code>
                  </div>
                  <div className="test-account" onClick={() => setDevEmail('studentaffairs@club.local')}>
                    <span className="test-role">STUDENT_AFFAIRS</span>
                    <code>studentaffairs@club.local</code>
                  </div>
                </div>

                <div className="field">
                  <label>Email tài khoản</label>
                  <input
                    type="email"
                    value={devEmail}
                    onChange={(e) => setDevEmail(e.target.value)}
                    placeholder="admin@example.com"
                    autoComplete="off"
                    disabled={isLoading}
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner"></span>
                      Đang đăng nhập...
                    </>
                  ) : (
                    'Đăng nhập (Dev)'
                  )}
                </button>

                <button
                  type="button"
                  className="btn-switch-mode"
                  onClick={() => setLoginMode('google')}
                  style={{ marginTop: '8px' }}
                >
                  {GOOGLE_CLIENT_ID ? 'Hoặc đăng nhập với Google' : 'Quay lại đăng nhập Google'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
