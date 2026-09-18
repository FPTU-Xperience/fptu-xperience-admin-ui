import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowDownToLine,
  ArrowRight,
  ChevronRight,
  GraduationCap,
  Search,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import { MAJORS, normalize, number, seasonLabel } from '../utils/format.js';
import { createWorkbookBuffer, downloadBuffer } from '../utils/excel.js';
import { studentXP } from '../utils/seed.js';
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

export function Engagement({ reports = false }) {
  const { state, season } = useWorkspace();
  const run = useAction();
  const [params] = useSearchParams();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState(params.get('group') || 'all');
  const [major, setMajor] = useState('all');
  const [cohort, setCohort] = useState('all');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);
  const students = state.accounts.filter((a) => a.role === 'CLUB_MEMBER');
  const threshold = state.seasons.find((s) => s.id === season)?.threshold || 200;
  const filtered = students.filter((s) => {
    const xp = studentXP(s, season, state.ledger);
    return (
      normalize(`${s.fullName} ${s.username} ${s.email}`).includes(normalize(query)) &&
      (major === 'all' || s.major === major) &&
      (cohort === 'all' || s.cohort === cohort) &&
      (group === 'all' ||
        (group === 'unengaged' && xp === 0) ||
        (group === 'no-club' && !s.clubIds?.length) ||
        (group === 'low' && xp < threshold) ||
        (group === 'high' && xp >= 1000))
    );
  });
  useEffect(() => {
    setPage(1);
  }, [query, group, major, cohort, season]);
  useEffect(() => {
    setGroup(params.get('group') || 'all');
  }, [params]);
  const safePage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 8)));
  async function exportData() {
    setBusy(true);
    await run(async () => {
      const buffer = await createWorkbookBuffer(
        'GanKet',
        [
          'MSSV',
          'Họ tên',
          'Email',
          'Ngành',
          'Khóa',
          'Số CLB',
          'Học kỳ',
          'XP đã xác thực',
          'Nhóm gắn kết',
        ],
        filtered.map((s) => {
          const xp = studentXP(s, season, state.ledger);
          return [
            s.username,
            s.fullName,
            s.email,
            s.major || 'Chưa cập nhật',
            s.cohort || 'Chưa cập nhật',
            s.clubIds?.length || 0,
            season,
            xp,
            xp === 0 ? 'Chưa tham gia' : xp < threshold ? 'Cần kết nối' : 'Đang tham gia',
          ];
        }),
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
      <div className="stats-grid three">
        <StatCard
          label="Sinh viên được theo dõi"
          value={students.length}
          note="Bao gồm sinh viên chưa tham gia CLB"
          icon={GraduationCap}
          tone="blue"
        />
        <StatCard
          label="Chưa có đóng góp xác thực"
          value={students.filter((s) => !studentXP(s, season, state.ledger)).length}
          note={`Trong học kỳ ${seasonLabel(season)}`}
          icon={UsersRound}
        />
        <StatCard
          label="Cần thêm cơ hội kết nối"
          value={students.filter((s) => studentXP(s, season, state.ledger) < threshold).length}
          note={`Dưới ngưỡng ${threshold} XP của học kỳ`}
          icon={Sparkles}
          tone="purple"
        />
      </div>
      {reports && (
        <Panel
          title="Độ phủ theo ngành học"
          description="Tỷ lệ sinh viên có ít nhất một đóng góp xác thực trong học kỳ."
        >
          <div className="major-bars">
            {MAJORS.map((m) => {
              const all = students.filter((s) => s.major === m);
              const active = all.filter((s) => studentXP(s, season, state.ledger) > 0).length;
              const ratio = all.length ? Math.round((active / all.length) * 100) : 0;
              return (
                <div key={m}>
                  <span>{m}</span>
                  <div className="meter">
                    <i style={{ width: `${ratio}%` }} />
                  </div>
                  <b>{ratio}%</b>
                  <small>
                    {active}/{all.length} SV
                  </small>
                </div>
              );
            })}
          </div>
        </Panel>
      )}
      <Panel className="student-list">
        <div className="panel-title-row">
          <h2>
            {reports ? 'Dữ liệu xuất báo cáo' : 'Danh sách sinh viên'}{' '}
            <span className="count-pill">{filtered.length}</span>
          </h2>
          <span className="muted">Thay đổi bộ lọc để chọn phạm vi</span>
        </div>
        <div className="table-toolbar wrap">
          <SearchBox value={query} onChange={setQuery} placeholder="Tìm sinh viên, MSSV, email…" />
          <select
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
          <select aria-label="Ngành học" value={major} onChange={(e) => setMajor(e.target.value)}>
            <option value="all">Tất cả ngành</option>
            {MAJORS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <select
            aria-label="Khóa sinh viên"
            value={cohort}
            onChange={(e) => setCohort(e.target.value)}
          >
            <option value="all">Tất cả khóa</option>
            {['K18', 'K19', 'K20'].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        {filtered.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>SINH VIÊN</th>
                  <th>NGÀNH / KHÓA</th>
                  <th>THAM GIA CLB</th>
                  <th>XP HỌC KỲ</th>
                  <th>MỨC ĐỘ</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.slice((safePage - 1) * 8, safePage * 8).map((s) => {
                  const xp = studentXP(s, season, state.ledger);
                  return (
                    <tr key={s.id}>
                      <td>
                        <div className="person-cell">
                          <Avatar name={s.fullName} />
                          <div>
                            <strong>{s.fullName}</strong>
                            <small>{s.username}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        {s.major || 'Chưa cập nhật'}
                        <small className="cell-sub">{s.cohort || 'Chưa cập nhật'}</small>
                      </td>
                      <td>
                        {s.clubIds?.length ? (
                          `${s.clubIds.length} câu lạc bộ`
                        ) : (
                          <span className="muted">Chưa tham gia</span>
                        )}
                      </td>
                      <td>
                        <b>{number(xp)}</b>
                        <span className="muted"> XP</span>
                      </td>
                      <td>
                        <Badge tone={xp >= 1000 ? 'green' : xp > 0 ? 'blue' : 'orange'}>
                          {xp >= 1000 ? 'Gắn kết cao' : xp > 0 ? 'Đang tham gia' : 'Chưa tham gia'}
                        </Badge>
                      </td>
                      <td>
                        <button
                          className="icon-btn"
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
      {detail && (
        <Modal
          title={detail.fullName}
          description={`${detail.username} · ${detail.email}`}
          onClose={() => setDetail(null)}
        >
          <div className="modal-body detail-content">
            <div className="student-xp">
              <Sparkles size={25} />
              <strong>{number(studentXP(detail, season, state.ledger))} XP</strong>
              <span>Đóng góp đã xác thực · {seasonLabel(season)}</span>
            </div>
            <dl>
              <dt>Ngành học</dt>
              <dd>{detail.major || 'Chưa cập nhật'}</dd>
              <dt>Khóa</dt>
              <dd>{detail.cohort || 'Chưa cập nhật'}</dd>
              <dt>Câu lạc bộ</dt>
              <dd>
                {detail.clubIds
                  ?.map((id) => state.clubs.find((c) => c.id === id)?.name)
                  .filter(Boolean)
                  .join(', ') || 'Chưa tham gia câu lạc bộ'}
              </dd>
            </dl>
            <div className="info-box">
              {studentXP(detail, season, state.ledger) < threshold
                ? 'Sinh viên thuộc nhóm cần thêm cơ hội kết nối. Có thể thiết kế nhiệm vụ khám phá phù hợp với ngành học.'
                : 'Sinh viên đã có đóng góp trong học kỳ. Tiếp tục mở rộng cơ hội để duy trì sự gắn kết.'}
            </div>
          </div>
          <div className="modal-footer">
            <Button onClick={() => setDetail(null)}>Đóng</Button>
            <Link to="/ctsv/quests" className="btn primary">
              Xem nhiệm vụ phù hợp
              <ArrowRight size={15} />
            </Link>
          </div>
        </Modal>
      )}
    </>
  );
}
