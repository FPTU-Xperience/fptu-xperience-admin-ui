import { useEffect, useRef, useState } from 'react';
import api from '../../services/api.js';
import './RawFundingPanel.css';

const amount = value => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 4 }).format(value);
const states = { RESERVED: 'Đã giữ quỹ', SETTLED: 'Đã quyết toán', REFUNDED: 'Đã hoàn quỹ' };
const kinds = { GRANT: 'Cấp quỹ', RESERVE: 'Giữ quỹ', AWARD: 'Ghi điểm', SETTLE: 'Quyết toán', REFUND: 'Hoàn quỹ', REVERSAL: 'Đảo điểm', BUDGET_INCREASE: 'Bổ sung phân bổ' };

export default function RawFundingPanel({ clubId, campus }) {
  const [semesters, setSemesters] = useState([]);
  const [semester, setSemester] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [detail, setDetail] = useState(null);
  const [selected, setSelected] = useState('');
  const [decisions, setDecisions] = useState({});
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const lock = useRef(false);
  const pending = useRef(null);
  useEffect(() => {
    let active = true;
    api.request('/api/v1/semesters').then(rows => {
      if (!Array.isArray(rows)) throw new Error('Danh sách học kỳ không hợp lệ.');
      if (active) { setSemesters(rows); setSemester(rows.find(x => x.isActive)?.semesterCode ?? rows[0]?.semesterCode ?? ''); }
    }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [clubId]);
  useEffect(() => {
    let active = true;
    setData(null); setError('');
    if (semester) api.request(`/api/v1/raw-funding/${clubId}?${new URLSearchParams({ semesterId: semester, page, ...(campus ? { campus } : {}) })}`)
      .then(value => {
        if (value?.unit !== 'RAW_POINTS' || !Array.isArray(value.entries) || !Array.isArray(value.reservations)) throw new Error('Phản hồi quỹ điểm không hợp lệ.');
        if (active) setData(value);
      }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [clubId, campus, semester, page, revision]);
  useEffect(() => {
    let active = true;
    setDetail(null); setDecisions({}); setReason('');
    if (selected) api.request(`/api/v1/raw-funding/reservations/${encodeURIComponent(selected)}`).then(value => {
      if (!Array.isArray(value?.candidates) || value.id !== selected) throw new Error('Hồ sơ quyết toán không hợp lệ.');
      if (active) setDetail(value);
    }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [selected, revision]);
  const mutate = async (path, body) => {
    if (lock.current) return;
    const fingerprint = JSON.stringify([path, body]);
    if (pending.current?.fingerprint !== fingerprint) pending.current = { fingerprint, key: crypto.randomUUID() };
    lock.current = true; setBusy(true); setError('');
    try {
      await api.request(path, { method: 'POST', body, headers: { 'Idempotency-Key': pending.current.key } });
      pending.current = null; setRevision(x => x + 1);
    } catch (e) { setError(e.message); if (e.status === 409) setRevision(x => x + 1); }
    finally { lock.current = false; setBusy(false); }
  };
  const candidates = detail?.candidates.filter(x => ['SUBMITTED', 'REVISION_REQUESTED'].includes(x.status)) ?? [];
  const complete = candidates.every(x => decisions[x.id]?.decision && (decisions[x.id].decision === 'REJECT' || x.sourceType !== 'CLOSING_DUTY' || decisions[x.id].role));
  const decide = (id, value) => setDecisions(current => ({ ...current, [id]: { ...current[id], ...value } }));
  return <section className="raw-funding-panel" aria-label="Quỹ điểm thô">
    <h3>Quỹ điểm thô theo học kỳ</h3>
    <label>Học kỳ <select value={semester} disabled={busy} onChange={e => { setSemester(e.target.value); setPage(1); setSelected(''); }}>
      <option value="">Chọn học kỳ</option>{semesters.map(x => <option key={x.id} value={x.semesterCode}>{x.semesterCode}</option>)}
    </select></label>
    {error && <p role="alert">{error} <button type="button" disabled={busy} onClick={() => setRevision(x => x + 1)}>Tải lại</button></p>}
    {semester && !data && !error && <p role="status">Đang tải quỹ điểm…</p>}
    {data && <>
      <dl className="raw-funding-balances">{[['granted', 'Đã cấp'], ['available', 'Khả dụng'], ['reserved', 'Đang giữ'], ['spent', 'Đã ghi điểm']].map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{amount(data[key])} điểm thô</dd></div>)}</dl>
      {data.capabilities.canGrant && <form onSubmit={e => {
        e.preventDefault(); const fields = new FormData(e.currentTarget);
        mutate(`/api/v1/raw-funding/${clubId}/grants`, { semesterId: semester, campus: data.campus, expectedVersion: data.version, amount: Number(fields.get('amount')), reason: fields.get('reason').trim() });
      }}>
        <h4>Cấp thêm quỹ học kỳ</h4>
        <label>Điểm thô <input name="amount" type="number" min="0.0001" max="1000000000" step="0.0001" required disabled={busy} /></label>
        <label>Lý do <textarea name="reason" minLength={5} maxLength={1000} required disabled={busy} /></label>
        <button disabled={busy}>Cấp quỹ</button>
      </form>}
      <h4>Phân bổ cho hoạt động</h4>
      {!data.reservations.length && <p>Chưa có phân bổ trong trang này.</p>}
      <div className="raw-funding-scroll"><table><thead><tr><th>Hoạt động</th><th>Dự toán</th><th>Đã dùng</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{data.reservations.map(x => <tr key={x.id}>
        <td>{x.activityId ? `Hoạt động #${x.activityId}` : 'Chờ hoàn tất duyệt mở'}</td><td>{amount(x.budget)}</td><td>{amount(x.spent)}</td><td>{states[x.status] ?? x.status}</td>
        <td><button type="button" disabled={busy} onClick={() => setSelected(x.id)}>Xem và xử lý</button></td>
      </tr>)}</tbody></table></div>
      {selected && <section aria-label="Hồ sơ quyết toán">
        <button type="button" disabled={busy} onClick={() => setSelected('')}>Đóng hồ sơ</button>
        {!detail ? <p role="status">Đang tải hồ sơ…</p> : <>
          <h4>Quyết toán {detail.activityId ? `hoạt động #${detail.activityId}` : 'phân bổ đang chờ'}</h4>
          <p>Dự toán {amount(detail.budget)} điểm thô · {states[detail.status] ?? detail.status}</p>
          {!detail.closingApproved && <p>Chờ báo cáo đóng được duyệt.</p>}
          {detail.pendingCandidateMessages > 0 && <p role="status">Còn {detail.pendingCandidateMessages} kết quả đang đồng bộ. Chưa thể quyết toán.</p>}
          <div className="raw-funding-candidates">{candidates.map(x => <fieldset key={x.id} disabled={busy || !detail.canSettle}>
            <legend>{x.studentName || `Sinh viên #${x.userId}`}</legend><p>{x.studentEmail} · {x.sourceType === 'CLOSING_DUTY' ? 'Đóng góp tổ chức' : 'Tham gia hoạt động'}</p>
            {!x.eligible && <p>Không thuộc kết quả đủ điều kiện của báo cáo đóng. Chỉ có thể từ chối.</p>}
            <label>Kết quả <select value={decisions[x.id]?.decision ?? ''} onChange={e => decide(x.id, { decision: e.target.value })}><option value="">Chọn kết quả</option>{x.eligible && x.status === 'SUBMITTED' && <option value="APPROVE">Duyệt</option>}<option value="REJECT">Từ chối</option></select></label>
            {x.sourceType === 'CLOSING_DUTY' && decisions[x.id]?.decision === 'APPROVE' && <label>Vai trò được xác nhận <select value={decisions[x.id]?.role ?? ''} onChange={e => decide(x.id, { role: e.target.value })}><option value="">Chọn vai trò</option><option value="Organizer">Ban tổ chức</option><option value="Leader">Chủ trì</option></select></label>}
          </fieldset>)}</div>
          <label>Lý do xử lý <textarea value={reason} onChange={e => setReason(e.target.value)} minLength={5} maxLength={1000} disabled={busy} /></label>
          {detail.status === 'RESERVED' && <div className="raw-funding-actions">
            <button type="button" disabled={busy || reason.trim().length < 5 || !detail.canSettle || !complete} onClick={() => mutate(`/api/v1/raw-funding/reservations/${selected}/settle`, { expectedVersion: detail.version, reason: reason.trim(), decisions: candidates.map(x => ({ id: x.id, expectedVersion: x.version, ...decisions[x.id] })) })}>Quyết toán toàn bộ</button>
            <button type="button" disabled={busy || reason.trim().length < 5} onClick={() => mutate(`/api/v1/raw-funding/reservations/${selected}/reconcile`, { expectedVersion: detail.version, reason: reason.trim() })}>Đối soát nguồn và quỹ</button>
          </div>}
          {detail.status === 'RESERVED' && detail.activityId && <form onSubmit={event => {
            event.preventDefault(); const fields = new FormData(event.currentTarget);
            mutate(`/api/v1/raw-funding/reservations/${selected}/increase-budget`, { expectedVersion: detail.version, expectedAccountVersion: data.version, amount: Number(fields.get('amount')), reason: fields.get('reason').trim() });
          }}>
            <h5>Bổ sung phân bổ từ quỹ khả dụng</h5>
            <label>Điểm thô bổ sung <input name="amount" type="number" min="0.0001" step="0.0001" max={data.available} required disabled={busy} /></label>
            <label>Lý do điều chỉnh <textarea name="reason" minLength={5} maxLength={1000} required disabled={busy} /></label>
            <button disabled={busy || data.available <= 0}>Duyệt bổ sung phân bổ</button>
          </form>}
        </>}
      </section>}
      <h4>Lịch sử quỹ</h4>
      {!data.entries.length && <p>Chưa có bút toán trong trang này.</p>}
      <div className="raw-funding-scroll"><table><thead><tr><th>Thời điểm</th><th>Nghiệp vụ</th><th>Khả dụng</th><th>Giữ quỹ</th><th>Ghi điểm</th><th>Lý do</th></tr></thead><tbody>{data.entries.map(x => <tr key={x.id}><td>{new Date(x.recordedAt).toLocaleString('vi-VN')}</td><td>{kinds[x.kind] ?? x.kind}</td><td>{amount(x.availableDelta)}</td><td>{amount(x.reservedDelta)}</td><td>{amount(x.spentDelta)}</td><td>{x.reason}</td></tr>)}</tbody></table></div>
      <nav aria-label="Trang lịch sử quỹ"><button type="button" disabled={busy || page === 1} onClick={() => setPage(x => x - 1)}>Trang trước</button><span>Trang {page}</span><button type="button" disabled={busy || page * data.pageSize >= Math.max(data.total, data.reservationTotal ?? data.reservations.length)} onClick={() => setPage(x => x + 1)}>Trang sau</button></nav>
    </>}
  </section>;
}
