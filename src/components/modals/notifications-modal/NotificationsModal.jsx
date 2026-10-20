import './NotificationsModal.css';
import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import api from '../../../services/api.js';
import { Button, Empty, Modal } from '../../ui/index.js';
import { date } from '../../../utils/format.js';

export function NotificationsModal({ onClose }) {
  const [result, setResult] = useState({ status: 'loading', items: [] });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    setResult({ status: 'loading', items: [] });
    api.notifications
      .list()
      .then((payload) => {
        if (!active) return;
        const items = Array.isArray(payload) ? payload : payload?.items || [];
        setResult({ status: items.length ? 'ready' : 'empty', items });
      })
      .catch(() => {
        if (active) setResult({ status: 'error', items: [] });
      });
    return () => {
      active = false;
    };
  }, [version]);

  return (
    <Modal
      title="Thông báo"
      description="Thông báo từ hệ thống dành cho tài khoản của bạn."
      onClose={onClose}
    >
      <div className="notifications-modal-content">
        {result.status === 'loading' && (
          <p role="status" className="notifications-modal-description">
            Đang tải thông báo…
          </p>
        )}
        {result.status === 'error' && (
          <Empty title="Không thể tải thông báo" description="Vui lòng thử lại.">
            <Button onClick={() => setVersion((value) => value + 1)}>Thử lại</Button>
          </Empty>
        )}
        {result.status === 'empty' && (
          <Empty
            title="Chưa có thông báo"
            description="Các cập nhật từ hệ thống sẽ xuất hiện tại đây."
          />
        )}
        {result.status === 'ready' && (
          <ul className="notifications-modal-list">
            {result.items.map((item) => (
              <li key={item.id || item.notificationId} className="notifications-modal-item">
                <Bell size={18} className="notifications-modal-bell" aria-hidden="true" />
                <div className="notifications-modal-content-2">
                  <h3>{item.title || item.subject || 'Cập nhật'}</h3>
                  <p className="notifications-modal-description-2">
                    {item.message || item.content}
                  </p>
                  <time className="notifications-modal-time">
                    {date(item.createdAtUtc || item.createdAt)}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
