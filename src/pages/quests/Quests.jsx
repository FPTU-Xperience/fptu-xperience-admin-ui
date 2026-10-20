import './Quests.css';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
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
import api from '../../services/api.js';
import { date, seasonLabel } from '../../utils/format.js';
import { useAction } from '../../hooks/useAction.js';
import { Badge, Button, Empty, Field, Modal, PageHeader, Tabs } from '../../components/ui/index.js';

export function Quests() {
  const run = useAction();
  const { season } = useWorkspace();

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
      const response = await api.studentAffairs.quests.list();
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
    (q) => (!season || q.season === season) && (tab === 'all' || q.status === tab),
  );

  async function changeStatus(quest) {
    const next = quest.status === 'published' ? 'paused' : 'published';
    await run(
      async () => {
        await api.studentAffairs.quests.updateStatus(quest.id, next);
        setQuests((prev) => prev.map((q) => (q.id === quest.id ? { ...q, status: next } : q)));
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
        <Button variant="primary" icon={Plus} disabled={!season} onClick={() => setEdit({})}>
          Tạo nhiệm vụ
        </Button>
      </PageHeader>

      {/* Quest Hero Banner */}
      <div className="quests-content">
        <div>
          <div className="quests-content-2">TỪ MỘT NHIỆM VỤ NHỎ</div>
          <h2 className="quests-heading">Đến những thay đổi có ý nghĩa.</h2>
          <p className="quests-description">
            Nhiệm vụ toàn trường giúp sinh viên tìm thấy một lý do để bắt đầu.
          </p>
        </div>
        <Target size={85} strokeWidth={1} className="quests-target" />
      </div>

      {/* Error Banner */}
      {error && (
        <div className="quests-content-3">
          <span className="quests-text">⚠️</span>
          {error}
          <button className="quests-button" onClick={fetchQuests}>
            Thử lại
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="quests-content-4">
        <Tabs
          active={tab}
          onChange={setTab}
          items={[
            { id: 'all', label: 'Tất cả', count: filtered.length },
            {
              id: 'published',
              label: 'Đã công bố',
              count: quests.filter((q) => q.status === 'published').length,
            },
            { id: 'draft', label: 'Bản nháp' },
            { id: 'paused', label: 'Tạm dừng' },
          ]}
        />
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="quests-content-5">
          <div className="quests-content-6" />
          Đang tải nhiệm vụ...
        </div>
      ) : filtered.length ? (
        /* Quest Grid */
        <div className="quests-content-7">
          {filtered.map((q) => {
            const Icon = q.icon === 'leaf' ? Leaf : Sparkles;
            const artColors = {
              sparkles: { bg: 'quests-bg', text: 'quests-text-2' },
              leaf: { bg: 'quests-bg-2', text: 'quests-text-3' },
            };
            const art = artColors[q.icon] || artColors.sparkles;
            const pct = Math.min((q.joined / q.target) * 100, 100);

            return (
              <article key={q.id} className="quests-card">
                {/* Quest Art */}
                <div className={`quests-content-8 ${art.bg} ${art.text} quests-content-9`}>
                  {/* Decorative circles */}
                  <div className="quests-content-10">
                    <div className="quests-content-11" />
                    <div className="quests-content-12" />
                  </div>
                  <Icon size={54} strokeWidth={1.3} />
                  <Badge
                    tone={q.status === 'published' ? 'green' : 'neutral'}
                    className="quests-badge"
                  >
                    {q.status === 'published'
                      ? 'Đã công bố'
                      : q.status === 'draft'
                        ? 'Bản nháp'
                        : 'Tạm dừng'}
                  </Badge>
                  <span className="quests-text-4">
                    <Sparkles size={14} />
                    {q.reward} XP
                  </span>
                </div>

                {/* Quest Content */}
                <div className="quests-content-13">
                  <div className="quests-content-14">
                    {q.category} · {q.kind}
                  </div>
                  <h2 className="quests-heading-2">{q.name}</h2>
                  <p className="quests-description-2">{q.description || 'Chưa có mô tả'}</p>

                  <div className="quests-content-15">
                    <UsersRound size={15} />
                    {q.scope}
                  </div>
                  <div className="quests-content-16">
                    <Clock3 size={15} />
                    {q.deadline ? `Đến ${date(q.deadline)}` : 'Không có hạn'}
                  </div>

                  {/* Progress */}
                  <div className="quests-content-17">
                    <span>
                      {q.joined} / {q.target} lượt đăng ký
                    </span>
                    <b className="quests-b">{Math.round(pct)}%</b>
                  </div>
                  <div className="quests-content-18">
                    <i className="quests-indicator" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="quests-description-3">{q.completed} lượt hoàn thành đã xác thực</p>

                  {/* Actions */}
                  <div className="quests-content-19">
                    <Button icon={Pencil} onClick={() => setEdit(q)} className="quests-button-2">
                      Chỉnh sửa
                    </Button>
                    <Button
                      icon={q.status === 'published' ? Pause : Send}
                      variant={q.status === 'published' ? 'secondary' : 'primary'}
                      onClick={() => changeStatus(q)}
                      className="quests-button-2"
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
        <Empty
          title="Chưa có nhiệm vụ trong nhóm này"
          description="Tạo nhiệm vụ đầu tiên cho học kỳ đang xem."
        />
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
    season: safeString(report.period || report.semesterCode || report.season, ''),
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
    await run(async () => {
      setSaving(true);
      try {
        const payload = {
          title: form.name,
          name: form.name,
          description: form.description,
          period: season,
          semesterCode: season,
          kind: form.kind,
          reportType: form.kind,
          category: form.category,
          tag: form.category,
          scope: form.scope,
          rewardXp: Number(form.reward) || 50,
          reward: Number(form.reward) || 50,
          targetParticipants: Number(form.target) || 100,
          target: Number(form.target) || 100,
          deadline: form.deadline,
          dueDate: form.deadline,
          icon: form.icon || 'sparkles',
          status: quest.id ? quest.status : 'draft',
        };

        let saved;
        if (quest.id) {
          saved = await api.studentAffairs.quests.update(quest.id, payload);
        } else {
          saved = await api.studentAffairs.quests.create(payload);
        }

        const mapped = mapQuestFromApi(saved);
        onSave(mapped);
      } finally {
        setSaving(false);
      }
    }, 'Đã lưu nhiệm vụ. Bạn có thể công bố từ danh sách.');
  }

  return (
    <Modal
      title={quest.id ? 'Chỉnh sửa nhiệm vụ' : 'Tạo nhiệm vụ toàn trường'}
      description={`Học kỳ ${seasonLabel(season)} · Lưu bản nháp trước khi công bố.`}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="quests-content-20">
          <Field label="Tên nhiệm vụ *" className="quests-field">
            <input autoFocus required maxLength={100} {...bind('name')} />
          </Field>
          <Field label="Mô tả và điều kiện hoàn thành *" className="quests-field">
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
          <Field label="Đối tượng" className="quests-field">
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
          <Field label="Hạn hoàn thành *" className="quests-field">
            <input required type="date" {...bind('deadline')} />
          </Field>
        </div>
        <div className="quests-content-21">
          <Button type="button" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" icon={Check} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu nhiệm vụ'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
