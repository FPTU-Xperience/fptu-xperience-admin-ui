import { useEffect, useRef, useState } from 'react';
import api from '../../services/api.js';
import { Button, Field } from '../../components/ui/index.js';
import ClosingDutyXpReview from './ClosingDutyXpReview.jsx';

const date = (value) => new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
const roles = { PARTICIPANT: 'Người tham gia', STAFF: 'Staff', HOST: 'Host' };

function useClosingRequest(path) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(null);
  const lock = useRef(false);

  useEffect(() => {
    let active = true;
    api.request(path).then((value) => {
      if (active) setData(value);
    }).catch((issue) => {
      if (active) setError(issue.message);
    });
    return () => { active = false; };
  }, [path]);

  const save = async (route, method, body, apply) => {
    if (lock.current) return;
    const fingerprint = JSON.stringify([route, body]);
    if (request.current?.fingerprint !== fingerprint)
      request.current = { fingerprint, key: crypto.randomUUID() };
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const saved = await api.request(route, { method, body, headers: { 'Idempotency-Key': request.current.key } });
      setData((previous) => apply(previous, saved));
    } catch (issue) {
      setError(issue.message);
      if (issue.status === 409) {
        try { setData(await api.request(path)); } catch { /* Keep the write error visible. */ }
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return { data, busy, error, save };
}

export function ActivityClosingPolicy({ clubId }) {
  const path = `/api/activities/closing-policy/${clubId}`;
  const { data, busy, error, save } = useClosingRequest(path);
  return (
    <section className="activity-lifecycle-section">
      <h4>Hạn nộp báo cáo kết thúc</h4>
      {error && <p role="alert">{error}</p>}
      {data && (
        <form key={data.version} onSubmit={(event) => {
          event.preventDefault();
          const reportDays = Number(new FormData(event.currentTarget).get('days'));
          save(path, 'PUT', { reportDays, expectedVersion: data.version }, (_, saved) => saved);
        }}>
          <p>Campus {data.campusCode}. Bắt đầu tính từ 00:00 ngày sau khi hoạt động hoàn thành.</p>
          <Field label="Số ngày nộp báo cáo">
            <input name="days" type="number" min={1} max={365} step={1} required defaultValue={data.reportDays} disabled={busy} />
          </Field>
          <Button type="submit" disabled={busy}>Lưu hạn nộp</Button>
        </form>
      )}
    </section>
  );
}

export default function ActivityClosingReportReview({ activityId }) {
  const path = `/api/activities/${activityId}/closing-report`;
  const { data, busy, error, save } = useClosingRequest(path);
  const report = data?.report;
  return (
    <section className="activity-lifecycle-section">
      <h4>Báo cáo kết thúc</h4>
      {error && <p role="alert">{error}</p>}
      {data && !data.available && <p>Báo cáo mở sau khi hoạt động hoàn thành.</p>}
      {data?.available && (
        <>
          <p>Hạn nộp {date(data.deadlineUtc)}{data.isOverdue ? ' · Đã qua hạn' : ''}</p>
          <p>{data.totals.registrations} đăng ký · {data.totals.verifiedParticipants} người đã xác minh điểm danh · {data.totals.verifiedCompletions} lượt hoàn thành nhiệm vụ</p>
          {!report && <p>CLB chưa nộp báo cáo.</p>}
          <ConfirmedRoles key={report?.version || 'pending'} activityId={activityId} />
          {report?.status === 'APPROVED' && <ClosingDutyXpReview activityId={activityId} />}
          {report && (
            <>
              <p><strong>{report.status === 'APPROVED' ? 'Đã duyệt' : data.isOverdue ? 'Nộp quá hạn, không thể duyệt' : 'Chờ duyệt'}</strong> · Nộp {date(report.submittedAtUtc)}</p>
              <p>{report.summary}</p>
              {report.improvements && <p>{report.improvements}</p>}
              {report.reviewNote && <p>Ghi chú: {report.reviewNote}</p>}
            </>
          )}
          {data.canApprove && (
            <form key={report.version} onSubmit={(event) => {
              event.preventDefault();
              const note = String(new FormData(event.currentTarget).get('note') || '').trim();
              save(`${path}/approve`, 'POST', { expectedVersion: report.version, note },
                (previous, saved) => ({ ...previous, report: saved, canApprove: false }));
            }}>
              <Field label="Ghi chú duyệt báo cáo"><textarea name="note" maxLength={2000} disabled={busy} /></Field>
              <Button type="submit" disabled={busy}>Duyệt báo cáo kết thúc</Button>
            </form>
          )}
        </>
      )}
    </section>
  );
}

function ConfirmedRoles({ activityId }) {
  const [page, setPage] = useState(1);
  const { data, error } = useClosingRequest(`/api/activities/${activityId}/final-roles?page=${page}`);
  return (
    <div>
      <h5>Vai trò đã xác nhận</h5>
      {error && <p role="alert">{error}</p>}
      {data?.locked && <p>Kết quả đã khóa.</p>}
      {data?.available && !data.items.length && <p>Chưa có vai trò đã xác nhận.</p>}
      {data?.items.length > 0 && (
        <ul>{data.items.map((item) => <li key={item.userId}>{item.displayName} · {roles[item.role]}</li>)}</ul>
      )}
      {page > 1 && <Button onClick={() => setPage(page - 1)}>Trang trước</Button>}
      {data?.hasMore && <Button onClick={() => setPage(page + 1)}>Trang sau</Button>}
    </div>
  );
}
