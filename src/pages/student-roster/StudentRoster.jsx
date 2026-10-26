import './StudentRoster.css';
import '../../components/operations/Operations.css';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import api from '../../services/api.js';
import { createImplementedContracts } from '../../services/implemented-contracts.js';
import { Button, Field, PageHeader, Panel } from '../../components/ui/index.js';
import { PageNavigation } from '../../components/operations/operation-state/OperationState.jsx';

const contracts = createImplementedContracts(api);
export function StudentRoster() {
  const { user } = useAuth();
  const { season } = useWorkspace();
  const canSelectCampus = user?.roles?.some((role) => ['SYSTEM_ADMIN', 'ADMIN'].includes(role));
  const [campus, setCampus] = useState(user?.campusCode === 'GLOBAL' ? '' : user?.campusCode || '');
  const [result, setResult] = useState(null),
    [preview, setPreview] = useState(null);
  const [page, setPage] = useState(1),
    [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const ticket = useRef(0),
    lock = useRef(false),
    commitKey = useRef(null),
    input = useRef(null);
  useEffect(() => {
    setCampus(user?.campusCode === 'GLOBAL' ? '' : user?.campusCode || '');
  }, [user?.id, user?.campusCode]);
  useEffect(() => {
    setPage(1);
    setPreview(null);
    commitKey.current = null;
    if (input.current) input.current.value = '';
  }, [season, campus, user?.id]);
  useEffect(() => {
    const current = ++ticket.current;
    setResult(null);
    setError('');
    setNotice('');
    if (season && campus)
      contracts.roster
        .get(season, { campusCode: campus, page, pageSize: 20 })
        .then((value) => {
          if (ticket.current === current) setResult(value);
        })
        .catch((issue) => {
          if (ticket.current === current) setError(issue.message);
        });
    return () => {
      ticket.current++;
    };
  }, [season, campus, page, revision, user?.id]);
  const upload = async (file) => {
    if (!file || !result || lock.current) return;
    lock.current = true;
    setBusy(true);
    setPreview(null);
    setError('');
    setNotice('');
    const current = ticket.current;
    try {
      const value = await contracts.roster.preview(season, file, result.version, campus);
      if (ticket.current === current) {
        setPreview(value);
        commitKey.current = crypto.randomUUID();
      }
    } catch (issue) {
      if (ticket.current === current) setError(issue.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const commit = async () => {
    if (!preview?.canCommit || lock.current || Date.parse(preview.expiresAt) <= Date.now()) return;
    lock.current = true;
    setBusy(true);
    setError('');
    const current = ticket.current;
    try {
      await contracts.roster.commit(season, preview, campus, commitKey.current);
      if (ticket.current === current) {
        setPreview(null);
        setRevision((x) => x + 1);
      }
    } catch (issue) {
      if (ticket.current === current) {
        setError(issue.message);
        if ([409, 410, 422].includes(issue.status)) setPreview(null);
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const template = () => {
    const url = URL.createObjectURL(
      new Blob(['email,studentCode,campusCode,status\r\n'], { type: 'text/csv;charset=utf-8' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'student-roster.csv';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <>
      <PageHeader
        title="Sinh viên theo học kỳ"
        description="Đọc roster chính thức và xem trước thay thế danh sách theo email trường."
      >
        <Button onClick={template}>Tải mẫu CSV</Button>
      </PageHeader>
      <Panel title={`Danh sách chính thức · ${season || 'Chưa chọn học kỳ'}`}>
        <Field label="Campus">
          <select
            value={campus}
            disabled={busy || !canSelectCampus}
            onChange={(e) => setCampus(e.target.value)}
          >
            <option value="">Chọn campus</option>
            {['HAN', 'HCM', 'DAN', 'CAN', 'QNH'].map((code) => (
              <option key={code}>{code}</option>
            ))}
          </select>
        </Field>
        {error && <p role="alert">{error}</p>}
        {notice && <p role="status">{notice}</p>}
        {!season || !campus ? (
          <p>Chọn học kỳ ở header và campus để tải roster.</p>
        ) : !result && !error ? (
          <p role="status">Đang tải roster…</p>
        ) : null}
        {result && (
          <>
            <p role="status">
              {result.availability === 'AVAILABLE'
                ? `${result.totalItems} sinh viên · Nguồn ${result.source || 'IMPORT'}`
                : 'Học kỳ chưa có roster được nhập.'}
            </p>
            <div className="student-roster-content-3">
              <table className="operation-table">
                <thead>
                  <tr>
                    <th>Mã sinh viên</th>
                    <th>Họ tên</th>
                    <th>Email</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((row) => (
                    <tr key={row.userId}>
                      <td>{row.studentCode}</td>
                      <td>{row.fullName || '—'}</td>
                      <td>{row.email}</td>
                      <td>
                        {row.active ? 'Đang học' : 'Không hoạt động'}
                        {!row.accountAvailable && ' · Tài khoản không khả dụng'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PageNavigation
              page={page}
              totalPages={Math.max(1, result.totalPages)}
              total={result.totalItems}
              onChange={setPage}
            />
            <Field
              label="Nhập CSV UTF-8"
              hint="Cột email,studentCode,campusCode,status. ACTIVE/INACTIVE; không tạo tài khoản. Xem trước chưa thay roster."
            >
              <input
                ref={input}
                type="file"
                accept=".csv"
                disabled={busy}
                onChange={(e) => upload(e.target.files[0])}
              />
            </Field>
          </>
        )}
        {preview && (
          <section>
            <h3>Xem trước thay thế toàn bộ roster</h3>
            <p>
              {preview.rowCount} dòng · thêm {preview.additions} · cập nhật {preview.updates} · bỏ
              khỏi danh sách {preview.omissions}.
            </p>
            <p>Hết hạn: {new Date(preview.expiresAt).toLocaleString('vi-VN')}.</p>
            {preview.errors?.length > 0 && (
              <ul>
                {preview.errors.map((issue, index) => (
                  <li key={index}>
                    Dòng {issue.row} · {issue.field}: {issue.message}
                  </li>
                ))}
              </ul>
            )}
            <Button
              disabled={busy || !preview.canCommit || Date.parse(preview.expiresAt) <= Date.now()}
              onClick={commit}
            >
              Xác nhận thay roster bằng bản xem trước
            </Button>
          </section>
        )}
        <Button
          disabled={busy}
          onClick={() => {
            setPreview(null);
            setRevision((x) => x + 1);
          }}
        >
          Tải lại roster
        </Button>
      </Panel>
    </>
  );
}
