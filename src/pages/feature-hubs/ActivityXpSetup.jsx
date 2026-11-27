import { useEffect, useRef, useState } from 'react';
import api from '../../services/api.js';
import { Button, Field } from '../../components/ui/index.js';

const pillars = { Academic: 'Học thuật', Research: 'Nghiên cứu', Global: 'Quốc tế', CultureSports: 'Văn hóa và thể thao', Community: 'Cộng đồng', Entrepreneurship: 'Khởi nghiệp' };

export default function ActivityXpSetup({ activityId, semester, activity, onSaved }) {
  const [row, setRow] = useState(activity || null);
  const [policies, setPolicies] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const pending = useRef(null);
  const activityType = row?.tagSelection?.activityType;
  useEffect(() => {
    if (activity) { setRow(activity); return; }
    let active = true;
    api.request(`/api/activities/${activityId}`).then((value) => { if (active) setRow(value); })
      .catch((issue) => { if (active) setError(issue.message); });
    return () => { active = false; };
  }, [activity, activityId]);
  useEffect(() => {
    if (!semester) return;
    let active = true;
    api.request(`/api/v1/semesters/${encodeURIComponent(semester)}/approved-experience-policies`)
      .then((value) => {
        if (!Array.isArray(value?.items)) throw new Error('Danh sách chính sách không hợp lệ.');
        if (active) setPolicies(value.items);
      })
      .catch((issue) => { if (active) setError(issue.message); });
    return () => { active = false; };
  }, [semester]);

  const save = async (event) => {
    event.preventDefault();
    if (lock.current || !row?.version) return;
    const fields = new FormData(event.currentTarget);
    const body = {
      expectedVersion: row.version, policyVersion: fields.get('policy'), tier: fields.get('tier'),
      ...(activityType ? {} : { pillarWeights: [{ pillar: fields.get('pillar'), weight: 1 }] }),
    };
    const fingerprint = JSON.stringify(body);
    if (pending.current?.fingerprint !== fingerprint) pending.current = { fingerprint, key: crypto.randomUUID() };
    lock.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const saved = await api.request(`/api/activities/campus/${activityId}/xp-policy`, {
        method: 'PUT', body, headers: { 'Idempotency-Key': pending.current.key },
      });
      setRow(saved);
      onSaved?.(saved);
      setNotice('Đã lưu nguồn tính điểm XP.');
    } catch (issue) {
      setError(issue.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  if (row && (row.fundingReservationId || row.isPublished === true || row.publishAtUtc || (row.publicationStatus && row.publicationStatus !== 'DRAFT'))) return null;
  return (
    <section className="activity-lifecycle-section">
      <h4>Nguồn tính điểm XP</h4>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {row && <form key={row.version} onSubmit={save}>
        <Field label="Chính sách XP đã duyệt">
          <select name="policy" defaultValue={row.policyVersion || ''} required disabled={busy}>
            <option value="">Chọn chính sách có hiệu lực</option>{policies.map(policy => <option key={policy.policyVersion} value={policy.policyVersion}>{policy.semesterId} · Phê duyệt {new Date(policy.approvedAt).toLocaleString('vi-VN')}</option>)}
          </select>
        </Field>
        <Field label="Mức độ nỗ lực"><select name="tier" defaultValue={row.effortTier || 'T1'}>
          {['T1', 'T2', 'T3', 'T4', 'T5'].map((tier) => <option key={tier}>{tier}</option>)}
        </select></Field>
        <Field label="Trụ cột XP">{activityType ? (
          <input value={pillars[activityType] || activityType} readOnly />
        ) : <select name="pillar" required defaultValue="">
          <option value="">Chọn trụ cột</option>
          {Object.entries(pillars).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>}</Field>
        <Button type="submit" disabled={busy}>Lưu nguồn XP</Button>
      </form>}
    </section>
  );
}
