import ClubViceReview from './ClubViceReview.jsx';
import RawFundingPanel from '../feature-hubs/RawFundingPanel.jsx';
import { isCTSV } from '../../utils/access.js';
import { useListQuery, usePageBound } from '../../hooks/useListQuery.js';
import './ClubDetail.css';
import { useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Pencil, RefreshCw } from 'lucide-react';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useOperationQuery } from '../../hooks/useOperationQuery.js';
import FeatureWorkspace, {
  useFeatureView,
} from '../../components/workflow/feature-workspace/FeatureWorkspace.jsx';
import {
  WorkflowActions,
  WorkflowBody,
  WorkflowTable,
} from '../../components/workflow/workflow-primitives/WorkflowPrimitives.jsx';
import {
  OperationState,
  PageNavigation,
} from '../../components/operations/operation-state/OperationState.jsx';
import { Badge, Button, Field, Panel } from '../../components/ui/index.js';
import { ClubForm, mapClubsFromApi } from '../clubs/Clubs.jsx';
import { ClubReports } from '../club-reports/ClubReports.jsx';
import { ClubRequests } from '../club-requests/ClubRequests.jsx';

export const clubDetailTabs = [
  { id: 'overview', label: 'Tổng quan' },
  { id: 'members', label: 'Thành viên' },
  { id: 'reports', label: 'Báo cáo học kỳ' },
  { id: 'activities', label: 'Hoạt động' },
  { id: 'requests', label: 'Hồ sơ & yêu cầu' },
  { id: 'leadership', label: 'Lãnh đạo' },
  { id: 'raw-funding', label: 'Quỹ điểm thô' },
];

export default function ClubDetail() {
  const { clubId } = useParams();
  // Reset forms and selections when navigating directly between two club records.
  return <ClubRecord key={clubId} clubId={clubId} />;
}
function ClubRecord({ clubId }) {
  const location = useLocation();
  const returnTo = location.state?.returnTo;
  const listPath =
    typeof returnTo === 'string' && /^\/ctsv\/clubs(?:\?|$)/.test(returnTo)
      ? returnTo
      : '/ctsv/clubs?view=registry';
  const { user } = useAuth();
  const active = useFeatureView(clubDetailTabs);
  const [editing, setEditing] = useState(false);
  const profile = useOperationQuery(async () => {
    const row = await api.clubs.getById(clubId);
    if (!row || String(row.id) !== clubId || !row.name)
      throw new Error('Không tìm thấy hồ sơ CLB hợp lệ.');
    return row;
  }, `${user.id}:club:${clubId}`);
  const categories = useOperationQuery(async () => {
    if (!editing) return [];
    const rows = await api.clubs.categories.list();
    if (!Array.isArray(rows)) throw new Error('Không tải được loại CLB.');
    return rows.map((r) => (typeof r === 'string' ? r : r.name)).filter(Boolean);
  }, `${user.id}:club-types:${editing}`);
  const club = profile.data && mapClubsFromApi([profile.data])[0];
  const canEdit = isCTSV(user);
  const root = `/ctsv/clubs/${encodeURIComponent(clubId)}`;
  return (
    <div className="club-detail">
      <Link to={listPath} className="club-detail-back">
        <ArrowLeft size={16} /> Danh sách câu lạc bộ
      </Link>
      <FeatureWorkspace
        title={club?.name || 'Chi tiết câu lạc bộ'}
        description={
          club
            ? `${club.code} · ${club.category || 'Chưa phân loại'} · Hồ sơ quản lý của CTSV`
            : 'Đang tải hồ sơ.'
        }
        tabs={clubDetailTabs}
        active={active}
      >
        <OperationState {...profile} onRetry={profile.retry}>
          {club && (
            <>
              <div className="club-detail-context">
                <Badge tone={club.status === 'active' ? 'green' : 'orange'}>
                  {club.status === 'active' ? 'Đang hoạt động' : 'Tạm dừng'}
                </Badge>
                <span>CLB #{clubId}</span>
                <Button icon={RefreshCw} onClick={profile.retry}>
                  Tải lại thông tin
                </Button>
              </div>
              {active === 'overview' && (
                <>
                  <Panel
                    title="Thông tin câu lạc bộ"
                    action={
                      canEdit && (
                        <Button icon={Pencil} onClick={() => setEditing(true)}>
                          Chỉnh sửa thông tin
                        </Button>
                      )
                    }
                  >
                    <WorkflowBody>
                      <p>{club.description || 'CLB chưa cập nhật mô tả.'}</p>
                      <dl className="club-detail-facts">
                        <div>
                          <dt>Chủ nhiệm</dt>
                          <dd>{club.leader || 'Chưa cập nhật'}</dd>
                        </div>
                        <div>
                          <dt>Thành viên</dt>
                          <dd>{profile.data.memberCount ?? 'Chưa có thống kê'}</dd>
                        </div>
                        <div>
                          <dt>Email liên hệ</dt>
                          <dd>{club.email || 'Chưa cập nhật'}</dd>
                        </div>
                        <div>
                          <dt>Số điện thoại</dt>
                          <dd>{club.phone || 'Chưa cập nhật'}</dd>
                        </div>
                      </dl>
                    </WorkflowBody>
                  </Panel>
                  <div className="club-detail-shortcuts">
                    {clubDetailTabs.slice(1).map((tab) => (
                      <Link key={tab.id} to={`${root}?view=${tab.id}`}>
                        <strong>{tab.label}</strong>
                        <span>{descriptions[tab.id]}</span>
                      </Link>
                    ))}
                  </div>
                </>
              )}
              {active === 'members' && <ClubMembers clubId={clubId} />}
              {active === 'raw-funding' && <RawFundingPanel key={clubId} clubId={clubId} />}
              {active === 'reports' && (
                <ClubReports reportScope="club" clubId={clubId} clubName={club.name} />
              )}
              {active === 'requests' && <ClubRequests clubId={clubId} />}
              {active === 'activities' && (
                <ClubReports reportScope="activity" clubId={clubId} clubName={club.name} />
              )}
              {active === 'leadership' && (
                <>
                  <ClubViceReview clubId={clubId} />
                  <Panel title="Chủ nhiệm hiện tại">
                    <WorkflowBody>
                      <p>{club.leader || 'Chưa có thông tin chủ nhiệm.'}</p>
                      <Link to={`${root}?view=requests&type=transfer`}>
                        Xử lý hồ sơ chuyển chủ nhiệm →
                      </Link>
                    </WorkflowBody>
                  </Panel>
                </>
              )}
              {editing && (
                <Panel title="Cập nhật hồ sơ">
                  <OperationState {...categories} onRetry={categories.retry}>
                    {categories.data && (
                      <ClubForm
                        club={club}
                        types={[...new Set([club.category, ...categories.data].filter(Boolean))]}
                        onClose={() => setEditing(false)}
                        onSave={() => {
                          setEditing(false);
                          profile.retry();
                        }}
                      />
                    )}
                  </OperationState>
                  <Button onClick={() => setEditing(false)}>Đóng chỉnh sửa</Button>
                </Panel>
              )}
            </>
          )}
        </OperationState>
      </FeatureWorkspace>
    </div>
  );
}
const descriptions = {
  members: 'Tra cứu thành viên, vai trò và trạng thái.',
  reports: 'Xét duyệt báo cáo đầu kỳ và cuối kỳ của CLB.',
  activities: 'Xét duyệt báo cáo hoạt động của CLB.',
  requests: 'Xét duyệt đề nghị giải thể và chuyển chủ nhiệm.',
  leadership: 'Theo dõi lãnh đạo và xét duyệt hồ sơ chuyển chủ nhiệm.',
  'raw-funding': 'Cấp quỹ, theo dõi phân bổ và quyết toán điểm thô theo học kỳ.',
};
function ClubMembers({ clubId }) {
  const { user } = useAuth();
  const { search, setSearch, page, setPage } = useListQuery({ search: '', page: 1 }, 'members_');
  const result = useOperationQuery(
    async () => {
      const data = await api.clubs.members.list(clubId, { page, pageSize: 20, search });
      if (!data || !Array.isArray(data.items) || !Number.isFinite(data.totalItems))
        throw new Error('Phản hồi danh sách thành viên không hợp lệ.');
      return data;
    },
    JSON.stringify([user.id, clubId, page, search]),
  );
  usePageBound(page, result.data?.totalPages, !result.loading && Boolean(result.data), setPage);
  const roles = {
    CLUB_MANAGER: 'Chủ nhiệm',
    CLUB_VICE_MANAGER: 'Phó chủ nhiệm',
    CLUB_MEMBER: 'Thành viên',
    CLUB_TREASURER: 'Thủ quỹ',
    MEMBER: 'Thành viên',
    VICE_MANAGER: 'Phó chủ nhiệm',
    TREASURER: 'Thủ quỹ',
  };
  const statuses = {
    APPROVED: 'Đã duyệt',
    PENDING: 'Chờ duyệt',
    REJECTED: 'Từ chối',
    INVITED: 'Đã mời',
  };
  return (
    <Panel title="Thành viên CLB" description="Danh sách thành viên hiện tại.">
      <WorkflowBody>
        <WorkflowActions>
          <Field label="Tìm thành viên">
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </Field>
          <Button icon={RefreshCw} onClick={result.retry}>
            Tải lại
          </Button>
        </WorkflowActions>
        <OperationState
          {...result}
          empty={result.data && !result.data.items.length}
          onRetry={result.retry}
        >
          <WorkflowTable
            label="Thành viên CLB"
            columns={['Thành viên', 'Email', 'Vai trò', 'Trạng thái']}
          >
            {result.data?.items.map((member) => (
              <tr key={member.id}>
                <td>{member.fullName || `Thành viên #${member.userId}`}</td>
                <td>{member.email || 'Chưa cập nhật'}</td>
                <td>{roles[member.role] || member.role}</td>
                <td>{statuses[member.status?.toUpperCase()] || member.status}</td>
              </tr>
            ))}
          </WorkflowTable>
        </OperationState>
        {result.data && (
          <PageNavigation
            page={page}
            total={result.data.totalItems}
            totalPages={Math.max(1, result.data.totalPages)}
            onChange={setPage}
            disabled={result.loading}
          />
        )}
      </WorkflowBody>
    </Panel>
  );
}
