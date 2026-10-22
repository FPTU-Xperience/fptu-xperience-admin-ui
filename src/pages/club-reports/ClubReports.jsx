import './ClubReports.css';
import '../../components/operations/Operations.css';
import { useEffect, useRef } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import { useOperationQuery } from '../../hooks/useOperationQuery.js';
import { reportWorkflows } from '../../services/report-workflows.js';
import api from '../../services/api.js';
import {
  REPORT_STATUSES,
  REPORT_TYPES,
  reportTitle,
  reportType,
} from '../../utils/report-workflow.js';
import { date } from '../../utils/format.js';
import { Badge, Button, Field, PageHeader, Panel } from '../../components/ui/index.js';
import {
  OperationState,
  PageNavigation,
} from '../../components/operations/operation-state/OperationState.jsx';

export function ClubReports({
  activitiesOnly = false,
  reportScope,
  clubId: fixedClubId,
  clubName,
}) {
  const location = useLocation();
  const { user } = useAuth();
  const { season, semesterStatus } = useWorkspace();
  const [search, setSearch] = useSearchParams();
  const clubs = useOperationQuery(
    async () => {
      if (fixedClubId) return [{ id: fixedClubId, name: clubName }];
      const rows = await api.clubs.list();
      if (!Array.isArray(rows)) throw new Error('Không tải được bộ lọc câu lạc bộ.');
      return rows;
    },
    `${user?.id}:report-clubs:${fixedClubId || 'all'}`,
  );
  const page = Math.max(1, parseInt(search.get('page'), 10) || 1);
  const status = search.get('status') ?? 'Under Review';
  const types =
    reportScope === 'club'
      ? ['CLUB_TERM_START', 'CLUB_TERM_END']
      : reportScope === 'activity'
        ? ['FUTURE_EVENT', 'CLUB_ACTIVITY']
        : undefined;
  const requestedType = search.get('type') || '';
  const type = activitiesOnly
    ? 'FUTURE_EVENT'
    : !types || types.includes(requestedType)
      ? requestedType
      : '';
  const period = search.get('periodScope') === 'all' ? '' : season;
  const params = {
    page,
    pageSize: 20,
    status,
    period,
    clubId: fixedClubId || search.get('clubId'),
    type,
    ...(types ? { types } : {}),
  };
  const ready = !['idle', 'loading'].includes(semesterStatus);
  const result = useOperationQuery(
    () => (ready ? reportWorkflows.list(params) : null),
    JSON.stringify([user?.id, params, ready]),
  );
  const previousSeason = useRef(season);
  useEffect(() => {
    if (previousSeason.current === season) return;
    previousSeason.current = season;
    setSearch(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.delete('page');
        return next;
      },
      { replace: true },
    );
  }, [season]);
  useEffect(() => {
    if (result.data && page > result.data.totalPages)
      setSearch(
        (previous) => {
          const next = new URLSearchParams(previous);
          next.set('page', result.data.totalPages);
          return next;
        },
        { replace: true },
      );
  }, [result.data, page]);
  const update = (key, value) => {
    setSearch((previous) => {
      const next = new URLSearchParams(previous);
      value || key === 'status' ? next.set(key, value) : next.delete(key);
      next.delete('page');
      return next;
    });
  };
  const rows = result.data?.items || [];
  return (
    <>
      <PageHeader
        title={
          reportScope === 'club'
            ? 'Báo cáo đầu / cuối kỳ CLB'
            : reportScope === 'activity'
              ? 'Hồ sơ hoạt động từ CLB'
              : activitiesOnly
                ? 'Phê duyệt hoạt động'
                : 'Báo cáo từ câu lạc bộ'
        }
        description={
          activitiesOnly
            ? 'Xét đề xuất tổ chức hoạt động đã được CLB chuyển tiếp.'
            : 'Đọc báo cáo, kiểm tra hồ sơ đính kèm và gửi quyết định về câu lạc bộ.'
        }
      >
        <Button icon={RefreshCw} onClick={result.retry}>
          Tải lại
        </Button>
        {!reportScope && (
          <Link
            className="operation-link"
            to={activitiesOnly ? '/ctsv/reports' : '/ctsv/activity-approvals'}
          >
            {activitiesOnly ? 'Tất cả báo cáo' : 'Phê duyệt hoạt động'}
          </Link>
        )}
      </PageHeader>
      {['error', 'empty'].includes(semesterStatus) && (
        <p role="status" className="operation-notice club-reports-description">
          Chưa xác định được học kỳ đang xem. Báo cáo đang được tra cứu trên tất cả kỳ; bạn vẫn có
          thể đọc và xử lý hồ sơ.
        </p>
      )}
      {activitiesOnly && (
        <div className="operation-notice club-reports-description">
          <p>
            Danh sách này dùng hồ sơ đề xuất hoạt động hiện có. Ngân sách tài chính được hiển thị
            bằng VNĐ, tách biệt điểm trải nghiệm.
          </p>
          <Link className="club-reports-link" to="/ctsv/activity-dossiers">
            Hồ sơ action & quyết toán Xperience Point
          </Link>
        </div>
      )}
      <Panel>
        <div className="club-reports-content">
          <Field label="Trạng thái">
            <select value={status} onChange={(event) => update('status', event.target.value)}>
              <option value="">Tất cả trạng thái đang lưu hành</option>
              {Object.entries(REPORT_STATUSES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Kỳ báo cáo">
            <select
              value={search.get('periodScope') || 'current'}
              onChange={(event) => update('periodScope', event.target.value)}
            >
              <option value="current">
                {season ? `Học kỳ đang xem · ${season}` : 'Tất cả kỳ (chưa xác định học kỳ)'}
              </option>
              <option value="all">Tất cả kỳ báo cáo</option>
            </select>
          </Field>
          {!activitiesOnly && (
            <Field label="Loại báo cáo">
              <select value={type} onChange={(event) => update('type', event.target.value)}>
                <option value="">Tất cả loại</option>
                {Object.entries(REPORT_TYPES)
                  .filter(([value]) => !types || types.includes(value))
                  .map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
              </select>
            </Field>
          )}
          <div className="club-reports-content-2">
            <Field label="Câu lạc bộ">
              <select
                value={fixedClubId || search.get('clubId') || ''}
                onChange={(event) => update('clubId', event.target.value)}
                disabled={!!fixedClubId || clubs.loading || Boolean(clubs.error)}
              >
                <option value="">Tất cả CLB</option>
                {fixedClubId && (
                  <option value={fixedClubId}>{clubName || `CLB #${fixedClubId}`}</option>
                )}
                {!fixedClubId &&
                  search.get('clubId') &&
                  !clubs.data?.some((club) => String(club.id) === search.get('clubId')) && (
                    <option value={search.get('clubId')}>CLB #{search.get('clubId')}</option>
                  )}
                {clubs.data
                  ?.filter((club) => String(club.id) !== fixedClubId)
                  .map((club) => (
                    <option key={club.id} value={club.id}>
                      {club.name}
                    </option>
                  ))}
              </select>
            </Field>
            {clubs.error && (
              <div role="status" className="club-reports-content-3">
                <p>Không tải được bộ lọc CLB.</p>
                <Button onClick={clubs.retry}>Thử lại bộ lọc</Button>
              </div>
            )}
          </div>
        </div>
        {!ready ? (
          <p role="status" className="club-reports-description-2">
            Đang tải học kỳ…
          </p>
        ) : (
          <OperationState {...result} empty={!rows.length} onRetry={result.retry}>
            <ul className="club-reports-list">
              {rows.map((row) => (
                <li key={row.id}>
                  <Link
                    to={`/ctsv/reports/${row.id}`}
                    state={{
                      returnTo: `${location.pathname}?${search}`,
                      navigationOwner: ['CLUB_TERM_START', 'CLUB_TERM_END'].includes(
                        reportType(row),
                      )
                        ? 'clubs'
                        : 'activities',
                    }}
                    className="operation-report-row"
                  >
                    <div className="club-reports-content-4">
                      <span className="club-reports-text">
                        {row.clubName || `CLB #${row.clubId}`} · {row.period}
                      </span>
                      <h2 className="club-reports-heading">{reportTitle(row)}</h2>
                      <p className="club-reports-description-3">
                        {REPORT_TYPES[reportType(row)] || reportType(row)} · #{row.id} · Cập nhật{' '}
                        {date(row.updatedAtUtc)}
                      </p>
                    </div>
                    <div className="club-reports-content-5">
                      <Badge
                        tone={
                          row.status === 'Approved'
                            ? 'green'
                            : row.status === 'Under Review'
                              ? 'orange'
                              : 'neutral'
                        }
                      >
                        {REPORT_STATUSES[row.status] || row.status}
                      </Badge>
                      <span className="club-reports-text-2">Đọc báo cáo</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </OperationState>
        )}
        {ready && result.data && (
          <PageNavigation
            page={page}
            totalPages={result.data.totalPages}
            total={result.data.total}
            disabled={result.loading}
            onChange={(value) =>
              setSearch((previous) => {
                const next = new URLSearchParams(previous);
                next.set('page', value);
                return next;
              })
            }
          />
        )}
      </Panel>
    </>
  );
}
