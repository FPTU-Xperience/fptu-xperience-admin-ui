import { ArrowRight, BookOpen, Settings, Users, Shield, FlaskConical } from 'lucide-react';
import { Modal } from '../ui/index.js';

export function HelpModal({ onClose }) {
  return (
    <Modal
      title="Chào mừng đến FPTU Xperience"
      description="Hai không gian, một hành trình trải nghiệm sinh viên."
      onClose={onClose}
    >
      <div className="px-6 py-5">
        {/* Two space cards */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {/* Công tác sinh viên */}
          <div className="space-card">
            <div className="space-card-icon">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="space-card-title">Công tác sinh viên</h3>
            <ul className="space-card-list">
              <li>Quản lý CLB và hồ sơ thành lập</li>
              <li>Cấu hình thang XP, học kỳ</li>
              <li>Tổ chức nhiệm vụ toàn trường</li>
              <li>Theo dõi sinh viên chưa tham gia</li>
              <li>Xử lý bất thường XP</li>
            </ul>
          </div>

          {/* Admin hệ thống */}
          <div className="space-card">
            <div className="space-card-icon admin">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="space-card-title">Admin hệ thống</h3>
            <ul className="space-card-list">
              <li>Quản lý tài khoản người dùng</li>
              <li>Thêm hoặc xóa tài khoản</li>
              <li>Tải mẫu và nhập file Excel</li>
              <li>Kiểm tra dữ liệu trước khi thêm</li>
            </ul>
          </div>
        </div>

        {/* Demo notice */}
        <div className="demo-notice">
          <div className="demo-notice-icon">
            <FlaskConical className="w-4 h-4" />
          </div>
          <div>
            <div className="demo-notice-title">Bản thiết kế chạy thử</div>
            <p className="demo-notice-text">
              Dữ liệu mẫu và thay đổi được lưu trên trình duyệt này; chưa kết nối hệ thống của trường.
            </p>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="px-6 py-4 border-t border-[#e9ebee] bg-[#fafbfc] rounded-b-xl">
        <button
          className="cta-button"
          onClick={onClose}
        >
          <span>Bắt đầu khám phá</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <style>{`
        .space-card {
          padding: 16px;
          background: #fafbfc;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
        }

        .space-card-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: #fef3e8;
          color: #ed641c;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
        }

        .space-card-icon.admin {
          background: #e8f0f5;
          color: #3a7a9a;
        }

        .space-card-title {
          font-size: 13px;
          font-weight: 600;
          color: #26303d;
          margin-bottom: 10px;
        }

        .space-card-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .space-card-list li {
          font-size: 11px;
          color: #6b7280;
          padding-left: 12px;
          position: relative;
          line-height: 1.5;
        }

        .space-card-list li::before {
          content: '';
          position: absolute;
          left: 0;
          top: 6px;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #d1d5db;
        }

        .demo-notice {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 16px;
          background: #fffbeb;
          border: 1px solid #fcd34d;
          border-radius: 10px;
        }

        .demo-notice-icon {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          background: #fef3c7;
          color: #d97706;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .demo-notice-title {
          font-size: 12px;
          font-weight: 600;
          color: #92400e;
          margin-bottom: 2px;
        }

        .demo-notice-text {
          font-size: 11px;
          color: #a16207;
          line-height: 1.5;
          margin: 0;
        }

        .cta-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 12px 20px;
          background: #ed641c;
          color: white;
          font-size: 13px;
          font-weight: 600;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: all 150ms ease;
        }

        .cta-button:hover {
          background: #cb4c0e;
        }

        .cta-button:active {
          transform: scale(0.99);
        }
      `}</style>
    </Modal>
  );
}
