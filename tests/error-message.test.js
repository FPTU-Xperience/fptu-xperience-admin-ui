import assert from 'node:assert/strict';
import test from 'node:test';
import { errorMessage } from '../src/services/error-message.js';
test('nested API errors render readable text instead of objects', () => {
    assert.equal(errorMessage({ error: { message: 'Không có quyền truy cập' } }), 'Không có quyền truy cập');
    assert.equal(errorMessage({ message: { code: 'DENIED' } }, 'Lỗi đăng nhập'), 'Lỗi đăng nhập');
    assert.equal(errorMessage('[object Object]', 'Lỗi đăng nhập'), 'Lỗi đăng nhập');
});
