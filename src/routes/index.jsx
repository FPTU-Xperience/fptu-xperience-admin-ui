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
  const { user, isAdminUser } = useAuth()

  // Only allow admin users for admin routes
  if (!isAdminUser(user)) {
    return <Navigate to="/ctsv/overview" replace />
  }

  return children
}

// Protected route for CTSV pages
function CTSVRoute({ children }) {
  const { user, isAdminUser } = useAuth()

  // Only allow admin/CTSV users for CTSV routes
  if (!isAdminUser(user)) {
    // For now, redirect to login if not authenticated
    // In the future, could show a "not authorized" page
    return <Navigate to="/ctsv/overview" replace />
  }

  return children
}

export default function AppRoutes() {
  const { user } = useAuth()
  const { role } = useWorkspace()

  // Determine if user is admin based on session role switcher or actual role
  // For now, use the workspace role switcher for preview
  const previewRole = role
  const nav = navigationFor(previewRole === 'ADMIN')

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

      {/* Default redirect */}
      <Route path="*" element={<Navigate to={nav[0]?.path || '/ctsv/overview'} replace />} />
    </Routes>
  )
}
