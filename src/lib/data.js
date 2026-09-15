export const ROLES = {
  ADMIN: 'Quản trị viên',
  STUDENT_AFFAIRS_ADMIN: 'Công tác sinh viên',
  CLUB_MANAGER: 'Chủ nhiệm CLB',
  CLUB_MEMBER: 'Sinh viên',
};
export const MAJORS = [
  'Kỹ thuật phần mềm',
  'Trí tuệ nhân tạo',
  'Quản trị kinh doanh',
  'Thiết kế đồ họa',
  'Ngôn ngữ Anh',
];
export const SEASONS = ['FALL2026', 'SUMMER2026'];
export const seasonLabel = (value) =>
  ({ FALL2026: 'Fall 2026', SUMMER2026: 'Summer 2026' })[value] || value;
export const number = (value) => new Intl.NumberFormat('vi-VN').format(value);
export const date = (value) =>
  new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short' }).format(new Date(value));
export const normalize = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
export const initials = (name) =>
  name
    .split(' ')
    .slice(-2)
    .map((part) => part[0])
    .join('');

export function createSeed() {
  const types = ['Học thuật', 'Nghệ thuật', 'Thể thao', 'Cộng đồng'];
  const names = [
    'Nguyễn Minh Anh',
    'Trần Quốc Bảo',
    'Lê Hoàng Phúc',
    'Phạm Ngọc Hân',
    'Võ Tuấn Kiệt',
    'Đặng Hải Yến',
    'Bùi Gia Huy',
    'Huỳnh Khánh Linh',
    'Đỗ Minh Khang',
    'Phan Thảo Nguyên',
    'Ngô Đức Anh',
    'Dương Bảo Trân',
  ];
  const clubs = [
    {
      id: 'club-1',
      code: 'F-CODE',
      name: 'F-Code',
      category: 'Học thuật',
      description: 'Cùng học, cùng lập trình, cùng tạo ra giá trị.',
      color: '#6860d5',
      symbol: '</>',
      health: 86,
    },
    {
      id: 'club-2',
      code: 'MEL',
      name: 'Melody Club',
      category: 'Nghệ thuật',
      description: 'Kết nối đam mê qua từng giai điệu.',
      color: '#d6749e',
      symbol: '♫',
      health: 82,
    },
    {
      id: 'club-3',
      code: 'VOV',
      name: 'Vovinam FPTU',
      category: 'Thể thao',
      description: 'Rèn luyện thể chất, nuôi dưỡng tinh thần.',
      color: '#488eaf',
      symbol: 'V',
      health: 77,
    },
    {
      id: 'club-4',
      code: 'VOL',
      name: 'FPTU Volunteer',
      category: 'Cộng đồng',
      description: 'Hành động nhỏ, thay đổi lớn cho cộng đồng.',
      color: '#4a987c',
      symbol: '♡',
      health: 91,
    },
    {
      id: 'club-5',
      code: 'FOTO',
      name: 'FPTU Photography',
      category: 'Nghệ thuật',
      description: 'Lưu giữ những góc nhìn và câu chuyện mới.',
      color: '#b68552',
      symbol: 'F',
      health: 63,
    },
    {
      id: 'club-6',
      code: 'E-CLUB',
      name: 'English Club',
      category: 'Học thuật',
      description: 'Tự tin giao tiếp, sẵn sàng hội nhập.',
      color: '#738cce',
      symbol: 'En',
      health: 72,
    },
    {
      id: 'club-7',
      code: 'BASK',
      name: 'FPTU Basketball',
      category: 'Thể thao',
      description: 'Bứt phá cùng đồng đội trên sân bóng.',
      color: '#ce785a',
      symbol: 'B',
      health: 39,
    },
    {
      id: 'club-8',
      code: 'GREEN',
      name: 'Green Campus',
      category: 'Cộng đồng',
      description: 'Xây dựng một khuôn viên xanh và bền vững.',
      color: '#759455',
      symbol: 'G',
      health: 46,
    },
  ].map((club) => ({
    ...club,
    status: 'active',
    email: `${club.code.toLowerCase()}@example.edu.vn`,
    leader: names[Number(club.id.split('-')[1]) - 1],
  }));
  const accounts = [
    {
      id: 'admin-self',
      username: 'admin.demo',
      fullName: 'Nguyễn Hoàng Nam',
      email: 'admin.demo@example.edu.vn',
      role: 'ADMIN',
      status: 'active',
    },
    {
      id: 'admin-2',
      username: 'admin.backup',
      fullName: 'Trần Minh Châu',
      email: 'admin.backup@example.edu.vn',
      role: 'ADMIN',
      status: 'active',
    },
    {
      id: 'affairs-self',
      username: 'ctsv.demo',
      fullName: 'Nguyễn Hà Linh',
      email: 'ctsv.demo@example.edu.vn',
      role: 'STUDENT_AFFAIRS_ADMIN',
      status: 'active',
    },
    {
      id: 'affairs-2',
      username: 'ctsv.02',
      fullName: 'Phạm Thu Hà',
      email: 'ctsv.02@example.edu.vn',
      role: 'STUDENT_AFFAIRS_ADMIN',
      status: 'active',
    },
    ...clubs.map((club, i) => ({
      id: `manager-${i + 1}`,
      username: `manager.${i + 1}`,
      fullName: names[i],
      email: `manager.${i + 1}@example.edu.vn`,
      role: 'CLUB_MANAGER',
      status: 'active',
      clubIds: [club.id],
    })),
    ...Array.from({ length: 240 }, (_, i) => ({
      id: `student-${i + 1}`,
      username: `SE${180001 + i}`,
      fullName: names[i % names.length],
      email: `student.${i + 1}@example.edu.vn`,
      role: 'CLUB_MEMBER',
      status: i % 31 === 0 ? 'locked' : 'active',
      major: MAJORS[i % MAJORS.length],
      cohort: i % 3 === 0 ? 'K20' : i % 3 === 1 ? 'K19' : 'K18',
      clubIds: i % 5 === 0 ? [] : [`club-${(i % 8) + 1}`],
      experience: {
        FALL2026: i % 5 === 0 ? 0 : ((i * 73) % 1800) + 100,
        SUMMER2026: i % 4 === 0 ? 0 : ((i * 47) % 1400) + 50,
      },
      joinedAt: `2026-09-${String((i % 15) + 1).padStart(2, '0')}`,
    })),
  ].map((a) => ({ joinedAt: '2026-09-01', clubIds: [], ...a }));
  const applications = [
    {
      id: 'app-1',
      name: 'AI & Robotics Club',
      code: 'AIRO',
      category: 'Học thuật',
      applicant: 'Lê Hoàng Phúc',
      members: 15,
      submitted: '2026-09-14',
      purpose: 'Xây dựng cộng đồng nghiên cứu AI và phát triển các sản phẩm robot ứng dụng.',
      plan: 'Sinh hoạt vào thứ Bảy; tổ chức 2 workshop và 1 cuộc thi mỗi học kỳ.',
      status: 'pending',
    },
    {
      id: 'app-2',
      name: 'FPTU Debate Society',
      code: 'DEBATE',
      category: 'Học thuật',
      applicant: 'Phan Thảo Nguyên',
      members: 12,
      submitted: '2026-09-13',
      purpose: 'Rèn luyện tư duy phản biện và kỹ năng tranh biện bằng tiếng Việt, tiếng Anh.',
      plan: 'Thực hành tranh biện hằng tuần và giao lưu liên trường mỗi tháng.',
      status: 'pending',
    },
    {
      id: 'app-3',
      name: 'Running Together',
      code: 'RUN',
      category: 'Thể thao',
      applicant: 'Võ Tuấn Kiệt',
      members: 20,
      submitted: '2026-09-12',
      purpose: 'Khuyến khích thói quen chạy bộ và nâng cao sức khỏe sinh viên.',
      plan: 'Chạy bộ 2 buổi mỗi tuần và tham gia giải chạy cộng đồng.',
      status: 'pending',
    },
  ];
  const rubrics = types.map((type, i) => ({
    id: `rubric-${i}`,
    type,
    version: 1,
    cap: 2000,
    scale: 100,
    status: 'published',
    effective: '2026-09-01',
    criteria: [
      { name: 'Tham gia đã xác thực', xp: 20, weight: i === 0 ? 20 : 40 },
      { name: 'Đóng góp có minh chứng', xp: 80, weight: i === 0 ? 50 : 30 },
      { name: 'Tổ chức và dẫn dắt', xp: 120, weight: 30 },
    ],
    history: [],
  }));
  const quests = [
    {
      id: 'quest-1',
      name: 'Chạm ngõ trải nghiệm',
      description: 'Tham gia lần đầu vào một hoạt động của CLB và hoàn tất check-in xác thực.',
      category: 'Khám phá',
      scope: 'Sinh viên chưa tham gia CLB',
      kind: 'Cá nhân',
      reward: 100,
      target: 80,
      joined: 56,
      completed: 32,
      deadline: '2026-10-15',
      season: 'FALL2026',
      status: 'published',
      icon: 'compass',
    },
    {
      id: 'quest-2',
      name: 'Một hành động xanh',
      description:
        'Cùng đội của bạn hoàn thành một dự án vì môi trường, nộp minh chứng để xác thực.',
      category: 'Cộng đồng',
      scope: 'Toàn bộ sinh viên',
      kind: 'Theo nhóm',
      reward: 200,
      target: 120,
      joined: 84,
      completed: 41,
      deadline: '2026-10-30',
      season: 'FALL2026',
      status: 'published',
      icon: 'leaf',
    },
    {
      id: 'quest-3',
      name: 'Chia sẻ để trưởng thành',
      description: 'Trở thành người hướng dẫn cho một nhóm sinh viên mới trong hoạt động học tập.',
      category: 'Học thuật',
      scope: 'Toàn bộ sinh viên',
      kind: 'Cá nhân',
      reward: 150,
      target: 60,
      joined: 0,
      completed: 0,
      deadline: '2026-11-15',
      season: 'FALL2026',
      status: 'draft',
      icon: 'sparkles',
    },
  ];
  const anomalies = [
    {
      id: 'case-1',
      title: 'Check-in đồng loạt trong 1 giây',
      club: 'FPTU Basketball',
      student: 'student-7',
      severity: 'high',
      amount: 400,
      count: 20,
      source: 'Workshop kỹ năng đội nhóm · EVT-028',
      evidence:
        '20 lượt check-in cùng thời điểm 14:32:06. Cần đối chiếu với danh sách điểm danh và thời gian sự kiện.',
      status: 'open',
      time: '2026-09-15T14:32:06+07:00',
    },
    {
      id: 'case-2',
      title: 'Trao XP chưa có minh chứng',
      club: 'FPTU Photography',
      student: 'student-12',
      severity: 'medium',
      amount: 160,
      count: 2,
      source: 'Dự án Campus Stories · EVT-019',
      evidence:
        'Hai đóng góp sản phẩm được xác nhận nhưng chưa đính kèm đường dẫn hoặc tệp minh chứng.',
      status: 'open',
      time: '2026-09-14T09:15:00+07:00',
    },
    {
      id: 'case-3',
      title: 'XP tăng vượt ngưỡng trong ngày',
      club: 'F-Code',
      student: 'student-18',
      severity: 'medium',
      amount: 600,
      count: 3,
      source: 'Hackathon nội bộ · EVT-032',
      evidence:
        'Ba lần trao XP cho cùng sinh viên trong vòng 5 phút. Cần xác minh đóng góp có bị ghi nhận trùng.',
      status: 'open',
      time: '2026-09-14T08:30:00+07:00',
    },
  ];
  return {
    version: 1,
    accounts,
    clubs,
    types,
    applications,
    rubrics,
    quests,
    anomalies,
    seasons: [
      {
        id: 'FALL2026',
        start: '2026-09-01',
        end: '2026-12-31',
        threshold: 200,
        xpPerLevel: 100,
        rankings: false,
      },
      {
        id: 'SUMMER2026',
        start: '2026-05-01',
        end: '2026-08-31',
        threshold: 200,
        xpPerLevel: 100,
        rankings: false,
      },
    ],
    ledger: anomalies.map((a, i) => ({
      id: `ledger-${i + 1}`,
      studentId: a.student,
      amount: a.amount,
      source: a.source,
      rubricVersion: 1,
      caseId: a.id,
      season: 'FALL2026',
      type: 'award',
      at: a.time,
      actor: 'Chủ nhiệm CLB',
      reason: 'Ghi nhận đóng góp — dữ liệu minh họa',
    })),
    settings: {
      emailNotifications: true,
      inAppNotifications: true,
      digest: 'daily',
      rateLimit: 120,
      retention: 365,
      googleDomain: '',
      timetableUrl: '',
    },
    audit: [
      {
        id: 'audit-seed',
        at: '2026-09-01T08:00:00+07:00',
        actor: 'Hệ thống mẫu',
        action: 'Khởi tạo không gian làm việc',
        detail: 'Bộ dữ liệu minh họa học kỳ Fall 2026',
        area: 'system',
      },
    ],
  };
}

export function studentXP(student, season, ledger) {
  const corrections = ledger
    .filter((e) => e.studentId === student.id && e.type === 'correction' && e.season === season)
    .reduce((sum, e) => sum + e.amount, 0);
  return Math.max(0, (student.experience?.[season] || 0) + corrections);
}
