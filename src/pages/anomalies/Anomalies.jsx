import './Anomalies.css';
import { useEffect, useState } from 'react';
import api from '../../services/api.js';
import { ChevronRight, CircleAlert, ShieldAlert, ShieldCheck } from 'lucide-react';
import {
  Badge,
  Button,
  Empty,
  Field,
  Modal,
  PageHeader,
  Panel,
  StatCard,
  Tabs,
} from '../../components/ui/index.js';

export function Anomalies() {
  const [anomalies, setAnomalies] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const [tab, setTab] = useState('open');
  const [item, setItem] = useState(null);
  const [decision, setDecision] = useState('keep');
  const [reason, setReason] = useState('');
  const [adjustment, setAdjustment] = useState(0);
  const [loading, setLoading] = useState(true);

  const cases = anomalies.filter((a) => tab === 'all' || a.status === tab);

  // Fetch anomalies from API on mount
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([api.studentAffairs.anomalies.list(), api.studentAffairs.ledger.list()])
      .then(([response, ledgerResponse]) => {
        if (!active) return;
        setLedger(Array.isArray(ledgerResponse) ? ledgerResponse : ledgerResponse?.items || []);
        const items = Array.isArray(response) ? response : response?.items || [];
        setAnomalies(items.map((item) => ({ ...item, status: String(item.status).toLowerCase() })));
      })
      .catch((err) => {
        if (active) {
          setAnomalies([]);
          setError(err.message || 'Không thể tải bất thường.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [version]);

  // Stats
  const openCount = anomalies.filter((a) => a.status === 'open').length;
  const highSeverityCount = anomalies.filter(
    (a) => a.status === 'open' && a.severity === 'high',
  ).length;
  const resolvedCount = anomalies.filter((a) => a.status === 'resolved').length;

  function submit(event) {
    event.preventDefault();
    // A local ledger must never impersonate a server-side moderation decision.
  }

  return (
    <>
      <PageHeader
        eyebrow="MINH BẠCH TRONG TỪNG GHI NHẬN"
        title="Kiểm duyệt bất thường"
        description="Kiểm tra minh chứng, ghi nhận quyết định và bảo vệ tính toàn vẹn của XP."
      />

      <p className="anomalies-description">
        Chế độ chỉ xem. Chức năng lưu quyết định đang chờ kết nối máy chủ.
      </p>
      {error && (
        <div role="alert" className="anomalies-content">
          <p>{error}</p>
          <Button onClick={() => setVersion((value) => value + 1)}>Thử lại</Button>
        </div>
      )}
      {/* Stats Grid */}
      <div className="anomalies-content-2">
        <StatCard
          label="Cần xem xét"
          value={openCount}
          icon={ShieldAlert}
          note="Các trường hợp chưa có quyết định"
        />
        <StatCard
          label="Mức độ cao"
          value={highSeverityCount}
          icon={CircleAlert}
          note="Ưu tiên kiểm tra minh chứng"
          tone="red"
        />
        <StatCard
          label="Đã xử lý"
          value={resolvedCount}
          icon={ShieldCheck}
          note="Có lý do và lịch sử đối soát"
          tone="green"
        />
      </div>

      <Panel>
        {/* Tabs */}
        <Tabs
          active={tab}
          onChange={setTab}
          items={[
            { id: 'open', label: 'Cần xem xét', count: openCount },
            { id: 'resolved', label: 'Đã xử lý', count: resolvedCount },
            { id: 'ledger', label: 'Sổ cái XP', count: ledger?.length || 0 },
          ]}
        />

        {/* Ledger Table */}
        {tab === 'ledger' ? (
          <div className="anomalies-content-3">
            <table className="anomalies-table">
              <thead>
                <tr>
                  <th className="anomalies-column">BÚT TOÁN</th>
                  <th className="anomalies-column">NGUỒN GHI NHẬN</th>
                  <th className="anomalies-column">XP</th>
                  <th className="anomalies-column">PHIÊN BẢN</th>
                  <th className="anomalies-column">LÝ DO</th>
                </tr>
              </thead>
              <tbody>
                {ledger && ledger.length > 0 ? (
                  ledger.map((entry) => (
                    <tr key={entry.id}>
                      <td className="anomalies-cell">
                        <Badge tone={entry.type === 'award' ? 'green' : 'orange'}>
                          {entry.type === 'award' ? 'Ghi nhận gốc' : 'Điều chỉnh'}
                        </Badge>
                        <span className="anomalies-text">{entry.id?.slice(0, 12)}</span>
                      </td>
                      <td className="anomalies-cell-2">
                        {entry.source}
                        <span className="anomalies-text">{entry.actor}</span>
                      </td>
                      <td
                        className={`anomalies-cell-3 ${
                          entry.amount < 0
                            ? 'anomalies-cell-state-active'
                            : 'anomalies-cell-state-inactive'
                        }`}
                      >
                        {entry.amount > 0 ? '+' : ''}
                        {entry.amount}
                      </td>
                      <td className="anomalies-cell-2">v{entry.rubricVersion || 1}</td>
                      <td className="anomalies-cell-4">{entry.reason || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="anomalies-cell-5">
                      Chưa có bút toán nào trong hệ thống.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : loading ? (
          <div className="anomalies-content-4">
            <div className="anomalies-content-5" />
            Đang tải dữ liệu...
          </div>
        ) : cases.length ? (
          /* Anomaly List */
          <div className="anomalies-content-6">
            {cases.map((a) => (
              <div key={a.id} className="anomalies-content-7">
                <span
                  className={`anomalies-text-2 ${
                    a.severity === 'high'
                      ? 'anomalies-text-state-active'
                      : 'anomalies-text-state-inactive'
                  }`}
                >
                  <ShieldAlert size={23} />
                </span>
                <div className="anomalies-content-8">
                  <div className="anomalies-content-9">
                    <h3 className="anomalies-subheading">{a.title}</h3>
                    <Badge tone={a.severity === 'high' ? 'red' : 'orange'}>
                      {a.severity === 'high' ? 'Mức cao' : 'Cần kiểm tra'}
                    </Badge>
                  </div>
                  <p className="anomalies-description-2">
                    {a.club} · {a.count} lượt ghi nhận liên quan
                  </p>
                  <small className="anomalies-caption">
                    {a.time} · {a.amount} XP cần đối soát
                  </small>
                </div>
                <Button
                  onClick={() => {
                    setItem(a);
                    setReason(a.reason || '');
                    setDecision('keep');
                    setAdjustment(0);
                  }}
                  className="anomalies-button"
                >
                  {a.status === 'open' ? 'Xem xét' : 'Xem quyết định'} <ChevronRight size={15} />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <Empty
            title="Không có trường hợp trong nhóm này"
            description="Các quyết định xử lý được lưu cùng nhật ký và sổ cái XP."
          />
        )}
      </Panel>

      {/* Info Line */}
      <div className="anomalies-content-10">
        <ShieldCheck size={17} />
        <span>
          Sổ cái chỉ ghi thêm: điều chỉnh hoặc thu hồi tạo bút toán đảo, giữ nguyên dữ liệu gốc.
        </span>
      </div>

      {/* Detail Modal */}
      {item && (
        <Modal
          title={item.title}
          description={`${item.club} · ${item.source}`}
          wide
          onClose={() => setItem(null)}
        >
          <form onSubmit={submit}>
            <div className="anomalies-content-11">
              {/* Evidence Box */}
              <div className="anomalies-content-12">
                <h3 className="anomalies-subheading-2">Dữ liệu cần xác minh</h3>
                <p className="anomalies-description-3">{item.evidence}</p>
                <p className="anomalies-description-3">
                  <b className="anomalies-b">XP đang đối soát:</b> {item.amount} XP · Sinh viên:{' '}
                  {item.student}
                </p>
                <small className="anomalies-caption-2">
                  Quyết định sẽ được lưu vào nhật ký. Nếu điều chỉnh hoặc thu hồi sẽ tạo bút toán
                  đảo trong sổ cái.
                </small>
              </div>

              {item.status === 'open' ? (
                <>
                  {/* Decision Fields */}
                  <Field label="Quyết định xử lý" className="anomalies-field">
                    <select
                      value={decision}
                      onChange={(e) => setDecision(e.target.value)}
                      className="anomalies-select"
                    >
                      <option value="keep">Giữ nguyên — ghi nhận hợp lệ</option>
                      <option value="adjust">Điều chỉnh giảm XP</option>
                      <option value="revoke">Thu hồi toàn bộ XP của bút toán</option>
                    </select>
                  </Field>

                  {decision === 'adjust' && (
                    <Field label="XP hợp lệ sau điều chỉnh" className="anomalies-field">
                      <input
                        type="number"
                        required
                        min={0}
                        max={item.amount - 1}
                        step={1}
                        value={adjustment}
                        onChange={(e) => setAdjustment(e.target.value)}
                      />
                    </Field>
                  )}

                  <Field label="Lý do và kết quả kiểm tra *" className="anomalies-field">
                    <textarea
                      required
                      minLength={10}
                      maxLength={1500}
                      rows={3}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Mô tả kết quả đối chiếu, minh chứng và cơ sở đưa ra quyết định…"
                    />
                  </Field>

                  {decision !== 'keep' && (
                    <div className="anomalies-content-13">
                      Sẽ ghi thêm một bút toán{' '}
                      {decision === 'revoke' ? -item.amount : Number(adjustment) - item.amount} XP
                      liên kết với bút toán gốc. Phần điều chỉnh thuộc học kỳ của đóng góp gốc.
                    </div>
                  )}
                </>
              ) : (
                /* Resolved View */
                <div className="anomalies-content-14">
                  <h3 className="anomalies-subheading-3">Kết quả xử lý</h3>
                  <Badge tone="green">
                    {item.decision === 'keep'
                      ? 'Giữ nguyên XP'
                      : item.decision === 'adjust'
                        ? `Đã điều chỉnh còn ${item.adjustment} XP`
                        : 'Đã thu hồi XP'}
                  </Badge>
                  <p className="anomalies-description-4">{item.reason}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="anomalies-content-15">
              <Button type="button" onClick={() => setItem(null)}>
                Đóng
              </Button>
              {item.status === 'open' && (
                <Button disabled type="submit" variant="primary" icon={ShieldCheck}>
                  Xác nhận quyết định
                </Button>
              )}
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function mapAnomalyFromApi(a) {
  return {
    id: String(a.id),
    title: a.ruleTriggered || `Bất thường ${String(a.id).slice(0, 8)}`,
    club: a.campusCode || 'FPTU',
    source: a.pillarCategory || a.source || 'Hoạt động',
    amount: Number(a.amount) || 0,
    student: a.studentName || `Sinh viên #${a.studentUserId}`,
    evidence: a.reason || 'Dữ liệu phát hiện tự động bởi hệ thống kiểm soát',
    severity: String(a.severity || 'high').toLowerCase(),
    status: String(a.status || 'open').toLowerCase(),
    decision: a.decision,
    reason: a.reason,
    rule: a.ruleTriggered,
    deviation: a.deviation,
  };
}
