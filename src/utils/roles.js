// The three system roles. Club offices/memberships are separate domain data.
export const ROLE_IDS = Object.freeze({
  SYSTEM_ADMIN: 'SYSTEM_ADMIN',
  STUDENT_AFFAIR: 'STUDENT_AFFAIR',
  STUDENT: 'STUDENT',
});
export const ROLE_LABELS = Object.freeze({
  SYSTEM_ADMIN: 'Quản trị hệ thống',
  STUDENT_AFFAIR: 'Công tác sinh viên',
  STUDENT: 'Sinh viên',
});
// Read compatibility with the existing API only; never use club roles as staff permissions.
const legacyRoles = {
  ADMIN: 'SYSTEM_ADMIN',
  STUDENT_AFFAIRS_ADMIN: 'STUDENT_AFFAIR',
  CLUB_MEMBER: 'STUDENT',
  CLUB_MANAGER: 'STUDENT',
  TREASURER: 'STUDENT',
  CLUB_TREASURER: 'STUDENT',
};
export function normalizeSystemRole(role) {
  if (typeof role !== 'string') return null;
  return Object.hasOwn(ROLE_IDS, role)
    ? role
    : Object.hasOwn(legacyRoles, role)
      ? legacyRoles[role]
      : null;
}
export function systemRolesFor(user) {
  const values = Array.isArray(user?.roles)
    ? user.roles
    : typeof user?.role === 'string'
      ? [user.role]
      : [];
  return [...new Set(values.map(normalizeSystemRole).filter(Boolean))];
}
export function normalizeActor(user) {
  return user ? { ...user, roles: systemRolesFor(user) } : user;
}
