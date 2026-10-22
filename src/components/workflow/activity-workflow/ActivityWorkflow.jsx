import './ActivityWorkflow.css';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, ArrowLeft } from 'lucide-react';
import { useWorkflow } from '../../../workflows/WorkflowContext.jsx';
import { ACTIVITY_STATES, effectiveRaw } from '../../../workflows/workflow-model.js';
import { xpReportCurrent, xpTotal } from '../../../workflows/xp-report.js';
import XpReport from './XpReport.jsx';
import { Badge, Button, Field, Modal, Panel } from '../../ui/index.js';
import {
  ActivityProgress,
  WorkflowActions,
  WorkflowBody,
  WorkflowGrid,
  WorkflowHistory,
  WorkflowTable,
} from '../workflow-primitives/WorkflowPrimitives.jsx';

export default function ActivityWorkflow({ school = false, clubId: fixedClubId }) {
  const { scope, command, canWrite } = useWorkflow();
  const [search, setSearch] = useSearchParams();
  const [creating, setCreating] = useState(false),
    [reason, setReason] = useState(''),
    [independent, setIndependent] = useState(false);
  const [form, setForm] = useState({
    title: '',
    clubId: fixedClubId || 'mock-tech',
    actionTitle: 'Hoàn thành phần việc',
    category: 'Kỹ năng',
    points: 5,
    estimated: 8,
    deadline: '',
    narrative: '',
  });
  const [evidence, setEvidence] = useState({
    actionId: '',
    studentCode: 'MOCK-SE001',
    quantity: 1,
    evidence: '',
  });
  const [newAction, setNewAction] = useState({
    title: '',
    category: 'Kỹ năng',
    points: 5,
    estimated: 8,
  });
  const selected = search.get('record');
  const rows = scope.activities.filter(
    (a) => a.school === school && (!fixedClubId || a.clubId === fixedClubId),
  );
  const activity = rows.find((a) => a.id === selected);
  const evidenceActionId =
    activity?.actions.find((a) => a.id === evidence.actionId)?.id || activity?.actions[0]?.id;
  const pendingXp = (a) => (a.posted ? 0 : xpTotal(a.xpReport?.rows || a.awards));
  const choose = (id) => {
    setSearch((previous) => {
      const next = new URLSearchParams(previous);
      id ? next.set('record', id) : next.delete('record');
      return next;
    });
    setReason('');
    setIndependent(false);
    setEvidence({
      actionId: '',
      studentCode: scope.roster.find((r) => r.active)?.studentCode || '',
      quantity: 1,
      evidence: '',
    });
  };
  const send = (type, fields = {}) =>
    command(type, {
      activityId: activity.id,
      expectedVersion: activity.version,
      reason,
      ...fields,
    });
  const bind = (key) => ({
    value: form[key],
    onChange: (e) => setForm((p) => ({ ...p, [key]: e.target.value })),
  });
  if (selected && !activity)
    return (
      <Panel title="Không tìm thấy hồ sơ mô phỏng">
        <WorkflowBody>
          <p>Hồ sơ không thuộc loại hoạt động hoặc học kỳ đang chọn.</p>
          <Button onClick={() => choose(null)}>Về danh sách</Button>
        </WorkflowBody>
      </Panel>
    );
  return (
    <div className="activity-workflow">
      {!activity ? (
        <>
          <div className="activity-workflow-heading">
            <div>
              <h2>{school ? 'Hoạt động cấp trường' : 'Hồ sơ action & quyết toán'}</h2>
              <p>
                {school
                  ? 'CTSV lập kế hoạch và công bố trực tiếp, không qua duyệt kế hoạch CLB.'
                  : 'Một hồ sơ xuyên suốt hai lần duyệt. Công bố là bước riêng sau duyệt kế hoạch.'}
              </p>
            </div>
            <Button icon={Plus} disabled={!canWrite} onClick={() => setCreating(true)}>
              {school ? 'Tạo hoạt động mô phỏng' : 'Mô phỏng CLB nộp kế hoạch'}
            </Button>
          </div>
          {rows.length ? (
            <Panel>
              <WorkflowTable
                label="Hoạt động mô phỏng"
                columns={['Hồ sơ', 'Trạng thái', 'Ngân sách thô', 'Việc tiếp theo']}
              >
                {rows.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <button className="activity-workflow-record" onClick={() => choose(a.id)}>
                        {a.title}
                      </button>
                      <small>
                        {a.id} · {a.semester}
                      </small>
                    </td>
                    <td>
                      <Badge tone={a.state === 'COMPLETED' ? 'green' : 'orange'}>
                        {ACTIVITY_STATES[a.state]}
                      </Badge>
                    </td>
                    <td>
                      {a.baseBudget + a.bonus}
                      <small>
                        Chờ ghi: {pendingXp(a)} · Đã ghi mô phỏng: {effectiveRaw(scope, a.id)}
                      </small>
                    </td>
                    <td>
                      <Button onClick={() => choose(a.id)}>Mở hồ sơ</Button>
                      <small>{nextAction(a.state)}</small>
                    </td>
                  </tr>
                ))}
              </WorkflowTable>
            </Panel>
          ) : (
            <Panel>
              <WorkflowBody>
                <p>Chưa có hoạt động trong học kỳ mô phỏng này.</p>
              </WorkflowBody>
            </Panel>
          )}
        </>
      ) : (
        <>
          <WorkflowActions>
            <Button icon={ArrowLeft} onClick={() => choose(null)}>
              Danh sách
            </Button>
            <Badge>Hồ sơ JS · {activity.id}</Badge>
          </WorkflowActions>
          <Panel
            title={activity.title}
            description={`${activity.semester} · ${activity.school ? 'Đơn vị tổ chức: CTSV' : scope.clubs.find((c) => c.id === activity.clubId)?.name}`}
          >
            <WorkflowBody>
              <ActivityProgress state={activity.state} />
              <div className="activity-workflow-next">
                <strong>{nextAction(activity.state)}</strong>
                <p>
                  Phụ trách:{' '}
                  {activity.state === 'PLAN_REVIEW' || activity.state === 'SETTLEMENT_REVIEW'
                    ? 'CTSV xét duyệt'
                    : activity.school
                      ? 'CTSV tổ chức'
                      : 'CLB · thao tác giả lập được ghi rõ bên dưới'}
                  {activity.deadline ? ` · Hạn: ${activity.deadline}` : ''}
                </p>
              </div>
              <WorkflowGrid>
                <div>
                  <h3>Kế hoạch đã lưu</h3>
                  <p>{activity.narrative || 'Chưa có thuyết minh.'}</p>
                  <p>
                    Ngân sách gốc: {activity.baseBudget} · Bonus: {activity.bonus} điểm thô
                  </p>
                </div>
                <div>
                  <h3>Điểm theo trạng thái</h3>
                  <p>Chờ quyết toán: {pendingXp(activity)}</p>
                  <p>Đã ghi sổ mô phỏng: {effectiveRaw(scope, activity.id)}</p>
                  <small>Không quy đổi ví và không tác động Xperience Point chính thức.</small>
                </div>
              </WorkflowGrid>
            </WorkflowBody>
            <WorkflowTable
              label="Quy tắc action"
              columns={['Action', 'Nhóm', 'Điểm thô/lượt', 'Dự kiến']}
            >
              {activity.actions.map((a) => (
                <tr key={a.id}>
                  <td>{a.title}</td>
                  <td>{a.category}</td>
                  <td>{a.points}</td>
                  <td>{a.estimated} lượt</td>
                </tr>
              ))}
            </WorkflowTable>
          </Panel>
          {['DRAFT', 'PLAN_REVIEW', 'REVISION'].includes(activity.state) && (
            <Panel title="Bổ sung action trước duyệt kế hoạch">
              <WorkflowBody>
                <form
                  className="activity-workflow-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    send('ADD_ACTION', newAction);
                  }}
                >
                  <Field label="Tên action bổ sung">
                    <input
                      required
                      value={newAction.title}
                      onChange={(e) => setNewAction({ ...newAction, title: e.target.value })}
                    />
                  </Field>
                  <Field label="Nhóm action bổ sung">
                    <select
                      value={newAction.category}
                      onChange={(e) => setNewAction({ ...newAction, category: e.target.value })}
                    >
                      {['Học thuật', 'Kỹ năng', 'Cộng đồng', 'Thể chất', 'Toàn cầu', 'Đạo đức'].map(
                        (s) => (
                          <option key={s}>{s}</option>
                        ),
                      )}
                    </select>
                  </Field>
                  <Field label="Điểm thô / lượt action bổ sung">
                    <input
                      type="number"
                      required
                      min="1"
                      value={newAction.points}
                      onChange={(e) => setNewAction({ ...newAction, points: e.target.value })}
                    />
                  </Field>
                  <Field label="Lượt dự kiến action bổ sung">
                    <input
                      type="number"
                      required
                      min="1"
                      step="1"
                      value={newAction.estimated}
                      onChange={(e) => setNewAction({ ...newAction, estimated: e.target.value })}
                    />
                  </Field>
                  <Button type="submit" disabled={!canWrite}>
                    Thêm action vào kế hoạch
                  </Button>
                </form>
              </WorkflowBody>
            </Panel>
          )}
          {['PLAN_REVIEW', 'REVISION', 'EXECUTING', 'SETTLEMENT_REVIEW'].includes(
            activity.state,
          ) && (
            <Panel title="Xử lý bước hiện tại">
              <WorkflowBody>
                <Field label="Nhận xét / lý do / thuyết minh bổ sung">
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    minLength={5}
                  />
                </Field>
                {activity.state === 'PLAN_REVIEW' && (
                  <WorkflowActions>
                    <Button
                      disabled={!canWrite || reason.trim().length < 5}
                      variant="primary"
                      onClick={() => send('REVIEW_PLAN', { decision: 'APPROVED' })}
                    >
                      Duyệt kế hoạch · lần 1
                    </Button>
                    <Button
                      disabled={!canWrite || reason.trim().length < 5}
                      onClick={() => send('REVIEW_PLAN', { decision: 'REVISION' })}
                    >
                      Yêu cầu chỉnh sửa
                    </Button>
                    <Button
                      disabled={!canWrite || reason.trim().length < 5}
                      variant="danger-soft"
                      onClick={() => send('REVIEW_PLAN', { decision: 'REJECTED' })}
                    >
                      Từ chối
                    </Button>
                  </WorkflowActions>
                )}
                {activity.state === 'REVISION' && (
                  <Button
                    disabled={!canWrite || reason.trim().length < 5}
                    onClick={() => send('RESUBMIT')}
                  >
                    Mô phỏng CLB sửa thuyết minh và gửi lại
                  </Button>
                )}
                {activity.state === 'EXECUTING' && (
                  <WorkflowActions>
                    <Button
                      disabled={!canWrite || !xpReportCurrent(activity) || reason.trim().length < 5}
                      variant="primary"
                      onClick={() => send('SUBMIT_CLOSING')}
                    >
                      Lập báo cáo kết thúc & chốt snapshot
                    </Button>
                    <Button disabled={!canWrite} onClick={() => send('SET_PUBLICATION')}>
                      {activity.published ? 'Tạm ẩn công bố' : 'Công bố lại'} · mô phỏng
                    </Button>
                  </WorkflowActions>
                )}
                {activity.state === 'SETTLEMENT_REVIEW' && (
                  <>
                    <p>
                      Snapshot minh chứng chỉ đọc. Trả về bước thực hiện nếu cần bổ sung; không sửa
                      trực tiếp điểm đã chốt.
                    </p>
                    {activity.school && (
                      <label className="activity-workflow-consent">
                        <input
                          type="checkbox"
                          checked={independent}
                          onChange={(e) => setIndependent(e.target.checked)}
                        />{' '}
                        Mô phỏng một CTSV độc lập xét duyệt kết quả của người tổ chức.
                      </label>
                    )}
                    <WorkflowActions>
                      <Button
                        disabled={
                          !canWrite || reason.trim().length < 5 || (activity.school && !independent)
                        }
                        variant="primary"
                        onClick={() =>
                          send('APPROVE_CLOSING', {
                            simulateIndependentReviewer: activity.school && independent,
                          })
                        }
                      >
                        Duyệt quyết toán · ghi sổ mô phỏng
                      </Button>
                      <Button
                        disabled={!canWrite || reason.trim().length < 5}
                        onClick={() => send('RETURN_CLOSING')}
                      >
                        Trả bổ sung minh chứng
                      </Button>
                    </WorkflowActions>
                  </>
                )}
              </WorkflowBody>
            </Panel>
          )}
          {(activity.state === 'APPROVED' || (activity.school && activity.state === 'DRAFT')) && (
            <Panel title="Công bố hoạt động">
              <WorkflowBody>
                <p>
                  {activity.school
                    ? 'Hoạt động nhà trường không cần duyệt kế hoạch của CLB.'
                    : 'Kế hoạch đã duyệt nhưng chưa công bố cho sinh viên.'}
                </p>
                <Button variant="primary" disabled={!canWrite} onClick={() => send('PUBLISH')}>
                  {activity.school ? 'CTSV công bố · mô phỏng' : 'Mô phỏng CLB công bố hoạt động'}
                </Button>
              </WorkflowBody>
            </Panel>
          )}
          {activity.state === 'EXECUTING' && (
            <Panel title="Ghi nhận tham gia / phần việc">
              <WorkflowBody>
                <form
                  className="activity-workflow-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    send('ADD_EVIDENCE', {
                      ...evidence,
                      actionId: evidenceActionId,
                    });
                  }}
                >
                  <Field label="Sinh viên trong roster mô phỏng">
                    <select
                      value={evidence.studentCode}
                      onChange={(e) => setEvidence((p) => ({ ...p, studentCode: e.target.value }))}
                    >
                      {scope.roster
                        .filter((r) => r.active)
                        .map((r) => (
                          <option key={r.studentCode} value={r.studentCode}>
                            {r.studentCode} · {r.fullName}
                          </option>
                        ))}
                    </select>
                  </Field>
                  <Field label="Số lượt hoàn thành">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={evidence.quantity}
                      onChange={(e) => setEvidence((p) => ({ ...p, quantity: e.target.value }))}
                    />
                  </Field>
                  <Field label="Action đã hoàn thành">
                    <select
                      value={evidenceActionId}
                      onChange={(e) => setEvidence((p) => ({ ...p, actionId: e.target.value }))}
                    >
                      {activity.actions.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.title} · {a.points} điểm/lượt
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Minh chứng mô phỏng">
                    <input
                      required
                      value={evidence.evidence}
                      onChange={(e) => setEvidence((p) => ({ ...p, evidence: e.target.value }))}
                    />
                  </Field>
                  <Button type="submit" disabled={!canWrite}>
                    Ghi nhận điểm chờ · mô phỏng
                  </Button>
                </form>
              </WorkflowBody>
            </Panel>
          )}
          <Panel title="Minh chứng & điểm chờ">
            <WorkflowTable
              label="Snapshot tham gia"
              columns={['Sinh viên', 'Action / nguồn', 'Số lượt', 'Điểm thô', 'Minh chứng']}
            >
              {activity.awards.map((a) => (
                <tr key={a.id}>
                  <td>{a.studentCode}</td>
                  <td>
                    {activity.actions.find((rule) => rule.id === a.actionId)?.title}
                    <small>{a.id}</small>
                  </td>
                  <td>{a.quantity}</td>
                  <td>{a.rawPoints}</td>
                  <td>{a.evidence}</td>
                </tr>
              ))}
              {!activity.awards.length && (
                <tr>
                  <td colSpan={5}>Chưa ghi nhận tham gia.</td>
                </tr>
              )}
            </WorkflowTable>
          </Panel>
          <XpReport key={activity.id} activity={activity} send={send} />
          {['DRAFT', 'PLAN_REVIEW', 'REVISION', 'APPROVED', 'EXECUTING'].includes(
            activity.state,
          ) && (
            <Panel title="Không tổ chức">
              <WorkflowBody>
                <p>Hủy hoạt động mô phỏng và hoàn phần bonus chưa tiêu thụ đúng một lần.</p>
                <Field label="Lý do không tổ chức">
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} />
                </Field>
                <Button
                  variant="danger-soft"
                  disabled={!canWrite || reason.trim().length < 5}
                  onClick={() => send('CANCEL_ACTIVITY')}
                >
                  Xác nhận không tổ chức · mô phỏng
                </Button>
              </WorkflowBody>
            </Panel>
          )}
          <Panel title="Lịch sử hồ sơ">
            <WorkflowBody>
              <WorkflowHistory rows={activity.history} />
            </WorkflowBody>
          </Panel>
          {activity.state === 'COMPLETED' && (
            <Link
              className="activity-workflow-record"
              to="/ctsv/monitoring?view=reconciliation&source=mock"
            >
              Mở đối soát sổ mô phỏng →
            </Link>
          )}
        </>
      )}
      {creating && (
        <Modal
          wide
          title={school ? 'Tạo hoạt động cấp trường · mô phỏng' : 'Mô phỏng hồ sơ CLB gửi'}
          onClose={() => setCreating(false)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              command('CREATE_ACTIVITY', { ...form, clubId: fixedClubId || form.clubId, school });
              setCreating(false);
            }}
          >
            <WorkflowBody>
              <WorkflowGrid>
                <Field label="Tên hoạt động">
                  <input required {...bind('title')} />
                </Field>
                {!school && (
                  <Field label="CLB mô phỏng">
                    <select {...bind('clubId')} disabled={!!fixedClubId}>
                      {scope.clubs
                        .filter(
                          (c) => c.status === 'ACTIVE' && (!fixedClubId || c.id === fixedClubId),
                        )
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                  </Field>
                )}
                <Field label="Action">
                  <input required {...bind('actionTitle')} />
                </Field>
                <Field label="Nhóm trải nghiệm">
                  <select {...bind('category')}>
                    {['Học thuật', 'Kỹ năng', 'Cộng đồng', 'Thể chất', 'Toàn cầu', 'Đạo đức'].map(
                      (x) => (
                        <option key={x}>{x}</option>
                      ),
                    )}
                  </select>
                </Field>
                <Field label="Điểm thô mỗi lượt · mẫu">
                  <input required type="number" min="1" {...bind('points')} />
                </Field>
                <Field label="Số lượt dự kiến">
                  <input required type="number" min="1" step="1" {...bind('estimated')} />
                </Field>
                <Field label="Hạn xử lý">
                  <input type="date" {...bind('deadline')} />
                </Field>
              </WorkflowGrid>
              <Field label="Thuyết minh">
                <textarea {...bind('narrative')} />
              </Field>
              <p>
                Ngân sách dự kiến: {Number(form.points) * Number(form.estimated) || 0} điểm thô mô
                phỏng.
              </p>
              <WorkflowActions>
                <Button type="button" onClick={() => setCreating(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={!canWrite} variant="primary">
                  Lưu hồ sơ mô phỏng
                </Button>
              </WorkflowActions>
            </WorkflowBody>
          </form>
        </Modal>
      )}
    </div>
  );
}
function nextAction(state) {
  return {
    DRAFT: 'CTSV tổ chức: công bố khi kế hoạch sẵn sàng',
    PLAN_REVIEW: 'CTSV kiểm tra kế hoạch, action và ngân sách',
    REVISION: 'CLB bổ sung theo phản hồi và gửi lại',
    REJECTED: 'Hồ sơ đã từ chối; xem lý do trong lịch sử',
    APPROVED: 'CLB công bố để bắt đầu thực hiện',
    EXECUTING: 'Ghi minh chứng, hoàn thành hoạt động và lập báo cáo',
    SETTLEMENT_REVIEW: 'CTSV độc lập kiểm tra snapshot điểm thực tế',
    COMPLETED: 'Theo dõi sổ mô phỏng và đối soát nguồn',
    NOT_HELD: 'Đã ngừng tổ chức; kiểm tra lịch sử hoàn bonus',
  }[state];
}
