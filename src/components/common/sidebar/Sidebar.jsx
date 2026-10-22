import './Sidebar.css';
import { useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { navigationItemFor } from '../../../routes/navigation.js';
import { LogOut, X } from 'lucide-react';
import Brand from '../brand/Brand.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useWorkspace } from '../../../context/WorkspaceContext.jsx';
import { ROLE_LABELS } from '../../../context/AuthContext.jsx';

export default function Sidebar({ nav, mobile, onClose }) {
  const location = useLocation();
  const current = navigationItemFor(location.pathname, location.state);
  const { user, logout } = useAuth();
  const { role } = useWorkspace();

  const sidebarRef = useRef(null);
  useEffect(() => {
    const compact = window.matchMedia('(max-width: 1023px)');
    const update = () => {
      if (sidebarRef.current) sidebarRef.current.inert = compact.matches && !mobile;
    };
    update();
    compact.addEventListener('change', update);
    return () => compact.removeEventListener('change', update);
  }, [mobile]);

  useEffect(() => {
    if (!mobile) return;
    const previous = document.activeElement;
    const sidebar = sidebarRef.current;
    const focusables = () =>
      [...sidebar.querySelectorAll('a[href],button:not(:disabled)')].filter(
        (item) => item.getClientRects().length,
      );
    focusables()[0]?.focus();
    const containFocus = (event) => {
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (event.shiftKey && document.activeElement === items[0]) {
        event.preventDefault();
        items.at(-1)?.focus();
      } else if (!event.shiftKey && document.activeElement === items.at(-1)) {
        event.preventDefault();
        items[0]?.focus();
      }
    };
    sidebar.addEventListener('keydown', containFocus);
    return () => {
      sidebar.removeEventListener('keydown', containFocus);
      previous?.focus();
    };
  }, [mobile]);

  const admin = role === 'SYSTEM_ADMIN';

  async function handleLogout() {
    try {
      sessionStorage.removeItem('fptu-preview-role');
    } catch {
      /* ignore */
    }
    await logout();
  }

  const displayName = user?.fullName || user?.name || user?.username || 'Người dùng';
  const displayRole = user?.roles?.[0] ? ROLE_LABELS[user.roles[0]] : 'Không xác định';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside
      ref={sidebarRef}
      id="app-sidebar"
      className={`app-sidebar sidebar-aside ${mobile ? 'is-open' : ''}`}
    >
      <button
        type="button"
        className="sidebar-button"
        onClick={onClose}
        aria-label="Đóng điều hướng"
      >
        <X size={18} aria-hidden="true" />
      </button>
      {/* Brand */}
      <NavLink
        to={nav[0]?.path || '/'}
        className="sidebar-nav-link"
        aria-label="ClubHub Admin - Trang chủ"
      >
        <Brand />
      </NavLink>

      {/* Navigation */}
      <nav aria-label="Điều hướng chính" className="sidebar-navigation">
        {nav.map(({ path, label, icon: Icon, group }) => (
          <div key={path}>
            {group && <div className="sidebar-content">{group}</div>}
            <NavLink
              to={path}
              className={({ isActive }) =>
                `sidebar-nav-link-2 ${
                  isActive || current?.path === path
                    ? 'sidebar-nav-link-state-active'
                    : 'sidebar-nav-link-state-inactive'
                }`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="sidebar-content-2">
        {/* User profile */}
        <div className="sidebar-content-3">
          <span
            className={`sidebar-text ${admin ? 'sidebar-text-state-active' : 'sidebar-text-state-inactive'}`}
          >
            {initials || 'U'}
          </span>
          <div className="sidebar-content-4">
            <strong className="sidebar-value">{displayName}</strong>
            <small className="sidebar-caption">{displayRole}</small>
          </div>
          <button
            onClick={handleLogout}
            title="Đăng xuất"
            aria-label="Đăng xuất"
            className="sidebar-button-2"
          >
            <LogOut size={16} />
          </button>
          <span className="sidebar-text-2" />
        </div>
      </div>
    </aside>
  );
}
