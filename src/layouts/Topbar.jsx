import { Bell, ChevronRight, Command, Menu, Search } from 'lucide-react';
import { IconButton } from '../components/ui/index.js';

export default function Topbar({
  admin,
  current,
  pending,
  anomalies,
  onOpenMenu,
  onOpenSearch,
  onOpenNotifications,
}) {
  return (
    <header className="topbar">
      <div className="breadcrumb">
        <span className="mobile-menu">
          <IconButton icon={Menu} label="Mở điều hướng" onClick={onOpenMenu} />
        </span>
        <span>{admin ? 'Quản trị hệ thống' : 'Công tác sinh viên'}</span>
        <ChevronRight size={14} />
        <strong>{current.label}</strong>
      </div>
      <div className="topbar-actions">
        <button className="quick-search" onClick={onOpenSearch}>
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
          onClick={onOpenNotifications}
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
  );
}