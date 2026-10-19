import { Button } from '../ui/index.js';

export function OperationState({ loading, error, empty, onRetry, children }) {
  if (loading)
    return (
      <p className="p-6 text-muted" role="status">
        Đang tải dữ liệu…
      </p>
    );
  if (error)
    return (
      <div className="p-6 space-y-3" role="alert">
        <p>{error.message || error}</p>
        {onRetry && <Button onClick={onRetry}>Thử lại</Button>}
      </div>
    );
  if (empty) return <p className="p-6 text-muted">Không có hồ sơ phù hợp với bộ lọc.</p>;
  return children;
}

export function PageNavigation({ page, totalPages, total, onChange, disabled }) {
  return (
    <nav
      aria-label="Phân trang hồ sơ"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4 text-xs"
    >
      <span>
        {total} hồ sơ · Trang {page}/{totalPages}
      </span>
      <div className="flex gap-2">
        <Button disabled={disabled || page <= 1} onClick={() => onChange(page - 1)}>
          Trước
        </Button>
        <Button disabled={disabled || page >= totalPages} onClick={() => onChange(page + 1)}>
          Sau
        </Button>
      </div>
    </nav>
  );
}
