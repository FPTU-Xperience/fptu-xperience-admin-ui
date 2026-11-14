import { featureTabs } from '../../routes/navigation.js';
import './WorkInbox.css';
import { useListQuery } from '../../hooks/useListQuery.js';
import { Link, useLocation } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import { useWorkflow } from '../../workflows/WorkflowContext.jsx';
import { loadWorkInbox, mockInbox } from '../../workflows/work-inbox.js';
import { reportWorkflows } from '../../services/report-workflows.js';
import api from '../../services/api.js';
import { useOperationQuery } from '../../hooks/useOperationQuery.js';
import FeatureWorkspace, {
  useFeatureView,
} from '../../components/workflow/feature-workspace/FeatureWorkspace.jsx';
import { Badge, Button, Field, Panel, Pagination } from '../../components/ui/index.js';
import {
  WorkflowActions,
  WorkflowBody,
  WorkflowTable,
} from '../../components/workflow/workflow-primitives/WorkflowPrimitives.jsx';

const tabs = featureTabs.work;
export default function WorkInbox({ overview }) {
  const active = useFeatureView(tabs),
    { user } = useAuth(),
    { season, semesterStatus } = useWorkspace(),
    { scope } = useWorkflow();
  const { query, setQuery, source, setSource, kind, setKind, urgent, setUrgent, page, setPage } =
    useListQuery({ query: '', source: 'all', kind: 'all', urgent: false, page: 1 });
  const location = useLocation();
  const ready = active !== 'overview' && !['idle', 'loading'].includes(semesterStatus);
  const live = useOperationQuery(
    () =>
      ready ? loadWorkInbox(api, reportWorkflows, { bucket: active, semester: season }) : null,
    JSON.stringify([user?.id, season, active, ready]),
  );
  const apiRows = (live.data || []).flatMap((s) =>
    s.rows.map((row) => ({ ...row, kind: s.label, periodScoped: s.period })),
  );
  const simulated = mockInbox(scope).filter((r) => r.bucket === active);
  const kinds = [...new Set([...apiRows, ...simulated].map((r) => r.kind))];
  const items = [...apiRows, ...simulated].filter(
    (r) =>
      (source === 'all' || r.source === source) &&
      (kind === 'all' || r.kind === kind) &&
      `${r.title} ${r.owner}`.toLowerCase().includes(query.toLowerCase()) &&
      (!urgent || (r.deadline && Date.parse(r.deadline) < Date.now())),
  );
  const safePage = Math.min(page, Math.max(1, Math.ceil(items.length / 20)));
  return (
    <FeatureWorkspace
      title="Việc cần xử lý"
      description="Theo dõi hồ sơ và công việc cần xử lý."
      tabs={tabs}
      active={active}
    >
      {active === 'overview' ? (
        overview
      ) : (
        <div className="work-inbox">
          <Panel
            title="Hàng chờ công việc"
            action={
              <Button icon={RefreshCw} onClick={live.retry}>
                Tải lại
              </Button>
            }
          >
            <WorkflowBody>
              {active === 'actionable' && (
                <WorkflowActions>
                  <Link to="/ctsv/activities?view=club&source=api">
                    Hồ sơ hoạt động CLB chờ duyệt <span aria-hidden="true">→</span>
                  </Link>
                </WorkflowActions>
              )}
              <div className="work-inbox-filters">
                <Field label="Tìm hồ sơ / người phụ trách">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Tên hoạt động, CLB, sinh viên…"
                  />
                </Field>
                <Field label="Nguồn dữ liệu">
                  <select value={source} onChange={(e) => setSource(e.target.value)}>
                    <option value="all">Tất cả</option>
                    <option value="API">Hồ sơ thật</option>
                    <option value="MOCK">Mô phỏng</option>
                  </select>
                </Field>
                <Field label="Loại công việc">
                  <select value={kind} onChange={(e) => setKind(e.target.value)}>
                    <option value="all">Tất cả loại</option>
                    {kinds.map((k) => (
                      <option key={k}>{k}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <label className="work-inbox-urgent">
                <input
                  type="checkbox"
                  checked={urgent}
                  onChange={(e) => setUrgent(e.target.checked)}
                />{' '}
                Chỉ hồ sơ có hạn đã qua
              </label>
              {live.loading && <p role="status">Đang tải công việc…</p>}
              {live.error && <p role="alert">Không tải được công việc: {live.error.message}</p>}
              {(live.data || [])
                .filter((s) => s.error)
                .map((s) => (
                  <p key={s.id} role="alert">
                    {s.label}: {s.error}. <Link to={s.path}>Mở nguồn để thử lại</Link>
                  </p>
                ))}
              <p className="work-inbox-note">
                Hiển thị tối đa 20 hồ sơ mỗi nguồn. Mở danh sách nguồn để xem đầy đủ.
              </p>
            </WorkflowBody>
            <WorkflowTable
              label="Hàng chờ công việc"
              columns={['Hồ sơ', 'Nguồn & loại', 'Phụ trách / hạn', 'Trạng thái', 'Thao tác']}
            >
              {items.slice((safePage - 1) * 20, safePage * 20).map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.title}</strong>
                  </td>
                  <td>
                    <Badge tone={row.source === 'MOCK' ? 'orange' : 'blue'}>
                      {row.source === 'MOCK' ? 'Mô phỏng' : 'Hồ sơ thật'}
                    </Badge>
                    <small>{row.kind}</small>
                  </td>
                  <td>
                    {row.owner}
                    <small>
                      {row.deadline ? `Hạn: ${row.deadline}` : 'Nguồn chưa cung cấp hạn xử lý'}
                    </small>
                  </td>
                  <td>{row.status}</td>
                  <td>
                    <Link to={row.path} state={{ returnTo: location.pathname + location.search }}>
                      Mở hồ sơ →
                    </Link>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td colSpan={5}>Không có công việc phù hợp với bộ lọc hiện tại.</td>
                </tr>
              )}
            </WorkflowTable>
            <Pagination page={safePage} total={items.length} pageSize={20} onChange={setPage} />
          </Panel>
          <WorkflowActions>
            {(live.data || []).map((s) => (
              <Link key={s.id} to={s.path}>
                {s.label} {s.limited ? '· xem đầy đủ' : '→'}
              </Link>
            ))}
          </WorkflowActions>
        </div>
      )}
    </FeatureWorkspace>
  );
}
