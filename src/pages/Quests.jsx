import { useState } from 'react';
import {
  Check,
  Clock3,
  Compass,
  Leaf,
  Pause,
  Pencil,
  Plus,
  Send,
  Sparkles,
  Target,
  UsersRound,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import { date, number, seasonLabel } from '../utils/format.js';
import { useAction } from '../hooks/useAction.js';
import { Badge, Button, Empty, Field, Modal, PageHeader, Tabs } from '../components/ui/index.js';

export function Quests() {
  const { state, season, commit } = useWorkspace();
  const run = useAction();
  const [tab, setTab] = useState('all');
  const [edit, setEdit] = useState(null);
  const all = state.quests.filter((q) => q.season === season);
  const items = all.filter((q) => tab === 'all' || q.status === tab);
  function changeStatus(quest) {
    const next = quest.status === 'published' ? 'paused' : 'published';
    run(
      () =>
        commit(
          next === 'published' ? 'Công bố nhiệm vụ' : 'Tạm dừng nhiệm vụ',
          quest.name,
          'affairs',
          (draft) => {
            if (next === 'published' && new Date(`${quest.deadline}T23:59:59`) < new Date())
              throw new Error('Nhiệm vụ đã quá hạn. Hãy cập nhật thời hạn trước khi công bố.');
            draft.quests.find((q) => q.id === quest.id).status = next;
          },
        ),
      next === 'published' ? 'Đã công bố nhiệm vụ trong bản mẫu.' : 'Đã tạm dừng nhiệm vụ.',
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
      <div className="quest-hero">
        <div>
          <span className="eyebrow">TỪ MỘT NHIỆM VỤ NHỎ</span>
          <h2>Đến những thay đổi có ý nghĩa.</h2>
          <p>Nhiệm vụ toàn trường giúp sinh viên tìm thấy một lý do để bắt đầu.</p>
        </div>
        <Target size={85} strokeWidth={1} />
      </div>
      <div className="standalone-tabs">
        <Tabs
          active={tab}
          onChange={setTab}
          items={[
            { id: 'all', label: 'Tất cả', count: all.length },
            {
              id: 'published',
              label: 'Đã công bố',
              count: all.filter((q) => q.status === 'published').length,
            },
            { id: 'draft', label: 'Bản nháp' },
            { id: 'paused', label: 'Tạm dừng' },
          ]}
        />
      </div>
      <div className="quest-grid">
        {items.map((q) => {
          const Icon = q.icon === 'leaf' ? Leaf : q.icon === 'compass' ? Compass : Sparkles;
          return (
            <article className="quest-card" key={q.id}>
              <div className={`quest-art ${q.icon}`}>
                <Icon size={54} strokeWidth={1.3} />
                <Badge tone={q.status === 'published' ? 'green' : 'neutral'}>
                  {q.status === 'published'
                    ? 'Đã công bố'
                    : q.status === 'draft'
                      ? 'Bản nháp'
                      : 'Tạm dừng'}
                </Badge>
                <span className="quest-reward">
                  <Sparkles size={14} />
                  {q.reward} XP
                </span>
              </div>
              <div className="quest-content">
                <div className="eyebrow">
                  {q.category} · {q.kind}
                </div>
                <h2>{q.name}</h2>
                <p>{q.description}</p>
                <div className="quest-scope">
                  <UsersRound size={15} />
                  {q.scope}
                </div>
                <div className="quest-scope">
                  <Clock3 size={15} />
                  Đến {date(q.deadline)}
                </div>
                <div className="progress-label">
                  <span>
                    {q.joined} / {q.target} lượt đăng ký
                  </span>
                  <b>{Math.round((q.joined / q.target) * 100)}%</b>
                </div>
                <div className="meter">
                  <i style={{ width: `${Math.min((q.joined / q.target) * 100, 100)}%` }} />
                </div>
                <small className="muted">{q.completed} lượt hoàn thành đã xác thực</small>
                <div className="quest-actions">
                  <Button icon={Pencil} onClick={() => setEdit(q)}>
                    Chỉnh sửa
                  </Button>
                  <Button
                    icon={q.status === 'published' ? Pause : Send}
                    variant={q.status === 'published' ? 'secondary' : 'primary'}
                    onClick={() => changeStatus(q)}
                  >
                    {q.status === 'published' ? 'Tạm dừng' : 'Công bố'}
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {!items.length && (
        <Empty
          title="Chưa có nhiệm vụ trong nhóm này"
          description="Tạo nhiệm vụ đầu tiên cho học kỳ đang xem."
        />
      )}
      {edit && <QuestForm quest={edit} onClose={() => setEdit(null)} />}
    </>
  );
}
function QuestForm({ quest, onClose }) {
  const { state, commit, season } = useWorkspace();
  const run = useAction();
  const currentSeason = state.seasons.find((s) => s.id === season);
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'Khám phá',
    scope: 'Toàn bộ sinh viên',
    kind: 'Cá nhân',
    reward: 100,
    target: 50,
    deadline: currentSeason.end,
    season,
    icon: 'sparkles',
    status: 'draft',
    ...quest,
  });
  const bind = (key) => ({
    value: form[key],
    onChange: (e) => setForm({ ...form, [key]: e.target.value }),
  });
  async function submit(e) {
    e.preventDefault();
    const ok = await run(
      () =>
        commit(
          quest.id ? 'Cập nhật nhiệm vụ' : 'Tạo nhiệm vụ toàn trường',
          form.name.trim(),
          'affairs',
          (draft) => {
            if (!form.name.trim() || !form.description.trim())
              throw new Error('Nhập tên và mô tả nhiệm vụ.');
            if (form.deadline < currentSeason.start || form.deadline > currentSeason.end)
              throw new Error('Hạn nhiệm vụ phải nằm trong học kỳ.');
            const next = {
              ...form,
              name: form.name.trim(),
              reward: Number(form.reward),
              target: Number(form.target),
              joined: quest.joined || 0,
              completed: quest.completed || 0,
              id: quest.id || crypto.randomUUID(),
            };
            if (quest.id) draft.quests = draft.quests.map((q) => (q.id === quest.id ? next : q));
            else draft.quests.push(next);
          },
        ),
      'Đã lưu nhiệm vụ. Bạn có thể công bố từ danh sách.',
    );
    if (ok) onClose();
  }
  return (
    <Modal
      title={quest.id ? 'Chỉnh sửa nhiệm vụ' : 'Tạo nhiệm vụ toàn trường'}
      description={`Học kỳ ${seasonLabel(season)} · Lưu bản nháp trước khi công bố.`}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="modal-body form-grid">
          <Field label="Tên nhiệm vụ *" className="full-width">
            <input autoFocus required maxLength={100} {...bind('name')} />
          </Field>
          <Field label="Mô tả và điều kiện hoàn thành *" className="full-width">
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
              {['Khám phá', ...state.types].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Đối tượng" className="full-width">
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
          <Field label="Hạn hoàn thành *" className="full-width">
            <input
              required
              type="date"
              min={currentSeason.start}
              max={currentSeason.end}
              {...bind('deadline')}
            />
          </Field>
        </div>
        <div className="modal-footer">
          <Button type="button" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" icon={Check}>
            Lưu nhiệm vụ
          </Button>
        </div>
      </form>
    </Modal>
  );
}
