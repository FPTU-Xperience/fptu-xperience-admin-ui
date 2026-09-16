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
        <Button icon={Settings2} onClick={() => setTypesOpen(true)}>
          Loại câu lạc bộ
        </Button>
        <Button variant="primary" icon={Plus} onClick={() => setEdit({})}>
          Thêm câu lạc bộ
        </Button>
      </PageHeader>
      <div className="stats-grid three">
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
      <div className="standalone-tabs">
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
          <div className="list-toolbar">
            <SearchBox
              value={query}
              onChange={setQuery}
              placeholder="Tìm tên hoặc mã câu lạc bộ…"
            />
            <select
              aria-label="Loại câu lạc bộ"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="all">Tất cả loại CLB</option>
              {state.types.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
            <span className="muted">{filtered.length} câu lạc bộ</span>
          </div>
          <div className="club-grid">
            {filtered.map((club) => (
              <article className="club-card" key={club.id}>
                <div className="club-card-top">
                  <span
                    className="club-symbol"
                    style={{ background: `${club.color}15`, color: club.color }}
                  >
                    {club.symbol}
                  </span>
                  <Badge tone={club.status === 'active' ? 'green' : 'neutral'} dot>
                    {club.status === 'active' ? 'Hoạt động' : 'Tạm dừng'}
                  </Badge>
                </div>
                <h3>{club.name}</h3>
                <span className="club-category">
                  {club.category} <i /> {club.code}
                </span>
                <p>{club.description}</p>
                <div className="club-meta">
                  <span>
                    <UsersRound size={15} />
                    {state.accounts.filter((a) => a.clubIds?.includes(club.id)).length} thành viên
                  </span>
                  <span className={club.health < 50 ? 'orange-text' : 'green-text'}>
                    {club.health}/100 gắn kết
                  </span>
                </div>
                <div className="meter">
                  <i style={{ width: `${club.health}%`, background: club.color }} />
                </div>
                <button className="card-footer-link" onClick={() => setDetail(club)}>
                  Xem câu lạc bộ
                  <ArrowRight size={15} />
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
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>CÂU LẠC BỘ ĐỀ XUẤT</th>
                  <th>NGƯỜI ĐỀ XUẤT</th>
                  <th>NGÀY NỘP</th>
                  <th>TRẠNG THÁI</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {state.applications.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.name}</strong>
                      <small className="cell-sub">
                        {a.category} · {a.members} thành viên sáng lập
                      </small>
                    </td>
                    <td>{a.applicant}</td>
                    <td>{date(a.submitted)}</td>
                    <td>
                      <Badge
                        tone={
                          a.status === 'pending'
                            ? 'orange'
                            : a.status === 'approved'
                              ? 'green'
                              : 'red'
                        }
                      >
                        {a.status === 'pending'
                          ? 'Chờ phê duyệt'
                          : a.status === 'approved'
                            ? 'Đã duyệt'
                            : 'Từ chối'}
                      </Badge>
                    </td>
                    <td>
                      <Button
                        onClick={() => {
                          setReview(a);
                          setNote('');
                        }}
                      >
                        {a.status === 'pending' ? 'Xem xét' : 'Chi tiết'}
                        <ChevronRight size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
      {detail && (
        <Modal
          title={detail.name}
          description={`${detail.code} · ${detail.category}`}
          onClose={() => setDetail(null)}
        >
          <div className="modal-body detail-content">
            <p>{detail.description}</p>
            <dl>
              <dt>Chủ nhiệm</dt>
              <dd>{detail.leader || 'Chưa bổ nhiệm'}</dd>
              <dt>Email liên hệ</dt>
              <dd>{detail.email || 'Chưa cập nhật'}</dd>
              <dt>Thành viên trong danh sách</dt>
              <dd>{state.accounts.filter((a) => a.clubIds?.includes(detail.id)).length}</dd>
              <dt>Chỉ số gắn kết minh họa</dt>
              <dd>{detail.health}/100</dd>
              <dt>Trạng thái</dt>
              <dd>{detail.status === 'active' ? 'Đang hoạt động' : 'Tạm dừng'}</dd>
            </dl>
          </div>
          <div className="modal-footer">
            <Button onClick={() => setDetail(null)}>Đóng</Button>
            <Button
              variant="primary"
              icon={Pencil}
              onClick={() => {
                setEdit(detail);
                setDetail(null);
              }}
            >
              Chỉnh sửa thông tin
            </Button>
          </div>
        </Modal>
      )}
      {edit && <ClubForm club={edit} onClose={() => setEdit(null)} />}
      {review && (
        <Modal
          title={review.name}
          description="Hồ sơ đề xuất thành lập câu lạc bộ"
          onClose={() => setReview(null)}
        >
          <div className="modal-body detail-content">
            <div className="detail-pair">
              <div>
                <small>NGƯỜI ĐỀ XUẤT</small>
                <strong>{review.applicant}</strong>
              </div>
              <div>
                <small>THÀNH VIÊN SÁNG LẬP</small>
                <strong>{review.members} sinh viên</strong>
              </div>
            </div>
            <h3>Mục đích hoạt động</h3>
            <p>{review.purpose}</p>
            <h3>Kế hoạch dự kiến</h3>
            <p>{review.plan}</p>
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
              <div className="info-box">
                <b>{review.status === 'approved' ? 'Đã phê duyệt' : 'Đã từ chối'}</b>
                <p>{review.note}</p>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <Button onClick={() => setReview(null)}>Đóng</Button>
            {review.status === 'pending' && (
              <>
                <Button variant="danger-soft" icon={X} onClick={() => decide(false)}>
                  Từ chối
                </Button>
                <Button variant="primary" icon={Check} onClick={() => decide(true)}>
                  Phê duyệt thành lập
                </Button>
              </>
            )}
          </div>
        </Modal>
      )}
      {typesOpen && (
        <Modal
          title="Loại câu lạc bộ"
          description="Mỗi loại CLB có một bộ thang điểm XP phù hợp."
          onClose={() => setTypesOpen(false)}
        >
          <div className="modal-body">
            <div className="type-list">
              {state.types.map((type) => (
                <div key={type}>
                  <span>{type}</span>
                  <Badge>{state.clubs.filter((c) => c.category === type).length} CLB</Badge>
                </div>
              ))}
            </div>
            <form onSubmit={addType} className="inline-form">
              <input
                required
                maxLength={60}
                aria-label="Tên loại CLB mới"
                value={typeName}
                onChange={(e) => setTypeName(e.target.value)}
                placeholder="Tên loại câu lạc bộ mới"
              />
              <Button type="submit" variant="primary" icon={Plus}>
                Thêm loại
              </Button>
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
            if (
              draft.clubs.some(
                (c) => c.id !== club.id && normalize(c.code) === normalize(form.code),
              )
            )
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
        <div className="modal-body form-grid">
          <Field label="Tên câu lạc bộ *">
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
          <Field label="Mô tả hoạt động" className="full-width">
            <textarea rows={3} maxLength={500} {...bind('description')} />
          </Field>
        </div>
        <div className="modal-footer">
          <Button type="button" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" icon={Check}>
            Lưu câu lạc bộ
          </Button>
        </div>
      </form>
    </Modal>
  );
}
