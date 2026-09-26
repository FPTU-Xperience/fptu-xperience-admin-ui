import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IconButton } from './Button.jsx';

export function Pagination({ page, total, pageSize = 8, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex justify-between items-center border-t border-border text-[#a1a7b1] text-[10px] sm:text-[10.5px] px-[15px] sm:px-5 py-[15px]">
      <span>
        {total ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)}` : '0'} trên{' '}
        <b className="font-medium text-[#818996]">{total}</b> kết quả
      </span>
      <div className="flex items-center gap-2 sm:gap-3">
        <IconButton
          className="border border-border h-[25px] w-[25px]"
          icon={ChevronLeft}
          label="Trang trước"
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
        />
        <span>
          Trang {page} / {pages}
        </span>
        <IconButton
          className="border border-border h-[25px] w-[25px]"
          icon={ChevronRight}
          label="Trang sau"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        />
      </div>
    </div>
  );
}
