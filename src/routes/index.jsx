import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { affairsNav, adminNav, legacyRoutes, legacyDestination } from './navigation.js';
import { canAccessPath, defaultPathFor } from '../utils/access.js';
import AppLayout from '../layouts/app-layout/AppLayout.jsx';
import ClubDetail from '../pages/club-detail/ClubDetail.jsx';
import Login from '../pages/login/Login.jsx';
import WorkInbox from '../pages/work-inbox/WorkInbox.jsx';
import Dashboard from '../pages/dashboard/Dashboard.jsx';
import { DeclarationsQueue } from '../pages/declarations-queue/DeclarationsQueue.jsx';
import { ClubReportDetail } from '../pages/club-report-detail/ClubReportDetail.jsx';
import {
  SemesterHub,
  ClubsHub,
  ActivitiesHub,
  MonitoringHub,
  PoliciesHub,
  AccountsHub,
  ConfigurationHub,
  OperationsHub,
  AuditHub,
} from '../pages/feature-hubs/FeatureHubs.jsx';
import { WorkflowProvider } from '../workflows/WorkflowContext.jsx';
const pages = {
  '/ctsv/work': <WorkInbox overview={<Dashboard />} />,
  '/ctsv/semesters': <SemesterHub />,
  '/ctsv/clubs': <ClubsHub />,
  '/ctsv/activities': <ActivitiesHub />,
  '/ctsv/declarations': <DeclarationsQueue />,
  '/ctsv/monitoring': <MonitoringHub />,
  '/ctsv/policies': <PoliciesHub />,
  '/admin/accounts': <AccountsHub />,
  '/admin/configuration': <ConfigurationHub />,
  '/admin/operations': <OperationsHub />,
  '/admin/audit': <AuditHub />,
};
function LegacyRedirect() {
  const location = useLocation();
  return (
    <Navigate
      replace
      to={legacyDestination(location.pathname, location.search)}
      state={location.state}
    />
  );
}
export default function AppRoutes() {
  const { user } = useAuth();
  if (!user) return <Login />;
  const fallback = defaultPathFor(user);
  return (
    <WorkflowProvider>
      <AppLayout>
        <Routes>
          <Route
            path="/ctsv/reports/:reportId"
            element={
              canAccessPath(user, '/ctsv/reports') ? (
                <ClubReportDetail />
              ) : (
                <Navigate to={fallback} replace />
              )
            }
          />
          <Route
            path="/ctsv/clubs/:clubId"
            element={
              canAccessPath(user, '/ctsv/clubs') ? (
                <ClubDetail />
              ) : (
                <Navigate to={fallback} replace />
              )
            }
          />
          {[...affairsNav, ...adminNav].map(({ path }) => (
            <Route
              key={path}
              path={path}
              element={canAccessPath(user, path) ? pages[path] : <Navigate to={fallback} replace />}
            />
          ))}
          {Object.keys(legacyRoutes).map((path) => (
            <Route
              key={path}
              path={path}
              element={
                canAccessPath(user, path) ? <LegacyRedirect /> : <Navigate to={fallback} replace />
              }
            />
          ))}
          <Route path="*" element={<Navigate to={fallback} replace />} />
        </Routes>
      </AppLayout>
    </WorkflowProvider>
  );
}
