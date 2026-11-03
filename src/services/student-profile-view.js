// Adapt only fields already displayed by the monitoring profile modal.
export function studentRadarView(raw, userId) {
    if (String(raw?.studentId) !== String(userId) || raw?.isAuthoritative !== true || !Array.isArray(raw.radarAxes))
        throw new Error('Máy chủ chưa trả hồ sơ trải nghiệm đã xác nhận cho sinh viên này.');
    return {
        chart: raw.radarAxes.map((axis) => ({ name: axis.pillar, value: axis.saturatedScore })),
        stats: { D: raw.d, J: raw.j, M: raw.m, ERI: raw.eri },
        title: raw.profileTitle || '',
        studentName: raw.studentName || '',
        studentEmail: raw.studentEmail || '',
    };
}
