import { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { LogOut, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import { isAdmin, ROLE_LABELS } from '../context/AuthContext.jsx';

export default function Sidebar({ nav, mobile, onClose }) {
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

  const admin = role === 'ADMIN';

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
      className={`app-sidebar fixed top-0 left-0 h-dvh w-[245px] max-w-[calc(100vw-32px)] bg-white border-r border-border z-30 flex flex-col px-4 ${mobile ? 'is-open' : ''}`}
    >
      <button
        type="button"
        className="lg:hidden absolute top-2 right-2 p-2 rounded-md hover:bg-surface"
        onClick={onClose}
        aria-label="Đóng điều hướng"
      >
        <X size={18} aria-hidden="true" />
      </button>
      {/* Brand */}
      <NavLink
        to={nav[0]?.path || '/'}
        className="h-[87px] flex items-center gap-[10px] pl-[10px] shrink-0"
      >
        <span className="relative h-[37px] w-[37px] rounded-[11px] bg-[#ed641c] text-white overflow-hidden shrink-0">
          <span className="absolute inset-0 flex items-center justify-center text-[41px] font-bold leading-[32px] italic">
            x
            <span className="absolute top-0 right-[2px] text-[12px] leading-[15px] not-italic">
              ✦
            </span>
          </span>
        </span>
        <span>
          <b className="block text-[16px] font-bold tracking-[-0.8px]">
            FPTU <em className="not-italic text-[#ed641c] font-semibold">Xperience</em>
          </b>
          <small className="block text-[6.8px] tracking-[1.5px] text-[#9499a1] mt-[5px] font-semibold">
            EVERY EXPERIENCE MATTERS
          </small>
        </span>
      </NavLink>

      {/* Navigation */}
      <nav aria-label="Điều hướng chính" className="overflow-y-auto flex-1 pb-[15px]">
        {nav.map(({ path, label, icon: Icon, group }) => (
          <div key={path}>
            {group && (
              <div className="text-[10px] tracking-[1.1px] text-[#9b9fa7] font-semibold pt-[18px] pb-[10px] px-[12px]">
                {group}
              </div>
            )}
            <NavLink
              to={path}
              className={({ isActive }) =>
                `flex gap-[11px] items-center min-h-[42px] py-[10px] px-[12px] text-[12.4px] rounded-lg my-[3px] transition-colors duration-150 ${
                  isActive
                    ? 'text-[#df5c1d] bg-[#fff0e5] font-semibold'
                    : 'text-[#707785] hover:bg-[#f8f9fb] hover:text-[#303a47]'
                }`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          </div>
        ))}
      </nav>

      {isAdmin(user) && (
        <NavLink
          className="px-3 py-2 text-xs text-muted hover:text-accent"
          to={admin ? '/ctsv/overview' : '/admin/accounts'}
        >
          {admin ? 'Không gian Công tác sinh viên' : 'Không gian quản trị hệ thống'}
        </NavLink>
      )}
      {/* Bottom section */}
      <div className="mt-auto pt-[14px]">
        {/* User profile */}
        <div className="py-[17px] px-[3px] border-t border-[#e9ebee] flex items-center gap-[9px]">
          <span
            className={`rounded-full h-[33px] w-[33px] grid place-items-center text-[11px] font-semibold shrink-0 ${admin ? 'bg-[#e4e9f6] text-[#5d73a8]' : 'bg-[#eedacc] text-[#895638]'}`}
          >
            {initials || 'U'}
          </span>
          <div className="min-w-0 flex-1">
            <strong className="block truncate text-[11px] font-semibold">{displayName}</strong>
            <small className="block text-[10.2px] text-[#9196a0] mt-[4px]">{displayRole}</small>
          </div>
          <button
            onClick={handleLogout}
            title="Đăng xuất"
            aria-label="Đăng xuất"
            className="ml-auto mr-[7px] p-[4px] rounded bg-transparent border-0 cursor-pointer text-[#9196a0] hover:bg-[#f0f2f5] hover:text-[#596272] transition-colors"
          >
            <LogOut size={16} />
          </button>
          <span className="w-[6px] h-[6px] bg-[#75a68a] rounded-full shrink-0" />
        </div>
      </div>
    </aside>
  );
}
