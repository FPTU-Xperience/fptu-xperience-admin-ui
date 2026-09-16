import { Check, ShieldCheck, Users } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import { ROLES } from '../utils/format.js';
import { PageHeader, Panel, StatCard } from '../components/ui/index.js';

const permissions = [
  ['Quản lý toàn bộ tài khoản', true, false, false, false],
  ['Nhập tài khoản từ Excel', true, false, false, false],
  ['Cấu hình tích hợp và nền tảng', true, false, false, false],
  ['Theo dõi nhật ký hệ thống', true, false, false, false],
  ['Quản lý danh mục và duyệt CLB', false, true, false, false],
  ['Cấu hình thang XP và học kỳ', false, true, false, false],
  ['Công bố nhiệm vụ toàn trường', false, true, false, false],
  ['Đối soát, điều chỉnh và thu hồi XP', false, true, false, false],
  ['Phân tích gắn kết toàn trường', false, true, false, false],
  ['Quản lý thành viên và sự kiện CLB', false, false, true, false],
  ['Xác thực đóng góp tại CLB', false, false, true, false],
  ['Tham gia và xem hồ sơ cá nhân', false, false, false, true],
];
export function RoleMatrix() {
  const { state } = useWorkspace();
  return (
    <>
      <PageHeader
        eyebrow="ĐÚNG VAI TRÒ, ĐÚNG TRÁCH NHIỆM"
        title="Vai trò & phân quyền"
        description="Phạm vi trách nhiệm của bốn actor theo đặc tả chức năng."
      />
      <div className="stats-grid">
        {Object.entries(ROLES).map(([key, label]) => (
          <StatCard
            key={key}
            label={label}
            value={state.accounts.filter((a) => a.role === key).length}
            note="tài khoản được gán vai trò"
            icon={key === 'ADMIN' ? ShieldCheck : Users}
            tone={key === 'ADMIN' ? 'purple' : key === 'STUDENT_AFFAIRS_ADMIN' ? 'orange' : 'blue'}
          />
        ))}
      </div>
      <Panel
        title="Ma trận quyền chức năng"
        description="Admin gán vai trò tại phần Quản lý tài khoản. Đây là ma trận thiết kế cho phiên bản hiện tại."
      >
        <div className="table-scroll">
          <table className="permission-table">
            <thead>
              <tr>
                <th>CHỨC NĂNG</th>
                <th>ADMIN</th>
                <th>CTSV</th>
                <th>CHỦ NHIỆM CLB</th>
                <th>SINH VIÊN</th>
              </tr>
            </thead>
            <tbody>
              {permissions.map(([label, ...values]) => (
                <tr key={label}>
                  <td>{label}</td>
                  {values.map((enabled, i) => (
                    <td key={i}>
                      {enabled ? (
                        <Check size={18} className="green-text" aria-label="Có quyền" />
                      ) : (
                        <span className="muted" aria-label="Không có quyền">
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
      <div className="info-line">
        <ShieldCheck size={17} />
        Hai không gian Admin và CTSV được tách trong bản thiết kế. Quyền thực tế cần được kiểm tra
        tại backend khi tích hợp.
      </div>
    </>
  );
}
