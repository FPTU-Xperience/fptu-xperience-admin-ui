import { Bell, ChevronRight, Command, Menu, Search } from 'lucide-react';
import { IconButton } from '../components/ui/index.js';
import ContextBar from './ContextBar.jsx';

export default function Topbar({ admin, current, season, onSeasonChange, onOpenMenu, onOpenSearch, onOpenNotifications }) {
  return (
    <header className="min-h-[66px] min-w-0 flex justify-between items-center gap-3 px-4 sm:px-6 lg:px-8 bg-white border-b border-[#e9ebee]">
      {/* Breadcrumb */}
      <div className="min-w-0 flex-1 flex items-center gap-2 text-[11px] text-[#999ea7]">
        <span className="lg:hidden">
          <IconButton icon={Menu} label="Mở điều hướng" onClick={onOpenMenu} />
        </span>
        <span className="hidden sm:block">
          {admin ? 'Quản trị hệ thống' : 'Công tác sinh viên'}
        </span>
        <ChevronRight size={14} className="hidden sm:block shrink-0 text-[#b8bdc5]" />
        <strong className="hidden sm:block truncate font-medium text-[#4c5461]">{current?.label}</strong>
      </div>

      {/* Actions */}
      <div className="shrink-0 flex items-center gap-3 sm:gap-[18px]">
        <ContextBar admin={admin} season={season} onSeasonChange={onSeasonChange} />
        {/* Quick search */}
        <button
          aria-label="Tìm nhanh"
          onClick={onOpenSearch}
          className="flex items-center gap-[8px] text-[11px] text-[#a2a6ae] bg-transparent border-0 cursor-pointer"
        >
          <Search size={16} />
          <span className="hidden md:inline">Tìm nhanh…</span>
          <kbd className="hidden md:flex items-center gap-[3px] border border-[#e9ebee] rounded px-[5px] py-[3px] text-[11px] ml-[22px]">
            <Command size={10} />K
          </kbd>
        </button>

        <span className="w-[1px] h-[20px] bg-[#e9ebee] hidden sm:block" />

        {/* Notifications */}
        <button
          className="relative bg-transparent border-0 text-[#7e8591] cursor-pointer"
          aria-label="Thông báo cần xử lý"
          onClick={onOpenNotifications}
        >
          <Bell size={19} />
        </button>

        {/* Campus */}
        <span className="hidden md:flex items-center gap-[6px] text-[11px] text-[#666f7d]">
          <span className="w-[5px] h-[5px] bg-[#f19050] rounded-full" />
          FPTU HCM
        </span>
      </div>
    </header>
  );
}
