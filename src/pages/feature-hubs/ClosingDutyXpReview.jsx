import { useEffect, useRef, useState } from 'react';
import api from '../../services/api.js';
import { Button, Field } from '../../components/ui/index.js';

const roles = { Participant: 'Người tham gia', Contributor: 'Người đóng góp', Product: 'Người tạo sản phẩm', Organizer: 'Người tổ chức', Leader: 'Người dẫn dắt' };
const states = { SUBMITTED: 'Chờ xét XP', APPROVED: 'Đã ghi XP', REJECTED: 'Đã từ chối', INVALIDATED: 'Không còn hiệu lực', REVOKED: 'Đã thu hồi' };

export default function ClosingDutyXpReview({ activityId }) {
  const path = `/api/activities/${activityId}/contributions/closing-duties`;
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const lock = useRef(false);
  const pending = useRef(null);
  useEffect(() => {
    let active = true;
    api.request(path).then((value) => { if (active) setRows(value); })
      .catch((issue) => { if (active) setError(issue.message); });
    return () => { active = false; };
  }, [path, revision]);
  const review = async (event, row) => {
    event.preventDefault();
    if (lock.current) return;
    const fields = new FormData(event.currentTarget);
    const decision = event.nativeEvent.submitter?.value || 'APPROVE';
    const body = { expectedVersion: row.version, decision, role: fields.get('role'), reason: fields.get('reason') };
    const fingerprint = JSON.stringify([row.id, body]);
    if (pending.current?.fingerprint !== fingerprint) pending.current = { fingerprint, key: crypto.randomUUID() };
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const saved = await api.request(`${path}/${row.id}/review`, {
        method: 'POST', body, headers: { 'Idempotency-Key': pending.current.key },
      });
      setRows((current) => current.map((item) => item.id === saved.id ? { ...item, ...saved } : item));
    } catch (issue) {
      setError(issue.message);
      if (issue.status === 409) setRevision((value) => value + 1);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <section className="activity-lifecycle-section">
      <h4>Xét XP Staff và Host</h4>
      <Button type="button" disabled={busy} onClick={() => setRevision((value) => value + 1)}>Tải lại hồ sơ XP</Button>
      {error && <p role="alert">{error}</p>}
      {rows?.length === 0 && <p>Chưa có nhiệm vụ đủ điều kiện trong hàng đợi XP.</p>}
      {rows?.map((row) => <div key={row.id}>
        <p>#{row.userId} · {row.role} · {states[row.status] || row.status}{row.status === 'APPROVED' ? ` · ${row.rawPoints} XP` : ''}</p>
        {row.status === 'SUBMITTED' && <form key={row.version} onSubmit={(event) => review(event, row)}>
          <Field label="Vai trò theo chính sách XP"><select name="role" defaultValue={row.role === 'HOST' ? 'Organizer' : 'Contributor'}>
            {Object.entries(roles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></Field>
          <Field label="Lý do quyết định"><textarea name="reason" required maxLength={1000} /></Field>
          <Button type="submit" value="APPROVE" disabled={busy}>Duyệt XP</Button>
          <Button type="submit" value="REJECT" disabled={busy}>Từ chối XP</Button>
        </form>}
      </div>)}
    </section>
  );
}
