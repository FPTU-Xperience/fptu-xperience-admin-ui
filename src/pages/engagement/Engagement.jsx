import { systemRolesFor } from '../../utils/roles.js';
import './Engagement.css';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowDownToLine,
  ArrowRight,
  ChevronRight,
  GraduationCap,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import api from '../../services/api.js';
import { MAJORS, normalize, number, seasonLabel } from '../../utils/format.js';
import { createWorkbookBuffer, downloadBuffer } from '../../utils/excel.js';
import { useAction } from '../../hooks/useAction.js';
import {
  Avatar,
  Badge,
  Button,
  Empty,
  Modal,
  PageHeader,
  Pagination,
  Panel,
  SearchBox,
  StatCard,
} from '../../components/ui/index.js';

const DEFAULT_THRESHOLD = 200;

export function Engagement({ reports = false }) {
  const run = useAction();
  const [params] = useSearchParams();

  // Season context
  const { season, setSeason, state: workspaceState } = useWorkspace();
  useEffect(() => {
    const requested = params.get('season');
    if (requested && workspaceState.seasons.some((item) => item.id === requested))
      setSeason(requested);
  }, [params, workspaceState.seasons, setSeason]);
  const threshold = DEFAULT_THRESHOLD;

  // Data state
  const [students, setStudents] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState(params.get('group') || 'all');
  const [major, setMajor] = useState('all');
  const [cohort, setCohort] = useState('all');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);
  const [radarData, setRadarData] = useState(null);
  const [radarLoading, setRadarLoading] = useState(false);
  const [radarError, setRadarError] = useState(null);
  const [busy, setBusy] = useState(false);

  // Fetch data from API
  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const [usersResponse, clubsResponse] = await Promise.all([
        api.users.list({ page: 1, pageSize: 500 }),
        api.clubs.list({ page: 1, pageSize: 100 }),
      ]);

      // Students are system actors; club membership is a separate relation.
      const users = Array.isArray(usersResponse) ? usersResponse : usersResponse?.items || [];
      const clubMembers = users.filter((u) => {
        return systemRolesFor(u).includes('STUDENT');
      });

      // Map students
      setStudents(
        clubMembers.map((u) => ({
          id: String(u.id),
          username: u.username || u.studentCode || '',
          fullName: u.fullName || u.name || '',
          email: u.email || '',
          major: u.major || '',
          cohort: u.cohort || '',
          clubIds: Array.isArray(u.clubIds) ? u.clubIds : [],
        })),
      );

      // Map clubs
      const clubsData = Array.isArray(clubsResponse) ? clubsResponse : clubsResponse?.items || [];
      setClubs(
        clubsData.map((c) => ({
          id: String(c.id),
          name: c.name || '',
        })),
      );
    } catch (err) {
      console.error('Failed to fetch engagement data:', err);
      setError(err.message || 'Không thể tải dữ liệu sinh viên');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [query, group, major, cohort]);

  useEffect(() => {
    setGroup(params.get('group') || 'all');
  }, [params]);

  // Filter students
  const filtered = students.filter((s) => {
    const hasClub = s.clubIds?.length > 0;
    return (
      normalize(`${s.fullName} ${s.username} ${s.email}`).includes(normalize(query)) &&
      (major === 'all' || s.major === major) &&
      (cohort === 'all' || s.cohort === cohort) &&
      (group === 'all' ||
        (group === 'unengaged' && !hasClub) ||
        (group === 'no-club' && !hasClub) ||
        (group === 'low' && hasClub) ||
        (group === 'high' && hasClub))
    );
  });

  const safePage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 8)));

  // Calculate unengaged count
  const unengagedCount = students.filter((s) => !s.clubIds?.length).length;
  const lowEngagementCount = students.filter((s) => s.clubIds?.length > 0).length;

  // Fetch radar data when student is selected
  useEffect(() => {
    if (!detail) {
      setRadarData(null);
      return;
    }
    async function fetchRadar() {
      setRadarLoading(true);
      setRadarError(null);
      try {
        const data = await api.studentAffairs.students.radar(detail.id, { semesterCode: season });
        setRadarData(data);
      } catch (err) {
        console.error('Failed to fetch radar:', err);
        setRadarError(err.message);
        setRadarData(null);
      } finally {
        setRadarLoading(false);
      }
    }
    fetchRadar();
  }, [detail, season]);

  async function exportData() {
    setBusy(true);
    await run(async () => {
      const buffer = await createWorkbookBuffer(
        'GanKet',
        ['MSSV', 'Họ tên', 'Email', 'Ngành', 'Khóa', 'Số CLB', 'Học kỳ', 'Gắn kết'],
        filtered.map((s) => [
          s.username,
          s.fullName,
          s.email,
          s.major || 'Chưa cập nhật',
          s.cohort || 'Chưa cập nhật',
          s.clubIds?.length || 0,
          season,
          s.clubIds?.length > 0 ? 'Đang tham gia' : 'Chưa tham gia',
        ]),
      );
      downloadBuffer(buffer, `FPTU_Gan_ket_${season}.xlsx`);
    }, `Đã xuất ${filtered.length} sinh viên theo bộ lọc.`);
    setBusy(false);
  }

  return (
    <>
      <PageHeader
        eyebrow={reports ? 'DỮ LIỆU ĐỂ THẤU HIỂU' : 'MỌI SINH VIÊN ĐỀU QUAN TRỌNG'}
        title={reports ? 'Báo cáo & phân tích' : 'Gắn kết sinh viên'}
        description={`Nhìn thấy cả những sinh viên chưa tham gia, để tạo thêm cơ hội phù hợp · ${seasonLabel(season)}.`}
      >
        <Button icon={ArrowDownToLine} variant="primary" busy={busy} onClick={exportData}>
          Xuất báo cáo Excel
        </Button>
      </PageHeader>

      {/* Error Banner */}
      {error && (
        <div className="engagement-content">
          <span className="engagement-text">⚠️</span>
          {error}
          <button className="engagement-button" onClick={fetchData}>
            Thử lại
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="engagement-content-2">
        <StatCard
          label="Sinh viên được theo dõi"
          value={loading ? '-' : students.length}
          note="Bao gồm sinh viên chưa tham gia CLB"
          icon={GraduationCap}
          tone="blue"
        />
        <StatCard
          label="Chưa có đóng góp xác thực"
          value={loading ? '-' : unengagedCount}
          note={`Trong học kỳ ${seasonLabel(season)}`}
          icon={UsersRound}
        />
        <StatCard
          label="Cần thêm cơ hội kết nối"
          value={loading ? '-' : lowEngagementCount}
          note={`Dưới ngưỡng ${threshold} Xperience Point của học kỳ`}
          icon={Sparkles}
          tone="purple"
        />
      </div>

      {/* Major Bars - Reports Only */}
      {reports && (
        <Panel
          title="Độ phủ theo ngành học"
          description="Tỷ lệ sinh viên có ít nhất một đóng góp xác thực trong học kỳ."
        >
          <div className="engagement-content-3">
            {MAJORS.map((m) => {
              const all = students.filter((s) => s.major === m);
              const active = all.filter((s) => s.clubIds?.length > 0).length;
              const ratio = all.length ? Math.round((active / all.length) * 100) : 0;
              return (
                <div key={m} className="engagement-content-4">
                  <span className="engagement-text-2">{m}</span>
                  <div className="engagement-content-5">
                    <i className="engagement-indicator" style={{ width: `${ratio}%` }} />
                  </div>
                  <b className="engagement-b">{ratio}%</b>
                  <small className="engagement-caption">
                    {active}/{all.length} SV
                  </small>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {/* Student List */}
      <Panel className="engagement-panel">
        {/* Panel Title Row */}
        <div className="engagement-content-6">
          <h2 className="engagement-heading">
            {reports ? 'Dữ liệu xuất báo cáo' : 'Danh sách sinh viên'}
            <span className="engagement-text-3">{loading ? '...' : filtered.length}</span>
          </h2>
          <span className="engagement-text-4">Thay đổi bộ lọc để chọn phạm vi</span>
        </div>

        {/* Toolbar */}
        <div className="engagement-content-7">
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder="Tìm sinh viên, MSSV, email…"
            className="engagement-search-box"
          />
          <select
            className="engagement-select"
            aria-label="Nhóm gắn kết"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
          >
            <option value="all">Tất cả mức độ</option>
            <option value="unengaged">Chưa có đóng góp</option>
            <option value="no-club">Chưa tham gia CLB</option>
            <option value="low">Cần thêm kết nối</option>
            <option value="high">Gắn kết cao</option>
          </select>
          <select
            className="engagement-select"
            aria-label="Ngành học"
            value={major}
            onChange={(e) => setMajor(e.target.value)}
          >
            <option value="all">Tất cả ngành</option>
            {MAJORS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <select
            className="engagement-select"
            aria-label="Khóa sinh viên"
            value={cohort}
            onChange={(e) => setCohort(e.target.value)}
          >
            <option value="all">Tất cả khóa</option>
            {['K18', 'K19', 'K20', 'K21'].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="engagement-content-8">
            <div className="engagement-content-9" />
            Đang tải dữ liệu sinh viên...
          </div>
        ) : filtered.length ? (
          <div className="engagement-content-10">
            <table className="engagement-table">
              <thead>
                <tr>
                  <th className="engagement-column">SINH VIÊN</th>
                  <th className="engagement-column">NGÀNH / KHÓA</th>
                  <th className="engagement-column">THAM GIA CLB</th>
                  <th className="engagement-column">MỨC ĐỘ</th>
                  <th className="engagement-column" />
                </tr>
              </thead>
              <tbody>
                {filtered.slice((safePage - 1) * 8, safePage * 8).map((s) => {
                  const hasClub = s.clubIds?.length > 0;
                  return (
                    <tr key={s.id}>
                      <td className="engagement-cell">
                        <div className="engagement-content-11">
                          <Avatar name={s.fullName} />
                          <div>
                            <strong className="engagement-value">{s.fullName}</strong>
                            <small className="engagement-caption-2">{s.username}</small>
                          </div>
                        </div>
                      </td>
                      <td className="engagement-cell-2">
                        {s.major || 'Chưa cập nhật'}
                        <span className="engagement-text-5">{s.cohort || 'Chưa cập nhật'}</span>
                      </td>
                      <td className="engagement-cell-2">
                        {hasClub ? (
                          `${s.clubIds.length} câu lạc bộ`
                        ) : (
                          <span className="engagement-text-6">Chưa tham gia</span>
                        )}
                      </td>
                      <td className="engagement-cell">
                        <Badge tone={hasClub ? 'green' : 'orange'}>
                          {hasClub ? 'Đang tham gia' : 'Chưa tham gia'}
                        </Badge>
                      </td>
                      <td className="engagement-cell">
                        <button
                          className="engagement-button-2"
                          aria-label={`Chi tiết ${s.username}`}
                          onClick={() => setDetail(s)}
                        >
                          <ChevronRight size={17} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Không có sinh viên phù hợp"
            description="Thử thay đổi nhóm gắn kết hoặc ngành, khóa học."
          />
        )}

        <Pagination page={safePage} total={filtered.length} onChange={setPage} />
      </Panel>

      {/* Detail Modal */}
      {detail && (
        <Modal
          title={detail.fullName}
          description={`${detail.username} · ${detail.email}`}
          wide
          onClose={() => setDetail(null)}
        >
          <div className="engagement-content-12">
            {/* Student Club Card */}
            <div className="engagement-content-13">
              <UsersRound size={25} />
              <strong className="engagement-value-2">{detail.clubIds?.length || 0}</strong>
              <span className="engagement-text-7">Câu lạc bộ đã tham gia</span>
            </div>

            <div className="engagement-content-14">
              <div className="engagement-content-15">
                <dt className="engagement-term">Ngành học</dt>
                <dd className="engagement-definition">{detail.major || 'Chưa cập nhật'}</dd>
              </div>
              <div className="engagement-content-15">
                <dt className="engagement-term">Khóa</dt>
                <dd className="engagement-definition">{detail.cohort || 'Chưa cập nhật'}</dd>
              </div>
            </div>

            {/* Radar Chart */}
            <h3 className="engagement-subheading">Biểu đồ năng lực · {seasonLabel(season)}</h3>

            {radarLoading ? (
              <div className="engagement-content-16">
                <div className="engagement-content-17" />
                Đang tải biểu đồ…
              </div>
            ) : radarError || !radarData ? (
              <div className="engagement-content-18">Chưa có dữ liệu radar cho học kỳ này.</div>
            ) : (
              <>
                {/* Radar */}
                <div className="engagement-content-19">
                  <ResponsiveContainer width="100%" height={280}>
                    <RadarChart data={radarData.chart || radarData.data || []}>
                      <PolarGrid stroke="#e9ebee" />
                      <PolarAngleAxis dataKey="name" tick={{ fontSize: 11, fill: '#718094' }} />
                      <Radar
                        name="Mức độ bão hòa"
                        dataKey="value"
                        stroke="#ed641c"
                        fill="#ed641c"
                        fillOpacity={0.18}
                        strokeWidth={2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Stats Row */}
                {radarData.stats && (
                  <div className="engagement-content-20">
                    {[
                      {
                        label: 'Chỉ số đa dạng (D)',
                        value: radarData.stats.diversityIndex || radarData.stats.D,
                      },
                      {
                        label: 'Độ đều Shannon (J)',
                        value: radarData.stats.evenness || radarData.stats.J,
                      },
                      {
                        label: 'Hệ số đòn bẩy (M)',
                        value: radarData.stats.leverage || radarData.stats.M,
                      },
                      { label: 'ERI', value: radarData.stats.eri || radarData.stats.ERI },
                    ].map((stat) => (
                      <div key={stat.label} className="engagement-content-21">
                        <p className="engagement-description">{stat.label}</p>
                        <p className="engagement-description-2">
                          {typeof stat.value === 'number' ? stat.value.toFixed(2) : '—'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tier & Title */}
                {(radarData.tier || radarData.title || radarData.rank) && (
                  <div className="engagement-content-22">
                    {radarData.tier && <Badge tone="orange">Hạng {radarData.tier}</Badge>}
                    {radarData.title && <Badge tone="green">{radarData.title}</Badge>}
                    {radarData.rank && <Badge tone="blue">Top {radarData.rank}</Badge>}
                  </div>
                )}
              </>
            )}

            {/* Club list */}
            <div className="engagement-content-23">
              <h4 className="engagement-h4">Câu lạc bộ tham gia</h4>
              <p className="engagement-description-3">
                {detail.clubIds
                  ?.map((id) => clubs.find((c) => c.id === id)?.name)
                  .filter(Boolean)
                  .join(', ') || 'Chưa tham gia câu lạc bộ'}
              </p>
            </div>
          </div>
          <div className="engagement-content-24">
            <Button onClick={() => setDetail(null)}>Đóng</Button>
            <Link to="/ctsv/quests" className="engagement-link">
              Xem nhiệm vụ phù hợp <ArrowRight size={15} />
            </Link>
          </div>
        </Modal>
      )}
    </>
  );
}
