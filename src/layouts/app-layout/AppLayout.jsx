import './AppLayout.css';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Check, ShieldAlert, X } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import { navigationFor, navigationItemFor, searchNavigationFor } from '../../routes/navigation.js';
import { IconButton } from '../../components/ui/index.js';
import { NotificationsModal, SearchModal } from '../../components/modals/index.js';
import Sidebar from '../../components/common/sidebar/Sidebar.jsx';
import Topbar from '../topbar/Topbar.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import GuidedHelp from '../../components/guided-help/GuidedHelp.jsx';
import { adminGuidePlan } from '../../components/guided-help/guide-plans.js';

export default function AppLayout({ children }) {
  const { user } = useAuth();
  const { role, season, setSeason, toast, dismissToast } = useWorkspace();
  const admin = role === 'SYSTEM_ADMIN';
  const nav = navigationFor(admin);
  const location = useLocation();
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const current = navigationItemFor(location.pathname, location.state) || nav[0];

  useEffect(() => {
    document.title = `${current?.label || 'Dashboard'} | ClubHub Admin`;
    setMobile(false);
  }, [location.pathname, current?.label]);

  useEffect(() => {
    const listener = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setMobile(false);
        setSearch(true);
      }
      if (e.key === 'Escape') setMobile(false);
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);

  useEffect(() => {
    if (!mobile) return;
    const wide = window.matchMedia('(min-width: 1024px)');
    if (wide.matches) {
      setMobile(false);
      return;
    }
    const closeOnWide = () => {
      if (wide.matches) setMobile(false);
    };
    wide.addEventListener('change', closeOnWide);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
      wide.removeEventListener('change', closeOnWide);
    };
  }, [mobile]);

  return (
    <div className="app-layout-content">
      {/* Skip link */}
      <a
        href="#main-content"
        className="app-layout-link"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
      >
        Đến nội dung chính
      </a>

      {/* Mobile backdrop */}
      {mobile && (
        <button
          className="app-layout-button"
          aria-label="Đóng điều hướng"
          onClick={() => setMobile(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar nav={nav} mobile={mobile} onClose={() => setMobile(false)} />

      {/* Main content area */}
      <div className="app-layout-content-2">
        <Topbar
          admin={admin}
          current={current}
          season={season}
          onSeasonChange={setSeason}
          onOpenMenu={() => setMobile(true)}
          onOpenSearch={() => {
            setMobile(false);
            setSearch(true);
          }}
          onOpenNotifications={() => setNotifications(true)}
        />

        <main id="main-content" tabIndex={-1} className="app-layout-main">
          {children}

          {/* Footer */}
          <footer className="app-layout-footer">
            <span>© 2026 FPTU Xperience</span>
            <span>Trải nghiệm hôm nay. Giá trị ngày mai.</span>
          </footer>
        </main>
      </div>

      {/* Toast notification */}
      {toast && (
        <div
          role={toast.type === 'error' ? 'alert' : 'status'}
          className={`app-layout-content-3 ${
            toast.type === 'error'
              ? 'app-layout-content-state-active'
              : 'app-layout-content-state-inactive'
          }`}
        >
          {toast.type === 'error' ? <ShieldAlert size={19} /> : <Check size={19} />}
          <span
            className={
              toast.type === 'error' ? 'app-layout-text-active' : 'app-layout-text-inactive'
            }
          >
            {toast.message}
          </span>
          <IconButton icon={X} label="Đóng thông báo" onClick={dismissToast} />
        </div>
      )}

      {/* Modals */}
      {search && <SearchModal nav={searchNavigationFor(admin)} onClose={() => setSearch(false)} />}
      {notifications && <NotificationsModal onClose={() => setNotifications(false)} />}
      <GuidedHelp plan={adminGuidePlan(location.pathname, role)} routeKey={location.pathname + location.search} accountKey={user?.id} />
    </div>
  );
}
