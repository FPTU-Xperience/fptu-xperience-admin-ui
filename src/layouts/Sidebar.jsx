import { NavLink, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  GraduationCap,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext.jsx';

export default function Sidebar({ nav, mobile, onOpenHelp }) {
  const { state, role, setRole } = useWorkspace();
  const admin = role === 'ADMIN';
  const navigate = useNavigate();
  const pending = state.applications.filter((a) => a.status === 'pending').length;
  const anomalies = state.anomalies.filter((a) => a.status === 'open').length;
  function switchRole(value) {
    setRole(value);
    navigate(value === 'ADMIN' ? '/admin/accounts' : '/ctsv/overview');
  }
  return (
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
          <button onClick={onOpenHelp}>
            Khám phá không gian <ArrowRight size={14} />
          </button>
        </div>
        <button className="help-link" onClick={onOpenHelp}>
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
  );
}