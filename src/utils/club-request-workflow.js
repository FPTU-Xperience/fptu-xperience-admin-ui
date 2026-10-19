export function clubRequestBody(row, adminNote) {
  if (String(row?.status).toUpperCase() !== 'PENDING')
    throw new Error('Hồ sơ không còn ở trạng thái chờ duyệt.');
  if (!adminNote.trim() || adminNote.length > 1000)
    throw new Error('Nhập nhận xét từ 1 đến 1.000 ký tự.');
  return { adminNote: adminNote.trim() };
}

export function clubRequestRows(value) {
  if (
    !Array.isArray(value) ||
    value.some((row) => !row.id || !row.clubId || typeof row.status !== 'string')
  )
    throw new Error('Không đọc được danh sách hồ sơ CLB. Vui lòng tải lại.');
  return value;
}
