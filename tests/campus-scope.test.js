import test from 'node:test';
import assert from 'node:assert/strict';
import { campusScope, selectedCampus } from '../src/services/campus-scope.js';
test('CTSV cannot use a foreign campus URL; admin chooses only server-projected campuses', () => {
  const value = { actorId: 9, campusCode: 'HAN', canSelectCampus: false, campuses: [{ code: 'HAN', name: 'Hà Nội' }] };
  assert.equal(selectedCampus(campusScope(value, 9), 'HCM'), 'HAN');
  assert.equal(selectedCampus(null, 'HAN'), '');
  assert.throws(() => campusScope(value, 10));
  assert.throws(() => campusScope({ ...value, campuses: [{ code: 'FAKE', name: 'Fake' }] }, 9));
  const admin = campusScope({ ...value, campusCode: 'GLOBAL', canSelectCampus: true, campuses: [...value.campuses, { code: 'HCM', name: 'Hồ Chí Minh' }] }, 9);
  assert.equal(selectedCampus(admin, ''), '');
  assert.equal(selectedCampus(admin, 'HCM'), 'HCM');
  assert.equal(selectedCampus(admin, 'INVALID'), '');
});
