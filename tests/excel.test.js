import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { createWorkbookBuffer, readAccountWorkbook } from '../src/utils/excel.js';

const headers = ['username', 'fullName', 'email', 'role', 'status'];
const record = ['SE999999', 'Sinh Viên Kiểm Thử', 'test@example.edu.vn', 'CLUB_MEMBER', 'active'];
function file(buffer, name = 'test.xlsx') {
  return { name, size: buffer.byteLength, arrayBuffer: async () => buffer };
}
test('real .xlsx buffer round trip preserves Vietnamese text and role', async () => {
  const buffer = await createWorkbookBuffer('TaiKhoan', headers, [record]);
  const rows = await readAccountWorkbook(file(buffer), []);
  assert.equal(rows[0].fullName, record[1]);
  assert.equal(rows[0].role, 'CLUB_MEMBER');
  assert.deepEqual(rows[0].errors, []);
});
test('rejects missing required header and empty workbooks', async () => {
  const buffer = await createWorkbookBuffer('TaiKhoan', ['email'], [['a@example.edu.vn']]);
  await assert.rejects(readAccountWorkbook(file(buffer), []), /Thiếu cột/);
  await assert.rejects(
    readAccountWorkbook(file(await createWorkbookBuffer('TaiKhoan', headers, [])), []),
    /chưa có dữ liệu/,
  );
});
test('rejects wrong type, oversized and corrupted files', async () => {
  await assert.rejects(readAccountWorkbook(file(new Uint8Array(), 'bad.xls'), []), /\.xlsx/);
  await assert.rejects(
    readAccountWorkbook({ name: 'test.xlsx', size: 6 * 1024 * 1024 }, []),
    /5 MB/,
  );
  await assert.rejects(
    readAccountWorkbook(file(new TextEncoder().encode('not xlsx')), []),
    /Không đọc được/,
  );
});
test('formula cells never become valid imported accounts', async () => {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet('TaiKhoan');
  sheet.addRow(headers);
  sheet.addRow(record);
  sheet.getCell('B2').value = { formula: '"Sinh Viên"', result: 'Sinh Viên' };
  const rows = await readAccountWorkbook(file(await book.xlsx.writeBuffer()), []);
  assert.match(rows[0].errors.join(), /công thức/);
});
test('rejects duplicate headers and more than 1000 input rows', async () => {
  await assert.rejects(
    readAccountWorkbook(
      file(await createWorkbookBuffer('TaiKhoan', [...headers, 'email'], [[...record, record[2]]])),
      [],
    ),
    /bị lặp/,
  );
  await assert.rejects(
    readAccountWorkbook(
      file(
        await createWorkbookBuffer(
          'TaiKhoan',
          headers,
          Array.from({ length: 1001 }, () => record),
        ),
      ),
      [],
    ),
    /1000/,
  );
});
test('accepts Vietnamese headers, defaults status, skips empty lines and catches stored duplicates', async () => {
  const buffer = await createWorkbookBuffer(
    'TaiKhoan',
    ['MSSV', 'Họ và tên', 'Email', 'Vai trò'],
    [
      record.slice(0, 4),
      [],
      ['SE888888', 'Nguyễn Văn An', 'NEW@example.edu.vn', 'STUDENT_AFFAIRS_ADMIN'],
    ],
  );
  const rows = await readAccountWorkbook(file(buffer), [{ email: record[2], username: record[0] }]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].errors.length, 2);
  assert.equal(rows[1].row, 4);
  assert.equal(rows[1].status, 'active');
  assert.deepEqual(rows[1].errors, []);
});
