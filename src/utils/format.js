export const ROLES = {
  ADMIN: 'Quản trị viên',
  STUDENT_AFFAIRS_ADMIN: 'Công tác sinh viên',
  CLUB_MANAGER: 'Chủ nhiệm CLB',
  CLUB_MEMBER: 'Sinh viên',
};
export const MAJORS = [
  'Kỹ thuật phần mềm',
  'Trí tuệ nhân tạo',
  'Quản trị kinh doanh',
  'Thiết kế đồ họa',
  'Ngôn ngữ Anh',
];
export const SEASONS = ['FALL2026', 'SUMMER2026'];
export const seasonLabel = (value) =>
  ({ FALL2026: 'Fall 2026', SUMMER2026: 'Summer 2026' })[value] || value;
export const number = (value) => new Intl.NumberFormat('vi-VN').format(value);
export const date = (value) =>
  new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short' }).format(new Date(value));
export const normalize = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
export const initials = (name) =>
  name
    .split(' ')
    .slice(-2)
    .map((part) => part[0])
    .join('');
