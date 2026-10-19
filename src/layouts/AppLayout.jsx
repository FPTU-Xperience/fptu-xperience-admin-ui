import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Check, ShieldAlert, X } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import { navigationFor } from '../routes/navigation.js';
import { IconButton } from '../components/ui/index.js';
import { NotificationsModal, SearchModal } from '../components/modals/index.js';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

export default function AppLayout({ children }) {
  const { role, season, setSeason, toast, dismissToast } = useWorkspace();
  const admin = role === 'ADMIN';
  const nav = navigationFor(admin);
  const location = useLocation();
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const current = nav.find((n) => n.path === location.pathname || location.pathname.startsWith(`${n.path}/`)) || nav[0];

  useEffect(() => {
    document.title = `${current?.label || 'Dashboard'} | FPTU Xperience`;
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
    <div className="min-h-screen">
      {/* Skip link */}
      <a
        href="#main-content"
        className="fixed left-[10px] top-[-60px] bg-[#ed641c] text-white px-3 py-3 z-[100] rounded-[7px] focus:top-[10px]"
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
          className="fixed inset-0 bg-[#27334360] z-[29] border-0 cursor-default"
          aria-label="Đóng điều hướng"
          onClick={() => setMobile(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        nav={nav}
        mobile={mobile}
        onClose={() => setMobile(false)}
      />

      {/* Main content area */}
      <div className="min-w-0 min-h-screen lg:ml-[245px]">
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

        <main
          id="main-content"
          tabIndex={-1}
          className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 max-w-[1650px] mx-auto"
        >
          {children}

          {/* Footer */}
          <footer className="flex flex-wrap justify-between items-center gap-[15px] text-[10px] text-[#b0b5be] py-[24px] mt-[8px]">
            <span>© 2026 FPTU Xperience</span>
            <span>Trải nghiệm hôm nay. Giá trị ngày mai.</span>
          </footer>
        </main>
      </div>

      {/* Toast notification */}
      {toast && (
        <div
          role={toast.type === 'error' ? 'alert' : 'status'}
          className={`fixed bottom-[25px] left-1/2 lg:ml-[122px] -translate-x-1/2 max-w-[calc(100vw-32px)] z-[150] bg-white border rounded-[10px] px-4 py-[14px] flex items-center gap-3 shadow-[0_8px_40px_#1730231a] ${
            toast.type === 'error'
              ? 'border-[#efd9d5] text-[#cd8a7d]'
              : 'border-[#dfece3] text-[#73a78a]'
          }`}
        >
          {toast.type === 'error' ? <ShieldAlert size={19} /> : <Check size={19} />}
          <span className={toast.type === 'error' ? 'text-[#ad8b80]' : 'text-[#74877b]'}>
            {toast.message}
          </span>
          <IconButton icon={X} label="Đóng thông báo" onClick={dismissToast} />
        </div>
      )}

      {/* Modals */}
      {search && <SearchModal nav={nav} onClose={() => setSearch(false)} />}
      {notifications && <NotificationsModal onClose={() => setNotifications(false)} />}
    </div>
  );
}
