import { Navigate, Route, Routes } from 'react-router-dom';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import { navigationFor } from './navigation.js';
import Dashboard from '../pages/Dashboard.jsx';
import Accounts from '../pages/Accounts.jsx';
import { Clubs } from '../pages/Clubs.jsx';
import { Engagement } from '../pages/Engagement.jsx';
import { Quests } from '../pages/Quests.jsx';
import { Rubrics } from '../pages/Rubrics.jsx';
import { Seasons } from '../pages/Seasons.jsx';
import { Anomalies } from '../pages/Anomalies.jsx';
import { Audit } from '../pages/Audit.jsx';
import { RoleMatrix } from '../pages/RoleMatrix.jsx';
import { SystemSettings } from '../pages/SystemSettings.jsx';

export default function AppRoutes() {
  const { role } = useWorkspace();
  const admin = role === 'ADMIN';
  const nav = navigationFor(admin);
  return (
    <Routes>
      <Route
        path="/ctsv/overview"
        element={!admin ? <Dashboard /> : <Navigate to="/admin/accounts" replace />}
      />
      <Route
        path="/ctsv/clubs"
        element={!admin ? <Clubs /> : <Navigate to="/admin/accounts" replace />}
      />
      <Route
        path="/ctsv/engagement"
        element={!admin ? <Engagement /> : <Navigate to="/admin/accounts" replace />}
      />
      <Route
        path="/ctsv/quests"
        element={!admin ? <Quests /> : <Navigate to="/admin/accounts" replace />}
      />
      <Route
        path="/ctsv/rubrics"
        element={!admin ? <Rubrics /> : <Navigate to="/admin/accounts" replace />}
      />
      <Route
        path="/ctsv/seasons"
        element={!admin ? <Seasons /> : <Navigate to="/admin/accounts" replace />}
      />
      <Route
        path="/ctsv/anomalies"
        element={!admin ? <Anomalies /> : <Navigate to="/admin/accounts" replace />}
      />
      <Route
        path="/ctsv/reports"
        element={!admin ? <Engagement reports /> : <Navigate to="/admin/accounts" replace />}
      />
      <Route
        path="/admin/accounts"
        element={admin ? <Accounts /> : <Navigate to="/ctsv/overview" replace />}
      />
      <Route
        path="/admin/roles"
        element={admin ? <RoleMatrix /> : <Navigate to="/ctsv/overview" replace />}
      />
      {['integrations', 'settings', 'health'].map((type) => (
        <Route
          key={type}
          path={`/admin/${type}`}
          element={
            admin ? (
              <SystemSettings key={type} type={type} />
            ) : (
              <Navigate to="/ctsv/overview" replace />
            )
          }
        />
      ))}
      <Route
        path="/admin/audit"
        element={admin ? <Audit /> : <Navigate to="/ctsv/overview" replace />}
      />
      <Route path="*" element={<Navigate to={nav[0].path} replace />} />
    </Routes>
  );
}