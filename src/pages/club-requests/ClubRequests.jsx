import './ClubRequests.css';
import '../../components/operations/Operations.css';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import { useOperationQuery } from '../../hooks/useOperationQuery.js';
import api from '../../services/api.js';
import { clubRequestBody, clubRequestRows } from '../../utils/club-request-workflow.js';
import { date, normalize } from '../../utils/format.js';
import { Badge, Button, Field, Modal, PageHeader, Panel } from '../../components/ui/index.js';
import {
  OperationState,
  PageNavigation,
} from '../../components/operations/operation-state/OperationState.jsx';

const titles = { disband: 'Giải thể câu lạc bộ', transfer: 'Chuyển chủ nhiệm' };
const states = { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối' };
export function ClubRequests() {
  const { user } = useAuth();
  const { notify } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const kind = params.get('type') === 'transfer' ? 'transfer' : 'disband';
  const service = kind === 'disband' ? api.clubs.disbandRequests : api.clubs.transferRequests;
  const result = useOperationQuery(
    async () => clubRequestRows(await service.list()),
    `${user?.id}:${kind}`,
  );
  const [query, setQuery] = useState(''),
    [status, setStatus] = useState('PENDING'),
    [page, setPage] = useState(1);
  const [review, setReview] = useState(null),
    [decision, setDecision] = useState(''),
    [note, setNote] = useState('');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const lock = useRef(false),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const rows = (result.data || []).filter(
    (row) =>
      (!status || row.status.toUpperCase() === status) &&
      normalize(
        `${row.clubName} ${row.id} ${row.requesterName || ''} ${row.currentOwnerName || ''} ${row.newOwnerName || ''}`,
      ).includes(normalize(query)),
  );
  const totalPages = Math.max(1, Math.ceil(rows.length / 20)),
    currentPage = Math.min(page, totalPages);
  const choose = (value) => {
    setParams({ type: value });
    setPage(1);
    setReview(null);
    setQuery('');
    setError('');
  };
  const submit = async (event) => {
    event.preventDefault();
    if (lock.current || !user.roles.includes('STUDENT_AFFAIRS_ADMIN')) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const body = clubRequestBody(review, note);
      const latest = clubRequestRows(await service.list()).find((row) => row.id === review.id);
      if (!latest || latest.status.toUpperCase() !== 'PENDING')
        throw new Error('Hồ sơ đã thay đổi. Đóng hộp thoại và tải lại danh sách.');
      const saved = await service[decision](review.id, body);
      if (
        saved?.id !== review.id ||
        saved.status?.toUpperCase() !== (decision === 'approve' ? 'APPROVED' : 'REJECTED')
      )
        throw new Error('Chưa xác nhận được kết quả. Tải lại trước khi xử lý tiếp.');
      if (!alive.current) return;
      notify(decision === 'approve' ? 'Đã phê duyệt hồ sơ CLB.' : 'Đã từ chối hồ sơ CLB.');
      setReview(null);
      setDecision('');
      setNote('');
      result.retry();
    } catch (issue) {
      if (alive.current) setError(issue.message);
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  };
  return (
    <>
      <PageHeader
        title="Hồ sơ quản trị câu lạc bộ"
        description="Tiếp nhận đề nghị giải thể và chuyển chủ nhiệm từ các câu lạc bộ."
      >
        <Button icon={RefreshCw} onClick={result.retry}>
          Tải lại
        </Button>
      </PageHeader>
      <div className="club-requests-content" role="group" aria-label="Loại hồ sơ quản trị CLB">
        {Object.entries(titles).map(([value, label]) => (
          <Button
            key={value}
            aria-pressed={kind === value}
            variant={kind === value ? 'primary' : 'secondary'}
            onClick={() => choose(value)}
          >
            {label}
          </Button>
        ))}
        <Link className="operation-link" to="/ctsv/leadership">
          Kế nhiệm khẩn cấp
        </Link>
      </div>
      <Panel>
        <div className="club-requests-content-2">
          <Field label="Tìm CLB hoặc người đề nghị">
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
            />
          </Field>
          <Field label="Trạng thái">
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả</option>
              {Object.entries(states).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <OperationState {...result} empty={!rows.length} onRetry={result.retry}>
          <ul className="club-requests-list">
            {rows.slice((currentPage - 1) * 20, currentPage * 20).map((row) => (
              <li key={row.id} className="operation-report-row">
                <div className="club-requests-content-3">
                  <h2>{row.clubName}</h2>
                  <p className="club-requests-description">
                    #{row.id} · {date(row.requestedAtUtc)}
                  </p>
                  <p className="club-requests-description-2">
                    {kind === 'transfer'
                      ? `${row.currentOwnerName} → ${row.newOwnerName}`
                      : `Người đề nghị: ${row.requesterName}`}
                  </p>
                </div>
                <div className="club-requests-content-4">
                  <Badge>{states[row.status.toUpperCase()] || row.status}</Badge>
                  <Button
                    onClick={() => {
                      setReview(row);
                      setDecision('');
                      setNote('');
                      setError('');
                    }}
                  >
                    Đọc hồ sơ
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </OperationState>
        {result.data && (
          <PageNavigation
            page={currentPage}
            totalPages={totalPages}
            total={rows.length}
            onChange={setPage}
          />
        )}
      </Panel>
      {review && (
        <Modal
          title={`${titles[kind]} · ${review.clubName}`}
          onClose={() => {
            if (!busy) setReview(null);
          }}
        >
          <form onSubmit={submit} className="club-requests-form">
            <div>
              <h3>Lý do đề nghị</h3>
              <p className="club-requests-description-3">
                {review.reason || 'Không có nội dung bổ sung.'}
              </p>
            </div>
            {kind === 'transfer' && (
              <p>
                Chủ nhiệm hiện tại: {review.currentOwnerName}
                <br />
                Người được đề nghị: {review.newOwnerName}
              </p>
            )}
            {review.adminNote && (
              <div>
                <h3>Nhận xét đã lưu</h3>
                <p>{review.adminNote}</p>
                <p className="club-requests-description">{date(review.reviewedAtUtc)}</p>
              </div>
            )}
            {review.status.toUpperCase() === 'PENDING' &&
            user.roles.includes('STUDENT_AFFAIRS_ADMIN') ? (
              <>
                <Field label="Quyết định">
                  <select
                    required
                    disabled={busy}
                    value={decision}
                    onChange={(event) => setDecision(event.target.value)}
                  >
                    <option value="">Chọn quyết định</option>
                    <option value="approve">Phê duyệt</option>
                    <option value="reject">Từ chối</option>
                  </select>
                </Field>
                {decision === 'approve' && (
                  <p className="operation-notice">
                    {kind === 'disband'
                      ? 'Phê duyệt sẽ giải thể CLB và ngừng trạng thái hoạt động hiện tại. Hồ sơ lịch sử được giữ lại.'
                      : 'Phê duyệt sẽ kết thúc phân công chủ nhiệm hiện tại và chuyển quyền cho người được đề nghị.'}
                  </p>
                )}
                <Field label="Nhận xét *">
                  <textarea
                    required
                    maxLength={1000}
                    rows={4}
                    disabled={busy}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                  />
                </Field>
                {error && <p role="alert">{error}</p>}
                <div className="club-requests-content-5">
                  <Button type="button" disabled={busy} onClick={() => setReview(null)}>
                    Đóng
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    busy={busy}
                    disabled={!decision || !note.trim()}
                  >
                    Xác nhận quyết định
                  </Button>
                </div>
              </>
            ) : (
              <p className="club-requests-description">
                {review.status.toUpperCase() === 'PENDING'
                  ? 'Tài khoản chỉ có quyền xem. Cần vai trò CTSV để xét duyệt.'
                  : 'Hồ sơ đã được xử lý.'}
              </p>
            )}
          </form>
        </Modal>
      )}
    </>
  );
}
