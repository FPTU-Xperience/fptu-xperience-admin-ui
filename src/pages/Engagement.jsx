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
import api from '../services/api.js';
import { MAJORS, normalize, number, seasonLabel } from '../utils/format.js';
import { createWorkbookBuffer, downloadBuffer } from '../utils/excel.js';
import { useAction } from '../hooks/useAction.js';
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
} from '../components/ui/index.js';

const DEFAULT_SEASON = 'FALL2026';
const DEFAULT_THRESHOLD = 200;

export function Engagement({ reports = false }) {
  const run = useAction();
  const [params] = useSearchParams();

  // Season context
  const [season] = useState(params.get('season') || DEFAULT_SEASON);
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
  const [busy, setBusy] = useState(false);

  // Fetch data from API
  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const [usersResponse, clubsResponse] = await Promise.all([
        api.users.list({ page: 1, pageSize: 500 }).catch(() => []),
        api.clubs.list({ page: 1, pageSize: 100 }).catch(() => []),
      ]);

      // Filter to only CLUB_MEMBER
      const users = Array.isArray(usersResponse)
        ? usersResponse
        : usersResponse?.items || [];
      const clubMembers = users.filter((u) => {
        const roles = Array.isArray(u.roles) ? u.roles : [u.role].filter(Boolean);
        return roles.includes('CLUB_MEMBER') || u.role === 'CLUB_MEMBER';
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
      const clubsData = Array.isArray(clubsResponse)
        ? clubsResponse
        : clubsResponse?.items || [];
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
        <div className="mb-4 p-[14px] border border-[#f2dfdc] bg-[#fff3f2] text-[#bd7970] rounded-[7px] text-[11px]">
          <span className="mr-2">⚠️</span>
          {error}
          <button className="ml-2 underline hover:no-underline" onClick={fetchData}>
            Thử lại
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
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
          note={`Dưới ngưỡng ${threshold} XP của học kỳ`}
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
          <div className="p-[13px_23px_25px]">
            {MAJORS.map((m) => {
              const all = students.filter((s) => s.major === m);
              const active = all.filter((s) => s.clubIds?.length > 0).length;
              const ratio = all.length ? Math.round((active / all.length) * 100) : 0;
              return (
                <div key={m} className="flex items-center gap-[18px] mt-5 text-[11px] text-[#8d96a3]">
                  <span className="w-[175px] shrink-0">{m}</span>
                  <div className="flex-1 h-[8px] bg-[#f1f2f4] rounded-[6px] overflow-hidden">
                    <i className="block h-full bg-[#ed9c6a] rounded-[6px]" style={{ width: `${ratio}%` }} />
                  </div>
                  <b className="w-[35px] text-right font-medium text-[#bd8c69]">{ratio}%</b>
                  <small className="w-[65px] text-right text-[11px]">{active}/{all.length} SV</small>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {/* Student List */}
      <Panel className="mt-[22px]">
        {/* Panel Title Row */}
        <div className="flex items-center justify-between gap-3 px-[22px] pt-[21px] pb-[10px]">
          <h2 className="text-[13px]">
            {reports ? 'Dữ liệu xuất báo cáo' : 'Danh sách sinh viên'}
            <span className="text-[11px] bg-[#f0f2f5] px-[7px] py-[3px] rounded-sm ml-[7px] text-[#929baa] font-medium">
              {loading ? '...' : filtered.length}
            </span>
          </h2>
          <span className="text-[11px] text-[#818794] hidden sm:inline">Thay đổi bộ lọc để chọn phạm vi</span>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 px-[17px] py-[15px]">
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder="Tìm sinh viên, MSSV, email…"
            className="mr-auto sm:min-w-full sm:max-w-none"
          />
          <select
            className="h-[35px] px-3 border border-[#e1e4e9] rounded-[7px] text-[11px] text-[#718094] bg-white"
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
            className="h-[35px] px-3 border border-[#e1e4e9] rounded-[7px] text-[11px] text-[#718094] bg-white"
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
            className="h-[35px] px-3 border border-[#e1e4e9] rounded-[7px] text-[11px] text-[#718094] bg-white"
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
          <div className="flex items-center justify-center py-8 text-[#9096a1]">
            <div className="w-5 h-5 border-2 border-[#e1e4e9] border-t-[#ed641c] rounded-full animate-spin mr-2" />
            Đang tải dữ liệu sinh viên...
          </div>
        ) : filtered.length ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left whitespace-nowrap">
              <thead>
                <tr>
                  <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
                    SINH VIÊN
                  </th>
                  <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
                    NGÀNH / KHÓA
                  </th>
                  <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
                    THAM GIA CLB
                  </th>
                  <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
                    MỨC ĐỘ
                  </th>
                  <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]" />
                </tr>
              </thead>
              <tbody>
                {filtered.slice((safePage - 1) * 8, safePage * 8).map((s) => {
                  const hasClub = s.clubIds?.length > 0;
                  return (
                    <tr key={s.id}>
                      <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0">
                        <div className="flex items-center gap-[11px]">
                          <Avatar name={s.fullName} />
                          <div>
                            <strong className="block text-[11px] font-medium text-[#4a5462]">{s.fullName}</strong>
                            <small className="block text-[9.5px] text-[#b4b9c1] mt-[3px]">{s.username}</small>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0 text-[11px] text-[#727b89]">
                        {s.major || 'Chưa cập nhật'}
                        <span className="block text-[10px] text-[#a5acb5] mt-[5px] leading-[1.6]">{s.cohort || 'Chưa cập nhật'}</span>
                      </td>
                      <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0 text-[11px] text-[#727b89]">
                        {hasClub ? (
                          `${s.clubIds.length} câu lạc bộ`
                        ) : (
                          <span className="text-[#818794]">Chưa tham gia</span>
                        )}
                      </td>
                      <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0">
                        <Badge tone={hasClub ? 'green' : 'orange'}>
                          {hasClub ? 'Đang tham gia' : 'Chưa tham gia'}
                        </Badge>
                      </td>
                      <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0">
                        <button
                          className="h-[30px] w-[30px] bg-transparent rounded-[6px] inline-flex justify-center items-center text-[#9a9faa] hover:bg-[#f0f2f5] hover:text-[#596272]"
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
          onClose={() => setDetail(null)}
        >
          <div className="px-[26px] py-6">
            {/* Student Club Card */}
            <div className="bg-[#fff6ec] rounded-[9px] p-[25px] flex flex-col items-center gap-[9px] text-[#da9156] mb-[20px]">
              <UsersRound size={25} />
              <strong className="text-[27px] font-semibold">
                {detail.clubIds?.length || 0}
              </strong>
              <span className="text-[11px] text-[#bd9b7e]">Câu lạc bộ đã tham gia</span>
            </div>

            <dl className="grid grid-cols-2 gap-4 text-[11px]">
              <div className="pb-[20px] border-b border-[#e9ebee]">
                <dt className="text-[10px] text-[#a8b2bf] mb-[10px]">Ngành học</dt>
                <dd className="text-[12px] text-[#808d9e] font-medium">{detail.major || 'Chưa cập nhật'}</dd>
              </div>
              <div className="pb-[20px] border-b border-[#e9ebee]">
                <dt className="text-[10px] text-[#a8b2bf] mb-[10px]">Khóa</dt>
                <dd className="text-[12px] text-[#808d9e] font-medium">{detail.cohort || 'Chưa cập nhật'}</dd>
              </div>
              <div className="pb-[20px] border-b border-[#e9ebee] sm:col-span-2">
                <dt className="text-[10px] text-[#a8b2bf] mb-[10px]">Câu lạc bộ</dt>
                <dd className="text-[12px] text-[#808d9e] font-medium">
                  {detail.clubIds
                    ?.map((id) => clubs.find((c) => c.id === id)?.name)
                    .filter(Boolean)
                    .join(', ') || 'Chưa tham gia câu lạc bộ'}
                </dd>
              </div>
            </dl>

            <div className="p-[14px] border border-[#e4ebf3] bg-[#f4f7fb] text-[#70869e] rounded-[7px] text-[11px] leading-[1.8] mt-[17px]">
              {detail.clubIds?.length
                ? 'Sinh viên đã tham gia câu lạc bộ. Tiếp tục mở rộng cơ hội để duy trì sự gắn kết.'
                : 'Sinh viên thuộc nhóm cần thêm cơ hội kết nối. Có thể thiết kế nhiệm vụ khám phá phù hợp với ngành học.'}
            </div>
          </div>
          <div className="sticky bottom-0 z-[1] border-t border-[#e9ebee] px-[26px] py-[17px] flex gap-[10px] justify-end bg-[#fdfdfe] rounded-b-[14px]">
            <Button onClick={() => setDetail(null)}>Đóng</Button>
            <Link to="/ctsv/quests" className="inline-flex items-center justify-center gap-[8px] rounded-[7px] min-h-[36px] px-[13px] py-[9px] bg-[#ed641c] border border-[#ed641c] text-white text-[11px] font-semibold shadow-[0_2px_3px_#c9631815] hover:bg-[#cb4c0e] hover:border-[#cb4c0e]">
              Xem nhiệm vụ phù hợp <ArrowRight size={15} />
            </Link>
          </div>
        </Modal>
      )}
    </>
  );
}
