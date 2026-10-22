import './Clubs.css';
import { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Check,
  ChevronRight,
  FileCheck2,
  Plus,
  Settings2,
  UsersRound,
  X,
} from 'lucide-react';
import api from '../../services/api.js';
import { date, normalize } from '../../utils/format.js';
import { useAction } from '../../hooks/useAction.js';
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
} from '../../components/ui/index.js';

// Default club types from backend

export function Clubs() {
  const run = useAction();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  // Server-backed list state.
  const [clubs, setClubs] = useState([]);
  const [localApplications, setLocalApplications] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // The API response is the single source for the list and counters.
  const applications = localApplications;

  // UI State
  const [tab, setTab] = useState(params.get('tab') || 'registry');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [edit, setEdit] = useState(null);
  const [review, setReview] = useState(null);
  const [note, setNote] = useState('');
  const [typesOpen, setTypesOpen] = useState(false);
  const [typeName, setTypeName] = useState('');

  // Fetch data from API
  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const [clubsResponse, appsResponse, categoriesResponse] = await Promise.allSettled([
        api.clubs.list({ page: 1, pageSize: 100 }),
        api.clubs.applications.list({ page: 1, pageSize: 100 }),
        api.clubs.categories.list(),
      ]);

      const failure = [clubsResponse, appsResponse, categoriesResponse].find(
        (item) => item.status === 'rejected',
      );
      if (failure) throw failure.reason;

      const clubsData =
        clubsResponse.status === 'fulfilled'
          ? clubsResponse.value?.items || clubsResponse.value || []
          : [];
      const appsData =
        appsResponse.status === 'fulfilled'
          ? appsResponse.value?.items || appsResponse.value || []
          : [];

      const mappedClubs = mapClubsFromApi(clubsData);
      const mappedApps = mapApplicationsFromApi(appsData);

      setClubs(mappedClubs);
      setLocalApplications(mappedApps);

      if (categoriesResponse.status === 'fulfilled') {
        const catList = Array.isArray(categoriesResponse.value) ? categoriesResponse.value : [];
        setTypes(catList.map((c) => c.name || c.code));
      }
    } catch (err) {
      console.error('Failed to fetch clubs:', err);
      setError(err.message || 'Không thể tải danh sách câu lạc bộ');
      setClubs([]);
      setLocalApplications([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (params.get('club')) {
      navigate(`/ctsv/clubs/${encodeURIComponent(params.get('club'))}`, { replace: true });
    }
    if (params.get('tab')) setTab(params.get('tab'));
  }, [params, navigate]);

  // Filter clubs
  const filtered = clubs.filter(
    (club) =>
      normalize(`${club.name} ${club.code}`).includes(normalize(query)) &&
      (category === 'all' || club.category === category),
  );
  const pending = applications.filter((a) => a.status === 'pending');

  // Review application
  async function decide(approved) {
    if (note.trim().length < 5) {
      run(() => {
        throw new Error('Vui lòng nhập nhận xét ít nhất 5 ký tự.');
      });
      return;
    }
    const ok = await run(
      async () => {
        const payload = { note: note.trim() };
        if (approved) {
          await api.clubs.applications.approve(review.id, payload);
        } else {
          await api.clubs.applications.reject(review.id, payload);
        }

        // Also update local state for the table
        setLocalApplications((prev) =>
          prev.map((a) =>
            a.id === review.id
              ? { ...a, status: approved ? 'approved' : 'rejected', note: note.trim() }
              : a,
          ),
        );
      },
      approved ? 'Đã phê duyệt đơn thành lập CLB.' : 'Đã từ chối đơn thành lập CLB.',
    );
    if (ok) {
      setReview(null);
      setNote('');
    }
  }

  // Add new club type
  async function addType(e) {
    e.preventDefault();
    const name = typeName.trim();
    if (!name) return;
    if (types.some((t) => normalize(t) === normalize(name))) {
      run(() => {
        throw new Error('Loại CLB đã tồn tại.');
      });
      return;
    }
    const ok = await run(async () => {
      try {
        await api.clubs.categories.create({ name });
      } catch (err) {
        console.warn('Failed to save category to backend:', err);
      }
      setTypes((prev) => [...prev, name]);
    }, 'Đã thêm loại CLB mới.');
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

      {/* Stats Grid - 3 columns */}
      <div className="clubs-content">
        <StatCard
          label="Câu lạc bộ hoạt động"
          value={clubs.filter((c) => c.status === 'active').length}
          note={`${types.length} nhóm lĩnh vực`}
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
          value={clubs.filter((c) => (c.health || 0) < 50).length}
          note="Chỉ số gắn kết minh họa dưới 50"
          icon={Activity}
          tone="purple"
        />
      </div>

      {/* Tabs */}
      <div className="clubs-content-2">
        <Tabs
          active={tab}
          onChange={setTab}
          items={[
            { id: 'registry', label: 'Danh mục câu lạc bộ', count: clubs.length },
            { id: 'applications', label: 'Hồ sơ thành lập', count: pending.length },
          ]}
        />
      </div>

      {error && (
        <div className="clubs-content-3">
          <span className="clubs-text">⚠️</span>
          {error}
          <button className="clubs-button" onClick={fetchData}>
            Thử lại
          </button>
        </div>
      )}

      {tab === 'registry' ? (
        <>
          {/* List Toolbar */}
          <div className="clubs-content-4">
            <SearchBox
              value={query}
              onChange={setQuery}
              placeholder="Tìm tên hoặc mã câu lạc bộ…"
              className="clubs-search-box"
            />
            <select
              className="clubs-select"
              aria-label="Loại câu lạc bộ"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="all">Tất cả loại CLB</option>
              {types.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
            <span className="clubs-text-2">{filtered.length} câu lạc bộ</span>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="clubs-content-5">
              <div className="clubs-content-6" />
              Đang tải danh sách câu lạc bộ...
            </div>
          ) : (
            /* Club Grid */
            <div className="clubs-content-7">
              {filtered.map((club) => (
                <Link
                  key={club.id}
                  className="clubs-card"
                  to={`/ctsv/clubs/${encodeURIComponent(club.id)}`}
                  aria-label={`Quản lý ${club.name}`}
                >
                  <div className="clubs-content-8">
                    <div className="clubs-content-9">
                      <span
                        className="clubs-text-3"
                        style={{ background: `${club.color}15`, color: club.color }}
                      >
                        {club.symbol}
                      </span>
                      <Badge tone={club.status === 'active' ? 'green' : 'neutral'} dot>
                        {club.status === 'active' ? 'Hoạt động' : 'Tạm dừng'}
                      </Badge>
                    </div>
                    <h3 className="clubs-subheading">{club.name}</h3>
                    <span className="clubs-text-4">
                      {club.category}
                      <i className="clubs-indicator" />
                      {club.code}
                    </span>
                    <p className="clubs-description">{club.description}</p>
                    <div className="clubs-content-10">
                      <span className="clubs-text-5">
                        <UsersRound size={15} />
                        {club.memberCount || 0} thành viên
                      </span>
                      <span
                        className={
                          (club.health || 0) < 50 ? 'clubs-text-active' : 'clubs-text-inactive'
                        }
                      >
                        {club.health || 0}/100 gắn kết
                      </span>
                    </div>
                    <div className="clubs-content-11">
                      <i
                        className="clubs-indicator-2"
                        style={{ width: `${club.health || 0}%`, background: club.color }}
                      />
                    </div>
                  </div>
                  <span className="clubs-button-2">
                    Quản lý câu lạc bộ <ArrowRight size={15} />
                  </span>
                </Link>
              ))}
            </div>
          )}
          {!loading && !filtered.length && <Empty />}
        </>
      ) : (
        <Panel
          title="Hồ sơ đề xuất thành lập"
          description="Xem xét mục tiêu, kế hoạch và nhóm sáng lập trước khi quyết định."
        >
          {loading ? (
            <div className="clubs-content-5">
              <div className="clubs-content-6" />
              Đang tải hồ sơ...
            </div>
          ) : (
            <div className="clubs-content-12">
              <table className="clubs-table">
                <thead>
                  <tr>
                    <th className="clubs-column">CÂU LẠC BỘ ĐỀ XUẤT</th>
                    <th className="clubs-column">NGƯỜI ĐỀ XUẤT</th>
                    <th className="clubs-column">NGÀY NỘP</th>
                    <th className="clubs-column">TRẠNG THÁI</th>
                    <th className="clubs-column" />
                  </tr>
                </thead>
                <tbody>
                  {localApplications.map((a) => (
                    <tr key={a.id}>
                      <td className="clubs-cell">
                        <strong className="clubs-value">{a.name}</strong>
                        <span className="clubs-text-6">
                          {a.category} · {a.members} thành viên sáng lập
                        </span>
                      </td>
                      <td className="clubs-cell-2">{a.applicant}</td>
                      <td className="clubs-cell-2">{date(a.submitted)}</td>
                      <td className="clubs-cell">
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
                      <td className="clubs-cell">
                        <Button
                          onClick={() => {
                            setReview(a);
                            setNote('');
                          }}
                        >
                          {a.status === 'pending' ? 'Xem xét' : 'Chi tiết'}{' '}
                          <ChevronRight size={14} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {/* Edit Form */}
      {edit && (
        <ClubForm
          club={edit}
          types={types}
          onClose={() => setEdit(null)}
          onSave={(saved) => {
            if (edit.id) {
              setClubs((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
            } else {
              setClubs((prev) => [saved, ...prev]);
            }
            setEdit(null);
          }}
        />
      )}

      {/* Review Modal */}
      {review && (
        <Modal
          title={review.name}
          description="Hồ sơ đề xuất thành lập câu lạc bộ"
          onClose={() => setReview(null)}
        >
          <div className="clubs-content-13">
            <div className="clubs-content-16">
              <div>
                <small className="clubs-caption">NGƯỜI ĐỀ XUẤT</small>
                <strong className="clubs-definition">{review.applicant}</strong>
              </div>
              <div>
                <small className="clubs-caption">THÀNH VIÊN SÁNG LẬP</small>
                <strong className="clubs-definition">{review.members} sinh viên</strong>
              </div>
            </div>
            <h3 className="clubs-subheading-2">Mục đích hoạt động</h3>
            <p className="clubs-description-2">{review.purpose}</p>
            <h3 className="clubs-subheading-2">Kế hoạch dự kiến</h3>
            <p className="clubs-description-2">{review.plan}</p>
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
              <div className="clubs-content-17">
                <b className="clubs-b">
                  {review.status === 'approved' ? 'Đã phê duyệt' : 'Đã từ chối'}
                </b>
                <p className="clubs-description-3">{review.note}</p>
              </div>
            )}
          </div>
          <div className="clubs-content-15">
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

      {/* Types Modal */}
      {typesOpen && (
        <Modal
          title="Loại câu lạc bộ"
          description="Mỗi loại CLB có một bộ thang điểm Xperience Point phù hợp."
          onClose={() => setTypesOpen(false)}
        >
          <div className="clubs-content-13">
            <div className="clubs-content-18">
              {types.map((type) => (
                <div key={type} className="clubs-content-19">
                  <span>{type}</span>
                  <Badge>{clubs.filter((c) => c.category === type).length} CLB</Badge>
                </div>
              ))}
            </div>
            <form onSubmit={addType} className="clubs-form">
              <input
                required
                maxLength={60}
                aria-label="Tên loại CLB mới"
                value={typeName}
                onChange={(e) => setTypeName(e.target.value)}
                placeholder="Tên loại câu lạc bộ mới"
                className="clubs-input"
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

// Helper to safely convert any value to a renderable string
function safeString(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
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

// Map backend club to frontend format
export function mapClubsFromApi(clubs) {
  return clubs.map((club) => ({
    id: String(club.id),
    name: safeString(club.name, ''),
    code: safeString(club.code, ''),
    category: safeString(club.category, ''),
    description: safeString(club.description, ''),
    status: club.isActive ? 'active' : 'paused',
    color: safeString(club.color, '#5c8d80'),
    symbol: safeString(club.code, 'CL').slice(0, 2).toUpperCase(),
    health: safeNumber(club.healthScore || club.health, 0),
    email: safeString(club.contactEmail, ''),
    phone: safeString(club.contactPhone, ''),
    leader: safeString(club.managerName || club.leader, ''),
    memberCount: safeNumber(club.memberCount, 0),
  }));
}

// Map backend application to frontend format
function mapApplicationsFromApi(apps) {
  return apps.map((app) => ({
    id: String(app.id),
    name: safeString(app.clubName || app.name, ''),
    category: safeString(app.category, ''),
    members: safeNumber(app.founderCount || app.members, 0),
    applicant: safeString(app.applicantName || app.applicant, ''),
    submitted: safeString(app.submittedAt || app.submitted, new Date().toISOString()),
    purpose: safeString(app.description || app.purpose, ''),
    plan: safeString(app.plan, ''),
    code: safeString(app.clubCode, ''),
    status: safeString(app.status, 'pending').toLowerCase(),
    note: safeString(app.reviewNote, ''),
    reviewedAt: app.reviewedAt,
  }));
}

export function ClubForm({ club, types, onClose, onSave }) {
  const run = useAction();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    code: '',
    category: types[0] || '',
    description: '',
    leader: '',
    email: '',
    phone: '',
    status: 'active',
    ...club,
  });
  const bind = (key) => ({
    value: form[key] || '',
    onChange: (e) => setForm({ ...form, [key]: e.target.value }),
  });

  async function submit(e) {
    e.preventDefault();
    const ok = await run(async () => {
      setSaving(true);
      try {
        let saved;
        const payload = {
          name: form.name.trim(),
          code: form.code.trim(),
          category: form.category,
          description: form.description || '',
          contactEmail: form.email || form.contactEmail || '',
          contactPhone: form.phone || form.contactPhone || '',
          isActive: form.status === 'active',
        };

        if (club.id) {
          saved = await api.clubs.update(club.id, payload);
        } else {
          saved = await api.clubs.create(payload);
        }
        if (!saved?.id || !saved.name || (club.id && String(saved.id) !== String(club.id)))
          throw new Error('Chưa xác nhận được hồ sơ đã lưu. Tải lại thông tin trước khi thử tiếp.');
        const mapped = mapClubsFromApi([saved])[0];
        onSave(mapped);
      } finally {
        setSaving(false);
      }
    }, 'Đã lưu thông tin câu lạc bộ.');
    if (ok) onClose();
  }

  return (
    <Modal title={club.id ? 'Chỉnh sửa câu lạc bộ' : 'Thêm câu lạc bộ'} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="clubs-content-20">
          <Field label="Tên câu lạc bộ *" className="clubs-field">
            <input required maxLength={100} {...bind('name')} />
          </Field>
          <Field label="Mã CLB *">
            <input required maxLength={20} {...bind('code')} disabled={!!club.id} />
          </Field>
          <Field label="Loại CLB">
            <select {...bind('category')}>
              {types.map((t) => (
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
            <input value={form.leader || 'Chưa bổ nhiệm'} readOnly aria-readonly="true" />
            <small>Thay đổi chủ nhiệm qua hồ sơ chuyển giao hoặc kế nhiệm.</small>
          </Field>
          <Field label="Email liên hệ">
            <input type="email" {...bind('email')} placeholder="clb@fpt.edu.vn" />
          </Field>
          <Field label="Số điện thoại liên hệ">
            <input type="tel" maxLength={20} {...bind('phone')} placeholder="09xxxxxxxx" />
          </Field>
          <Field label="Mô tả hoạt động" className="clubs-field-2">
            <textarea rows={3} maxLength={500} {...bind('description')} />
          </Field>
        </div>
        <div className="clubs-content-15">
          <Button type="button" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" icon={Check} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu câu lạc bộ'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
