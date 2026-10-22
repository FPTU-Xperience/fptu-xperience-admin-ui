// Deliberately fictional JS fixtures. Never merged into API responses or persisted to storage.
import { autofillXp, xpSourceKey } from './xp-report.js';
export const MOCK_SEMESTERS = ['FALL2026', 'SPRING2027', 'SUMMER2027'];

export function createMockSemester(semester) {
  const roster = [
    {
      studentCode: 'MOCK-SE001',
      fullName: 'Nguyễn An · mẫu',
      email: 'an@example.test',
      active: true,
    },
    {
      studentCode: 'MOCK-SE002',
      fullName: 'Trần Bình · mẫu',
      email: 'binh@example.test',
      active: true,
    },
    {
      studentCode: 'MOCK-SE003',
      fullName: 'Lê Chi · mẫu',
      email: 'chi@example.test',
      active: true,
    },
    {
      studentCode: 'MOCK-SE004',
      fullName: 'Phạm Dũng · mẫu',
      email: 'dung@example.test',
      active: false,
    },
  ];
  const event = (id, title, state, clubId, school = false) => ({
    id,
    title,
    semester,
    state,
    clubId,
    school,
    owner: school ? 'CTSV' : 'CLB',
    createdBy: school ? 'mock-school-organizer' : 'mock-club-author',
    deadline: '2026-11-15',
    narrative: 'Hồ sơ minh họa quy trình, không phải hoạt động thật.',
    actions: [
      {
        id: `${id}-action`,
        title: 'Hoàn thành phần việc',
        category: 'Kỹ năng',
        points: 5,
        estimated: 8,
      },
    ],
    baseBudget: 40,
    bonus: 0,
    awards: [],
    posted: false,
    published: state === 'EXECUTING',
    version: 1,
    history: [
      {
        id: `${id}-created`,
        actor: 'Dữ liệu JS',
        text: 'Khởi tạo hồ sơ mô phỏng',
        at: '2026-10-20T02:00:00Z',
      },
    ],
  });
  const activities = [
    event('mock-plan', 'Workshop kỹ năng số · mẫu', 'PLAN_REVIEW', 'mock-tech'),
    event('mock-executing', 'Ngày hội cộng đồng · mẫu', 'EXECUTING', 'mock-tech'),
    event('mock-settlement', 'Thử thách sáng tạo · mẫu', 'SETTLEMENT_REVIEW', 'mock-art'),
    event('mock-school', 'Ngày hội trải nghiệm toàn trường · mẫu', 'DRAFT', null, true),
  ];
  activities[2].awards = [
    {
      id: 'mock-settlement-award',
      studentCode: 'MOCK-SE001',
      actionId: 'mock-settlement-action',
      quantity: 2,
      rawPoints: 10,
      evidence: 'Biên bản hoàn thành mô phỏng',
    },
  ];
  activities[2].xpReport = {
    rows: autofillXp(activities[2]),
    sourceKey: xpSourceKey(activities[2]),
    changes: [],
    filledAt: '2026-10-20T02:00:00Z',
  };
  activities[2].closingSnapshot = structuredClone(activities[2].xpReport);
  activities[2].closingVersion = 1;
  return {
    semester,
    revision: 1,
    roster,
    rosterImported: false,
    rosterPreview: null,
    clubs: [
      {
        id: 'mock-tech',
        name: 'CLB Công nghệ · mẫu',
        status: 'ACTIVE',
        leader: 'MOCK-SE001',
        vice: 'MOCK-SE002',
        members: ['MOCK-SE001', 'MOCK-SE002'],
        bonus: 30,
      },
      {
        id: 'mock-art',
        name: 'CLB Sáng tạo · mẫu',
        status: 'PAUSED',
        leader: 'MOCK-SE004',
        vice: null,
        members: ['MOCK-SE004'],
        bonus: 10,
      },
    ],
    activities,
    nominations: [],
    ledger: [],
    bonusTransactions: [],
    decisions: [],
    rollover: null,
    audit: [
      {
        id: 'mock-initial',
        text: 'Bộ dữ liệu JS cho các luồng chưa có backend',
        actor: 'Dữ liệu JS',
        at: '2026-10-20T02:00:00Z',
      },
    ],
  };
}

export function createWorkflowState(actorId) {
  return { actorId: String(actorId), semesters: {}, receipts: [], result: null };
}
