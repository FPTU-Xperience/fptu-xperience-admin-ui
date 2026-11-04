import assert from 'node:assert/strict';
import test from 'node:test';
import { directoryStudent, studentInspectionView, studentRadarView } from '../src/services/student-profile-view.js';
test('profile modal reads authoritative radar contract and keeps zero-valued metrics', () => {
    const raw = { studentId: 7, isAuthoritative: true, radarAxes: [{ pillar: 'LEARNING', saturatedScore: 0 }], d: 0, j: 0, m: 1, eri: 0, profileTitle: 'Khởi đầu' };
    const view = studentRadarView(raw, 7);
    assert.deepEqual(view.chart, [{ name: 'LEARNING', value: 0 }]);
    assert.deepEqual(view.stats, { D: 0, J: 0, M: 1, ERI: 0 });
    assert.throws(() => studentRadarView(raw, 8));
    assert.throws(() => studentRadarView({ ...raw, isAuthoritative: false }, 7));
});
test('profile keeps known-empty membership distinct from an unavailable authority and validates identity/period', () => {
    const raw = { studentId: 7, semesterCode: 'FALL2026', fullName: 'Student', email: 'student@fpt.edu.vn', academicAvailability: 'AVAILABLE', studentCode: 'SE007', majorAvailability: 'NO_AUTHORITATIVE_SOURCE', major: 'fake-major', cohortAvailability: 'NO_AUTHORITATIVE_SOURCE', cohort: 'K99', membership: { availability: 'AVAILABLE', items: [] } };
    assert.deepEqual(studentInspectionView(raw, 7, 'FALL2026').clubs, []);
    assert.equal(studentInspectionView({ ...raw, membership: { availability: 'AUTHORITY_UNAVAILABLE', items: [] } }, 7, 'FALL2026').clubs, null);
    assert.equal(studentInspectionView(raw, 7, 'FALL2026').major, null);
    assert.equal(studentInspectionView(raw, 7, 'FALL2026').cohort, null);
    assert.throws(() => studentInspectionView(raw, 8, 'FALL2026'));
    assert.throws(() => studentInspectionView(raw, 7, 'SUMMER2026'));
    assert.equal(directoryStudent({ id: 7, username: 'not-a-student-code', clubIds: [], major: 'sample' }).clubMembershipAvailable, false);
    assert.equal(directoryStudent({ id: 7 }).clubIds, null);
});
