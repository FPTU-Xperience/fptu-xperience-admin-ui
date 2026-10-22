import './RolloverWorkflow.css';
import { useState } from 'react';
import { useWorkflow } from '../../../workflows/WorkflowContext.jsx';
import { MOCK_SEMESTERS } from '../../../workflows/mock-data.js';
import { ROLLOVER_STEPS } from '../../../workflows/workflow-model.js';
import { Button, Field, Panel, Badge } from '../../ui/index.js';
import {
  WorkflowActions,
  WorkflowBody,
  WorkflowGrid,
} from '../workflow-primitives/WorkflowPrimitives.jsx';

export default function RolloverWorkflow() {
  const { scope, state, semester, command, canWrite } = useWorkflow();
  const [target, setTarget] = useState(MOCK_SEMESTERS.find((s) => s !== semester)),
    [reason, setReason] = useState(''),
    [fail, setFail] = useState(false);
  const job = scope.rollover,
    targetScope = job && state.semesters[job.target];
  return (
    <div className="rollover-workflow">
      <Panel
        title="Chuẩn bị chuyển kỳ"
        description="Giữ lịch sử kỳ nguồn; tạo phạm vi điểm, thành viên và ngân sách kỳ mới trong bộ dữ liệu mô phỏng."
      >
        <WorkflowBody>
          <WorkflowGrid>
            <Field label="Học kỳ nguồn">
              <input readOnly value={semester} />
            </Field>
            <Field label="Học kỳ đích">
              <select
                value={target}
                disabled={['RUNNING', 'FAILED', 'COMPLETED'].includes(job?.status)}
                onChange={(e) => setTarget(e.target.value)}
              >
                {MOCK_SEMESTERS.filter((s) => s !== semester).map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
          </WorkflowGrid>
          <label className="rollover-workflow-option">
            <input
              type="checkbox"
              checked={fail}
              onChange={(e) => setFail(e.target.checked)}
              disabled={['RUNNING', 'FAILED', 'COMPLETED'].includes(job?.status)}
            />{' '}
            Thử tình huống lỗi giữa chừng và khôi phục tác vụ
          </label>
          <Button
            disabled={!canWrite || ['RUNNING', 'FAILED', 'COMPLETED'].includes(job?.status)}
            onClick={() => command('PREVIEW_ROLLOVER', { target, failAt: fail })}
          >
            Xem trước tác động · mô phỏng
          </Button>
        </WorkflowBody>
      </Panel>
      {job && (
        <Panel
          title={`Chuyển ${semester} → ${job.target}`}
          action={
            <Badge tone={job.status === 'COMPLETED' ? 'green' : 'orange'}>
              {
                {
                  PREVIEW: 'Chờ xác nhận',
                  RUNNING: 'Đang chạy',
                  FAILED: 'Có bước lỗi',
                  COMPLETED: 'Hoàn tất mô phỏng',
                }[job.status]
              }
            </Badge>
          }
        >
          <WorkflowBody>
            <WorkflowGrid>
              <div>
                <strong>{job.activeCount} sinh viên đang học</strong>
                <p>
                  {job.targetImported
                    ? 'Giữ bản roster đã nhập ở kỳ đích.'
                    : 'Chuyển tiếp roster đang học vì kỳ đích chưa có bản nhập.'}
                </p>
              </div>
              <div>
                <strong>{job.pausedClubs.length} CLB cần xử lý lãnh đạo</strong>
                <p>
                  Ưu tiên phó chủ nhiệm đủ điều kiện; thiếu người kế nhiệm thì tạm dừng, không giải
                  thể. Hoạt động dự kiến liên quan chuyển Không tổ chức, hoàn bonus một lần.
                </p>
              </div>
            </WorkflowGrid>
            <p>
              Điểm và bonus kỳ đích bắt đầu từ 0. Nguồn, quyết định, thành viên và bút toán kỳ nguồn
              được giữ trong lịch sử mô phỏng.
            </p>
            <ul>
              {job.officeChanges
                ?.filter((c) => c.before !== c.after)
                .map((c) => (
                  <li key={c.clubId}>
                    {scope.clubs.find((club) => club.id === c.clubId)?.name}:{' '}
                    {c.before || 'Chưa có chủ nhiệm'} → {c.after || 'Tạm dừng, cần đề cử mới'}
                  </li>
                ))}
            </ul>
            <ol className="rollover-workflow-steps">
              {ROLLOVER_STEPS.map((s, i) => (
                <li
                  key={s}
                  data-complete={i < job.step}
                  aria-current={i === job.step && job.status === 'RUNNING' ? 'step' : undefined}
                >
                  <span>{i < job.step ? '✓' : i + 1}</span>
                  <div>
                    <strong>{s}</strong>
                    <small>
                      {i < job.step
                        ? 'Hoàn tất mô phỏng'
                        : i === job.step && job.status === 'FAILED'
                          ? 'Lỗi mô phỏng'
                          : i === job.step && job.status === 'RUNNING'
                            ? 'Đang chạy…'
                            : 'Chưa chạy'}
                    </small>
                  </div>
                </li>
              ))}
            </ol>
            {job.status === 'PREVIEW' && (
              <>
                <Field label="Lý do xác nhận chuyển kỳ mô phỏng">
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} />
                </Field>
                <Button
                  variant="primary"
                  disabled={!canWrite || reason.trim().length < 5}
                  onClick={() => command('START_ROLLOVER', { reason })}
                >
                  Xác nhận chạy mô phỏng
                </Button>
              </>
            )}
            {job.status === 'FAILED' && (
              <>
                <p role="alert">{job.error}</p>
                <Button disabled={!canWrite} onClick={() => command('RETRY_ROLLOVER')}>
                  Thử lại từ bước lỗi · không tạo tác vụ mới
                </Button>
              </>
            )}
            {job.status === 'RUNNING' && (
              <p role="status">
                Tác vụ mô phỏng đang chạy. Tạm khóa thay đổi dữ liệu kỳ nguồn để giữ kết quả nhất
                quán.
              </p>
            )}
            {job.status === 'COMPLETED' && (
              <div className="rollover-workflow-receipt">
                <h3>Kết quả kỳ đích · mô phỏng</h3>
                <p>
                  {targetScope.roster.filter((r) => r.active).length} sinh viên ·{' '}
                  {targetScope.clubs.length} CLB · {targetScope.ledger.length} bút toán kỳ mới ·
                  tổng bonus {targetScope.clubs.reduce((n, c) => n + c.bonus, 0)}
                </p>
                <p>
                  Lịch sử kỳ nguồn: {scope.ledger.length} bút toán vẫn được giữ. Đây không phải kết
                  quả chuyển kỳ trên server.
                </p>
              </div>
            )}
          </WorkflowBody>
        </Panel>
      )}
    </div>
  );
}
