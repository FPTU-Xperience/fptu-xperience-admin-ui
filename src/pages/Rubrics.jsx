import { useEffect, useState } from 'react';
import { Check, History, Lock, Pencil, Plus, Scale, ShieldCheck, SlidersHorizontal, Unlock } from 'lucide-react';
import api from '../services/api.js';
import { date } from '../utils/format.js';
import { useAction } from '../hooks/useAction.js';
import { Badge, Button, Empty, Field, IconButton, Modal, PageHeader, Panel } from '../components/ui/index.js';

const CAPABILITIES = [
  { key: 'ACAD', label: 'Học thuật', desc: 'Điểm tích lũy từ hoạt động học thuật', color: '#5b8dd9' },
  { key: 'PROF', label: 'Kỹ năng nghề nghiệp', desc: 'Điểm từ workshop, khóa học kỹ năng', color: '#7c6fcd' },
  { key: 'COMM', label: 'Cộng đồng', desc: 'Điểm từ hoạt động tình nguyện, cộng đồng', color: '#3fa87b' },
  { key: 'PHYS', label: 'Thể chất', desc: 'Điểm từ thể thao, sức khỏe', color: '#d97b3e' },
  { key: 'GLOB', label: 'Công dân toàn cầu', desc: 'Điểm từ giao lưu quốc tế, ngoại ngữ', color: '#c85fa8' },
  { key: 'ETHI', label: 'Đạo đức & Kỹ năng sống', desc: 'Điểm từ hoạt động đạo đức, kỹ năng sống', color: '#8a6f3f' },
];

function buildDefaultBenchmark() {
  return {
    id: null,
    semesterCode: 'FALL2026',
    capabilities: CAPABILITIES.map((c) => ({
      key: c.key,
      weight: Math.round(100 / CAPABILITIES.length),
    })),
    bonusCap: 500,
    status: 'draft',
    effectiveDate: new Date().toISOString().split('T')[0],
  };
}

function computeTotal(weights) {
  return weights.reduce((s, w) => s + Number(w.weight || 0), 0);
}

export function Rubrics() {
  const run = useAction();

  const [benchmark, setBenchmark] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [history, setHistory] = useState(null);
  const [saving, setSaving] = useState(false);
  const [locking, setLocking] = useState(false);
  const [form, setForm] = useState(null);

  async function fetchBenchmark() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.studentAffairs.benchmarks.getActive();
      if (data && data.id) {
        setBenchmark(data);
      } else {
        setBenchmark({ ...buildDefaultBenchmark(), status: 'draft' });
      }
    } catch (err) {
      console.error('Failed to fetch benchmark:', err);
      // Fallback: show default
      setBenchmark({ ...buildDefaultBenchmark(), status: 'draft' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBenchmark();
  }, []);

  function startEdit() {
    setForm({
      semesterCode: benchmark.semesterCode || 'FALL2026',
      capabilities: benchmark.capabilities
        ? benchmark.capabilities.map((c) => ({ key: c.key, weight: Number(c.weight || 0) }))
        : CAPABILITIES.map((c) => ({ key: c.key, weight: Math.round(100 / CAPABILITIES.length) })),
      bonusCap: Number(benchmark.bonusCap || 500),
      effectiveDate: benchmark.effectiveDate || new Date().toISOString().split('T')[0],
    });
    setEditing(true);
  }

  function updateCap(key, value) {
    setForm((f) => ({
      ...f,
      capabilities: f.capabilities.map((c) => (c.key === key ? { ...c, weight: Number(value) } : c)),
    }));
  }

  async function save(e) {
    e.preventDefault();
    const total = computeTotal(form.capabilities);
    if (Math.abs(total - 100) > 0.01) {
      run(() => { throw new Error('Tổng trọng số phải bằng 100%.'); });
      return;
    }
    setSaving(true);
    const ok = await run(
      async () => {
        const payload = {
          semesterCode: form.semesterCode,
          capabilities: form.capabilities.map((c) => ({ key: c.key, weight: c.weight })),
          bonusCap: Number(form.bonusCap),
          effectiveDate: form.effectiveDate,
        };
        let saved;
        if (benchmark.id) {
          saved = await api.studentAffairs.benchmarks.update(benchmark.id, payload);
        } else {
          saved = await api.studentAffairs.benchmarks.create(payload);
        }
        setBenchmark(saved);
        setEditing(false);
        setForm(null);
      },
      'Đã lưu cấu hình Benchmark.',
    );
    setSaving(false);
    if (!ok) setForm(null);
  }

  async function lock() {
    if (!benchmark.id) {
      run(() => { throw new Error('Lưu Benchmark trước khi khóa.'); });
      return;
    }
    setLocking(true);
    const ok = await run(
      async () => {
        const saved = await api.studentAffairs.benchmarks.lock(benchmark.id);
        setBenchmark(saved);
      },
      'Đã khóa bất biến cấu hình Benchmark.',
    );
    setLocking(false);
  }

  const totalWeight = form ? computeTotal(form.capabilities) : benchmark ? computeTotal(benchmark.capabilities || []) : 0;
  const isLocked = benchmark?.status === 'LOCKED' || benchmark?.isLocked;

  return (
    <>
      <PageHeader
        eyebrow="CÔNG BẰNG TRONG TỪNG ĐÓNG GÓP"
        title="Benchmark 6+1 Chiều"
        description="Cấu hình trọng số 6 chiều năng lực và trần điểm thưởng cho học kỳ."
      />

      {/* Error Banner */}
      {error && (
        <div className="mb-4 p-[14px] border border-[#f2dfdc] bg-[#fff3f2] text-[#bd7970] rounded-[7px] text-[11px]">
          <span className="mr-2">⚠️</span>
          {error}
          <button className="ml-2 underline hover:no-underline" onClick={fetchBenchmark}>Thử lại</button>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-[#9096a1]">
          <div className="w-6 h-6 border-2 border-[#e1e4e9] border-t-[#ed641c] rounded-full animate-spin mr-3" />
          Đang tải Benchmark…
        </div>
      ) : !benchmark ? (
        <Panel className="p-[40px] text-center">
          <Empty
            title="Chưa có Benchmark"
            description="Tạo Benchmark đầu tiên để bắt đầu cấu hình 6 chiều năng lực."
          />
          <Button
            className="mt-5 mx-auto"
            variant="primary"
            icon={Plus}
            onClick={() => { setBenchmark({ ...buildDefaultBenchmark(), status: 'draft' }); startEdit(); }}
          >
            Tạo Benchmark mới
          </Button>
        </Panel>
      ) : (
        <>
          {/* Banner */}
          <div className="flex items-center gap-[17px] p-[22px_26px] bg-[#f6f3ec] border border-[#eae5d9] rounded-[10px] mb-[23px]">
            <span className="w-[40px] h-[40px] rounded-[10px] bg-[#eee7d8] grid place-items-center text-[#b4a178] shrink-0">
              <Scale size={23} />
            </span>
            <div>
              <h3 className="text-[13px] text-[#9a8c70] font-semibold">6 Chiều năng lực + Trần điểm thưởng</h3>
              <p className="text-[11px] text-[#ada38e] mt-[5px] leading-relaxed">
                Mỗi chiều có trọng số riêng. Tổng trọng số phải bằng 100%. Sau khi khóa, cấu hình không thể sửa.
              </p>
            </div>
          </div>

          {/* Benchmark Panel */}
          <Panel className="mb-6">
            {/* Header */}
            <div className="px-[26px] py-[22px] border-b border-[#e9ebee]">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-[14px]">
                  <span className="w-[42px] h-[42px] rounded-[10px] bg-[#fcf3e8] grid place-items-center text-[#d2a171]">
                    <SlidersHorizontal size={22} />
                  </span>
                  <div>
                    <h2 className="text-[17px] font-semibold text-[#4a5462]">
                      Benchmark {benchmark.semesterCode || 'FALL2026'}
                    </h2>
                    <p className="text-[11px] text-[#818794] mt-[3px]">
                      Hiệu lực từ {date(benchmark.effectiveDate || benchmark.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-[10px]">
                  {isLocked ? (
                    <Badge tone="green" className="gap-1">
                      <ShieldCheck size={13} /> Đã khóa bất biến
                    </Badge>
                  ) : (
                    <Badge tone="orange">Đang chỉnh sửa</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Capabilities Grid */}
            <div className="px-[26px] py-[22px]">
              <div className="grid sm:grid-cols-2 gap-[16px]">
                {CAPABILITIES.map((cap) => {
                  const capData = (benchmark.capabilities || []).find((c) => c.key === cap.key);
                  const weight = capData ? Number(capData.weight) : Math.round(100 / CAPABILITIES.length);
                  const isEditing = editing && form && !isLocked;
                  return (
                    <div
                      key={cap.key}
                      className="p-[16px] rounded-[9px] border border-[#e9ebee] bg-white hover:border-[#e0d8c8] transition-colors"
                    >
                      <div className="flex items-center justify-between mb-[10px]">
                        <div className="flex items-center gap-[10px]">
                          <span
                            className="w-[10px] h-[10px] rounded-full shrink-0"
                            style={{ background: cap.color }}
                          />
                          <div>
                            <strong className="block text-[12px] font-semibold text-[#4a5462]">{cap.label}</strong>
                            <small className="block text-[10px] text-[#adb3bc]">{cap.desc}</small>
                          </div>
                        </div>
                        {isEditing ? (
                          <div className="flex items-center gap-[6px]">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={1}
                              value={form.capabilities.find((c) => c.key === cap.key)?.weight ?? 0}
                              onChange={(e) => updateCap(cap.key, e.target.value)}
                              className="w-[65px] h-[32px] text-center text-[13px] font-semibold border border-[#e1e4e9] rounded-[7px]"
                            />
                            <span className="text-[12px] text-[#8795a6]">%</span>
                          </div>
                        ) : (
                          <span className="text-[16px] font-bold" style={{ color: cap.color }}>
                            {weight}%
                          </span>
                        )}
                      </div>
                      {/* Weight bar */}
                      <div className="w-full h-[4px] bg-[#f0f2f5] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${weight}%`, background: cap.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bonus Cap */}
              <div className="mt-[20px] p-[18px] bg-[#f9fafb] border border-[#e9ebee] rounded-[9px]">
                <div className="flex items-center justify-between flex-wrap gap-[12px]">
                  <div>
                    <strong className="block text-[12px] font-semibold text-[#4a5462]">
                      Trần điểm hoạt động thưởng (X<sub>+1</sub>)
                    </strong>
                    <small className="block text-[10px] text-[#adb3bc] mt-[3px]">
                      Điểm cộng thêm tối đa cho các hoạt động vượt mức
                    </small>
                  </div>
                  {editing && !isLocked ? (
                    <div className="flex items-center gap-[6px]">
                      <input
                        type="number"
                        min={0}
                        max={10000}
                        value={form.bonusCap}
                        onChange={(e) => setForm((f) => ({ ...f, bonusCap: Number(e.target.value) }))}
                        className="w-[90px] h-[32px] text-center text-[13px] font-semibold border border-[#e1e4e9] rounded-[7px]"
                      />
                      <span className="text-[12px] text-[#8795a6]">XP</span>
                    </div>
                  ) : (
                    <span className="text-[17px] font-bold text-[#7c6fcd]">
                      {benchmark.bonusCap || 0} <span className="text-[12px] font-normal text-[#8795a6]">XP</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Total Weight */}
              <div className="flex items-center justify-between mt-[16px] pt-[16px] border-t border-[#e9ebee]">
                <span className="text-[11px] text-[#718094]">Tổng trọng số 6 chiều</span>
                <Badge tone={Math.abs(totalWeight - 100) < 0.01 ? 'green' : 'red'}>
                  {totalWeight}% / 100%
                </Badge>
              </div>
            </div>

            {/* Actions */}
            <div className="px-[26px] py-[17px] border-t border-[#e9ebee] flex flex-wrap items-center gap-[10px]">
              {!isLocked && (
                <Button icon={History} onClick={() => setHistory(benchmark)} variant="ghost">
                  Lịch sử cấu hình
                </Button>
              )}
              <div className="ml-auto flex gap-[10px] flex-wrap">
                {isLocked ? (
                  <div className="flex items-center gap-[8px] text-[11px] text-[#358b6c]">
                    <ShieldCheck size={16} />
                    <span>Cấu hình đã được khóa bất biến</span>
                  </div>
                ) : (
                  <>
                    <Button icon={Lock} variant="secondary" busy={locking} onClick={lock} disabled={!benchmark.id}>
                      Khóa bất biến
                    </Button>
                    <Button icon={Pencil} variant="primary" onClick={startEdit}>
                      Chỉnh sửa
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Panel>

          {/* Info */}
          <div className="flex items-center gap-[8px] text-[11px] text-[#717d8d] leading-relaxed">
            <ShieldCheck size={17} />
            <span>Thay đổi trọng số tạo phiên bản mới. Sau khi khóa, cấu hình không thể sửa để đảm bảo tính toàn vẹn điểm.</span>
          </div>
        </>
      )}

      {/* Edit Modal */}
      {editing && form && (
        <Modal
          title="Chỉnh sửa Benchmark"
          description={`Cấu hình cho học kỳ ${form.semesterCode}. Tổng trọng số phải bằng 100%.`}
          wide
          onClose={() => { setEditing(false); setForm(null); }}
        >
          <form onSubmit={save}>
            <div className="px-[26px] py-6">
              <div className="grid sm:grid-cols-2 gap-[18px] mb-[20px]">
                <Field label="Mã học kỳ *">
                  <input
                    required
                    value={form.semesterCode}
                    onChange={(e) => setForm((f) => ({ ...f, semesterCode: e.target.value }))}
                    disabled={!!benchmark.id}
                  />
                </Field>
                <Field label="Ngày hiệu lực *">
                  <input
                    required
                    type="date"
                    value={form.effectiveDate}
                    onChange={(e) => setForm((f) => ({ ...f, effectiveDate: e.target.value }))}
                  />
                </Field>
              </div>

              {/* Weight table */}
              <div className="grid grid-cols-[1fr_90px_30px] gap-[10px] items-center mb-[12px] text-[10px] text-[#a4adba]">
                <span>CHIỀU NĂNG LỰC</span>
                <span className="text-center">TRỌNG SỐ %</span>
                <span />
              </div>

              {CAPABILITIES.map((cap) => {
                const capForm = form.capabilities.find((c) => c.key === cap.key);
                return (
                  <div
                    key={cap.key}
                    className="grid grid-cols-[1fr_90px_30px] gap-[10px] items-center mb-[12px]"
                  >
                    <div className="flex items-center gap-[10px]">
                      <span
                        className="w-[10px] h-[10px] rounded-full shrink-0"
                        style={{ background: cap.color }}
                      />
                      <span className="text-[12px] text-[#4a5462]">{cap.label}</span>
                    </div>
                    <input
                      type="number"
                      required
                      min={0}
                      max={100}
                      step={1}
                      value={capForm?.weight ?? 0}
                      onChange={(e) => updateCap(cap.key, e.target.value)}
                      className="h-[39px] px-[12px] border border-[#e1e4e9] rounded-[7px] text-[12px] text-center"
                    />
                    <span className="text-[12px] text-[#8795a6] text-center">%</span>
                  </div>
                );
              })}

              {/* Total */}
              <div className="flex items-center justify-between mt-[20px] pt-[16px] border-t border-[#e9ebee]">
                <span className="text-[12px] text-[#718094]">Tổng trọng số</span>
                <Badge tone={Math.abs(computeTotal(form.capabilities) - 100) < 0.01 ? 'green' : 'red'}>
                  {computeTotal(form.capabilities)}% / 100%
                </Badge>
              </div>

              {/* Bonus cap */}
              <h3 className="text-[11px] text-[#7e8998] font-semibold mt-[28px] pt-[20px] border-t border-[#e9ebee] mb-[16px]">
                Trần điểm hoạt động thưởng
              </h3>
              <div className="grid sm:grid-cols-2 gap-[18px]">
                <Field label="Trần XP thưởng (X+1)">
                  <input
                    type="number"
                    min={0}
                    max={10000}
                    value={form.bonusCap}
                    onChange={(e) => setForm((f) => ({ ...f, bonusCap: Number(e.target.value) }))}
                  />
                </Field>
              </div>

              <div className="p-[14px] border border-[#e4ebf3] bg-[#f4f7fb] text-[#70869e] rounded-[7px] text-[11px] leading-[1.8] mt-[17px]">
                Mỗi chiều năng lực có trọng số đại diện cho tỷ trọng điểm. Tổng = 100%. Khóa Benchmark để cố định cấu hình.
              </div>
            </div>

            <div className="sticky bottom-0 z-[1] border-t border-[#e9ebee] px-[26px] py-[17px] flex gap-[10px] justify-end bg-[#fdfdfe] rounded-b-[14px]">
              <Button type="button" onClick={() => { setEditing(false); setForm(null); }}>Hủy</Button>
              <Button
                type="submit"
                variant="primary"
                icon={Check}
                busy={saving}
                disabled={Math.abs(computeTotal(form.capabilities) - 100) > 0.01}
              >
                Lưu Benchmark
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* History Modal */}
      {history && (
        <Modal
          title={`Lịch sử Benchmark · ${history.semesterCode}`}
          description="Các phiên bản trước được giữ lại để đối soát."
          onClose={() => setHistory(null)}
        >
          <div className="px-[26px] py-6">
            <div className="flex items-center gap-[12px] mb-5">
              <Badge tone="orange">{history.status || 'draft'}</Badge>
              <span className="text-[12px] text-[#717d8d]">Phiên bản hiện tại · {date(history.effectiveDate || history.createdAt)}</span>
            </div>
            <p className="text-[11px] text-[#818794] py-[15px] border-t border-[#e9ebee]">
              Chưa có phiên bản cũ để đối soát.
            </p>
          </div>
        </Modal>
      )}
    </>
  );
}
