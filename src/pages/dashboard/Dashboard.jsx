import { systemRolesFor } from '../../utils/roles.js';
import './Dashboard.css';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
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
import api from '../../services/api.js';
import { number, seasonLabel } from '../../utils/format.js';
import { useAction } from '../../hooks/useAction.js';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  isAdmin,
  getCampusFromUser,
  getCampusName,
  CAMPUS_OPTIONS,
} from '../../context/AuthContext.jsx';
import {
  Badge,
  Button,
  PageHeader,
  Panel,
  StatCard,
  RadarChart,
  DonutChart,
  Empty,
} from '../../components/ui/index.js';

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
        return systemRolesFor(user).includes('STUDENT');
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
        <div className="dashboard-content">
          <span className="dashboard-text">⚠️</span>
          {error}
          <button className="dashboard-button" onClick={fetchDashboardData}>
            Thử lại
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="dashboard-content-2">
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
      <div className="dashboard-content-3">
        {/* Semester Selector */}
        <div className="dashboard-content-4">
          <label className="dashboard-field">Học kỳ:</label>
          <select
            className="dashboard-select"
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
        <div className="dashboard-content-4">
          <label className="dashboard-field">Cơ sở:</label>
          {isAdminUser ? (
            <select
              className="dashboard-select-2"
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
            <span className="dashboard-text-2">{userCampusName}</span>
          )}
        </div>

        {/* Semester badge */}
        {radarData?.semesterCode && (
          <Badge tone="orange" className="dashboard-badge">
            {radarData.semesterCode} · {radarData.academicYear}
          </Badge>
        )}
      </div>

      {/* Radar 6+1 Section */}
      {radarLoading ? (
        <div className="dashboard-content-5">
          <div className="dashboard-content-6" />
          <span className="dashboard-text-3">Đang tải dữ liệu radar...</span>
        </div>
      ) : radarError ? (
        <div className="dashboard-content-7">
          <span className="dashboard-text">⚠️</span>
          {radarError}
          <button className="dashboard-button" onClick={fetchRadarOverview}>
            Thử lại
          </button>
        </div>
      ) : radarData ? (
        <>
          {/* KPI Cards - Experience Metrics */}
          <div className="dashboard-content-2">
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
          <div className="dashboard-content-8">
            {/* Radar Chart */}
            <Panel
              title="Biểu đồ Radar 6+1"
              description="Phân bố điểm bão hòa theo 6 trục lõi và trục thực chiến"
            >
              <div className="dashboard-content-9">
                <RadarChart data={radarData.pillars || []} title="" height={280} />
              </div>
            </Panel>

            {/* Profile Distribution */}
            <Panel title="Phân bố danh hiệu" description="Sinh viên theo hồ sơ trải nghiệm">
              <div className="dashboard-content-9">
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
                className="dashboard-panel"
              >
                <div className="dashboard-content-10">
                  <table className="dashboard-table">
                    <thead>
                      <tr>
                        <th className="dashboard-column">CƠ SỞ</th>
                        <th className="dashboard-column">SINH VIÊN</th>
                        <th className="dashboard-column">ERI</th>
                        <th className="dashboard-column">ĐỘ SÂU (D)</th>
                        <th className="dashboard-column">ĐỘ CÂN BẰNG (J)</th>
                        <th className="dashboard-column">THỰC CHIẾN (M)</th>
                        <th className="dashboard-column">TRỤC THẾ MẠNH</th>
                      </tr>
                    </thead>
                    <tbody>
                      {radarData.campusesComparison.map((campus) => (
                        <tr key={campus.campusCode}>
                          <td className="dashboard-cell">{campus.campusName}</td>
                          <td className="dashboard-cell-2">
                            {campus.totalStudents?.toLocaleString() || '-'}
                          </td>
                          <td className="dashboard-cell-3">
                            {campus.averageERI?.toFixed(1) || '-'}
                          </td>
                          <td className="dashboard-cell-2">{campus.averageD?.toFixed(1) || '-'}</td>
                          <td className="dashboard-cell-2">{campus.averageJ?.toFixed(3) || '-'}</td>
                          <td className="dashboard-cell-2">{campus.averageM?.toFixed(2) || '-'}</td>
                          <td className="dashboard-cell-4">
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
      <div className="dashboard-content-8">
        {/* Engagement Panel */}
        <Panel
          title="Phân bố mức độ gắn kết"
          description={`Sinh viên theo đóng góp đã xác thực · ${seasonLabel(season)}`}
          action={
            <Link className="dashboard-link" to="/ctsv/engagement">
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
          <div className="dashboard-content-11">
            <Link to="/ctsv/clubs?tab=applications" className="dashboard-link-2">
              <span className="dashboard-text-4">
                <FileCheck2 size={21} />
              </span>
              <div>
                <strong className="dashboard-value">Hồ sơ thành lập câu lạc bộ</strong>
                <small className="dashboard-caption">
                  {loading ? '-' : summary.pendingApplications} hồ sơ đang chờ phê duyệt
                </small>
              </div>
              <ChevronRight size={17} className="dashboard-chevron-right" />
            </Link>
            <Link to="/ctsv/anomalies" className="dashboard-link-2">
              <span className="dashboard-text-5">
                <ShieldAlert size={21} />
              </span>
              <div>
                <strong className="dashboard-value">Báo cáo Xperience Point bất thường</strong>
                <small className="dashboard-caption">
                  {loading ? '-' : summary.anomaliesCount} trường hợp cần xem xét
                </small>
              </div>
              <ChevronRight size={17} className="dashboard-chevron-right" />
            </Link>
            <Link to="/ctsv/quests" className="dashboard-link-3">
              <span className="dashboard-text-6">
                <Target size={21} />
              </span>
              <div>
                <strong className="dashboard-value">Nhiệm vụ chờ công bố</strong>
                <small className="dashboard-caption">
                  {loading ? '-' : summary.questsDraft} bản nháp trong học kỳ
                </small>
              </div>
              <ChevronRight size={17} className="dashboard-chevron-right" />
            </Link>
          </div>
        </Panel>
      </div>

      {/* Bottom Section */}
      <div className="dashboard-content-12">
        {/* Club Health Table */}
        <Panel
          title="Sức khỏe câu lạc bộ"
          description="Chỉ số gắn kết chuẩn hóa"
          action={
            <Link className="dashboard-link" to="/ctsv/clubs">
              Xem tất cả <ArrowRight size={14} />
            </Link>
          }
        >
          {loading ? (
            <div className="dashboard-content-13">
              <div className="dashboard-content-14" />
              Đang tải...
            </div>
          ) : (
            <div className="dashboard-content-10">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th className="dashboard-column">CÂU LẠC BỘ</th>
                    <th className="dashboard-column">THÀNH VIÊN</th>
                    <th className="dashboard-column">CHỈ SỐ GẮN KẾT</th>
                    <th className="dashboard-column">TÌNH TRẠNG</th>
                  </tr>
                </thead>
                <tbody>
                  {clubs.slice(0, 4).map((club) => (
                    <tr key={club.id}>
                      <td className="dashboard-cell-4">
                        <Link className="dashboard-link-4" to={`/ctsv/clubs?club=${club.id}`}>
                          <span
                            className="dashboard-text-7"
                            style={{ background: `${club.color}16`, color: club.color }}
                          >
                            {club.symbol}
                          </span>
                          <span>
                            <strong className="dashboard-value-2">{club.name}</strong>
                            <small className="dashboard-caption-2">{club.category}</small>
                          </span>
                        </Link>
                      </td>
                      <td className="dashboard-cell-2">{club.memberCount}</td>
                      <td className="dashboard-cell-4">
                        <div className="dashboard-link-4">
                          <span className="dashboard-text-8">
                            <i
                              className="dashboard-indicator"
                              style={{ width: `${club.health ?? 0}%`, background: club.color }}
                            />
                          </span>
                          <b className="dashboard-b">{club.health ?? '—'}</b>
                        </div>
                      </td>
                      <td className="dashboard-cell-4">
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
        <section className="dashboard-section">
          <span className="dashboard-text-9">
            <UsersRound size={25} />
          </span>
          <div className="dashboard-content-15">KHÔNG AI BỊ BỎ LẠI</div>
          <h2 className="dashboard-heading">
            Chủ động kết nối
            <br />
            sinh viên chưa tham gia
          </h2>
          <p className="dashboard-description">
            Những trải nghiệm đầu tiên thường bắt đầu từ một lời mời phù hợp.
          </p>
          <div className="dashboard-content-16">
            <strong className="dashboard-value-3">
              {loading || error || summary.unengagedStudents == null
                ? '—'
                : summary.unengagedStudents}
            </strong>
            <span className="dashboard-text-10">
              sinh viên chưa
              <br />
              tham gia CLB
            </span>
          </div>
          <Link to="/ctsv/engagement?group=no-club" className="dashboard-link-5">
            Xem nhóm sinh viên <ArrowRight size={16} />
          </Link>
          {/* Decorative circle */}
          <span className="dashboard-text-11" />
        </section>
      </div>
    </>
  );
}
