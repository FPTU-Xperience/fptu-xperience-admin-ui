import { ROLES } from './data.js';

export function validateAccount(input, accounts, excludingId) {
  const errors = [];
  if (!input.fullName?.trim() || input.fullName.trim().length < 2)
    errors.push('Họ tên phải có ít nhất 2 ký tự');
  if (!/^[A-Za-z0-9._-]{3,50}$/.test(input.username || ''))
    errors.push('Mã tài khoản cần 3–50 ký tự: chữ, số, dấu chấm, gạch nối hoặc gạch dưới');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email || '') || input.email.length > 254)
    errors.push('Email không hợp lệ');
  if (!Object.hasOwn(ROLES, input.role)) errors.push('Vai trò không hợp lệ');
  if (!['active', 'locked'].includes(input.status)) errors.push('Trạng thái không hợp lệ');
  const others =
    excludingId === undefined ? accounts : accounts.filter((a) => a.id !== excludingId);
  if (others.some((a) => a.email.toLowerCase() === input.email?.toLowerCase()))
    errors.push('Email đã tồn tại');
  if (others.some((a) => a.username.toLowerCase() === input.username?.toLowerCase()))
    errors.push('Mã tài khoản đã tồn tại');
  return errors;
}

export function guardAccountChanges(accounts, ids, actorId, replacement) {
  if (
    ids.includes(actorId) &&
    (!replacement || replacement.status !== 'active' || replacement.role !== 'ADMIN')
  )
    throw new Error('Không thể xóa, khóa hoặc đổi vai trò tài khoản đang sử dụng.');
  const next = accounts.filter((a) => !ids.includes(a.id));
  if (replacement) next.push(replacement);
  if (!next.some((a) => a.role === 'ADMIN' && a.status === 'active'))
    throw new Error('Cần giữ lại ít nhất một Admin đang hoạt động.');
}

export function validateImportRows(rows, accounts) {
  const seen = [...accounts];
  return rows.map(({ row, ...raw }) => {
    const account = {
      username: String(raw.username || '').trim(),
      fullName: String(raw.fullName || '').trim(),
      email: String(raw.email || '')
        .trim()
        .toLowerCase(),
      role: String(raw.role || '')
        .trim()
        .toUpperCase(),
      status: String(raw.status || 'active')
        .trim()
        .toLowerCase(),
    };
    const errors = validateAccount(account, seen);
    // Reserve all encountered keys, including invalid rows, so duplicates are never silently imported.
    seen.push(account);
    return { row, ...account, errors };
  });
}
