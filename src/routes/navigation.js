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
  ArrowRightLeft,
  ClipboardList,
  Coins,
  FileText,
  School,
  UserRoundCog,
} from 'lucide-react';

export const affairsNav = [
  {
    path: '/ctsv/overview',
    label: 'Tổng quan',
    icon: LayoutDashboard,
    group: 'KHÔNG GIAN LÀM VIỆC',
  },
  { path: '/ctsv/reports', label: 'Báo cáo từ CLB', icon: FileChartColumn },
  { path: '/ctsv/activity-approvals', label: 'Phê duyệt hoạt động', icon: FileCheck2 },
  { path: '/ctsv/activity-dossiers', label: 'Action & quyết toán XP', icon: ClipboardList },
  { path: '/ctsv/declarations', label: 'Duyệt hồ sơ tự khai', icon: FileCheck2 },
  { path: '/ctsv/clubs', label: 'Quản lý câu lạc bộ', icon: UsersRound },
  { path: '/ctsv/club-requests', label: 'Hồ sơ quản trị CLB', icon: FileText },
  { path: '/ctsv/global-activities', label: 'Hoạt động cấp trường', icon: School },
  { path: '/ctsv/student-roster', label: 'Sinh viên theo học kỳ', icon: Users },
  { path: '/ctsv/rollover', label: 'Chuyển học kỳ', icon: ArrowRightLeft },
  { path: '/ctsv/leadership', label: 'Kế nhiệm & khôi phục CLB', icon: UserRoundCog },
  { path: '/ctsv/club-bonuses', label: 'Ngân sách điểm CLB', icon: Coins },
  { path: '/ctsv/engagement', label: 'Gắn kết sinh viên', icon: Activity },
  { path: '/ctsv/quests', label: 'Nhiệm vụ & chiến dịch', icon: Target },
  {
    path: '/ctsv/rubrics',
    label: 'Thang điểm XP',
    icon: SlidersHorizontal,
    group: 'QUẢN LÝ TRẢI NGHIỆM',
  },
  { path: '/ctsv/seasons', label: 'Học kỳ & mùa giải', icon: CalendarDays },
  { path: '/ctsv/anomalies', label: 'Kiểm duyệt bất thường', icon: ShieldAlert },
  { path: '/ctsv/experience-audit', label: 'Đối soát trải nghiệm', icon: ScrollText },
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
