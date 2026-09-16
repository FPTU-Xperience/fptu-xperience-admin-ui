import { Inbox } from 'lucide-react';

export function Empty({ title = 'Chưa có dữ liệu', description = 'Thử thay đổi bộ lọc hoặc thêm dữ liệu mới.', children }) {
  return (
    <div className="empty">
      <Inbox size={32} />
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}