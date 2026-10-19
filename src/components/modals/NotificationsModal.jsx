import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import api from '../../services/api.js';
import { Button, Empty, Modal } from '../ui/index.js';
import { date } from '../../utils/format.js';

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
      <div className="p-5 sm:p-6">
        {result.status === 'loading' && (
          <p role="status" className="text-muted">
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
          <ul className="divide-y divide-border">
            {result.items.map((item) => (
              <li key={item.id || item.notificationId} className="flex gap-3 py-4">
                <Bell size={18} className="text-accent mt-1" aria-hidden="true" />
                <div className="min-w-0 space-y-1">
                  <h3>{item.title || item.subject || 'Cập nhật'}</h3>
                  <p className="text-sm text-muted break-words">{item.message || item.content}</p>
                  <time className="text-xs text-muted">
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
