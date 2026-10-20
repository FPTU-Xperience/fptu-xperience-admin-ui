import './Modal.css';
import { useWorkspace } from '../../../context/WorkspaceContext.jsx';
import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { IconButton } from '../button/Button.jsx';

export function Modal({ title, description, children, onClose, wide = false }) {
  const { toast, dismissToast } = useWorkspace() || {};
  const ref = useRef();
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = prev;
    };
  }, []);
  return (
    <dialog
      className={`modal-root ${wide ? 'modal-wide' : ''}`}
      ref={ref}
      aria-labelledby={titleId}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) {
          const r = ref.current.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <div className="modal-content">
        <div>
          <h2 id={titleId} className="modal-heading">
            {title}
          </h2>
          {description && <p className="modal-description">{description}</p>}
        </div>
        <IconButton
          className="modal-icon-button"
          icon={X}
          label="Đóng hộp thoại"
          onClick={onClose}
        />
      </div>
      {toast?.type === 'error' && (
        <div role="alert" className="modal-content-2">
          <p>{toast.message}</p>
          <IconButton icon={X} label="Đóng thông báo lỗi" onClick={dismissToast} />
        </div>
      )}
      {children}
    </dialog>
  );
}
