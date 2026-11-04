const statuses = {
  Submitted: 'pending',
  NeedsRevision: 'revision',
  Approved: 'approved',
  Rejected: 'rejected',
};
export const formationStatusLabels = {
  pending: 'Chờ phê duyệt',
  revision: 'Cần bổ sung',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
};
export function mapFormationApplications(rows) {
  if (!Array.isArray(rows)) throw new Error('Danh sách đơn thành lập không hợp lệ.');
  return rows.map((app) => {
    if (!Number.isSafeInteger(app.id) || !statuses[app.status])
      throw new Error('Đơn thành lập có trạng thái không hợp lệ.');
    return {
      ...app,
      id: String(app.id),
      name: app.name,
      members: app.foundingMemberCount,
      applicant: app.requesterName,
      submitted: app.submittedAtUtc,
      purpose: app.purpose,
      plan: app.mainActivities,
      status: statuses[app.status],
      note: app.reviewNote || '',
    };
  });
}
export function formationReviewBody(review, note, managerId) {
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(review.version || ''))
    throw new Error('Máy chủ chưa trả phiên bản đơn. Tải lại trước khi xử lý.');
  if (note.trim().length < 5) throw new Error('Vui lòng nhập nhận xét ít nhất 5 ký tự.');
  if (managerId != null && (!Number.isSafeInteger(Number(managerId)) || Number(managerId) <= 0))
    throw new Error('Chọn tài khoản chủ nhiệm.');
  return {
    expectedVersion: review.version,
    note: note.trim(),
    ...(managerId != null ? { managerUserId: Number(managerId) } : {}),
  };
}
