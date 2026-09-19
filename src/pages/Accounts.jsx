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
import { ROLES, date, normalize, number } from '../utils/format.js';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import { guardAccountChanges, validateAccount, validateImportRows } from '../utils/accounts.js';
import {
  createWorkbookBuffer,
  downloadAccountTemplate,
  downloadBuffer,
  readAccountWorkbook,
} from '../utils/excel.js';
import { useAction } from '../hooks/useAction.js';
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
} from '../components/ui/index.js';

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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
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

      <div className="flex flex-wrap items-center gap-3 sm:gap-4 bg-[#f1f7f3] border border-[#e2ece4] rounded-lg p-4 sm:px-6 sm:py-5 mb-6">
        <span className="w-11 h-11 sm:w-[35px] sm:h-[35px] grid place-items-center rounded-xl bg-[#e6f0e9] text-[#66a07b] shrink-0">
          <FileSpreadsheet size={27} />
        </span>
        <div>
          <h3 className="text-[12.5px] sm:text-[11px] font-semibold text-[#5b7c63]">
            Thêm hàng loạt, bắt đầu nhanh hơn
          </h3>
          <p className="text-[11px] sm:text-[10px] sm:max-w-[235px] text-[#96aa9a] sm:text-[#75917d] mt-[5px]">
            Tải danh sách Excel để tự động tạo nhiều tài khoản trong một lần.
          </p>
        </div>
        <button
          className="ml-auto inline-flex items-center gap-1.5 sm:gap-[9px] text-[11px] sm:text-[10px] sm:ml-[46px] text-[#72987c] hover:text-accent bg-transparent border-0 p-0"
          onClick={() => run(downloadAccountTemplate, 'Đã tải file Excel mẫu.')}
        >
          Tải file mẫu <Download size={15} />
        </button>
        {/* Ẩn trên mobile giống rule cũ `.import-banner > .btn { display:none }` */}
        <Button className="hidden sm:inline-flex" onClick={() => setImporting(true)}>
          Nhập danh sách
          <ChevronRight size={15} />
        </Button>
      </div>

      <Panel>
        <div className="flex items-center justify-between gap-3 px-[22px] sm:px-[17px] pt-[21px] pb-[10px]">
          <h2 className="text-[13px]">
            Danh sách tài khoản{' '}
            <span className="text-[11px] bg-[#f0f2f5] px-[7px] py-[3px] rounded-sm ml-[7px] text-[#929baa] font-medium">
              {accounts.length}
            </span>
          </h2>
          <Badge tone="neutral" className="hidden sm:inline-flex">
            Dữ liệu trên trình duyệt
          </Badge>
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
        <div className="flex flex-wrap items-center gap-2.5 px-[17px] py-[15px]">
          <SearchBox
            className="mr-auto sm:min-w-full sm:max-w-none"
            value={query}
            onChange={setQuery}
            placeholder="Tìm họ tên, mã tài khoản hoặc email…"
            label="Tìm tài khoản"
          />
          <select
            className="text-[11px] sm:text-[10px] sm:flex-1 sm:max-w-full"
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
          <div className="px-[23px] py-[9px] bg-[#fff5ed] flex items-center gap-[15px] text-[11px] text-[#bd825b]">
            <span>
              Đã chọn <b>{selected.length}</b> tài khoản
            </span>
            <button
              className="bg-transparent border-0 text-[#bc8c6c] text-[11px]"
              onClick={() => setSelected([])}
            >
              Bỏ chọn
            </button>
            <Button
              className="ml-auto min-h-[28px] px-[9px] py-[6px] text-[10px]"
              variant="danger-soft"
              icon={Trash2}
              onClick={() => setDeleting(selected)}
            >
              Xóa đã chọn
            </Button>
          </div>
        )}
        {filtered.length ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left whitespace-nowrap">
              <thead>
                <tr>
                  <th className="w-[30px] bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
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
                  <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
                    NGƯỜI DÙNG
                  </th>
                  <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
                    VAI TRÒ
                  </th>
                  <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
                    TRẠNG THÁI
                  </th>
                  <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
                    NGÀY THÊM
                  </th>
                  <th className="text-right bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
                    THAO TÁC
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((a) => (
                  <tr key={a.id}>
                    <td
                      className={`px-5 py-[15px] border-b border-[#f0f2f5] text-[11px] text-[#727b89] last:border-b-0 ${
                        selected.includes(a.id) ? 'bg-[#fffbf8]' : ''
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
                      className={`px-5 py-[15px] border-b border-[#f0f2f5] text-[11px] text-[#727b89] last:border-b-0 ${
                        selected.includes(a.id) ? 'bg-[#fffbf8]' : ''
                      }`}
                    >
                      <div className="flex items-center gap-[11px]">
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
                          <strong className="block text-[12px]">
                            {a.fullName}
                            {a.id === 'admin-self' && (
                              <span className="text-[9px] px-[5px] py-[2px] bg-[#f0edf8] text-[#a194b6] rounded ml-2">
                                Bạn
                              </span>
                            )}
                          </strong>
                          <span className="block text-[#717d8d] text-[10.5px] mt-1">{a.email}</span>
                          <small className="block text-[#b4b9c1] text-[9.5px] mt-[3px]">
                            {a.username}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td
                      className={`px-5 py-[15px] border-b border-[#f0f2f5] text-[11px] text-[#727b89] last:border-b-0 ${
                        selected.includes(a.id) ? 'bg-[#fffbf8]' : ''
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
                      className={`px-5 py-[15px] border-b border-[#f0f2f5] text-[11px] text-[#727b89] last:border-b-0 ${
                        selected.includes(a.id) ? 'bg-[#fffbf8]' : ''
                      }`}
                    >
                      <Badge tone={a.status === 'active' ? 'green' : 'neutral'} dot>
                        {a.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                      </Badge>
                    </td>
                    <td
                      className={`px-5 py-[15px] border-b border-[#f0f2f5] text-[11px] text-muted last:border-b-0 ${
                        selected.includes(a.id) ? 'bg-[#fffbf8]' : ''
                      }`}
                    >
                      {date(a.joinedAt)}
                    </td>
                    <td
                      className={`px-5 py-[15px] border-b border-[#f0f2f5] text-[11px] text-[#727b89] last:border-b-0 ${
                        selected.includes(a.id) ? 'bg-[#fffbf8]' : ''
                      }`}
                    >
                      <div className="flex justify-end gap-0.5">
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
          <div className="px-6 py-6 sm:px-[18px] sm:py-5">
            <div className="p-[14px] sm:p-3 border border-[#f2dfdc] bg-[#fff3f2] text-[#bd7970] rounded-[7px] text-[11px] leading-[1.8] mt-[17px]">
              Kiểm tra danh sách trước khi xóa. Nhật ký và các đóng góp đã ghi nhận vẫn được giữ để
              tra cứu.
            </div>
            <ul className="max-h-[250px] overflow-y-auto list-none p-0 mt-[15px]">
              {accounts
                .filter((a) => deleting.includes(a.id))
                .map((a) => (
                  <li key={a.id} className="py-3 border-b border-border">
                    <strong className="block font-medium text-[12px]">{a.fullName}</strong>
                    <span className="block text-[#a0abb9] text-[11px] mt-[6px]">
                      {a.username} · {a.email}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
          <div className="sticky bottom-0 z-[1] border-t border-border px-[26px] py-[17px] flex flex-wrap gap-2.5 justify-end items-center bg-[#fdfdfe] rounded-b-[14px] sm:px-[18px] sm:py-[15px] sm:gap-[9px]">
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
        <div className="px-6 py-6 sm:px-[18px] sm:py-5 grid grid-cols-2 sm:grid-cols-1 gap-x-[18px] gap-y-[21px] sm:gap-[18px]">
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
          <Field label="Email *" className="col-span-full">
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
            <div
              className="col-span-full mt-[10px] p-[14px] border border-[#f2dfdc] bg-[#fff3f2] text-[#bd7970] rounded-[7px] text-[11px] leading-[1.8] [&_p]:my-[3px]"
              role="alert"
            >
              {errors.map((error) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          )}
        </div>
        <div className="sticky bottom-0 z-[1] border-t border-border px-[26px] py-[17px] flex flex-wrap gap-2.5 justify-end items-center bg-[#fdfdfe] rounded-b-[14px] sm:px-[18px] sm:py-[15px] sm:gap-[9px]">
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
      <div className="flex items-center justify-center gap-5 sm:gap-[9px] pt-[22px] sm:pt-5 px-5 sm:px-[13px]">
        {['Tải danh sách', 'Kiểm tra dữ liệu', 'Hoàn tất'].map((label, i) => (
          <div
            key={label}
            className={`flex items-center gap-[9px] sm:gap-[5px] text-[11px] sm:text-[9px] ${
              step >= i + 1 ? 'text-[#d18b55]' : 'text-[#b4bdc8]'
            }`}
          >
            <span
              className={`rounded-full w-[23px] h-[23px] sm:w-5 sm:h-5 grid place-items-center text-[11px] sm:text-[10px] ${
                step >= i + 1 ? 'bg-[#fff1e4] text-[#cf8d59]' : 'bg-[#f2f4f6] text-[#b6bfca]'
              }`}
            >
              {step > i + 1 ? <Check size={14} /> : i + 1}
            </span>
            {label}
            {i < 2 && <ChevronRight size={14} className="ml-[15px] sm:ml-1 text-[#d0d5dc]" />}
          </div>
        ))}
      </div>
      <div className="px-6 py-6 sm:px-[18px] sm:py-5">
        {done ? (
          <div className="flex flex-col items-center text-center py-[26px] px-[10px] gap-[15px]">
            <span className="h-[84px] w-[84px] rounded-full grid place-items-center text-[#75aa88] bg-[#eff8f1]">
              <CheckCircle2 size={44} />
            </span>
            <h2 className="text-[23px] sm:text-[20px] font-semibold tracking-[-0.6px] mt-2">
              Danh sách đã sẵn sàng!
            </h2>
            <p className="text-[12px] sm:text-[11px] text-[#9aaabb] leading-[1.9]">
              Đã thêm <b>{resultCount} tài khoản</b> vào phần quản lý.
            </p>
            {bad.length > 0 && (
              <p className="text-[12px] sm:text-[11px] text-[#9aaabb] leading-[1.9]">
                {bad.length} dòng lỗi được bỏ qua. Tải danh sách lỗi để chỉnh sửa và nhập lại.
              </p>
            )}
            <Badge tone="green" className="mt-[10px]">
              Đã lưu thay đổi trên trình duyệt
            </Badge>
          </div>
        ) : !rows ? (
          <>
            <div
              className={`border-[1.5px] border-dashed rounded-xl flex flex-col items-center text-center pt-[31px] px-5 pb-[25px] sm:px-4 sm:py-[25px] ${
                drag ? 'bg-[#fff7ed] border-accent' : 'bg-[#fcfdff] border-[#d8dee6]'
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
              <span className="bg-[#fff3e9] text-[#dda371] w-[58px] h-[58px] grid place-items-center rounded-[15px] mb-[17px]">
                <Upload size={28} />
              </span>
              <h3 className="text-[14px] sm:text-[13px] font-medium text-[#7c899c]">
                {busy ? 'Đang kiểm tra file…' : 'Kéo thả file Excel vào đây'}
              </h3>
              <p className="text-[11px] text-[#a9b2c0] mt-2">hoặc chọn file từ thiết bị của bạn</p>
              <Button
                className="mt-[18px]"
                icon={FileSpreadsheet}
                busy={busy}
                onClick={() => ref.current.click()}
              >
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
              <small className="text-[11px] text-[#bac1cc] mt-[17px]">
                Định dạng .xlsx · Tối đa 5 MB · 1.000 dòng
              </small>
            </div>
            {file && (
              <p className="text-[11px] text-[#93a0b1] mt-3">File đã chọn: {file.name}</p>
            )}
            {error && (
              <div
                className="p-[14px] border border-[#f2dfdc] bg-[#fff3f2] text-[#bd7970] rounded-[7px] text-[11px] leading-[1.8] mt-[17px]"
                role="alert"
              >
                {error}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-[14px] sm:gap-[9px] py-5 border-b border-border text-[#8dac98]">
              <FileSpreadsheet size={23} className="sm:w-5" />
              <div>
                <strong className="text-[11px] text-[#92a69b] font-medium">
                  Chưa có danh sách đúng định dạng?
                </strong>
                <p className="text-[11px] sm:text-[10px] text-[#aab9af] mt-[5px]">
                  Tải mẫu với tên cột và dữ liệu ví dụ.
                </p>
              </div>
              <Button
                className="ml-auto text-[11px] sm:ml-[30px] sm:text-[10px]"
                icon={Download}
                onClick={() => run(downloadAccountTemplate)}
              >
                Tải file mẫu
              </Button>
            </div>
            <details className="mt-5 text-[#a4afbf] text-[11px]">
              <summary className="text-[11px] text-[#92a0b1] cursor-pointer">
                Cấu trúc file và các vai trò được hỗ trợ
              </summary>
              <p className="mt-3 leading-[1.9]">
                Các cột bắt buộc: <b>username, fullName, email, role</b>. Cột <b>status</b> có thể
                bỏ trống (mặc định active).
              </p>
              <p className="mt-3 leading-[1.9]">
                Vai trò: ADMIN, STUDENT_AFFAIRS_ADMIN, CLUB_MANAGER, CLUB_MEMBER. Trạng thái: active
                hoặc locked.
              </p>
              <p className="mt-3 leading-[1.9]">
                Đọc trang tính TaiKhoan, hoặc trang đầu tiên nếu không có. Dòng 1 là tên cột; mỗi
                tài khoản là một dòng. Không dùng công thức.
              </p>
            </details>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 p-[15px] sm:p-[11px] flex-wrap border border-border rounded-md">
              <span className="w-[35px] h-[35px] grid place-items-center rounded-xl bg-[#e6f0e9] text-[#66a07b] shrink-0">
                <FileSpreadsheet size={24} />
              </span>
              <div>
                <strong className="text-[12px] sm:text-[11px] font-medium text-[#7a899c] break-all">
                  {file.name}
                </strong>
                <small className="block text-[11px] sm:text-[10px] text-[#a2b0bf] mt-[6px]">
                  {rows.length} dòng dữ liệu · {(file.size / 1024).toFixed(1)} KB
                </small>
              </div>
              <Button
                className="ml-auto sm:ml-[47px] sm:text-[10px]"
                disabled={busy}
                onClick={() => {
                  setRows(null);
                  setFile(null);
                }}
              >
                Chọn file khác
              </Button>
            </div>
            <div className="flex gap-[30px] sm:gap-4 pt-5 text-[#78a489] text-[11px]">
              <span className="flex items-center gap-[7px]">
                <CheckCircle2 size={17} />
                <b className="font-semibold">{good.length}</b> dòng hợp lệ
              </span>
              <span
                className={`flex items-center gap-[7px] ${bad.length ? 'text-[#d09a69]' : ''}`}
              >
                <CircleAlert size={17} />
                <b className="font-semibold">{bad.length}</b> dòng cần sửa
              </span>
            </div>
            {bad.length > 0 && (
              <div className="p-[14px] sm:p-3 border border-[#f2e5ca] bg-[#fff8ec] text-[#b49a71] rounded-[7px] text-[11px] leading-[1.8] mt-[17px]">
                Chỉ các dòng hợp lệ sẽ được thêm. {bad.length} dòng lỗi được bỏ qua và có thể tải về
                để chỉnh sửa.
              </div>
            )}
            <div className="overflow-x-auto border border-border rounded-[7px] mt-5">
              <table className="w-full border-collapse text-left whitespace-nowrap">
                <thead>
                  <tr>
                    <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-[13px] py-[11px] border-y border-[#f0f2f5]">
                      DÒNG
                    </th>
                    <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-[13px] py-[11px] border-y border-[#f0f2f5]">
                      TÀI KHOẢN
                    </th>
                    <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-[13px] py-[11px] border-y border-[#f0f2f5]">
                      VAI TRÒ
                    </th>
                    <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-[13px] py-[11px] border-y border-[#f0f2f5]">
                      KẾT QUẢ KIỂM TRA
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice((page - 1) * 6, page * 6).map((r) => (
                    <tr key={r.row}>
                      <td className="p-[13px] text-[11px] align-top border-b border-[#f0f2f5] last:border-b-0">
                        {r.row}
                      </td>
                      <td className="p-[13px] text-[11px] align-top border-b border-[#f0f2f5] last:border-b-0">
                        <strong className="font-medium text-[#4a5462]">
                          {r.fullName || 'Chưa có tên'}
                        </strong>
                        <small className="block text-[#717d8d] text-[10px] mt-[5px] leading-[1.6]">
                          {r.email || 'Chưa có email'}
                        </small>
                        <small className="block text-[#717d8d] text-[10px] mt-[5px] leading-[1.6]">
                          {r.username}
                        </small>
                      </td>
                      <td className="p-[13px] text-[11px] align-top border-b border-[#f0f2f5] last:border-b-0">
                        {ROLES[r.role] || r.role || '—'}
                      </td>
                      <td className="p-[13px] text-[11px] align-top border-b border-[#f0f2f5] last:border-b-0">
                        {r.errors.length ? (
                          <span className="text-[#c18578] text-[11px] whitespace-normal block min-w-[150px] max-w-[260px] leading-[1.7]">
                            {r.errors.join(' · ')}
                          </span>
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
      <div className="sticky bottom-0 z-[1] border-t border-border px-[26px] py-[17px] flex flex-wrap gap-2.5 justify-end items-center bg-[#fdfdfe] rounded-b-[14px] sm:px-[18px] sm:py-[15px] sm:gap-[9px]">
        {bad.length > 0 && (
          <Button className="mr-auto" icon={Download} onClick={() => run(downloadErrors)}>
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