import { createContext, useContext, useEffect, useState } from 'react'
import api from '../services/api.js'

const AuthContext = createContext(null)

// Roles for the application (matching backend)
export const ROLES = {
  SYSTEM_ADMIN: 'SYSTEM_ADMIN',
  ADMIN: 'ADMIN',
  STUDENT_AFFAIRS_ADMIN: 'STUDENT_AFFAIRS_ADMIN',
  CLUB_MANAGER: 'CLUB_MANAGER',
  TREASURER: 'TREASURER',
  CLUB_MEMBER: 'CLUB_MEMBER',
}

export const ROLE_LABELS = {
  [ROLES.SYSTEM_ADMIN]: 'Quản trị hệ thống',
  [ROLES.ADMIN]: 'Quản trị viên',
  [ROLES.STUDENT_AFFAIRS_ADMIN]: 'Công tác sinh viên',
  [ROLES.CLUB_MANAGER]: 'Chủ nhiệm CLB',
  [ROLES.TREASURER]: 'Thủ quỹ',
  [ROLES.CLUB_MEMBER]: 'Thành viên CLB',
}

// Check if user has admin role (ADMIN or SYSTEM_ADMIN)
export function isAdmin(user) {
  return user?.roles?.some(r => r === ROLES.ADMIN || r === ROLES.SYSTEM_ADMIN)
}

// Check if user has CTSV role
export function isCTSV(user) {
  return user?.roles?.some(r => r === ROLES.STUDENT_AFFAIRS_ADMIN)
}

// Check if user has any admin role (admin or ctsv)
export function isAdminUser(user) {
  return isAdmin(user) || isCTSV(user)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Check if user is logged in on mount
  useEffect(() => {
    const token = api.getAccessToken()
    if (token) {
      loadCurrentUser()
    } else {
      setIsLoading(false)
    }
  }, [])

  async function loadCurrentUser() {
    try {
      // Try to get user info from backend
      const userData = await api.auth.me()
      setUser(userData)
      setError(null)
    } catch (err) {
      console.error('Failed to load current user:', err)
      // Token might be expired, clear it
      api.clearTokens()
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Login using Google OAuth
   * @param {string} googleCredential - Google ID token from Google Identity Services
   */
  async function googleLogin(googleCredential) {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.auth.google(googleCredential)

      // Handle response format from backend
      let token = null
      let refreshToken = null
      let userData = null

      if (typeof response === 'object') {
        token = response.token || response.accessToken
        refreshToken = response.refreshToken
        userData = response.user || response.actor
      }

      if (!token) {
        throw new Error('Invalid login response - no token received')
      }

      api.setToken(token)
      if (refreshToken) {
        api.setRefreshToken(refreshToken)
      }

      // Fetch user info
      try {
        userData = await api.auth.me()
      } catch {
        // If me endpoint fails, use data from login response
        if (!userData) {
          userData = { roles: [ROLES.CLUB_MEMBER] }
        }
      }

      setUser(userData)
      return userData
    } catch (err) {
      const message = err.message || 'Đăng nhập Google thất bại'
      setError(message)
      throw new Error(message)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Dev login - bypass authentication for development
   * Falls back to mock authentication if backend dev-login is disabled
   * @param {string} email - Email of the account to login as
   */
  async function devLogin(email) {
    setIsLoading(true)
    setError(null)
    try {
      // Try backend dev-login first
      const response = await api.auth.devLogin(email)

      let token = null
      let refreshToken = null
      let userData = null

      if (typeof response === 'object') {
        token = response.token || response.accessToken
        refreshToken = response.refreshToken
        userData = response.user || response.actor
      }

      if (token) {
        api.setToken(token)
        if (refreshToken) {
          api.setRefreshToken(refreshToken)
        }

        // Fetch user info
        try {
          userData = await api.auth.me()
        } catch {
          if (!userData) {
            userData = { roles: [ROLES.ADMIN] }
          }
        }

        setUser(userData)
        return userData
      }
    } catch (err) {
      // If backend returns 403, try mock login for testing
      if (err.status === 403 || err.message?.includes('403')) {
        console.warn('Backend dev-login disabled, using mock authentication')
        return mockLogin(email)
      }
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Mock login for testing when backend dev-login is disabled
   * Only ADMIN and STUDENT_AFFAIRS_ADMIN can access the system
   */
  function mockLogin(email) {
    const emailLower = email.toLowerCase()

    // Check for valid admin emails
    const isSystemAdmin = emailLower.includes('systemadmin') ||
                         emailLower.includes('admin') && emailLower.includes('.local')

    const isStudentAffairs = emailLower.includes('studentaffairs') ||
                           emailLower.includes('ctsv') ||
                           emailLower.includes('sinhvien') ||
                           emailLower.includes('affairs')

    let mockUser = null
    const mockToken = 'mock-token-' + Date.now()

    if (isSystemAdmin) {
      mockUser = {
        id: 'mock-sysadmin-001',
        email: email,
        name: 'Quản trị hệ thống',
        username: email.split('@')[0],
        roles: [ROLES.SYSTEM_ADMIN],
        actor: { id: 1, email, roles: [ROLES.SYSTEM_ADMIN] }
      }
    } else if (isStudentAffairs) {
      mockUser = {
        id: 'mock-ctsv-001',
        email: email,
        name: 'Cán bộ công tác sinh viên',
        username: email.split('@')[0],
        roles: [ROLES.STUDENT_AFFAIRS_ADMIN],
        actor: { id: 2, email, roles: [ROLES.STUDENT_AFFAIRS_ADMIN] }
      }
    } else {
      // Only ADMIN and STUDENT_AFFAIRS_ADMIN can access
      throw new Error('Tài khoản không có quyền truy cập hệ thống.')
    }

    // Store mock token
    api.setToken(mockToken)
    api.setRefreshToken('mock-refresh-' + Date.now())

    setUser(mockUser)
    return mockUser
  }

  async function logout() {
    try {
      const refreshToken = api.getRefreshToken()
      if (refreshToken) {
        await api.auth.logout(refreshToken)
      }
    } catch (err) {
      console.error('Logout API error:', err)
    } finally {
      api.clearTokens()
      setUser(null)
    }
  }

  function hasRole(role) {
    if (!user?.roles) return false
    if (Array.isArray(role)) {
      return role.some(r => user.roles.includes(r))
    }
    return user.roles.includes(role)
  }

  function hasAnyRole(roles) {
    return hasRole(roles)
  }

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    // Login methods
    googleLogin,
    devLogin,
    // Legacy alias for compatibility
    login: devLogin,
    // Logout
    logout,
    // Role checking
    hasRole,
    hasAnyRole,
    isAdmin: user ? isAdmin(user) : false,
    isCTSV: user ? isCTSV(user) : false,
    isAdminUser: user ? isAdminUser(user) : false,
    // Utility
    clearError: () => setError(null),
    // Direct API access
    api,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
