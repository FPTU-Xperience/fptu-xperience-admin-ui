import { useEffect, useState } from 'react';
import {
  Check,
  History,
  Pencil,
  Plus,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import api from '../services/api.js';
import { date, number } from '../utils/format.js';
import { useAction } from '../hooks/useAction.js';
import { Badge, Button, Field, IconButton, Modal, PageHeader, Panel } from '../components/ui/index.js';

// Default rubrics based on club types
const DEFAULT_RUBRICS = [
  {
    id: 'tech',
    type: 'Công nghệ',
    version: 1,
    cap: 2000,
    scale: 100,
    status: 'published',
    effective: '2026-09-01',
    criteria: [
      { name: 'Tham gia sự kiện kỹ thuật', xp: 30, weight: 100 },
    ],
    history: [],
  },
  {
    id: 'art',
    type: 'Nghệ thuật',
    version: 1,
    cap: 1500,
    scale: 100,
    status: 'published',
    effective: '2026-09-01',
    criteria: [
      { name: 'Tham gia workshop sáng tạo', xp: 25, weight: 100 },
    ],
    history: [],
  },
  {
    id: 'sports',
    type: 'Thể thao',
    version: 1,
    cap: 1800,
    scale: 100,
    status: 'published',
    effective: '2026-09-01',
    criteria: [
      { name: 'Tham gia giải đấu', xp: 35, weight: 100 },
    ],
    history: [],
  },
];

export function Rubrics() {
  const [rubrics, setRubrics] = useState(DEFAULT_RUBRICS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [edit, setEdit] = useState(null);
  const [history, setHistory] = useState(null);

  // Fetch rubrics from API
  async function fetchRubrics() {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/rubrics');
      if (Array.isArray(response) && response.length > 0) {
        setRubrics(response);
      }
    } catch (err) {
      console.error('Failed to fetch rubrics:', err);
      // Keep default rubrics on error
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRubrics();
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="CÔNG BẰNG TRONG TỪNG ĐÓNG GÓP"
        title="Thang điểm XP"
        description="Cấu hình tiêu chí phù hợp từng loại CLB, với lịch sử phiên bản rõ ràng."
      />

      {/* Error Banner */}
      {error && (
        <div className="mb-4 p-[14px] border border-[#f2dfdc] bg-[#fff3f2] text-[#bd7970] rounded-[7px] text-[11px]">
          <span className="mr-2">⚠️</span>
          {error}
          <button className="ml-2 underline hover:no-underline" onClick={fetchRubrics}>
            Thử lại
          </button>
        </div>
      )}

      {/* Rubric Note */}
      <div className="flex items-center gap-[17px] p-[22px_26px] bg-[#f6f3ec] border border-[#eae5d9] rounded-[10px] mb-[23px]">
        <span className="w-[40px] h-[40px] rounded-[10px] bg-[#eee7d8] grid place-items-center text-[#b4a178] shrink-0">
          <Scale size={23} />
        </span>
        <div>
          <h3 className="text-[13px] text-[#9a8c70] font-semibold">Đo lường phù hợp, so sánh công bằng</h3>
          <p className="text-[11px] text-[#ada38e] mt-[5px] leading-relaxed">
            Mỗi loại CLB có tiêu chí và trọng số riêng. Chỉ số gắn kết được chuẩn hóa về cùng một thang đo.
          </p>
        </div>
      </div>

      {/* Rubric Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-[#9096a1]">
          <div className="w-6 h-6 border-2 border-[#e1e4e9] border-t-[#ed641c] rounded-full animate-spin mr-3" />
          Đang tải thang điểm...
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-[21px]">
          {rubrics.map((rubric) => (
            <Panel key={rubric.id} className="p-[24px]">
              {/* Top Row */}
              <div className="flex items-center justify-between mb-4">
                <span className="w-[42px] h-[42px] rounded-[10px] bg-[#fcf3e8] grid place-items-center text-[#d2a171]">
                  <SlidersHorizontal size={22} />
                </span>
                <Badge tone={rubric.status === 'published' ? 'green' : 'neutral'}>
                  {rubric.status === 'published' ? 'Đã công bố' : 'Bản nháp'}
                </Badge>
              </div>

              {/* Name */}
              <div className="flex items-center gap-[10px] mb-[8px]">
                <h2 className="text-[16px] font-semibold">CLB {rubric.type?.toLowerCase() || 'Mặc định'}</h2>
                <Badge tone="orange">v{rubric.version}</Badge>
              </div>
              <p className="text-[11px] text-[#818794] mb-[18px]">Hiệu lực từ {date(rubric.effective)}</p>

              {/* Criteria */}
              <div className="divide-y divide-[#e9ebee]">
                {(rubric.criteria || []).map((criterion, i) => (
                  <div key={i} className="flex items-center justify-between py-[13px]">
                    <div>
                      <strong className="block text-[11px] font-normal text-[#798494]">{criterion.name}</strong>
                      <small className="block text-[10px] text-[#a6afb9] mt-[5px]">{criterion.xp} XP / đóng góp hợp lệ</small>
                    </div>
                    <b className="text-[13px] font-medium text-[#b58d68]">{criterion.weight}%</b>
                  </div>
                ))}
              </div>

              {/* Normalization Info */}
              <div className="flex items-center gap-[9px] bg-[#f9fafb] p-[11px] my-[14px] text-[10px] text-[#a4aab2]">
                <Scale size={16} />
                <span>Chuẩn hóa: min(XP / {number(rubric.cap)}, 1) × {rubric.scale}</span>
              </div>

              {/* Actions */}
              <div className="flex justify-between gap-[10px] mt-5">
                <Button icon={History} onClick={() => setHistory(rubric)}>Lịch sử</Button>
                <Button icon={Pencil} onClick={() => setEdit(rubric)}>Tạo phiên bản mới</Button>
              </div>
            </Panel>
          ))}
        </div>
      )}

      {/* Info Line */}
      <div className="flex items-center gap-[8px] text-[11px] text-[#717d8d] my-[20px] leading-relaxed">
        <ShieldCheck size={17} />
        <span>Thay đổi thang điểm tạo phiên bản mới. Các đóng góp đã ghi nhận giữ nguyên tham chiếu phiên bản gốc.</span>
      </div>

      {/* History Modal */}
      {history && (
        <Modal
          title={`Lịch sử thang điểm · ${history.type}`}
          description="Các phiên bản trước được giữ lại để đối soát."
          onClose={() => setHistory(null)}
        >
          <div className="px-[26px] py-6">
            <div className="flex items-center gap-[12px] mb-5">
              <Badge tone="orange">v{history.version}</Badge>
              <span className="text-[12px] text-[#717d8d]">Phiên bản hiện tại · {date(history.effective)}</span>
            </div>

            {(history.history || []).length > 0 ? (
              [...history.history].reverse().map((v) => (
                <details key={v.version} className="border-t border-[#e9ebee] py-[15px]">
                  <summary className="cursor-pointer text-[11px] text-[#718094] hover:text-accent">
                    Phiên bản {v.version} · {date(v.effective)}
                  </summary>
                  <div className="mt-[9px] text-[11px] text-[#8a94a3] leading-relaxed space-y-2">
                    {(v.criteria || []).map((c, i) => (
                      <p key={i}>{c.name}: {c.xp} XP · {c.weight}%</p>
                    ))}
                    <p>Chuẩn hóa: ngưỡng {v.cap} XP / thang {v.scale}</p>
                  </div>
                </details>
              ))
            ) : (
              <p className="text-[11px] text-[#818794] py-[15px] border-t border-[#e9ebee]">
                Đây là phiên bản đầu tiên, chưa có thay đổi.
              </p>
            )}
          </div>
        </Modal>
      )}

      {/* Edit Form */}
      {edit && (
        <RubricForm
          rubric={edit}
          rubrics={rubrics}
          onClose={() => setEdit(null)}
          onSave={(saved) => {
            setRubrics((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
            setEdit(null);
          }}
        />
      )}
    </>
  );
}

function RubricForm({ rubric, rubrics, onClose, onSave }) {
  const run = useAction();
  const [form, setForm] = useState(structuredClone(rubric));
  const sum = (form.criteria || []).reduce((total, c) => total + Number(c.weight), 0);

  function updateCriterion(i, key, value) {
    setForm((old) => ({
      ...old,
      criteria: (old.criteria || []).map((c, index) => (index === i ? { ...c, [key]: value } : c)),
    }));
  }

  async function submit(e) {
    e.preventDefault();
    const ok = await run(
      () => {
        // Validate total weight = 100
        const totalWeight = (form.criteria || []).reduce((sum, c) => sum + Number(c.weight), 0);
        if (Math.abs(totalWeight - 100) > 0.01) {
          throw new Error('Tổng trọng số phải bằng 100%.');
        }

        // Create new version
        const existingRubric = rubrics.find((r) => r.id === rubric.id);
        const newVersion = {
          ...form,
          version: Number(rubric.version) + 1,
          status: 'published',
          cap: Number(form.cap),
          scale: Number(form.scale),
          criteria: (form.criteria || []).map((c) => ({
            ...c,
            xp: Number(c.xp),
            weight: Number(c.weight),
          })),
          history: [
            ...(existingRubric?.history || []),
            { ...existingRubric, history: undefined },
          ],
        };

        onSave(newVersion);
      },
      `Đã lưu phiên bản ${rubric.version + 1} của thang điểm.`,
    );
  }

  return (
    <Modal
      title={`Thang XP · ${rubric.type}`}
      description={`Tạo phiên bản ${rubric.version + 1} từ phiên bản ${rubric.version}.`}
      wide
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="px-[26px] py-6">
          {/* Criteria Form Head */}
          <div className="grid grid-cols-[1fr_95px_95px_30px] gap-[10px] items-center mb-[12px] text-[10px] text-[#a4adba]">
            <span>TIÊU CHÍ ĐÓNG GÓP</span>
            <span>XP CƠ BẢN</span>
            <span>TRỌNG SỐ %</span>
            <span />
          </div>

          {/* Criteria Rows */}
          {(form.criteria || []).map((c, i) => (
            <div key={i} className="grid grid-cols-[1fr_95px_95px_30px] gap-[10px] items-center mb-[12px]">
              <input
                required
                maxLength={100}
                aria-label={`Tiêu chí ${i + 1}`}
                value={c.name}
                onChange={(e) => updateCriterion(i, 'name', e.target.value)}
                className="h-[39px] px-[12px] border border-[#e1e4e9] rounded-[7px] text-[11px]"
              />
              <input
                required
                type="number"
                min={1}
                max={100000}
                aria-label={`XP tiêu chí ${i + 1}`}
                value={c.xp}
                onChange={(e) => updateCriterion(i, 'xp', e.target.value)}
                className="h-[39px] px-[12px] border border-[#e1e4e9] rounded-[7px] text-[11px]"
              />
              <input
                required
                type="number"
                min={0}
                max={100}
                step="0.1"
                aria-label={`Trọng số tiêu chí ${i + 1}`}
                value={c.weight}
                onChange={(e) => updateCriterion(i, 'weight', e.target.value)}
                className="h-[39px] px-[12px] border border-[#e1e4e9] rounded-[7px] text-[11px]"
              />
              <IconButton
                icon={Trash2}
                label={`Xóa tiêu chí ${i + 1}`}
                disabled={(form.criteria || []).length === 1}
                onClick={() =>
                  setForm({ ...form, criteria: (form.criteria || []).filter((_, index) => index !== i) })
                }
              />
            </div>
          ))}

          {/* Criteria Total */}
          <div className="flex items-center justify-between gap-[10px] mt-[20px]">
            <Button
              type="button"
              icon={Plus}
              onClick={() =>
                setForm({
                  ...form,
                  criteria: [...(form.criteria || []), { name: '', xp: 20, weight: 0 }],
                })
              }
            >
              Thêm tiêu chí
            </Button>
            <Badge tone={Math.abs(sum - 100) < 0.01 ? 'green' : 'red'}>Tổng trọng số: {sum}% / 100%</Badge>
          </div>

          {/* Form Section Title */}
          <h3 className="text-[11px] text-[#7e8998] font-semibold mt-[28px] pt-[20px] border-t border-[#e9ebee] mb-[20px]">
            Chuẩn hóa và hiệu lực
          </h3>

          {/* Form Grid */}
          <div className="grid sm:grid-cols-3 gap-[18px]">
            <Field label="Ngưỡng XP đạt chỉ số tối đa">
              <input
                required
                type="number"
                min={1}
                max={1000000}
                value={form.cap}
                onChange={(e) => setForm({ ...form, cap: e.target.value })}
              />
            </Field>
            <Field label="Thang chỉ số gắn kết">
              <input
                required
                type="number"
                min={1}
                max={1000}
                value={form.scale}
                onChange={(e) => setForm({ ...form, scale: e.target.value })}
              />
            </Field>
            <Field label="Ngày hiệu lực">
              <input
                required
                type="date"
                value={form.effective}
                onChange={(e) => setForm({ ...form, effective: e.target.value })}
              />
            </Field>
          </div>

          {/* Info Box */}
          <div className="p-[14px] border border-[#e4ebf3] bg-[#f4f7fb] text-[#70869e] rounded-[7px] text-[11px] leading-[1.8] mt-[17px]">
            Điểm đóng góp = XP cơ bản × trọng số của tiêu chí. Chỉ số gắn kết = min(tổng XP / ngưỡng chuẩn hóa, 1) × thang chỉ số. Đây là công thức minh họa có thể hiệu chỉnh cùng chủ nhiệm CLB.
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-[1] border-t border-[#e9ebee] px-[26px] py-[17px] flex gap-[10px] justify-end bg-[#fdfdfe] rounded-b-[14px]">
          <Button type="button" onClick={onClose}>Hủy</Button>
          <Button
            type="submit"
            variant="primary"
            icon={Check}
            disabled={Math.abs(sum - 100) > 0.01}
          >
            Công bố phiên bản {rubric.version + 1}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
