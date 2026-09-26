import { useEffect, useState } from 'react';
import api from '../services/api.js';
import { date, normalize } from '../utils/format.js';
import { Empty, PageHeader, Pagination, Panel, SearchBox } from '../components/ui/index.js';

export function Audit() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [query, setQuery] = useState('');
  const [area, setArea] = useState('all');
  const [page, setPage] = useState(1);

  // Fetch audit events from API
  async function fetchAuditLogs() {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/v1/admin/audit-events');
      const data = Array.isArray(response) ? response : response?.items || [];
      setAuditLogs(data.map(mapAuditFromApi));
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
      setError(err.message || 'Không thể tải nhật ký hoạt động');
      // Use empty array instead of local data
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  // Filter logs
  const filtered = auditLogs.filter(
    (a) =>
      (area === 'all' || a.area === area) &&
      normalize(`${a.actor} ${a.action} ${a.detail}`).includes(normalize(query)),
  );

  const safePage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 8)));

  return (
    <>
      <PageHeader
        eyebrow="THEO DÕI VÀ ĐỐI SOÁT"
        title="Nhật ký hoạt động"
        description="Tra cứu người thực hiện, thời điểm và nội dung mỗi thay đổi trong hệ thống."
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

        {/* Error Banner */}
        {error && (
          <div className="px-5 py-3 mb-4 p-[14px] border border-[#f2dfdc] bg-[#fff3f2] text-[#bd7970] rounded-[7px] text-[11px]">
            <span className="mr-2">⚠️</span>
            {error}
            <button className="ml-2 underline hover:no-underline" onClick={fetchAuditLogs}>
              Thử lại
            </button>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-8 text-[#9096a1]">
            <div className="w-5 h-5 border-2 border-[#e1e4e9] border-t-[#ed641c] rounded-full animate-spin mr-2" />
            Đang tải nhật ký...
          </div>
        ) : filtered.length ? (
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
                {filtered.slice((safePage - 1) * 8, safePage * 8).map((a) => (
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
                        {a.area === 'admin'
                          ? 'Quản trị hệ thống'
                          : a.area === 'affairs'
                            ? 'Công tác sinh viên'
                            : a.area || 'Hệ thống'}
                      </span>
                    </td>
                    <td className="px-5 py-[15px] border-b border-[#f0f2f5] last:border-b-0 text-[11px] text-[#727b89] whitespace-normal min-w-[200px] max-w-[400px]">
                      {a.detail || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Chưa có hoạt động phù hợp" description="Nhật ký sẽ được ghi khi có thay đổi trong hệ thống." />
        )}

        <Pagination page={safePage} total={filtered.length} onChange={setPage} />
      </Panel>
    </>
  );
}

// Helper to safely convert any value to a renderable string
function safeString(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    const candidate =
      value.name || value.title || value.label || value.displayName || value.value || fallback;
    return safeString(candidate, fallback);
  }
  return fallback;
}

// Map backend audit event to frontend format
function mapAuditFromApi(event) {
  return {
    id: String(event.id || event.eventId || crypto.randomUUID()),
    at: safeString(event.timestamp || event.createdAt || event.at, new Date().toISOString()),
    actor: safeString(event.actorName || event.actor || event.userEmail, 'System'),
    action: safeString(event.action || event.eventType, 'Unknown'),
    detail: safeString(event.details || event.detail || event.description, ''),
    area: safeString(event.area || event.category, 'system'),
  };
}
