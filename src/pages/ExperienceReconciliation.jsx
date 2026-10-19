import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import { useOperationQuery } from '../hooks/useOperationQuery.js';
import { Button, Field, PageHeader, Panel } from '../components/ui/index.js';
import { OperationState } from '../components/operations/OperationState.jsx';
import { date } from '../utils/format.js';

export function ExperienceReconciliation() {
  const { user } = useAuth();
  const [draft, setDraft] = useState(''),
    [id, setId] = useState('');
  const result = useOperationQuery(
    () => (id ? api.get(`/api/contributions/${encodeURIComponent(id)}`) : null),
    `${user?.id}:${id}`,
  );
  const detail = result.data,
    row = detail?.contribution;
  return (
    <>
      <PageHeader
        title="Đối soát trải nghiệm"
        description="Đọc nguồn đóng góp, quyết định xác minh và các bút toán điều chỉnh trong phạm vi được cấp quyền."
      />
      <Panel title="Tra cứu nguồn đóng góp">
        <form
          className="flex flex-wrap gap-3 items-end p-5"
          onSubmit={(event) => {
            event.preventDefault();
            setId(draft.trim());
          }}
        >
          <Field label="Mã đóng góp" className="flex-1">
            <input
              required
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={100}
            />
          </Field>
          <Button type="submit">Tra cứu</Button>
          <Link className="operation-link" to="/ctsv/anomalies">
            Kiểm duyệt bất thường
          </Link>
        </form>
      </Panel>
      <p className="text-xs text-muted my-4">
        Tra cứu theo mã nguồn từ hồ sơ trải nghiệm. Chưa có báo cáo tổng hợp đối chiếu roster,
        chuyển kỳ và ví điểm; dữ liệu bên dưới không thay thế báo cáo đó.
      </p>
      {id && (
        <OperationState {...result} onRetry={result.retry}>
          {row && (
            <div className="space-y-5">
              <Panel title={row.title}>
                <dl className="operation-definition p-5">
                  {Object.entries({
                    'Sinh viên': row.userId,
                    'Học kỳ': row.semesterId,
                    'Trạng thái': row.status,
                    'Điểm thô': row.rawPoints,
                    'Loại nguồn': row.sourceType,
                  }).map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value ?? '—'}</dd>
                    </div>
                  ))}
                </dl>
              </Panel>
              <Panel title="Lịch sử quyết định">
                <div className="p-5 space-y-4">
                  {detail.decisions?.length ? (
                    detail.decisions.map((item) => (
                      <article key={item.id}>
                        <h3>{item.decision}</h3>
                        <p>{item.reason}</p>
                        <p className="text-xs text-muted">{date(item.createdAtUtc)}</p>
                      </article>
                    ))
                  ) : (
                    <p>Chưa có quyết định.</p>
                  )}
                </div>
              </Panel>
              <Panel title="Biến động điểm">
                <div className="p-5 space-y-4">
                  {detail.ledgerEffects?.length ? (
                    detail.ledgerEffects.map((item) => (
                      <article key={item.id} className="break-words">
                        <h3>
                          {item.effectType} · {item.deltaAmount}
                        </h3>
                        <p>{item.reason}</p>
                        <p className="text-xs text-muted">
                          Chính sách {item.policyVersion || '—'} · {item.formulaVersion} ·{' '}
                          {date(item.recordedAt)}
                        </p>
                      </article>
                    ))
                  ) : (
                    <p>Chưa có bút toán ghi nhận.</p>
                  )}
                </div>
              </Panel>
            </div>
          )}
          {!row && result.data && (
            <p role="alert">Nguồn trả về chưa có chi tiết đóng góp hợp lệ.</p>
          )}
        </OperationState>
      )}
    </>
  );
}
