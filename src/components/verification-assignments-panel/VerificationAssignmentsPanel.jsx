import './VerificationAssignmentsPanel.css';
import { useEffect, useRef, useState } from 'react';
import api, { workflowRequest } from '../../services/api.js';
import { Button, Field, Panel } from '../ui/index.js';

const blank = {
  userId: '',
  sourceType: 'CLUB',
  clubId: '',
  capabilities: [],
  startsAt: '',
  expiresAt: '',
  reason: '',
};
const capabilities = {
  'contribution.review': 'Duyệt đóng góp',
  'attendance.verify': 'Xác minh điểm danh',
  'experience.adjust': 'Điều chỉnh trải nghiệm',
};
const utc = (value) => (value ? new Date(`${value}:00+07:00`).toISOString() : null);

export default function VerificationAssignmentsPanel() {
  const [rows, setRows] = useState(null),
    [clubs, setClubs] = useState([]),
    [users, setUsers] = useState([]);
  const [search, setSearch] = useState(''),
    [draft, setDraft] = useState(blank),
    [reason, setReason] = useState(''),
    [expiry, setExpiry] = useState('');
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [attempt, retry] = useState(0);
  const lock = useRef(false),
    searchVersion = useRef(0);
  useEffect(() => {
    let active = true;
    setRows(null);
    setError('');
    Promise.all([api.get('/api/verification-assignments'), api.clubs.list()]).then(
      ([grants, catalog]) => {
        if (active) {
          setRows(grants);
          setClubs(Array.isArray(catalog) ? catalog : catalog.items || []);
        }
      },
      (issue) => {
        if (active) setError(issue.message);
      },
    );
    return () => {
      active = false;
      searchVersion.current++;
    };
  }, [attempt]);
  const change = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const run = async (path, method, body) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await workflowRequest(path, method, body);
      setDraft(blank);
      retry((value) => value + 1);
    } catch (issue) {
      setError(issue.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <Panel
      title="Phân công người xác minh"
      description="Quyền xác minh có phạm vi và thời hạn riêng; chức danh CLB không tự cấp quyền này."
    >
      <div className="verification-assignments-panel-content">
        {error && <p role="alert">{error}</p>}
        <Button onClick={() => retry((value) => value + 1)} disabled={busy}>
          Tải lại
        </Button>
        {!rows && !error && <p role="status">Đang tải phân công…</p>}
        <div className="verification-assignments-panel-content-2">
          <Field label="Tìm tài khoản theo tên hoặc email">
            <input value={search} onChange={(event) => setSearch(event.target.value)} />
          </Field>
          <Button
            onClick={async () => {
              const ticket = ++searchVersion.current;
              try {
                const result = await api.users.list({ search, page: 1, pageSize: 50 });
                if (ticket === searchVersion.current) {
                  setUsers(result.items || []);
                  change('userId', '');
                }
              } catch (issue) {
                if (ticket === searchVersion.current) setError(issue.message);
              }
            }}
          >
            Tìm tài khoản
          </Button>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            try {
              run('/api/verification-assignments', 'POST', {
                ...draft,
                userId: Number(draft.userId),
                clubId: draft.sourceType === 'CLUB' ? Number(draft.clubId) : null,
                startsAt: utc(draft.startsAt),
                expiresAt: utc(draft.expiresAt),
              });
            } catch (issue) {
              setError(issue.message);
            }
          }}
        >
          <fieldset disabled={busy} className="verification-assignments-panel-fieldset">
            <Field label="Tài khoản (kết quả tìm kiếm, tối đa 50; thu hẹp từ khóa nếu cần)">
              <select
                required
                value={draft.userId}
                onChange={(event) => change('userId', event.target.value)}
              >
                <option value="">Chọn tài khoản</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.fullName} · {user.email}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Phạm vi nguồn">
              <select
                value={draft.sourceType}
                onChange={(event) => change('sourceType', event.target.value)}
              >
                <option value="CLUB">CLB</option>
                <option value="EXTERNAL">Trải nghiệm ngoài CLB</option>
                <option value="REAL_WORLD">Thực chiến</option>
              </select>
            </Field>
            {draft.sourceType === 'CLUB' && (
              <Field label="CLB">
                <select
                  required
                  value={draft.clubId}
                  onChange={(event) => change('clubId', event.target.value)}
                >
                  <option value="">Chọn CLB</option>
                  {clubs.map((club) => (
                    <option key={club.id} value={club.id}>
                      {club.name} · {club.code}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Hiệu lực từ (giờ Việt Nam)">
              <input
                type="datetime-local"
                required
                value={draft.startsAt}
                onChange={(event) => change('startsAt', event.target.value)}
              />
            </Field>
            <Field label="Hết hạn (để trống nếu chưa đặt)">
              <input
                type="datetime-local"
                value={draft.expiresAt}
                onChange={(event) => change('expiresAt', event.target.value)}
              />
            </Field>
            <div>
              {Object.entries(capabilities).map(([key, label]) => (
                <label key={key} className="verification-assignments-panel-field">
                  <input
                    type="checkbox"
                    checked={draft.capabilities.includes(key)}
                    onChange={(event) =>
                      change(
                        'capabilities',
                        event.target.checked
                          ? [...draft.capabilities, key]
                          : draft.capabilities.filter((item) => item !== key),
                      )
                    }
                  />{' '}
                  {label}
                </label>
              ))}
            </div>
            <Field label="Cơ sở phân công">
              <textarea
                required
                maxLength={1000}
                value={draft.reason}
                onChange={(event) => change('reason', event.target.value)}
              />
            </Field>
            <Button type="submit" disabled={!draft.capabilities.length} busy={busy}>
              Lưu phân công
            </Button>
          </fieldset>
        </form>
        <h3>Phân công đã lưu</h3>
        <Field label="Lý do điều chỉnh / thu hồi">
          <input
            maxLength={1000}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </Field>
        <Field label="Hạn mới (để trống giữ hạn hiện tại)">
          <input
            type="datetime-local"
            value={expiry}
            onChange={(event) => setExpiry(event.target.value)}
          />
        </Field>
        {rows?.map((row) => (
          <article key={row.id} className="verification-assignments-panel-card">
            <p>
              Tài khoản #{row.userId} · {row.sourceType}
              {row.clubId ? ` · CLB #${row.clubId}` : ''} ·{' '}
              {row.isRevoked ? 'Đã thu hồi' : 'Có hiệu lực theo thời hạn'}
            </p>
            <p>
              {row.startsAt} → {row.expiresAt || 'Chưa đặt hạn'}
            </p>
            <p>{row.reason}</p>
            <Button
              disabled={busy || !reason.trim()}
              onClick={() =>
                run(`/api/verification-assignments/${row.id}`, 'PATCH', {
                  expectedVersion: row.version,
                  isRevoked: !row.isRevoked,
                  reason,
                  ...(expiry ? { expiresAt: utc(expiry) } : {}),
                })
              }
            >
              {row.isRevoked ? 'Khôi phục phân công' : 'Thu hồi phân công'}
            </Button>
            <Button
              disabled={busy || !reason.trim() || !expiry}
              onClick={() =>
                run(`/api/verification-assignments/${row.id}`, 'PATCH', {
                  expectedVersion: row.version,
                  isRevoked: row.isRevoked,
                  reason,
                  expiresAt: utc(expiry),
                })
              }
            >
              Đổi hạn
            </Button>
          </article>
        ))}
      </div>
    </Panel>
  );
}
