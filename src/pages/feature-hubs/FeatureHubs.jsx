import './FeatureHubs.css';
import { useState } from 'react';
import { Info } from 'lucide-react';
import { featureTabs } from '../../routes/navigation.js';
import FeatureWorkspace, {
  useFeatureView,
} from '../../components/workflow/feature-workspace/FeatureWorkspace.jsx';
import ExperiencePolicyPanel from '../../components/experience-policy-panel/ExperiencePolicyPanel.jsx';
import { Button, Panel, IconButton, Modal } from '../../components/ui/index.js';
import { WorkflowBody } from '../../components/workflow/workflow-primitives/WorkflowPrimitives.jsx';
import { useOperationQuery } from '../../hooks/useOperationQuery.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import api from '../../services/api.js';
import { Seasons } from '../seasons/Seasons.jsx';
import { Clubs } from '../clubs/Clubs.jsx';
import { ClubReports } from '../club-reports/ClubReports.jsx';
import { ClubRequests } from '../club-requests/ClubRequests.jsx';
import { Engagement } from '../engagement/Engagement.jsx';
import { Anomalies } from '../anomalies/Anomalies.jsx';
import { ExperienceReconciliation } from '../experience-reconciliation/ExperienceReconciliation.jsx';
import { Quests } from '../quests/Quests.jsx';
import { Rubrics } from '../rubrics/Rubrics.jsx';
import Accounts from '../accounts/Accounts.jsx';
import { RoleMatrix } from '../role-matrix/RoleMatrix.jsx';
import { SystemSettings } from '../system-settings/SystemSettings.jsx';
import { Audit } from '../audit/Audit.jsx';
import { StudentRoster } from '../student-roster/StudentRoster.jsx';
import ActivityApplications from './ActivityApplications.jsx';
import ActivityBookingDesk from './ActivityBookingDesk.jsx';
import AcademicCalendar from '../seasons/AcademicCalendar.jsx';

export function SemesterHub() {
  const tabs = featureTabs.semesters,
    active = useFeatureView(tabs);
  return (
    <FeatureWorkspace
      title="Học kỳ & sinh viên"
      description="Quản lý học kỳ, danh sách sinh viên và hạn xử lý."
      tabs={tabs}
      active={active}
    >
      {active === 'periods' && (
        <>
          <Seasons section="periods" />
          <AcademicCalendar />
        </>
      )}
      {active === 'deadlines' && <Seasons section="deadlines" />}
      {active === 'students' && <StudentRoster />}
    </FeatureWorkspace>
  );
}
export function ClubsHub() {
  const tabs = featureTabs.clubs,
    active = useFeatureView(tabs);
  return (
    <FeatureWorkspace
      title="Câu lạc bộ"
      description="Quản lý hồ sơ, báo cáo học kỳ và yêu cầu của từng CLB."
      tabs={tabs}
      active={active}
    >
      {active === 'registry' && <Clubs />}
      {active === 'reports' && <ClubReports reportScope="club" />}
      {active === 'requests' && <ClubRequests />}
    </FeatureWorkspace>
  );
}
export function ActivitiesHub() {
  const tabs = featureTabs.activities,
    active = useFeatureView(tabs);
  return (
    <FeatureWorkspace
      title="Hoạt động"
      description="Xét duyệt kế hoạch và báo cáo hoạt động; quản lý địa điểm, thiết bị và nhiệm vụ."
      tabs={tabs}
      active={active}
    >
      {active === 'club' && (
        <>
          <ActivityApplications />
          <ClubReports reportScope="activity" />
        </>
      )}
      {active === 'bookings' && <ActivityBookingDesk />}
      {active === 'campus-maps' && <ActivityBookingDesk mapsOnly />}
      {active === 'quests' && <Quests />}
    </FeatureWorkspace>
  );
}
export function MonitoringHub() {
  const tabs = featureTabs.monitoring,
    active = useFeatureView(tabs);
  return (
    <FeatureWorkspace
      title="Theo dõi & đối soát"
      description="Đi từ chỉ số tổng hợp đến hồ sơ nguồn, minh chứng và bút toán liên quan."
      tabs={tabs}
      active={active}
    >
      {active === 'engagement' && <Engagement />}
      {active === 'anomalies' && <Anomalies />}
      {active === 'reconciliation' && <ExperienceReconciliation />}
    </FeatureWorkspace>
  );
}
function PolicyRecords({ historyOnly }) {
  const { user } = useAuth(),
    { season } = useWorkspace();
  const result = useOperationQuery(
    () => api.studentAffairs.benchmarks.getActive(),
    `${user?.id}:active-policy-benchmark:${season}`,
  );
  if (result.loading) return <p role="status">Đang tải chính sách…</p>;
  if (result.error)
    return (
      <Panel title="Không tải được chính sách">
        <WorkflowBody>
          <p role="alert">{result.error.message}</p>
          <Button onClick={result.retry}>Thử lại</Button>
        </WorkflowBody>
      </Panel>
    );
  if (!result.data?.id)
    return (
      <Panel title="Chưa có benchmark để tra cứu chính sách">
        <WorkflowBody>
          <p>Tạo hoặc chọn benchmark để xem chính sách.</p>
        </WorkflowBody>
      </Panel>
    );
  return (
    <div className="feature-hubs-section">
      <p className="feature-hubs-note">Học kỳ: {result.data.semesterCode || 'Chưa xác định'}</p>
      <ExperiencePolicyPanel
        benchmarkId={result.data.id}
        onChanged={result.retry}
        historyOnly={historyOnly}
      />
    </div>
  );
}
export function PoliciesHub() {
  const tabs = featureTabs.policies,
    active = useFeatureView(tabs);
  return (
    <FeatureWorkspace
      title="Thang điểm & chính sách"
      description="CTSV chuẩn bị benchmark; quyền phê duyệt snapshot chính sách tiếp tục được kiểm tra theo vai trò Admin hiện có."
      tabs={tabs}
      active={active}
    >
      {active === 'benchmark' ? (
        <Rubrics showPolicy={false} />
      ) : (
        <PolicyRecords key={active} historyOnly={active === 'history'} />
      )}
    </FeatureWorkspace>
  );
}
export function AccountsHub() {
  const [rolesOpen, setRolesOpen] = useState(false);
  return (
    <FeatureWorkspace
      title="Tài khoản"
      description="Admin theo dõi trạng thái và tạo tài khoản CTSV. Hai vai trò có không gian làm việc riêng."
      tabs={featureTabs.accounts}
      active="accounts"
      tabAction={
        <IconButton icon={Info} label="Thông tin vai trò" onClick={() => setRolesOpen(true)} />
      }
    >
      <Accounts />
      {rolesOpen && (
        <Modal wide title="Thông tin vai trò" onClose={() => setRolesOpen(false)}>
          <RoleMatrix />
        </Modal>
      )}
    </FeatureWorkspace>
  );
}
export function ConfigurationHub() {
  const tabs = featureTabs.configuration,
    active = useFeatureView(tabs);
  return (
    <FeatureWorkspace
      title="Cấu hình & tích hợp"
      description="Thiết lập nền tảng và kết nối. Lưu cấu hình không đồng nghĩa dịch vụ đã được kích hoạt."
      tabs={tabs}
      active={active}
    >
      {active === 'campus-maps' ? (
        <ActivityBookingDesk mapsOnly />
      ) : (
        <SystemSettings
          key={active}
          type={active === 'platform' ? 'settings' : 'integrations'}
          integrationSection={active}
        />
      )}
    </FeatureWorkspace>
  );
}
export function OperationsHub() {
  const tabs = [
      { id: 'overview', label: 'Tổng quan dịch vụ' },
      { id: 'connections', label: 'Trạng thái kết nối' },
    ],
    active = useFeatureView(tabs);
  return (
    <FeatureWorkspace
      title="Vận hành hệ thống"
      description="Theo dõi thống kê và tình trạng kết nối."
      tabs={tabs}
      active={active}
    >
      <SystemSettings type="health" healthSection={active} />
    </FeatureWorkspace>
  );
}
export function AuditHub() {
  const tabs = [{ id: 'events', label: 'Nhật ký thao tác' }],
    active = useFeatureView(tabs);
  return (
    <FeatureWorkspace
      title="Nhật ký & truy vết"
      description="Tra cứu lịch sử thao tác và thay đổi."
      tabs={tabs}
      active={active}
    >
      <Audit />
    </FeatureWorkspace>
  );
}
