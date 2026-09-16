import { CalendarDays } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import { seasonLabel } from '../utils/format.js';

export default function ContextBar({ admin, season, onSeasonChange }) {
  const { state } = useWorkspace();
  return (
    <div className="context-row">
      <span>
        <span className="demo-dot" />
        Bản thiết kế tương tác · Dữ liệu minh họa
      </span>
      {!admin ? (
        <label className="semester-select">
          <CalendarDays size={15} />
          <select
            aria-label="Học kỳ đang xem"
            value={season}
            onChange={(e) => onSeasonChange(e.target.value)}
          >
            {state.seasons.map((s) => (
              <option key={s.id} value={s.id}>
                Học kỳ {seasonLabel(s.id)}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <span className="context-detail">Tài khoản và thay đổi được lưu trên trình duyệt</span>
      )}
    </div>
  );
}