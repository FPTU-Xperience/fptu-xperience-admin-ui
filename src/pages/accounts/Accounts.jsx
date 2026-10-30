import { systemRolesFor } from '../../utils/roles.js';
import './Accounts.css';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  CircleAlert,
  Plus,
  Users,
  UserCheck,
  LockKeyhole,
} from 'lucide-react';
import { ROLES, date, normalize, number } from '../../utils/format.js';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { isAdmin } from '../../utils/access.js';
import { validateAccount } from '../../utils/accounts.js';
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
} from '../../components/ui/index.js';

const accountColumns = [
  { key: 'fullName', label: 'Người dùng' },
  { key: 'role', label: 'Vai trò' },
  { key: 'status', label: 'Trạng thái' },
  { key: 'joinedAt', label: 'Ngày thêm' },
];
const accountStatuses = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'active', label: 'Đang hoạt động' },
  { value: 'locked', label: 'Đã khóa' },
  { value: 'inactive', label: 'Ngừng hoạt động' },
];
const accountCollator = new Intl.Collator('vi', { sensitivity: 'base', numeric: true });
const statusLabel = (value) =>
  ({ active: 'Hoạt động', locked: 'Đã khóa', inactive: 'Ngừng hoạt động' })[value] || value;

export default function Accounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState({ key: null, direction: 'asc' });
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  async function fetchAccounts() {
    setLoading(true);
    setError(null);
    try {
      const response = await api.users.list({ page: 1, pageSize: 500 });
      const items = response?.items || response;
      if (!Array.isArray(items)) throw new Error('Danh sách tài khoản trả về không hợp lệ.');
      setAccounts(items.map(mapUserToAccount));
    } catch (error) {
      setError(error.message || 'Không thể tải danh sách tài khoản.');
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    fetchAccounts();
    setCreating(false);
  }, [user?.id]);
  useEffect(() => {
    setPage(1);
  }, [tab, status, query]);
  const filtered = accounts.filter(
    (a) =>
      (tab === 'all' || a.role === tab) &&
      (status === 'all' || a.status === status) &&
      normalize(`${a.fullName} ${a.username} ${a.email}`).includes(normalize(query)),
  );
  const sorted = sort.key
    ? [...filtered].sort((a, b) => {
        const direction = sort.direction === 'asc' ? 1 : -1;
        if (sort.key === 'joinedAt') {
          const first = a.joinedAt ? Date.parse(a.joinedAt) : NaN;
          const second = b.joinedAt ? Date.parse(b.joinedAt) : NaN;
          if (!Number.isFinite(first) || !Number.isFinite(second))
            return Number.isFinite(first) ? -1 : Number.isFinite(second) ? 1 : 0;
          return (first - second) * direction;
        }
        const value = (account) =>
          sort.key === 'role'
            ? ROLES[account.role] || account.role
            : sort.key === 'status'
              ? statusLabel(account.status)
              : account.fullName;
        return accountCollator.compare(value(a), value(b)) * direction;
      })
    : filtered;
  const safePage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 8)));
  const visible = sorted.slice((safePage - 1) * 8, safePage * 8);
  function changeSort(key) {
    setSort((previous) => ({
      key,
      direction: previous.key === key && previous.direction === 'asc' ? 'desc' : 'asc',
    }));
    setPage(1);
  }
  return (
    <>
      <PageHeader
        title="Quản lý tài khoản"
        description="Theo dõi trạng thái tài khoản và tạo tài khoản Công tác sinh viên."
      >
        <Button icon={Plus} variant="primary" onClick={() => setCreating(true)}>
          Tạo tài khoản CTSV
        </Button>
      </PageHeader>
      <div className="accounts-content">
        <StatCard
          label="Tổng tài khoản"
          value={number(accounts.length)}
          icon={Users}
          note="Quản lý tài khoản và quyền truy cập"
          tone="blue"
        />
        <StatCard
          label="Đang hoạt động"
          value={number(accounts.filter((a) => a.status === 'active').length)}
          icon={UserCheck}
          tone="green"
        />
        <StatCard
          label="Đã khóa"
          value={number(accounts.filter((a) => a.status === 'locked').length)}
          icon={LockKeyhole}
        />
        <StatCard
          label="Tài khoản CTSV"
          value={number(accounts.filter((a) => a.role === 'STUDENT_AFFAIR').length)}
          icon={Users}
          tone="purple"
        />
      </div>
      <Panel>
        <div className="accounts-content-3">
          <h2 className="accounts-heading">
            Danh sách tài khoản <span className="accounts-text-2">{accounts.length}</span>
          </h2>
          <Button onClick={fetchAccounts} disabled={loading}>
            Tải lại
          </Button>
        </div>
        {error && (
          <div className="accounts-content-4" role="alert">
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
          <div
            className="accounts-status-filters"
            role="group"
            aria-label="Lọc trạng thái tài khoản"
          >
            {accountStatuses.map((item) => (
              <button
                key={item.value}
                type="button"
                className="accounts-status-chip"
                aria-pressed={status === item.value}
                onClick={() => setStatus(item.value)}
              >
                {status === item.value && <Check size={13} aria-hidden="true" />}
                {item.label}
              </button>
            ))}
          </div>
        </div>
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
                  {accountColumns.map((column) => {
                    const active = sort.key === column.key;
                    const nextDirection =
                      active && sort.direction === 'asc' ? 'giảm dần' : 'tăng dần';
                    const SortIcon = active
                      ? sort.direction === 'asc'
                        ? ArrowUp
                        : ArrowDown
                      : ArrowUpDown;
                    return (
                      <th
                        key={column.key}
                        scope="col"
                        className="accounts-column-2 accounts-column-sortable"
                        aria-sort={
                          active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'
                        }
                      >
                        <button
                          type="button"
                          className="accounts-sort-button"
                          onClick={() => changeSort(column.key)}
                          aria-label={`Sắp xếp ${column.label.toLowerCase()} ${nextDirection}`}
                          title={`Sắp xếp ${nextDirection}`}
                        >
                          {column.label}
                          <SortIcon size={14} aria-hidden="true" />
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {visible.map((account) => (
                  <tr key={account.id}>
                    <td className="accounts-cell">
                      <div className="accounts-content-10">
                        <Avatar
                          name={account.fullName}
                          color={
                            account.role === 'SYSTEM_ADMIN'
                              ? '#7862b5'
                              : account.role === 'STUDENT_AFFAIR'
                                ? '#d88145'
                                : '#5b85a8'
                          }
                        />
                        <div>
                          <strong className="accounts-value">
                            {account.fullName}
                            {account.source === 'MOCK' && <Badge tone="orange">Mock JS</Badge>}
                            {account.id === String(user?.id) && (
                              <span className="accounts-text-3">Bạn</span>
                            )}
                          </strong>
                          <span className="accounts-text-4">{account.email}</span>
                          <small className="accounts-caption">{account.username}</small>
                        </div>
                      </div>
                    </td>
                    <td className="accounts-cell">
                      <Badge
                        tone={
                          account.role === 'SYSTEM_ADMIN'
                            ? 'purple'
                            : account.role === 'STUDENT_AFFAIR'
                              ? 'orange'
                              : 'neutral'
                        }
                      >
                        {ROLES[account.role] || 'Chưa có role hợp lệ'}
                      </Badge>
                    </td>
                    <td className="accounts-cell">
                      <Badge tone={account.status === 'active' ? 'green' : 'neutral'} dot>
                        {statusLabel(account.status)}
                      </Badge>
                    </td>
                    <td className="accounts-cell-2">{date(account.joinedAt)}</td>
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
      {creating && (
        <CreateCTSVAccount
          accounts={accounts}
          onClose={() => setCreating(false)}
          onSave={(saved) => {
            setAccounts((previous) => [saved, ...previous]);
            setCreating(false);
          }}
        />
      )}
    </>
  );
}
function mapUserToAccount(user) {
  const roles = systemRolesFor(user);
  return {
    id: String(user.id ?? user.userId),
    username: user.username ?? user.studentCode ?? '',
    fullName: user.fullName ?? user.name ?? '',
    email: user.email ?? '',
    role: roles[0] ?? '',
    status:
      user.isLocked || user.locked ? 'locked' : user.isActive === false ? 'inactive' : 'active',
    joinedAt: user.createdAt ?? user.createdAtUtc ?? null,
    source: user.source || 'API',
  };
}
function CreateCTSVAccount({ accounts, onClose, onSave }) {
  const { user } = useAuth();
  const [values, setValues] = useState({ username: '', fullName: '', email: '' });
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [source, setSource] = useState('mock');
  const lock = useRef(false);
  const update = (key) => (event) =>
    setValues((previous) => ({ ...previous, [key]: event.target.value }));
  async function submit(event) {
    event.preventDefault();
    if (lock.current || !isAdmin(user)) return;
    const input = {
      username: values.username.trim(),
      fullName: values.fullName.trim(),
      email: values.email.trim().toLowerCase(),
      role: 'STUDENT_AFFAIR',
      status: 'active',
    };
    const issues = validateAccount(input, accounts);
    setErrors(issues);
    if (issues.length) return;
    lock.current = true;
    setSaving(true);
    try {
      const payload = {
        username: input.username,
        fullName: input.fullName,
        email: input.email,
        roles: ['STUDENT_AFFAIR'],
      };
      const saved =
        source === 'mock'
          ? {
              ...payload,
              id: `mock-account:${crypto.randomUUID()}`,
              isActive: true,
              isLocked: false,
              createdAt: new Date().toISOString(),
              source: 'MOCK',
            }
          : await api.users.create(payload);
      if (
        !saved?.id ||
        !Array.isArray(saved.roles) ||
        saved.roles.length !== 1 ||
        !systemRolesFor(saved).includes('STUDENT_AFFAIR') ||
        systemRolesFor(saved).some((role) => role !== 'STUDENT_AFFAIR')
      )
        throw new Error(
          'Chưa xác nhận được tài khoản CTSV đã tạo. Tải lại danh sách trước khi thử tiếp.',
        );
      onSave(mapUserToAccount(saved));
    } catch (error) {
      setErrors([error.message || 'Không thể tạo tài khoản CTSV.']);
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }
  return (
    <Modal
      title="Tạo tài khoản CTSV"
      description="Tài khoản chỉ có vai trò Công tác sinh viên, tách biệt Admin hệ thống."
      onClose={() => {
        if (!saving) onClose();
      }}
    >
      <form onSubmit={submit}>
        <div className="accounts-create-source">
          <Field label="Nguồn tạo tài khoản">
            <select
              value={source}
              disabled={saving}
              onChange={(event) => {
                setSource(event.target.value);
                setErrors([]);
              }}
            >
              <option value="mock">Mô phỏng</option>
              <option value="api">Tài khoản thật</option>
            </select>
          </Field>
          <p role="status">
            {source === 'mock'
              ? 'Tài khoản mô phỏng không có quyền đăng nhập và sẽ mất khi tải lại.'
              : 'Tạo tài khoản CTSV với thông tin bên dưới.'}
          </p>
        </div>
        <div className="accounts-content-15">
          <Field label="Họ và tên *">
            <input
              autoFocus
              required
              maxLength={100}
              value={values.fullName}
              onChange={update('fullName')}
            />
          </Field>
          <Field label="Mã tài khoản *">
            <input required maxLength={50} value={values.username} onChange={update('username')} />
          </Field>
          <Field label="Email *" className="accounts-field">
            <input
              type="email"
              required
              maxLength={254}
              value={values.email}
              onChange={update('email')}
            />
          </Field>
          <Field label="Vai trò">
            <input value="Công tác sinh viên" readOnly aria-readonly="true" />
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
          <Button type="button" disabled={saving} onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" icon={Plus} busy={saving}>
            Tạo tài khoản CTSV
          </Button>
        </div>
      </form>
    </Modal>
  );
}
