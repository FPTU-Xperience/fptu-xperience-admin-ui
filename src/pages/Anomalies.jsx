import { useState } from 'react';
import { ChevronRight, CircleAlert, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import { date, number } from '../utils/format.js';
import { resolveAnomaly } from '../utils/governance.js';
import { useAction } from '../hooks/useAction.js';
import { Badge, Button, Empty, Field, Modal, PageHeader, Panel, StatCard, Tabs } from '../components/ui/index.js';

export function Anomalies() {
  const { state, commit, season } = useWorkspace();
  const run = useAction();
  const [tab, setTab] = useState('open');
  const [item, setItem] = useState(null);
  const [decision, setDecision] = useState('keep');
  const [reason, setReason] = useState('');
  const [adjustment, setAdjustment] = useState(0);
  const cases = state.anomalies.filter((a) => tab === 'all' || a.status === tab);
  async function submit(e) {
    e.preventDefault();
    const ok = await run(
      () =>
        commit(
          'Xử lý bất thường XP',
          `${item.title}: ${decision} · ${reason.trim()}`,
          'affairs',
          (draft) =>
            resolveAnomaly(
              draft,
              item.id,
              decision,
              reason,
              adjustment,
              season,
              'Nguyễn Hà Linh · CTSV',
            ),
        ),
      'Đã lưu quyết định và ghi nhật ký đối soát.',
    );
    if (ok) setItem(null);
  }
  return (
    <>
      <PageHeader
        eyebrow="MINH BẠCH TRONG TỪNG GHI NHẬN"
        title="Kiểm duyệt bất thường"
        description="Kiểm tra minh chứng, ghi nhận quyết định và bảo vệ tính toàn vẹn của XP."
      />
      <div className="stats-grid three">
        <StatCard
          label="Cần xem xét"
          value={state.anomalies.filter((a) => a.status === 'open').length}
          icon={ShieldAlert}
          note="Các trường hợp chưa có quyết định"
        />
        <StatCard
          label="Mức độ cao"
          value={state.anomalies.filter((a) => a.status === 'open' && a.severity === 'high').length}
          icon={CircleAlert}
          note="Ưu tiên kiểm tra minh chứng"
          tone="red"
        />
        <StatCard
          label="Đã xử lý"
          value={state.anomalies.filter((a) => a.status === 'resolved').length}
          icon={ShieldCheck}
          note="Có lý do và lịch sử đối soát"
          tone="green"
        />
      </div>
      <Panel>
        <Tabs
          active={tab}
          onChange={setTab}
          items={[
            { id: 'open', label: 'Cần xem xét' },
            { id: 'resolved', label: 'Đã xử lý' },
            { id: 'ledger', label: 'Sổ cái XP' },
          ]}
        />
        {tab === 'ledger' ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>BÚT TOÁN</th>
                  <th>NGUỒN GHI NHẬN</th>
                  <th>XP</th>
                  <th>PHIÊN BẢN</th>
                  <th>LÝ DO</th>
                </tr>
              </thead>
              <tbody>
                {state.ledger.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <Badge tone={entry.type === 'award' ? 'green' : 'orange'}>
                        {entry.type === 'award' ? 'Ghi nhận gốc' : 'Điều chỉnh'}
                      </Badge>
                      <small className="cell-sub">{entry.id.slice(0, 12)}</small>
                    </td>
                    <td>
                      {entry.source}
                      <small className="cell-sub">{entry.actor}</small>
                      {entry.originalId && (
                        <small className="cell-sub">Tham chiếu: {entry.originalId}</small>
                      )}
                    </td>
                    <td className={entry.amount < 0 ? 'orange-text' : 'green-text'}>
                      <b>
                        {entry.amount > 0 ? '+' : ''}
                        {entry.amount}
                      </b>
                    </td>
                    <td>v{entry.rubricVersion}</td>
                    <td className="wrap-cell">{entry.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : cases.length ? (
          <div className="anomaly-list">
            {cases.map((a) => (
              <div className="anomaly-row" key={a.id}>
                <span className={`anomaly-icon ${a.severity}`}>
                  <ShieldAlert size={23} />
                </span>
                <div>
                  <div className="anomaly-title">
                    <h3>{a.title}</h3>
                    <Badge tone={a.severity === 'high' ? 'red' : 'orange'}>
                      {a.severity === 'high' ? 'Mức cao' : 'Cần kiểm tra'}
                    </Badge>
                  </div>
                  <p>
                    {a.club} · {a.count} lượt ghi nhận liên quan
                  </p>
                  <small>
                    {date(a.time)} · {a.amount} XP cần đối soát · Fall 2026
                  </small>
                </div>
                <Button
                  onClick={() => {
                    setItem(a);
                    setReason(a.reason || '');
                    setDecision('keep');
                    setAdjustment(0);
                  }}
                >
                  {a.status === 'open' ? 'Xem xét' : 'Xem quyết định'}
                  <ChevronRight size={15} />
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
      <div className="info-line">
        <ShieldCheck size={17} />
        Sổ cái chỉ ghi thêm: điều chỉnh hoặc thu hồi tạo bút toán đảo, giữ nguyên dữ liệu gốc.
      </div>
      {item && (
        <Modal
          title={item.title}
          description={`${item.club} · ${item.source}`}
          wide
          onClose={() => setItem(null)}
        >
          <form onSubmit={submit}>
            <div className="modal-body detail-content">
              <div className="evidence-box">
                <h3>Dữ liệu cần xác minh</h3>
                <p>{item.evidence}</p>
                <p>
                  <b>XP đang đối soát:</b> {item.amount} XP · Sinh viên:{' '}
                  {state.accounts.find((a) => a.id === item.student)?.username || item.student}
                </p>
                <small>
                  Đây là trường hợp minh họa. Quyết định chỉ áp dụng cho bút toán được liên kết
                  trong sổ cái.
                </small>
              </div>
              {item.status === 'open' ? (
                <>
                  <Field label="Quyết định xử lý">
                    <select value={decision} onChange={(e) => setDecision(e.target.value)}>
                      <option value="keep">Giữ nguyên — ghi nhận hợp lệ</option>
                      <option value="adjust">Điều chỉnh giảm XP</option>
                      <option value="revoke">Thu hồi toàn bộ XP của bút toán</option>
                    </select>
                  </Field>
                  {decision === 'adjust' && (
                    <Field label="XP hợp lệ sau điều chỉnh">
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
                  <Field label="Lý do và kết quả kiểm tra *">
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
                    <div className="warning-box">
                      Sẽ ghi thêm một bút toán{' '}
                      {decision === 'revoke' ? -item.amount : Number(adjustment) - item.amount} XP
                      liên kết với bút toán gốc. Phần điều chỉnh thuộc học kỳ của đóng góp gốc.
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h3>Kết quả xử lý</h3>
                  <Badge tone="green">
                    {item.decision === 'keep'
                      ? 'Giữ nguyên XP'
                      : item.decision === 'adjust'
                        ? 'Đã điều chỉnh XP'
                        : 'Đã thu hồi XP'}
                  </Badge>
                  <p>{item.reason}</p>
                  <small>Ngày xử lý: {date(item.resolvedAt)}</small>
                </>
              )}
            </div>
            <div className="modal-footer">
              <Button type="button" onClick={() => setItem(null)}>
                Đóng
              </Button>
              {item.status === 'open' && (
                <Button type="submit" variant="primary" icon={ShieldCheck}>
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
