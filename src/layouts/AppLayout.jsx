import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Check, ShieldAlert, X } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import { navigationFor } from '../routes/navigation.js';
import { IconButton } from '../components/ui/index.js';
import { HelpModal, NotificationsModal, SearchModal } from '../components/modals/index.js';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import ContextBar from './ContextBar.jsx';

export default function AppLayout({ children }) {
  const { state, role, season, setSeason, toast, dismissToast } = useWorkspace();
  const admin = role === 'ADMIN';
  const nav = navigationFor(admin);
  const location = useLocation();
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState(false);
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
      <Sidebar nav={nav} mobile={mobile} onOpenHelp={() => setHelp(true)} />
      <div className="main-shell">
        <Topbar
          admin={admin}
          current={current}
          pending={pending}
          anomalies={anomalies}
          onOpenMenu={() => setMobile(true)}
          onOpenSearch={() => setSearch(true)}
          onOpenNotifications={() => setNotifications(true)}
        />
        <main id="main-content" tabIndex={-1}>
          <ContextBar admin={admin} season={season} onSeasonChange={setSeason} />
          {children}
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
      {search && <SearchModal nav={nav} onClose={() => setSearch(false)} />}
      {help && <HelpModal onClose={() => setHelp(false)} />}
      {notifications && (
        <NotificationsModal
          admin={admin}
          pending={pending}
          anomalies={anomalies}
          auditCount={state.audit.length}
          onClose={() => setNotifications(false)}
        />
      )}
    </div>
  );
}