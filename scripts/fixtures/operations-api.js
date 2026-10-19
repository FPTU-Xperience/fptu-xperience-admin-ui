const options = new URLSearchParams(location.search);
const actor = options.get('actor') || 'staff';
const scenario = options.get('scenario') || '';
const user = {
  id: 9,
  fullName: 'Người kiểm thử CTSV',
  email: 'qa@example.test',
  campusCode: 'HCM',
  roles: [actor === 'admin' ? 'ADMIN' : 'STUDENT_AFFAIRS_ADMIN'],
};
const semesters = [
  { semesterCode: 'FALL2026', label: 'Fall 2026', isActive: true },
  { semesterCode: 'SPRING2027', label: 'Spring 2027' },
];
const reports = Array.from({ length: 24 }, (_, i) => ({
  id: i + 1,
  clubId: (i % 2) + 1,
  clubName: i % 2 ? 'CLB Nghệ thuật' : 'CLB Công nghệ',
  period: i === 23 ? 'SPRING2027' : 'FALL2026',
  reportType: i === 0 ? 'FUTURE_EVENT' : 'CLUB_ACTIVITY',
  tag: i === 0 ? 'FUTURE_EVENT' : `CLUB_ACTIVITY:${i}`,
  status: i === 22 ? 'Submitted' : 'Under Review',
  createdByUserId: i === 21 ? 9 : 3,
  version: 1,
  executiveSummary:
    i === 0
      ? 'Đề xuất tổ chức ngày hội công nghệ sinh viên.'
      : 'Tổng kết hoạt động cộng đồng và kết quả thực hiện.',
  achievements: 'Hoàn thành nội dung theo kế hoạch đã đăng ký.',
  challenges: '',
  recommendations: '',
  nextPeriodPlan: '',
  createdAtUtc: '2026-10-15T03:00:00Z',
  updatedAtUtc: '2026-10-18T04:00:00Z',
  submittedAtUtc: '2026-10-16T03:00:00Z',
  details: [
    {
      id: i + 1,
      activityName: i === 0 ? 'Ngày hội công nghệ' : `Báo cáo hoạt động ${i + 1}`,
      activityDate: '2026-10-25',
      location: 'Sảnh trường',
      objective: 'Kết nối sinh viên',
      description: 'Nội dung báo cáo dùng riêng cho kiểm thử giao diện.',
      participantCount: 80,
      targetParticipantCount: 100,
      outcome: 'Hoàn thành',
      evidenceUrl: 'javascript:alert(1)',
    },
  ],
  attachments: [{ id: 1, fileName: 'Minh_chung.pdf', sizeBytes: 1024 }],
  feedback: [
    {
      id: 1,
      reviewerName: 'Quản lý CLB kiểm thử',
      decision: 'Submitted',
      message: 'CLB đã kiểm tra và chuyển tiếp hồ sơ.',
      createdAtUtc: '2026-10-16T03:00:00Z',
    },
  ],
  uploadedFile: {
    originalFileName: 'Bao_cao.pdf',
    isPreviewAvailable: true,
    isDownloadAvailable: true,
  },
  canViewFinance: i === 0,
  budgetRequestedAmount: i === 0 ? 5000000 : null,
}));
const requests = {
  disband: [
    {
      id: 31,
      clubId: 1,
      clubName: 'CLB Công nghệ',
      status: 'Pending',
      reason: 'Đề nghị giải thể theo nghị quyết của CLB.',
      requesterName: 'Chủ nhiệm kiểm thử',
      requestedAtUtc: '2026-10-18T04:00:00Z',
    },
  ],
  transfer: [
    {
      id: 41,
      clubId: 2,
      clubName: 'CLB Nghệ thuật',
      status: 'Pending',
      reason: 'Bàn giao nhiệm kỳ.',
      currentOwnerName: 'Chủ nhiệm cũ',
      newOwnerName: 'Chủ nhiệm mới',
      requestedAtUtc: '2026-10-18T04:00:00Z',
    },
  ],
};
const clone = (value) => structuredClone(value);
const fail = (message, status = 503) => {
  throw Object.assign(new Error(message), { status });
};
const getReport = async (id) => {
  const row = reports.find((item) => item.id === Number(id));
  if (!row) return fail('Không tìm thấy báo cáo.', 404);
  return clone(row);
};
const download = async () => {
  /* Deliberately no real files or network side effect. */
};
const pdf = () => {
  let text = '%PDF-1.4\n',
    offsets = [0];
  const stream = 'BT /F1 18 Tf 40 740 Td (Fixture report preview) Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  objects.forEach((body, i) => {
    offsets.push(text.length);
    text += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const start = text.length;
  text +=
    'xref\n0 6\n0000000000 65535 f \n' +
    offsets
      .slice(1)
      .map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`)
      .join('');
  text += `trailer << /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
  return new TextEncoder().encode(text);
};
const lifecycle = (kind) => ({
  list: async () => clone(requests[kind]),
  approve: async (id, body) => decideClub(kind, id, body, 'Approved'),
  reject: async (id, body) => decideClub(kind, id, body, 'Rejected'),
});
function decideClub(kind, id, body, status) {
  if (!body?.adminNote) return fail('Thiếu adminNote.', 400);
  const row = requests[kind].find((item) => item.id === id);
  Object.assign(row, {
    status,
    adminNote: body.adminNote,
    reviewedAtUtc: new Date().toISOString(),
  });
  return clone(row);
}
export async function workflowRequest(path, method, body) {
  const match = path.match(/^\/api\/reports\/(\d+)\/(approve|reject)$/);
  if (match) {
    if (scenario === 'decision-error') return fail('Không thể lưu quyết định kiểm thử.');
    const row = reports.find((item) => item.id === Number(match[1]));
    if (row.status !== 'Under Review') return fail('Báo cáo không còn chờ duyệt.', 409);
    Object.assign(row, {
      status: match[2] === 'approve' ? 'Approved' : 'Rejected',
      version: row.version + 1,
    });
    row.feedback.push({
      id: 2,
      reviewerName: user.fullName,
      decision: row.status,
      message: body.feedback || 'Đã duyệt',
      createdAtUtc: new Date().toISOString(),
    });
    return clone(row);
  }
  return fail('Fixture chưa khai báo thao tác này.', 501);
}
export const api = {
  getAccessToken: () => 'qa-only',
  getRefreshToken: () => null,
  clearTokens() {},
  setToken() {},
  setRefreshToken() {},
  auth: { me: async () => user, adminMe: async () => user, ctsvMe: async () => user },
  seasons: {
    list: async () =>
      scenario === 'semester-error' ? fail('Không thể tải học kỳ kiểm thử.') : clone(semesters),
    getActive: async () => clone(semesters[0]),
  },
  reports: {
    list: async (params) => {
      if (scenario === 'list-error') return fail('Không thể tải danh sách báo cáo kiểm thử.');
      const rows =
        scenario === 'empty'
          ? []
          : reports.filter(
              (row) =>
                (!params.status || row.status === params.status) &&
                (!params.period || row.period === params.period) &&
                (!params.tag || row.tag === params.tag) &&
                (!params.clubId || row.clubId === Number(params.clubId)),
            );
      return {
        items: clone(
          rows.slice((params.page - 1) * params.pageSize, params.page * params.pageSize),
        ),
        total: rows.length,
      };
    },
    getById: getReport,
    file: { download, preview: async () => pdf() },
    attachments: { download },
  },
  clubs: {
    list: async () => [
      { id: 1, name: 'CLB Công nghệ', isActive: true },
      { id: 2, name: 'CLB Nghệ thuật', isActive: true },
    ],
    disbandRequests: lifecycle('disband'),
    transferRequests: lifecycle('transfer'),
    applications: { list: async () => ({ items: [], totalItems: 0 }) },
    categories: { list: async () => [] },
  },
  users: {
    list: async () => ({ items: [{ ...user, roles: ['CLUB_MEMBER'] }], totalItems: 1 }),
    roles: async () => [],
    roleStats: async () => ({}),
  },
  roles: { stats: async () => ({}), list: async () => [] },
  deadlines: { list: async () => [] },
  studentAffairs: {
    declarations: { list: async () => ({ items: [], totalPages: 1 }) },
    benchmarks: { getActive: async () => null },
    quests: { list: async () => [] },
    anomalies: { list: async () => [] },
    ledger: { list: async () => [] },
    students: { radar: async () => ({}) },
    radar: { overview: async () => null },
  },
  admin: { health: { stats: async () => ({}) }, settings: { get: async () => ({}) } },
  async get(path) {
    if (path.startsWith('/api/contributions/'))
      return {
        contribution: {
          id: 'qa-contribution',
          userId: 3,
          title: 'Nguồn đóng góp kiểm thử',
          rawPoints: 50,
          status: 'APPROVED',
          sourceType: 'CLUB',
          semesterId: 'FALL2026',
        },
        decisions: [],
        ledgerEffects: [
          {
            id: 1,
            effectType: 'AWARD',
            deltaAmount: 50,
            policyVersion: 'qa-policy',
            formulaVersion: 'v1',
            recordedAt: '2026-10-18T04:00:00Z',
          },
        ],
      };
    return [];
  },
  notifications: { list: async () => [] },
  downloadBlob: download,
};
export default api;
