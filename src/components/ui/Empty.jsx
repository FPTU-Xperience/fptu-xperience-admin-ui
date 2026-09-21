import { Inbox } from 'lucide-react';

export function Empty({ title = 'Chưa có dữ liệu', description = 'Thử thay đổi bộ lọc hoặc thêm dữ liệu mới.', children }) {
  return (
    <div className="py-[55px] px-5 text-center text-[#c5c9d0]">
      <Inbox size={32} className="mb-[13px] mx-auto" />
      <h3 className="text-[#737d8b] text-[13px]">{title}</h3>
      <p className="text-[#a3a9b2] text-[11px] mt-2">{description}</p>
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
