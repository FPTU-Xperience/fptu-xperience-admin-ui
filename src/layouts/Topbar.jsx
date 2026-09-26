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
    <header className="h-[66px] flex justify-between items-center px-[32px] bg-white border-b border-[#e9ebee]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-[13px] text-[11px] text-[#999ea7]">
        <span className="sm:hidden">
          <IconButton icon={Menu} label="Mở điều hướng" onClick={onOpenMenu} />
        </span>
        <span className="hidden sm:block">{admin ? 'Quản trị hệ thống' : 'Công tác sinh viên'}</span>
        <ChevronRight size={14} className="text-[#b8bdc5]" />
        <strong className="font-medium text-[#4c5461]">{current?.label}</strong>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-[18px]">
        {/* Quick search */}
        <button
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
          {pending + anomalies > 0 && !admin && (
            <i className="absolute right-[6px] top-[1px] w-[5px] h-[5px] bg-[#ed641c] rounded-full shadow-[0_0_0_2px_white]" />
          )}
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
