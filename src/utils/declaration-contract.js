export function mapDeclaration(row) {
  const status = String(row.status || '')
    .replaceAll('_', '')
    .toUpperCase();
  return {
    ...row,
    status: { REVISIONREQUESTED: 'NEED_CLARIFICATION' }[status] || status,
    activityName: row.title || row.activityName,
    studentName: row.studentName || (row.userId ? `Sinh viên #${row.userId}` : ''),
    awardedScore: row.status?.toUpperCase() === 'APPROVED' ? row.rawPoints : null,
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
  if (!row.version)
    return {
      decision: decision === 'NEED_CLARIFICATION' ? 'REVISIONREQUESTED' : decision,
      reviewNote: reason,
    };
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
