import assert from 'node:assert/strict';
import test from 'node:test';
import { studentRadarView } from '../src/services/student-profile-view.js';
test('profile modal reads authoritative radar contract and keeps zero-valued metrics', () => {
    const raw = { studentId: 7, isAuthoritative: true, radarAxes: [{ pillar: 'LEARNING', saturatedScore: 0 }], d: 0, j: 0, m: 1, eri: 0, profileTitle: 'Khởi đầu' };
    const view = studentRadarView(raw, 7);
    assert.deepEqual(view.chart, [{ name: 'LEARNING', value: 0 }]);
    assert.deepEqual(view.stats, { D: 0, J: 0, M: 1, ERI: 0 });
    assert.throws(() => studentRadarView(raw, 8));
    assert.throws(() => studentRadarView({ ...raw, isAuthoritative: false }, 7));
});
