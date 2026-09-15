import { useEffect, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Command,
  FileChartColumn,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Search,
  Settings2,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Target,
  Users,
  UsersRound,
  X,
  SlidersHorizontal,
  Plug,
  ScrollText,
} from 'lucide-react';
import { useWorkspace } from './lib/store.jsx';
import { normalize, seasonLabel } from './lib/data.js';
import { Badge, Button, IconButton, Modal, SearchBox } from './components/ui.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Accounts from './pages/Accounts.jsx';
import { Clubs, Engagement, Quests } from './pages/Affairs.jsx';
import { Rubrics, Seasons, Anomalies } from './pages/Governance.jsx';
import { Audit, SystemSettings, RoleMatrix } from './pages/System.jsx';

const affairsNav = [
  {
    path: '/ctsv/overview',
    label: 'Tổng quan',
    icon: LayoutDashboard,
    group: 'KHÔNG GIAN LÀM VIỆC',
  },
  { path: '/ctsv/clubs', label: 'Quản lý câu lạc bộ', icon: UsersRound },
  { path: '/ctsv/engagement', label: 'Gắn kết sinh viên', icon: Activity },
  { path: '/ctsv/quests', label: 'Nhiệm vụ & chiến dịch', icon: Target },
  {
    path: '/ctsv/rubrics',
    label: 'Thang điểm XP',
    icon: SlidersHorizontal,
    group: 'QUẢN LÝ TRẢI NGHIỆM',
  },
  { path: '/ctsv/seasons', label: 'Học kỳ & mùa giải', icon: CalendarDays },
  { path: '/ctsv/anomalies', label: 'Kiểm duyệt bất thường', icon: ShieldAlert },
  { path: '/ctsv/reports', label: 'Báo cáo & phân tích', icon: FileChartColumn },
];
const adminNav = [
  { path: '/admin/accounts', label: 'Quản lý tài khoản', icon: Users, group: 'QUẢN TRỊ HỆ THỐNG' },
  { path: '/admin/roles', label: 'Vai trò & phân quyền', icon: ShieldCheck },
  { path: '/admin/integrations', label: 'Tích hợp hệ thống', icon: Plug },
  { path: '/admin/settings', label: 'Cấu hình nền tảng', icon: Settings2 },
  { path: '/admin/health', label: 'Tình trạng hệ thống', icon: Activity, group: 'GIÁM SÁT' },
  { path: '/admin/audit', label: 'Nhật ký hoạt động', icon: ScrollText },
];

export default function App() {
  const { state, role, setRole, season, setSeason, toast, dismissToast } = useWorkspace();
  const admin = role === 'ADMIN';
  const nav = admin ? adminNav : affairsNav;
  const location = useLocation();
  const navigate = useNavigate();
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [help, setHelp] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const pending = state.applications.filter((a) => a.status === 'pending').length;
  const anomalies = state.anomalies.filter((a) => a.status === 'open').length;
  const current = nav.find((n) => n.path === location.pathname) || nav[0];
  useEffect(() => {
    document.title = `${current.label} | FPTU Xperience`;
    setMobile(false);
  }, [location.pathname, current.label]);
  useEffect(() => {
    const listener = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearch(true);
      }
      if (e.key === 'Escape') setMobile(false);
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);
  function switchRole(value) {
    setRole(value);
    navigate(value === 'ADMIN' ? '/admin/accounts' : '/ctsv/overview');
  }
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
      >
        Đến nội dung chính
      </a>
      {mobile && (
        <button
          className="sidebar-backdrop"
          aria-label="Đóng điều hướng"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? 'open' : ''}`}>
        <NavLink className="brand" to={nav[0].path}>
          <span className="brand-mark">
            x<span>✦</span>
          </span>
          <span>
            <b>
              FPTU <em>Xperience</em>
            </b>
            <small>EVERY EXPERIENCE MATTERS</small>
          </span>
        </NavLink>
        <div className="workspace-switch">
          <span className="workspace-icon">
            {admin ? <ShieldCheck size={19} /> : <GraduationCap size={21} />}
          </span>
          <div>
            <small>CHẾ ĐỘ XEM THỬ</small>
            <select
              aria-label="Chọn actor"
              value={role}
              onChange={(e) => switchRole(e.target.value)}
            >
              <option value="STUDENT_AFFAIRS_ADMIN">Công tác sinh viên</option>
              <option value="ADMIN">Admin hệ thống</option>
            </select>
          </div>
          <ChevronDown size={14} />
        </div>
        <nav aria-label="Điều hướng chính">
          {nav.map(({ path, label, icon: Icon, group }) => (
            <div key={path}>
              {group && <div className="nav-group">{group}</div>}
              <NavLink
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                to={path}
              >
                <Icon size={18} />
                <span>{label}</span>
                {path.endsWith('/anomalies') && anomalies > 0 && (
                  <span className="nav-count warning">{anomalies}</span>
                )}
                {path.endsWith('/clubs') && pending > 0 && (
                  <span className="nav-count">{pending}</span>
                )}
              </NavLink>
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="support-card">
            <span className="support-symbol">
              <Sparkles size={18} />
            </span>
            <strong>Cùng tạo nên trải nghiệm</strong>
            <p>
              Mỗi kết nối hôm nay mở ra
              <br />
              một hành trình mới.
            </p>
            <button onClick={() => setHelp(true)}>
              Khám phá không gian <ArrowRight size={14} />
            </button>
          </div>
          <button className="help-link" onClick={() => setHelp(true)}>
            <CircleHelp size={17} />
            Hướng dẫn sử dụng
            <ChevronRight size={14} />
          </button>
          <div className="sidebar-profile">
            <span className={`profile-avatar ${admin ? 'blue' : ''}`}>{admin ? 'HN' : 'HL'}</span>
            <div>
              <strong>{admin ? 'Nguyễn Hoàng Nam' : 'Nguyễn Hà Linh'}</strong>
              <small>{admin ? 'Quản trị viên hệ thống' : 'Phòng Công tác sinh viên'}</small>
            </div>
            <span className="online-dot" />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <span className="mobile-menu">
              <IconButton icon={Menu} label="Mở điều hướng" onClick={() => setMobile(true)} />
            </span>
            <span>{admin ? 'Quản trị hệ thống' : 'Công tác sinh viên'}</span>
            <ChevronRight size={14} />
            <strong>{current.label}</strong>
          </div>
          <div className="topbar-actions">
            <button className="quick-search" onClick={() => setSearch(true)}>
              <Search size={16} />
              <span>Tìm nhanh…</span>
              <kbd>
                <Command size={10} />K
              </kbd>
            </button>
            <span className="topbar-divider" />
            <button
              className="notification-button"
              aria-label="Thông báo cần xử lý"
              onClick={() => setNotifications(true)}
            >
              <Bell size={19} />
              {pending + anomalies > 0 && !admin && <i />}
            </button>
            <span className="campus">
              <span className="campus-dot" />
              FPTU HCM
            </span>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          <div className="context-row">
            <span>
              <span className="demo-dot" />
              Bản thiết kế tương tác · Dữ liệu minh họa
            </span>
            {!admin ? (
              <label className="semester-select">
                <CalendarDays size={15} />
                <select
                  aria-label="Học kỳ đang xem"
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                >
                  {state.seasons.map((s) => (
                    <option key={s.id} value={s.id}>
                      Học kỳ {seasonLabel(s.id)}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <span className="context-detail">
                Tài khoản và thay đổi được lưu trên trình duyệt
              </span>
            )}
          </div>
          <Routes>
            <Route
              path="/ctsv/overview"
              element={!admin ? <Dashboard /> : <Navigate to="/admin/accounts" replace />}
            />
            <Route
              path="/ctsv/clubs"
              element={!admin ? <Clubs /> : <Navigate to="/admin/accounts" replace />}
            />
            <Route
              path="/ctsv/engagement"
              element={!admin ? <Engagement /> : <Navigate to="/admin/accounts" replace />}
            />
            <Route
              path="/ctsv/quests"
              element={!admin ? <Quests /> : <Navigate to="/admin/accounts" replace />}
            />
            <Route
              path="/ctsv/rubrics"
              element={!admin ? <Rubrics /> : <Navigate to="/admin/accounts" replace />}
            />
            <Route
              path="/ctsv/seasons"
              element={!admin ? <Seasons /> : <Navigate to="/admin/accounts" replace />}
            />
            <Route
              path="/ctsv/anomalies"
              element={!admin ? <Anomalies /> : <Navigate to="/admin/accounts" replace />}
            />
            <Route
              path="/ctsv/reports"
              element={!admin ? <Engagement reports /> : <Navigate to="/admin/accounts" replace />}
            />
            <Route
              path="/admin/accounts"
              element={admin ? <Accounts /> : <Navigate to="/ctsv/overview" replace />}
            />
            <Route
              path="/admin/roles"
              element={admin ? <RoleMatrix /> : <Navigate to="/ctsv/overview" replace />}
            />
            {['integrations', 'settings', 'health'].map((type) => (
              <Route
                key={type}
                path={`/admin/${type}`}
                element={
                  admin ? (
                    <SystemSettings key={type} type={type} />
                  ) : (
                    <Navigate to="/ctsv/overview" replace />
                  )
                }
              />
            ))}
            <Route
              path="/admin/audit"
              element={admin ? <Audit /> : <Navigate to="/ctsv/overview" replace />}
            />
            <Route path="*" element={<Navigate to={nav[0].path} replace />} />
          </Routes>
          <footer className="page-footer">
            <span>© 2026 FPTU Xperience</span>
            <span>Trải nghiệm hôm nay. Giá trị ngày mai.</span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className={`toast ${toast.type}`} role={toast.type === 'error' ? 'alert' : 'status'}>
          {toast.type === 'error' ? <ShieldAlert size={19} /> : <Check size={19} />}
          <span>{toast.message}</span>
          <IconButton icon={X} label="Đóng thông báo" onClick={dismissToast} />
        </div>
      )}
      {search && (
        <Modal
          title="Bạn muốn đến đâu?"
          description="Tìm một chức năng trong không gian đang xem."
          onClose={() => setSearch(false)}
        >
          <div className="modal-body">
            <SearchBox value={query} onChange={setQuery} placeholder="Nhập tên chức năng…" />
            {nav
              .filter((item) => normalize(item.label).includes(normalize(query)))
              .map((item) => (
                <button
                  className="search-result"
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setSearch(false);
                    setQuery('');
                  }}
                >
                  <item.icon size={18} />
                  {item.label}
                  <ArrowRight size={15} />
                </button>
              ))}
          </div>
        </Modal>
      )}
      {help && (
        <Modal
          title="Chào mừng đến FPTU Xperience"
          description="Hai không gian, một hành trình trải nghiệm sinh viên."
          onClose={() => setHelp(false)}
        >
          <div className="modal-body help-content">
            <BookOpen size={32} />
            <h3>Công tác sinh viên</h3>
            <p>
              Quản lý CLB và hồ sơ thành lập; cấu hình thang XP, học kỳ; tổ chức nhiệm vụ toàn
              trường; theo dõi sinh viên chưa tham gia và xử lý bất thường.
            </p>
            <h3>Admin hệ thống</h3>
            <p>
              Dùng bộ chọn actor ở thanh bên để quản lý tài khoản, thêm hoặc xóa tài khoản, tải mẫu
              và nhập file Excel .xlsx. File được kiểm tra trước khi thêm các dòng hợp lệ.
            </p>
            <div className="info-box">
              Đây là bản thiết kế chạy thử. Dữ liệu mẫu và thay đổi được lưu trên trình duyệt này;
              chưa kết nối hệ thống của trường.
            </div>
          </div>
          <div className="modal-footer">
            <Button variant="primary" onClick={() => setHelp(false)}>
              Bắt đầu khám phá
              <ArrowRight size={15} />
            </Button>
          </div>
        </Modal>
      )}
      {notifications && (
        <Modal
          title="Trung tâm thông báo"
          description="Những việc cần bạn quan tâm trong không gian này."
          onClose={() => setNotifications(false)}
        >
          <div className="modal-body">
            {admin ? (
              <div className="info-box">
                Có {state.audit.length} hoạt động trong nhật ký. Bạn có thể xem các thay đổi tài
                khoản và cấu hình tại mục Nhật ký hoạt động.
              </div>
            ) : (
              <>
                {[
                  [pending, 'hồ sơ thành lập CLB chờ duyệt', '/ctsv/clubs'],
                  [anomalies, 'bất thường XP cần xem xét', '/ctsv/anomalies'],
                ].map(([count, text, path]) => (
                  <button
                    className="notification-row"
                    key={path}
                    onClick={() => {
                      navigate(path);
                      setNotifications(false);
                    }}
                  >
                    <span className="notification-icon">
                      <ClipboardList size={20} />
                    </span>
                    <span>
                      <strong>
                        {count} {text}
                      </strong>
                      <small>Chọn để xem và xử lý</small>
                    </span>
                    <ChevronRight size={18} />
                  </button>
                ))}
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
