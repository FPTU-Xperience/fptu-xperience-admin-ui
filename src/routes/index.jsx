import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { navigationFor } from './navigation.js'
import Dashboard from '../pages/Dashboard.jsx'
import Accounts from '../pages/Accounts.jsx'
import { Clubs } from '../pages/Clubs.jsx'
import { Engagement } from '../pages/Engagement.jsx'
import { Quests } from '../pages/Quests.jsx'
import { Rubrics } from '../pages/Rubrics.jsx'
import { Seasons } from '../pages/Seasons.jsx'
import { Anomalies } from '../pages/Anomalies.jsx'
import { Audit } from '../pages/Audit.jsx'
import { RoleMatrix } from '../pages/RoleMatrix.jsx'
import { SystemSettings } from '../pages/SystemSettings.jsx'
import Login from '../pages/Login.jsx'

// Protected route wrapper that checks for admin role
function AdminRoute({ children }) {
  const { user } = useAuth()
  const roles = user?.roles || []
  const isAdmin = roles.includes('SYSTEM_ADMIN') || roles.includes('ADMIN')

  // Only allow admin users for admin routes
  if (!isAdmin) {
    if (roles.includes('STUDENT_AFFAIRS_ADMIN')) {
      return <Navigate to="/ctsv/overview" replace />
    }
    return <Navigate to="/login" replace />
  }

  return children
}

// Protected route for CTSV pages
function CTSVRoute({ children }) {
  const { user } = useAuth()
  const roles = user?.roles || []
  const isCTSV = roles.includes('STUDENT_AFFAIRS_ADMIN')

  // Only allow admin/CTSV users for CTSV routes
  if (!isCTSV) {
    // For now, redirect to login if not authenticated
    // In the future, could show a "not authorized" page
    return <Navigate to="/login" replace />
  }

  return children
}

export default function AppRoutes() {
  const { user } = useAuth()
  const { role } = useWorkspace()

  // Determine if user is admin based on:
  // 1. Session role switcher (for preview mode)
  // 2. User's actual role from login
  const userRoles = user?.roles || []
  const isUserAdmin = userRoles.includes('SYSTEM_ADMIN') || userRoles.includes('ADMIN')
  const isUserCTSV = userRoles.includes('STUDENT_AFFAIRS_ADMIN')

  // Use workspace role (which includes session storage for preview mode)
  const previewRole = role
  const nav = navigationFor(previewRole === 'ADMIN')

  // Determine default redirect based on user role
  const getDefaultRedirect = () => {
    if (isUserAdmin) {
      return '/admin/accounts'
    }
    if (isUserCTSV) {
      return '/ctsv/overview'
    }
    // Fallback to workspace role
    return nav[0]?.path || '/ctsv/overview'
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />

      {/* CTSV Overview - accessible by all authenticated users */}
      <Route
        path="/ctsv/overview"
        element={
          <CTSVRoute>
            <Dashboard />
          </CTSVRoute>
        }
      />

      {/* CTSV Pages - require admin/CTSV role */}
      <Route
        path="/ctsv/clubs"
        element={
          <CTSVRoute>
            <Clubs />
          </CTSVRoute>
        }
      />
      <Route
        path="/ctsv/engagement"
        element={
          <CTSVRoute>
            <Engagement />
          </CTSVRoute>
        }
      />
      <Route
        path="/ctsv/quests"
        element={
          <CTSVRoute>
            <Quests />
          </CTSVRoute>
        }
      />
      <Route
        path="/ctsv/rubrics"
        element={
          <CTSVRoute>
            <Rubrics />
          </CTSVRoute>
        }
      />
      <Route
        path="/ctsv/seasons"
        element={
          <CTSVRoute>
            <Seasons />
          </CTSVRoute>
        }
      />
      <Route
        path="/ctsv/anomalies"
        element={
          <CTSVRoute>
            <Anomalies />
          </CTSVRoute>
        }
      />
      <Route
        path="/ctsv/reports"
        element={
          <CTSVRoute>
            <Engagement reports />
          </CTSVRoute>
        }
      />

      {/* Admin Pages - require ADMIN role */}
      <Route
        path="/admin/accounts"
        element={
          <AdminRoute>
            <Accounts />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/roles"
        element={
          <AdminRoute>
            <RoleMatrix />
          </AdminRoute>
        }
      />
      {['integrations', 'settings', 'health'].map((type) => (
        <Route
          key={type}
          path={`/admin/${type}`}
          element={
            <AdminRoute>
              <SystemSettings key={type} type={type} />
            </AdminRoute>
          }
        />
      ))}
      <Route
        path="/admin/audit"
        element={
          <AdminRoute>
            <Audit />
          </AdminRoute>
        }
      />

      {/* Default redirect based on user role */}
      <Route path="*" element={<Navigate to={getDefaultRedirect()} replace />} />
    </Routes>
  )
}
