import { isCTSV } from '../utils/access.js';
import { createMockSemester } from './mock-data.js';
import { validateRosterDraft } from '../utils/roster-preview.js';
import { autofillXp, xpReportCurrent, xpSourceKey, xpTotal } from './xp-report.js';

export const ACTIVITY_STATES = {
  DRAFT: 'Kế hoạch',
  PLAN_REVIEW: 'Chờ duyệt kế hoạch',
  REVISION: 'Cần chỉnh sửa',
  REJECTED: 'Đã từ chối',
  APPROVED: 'Đã duyệt · chưa công bố',
  EXECUTING: 'Thực hiện',
  SETTLEMENT_REVIEW: 'Chờ quyết toán',
  COMPLETED: 'Hoàn tất mô phỏng',
  NOT_HELD: 'Không tổ chức',
};
export const ROLLOVER_STEPS = [
  'Kiểm tra danh sách',
  'Chuyển thành viên',
  'Xử lý lãnh đạo & hoạt động',
  'Khởi tạo số dư kỳ mới',
  'Đối soát',
];
export const canReviewMock = (user) => isCTSV(user);
export const mockScope = (state, semester) =>
  state.semesters[semester] || createMockSemester(semester);
const requireThat = (ok, message) => {
  if (!ok) throw new Error(message);
};
const positive = (value, label = 'Số điểm') => {
  const n = Number(value);
  requireThat(Number.isFinite(n) && n > 0, `${label} phải lớn hơn 0.`);
  return n;
};
const reasonFor = (command) => {
  const reason = String(command.reason || '').trim();
  requireThat(reason.length >= 5, 'Nhập lý do ít nhất 5 ký tự.');
  return reason;
};
const activeStudent = (scope, code) =>
  scope.roster.find((row) => row.studentCode === code && row.active);
export const effectiveRaw = (scope, activityId) =>
  scope.ledger
    .filter((row) => row.activityId === activityId)
    .reduce((sum, row) => sum + row.rawPoints, 0);
const log = (scope, command, text) =>
  scope.audit.unshift({
    id: command.id,
    at: command.at,
    actor: command.actor.fullName || command.actor.id,
    text,
  });
const step = (activity, command, text) => {
  activity.version++;
  activity.history.push({
    id: command.id,
    at: command.at,
    actor: command.simulatedActor || command.actor.fullName || command.actor.id,
    text,
  });
};

// A local simulator only: no imports from services/api, no real wallet conversion.
export function workflowReducer(previous, command) {
  try {
    requireThat(
      command.actor && String(command.actor.id) === previous.actorId,
      'Sai phạm vi tài khoản mô phỏng.',
    );
    requireThat(command.semester, 'Chọn học kỳ mô phỏng.');
    if (previous.receipts.includes(command.id)) return previous;
    const next = structuredClone(previous);
    const scope = (next.semesters[command.semester] ||= createMockSemester(command.semester));
    requireThat(
      !Object.entries(next.semesters).some(
        ([key, value]) =>
          key !== command.semester &&
          value.rollover?.target === command.semester &&
          ['RUNNING', 'FAILED'].includes(value.rollover.status),
      ),
      'Kỳ này đang là đích của tác vụ chuyển kỳ. Hoàn tất tác vụ nguồn trước.',
    );
    if (command.type === 'RESET') {
      next.semesters[command.semester] = createMockSemester(command.semester);
      next.result = { ok: true, message: 'Đã khôi phục dữ liệu JS của học kỳ mô phỏng.' };
      return next;
    }
    requireThat(
      canReviewMock(command.actor),
      'Chỉ CTSV được xử lý nghiệp vụ này. Admin chỉ xem khi chưa có vai trò CTSV.',
    );
    requireThat(
      !['RUNNING', 'FAILED'].includes(scope.rollover?.status) ||
        ['STEP_ROLLOVER', 'RETRY_ROLLOVER'].includes(command.type),
      'Kỳ nguồn đang có tác vụ chuyển kỳ. Hoàn tất hoặc đặt lại mô phỏng trước khi sửa dữ liệu.',
    );
    const activity = scope.activities.find((row) => row.id === command.activityId);
    if (command.activityId) {
      requireThat(activity, 'Không tìm thấy hồ sơ mô phỏng.');
      if (command.expectedVersion !== undefined)
        requireThat(
          activity.version === command.expectedVersion,
          'Hồ sơ đã thay đổi. Đọc lại trước khi xử lý.',
        );
    }
    switch (command.type) {
      case 'REGISTER_CLUB_SCENARIO': {
        requireThat(
          command.sourceClubId && command.name?.trim(),
          'Chưa có hồ sơ CLB để tạo mô phỏng.',
        );
        const id = `mock-club:${command.sourceClubId}`;
        requireThat(!scope.clubs.some((c) => c.id === id), 'Mô phỏng của CLB này đã tồn tại.');
        scope.clubs.push({
          id,
          sourceClubId: String(command.sourceClubId),
          name: `${command.name.trim()} · mô phỏng`,
          status: 'ACTIVE',
          leader: 'MOCK-SE001',
          vice: 'MOCK-SE002',
          members: ['MOCK-SE001', 'MOCK-SE002'],
          bonus: 0,
        });
        break;
      }
      case 'CREATE_ACTIVITY': {
        const title = String(command.title || '').trim();
        requireThat(title && command.actionTitle?.trim(), 'Nhập tên hoạt động và action.');
        const points = positive(command.points, 'Điểm mỗi action'),
          estimated = positive(command.estimated, 'Số lượt dự kiến');
        requireThat(
          Number.isSafeInteger(points * estimated),
          'Ngân sách mô phỏng phải là số nguyên trong phạm vi hợp lệ.',
        );
        requireThat(Number.isInteger(estimated), 'Số lượt phải là số nguyên.');
        if (!command.school)
          requireThat(
            scope.clubs.some((c) => c.id === command.clubId && c.status === 'ACTIVE'),
            'Chọn CLB mô phỏng đang hoạt động.',
          );
        const id = `mock-${command.id}`;
        scope.activities.push({
          id,
          title,
          semester: command.semester,
          school: !!command.school,
          clubId: command.school ? null : command.clubId,
          owner: command.school ? 'CTSV' : 'CLB',
          createdBy: command.school ? String(command.actor.id) : 'mock-club-author',
          state: command.school ? 'DRAFT' : 'PLAN_REVIEW',
          published: false,
          posted: false,
          version: 1,
          baseBudget: points * estimated,
          bonus: 0,
          deadline: command.deadline || '',
          narrative: command.narrative || '',
          actions: [
            {
              id: `${id}-action`,
              title: command.actionTitle.trim(),
              category: command.category || 'Kỹ năng',
              points,
              estimated,
            },
          ],
          awards: [],
          history: [
            {
              id: command.id,
              at: command.at,
              actor: command.school ? 'CTSV · mô phỏng' : 'CLB · mô phỏng',
              text: command.school
                ? 'Lập kế hoạch hoạt động cấp trường'
                : 'CLB gửi kế hoạch mô phỏng',
            },
          ],
        });
        break;
      }
      case 'REVIEW_PLAN':
        requireThat(
          !activity.school && activity.state === 'PLAN_REVIEW',
          'Hồ sơ chưa ở bước duyệt kế hoạch.',
        );
        requireThat(
          String(activity.createdBy) !== String(command.actor.id),
          'Không duyệt hồ sơ do chính mình tạo.',
        );
        requireThat(
          ['APPROVED', 'REVISION', 'REJECTED'].includes(command.decision),
          'Quyết định không hợp lệ.',
        );
        activity.state = command.decision;
        activity.reviewReason = reasonFor(command);
        step(activity, command, `${ACTIVITY_STATES[activity.state]}: ${activity.reviewReason}`);
        break;
      case 'RESUBMIT':
        requireThat(activity.state === 'REVISION', 'Hồ sơ chưa cần chỉnh sửa.');
        activity.narrative = reasonFor(command);
        activity.state = 'PLAN_REVIEW';
        step(
          activity,
          { ...command, simulatedActor: 'CLB · mô phỏng' },
          'CLB chỉnh sửa thuyết minh và gửi lại',
        );
        break;
      case 'PUBLISH':
        requireThat(
          activity.state === 'APPROVED' || (activity.school && activity.state === 'DRAFT'),
          'Cần duyệt kế hoạch trước khi công bố hoạt động CLB.',
        );
        requireThat(
          !activity.clubId ||
            scope.clubs.find((c) => c.id === activity.clubId)?.status === 'ACTIVE',
          'CLB đang tạm dừng.',
        );
        activity.published = true;
        activity.state = 'EXECUTING';
        step(
          activity,
          { ...command, simulatedActor: activity.school ? 'CTSV · mô phỏng' : 'CLB · mô phỏng' },
          'Công bố và bắt đầu thực hiện',
        );
        break;
      case 'SET_PUBLICATION':
        requireThat(activity.state === 'EXECUTING', 'Chỉ đổi công bố khi đang thực hiện.');
        activity.published = !activity.published;
        step(
          activity,
          command,
          activity.published ? 'Công bố lại hoạt động' : 'Tạm ẩn công bố hoạt động',
        );
        break;
      case 'ADD_ACTION': {
        requireThat(
          ['DRAFT', 'REVISION', 'PLAN_REVIEW'].includes(activity.state),
          'Chỉ thêm action trước khi duyệt kế hoạch.',
        );
        requireThat(command.title?.trim(), 'Nhập tên action.');
        const points = positive(command.points),
          estimated = positive(command.estimated, 'Số lượt dự kiến');
        requireThat(
          Number.isSafeInteger(estimated) && Number.isSafeInteger(points * estimated),
          'Ngân sách action không hợp lệ.',
        );
        activity.actions.push({
          id: `action-${command.id}`,
          title: command.title.trim(),
          category: command.category || 'Kỹ năng',
          points,
          estimated,
        });
        activity.baseBudget += points * estimated;
        step(activity, command, `Thêm action: ${command.title.trim()}`);
        break;
      }
      case 'AUTOFILL_XP': {
        requireThat(
          activity.state === 'EXECUTING' && activity.awards.length,
          'Cần minh chứng ở bước thực hiện để tự điền Xperience Point.',
        );
        const rows = autofillXp(activity);
        const old = activity.xpReport;
        activity.xpReport = {
          rows,
          sourceKey: xpSourceKey(activity),
          changes: [
            ...(old?.changes || []),
            ...rows
              .filter((row) => !old?.rows.some((r) => r.sourceId === row.sourceId))
              .map((row) => ({
                id: `${command.id}-${row.sourceId}`,
                sourceId: row.sourceId,
                studentCode: row.studentCode,
                actionId: row.actionId,
                before: null,
                after: structuredClone(row),
                reason: 'Tự điền từ minh chứng tham gia',
                actor: command.actor.fullName || command.actor.id,
                at: command.at,
              })),
          ],
          filledAt: command.at,
        };
        step(activity, command, 'Tự điền báo cáo Xperience Point từ minh chứng; giữ các dòng đã chỉnh sửa');
        break;
      }
      case 'EDIT_XP_ROW': {
        requireThat(
          activity.state === 'EXECUTING' && xpReportCurrent(activity),
          'Tự điền lại bảng Xperience Point hiện tại trước khi chỉnh sửa.',
        );
        const row = activity.xpReport.rows.find((r) => r.sourceId === command.sourceId);
        requireThat(
          row && activeStudent(scope, row.studentCode),
          'Không tìm thấy dòng Xperience Point hoặc sinh viên không đủ điều kiện.',
        );
        const reason = reasonFor(command),
          quantity = Number(command.quantity);
        requireThat(
          Number.isSafeInteger(quantity) && quantity >= 0,
          'Số lượt phải là số nguyên từ 0 trở lên.',
        );
        requireThat(command.evidence?.trim(), 'Nhập minh chứng cho dòng Xperience Point.');
        const rawPoints = row.points * quantity;
        requireThat(
          Number.isFinite(rawPoints) &&
            xpTotal(activity.xpReport.rows) - row.rawPoints + rawPoints <=
              activity.baseBudget + activity.bonus,
          'Bảng Xperience Point vượt ngân sách điểm thô.',
        );
        const before = structuredClone(row);
        Object.assign(row, { quantity, rawPoints, evidence: command.evidence.trim() });
        requireThat(JSON.stringify(before) !== JSON.stringify(row), 'Dòng Xperience Point chưa có thay đổi.');
        activity.xpReport.changes.push({
          id: command.id,
          sourceId: row.sourceId,
          studentCode: row.studentCode,
          actionId: row.actionId,
          before,
          after: structuredClone(row),
          reason,
          actor: command.actor.fullName || command.actor.id,
          at: command.at,
        });
        step(
          activity,
          command,
          `Chỉnh Xperience Point ${row.studentCode}: ${before.rawPoints} → ${rawPoints}; ${reason}`,
        );
        break;
      }
      case 'ADD_EVIDENCE': {
        requireThat(activity.state === 'EXECUTING', 'Chỉ ghi nhận tham gia khi đang thực hiện.');
        requireThat(
          activeStudent(scope, command.studentCode),
          'Sinh viên phải đang học trong roster mô phỏng.',
        );
        const rule = activity.actions.find((row) => row.id === command.actionId);
        requireThat(rule, 'Action không tồn tại.');
        const quantity = positive(command.quantity, 'Số lượt hoàn thành');
        requireThat(Number.isInteger(quantity), 'Số lượt phải là số nguyên.');
        requireThat(command.evidence?.trim(), 'Nhập minh chứng mô phỏng.');
        requireThat(
          !activity.awards.some(
            (row) => row.studentCode === command.studentCode && row.actionId === command.actionId,
          ),
          'Nguồn tham gia/action đã được ghi nhận, không tạo trùng.',
        );
        const cost = rule.points * quantity;
        requireThat(
          activity.awards.reduce((n, row) => n + row.rawPoints, 0) + cost <=
            activity.baseBudget + activity.bonus,
          'Vượt ngân sách điểm thô mô phỏng.',
        );
        activity.awards.push({
          id: `award-${command.id}`,
          studentCode: command.studentCode,
          actionId: rule.id,
          quantity,
          rawPoints: cost,
          evidence: command.evidence.trim(),
        });
        step(activity, command, 'Ghi minh chứng; điểm vẫn đang chờ, chưa ghi sổ');
        break;
      }
      case 'SUBMIT_CLOSING':
        requireThat(
          activity.state === 'EXECUTING' && activity.awards.length,
          'Cần có minh chứng tham gia trước khi gửi quyết toán.',
        );
        requireThat(
          xpReportCurrent(activity),
          'Tự điền và kiểm tra báo cáo Xperience Point trước khi chốt snapshot.',
        );
        requireThat(
          xpTotal(activity.xpReport.rows) <= activity.baseBudget + activity.bonus,
          'Bảng Xperience Point vượt ngân sách.',
        );
        requireThat(
          activity.xpReport.rows.every((row) => activeStudent(scope, row.studentCode)),
          'Có sinh viên không còn đủ điều kiện.',
        );
        activity.closingSnapshot = {
          ...structuredClone(activity.xpReport),
          summary: reasonFor(command),
          submittedAt: command.at,
          submittedBy: activity.school ? 'CTSV tổ chức · mô phỏng' : 'CLB · mô phỏng',
        };
        activity.state = 'SETTLEMENT_REVIEW';
        activity.closingVersion = activity.version + 1;
        step(
          activity,
          {
            ...command,
            simulatedActor: activity.school ? 'CTSV tổ chức · mô phỏng' : 'CLB · mô phỏng',
          },
          'Hệ thống chốt snapshot minh chứng và lập báo cáo kết thúc',
        );
        break;
      case 'RETURN_CLOSING':
        requireThat(
          activity.state === 'SETTLEMENT_REVIEW' && !activity.posted,
          'Hồ sơ chưa chờ quyết toán.',
        );
        activity.state = 'EXECUTING';
        step(activity, command, `Trả bổ sung: ${reasonFor(command)}`);
        break;
      case 'APPROVE_CLOSING':
        requireThat(
          activity.state === 'SETTLEMENT_REVIEW' && !activity.posted && activity.awards.length,
          'Quyết toán đã xử lý hoặc chưa đủ minh chứng.',
        );
        requireThat(
          String(activity.createdBy) !== String(command.actor.id) ||
            (activity.school && command.simulateIndependentReviewer === true),
          'Cần một CTSV độc lập xét duyệt hồ sơ kết thúc.',
        );
        reasonFor(command);
        requireThat(
          activity.closingSnapshot && xpReportCurrent(activity),
          'Báo cáo thiếu snapshot Xperience Point hợp lệ. Trả về để tự điền và nộp lại.',
        );
        for (const award of activity.closingSnapshot.rows) {
          requireThat(
            activeStudent(scope, award.studentCode),
            'Roster đã thay đổi; có sinh viên không còn đủ điều kiện.',
          );
          requireThat(
            !scope.ledger.some((row) => row.sourceId === award.sourceId && row.kind === 'AWARD'),
            'Nguồn điểm đã được ghi sổ.',
          );
          scope.ledger.push({
            id: `ledger-${award.sourceId}`,
            activityId: activity.id,
            sourceId: award.sourceId,
            actionId: award.actionId,
            studentCode: award.studentCode,
            category: activity.actions.find((a) => a.id === award.actionId)?.category,
            rawPoints: award.rawPoints,
            kind: 'AWARD',
            at: command.at,
          });
        }
        activity.posted = true;
        activity.state = 'COMPLETED';
        activity.published = false;
        step(
          activity,
          {
            ...command,
            simulatedActor: command.simulateIndependentReviewer
              ? 'CTSV độc lập · mô phỏng'
              : undefined,
          },
          `Duyệt quyết toán và ghi sổ mô phỏng: ${command.reason}`,
        );
        break;
      case 'CANCEL_ACTIVITY':
        requireThat(
          ['DRAFT', 'PLAN_REVIEW', 'REVISION', 'APPROVED', 'EXECUTING'].includes(activity.state) &&
            !activity.posted,
          'Không thể hủy hồ sơ đã quyết toán hoặc đang chờ quyết toán.',
        );
        reasonFor(command);
        if (activity.bonus && activity.clubId) {
          scope.clubs.find((c) => c.id === activity.clubId).bonus += activity.bonus;
          scope.bonusTransactions.push({
            id: `refund-${activity.id}`,
            clubId: activity.clubId,
            activityId: activity.id,
            amount: activity.bonus,
            kind: 'REFUND',
            at: command.at,
          });
          activity.bonus = 0;
        }
        activity.state = 'NOT_HELD';
        activity.published = false;
        step(activity, command, `Không tổ chức: ${command.reason}`);
        break;
      case 'GRANT_BONUS': {
        const club = scope.clubs.find((c) => c.id === command.clubId);
        requireThat(club, 'Chọn CLB mô phỏng.');
        const amount = positive(command.amount);
        reasonFor(command);
        club.bonus += amount;
        scope.bonusTransactions.push({
          id: command.id,
          clubId: club.id,
          amount,
          kind: 'GRANT',
          reason: command.reason,
          at: command.at,
        });
        break;
      }
      case 'ALLOCATE_BONUS': {
        const club = scope.clubs.find((c) => c.id === command.clubId);
        const amount = positive(command.amount);
        reasonFor(command);
        requireThat(
          club &&
            activity &&
            activity.clubId === club.id &&
            ['APPROVED', 'EXECUTING'].includes(activity.state),
          'Chỉ phân bổ cho hoạt động CLB đã duyệt, chưa chốt quyết toán.',
        );
        requireThat(club.bonus >= amount, 'Số dư bonus không đủ.');
        club.bonus -= amount;
        activity.bonus += amount;
        scope.bonusTransactions.push({
          id: command.id,
          clubId: club.id,
          activityId: activity.id,
          amount: -amount,
          kind: 'ALLOCATE',
          reason: command.reason,
          at: command.at,
        });
        step(activity, command, `Bổ sung ${amount} điểm thô từ bonus CLB`);
        break;
      }
      case 'PREVIEW_ROSTER': {
        const rows = validateRosterDraft(command.rows || []);
        requireThat(rows.length && rows.length <= 10000, 'Cần từ 1 đến 10.000 dòng.');
        scope.rosterPreview = { rows, baseRevision: scope.revision + 1 };
        break;
      }
      case 'COMMIT_ROSTER':
        requireThat(
          scope.rosterPreview && scope.rosterPreview.baseRevision === scope.revision,
          'Bản xem trước đã cũ. Kiểm tra lại file.',
        );
        requireThat(
          !scope.rosterPreview.rows.some((r) => r.errors.length),
          'Sửa các dòng lỗi trước khi xác nhận.',
        );
        reasonFor(command);
        scope.roster = scope.rosterPreview.rows.map(({ studentCode, fullName, email }) => ({
          studentCode,
          fullName,
          email,
          active: true,
        }));
        scope.rosterImported = true;
        scope.rosterPreview = null;
        break;
      case 'NOMINATE': {
        const club = scope.clubs.find((c) => c.id === command.clubId);
        requireThat(club, 'Chọn CLB.');
        requireThat(
          !activeStudent(scope, club.leader),
          'Chủ nhiệm vẫn đủ điều kiện; dùng đơn chuyển chủ nhiệm thông thường.',
        );
        requireThat(
          activeStudent(scope, command.studentCode),
          'Ứng viên phải đang học, có thể chưa thuộc CLB.',
        );
        requireThat(
          !scope.nominations.some((n) => n.clubId === club.id && n.status === 'PENDING'),
          'Đã có đề cử chờ chấp nhận.',
        );
        reasonFor(command);
        scope.nominations.push({
          id: command.id,
          clubId: club.id,
          studentCode: command.studentCode,
          reason: command.reason,
          status: 'PENDING',
          at: command.at,
        });
        break;
      }
      case 'ACCEPT_NOMINATION': {
        const nomination = scope.nominations.find((n) => n.id === command.nominationId);
        requireThat(nomination?.status === 'PENDING', 'Đề cử đã xử lý hoặc không tồn tại.');
        requireThat(command.simulatedConsent === true, 'Cần bước người được đề cử chấp nhận.');
        requireThat(
          activeStudent(scope, nomination.studentCode),
          'Ứng viên không còn đủ điều kiện.',
        );
        const club = scope.clubs.find((c) => c.id === nomination.clubId);
        club.leader = nomination.studentCode;
        club.status = 'ACTIVE';
        if (!club.members.includes(nomination.studentCode))
          club.members.push(nomination.studentCode);
        nomination.status = 'ACCEPTED';
        break;
      }
      case 'DECLINE_NOMINATION': {
        const nomination = scope.nominations.find((n) => n.id === command.nominationId);
        requireThat(
          nomination?.status === 'PENDING' && command.simulatedConsent,
          'Đề cử không còn chờ ứng viên phản hồi.',
        );
        nomination.status = 'DECLINED';
        break;
      }
      case 'PREVIEW_ROLLOVER': {
        requireThat(
          command.target && command.target !== command.semester,
          'Chọn học kỳ đích khác kỳ nguồn.',
        );
        requireThat(
          !scope.rollover || !['RUNNING', 'COMPLETED'].includes(scope.rollover.status),
          'Tác vụ đang chạy hoặc đã hoàn tất.',
        );
        const target = next.semesters[command.target];
        requireThat(
          !target?.businessTouched && !target?.carriedFrom,
          'Kỳ đích đã có nghiệp vụ mô phỏng; không thể ghi đè. Chọn kỳ khác hoặc đặt lại kỳ đích.',
        );
        const rosterForTarget = target?.rosterImported
          ? target.roster
          : scope.roster.filter((r) => r.active);
        const activeAtTarget = (code) =>
          rosterForTarget.some((r) => r.studentCode === code && r.active);
        const officeChanges = scope.clubs.map((club) => ({
          clubId: club.id,
          before: club.leader,
          after: activeAtTarget(club.leader)
            ? club.leader
            : activeAtTarget(club.vice)
              ? club.vice
              : null,
        }));
        scope.rollover = {
          id: `rollover-${command.semester}-${command.target}`,
          target: command.target,
          status: 'PREVIEW',
          step: 0,
          sourceRevision: scope.revision + 1,
          targetRevision: target?.revision || 0,
          results: [],
          failAt: command.failAt ? 2 : null,
          failedOnce: false,
          activeCount: scope.roster.filter((r) => r.active).length,
          pausedClubs: officeChanges.filter((c) => !c.after).map((c) => c.clubId),
          officeChanges,
          targetImported: !!target?.rosterImported,
        };
        break;
      }
      case 'START_ROLLOVER':
        requireThat(
          scope.rollover?.status === 'PREVIEW' && scope.rollover.sourceRevision === scope.revision,
          'Xem trước lại vì dữ liệu nguồn đã thay đổi.',
        );
        requireThat(
          (next.semesters[scope.rollover.target]?.revision || 0) === scope.rollover.targetRevision,
          'Dữ liệu kỳ đích đã thay đổi. Xem trước lại.',
        );
        reasonFor(command);
        scope.rollover.status = 'RUNNING';
        break;
      case 'RETRY_ROLLOVER':
        requireThat(scope.rollover?.status === 'FAILED', 'Không có bước lỗi để thử lại.');
        scope.rollover.status = 'RUNNING';
        break;
      case 'STEP_ROLLOVER': {
        const job = scope.rollover;
        requireThat(job?.status === 'RUNNING', 'Tác vụ không đang chạy.');
        if (job.step === job.failAt && !job.failedOnce) {
          job.status = 'FAILED';
          job.failedOnce = true;
          job.error = 'Lỗi mô phỏng khi xử lý ngoại lệ; có thể thử lại.';
          break;
        }
        job.results.push({ step: job.step, title: ROLLOVER_STEPS[job.step], at: command.at });
        job.step++;
        if (job.step === ROLLOVER_STEPS.length) {
          requireThat(
            (next.semesters[job.target]?.revision || 0) === job.targetRevision,
            'Kỳ đích đã thay đổi; không ghi đè dữ liệu.',
          );
          const target = (next.semesters[job.target] ||= createMockSemester(job.target));
          if (!target.rosterImported)
            target.roster = scope.roster.filter((r) => r.active).map((r) => ({ ...r }));
          target.clubs = structuredClone(scope.clubs).map((club) => {
            const isActive = (code) =>
              target.roster.some((r) => r.studentCode === code && r.active);
            if (!isActive(club.leader)) {
              if (isActive(club.vice)) {
                club.leader = club.vice;
                club.vice = null;
                club.status = 'ACTIVE';
              } else club.status = 'PAUSED';
            }
            club.members = club.members.filter(isActive);
            club.officeHistory = [
              ...(club.officeHistory || []),
              {
                id: job.id,
                at: command.at,
                previousLeader: scope.clubs.find((c) => c.id === club.id)?.leader,
                leader: club.leader,
                status: club.status,
              },
            ];
            club.bonus = 0;
            return club;
          });
          target.activities = [];
          target.ledger = [];
          target.bonusTransactions = [];
          target.nominations = [];
          target.carriedFrom = command.semester;
          target.revision++;
          target.audit.push({
            id: job.id,
            text: `Khởi tạo kỳ mô phỏng từ ${command.semester}; giữ lịch sử kỳ nguồn`,
            actor: 'Tác vụ mô phỏng',
            at: command.at,
          });
          // Source records/history remain; only future activities of paused clubs become Not Held.
          for (const row of scope.activities.filter(
            (a) =>
              job.pausedClubs.includes(a.clubId) &&
              ['DRAFT', 'PLAN_REVIEW', 'REVISION', 'APPROVED', 'EXECUTING'].includes(a.state),
          )) {
            if (row.bonus) {
              scope.clubs.find((c) => c.id === row.clubId).bonus += row.bonus;
              scope.bonusTransactions.push({
                id: `refund-${row.id}`,
                clubId: row.clubId,
                activityId: row.id,
                amount: row.bonus,
                kind: 'REFUND',
                at: command.at,
              });
              row.bonus = 0;
            }
            row.state = 'NOT_HELD';
            row.published = false;
            step(row, command, 'Không tổ chức khi chuyển kỳ; hoàn bonus đúng một lần');
          }
          job.status = 'COMPLETED';
          job.error = null;
        }
        break;
      }
      case 'CORRECT_SOURCE': {
        if (command.expectedRevision !== undefined)
          requireThat(
            command.expectedRevision === scope.revision,
            'Nguồn đã thay đổi. Đọc lại kết quả trước khi quyết định.',
          );
        const source = scope.ledger.find(
          (row) => row.id === command.ledgerId && row.kind === 'AWARD',
        );
        requireThat(source, 'Chọn nguồn đã ghi sổ mô phỏng.');
        reasonFor(command);
        requireThat(
          ['KEEP', 'REVERSE', 'ADJUST'].includes(command.decision),
          'Chọn quyết định hợp lệ.',
        );
        const current = scope.ledger
          .filter((row) => row.sourceId === source.sourceId)
          .reduce((n, row) => n + row.rawPoints, 0);
        const desired =
          command.decision === 'KEEP'
            ? current
            : command.decision === 'REVERSE'
              ? 0
              : Number(command.amount);
        requireThat(
          Number.isFinite(desired) && desired >= 0,
          'Điểm thô sau điều chỉnh phải từ 0 trở lên.',
        );
        const record = scope.activities.find((a) => a.id === source.activityId);
        requireThat(
          effectiveRaw(scope, record.id) - current + desired <= record.baseBudget + record.bonus,
          'Điều chỉnh vượt ngân sách điểm thô.',
        );
        if (desired !== current)
          scope.ledger.push({
            ...source,
            id: `correction-${command.id}`,
            rawPoints: desired - current,
            kind: command.decision === 'REVERSE' ? 'REVERSAL' : 'ADJUSTMENT',
            originalId: source.id,
            reason: command.reason.trim(),
            actor: command.actor.fullName || command.actor.id,
            at: command.at,
          });
        scope.decisions.push({
          id: command.id,
          sourceId: source.sourceId,
          decision: command.decision,
          reason: command.reason,
          before: current,
          after: desired,
          at: command.at,
        });
        break;
      }
      default:
        throw new Error('Thao tác mô phỏng không được hỗ trợ.');
    }
    if (!['PREVIEW_ROSTER', 'COMMIT_ROSTER', 'PREVIEW_ROLLOVER'].includes(command.type))
      scope.businessTouched = true;
    scope.revision++;
    log(scope, command, `${command.type} · chỉ dữ liệu mô phỏng`);
    next.receipts.push(command.id);
    next.result = { ok: true, message: 'Đã cập nhật dữ liệu mô phỏng trong phiên này.' };
    return next;
  } catch (error) {
    return { ...previous, result: { ok: false, message: error.message } };
  }
}
