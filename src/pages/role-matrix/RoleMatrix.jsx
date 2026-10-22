import './RoleMatrix.css';
import { Check, ShieldCheck } from 'lucide-react';
import { ROLES } from '../../utils/format.js';
import { Panel } from '../../components/ui/index.js';
const permissions = [
  ['Xem trạng thái tài khoản', true, false, false],
  ['Tạo tài khoản CTSV', true, false, false],
  ['Cấu hình, vận hành và nhật ký hệ thống', true, false, false],
  ['Quản lý và xét duyệt hồ sơ CLB', false, true, false],
  ['Quản lý học kỳ, chính sách và đối soát', false, true, false],
  ['Tham gia hoạt động và xem hồ sơ cá nhân', false, false, true],
];
export function RoleMatrix() {
  return (
    <div className="role-matrix-info">
      <p>
        Role hệ thống chỉ gồm SYSTEM_ADMIN, STUDENT_AFFAIR và STUDENT. Admin và CTSV có không gian
        làm việc riêng, không kế thừa quyền của nhau.
      </p>
      <Panel
        title="Phạm vi của từng role"
        description="Admin chỉ tạo tài khoản CTSV và xem trạng thái trên trang Tài khoản. Các mục Cấu hình, Vận hành và Nhật ký được giữ riêng."
      >
        <div className="role-matrix-content-2">
          <table className="role-matrix-table">
            <thead>
              <tr>
                <th className="role-matrix-column">CHỨC NĂNG</th>
                {Object.entries(ROLES).map(([role, label]) => (
                  <th key={role} className="role-matrix-column-2">
                    {role}
                    <small className="role-matrix-role-label">{label}</small>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissions.map(([label, ...values]) => (
                <tr key={label}>
                  <td className="role-matrix-cell">{label}</td>
                  {values.map((enabled, index) => (
                    <td key={index} className="role-matrix-cell-2">
                      {enabled ? (
                        <Check size={18} className="role-matrix-check" aria-label="Có quyền" />
                      ) : (
                        <span className="role-matrix-text" aria-label="Không có quyền">
                          —
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <div className="role-matrix-content-3">
        <ShieldCheck size={17} />
        <span>
          Chủ nhiệm, phó chủ nhiệm, thủ quỹ và thành viên là quan hệ hoặc phân công tại từng CLB.
          Các chức năng tương ứng phải kiểm tra điều kiện của CLB; role STUDENT không tự cấp quyền
          quản lý CLB.
        </span>
      </div>
    </div>
  );
}
