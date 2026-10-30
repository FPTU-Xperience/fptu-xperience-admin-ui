import './RosterWorkflow.css';
import { useEffect, useRef, useState } from 'react';
import { useWorkflow } from '../../../workflows/WorkflowContext.jsx';
import { readRosterDraft } from '../../../utils/roster-preview.js';
import { createWorkbookBuffer, downloadBuffer } from '../../../utils/excel.js';
import { Button, Field, Panel, Badge } from '../../ui/index.js';
import {
  WorkflowActions,
  WorkflowBody,
  WorkflowTable,
} from '../workflow-primitives/WorkflowPrimitives.jsx';

export default function RosterWorkflow() {
  const { scope, command, canWrite } = useWorkflow();
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [reason, setReason] = useState('');
  const input = useRef(),
    ticket = useRef(0);
  useEffect(
    () => () => {
      ticket.current++;
    },
    [],
  );
  const preview = scope.rosterPreview;
  const load = async (file) => {
    if (!file) return;
    const current = ++ticket.current;
    setBusy(true);
    setError('');
    try {
      const rows = await readRosterDraft(file);
      if (current === ticket.current) command('PREVIEW_ROSTER', { rows });
    } catch (e) {
      if (current === ticket.current) setError(e.message);
    } finally {
      if (current === ticket.current) setBusy(false);
    }
  };
  const template = async () => {
    setError('');
    try {
      downloadBuffer(
        await createWorkbookBuffer(
          'Roster',
          ['studentCode', 'fullName', 'email'],
          [['MOCK-SE005', 'Sinh viên mẫu', 'student@example.test']],
        ),
        'Mock_Roster.xlsx',
      );
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <div className="roster-workflow">
      <Panel
        title="Danh sách đang học · mô phỏng"
        description={
          scope.carriedFrom
            ? `Chuyển tiếp từ ${scope.carriedFrom}`
            : scope.rosterImported
              ? 'Đã xác nhận bản nhập trong phiên mô phỏng'
              : 'Danh sách mẫu từ JS, chưa phải danh sách nhập chính thức'
        }
      >
        <WorkflowTable
          label="Roster mô phỏng"
          columns={['Mã sinh viên', 'Họ tên', 'Email', 'Điều kiện']}
        >
          {scope.roster.map((r) => (
            <tr key={r.studentCode}>
              <td>{r.studentCode}</td>
              <td>{r.fullName}</td>
              <td>{r.email}</td>
              <td>
                <Badge tone={r.active ? 'green' : 'neutral'}>
                  {r.active ? 'Đang học' : 'Ngừng học'}
                </Badge>
              </td>
            </tr>
          ))}
        </WorkflowTable>
      </Panel>
      <Panel title="Chuẩn bị → xem trước → xác nhận nhập mô phỏng">
        <WorkflowBody>
          <p>
            Nhập danh sách mô phỏng cho học kỳ này; không tạo tài khoản thật.
          </p>
          <input
            className="roster-workflow-file"
            ref={input}
            type="file"
            accept=".xlsx"
            aria-label="Chọn file roster mô phỏng"
            disabled={busy || !canWrite}
            onChange={(e) => load(e.target.files?.[0])}
          />
          <WorkflowActions>
            <Button disabled={busy} onClick={template}>
              Tải mẫu Excel
            </Button>
            <Button
              disabled={busy || !canWrite}
              onClick={() =>
                command('PREVIEW_ROSTER', {
                  rows: scope.roster
                    .filter((r) => r.active)
                    .map(({ studentCode, fullName, email }) => ({ studentCode, fullName, email })),
                })
              }
            >
              Xem trước danh sách
            </Button>
          </WorkflowActions>
          {busy && <p role="status">Đang kiểm tra file…</p>}
          {error && <p role="alert">{error}</p>}
        </WorkflowBody>
        {preview && (
          <>
            <WorkflowBody>
              <h3>Kết quả xem trước</h3>
              <p>
                {preview.rows.length} dòng · {preview.rows.filter((r) => r.errors.length).length}{' '}
                dòng cần sửa ·{' '}
                {
                  scope.roster.filter(
                    (r) => !preview.rows.some((n) => n.studentCode === r.studentCode),
                  ).length
                }{' '}
                sinh viên hiện tại không có trong bản nhập.
              </p>
              <p>Kết quả chỉ áp dụng cho dữ liệu mô phỏng.</p>
            </WorkflowBody>
            <WorkflowTable
              label="Xem trước nhập roster"
              columns={['Dòng', 'Mã sinh viên', 'Họ tên', 'Email', 'Kiểm tra']}
            >
              {preview.rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.row}</td>
                  <td>{r.studentCode}</td>
                  <td>{r.fullName}</td>
                  <td>{r.email}</td>
                  <td>{r.errors.join('; ') || 'Hợp lệ trong file'}</td>
                </tr>
              ))}
            </WorkflowTable>
            <WorkflowBody>
              <Field label="Lý do xác nhận danh sách mô phỏng">
                <input value={reason} onChange={(e) => setReason(e.target.value)} />
              </Field>
              <Button
                variant="primary"
                disabled={
                  !canWrite || preview.rows.some((r) => r.errors.length) || reason.trim().length < 5
                }
                onClick={() => command('COMMIT_ROSTER', { reason })}
              >
                Xác nhận nhập vào kho mô phỏng
              </Button>
            </WorkflowBody>
          </>
        )}
      </Panel>
    </div>
  );
}
