import { systemRolesFor } from './roles.js';
export const isAdmin = (user) => systemRolesFor(user).includes('SYSTEM_ADMIN');
export const isCTSV = (user) => systemRolesFor(user).includes('STUDENT_AFFAIR') && !isAdmin(user);
export const isAdminUser = (user) => isAdmin(user) || isCTSV(user);
export const defaultPathFor = (user) => (isAdmin(user) ? '/admin/accounts' : '/ctsv/work');
export const canAccessPath = (user, path) =>
  path.startsWith('/admin/') ? isAdmin(user) : path.startsWith('/ctsv/') && isCTSV(user);
export function workspaceRoleFor(user) {
  return isAdmin(user) ? 'SYSTEM_ADMIN' : isCTSV(user) ? 'STUDENT_AFFAIR' : null;
}
