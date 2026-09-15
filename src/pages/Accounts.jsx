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
import { ROLES, date, normalize, number } from '../lib/data.js';
import { useWorkspace } from '../lib/store.jsx';
import { guardAccountChanges, validateAccount, validateImportRows } from '../lib/accounts.js';
import {
  createWorkbookBuffer,
  downloadAccountTemplate,
  downloadBuffer,
  readAccountWorkbook,
} from '../lib/excel.js';
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
  useAction,
} from '../components/ui.jsx';

export default function Accounts() {
  const { state, commit } = useWorkspace();
  const run = useAction();
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]);
  const [editing, setEditing] = useState(null);
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const accounts = state.accounts;
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
  async function remove() {
    const ok = await run(
      () =>
        commit(
          'Xóa tài khoản',
          `${deleting.length} tài khoản: ${accounts
            .filter((a) => deleting.includes(a.id))
            .map((a) => a.username)
            .join(', ')}`,
          'admin',
          (draft) => {
            guardAccountChanges(draft.accounts, deleting, 'admin-self');
            draft.accounts = draft.accounts.filter((a) => !deleting.includes(a.id));
          },
        ),
      `Đã xóa ${deleting.length} tài khoản khỏi danh sách mẫu.`,
    );
    if (ok) {
      setDeleting(null);
      setSelected([]);
    }
  }
  function toggleLock(account) {
    run(
      () =>
        commit(
          account.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa tài khoản',
          account.username,
          'admin',
          (draft) => {
            const next = { ...account, status: account.status === 'active' ? 'locked' : 'active' };
            guardAccountChanges(draft.accounts, [account.id], 'admin-self', next);
            draft.accounts = draft.accounts.map((a) => (a.id === account.id ? next : a));
          },
        ),
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
      <div className="stats-grid">
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
      <div className="import-banner">
        <span className="excel-icon">
          <FileSpreadsheet size={27} />
        </span>
        <div>
          <h3>Thêm hàng loạt, bắt đầu nhanh hơn</h3>
          <p>Tải danh sách Excel để tự động tạo nhiều tài khoản trong một lần.</p>
        </div>
        <button
          className="text-link"
          onClick={() => run(downloadAccountTemplate, 'Đã tải file Excel mẫu.')}
        >
          Tải file mẫu <Download size={15} />
        </button>
        <Button onClick={() => setImporting(true)}>
          Nhập danh sách
          <ChevronRight size={15} />
        </Button>
      </div>
      <Panel className="accounts-panel">
        <div className="panel-title-row">
          <h2>
            Danh sách tài khoản <span className="count-pill">{accounts.length}</span>
          </h2>
          <Badge tone="neutral">Dữ liệu trên trình duyệt</Badge>
        </div>
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
        <div className="table-toolbar">
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder="Tìm họ tên, mã tài khoản hoặc email…"
            label="Tìm tài khoản"
          />
          <select
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
          <div className="selection-bar">
            <span>
              Đã chọn <b>{selected.length}</b> tài khoản
            </span>
            <button onClick={() => setSelected([])}>Bỏ chọn</button>
            <Button variant="danger-soft" icon={Trash2} onClick={() => setDeleting(selected)}>
              Xóa đã chọn
            </Button>
          </div>
        )}
        {filtered.length ? (
          <div className="table-scroll">
            <table className="accounts-table">
              <thead>
                <tr>
                  <th className="check-cell">
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
                  <th>NGƯỜI DÙNG</th>
                  <th>VAI TRÒ</th>
                  <th>TRẠNG THÁI</th>
                  <th>NGÀY THÊM</th>
                  <th className="right">THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((a) => (
                  <tr key={a.id} className={selected.includes(a.id) ? 'selected-row' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Chọn ${a.username}`}
                        checked={selected.includes(a.id)}
                        onChange={() => toggle(a.id)}
                      />
                    </td>
                    <td>
                      <div className="person-cell">
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
                          <strong>
                            {a.fullName}
                            {a.id === 'admin-self' && <span className="you-label">Bạn</span>}
                          </strong>
                          <span>{a.email}</span>
                          <small>{a.username}</small>
                        </div>
                      </div>
                    </td>
                    <td>
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
                    <td>
                      <Badge tone={a.status === 'active' ? 'green' : 'neutral'} dot>
                        {a.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                      </Badge>
                    </td>
                    <td className="muted">{date(a.joinedAt)}</td>
                    <td>
                      <div className="row-actions">
                        <IconButton
                          icon={Pencil}
                          label={`Sửa ${a.username}`}
                          onClick={() => setEditing(a)}
                        />
                        <IconButton
                          icon={a.status === 'active' ? LockKeyhole : UnlockKeyhole}
                          label={`${a.status === 'active' ? 'Khóa' : 'Mở khóa'} ${a.username}`}
                          disabled={a.id === 'admin-self'}
                          onClick={() => toggleLock(a)}
                        />
                        <IconButton
                          icon={Trash2}
                          label={`Xóa ${a.username}`}
                          disabled={a.id === 'admin-self'}
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
      {editing && <AccountForm account={editing} onClose={() => setEditing(null)} />}
      {importing && <ImportDialog onClose={() => setImporting(false)} />}
      {deleting && (
        <Modal
          title={`Xóa ${deleting.length} tài khoản?`}
          description="Tài khoản sẽ được loại khỏi danh sách quản lý mẫu trên trình duyệt."
          onClose={() => setDeleting(null)}
        >
          <div className="modal-body">
            <div className="danger-box">
              Kiểm tra danh sách trước khi xóa. Nhật ký và các đóng góp đã ghi nhận vẫn được giữ để
              tra cứu.
            </div>
            <ul className="deletion-list">
              {accounts
                .filter((a) => deleting.includes(a.id))
                .map((a) => (
                  <li key={a.id}>
                    <strong>{a.fullName}</strong>
                    <span>
                      {a.username} · {a.email}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
          <div className="modal-footer">
            <Button onClick={() => setDeleting(null)}>Hủy</Button>
            <Button variant="danger" icon={Trash2} onClick={remove}>
              Xác nhận xóa
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

function AccountForm({ account, onClose }) {
  const { state, commit } = useWorkspace();
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
  const update = (key) => (e) => setValues((old) => ({ ...old, [key]: e.target.value }));
  async function submit(e) {
    e.preventDefault();
    const input = {
      ...values,
      username: values.username.trim(),
      fullName: values.fullName.trim(),
      email: values.email.trim().toLowerCase(),
    };
    const issues = validateAccount(input, state.accounts, account.id);
    setErrors(issues);
    if (issues.length) return;
    const ok = await run(
      () =>
        commit(
          account.id ? 'Cập nhật tài khoản' : 'Thêm tài khoản',
          `${input.username} · ${ROLES[input.role]}`,
          'admin',
          (draft) => {
            const issues = validateAccount(input, draft.accounts, account.id);
            if (issues.length) throw new Error(issues.join('. '));
            if (account.id) {
              guardAccountChanges(draft.accounts, [account.id], 'admin-self', input);
              draft.accounts = draft.accounts.map((a) => (a.id === account.id ? input : a));
            } else
              draft.accounts.unshift({
                ...input,
                id: crypto.randomUUID(),
                joinedAt: new Date().toISOString(),
                clubIds: [],
              });
          },
        ),
      account.id ? 'Đã cập nhật tài khoản.' : 'Đã thêm tài khoản vào danh sách.',
    );
    if (ok) onClose();
  }
  return (
    <Modal
      title={account.id ? 'Chỉnh sửa tài khoản' : 'Thêm tài khoản mới'}
      description="Tài khoản dùng email đăng nhập. Mỗi tài khoản có một vai trò."
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="modal-body form-grid">
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
          <Field label="Email *" className="full-width">
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
            <select
              value={values.role}
              onChange={update('role')}
              disabled={account.id === 'admin-self'}
            >
              {Object.entries(ROLES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Trạng thái">
            <select
              value={values.status}
              onChange={update('status')}
              disabled={account.id === 'admin-self'}
            >
              <option value="active">Đang hoạt động</option>
              <option value="locked">Đã khóa</option>
            </select>
          </Field>
          {errors.length > 0 && (
            <div className="form-error full-width" role="alert">
              {errors.map((error) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <Button onClick={onClose} type="button">
            Hủy
          </Button>
          <Button type="submit" variant="primary" icon={account.id ? Check : Plus}>
            {account.id ? 'Lưu thay đổi' : 'Thêm tài khoản'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ImportDialog({ onClose }) {
  const { state, commit } = useWorkspace();
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
      const parsed = await readAccountWorkbook(selected, state.accounts);
      if (id === requestId.current) setRows(parsed);
    } catch (e) {
      if (id === requestId.current) setError(e.message);
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  }
  async function importRows() {
    setBusy(true);
    const ok = await run(() =>
      commit(
        'Nhập tài khoản từ Excel',
        `${file.name}: thêm ${good.length} dòng, bỏ qua ${bad.length} dòng lỗi`,
        'admin',
        (draft) => {
          const checked = validateImportRows(good, draft.accounts);
          const conflicts = checked.filter((r) => r.errors.length);
          if (conflicts.length)
            throw new Error(
              'Danh sách tài khoản đã thay đổi. Hãy chọn lại file để kiểm tra trùng dữ liệu.',
            );
          draft.accounts.unshift(
            ...checked.map(({ row, errors, ...account }) => ({
              ...account,
              id: crypto.randomUUID(),
              joinedAt: new Date().toISOString(),
              clubIds: [],
            })),
          );
        },
      ),
    );
    setBusy(false);
    if (ok) {
      setResultCount(good.length);
      setDone(true);
    }
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
      <div className="import-steps">
        {['Tải danh sách', 'Kiểm tra dữ liệu', 'Hoàn tất'].map((label, i) => (
          <div key={label} className={step >= i + 1 ? 'active' : ''}>
            <span>{step > i + 1 ? <Check size={14} /> : i + 1}</span>
            {label}
            {i < 2 && <ChevronRight size={14} />}
          </div>
        ))}
      </div>
      <div className="modal-body">
        {done ? (
          <div className="import-success">
            <span>
              <CheckCircle2 size={44} />
            </span>
            <h2>Danh sách đã sẵn sàng!</h2>
            <p>
              Đã thêm <b>{resultCount} tài khoản</b> vào phần quản lý.
            </p>
            {bad.length > 0 && (
              <p>{bad.length} dòng lỗi được bỏ qua. Tải danh sách lỗi để chỉnh sửa và nhập lại.</p>
            )}
            <Badge tone="green">Đã lưu thay đổi trên trình duyệt</Badge>
          </div>
        ) : !rows ? (
          <>
            <div
              className={`dropzone ${drag ? 'dragging' : ''}`}
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
              <span className="upload-cloud">
                <Upload size={28} />
              </span>
              <h3>{busy ? 'Đang kiểm tra file…' : 'Kéo thả file Excel vào đây'}</h3>
              <p>hoặc chọn file từ thiết bị của bạn</p>
              <Button icon={FileSpreadsheet} busy={busy} onClick={() => ref.current.click()}>
                Chọn file Excel
              </Button>
              <input
                ref={ref}
                className="sr-only"
                tabIndex={-1}
                type="file"
                accept=".xlsx"
                aria-label="File Excel tài khoản"
                onChange={(e) => {
                  choose(e.target.files[0]);
                  e.target.value = '';
                }}
              />
              <small>Định dạng .xlsx · Tối đa 5 MB · 1.000 dòng</small>
            </div>
            {file && <p className="file-caption">File đã chọn: {file.name}</p>}
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <div className="template-callout">
              <FileSpreadsheet size={23} />
              <div>
                <strong>Chưa có danh sách đúng định dạng?</strong>
                <p>Tải mẫu với tên cột và dữ liệu ví dụ.</p>
              </div>
              <Button icon={Download} onClick={() => run(downloadAccountTemplate)}>
                Tải file mẫu
              </Button>
            </div>
            <details className="import-guide">
              <summary>Cấu trúc file và các vai trò được hỗ trợ</summary>
              <p>
                Các cột bắt buộc: <b>username, fullName, email, role</b>. Cột <b>status</b> có thể
                bỏ trống (mặc định active).
              </p>
              <p>
                Vai trò: ADMIN, STUDENT_AFFAIRS_ADMIN, CLUB_MANAGER, CLUB_MEMBER. Trạng thái: active
                hoặc locked.
              </p>
              <p>
                Đọc trang tính TaiKhoan, hoặc trang đầu tiên nếu không có. Dòng 1 là tên cột; mỗi
                tài khoản là một dòng. Không dùng công thức.
              </p>
            </details>
          </>
        ) : (
          <>
            <div className="file-summary">
              <span className="excel-icon">
                <FileSpreadsheet size={24} />
              </span>
              <div>
                <strong>{file.name}</strong>
                <small>
                  {rows.length} dòng dữ liệu · {(file.size / 1024).toFixed(1)} KB
                </small>
              </div>
              <Button
                disabled={busy}
                onClick={() => {
                  setRows(null);
                  setFile(null);
                }}
              >
                Chọn file khác
              </Button>
            </div>
            <div className="import-counts">
              <span>
                <CheckCircle2 size={17} />
                <b>{good.length}</b> dòng hợp lệ
              </span>
              <span className={bad.length ? 'has-errors' : ''}>
                <CircleAlert size={17} />
                <b>{bad.length}</b> dòng cần sửa
              </span>
            </div>
            {bad.length > 0 && (
              <div className="warning-box">
                Chỉ các dòng hợp lệ sẽ được thêm. {bad.length} dòng lỗi được bỏ qua và có thể tải về
                để chỉnh sửa.
              </div>
            )}
            <div className="table-scroll preview-table">
              <table>
                <thead>
                  <tr>
                    <th>DÒNG</th>
                    <th>TÀI KHOẢN</th>
                    <th>VAI TRÒ</th>
                    <th>KẾT QUẢ KIỂM TRA</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice((page - 1) * 6, page * 6).map((r) => (
                    <tr key={r.row}>
                      <td>{r.row}</td>
                      <td>
                        <strong>{r.fullName || 'Chưa có tên'}</strong>
                        <small className="cell-sub">{r.email || 'Chưa có email'}</small>
                        <small className="cell-sub">{r.username}</small>
                      </td>
                      <td>{ROLES[r.role] || r.role || '—'}</td>
                      <td>
                        {r.errors.length ? (
                          <span className="inline-error">{r.errors.join(' · ')}</span>
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
      <div className="modal-footer">
        {bad.length > 0 && (
          <Button className="push-left" icon={Download} onClick={() => run(downloadErrors)}>
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
