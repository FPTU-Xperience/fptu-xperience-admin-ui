import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import Login from './pages/Login.jsx'
import AppLayout from './layouts/AppLayout.jsx'

// Loading spinner component
function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f8f9fb',
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid #e9ebee',
        borderTopColor: '#ed641c',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }} />
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

// Protected route wrapper
function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

// Layout wrapper for protected routes
function ProtectedLayout({ children }) {
  return (
    <ProtectedRoute>
      <AppLayout>
        {children}
      </AppLayout>
    </ProtectedRoute>
  )
}

// Import các page components
import Dashboard from './pages/Dashboard.jsx'
import Accounts from './pages/Accounts.jsx'
import { Clubs } from './pages/Clubs.jsx'
import { Engagement } from './pages/Engagement.jsx'
import { Quests } from './pages/Quests.jsx'
import { Rubrics } from './pages/Rubrics.jsx'
import { Seasons } from './pages/Seasons.jsx'
import { Anomalies } from './pages/Anomalies.jsx'
import { Audit } from './pages/Audit.jsx'
import { RoleMatrix } from './pages/RoleMatrix.jsx'
import { SystemSettings } from './pages/SystemSettings.jsx'

// Default route component - redirect based on user role
function DefaultRoute() {
  const { user } = useAuth()
  const roles = user?.roles || []
  const isAdmin = roles.includes('SYSTEM_ADMIN') || roles.includes('ADMIN')

  if (isAdmin) {
    return <Navigate to="/admin/accounts" replace />
  }

  return <Navigate to="/ctsv/overview" replace />
}

// Main App component
export default function App() {
  const { user, isLoading } = useAuth()

  // Show loading while checking auth
  if (isLoading) {
    return <LoadingScreen />
  }

  // Not authenticated - show login
  if (!user) {
    return <Login />
  }

  // Authenticated - show protected routes with layout
  // Sử dụng Routes DUY NHẤT để tránh conflict với HashRouter
  return (
    <Routes>
      {/* Login page - redirect if already authenticated */}
      <Route path="/login" element={<Navigate to="/" replace />} />

      {/* Protected routes with Layout */}
      <Route
        path="/ctsv/overview"
        element={<ProtectedLayout><Dashboard /></ProtectedLayout>}
      />
      <Route
        path="/ctsv/clubs"
        element={<ProtectedLayout><Clubs /></ProtectedLayout>}
      />
      <Route
        path="/ctsv/engagement"
        element={<ProtectedLayout><Engagement /></ProtectedLayout>}
      />
      <Route
        path="/ctsv/quests"
        element={<ProtectedLayout><Quests /></ProtectedLayout>}
      />
      <Route
        path="/ctsv/rubrics"
        element={<ProtectedLayout><Rubrics /></ProtectedLayout>}
      />
      <Route
        path="/ctsv/seasons"
        element={<ProtectedLayout><Seasons /></ProtectedLayout>}
      />
      <Route
        path="/ctsv/anomalies"
        element={<ProtectedLayout><Anomalies /></ProtectedLayout>}
      />
      <Route
        path="/ctsv/reports"
        element={<ProtectedLayout><Engagement reports /></ProtectedLayout>}
      />

      {/* Admin Pages */}
      <Route
        path="/admin/accounts"
        element={<ProtectedLayout><Accounts /></ProtectedLayout>}
      />
      <Route
        path="/admin/roles"
        element={<ProtectedLayout><RoleMatrix /></ProtectedLayout>}
      />
      <Route
        path="/admin/integrations"
        element={<ProtectedLayout><SystemSettings type="integrations" /></ProtectedLayout>}
      />
      <Route
        path="/admin/settings"
        element={<ProtectedLayout><SystemSettings type="settings" /></ProtectedLayout>}
      />
      <Route
        path="/admin/health"
        element={<ProtectedLayout><SystemSettings type="health" /></ProtectedLayout>}
      />
      <Route
        path="/admin/audit"
        element={<ProtectedLayout><Audit /></ProtectedLayout>}
      />

      {/* Default redirect based on user role */}
      <Route path="/" element={<DefaultRoute />} />
      <Route path="*" element={<DefaultRoute />} />
    </Routes>
  )
}
