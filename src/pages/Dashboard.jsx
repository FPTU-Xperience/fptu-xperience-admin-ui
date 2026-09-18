import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Clock3,
  FileCheck2,
  GraduationCap,
  ShieldAlert,
  Sparkles,
  Target,
  Users,
  UsersRound,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import { number, seasonLabel } from '../utils/format.js';
import { studentXP } from '../utils/seed.js';
import { useAction } from '../hooks/useAction.js';
import { Badge, Button, PageHeader, Panel, StatCard } from '../components/ui/index.js';
import { createWorkbookBuffer, downloadBuffer } from '../utils/excel.js';

export default function Dashboard() {
  const { state, season } = useWorkspace();
  const run = useAction();
  const students = state.accounts.filter((a) => a.role === 'CLUB_MEMBER');
  const active = students.filter((s) => studentXP(s, season, state.ledger) > 0).length;
  const pending = state.applications.filter((a) => a.status === 'pending');
  const cases = state.anomalies.filter((a) => a.status === 'open');
  const liveClubs = state.clubs.filter((c) => c.status === 'active');
  const quests = state.quests.filter((q) => q.season === season && q.status === 'published');
  const groups = [
    {
      label: 'Gắn kết cao',
      color: '#ed7133',
      count: students.filter((s) => studentXP(s, season, state.ledger) >= 1000).length,
    },
    {
      label: 'Đang tham gia',
      color: '#f4b27b',
      count: students.filter((s) => {
        const xp = studentXP(s, season, state.ledger);
        return xp > 0 && xp < 1000;
      }).length,
    },
    { label: 'Chưa tham gia', color: '#ebecef', count: students.length - active },
  ];
  const total = students.length || 1;
  const percent = Math.round((active / total) * 100);
  const first = (groups[0].count / total) * 360;
  const second = ((groups[0].count + groups[1].count) / total) * 360;
  async function exportOverview() {
    const buffer = await createWorkbookBuffer(
      'TongQuan',
      ['Chỉ số', seasonLabel(season)],
      [
        ['Sinh viên', students.length],
        ['Có đóng góp xác thực', active],
        ['Chưa tham gia', students.length - active],
        ['CLB đang hoạt động', liveClubs.length],
        ['Hồ sơ CLB chờ duyệt', pending.length],
        ['Bất thường chưa xử lý', cases.length],
      ],
    );
    downloadBuffer(buffer, `FPTU_Tong_quan_${season}.xlsx`);
  }
  return (
    <>
      <PageHeader
        eyebrow="MỘT GÓC NHÌN, NHIỀU KẾT NỐI"
        title="Tổng quan trải nghiệm"
        description="Theo dõi nhịp hoạt động và nuôi dưỡng sự gắn kết của sinh viên."
      >
        <Button
          icon={ArrowDownToLine}
          onClick={() => run(exportOverview, 'Đã xuất báo cáo tổng quan.')}
        >
          Xuất báo cáo
        </Button>
      </PageHeader>
      <section className="welcome-banner">
        <div className="welcome-copy">
          <Badge tone="orange">
            <Sparkles size={12} />
            HỌC KỲ {seasonLabel(season).toUpperCase()}
          </Badge>
          <h2>
            Mỗi trải nghiệm,
            <br />
            một bước trưởng thành.
          </h2>
          <p>
            Cùng mở thêm cơ hội để mỗi sinh viên tìm thấy
            <br className="desktop-break" /> cộng đồng và hành trình của riêng mình.
          </p>
          <Link to="/ctsv/engagement" className="banner-link">
            Khám phá mức độ gắn kết <ArrowRight size={16} />
          </Link>
        </div>
        <div className="experience-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit orbit-three" />
          <span className="art-dot dot-one" />
          <span className="art-dot dot-two" />
          <div className="orbit-chip chip-cap">
            <GraduationCap size={31} />
          </div>
          <div className="orbit-chip chip-people">
            <UsersRound size={24} />
          </div>
          <div className="orbit-chip chip-target">
            <Target size={22} />
          </div>
          <div className="experience-core">
            <span>fptu</span>
            <strong>X</strong>
            <small>XPERIENCE</small>
          </div>
          <div className="floating-pill">
            <span>
              <Check size={13} />
            </span>
            Kết nối để trưởng thành
          </div>
          <Sparkles className="art-sparkle" size={23} />
        </div>
      </section>
      <div className="stats-grid">
        <StatCard
          label="Sinh viên toàn trường"
          value={number(students.length)}
          note="Trong bộ dữ liệu minh họa"
          icon={GraduationCap}
          tone="blue"
        />
        <StatCard
          label="Sinh viên đang tham gia"
          value={number(active)}
          note={`${percent}% tổng số sinh viên`}
          icon={Activity}
          tone="green"
        />
        <StatCard
          label="Câu lạc bộ hoạt động"
          value={number(liveClubs.length)}
          note={`${state.types.length} nhóm lĩnh vực trải nghiệm`}
          icon={UsersRound}
        />
        <StatCard
          label="Nhiệm vụ đang diễn ra"
          value={quests.length}
          note={`${quests.reduce((s, q) => s + q.joined, 0)} lượt đăng ký trong học kỳ`}
          icon={Target}
          tone="purple"
        />
      </div>
      <div className="dashboard-two-col">
        <Panel
          title="Phân bố mức độ gắn kết"
          description={`Sinh viên theo đóng góp đã xác thực · ${seasonLabel(season)}`}
          action={
            <Link className="text-link" to="/ctsv/engagement">
              Chi tiết
              <ArrowUpRight size={15} />
            </Link>
          }
        >
          <div className="engagement-chart">
            <div
              className="donut"
              style={{
                background: `conic-gradient(#ed7133 0deg ${first}deg, #f4b27b ${first}deg ${second}deg, #ebecef ${second}deg 360deg)`,
              }}
              role="img"
              aria-label={`${percent}% sinh viên đã tham gia`}
            >
              <div>
                <strong>
                  {percent}
                  <small>%</small>
                </strong>
                <span>đã tham gia</span>
              </div>
            </div>
            <div className="chart-legend">
              {groups.map((group) => (
                <div key={group.label}>
                  <span className="legend-color" style={{ background: group.color }} />
                  <span>{group.label}</span>
                  <strong>{group.count}</strong>
                  <small>{Math.round((group.count / total) * 100)}%</small>
                </div>
              ))}
              <Link className="chart-insight" to="/ctsv/engagement?group=unengaged">
                <Users size={16} />
                <span>{groups[2].count} sinh viên cần thêm cơ hội kết nối</span>
                <ChevronRight size={15} />
              </Link>
            </div>
          </div>
        </Panel>
        <Panel
          title="Cần bạn xử lý"
          description="Cùng giữ nhịp hoạt động thông suốt"
          action={<Badge tone="orange">{pending.length + cases.length} việc</Badge>}
        >
          <div className="action-list">
            <Link to="/ctsv/clubs?tab=applications">
              <span className="action-icon orange">
                <FileCheck2 size={21} />
              </span>
              <div>
                <strong>Hồ sơ thành lập câu lạc bộ</strong>
                <small>{pending.length} hồ sơ đang chờ phê duyệt</small>
              </div>
              <ChevronRight size={17} />
            </Link>
            <Link to="/ctsv/anomalies">
              <span className="action-icon red">
                <ShieldAlert size={21} />
              </span>
              <div>
                <strong>Báo cáo XP bất thường</strong>
                <small>{cases.length} trường hợp cần xem xét</small>
              </div>
              <ChevronRight size={17} />
            </Link>
            <Link to="/ctsv/quests">
              <span className="action-icon blue">
                <Target size={21} />
              </span>
              <div>
                <strong>Nhiệm vụ chờ công bố</strong>
                <small>
                  {state.quests.filter((q) => q.status === 'draft' && q.season === season).length}{' '}
                  bản nháp trong học kỳ
                </small>
              </div>
              <ChevronRight size={17} />
            </Link>
          </div>
        </Panel>
      </div>
      <div className="dashboard-bottom">
        <Panel
          title="Sức khỏe câu lạc bộ"
          description="Chỉ số gắn kết chuẩn hóa · minh họa"
          action={
            <Link className="text-link" to="/ctsv/clubs">
              Xem tất cả
              <ArrowRight size={14} />
            </Link>
          }
        >
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>CÂU LẠC BỘ</th>
                  <th>THÀNH VIÊN</th>
                  <th>CHỈ SỐ GẮN KẾT</th>
                  <th>TÌNH TRẠNG</th>
                </tr>
              </thead>
              <tbody>
                {liveClubs.slice(0, 4).map((club) => (
                  <tr key={club.id}>
                    <td>
                      <Link className="club-table-name" to={`/ctsv/clubs?club=${club.id}`}>
                        <span
                          className="club-symbol small"
                          style={{ background: `${club.color}16`, color: club.color }}
                        >
                          {club.symbol}
                        </span>
                        <span>
                          <strong>{club.name}</strong>
                          <small>{club.category}</small>
                        </span>
                      </Link>
                    </td>
                    <td>{state.accounts.filter((a) => a.clubIds?.includes(club.id)).length}</td>
                    <td>
                      <div className="table-meter">
                        <span className="meter">
                          <i style={{ width: `${club.health}%`, background: club.color }} />
                        </span>
                        <b>{club.health}</b>
                      </div>
                    </td>
                    <td>
                      <Badge tone={club.health > 60 ? 'green' : 'orange'} dot>
                        {club.health > 60 ? 'Ổn định' : 'Cần quan tâm'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <section className="outreach-card">
          <span className="outreach-icon">
            <UsersRound size={25} />
          </span>
          <div className="eyebrow">KHÔNG AI BỊ BỎ LẠI</div>
          <h2>
            Chủ động kết nối
            <br />
            sinh viên chưa tham gia
          </h2>
          <p>Những trải nghiệm đầu tiên thường bắt đầu từ một lời mời phù hợp.</p>
          <div className="outreach-count">
            <strong>{students.filter((s) => !s.clubIds?.length).length}</strong>
            <span>
              sinh viên chưa
              <br />
              tham gia CLB
            </span>
          </div>
          <Link to="/ctsv/engagement?group=no-club">
            Xem nhóm sinh viên
            <ArrowRight size={16} />
          </Link>
        </section>
      </div>
    </>
  );
}
