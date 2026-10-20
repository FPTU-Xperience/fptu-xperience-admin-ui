import './Pagination.css';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IconButton } from '../button/Button.jsx';

export function Pagination({ page, total, pageSize = 8, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="pagination-content">
      <span>
        {total ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)}` : '0'} trên{' '}
        <b className="pagination-b">{total}</b> kết quả
      </span>
      <div className="pagination-content-2">
        <IconButton
          className="pagination-icon-button"
          icon={ChevronLeft}
          label="Trang trước"
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
        />
        <span>
          Trang {page} / {pages}
        </span>
        <IconButton
          className="pagination-icon-button"
          icon={ChevronRight}
          label="Trang sau"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        />
      </div>
    </div>
  );
}
