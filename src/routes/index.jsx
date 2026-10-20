import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { affairsNav, adminNav } from './navigation.js';
import { canAccessPath, defaultPathFor } from '../utils/access.js';
import AppLayout from '../layouts/app-layout/AppLayout.jsx';
import Dashboard from '../pages/dashboard/Dashboard.jsx';
import Accounts from '../pages/accounts/Accounts.jsx';
import { Clubs } from '../pages/clubs/Clubs.jsx';
import { Engagement } from '../pages/engagement/Engagement.jsx';
import { DeclarationsQueue } from '../pages/declarations-queue/DeclarationsQueue.jsx';
import { Quests } from '../pages/quests/Quests.jsx';
import { Rubrics } from '../pages/rubrics/Rubrics.jsx';
import { Seasons } from '../pages/seasons/Seasons.jsx';
import { Anomalies } from '../pages/anomalies/Anomalies.jsx';
import { Audit } from '../pages/audit/Audit.jsx';
import { RoleMatrix } from '../pages/role-matrix/RoleMatrix.jsx';
import { SystemSettings } from '../pages/system-settings/SystemSettings.jsx';
import Login from '../pages/login/Login.jsx';
import { ClubReports } from '../pages/club-reports/ClubReports.jsx';
import { ClubReportDetail } from '../pages/club-report-detail/ClubReportDetail.jsx';
import { ClubRequests } from '../pages/club-requests/ClubRequests.jsx';
import { StudentRoster } from '../pages/student-roster/StudentRoster.jsx';
import { PendingOperations } from '../pages/pending-operations/PendingOperations.jsx';
import { ExperienceReconciliation } from '../pages/experience-reconciliation/ExperienceReconciliation.jsx';

const pages = {
  '/ctsv/overview': <Dashboard />,
  '/ctsv/clubs': <Clubs />,
  '/ctsv/declarations': <DeclarationsQueue />,
  '/ctsv/engagement': <Engagement />,
  '/ctsv/quests': <Quests />,
  '/ctsv/rubrics': <Rubrics />,
  '/ctsv/seasons': <Seasons />,
  '/ctsv/anomalies': <Anomalies />,
  '/ctsv/reports': <ClubReports />,
  '/ctsv/activity-approvals': <ClubReports activitiesOnly />,
  '/ctsv/activity-dossiers': <PendingOperations operation="dossiers" />,
  '/ctsv/club-requests': <ClubRequests />,
  '/ctsv/student-roster': <StudentRoster />,
  '/ctsv/rollover': <PendingOperations operation="rollover" />,
  '/ctsv/leadership': <PendingOperations operation="leadership" />,
  '/ctsv/club-bonuses': <PendingOperations operation="bonuses" />,
  '/ctsv/global-activities': <PendingOperations operation="global" />,
  '/ctsv/experience-audit': <ExperienceReconciliation />,
  '/admin/accounts': <Accounts />,
  '/admin/roles': <RoleMatrix />,
  '/admin/integrations': <SystemSettings key="integrations" type="integrations" />,
  '/admin/settings': <SystemSettings key="settings" type="settings" />,
  '/admin/health': <SystemSettings key="health" type="health" />,
  '/admin/audit': <Audit />,
};

export default function AppRoutes() {
  const { user } = useAuth();
  if (!user) return <Login />;
  const fallback = defaultPathFor(user);
  return (
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
        {[...affairsNav, ...adminNav].map(({ path }) => (
          <Route
            key={path}
            path={path}
            element={canAccessPath(user, path) ? pages[path] : <Navigate to={fallback} replace />}
          />
        ))}
        <Route path="*" element={<Navigate to={fallback} replace />} />
      </Routes>
    </AppLayout>
  );
}
