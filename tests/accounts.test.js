import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeed } from '../src/utils/seed.js';
import { guardAccountChanges, validateAccount, validateImportRows } from '../src/utils/accounts.js';

const valid = {
  username: 'SE999999',
  fullName: 'Sinh Viên Kiểm Thử',
  email: 'test@example.edu.vn',
  role: 'STUDENT',
  status: 'active',
};
test('accepts a valid account and the Student Affairs actor', () => {
  assert.deepEqual(validateAccount(valid, []), []);
  assert.deepEqual(validateAccount({ ...valid, role: 'STUDENT_AFFAIR' }, []), []);
});
test('rejects missing fields, invalid email, role and status', () => {
  assert.equal(
    validateAccount(
      { username: 'x', fullName: '', email: 'bad', role: 'ROOT', status: 'invalid' },
      [],
    ).length,
    5,
  );
});
test('detects case-insensitive email and username collisions', () => {
  assert.equal(
    validateAccount(
      { ...valid, email: valid.email.toUpperCase(), username: valid.username.toLowerCase() },
      [valid],
    ).length,
    2,
  );
});
test('mixed import preserves row errors and allows only valid rows', () => {
  const rows = validateImportRows(
    [
      { row: 2, ...valid },
      { row: 3, ...valid, username: 'SE123456' },
      { row: 4, ...valid, username: 'SE456789', email: 'wrong' },
    ],
    [],
  );
  assert.equal(rows.filter((r) => !r.errors.length).length, 1);
  assert.match(rows[1].errors.join(), /Email đã tồn tại/);
  assert.equal(rows[2].row, 4);
});
test('prevents own account deletion, locking and role changes', () => {
  const { accounts } = createSeed();
  assert.throws(() => guardAccountChanges(accounts, ['admin-self'], 'admin-self'), /đang sử dụng/);
  assert.throws(
    () =>
      guardAccountChanges(accounts, ['admin-self'], 'admin-self', {
        status: 'locked',
        role: 'SYSTEM_ADMIN',
      }),
    /đang sử dụng/,
  );
  assert.throws(
    () =>
      guardAccountChanges(accounts, ['admin-self'], 'admin-self', {
        status: 'active',
        role: 'STUDENT',
      }),
    /đang sử dụng/,
  );
});
test('prevents removing final active admin even in a batch', () => {
  const { accounts } = createSeed();
  assert.throws(
    () => guardAccountChanges(accounts, ['admin-self', 'admin-2'], 'some-other-actor'),
    /ít nhất một Admin/,
  );
  assert.doesNotThrow(() => guardAccountChanges(accounts, ['admin-2'], 'admin-self'));
});

test('creation validation accepts only the three new system role names', () => {
  for (const role of ['SYSTEM_ADMIN', 'STUDENT_AFFAIR', 'STUDENT'])
    assert.deepEqual(validateAccount({ ...valid, role }, []), []);
  for (const role of ['ADMIN', 'STUDENT_AFFAIRS_ADMIN', 'CLUB_MANAGER', 'CLUB_MEMBER', 'TREASURER'])
    assert.ok(validateAccount({ ...valid, role }, []).includes('Vai trò không hợp lệ'));
});
