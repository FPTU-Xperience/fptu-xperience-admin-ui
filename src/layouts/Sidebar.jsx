import { NavLink, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  ChevronRight,
  CircleHelp,
  LogOut,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { ROLE_LABELS } from '../context/AuthContext.jsx'

export default function Sidebar({ nav, mobile, onOpenHelp }) {
  const { user, logout } = useAuth()
  const { state, role } = useWorkspace()

  const admin = role === 'ADMIN'

  async function handleLogout() {
    try {
      sessionStorage.removeItem('fptu-preview-role')
    } catch { /* ignore */ }
    await logout()
  }

  const displayName = user?.fullName || user?.name || user?.username || 'Người dùng'
  const displayRole = user?.roles?.[0] ? ROLE_LABELS[user.roles[0]] : 'Không xác định'
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <aside
      className="fixed top-0 left-0 h-screen w-[245px] bg-white border-r border-[#e9ebee] z-30 flex flex-col px-[15px]"
    >
      {/* Brand */}
      <NavLink
        to={nav[0]?.path || '/'}
        className="h-[87px] flex items-center gap-[10px] pl-[10px] shrink-0"
      >
        <span className="relative h-[37px] w-[37px] rounded-[11px] bg-[#ed641c] text-white overflow-hidden shrink-0">
          <span className="absolute inset-0 flex items-center justify-center text-[41px] font-bold leading-[32px] italic">
            x<span className="absolute top-0 right-[2px] text-[12px] leading-[15px] not-italic">✦</span>
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
                `flex gap-[11px] items-center min-h-[42px] py-[10px] px-[12px] text-[12.4px] rounded-lg my-[3px] transition-all duration-150 ${
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

      {/* Bottom section */}
      <div className="mt-auto pt-[14px]">
        {/* <div className="relative mx-[3px] mb-[15px] p-[15px_13px] rounded-[9px] bg-gradient-to-br from-[#faf4ef] to-[#fcf9f4] border border-[#f1e8dd] overflow-hidden">
          <span className="absolute -right-[75px] -bottom-[50px] w-[130px] h-[130px] rounded-full border border-[#eddcca88] pointer-events-none" />

          <span className="relative z-10 block text-[#cd8c58] mb-[9px]">
            <Sparkles size={18} />
          </span>
          <strong className="relative z-10 block text-[11.5px] font-semibold">
            Cùng tạo nên trải nghiệm
          </strong>
          <p className="relative z-10 text-[11.5px] text-[#a18d7b] leading-[1.8] my-[7px] mx-0">
            Mỗi kết nối hôm nay mở ra<br />một hành trình mới.
          </p>
          <button
            onClick={onOpenHelp}
            className="relative z-10 flex items-center gap-[8px] text-[11.4px] text-[#ae7648] font-semibold bg-transparent border-0 p-0 cursor-pointer"
          >
            Khám phá không gian <ArrowRight size={14} />
          </button>
        </div> */}

        {/* Help link */}
        <button
          onClick={onOpenHelp}
          className="w-full text-left py-[8px] px-[11px] pb-[16px] flex items-center gap-[10px] text-[11.6px] text-[#818792] bg-transparent border-0 cursor-pointer"
        >
          <CircleHelp size={17} />
          Hướng dẫn sử dụng
          <ChevronRight size={14} className="ml-auto" />
        </button>

        {/* User profile */}
        <div className="py-[17px] px-[3px] border-t border-[#e9ebee] flex items-center gap-[9px]">
          <span className={`rounded-full h-[33px] w-[33px] grid place-items-center text-[11px] font-semibold shrink-0 ${admin ? 'bg-[#e4e9f6] text-[#5d73a8]' : 'bg-[#eedacc] text-[#895638]'}`}>
            {initials || 'U'}
          </span>
          <div>
            <strong className="block text-[11px] font-semibold">{displayName}</strong>
            <small className="block text-[10.2px] text-[#9196a0] mt-[4px]">{displayRole}</small>
          </div>
          <button
            onClick={handleLogout}
            title="Đăng xuất"
            className="ml-auto mr-[7px] p-[4px] rounded bg-transparent border-0 cursor-pointer text-[#9196a0] hover:bg-[#f0f2f5] hover:text-[#596272] transition-colors"
          >
            <LogOut size={16} />
          </button>
          <span className="w-[6px] h-[6px] bg-[#75a68a] rounded-full shrink-0" />
        </div>
      </div>
    </aside>
  )
}
