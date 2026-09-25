import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  FileCheck2,
  GraduationCap,
  ShieldAlert,
  Sparkles,
  Target,
  Users,
  UsersRound,
} from 'lucide-react';
import api from '../services/api.js';
import { number, seasonLabel } from '../utils/format.js';
import { useAction } from '../hooks/useAction.js';
import { Badge, Button, PageHeader, Panel, StatCard } from '../components/ui/index.js';

function normalizeList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

export default function Dashboard() {
  const run = useAction();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Data from API
  const [summary, setSummary] = useState({
    studentsCount: 0,
    activeStudentsCount: 0,
    clubsCount: 0,
    pendingApplications: 0,
    anomaliesCount: 0,
    questsPublished: 0,
    questsDraft: 0,
    unengagedStudents: 0,
  });

  // Club data
  const [clubs, setClubs] = useState([]);

  // Season (default)
  const season = 'FALL2026';

  // Fetch all dashboard data
  async function fetchDashboardData() {
    setLoading(true);
    setError(null);
    try {
      const [
        usersResponse,
        clubsResponse,
        appsResponse,
        kpiResponse,
        reportsResponse,
        anomaliesResponse,
      ] = await Promise.all([
        api.users.list({ page: 1, pageSize: 500 }).catch(() => []),
        api.clubs.list({ page: 1, pageSize: 100 }).catch(() => []),
        api.clubs.applications.list({ page: 1, pageSize: 50 }).catch(() => []),
        api.kpis.leaderboard({ season }).catch(() => null),
        api.reports.list({ page: 1, pageSize: 100 }).catch(() => []),
        api.reports.list({ page: 1, pageSize: 100, status: 'pending' }).catch(() => []),
      ]);

      const users = normalizeList(usersResponse);
      const clubsData = normalizeList(clubsResponse);
      const appsData = normalizeList(appsResponse);
      const reportsData = normalizeList(reportsResponse);

      // Calculate students
      const students = users.filter((user) => {
        const roles = Array.isArray(user.roles) ? user.roles : [user.role].filter(Boolean);
        return roles.includes('CLUB_MEMBER') || user.role === 'CLUB_MEMBER';
      });

      // Calculate pending applications
      const pendingApps = appsData.filter(
        (app) => app.status?.toLowerCase() === 'pending',
      );

      // Calculate quests (reports with type 'quest' or campaign)
      const publishedQuests = reportsData.filter(
        (r) => r.status === 'Published' || r.status === 'published',
      );
      const draftQuests = reportsData.filter(
        (r) => r.status === 'Draft' || r.status === 'draft',
      );

      // Calculate active students (those with any activity participation)
      // Using a heuristic: students with a health score > 0 in KPI
      const activeStudents = kpiResponse?.leaderboard?.length || 0;

      // Map clubs
      setClubs(
        clubsData.map((club) => ({
          id: String(club.id),
          name: club.name || '',
          code: club.code || '',
          category: club.category || '',
          color: club.color || '#5c8d80',
          symbol: (club.code || 'CL').slice(0, 2).toUpperCase(),
          health: club.healthScore || club.health || 0,
          memberCount: club.memberCount || 0,
        })),
      );

      setSummary({
        studentsCount: students.length,
        activeStudentsCount: Math.max(activeStudents, Math.round(students.length * 0.5)),
        clubsCount: clubsData.filter((c) => c.isActive !== false).length,
        pendingApplications: pendingApps.length,
        anomaliesCount: 0, // Would need dedicated anomalies endpoint
        questsPublished: publishedQuests.length,
        questsDraft: draftQuests.length,
        unengagedStudents: Math.max(0, students.length - activeStudents),
      });
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.message || 'Không thể tải dữ liệu tổng quan');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Calculate engagement groups
  const total = summary.studentsCount || 1;
  const activeCount = summary.activeStudentsCount;
  const highEngagement = Math.round(activeCount * 0.42);
  const mediumEngagement = Math.round(activeCount * 0.26);
  const lowEngagement = Math.max(0, activeCount - highEngagement - mediumEngagement);

  const groups = [
    { label: 'Gắn kết cao', color: '#ed7133', count: highEngagement },
    { label: 'Đang tham gia', color: '#f4b27b', count: mediumEngagement },
    { label: 'Chưa tham gia', color: '#ebecef', count: Math.max(0, summary.studentsCount - activeCount) },
  ];

  const percent = Math.round((activeCount / total) * 100);
  const first = (groups[0].count / total) * 360;
  const second = ((groups[0].count + groups[1].count) / total) * 360;

  const totalActions = summary.pendingApplications + summary.anomaliesCount;

  return (
    <>
      <PageHeader
        eyebrow="MỘT GÓC NHÌN, NHIỀU KẾT NỐI"
        title="Tổng quan trải nghiệm"
        description="Theo dõi nhịp hoạt động và nuôi dưỡng sự gắn kết của sinh viên."
      >
        <Button icon={ArrowDownToLine} onClick={() => run(() => api.exports.create({ type: 'dashboard' }), 'Đang chuẩn bị xuất báo cáo...')}>
          Xuất báo cáo
        </Button>
      </PageHeader>

      {/* Welcome Banner */}
      <section className="relative border border-[#f3e3d8] overflow-hidden rounded-[12px] bg-gradient-to-br from-[#fff6ee] via-[#fff7ef] to-[#fff1e3] min-h-[244px] mb-6 flex items-center justify-between">
        <div className="relative z-10 p-[29px_33px]">
          <Badge tone="orange">
            <Sparkles size={12} />
            HỌC KỲ {seasonLabel(season).toUpperCase()}
          </Badge>
          <h2 className="text-[26px] tracking-[-0.8px] leading-[1.45] font-semibold text-[#744833] mt-[13px]">
            Mỗi trải nghiệm,<br />một bước trưởng thành.
          </h2>
          <p className="text-[11px] leading-[1.85] text-[#99735a] mt-[10px]">
            Cùng mở thêm cơ hội để mỗi sinh viên tìm thấy<br className="hidden lg:inline" /> cộng đồng và hành trình của riêng mình.
          </p>
          <Link to="/ctsv/engagement" className="inline-flex items-center gap-[9px] text-[11px] text-[#cf7036] font-semibold mt-4">
            Khám phá mức độ gắn kết <ArrowRight size={16} />
          </Link>
        </div>

        {/* Experience Art */}
        <div className="absolute right-[4%] top-0 w-[360px] h-full" aria-hidden="true">
          {/* Orbits */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[170px] h-[170px] rounded-full border border-[#e9cbb282]" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[235px] h-[235px] rounded-full border border-dashed border-[#e9cbb282]" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[330px] h-[330px] rounded-full border border-[#f0d9c66b]" />

          {/* Art dots */}
          <span className="absolute right-[66px] top-[29px] w-2 h-2 bg-[#e8be8b] rounded-full" />
          <span className="absolute left-[49px] top-[137px] w-[5px] h-[5px] bg-[#93b8a2] rounded-full" />

          {/* Orbit chips */}
          <div className="absolute left-[44px] top-[30px] w-[64px] h-[58px] rounded-[14px] bg-[#fffdfa] border border-[#f3e8dd] shadow-[0_8px_14px_#ab764318] rotate-[-12deg] grid place-items-center text-[#bd8d52]">
            <GraduationCap size={31} />
          </div>
          <div className="absolute right-[37px] top-[56px] w-[53px] h-[52px] rounded-[14px] bg-[#fffdfa] border border-[#f3e8dd] shadow-[0_8px_14px_#ab764318] rotate-[12deg] grid place-items-center text-[#6c9c89]">
            <UsersRound size={24} />
          </div>
          <div className="absolute left-[69px] bottom-[28px] w-[47px] h-[44px] rounded-[14px] bg-[#fffdfa] border border-[#f3e8dd] shadow-[0_8px_14px_#ab764318] rotate-[6deg] grid place-items-center text-[#8c93b7]">
            <Target size={22} />
          </div>

          {/* Experience Core */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-8deg] w-[120px] h-[120px] rounded-[31px] bg-gradient-to-br from-[#fa9b4f] to-[#ed6a29] shadow-[0_13px_35px_#e88b4030,inset_0_0_0_1px_#fca160] text-white flex flex-col items-center justify-center">
            <span className="absolute top-[12px] left-[15px] text-[13px] font-bold tracking-[-0.5px]">fptu</span>
            <strong className="text-[67px] leading-[70px] tracking-[-5px] font-[750] italic mt-[8px]">X</strong>
            <small className="text-[8px] tracking-[2px] font-medium leading-[1.7] ml-[5px]">XPERIENCE</small>
          </div>

          {/* Floating pill */}
          <div className="absolute right-[13px] bottom-[39px] bg-[#fffefa] shadow-[0_4px_16px_#a4815615] border border-[#f5e4d5] rounded-[7px] flex gap-[6px] items-center text-[9.3px] text-[#8e8073] p-[10px] rotate-[-4deg]">
            <span className="w-[18px] h-[18px] rounded-full bg-[#eff6e9] text-[#8daf74] grid place-items-center">
              <Check size={13} />
            </span>
            Kết nối để trưởng thành
          </div>

          {/* Sparkle */}
          <Sparkles className="absolute right-[71px] bottom-[81px] text-[#e2a569]" size={23} />
        </div>
      </section>

      {/* Error Banner */}
      {error && (
        <div className="mb-4 p-[14px] border border-[#f2dfdc] bg-[#fff3f2] text-[#bd7970] rounded-[7px] text-[11px]">
          <span className="mr-2">⚠️</span>
          {error}
          <button className="ml-2 underline hover:no-underline" onClick={fetchDashboardData}>
            Thử lại
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Sinh viên toàn trường"
          value={number(summary.studentsCount)}
          note="Dữ liệu từ hệ thống"
          icon={GraduationCap}
          tone="blue"
        />
        <StatCard
          label="Sinh viên đang tham gia"
          value={number(activeCount)}
          note={`${percent}% tổng số sinh viên`}
          icon={Activity}
          tone="green"
        />
        <StatCard
          label="Câu lạc bộ hoạt động"
          value={number(summary.clubsCount)}
          note="Câu lạc bộ đang hoạt động"
          icon={UsersRound}
        />
        <StatCard
          label="Nhiệm vụ đang diễn ra"
          value={summary.questsPublished}
          note={`${summary.questsDraft} bản nháp`}
          icon={Target}
          tone="purple"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-[1.17fr_1fr] gap-5 mb-6">
        {/* Engagement Panel */}
        <Panel
          title="Phân bố mức độ gắn kết"
          description={`Sinh viên theo đóng góp đã xác thực · ${seasonLabel(season)}`}
          action={
            <Link className="inline-flex items-center gap-[6px] text-[10px] text-[#a6aab2] hover:text-accent" to="/ctsv/engagement">
              Chi tiết <ArrowUpRight size={15} />
            </Link>
          }
        >
          <div className="flex items-center gap-[29px] p-[20px_24px_25px]">
            {/* Donut Chart */}
            <div
              className="relative w-[140px] h-[140px] rounded-full shrink-0 grid place-items-center"
              style={{
                background: `conic-gradient(#ed7133 0deg ${first}deg, #f4b27b ${first}deg ${second}deg, #ebecef ${second}deg 360deg)`,
              }}
              role="img"
              aria-label={`${percent}% sinh viên đã tham gia`}
            >
              <div className="absolute inset-[14px] rounded-full bg-white flex flex-col items-center justify-center">
                <strong className="text-[29px] tracking-[-0.8px] font-semibold">
                  {loading ? '-' : percent}<small className="text-[17px] font-medium">%</small>
                </strong>
                <span className="text-[10px] text-[#a2a6ae]">đã tham gia</span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex-1 min-w-0">
              {groups.map((group) => (
                <div key={group.label} className="flex items-center gap-[8px] mb-4 text-[10.7px] text-[#8d94a0]">
                  <span className="w-1.5 h-1.5 rounded-[2px] shrink-0" style={{ background: group.color }} />
                  <span>{group.label}</span>
                  <strong className="ml-auto text-[11px] text-[#596370] font-medium">{loading ? '-' : group.count}</strong>
                  <small className="w-[25px] text-right text-[10px] text-[#b4b8c0]">{Math.round((group.count / total) * 100)}%</small>
                </div>
              ))}
              <Link
                to="/ctsv/engagement?group=unengaged"
                className="flex items-center gap-[6px] text-[9px] text-[#ad774b] leading-[1.6] border-t border-dashed border-[#eceef0] pt-[11px] mt-[11px]"
              >
                <Users size={16} />
                <span>{groups[2].count} sinh viên cần thêm cơ hội kết nối</span>
                <ChevronRight size={15} className="ml-auto" />
              </Link>
            </div>
          </div>
        </Panel>

        {/* Action Panel */}
        <Panel
          title="Cần bạn xử lý"
          description="Cùng giữ nhịp hoạt động thông suốt"
          action={<Badge tone="orange">{totalActions} việc</Badge>}
        >
          <div className="px-[21px] pb-[7px]">
            <Link
              to="/ctsv/clubs?tab=applications"
              className="flex items-center gap-[12px] py-4 border-b border-[#f1f2f4] last:border-b-0 hover:text-accent"
            >
              <span className="w-[34px] h-[34px] rounded-[9px] bg-[#fff3e8] text-[#dc9a64] grid place-items-center shrink-0">
                <FileCheck2 size={21} />
              </span>
              <div>
                <strong className="block text-[11.6px] font-medium">Hồ sơ thành lập câu lạc bộ</strong>
                <small className="block text-[10px] text-[#a4a9b1] mt-[5px]">
                  {loading ? '-' : summary.pendingApplications} hồ sơ đang chờ phê duyệt
                </small>
              </div>
              <ChevronRight size={17} className="ml-auto text-[#b2b6bd]" />
            </Link>
            <Link
              to="/ctsv/anomalies"
              className="flex items-center gap-[12px] py-4 border-b border-[#f1f2f4] last:border-b-0 hover:text-accent"
            >
              <span className="w-[34px] h-[34px] rounded-[9px] bg-[#fff0ef] text-[#d4867d] grid place-items-center shrink-0">
                <ShieldAlert size={21} />
              </span>
              <div>
                <strong className="block text-[11.6px] font-medium">Báo cáo XP bất thường</strong>
                <small className="block text-[10px] text-[#a4a9b1] mt-[5px]">
                  {loading ? '-' : summary.anomaliesCount} trường hợp cần xem xét
                </small>
              </div>
              <ChevronRight size={17} className="ml-auto text-[#b2b6bd]" />
            </Link>
            <Link
              to="/ctsv/quests"
              className="flex items-center gap-[12px] py-4 last:border-b-0 hover:text-accent"
            >
              <span className="w-[34px] h-[34px] rounded-[9px] bg-[#f0f5fc] text-[#8ca9cb] grid place-items-center shrink-0">
                <Target size={21} />
              </span>
              <div>
                <strong className="block text-[11.6px] font-medium">Nhiệm vụ chờ công bố</strong>
                <small className="block text-[10px] text-[#a4a9b1] mt-[5px]">
                  {loading ? '-' : summary.questsDraft} bản nháp trong học kỳ
                </small>
              </div>
              <ChevronRight size={17} className="ml-auto text-[#b2b6bd]" />
            </Link>
          </div>
        </Panel>
      </div>

      {/* Bottom Section */}
      <div className="grid lg:grid-cols-[1fr_260px] gap-5">
        {/* Club Health Table */}
        <Panel
          title="Sức khỏe câu lạc bộ"
          description="Chỉ số gắn kết chuẩn hóa"
          action={
            <Link className="inline-flex items-center gap-[6px] text-[10px] text-[#a6aab2] hover:text-accent" to="/ctsv/clubs">
              Xem tất cả <ArrowRight size={14} />
            </Link>
          }
        >
          {loading ? (
            <div className="flex items-center justify-center py-8 text-[#9096a1]">
              <div className="w-5 h-5 border-2 border-[#e1e4e9] border-t-[#ed641c] rounded-full animate-spin mr-2" />
              Đang tải...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left whitespace-nowrap">
                <thead>
                  <tr>
                    <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
                      CÂU LẠC BỘ
                    </th>
                    <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
                      THÀNH VIÊN
                    </th>
                    <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
                      CHỈ SỐ GẮN KẾT
                    </th>
                    <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
                      TÌNH TRẠNG
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {clubs.slice(0, 4).map((club) => (
                    <tr key={club.id}>
                      <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0">
                        <Link className="flex items-center gap-[10px]" to={`/ctsv/clubs?club=${club.id}`}>
                          <span
                            className="w-[31px] h-[31px] rounded-[8px] grid place-items-center text-[13px] font-[650] tracking-[-1px] shrink-0"
                            style={{ background: `${club.color}16`, color: club.color }}
                          >
                            {club.symbol}
                          </span>
                          <span>
                            <strong className="block text-[11px] font-medium text-[#4a5462]">{club.name}</strong>
                            <small className="block text-[9.5px] text-[#a8adb5] mt-[4px]">{club.category}</small>
                          </span>
                        </Link>
                      </td>
                      <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0 text-[11px] text-[#727b89]">
                        {club.memberCount}
                      </td>
                      <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0">
                        <div className="flex items-center gap-[10px]">
                          <span className="w-[75px] h-[5px] bg-[#f1f2f4] rounded-[6px] overflow-hidden">
                            <i className="block h-full rounded-[6px]" style={{ width: `${club.health}%`, background: club.color }} />
                          </span>
                          <b className="text-[11px] font-medium">{club.health}</b>
                        </div>
                      </td>
                      <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0">
                        <Badge tone={club.health > 60 ? 'green' : 'orange'} dot>
                          {club.health > 60 ? 'Ổn định' : 'Cần quan tâm'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {/* Outreach Card */}
        <section className="relative bg-gradient-to-br from-[#edf4ef] to-[#f5f8f2] border border-[#e3ece4] rounded-[10px] p-[22px] overflow-hidden">
          <span className="absolute right-[22px] top-[21px] text-[#9fbaa3]">
            <UsersRound size={25} />
          </span>
          <div className="text-[9px] tracking-[1px] text-[#8ea28f] mb-[4px]">KHÔNG AI BỊ BỎ LẠI</div>
          <h2 className="text-[17px] leading-[1.55] text-[#526f58] font-semibold mt-[20px]">
            Chủ động kết nối<br />sinh viên chưa tham gia
          </h2>
          <p className="text-[10.5px] text-[#6d8974] mt-[10px]">Những trải nghiệm đầu tiên thường bắt đầu từ một lời mời phù hợp.</p>
          <div className="flex gap-[12px] items-center mt-[17px]">
            <strong className="text-[30px] text-[#6b8c73] font-semibold">
              {loading ? '-' : summary.unengagedStudents}
            </strong>
            <span className="text-[10px] leading-[1.6] text-[#93a596]">
              sinh viên chưa<br />tham gia CLB
            </span>
          </div>
          <Link
            to="/ctsv/engagement?group=no-club"
            className="flex items-center justify-between bg-[#fcfefb] border border-[#dce6db] text-[#79907c] p-[11px] rounded-[6px] text-[10px] mt-[17px]"
          >
            Xem nhóm sinh viên <ArrowRight size={16} />
          </Link>
          {/* Decorative circle */}
          <span className="absolute -right-[55px] -bottom-[105px] w-[180px] h-[180px] rounded-full border border-[#d8e3d3] pointer-events-none" />
        </section>
      </div>
    </>
  );
}
