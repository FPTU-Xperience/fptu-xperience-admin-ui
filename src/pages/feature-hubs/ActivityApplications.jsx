import { useEffect, useRef, useState } from 'react';
import { useListQuery, usePageBound } from '../../hooks/useListQuery.js';
import { useOperationQuery } from '../../hooks/useOperationQuery.js';
import api from '../../services/api.js';
import { createImplementedContracts } from '../../services/implemented-contracts.js';
import { getCampusFromUser, useAuth } from '../../context/AuthContext.jsx';
import { Button, Field, Panel } from '../../components/ui/index.js';
import {
  OperationState,
  PageNavigation,
} from '../../components/operations/operation-state/OperationState.jsx';
import { loadSubmittedApplications } from '../../workflows/activity-application-queue.js';
import ActivityRescheduleReview from './ActivityRescheduleReview.jsx';
import ActivityClosingReportReview, {
  ActivityClosingPolicy,
} from './ActivityClosingReportReview.jsx';
import CampusActivities from './CampusActivities.jsx';
import ActivityXpSetup from './ActivityXpSetup.jsx';
import './ActivityLifecycle.css';

const contracts = createImplementedContracts(api);
const pageSize = 20;
const statusLabels = {
  SUBMITTED: 'Chờ CTSV duyệt',
  REVISION_REQUESTED: 'Cần bổ sung',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Đã từ chối',
  DRAFT: 'Bản nháp',
};
const reviewMessages = {
  APPROVED: 'Đã duyệt kế hoạch hoạt động.',
  REVISION_REQUESTED: 'Đã gửi yêu cầu bổ sung hồ sơ.',
  REJECTED: 'Đã từ chối hồ sơ hoạt động.',
};

export default function ActivityApplications() {
  const { user } = useAuth();
  const campus = getCampusFromUser(user)?.trim().toUpperCase();
  const directory = useOperationQuery(
    async () => {
      if (!campus) throw new Error('Tài khoản CTSV chưa có thông tin cơ sở.');
      const value = await api.clubs.list({ active: true, campus });
      const rows = Array.isArray(value) ? value : value?.items;
      if (!Array.isArray(rows)) throw new Error('Danh sách CLB trả về không hợp lệ.');
      return rows.filter(
        (club) => club.isActive !== false && club.campusCode?.toUpperCase() === campus,
      );
    },
    JSON.stringify([user?.id, campus]),
  );
  const { clubId, status, page, setPage, setStatus, update } = useListQuery(
    { clubId: '', status: 'SUBMITTED', page: 1 },
    'applications_',
  );
  const clubs = directory.data ?? [];
  const selectedClub = clubs.find((club) => String(club.id) === clubId);
  const effectiveStatus = selectedClub && status === 'all' ? undefined : 'SUBMITTED';
  const [result, setResult] = useState(null),
    [detail, setDetail] = useState(null),
    [history, setHistory] = useState([]);
  const [revision, setRevision] = useState(0),
    [reason, setReason] = useState('');
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const listIdentity = JSON.stringify([
    user?.id,
    campus,
    clubId,
    effectiveStatus,
    clubId ? page : null,
    revision,
  ]);
  const listing = result?.identity === listIdentity && directory.data ? result : null;
  const list = listing?.list;
  const failedClubs = listing?.failedClubs ?? [];
  const offset = (page - 1) * pageSize;
  const visibleRows = clubId ? list?.items : list?.items.slice(offset, offset + pageSize);
  usePageBound(page, list?.totalPages, Boolean(list), setPage);
  const ticket = useRef(0),
    lock = useRef(false),
    pending = useRef(null);

  useEffect(() => {
    setResult(null);
    if (!directory.data || (clubId && !selectedClub)) return;
    let active = true;
    const load = async () => {
      if (clubId) {
        return {
          list: await contracts.applications.list({
            clubId,
            status: effectiveStatus,
            page,
            pageSize,
          }),
        };
      }
      const { items, failedClubs } = await loadSubmittedApplications(
        contracts.applications,
        directory.data,
        () => active,
      );
      return {
        list: { items, totalItems: items.length, totalPages: Math.ceil(items.length / pageSize) },
        failedClubs,
      };
    };
    load().then(
      (data) => {
        if (active) setResult({ identity: listIdentity, ...data });
      },
      (issue) => {
        if (active) setResult({ identity: listIdentity, error: issue.message });
      },
    );
    return () => {
      active = false;
    };
  }, [directory.data, listIdentity]);

  useEffect(() => {
    setDetail(null);
    setHistory([]);
    setError('');
    setReason('');
    pending.current = null;
    return () => {
      ticket.current++;
    };
  }, [listIdentity, page, directory.loading]);
  const open = async (id) => {
    const current = ++ticket.current;
    setError('');
    setConfirmation('');
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
      if (current === ticket.current) {
        setConfirmation(reviewMessages[decision]);
        setDetail(null);
        setHistory([]);
        setReason('');
        pending.current = null;
        if (clubId) {
          setRevision((value) => value + 1);
        } else {
          setResult((previous) => {
            if (previous?.identity !== listIdentity || !previous.list) return previous;
            const items = previous.list.items.filter((row) => row.id !== detail.id);
            return {
              ...previous,
              list: {
                items,
                totalItems: items.length,
                totalPages: Math.ceil(items.length / pageSize),
              },
            };
          });
        }
      }
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
    <Panel title="Hồ sơ hoạt động CLB">
      <div className="activity-lifecycle">
        <Field label="Câu lạc bộ">
          <select
            value={selectedClub ? clubId : ''}
            disabled={busy || !directory.data}
            onChange={(e) => update({ clubId: e.target.value, status: 'SUBMITTED' })}
          >
            <option value="">Tất cả CLB trong cơ sở</option>
            {clubs.map((club) => (
              <option key={club.id} value={club.id}>
                {club.name}
              </option>
            ))}
          </select>
        </Field>
        {selectedClub && (
          <Field label="Trạng thái hồ sơ">
            <select
              value={effectiveStatus ?? 'all'}
              disabled={busy}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="SUBMITTED">Chờ CTSV duyệt</option>
              <option value="all">Tất cả trạng thái</option>
            </select>
          </Field>
        )}
        <h3 className="font-semibold">
          {effectiveStatus ? 'Hồ sơ chờ CTSV duyệt' : 'Tất cả hồ sơ của CLB'}
        </h3>
        <OperationState
          loading={directory.loading}
          error={directory.error}
          onRetry={directory.retry}
        />
        {directory.data && clubId && !selectedClub && (
          <OperationState
            error="Câu lạc bộ đã chọn không có trong cơ sở của bạn."
            onRetry={() => update({ clubId: '', status: 'SUBMITTED' })}
          />
        )}
        {directory.data && (!clubId || selectedClub) && (
          <OperationState
            loading={!listing}
            error={listing?.error}
            onRetry={() => setRevision((value) => value + 1)}
          />
        )}
        {failedClubs.length > 0 && (
          <p role="alert">
            Không tải được đầy đủ hồ sơ của {failedClubs.map(({ name }) => name).join(', ')}.{' '}
            {failedClubs[0].error?.message}
          </p>
        )}
        {error && <p role="alert">{error}</p>}
        {confirmation && <p role="status">{confirmation}</p>}
        {list && (
          <>
            <ul>
              {visibleRows.map((row) => (
                <li key={row.id}>
                  <Button disabled={busy} onClick={() => open(row.id)}>
                    {row.title || `Hồ sơ ${row.id}`} · {statusLabels[row.status] || row.status}
                  </Button>
                  {!clubId && (
                    <span className="ml-2 text-sm">
                      {clubs.find((club) => club.id === row.clubId)?.name}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {!list.items.length && failedClubs.length === 0 && (
              <p role="status">
                {effectiveStatus
                  ? 'Không có hồ sơ chờ CTSV duyệt.'
                  : 'Không có hồ sơ trong CLB này.'}
              </p>
            )}
            <PageNavigation
              page={page}
              totalPages={Math.max(1, list.totalPages)}
              total={list.totalItems}
              onChange={setPage}
              disabled={busy}
            />
          </>
        )}
        {detail && (
          <section className="activity-lifecycle-section">
            <h3>
              {detail.title} · {statusLabels[detail.status] || detail.status}
            </h3>
            <p>{detail.description}</p>
            <p>Mục tiêu: {detail.objective}</p>
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
            {detail.activityId && (
              <ActivityRescheduleReview key={detail.activityId} activityId={detail.activityId} />
            )}
            {detail.activityId && (
              <ActivityClosingReportReview
                key={`report-${detail.activityId}`}
                activityId={detail.activityId}
              />
            )}
            {detail.activityId && (
              <ActivityXpSetup
                key={`xp-${detail.activityId}`}
                activityId={detail.activityId}
                semester={detail.period}
              />
            )}
          </section>
        )}
        <Button
          disabled={
            busy ||
            directory.loading ||
            (!!directory.data && !listing && (!clubId || !!selectedClub))
          }
          onClick={directory.retry}
        >
          Tải lại hồ sơ
        </Button>
        {selectedClub && <ActivityClosingPolicy key={clubId} clubId={clubId} />}
        <CampusActivities clubs={clubs} />
      </div>
    </Panel>
  );
}
