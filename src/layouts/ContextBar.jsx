import { CalendarDays } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext.jsx';

export default function ContextBar({ admin, season, onSeasonChange }) {
  const { state, semesterStatus, retrySemesters } = useWorkspace();
  if (admin) return null;
  return (
    <div className="flex min-w-0 max-w-[160px] sm:max-w-[200px] items-center gap-2 text-xs text-muted">
      {semesterStatus === 'error' ? (
        <div role="status" className="flex flex-wrap items-center gap-2">
          Không thể tải học kỳ.
          <button type="button" className="underline" onClick={retrySemesters}>
            Thử lại
          </button>
        </div>
      ) : (
        <label className="inline-flex items-center gap-2 min-w-0">
          <CalendarDays size={15} className="shrink-0" aria-hidden="true" />
          <select
            aria-label="Học kỳ đang xem"
            value={season}
            onChange={(event) => onSeasonChange(event.target.value)}
            disabled={semesterStatus !== 'ready'}
            className="min-w-0 max-w-full border-0 bg-transparent text-xs"
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
