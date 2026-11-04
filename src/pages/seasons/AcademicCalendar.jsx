import { useEffect, useRef, useState } from 'react';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button, Field, Panel } from '../../components/ui/index.js';
import { useCampusScope } from '../../hooks/useCampusScope.js';
import { selectedCampus } from '../../services/campus-scope.js';
import CampusField from '../../components/operations/CampusField.jsx';

export default function AcademicCalendar() {
  const { user } = useAuth();
  const [year, setYear] = useState(new Date().getFullYear()),
    [term, setTerm] = useState('FA');
  const [requestedCampus, setCampus] = useState('');
  const campusAuthority = useCampusScope(user);
  const campus = selectedCampus(campusAuthority.data, requestedCampus);
  const [draft, setDraft] = useState(null),
    [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const ticket = useRef(0),
    lock = useRef(false),
    pending = useRef(null);
  const path = `/api/academic-calendar/${year}/${term}`;
  const context = `${user?.id}:${path}:${campus}`;
  useEffect(() => {
    setCampus(user?.campusCode === 'GLOBAL' ? '' : user?.campusCode || '');
  }, [user?.id, user?.campusCode]);
  useEffect(() => {
    const current = ++ticket.current;
    setDraft(null);
    setError('');
    setNotice('');
    pending.current = null;
    if (campus)
      api
        .get(path, { campusCode: campus })
        .then((value) => {
          if (typeof value?.version !== 'string' || value.campusCode !== campus || value.year !== year || value.term !== term)
            throw new Error('Không đọc được phiên bản lịch học kỳ.');
          if (current === ticket.current) setDraft({ ...value, context });
        })
        .catch((issue) => {
          if (current === ticket.current) setError(issue.message);
        });
    return () => {
      ticket.current++;
    };
  }, [path, campus, revision, user?.id]);
  const save = async (event) => {
    event.preventDefault();
    if (lock.current || draft?.context !== context || !draft?.canWrite) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    const current = ticket.current;
    const body = {
      expectedVersion: draft.version,
      termStartDate: draft.termStartDate,
      block10StartDate: draft.block10StartDate,
      block3StartDate: draft.block3StartDate,
    };
    const fingerprint = JSON.stringify(body);
    if (pending.current?.fingerprint !== fingerprint)
      pending.current = { fingerprint, key: crypto.randomUUID() };
    try {
      const value = await api.request(path, {
        method: 'PUT',
        params: { campusCode: campus },
        body,
        headers: { 'Idempotency-Key': pending.current.key },
      });
      if (current === ticket.current) {
        if (value?.campusCode !== campus || value.year !== year || value.term !== term || typeof value.version !== 'string')
          throw new Error('Máy chủ chưa xác nhận lịch đúng campus/học kỳ.');
        setDraft({ ...value, context });
        setNotice('Đã lưu lịch học kỳ.');
      }
    } catch (issue) {
      if (current === ticket.current) setError(issue.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <Panel title="Lịch học kỳ · 10W và 3W">
      <div className="operation-form-grid">
        <Field label="Năm">
          <input
            type="number"
            min="2000"
            max="2100"
            value={year}
            disabled={busy}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </Field>
        <Field label="Kỳ">
          <select value={term} disabled={busy} onChange={(e) => setTerm(e.target.value)}>
            {['SP', 'SU', 'FA'].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </Field>
        <CampusField scope={campusAuthority} value={campus} onChange={setCampus} busy={busy} />
      </div>
      <p>
        Chọn kỳ đã liên kết với học kỳ chính thức. Ngày bắt đầu kỳ phải khớp nguồn; hai block bắt
        đầu vào thứ Hai, 3W sau đủ 10 tuần của 10W.
      </p>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {draft?.context === context && (
        <form onSubmit={save}>
          {Object.entries({
            termStartDate: 'Bắt đầu học kỳ',
            block10StartDate: 'Bắt đầu 10W',
            block3StartDate: 'Bắt đầu 3W',
          }).map(([name, label]) => (
            <Field key={name} label={label}>
              <input
                type="date"
                required
                value={draft[name] || ''}
                disabled={busy || !draft.canWrite}
                onChange={(e) => setDraft({ ...draft, [name]: e.target.value })}
              />
            </Field>
          ))}
          <Button type="submit" disabled={busy || !draft.canWrite}>
            Lưu lịch học kỳ
          </Button>
        </form>
      )}
      <Button disabled={busy || !campus} onClick={() => setRevision((x) => x + 1)}>
        Tải lại lịch
      </Button>
    </Panel>
  );
}
