import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

export default function Login() {
  const navigate = useNavigate()
  const { googleLogin, devLogin, isLoading, error, clearError } = useAuth()
  const [loginMode, setLoginMode] = useState('google')
  const [devEmail, setDevEmail] = useState('')
  const [localError, setLocalError] = useState('')
  const [googleReady, setGoogleReady] = useState(false)
  const googleButtonRef = useRef(null)
  const googleScriptRef = useRef(null)

  useEffect(() => {
    if (loginMode !== 'google' || !GOOGLE_CLIENT_ID) return

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
  }, [loginMode])

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

  async function handleDevSubmit(e) {
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

  function navigateAfterLogin(userData) {
    const roles = userData?.roles || []
    const isAdminRole = roles.includes('SYSTEM_ADMIN') || roles.includes('ADMIN')

    if (isAdminRole) {
      navigate('/admin/accounts', { replace: true })
    } else {
      navigate('/ctsv/overview', { replace: true })
    }
  }

  function handleTestAccount(email) {
    setDevEmail(email)
  }

  const displayError = localError || error

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f8f9fb] to-[#e8eaef] p-5">
      <div className="flex max-w-[1000px] w-full bg-white rounded-[20px] shadow-[0_25px_80px_rgba(0,0,0,0.08)] overflow-hidden min-h-[600px]">
        {/* Left - Branding */}
        <div className="flex-1 bg-gradient-to-br from-[#ed641c] to-[#cb4c0e] p-[50px_45px] flex flex-col relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute -top-[50%] -right-[30%] w-[400px] h-[400px] rounded-full bg-white/[0.08] pointer-events-none" />
          <div className="absolute -bottom-[30%] -left-[20%] w-[300px] h-[300px] rounded-full bg-white/[0.05] pointer-events-none" />

          {/* Logo & Title */}
          <div className="relative z-10 text-center mb-[50px]">
            <div className="w-[80px] h-[80px] bg-white rounded-[20px] flex items-center justify-center mx-auto mb-[25px] shadow-[0_10px_30px_rgba(0,0,0,0.15)]">
              <span className="text-[45px] font-bold text-[#ed641c] italic">F</span>
            </div>
            <h1 className="text-[28px] font-bold text-white mb-[10px] tracking-[-0.5px]">FPTU Xperience</h1>
            <p className="text-[14px] text-white/[0.8]">Hệ thống quản lý câu lạc bộ sinh viên</p>
          </div>

          {/* Features */}
          <div className="relative z-10 flex-1">
            {[
              { icon: '📊', title: 'Quản lý báo cáo', desc: 'Theo dõi và xét duyệt báo cáo hoạt động' },
              { icon: '💰', title: 'Quản lý tài chính', desc: 'Đề xuất và quyết toán ngân sách' },
              { icon: '📈', title: 'Đánh giá KPI', desc: 'Theo dõi và xếp hạng câu lạc bộ' },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-4 p-5 bg-white/[0.1] rounded-[12px] mb-[15px] hover:bg-white/[0.15] transition-all duration-200"
              >
                <div className="w-[45px] h-[45px] bg-white/[0.15] rounded-[10px] flex items-center justify-center text-[24px] shrink-0">
                  {item.icon}
                </div>
                <div>
                  <strong className="block text-[14px] text-white font-semibold mb-[4px]">{item.title}</strong>
                  <span className="text-[12px] text-white/[0.7] leading-[1.5]">{item.desc}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="relative z-10 text-center pt-[30px] border-t border-white/[0.15]">
            <span className="text-[11px] text-white/[0.6]">© 2026 FPTU Xperience</span>
          </div>
        </div>

        {/* Right - Login Form */}
        <div className="flex-1 p-[50px_45px] flex items-center justify-center">
          <div className="w-full max-w-[360px]">
            {/* Header */}
            <div className="text-center mb-[35px]">
              <h2 className="text-[26px] font-bold text-[#242b38] mb-[8px] tracking-[-0.5px]">Đăng nhập</h2>
              <p className="text-[13px] text-[#9096a1]">Đăng nhập để truy cập hệ thống quản trị</p>
            </div>

            {/* Mode Tabs */}
            <div className="flex bg-[#f5f6f8] rounded-[10px] p-[4px] mb-[25px]">
              {['google', 'dev'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => { setLoginMode(mode); setLocalError(''); clearError() }}
                  className={`flex-1 py-[10px] rounded-[8px] text-[13px] font-medium transition-all duration-200 ${
                    loginMode === mode
                      ? 'bg-white text-[#ed641c] shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                      : 'text-[#7d8591] hover:text-[#303a47]'
                  }`}
                >
                  {mode === 'google' ? 'Google' : 'Dev Login'}
                </button>
              ))}
            </div>

            {/* Error */}
            {displayError && (
              <div className="flex items-center gap-[10px] p-[12px_15px] bg-[#fff3f2] border border-[#f2dfdc] rounded-[8px] mb-[20px] text-[13px] text-[#bd7970]">
                <span>⚠️</span>
                {displayError}
              </div>
            )}

            {/* Google Login */}
            {loginMode === 'google' && (
              <div className="flex flex-col gap-5">
                {!GOOGLE_CLIENT_ID ? (
                  <div className="p-[15px] bg-[#fff8ec] border border-[#f2e5ca] rounded-[10px]">
                    <div className="flex items-start gap-3">
                      <span className="text-[20px]">⚠️</span>
                      <div>
                        <strong className="block text-[13px] text-[#744833] font-semibold mb-[4px]">
                          Chưa cấu hình Google OAuth
                        </strong>
                        <small className="text-[11px] text-[#ad8c79]">
                          Đặt VITE_GOOGLE_CLIENT_ID trong .env hoặc sử dụng Dev Login.
                        </small>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div ref={googleButtonRef} className="flex justify-center" />
                    {!googleReady && (
                      <div className="flex items-center justify-center gap-[10px] text-[13px] text-[#7d8591]">
                        <div className="w-[16px] h-[16px] border-2 border-[#e1e4e9] border-t-[#ed641c] rounded-full animate-spin" />
                        Đang tải đăng nhập Google...
                      </div>
                    )}
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setLoginMode('dev')}
                  className="w-full py-[12px] bg-transparent border border-[#e2e5e9] rounded-[8px] text-[13px] text-[#7d8591] hover:bg-[#f5f6f8] hover:text-[#303a47] hover:border-[#ccd0d7] transition-all duration-200"
                >
                  Hoặc sử dụng Dev Login
                </button>
              </div>
            )}

            {/* Dev Login */}
            {loginMode === 'dev' && (
              <form onSubmit={handleDevSubmit} className="flex flex-col gap-5">
                {/* Dev Notice */}
                <div className="p-[15px] bg-[#fff8ec] border border-[#f2e5ca] rounded-[10px]">
                  <div className="flex items-start gap-3">
                    <span className="text-[20px]">🔧</span>
                    <div>
                      <strong className="block text-[13px] text-[#744833] font-semibold mb-[4px]">
                        Chế độ phát triển
                      </strong>
                      <small className="text-[11px] text-[#ad8c79]">
                        Chỉ tài khoản ADMIN hoặc CTSV mới được truy cập.
                      </small>
                    </div>
                  </div>
                </div>

                {/* Test Accounts */}
                <div className="mt-[20px] p-[15px] bg-[#f8f9fb] border border-[#e9ebee] rounded-[10px]">
                  <span className="block text-[11px] font-semibold text-[#7d8591] mb-[10px] uppercase tracking-[0.5px]">
                    Tài khoản test:
                  </span>
                  {[
                    { role: 'ADMIN', email: 'admin@fpt.edu.vn' },
                    { role: 'STUDENT_AFFAIRS_ADMIN', email: 'ctsv.an@fpt.edu.vn' },
                    { role: 'CLUB_MANAGER', email: 'manager.tech@fpt.edu.vn' },
                  ].map((account) => (
                    <div
                      key={account.email}
                      onClick={() => handleTestAccount(account.email)}
                      className="flex items-center justify-between p-[10px_12px] bg-white border border-[#e2e5e9] rounded-[8px] mb-[8px] last:mb-0 cursor-pointer hover:border-[#ed641c] hover:bg-[#fff8f5] transition-all duration-200"
                    >
                      <code className="text-[12px] text-[#5c6270] font-mono">{account.email}</code>
                      <span className="text-[10px] font-semibold text-[#ed641c] bg-[#fff0e5] px-[8px] py-[3px] rounded-[4px] uppercase tracking-[0.3px]">
                        {account.role === 'STUDENT_AFFAIRS_ADMIN' ? 'CTSV' : account.role}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Email Input */}
                <div className="flex flex-col gap-[8px]">
                  <label className="text-[13px] font-medium text-[#5c6270]">Email tài khoản</label>
                  <input
                    type="email"
                    value={devEmail}
                    onChange={(e) => setDevEmail(e.target.value)}
                    placeholder="admin@example.com"
                    autoComplete="off"
                    disabled={isLoading}
                    className="w-full h-[45px] px-[15px] border border-[#e1e4e9] rounded-[8px] text-[14px] text-[#29303c] bg-white focus:outline-none focus:border-[#ed641c] focus:ring-[3px] focus:ring-[#ed641c]/10 disabled:bg-[#f5f6f8] disabled:cursor-not-allowed"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-[48px] bg-[#ed641c] border-0 rounded-[10px] text-[14px] font-semibold text-white shadow-[0_4px_15px_rgba(237,100,28,0.25)] hover:bg-[#cb4c0e] hover:shadow-[0_6px_20px_rgba(237,100,28,0.35)] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-[8px]"
                >
                  {isLoading ? (
                    <>
                      <div className="w-[18px] h-[18px] border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Đang đăng nhập...
                    </>
                  ) : (
                    'Đăng nhập (Dev)'
                  )}
                </button>

                {/* Switch to Google */}
                <button
                  type="button"
                  onClick={() => setLoginMode('google')}
                  className="w-full py-[12px] bg-transparent border border-[#e2e5e9] rounded-[8px] text-[13px] text-[#7d8591] hover:bg-[#f5f6f8] hover:text-[#303a47] hover:border-[#ccd0d7] transition-all duration-200"
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
