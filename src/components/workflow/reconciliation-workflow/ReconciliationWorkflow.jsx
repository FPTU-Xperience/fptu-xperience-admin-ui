import './ReconciliationWorkflow.css';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useWorkflow } from '../../../workflows/WorkflowContext.jsx';
import { effectiveRaw } from '../../../workflows/workflow-model.js';
import { Button, Field, Panel } from '../../ui/index.js';
import {
  WorkflowBody,
  WorkflowGrid,
  WorkflowHistory,
  WorkflowTable,
} from '../workflow-primitives/WorkflowPrimitives.jsx';

export default function ReconciliationWorkflow({ moderation = false }) {
  const { scope, semester, command, canWrite } = useWorkflow();
  const [sourceId, setSource] = useState(''),
    [decision, setDecision] = useState('KEEP'),
    [amount, setAmount] = useState(0),
    [reason, setReason] = useState('');
  const sources = scope.ledger.filter((row) => row.kind === 'AWARD');
  const selected = sources.find((row) => row.id === sourceId);
  return (
    <div className="reconciliation-workflow">
      <Panel
        title={moderation ? 'Xử lý nguồn nghi vấn · mô phỏng' : 'Đối soát tổng hợp · mô phỏng'}
      >
        <WorkflowBody>
          <WorkflowGrid>
            <div>
              <h3>Phạm vi {semester}</h3>
              <p>
                {scope.roster.filter((r) => r.active).length} sinh viên đang học ·{' '}
                {scope.activities.length} hoạt động · {scope.ledger.length} bút toán mô phỏng
              </p>
            </div>
            <div>
              <h3>Tổng điểm thô mô phỏng</h3>
              <p>
                {scope.ledger.reduce((n, row) => n + row.rawPoints, 0)} đã ghi ·{' '}
                {scope.activities
                  .filter((a) => !a.posted && !['NOT_HELD', 'REJECTED'].includes(a.state))
                  .reduce((n, a) => n + a.awards.reduce((s, r) => s + r.rawPoints, 0), 0)}{' '}
                đang chờ
              </p>
              <small>Không áp dụng công thức ví, hệ số hoặc thay đổi Xperience Point thật.</small>
            </div>
          </WorkflowGrid>
        </WorkflowBody>
        <WorkflowTable
          label="Đối soát hoạt động mô phỏng"
          columns={[
            'Hoạt động',
            'Roster đủ điều kiện',
            'Điểm chờ',
            'Đã ghi thô',
            'Ngân sách gốc + bonus',
          ]}
        >
          {scope.activities.map((a) => (
            <tr key={a.id}>
              <td>
                <Link
                  to={`/ctsv/activities?view=${a.school ? 'school' : 'club'}&source=mock&record=${a.id}`}
                >
                  {a.title}
                </Link>
              </td>
              <td>
                {a.awards.every((row) =>
                  scope.roster.some((s) => s.studentCode === row.studentCode && s.active),
                )
                  ? 'Đủ trong mẫu'
                  : 'Cần rà soát'}
              </td>
              <td>
                {a.posted || ['NOT_HELD', 'REJECTED'].includes(a.state)
                  ? 0
                  : a.awards.reduce((n, r) => n + r.rawPoints, 0)}
              </td>
              <td>{effectiveRaw(scope, a.id)}</td>
              <td>
                {a.baseBudget} + {a.bonus}
              </td>
            </tr>
          ))}
        </WorkflowTable>
      </Panel>
      {moderation && (
        <Panel title="Quyết định và bút toán bổ sung">
          <WorkflowBody>
            {!sources.length ? (
              <p>
                Chưa có nguồn đã ghi sổ để điều chỉnh.{' '}
                <Link to="/ctsv/activities?view=club&source=mock&record=mock-settlement">
                  Duyệt hồ sơ quyết toán mẫu trước.
                </Link>
              </p>
            ) : (
              <form
                className="reconciliation-workflow-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  command('CORRECT_SOURCE', {
                    ledgerId: sourceId,
                    decision,
                    amount,
                    reason,
                    expectedRevision: scope.revision,
                  });
                }}
              >
                <WorkflowGrid>
                  <Field label="Nguồn ghi sổ mô phỏng">
                    <select required value={sourceId} onChange={(e) => setSource(e.target.value)}>
                      <option value="">Chọn nguồn</option>
                      {sources.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.studentCode} · {s.sourceId}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Quyết định">
                    <select value={decision} onChange={(e) => setDecision(e.target.value)}>
                      <option value="KEEP">Giữ nguyên</option>
                      <option value="REVERSE">Thu hồi bằng bút toán đảo</option>
                      <option value="ADJUST">Điều chỉnh điểm thô</option>
                    </select>
                  </Field>
                </WorkflowGrid>
                {selected && (
                  <p>
                    Điểm hiệu lực hiện tại của nguồn:{' '}
                    {scope.ledger
                      .filter((r) => r.sourceId === selected.sourceId)
                      .reduce((n, r) => n + r.rawPoints, 0)}
                    . Bút toán gốc không bị sửa hoặc xóa.
                  </p>
                )}
                {decision === 'ADJUST' && (
                  <Field label="Điểm thô hiệu lực mong muốn">
                    <input
                      required
                      type="number"
                      min="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </Field>
                )}
                <Field label="Lý do quyết định">
                  <textarea
                    required
                    minLength={5}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </Field>
                <Button
                  disabled={!canWrite || !sourceId || reason.trim().length < 5}
                  type="submit"
                  variant="primary"
                >
                  Lưu quyết định vào kho mô phỏng
                </Button>
              </form>
            )}
          </WorkflowBody>
        </Panel>
      )}
      <Panel title="Sổ nguồn · chỉ dữ liệu mô phỏng">
        <WorkflowTable
          label="Bút toán nguồn mô phỏng"
          columns={['Mã bút toán', 'Nguồn gốc', 'Sinh viên', 'Loại', 'Điểm thô']}
        >
          {scope.ledger.map((row) => (
            <tr key={row.id}>
              <td>{row.id}</td>
              <td>
                {row.sourceId}
                <small>{row.originalId ? `Liên kết gốc: ${row.originalId}` : 'Bút toán gốc'}</small>
              </td>
              <td>{row.studentCode}</td>
              <td>{row.kind}</td>
              <td>
                {row.rawPoints > 0 ? '+' : ''}
                {row.rawPoints}
              </td>
            </tr>
          ))}
          {!scope.ledger.length && (
            <tr>
              <td colSpan={5}>
                Chưa có bút toán. Điểm tham gia vẫn chờ cho đến khi duyệt quyết toán.
              </td>
            </tr>
          )}
        </WorkflowTable>
      </Panel>
      {!!scope.decisions.length && (
        <Panel title="Quyết định kiểm duyệt mô phỏng">
          <WorkflowTable
            label="Lịch sử quyết định mô phỏng"
            columns={['Nguồn', 'Quyết định', 'Trước → sau', 'Lý do']}
          >
            {scope.decisions.map((row) => (
              <tr key={row.id}>
                <td>{row.sourceId}</td>
                <td>{row.decision}</td>
                <td>
                  {row.before} → {row.after}
                </td>
                <td>{row.reason}</td>
              </tr>
            ))}
          </WorkflowTable>
        </Panel>
      )}
      <Panel title="Nhật ký thao tác mock của học kỳ">
        <WorkflowBody>
          <WorkflowHistory rows={scope.audit} />
        </WorkflowBody>
      </Panel>
    </div>
  );
}
