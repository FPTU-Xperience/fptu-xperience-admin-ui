import {
  Activity,
  CalendarDays,
  FileChartColumn,
  FileCheck2,
  LayoutDashboard,
  Plug,
  ScrollText,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  Users,
  UsersRound,
  Sparkles
} from 'lucide-react';

export const affairsNav = [
  {
    path: '/ctsv/overview',
    label: 'Tổng quan',
    icon: LayoutDashboard,
    group: 'KHÔNG GIAN LÀM VIỆC',
  },
  { path: '/ctsv/declarations', label: 'Duyệt hồ sơ tự khai', icon: FileCheck2 },
  { path: '/ctsv/clubs', label: 'Quản lý câu lạc bộ', icon: UsersRound },
  { path: '/ctsv/engagement', label: 'Gắn kết sinh viên', icon: Activity },
  { path: '/ctsv/bonus-matrix', label: 'Hệ số cộng điểm', icon: Sparkles },
  { path: '/ctsv/quests', label: 'Nhiệm vụ & chiến dịch', icon: Target },
  {
    path: '/ctsv/rubrics',
    label: 'Thang điểm XP',
    icon: SlidersHorizontal,
    group: 'QUẢN LÝ TRẢI NGHIỆM',
  },
  { path: '/ctsv/seasons', label: 'Học kỳ & mùa giải', icon: CalendarDays },
  { path: '/ctsv/anomalies', label: 'Kiểm duyệt bất thường', icon: ShieldAlert },
  { path: '/ctsv/reports', label: 'Báo cáo & phân tích', icon: FileChartColumn },
];

export const adminNav = [
  {
    path: '/admin/accounts',
    label: 'Quản lý tài khoản',
    icon: Users,
    group: 'QUẢN TRỊ HỆ THỐNG',
  },
  { path: '/admin/roles', label: 'Vai trò & phân quyền', icon: ShieldCheck },
  { path: '/admin/integrations', label: 'Tích hợp hệ thống', icon: Plug },
  { path: '/admin/settings', label: 'Cấu hình nền tảng', icon: Settings2 },
  { path: '/admin/health', label: 'Tình trạng hệ thống', icon: Activity, group: 'GIÁM SÁT' },
  { path: '/admin/audit', label: 'Nhật ký hoạt động', icon: ScrollText },
];

export const navigationFor = (admin) => (admin ? adminNav : affairsNav);