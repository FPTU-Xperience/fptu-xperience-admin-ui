export const REPORT_STATUSES = {
  Draft: 'Nháp',
  'Awaiting Finance': 'Chờ hồ sơ tài chính',
  Submitted: 'Chờ CLB chuyển tiếp',
  'Under Review': 'Chờ CTSV duyệt',
  Approved: 'Đã phê duyệt',
  Rejected: 'Yêu cầu chỉnh sửa / từ chối',
  Archived: 'Lưu trữ',
};

export const REPORT_TYPES = {
  FUTURE_EVENT: 'Đề xuất hoạt động',
  CLUB_ACTIVITY: 'Tổng kết hoạt động',
  CLUB_TERM_START: 'Đầu kỳ CLB',
  CLUB_TERM_END: 'Cuối kỳ CLB',
};

export function reportType(row) {
  return row.reportType || String(row.tag || '').split(':')[0] || 'OTHER';
}

export function reportTitle(row) {
  return row.details?.[0]?.activityName || REPORT_TYPES[reportType(row)] || `Báo cáo #${row.id}`;
}

export function reportPage(value, pageSize = 20) {
  if (
    !value ||
    !Array.isArray(value.items) ||
    !Number.isSafeInteger(value.total) ||
    value.total < 0
  )
    throw new Error('Danh sách báo cáo trả về chưa hợp lệ. Vui lòng tải lại.');
  return { ...value, totalPages: Math.max(1, Math.ceil(value.total / pageSize)) };
}

export function canDecideReport(user, report) {
  return Boolean(
    user?.roles?.includes('STUDENT_AFFAIRS_ADMIN') &&
    report?.status === 'Under Review' &&
    String(report.createdByUserId) !== String(user?.id),
  );
}

export function reportDecision(report, decision, feedback) {
  if (!['approve', 'reject'].includes(decision)) throw new Error('Quyết định không hợp lệ.');
  if (report?.status !== 'Under Review') throw new Error('Báo cáo chưa ở bước CTSV xét duyệt.');
  if (decision === 'reject' && !feedback.trim())
    throw new Error('Nhập lý do để CLB chỉnh sửa và gửi lại.');
  if (feedback.length > 2000) throw new Error('Nhận xét tối đa 2.000 ký tự.');
  return { feedback: feedback.trim() };
}

export function safeEvidenceUrl(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function reportStateMessage(report) {
  if (report?.status === 'Submitted')
    return 'Đang chờ người quản lý CLB kiểm tra và chuyển tiếp tới CTSV.';
  if (report?.status === 'Awaiting Finance')
    return 'CLB cần hoàn thiện hồ sơ tài chính trước khi chuyển xét duyệt.';
  if (report?.status === 'Draft') return 'CLB chưa nộp báo cáo này.';
  if (report?.status === 'Rejected')
    return 'CLB có thể chỉnh sửa theo phản hồi và nộp lại báo cáo.';
  return '';
}
