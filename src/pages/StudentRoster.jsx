import { useEffect, useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import { readRosterDraft } from '../utils/roster-preview.js';
import { createWorkbookBuffer, downloadBuffer } from '../utils/excel.js';
import { Button, Field, PageHeader, Panel } from '../components/ui/index.js';
import { PageNavigation } from '../components/operations/OperationState.jsx';

export function StudentRoster() {
  const { user } = useAuth();
  const { season } = useWorkspace();
  const [rows, setRows] = useState(null),
    [page, setPage] = useState(1),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const input = useRef(null),
    ticket = useRef(0);
  useEffect(() => {
    ticket.current++;
    setRows(null);
    setError('');
    setPage(1);
    setBusy(false);
    if (input.current) input.current.value = '';
    return () => {
      ticket.current++;
    };
  }, [user?.id, season]);
  const upload = async (file) => {
    if (!file) return;
    const current = ++ticket.current;
    setBusy(true);
    setError('');
    setRows(null);
    setPage(1);
    try {
      const result = await readRosterDraft(file);
      if (current === ticket.current) setRows(result);
    } catch (issue) {
      if (current === ticket.current) setError(issue.message);
    } finally {
      if (current === ticket.current) setBusy(false);
    }
  };
  const template = async () => {
    try {
      downloadBuffer(
        await createWorkbookBuffer('DanhSachHocKy', ['studentCode', 'fullName', 'email'], []),
        'Ban_nhap_danh_sach_hoc_ky.xlsx',
      );
    } catch (issue) {
      setError(issue.message);
    }
  };
  return (
    <>
      <PageHeader
        title="Sinh viên theo học kỳ"
        description="Chuẩn bị danh sách sinh viên đang học để kiểm tra trước khi nhập chính thức."
      >
        <Button icon={Download} onClick={template}>
          Tải mẫu bản nháp
        </Button>
      </PageHeader>
      <div className="operation-notice mb-5" role="status">
        <h2>Nhập danh sách chính thức chưa khả dụng</h2>
        <p className="mt-2">
          Hiện chưa thể lưu hoặc đọc danh sách đang học, đối chiếu sinh viên mới/vắng mặt hay chuyển
          tiếp danh sách kỳ trước. Bản xem trước bên dưới chỉ kiểm tra file trên thiết bị, không tạo
          tài khoản và không thay đổi tình trạng học tập.
        </p>
      </div>
      <Panel title={`Chuẩn bị bản nháp${season ? ` · ${season}` : ''}`}>
        <div className="p-5 space-y-4">
          <Field
            label="File danh sách .xlsx"
            hint="Mẫu bản nháp gồm studentCode, fullName, email. Cấu trúc nhập chính thức sẽ được xác nhận trước khi mở chức năng lưu."
          >
            <input
              ref={input}
              type="file"
              accept=".xlsx"
              disabled={busy}
              onChange={(event) => upload(event.target.files[0])}
            />
          </Field>
          {busy && <p role="status">Đang kiểm tra file…</p>}
          {error && <p role="alert">{error}</p>}
          {rows && (
            <p role="status">
              {rows.length} dòng · {rows.filter((row) => row.errors.length).length} dòng cần sửa.
              Chưa đối chiếu với hồ sơ sinh viên trên hệ thống.
            </p>
          )}
        </div>
        {rows && (
          <>
            <div className="overflow-x-auto">
              <table className="operation-table">
                <thead>
                  <tr>
                    <th>Dòng</th>
                    <th>Mã sinh viên</th>
                    <th>Họ tên</th>
                    <th>Email</th>
                    <th>Kết quả kiểm tra</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice((page - 1) * 20, page * 20).map((row) => (
                    <tr key={row.row}>
                      <td>{row.row}</td>
                      <td>{row.studentCode || '—'}</td>
                      <td>{row.fullName || '—'}</td>
                      <td>{row.email || '—'}</td>
                      <td>{row.errors.join('; ') || 'Đủ trường dữ liệu bản nháp'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PageNavigation
              page={page}
              totalPages={Math.max(1, Math.ceil(rows.length / 20))}
              total={rows.length}
              onChange={setPage}
            />
          </>
        )}
        <div className="p-5 border-t border-border">
          <Button icon={Upload} disabled>
            Lưu danh sách học kỳ — chưa khả dụng
          </Button>
        </div>
      </Panel>
    </>
  );
}
