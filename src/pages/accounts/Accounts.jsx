import './Accounts.css';
import { useEffect, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Download,
  FileSpreadsheet,
  LockKeyhole,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  UnlockKeyhole,
  Upload,
  Users,
  UserCheck,
  X,
} from 'lucide-react';
import { ROLES, date, normalize, number } from '../../utils/format.js';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { validateAccount, validateImportRows } from '../../utils/accounts.js';
import {
  createWorkbookBuffer,
  downloadAccountTemplate,
  downloadBuffer,
  readAccountWorkbook,
} from '../../utils/excel.js';
import { useAction } from '../../hooks/useAction.js';
import {
  Avatar,
  Badge,
  Button,
  Empty,
  Field,
  IconButton,
  Modal,
  PageHeader,
  Pagination,
  Panel,
  SearchBox,
  StatCard,
  Tabs,
} from '../../components/ui/index.js';

export default function Accounts() {
  const { user } = useAuth();
  const run = useAction();

  // State for accounts list
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);

  // Selection & actions
  const [selected, setSelected] = useState([]);
  const [editing, setEditing] = useState(null);
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState(null);

  // Fetch accounts from API
  async function fetchAccounts() {
    setLoading(true);
    setError(null);
    try {
      const response = await api.users.list({ page: 1, pageSize: 500 });
      const items = response?.items || response || [];
      // Map backend fields to frontend format
      const mapped = items.map(mapUserToAccount);
      setAccounts(mapped);
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
      setError(err.message || 'Không thể tải danh sách tài khoản');
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAccounts();
  }, []);

  // Filter accounts
  const filtered = accounts.filter(
    (a) =>
      (tab === 'all' || a.role === tab) &&
      (status === 'all' || a.status === status) &&
      normalize(`${a.fullName} ${a.username} ${a.email}`).includes(normalize(query)),
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / 8));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * 8, safePage * 8);

  useEffect(() => {
    setPage(1);
    setSelected([]);
  }, [tab, status, query]);

  function toggle(id) {
    setSelected((old) => (old.includes(id) ? old.filter((key) => key !== id) : [...old, id]));
  }

  async function handleDelete() {
    const ok = await run(async () => {
      for (const id of deleting) {
        await api.users.delete(id);
      }
      setAccounts((prev) => prev.filter((a) => !deleting.includes(a.id)));
    }, `Đã xóa ${deleting.length} tài khoản.`);
    if (ok) {
      setDeleting(null);
      setSelected([]);
    }
  }

  async function handleToggleLock(account) {
    await run(
      async () => {
        if (account.status === 'active') {
          await api.users.lock(account.id);
        } else {
          await api.users.unlock(account.id);
        }
        setAccounts((prev) =>
          prev.map((a) =>
            a.id === account.id
              ? { ...a, status: account.status === 'active' ? 'locked' : 'active' }
              : a,
          ),
        );
      },
      account.status === 'active' ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.',
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="QUẢN TRỊ HỆ THỐNG"
        title="Quản lý tài khoản"
        description="Một nơi để quản lý, phân quyền và kết nối toàn bộ người dùng."
      >
        <Button icon={Upload} onClick={() => setImporting(true)}>
          Nhập từ Excel
        </Button>
        <Button variant="primary" icon={Plus} onClick={() => setEditing({})}>
          Thêm tài khoản
        </Button>
      </PageHeader>

      <div className="accounts-content">
        <StatCard
          label="Tổng tài khoản"
          value={number(accounts.length)}
          icon={Users}
          note="Toàn bộ vai trò trong hệ thống"
          tone="blue"
        />
        <StatCard
          label="Đang hoạt động"
          value={number(accounts.filter((a) => a.status === 'active').length)}
          icon={UserCheck}
          tone="green"
          note="Được phép truy cập nền tảng"
        />
        <StatCard
          label="Đã khóa"
          value={number(accounts.filter((a) => a.status === 'locked').length)}
          icon={LockKeyhole}
          note="Tạm dừng quyền truy cập"
        />
        <StatCard
          label="Vai trò hệ thống"
          value={Object.keys(ROLES).length}
          icon={ShieldCheck}
          tone="purple"
          note="Phân quyền theo trách nhiệm"
        />
      </div>

      <div className="accounts-content-2">
        <span className="accounts-text">
          <FileSpreadsheet size={27} />
        </span>
        <div>
          <h3 className="accounts-subheading">Thêm hàng loạt, bắt đầu nhanh hơn</h3>
          <p className="accounts-description">
            Tải danh sách Excel để tự động tạo nhiều tài khoản trong một lần.
          </p>
        </div>
        <button
          className="accounts-button"
          onClick={() => run(downloadAccountTemplate, 'Đã tải file Excel mẫu.')}
        >
          Tải file mẫu <Download size={15} />
        </button>
        <Button className="accounts-button-2" onClick={() => setImporting(true)}>
          Nhập danh sách
          <ChevronRight size={15} />
        </Button>
      </div>

      <Panel>
        <div className="accounts-content-3">
          <h2 className="accounts-heading">
            Danh sách tài khoản <span className="accounts-text-2">{accounts.length}</span>
          </h2>
          <Badge tone="neutral" className="accounts-button-2">
            Dữ liệu thực từ API
          </Badge>
        </div>

        {error && (
          <div className="accounts-content-4">
            <CircleAlert size={16} className="accounts-circle-alert" />
            {error}
            <button className="accounts-button-3" onClick={fetchAccounts}>
              Thử lại
            </button>
          </div>
        )}

        <Tabs
          active={tab}
          onChange={setTab}
          items={[
            { id: 'all', label: 'Tất cả', count: accounts.length },
            ...Object.entries(ROLES).map(([id, label]) => ({
              id,
              label,
              count: accounts.filter((a) => a.role === id).length,
            })),
          ]}
        />
        <div className="accounts-content-5">
          <SearchBox
            className="accounts-search-box"
            value={query}
            onChange={setQuery}
            placeholder="Tìm họ tên, mã tài khoản hoặc email…"
            label="Tìm tài khoản"
          />
          <select
            className="accounts-select"
            aria-label="Lọc trạng thái tài khoản"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="locked">Đã khóa</option>
          </select>
        </div>
        {selected.length > 0 && (
          <div className="accounts-content-6">
            <span>
              Đã chọn <b>{selected.length}</b> tài khoản
            </span>
            <button className="accounts-button-4" onClick={() => setSelected([])}>
              Bỏ chọn
            </button>
            <Button
              className="accounts-button-5"
              variant="danger-soft"
              icon={Trash2}
              onClick={() => setDeleting(selected)}
            >
              Xóa đã chọn
            </Button>
          </div>
        )}
        {loading ? (
          <div className="accounts-content-7">
            <div className="accounts-content-8" />
            Đang tải danh sách tài khoản...
          </div>
        ) : filtered.length ? (
          <div className="accounts-content-9">
            <table className="accounts-table">
              <thead>
                <tr>
                  <th className="accounts-column">
                    <input
                      aria-label="Chọn toàn bộ trang hiện tại"
                      type="checkbox"
                      checked={visible.length > 0 && visible.every((a) => selected.includes(a.id))}
                      onChange={() =>
                        setSelected(
                          visible.every((a) => selected.includes(a.id))
                            ? selected.filter((id) => !visible.some((a) => a.id === id))
                            : [...new Set([...selected, ...visible.map((a) => a.id)])],
                        )
                      }
                    />
                  </th>
                  <th className="accounts-column-2">NGƯỜI DÙNG</th>
                  <th className="accounts-column-2">VAI TRÒ</th>
                  <th className="accounts-column-2">TRẠNG THÁI</th>
                  <th className="accounts-column-2">NGÀY THÊM</th>
                  <th className="accounts-column-3">THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((a) => (
                  <tr key={a.id}>
                    <td
                      className={`accounts-cell ${
                        selected.includes(a.id) ? 'accounts-cell-state-active' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        aria-label={`Chọn ${a.username}`}
                        checked={selected.includes(a.id)}
                        onChange={() => toggle(a.id)}
                      />
                    </td>
                    <td
                      className={`accounts-cell ${
                        selected.includes(a.id) ? 'accounts-cell-state-active' : ''
                      }`}
                    >
                      <div className="accounts-content-10">
                        <Avatar
                          name={a.fullName}
                          color={
                            a.role === 'ADMIN'
                              ? '#7862b5'
                              : a.role === 'STUDENT_AFFAIRS_ADMIN'
                                ? '#d88145'
                                : '#5b85a8'
                          }
                        />
                        <div>
                          <strong className="accounts-value">
                            {a.fullName}
                            {a.id === user?.id && <span className="accounts-text-3">Bạn</span>}
                          </strong>
                          <span className="accounts-text-4">{a.email}</span>
                          <small className="accounts-caption">{a.username}</small>
                        </div>
                      </div>
                    </td>
                    <td
                      className={`accounts-cell ${
                        selected.includes(a.id) ? 'accounts-cell-state-active' : ''
                      }`}
                    >
                      <Badge
                        tone={
                          a.role === 'ADMIN'
                            ? 'purple'
                            : a.role === 'STUDENT_AFFAIRS_ADMIN'
                              ? 'orange'
                              : a.role === 'CLUB_MANAGER'
                                ? 'blue'
                                : 'neutral'
                        }
                      >
                        {ROLES[a.role]}
                      </Badge>
                    </td>
                    <td
                      className={`accounts-cell ${
                        selected.includes(a.id) ? 'accounts-cell-state-active' : ''
                      }`}
                    >
                      <Badge tone={a.status === 'active' ? 'green' : 'neutral'} dot>
                        {a.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                      </Badge>
                    </td>
                    <td
                      className={`accounts-cell-2 ${
                        selected.includes(a.id) ? 'accounts-cell-state-active' : ''
                      }`}
                    >
                      {date(a.joinedAt)}
                    </td>
                    <td
                      className={`accounts-cell ${
                        selected.includes(a.id) ? 'accounts-cell-state-active' : ''
                      }`}
                    >
                      <div className="accounts-content-11">
                        <IconButton
                          icon={Pencil}
                          label={`Sửa ${a.username}`}
                          onClick={() => setEditing(a)}
                        />
                        <IconButton
                          icon={a.status === 'active' ? LockKeyhole : UnlockKeyhole}
                          label={`${a.status === 'active' ? 'Khóa' : 'Mở khóa'} ${a.username}`}
                          disabled={a.id === user?.id}
                          onClick={() => handleToggleLock(a)}
                        />
                        <IconButton
                          icon={Trash2}
                          label={`Xóa ${a.username}`}
                          disabled={a.id === user?.id}
                          onClick={() => setDeleting([a.id])}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Không tìm thấy tài khoản"
            description="Thử tìm theo email, mã tài khoản hoặc bỏ bớt bộ lọc."
          />
        )}
        <Pagination page={safePage} total={filtered.length} onChange={setPage} />
      </Panel>
      {editing && (
        <AccountForm
          account={editing}
          accounts={accounts}
          onClose={() => setEditing(null)}
          onSave={(saved) => {
            if (editing.id) {
              setAccounts((prev) => prev.map((a) => (a.id === saved.id ? saved : a)));
            } else {
              setAccounts((prev) => [saved, ...prev]);
            }
            setEditing(null);
          }}
        />
      )}
      {importing && (
        <ImportDialog
          accounts={accounts}
          onClose={() => setImporting(false)}
          onImport={(newAccounts) => {
            setAccounts((prev) => [...newAccounts, ...prev]);
            setImporting(false);
          }}
        />
      )}
      {deleting && (
        <Modal
          title={`Xóa ${deleting.length} tài khoản?`}
          description="Tài khoản sẽ bị xóa vĩnh viễn khỏi hệ thống."
          onClose={() => setDeleting(null)}
        >
          <div className="accounts-content-12">
            <div className="accounts-content-13">
              Kiểm tra danh sách trước khi xóa. Tài khoản đã xóa không thể khôi phục.
            </div>
            <ul className="accounts-list">
              {accounts
                .filter((a) => deleting.includes(a.id))
                .map((a) => (
                  <li key={a.id} className="accounts-item">
                    <strong className="accounts-value-2">{a.fullName}</strong>
                    <span className="accounts-text-5">
                      {a.username} · {a.email}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
          <div className="accounts-content-14">
            <Button onClick={() => setDeleting(null)}>Hủy</Button>
            <Button variant="danger" icon={Trash2} onClick={handleDelete}>
              Xác nhận xóa
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

// Map backend user to frontend account format
function mapUserToAccount(user) {
  const roles = Array.isArray(user.roles) ? user.roles : user.role ? [user.role] : ['CLUB_MEMBER'];
  return {
    id: String(user.id ?? user.userId ?? crypto.randomUUID()),
    username: user.username ?? user.studentCode ?? '',
    fullName: user.fullName ?? user.name ?? '',
    email: user.email ?? '',
    role: roles[0] ?? 'CLUB_MEMBER',
    status: user.isLocked || user.locked ? 'locked' : 'active',
    joinedAt: user.createdAt ?? new Date().toISOString(),
    clubIds: Array.isArray(user.clubIds) ? user.clubIds : [],
  };
}

function AccountForm({ account, accounts, onClose, onSave }) {
  const run = useAction();
  const [values, setValues] = useState({
    username: '',
    fullName: '',
    email: '',
    role: 'CLUB_MEMBER',
    status: 'active',
    ...account,
  });
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);
  const update = (key) => (e) => setValues((old) => ({ ...old, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    const input = {
      ...values,
      username: values.username.trim(),
      fullName: values.fullName.trim(),
      email: values.email.trim().toLowerCase(),
    };
    const issues = validateAccount(input, accounts, account.id);
    setErrors(issues);
    if (issues.length) return;

    const ok = await run(
      async () => {
        setSaving(true);
        try {
          let saved;
          if (account.id) {
            // Update existing
            const payload = {
              fullName: input.fullName,
              email: input.email,
              isActive: input.status === 'active',
              roles: [input.role],
            };
            saved = await api.users.update(account.id, payload);
          } else {
            // Create new
            const payload = {
              username: input.username,
              fullName: input.fullName,
              email: input.email,
              roles: [input.role],
            };
            saved = await api.users.create(payload);
          }
          const mapped = mapUserToAccount(saved);
          onSave(mapped);
        } finally {
          setSaving(false);
        }
      },
      account.id ? 'Đã cập nhật tài khoản.' : 'Đã thêm tài khoản mới.',
    );
  }

  return (
    <Modal
      title={account.id ? 'Chỉnh sửa tài khoản' : 'Thêm tài khoản mới'}
      description="Tài khoản dùng email đăng nhập. Mỗi tài khoản có một vai trò."
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="accounts-content-15">
          <Field label="Họ và tên *">
            <input
              autoFocus
              required
              maxLength={100}
              value={values.fullName}
              onChange={update('fullName')}
              placeholder="Nguyễn Văn An"
            />
          </Field>
          <Field label="Mã tài khoản / MSSV *">
            <input
              required
              maxLength={50}
              value={values.username}
              onChange={update('username')}
              placeholder="SE200001"
              disabled={!!account.id}
            />
          </Field>
          <Field label="Email *" className="accounts-field">
            <input
              type="email"
              required
              maxLength={254}
              value={values.email}
              onChange={update('email')}
              placeholder="nguyenvanan@example.edu.vn"
            />
          </Field>
          <Field label="Vai trò *">
            <select value={values.role} onChange={update('role')}>
              {Object.entries(ROLES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Trạng thái">
            <select value={values.status} onChange={update('status')}>
              <option value="active">Đang hoạt động</option>
              <option value="locked">Đã khóa</option>
            </select>
          </Field>
          {errors.length > 0 && (
            <div className="accounts-content-16" role="alert">
              {errors.map((error) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          )}
        </div>
        <div className="accounts-content-14">
          <Button onClick={onClose} type="button" disabled={saving}>
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            icon={account.id ? Check : Plus}
            disabled={saving}
          >
            {saving ? 'Đang lưu...' : account.id ? 'Lưu thay đổi' : 'Thêm tài khoản'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ImportDialog({ accounts, onClose, onImport }) {
  const run = useAction();
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [drag, setDrag] = useState(false);
  const [page, setPage] = useState(1);
  const [resultCount, setResultCount] = useState(0);
  const ref = useRef();
  const requestId = useRef(0);

  useEffect(
    () => () => {
      requestId.current += 1;
    },
    [],
  );

  const good = rows?.filter((r) => !r.errors.length) || [];
  const bad = rows?.filter((r) => r.errors.length) || [];

  async function choose(selected) {
    if (!selected) return;
    const id = ++requestId.current;
    setFile(selected);
    setRows(null);
    setBusy(true);
    setError('');
    setPage(1);
    try {
      const parsed = await readAccountWorkbook(selected, accounts);
      if (id === requestId.current) setRows(parsed);
    } catch (e) {
      if (id === requestId.current) setError(e.message);
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  }

  async function importRows() {
    setBusy(true);
    const ok = await run(async () => {
      const checked = validateImportRows(good, accounts);
      const conflicts = checked.filter((r) => r.errors.length);
      if (conflicts.length)
        throw new Error(
          'Danh sách tài khoản đã thay đổi. Hãy chọn lại file để kiểm tra trùng dữ liệu.',
        );

      // Create accounts via API
      const created = [];
      for (const { row, errors, ...account } of checked) {
        try {
          const payload = {
            username: account.username,
            fullName: account.fullName,
            email: account.email,
            roles: [account.role],
          };
          const saved = await api.users.create(payload);
          created.push(mapUserToAccount(saved));
        } catch (err) {
          console.error(`Failed to create account ${account.username}:`, err);
        }
      }

      setResultCount(created.length);
      onImport(created);
      setDone(true);
    }, `Đã nhập ${good.length} tài khoản từ Excel.`);
    setBusy(false);
  }

  async function downloadErrors() {
    const buffer = await createWorkbookBuffer(
      'DongLoi',
      ['Dòng', 'username', 'fullName', 'email', 'role', 'status', 'Lỗi'],
      bad.map((r) => [
        r.row,
        r.username,
        r.fullName,
        r.email,
        r.role,
        r.status,
        r.errors.join('; '),
      ]),
    );
    downloadBuffer(buffer, 'FPTU_Loi_nhap_tai_khoan.xlsx');
  }

  const step = done ? 3 : rows ? 2 : 1;

  return (
    <Modal
      title="Nhập tài khoản từ Excel"
      description="Tạo nhiều tài khoản từ một danh sách, với dữ liệu được kiểm tra trước khi nhập."
      wide
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div className="accounts-content-17">
        {['Tải danh sách', 'Kiểm tra dữ liệu', 'Hoàn tất'].map((label, i) => (
          <div
            key={label}
            className={`accounts-content-18 ${
              step >= i + 1 ? 'accounts-content-state-active' : 'accounts-content-state-inactive'
            }`}
          >
            <span
              className={`accounts-text-6 ${
                step >= i + 1 ? 'accounts-text-state-active' : 'accounts-text-state-inactive'
              }`}
            >
              {step > i + 1 ? <Check size={14} /> : i + 1}
            </span>
            {label}
            {i < 2 && <ChevronRight size={14} className="accounts-chevron-right" />}
          </div>
        ))}
      </div>
      <div className="accounts-content-12">
        {done ? (
          <div className="accounts-content-19">
            <span className="accounts-text-7">
              <CheckCircle2 size={44} />
            </span>
            <h2 className="accounts-heading-2">Danh sách đã sẵn sàng!</h2>
            <p className="accounts-description-2">
              Đã thêm <b>{resultCount} tài khoản</b> vào hệ thống.
            </p>
            {bad.length > 0 && (
              <p className="accounts-description-2">
                {bad.length} dòng lỗi được bỏ qua. Tải danh sách lỗi để chỉnh sửa và nhập lại.
              </p>
            )}
            <Badge tone="green" className="accounts-badge">
              Dữ liệu đã đồng bộ với server
            </Badge>
          </div>
        ) : !rows ? (
          <>
            <div
              className={`accounts-content-20 ${
                drag ? 'accounts-content-state-active-2' : 'accounts-content-state-inactive-2'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                if (!busy) setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                if (!busy) choose(e.dataTransfer.files[0]);
              }}
            >
              <span className="accounts-text-8">
                <Upload size={28} />
              </span>
              <h3 className="accounts-subheading-2">
                {busy ? 'Đang kiểm tra file…' : 'Kéo thả file Excel vào đây'}
              </h3>
              <p className="accounts-description-3">hoặc chọn file từ thiết bị của bạn</p>
              <Button
                className="accounts-button-6"
                icon={FileSpreadsheet}
                busy={busy}
                onClick={() => ref.current.click()}
              >
                Chọn file Excel
              </Button>
              <input
                ref={ref}
                className="accounts-input"
                tabIndex={-1}
                type="file"
                accept=".xlsx"
                aria-label="File Excel tài khoản"
                onChange={(e) => {
                  choose(e.target.files[0]);
                  e.target.value = '';
                }}
              />
              <small className="accounts-caption-2">
                Định dạng .xlsx · Tối đa 5 MB · 1.000 dòng
              </small>
            </div>
            {file && <p className="accounts-description-4">File đã chọn: {file.name}</p>}
            {error && (
              <div className="accounts-content-21" role="alert">
                {error}
              </div>
            )}
            <div className="accounts-content-22">
              <FileSpreadsheet size={23} className="accounts-file-spreadsheet" />
              <div>
                <strong className="accounts-value-3">Chưa có danh sách đúng định dạng?</strong>
                <p className="accounts-description-5">Tải mẫu với tên cột và dữ liệu ví dụ.</p>
              </div>
              <Button
                className="accounts-button-7"
                icon={Download}
                onClick={() => run(downloadAccountTemplate)}
              >
                Tải file mẫu
              </Button>
            </div>
            <details className="accounts-details">
              <summary className="accounts-summary">
                Cấu trúc file và các vai trò được hỗ trợ
              </summary>
              <p className="accounts-description-6">
                Các cột bắt buộc: <b>username, fullName, email, role</b>. Cột <b>status</b> có thể
                bỏ trống (mặc định active).
              </p>
              <p className="accounts-description-6">
                Vai trò: ADMIN, STUDENT_AFFAIRS_ADMIN, CLUB_MANAGER, CLUB_MEMBER. Trạng thái: active
                hoặc locked.
              </p>
              <p className="accounts-description-6">
                Đọc trang tính TaiKhoan, hoặc trang đầu tiên nếu không có. Dòng 1 là tên cột; mỗi
                tài khoản là một dòng. Không dùng công thức.
              </p>
            </details>
          </>
        ) : (
          <>
            <div className="accounts-content-23">
              <span className="accounts-text-9">
                <FileSpreadsheet size={24} />
              </span>
              <div>
                <strong className="accounts-value-4">{file.name}</strong>
                <small className="accounts-caption-3">
                  {rows.length} dòng dữ liệu · {(file.size / 1024).toFixed(1)} KB
                </small>
              </div>
              <Button
                className="accounts-button-8"
                disabled={busy}
                onClick={() => {
                  setRows(null);
                  setFile(null);
                }}
              >
                Chọn file khác
              </Button>
            </div>
            <div className="accounts-content-24">
              <span className="accounts-text-10">
                <CheckCircle2 size={17} />
                <b className="accounts-b">{good.length}</b> dòng hợp lệ
              </span>
              <span
                className={`accounts-text-10 ${bad.length ? 'accounts-text-state-active-2' : ''}`}
              >
                <CircleAlert size={17} />
                <b className="accounts-b">{bad.length}</b> dòng cần sửa
              </span>
            </div>
            {bad.length > 0 && (
              <div className="accounts-content-25">
                Chỉ các dòng hợp lệ sẽ được thêm. {bad.length} dòng lỗi được bỏ qua và có thể tải về
                để chỉnh sửa.
              </div>
            )}
            <div className="accounts-content-26">
              <table className="accounts-table">
                <thead>
                  <tr>
                    <th className="accounts-column-4">DÒNG</th>
                    <th className="accounts-column-4">TÀI KHOẢN</th>
                    <th className="accounts-column-4">VAI TRÒ</th>
                    <th className="accounts-column-4">KẾT QUẢ KIỂM TRA</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice((page - 1) * 6, page * 6).map((r) => (
                    <tr key={r.row}>
                      <td className="accounts-cell-3">{r.row}</td>
                      <td className="accounts-cell-3">
                        <strong className="accounts-value-5">{r.fullName || 'Chưa có tên'}</strong>
                        <small className="accounts-caption-4">{r.email || 'Chưa có email'}</small>
                        <small className="accounts-caption-4">{r.username}</small>
                      </td>
                      <td className="accounts-cell-3">{ROLES[r.role] || r.role || '—'}</td>
                      <td className="accounts-cell-3">
                        {r.errors.length ? (
                          <span className="accounts-text-11">{r.errors.join(' · ')}</span>
                        ) : (
                          <Badge tone="green">
                            <Check size={12} />
                            Hợp lệ
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} total={rows.length} pageSize={6} onChange={setPage} />
          </>
        )}
      </div>
      <div className="accounts-content-14">
        {bad.length > 0 && (
          <Button className="accounts-button-9" icon={Download} onClick={() => run(downloadErrors)}>
            Tải {bad.length} dòng lỗi
          </Button>
        )}
        {done ? (
          <Button variant="primary" icon={Check} onClick={onClose}>
            Về danh sách tài khoản
          </Button>
        ) : (
          <>
            <Button disabled={busy} onClick={onClose}>
              Hủy
            </Button>
            {rows && (
              <Button
                variant="primary"
                icon={Upload}
                busy={busy}
                disabled={!good.length}
                onClick={importRows}
              >
                Thêm {good.length} tài khoản hợp lệ
              </Button>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
