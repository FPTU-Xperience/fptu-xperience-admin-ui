import { useNavigate } from 'react-router-dom';
import { ClipboardList, AlertTriangle, Bell, ArrowRight, LogIn } from 'lucide-react';
import { Modal } from '../ui/index.js';

export function NotificationsModal({ admin, pending, anomalies, auditCount, onClose }) {
  const navigate = useNavigate();

  function handleNavigate(path) {
    navigate(path);
    onClose();
  }

  return (
    <Modal
      title="Trung tâm thông báo"
      description="Những việc cần bạn quan tâm trong không gian này."
      onClose={onClose}
    >
      <div className="px-6 py-5">
        {admin ? (
          /* Admin view - audit log info */
          <div className="p-5 rounded-xl bg-[#f5f6f8] border border-[#e5e7eb]">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
                <LogIn className="w-5 h-5 text-[#6b7280]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg font-semibold text-[#26303d]">{auditCount}</span>
                  <span className="text-sm text-[#818794]">hoạt động trong nhật ký</span>
                </div>
                <p className="text-xs text-[#6b7280] leading-relaxed">
                  Bạn có thể xem các thay đổi tài khoản và cấu hình tại mục Nhật ký hoạt động.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Staff view - notification cards */
          <div className="space-y-3">
            {/* Pending clubs */}
            {pending > 0 && (
              <button
                className="notification-card"
                onClick={() => handleNavigate('/ctsv/clubs')}
              >
                <div className="notification-card-icon pending">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div className="notification-card-content">
                  <div className="notification-card-header">
                    <span className="notification-count">{pending}</span>
                    <span className="notification-label">hồ sơ Thành lập CLB</span>
                  </div>
                  <span className="notification-action">Chờ bạn duyệt</span>
                </div>
                <ArrowRight className="w-5 h-5 text-[#9ca3af] shrink-0" />
              </button>
            )}

            {/* XP anomalies */}
            {anomalies > 0 && (
              <button
                className="notification-card"
                onClick={() => handleNavigate('/ctsv/anomalies')}
              >
                <div className="notification-card-icon anomaly">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="notification-card-content">
                  <div className="notification-card-header">
                    <span className="notification-count">{anomalies}</span>
                    <span className="notification-label">bất thường XP</span>
                  </div>
                  <span className="notification-action">Cần được xem xét</span>
                </div>
                <ArrowRight className="w-5 h-5 text-[#9ca3af] shrink-0" />
              </button>
            )}

            {/* Empty state */}
            {pending === 0 && anomalies === 0 && (
              <div className="py-8 text-center">
                <div className="w-14 h-14 rounded-full bg-[#f5f6f8] flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-6 h-6 text-[#9ca3af]" />
                </div>
                <p className="text-sm text-[#6b7280]">Không có thông báo nào</p>
                <p className="text-xs text-[#9ca3af] mt-1">Mọi thứ đã được xử lý xong</p>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .notification-card {
          display: flex;
          align-items: center;
          gap: 14px;
          width: 100%;
          padding: 14px 16px;
          background: #fafbfc;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          cursor: pointer;
          transition: all 150ms ease;
          text-align: left;
        }

        .notification-card:hover {
          background: #fff;
          border-color: #d1d5db;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .notification-card:active {
          transform: scale(0.99);
        }

        .notification-card-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .notification-card-icon.pending {
          background: #fef3e8;
          color: #ed641c;
        }

        .notification-card-icon.anomaly {
          background: #fef3e8;
          color: #d97706;
        }

        .notification-card-content {
          flex: 1;
          min-width: 0;
        }

        .notification-card-header {
          display: flex;
          align-items: baseline;
          gap: 6px;
        }

        .notification-count {
          font-size: 20px;
          font-weight: 700;
          color: #26303d;
          line-height: 1;
        }

        .notification-label {
          font-size: 13px;
          font-weight: 500;
          color: #26303d;
        }

        .notification-action {
          font-size: 11px;
          color: #818794;
          margin-top: 2px;
          display: block;
        }
      `}</style>
    </Modal>
  );
}
