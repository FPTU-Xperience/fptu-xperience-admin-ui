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
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 px-[17px] py-[15px]">
          <SearchBox
            value={query}
            onChange={(q) => { setQuery(q); setPage(1); }}
            placeholder="Tìm hoạt động, người thực hiện…"
            className="mr-auto sm:min-w-full sm:max-w-none"
          />
          <select
            className="h-[35px] px-3 border border-[#e1e4e9] rounded-[7px] text-[11px] text-[#718094] bg-white"
            aria-label="Lọc khu vực nhật ký"
            value={area}
            onChange={(e) => { setArea(e.target.value); setPage(1); }}
          >
            <option value="all">Tất cả khu vực</option>
            <option value="admin">Quản trị hệ thống</option>
            <option value="affairs">Công tác sinh viên</option>
            <option value="system">Khởi tạo dữ liệu</option>
          </select>
        </div>

        {/* Table */}
        {filtered.length ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left whitespace-nowrap">
              <thead>
                <tr>
                  <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
                    THỜI GIAN
                  </th>
                  <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
                    NGƯỜI THỰC HIỆN
                  </th>
                  <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
                    HOẠT ĐỘNG
                  </th>
                  <th className="bg-[#fbfcfd] text-[#7b8797] font-medium text-[9.5px] tracking-[0.5px] px-5 py-[13px] border-y border-[#f0f2f5]">
                    NỘI DUNG THAY ĐỔI
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice((page - 1) * 8, page * 8).map((a) => (
                  <tr key={a.id}>
                    <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0">
                      <span className="text-[11px] text-[#727b89]">{date(a.at)}</span>
                      <span className="block text-[10px] text-[#a5acb5] mt-[5px] leading-[1.6]">
                        {new Date(a.at).toLocaleTimeString('vi-VN')}
                      </span>
                    </td>
                    <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0 text-[11px] text-[#727b89]">
                      {a.actor}
                    </td>
                    <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0">
                      <strong className="block text-[11px] font-medium text-[#4a5462]">{a.action}</strong>
                      <span className="block text-[10px] text-[#a5acb5] mt-[5px] leading-[1.6]">
                        {a.area === 'admin' ? 'Quản trị hệ thống' : a.area === 'affairs' ? 'Công tác sinh viên' : 'Hệ thống mẫu'}
                      </span>
                    </td>
                    <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0 text-[11px] text-[#727b89] whitespace-normal min-w-[200px] max-w-[400px]">
                      {a.detail}
                    </td>
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
