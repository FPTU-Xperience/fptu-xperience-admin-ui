import { CalendarDays } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import { seasonLabel } from '../utils/format.js';

export default function ContextBar({ admin, season, onSeasonChange }) {
  const { state } = useWorkspace();

  return (
    <div className="flex items-center justify-between mb-[23px] min-h-[25px] text-[10.5px] text-[#999da5] gap-[8px]">
      <span className="flex items-center gap-[7px]">
        <span className="w-[5px] h-[5px] bg-[#c6a47e] rounded-full" />
        Bản thiết kế tương tác · Dữ liệu minh họa
      </span>

      {!admin ? (
        <label className="flex items-center gap-[8px] text-[11px] text-[#767e8c]">
          <CalendarDays size={15} />
          <select
            aria-label="Học kỳ đang xem"
            value={season}
            onChange={(e) => onSeasonChange(e.target.value)}
            className="border-0 bg-transparent h-[26px] text-[11px] text-[#646e7b] p-0 pl-0"
          >
            {state.seasons.map((s) => (
              <option key={s.id} value={s.id}>
                Học kỳ {seasonLabel(s.id)}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <span className="text-[10px]">Tài khoản và thay đổi được lưu trên trình duyệt</span>
      )}
    </div>
  );
}
