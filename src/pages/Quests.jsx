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
import { date, seasonLabel } from '../utils/format.js';
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

      {/* Quest Hero Banner */}
      <div className="flex items-center justify-between bg-gradient-to-br from-[#f2f0fa] to-[#faf7fb] border border-[#ebe6f1] text-[#b6a6cf] p-[30px_35px] rounded-[10px] mb-[22px]">
        <div>
          <div className="text-[9px] sm:text-[10px] tracking-[1px] font-semibold mb-[10px]">TỪ MỘT NHIỆM VỤ NHỎ</div>
          <h2 className="text-[17px] sm:text-[21px] text-[#74618d] font-semibold mb-[10px]">Đến những thay đổi có ý nghĩa.</h2>
          <p className="text-[11px] text-[#a296b0]">Nhiệm vụ toàn trường giúp sinh viên tìm thấy một lý do để bắt đầu.</p>
        </div>
        <Target size={85} strokeWidth={1} className="shrink-0 ml-[15px] hidden sm:block" />
      </div>

      {/* Tabs */}
      <div className="mb-5">
        <Tabs
          active={tab}
          onChange={setTab}
          items={[
            { id: 'all', label: 'Tất cả', count: all.length },
            { id: 'published', label: 'Đã công bố', count: all.filter((q) => q.status === 'published').length },
            { id: 'draft', label: 'Bản nháp' },
            { id: 'paused', label: 'Tạm dừng' },
          ]}
        />
      </div>

      {/* Quest Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map((q) => {
          const Icon = q.icon === 'leaf' ? Leaf : q.icon === 'compass' ? Compass : Sparkles;
          const artColors = {
            sparkles: { bg: 'bg-[#f5effa]', text: 'text-[#ab95c6]' },
            compass: { bg: 'bg-[#fff2e7]', text: 'text-[#d4ac7e]' },
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
                <p className="text-[11px] text-[#717d8d] mb-[18px] min-h-[52px]">{q.description}</p>

                <div className="flex items-center gap-[8px] text-[11px] text-[#717d8d] mb-[10px]">
                  <UsersRound size={15} />
                  {q.scope}
                </div>
                <div className="flex items-center gap-[8px] text-[11px] text-[#717d8d] mb-[21px]">
                  <Clock3 size={15} />
                  Đến {date(q.deadline)}
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

      {!items.length && (
        <Empty title="Chưa có nhiệm vụ trong nhóm này" description="Tạo nhiệm vụ đầu tiên cho học kỳ đang xem." />
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
              {['Khám phá', ...state.types].map((t) => (
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
              min={currentSeason.start}
              max={currentSeason.end}
              {...bind('deadline')}
            />
          </Field>
        </div>
        <div className="sticky bottom-0 z-[1] border-t border-[#e9ebee] px-[26px] py-[17px] flex gap-[10px] justify-end bg-[#fdfdfe] rounded-b-[14px]">
          <Button type="button" onClick={onClose}>Hủy</Button>
          <Button type="submit" variant="primary" icon={Check}>Lưu nhiệm vụ</Button>
        </div>
      </form>
    </Modal>
  );
}
