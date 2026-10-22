import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkflowState } from '../src/workflows/mock-data.js';
import { effectiveRaw, mockScope, workflowReducer } from '../src/workflows/workflow-model.js';
import { loadWorkInbox, mockInbox } from '../src/workflows/work-inbox.js';
import {
  affairsNav,
  adminNav,
  featureTabs,
  legacyDestination,
  navigationItemFor,
} from '../src/routes/navigation.js';

const actor = { id: 'staff-1', fullName: 'CTSV kiểm thử', roles: ['STUDENT_AFFAIR'] };
let sequence = 0;
function simulator(initial = createWorkflowState(actor.id)) {
  let state = initial;
  return {
    get state() {
      return state;
    },
    get scope() {
      return mockScope(state, 'FALL2026');
    },
    run(type, fields = {}, ok = true) {
      state = workflowReducer(state, {
        id: `cmd-${++sequence}`,
        at: '2026-10-20T03:00:00Z',
        actor,
        semester: 'FALL2026',
        type,
        ...fields,
      });
      assert.equal(state.result.ok, ok, state.result.message);
      return state;
    },
  };
}

test('a club detail scenario preserves API identity only and keeps each club activity and bonus separate', () => {
  const s = simulator();
  s.run('REGISTER_CLUB_SCENARIO', { sourceClubId: '42', name: 'CLB A' });
  s.run('REGISTER_CLUB_SCENARIO', { sourceClubId: '43', name: 'CLB B' });
  const clubs = s.scope.clubs.filter((c) => c.sourceClubId);
  assert.equal(clubs.length, 2);
  assert.ok(clubs.every((c) => c.bonus === 0 && c.members.every((id) => id.startsWith('MOCK-'))));
  s.run('REGISTER_CLUB_SCENARIO', { sourceClubId: '42', name: 'CLB A' }, false);
  s.run('CREATE_ACTIVITY', {
    clubId: 'mock-club:42',
    title: 'Riêng CLB A',
    actionTitle: 'Phần việc',
    points: 5,
    estimated: 2,
  });
  const activity = s.scope.activities.at(-1);
  assert.equal(activity.clubId, 'mock-club:42');
  assert.ok(
    mockInbox(s.scope)
      .find((r) => r.id === activity.id)
      .path.startsWith('/ctsv/clubs/42?'),
  );
  s.run('GRANT_BONUS', { clubId: 'mock-club:42', amount: 10, reason: 'Cấp riêng CLB A' });
  assert.equal(s.scope.clubs.find((c) => c.id === 'mock-club:43').bonus, 0);
  assert.equal(s.scope.clubs.find((c) => c.id === 'mock-club:42').bonus, 10);
});

test('rollover cannot overwrite target business data or mutate a locked destination', () => {
  const s = simulator();
  s.run('GRANT_BONUS', {
    semester: 'SPRING2027',
    clubId: 'mock-tech',
    amount: 5,
    reason: 'Nghiệp vụ kỳ đích',
  });
  const snapshot = structuredClone(s.state.semesters.SPRING2027);
  s.run('PREVIEW_ROLLOVER', { target: 'SPRING2027' }, false);
  assert.deepEqual(s.state.semesters.SPRING2027, snapshot);
  s.run('RESET', { semester: 'SPRING2027' });
  s.run('PREVIEW_ROLLOVER', { target: 'SPRING2027' });
  s.run('START_ROLLOVER', { reason: 'Xác nhận chuyển kỳ' });
  s.run(
    'GRANT_BONUS',
    { semester: 'SPRING2027', clubId: 'mock-tech', amount: 5, reason: 'Không sửa kỳ đích' },
    false,
  );
  s.run('RESET', { semester: 'SPRING2027' }, false);
});

test('navigation has seven CTSV and four admin groups; old filters and links retain their owner', () => {
  assert.equal(affairsNav.length, 7);
  assert.equal(adminNav.length, 4);
  assert.equal(
    legacyDestination('/ctsv/club-requests', '?type=transfer&clubId=42'),
    '/ctsv/clubs?type=transfer&clubId=42&view=requests',
  );
  assert.equal(
    legacyDestination('/ctsv/activity-dossiers', '?record=mock-plan'),
    '/ctsv/activities?record=mock-plan&view=club&source=mock',
  );
  assert.equal(
    navigationItemFor('/ctsv/reports/42', { navigationOwner: 'clubs' }).path,
    '/ctsv/clubs',
  );
  assert.equal(navigationItemFor('/ctsv/reports/42').path, '/ctsv/activities');
  assert.equal(new Set(featureTabs.clubs.map((t) => t.id)).size, featureTabs.clubs.length);
});

test('first approval and publication never credit points; only closing approval posts sources once', () => {
  const s = simulator();
  s.run('REVIEW_PLAN', {
    activityId: 'mock-plan',
    decision: 'APPROVED',
    reason: 'Kế hoạch hợp lệ',
  });
  assert.equal(s.scope.ledger.length, 0);
  assert.equal(s.scope.activities[0].published, false);
  s.run('PUBLISH', { activityId: 'mock-plan' });
  s.run('ADD_EVIDENCE', {
    activityId: 'mock-plan',
    actionId: 'mock-plan-action',
    studentCode: 'MOCK-SE001',
    quantity: 2,
    evidence: 'Biên bản mẫu',
  });
  assert.equal(s.scope.ledger.length, 0);
  s.run(
    'ADD_EVIDENCE',
    {
      activityId: 'mock-plan',
      actionId: 'mock-plan-action',
      studentCode: 'MOCK-SE001',
      quantity: 2,
      evidence: 'Thử gửi trùng',
    },
    false,
  );
  s.run('AUTOFILL_XP', { activityId: 'mock-plan' });
  s.run('SUBMIT_CLOSING', { activityId: 'mock-plan', reason: 'Báo cáo kết thúc đầy đủ' });
  s.run('APPROVE_CLOSING', { activityId: 'mock-plan', reason: 'Đã kiểm tra minh chứng' });
  assert.equal(effectiveRaw(s.scope, 'mock-plan'), 10);
  assert.equal(s.scope.activities.find((a) => a.id === 'mock-plan').state, 'COMPLETED');
  s.run('APPROVE_CLOSING', { activityId: 'mock-plan', reason: 'Thử duyệt lại' }, false);
  assert.equal(s.scope.ledger.length, 1);
});

test('stale plan decisions, excess budget and inactive roster members are rejected without mutation', () => {
  const s = simulator();
  s.run(
    'REVIEW_PLAN',
    {
      activityId: 'mock-plan',
      expectedVersion: 999,
      decision: 'APPROVED',
      reason: 'Sai phiên bản',
    },
    false,
  );
  assert.equal(s.scope.activities[0].state, 'PLAN_REVIEW');
  s.run(
    'ADD_EVIDENCE',
    {
      activityId: 'mock-executing',
      actionId: 'mock-executing-action',
      studentCode: 'MOCK-SE004',
      quantity: 1,
      evidence: 'Không đủ điều kiện',
    },
    false,
  );
  s.run(
    'ADD_EVIDENCE',
    {
      activityId: 'mock-executing',
      actionId: 'mock-executing-action',
      studentCode: 'MOCK-SE001',
      quantity: 100,
      evidence: 'Vượt ngân sách',
    },
    false,
  );
  assert.equal(s.scope.activities.find((a) => a.id === 'mock-executing').awards.length, 0);
});

test('revision returns to first approval and settlement return never posts prematurely', () => {
  const s = simulator();
  s.run('REVIEW_PLAN', {
    activityId: 'mock-plan',
    decision: 'REVISION',
    reason: 'Bổ sung phương án nhân sự',
  });
  s.run('RESUBMIT', { activityId: 'mock-plan', reason: 'Đã bổ sung phương án' });
  assert.equal(s.scope.activities[0].state, 'PLAN_REVIEW');
  s.run('RETURN_CLOSING', { activityId: 'mock-settlement', reason: 'Bổ sung biên bản' });
  assert.equal(s.scope.activities.find((a) => a.id === 'mock-settlement').state, 'EXECUTING');
  assert.equal(s.scope.ledger.length, 0);
});

test('school organizer can publish directly, but closing requires an explicitly simulated independent reviewer', () => {
  const s = simulator();
  s.run('CREATE_ACTIVITY', {
    title: 'Hoạt động trường mẫu',
    school: true,
    actionTitle: 'Hoàn thành',
    points: 5,
    estimated: 4,
  });
  const activity = s.scope.activities.at(-1);
  s.run('PUBLISH', { activityId: activity.id });
  s.run('ADD_EVIDENCE', {
    activityId: activity.id,
    actionId: activity.actions[0].id,
    studentCode: 'MOCK-SE001',
    quantity: 1,
    evidence: 'Mẫu minh chứng',
  });
  s.run('AUTOFILL_XP', { activityId: activity.id });
  s.run('SUBMIT_CLOSING', { activityId: activity.id, reason: 'Báo cáo kết thúc trường' });
  s.run('APPROVE_CLOSING', { activityId: activity.id, reason: 'Người tổ chức tự duyệt' }, false);
  s.run('APPROVE_CLOSING', {
    activityId: activity.id,
    reason: 'Người duyệt độc lập',
    simulateIndependentReviewer: true,
  });
  assert.equal(effectiveRaw(s.scope, activity.id), 5);
});

test('bonus allocation only uses approved matching activities and cancellation refunds exactly once', () => {
  const s = simulator();
  s.run(
    'ALLOCATE_BONUS',
    { clubId: 'mock-tech', activityId: 'mock-plan', amount: 10, reason: 'Kế hoạch chưa duyệt' },
    false,
  );
  s.run('ALLOCATE_BONUS', {
    clubId: 'mock-tech',
    activityId: 'mock-executing',
    amount: 10,
    reason: 'Phân bổ mẫu',
  });
  assert.equal(s.scope.clubs[0].bonus, 20);
  s.run('CANCEL_ACTIVITY', { activityId: 'mock-executing', reason: 'Không đủ điều kiện tổ chức' });
  assert.equal(s.scope.clubs[0].bonus, 30);
  s.run('CANCEL_ACTIVITY', { activityId: 'mock-executing', reason: 'Thử hủy lại' }, false);
  assert.equal(s.scope.bonusTransactions.filter((t) => t.kind === 'REFUND').length, 1);
  s.run(
    'ALLOCATE_BONUS',
    { clubId: 'mock-tech', activityId: 'mock-plan', amount: 999, reason: 'Vượt số dư' },
    false,
  );
});

test('roster import requires a valid current preview and affects only its mock semester', () => {
  const s = simulator();
  s.run('PREVIEW_ROSTER', { rows: [{ studentCode: 'X', fullName: 'Mẫu', email: 'invalid' }] });
  s.run('COMMIT_ROSTER', { reason: 'Xác nhận dữ liệu' }, false);
  const rows = [{ studentCode: 'NEW-1', fullName: 'Sinh viên mẫu', email: 'new@example.test' }];
  s.run('PREVIEW_ROSTER', { rows });
  s.run('GRANT_BONUS', { clubId: 'mock-tech', amount: 1, reason: 'Thay đổi sau xem trước' });
  s.run('COMMIT_ROSTER', { reason: 'Bản xem trước đã cũ' }, false);
  s.run('PREVIEW_ROSTER', { rows });
  s.run('COMMIT_ROSTER', { reason: 'Xác nhận bản mới' });
  assert.deepEqual(
    s.scope.roster.map((r) => r.studentCode),
    ['NEW-1'],
  );
  assert.equal(mockScope(s.state, 'SPRING2027').roster.length, 4);
});

test('nomination does not grant membership or office until consent; declining preserves the paused club', () => {
  const s = simulator();
  s.run('NOMINATE', {
    clubId: 'mock-art',
    studentCode: 'MOCK-SE003',
    reason: 'Chọn người đủ điều kiện',
  });
  const n = s.scope.nominations[0];
  assert.equal(s.scope.clubs[1].leader, 'MOCK-SE004');
  assert.ok(!s.scope.clubs[1].members.includes('MOCK-SE003'));
  s.run('ACCEPT_NOMINATION', { nominationId: n.id }, false);
  s.run('DECLINE_NOMINATION', { nominationId: n.id, simulatedConsent: true });
  assert.equal(s.scope.clubs[1].status, 'PAUSED');
  s.run('NOMINATE', {
    clubId: 'mock-art',
    studentCode: 'MOCK-SE003',
    reason: 'Đề cử lại có cơ sở',
  });
  s.run('ACCEPT_NOMINATION', {
    nominationId: s.scope.nominations.at(-1).id,
    simulatedConsent: true,
  });
  assert.equal(s.scope.clubs[1].leader, 'MOCK-SE003');
  assert.equal(s.scope.clubs[1].status, 'ACTIVE');
  assert.ok(s.scope.clubs[1].members.includes('MOCK-SE003'));
});

test('rollover preview is non-destructive and invalidated by source or target changes', () => {
  const s = simulator();
  s.run('PREVIEW_ROLLOVER', { target: 'SPRING2027' });
  assert.equal(s.state.semesters.SPRING2027, undefined);
  s.run('GRANT_BONUS', { clubId: 'mock-tech', amount: 1, reason: 'Dữ liệu nguồn thay đổi' });
  s.run('START_ROLLOVER', { reason: 'Không được chạy snapshot cũ' }, false);
  s.run('PREVIEW_ROLLOVER', { target: 'SPRING2027' });
  s.run('PREVIEW_ROSTER', {
    semester: 'SPRING2027',
    rows: [{ studentCode: 'NEW', fullName: 'Mẫu', email: 'new@example.test' }],
  });
  s.run('START_ROLLOVER', { reason: 'Kỳ đích đã thay đổi' }, false);
});

test('rollover retries only the failed step, preserves source history and initializes the target once', () => {
  const s = simulator();
  s.run('APPROVE_CLOSING', {
    activityId: 'mock-settlement',
    reason: 'Kiểm tra nguồn trước chuyển kỳ',
  });
  s.run('PREVIEW_ROLLOVER', { target: 'SPRING2027', failAt: true });
  s.run('START_ROLLOVER', { reason: 'Xác nhận mô phỏng' });
  s.run(
    'GRANT_BONUS',
    { clubId: 'mock-tech', amount: 2, reason: 'Không sửa khi đang chuyển' },
    false,
  );
  s.run('STEP_ROLLOVER');
  s.run('STEP_ROLLOVER');
  s.run('STEP_ROLLOVER');
  assert.equal(s.scope.rollover.status, 'FAILED');
  assert.equal(s.scope.rollover.results.length, 2);
  s.run('RETRY_ROLLOVER');
  for (let i = 0; i < 3; i++) s.run('STEP_ROLLOVER');
  assert.equal(s.scope.rollover.status, 'COMPLETED');
  assert.equal(s.scope.rollover.results.length, 5);
  const target = s.state.semesters.SPRING2027;
  assert.equal(target.roster.length, 3);
  assert.equal(target.ledger.length, 0);
  assert.ok(target.clubs.every((c) => c.bonus === 0));
  assert.equal(s.scope.ledger.length, 1);
  assert.equal(s.scope.ledger[0].rawPoints, 10);
  s.run('START_ROLLOVER', { reason: 'Không chạy lại tác vụ đã xong' }, false);
  assert.equal(s.state.semesters.SPRING2027.revision, target.revision);
});

test('an imported target roster governs successor eligibility and is preserved during rollover', () => {
  const s = simulator();
  s.run('PREVIEW_ROSTER', {
    semester: 'SPRING2027',
    rows: [{ studentCode: 'MOCK-SE002', fullName: 'Phó chủ nhiệm', email: 'vice@example.test' }],
  });
  s.run('COMMIT_ROSTER', { semester: 'SPRING2027', reason: 'Giữ danh sách mới kỳ đích' });
  s.run('PREVIEW_ROLLOVER', { target: 'SPRING2027' });
  assert.equal(
    s.scope.rollover.officeChanges.find((c) => c.clubId === 'mock-tech').after,
    'MOCK-SE002',
  );
  s.run('START_ROLLOVER', { reason: 'Xác nhận nguồn và đích' });
  for (let i = 0; i < 5; i++) s.run('STEP_ROLLOVER');
  const target = s.state.semesters.SPRING2027;
  assert.equal(target.roster.length, 1);
  assert.equal(target.clubs[0].leader, 'MOCK-SE002');
  assert.ok(target.clubs[0].officeHistory.length);
});

test('corrections preserve originals, append only the delta and reject stale or over-budget changes', () => {
  const s = simulator();
  s.run('APPROVE_CLOSING', {
    activityId: 'mock-settlement',
    reason: 'Đủ minh chứng để quyết toán',
  });
  const original = structuredClone(s.scope.ledger[0]),
    revision = s.scope.revision;
  s.run('CORRECT_SOURCE', {
    ledgerId: original.id,
    decision: 'ADJUST',
    amount: 7,
    reason: 'Điều chỉnh theo nguồn',
    expectedRevision: revision,
  });
  assert.deepEqual(s.scope.ledger[0], original);
  assert.equal(s.scope.ledger[1].rawPoints, -3);
  s.run(
    'CORRECT_SOURCE',
    { ledgerId: original.id, decision: 'ADJUST', amount: 99, reason: 'Vượt ngân sách' },
    false,
  );
  s.run(
    'CORRECT_SOURCE',
    {
      ledgerId: original.id,
      decision: 'REVERSE',
      reason: 'Snapshot cũ',
      expectedRevision: revision,
    },
    false,
  );
  s.run('CORRECT_SOURCE', {
    ledgerId: original.id,
    decision: 'REVERSE',
    reason: 'Thu hồi nguồn không hợp lệ',
  });
  const count = s.scope.ledger.length;
  s.run('CORRECT_SOURCE', {
    ledgerId: original.id,
    decision: 'REVERSE',
    reason: 'Gửi lại cùng kết quả',
  });
  assert.equal(s.scope.ledger.length, count);
  assert.equal(effectiveRaw(s.scope, 'mock-settlement'), 0);
});

test('actor isolation, role checks and command receipts prevent cross-account or duplicate effects', () => {
  const s = simulator();
  s.run('GRANT_BONUS', {
    id: 'stable-command',
    clubId: 'mock-tech',
    amount: 5,
    reason: 'Cấp một lần',
  });
  s.run('GRANT_BONUS', {
    id: 'stable-command',
    clubId: 'mock-tech',
    amount: 5,
    reason: 'Gửi lại một lần',
  });
  assert.equal(s.scope.clubs[0].bonus, 35);
  s.run(
    'GRANT_BONUS',
    { actor: { ...actor, id: 'another' }, clubId: 'mock-tech', amount: 5, reason: 'Sai tài khoản' },
    false,
  );
  s.run(
    'GRANT_BONUS',
    {
      actor: { ...actor, roles: ['SYSTEM_ADMIN'] },
      clubId: 'mock-tech',
      amount: 5,
      reason: 'Admin chưa có CTSV',
    },
    false,
  );
  assert.equal(s.scope.clubs[0].bonus, 35);
  assert.equal(createWorkflowState('another').semesters.FALL2026, undefined);
});

test('the work inbox preserves source failures and never turns an API error into a mock API row', async () => {
  const missing = async () => {
    throw Error('API unavailable');
  };
  const client = {
    studentAffairs: {
      declarations: {
        list: async () => ({ items: [{ id: 1, status: 'Submitted', title: 'Hồ sơ cần CTSV' }] }),
      },
    },
    clubs: {
      applications: { list: missing },
      disbandRequests: { list: async () => [] },
      transferRequests: { list: async () => [] },
    },
  };
  const result = await loadWorkInbox(
    client,
    { list: missing },
    { bucket: 'actionable', semester: 'FALL2026' },
  );
  assert.equal(result.find((s) => s.id === 'reports').error, 'API unavailable');
  assert.equal(result.find((s) => s.id === 'reports').rows.length, 0);
  assert.equal(result.find((s) => s.id === 'declarations').rows[0].source, 'API');
  assert.equal(result.find((s) => s.id === 'declarations').rows[0].bucket, 'actionable');
  assert.ok(
    mockInbox(mockScope(createWorkflowState(actor.id), 'FALL2026')).every(
      (row) => row.source === 'MOCK',
    ),
  );
});

test('XP report autofill, revisions and settlement use the reviewed per-student/action snapshot', () => {
  const s = simulator();
  const id = 'mock-plan';
  const run = (type, fields = {}, ok = true) => s.run(type, { activityId: id, ...fields }, ok);
  const record = () => s.scope.activities.find((a) => a.id === id);
  run('ADD_ACTION', { title: 'Hỗ trợ tổ chức', category: 'Cộng đồng', points: 3, estimated: 4 });
  const actionId = record().actions[1].id;
  run('REVIEW_PLAN', { decision: 'APPROVED', reason: 'Duyệt hai action mẫu' });
  run('ADD_ACTION', { title: 'Sửa sau duyệt', points: 1, estimated: 1 }, false);
  run('PUBLISH');
  run('ADD_EVIDENCE', {
    actionId: record().actions[0].id,
    studentCode: 'MOCK-SE001',
    quantity: 2,
    evidence: 'Hai lượt hoàn thành',
  });
  run('SUBMIT_CLOSING', { reason: 'Thiếu bước tự điền' }, false);
  run('AUTOFILL_XP');
  const sourceId = record().xpReport.rows[0].sourceId;
  const version = record().version;
  run('EDIT_XP_ROW', {
    sourceId,
    quantity: 1,
    evidence: 'Chỉ xác minh một lượt',
    reason: 'Loại lượt chưa đủ minh chứng',
    expectedVersion: version,
  });
  assert.equal(record().awards[0].rawPoints, 10);
  assert.equal(record().xpReport.rows[0].rawPoints, 5);
  assert.equal(record().xpReport.changes.at(-1).before.rawPoints, 10);
  assert.equal(record().xpReport.changes.at(-1).after.rawPoints, 5);
  run(
    'EDIT_XP_ROW',
    {
      sourceId,
      quantity: 2,
      evidence: 'Nguồn mới',
      reason: 'Không dùng snapshot cũ',
      expectedVersion: version,
    },
    false,
  );
  run(
    'EDIT_XP_ROW',
    { sourceId, quantity: 99, evidence: 'Quá ngân sách', reason: 'Không cho vượt ngân sách' },
    false,
  );
  run(
    'EDIT_XP_ROW',
    { sourceId, quantity: 1.5, evidence: 'Lượt lẻ', reason: 'Không cho lượt lẻ' },
    false,
  );
  run('EDIT_XP_ROW', { sourceId, quantity: 1, evidence: 'Đổi nguồn', reason: '  ' }, false);
  run('ADD_EVIDENCE', {
    actionId,
    studentCode: 'MOCK-SE001',
    quantity: 2,
    evidence: 'Hai lượt hỗ trợ',
  });
  run('ADD_EVIDENCE', {
    actionId,
    studentCode: 'MOCK-SE002',
    quantity: 1,
    evidence: 'Một lượt hỗ trợ',
  });
  run('SUBMIT_CLOSING', { reason: 'Phải tự điền lại khi thêm nguồn' }, false);
  run('AUTOFILL_XP');
  assert.equal(record().xpReport.rows.length, 3);
  assert.equal(record().xpReport.rows[0].rawPoints, 5);
  const changes = record().xpReport.changes.length;
  run('AUTOFILL_XP');
  assert.equal(record().xpReport.changes.length, changes);
  run('SUBMIT_CLOSING', { reason: 'Báo cáo XP đã rà soát' });
  const snapshot = structuredClone(record().closingSnapshot);
  run(
    'EDIT_XP_ROW',
    { sourceId, quantity: 0, evidence: 'Sửa khi đã chốt', reason: 'Không được sửa snapshot' },
    false,
  );
  run('AUTOFILL_XP', {}, false);
  assert.deepEqual(record().closingSnapshot, snapshot);
  run('RETURN_CLOSING', { reason: 'Bổ sung thuyết minh cho một dòng' });
  run('EDIT_XP_ROW', {
    sourceId,
    quantity: 0,
    evidence: 'Không đủ điều kiện',
    reason: 'Loại phần điểm chưa xác minh',
  });
  run('SUBMIT_CLOSING', { reason: 'Bản báo cáo sau bổ sung' });
  run('APPROVE_CLOSING', { reason: 'Đủ cơ sở ghi sổ' });
  assert.equal(effectiveRaw(s.scope, id), 9);
  assert.equal(s.scope.ledger.find((r) => r.sourceId === sourceId).rawPoints, 0);
  assert.equal(s.scope.ledger.filter((r) => r.actionId === actionId).length, 2);
  run('APPROVE_CLOSING', { reason: 'Không ghi sổ hai lần' }, false);
  const original = structuredClone(record().closingSnapshot);
  const ledger = s.scope.ledger.find((r) => r.actionId === actionId);
  s.run('CORRECT_SOURCE', {
    ledgerId: ledger.id,
    decision: 'ADJUST',
    amount: 3,
    reason: 'Giảm theo kết quả đối soát',
  });
  assert.deepEqual(record().closingSnapshot, original);
  assert.equal(s.scope.ledger.at(-1).actionId, actionId);
  assert.equal(s.scope.ledger.at(-1).reason, 'Giảm theo kết quả đối soát');
  assert.equal(effectiveRaw(s.scope, id), 6);
});
