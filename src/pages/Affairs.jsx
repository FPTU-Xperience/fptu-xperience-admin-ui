import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  Check,
  ChevronRight,
  Clock3,
  Compass,
  FileCheck2,
  GraduationCap,
  Leaf,
  Pause,
  Pencil,
  Play,
  Plus,
  Search,
  Send,
  Settings2,
  Sparkles,
  Target,
  UsersRound,
  X,
} from 'lucide-react';
import { useWorkspace } from '../lib/store.jsx';
import { MAJORS, date, normalize, number, seasonLabel, studentXP } from '../lib/data.js';
import {
  Avatar,
  Badge,
  Button,
  Empty,
  Field,
  Modal,
  PageHeader,
  Pagination,
  Panel,
  SearchBox,
  StatCard,
  Tabs,
  useAction,
} from '../components/ui.jsx';
import { createWorkbookBuffer, downloadBuffer } from '../lib/excel.js';

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

export function Engagement({ reports = false }) {
  const { state, season } = useWorkspace();
  const run = useAction();
  const [params] = useSearchParams();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState(params.get('group') || 'all');
  const [major, setMajor] = useState('all');
  const [cohort, setCohort] = useState('all');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);
  const students = state.accounts.filter((a) => a.role === 'CLUB_MEMBER');
  const threshold = state.seasons.find((s) => s.id === season)?.threshold || 200;
  const filtered = students.filter((s) => {
    const xp = studentXP(s, season, state.ledger);
    return (
      normalize(`${s.fullName} ${s.username} ${s.email}`).includes(normalize(query)) &&
      (major === 'all' || s.major === major) &&
      (cohort === 'all' || s.cohort === cohort) &&
      (group === 'all' ||
        (group === 'unengaged' && xp === 0) ||
        (group === 'no-club' && !s.clubIds?.length) ||
        (group === 'low' && xp < threshold) ||
        (group === 'high' && xp >= 1000))
    );
  });
  useEffect(() => {
    setPage(1);
  }, [query, group, major, cohort, season]);
  useEffect(() => {
    setGroup(params.get('group') || 'all');
  }, [params]);
  const safePage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 8)));
  async function exportData() {
    setBusy(true);
    await run(async () => {
      const buffer = await createWorkbookBuffer(
        'GanKet',
        [
          'MSSV',
          'Họ tên',
          'Email',
          'Ngành',
          'Khóa',
          'Số CLB',
          'Học kỳ',
          'XP đã xác thực',
          'Nhóm gắn kết',
        ],
        filtered.map((s) => {
          const xp = studentXP(s, season, state.ledger);
          return [
            s.username,
            s.fullName,
            s.email,
            s.major || 'Chưa cập nhật',
            s.cohort || 'Chưa cập nhật',
            s.clubIds?.length || 0,
            season,
            xp,
            xp === 0 ? 'Chưa tham gia' : xp < threshold ? 'Cần kết nối' : 'Đang tham gia',
          ];
        }),
      );
      downloadBuffer(buffer, `FPTU_Gan_ket_${season}.xlsx`);
    }, `Đã xuất ${filtered.length} sinh viên theo bộ lọc.`);
    setBusy(false);
  }
  return (
    <>
      <PageHeader
        eyebrow={reports ? 'DỮ LIỆU ĐỂ THẤU HIỂU' : 'MỌI SINH VIÊN ĐỀU QUAN TRỌNG'}
        title={reports ? 'Báo cáo & phân tích' : 'Gắn kết sinh viên'}
        description={`Nhìn thấy cả những sinh viên chưa tham gia, để tạo thêm cơ hội phù hợp · ${seasonLabel(season)}.`}
      >
        <Button icon={ArrowDownToLine} variant="primary" busy={busy} onClick={exportData}>
          Xuất báo cáo Excel
        </Button>
      </PageHeader>
      <div className="stats-grid three">
        <StatCard
          label="Sinh viên được theo dõi"
          value={students.length}
          note="Bao gồm sinh viên chưa tham gia CLB"
          icon={GraduationCap}
          tone="blue"
        />
        <StatCard
          label="Chưa có đóng góp xác thực"
          value={students.filter((s) => !studentXP(s, season, state.ledger)).length}
          note={`Trong học kỳ ${seasonLabel(season)}`}
          icon={UsersRound}
        />
        <StatCard
          label="Cần thêm cơ hội kết nối"
          value={students.filter((s) => studentXP(s, season, state.ledger) < threshold).length}
          note={`Dưới ngưỡng ${threshold} XP của học kỳ`}
          icon={Sparkles}
          tone="purple"
        />
      </div>
      {reports && (
        <Panel
          title="Độ phủ theo ngành học"
          description="Tỷ lệ sinh viên có ít nhất một đóng góp xác thực trong học kỳ."
        >
          <div className="major-bars">
            {MAJORS.map((m) => {
              const all = students.filter((s) => s.major === m);
              const active = all.filter((s) => studentXP(s, season, state.ledger) > 0).length;
              const ratio = all.length ? Math.round((active / all.length) * 100) : 0;
              return (
                <div key={m}>
                  <span>{m}</span>
                  <div className="meter">
                    <i style={{ width: `${ratio}%` }} />
                  </div>
                  <b>{ratio}%</b>
                  <small>
                    {active}/{all.length} SV
                  </small>
                </div>
              );
            })}
          </div>
        </Panel>
      )}
      <Panel className="student-list">
        <div className="panel-title-row">
          <h2>
            {reports ? 'Dữ liệu xuất báo cáo' : 'Danh sách sinh viên'}{' '}
            <span className="count-pill">{filtered.length}</span>
          </h2>
          <span className="muted">Thay đổi bộ lọc để chọn phạm vi</span>
        </div>
        <div className="table-toolbar wrap">
          <SearchBox value={query} onChange={setQuery} placeholder="Tìm sinh viên, MSSV, email…" />
          <select
            aria-label="Nhóm gắn kết"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
          >
            <option value="all">Tất cả mức độ</option>
            <option value="unengaged">Chưa có đóng góp</option>
            <option value="no-club">Chưa tham gia CLB</option>
            <option value="low">Cần thêm kết nối</option>
            <option value="high">Gắn kết cao</option>
          </select>
          <select aria-label="Ngành học" value={major} onChange={(e) => setMajor(e.target.value)}>
            <option value="all">Tất cả ngành</option>
            {MAJORS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <select
            aria-label="Khóa sinh viên"
            value={cohort}
            onChange={(e) => setCohort(e.target.value)}
          >
            <option value="all">Tất cả khóa</option>
            {['K18', 'K19', 'K20'].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        {filtered.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>SINH VIÊN</th>
                  <th>NGÀNH / KHÓA</th>
                  <th>THAM GIA CLB</th>
                  <th>XP HỌC KỲ</th>
                  <th>MỨC ĐỘ</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.slice((safePage - 1) * 8, safePage * 8).map((s) => {
                  const xp = studentXP(s, season, state.ledger);
                  return (
                    <tr key={s.id}>
                      <td>
                        <div className="person-cell">
                          <Avatar name={s.fullName} />
                          <div>
                            <strong>{s.fullName}</strong>
                            <small>{s.username}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        {s.major || 'Chưa cập nhật'}
                        <small className="cell-sub">{s.cohort || 'Chưa cập nhật'}</small>
                      </td>
                      <td>
                        {s.clubIds?.length ? (
                          `${s.clubIds.length} câu lạc bộ`
                        ) : (
                          <span className="muted">Chưa tham gia</span>
                        )}
                      </td>
                      <td>
                        <b>{number(xp)}</b>
                        <span className="muted"> XP</span>
                      </td>
                      <td>
                        <Badge tone={xp >= 1000 ? 'green' : xp > 0 ? 'blue' : 'orange'}>
                          {xp >= 1000 ? 'Gắn kết cao' : xp > 0 ? 'Đang tham gia' : 'Chưa tham gia'}
                        </Badge>
                      </td>
                      <td>
                        <button
                          className="icon-btn"
                          aria-label={`Chi tiết ${s.username}`}
                          onClick={() => setDetail(s)}
                        >
                          <ChevronRight size={17} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Không có sinh viên phù hợp"
            description="Thử thay đổi nhóm gắn kết hoặc ngành, khóa học."
          />
        )}
        <Pagination page={safePage} total={filtered.length} onChange={setPage} />
      </Panel>
      {detail && (
        <Modal
          title={detail.fullName}
          description={`${detail.username} · ${detail.email}`}
          onClose={() => setDetail(null)}
        >
          <div className="modal-body detail-content">
            <div className="student-xp">
              <Sparkles size={25} />
              <strong>{number(studentXP(detail, season, state.ledger))} XP</strong>
              <span>Đóng góp đã xác thực · {seasonLabel(season)}</span>
            </div>
            <dl>
              <dt>Ngành học</dt>
              <dd>{detail.major || 'Chưa cập nhật'}</dd>
              <dt>Khóa</dt>
              <dd>{detail.cohort || 'Chưa cập nhật'}</dd>
              <dt>Câu lạc bộ</dt>
              <dd>
                {detail.clubIds
                  ?.map((id) => state.clubs.find((c) => c.id === id)?.name)
                  .filter(Boolean)
                  .join(', ') || 'Chưa tham gia câu lạc bộ'}
              </dd>
            </dl>
            <div className="info-box">
              {studentXP(detail, season, state.ledger) < threshold
                ? 'Sinh viên thuộc nhóm cần thêm cơ hội kết nối. Có thể thiết kế nhiệm vụ khám phá phù hợp với ngành học.'
                : 'Sinh viên đã có đóng góp trong học kỳ. Tiếp tục mở rộng cơ hội để duy trì sự gắn kết.'}
            </div>
          </div>
          <div className="modal-footer">
            <Button onClick={() => setDetail(null)}>Đóng</Button>
            <Link to="/ctsv/quests" className="btn primary">
              Xem nhiệm vụ phù hợp
              <ArrowRight size={15} />
            </Link>
          </div>
        </Modal>
      )}
    </>
  );
}

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
