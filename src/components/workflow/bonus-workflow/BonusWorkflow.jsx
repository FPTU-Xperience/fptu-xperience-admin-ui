import './BonusWorkflow.css';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useWorkflow } from '../../../workflows/WorkflowContext.jsx';
import { Button, Field, Panel } from '../../ui/index.js';
import {
  WorkflowBody,
  WorkflowGrid,
  WorkflowTable,
} from '../workflow-primitives/WorkflowPrimitives.jsx';

export default function BonusWorkflow({ clubId: fixedClubId, activityPath } = {}) {
  const { scope, command, canWrite } = useWorkflow();
  const [clubId, setClub] = useState(fixedClubId || 'mock-tech'),
    [amount, setAmount] = useState(10),
    [reason, setReason] = useState(''),
    [activityId, setActivity] = useState('');
  const clubs = scope.clubs.filter((c) => !fixedClubId || c.id === fixedClubId);
  const transactions = scope.bonusTransactions.filter(
    (t) => !fixedClubId || t.clubId === fixedClubId,
  );
  const activities = scope.activities.filter(
    (a) => a.clubId === clubId && ['APPROVED', 'EXECUTING'].includes(a.state),
  );
  return (
    <div className="bonus-workflow">
      <Panel
        title="Số dư bonus điểm thô · mô phỏng"
        description="Đây là điểm thô, không phải tiền và không phải điểm ví đã quy đổi."
      >
        <WorkflowTable
          label="Bonus CLB mô phỏng"
          columns={['CLB', 'Số dư khả dụng', 'Đang phân bổ cho hoạt động']}
        >
          {clubs.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>{c.bonus}</td>
              <td>
                {scope.activities
                  .filter((a) => a.clubId === c.id && !a.posted)
                  .reduce((n, a) => n + a.bonus, 0)}
              </td>
            </tr>
          ))}
        </WorkflowTable>
      </Panel>
      <Panel title="Cấp hoặc phân bổ bonus">
        <WorkflowBody>
          <WorkflowGrid>
            <Field label="CLB mô phỏng">
              <select
                value={clubId}
                disabled={!!fixedClubId}
                onChange={(e) => {
                  setClub(e.target.value);
                  setActivity('');
                }}
              >
                {clubs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Số điểm thô">
              <input
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
          </WorkflowGrid>
          <Field label="Lý do cấp / phân bổ">
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <Button
            disabled={!canWrite || reason.trim().length < 5}
            onClick={() => command('GRANT_BONUS', { clubId, amount, reason })}
          >
            CTSV cấp bonus · mô phỏng
          </Button>
          <Field label="Hoạt động đã được duyệt">
            <select value={activityId} onChange={(e) => setActivity(e.target.value)}>
              <option value="">Chọn hoạt động</option>
              {activities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          </Field>
          <Button
            disabled={!canWrite || !activityId || reason.trim().length < 5}
            onClick={() => command('ALLOCATE_BONUS', { clubId, activityId, amount, reason })}
          >
            Mô phỏng CLB phân bổ bonus
          </Button>
          <p>
            Không có hoạt động phù hợp?{' '}
            <Link to={activityPath || '/ctsv/activities?view=club&source=mock'}>
              Mở hồ sơ action để duyệt kế hoạch.
            </Link>{' '}
            Hủy hoạt động chưa quyết toán sẽ hoàn bonus đúng một lần.
          </p>
        </WorkflowBody>
      </Panel>
      <Panel title="Lịch sử cấp · phân bổ · hoàn trả">
        <WorkflowTable
          label="Giao dịch bonus mô phỏng"
          columns={['Loại', 'CLB', 'Nguồn hoạt động', 'Biến động', 'Lý do']}
        >
          {transactions.map((row) => (
            <tr key={row.id}>
              <td>
                {{ GRANT: 'CTSV cấp', ALLOCATE: 'CLB phân bổ', REFUND: 'Hoàn từ hoạt động' }[
                  row.kind
                ] || row.kind}
              </td>
              <td>{scope.clubs.find((c) => c.id === row.clubId)?.name}</td>
              <td>{row.activityId || '—'}</td>
              <td>
                {row.amount > 0 ? '+' : ''}
                {row.amount}
              </td>
              <td>{row.reason || 'Hoàn lại từ hoạt động không tổ chức'}</td>
            </tr>
          ))}
          {!transactions.length && (
            <tr>
              <td colSpan={5}>Chưa có giao dịch trong phiên mô phỏng.</td>
            </tr>
          )}
        </WorkflowTable>
      </Panel>
    </div>
  );
}
