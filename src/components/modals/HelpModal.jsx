import { ArrowRight, BookOpen } from 'lucide-react';
import { Button, Modal } from '../ui/index.js';

export function HelpModal({ onClose }) {
  return (
    <Modal
      title="Chào mừng đến FPTU Xperience"
      description="Hai không gian, một hành trình trải nghiệm sinh viên."
      onClose={onClose}
    >
      <div className="modal-body help-content">
        <BookOpen size={32} />
        <h3>Công tác sinh viên</h3>
        <p>
          Quản lý CLB và hồ sơ thành lập; cấu hình thang XP, học kỳ; tổ chức nhiệm vụ toàn
          trường; theo dõi sinh viên chưa tham gia và xử lý bất thường.
        </p>
        <h3>Admin hệ thống</h3>
        <p>
          Dùng bộ chọn actor ở thanh bên để quản lý tài khoản, thêm hoặc xóa tài khoản, tải mẫu
          và nhập file Excel .xlsx. File được kiểm tra trước khi thêm các dòng hợp lệ.
        </p>
        <div className="info-box">
          Đây là bản thiết kế chạy thử. Dữ liệu mẫu và thay đổi được lưu trên trình duyệt này;
          chưa kết nối hệ thống của trường.
        </div>
      </div>
      <div className="modal-footer">
        <Button variant="primary" onClick={onClose}>
          Bắt đầu khám phá
          <ArrowRight size={15} />
        </Button>
      </div>
    </Modal>
  );
}