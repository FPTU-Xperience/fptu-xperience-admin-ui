import { useWorkspace } from '../context/WorkspaceContext.jsx';
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
  TrendingUp,
  Layers,
  LayersPlus,
  Scale,
  Briefcase,
  Users,
  UsersRound,
} from 'lucide-react';
import api from '../services/api.js';
import { number, seasonLabel } from '../utils/format.js';
import { useAction } from '../hooks/useAction.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  isAdmin,
  getCampusFromUser,
  getCampusName,
  CAMPUS_OPTIONS,
} from '../context/AuthContext.jsx';
import {
  Badge,
  Button,
  PageHeader,
  Panel,
  StatCard,
  RadarChart,
  DonutChart,
  Empty,
} from '../components/ui/index.js';

function normalizeList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

export default function Dashboard() {
  const run = useAction();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Radar overview data
  const [radarData, setRadarData] = useState(null);
  const [radarLoading, setRadarLoading] = useState(false);
  const [radarError, setRadarError] = useState(null);

  // Filter state
  const { season: semester, setSeason: setSemester, state: workspaceState } = useWorkspace();
  const [campusCode, setCampusCode] = useState('GLOBAL');
  const availableSemesters = workspaceState.seasons.map((item) => ({
    code: item.id,
    label: item.label,
  }));

  // Determine if user is admin
  const isAdminUser = isAdmin(user);

  // Get user's campus from token (for CTSV users)
  const userCampus = getCampusFromUser(user);
  const userCampusName = getCampusName(userCampus);

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
  const season = semester;

  // Fetch radar overview data
  async function fetchRadarOverview() {
    setRadarLoading(true);
    setRadarError(null);
    try {
      // For CTSV users, ignore campusCode (backend uses token's campus)
      const params = {};
      if (semester) params.semester = semester;
      if (isAdminUser && campusCode !== 'GLOBAL') {
        params.campusCode = campusCode;
      }

      const data = await api.studentAffairs.radar.overview(params);
      setRadarData(data);
    } catch (err) {
      console.error('Failed to fetch radar overview:', err);
      setRadarError(err.message);
    } finally {
      setRadarLoading(false);
    }
  }

  // Fetch all dashboard data
  async function fetchDashboardData() {
    setLoading(true);
    setError(null);
    try {
      const [usersResponse, clubsResponse, appsResponse, reportsResponse, anomaliesResponse] =
        await Promise.all([
          api.users.list({ page: 1, pageSize: 500 }),
          api.clubs.list({ page: 1, pageSize: 100 }),
          api.clubs.applications.list({ page: 1, pageSize: 50 }),
          api.studentAffairs.quests.list({ semesterCode: season }),
          api.studentAffairs.anomalies.list(),
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
      const pendingApps = appsData.filter((app) => app.status?.toLowerCase() === 'pending');

      // Calculate quests (reports with type 'quest' or campaign)
      const publishedQuests = reportsData.filter(
        (r) => r.status === 'Published' || r.status === 'published',
      );
      const draftQuests = reportsData.filter((r) => r.status === 'Draft' || r.status === 'draft');

      // Calculate active students (those with any activity participation)
      // Using a heuristic: students with a health score > 0 in KPI
      const activeStudents = null; // Participation totals are not supplied by these list endpoints.

      // Map clubs
      setClubs(
        clubsData.map((club) => ({
          id: String(club.id),
          name: club.name || '',
          code: club.code || '',
          category: club.category || '',
          color: club.color || '#5c8d80',
          symbol: (club.code || 'CL').slice(0, 2).toUpperCase(),
          health: club.healthScore ?? club.health ?? null,
          memberCount: club.memberCount || 0,
        })),
      );

      setSummary({
        studentsCount: students.length,
        activeStudentsCount: activeStudents,
        clubsCount: clubsData.filter((c) => c.isActive !== false).length,
        pendingApplications: pendingApps.length,
        anomaliesCount: normalizeList(anomaliesResponse).filter(
          (item) => String(item.status).toLowerCase() === 'open',
        ).length,
        questsPublished: publishedQuests.length,
        questsDraft: draftQuests.length,
        unengagedStudents: null,
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
  }, [season]);

  // Fetch radar data when filters change
  useEffect(() => {
    fetchRadarOverview();
  }, [semester, campusCode, isAdminUser]);

  // For CTSV users, set campus to their own campus
  useEffect(() => {
    if (!isAdminUser && userCampus) {
      setCampusCode(userCampus);
    }
  }, [isAdminUser, userCampus]);

  const totalActions = summary.pendingApplications + summary.anomaliesCount;

  return (
    <>
      <PageHeader
        eyebrow="MỘT GÓC NHÌN, NHIỀU KẾT NỐI"
        title="Tổng quan trải nghiệm"
        description="Theo dõi nhịp hoạt động và nuôi dưỡng sự gắn kết của sinh viên."
      >
        <Button
          icon={ArrowDownToLine}
          onClick={() =>
            run(() => api.exports.create({ type: 'dashboard' }), 'Đang chuẩn bị xuất báo cáo...')
          }
        >
          Xuất báo cáo
        </Button>
      </PageHeader>

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
          label="Sinh viên trong danh sách"
          value={loading || error ? '—' : number(summary.studentsCount)}
          note="Dữ liệu từ hệ thống"
          icon={GraduationCap}
          tone="blue"
        />
        <StatCard
          label="Sinh viên đang tham gia"
          value="—"
          note="Chưa có số liệu tham gia tổng hợp"
          icon={Activity}
          tone="green"
        />
        <StatCard
          label="Câu lạc bộ hoạt động"
          value={loading || error ? '—' : number(summary.clubsCount)}
          note="Câu lạc bộ đang hoạt động"
          icon={UsersRound}
        />
        <StatCard
          label="Nhiệm vụ đang diễn ra"
          value={loading || error ? '—' : summary.questsPublished}
          note={loading || error ? 'Đang tải dữ liệu' : `${summary.questsDraft} bản nháp`}
          icon={Target}
          tone="purple"
        />
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-white border border-border rounded-xl">
        {/* Semester Selector */}
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-[#7d8591] whitespace-nowrap">Học kỳ:</label>
          <select
            className="h-[35px] px-3 border border-[#e1e4e9] rounded-[7px] text-[11px] text-[#303641] bg-white min-w-[120px]"
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
          >
            <option value="">Mặc định (hiện tại)</option>
            {availableSemesters.map((s) => (
              <option key={s.code} value={s.code}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Campus Selector */}
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-[#7d8591] whitespace-nowrap">Cơ sở:</label>
          {isAdminUser ? (
            <select
              className="h-[35px] px-3 border border-[#e1e4e9] rounded-[7px] text-[11px] text-[#303641] bg-white min-w-[160px]"
              value={campusCode}
              onChange={(e) => setCampusCode(e.target.value)}
            >
              {CAMPUS_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="h-[35px] px-3 border border-[#e1e4e9] rounded-[7px] text-[11px] text-[#718094] bg-[#f8f9fa] min-w-[160px] flex items-center">
              {userCampusName}
            </span>
          )}
        </div>

        {/* Semester badge */}
        {radarData?.semesterCode && (
          <Badge tone="orange" className="ml-auto">
            {radarData.semesterCode} · {radarData.academicYear}
          </Badge>
        )}
      </div>

      {/* Radar 6+1 Section */}
      {radarLoading ? (
        <div className="flex items-center justify-center h-[300px] bg-white border border-border rounded-xl mb-6">
          <div className="w-6 h-6 border-2 border-[#e1e4e9] border-t-[#ed641c] rounded-full animate-spin mr-3" />
          <span className="text-[11px] text-[#9096a1]">Đang tải dữ liệu radar...</span>
        </div>
      ) : radarError ? (
        <div className="p-[20px] border border-[#f2dfdc] bg-[#fff3f2] text-[#bd7970] rounded-xl mb-6 text-[11px]">
          <span className="mr-2">⚠️</span>
          {radarError}
          <button className="ml-2 underline hover:no-underline" onClick={fetchRadarOverview}>
            Thử lại
          </button>
        </div>
      ) : radarData ? (
        <>
          {/* KPI Cards - Experience Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Chỉ số ERI"
              value={radarData.averageERI?.toFixed(1) || '-'}
              note="Thang 0 - 130"
              icon={TrendingUp}
              tone="orange"
            />
            <StatCard
              label="Độ sâu D"
              value={radarData.averageD?.toFixed(1) || '-'}
              note="Thang 0 - 100"
              icon={Layers}
              tone="blue"
            />
            <StatCard
              label="Độ cân bằng J"
              value={radarData.averageJ?.toFixed(3) || '-'}
              note="Thang 0 - 1"
              icon={LayersPlus}
              tone="green"
            />
            <StatCard
              label="Hệ số thực chiến M"
              value={radarData.averageM?.toFixed(2) || '-'}
              note="Thang 1.0 - 1.3"
              icon={Briefcase}
              tone="purple"
            />
          </div>

          {/* Radar Chart + Profile Distribution */}
          <div className="grid lg:grid-cols-[1.17fr_1fr] gap-5 mb-6">
            {/* Radar Chart */}
            <Panel
              title="Biểu đồ Radar 6+1"
              description="Phân bố điểm bão hòa theo 6 trục lõi và trục thực chiến"
            >
              <div className="p-[20px]">
                <RadarChart data={radarData.pillars || []} title="" height={280} />
              </div>
            </Panel>

            {/* Profile Distribution */}
            <Panel title="Phân bố danh hiệu" description="Sinh viên theo hồ sơ trải nghiệm">
              <div className="p-[20px]">
                <DonutChart data={radarData.profileTitlesDistribution || []} title="" size={140} />
              </div>
            </Panel>
          </div>

          {/* Campus Comparison Table (Admin + GLOBAL only) */}
          {isAdminUser &&
            campusCode === 'GLOBAL' &&
            radarData.campusesComparison &&
            radarData.campusesComparison.length > 0 && (
              <Panel
                title="So sánh 5 cơ sở"
                description="Chỉ số trải nghiệm theo từng cơ sở FPT"
                className="mb-6"
              >
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left whitespace-nowrap">
                    <thead>
                      <tr>
                        <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
                          CƠ SỞ
                        </th>
                        <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
                          SINH VIÊN
                        </th>
                        <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
                          ERI
                        </th>
                        <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
                          ĐỘ SÂU (D)
                        </th>
                        <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
                          ĐỘ CÂN BẰNG (J)
                        </th>
                        <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
                          THỰC CHIẾN (M)
                        </th>
                        <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
                          TRỤC THẾ MẠNH
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {radarData.campusesComparison.map((campus) => (
                        <tr key={campus.campusCode}>
                          <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0 text-[11px] font-medium text-[#4a5462]">
                            {campus.campusName}
                          </td>
                          <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0 text-[11px] text-[#727b89]">
                            {campus.totalStudents?.toLocaleString() || '-'}
                          </td>
                          <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0 text-[11px] text-[#727b89] font-medium">
                            {campus.averageERI?.toFixed(1) || '-'}
                          </td>
                          <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0 text-[11px] text-[#727b89]">
                            {campus.averageD?.toFixed(1) || '-'}
                          </td>
                          <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0 text-[11px] text-[#727b89]">
                            {campus.averageJ?.toFixed(3) || '-'}
                          </td>
                          <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0 text-[11px] text-[#727b89]">
                            {campus.averageM?.toFixed(2) || '-'}
                          </td>
                          <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0">
                            {campus.topStrengthPillar && (
                              <Badge tone="green">{campus.topStrengthPillar}</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            )}
        </>
      ) : null}

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-[1.17fr_1fr] gap-5 mb-6">
        {/* Engagement Panel */}
        <Panel
          title="Phân bố mức độ gắn kết"
          description={`Sinh viên theo đóng góp đã xác thực · ${seasonLabel(season)}`}
          action={
            <Link
              className="inline-flex items-center gap-[6px] text-[10px] text-[#a6aab2] hover:text-accent"
              to="/ctsv/engagement"
            >
              Chi tiết <ArrowUpRight size={15} />
            </Link>
          }
        >
          <Empty
            title="Chưa có phân bố gắn kết"
            description="Các danh sách hiện tại chưa cung cấp số liệu tham gia tổng hợp cho học kỳ này."
          />
        </Panel>

        {/* Action Panel */}
        <Panel
          title="Cần bạn xử lý"
          description="Cùng giữ nhịp hoạt động thông suốt"
          action={<Badge tone="orange">{loading || error ? '—' : totalActions} việc</Badge>}
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
                <strong className="block text-[11.6px] font-medium">
                  Hồ sơ thành lập câu lạc bộ
                </strong>
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
            <Link
              className="inline-flex items-center gap-[6px] text-[10px] text-[#a6aab2] hover:text-accent"
              to="/ctsv/clubs"
            >
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
                        <Link
                          className="flex items-center gap-[10px]"
                          to={`/ctsv/clubs?club=${club.id}`}
                        >
                          <span
                            className="w-[31px] h-[31px] rounded-[8px] grid place-items-center text-[13px] font-[650] tracking-[-1px] shrink-0"
                            style={{ background: `${club.color}16`, color: club.color }}
                          >
                            {club.symbol}
                          </span>
                          <span>
                            <strong className="block text-[11px] font-medium text-[#4a5462]">
                              {club.name}
                            </strong>
                            <small className="block text-[9.5px] text-[#a8adb5] mt-[4px]">
                              {club.category}
                            </small>
                          </span>
                        </Link>
                      </td>
                      <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0 text-[11px] text-[#727b89]">
                        {club.memberCount}
                      </td>
                      <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0">
                        <div className="flex items-center gap-[10px]">
                          <span className="w-[75px] h-[5px] bg-[#f1f2f4] rounded-[6px] overflow-hidden">
                            <i
                              className="block h-full rounded-[6px]"
                              style={{ width: `${club.health ?? 0}%`, background: club.color }}
                            />
                          </span>
                          <b className="text-[11px] font-medium">{club.health ?? '—'}</b>
                        </div>
                      </td>
                      <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0">
                        <Badge
                          tone={
                            club.health == null ? 'neutral' : club.health > 60 ? 'green' : 'orange'
                          }
                          dot
                        >
                          {club.health == null
                            ? 'Chưa có đánh giá'
                            : club.health > 60
                              ? 'Ổn định'
                              : 'Cần quan tâm'}
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
          <div className="text-[9px] tracking-[1px] text-[#8ea28f] mb-[4px]">
            KHÔNG AI BỊ BỎ LẠI
          </div>
          <h2 className="text-[17px] leading-[1.55] text-[#526f58] font-semibold mt-[20px]">
            Chủ động kết nối
            <br />
            sinh viên chưa tham gia
          </h2>
          <p className="text-[10.5px] text-[#6d8974] mt-[10px]">
            Những trải nghiệm đầu tiên thường bắt đầu từ một lời mời phù hợp.
          </p>
          <div className="flex gap-[12px] items-center mt-[17px]">
            <strong className="text-[30px] text-[#6b8c73] font-semibold">
              {loading || error || summary.unengagedStudents == null
                ? '—'
                : summary.unengagedStudents}
            </strong>
            <span className="text-[10px] leading-[1.6] text-[#93a596]">
              sinh viên chưa
              <br />
              tham gia CLB
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
