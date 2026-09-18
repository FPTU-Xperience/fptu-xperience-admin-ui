import { Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import Login from './pages/Login.jsx'
import AppLayout from './layouts/AppLayout.jsx'
import AppRoutes from './routes/index.jsx'

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
function ProtectedRoute({ children, requireAdmin = false, requireCTSV = false }) {
  const { isAuthenticated, isLoading, user, isAdminUser } = useAuth()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // If requires specific role, check it
  if (requireAdmin && !isAdminUser(user)) {
    // Redirect to CTSV page if not admin
    return <Navigate to="/ctsv/overview" replace />
  }

  if (requireCTSV && !isAdminUser(user)) {
    // Only admins/CTSV can access these pages
    return <Navigate to="/ctsv/overview" replace />
  }

  return children
}

// Authenticated App with Layout
function AuthenticatedApp() {
  const { isLoading } = useAuth()

  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <AppLayout>
      <AppRoutes />
    </AppLayout>
  )
}

// Main App component
export default function App() {
  const { isAuthenticated, isLoading } = useAuth()

  // Show loading while checking auth
  if (isLoading) {
    return <LoadingScreen />
  }

  // Not authenticated - show login
  if (!isAuthenticated) {
    return <Login />
  }

  // Authenticated - show app
  return <AuthenticatedApp />
}
