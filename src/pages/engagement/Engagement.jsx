import { directoryStudent, studentInspectionView, studentRadarView } from '../../services/student-profile-view.js';
import { useCampusScope } from '../../hooks/useCampusScope.js';
import { selectedCampus } from '../../services/campus-scope.js';
import CampusField from '../../components/operations/CampusField.jsx';
import { useListQuery } from '../../hooks/useListQuery.js';
import { loadUserDirectory } from '../../services/user-directory.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { systemRolesFor } from '../../utils/roles.js';
import './Engagement.css';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import { useEffect, useRef, useState } from 'react';
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

export function Engagement({ reports = false }) {
  const { user } = useAuth();
  const campusAuthority = useCampusScope(user);
  const requestSequence = useRef(0);
  const run = useAction();
  const [params] = useSearchParams();

  // Season context
  const { season, setSeason, state: workspaceState } = useWorkspace();
  useEffect(() => {
    const requested = params.get('season');
    if (requested && workspaceState.seasons.some((item) => item.id === requested))
      setSeason(requested);
  }, [params, workspaceState.seasons, setSeason]);

  // Data state
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const { query, setQuery, group, setGroup, major, setMajor, cohort, setCohort, campus: requestedCampus, setCampus, page, setPage } =
    useListQuery({ query: '', group: 'all', major: 'all', cohort: 'all', campus: '', page: 1 });
  const campus = selectedCampus(campusAuthority.data, requestedCampus);
  const [detail, setDetail] = useState(null);
  const [inspection, setInspection] = useState(null);
  const detailContext = `${user?.id}:${campus}:${season}:${detail?.id}`;
  const profile = inspection?.context === detailContext ? inspection.data : null;
  const profileError = inspection?.context === detailContext ? inspection.error : null;
  const [radarResult, setRadarData] = useState(null);
  const radarData = radarResult?.context === detailContext ? radarResult : null;
  const [radarLoading, setRadarLoading] = useState(false);
  const [radarError, setRadarError] = useState(null);
  const [busy, setBusy] = useState(false);

  // Fetch data from API
  async function fetchData() {
    const current = ++requestSequence.current;
    setLoading(true);
    setError(null);
    setStudents([]);
    setDetail(null);
    if (!campus) { setLoading(false); return; }
    try {
      const usersResponse = await loadUserDirectory(api, { campus });
      if (current !== requestSequence.current) return;

      // Students are system actors; club membership is a separate relation.
      const users = Array.isArray(usersResponse) ? usersResponse : usersResponse?.items || [];
      if (users.some((item) => item.campusCode !== campus)) throw new Error('Danh sách tài khoản không khớp campus đang chọn.');
      const clubMembers = users.filter((u) => {
        return systemRolesFor(u).includes('STUDENT');
      });

      // Map students
      setStudents(
        clubMembers.map(directoryStudent),
      );
    } catch (err) {
      if (current !== requestSequence.current) return;
      console.error('Failed to fetch engagement data:', err);
      setError(err.message || 'Không thể tải dữ liệu sinh viên');
    } finally {
      if (current === requestSequence.current) setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    return () => {
      requestSequence.current++;
    };
  }, [user?.id, campus]);

  // Filter students
  const filtered = students.filter((s) => {
    return (
      normalize(`${s.fullName} ${s.username} ${s.email}`).includes(normalize(query)) &&
      (major === 'all' || s.major === major) &&
      (cohort === 'all' || s.cohort === cohort) &&
      group === 'all'
    );
  });

  const safePage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 8)));

  // Calculate unengaged count

  useEffect(() => {
    let active = true;
    setInspection(null);
    if (detail?.actorId === user?.id && detail?.campus === campus)
      api.studentAffairs.students.profile(detail.id, { semester: season || undefined })
        .then((raw) => { if (active) setInspection({ context: detailContext, data: studentInspectionView(raw, detail.id, season) }); })
        .catch((error) => { if (active) setInspection({ context: detailContext, error: error.message }); });
    return () => { active = false; };
  }, [detailContext]);

  // Fetch radar data when student is selected
  useEffect(() => {
    if (!detail || detail.actorId !== user?.id || detail.campus !== campus) {
      setRadarData(null);
      return;
    }
    let active = true;
    async function fetchRadar() {
      setRadarData(null);
      setRadarLoading(true);
      setRadarError(null);
      try {
        const data = await api.studentAffairs.students.radar(detail.id, { semesterCode: season });
        if (active) setRadarData({ ...studentRadarView(data, detail.id), context: detailContext });
      } catch (err) {
        console.error('Failed to fetch radar:', err);
        if (active) {
          setRadarError(err.message);
          setRadarData(null);
        }
      } finally {
        if (active) setRadarLoading(false);
      }
    }
    fetchRadar();
    return () => {
      active = false;
    };
  }, [detail, season, user?.id, campus]);

  async function exportData() {
    setBusy(true);
    await run(async () => {
      const buffer = await createWorkbookBuffer(
        'GanKet',
        ['Tài khoản', 'Họ tên', 'Email', 'Ngành', 'Khóa', 'Số CLB', 'Học kỳ', 'Gắn kết'],
        filtered.map((s) => [
          s.username,
          s.fullName,
          s.email,
          s.major || 'Chưa có nguồn dữ liệu',
          s.cohort || 'Chưa có nguồn dữ liệu',
          'Chưa có nguồn tổng hợp',
          season,
          'Chưa có nguồn tổng hợp',
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
          value="—"
          note="Chưa có nguồn tổng hợp đóng góp của toàn bộ danh sách"
          icon={UsersRound}
        />
        <StatCard
          label="Cần thêm cơ hội kết nối"
          value="—"
          note="Chưa có nguồn tổng hợp điểm; không suy ra từ membership"
          icon={Sparkles}
          tone="purple"
        />
      </div>

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
          <CampusField scope={campusAuthority} value={campus} onChange={setCampus} busy={loading || busy} />
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder="Tìm tên, tài khoản, email…"
            className="engagement-search-box"
          />
          <select
            className="engagement-select"
            aria-label="Nhóm gắn kết"
            disabled
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
            disabled
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
            disabled
            value={cohort}
            onChange={(e) => setCohort(e.target.value)}
          >
            <option value="all">Tất cả khóa</option>
            {['K18', 'K19', 'K20', 'K21'].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <p>Ngành, khóa và nhóm gắn kết chưa có nguồn tổng hợp chính thức. Mở chi tiết để đọc membership hiện tại và radar của từng sinh viên.</p>
        {(group !== 'all' || major !== 'all' || cohort !== 'all') && <p role="status">
          Bộ lọc đang lưu cần nguồn dữ liệu chưa khả dụng. <Button onClick={() => { setGroup('all'); setMajor('all'); setCohort('all'); }}>Xóa bộ lọc chưa hỗ trợ</Button>
        </p>}
        {!campus && <p role="status">Chọn campus đã được máy chủ xác nhận để tải danh sách.</p>}

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
                        Chưa có nguồn dữ liệu
                      </td>
                      <td className="engagement-cell-2">
                        {hasClub ? (
                          `${s.clubIds.length} câu lạc bộ`
                        ) : (
                          <span className="engagement-text-6">Chưa có nguồn tổng hợp</span>
                        )}
                      </td>
                      <td className="engagement-cell">
                        <Badge tone="gray">
                          Chưa có nguồn tổng hợp
                        </Badge>
                      </td>
                      <td className="engagement-cell">
                        <button
                          className="engagement-button-2"
                          aria-label={`Chi tiết ${s.username}`}
                          onClick={() => setDetail({ ...s, actorId: user?.id, campus })}
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
      {detail?.actorId === user?.id && detail?.campus === campus && (
        <Modal
          title={profile?.fullName || detail.fullName}
          description={`${profile?.studentCode || 'Chưa có MSSV từ roster'} · ${profile?.email || detail.email}`}
          wide
          onClose={() => setDetail(null)}
        >
          <div className="engagement-content-12">
            {/* Student Club Card */}
            <div className="engagement-content-13">
              <UsersRound size={25} />
              <strong className="engagement-value-2">
                {profile?.clubs ? profile.clubs.length : '—'}
              </strong>
              <span className="engagement-text-7">Câu lạc bộ đang tham gia</span>
            </div>

            <div className="engagement-content-14">
              <div className="engagement-content-15">
                <dt className="engagement-term">Ngành học</dt>
                <dd className="engagement-definition">{profile?.major || 'Chưa có nguồn dữ liệu chính thức'}</dd>
              </div>
              <div className="engagement-content-15">
                <dt className="engagement-term">Khóa</dt>
                <dd className="engagement-definition">{profile?.cohort || 'Chưa có nguồn dữ liệu chính thức'}</dd>
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
              <div className="engagement-content-18">
                {radarError || 'Chưa có dữ liệu radar cho học kỳ này.'}
              </div>
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
                        value: radarData.stats.diversityIndex ?? radarData.stats.D,
                      },
                      {
                        label: 'Độ đều Shannon (J)',
                        value: radarData.stats.evenness ?? radarData.stats.J,
                      },
                      {
                        label: 'Hệ số đòn bẩy (M)',
                        value: radarData.stats.leverage ?? radarData.stats.M,
                      },
                      { label: 'ERI', value: radarData.stats.eri ?? radarData.stats.ERI },
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
                {profileError || (!inspection ? 'Đang tải hồ sơ…' : profile?.clubs
                  ? profile.clubs.map((club) => club.name).join(', ') || 'Chưa tham gia câu lạc bộ'
                  : 'Nguồn membership hiện chưa khả dụng. Không thể kết luận sinh viên chưa tham gia.')}
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
