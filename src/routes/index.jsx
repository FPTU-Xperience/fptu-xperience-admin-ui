import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { affairsNav, adminNav } from './navigation.js';
import { canAccessPath, defaultPathFor } from '../utils/access.js';
import AppLayout from '../layouts/AppLayout.jsx';
import Dashboard from '../pages/Dashboard.jsx';
import Accounts from '../pages/Accounts.jsx';
import { Clubs } from '../pages/Clubs.jsx';
import { Engagement } from '../pages/Engagement.jsx';
import { DeclarationsQueue } from '../pages/DeclarationsQueue.jsx';
import { Quests } from '../pages/Quests.jsx';
import { Rubrics } from '../pages/Rubrics.jsx';
import { Seasons } from '../pages/Seasons.jsx';
import { Anomalies } from '../pages/Anomalies.jsx';
import { Audit } from '../pages/Audit.jsx';
import { RoleMatrix } from '../pages/RoleMatrix.jsx';
import { SystemSettings } from '../pages/SystemSettings.jsx';
import Login from '../pages/Login.jsx';
import { ClubReports } from '../pages/ClubReports.jsx';
import { ClubReportDetail } from '../pages/ClubReportDetail.jsx';
import { ClubRequests } from '../pages/ClubRequests.jsx';
import { StudentRoster } from '../pages/StudentRoster.jsx';
import { PendingOperations } from '../pages/PendingOperations.jsx';
import { ExperienceReconciliation } from '../pages/ExperienceReconciliation.jsx';

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
        <Route path="/ctsv/reports/:reportId" element={canAccessPath(user, '/ctsv/reports') ? <ClubReportDetail /> : <Navigate to={fallback} replace />} />
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
