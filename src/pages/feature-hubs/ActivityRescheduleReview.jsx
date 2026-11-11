import { useEffect, useRef, useState } from 'react';
import api from '../../services/api.js';
import { Button, Field } from '../../components/ui/index.js';

const status = { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Đã từ chối', EXPIRED: 'Quá hạn' };
const date = (value) => new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

export default function ActivityRescheduleReview({ activityId }) {
  const path = `/api/activities/${activityId}/reschedule-requests`;
  const [data, setData] = useState(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const pending = useRef(null);
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    api.request(path).then((value) => {
      if (active) setData(value);
    }).catch((issue) => {
      if (active) setError(issue.message);
    });
    return () => { active = false; };
  }, [path, revision]);

  const review = async (item, decision) => {
    if (lock.current) return;
    const body = { expectedVersion: item.version, decision, note: note.trim() };
    const fingerprint = JSON.stringify([item.id, body]);
    if (pending.current?.fingerprint !== fingerprint)
      pending.current = { fingerprint, key: crypto.randomUUID() };
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const saved = await api.request(`${path}/${item.id}/review`, {
        method: 'POST', body, headers: { 'Idempotency-Key': pending.current.key },
      });
      setData((current) => ({
        ...current, items: current.items.map((row) => row.id === saved.id ? saved : row),
      }));
      setNote('');
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
      <h4>Yêu cầu dời lịch</h4>
      {error && <p role="alert">{error}</p>}
      {data?.items.length === 0 && <p>Chưa có yêu cầu dời lịch.</p>}
      {data?.items.map((item) => (
        <div key={item.id}>
          <p><strong>{status[item.status] || item.status}</strong> · Hạn duyệt {date(item.reviewDeadlineUtc)}</p>
          <p>Lịch hiện tại {date(item.originalStartTimeUtc)} – {date(item.originalEndTimeUtc)}</p>
          <p>Lịch đề xuất {date(item.startTimeUtc)} – {date(item.endTimeUtc)}</p>
          <p>Lý do: {item.reason}</p>
          {item.reviewNote && <p>Ghi chú CTSV: {item.reviewNote}</p>}
          {data.canReview && item.status === 'PENDING' && (
            <>
              <Field label="Ghi chú quyết định">
                <textarea value={note} maxLength={2000} disabled={busy} onChange={(event) => setNote(event.target.value)} />
              </Field>
              <Button disabled={busy} onClick={() => review(item, 'APPROVED')}>Duyệt dời lịch</Button>
              <Button disabled={busy} onClick={() => review(item, 'REJECTED')}>Từ chối dời lịch</Button>
            </>
          )}
        </div>
      ))}
    </section>
  );
}
