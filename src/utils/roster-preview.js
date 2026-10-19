// Local preparation only. The server import schema and identity reconciliation remain O-04.
export function validateRosterDraft(rows) {
  const codes = new Set(),
    emails = new Set();
  return rows.map((row, index) => {
    const studentCode = String(row.studentCode || '')
      .trim()
      .toUpperCase();
    const email = String(row.email || '')
      .trim()
      .toLowerCase();
    const fullName = String(row.fullName || '').trim();
    const errors = [];
    if (!studentCode) errors.push('Thiếu mã sinh viên');
    if (!fullName) errors.push('Thiếu họ tên');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Email không hợp lệ');
    if (studentCode && codes.has(studentCode)) errors.push('Trùng mã sinh viên trong file');
    if (email && emails.has(email)) errors.push('Trùng email trong file');
    if (studentCode) codes.add(studentCode);
    if (email) emails.add(email);
    return { row: index + 2, studentCode, fullName, email, errors };
  });
}

export async function readRosterDraft(file) {
  if (!/\.xlsx$/i.test(file.name) || file.size > 5 * 1024 * 1024)
    throw new Error('Chọn file .xlsx tối đa 5 MB.');
  const { default: ExcelJS } = await import('exceljs');
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(await file.arrayBuffer());
  const sheet = book.worksheets[0];
  if (!sheet || sheet.rowCount < 2 || sheet.rowCount > 10001)
    throw new Error('File cần từ 1 đến 10.000 dòng dữ liệu.');
  const columns = {};
  sheet.getRow(1).eachCell((cell, column) => {
    const key = cell.text.trim();
    if (['studentCode', 'fullName', 'email'].includes(key)) {
      if (columns[key]) throw new Error(`Trùng cột ${key}.`);
      columns[key] = column;
    }
  });
  if (['studentCode', 'fullName', 'email'].some((key) => !columns[key]))
    throw new Error('Bản nháp cần ba cột: studentCode, fullName, email.');
  const rows = [];
  for (let i = 2; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i);
    rows.push(
      Object.fromEntries(
        Object.entries(columns).map(([key, column]) => [key, row.getCell(column).text]),
      ),
    );
  }
  return validateRosterDraft(rows);
}
