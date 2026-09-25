import { useEffect, useState } from 'react';
import { CalendarDays, Check, Pencil, Plus, Trash2 } from 'lucide-react';
import api from '../services/api.js';
import { date, seasonLabel } from '../utils/format.js';
import { useAction } from '../hooks/useAction.js';
import { Badge, Button, Empty, Field, Modal, PageHeader, Panel } from '../components/ui/index.js';

// Default seasons configuration
const DEFAULT_SEASONS = [
  {
    id: 'FALL2026',
    label: 'Fall 2026',
    start: '2026-08-15',
    end: '2026-12-31',
    threshold: 200,
    xpPerLevel: 100,
    rankings: true,
  },
  {
    id: 'SUMMER2026',
    label: 'Summer 2026',
    start: '2026-05-15',
    end: '2026-08-14',
    threshold: 150,
    xpPerLevel: 80,
    rankings: true,
  },
];

export function Seasons() {
  const run = useAction();

  // Season configuration (local state - backend doesn't have season API)
  const [seasons, setSeasons] = useState(DEFAULT_SEASONS);
  const [currentSeason] = useState('FALL2026');

  // Deadlines from API
  const [deadlines, setDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit modals
  const [editingSeason, setEditingSeason] = useState(null);
  const [editingDeadline, setEditingDeadline] = useState(null);
  const [deletingDeadline, setDeletingDeadline] = useState(null);

  // Fetch deadlines
  async function fetchDeadlines() {
    setLoading(true);
    setError(null);
    try {
      const response = await api.deadlines.list();
      const data = Array.isArray(response) ? response : response?.items || [];
      setDeadlines(data.map(mapDeadlineFromApi));
    } catch (err) {
      console.error('Failed to fetch deadlines:', err);
      setError(err.message || 'Không thể tải danh sách deadline');
      setDeadlines([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDeadlines();
  }, []);

  // Delete deadline
  async function handleDeleteDeadline() {
    if (!deletingDeadline) return;
    await run(
      async () => {
        await api.deadlines.delete(deletingDeadline.period);
        setDeadlines((prev) => prev.filter((d) => d.period !== deletingDeadline.period));
        setDeletingDeadline(null);
      },
      'Đã xóa deadline.',
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="MỖI HỌC KỲ, MỘT KHỞI ĐẦU MỚI"
        title="Học kỳ & deadline"
        description="Thiết lập nhịp trải nghiệm, ngưỡng kết nối và thời hạn báo cáo."
      >
        <Button variant="primary" icon={Plus} onClick={() => setEditingDeadline({})}>
          Thêm deadline
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
      <div className="grid sm:grid-cols-2 gap-[23px] mb-8">
        {seasons.map((s) => (
          <Panel key={s.id} className="p-[25px]">
            {/* Heading */}
            <div className="flex items-center justify-between mb-[18px]">
              <span className="w-[42px] h-[42px] rounded-[10px] bg-[#f8f2eb] grid place-items-center text-[#bfa17e]">
                <CalendarDays size={24} />
              </span>
              <Badge tone={s.id === currentSeason ? 'orange' : 'neutral'}>
                {s.id === currentSeason ? 'Đang xem' : 'Học kỳ khác'}
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

            <Button icon={Pencil} onClick={() => setEditingSeason(s)} className="w-full justify-center">
              Chỉnh sửa cấu hình
            </Button>
          </Panel>
        ))}
      </div>

      {/* Deadlines Section */}
      <Panel
        title="Deadline báo cáo"
        description="Thời hạn nộp báo cáo hoạt động cho từng học kỳ"
      >
        {error && (
          <div className="px-5 py-3 mb-4 p-[14px] border border-[#f2dfdc] bg-[#fff3f2] text-[#bd7970] rounded-[7px] text-[11px]">
            <span className="mr-2">⚠️</span>
            {error}
            <button className="ml-2 underline hover:no-underline" onClick={fetchDeadlines}>
              Thử lại
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8 text-[#9096a1]">
            <div className="w-5 h-5 border-2 border-[#e1e4e9] border-t-[#ed641c] rounded-full animate-spin mr-2" />
            Đang tải deadline...
          </div>
        ) : deadlines.length === 0 ? (
          <Empty
            title="Chưa có deadline"
            description="Thêm deadline để quản lý thời hạn nộp báo cáo."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left whitespace-nowrap">
              <thead>
                <tr>
                  <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
                    HỌC KỲ
                  </th>
                  <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
                    NGÀY HẾT HẠN
                  </th>
                  <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
                    LOẠI
                  </th>
                  <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
                    TRẠNG THÁI
                  </th>
                  <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]" />
                </tr>
              </thead>
              <tbody>
                {deadlines.map((dl) => (
                  <tr key={dl.period}>
                    <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0">
                      <strong className="text-[12px] text-[#4a5462]">{dl.period}</strong>
                    </td>
                    <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0 text-[11px] text-[#727b89]">
                      {date(dl.dueDate)}
                    </td>
                    <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0">
                      <Badge>{dl.type || 'monthly'}</Badge>
                    </td>
                    <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0">
                      <Badge tone={dl.isPast ? 'neutral' : 'green'} dot>
                        {dl.isPast ? 'Đã qua' : 'Còn hạn'}
                      </Badge>
                    </td>
                    <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0">
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Pencil}
                          onClick={() => setEditingDeadline(dl)}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Trash2}
                          onClick={() => setDeletingDeadline(dl)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Season Form Modal */}
      {editingSeason && (
        <SeasonForm
          value={editingSeason}
          onClose={() => setEditingSeason(null)}
          onSave={(saved) => {
            setSeasons((prev) =>
              prev.map((s) => (s.id === saved.id ? saved : s)),
            );
            setEditingSeason(null);
          }}
        />
      )}

      {/* Deadline Form Modal */}
      {editingDeadline && (
        <DeadlineForm
          deadline={editingDeadline}
          onClose={() => setEditingDeadline(null)}
          onSave={(saved) => {
            if (editingDeadline.period) {
              setDeadlines((prev) => prev.map((d) => (d.period === saved.period ? saved : d)));
            } else {
              setDeadlines((prev) => [...prev, saved]);
            }
            setEditingDeadline(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingDeadline && (
        <Modal
          title="Xóa deadline?"
          description={`Xóa deadline "${deletingDeadline.period}". Hành động này không thể hoàn tác.`}
          onClose={() => setDeletingDeadline(null)}
        >
          <div className="px-6 py-6">
            <div className="p-[14px] border border-[#f2dfdc] bg-[#fff3f2] text-[#bd7970] rounded-[7px] text-[11px] leading-[1.8]">
              Deadline đã xóa sẽ không thể khôi phục. Các báo cáo đang chờ xử lý vẫn được giữ.
            </div>
          </div>
          <div className="sticky bottom-0 z-[1] border-t border-[#e9ebee] px-6 py-4 flex gap-3 justify-end bg-[#fdfdfe] rounded-b-[14px]">
            <Button onClick={() => setDeletingDeadline(null)}>Hủy</Button>
            <Button variant="danger" icon={Trash2} onClick={handleDeleteDeadline}>
              Xác nhận xóa
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

// Map backend deadline to frontend format
function mapDeadlineFromApi(dl) {
  const dueDate = dl.dueDate || dl.dueDateUtc || dl.deadline;
  const period = dl.period || dl.name || '';
  const now = new Date();
  const due = new Date(dueDate);
  return {
    period,
    dueDate,
    type: dl.type || 'monthly',
    isPast: due < now,
  };
}

function SeasonForm({ value, onClose, onSave }) {
  const run = useAction();
  const [form, setForm] = useState({
    id: value.id || '',
    start: value.start || '',
    end: value.end || '',
    threshold: value.threshold || 200,
    xpPerLevel: value.xpPerLevel || 100,
    rankings: value.rankings || false,
  });

  async function submit(e) {
    e.preventDefault();
    const ok = await run(
      () => {
        const id = form.id.trim().toUpperCase();
        if (!/^(SPRING|SUMMER|FALL)\d{4}$/.test(id))
          throw new Error('Mã học kỳ theo định dạng FALL2026, SUMMER2026 hoặc SPRING2027.');
        if (form.start >= form.end)
          throw new Error('Ngày kết thúc phải sau ngày bắt đầu.');
        const saved = { ...form, id };
        onSave(saved);
      },
      'Đã lưu cấu hình học kỳ.',
    );
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

function DeadlineForm({ deadline, onClose, onSave }) {
  const run = useAction();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    period: deadline.period || '',
    dueDate: deadline.dueDate ? deadline.dueDate.split('T')[0] : '',
    type: deadline.type || 'monthly',
  });

  async function submit(e) {
    e.preventDefault();
    await run(
      async () => {
        setSaving(true);
        try {
          const payload = {
            period: form.period,
            dueDate: form.dueDate,
            type: form.type,
          };
          if (deadline.period) {
            // Update
            await api.deadlines.update(deadline.period, payload);
          } else {
            // Create
            await api.deadlines.create(payload);
          }
          const saved = {
            period: form.period,
            dueDate: form.dueDate,
            type: form.type,
            isPast: new Date(form.dueDate) < new Date(),
          };
          onSave(saved);
        } finally {
          setSaving(false);
        }
      },
      'Đã lưu deadline.',
    );
  }

  return (
    <Modal
      title={deadline.period ? 'Chỉnh sửa deadline' : 'Thêm deadline mới'}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="px-[26px] py-6 grid sm:grid-cols-1 gap-y-[21px]">
          <Field label="Mã học kỳ / Kỳ báo cáo *" hint="Ví dụ: FALL2026, 2026-01">
            <input
              required
              disabled={!!deadline.period}
              value={form.period}
              onChange={(e) => setForm({ ...form, period: e.target.value })}
              placeholder="FALL2026"
            />
          </Field>
          <Field label="Ngày hết hạn *">
            <input
              required
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </Field>
          <Field label="Loại deadline">
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="monthly">Hàng tháng</option>
              <option value="quarterly">Hàng quý</option>
              <option value="semester">Học kỳ</option>
              <option value="yearly">Hàng năm</option>
            </select>
          </Field>
        </div>
        <div className="sticky bottom-0 z-[1] border-t border-[#e9ebee] px-[26px] py-[17px] flex gap-[10px] justify-end bg-[#fdfdfe] rounded-b-[14px]">
          <Button type="button" onClick={onClose} disabled={saving}>Hủy</Button>
          <Button type="submit" variant="primary" icon={Check} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu deadline'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
