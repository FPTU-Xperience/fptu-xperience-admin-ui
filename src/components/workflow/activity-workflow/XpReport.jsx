import { useState } from 'react';
import { useWorkflow } from '../../../workflows/WorkflowContext.jsx';
import { groupXp, xpReportCurrent, xpTotal } from '../../../workflows/xp-report.js';
import { Button, Field, Modal, Panel } from '../../ui/index.js';
import {
  WorkflowActions,
  WorkflowBody,
  WorkflowGrid,
  WorkflowTable,
} from '../workflow-primitives/WorkflowPrimitives.jsx';

export default function XpReport({ activity, send }) {
  const { scope, canWrite, state } = useWorkflow();
  const [view, setView] = useState('rows'),
    [student, setStudent] = useState(''),
    [action, setAction] = useState('');
  const [editing, setEditing] = useState(null);
  const editable = activity.state === 'EXECUTING';
  const report = ['SETTLEMENT_REVIEW', 'COMPLETED'].includes(activity.state)
    ? activity.closingSnapshot
    : activity.xpReport;
  const rows = report?.rows || [];
  const filtered = rows.filter(
    (r) => (!student || r.studentCode === student) && (!action || r.actionId === action),
  );
  const studentName = (code) =>
    `${code} · ${scope.roster.find((r) => r.studentCode === code)?.fullName || 'Ngoài roster hiện tại'}`;
  const actionName = (id) => activity.actions.find((r) => r.id === id)?.title || id;
  const changes = (report?.changes || []).filter(
    (r) => (!student || r.studentCode === student) && (!action || r.actionId === action),
  );
  const posted = scope.ledger.filter((r) => r.activityId === activity.id);
  return (
    <Panel
      title="Báo cáo điểm Xperience Point"
      description="Tự điền → kiểm tra & chỉnh sửa → chốt báo cáo → CTSV duyệt. Điểm thô mô phỏng, chưa quy đổi Xperience Point chính thức."
    >
      <WorkflowBody>
        <WorkflowActions>
          {editable && (
            <Button
              variant="primary"
              disabled={!canWrite || !activity.awards.length}
              onClick={() => send('AUTOFILL_XP')}
            >
              Tự điền Xperience Point từ minh chứng
            </Button>
          )}
          <span>
            {activity.closingVersion && !editable
              ? `Snapshot báo cáo v${activity.closingVersion}`
              : 'Bản nháp Xperience Point'}
          </span>
        </WorkflowActions>
        <p>
          Tổng đề xuất: <strong>{xpTotal(rows)}</strong> / {activity.baseBudget + activity.bonus}{' '}
          điểm thô · {new Set(rows.map((r) => r.studentCode)).size} sinh viên ·{' '}
          {new Set(rows.map((r) => r.actionId)).size} action
        </p>
        {report?.summary && (
          <p>
            <strong>Thuyết minh báo cáo kết thúc:</strong> {report.summary}
          </p>
        )}
        {editable && !xpReportCurrent(activity) && (
          <p role="status">
            {report
              ? 'Minh chứng đã thay đổi. Tự điền lại trước khi nộp; các dòng đã chỉnh sửa được giữ nguyên.'
              : 'Bước 1: Tự điền từ các minh chứng đã ghi nhận, sau đó kiểm tra từng dòng.'}
          </p>
        )}
        {!editable && (
          <p>
            Bảng đã khóa. Khi chờ duyệt, trả báo cáo để bổ sung. Sau khi ghi sổ, điều chỉnh tại đối
            soát bằng bút toán chênh lệch.
          </p>
        )}
        <WorkflowGrid>
          <Field label="Lọc sinh viên Xperience Point">
            <select value={student} onChange={(e) => setStudent(e.target.value)}>
              <option value="">Tất cả sinh viên</option>
              {[...new Set(rows.map((r) => r.studentCode))].map((code) => (
                <option key={code} value={code}>
                  {studentName(code)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Lọc action Xperience Point">
            <select value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="">Tất cả action</option>
              {activity.actions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          </Field>
        </WorkflowGrid>
        <WorkflowActions>
          {[
            ['rows', 'Từng sinh viên / action'],
            ['students', 'Tổng hợp sinh viên'],
            ['actions', 'Tổng hợp action'],
            ['changes', 'Danh sách thay đổi Xperience Point'],
          ].map(([key, label]) => (
            <Button
              key={key}
              aria-pressed={view === key}
              variant={view === key ? 'primary' : 'secondary'}
              onClick={() => setView(key)}
            >
              {label}
            </Button>
          ))}
        </WorkflowActions>
        <p role="status">
          Đang xem {filtered.length} dòng · {xpTotal(filtered)} điểm thô đề xuất
        </p>
      </WorkflowBody>
      {view === 'rows' && (
        <WorkflowTable
          label="Chi tiết Xperience Point từng sinh viên và action"
          columns={[
            'Sinh viên',
            'Action / nguồn',
            'Lượt × điểm',
            'Xperience Point thô đề xuất',
            'Đã ghi sổ',
            'Minh chứng',
            'Chỉnh sửa',
          ]}
        >
          {filtered.map((row) => (
            <tr key={row.sourceId}>
              <td>{studentName(row.studentCode)}</td>
              <td>
                {actionName(row.actionId)}
                <small>{row.sourceId}</small>
              </td>
              <td>
                {row.quantity} × {row.points}
              </td>
              <td>{row.rawPoints}</td>
              <td>
                {posted
                  .filter((r) => r.sourceId === row.sourceId)
                  .reduce((n, r) => n + r.rawPoints, 0)}
              </td>
              <td>{row.evidence}</td>
              <td>
                <Button
                  disabled={!canWrite || !editable || !xpReportCurrent(activity)}
                  onClick={() => setEditing({ ...row, reason: '', version: activity.version })}
                >
                  Sửa dòng Xperience Point
                </Button>
              </td>
            </tr>
          ))}
          {!filtered.length && (
            <tr>
              <td colSpan={7}>Chưa có dòng Xperience Point phù hợp.</td>
            </tr>
          )}
        </WorkflowTable>
      )}
      {['students', 'actions'].includes(view) && (
        <WorkflowTable
          label="Tổng hợp Xperience Point"
          columns={[
            view === 'students' ? 'Sinh viên' : 'Action',
            'Số dòng',
            'Số lượt',
            'Xperience Point thô đề xuất',
          ]}
        >
          {groupXp(filtered, view === 'students' ? 'studentCode' : 'actionId').map((r) => (
            <tr key={r.id}>
              <td>{view === 'students' ? studentName(r.id) : actionName(r.id)}</td>
              <td>{r.count}</td>
              <td>{r.quantity}</td>
              <td>{r.rawPoints}</td>
            </tr>
          ))}
          {!filtered.length && (
            <tr>
              <td colSpan={4}>Chưa có dữ liệu phù hợp.</td>
            </tr>
          )}
        </WorkflowTable>
      )}
      {view === 'changes' && (
        <>
          <WorkflowTable
            label="Lịch sử thay đổi Xperience Point"
            columns={[
              'Sinh viên / action',
              'Trước → sau',
              'Lý do / minh chứng',
              'Người sửa / thời gian',
            ]}
          >
            {changes.map((r) => (
              <tr key={r.id}>
                <td>
                  {studentName(r.studentCode)}
                  <small>
                    {actionName(r.actionId)} · {r.sourceId}
                  </small>
                </td>
                <td>
                  {r.before ? `${r.before.quantity} lượt · ${r.before.rawPoints} điểm` : 'Chưa có'}{' '}
                  → {r.after.quantity} lượt · {r.after.rawPoints} điểm
                </td>
                <td>
                  {r.reason}
                  <small>Minh chứng trước: {r.before?.evidence || '—'}</small>
                  <small>Minh chứng sau: {r.after.evidence}</small>
                </td>
                <td>
                  {r.actor}
                  <small>
                    {new Date(r.at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
                  </small>
                </td>
              </tr>
            ))}
            {!changes.length && (
              <tr>
                <td colSpan={4}>Chưa có thay đổi phù hợp.</td>
              </tr>
            )}
          </WorkflowTable>
          <WorkflowTable
            label="Bút toán Xperience Point sau duyệt"
            columns={['Sinh viên / action', 'Loại', 'Chênh lệch Xperience Point thô', 'Nguồn / lý do']}
          >
            {posted
              .filter(
                (r) =>
                  (!student || r.studentCode === student) && (!action || r.actionId === action),
              )
              .map((r) => (
                <tr key={r.id}>
                  <td>
                    {studentName(r.studentCode)}
                    <small>{actionName(r.actionId)}</small>
                  </td>
                  <td>{r.kind}</td>
                  <td>{r.rawPoints}</td>
                  <td>
                    {r.sourceId}
                    <small>{r.reason || 'Duyệt báo cáo kết thúc'}</small>
                  </td>
                </tr>
              ))}
            {!posted.length && (
              <tr>
                <td colSpan={4}>Chưa ghi sổ. Phê duyệt kế hoạch và tự điền chưa cộng Xperience Point.</td>
              </tr>
            )}
          </WorkflowTable>
        </>
      )}
      {editing && (
        <Modal title="Chỉnh sửa dòng Xperience Point · mô phỏng" onClose={() => setEditing(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send('EDIT_XP_ROW', {
                sourceId: editing.sourceId,
                quantity: editing.quantity,
                evidence: editing.evidence,
                reason: editing.reason,
                expectedVersion: editing.version,
              });
            }}
          >
            <WorkflowBody>
              <p>
                {studentName(editing.studentCode)} · {actionName(editing.actionId)}
              </p>
              <p>
                Điểm mỗi lượt đã duyệt: {editing.points}. Nhập 0 lượt để loại phần điểm của dòng này
                và giữ lịch sử.
              </p>
              <Field label="Số lượt tính Xperience Point">
                <input
                  required
                  type="number"
                  min="0"
                  step="1"
                  value={editing.quantity}
                  onChange={(e) => setEditing({ ...editing, quantity: e.target.value })}
                />
              </Field>
              <Field label="Minh chứng Xperience Point">
                <textarea
                  required
                  value={editing.evidence}
                  onChange={(e) => setEditing({ ...editing, evidence: e.target.value })}
                />
              </Field>
              <Field label="Lý do chỉnh sửa Xperience Point">
                <textarea
                  required
                  minLength={5}
                  value={editing.reason}
                  onChange={(e) => setEditing({ ...editing, reason: e.target.value })}
                />
              </Field>
              <p>Sau chỉnh sửa: {Number(editing.quantity) * editing.points} điểm thô</p>
              {state.result?.ok === false && <p role="alert">{state.result.message}</p>}
              {activity.version !== editing.version && (
                <p role="status">Dữ liệu đã cập nhật. Đóng để xem bảng Xperience Point mới.</p>
              )}
              <WorkflowActions>
                <Button type="button" onClick={() => setEditing(null)}>
                  Đóng
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={
                    !canWrite ||
                    activity.version !== editing.version ||
                    editing.reason.trim().length < 5
                  }
                >
                  Lưu thay đổi Xperience Point
                </Button>
              </WorkflowActions>
            </WorkflowBody>
          </form>
        </Modal>
      )}
    </Panel>
  );
}
