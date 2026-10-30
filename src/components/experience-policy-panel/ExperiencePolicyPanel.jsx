import './ExperiencePolicyPanel.css';
import { useEffect, useRef, useState } from 'react';
import api, { workflowRequest } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { isAdmin } from '../../utils/access.js';
import { Button, Field, Panel } from '../ui/index.js';

export default function ExperiencePolicyPanel({ benchmarkId, onChanged, historyOnly = false }) {
  const { user } = useAuth();
  const [policy, setPolicy] = useState(null),
    [attempt, retry] = useState(0),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const [basis, setBasis] = useState(''),
    [agreed, setAgreed] = useState(false),
    [environment, setEnvironment] = useState('PROJECT'),
    [scope, setScope] = useState('PERIOD'),
    [effectiveAt, setEffectiveAt] = useState('');
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    setPolicy(null);
    setError('');
    setAgreed(false);
    if (!benchmarkId) return undefined;
    api.get(`/api/v1/student-affairs/benchmarks/${benchmarkId}/policy`).then(
      (data) => {
        if (active) setPolicy(data);
      },
      (issue) => {
        if (active) setError(issue.message);
      },
    );
    return () => {
      active = false;
    };
  }, [benchmarkId, attempt]);
  const run = async (operation) => {
    if (lock.current || !policy || !isAdmin(user)) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const body =
        operation === 'draft'
          ? { expectedVersion: policy.version, reason: basis }
          : {
              expectedVersion: policy.version,
              approvalBasis: basis,
              parametersP01ThroughP06Agreed: agreed,
              environment,
              scope,
              cancellationRule: 'REVERSE_SOURCE_INVALIDATION',
              ...(effectiveAt
                ? { effectiveAt: new Date(`${effectiveAt}:00+07:00`).toISOString() }
                : {}),
            };
      await workflowRequest(
        `/api/v1/student-affairs/benchmarks/${benchmarkId}/${operation}`,
        'POST',
        body,
      );
      retry((value) => value + 1);
      setBasis('');
      onChanged?.();
    } catch (issue) {
      setError(issue.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  if (!benchmarkId) return null;
  return (
    <Panel
      title={
        historyOnly ? 'Lịch sử chính sách' : 'Phiên bản chính sách trải nghiệm'
      }
      description="Lưu snapshot đã phê duyệt riêng với thao tác khóa benchmark. Phê duyệt chỉ được gửi khi người vận hành xác nhận các tham số đã thống nhất."
    >
      <div className="experience-policy-panel-content">
        {error && <p role="alert">{error}</p>}
        {!policy && !error && <p role="status">Đang tải chính sách…</p>}
        <Button disabled={busy} onClick={() => retry((value) => value + 1)}>
          Tải lại
        </Button>
        {policy && (
          <>
            <p>Trạng thái: {policy.approvalStatus}</p>
            {policy.versions?.map((version) => (
              <article className="experience-policy-panel-card" key={version.policyVersion}>
                <p>
                  {version.environment} · {version.scope} · {version.semesterId} ·{' '}
                  {version.effectiveAt}
                </p>
                <p>{version.approvalBasis}</p>
                <small>Phiên bản {version.policyVersion}</small>
              </article>
            ))}
            {isAdmin(user) && !historyOnly && (
              <fieldset disabled={busy} className="experience-policy-panel-fieldset">
                <Field label="Cơ sở phê duyệt / lý do mở bản nháp">
                  <textarea
                    required
                    maxLength={1000}
                    value={basis}
                    onChange={(event) => setBasis(event.target.value)}
                  />
                </Field>
                <Field label="Môi trường">
                  <select
                    value={environment}
                    onChange={(event) => setEnvironment(event.target.value)}
                  >
                    <option value="PROJECT">Project</option>
                    <option value="DEMO">Demo</option>
                  </select>
                </Field>
                <Field label="Phạm vi">
                  <select value={scope} onChange={(event) => setScope(event.target.value)}>
                    <option value="PERIOD">Theo học kỳ</option>
                    <option value="CUMULATIVE">Tích lũy</option>
                  </select>
                </Field>
                <Field label="Có hiệu lực từ (giờ Việt Nam, để trống dùng thời điểm phê duyệt)">
                  <input
                    type="datetime-local"
                    value={effectiveAt}
                    onChange={(event) => setEffectiveAt(event.target.value)}
                  />
                </Field>
                <label>
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(event) => setAgreed(event.target.checked)}
                  />
                  Tôi xác nhận các tham số P01–P06 đã được thống nhất theo cơ sở nêu trên.
                </label>
                {policy.approvalStatus === 'APPROVED' ? (
                  <Button disabled={!basis.trim()} onClick={() => run('draft')}>
                    Mở bản nháp mới
                  </Button>
                ) : (
                  <Button disabled={!agreed || !basis.trim()} onClick={() => run('approval')}>
                    Phê duyệt snapshot chính sách
                  </Button>
                )}
              </fieldset>
            )}
          </>
        )}
      </div>
    </Panel>
  );
}
