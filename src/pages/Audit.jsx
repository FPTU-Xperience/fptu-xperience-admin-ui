import { useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import { date, normalize } from '../utils/format.js';
import { Empty, PageHeader, Pagination, Panel, SearchBox } from '../components/ui/index.js';

export function Audit() {
  const { state } = useWorkspace();
  const [query, setQuery] = useState('');
  const [area, setArea] = useState('all');
  const [page, setPage] = useState(1);
  const filtered = state.audit.filter(
    (a) =>
      (area === 'all' || a.area === area) &&
      normalize(`${a.actor} ${a.action} ${a.detail}`).includes(normalize(query)),
  );
  return (
    <>
      <PageHeader
        eyebrow="THEO DÕI VÀ ĐỐI SOÁT"
        title="Nhật ký hoạt động"
        description="Tra cứu người thực hiện, thời điểm và nội dung mỗi thay đổi trong bản mẫu."
      />
      <Panel>
        <div className="table-toolbar">
          <SearchBox
            value={query}
            onChange={(q) => {
              setQuery(q);
              setPage(1);
            }}
            placeholder="Tìm hoạt động, người thực hiện…"
          />
          <select
            aria-label="Lọc khu vực nhật ký"
            value={area}
            onChange={(e) => {
              setArea(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">Tất cả khu vực</option>
            <option value="admin">Quản trị hệ thống</option>
            <option value="affairs">Công tác sinh viên</option>
            <option value="system">Khởi tạo dữ liệu</option>
          </select>
        </div>
        {filtered.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>THỜI GIAN</th>
                  <th>NGƯỜI THỰC HIỆN</th>
                  <th>HOẠT ĐỘNG</th>
                  <th>NỘI DUNG THAY ĐỔI</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice((page - 1) * 8, page * 8).map((a) => (
                  <tr key={a.id}>
                    <td>
                      {date(a.at)}
                      <small className="cell-sub">
                        {new Date(a.at).toLocaleTimeString('vi-VN')}
                      </small>
                    </td>
                    <td>{a.actor}</td>
                    <td>
                      <strong>{a.action}</strong>
                      <small className="cell-sub">
                        {a.area === 'admin'
                          ? 'Quản trị hệ thống'
                          : a.area === 'affairs'
                            ? 'Công tác sinh viên'
                            : 'Hệ thống mẫu'}
                      </small>
                    </td>
                    <td className="wrap-cell">{a.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Chưa có hoạt động phù hợp" />
        )}
        <Pagination page={page} total={filtered.length} onChange={setPage} />
      </Panel>
    </>
  );
}
