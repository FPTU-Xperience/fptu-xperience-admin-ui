export function mapDeclaration(row) {
  const status = String(row.status || '')
    .replaceAll('_', '')
    .toUpperCase();
  return {
    ...row,
    canFinalReview:
      status === 'SUBMITTED' && row.isAuthoritative !== false && Boolean(row.version) && (row.capabilities?.canFinalReview ?? !row.referringClubId),
    referenceStateLabel: row.referringClubId
      ? row.clubReviewStatus === 'APPROVED' && row.ctsvSubmissionStatus === 'SUBMITTED'
        ? 'CLB đã thông qua và chuyển CTSV'
        : 'Chưa hoàn tất tham chiếu CLB'
      : 'Gửi trực tiếp',
    status: { REVISIONREQUESTED: 'NEED_CLARIFICATION' }[status] || status,
    activityName: row.title || row.activityName,
    studentName: row.studentName || (row.userId ? `Sinh viên #${row.userId}` : ''),
    awardedScore: row.status?.toUpperCase() === 'APPROVED' && row.isAuthoritative !== false && row.version ? row.rawPoints : null,
    referenceLabel: row.referringClubId
      ? `Tham chiếu CLB #${row.referringClubId}`
      : row.isOutsideClub === true || ['EXTERNAL', 'REAL_WORLD'].includes(row.sourceType)
        ? 'Gửi trực tiếp, không qua CLB'
        : 'Chưa có thông tin tham chiếu',
    capability:
      row.finalCategory ||
      row.category ||
      row.proposedAttributes?.pillarWeights?.map((item) => item.pillar).join(', '),
    evidenceUrls: row.evidenceUrl && /^https:\/\//i.test(row.evidenceUrl) ? [row.evidenceUrl] : [],
  };
}

export function declarationReview(row, decision, reason, attributes) {
  const decisions = {
    APPROVED: 'APPROVE',
    REJECTED: 'REJECT',
    NEED_CLARIFICATION: 'REQUEST_REVISION',
  };
  if (!row.version || row.isAuthoritative === false)
    throw new Error('Hồ sơ cũ cần được sinh viên bổ sung học kỳ và minh chứng riêng tư trước khi xét duyệt.');
  if (!decisions[decision]) throw new Error('Quyết định không hợp lệ.');
  if (decision === 'APPROVED' && !attributes)
    throw new Error('Xác minh thuộc tính đóng góp trước khi duyệt.');
  return {
    decision: decisions[decision],
    reason,
    expectedVersion: row.version,
    ...(decision === 'APPROVED' ? { verifiedAttributes: attributes } : {}),
  };
}
