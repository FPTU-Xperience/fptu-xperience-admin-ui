import './Seasons.css';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import { mapSemesterOptions } from '../../utils/semesters.js';
import { useEffect, useState } from 'react';
import { CalendarDays, Check, Pencil, Plus, Trash2 } from 'lucide-react';
import api from '../../services/api.js';
import { date, seasonLabel } from '../../utils/format.js';
import { useAction } from '../../hooks/useAction.js';
import {
  Badge,
  Button,
  Empty,
  Field,
  Modal,
  PageHeader,
  Panel,
} from '../../components/ui/index.js';

export function Seasons() {
  const run = useAction();

  const { retrySemesters } = useWorkspace();
  const [seasonStatus, setSeasonStatus] = useState('loading');
  const [seasonError, setSeasonError] = useState('');

  // Season configuration
  const [seasons, setSeasons] = useState([]);
  const [currentSeason, setCurrentSeason] = useState('');

  // Deadlines from API
  const [deadlines, setDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch seasons
  async function fetchSeasons() {
    setSeasonStatus('loading');
    setSeasonError('');
    try {
      const [list, active] = await Promise.allSettled([
        api.seasons.list(),
        api.seasons.getActive(),
      ]);
      if (list.status === 'rejected') throw list.reason;
      const options = mapSemesterOptions(list.value);
      setSeasons(options);
      setCurrentSeason(
        active.value?.semesterCode || options.find((item) => item.isActive)?.id || '',
      );
      setSeasonStatus(options.length ? 'ready' : 'empty');
    } catch (error) {
      setSeasons([]);
      setSeasonStatus('error');
      setSeasonError(error.message || 'Không thể tải học kỳ.');
    }
  }

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
    fetchSeasons();
  }, []);

  // Delete deadline
  async function handleDeleteDeadline() {
    if (!deletingDeadline) return;
    await run(async () => {
      await api.deadlines.delete(deletingDeadline.period);
      setDeadlines((prev) => prev.filter((d) => d.period !== deletingDeadline.period));
      setDeletingDeadline(null);
    }, 'Đã xóa deadline.');
  }

  return (
    <>
      <PageHeader
        eyebrow="MỖI HỌC KỲ, MỘT KHỞI ĐẦU MỚI"
        title="Học kỳ & deadline"
        description="Thiết lập nhịp trải nghiệm, ngưỡng kết nối và thời hạn báo cáo."
      >
        <div className="seasons-content">
          <Button icon={Plus} onClick={() => setEditingSeason({})}>
            Thêm học kỳ
          </Button>
          <Button variant="primary" icon={Plus} onClick={() => setEditingDeadline({})}>
            Thêm deadline
          </Button>
        </div>
      </PageHeader>

      {/* Season Principle Banner */}
      <div className="seasons-content-2">
        <CalendarDays size={28} className="seasons-calendar-days" />
        <div>
          <h2 className="seasons-heading">Tiến bộ theo mùa. Giá trị theo năm tháng.</h2>
          <p className="seasons-description">
            Xperience Point cạnh tranh và xếp hạng được tính riêng mỗi học kỳ. Hồ sơ đóng góp và lịch sử xác thực
            được giữ lâu dài.
          </p>
        </div>
      </div>

      {seasonStatus === 'loading' && (
        <p role="status" className="seasons-description-2">
          Đang tải học kỳ…
        </p>
      )}
      {seasonStatus === 'error' && (
        <div role="alert" className="seasons-content-3">
          <p>{seasonError}</p>
          <Button onClick={fetchSeasons}>Thử lại</Button>
        </div>
      )}
      {seasonStatus === 'empty' && (
        <Empty title="Chưa có học kỳ" description="Thêm học kỳ đầu tiên để bắt đầu cấu hình." />
      )}
      {/* Season Grid */}
      <div className="seasons-content-4">
        {seasons.map((s) => (
          <Panel key={s.id} className="seasons-panel">
            {/* Heading */}
            <div className="seasons-content-5">
              <span className="seasons-text">
                <CalendarDays size={24} />
              </span>
              <Badge tone={s.id === currentSeason ? 'orange' : 'neutral'}>
                {s.id === currentSeason ? 'Đang xem' : 'Học kỳ khác'}
              </Badge>
            </div>

            {/* Info */}
            <h2 className="seasons-heading-2">{seasonLabel(s.id)}</h2>
            <p className="seasons-description-3">
              {date(s.start)} — {date(s.end)}
            </p>

            {/* Details */}
            <dl className="seasons-definition-list">
              <div className="seasons-content-6">
                <dt className="seasons-term">Ngưỡng cần kết nối</dt>
                <dd className="seasons-definition">{s.threshold} Xperience Point</dd>
              </div>
              <div className="seasons-content-6">
                <dt className="seasons-term">Xperience Point mỗi cấp độ</dt>
                <dd className="seasons-definition">{s.xpPerLevel} Xperience Point</dd>
              </div>
              <div className="seasons-content-6">
                <dt className="seasons-term">Hiển thị xếp hạng</dt>
                <dd className="seasons-definition">
                  {s.rankings ? 'Bật' : 'Tắt · Ưu tiên tiến bộ cá nhân'}
                </dd>
              </div>
            </dl>

            <Button icon={Pencil} onClick={() => setEditingSeason(s)} className="seasons-button">
              Chỉnh sửa cấu hình
            </Button>
          </Panel>
        ))}
      </div>

      {/* Deadlines Section */}
      <Panel title="Deadline báo cáo" description="Thời hạn nộp báo cáo hoạt động cho từng học kỳ">
        {error && (
          <div className="seasons-content-7">
            <span className="seasons-text-2">⚠️</span>
            {error}
            <button className="seasons-button-2" onClick={fetchDeadlines}>
              Thử lại
            </button>
          </div>
        )}

        {loading ? (
          <div className="seasons-content-8">
            <div className="seasons-content-9" />
            Đang tải deadline...
          </div>
        ) : deadlines.length === 0 ? (
          <Empty
            title="Chưa có deadline"
            description="Thêm deadline để quản lý thời hạn nộp báo cáo."
          />
        ) : (
          <div className="seasons-content-10">
            <table className="seasons-table">
              <thead>
                <tr>
                  <th className="seasons-column">HỌC KỲ</th>
                  <th className="seasons-column">NGÀY HẾT HẠN</th>
                  <th className="seasons-column">LOẠI</th>
                  <th className="seasons-column">TRẠNG THÁI</th>
                  <th className="seasons-column" />
                </tr>
              </thead>
              <tbody>
                {deadlines.map((dl) => (
                  <tr key={dl.period}>
                    <td className="seasons-cell">
                      <strong className="seasons-value">{dl.period}</strong>
                    </td>
                    <td className="seasons-cell-2">{date(dl.dueDate)}</td>
                    <td className="seasons-cell">
                      <Badge>{dl.type || 'monthly'}</Badge>
                    </td>
                    <td className="seasons-cell">
                      <Badge tone={dl.isPast ? 'neutral' : 'green'} dot>
                        {dl.isPast ? 'Đã qua' : 'Còn hạn'}
                      </Badge>
                    </td>
                    <td className="seasons-cell">
                      <div className="seasons-content-11">
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
            retrySemesters();
            setSeasons((prev) => {
              const exists = prev.some((s) => s.id === saved.id);
              if (exists) {
                return prev.map((s) => (s.id === saved.id ? saved : s));
              }
              return [...prev, saved];
            });
            setEditingSeason(null);
            fetchSeasons();
          }}
        />
      )}

      {/* Deadline Form Modal */}
      {editingDeadline && (
        <DeadlineForm
          deadline={editingDeadline}
          onClose={() => setEditingDeadline(null)}
          onSave={(saved) => {
            retrySemesters();
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
          <div className="seasons-content-12">
            <div className="seasons-content-13">
              Deadline đã xóa sẽ không thể khôi phục. Các báo cáo đang chờ xử lý vẫn được giữ.
            </div>
          </div>
          <div className="seasons-content-14">
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
    const ok = await run(async () => {
      const id = form.id.trim().toUpperCase();
      if (!/^(SPRING|SUMMER|FALL)\d{4}$/.test(id))
        throw new Error('Mã học kỳ theo định dạng FALL2026, SUMMER2026 hoặc SPRING2027.');
      if (form.start >= form.end) throw new Error('Ngày kết thúc phải sau ngày bắt đầu.');

      const payload = {
        semesterCode: id,
        start: form.start,
        end: form.end,
        threshold: Number(form.threshold),
        xpPerLevel: Number(form.xpPerLevel),
        rankings: Boolean(form.rankings),
      };

      if (value.id) await api.seasons.update(value.id, payload);
      else await api.seasons.create(payload);

      const saved = { ...form, id };
      onSave(saved);
    }, 'Đã lưu cấu hình học kỳ.');
  }

  return (
    <Modal
      title={value.id ? `Cấu hình ${seasonLabel(value.id)}` : 'Thêm học kỳ mới'}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="seasons-content-15">
          <Field className="seasons-field" label="Mã học kỳ *" hint="Ví dụ: SPRING2027">
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
          <Field label="Ngưỡng cần kết nối (Xperience Point)">
            <input
              required
              type="number"
              min={1}
              max={100000}
              value={form.threshold}
              onChange={(e) => setForm({ ...form, threshold: e.target.value })}
            />
          </Field>
          <Field label="Xperience Point mỗi cấp độ">
            <input
              required
              type="number"
              min={1}
              max={100000}
              value={form.xpPerLevel}
              onChange={(e) => setForm({ ...form, xpPerLevel: e.target.value })}
            />
          </Field>
          <label className="seasons-field-2">
            <input
              type="checkbox"
              checked={form.rankings}
              onChange={(e) => setForm({ ...form, rankings: e.target.checked })}
            />
            Cho phép hiển thị xếp hạng theo học kỳ
          </label>
          <div className="seasons-content-16">
            Mở học kỳ mới tạo phạm vi Xperience Point mới; hồ sơ đóng góp trọn đời và sổ cái hiện tại vẫn được
            giữ nguyên.
          </div>
        </div>
        <div className="seasons-content-17">
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
    await run(async () => {
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
    }, 'Đã lưu deadline.');
  }

  return (
    <Modal title={deadline.period ? 'Chỉnh sửa deadline' : 'Thêm deadline mới'} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="seasons-content-18">
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
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="monthly">Hàng tháng</option>
              <option value="quarterly">Hàng quý</option>
              <option value="semester">Học kỳ</option>
              <option value="yearly">Hàng năm</option>
            </select>
          </Field>
        </div>
        <div className="seasons-content-17">
          <Button type="button" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" icon={Check} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu deadline'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
