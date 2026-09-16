import { useState } from 'react';
import { CalendarDays, Check, Pencil, Plus } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import { date, number, seasonLabel } from '../utils/format.js';
import { useAction } from '../hooks/useAction.js';
import { Badge, Button, Field, Modal, PageHeader, Panel } from '../components/ui/index.js';

export function Seasons() {
  const { state, commit, season } = useWorkspace();
  const run = useAction();
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
      <div className="season-principle">
        <CalendarDays size={28} />
        <div>
          <h2>Tiến bộ theo mùa. Giá trị theo năm tháng.</h2>
          <p>
            XP cạnh tranh và xếp hạng được tính riêng mỗi học kỳ. Hồ sơ đóng góp và lịch sử xác thực
            được giữ lâu dài.
          </p>
        </div>
      </div>
      <div className="season-grid">
        {state.seasons.map((s) => (
          <Panel key={s.id} className="season-card">
            <div className="season-card-heading">
              <span className="season-icon">
                <CalendarDays size={24} />
              </span>
              <Badge tone={s.id === season ? 'orange' : 'neutral'}>
                {s.id === season ? 'Đang xem' : 'Học kỳ khác'}
              </Badge>
            </div>
            <h2>{seasonLabel(s.id)}</h2>
            <p>
              {date(s.start)} — {date(s.end)}
            </p>
            <dl>
              <dt>Ngưỡng cần kết nối</dt>
              <dd>{s.threshold} XP</dd>
              <dt>XP mỗi cấp độ</dt>
              <dd>{s.xpPerLevel} XP</dd>
              <dt>Hiển thị xếp hạng</dt>
              <dd>{s.rankings ? 'Bật' : 'Tắt · Ưu tiên tiến bộ cá nhân'}</dd>
            </dl>
            <Button icon={Pencil} onClick={() => setEditing(s)}>
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
        commit(value.id ? 'Cập nhật học kỳ' : 'Thêm học kỳ', form.id, 'affairs', (draft) => {
          const id = form.id.trim().toUpperCase();
          if (!/^(SPRING|SUMMER|FALL)20\d{2}$/.test(id))
            throw new Error('Mã học kỳ theo định dạng FALL2026, SUMMER2026 hoặc SPRING2027.');
          if (form.start >= form.end) throw new Error('Ngày kết thúc phải sau ngày bắt đầu.');
          if (
            draft.seasons.some(
              (s) => s.id !== value.id && s.start <= form.end && s.end >= form.start,
            )
          )
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
        }),
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
        <div className="modal-body form-grid">
          <Field className="full-width" label="Mã học kỳ *" hint="Ví dụ: SPRING2027">
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
          <label className="checkbox-label full-width">
            <input
              type="checkbox"
              checked={form.rankings}
              onChange={(e) => setForm({ ...form, rankings: e.target.checked })}
            />
            Cho phép hiển thị xếp hạng theo học kỳ
          </label>
          <div className="info-box full-width">
            Mở học kỳ mới tạo phạm vi XP mới; hồ sơ đóng góp trọn đời và sổ cái hiện tại vẫn được
            giữ nguyên.
          </div>
        </div>
        <div className="modal-footer">
          <Button type="button" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" icon={Check}>
            Lưu học kỳ
          </Button>
        </div>
      </form>
    </Modal>
  );
}
