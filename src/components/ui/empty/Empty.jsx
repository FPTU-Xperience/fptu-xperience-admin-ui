import './Empty.css';
import { Inbox } from 'lucide-react';

export function Empty({
  title = 'Chưa có dữ liệu',
  description = 'Thử thay đổi bộ lọc hoặc thêm dữ liệu mới.',
  children,
}) {
  return (
    <div className="empty-content">
      <Inbox size={32} className="empty-inbox" />
      <h3 className="empty-subheading">{title}</h3>
      <p className="empty-description">{description}</p>
      {children && <div className="empty-content-2">{children}</div>}
    </div>
  );
}
