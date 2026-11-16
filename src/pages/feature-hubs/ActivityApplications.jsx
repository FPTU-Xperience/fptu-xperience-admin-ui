import { useEffect, useRef, useState } from 'react';
import { useListQuery, usePageBound } from '../../hooks/useListQuery.js';
import api from '../../services/api.js';
import { createImplementedContracts } from '../../services/implemented-contracts.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button, Field, Panel } from '../../components/ui/index.js';
import { PageNavigation } from '../../components/operations/operation-state/OperationState.jsx';
import ActivityRescheduleReview from './ActivityRescheduleReview.jsx';
import ActivityClosingReportReview, { ActivityClosingPolicy } from './ActivityClosingReportReview.jsx';
import CampusActivities from './CampusActivities.jsx';
import ActivityXpSetup from './ActivityXpSetup.jsx';
import './ActivityLifecycle.css';

const contracts = createImplementedContracts(api);
export default function ActivityApplications() {
  const { user } = useAuth();
  const [clubs, setClubs] = useState([]);
  const [clubsError, setClubsError] = useState('');
  const { clubId, setClubId, page, setPage } = useListQuery(
    { clubId: '', page: 1 },
    'applications_',
  );
  const [status, setStatus] = useState('SUBMITTED');
  const [list, setList] = useState(null),
    [detail, setDetail] = useState(null),
    [history, setHistory] = useState([]);
  const [revision, setRevision] = useState(0),
    [reason, setReason] = useState('');
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  usePageBound(page, list?.totalPages, Boolean(list), setPage);
  const ticket = useRef(0),
    lock = useRef(false),
    pending = useRef(null);
  useEffect(() => {
    let active = true;
    setClubs([]);
    setClubsError('');
    api.clubs
      .list()
      .then((value) => {
        if (active) setClubs(Array.isArray(value) ? value : value.items || []);
      })
      .catch((issue) => {
        if (active) setClubsError(issue.message);
      });
    return () => {
      active = false;
    };
  }, [user?.id]);
  useEffect(() => {
    const current = ++ticket.current;
    setList(null);
    setDetail(null);
    setHistory([]);
    setError('');
    setReason('');
    pending.current = null;
    const request = clubId
      ? contracts.applications.list({ clubId, ...(status && { status }), page, pageSize: 20 })
      : contracts.applications.reviewQueue({ page, pageSize: 20 });
    request
      .then((value) => {
        if (current === ticket.current) setList(value);
      })
      .catch((issue) => {
        if (current === ticket.current) setError(issue.message);
      });
    return () => {
      ticket.current++;
    };
  }, [clubId, status, page, revision, user?.id]);
  const open = async (id) => {
    const current = ++ticket.current;
    setError('');
    setDetail(null);
    setHistory([]);
    setReason('');
    pending.current = null;
    try {
      const [value, audit] = await Promise.all([
        contracts.applications.get(id),
        contracts.applications.history(id),
      ]);
      if (current === ticket.current) {
        setDetail(value);
        setHistory(Array.isArray(audit) ? audit : audit.items || []);
      }
    } catch (issue) {
      if (current === ticket.current) setError(issue.message);
    }
  };
  const review = async (decision) => {
    if (lock.current || !detail?.capabilities?.canReview) return;
    lock.current = true;
    setBusy(true);
    setError('');
    const current = ticket.current;
    const fingerprint = JSON.stringify([detail.id, detail.version, decision, reason.trim()]);
    if (pending.current?.fingerprint !== fingerprint)
      pending.current = { fingerprint, key: crypto.randomUUID() };
    try {
      await contracts.applications.review(detail, decision, reason, pending.current.key);
      if (current === ticket.current) setRevision((x) => x + 1);
    } catch (issue) {
      if (current === ticket.current) {
        setError(issue.message);
        if (issue.status === 409) setDetail(null);
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <Panel title="Kế hoạch hoạt động CLB">
      <div className="activity-lifecycle">
        <CampusActivities clubs={clubs} />
        <Field label="Câu lạc bộ">
          <select
            value={clubId}
            disabled={busy}
            onChange={(e) => {
              setClubId(e.target.value);
              setStatus('SUBMITTED');
              setPage(1);
            }}
          >
            <option value="">Tất cả CLB trong phạm vi quản lý</option>
            {clubs.map((club) => (
              <option key={club.id} value={club.id}>
                {club.name}
              </option>
            ))}
          </select>
        </Field>
        {clubId && (
          <Field label="Trạng thái kế hoạch">
            <select value={status} disabled={busy} onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}>
              <option value="SUBMITTED">Chờ CTSV duyệt</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="">Tất cả trạng thái</option>
            </select>
          </Field>
        )}
        {clubsError && <p role="alert">Không tải được bộ lọc CLB. {clubsError}</p>}
        {clubId && <ActivityClosingPolicy key={clubId} clubId={clubId} />}
        <p>Duyệt kế hoạch sẽ tạo hoạt động ở trạng thái chưa công bố.</p>
        {error && <p role="alert">{error}</p>}
        {!list && !error && <p role="status">Đang tải hồ sơ…</p>}
        {list && (
          <>
            <ul>
              {list.items.map((row) => (
                <li key={row.id}>
                  <Button disabled={busy} onClick={() => open(row.id)}>
                    {row.title || `Hồ sơ ${row.id}`} · {clubs.find((club) => String(club.id) === String(row.clubId))?.name || `CLB #${row.clubId}`} · {row.status === 'SUBMITTED' ? 'Chờ CTSV duyệt' : row.status}
                  </Button>
                </li>
              ))}
            </ul>
            {!list.items.length && <p>{!clubId || status === 'SUBMITTED' ? 'Không có kế hoạch chờ duyệt.' : 'Không có kế hoạch phù hợp.'}</p>}
            <PageNavigation
              page={page}
              totalPages={Math.max(1, list.totalPages)}
              total={list.totalItems}
              onChange={setPage}
            />
          </>
        )}
        {detail && (
          <section className="activity-lifecycle-section">
            <h3>
              {detail.title} · {detail.status}
            </h3>
            <p>{detail.description}</p>
            <p>Mục tiêu: {detail.objective}</p>
            {detail.staffing?.length > 0 && (
              <ul aria-label="Phân công nội bộ">
                {detail.staffing.map((row) => (
                  <li key={row.userId}>
                    {row.assignmentKind === 'HOST' ? 'Host' : 'Staff'} · {row.displayName || `#${row.userId}`} · {detail.actions.find((action) => action.clientId === row.actionClientId)?.name}
                  </li>
                ))}
              </ul>
            )}
            <p>
              {detail.period} · {detail.location} · {detail.startTimeUtc} — {detail.endTimeUtc}
            </p>
            <ul>
              {detail.actions.map((action) => (
                <li key={action.clientId}>
                  {action.name} · {action.expectedPeople} người · {action.verificationMethod}
                </li>
              ))}
            </ul>
            <p>
              {detail.scoringStatus === 'DEFERRED_BY_PRODUCT_OWNER'
                ? 'Chưa tính điểm; không cấp XP khi duyệt.'
                : 'Xem chính sách nguồn trước khi xử lý điểm.'}
            </p>
            {detail.capabilities?.canReview && (
              <>
                <Field label="Lý do quyết định">
                  <textarea
                    value={reason}
                    maxLength={2000}
                    disabled={busy}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </Field>
                <div className="activity-lifecycle-actions">
                  <Button variant="primary" disabled={busy} onClick={() => review('APPROVED')}>
                    Duyệt kế hoạch
                  </Button>
                  <Button
                    disabled={busy || !reason.trim()}
                    onClick={() => review('REVISION_REQUESTED')}
                  >
                    Yêu cầu bổ sung
                  </Button>
                  <Button disabled={busy || !reason.trim()} onClick={() => review('REJECTED')}>
                    Từ chối
                  </Button>
                </div>
              </>
            )}
            <h4>Lịch sử hồ sơ</h4>
            <ul>
              {history.map((row, index) => (
                <li key={row.id || index}>
                  {row.status} · phiên bản {row.version} · {row.reason || ''}
                </li>
              ))}
            </ul>
            {detail.activityId && <ActivityRescheduleReview key={detail.activityId} activityId={detail.activityId} />}
            {detail.activityId && <ActivityClosingReportReview key={`report-${detail.activityId}`} activityId={detail.activityId} />}
            {detail.activityId && <ActivityXpSetup key={`xp-${detail.activityId}`} activityId={detail.activityId} semester={detail.period} />}
          </section>
        )}
        <Button disabled={busy} onClick={() => setRevision((x) => x + 1)}>
          Tải lại hồ sơ
        </Button>
      </div>
    </Panel>
  );
}
