// Adapt only fields already displayed by the monitoring profile modal.
export function studentInspectionView(raw, userId, semester) {
    if (String(raw?.studentId) !== String(userId) || (semester && raw.semesterCode !== semester) ||
        typeof raw.fullName !== 'string' || typeof raw.email !== 'string' ||
        !['AVAILABLE', 'AUTHORITY_UNAVAILABLE'].includes(raw.membership?.availability) ||
        !Array.isArray(raw.membership.items) || raw.membership.items.some((row) => !Number.isSafeInteger(row.clubId) || row.clubId < 1 || typeof row.name !== 'string') ||
        new Set(raw.membership.items.map((row) => row.clubId)).size !== raw.membership.items.length)
        throw new Error('Hồ sơ trả về không khớp sinh viên hoặc học kỳ đang chọn.');
    return {
        fullName: raw.fullName, email: raw.email,
        studentCode: raw.academicAvailability === 'AVAILABLE' ? raw.studentCode : null,
        major: raw.majorAvailability === 'AVAILABLE' ? raw.major : null,
        cohort: raw.cohortAvailability === 'AVAILABLE' ? raw.cohort : null,
        clubs: raw.membership.availability === 'AVAILABLE' ? raw.membership.items : null,
    };
}

export function directoryStudent(raw) {
    return {
        id: String(raw.id), fullName: raw.fullName || '', email: raw.email || '',
        username: raw.username || '', major: '', cohort: '', clubIds: null, clubMembershipAvailable: false,
    };
}

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
