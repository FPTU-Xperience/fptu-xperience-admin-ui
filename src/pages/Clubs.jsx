import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Check,
  ChevronRight,
  FileCheck2,
  Pencil,
  Plus,
  Settings2,
  UsersRound,
  X,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import { date, normalize } from '../utils/format.js';
import { useAction } from '../hooks/useAction.js';
import {
  Badge,
  Button,
  Empty,
  Field,
  Modal,
  PageHeader,
  Panel,
  SearchBox,
  StatCard,
  Tabs,
} from '../components/ui/index.js';

export function Clubs() {
  const { state, commit } = useWorkspace();
  const run = useAction();
  const [params] = useSearchParams();
  const [tab, setTab] = useState(params.get('tab') || 'registry');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [detail, setDetail] = useState(null);
  const [edit, setEdit] = useState(null);
  const [review, setReview] = useState(null);
  const [note, setNote] = useState('');
  const [typesOpen, setTypesOpen] = useState(false);
  const [typeName, setTypeName] = useState('');

  useEffect(() => {
    if (params.get('club')) setDetail(state.clubs.find((c) => c.id === params.get('club')));
    if (params.get('tab')) setTab(params.get('tab'));
  }, [params]);

  const filtered = state.clubs.filter(
    (club) =>
      normalize(`${club.name} ${club.code}`).includes(normalize(query)) &&
      (category === 'all' || club.category === category),
  );
  const pending = state.applications.filter((a) => a.status === 'pending');

  async function decide(approved) {
    if (note.trim().length < 5) {
      run(() => {
        throw new Error('Vui lòng nhập nhận xét ít nhất 5 ký tự.');
      });
      return;
    }
    const ok = await run(
      () =>
        commit(
          approved ? 'Duyệt thành lập CLB' : 'Từ chối thành lập CLB',
          `${review.name}: ${note.trim()}`,
          'affairs',
          (draft) => {
            const application = draft.applications.find((a) => a.id === review.id);
            if (application.status !== 'pending') throw new Error('Hồ sơ này đã được xử lý.');
            if (approved && draft.clubs.some((c) => normalize(c.code) === normalize(review.code)))
              throw new Error('Mã CLB đã tồn tại.');
            application.status = approved ? 'approved' : 'rejected';
            application.note = note.trim();
            application.reviewedAt = new Date().toISOString();
            if (approved)
              draft.clubs.push({
                id: crypto.randomUUID(),
                name: review.name,
                code: review.code,
                category: review.category,
                description: review.purpose,
                status: 'active',
                color: '#5c8d80',
                symbol: review.code.slice(0, 2),
                health: 0,
                email: '',
                leader: review.applicant,
              });
          },
        ),
      approved ? 'Đã phê duyệt và thêm CLB vào danh mục.' : 'Đã lưu kết quả từ chối và nhận xét.',
    );
    if (ok) setReview(null);
  }

  async function addType(e) {
    e.preventDefault();
    const ok = await run(
      () =>
        commit('Thêm loại câu lạc bộ', typeName.trim(), 'affairs', (draft) => {
          if (draft.types.some((t) => normalize(t) === normalize(typeName)))
            throw new Error('Loại CLB đã tồn tại.');
          if (!typeName.trim()) throw new Error('Nhập tên loại CLB.');
          draft.types.push(typeName.trim());
          draft.rubrics.push({
            id: crypto.randomUUID(),
            type: typeName.trim(),
            version: 1,
            cap: 2000,
            scale: 100,
            status: 'draft',
            effective: '2026-09-01',
            criteria: [{ name: 'Đóng góp đã xác thực', xp: 20, weight: 100 }],
            history: [],
          });
        }),
      'Đã thêm loại CLB và bản nháp thang XP.',
    );
    if (ok) setTypeName('');
  }

  return (
    <>
      <PageHeader
        eyebrow="CÔNG TÁC SINH VIÊN"
        title="Quản lý câu lạc bộ"
        description="Nuôi dưỡng những cộng đồng tạo nên bản sắc FPTU."
      >
        <Button icon={Settings2} onClick={() => setTypesOpen(true)}>Loại câu lạc bộ</Button>
        <Button variant="primary" icon={Plus} onClick={() => setEdit({})}>Thêm câu lạc bộ</Button>
      </PageHeader>

      {/* Stats Grid - 3 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Câu lạc bộ hoạt động"
          value={state.clubs.filter((c) => c.status === 'active').length}
          note={`${state.types.length} nhóm lĩnh vực`}
          icon={UsersRound}
        />
        <StatCard
          label="Hồ sơ chờ duyệt"
          value={pending.length}
          note="Đề xuất thành lập câu lạc bộ mới"
          icon={FileCheck2}
          tone="blue"
        />
        <StatCard
          label="Cần quan tâm"
          value={state.clubs.filter((c) => c.health < 50).length}
          note="Chỉ số gắn kết minh họa dưới 50"
          icon={Activity}
          tone="purple"
        />
      </div>

      {/* Tabs */}
      <div className="mb-5">
        <Tabs
          active={tab}
          onChange={setTab}
          items={[
            { id: 'registry', label: 'Danh mục câu lạc bộ', count: state.clubs.length },
            { id: 'applications', label: 'Hồ sơ thành lập', count: pending.length },
          ]}
        />
      </div>

      {tab === 'registry' ? (
        <>
          {/* List Toolbar */}
          <div className="flex flex-wrap items-center gap-3 px-[22px] pb-[20px]">
            <SearchBox
              value={query}
              onChange={setQuery}
              placeholder="Tìm tên hoặc mã câu lạc bộ…"
              className="mr-auto sm:min-w-full sm:max-w-none"
            />
            <select
              className="h-[35px] px-3 border border-[#e1e4e9] rounded-[7px] text-[11px] text-[#718094] bg-white"
              aria-label="Loại câu lạc bộ"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="all">Tất cả loại CLB</option>
              {state.types.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
            <span className="text-[11px] text-[#818794]">{filtered.length} câu lạc bộ</span>
          </div>

          {/* Club Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((club) => (
              <article
                key={club.id}
                className="bg-white border border-[#e9ebee] rounded-[10px] p-[22px] pb-0"
              >
                <div className="flex items-center justify-between mb-4">
                  <span
                    className="w-[46px] h-[46px] rounded-[12px] grid place-items-center text-[19px] font-[650] tracking-[-1px] shrink-0"
                    style={{ background: `${club.color}15`, color: club.color }}
                  >
                    {club.symbol}
                  </span>
                  <Badge tone={club.status === 'active' ? 'green' : 'neutral'} dot>
                    {club.status === 'active' ? 'Hoạt động' : 'Tạm dừng'}
                  </Badge>
                </div>
                <h3 className="text-[15px] tracking-[-0.3px] mb-[7px]">{club.name}</h3>
                <span className="text-[10.5px] text-[#adb3bc] flex items-center gap-[7px] mb-[13px]">
                  {club.category}
                  <i className="w-[3px] h-[3px] bg-[#ccc] rounded-full" />
                  {club.code}
                </span>
                <p className="text-[11.5px] text-[#717d8d] my-[13px] min-h-[34px]">{club.description}</p>
                <div className="flex justify-between text-[10px] items-center gap-[8px] mb-[13px] text-[#929da9]">
                  <span className="flex items-center gap-[6px]">
                    <UsersRound size={15} />
                    {state.accounts.filter((a) => a.clubIds?.includes(club.id)).length} thành viên
                  </span>
                  <span className={club.health < 50 ? 'text-[#d27332]' : 'text-[#358b6c]'}>
                    {club.health}/100 gắn kết
                  </span>
                </div>
                <div className="w-full h-[5px] bg-[#f1f2f4] rounded-[6px] overflow-hidden mb-[22px]">
                  <i className="block h-full rounded-[6px]" style={{ width: `${club.health}%`, background: club.color }} />
                </div>
                <button
                  className="flex justify-between items-center w-full py-[14px] -mx-[22px] px-[22px] border-t border-[#e9ebee] text-[11px] text-[#83909d] hover:bg-[#fcfcfd] hover:text-accent transition-colors -mb-[22px] pt-[14px]"
                  onClick={() => setDetail(club)}
                >
                  Xem câu lạc bộ <ArrowRight size={15} />
                </button>
              </article>
            ))}
          </div>
          {!filtered.length && <Empty />}
        </>
      ) : (
        <Panel
          title="Hồ sơ đề xuất thành lập"
          description="Xem xét mục tiêu, kế hoạch và nhóm sáng lập trước khi quyết định."
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left whitespace-nowrap">
              <thead>
                <tr>
                  <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
                    CÂU LẠC BỘ ĐỀ XUẤT
                  </th>
                  <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
                    NGƯỜI ĐỀ XUẤT
                  </th>
                  <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
                    NGÀY NỘP
                  </th>
                  <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
                    TRẠNG THÁI
                  </th>
                  <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]" />
                </tr>
              </thead>
              <tbody>
                {state.applications.map((a) => (
                  <tr key={a.id}>
                    <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0">
                      <strong className="block text-[12px] font-medium text-[#4a5462]">{a.name}</strong>
                      <span className="block text-[10px] text-[#a5acb5] mt-[5px] leading-[1.6]">
                        {a.category} · {a.members} thành viên sáng lập
                      </span>
                    </td>
                    <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0 text-[11px] text-[#727b89]">
                      {a.applicant}
                    </td>
                    <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0 text-[11px] text-[#727b89]">
                      {date(a.submitted)}
                    </td>
                    <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0">
                      <Badge
                        tone={
                          a.status === 'pending' ? 'orange' : a.status === 'approved' ? 'green' : 'red'
                        }
                      >
                        {a.status === 'pending' ? 'Chờ phê duyệt' : a.status === 'approved' ? 'Đã duyệt' : 'Từ chối'}
                      </Badge>
                    </td>
                    <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0">
                      <Button onClick={() => { setReview(a); setNote(''); }}>
                        {a.status === 'pending' ? 'Xem xét' : 'Chi tiết'} <ChevronRight size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* Detail Modal */}
      {detail && (
        <Modal
          title={detail.name}
          description={`${detail.code} · ${detail.category}`}
          onClose={() => setDetail(null)}
        >
          <div className="px-[26px] py-6">
            <p className="text-[12px] text-[#717d8d] leading-[1.9] mb-[22px]">{detail.description}</p>
            <dl className="grid grid-cols-2 gap-4 text-[11px]">
              <div className="pb-[20px] border-b border-[#e9ebee]">
                <dt className="text-[10px] text-[#a8b2bf] mb-[10px]">Chủ nhiệm</dt>
                <dd className="text-[12px] text-[#808d9e] font-medium">{detail.leader || 'Chưa bổ nhiệm'}</dd>
              </div>
              <div className="pb-[20px] border-b border-[#e9ebee]">
                <dt className="text-[10px] text-[#a8b2bf] mb-[10px]">Email liên hệ</dt>
                <dd className="text-[12px] text-[#808d9e] font-medium">{detail.email || 'Chưa cập nhật'}</dd>
              </div>
              <div className="pb-[20px] border-b border-[#e9ebee]">
                <dt className="text-[10px] text-[#a8b2bf] mb-[10px]">Thành viên trong danh sách</dt>
                <dd className="text-[12px] text-[#808d9e] font-medium">{state.accounts.filter((a) => a.clubIds?.includes(detail.id)).length}</dd>
              </div>
              <div className="pb-[20px] border-b border-[#e9ebee]">
                <dt className="text-[10px] text-[#a8b2bf] mb-[10px]">Chỉ số gắn kết minh họa</dt>
                <dd className="text-[12px] text-[#808d9e] font-medium">{detail.health}/100</dd>
              </div>
              <div className="pb-[20px] border-b border-[#e9ebee]">
                <dt className="text-[10px] text-[#a8b2bf] mb-[10px]">Trạng thái</dt>
                <dd className="text-[12px] text-[#808d9e] font-medium">{detail.status === 'active' ? 'Đang hoạt động' : 'Tạm dừng'}</dd>
              </div>
            </dl>
          </div>
          <div className="sticky bottom-0 z-[1] border-t border-[#e9ebee] px-[26px] py-[17px] flex gap-[10px] justify-end bg-[#fdfdfe] rounded-b-[14px]">
            <Button onClick={() => setDetail(null)}>Đóng</Button>
            <Button
              variant="primary"
              icon={Pencil}
              onClick={() => { setEdit(detail); setDetail(null); }}
            >
              Chỉnh sửa thông tin
            </Button>
          </div>
        </Modal>
      )}

      {/* Edit Form */}
      {edit && <ClubForm club={edit} onClose={() => setEdit(null)} />}

      {/* Review Modal */}
      {review && (
        <Modal
          title={review.name}
          description="Hồ sơ đề xuất thành lập câu lạc bộ"
          onClose={() => setReview(null)}
        >
          <div className="px-[26px] py-6">
            <div className="flex gap-[40px] pb-[20px] border-b border-[#e9ebee] mb-[22px]">
              <div>
                <small className="text-[10px] text-[#a8b2bf] block mb-[10px]">NGƯỜI ĐỀ XUẤT</small>
                <strong className="text-[12px] text-[#808d9e] font-medium">{review.applicant}</strong>
              </div>
              <div>
                <small className="text-[10px] text-[#a8b2bf] block mb-[10px]">THÀNH VIÊN SÁNG LẬP</small>
                <strong className="text-[12px] text-[#808d9e] font-medium">{review.members} sinh viên</strong>
              </div>
            </div>
            <h3 className="text-[13px] text-[#7a8799] mb-[9px]">Mục đích hoạt động</h3>
            <p className="text-[12px] text-[#717d8d] leading-[1.9] mb-[22px]">{review.purpose}</p>
            <h3 className="text-[13px] text-[#7a8799] mb-[9px]">Kế hoạch dự kiến</h3>
            <p className="text-[12px] text-[#717d8d] leading-[1.9] mb-[22px]">{review.plan}</p>
            {review.status === 'pending' ? (
              <Field label="Nhận xét phê duyệt *">
                <textarea
                  rows={3}
                  minLength={5}
                  maxLength={1000}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ghi nhận xét hoặc lý do cần điều chỉnh…"
                />
              </Field>
            ) : (
              <div className="p-[14px] border border-[#e4ebf3] bg-[#f4f7fb] text-[#70869e] rounded-[7px] text-[11px] leading-[1.8]">
                <b className="font-semibold">{review.status === 'approved' ? 'Đã phê duyệt' : 'Đã từ chối'}</b>
                <p className="mt-[3px]">{review.note}</p>
              </div>
            )}
          </div>
          <div className="sticky bottom-0 z-[1] border-t border-[#e9ebee] px-[26px] py-[17px] flex gap-[10px] justify-end bg-[#fdfdfe] rounded-b-[14px]">
            <Button onClick={() => setReview(null)}>Đóng</Button>
            {review.status === 'pending' && (
              <>
                <Button variant="danger-soft" icon={X} onClick={() => decide(false)}>Từ chối</Button>
                <Button variant="primary" icon={Check} onClick={() => decide(true)}>Phê duyệt thành lập</Button>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* Types Modal */}
      {typesOpen && (
        <Modal
          title="Loại câu lạc bộ"
          description="Mỗi loại CLB có một bộ thang điểm XP phù hợp."
          onClose={() => setTypesOpen(false)}
        >
          <div className="px-[26px] py-6">
            <div className="divide-y divide-[#e9ebee]">
              {state.types.map((type) => (
                <div key={type} className="flex items-center justify-between py-[13px] text-[12px] text-[#8795a6]">
                  <span>{type}</span>
                  <Badge>{state.clubs.filter((c) => c.category === type).length} CLB</Badge>
                </div>
              ))}
            </div>
            <form onSubmit={addType} className="flex gap-[10px] mt-[25px]">
              <input
                required
                maxLength={60}
                aria-label="Tên loại CLB mới"
                value={typeName}
                onChange={(e) => setTypeName(e.target.value)}
                placeholder="Tên loại câu lạc bộ mới"
                className="flex-1 h-[39px] px-[12px] border border-[#e1e4e9] rounded-[7px] text-[12px]"
              />
              <Button type="submit" variant="primary" icon={Plus}>Thêm loại</Button>
            </form>
          </div>
        </Modal>
      )}
    </>
  );
}

function ClubForm({ club, onClose }) {
  const { state, commit } = useWorkspace();
  const run = useAction();
  const [form, setForm] = useState({
    name: '',
    code: '',
    category: state.types[0],
    description: '',
    leader: '',
    email: '',
    status: 'active',
    ...club,
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
          club.id ? 'Cập nhật câu lạc bộ' : 'Thêm câu lạc bộ',
          form.name.trim(),
          'affairs',
          (draft) => {
            if (!form.name.trim() || !form.code.trim()) throw new Error('Nhập tên và mã CLB.');
            if (draft.clubs.some((c) => c.id !== club.id && normalize(c.code) === normalize(form.code)))
              throw new Error('Mã câu lạc bộ đã tồn tại.');
            const next = {
              color: '#5d88a5',
              health: 0,
              symbol: form.code.slice(0, 2),
              ...form,
              name: form.name.trim(),
              code: form.code.trim(),
              id: club.id || crypto.randomUUID(),
            };
            if (club.id) draft.clubs = draft.clubs.map((c) => (c.id === club.id ? next : c));
            else draft.clubs.push(next);
          },
        ),
      'Đã lưu thông tin câu lạc bộ.',
    );
    if (ok) onClose();
  }

  return (
    <Modal title={club.id ? 'Chỉnh sửa câu lạc bộ' : 'Thêm câu lạc bộ'} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="px-[26px] py-6 grid sm:grid-cols-2 gap-x-[18px] gap-y-[21px]">
          <Field label="Tên câu lạc bộ *" className="sm:col-span-2 lg:col-span-1">
            <input required maxLength={100} {...bind('name')} />
          </Field>
          <Field label="Mã CLB *">
            <input required maxLength={20} {...bind('code')} />
          </Field>
          <Field label="Loại CLB">
            <select {...bind('category')}>
              {state.types.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Trạng thái">
            <select {...bind('status')}>
              <option value="active">Đang hoạt động</option>
              <option value="paused">Tạm dừng</option>
            </select>
          </Field>
          <Field label="Chủ nhiệm">
            <input maxLength={100} {...bind('leader')} />
          </Field>
          <Field label="Email liên hệ">
            <input type="email" {...bind('email')} />
          </Field>
          <Field label="Mô tả hoạt động" className="sm:col-span-2">
            <textarea rows={3} maxLength={500} {...bind('description')} />
          </Field>
        </div>
        <div className="sticky bottom-0 z-[1] border-t border-[#e9ebee] px-[26px] py-[17px] flex gap-[10px] justify-end bg-[#fdfdfe] rounded-b-[14px]">
          <Button type="button" onClick={onClose}>Hủy</Button>
          <Button type="submit" variant="primary" icon={Check}>Lưu câu lạc bộ</Button>
        </div>
      </form>
    </Modal>
  );
}
