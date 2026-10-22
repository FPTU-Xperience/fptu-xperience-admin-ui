import './RoleMatrix.css';
import { useEffect, useState } from 'react';
import { Check, ShieldCheck, Users } from 'lucide-react';
import api from '../../services/api.js';
import VerificationAssignmentsPanel from '../../components/verification-assignments-panel/VerificationAssignmentsPanel.jsx';
import { ROLES } from '../../utils/format.js';
import { PageHeader, Panel, StatCard } from '../../components/ui/index.js';

const permissions = [
  ['Quản lý toàn bộ tài khoản', true, false, false, false],
  ['Nhập tài khoản từ Excel', true, false, false, false],
  ['Cấu hình tích hợp và nền tảng', true, false, false, false],
  ['Theo dõi nhật ký hệ thống', true, false, false, false],
  ['Quản lý danh mục và duyệt CLB', false, true, false, false],
  ['Cấu hình thang Xperience Point và học kỳ', false, true, false, false],
  ['Công bố nhiệm vụ toàn trường', false, true, false, false],
  ['Đối soát, điều chỉnh và thu hồi Xperience Point', false, true, false, false],
  ['Phân tích gắn kết toàn trường', false, true, false, false],
  ['Quản lý thành viên và sự kiện CLB', false, false, true, false],
  ['Xác thực đóng góp tại CLB', false, false, true, false],
  ['Tham gia và xem hồ sơ cá nhân', false, false, false, true],
];

export function RoleMatrix() {
  const [roleCounts, setRoleCounts] = useState({
    ADMIN: 0,
    STUDENT_AFFAIRS_ADMIN: 0,
    CLUB_MANAGER: 0,
    CLUB_MEMBER: 0,
  });
  const [loading, setLoading] = useState(true);

  // Fetch user counts by role
  useEffect(() => {
    async function fetchRoleCounts() {
      setLoading(true);
      try {
        const stats = await (api.roles?.stats ? api.roles.stats() : api.users.roleStats());
        if (stats) {
          setRoleCounts({
            ADMIN: stats.ADMIN ?? stats.admin ?? 0,
            STUDENT_AFFAIRS_ADMIN: stats.STUDENT_AFFAIRS_ADMIN ?? stats.studentAffairsAdmin ?? 0,
            CLUB_MANAGER: stats.CLUB_MANAGER ?? stats.clubManager ?? 0,
            CLUB_MEMBER: stats.CLUB_MEMBER ?? stats.clubMember ?? 0,
          });
        }
      } catch (err) {
        console.error('Failed to fetch role counts:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchRoleCounts();
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="ĐÚNG VAI TRÒ, ĐÚNG TRÁCH NHIỆM"
        title="Vai trò & phân quyền"
        description="Phạm vi trách nhiệm của bốn actor theo đặc tả chức năng."
      />

      {/* Stats Grid */}
      <div className="role-matrix-content">
        {Object.entries(ROLES).map(([key, label]) => (
          <StatCard
            key={key}
            label={label}
            value={loading ? '-' : roleCounts[key] || 0}
            note="tài khoản được gán vai trò"
            icon={key === 'ADMIN' ? ShieldCheck : Users}
            tone={key === 'ADMIN' ? 'purple' : key === 'STUDENT_AFFAIRS_ADMIN' ? 'orange' : 'blue'}
          />
        ))}
      </div>

      {/* Permission Table */}
      <Panel
        title="Ma trận quyền chức năng"
        description="Admin gán vai trò tại phần Quản lý tài khoản. Đây là ma trận thiết kế cho phiên bản hiện tại."
      >
        <div className="role-matrix-content-2">
          <table className="role-matrix-table">
            <thead>
              <tr>
                <th className="role-matrix-column">CHỨC NĂNG</th>
                <th className="role-matrix-column-2">ADMIN</th>
                <th className="role-matrix-column-2">CTSV</th>
                <th className="role-matrix-column-2">CHỦ NHIỆM</th>
                <th className="role-matrix-column-2">SINH VIÊN</th>
              </tr>
            </thead>
            <tbody>
              {permissions.map(([label, ...values]) => (
                <tr key={String(label)}>
                  <td className="role-matrix-cell">{label}</td>
                  {values.map((enabled, i) => (
                    <td key={i} className="role-matrix-cell-2">
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

      {/* Info Line */}
      <VerificationAssignmentsPanel />
      <div className="role-matrix-content-3">
        <ShieldCheck size={17} />
        <span>
          Hai không gian Admin và CTSV được tách trong bản thiết kế. Quyền thực tế cần được kiểm tra
          tại backend khi tích hợp.
        </span>
      </div>
    </>
  );
}
