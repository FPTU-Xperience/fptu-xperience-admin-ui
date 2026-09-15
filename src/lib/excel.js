import { normalize } from './data.js';
import { validateImportRows } from './accounts.js';

async function workbook() {
  const module = await import('exceljs');
  return new module.default.Workbook();
}
const aliases = {
  username: ['username', 'ma tai khoan', 'ma sinh vien', 'mssv'],
  fullName: ['fullname', 'ho ten', 'ho va ten'],
  email: ['email'],
  role: ['role', 'vai tro'],
  status: ['status', 'trang thai'],
};
export const MAX_ROWS = 1000;
export async function readAccountWorkbook(file, accounts) {
  if (!/\.xlsx$/i.test(file.name))
    throw new Error('Vui lòng chọn file Excel .xlsx. Với file .xls, hãy lưu lại thành .xlsx.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Dung lượng file tối đa là 5 MB.');
  const book = await workbook();
  try {
    await book.xlsx.load(await file.arrayBuffer());
  } catch {
    throw new Error(
      'Không đọc được file Excel. File có thể bị hỏng hoặc đang được bảo vệ bằng mật khẩu.',
    );
  }
  const sheet = book.getWorksheet('TaiKhoan') || book.worksheets[0];
  if (!sheet || sheet.actualRowCount < 2) throw new Error('File chưa có dữ liệu tài khoản.');
  if (sheet.rowCount > MAX_ROWS + 1)
    throw new Error(`Mỗi lần nhập tối đa ${MAX_ROWS} dòng dữ liệu.`);
  const header = sheet.getRow(1);
  const columns = {};
  header.eachCell((cell, col) => {
    const field = Object.keys(aliases).find((key) =>
      aliases[key].includes(normalize(cell.text).replace(/[ _]+/g, ' ')),
    );
    if (field) {
      if (columns[field]) throw new Error(`Cột ${field} bị lặp trong tiêu đề.`);
      columns[field] = col;
    }
  });
  const missing = ['username', 'fullName', 'email', 'role'].filter((key) => !columns[key]);
  if (missing.length)
    throw new Error(
      `Thiếu cột bắt buộc: ${missing.join(', ')}. Hãy tải file mẫu để dùng đúng cấu trúc.`,
    );
  const rows = [];
  sheet.eachRow((row, index) => {
    if (index === 1) return;
    const record = { row: index };
    let formula = false;
    for (const [key, col] of Object.entries(columns)) {
      const cell = row.getCell(col);
      if (cell.formula || cell.value?.sharedFormula) formula = true;
      record[key] = cell.text.trim();
    }
    if (!Object.entries(record).some(([k, v]) => k !== 'row' && v)) return;
    rows.push({ ...record, formula });
  });
  if (!rows.length) throw new Error('File chưa có dữ liệu tài khoản.');
  return validateImportRows(rows, accounts).map((record, i) =>
    rows[i].formula
      ? { ...record, errors: [...record.errors, 'Hãy thay công thức bằng giá trị văn bản'] }
      : record,
  );
}

export async function createWorkbookBuffer(name, headers, rows) {
  const book = await workbook();
  book.creator = 'FPTU Xperience';
  const sheet = book.addWorksheet(name);
  sheet.addRow(headers);
  rows.forEach((row) => sheet.addRow(row));
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFED641C' } };
  sheet.getRow(1).height = 28;
  sheet.columns.forEach((col, i) => {
    col.width = Math.min(50, Math.max(20, headers[i].length + 5));
  });
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = { from: 'A1', to: { row: 1, column: headers.length } };
  return book.xlsx.writeBuffer();
}
export function downloadBuffer(buffer, filename) {
  const url = URL.createObjectURL(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function downloadAccountTemplate() {
  const buffer = await createWorkbookBuffer(
    'TaiKhoan',
    ['username', 'fullName', 'email', 'role', 'status'],
    [
      ['SE200001', 'Nguyễn Minh Anh', 'minhanh@example.edu.vn', 'CLUB_MEMBER', 'active'],
      ['CTSV003', 'Trần Thu Hà', 'thuha@example.edu.vn', 'STUDENT_AFFAIRS_ADMIN', 'active'],
      ['MANAGER009', 'Lê Quốc Bảo', 'quocbao@example.edu.vn', 'CLUB_MANAGER', 'active'],
    ],
  );
  downloadBuffer(buffer, 'FPTU_Mau_tai_khoan.xlsx');
}
