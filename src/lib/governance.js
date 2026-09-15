export function validateRubric(rubric) {
  if (!rubric.criteria.length) throw new Error('Thang điểm cần ít nhất một tiêu chí.');
  const sum = rubric.criteria.reduce((total, c) => total + Number(c.weight), 0);
  if (Math.abs(sum - 100) > 0.001) throw new Error('Tổng trọng số các tiêu chí phải bằng 100%.');
  if (
    rubric.criteria.some(
      (c) =>
        !c.name.trim() ||
        !Number.isFinite(Number(c.xp)) ||
        Number(c.xp) <= 0 ||
        !Number.isFinite(Number(c.weight)) ||
        Number(c.weight) < 0,
    )
  )
    throw new Error('Nhập tên, XP dương và trọng số không âm cho từng tiêu chí.');
  if (!(Number(rubric.cap) > 0) || !(Number(rubric.scale) > 0))
    throw new Error('Ngưỡng chuẩn hóa và thang chỉ số phải lớn hơn 0.');
  if (!rubric.effective || Number.isNaN(Date.parse(rubric.effective)))
    throw new Error('Chọn ngày hiệu lực hợp lệ.');
}

export function resolveAnomaly(draft, caseId, decision, reason, adjustment, season, actor) {
  const item = draft.anomalies.find((a) => a.id === caseId);
  if (!item || item.status !== 'open') throw new Error('Trường hợp này đã được xử lý.');
  if (!reason?.trim() || reason.trim().length < 10)
    throw new Error('Nhập lý do xử lý ít nhất 10 ký tự.');
  if (!['keep', 'adjust', 'revoke'].includes(decision))
    throw new Error('Quyết định xử lý không hợp lệ.');
  const award = draft.ledger.find((e) => e.caseId === caseId && e.type === 'award');
  if (!award) throw new Error('Không tìm thấy bút toán gốc để đối soát.');
  if (
    decision === 'adjust' &&
    (!Number.isInteger(Number(adjustment)) ||
      Number(adjustment) < 0 ||
      Number(adjustment) >= award.amount)
  )
    throw new Error(`XP sau điều chỉnh phải là số nguyên từ 0 đến ${award.amount - 1}.`);
  // The original ledger entry is immutable. Only a linked reversing entry is appended.
  if (decision !== 'keep')
    draft.ledger.push({
      id: crypto.randomUUID(),
      studentId: award.studentId,
      amount: decision === 'revoke' ? -award.amount : Number(adjustment) - award.amount,
      source: award.source,
      rubricVersion: award.rubricVersion,
      caseId,
      originalId: award.id,
      season: award.season || 'FALL2026',
      type: 'correction',
      at: new Date().toISOString(),
      actor,
      reason: reason.trim(),
    });
  item.status = 'resolved';
  item.decision = decision;
  item.reason = reason.trim();
  item.resolvedAt = new Date().toISOString();
}
