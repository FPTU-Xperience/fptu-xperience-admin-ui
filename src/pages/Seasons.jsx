import { useState } from 'react';
import { CalendarDays, Check, Pencil, Plus } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import { date, seasonLabel } from '../utils/format.js';
import { useAction } from '../hooks/useAction.js';
import { Badge, Button, Field, Modal, PageHeader, Panel } from '../components/ui/index.js';

export function Seasons() {
  const { state, season } = useWorkspace();
  const [editing, setEditing] = useState(null);

  return (
    <>
      <PageHeader
        eyebrow="MỖI HỌC KỲ, MỘT KHỞI ĐẦU MỚI"
        title="Học kỳ & mùa giải"
        description="Thiết lập nhịp trải nghiệm, ngưỡng kết nối và cách hiển thị tiến bộ."
      >
        <Button variant="primary" icon={Plus} onClick={() => setEditing({})}>
          Thêm học kỳ
        </Button>
      </PageHeader>

      {/* Season Principle Banner */}
      <div className="flex items-center gap-[28px] p-[22px_26px] bg-[#eef4f6] border border-[#e3ecef] text-[#91acb6] rounded-[10px] mb-[23px]">
        <CalendarDays size={28} className="shrink-0" />
        <div>
          <h2 className="text-[17px] text-[#6e8995] font-semibold mb-[8px]">
            Tiến bộ theo mùa. Giá trị theo năm tháng.
          </h2>
          <p className="text-[11px] text-[#95a9b2] leading-relaxed">
            XP cạnh tranh và xếp hạng được tính riêng mỗi học kỳ. Hồ sơ đóng góp và lịch sử xác thực được giữ lâu dài.
          </p>
        </div>
      </div>

      {/* Season Grid */}
      <div className="grid sm:grid-cols-2 gap-[23px]">
        {state.seasons.map((s) => (
          <Panel key={s.id} className="p-[25px]">
            {/* Heading */}
            <div className="flex items-center justify-between mb-[18px]">
              <span className="w-[42px] h-[42px] rounded-[10px] bg-[#f8f2eb] grid place-items-center text-[#bfa17e]">
                <CalendarDays size={24} />
              </span>
              <Badge tone={s.id === season ? 'orange' : 'neutral'}>
                {s.id === season ? 'Đang xem' : 'Học kỳ khác'}
              </Badge>
            </div>

            {/* Info */}
            <h2 className="text-[21px] font-semibold text-[#4a5462] mb-[9px]">{seasonLabel(s.id)}</h2>
            <p className="text-[11px] text-[#717d8d] mb-[23px]">
              {date(s.start)} — {date(s.end)}
            </p>

            {/* Details */}
            <dl className="space-y-[15px] mb-[23px]">
              <div className="flex justify-between text-[12px]">
                <dt className="text-[#8795a6]">Ngưỡng cần kết nối</dt>
                <dd className="font-medium text-[#768598]">{s.threshold} XP</dd>
              </div>
              <div className="flex justify-between text-[12px]">
                <dt className="text-[#8795a6]">XP mỗi cấp độ</dt>
                <dd className="font-medium text-[#768598]">{s.xpPerLevel} XP</dd>
              </div>
              <div className="flex justify-between text-[12px]">
                <dt className="text-[#8795a6]">Hiển thị xếp hạng</dt>
                <dd className="font-medium text-[#768598]">{s.rankings ? 'Bật' : 'Tắt · Ưu tiên tiến bộ cá nhân'}</dd>
              </div>
            </dl>

            <Button icon={Pencil} onClick={() => setEditing(s)} className="w-full justify-center">
              Chỉnh sửa cấu hình
            </Button>
          </Panel>
        ))}
      </div>

      {editing && <SeasonForm value={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function SeasonForm({ value, onClose }) {
  const { commit } = useWorkspace();
  const run = useAction();
  const [form, setForm] = useState({
    id: '',
    start: '',
    end: '',
    threshold: 200,
    xpPerLevel: 100,
    rankings: false,
    ...value,
  });

  async function submit(e) {
    e.preventDefault();
    const ok = await run(
      () =>
        commit(
          value.id ? 'Cập nhật học kỳ' : 'Thêm học kỳ',
          form.id,
          'affairs',
          (draft) => {
            const id = form.id.trim().toUpperCase();
            if (!/^(SPRING|SUMMER|FALL)20\d{2}$/.test(id))
              throw new Error('Mã học kỳ theo định dạng FALL2026, SUMMER2026 hoặc SPRING2027.');
            if (form.start >= form.end) throw new Error('Ngày kết thúc phải sau ngày bắt đầu.');
            if (draft.seasons.some((s) => s.id !== value.id && s.start <= form.end && s.end >= form.start))
              throw new Error('Khoảng thời gian bị trùng với một học kỳ khác.');
            if (!value.id && draft.seasons.some((s) => s.id === id))
              throw new Error('Mã học kỳ đã tồn tại.');
            const item = {
              ...form,
              id,
              threshold: Number(form.threshold),
              xpPerLevel: Number(form.xpPerLevel),
            };
            if (value.id) draft.seasons = draft.seasons.map((s) => (s.id === value.id ? item : s));
            else draft.seasons.unshift(item);
          },
        ),
      'Đã lưu cấu hình học kỳ.',
    );
    if (ok) onClose();
  }

  return (
    <Modal
      title={value.id ? `Cấu hình ${seasonLabel(value.id)}` : 'Thêm học kỳ mới'}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="px-[26px] py-6 grid sm:grid-cols-2 gap-x-[18px] gap-y-[21px]">
          <Field className="sm:col-span-2" label="Mã học kỳ *" hint="Ví dụ: SPRING2027">
            <input
              required
              disabled={!!value.id}
              value={form.id}
              onChange={(e) => setForm({ ...form, id: e.target.value })}
            />
          </Field>
          <Field label="Ngày bắt đầu *">
            <input
              required
              type="date"
              value={form.start}
              onChange={(e) => setForm({ ...form, start: e.target.value })}
            />
          </Field>
          <Field label="Ngày kết thúc *">
            <input
              required
              type="date"
              value={form.end}
              onChange={(e) => setForm({ ...form, end: e.target.value })}
            />
          </Field>
          <Field label="Ngưỡng cần kết nối (XP)">
            <input
              required
              type="number"
              min={1}
              max={100000}
              value={form.threshold}
              onChange={(e) => setForm({ ...form, threshold: e.target.value })}
            />
          </Field>
          <Field label="XP mỗi cấp độ">
            <input
              required
              type="number"
              min={1}
              max={100000}
              value={form.xpPerLevel}
              onChange={(e) => setForm({ ...form, xpPerLevel: e.target.value })}
            />
          </Field>
          <label className="flex items-center gap-[10px] text-[12px] text-[#8592a5] sm:col-span-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.rankings}
              onChange={(e) => setForm({ ...form, rankings: e.target.checked })}
            />
            Cho phép hiển thị xếp hạng theo học kỳ
          </label>
          <div className="sm:col-span-2 p-[14px] border border-[#e4ebf3] bg-[#f4f7fb] text-[#70869e] rounded-[7px] text-[11px] leading-[1.8]">
            Mở học kỳ mới tạo phạm vi XP mới; hồ sơ đóng góp trọn đời và sổ cái hiện tại vẫn được giữ nguyên.
          </div>
        </div>
        <div className="sticky bottom-0 z-[1] border-t border-[#e9ebee] px-[26px] py-[17px] flex gap-[10px] justify-end bg-[#fdfdfe] rounded-b-[14px]">
          <Button type="button" onClick={onClose}>Hủy</Button>
          <Button type="submit" variant="primary" icon={Check}>Lưu học kỳ</Button>
        </div>
      </form>
    </Modal>
  );
}
