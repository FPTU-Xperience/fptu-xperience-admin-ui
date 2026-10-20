import './ContextBar.css';
import { CalendarDays } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';

export default function ContextBar({ admin, season, onSeasonChange }) {
  const { state, semesterStatus, retrySemesters } = useWorkspace();
  if (admin) return null;
  return (
    <div className="context-bar-content">
      {semesterStatus === 'error' ? (
        <div role="status" className="context-bar-content-2">
          Không thể tải học kỳ.
          <button type="button" className="context-bar-button" onClick={retrySemesters}>
            Thử lại
          </button>
        </div>
      ) : (
        <label className="context-bar-field">
          <CalendarDays size={15} className="context-bar-calendar-days" aria-hidden="true" />
          <select
            aria-label="Học kỳ đang xem"
            value={season}
            onChange={(event) => onSeasonChange(event.target.value)}
            disabled={semesterStatus !== 'ready'}
            className="context-bar-select"
          >
            {!state.seasons.length && (
              <option value="">
                {semesterStatus === 'loading' ? 'Đang tải học kỳ…' : 'Chưa có học kỳ'}
              </option>
            )}
            {state.seasons.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
