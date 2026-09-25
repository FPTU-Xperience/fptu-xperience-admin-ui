import { useState } from 'react';
import { ChevronRight, CircleAlert, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useAction } from '../hooks/useAction.js';
import { Badge, Button, Empty, Field, Modal, PageHeader, Panel, StatCard, Tabs } from '../components/ui/index.js';

export function Anomalies() {
  const run = useAction();
  const [tab, setTab] = useState('open');
  const [item, setItem] = useState(null);
  const [decision, setDecision] = useState('keep');
  const [reason, setReason] = useState('');
  const [adjustment, setAdjustment] = useState(0);

  // Note: Backend doesn't have a dedicated anomalies endpoint
  // This module uses local state for now
  const [anomalies] = useState([]);
  const [ledger] = useState([]);

  const cases = anomalies.filter((a) => tab === 'all' || a.status === tab);

  // Stats
  const openCount = anomalies.filter((a) => a.status === 'open').length;
  const highSeverityCount = anomalies.filter((a) => a.status === 'open' && a.severity === 'high').length;
  const resolvedCount = anomalies.filter((a) => a.status === 'resolved').length;

  async function submit(e) {
    e.preventDefault();
    await run(
      () => {
        // In production, this would call an API endpoint
        // For now, just close the modal
        setItem(null);
      },
      'Đã lưu quyết định.',
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="MINH BẠCH TRONG TỪNG GHI NHẬN"
        title="Kiểm duyệt bất thường"
        description="Kiểm tra minh chứng, ghi nhận quyết định và bảo vệ tính toàn vẹn của XP."
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
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
            { id: 'ledger', label: 'Sổ cái XP' },
          ]}
        />

        {/* Ledger Table */}
        {tab === 'ledger' ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left whitespace-nowrap">
              <thead>
                <tr>
                  <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
                    BÚT TOÁN
                  </th>
                  <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
                    NGUỒN GHI NHẬN
                  </th>
                  <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
                    XP
                  </th>
                  <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
                    PHIÊN BẢN
                  </th>
                  <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
                    LÝ DO
                  </th>
                </tr>
              </thead>
              <tbody>
                {ledger.length > 0 ? (
                  ledger.map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0">
                        <Badge tone={entry.type === 'award' ? 'green' : 'orange'}>
                          {entry.type === 'award' ? 'Ghi nhận gốc' : 'Điều chỉnh'}
                        </Badge>
                        <span className="block text-[10px] text-[#a5acb5] mt-[5px] leading-[1.6]">
                          {entry.id?.slice(0, 12)}
                        </span>
                      </td>
                      <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0 text-[11px] text-[#727b89]">
                        {entry.source}
                        <span className="block text-[10px] text-[#a5acb5] mt-[5px] leading-[1.6]">{entry.actor}</span>
                      </td>
                      <td className={`px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0 text-[11px] font-medium ${
                        entry.amount < 0 ? 'text-[#d27332]' : 'text-[#358b6c]'
                      }`}>
                        {entry.amount > 0 ? '+' : ''}{entry.amount}
                      </td>
                      <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0 text-[11px] text-[#727b89]">
                        v{entry.rubricVersion || 1}
                      </td>
                      <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0 text-[11px] text-[#727b89] whitespace-normal min-w-[200px] max-w-[420px]">
                        {entry.reason || '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-[#9096a1] text-[11px]">
                      Chưa có bút toán nào trong hệ thống.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : cases.length ? (
          /* Anomaly List */
          <div className="px-[23px]">
            {cases.map((a) => (
              <div key={a.id} className="flex items-center gap-[15px] py-[24px] border-b border-[#e9ebee] last:border-b-0">
                <span className={`w-[43px] h-[43px] rounded-[12px] grid place-items-center shrink-0 ${
                  a.severity === 'high' ? 'bg-[#fff0ef] text-[#d89b94]' : 'bg-[#fff5e8] text-[#d9ab73]'
                }`}>
                  <ShieldAlert size={23} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-[10px] mb-[7px]">
                    <h3 className="text-[12px] font-medium text-[#4a5462]">{a.title}</h3>
                    <Badge tone={a.severity === 'high' ? 'red' : 'orange'}>
                      {a.severity === 'high' ? 'Mức cao' : 'Cần kiểm tra'}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-[#717d8d] mb-[5px]">{a.club} · {a.count} lượt ghi nhận liên quan</p>
                  <small className="text-[10px] text-[#b1b6c0]">
                    {a.time} · {a.amount} XP cần đối soát
                  </small>
                </div>
                <Button
                  onClick={() => { setItem(a); setReason(a.reason || ''); setDecision('keep'); setAdjustment(0); }}
                  className="shrink-0"
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
      <div className="flex items-center gap-[8px] text-[11px] text-[#717d8d] my-[20px] leading-relaxed">
        <ShieldCheck size={17} />
        <span>Sổ cái chỉ ghi thêm: điều chỉnh hoặc thu hồi tạo bút toán đảo, giữ nguyên dữ liệu gốc.</span>
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
            <div className="px-[26px] py-6">
              {/* Evidence Box */}
              <div className="p-[20px] bg-[#fbf8f2] border border-[#eee8da] rounded-[9px] mb-[23px]">
                <h3 className="text-[13px] text-[#a9987b] font-semibold mb-[12px]">Dữ liệu cần xác minh</h3>
                <p className="text-[12px] text-[#a49885] leading-relaxed mb-[12px]">{item.evidence}</p>
                <p className="text-[12px] text-[#a49885] leading-relaxed mb-[12px]">
                  <b className="font-medium">XP đang đối soát:</b> {item.amount} XP · Sinh viên: {item.student}
                </p>
                <small className="text-[11px] text-[#b5aa97]">
                  Đây là trường hợp minh họa. Quyết định chỉ áp dụng cho bút toán được liên kết trong sổ cái.
                </small>
              </div>

              {item.status === 'open' ? (
                <>
                  {/* Decision Fields */}
                  <Field label="Quyết định xử lý" className="mb-5">
                    <select
                      value={decision}
                      onChange={(e) => setDecision(e.target.value)}
                      className="w-full h-[39px] px-[12px] border border-[#e1e4e9] rounded-[7px] text-[12px]"
                    >
                      <option value="keep">Giữ nguyên — ghi nhận hợp lệ</option>
                      <option value="adjust">Điều chỉnh giảm XP</option>
                      <option value="revoke">Thu hồi toàn bộ XP của bút toán</option>
                    </select>
                  </Field>

                  {decision === 'adjust' && (
                    <Field label="XP hợp lệ sau điều chỉnh" className="mb-5">
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

                  <Field label="Lý do và kết quả kiểm tra *" className="mb-5">
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
                    <div className="p-[14px] border border-[#f2e5ca] bg-[#fff8ec] text-[#a28654] rounded-[7px] text-[11px] leading-[1.8]">
                      Sẽ ghi thêm một bút toán{' '}
                      {decision === 'revoke' ? -item.amount : Number(adjustment) - item.amount} XP
                      liên kết với bút toán gốc. Phần điều chỉnh thuộc học kỳ của đóng góp gốc.
                    </div>
                  )}
                </>
              ) : (
                /* Resolved View */
                <div className="space-y-4">
                  <h3 className="text-[13px] text-[#7a8799] font-semibold">Kết quả xử lý</h3>
                  <Badge tone="green">
                    {item.decision === 'keep' ? 'Giữ nguyên XP' : item.decision === 'adjust' ? 'Đã điều chỉnh XP' : 'Đã thu hồi XP'}
                  </Badge>
                  <p className="text-[12px] text-[#717d8d] leading-relaxed">{item.reason}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 z-[1] border-t border-[#e9ebee] px-[26px] py-[17px] flex gap-[10px] justify-end bg-[#fdfdfe] rounded-b-[14px]">
              <Button type="button" onClick={() => setItem(null)}>Đóng</Button>
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
