import { isAdmin, isCTSV, isAdminUser } from '../utils/access.js';
import { createContext, useContext, useEffect, useState } from 'react';
import api, { session } from '../services/api.js';
import { observeSession } from '../services/session-client.js';

const AuthContext = createContext(null);

import { normalizeActor } from '../utils/roles.js';
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
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    return observeSession(session, {
      loadUser: () => api.auth.me(),
      onUser: (actor, loading) => {
        setUser(normalizeActor(actor));
        setIsLoading(loading);
        if (actor) setError(null);
      },
      onError: (error) => setError(error.message),
    });
  }, []);

  async function authenticate(action, fallbackMessage) {
    return session.authenticate(async () => {
      const version = session.version();
      setIsSigningIn(true);
      setError(null);
      try {
        const response = await action();
        const actor = response?.user || response?.actor;
        session.acceptLogin({ ...response, accessToken: response?.accessToken || response?.token, user: actor }, version);
        return normalizeActor(actor);
      } catch (err) {
        setError(err.message || fallbackMessage);
        throw err;
      } finally {
        setIsSigningIn(false);
        // The session observer owns loading while validating an accepted identity.
        if (!session.read()) setIsLoading(false);
      }
    });
  }

  const googleLogin = (credential) => authenticate(() => api.auth.google(credential), 'Đăng nhập Google thất bại');
  const emailLogin = (email, password) => authenticate(() => api.auth.emailLogin(email, password), 'Đăng nhập email thất bại');

  async function logout() {
    // Clear user state immediately to prevent layout showing
    setUser(null);
    setIsLoading(false);

    try {
      await api.auth.logout();
    } catch (err) {
      console.error('Logout API error:', err);
    } finally {
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
    isSigningIn,
    isAuthenticated: !!user,
    error,
    // Login methods
    googleLogin,
    emailLogin,
    // Legacy alias for compatibility
    login: emailLogin,
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
