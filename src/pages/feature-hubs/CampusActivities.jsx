import { useEffect, useRef, useState } from 'react';
import api from '../../services/api.js';
import { Button, Field } from '../../components/ui/index.js';
import CertificateDefinitions from './CertificateDefinitions.jsx';
import CampusActivityOperations from './CampusActivityOperations.jsx';
import ActivityFinalRoles from './ActivityFinalRoles.jsx';
import ActivityClosingReportReview from './ActivityClosingReportReview.jsx';
import ActivityXpSetup from './ActivityXpSetup.jsx';
import ClosingDutyXpReview from './ClosingDutyXpReview.jsx';

const base = '/api/activities/campus';
const utc = (value) => new Date(`${value}:00+07:00`).toISOString();
const local = (value) => value ? new Date(Date.parse(value) + 7 * 3600000).toISOString().slice(0, 16) : '';
const offerLabels = { PENDING: 'Đang chờ', ACCEPTED: 'Đã chấp nhận', REJECTED: 'Đã từ chối' };

export default function CampusActivities({ clubs }) {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const lock = useRef(false);
  const pending = useRef(null);
  const row = rows.find((item) => item.id === selected);
  const reportPath = row && !row.clubId && row.status === 'Completed' ? `${base}/${row.id}/report` : null;

  useEffect(() => {
    let active = true;
    api.request(base).then((data) => { if (active) setRows(data); })
      .catch((issue) => { if (active) setError(issue.message); });
    return () => { active = false; };
  }, [revision]);

  useEffect(() => {
    let active = true;
    setReport(null);
    if (reportPath) api.request(reportPath).then((data) => { if (active) setReport(data.report); })
      .catch((issue) => { if (active) setError(issue.message); });
    return () => { active = false; };
  }, [reportPath]);

  const save = async (path, method, body, apply) => {
    if (lock.current) return;
    const fingerprint = JSON.stringify([path, method, body]);
    if (pending.current?.fingerprint !== fingerprint) pending.current = { fingerprint, key: crypto.randomUUID() };
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const saved = await api.request(path, { method, body, headers: { 'Idempotency-Key': pending.current.key } });
      apply(saved);
    } catch (issue) {
      setError(issue.message);
      if (issue.status === 409) setRevision((value) => value + 1);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const updateRow = (saved) => {
    setRows((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
    setSelected(saved.id);
  };
  const draft = row && !row.clubId && row.publicationStatus === 'DRAFT' && row.handover?.status !== 'PENDING';

  return (
    <section className="activity-lifecycle-section">
      <h3>Hoạt động do CTSV tạo</h3>
      {error && <p role="alert">{error}</p>}
      <Field label="Hoạt động">
        <select value={selected ?? ''} disabled={busy} onChange={(event) => setSelected(Number(event.target.value) || null)}>
          <option value="">Tạo hoạt động mới</option>
          {rows.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
      </Field>
      <Button type="button" disabled={busy} onClick={() => setRevision((value) => value + 1)}>Tải lại</Button>
      {(!row || (draft && !row.publishAtUtc)) && (
        <form className="activity-lifecycle-draft" key={row?.version || 'new'} onSubmit={(event) => {
          event.preventDefault();
          const f = new FormData(event.currentTarget);
          save(row ? `${base}/${row.id}` : base, row ? 'PUT' : 'POST', {
            title: f.get('title'), description: f.get('description'), location: f.get('location'),
            semesterId: f.get('semester'), startTimeUtc: utc(f.get('start')), endTimeUtc: utc(f.get('end')),
            capacity: f.get('capacity') ? Number(f.get('capacity')) : null, expectedVersion: row?.version,
          }, updateRow);
        }}>
          <Field label="Tên hoạt động"><input name="title" required maxLength={200} defaultValue={row?.title} /></Field>
          <Field label="Mô tả" className="activity-lifecycle-description"><textarea name="description" required maxLength={2000} defaultValue={row?.description} /></Field>
          <Field label="Địa điểm"><input name="location" required maxLength={200} defaultValue={row?.location} /></Field>
          <Field label="Mã học kỳ"><input name="semester" required maxLength={40} defaultValue={row?.semesterId} /></Field>
          <Field label="Bắt đầu (giờ Việt Nam)"><input name="start" type="datetime-local" required defaultValue={local(row?.startTimeUtc)} /></Field>
          <Field label="Kết thúc (giờ Việt Nam)"><input name="end" type="datetime-local" required defaultValue={local(row?.endTimeUtc)} /></Field>
          <Field label="Số chỗ"><input name="capacity" type="number" min={1} max={100000} defaultValue={row?.capacity ?? ''} /></Field>
          <Button type="submit" variant="primary" disabled={busy}>{row ? 'Lưu bản nháp' : 'Tạo bản nháp'}</Button>
        </form>
      )}
      {row?.handover && <p>Bàn giao cho {row.handover.clubName} · {offerLabels[row.handover.status]}</p>}
      {row && <CertificateDefinitions key={row.id} api={api} activityId={row.id} organization encode={(value) => value} />}
      {row && <ActivityXpSetup key={`xp-${row.id}`} activity={row} activityId={row.id} semester={row.semesterId} onSaved={updateRow} />}
      {row && !row.clubId && <CampusActivityOperations key={`operations-${row.id}`} api={api} activityId={row.id} encode={(value) => value} />}
      {row?.clubId > 0 && <ActivityClosingReportReview key={`club-report-${row.id}`} activityId={row.id} />}
      {reportPath && <ActivityFinalRoles key={`roles-${row.id}-${report?.version || 'pending'}`} api={api} activityId={row.id} />}
      {draft && (
        <>
          {!row.handover && !row.publishAtUtc && <form onSubmit={(event) => {
            event.preventDefault();
            const clubId = Number(new FormData(event.currentTarget).get('club'));
            save(`${base}/${row.id}/handover`, 'POST', { clubId, expectedVersion: row.version }, updateRow);
          }}>
            <Field label="CLB chủ trì"><select name="club" required>
              <option value="">Chọn CLB</option>
              {clubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}
            </select></Field>
            <Button type="submit" disabled={busy}>Gửi đề nghị bàn giao</Button>
          </form>}
          <form key={`publish-${row.version}`} onSubmit={(event) => {
            event.preventDefault();
            const f = new FormData(event.currentTarget);
            save(`${base}/${row.id}/publish`, 'POST', {
              expectedVersion: row.version, registrationOpensAt: utc(f.get('opens')), registrationClosesAt: utc(f.get('closes')),
              publishAtUtc: f.get('publishAt') ? utc(f.get('publishAt')) : null,
            }, updateRow);
          }}>
            <Field label="Hẹn công khai (giờ Việt Nam, tùy chọn)"><input name="publishAt" type="datetime-local" defaultValue={local(row.publishAtUtc)} /></Field>
            <Field label="Mở đăng ký (giờ Việt Nam)"><input name="opens" type="datetime-local" required defaultValue={local(row.registrationOpensAt)} /></Field>
            <Field label="Đóng đăng ký (giờ Việt Nam)"><input name="closes" type="datetime-local" required defaultValue={local(row.registrationClosesAt)} /></Field>
            <Button type="submit" disabled={busy}>Lưu mốc công khai</Button>
          </form>
          {row.publishAtUtc && <Button type="button" disabled={busy} onClick={() =>
            save(`${base}/${row.id}/cancel-publication`, 'POST', { expectedVersion: row.version }, updateRow)}>Hủy lịch công khai</Button>}
        </>
      )}
      {reportPath && (
        <section className="activity-lifecycle-section">
          <h4>Báo cáo kết thúc</h4>
          {report ? <p>{report.summary} · {report.status === 'FINALIZED' ? 'Đã chốt' : 'Bản nháp'}</p> : (
            <form onSubmit={(event) => {
              event.preventDefault();
              save(reportPath, 'POST', { summary: new FormData(event.currentTarget).get('summary') }, setReport);
            }}>
              <Field label="Tổng kết"><textarea name="summary" maxLength={4000} required /></Field>
              <Button type="submit" disabled={busy}>Tạo báo cáo kết thúc</Button>
            </form>
          )}
          {report?.status === 'DRAFT' && <Button type="button" disabled={busy}
            onClick={() => save(`${reportPath}/finalize`, 'POST', { expectedVersion: report.version }, setReport)}>Chốt báo cáo kết thúc</Button>}
          {report?.status === 'FINALIZED' && <ClosingDutyXpReview activityId={row.id} />}
        </section>
      )}
    </section>
  );
}
