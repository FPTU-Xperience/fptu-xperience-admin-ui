import { useEffect, useState } from 'react';
import {
  Check,
  Clock3,
  Leaf,
  Pause,
  Pencil,
  Plus,
  Send,
  Sparkles,
  Target,
  UsersRound,
} from 'lucide-react';
import api from '../services/api.js';
import { date, seasonLabel } from '../utils/format.js';
import { useAction } from '../hooks/useAction.js';
import { Badge, Button, Empty, Field, Modal, PageHeader, Tabs } from '../components/ui/index.js';

const DEFAULT_SEASON = 'FALL2026';

export function Quests() {
  const run = useAction();
  const [season] = useState(DEFAULT_SEASON);

  // Data state
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI state
  const [tab, setTab] = useState('all');
  const [edit, setEdit] = useState(null);

  // Fetch quests from API (using reports endpoint)
  async function fetchQuests() {
    setLoading(true);
    setError(null);
    try {
      const response = await api.reports.list({ page: 1, pageSize: 100 });
      const data = Array.isArray(response) ? response : response?.items || [];
      // Filter to quests/campaigns or show all reports
      setQuests(data.map(mapQuestFromApi));
    } catch (err) {
      console.error('Failed to fetch quests:', err);
      setError(err.message || 'Không thể tải danh sách nhiệm vụ');
      setQuests([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchQuests();
  }, []);

  // Filter by season and tab
  const filtered = quests.filter(
    (q) => q.season === season && (tab === 'all' || q.status === tab),
  );

  async function changeStatus(quest) {
    const next = quest.status === 'published' ? 'paused' : 'published';
    await run(
      async () => {
        if (next === 'published') {
          await api.reports.submit(quest.id);
        }
        setQuests((prev) =>
          prev.map((q) =>
            q.id === quest.id ? { ...q, status: next } : q,
          ),
        );
      },
      next === 'published' ? 'Đã công bố nhiệm vụ.' : 'Đã tạm dừng nhiệm vụ.',
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="MỞ THÊM CƠ HỘI TRẢI NGHIỆM"
        title="Nhiệm vụ & chiến dịch"
        description="Tạo động lực để sinh viên chủ động khám phá, đóng góp và kết nối."
      >
        <Button variant="primary" icon={Plus} onClick={() => setEdit({})}>
          Tạo nhiệm vụ
        </Button>
      </PageHeader>

      {/* Quest Hero Banner */}
      <div className="flex items-center justify-between bg-gradient-to-br from-[#f2f0fa] to-[#faf7fb] border border-[#ebe6f1] text-[#b6a6cf] p-[30px_35px] rounded-[10px] mb-[22px]">
        <div>
          <div className="text-[9px] sm:text-[10px] tracking-[1px] font-semibold mb-[10px]">TỪ MỘT NHIỆM VỤ NHỎ</div>
          <h2 className="text-[17px] sm:text-[21px] text-[#74618d] font-semibold mb-[10px]">Đến những thay đổi có ý nghĩa.</h2>
          <p className="text-[11px] text-[#a296b0]">Nhiệm vụ toàn trường giúp sinh viên tìm thấy một lý do để bắt đầu.</p>
        </div>
        <Target size={85} strokeWidth={1} className="shrink-0 ml-[15px] hidden sm:block" />
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-4 p-[14px] border border-[#f2dfdc] bg-[#fff3f2] text-[#bd7970] rounded-[7px] text-[11px]">
          <span className="mr-2">⚠️</span>
          {error}
          <button className="ml-2 underline hover:no-underline" onClick={fetchQuests}>
            Thử lại
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-5">
        <Tabs
          active={tab}
          onChange={setTab}
          items={[
            { id: 'all', label: 'Tất cả', count: filtered.length },
            { id: 'published', label: 'Đã công bố', count: quests.filter((q) => q.status === 'published').length },
            { id: 'draft', label: 'Bản nháp' },
            { id: 'paused', label: 'Tạm dừng' },
          ]}
        />
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-[#9096a1]">
          <div className="w-6 h-6 border-2 border-[#e1e4e9] border-t-[#ed641c] rounded-full animate-spin mr-3" />
          Đang tải nhiệm vụ...
        </div>
      ) : filtered.length ? (
        /* Quest Grid */
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((q) => {
            const Icon = q.icon === 'leaf' ? Leaf : Sparkles;
            const artColors = {
              sparkles: { bg: 'bg-[#f5effa]', text: 'text-[#ab95c6]' },
              leaf: { bg: 'bg-[#edf5f0]', text: 'text-[#89b397]' },
            };
            const art = artColors[q.icon] || artColors.sparkles;
            const pct = Math.min((q.joined / q.target) * 100, 100);

            return (
              <article key={q.id} className="bg-white border border-[#e9ebee] rounded-[11px] overflow-hidden">
                {/* Quest Art */}
                <div className={`relative h-[150px] ${art.bg} ${art.text} flex items-center justify-center overflow-hidden`}>
                  {/* Decorative circles */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="absolute w-[170px] h-[170px] rounded-full border border-current opacity-[0.15]" />
                    <div className="absolute w-[230px] h-[230px] rounded-full border border-current opacity-[0.15]" />
                  </div>
                  <Icon size={54} strokeWidth={1.3} />
                  <Badge tone={q.status === 'published' ? 'green' : 'neutral'} className="absolute top-[15px] right-[15px] bg-white/60">
                    {q.status === 'published' ? 'Đã công bố' : q.status === 'draft' ? 'Bản nháp' : 'Tạm dừng'}
                  </Badge>
                  <span className="absolute bottom-[13px] left-[17px] bg-white rounded-[5px] flex items-center gap-[5px] px-[8px] py-[5px] text-[10px] font-semibold text-[#a68a63]">
                    <Sparkles size={14} />
                    {q.reward} XP
                  </span>
                </div>

                {/* Quest Content */}
                <div className="p-[22px]">
                  <div className="text-[9px] tracking-[1px] font-semibold text-[#929aa6] mb-[10px]">
                    {q.category} · {q.kind}
                  </div>
                  <h2 className="text-[15px] font-semibold text-[#4a5462] mb-[12px]">{q.name}</h2>
                  <p className="text-[11px] text-[#717d8d] mb-[18px] min-h-[52px]">{q.description || 'Chưa có mô tả'}</p>

                  <div className="flex items-center gap-[8px] text-[11px] text-[#717d8d] mb-[10px]">
                    <UsersRound size={15} />
                    {q.scope}
                  </div>
                  <div className="flex items-center gap-[8px] text-[11px] text-[#717d8d] mb-[21px]">
                    <Clock3 size={15} />
                    {q.deadline ? `Đến ${date(q.deadline)}` : 'Không có hạn'}
                  </div>

                  {/* Progress */}
                  <div className="flex justify-between text-[10px] text-[#abb1b9] mb-[10px]">
                    <span>{q.joined} / {q.target} lượt đăng ký</span>
                    <b className="font-medium text-[#c98e67]">{Math.round(pct)}%</b>
                  </div>
                  <div className="w-full h-[5px] bg-[#f1f2f4] rounded-[6px] overflow-hidden mb-[9px]">
                    <i className="block h-full bg-[#ed9c6a] rounded-[6px]" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[10px] text-[#a4aab2] mb-[20px]">{q.completed} lượt hoàn thành đã xác thực</p>

                  {/* Actions */}
                  <div className="flex gap-[9px] mt-5">
                    <Button icon={Pencil} onClick={() => setEdit(q)} className="flex-1 text-[10px]">
                      Chỉnh sửa
                    </Button>
                    <Button
                      icon={q.status === 'published' ? Pause : Send}
                      variant={q.status === 'published' ? 'secondary' : 'primary'}
                      onClick={() => changeStatus(q)}
                      className="flex-1 text-[10px]"
                    >
                      {q.status === 'published' ? 'Tạm dừng' : 'Công bố'}
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <Empty title="Chưa có nhiệm vụ trong nhóm này" description="Tạo nhiệm vụ đầu tiên cho học kỳ đang xem." />
      )}

      {edit && (
        <QuestForm
          quest={edit}
          season={season}
          onClose={() => setEdit(null)}
          onSave={(saved) => {
            if (edit.id) {
              setQuests((prev) => prev.map((q) => (q.id === saved.id ? saved : q)));
            } else {
              setQuests((prev) => [saved, ...prev]);
            }
            setEdit(null);
          }}
        />
      )}
    </>
  );
}

// Helper to safely convert any value to a renderable string
function safeString(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    // Try common property names
    const candidate =
      value.name || value.title || value.label || value.displayName || value.value || fallback;
    return safeString(candidate, fallback);
  }
  return fallback;
}

function safeNumber(value, fallback = 0) {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

// Map backend report to quest format (only safe scalar fields)
function mapQuestFromApi(report) {
  const status = safeString(report.status, 'draft').toLowerCase();

  return {
    id: String(report.id || report.activityId || crypto.randomUUID()),
    name: safeString(report.title || report.name || report.activityName, 'Nhiệm vụ chưa đặt tên'),
    description: safeString(report.description || report.purpose, ''),
    category: safeString(report.category || report.activityType || report.tag, 'Nhiệm vụ'),
    kind: safeString(report.reportType || report.kind || report.scope, 'Cá nhân'),
    scope: safeString(report.scope || report.targetAudience, 'Toàn bộ sinh viên'),
    reward: safeNumber(report.reward || report.xpReward || report.xp, 0),
    target: safeNumber(report.target || report.targetParticipantCount || report.joined, 0),
    deadline: safeString(report.dueDate || report.deadline || report.activityDate, ''),
    season: safeString(report.period || report.season, DEFAULT_SEASON),
    icon: 'sparkles',
    status: status,
    joined: safeNumber(report.joined, 0),
    completed: safeNumber(report.completed, 0),
  };
}

function QuestForm({ quest, season, onClose, onSave }) {
  const run = useAction();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'Khám phá',
    scope: 'Toàn bộ sinh viên',
    kind: 'Cá nhân',
    reward: 100,
    target: 50,
    deadline: '',
    icon: 'sparkles',
    ...quest,
  });

  const bind = (key) => ({
    value: form[key],
    onChange: (e) => setForm({ ...form, [key]: e.target.value }),
  });

  async function submit(e) {
    e.preventDefault();
    await run(
      async () => {
        setSaving(true);
        try {
          const payload = {
            title: form.name,
            description: form.description,
            period: season,
            reportType: form.kind,
            tag: form.category,
            dueDate: form.deadline,
          };

          let saved;
          if (quest.id) {
            saved = await api.reports.update(quest.id, payload);
          } else {
            saved = await api.reports.create(payload);
          }

          const mapped = mapQuestFromApi(saved);
          onSave(mapped);
        } finally {
          setSaving(false);
        }
      },
      'Đã lưu nhiệm vụ. Bạn có thể công bố từ danh sách.',
    );
  }

  return (
    <Modal
      title={quest.id ? 'Chỉnh sửa nhiệm vụ' : 'Tạo nhiệm vụ toàn trường'}
      description={`Học kỳ ${seasonLabel(season)} · Lưu bản nháp trước khi công bố.`}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="px-[26px] py-6 grid sm:grid-cols-2 gap-x-[18px] gap-y-[21px]">
          <Field label="Tên nhiệm vụ *" className="sm:col-span-2">
            <input autoFocus required maxLength={100} {...bind('name')} />
          </Field>
          <Field label="Mô tả và điều kiện hoàn thành *" className="sm:col-span-2">
            <textarea required rows={3} maxLength={1000} {...bind('description')} />
          </Field>
          <Field label="Loại nhiệm vụ">
            <select {...bind('kind')}>
              {['Cá nhân', 'Theo nhóm', 'Chiến dịch'].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Lĩnh vực">
            <select {...bind('category')}>
              {['Khám phá', 'Công nghệ', 'Nghệ thuật', 'Thể thao', 'Tình nguyện'].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Đối tượng" className="sm:col-span-2">
            <select {...bind('scope')}>
              <option>Toàn bộ sinh viên</option>
              <option>Sinh viên chưa tham gia CLB</option>
              <option>Tân sinh viên</option>
            </select>
          </Field>
          <Field label="XP thưởng *">
            <input type="number" required min={1} max={5000} step={1} {...bind('reward')} />
          </Field>
          <Field label="Mục tiêu lượt đăng ký *">
            <input required type="number" min={1} max={10000} step={1} {...bind('target')} />
          </Field>
          <Field label="Hạn hoàn thành *" className="sm:col-span-2">
            <input
              required
              type="date"
              {...bind('deadline')}
            />
          </Field>
        </div>
        <div className="sticky bottom-0 z-[1] border-t border-[#e9ebee] px-[26px] py-[17px] flex gap-[10px] justify-end bg-[#fdfdfe] rounded-b-[14px]">
          <Button type="button" onClick={onClose} disabled={saving}>Hủy</Button>
          <Button type="submit" variant="primary" icon={Check} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu nhiệm vụ'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
