import { useState } from 'react';
import {
  Activity,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  Database,
  Globe,
  KeyRound,
  Plug,
  Save,
  ScrollText,
  Server,
  Settings2,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { useWorkspace } from '../lib/store.jsx';
import { date, normalize, ROLES } from '../lib/data.js';
import {
  Badge,
  Button,
  Empty,
  Field,
  PageHeader,
  Pagination,
  Panel,
  SearchBox,
  StatCard,
  useAction,
} from '../components/ui.jsx';

export function Audit() {
  const { state } = useWorkspace();
  const [query, setQuery] = useState('');
  const [area, setArea] = useState('all');
  const [page, setPage] = useState(1);
  const filtered = state.audit.filter(
    (a) =>
      (area === 'all' || a.area === area) &&
      normalize(`${a.actor} ${a.action} ${a.detail}`).includes(normalize(query)),
  );
  return (
    <>
      <PageHeader
        eyebrow="THEO DÕI VÀ ĐỐI SOÁT"
        title="Nhật ký hoạt động"
        description="Tra cứu người thực hiện, thời điểm và nội dung mỗi thay đổi trong bản mẫu."
      />
      <Panel>
        <div className="table-toolbar">
          <SearchBox
            value={query}
            onChange={(q) => {
              setQuery(q);
              setPage(1);
            }}
            placeholder="Tìm hoạt động, người thực hiện…"
          />
          <select
            aria-label="Lọc khu vực nhật ký"
            value={area}
            onChange={(e) => {
              setArea(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">Tất cả khu vực</option>
            <option value="admin">Quản trị hệ thống</option>
            <option value="affairs">Công tác sinh viên</option>
            <option value="system">Khởi tạo dữ liệu</option>
          </select>
        </div>
        {filtered.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>THỜI GIAN</th>
                  <th>NGƯỜI THỰC HIỆN</th>
                  <th>HOẠT ĐỘNG</th>
                  <th>NỘI DUNG THAY ĐỔI</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice((page - 1) * 8, page * 8).map((a) => (
                  <tr key={a.id}>
                    <td>
                      {date(a.at)}
                      <small className="cell-sub">
                        {new Date(a.at).toLocaleTimeString('vi-VN')}
                      </small>
                    </td>
                    <td>{a.actor}</td>
                    <td>
                      <strong>{a.action}</strong>
                      <small className="cell-sub">
                        {a.area === 'admin'
                          ? 'Quản trị hệ thống'
                          : a.area === 'affairs'
                            ? 'Công tác sinh viên'
                            : 'Hệ thống mẫu'}
                      </small>
                    </td>
                    <td className="wrap-cell">{a.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Chưa có hoạt động phù hợp" />
        )}
        <Pagination page={page} total={filtered.length} onChange={setPage} />
      </Panel>
    </>
  );
}

const permissions = [
  ['Quản lý toàn bộ tài khoản', true, false, false, false],
  ['Nhập tài khoản từ Excel', true, false, false, false],
  ['Cấu hình tích hợp và nền tảng', true, false, false, false],
  ['Theo dõi nhật ký hệ thống', true, false, false, false],
  ['Quản lý danh mục và duyệt CLB', false, true, false, false],
  ['Cấu hình thang XP và học kỳ', false, true, false, false],
  ['Công bố nhiệm vụ toàn trường', false, true, false, false],
  ['Đối soát, điều chỉnh và thu hồi XP', false, true, false, false],
  ['Phân tích gắn kết toàn trường', false, true, false, false],
  ['Quản lý thành viên và sự kiện CLB', false, false, true, false],
  ['Xác thực đóng góp tại CLB', false, false, true, false],
  ['Tham gia và xem hồ sơ cá nhân', false, false, false, true],
];
export function RoleMatrix() {
  const { state } = useWorkspace();
  return (
    <>
      <PageHeader
        eyebrow="ĐÚNG VAI TRÒ, ĐÚNG TRÁCH NHIỆM"
        title="Vai trò & phân quyền"
        description="Phạm vi trách nhiệm của bốn actor theo đặc tả chức năng."
      />
      <div className="stats-grid">
        {Object.entries(ROLES).map(([key, label]) => (
          <StatCard
            key={key}
            label={label}
            value={state.accounts.filter((a) => a.role === key).length}
            note="tài khoản được gán vai trò"
            icon={key === 'ADMIN' ? ShieldCheck : Users}
            tone={key === 'ADMIN' ? 'purple' : key === 'STUDENT_AFFAIRS_ADMIN' ? 'orange' : 'blue'}
          />
        ))}
      </div>
      <Panel
        title="Ma trận quyền chức năng"
        description="Admin gán vai trò tại phần Quản lý tài khoản. Đây là ma trận thiết kế cho phiên bản hiện tại."
      >
        <div className="table-scroll">
          <table className="permission-table">
            <thead>
              <tr>
                <th>CHỨC NĂNG</th>
                <th>ADMIN</th>
                <th>CTSV</th>
                <th>CHỦ NHIỆM CLB</th>
                <th>SINH VIÊN</th>
              </tr>
            </thead>
            <tbody>
              {permissions.map(([label, ...values]) => (
                <tr key={label}>
                  <td>{label}</td>
                  {values.map((enabled, i) => (
                    <td key={i}>
                      {enabled ? (
                        <Check size={18} className="green-text" aria-label="Có quyền" />
                      ) : (
                        <span className="muted" aria-label="Không có quyền">
                          —
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <div className="info-line">
        <ShieldCheck size={17} />
        Hai không gian Admin và CTSV được tách trong bản thiết kế. Quyền thực tế cần được kiểm tra
        tại backend khi tích hợp.
      </div>
    </>
  );
}

export function SystemSettings({ type }) {
  const { state, commit } = useWorkspace();
  const run = useAction();
  const [form, setForm] = useState({ ...state.settings });
  const titles = {
    settings: ['Cấu hình nền tảng', 'Thiết lập thông báo và các tham số vận hành của hệ thống.'],
    integrations: [
      'Tích hợp hệ thống',
      'Chuẩn bị kết nối định danh trường học và thời khóa biểu sinh viên.',
    ],
    health: [
      'Tình trạng hệ thống',
      'Theo dõi dữ liệu của bản mẫu và trạng thái tích hợp các dịch vụ.',
    ],
  };
  async function submit(e) {
    e.preventDefault();
    await run(
      () =>
        commit(
          type === 'integrations' ? 'Lưu cấu hình tích hợp' : 'Lưu tham số nền tảng',
          type === 'integrations'
            ? 'Cập nhật tên miền đăng nhập và địa chỉ dịch vụ thời khóa biểu'
            : 'Cập nhật thông báo, giới hạn yêu cầu và thời gian lưu nhật ký',
          'admin',
          (draft) => {
            draft.settings = {
              ...form,
              rateLimit: Number(form.rateLimit),
              retention: Number(form.retention),
            };
          },
        ),
      'Đã lưu cấu hình mẫu. Chưa áp dụng lên dịch vụ thực.',
    );
  }
  return (
    <>
      <PageHeader
        eyebrow="QUẢN TRỊ HỆ THỐNG"
        title={titles[type][0]}
        description={titles[type][1]}
      />
      {type === 'health' ? (
        <>
          <div className="stats-grid three">
            <StatCard
              label="Tài khoản trong bản mẫu"
              value={state.accounts.length}
              icon={Users}
              note="Lưu trong trình duyệt hiện tại"
              tone="blue"
            />
            <StatCard
              label="Bút toán sổ cái"
              value={state.ledger.length}
              icon={Database}
              note={`${state.ledger.filter((e) => e.type === 'correction').length} bút toán điều chỉnh`}
              tone="green"
            />
            <StatCard
              label="Sự kiện nhật ký"
              value={state.audit.length}
              icon={ScrollText}
              note="Các thay đổi đã ghi nhận"
            />
          </div>
          <Panel
            title="Trạng thái dịch vụ"
            description="Bản thiết kế chưa thực hiện kiểm tra kết nối tới backend."
          >
            <div className="service-list">
              {[
                [Server, 'API Gateway', 'Cổng kết nối các microservice'],
                [KeyRound, 'Định danh trường học', 'Google / hệ thống SSO của trường'],
                [CalendarDays, 'Đồng bộ thời khóa biểu', 'Lọc hoạt động theo lịch học thực tế'],
                [Activity, 'Tác vụ tính XP & chuyển học kỳ', 'Lịch chạy tác vụ và kết quả xử lý'],
                [
                  ShieldCheck,
                  'Kiểm tra toàn vẹn sổ cái',
                  'Kiểm chứng dữ liệu đóng góp trên máy chủ',
                ],
              ].map(([Icon, title, desc]) => (
                <div key={title}>
                  <span className="service-icon">
                    <Icon size={22} />
                  </span>
                  <span>
                    <strong>{title}</strong>
                    <small>{desc}</small>
                  </span>
                  <Badge>Chưa kết nối</Badge>
                </div>
              ))}
            </div>
          </Panel>
        </>
      ) : (
        <form onSubmit={submit}>
          {type === 'integrations' ? (
            <div className="settings-grid">
              <Panel
                title="Định danh sinh viên"
                description="Đăng nhập qua tài khoản thuộc hệ thống của trường."
              >
                <div className="settings-body">
                  <span className="integration-icon">
                    <KeyRound size={28} />
                  </span>
                  <Badge>Chưa kết nối</Badge>
                  <Field
                    label="Tên miền email được phép"
                    hint="Chỉ nhập tên miền, ví dụ: fpt.edu.vn"
                  >
                    <input
                      placeholder="fpt.edu.vn"
                      pattern="[A-Za-z0-9.-]+\.[A-Za-z]{2,}"
                      maxLength={253}
                      value={form.googleDomain}
                      onChange={(e) => setForm({ ...form, googleDomain: e.target.value })}
                    />
                  </Field>
                  <p className="muted">
                    Tên miền là cấu hình dự kiến. Kết nối và kiểm tra danh tính sẽ do dịch vụ xác
                    thực thực hiện.
                  </p>
                </div>
              </Panel>
              <Panel
                title="Thời khóa biểu"
                description="Hỗ trợ gợi ý câu lạc bộ và hoạt động phù hợp lịch học."
              >
                <div className="settings-body">
                  <span className="integration-icon blue">
                    <CalendarDays size={28} />
                  </span>
                  <Badge>Chưa kết nối</Badge>
                  <Field
                    label="Địa chỉ API thời khóa biểu"
                    hint="Địa chỉ dùng cho cấu hình tích hợp phía máy chủ."
                  >
                    <input
                      type="url"
                      placeholder="https://…"
                      value={form.timetableUrl}
                      onChange={(e) => setForm({ ...form, timetableUrl: e.target.value })}
                    />
                  </Field>
                  <p className="muted">
                    Lưu địa chỉ chưa kích hoạt đồng bộ. Cần dịch vụ backend và quyền truy cập được
                    cấp bởi trường.
                  </p>
                </div>
              </Panel>
            </div>
          ) : (
            <div className="settings-grid">
              <Panel title="Thông báo" description="Chọn các kênh và tần suất cập nhật.">
                <div className="settings-body">
                  <Toggle
                    label="Thông báo trong ứng dụng"
                    description="Cập nhật trạng thái hồ sơ, nhiệm vụ và XP"
                    checked={form.inAppNotifications}
                    onChange={(v) => setForm({ ...form, inAppNotifications: v })}
                  />
                  <Toggle
                    label="Thông báo qua email"
                    description="Nhắc hạn và gửi các cập nhật cần thiết"
                    checked={form.emailNotifications}
                    onChange={(v) => setForm({ ...form, emailNotifications: v })}
                  />
                  <Field label="Tần suất tổng hợp">
                    <select
                      value={form.digest}
                      onChange={(e) => setForm({ ...form, digest: e.target.value })}
                    >
                      <option value="daily">Hằng ngày</option>
                      <option value="weekly">Hằng tuần</option>
                      <option value="off">Không gửi tổng hợp</option>
                    </select>
                  </Field>
                </div>
              </Panel>
              <Panel title="Tham số vận hành" description="Các giới hạn dự kiến cho nền tảng.">
                <div className="settings-body">
                  <Field label="Số yêu cầu tối đa / phút / tài khoản">
                    <input
                      required
                      type="number"
                      min={10}
                      max={10000}
                      value={form.rateLimit}
                      onChange={(e) => setForm({ ...form, rateLimit: e.target.value })}
                    />
                  </Field>
                  <Field
                    label="Số ngày lưu nhật ký vận hành"
                    hint="Không áp dụng cho sổ cái XP và hồ sơ đóng góp vĩnh viễn."
                  >
                    <input
                      required
                      type="number"
                      min={30}
                      max={3650}
                      value={form.retention}
                      onChange={(e) => setForm({ ...form, retention: e.target.value })}
                    />
                  </Field>
                  <div className="info-box">
                    Các thông số được lưu để xem thử. Thông báo và giới hạn truy cập sẽ hoạt động
                    sau khi nối dịch vụ backend.
                  </div>
                </div>
              </Panel>
            </div>
          )}
          <div className="settings-footer">
            <span>Thay đổi được ghi vào nhật ký quản trị.</span>
            <Button type="submit" variant="primary" icon={Save}>
              Lưu cấu hình
            </Button>
          </div>
        </form>
      )}
    </>
  );
}
function Toggle({ label, description, checked, onChange }) {
  return (
    <div className="toggle-row">
      <div>
        <strong>{label}</strong>
        <p>{description}</p>
      </div>
      <button
        type="button"
        className={`toggle ${checked ? 'on' : ''}`}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
      >
        <span />
      </button>
    </div>
  );
}
