import './LeadershipWorkflow.css';
import { useState } from 'react';
import { useWorkflow } from '../../../workflows/WorkflowContext.jsx';
import { Button, Field, Panel, Badge } from '../../ui/index.js';
import {
  WorkflowActions,
  WorkflowBody,
  WorkflowGrid,
  WorkflowTable,
} from '../workflow-primitives/WorkflowPrimitives.jsx';

export default function LeadershipWorkflow({ clubId: fixedClubId } = {}) {
  const { scope, command, canWrite } = useWorkflow();
  const [clubId, setClub] = useState(fixedClubId || 'mock-art'),
    [studentCode, setStudent] = useState('MOCK-SE003'),
    [reason, setReason] = useState('');
  const clubs = scope.clubs.filter((c) => !fixedClubId || c.id === fixedClubId);
  const nominations = scope.nominations.filter((n) => !fixedClubId || n.clubId === fixedClubId);
  const eligible = clubs.filter(
    (c) => !scope.roster.some((r) => r.studentCode === c.leader && r.active),
  );
  return (
    <div className="leadership-workflow">
      <Panel title="Lãnh đạo & tình trạng CLB · mô phỏng">
        <WorkflowTable
          label="Lãnh đạo mô phỏng"
          columns={['CLB', 'Chủ nhiệm', 'Phó chủ nhiệm', 'Trạng thái']}
        >
          {clubs.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>{c.leader || 'Chưa bổ nhiệm'}</td>
              <td>{c.vice || 'Chưa bổ nhiệm'}</td>
              <td>
                <Badge tone={c.status === 'ACTIVE' ? 'green' : 'orange'}>
                  {c.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm dừng'}
                </Badge>
              </td>
            </tr>
          ))}
        </WorkflowTable>
      </Panel>
      <Panel
        title="Đề cử kế nhiệm khẩn cấp"
        description="Xử lý đơn chuyển chủ nhiệm tại mục Hồ sơ & yêu cầu."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            command('NOMINATE', { clubId, studentCode, reason });
          }}
        >
          <WorkflowBody>
            <WorkflowGrid>
              <Field label="CLB có chủ nhiệm không còn đủ điều kiện">
                <select
                  required
                  disabled={!!fixedClubId}
                  value={clubId}
                  onChange={(e) => setClub(e.target.value)}
                >
                  <option value="">Chọn CLB</option>
                  {eligible.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Ứng viên đang học · gồm cả người chưa thuộc CLB">
                <select required value={studentCode} onChange={(e) => setStudent(e.target.value)}>
                  {scope.roster
                    .filter((r) => r.active)
                    .map((r) => (
                      <option key={r.studentCode} value={r.studentCode}>
                        {r.studentCode} · {r.fullName}
                      </option>
                    ))}
                </select>
              </Field>
            </WorkflowGrid>
            <Field label="Lý do đề cử">
              <textarea
                required
                minLength={5}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
            <Button
              type="submit"
              disabled={!canWrite || !eligible.length || reason.trim().length < 5}
              variant="primary"
            >
              Gửi đề cử mô phỏng · chưa cấp quyền
            </Button>
          </WorkflowBody>
        </form>
      </Panel>
      <Panel title="Chờ người được đề cử chấp nhận">
        <WorkflowBody>
          {nominations.length ? (
            nominations.map((n) => (
              <article className="leadership-workflow-nomination" key={n.id}>
                <h3>
                  {scope.clubs.find((c) => c.id === n.clubId)?.name} → {n.studentCode}
                </h3>
                <p>{n.reason}</p>
                <Badge>
                  {{
                    PENDING: 'Chờ ứng viên phản hồi',
                    ACCEPTED: 'Đã chấp nhận',
                    DECLINED: 'Đã từ chối',
                  }[n.status] || n.status}
                </Badge>
                {n.status === 'PENDING' && (
                  <WorkflowActions>
                    <Button
                      disabled={!canWrite}
                      onClick={() =>
                        command('ACCEPT_NOMINATION', { nominationId: n.id, simulatedConsent: true })
                      }
                    >
                      Mô phỏng ứng viên chấp nhận & khôi phục CLB
                    </Button>
                    <Button
                      disabled={!canWrite}
                      onClick={() =>
                        command('DECLINE_NOMINATION', {
                          nominationId: n.id,
                          simulatedConsent: true,
                        })
                      }
                    >
                      Mô phỏng ứng viên từ chối
                    </Button>
                  </WorkflowActions>
                )}
              </article>
            ))
          ) : (
            <p>Chưa có đề cử trong phiên mô phỏng.</p>
          )}
        </WorkflowBody>
      </Panel>
    </div>
  );
}
