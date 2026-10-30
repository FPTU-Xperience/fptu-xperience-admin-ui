import './Topbar.css';
import { Bell, ChevronRight, Command, Menu, Search } from 'lucide-react';
import { IconButton } from '../../components/ui/index.js';
import ContextBar from '../context-bar/ContextBar.jsx';
import { useAuth, CAMPUS_OPTIONS } from '../../context/AuthContext.jsx';

export default function Topbar({
  admin,
  current,
  season,
  onSeasonChange,
  onOpenMenu,
  onOpenSearch,
  onOpenNotifications,
}) {
  const { user } = useAuth();
  const campus = CAMPUS_OPTIONS.find((item) => item.code === user?.campusCode);
  return (
    <header className="topbar-header">
      {/* Breadcrumb */}
      <div className="topbar-content">
        <span className="topbar-text">
          <IconButton icon={Menu} label="Mở điều hướng" onClick={onOpenMenu} />
        </span>
        <span className="topbar-text-2">{admin ? 'Quản trị hệ thống' : 'Công tác sinh viên'}</span>
        <ChevronRight size={14} className="topbar-chevron-right" />
        <strong className="topbar-value">{current?.label}</strong>
      </div>

      {/* Actions */}
      <div className="topbar-content-2">
        <ContextBar admin={admin} season={season} onSeasonChange={onSeasonChange} />
        {/* Quick search */}
        <button aria-label="Tìm nhanh" onClick={onOpenSearch} className="topbar-button">
          <Search size={16} />
          <span className="topbar-text-3">Tìm nhanh…</span>
          <kbd className="topbar-shortcut">
            <Command size={10} />K
          </kbd>
        </button>

        <span className="topbar-text-4" />

        {/* Notifications */}
        <button
          className="topbar-button-2"
          aria-label="Thông báo cần xử lý"
          onClick={onOpenNotifications}
        >
          <Bell size={19} />
        </button>

        {/* Campus */}
        <span className="topbar-text-5">
          <span className="topbar-text-6" />
          {campus ? (campus.code === 'GLOBAL' ? campus.name : `FPTU ${campus.shortName}`) : 'Campus chưa cập nhật'}
        </span>
      </div>
    </header>
  );
}
