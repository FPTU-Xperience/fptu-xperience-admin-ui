const codes = ['HAN', 'HCM', 'DAN', 'CAN', 'QNH'];
export function campusScope(value, actorId) {
  if (String(value?.actorId) !== String(actorId) || typeof value.canSelectCampus !== 'boolean' ||
      !Array.isArray(value.campuses) || !value.campuses.length || value.campuses.length > 5 ||
      value.campuses.some((item) => !codes.includes(item.code) || typeof item.name !== 'string' || !item.name) ||
      new Set(value.campuses.map((item) => item.code)).size !== value.campuses.length ||
      !value.canSelectCampus && (value.campuses.length !== 1 || value.campuses[0].code !== value.campusCode))
    throw new Error('Máy chủ chưa xác nhận phạm vi campus của tài khoản.');
  return value;
}
export function selectedCampus(scope, requested) {
  if (!scope) return '';
  if (!scope.canSelectCampus) return scope.campuses[0].code;
  const value = requested || scope.campusCode;
  return scope.campuses.some((item) => item.code === value) ? value : '';
}
