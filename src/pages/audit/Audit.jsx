import './Audit.css';
import { useListQuery, usePageBound } from '../../hooks/useListQuery.js';
import { useEffect, useRef, useState } from 'react';
import api from '../../services/api.js';
import { date, normalize } from '../../utils/format.js';
import { Empty, PageHeader, Pagination, Panel, SearchBox } from '../../components/ui/index.js';

export function Audit() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const ticket = useRef(0);

  // Filter state
  const { query, setQuery, area, setArea, page, setPage } = useListQuery({
    query: '',
    area: 'all',
    page: 1,
  });
  usePageBound(page, Math.ceil(total / 8), !loading && !error, setPage);

  // Fetch audit events from API
  async function fetchAuditLogs() {
    const current = ++ticket.current;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/v1/admin/audit-events', {
        page,
        pageSize: 8,
        search: query,
        area,
      });
      if (current !== ticket.current) return;
      const data = Array.isArray(response) ? response : response?.items || [];
      if (Array.isArray(response)) {
        const rows = data
          .map(mapAuditFromApi)
          .filter(
            (row) =>
              (area === 'all' || row.area === area) &&
              normalize(`${row.actor} ${row.action} ${row.detail}`).includes(normalize(query)),
          );
        setTotal(rows.length);
        setAuditLogs(rows.slice((page - 1) * 8, page * 8));
      } else {
        setTotal(response.totalItems ?? response.total ?? data.length);
        setAuditLogs(data.map(mapAuditFromApi));
      }
    } catch (err) {
      if (current !== ticket.current) return;
      console.error('Failed to fetch audit logs:', err);
      setError(err.message || 'Không thể tải nhật ký hoạt động');
      // Use empty array instead of local data
      setAuditLogs([]);
    } finally {
      if (current === ticket.current) setLoading(false);
    }
  }

  useEffect(() => {
    fetchAuditLogs();
    return () => {
      ticket.current++;
    };
  }, [page, query, area]);

  // Filter logs
  const filtered = auditLogs;

  const safePage = Math.min(page, Math.max(1, Math.ceil(total / 8)));

  return (
    <>
      <PageHeader
        eyebrow="THEO DÕI VÀ ĐỐI SOÁT"
        title="Nhật ký hoạt động"
        description="Tra cứu người thực hiện, thời điểm và nội dung mỗi thay đổi trong hệ thống."
      />

      <Panel>
        {/* Toolbar */}
        <div className="audit-content">
          <SearchBox
            value={query}
            onChange={(q) => {
              setQuery(q);
              setPage(1);
            }}
            placeholder="Tìm hoạt động, người thực hiện…"
            className="audit-search-box"
          />
          <select
            className="audit-select"
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

        {/* Error Banner */}
        {error && (
          <div className="audit-content-2">
            <span className="audit-text">⚠️</span>
            {error}
            <button className="audit-button" onClick={fetchAuditLogs}>
              Thử lại
            </button>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="audit-content-3">
            <div className="audit-content-4" />
            Đang tải nhật ký...
          </div>
        ) : filtered.length ? (
          <div className="audit-content-5">
            <table className="audit-table">
              <thead>
                <tr>
                  <th className="audit-column">THỜI GIAN</th>
                  <th className="audit-column">NGƯỜI THỰC HIỆN</th>
                  <th className="audit-column">HOẠT ĐỘNG</th>
                  <th className="audit-column">NỘI DUNG THAY ĐỔI</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id}>
                    <td className="audit-cell">
                      <span className="audit-text-2">{date(a.at)}</span>
                      <span className="audit-text-3">
                        {new Date(a.at).toLocaleTimeString('vi-VN')}
                      </span>
                    </td>
                    <td className="audit-cell-2">{a.actor}</td>
                    <td className="audit-cell">
                      <strong className="audit-value">{a.action}</strong>
                      <span className="audit-text-3">
                        {a.area === 'admin'
                          ? 'Quản trị hệ thống'
                          : a.area === 'affairs'
                            ? 'Công tác sinh viên'
                            : a.area || 'Hệ thống'}
                      </span>
                    </td>
                    <td className="audit-cell-3">{a.detail || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Chưa có hoạt động phù hợp"
            description="Nhật ký sẽ được ghi khi có thay đổi trong hệ thống."
          />
        )}

        <Pagination page={safePage} total={total} onChange={setPage} />
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
