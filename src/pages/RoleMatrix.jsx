import { useEffect, useState } from 'react';
import { Check, ShieldCheck, Users } from 'lucide-react';
import api from '../services/api.js';
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
        const response = await api.users.list({ page: 1, pageSize: 500 });
        const users = Array.isArray(response) ? response : response?.items || [];

        const counts = {
          ADMIN: 0,
          STUDENT_AFFAIRS_ADMIN: 0,
          CLUB_MANAGER: 0,
          CLUB_MEMBER: 0,
        };

        users.forEach((user) => {
          const roles = Array.isArray(user.roles) ? user.roles : [user.role].filter(Boolean);
          if (roles.includes('ADMIN')) counts.ADMIN++;
          else if (roles.includes('SYSTEM_ADMIN')) counts.ADMIN++;
          else if (roles.includes('STUDENT_AFFAIRS_ADMIN')) counts.STUDENT_AFFAIRS_ADMIN++;
          else if (roles.includes('CLUB_MANAGER')) counts.CLUB_MANAGER++;
          else if (roles.includes('CLUB_MEMBER')) counts.CLUB_MEMBER++;
        });

        setRoleCounts(counts);
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left whitespace-nowrap">
            <thead>
              <tr>
                <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
                  CHỨC NĂNG
                </th>
                <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5] w-[80px] text-center">
                  ADMIN
                </th>
                <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5] w-[80px] text-center">
                  CTSV
                </th>
                <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5] w-[80px] text-center">
                  CHỦ NHIỆM
                </th>
                <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5] w-[80px] text-center">
                  SINH VIÊN
                </th>
              </tr>
            </thead>
            <tbody>
              {permissions.map(([label, ...values]) => (
                <tr key={String(label)}>
                  <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0 text-[11px] text-[#727b89]">
                    {label}
                  </td>
                  {values.map((enabled, i) => (
                    <td key={i} className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0 text-center">
                      {enabled ? (
                        <Check size={18} className="inline text-[#358b6c]" aria-label="Có quyền" />
                      ) : (
                        <span className="text-[#c5c9d0] text-[18px]" aria-label="Không có quyền">—</span>
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
      <div className="flex items-center gap-[8px] text-[11px] text-[#717d8d] my-[20px] leading-relaxed">
        <ShieldCheck size={17} />
        <span>Hai không gian Admin và CTSV được tách trong bản thiết kế. Quyền thực tế cần được kiểm tra tại backend khi tích hợp.</span>
      </div>
    </>
  );
}
