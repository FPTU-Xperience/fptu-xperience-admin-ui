export const isAdmin = (user) =>
  Array.isArray(user?.roles) && user.roles.some((role) => ['ADMIN', 'SYSTEM_ADMIN'].includes(role));
export const isCTSV = (user) =>
  Array.isArray(user?.roles) && user.roles.includes('STUDENT_AFFAIRS_ADMIN');
export const isAdminUser = (user) => isAdmin(user) || isCTSV(user);

export const defaultPathFor = (user) => (isAdmin(user) ? '/admin/accounts' : '/ctsv/overview');
export const canAccessPath = (user, path) =>
  path.startsWith('/admin/') ? isAdmin(user) : path.startsWith('/ctsv/') && isAdminUser(user);
export function workspaceRoleFor(user, pathname) {
  if (!isAdminUser(user)) return null;
  return isAdmin(user) && !pathname.startsWith('/ctsv/') ? 'ADMIN' : 'STUDENT_AFFAIRS_ADMIN';
}
