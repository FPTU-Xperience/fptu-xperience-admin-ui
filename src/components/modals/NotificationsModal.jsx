import { useNavigate } from 'react-router-dom';
import { ChevronRight, ClipboardList } from 'lucide-react';
import { Modal } from '../ui/index.js';

export function NotificationsModal({ admin, pending, anomalies, auditCount, onClose }) {
  const navigate = useNavigate();
  return (
    <Modal
      title="Trung tâm thông báo"
      description="Những việc cần bạn quan tâm trong không gian này."
      onClose={onClose}
    >
      <div className="modal-body">
        {admin ? (
          <div className="info-box">
            Có {auditCount} hoạt động trong nhật ký. Bạn có thể xem các thay đổi tài khoản và
            cấu hình tại mục Nhật ký hoạt động.
          </div>
        ) : (
          <>
            {[
              [pending, 'hồ sơ thành lập CLB chờ duyệt', '/ctsv/clubs'],
              [anomalies, 'bất thường XP cần xem xét', '/ctsv/anomalies'],
            ].map(([count, text, path]) => (
              <button
                className="notification-row"
                key={path}
                onClick={() => {
                  navigate(path);
                  onClose();
                }}
              >
                <span className="notification-icon">
                  <ClipboardList size={20} />
                </span>
                <span>
                  <strong>
                    {count} {text}
                  </strong>
                  <small>Chọn để xem và xử lý</small>
                </span>
                <ChevronRight size={18} />
              </button>
            ))}
          </>
        )}
      </div>
    </Modal>
  );
}