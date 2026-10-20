import './OperationState.css';
import { Button } from '../../ui/index.js';

export function OperationState({ loading, error, empty, onRetry, children }) {
  if (loading)
    return (
      <p className="operation-state-description" role="status">
        Đang tải dữ liệu…
      </p>
    );
  if (error)
    return (
      <div className="operation-state-content" role="alert">
        <p>{error.message || error}</p>
        {onRetry && <Button onClick={onRetry}>Thử lại</Button>}
      </div>
    );
  if (empty)
    return <p className="operation-state-description">Không có hồ sơ phù hợp với bộ lọc.</p>;
  return children;
}

export function PageNavigation({ page, totalPages, total, onChange, disabled }) {
  return (
    <nav aria-label="Phân trang hồ sơ" className="operation-state-navigation">
      <span>
        {total} hồ sơ · Trang {page}/{totalPages}
      </span>
      <div className="operation-state-content-2">
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
