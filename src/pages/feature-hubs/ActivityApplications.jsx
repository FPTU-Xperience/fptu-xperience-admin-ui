import { useEffect, useRef, useState } from 'react';
import api from '../../services/api.js';
import { createImplementedContracts } from '../../services/implemented-contracts.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button, Field, Panel } from '../../components/ui/index.js';
import { PageNavigation } from '../../components/operations/operation-state/OperationState.jsx';

const contracts = createImplementedContracts(api);
export default function ActivityApplications() {
  const { user } = useAuth();
  const [clubs, setClubs] = useState([]),
    [clubId, setClubId] = useState('');
  const [list, setList] = useState(null),
    [detail, setDetail] = useState(null),
    [history, setHistory] = useState([]);
  const [page, setPage] = useState(1),
    [revision, setRevision] = useState(0),
    [reason, setReason] = useState('');
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const ticket = useRef(0),
    lock = useRef(false),
    pending = useRef(null);
  useEffect(() => {
    let active = true;
    setClubs([]);
    setClubId('');
    api.clubs
      .list()
      .then((value) => {
        if (active) setClubs(Array.isArray(value) ? value : value.items || []);
      })
      .catch((issue) => {
        if (active) setError(issue.message);
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
    if (clubId)
      contracts.applications
        .list({ clubId, page, pageSize: 20 })
        .then((value) => {
          if (current === ticket.current) setList(value);
        })
        .catch((issue) => {
          if (current === ticket.current) setError(issue.message);
        });
    return () => {
      ticket.current++;
    };
  }, [clubId, page, revision, user?.id]);
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
    <Panel title="Hồ sơ hoạt động CLB · API">
      <Field label="Câu lạc bộ">
        <select
          value={clubId}
          disabled={busy}
          onChange={(e) => {
            setClubId(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Chọn CLB để tải hồ sơ</option>
          {clubs.map((club) => (
            <option key={club.id} value={club.id}>
              {club.name}
            </option>
          ))}
        </select>
      </Field>
      <p>Duyệt kế hoạch chỉ tạo hoạt động chưa công bố. Tính điểm và quyết toán đang tạm hoãn.</p>
      {error && <p role="alert">{error}</p>}
      {clubId && !list && !error && <p role="status">Đang tải hồ sơ…</p>}
      {list && (
        <>
          <ul>
            {list.items.map((row) => (
              <li key={row.id}>
                <Button disabled={busy} onClick={() => open(row.id)}>
                  {row.title || `Hồ sơ ${row.id}`} · {row.status}
                </Button>
              </li>
            ))}
          </ul>
          {!list.items.length && <p>Không có hồ sơ trong CLB này.</p>}
          <PageNavigation
            page={page}
            totalPages={Math.max(1, list.totalPages)}
            total={list.totalItems}
            onChange={setPage}
          />
        </>
      )}
      {detail && (
        <section>
          <h3>
            {detail.title} · {detail.status}
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
              <Button disabled={busy} onClick={() => review('APPROVED')}>
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
        </section>
      )}
      <Button disabled={busy || !clubId} onClick={() => setRevision((x) => x + 1)}>
        Tải lại hồ sơ
      </Button>
    </Panel>
  );
}
