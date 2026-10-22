import { isAdmin, isCTSV, isAdminUser } from '../utils/access.js';
import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api.js';

const AuthContext = createContext(null);

import { ROLE_IDS as ROLES, ROLE_LABELS, normalizeActor, systemRolesFor } from '../utils/roles.js';
export { ROLE_IDS as ROLES, ROLE_LABELS } from '../utils/roles.js';

export { isAdmin, isCTSV, isAdminUser } from '../utils/access.js';

// Campus options for the selector
export const CAMPUS_OPTIONS = [
  { code: 'GLOBAL', name: 'Toàn trường', shortName: 'Tất cả' },
  { code: 'HAN', name: 'Hà Nội (Hòa Lạc)', shortName: 'Hà Nội' },
  { code: 'HCM', name: 'TP. Hồ Chí Minh', shortName: 'TP.HCM' },
  { code: 'DAN', name: 'Đà Nẵng', shortName: 'Đà Nẵng' },
  { code: 'CAN', name: 'Cần Thơ', shortName: 'Cần Thơ' },
  { code: 'QNH', name: 'Quy Nhơn', shortName: 'Quy Nhơn' },
];

// Get campus code from user object or token
export function getCampusFromUser(user) {
  // First try to get from user object directly
  if (user?.campusCode) return user.campusCode;

  // Try to decode from JWT token
  const token = localStorage.getItem('accessToken');
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.campusCode || payload.campus || null;
    } catch {
      return null;
    }
  }
  return null;
}

// Get campus name from code
export function getCampusName(campusCode) {
  const campus = CAMPUS_OPTIONS.find((c) => c.code === campusCode);
  return campus?.name || campusCode || 'Không xác định';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is logged in on mount
  useEffect(() => {
    const token = api.getAccessToken();
    if (token) {
      loadCurrentUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  async function loadCurrentUser() {
    try {
      // Try to get user info from backend
      const userData = await api.auth.me();
      setUser(normalizeActor(userData));
      setError(null);
    } catch (err) {
      console.error('Failed to load current user:', err);
      // Token might be expired, clear it
      api.clearTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Login using Google OAuth
   * @param {string} googleCredential - Google ID token from Google Identity Services
   */
  async function googleLogin(googleCredential) {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.auth.google(googleCredential);

      // Handle response format from backend
      // Backend returns: { accessToken, user, refreshToken, ... }
      const token = response?.accessToken || response?.token;
      const refreshToken = response?.refreshToken;
      let userData = response?.user || response?.actor;

      if (!token) {
        throw new Error('Invalid login response - no token received');
      }

      api.setToken(token);
      if (refreshToken) {
        api.setRefreshToken(refreshToken);
      }

      // Fetch user info
      try {
        userData = await api.auth.me();
      } catch {
        // If me endpoint fails, use data from login response
        if (!userData) {
          throw new Error('Không thể xác minh quyền của tài khoản. Vui lòng đăng nhập lại.');
        }
      }

      setUser(normalizeActor(userData));
      return normalizeActor(userData);
    } catch (err) {
      api.clearTokens();
      setUser(null);
      const message = err.message || 'Đăng nhập Google thất bại';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Dev login - bypass login for development
   * @param {string} email - Email of the account to login as
   */
  async function devLogin(email) {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.auth.devLogin(email);

      // Handle response format from backend
      // Backend returns: { accessToken, user, refreshToken, expiresAtUtc, ... }
      const token = response?.accessToken || response?.token;
      const refreshToken = response?.refreshToken;
      let userData = response?.user || response?.actor;

      if (!token) {
        throw new Error('Invalid login response - no token received');
      }

      api.setToken(token);
      if (refreshToken) {
        api.setRefreshToken(refreshToken);
      }

      // Fetch user info from appropriate me endpoint based on role
      try {
        const roles = systemRolesFor(userData);
        if (roles.includes(ROLES.SYSTEM_ADMIN)) {
          userData = await api.auth.adminMe();
        } else if (roles.includes(ROLES.STUDENT_AFFAIR)) {
          userData = await api.auth.ctsvMe();
        } else {
          userData = await api.auth.me();
        }
      } catch {
        // If me endpoint fails, use data from login response
        if (!userData) {
          throw new Error('Không thể xác minh quyền của tài khoản. Vui lòng đăng nhập lại.');
        }
      }

      // Store user in localStorage for Login page redirect logic
      try {
        localStorage.setItem('fptu-auth-user', JSON.stringify(userData));
      } catch {
        /* Ignore */
      }

      setUser(normalizeActor(userData));

      // Dispatch custom event to notify WorkspaceContext to update role
      window.dispatchEvent(new Event('fptu-auth-changed'));

      return normalizeActor(userData);
    } catch (err) {
      api.clearTokens();
      setUser(null);
      const message = err.message || 'Dev login thất bại';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }

  async function logout() {
    // Clear user state immediately to prevent layout showing
    setUser(null);
    setIsLoading(false);

    try {
      const refreshToken = api.getRefreshToken();
      if (refreshToken) {
        await api.auth.logout(refreshToken);
      }
    } catch (err) {
      console.error('Logout API error:', err);
    } finally {
      api.clearTokens();
      try {
        localStorage.removeItem('fptu-auth-user');
      } catch {
        /* Ignore */
      }
    }
  }

  function hasRole(role) {
    if (!user?.roles) return false;
    if (Array.isArray(role)) {
      return role.some((r) => user.roles.includes(r));
    }
    return user.roles.includes(role);
  }

  function hasAnyRole(roles) {
    return hasRole(roles);
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
