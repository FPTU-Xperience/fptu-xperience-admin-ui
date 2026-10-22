import {
  Inbox,
  CalendarDays,
  UsersRound,
  Activity,
  FileCheck2,
  ChartNoAxesCombined,
  SlidersHorizontal,
  Users,
  Settings2,
  Server,
  ScrollText,
} from 'lucide-react';
export const featureTabs = {
  work: [
    { id: 'actionable', label: 'Cần xử lý' },
    { id: 'waiting', label: 'Đang chờ phản hồi' },
    { id: 'completed', label: 'Đã xử lý' },
    { id: 'overview', label: 'Số liệu tổng quan' },
  ],
  semesters: [
    { id: 'periods', label: 'Học kỳ' },
    { id: 'students', label: 'Danh sách sinh viên' },
    { id: 'deadlines', label: 'Deadline' },
    { id: 'rollover', label: 'Chuyển kỳ' },
  ],
  clubs: [
    { id: 'registry', label: 'Danh sách CLB' },
    { id: 'reports', label: 'Báo cáo đầu / cuối kỳ' },
    { id: 'requests', label: 'Hồ sơ & yêu cầu' },
    { id: 'leadership', label: 'Lãnh đạo' },
    { id: 'bonus', label: 'Ngân sách điểm' },
  ],
  activities: [
    { id: 'club', label: 'Hoạt động CLB' },
    { id: 'school', label: 'Hoạt động cấp trường' },
    { id: 'quests', label: 'Nhiệm vụ & chiến dịch' },
  ],
  monitoring: [
    { id: 'engagement', label: 'Gắn kết sinh viên' },
    { id: 'anomalies', label: 'Bất thường' },
    { id: 'reconciliation', label: 'Đối soát đóng góp' },
  ],
  policies: [
    { id: 'benchmark', label: 'Benchmark' },
    { id: 'effective', label: 'Chính sách hiệu lực' },
    { id: 'history', label: 'Lịch sử phiên bản' },
  ],
  accounts: [{ id: 'accounts', label: 'Tài khoản' }],
  configuration: [
    { id: 'platform', label: 'Nền tảng' },
    { id: 'identity', label: 'Định danh' },
    { id: 'timetable', label: 'Thời khóa biểu' },
  ],
};
export const affairsNav = [
  {
    path: '/ctsv/work',
    label: 'Việc cần xử lý',
    icon: Inbox,
    tabs: featureTabs.work,
    group: 'CÔNG TÁC SINH VIÊN',
  },
  {
    path: '/ctsv/semesters',
    label: 'Học kỳ & sinh viên',
    icon: CalendarDays,
    tabs: featureTabs.semesters,
  },
  { path: '/ctsv/clubs', label: 'Câu lạc bộ', icon: UsersRound, tabs: featureTabs.clubs },
  { path: '/ctsv/activities', label: 'Hoạt động', icon: Activity, tabs: featureTabs.activities },
  { path: '/ctsv/declarations', label: 'Trải nghiệm tự khai', icon: FileCheck2 },
  {
    path: '/ctsv/monitoring',
    label: 'Theo dõi & đối soát',
    icon: ChartNoAxesCombined,
    tabs: featureTabs.monitoring,
  },
  {
    path: '/ctsv/policies',
    label: 'Thang điểm & chính sách',
    icon: SlidersHorizontal,
    tabs: featureTabs.policies,
  },
];
export const adminNav = [
  {
    path: '/admin/accounts',
    label: 'Tài khoản',
    icon: Users,
    group: 'QUẢN TRỊ HỆ THỐNG',
    tabs: featureTabs.accounts,
  },
  {
    path: '/admin/configuration',
    label: 'Cấu hình & tích hợp',
    icon: Settings2,
    tabs: featureTabs.configuration,
  },
  { path: '/admin/operations', label: 'Vận hành hệ thống', icon: Server },
  { path: '/admin/audit', label: 'Nhật ký & truy vết', icon: ScrollText },
];
export const legacyRoutes = {
  '/ctsv/overview': '/ctsv/work?view=overview',
  '/ctsv/reports': '/ctsv/activities?view=club&source=api',
  '/ctsv/activity-approvals': '/ctsv/activities?view=club&source=api&type=FUTURE_EVENT',
  '/ctsv/activity-dossiers': '/ctsv/activities?view=club&source=mock',
  '/ctsv/club-requests': '/ctsv/clubs?view=requests',
  '/ctsv/global-activities': '/ctsv/activities?view=school',
  '/ctsv/student-roster': '/ctsv/semesters?view=students',
  '/ctsv/rollover': '/ctsv/semesters?view=rollover',
  '/ctsv/leadership': '/ctsv/clubs?view=leadership',
  '/ctsv/club-bonuses': '/ctsv/clubs?view=bonus',
  '/ctsv/engagement': '/ctsv/monitoring?view=engagement',
  '/ctsv/quests': '/ctsv/activities?view=quests',
  '/ctsv/rubrics': '/ctsv/policies?view=benchmark',
  '/ctsv/seasons': '/ctsv/semesters?view=periods',
  '/ctsv/anomalies': '/ctsv/monitoring?view=anomalies',
  '/ctsv/experience-audit': '/ctsv/monitoring?view=reconciliation&source=api',
  '/admin/roles': '/admin/accounts?view=accounts',
  '/admin/integrations': '/admin/configuration?view=identity',
  '/admin/settings': '/admin/configuration?view=platform',
  '/admin/health': '/admin/operations',
};
export function legacyDestination(pathname, search = '') {
  const target = legacyRoutes[pathname];
  if (!target) return null;
  const [path, defaults] = target.split('?'),
    params = new URLSearchParams(search),
    settings = new URLSearchParams(defaults);
  for (const [key, value] of settings)
    if (key === 'view' || !params.has(key)) params.set(key, value);
  return path + (params.size ? '?' + params : '');
}
export const navigationFor = (admin) => (admin ? adminNav : affairsNav);
export function navigationItemFor(pathname, state) {
  const canonical = legacyRoutes[pathname]?.split('?')[0] || pathname;
  if (pathname.startsWith('/ctsv/reports/'))
    return affairsNav.find(
      (n) => n.path === (state?.navigationOwner === 'clubs' ? '/ctsv/clubs' : '/ctsv/activities'),
    );
  return [...affairsNav, ...adminNav].find(
    (n) => canonical === n.path || canonical.startsWith(n.path + '/'),
  );
}
export const searchNavigationFor = (admin) =>
  navigationFor(admin).flatMap((item) => [
    item,
    ...(item.tabs || []).map((tab) => ({
      ...item,
      path: item.path + '?view=' + tab.id,
      label: item.label + ' · ' + tab.label,
      group: undefined,
    })),
  ]);
