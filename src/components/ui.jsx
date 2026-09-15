import { useEffect, useId, useRef } from 'react';
import {
  ArrowDownToLine,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Inbox,
  LoaderCircle,
} from 'lucide-react';
import { useWorkspace } from '../lib/store.jsx';
import { initials } from '../lib/data.js';

export function Button({
  children,
  variant = 'secondary',
  icon: Icon,
  busy,
  className = '',
  ...props
}) {
  return (
    <button className={`btn ${variant} ${className}`} {...props} disabled={props.disabled || busy}>
      {busy ? <LoaderCircle className="spin" size={16} /> : Icon && <Icon size={16} />}
      {children}
    </button>
  );
}
export function IconButton({ icon: Icon, label, ...props }) {
  return (
    <button type="button" className="icon-btn" title={label} aria-label={label} {...props}>
      <Icon size={17} />
    </button>
  );
}
export function PageHeader({ eyebrow, title, description, children }) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
export function Badge({ children, tone = 'neutral', dot = false }) {
  return (
    <span className={`badge ${tone}`}>
      {dot && <i />}
      {children}
    </span>
  );
}
export function Avatar({ name, color, size = '' }) {
  return (
    <span
      className={`avatar ${size}`}
      style={color ? { color, background: `${color}16` } : undefined}
    >
      {initials(name || 'Tài khoản')}
    </span>
  );
}
export function StatCard({ label, value, note, icon: Icon, tone = 'orange', change }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <span className={`stat-icon ${tone}`}>
          <Icon size={19} />
        </span>
      </div>
      <strong>{value}</strong>
      <div className="stat-note">
        {change && (
          <span>
            <ArrowUpRight size={13} />
            {change}
          </span>
        )}
        {note}
      </div>
    </div>
  );
}
export function SearchBox({ value, onChange, placeholder = 'Tìm kiếm…', label = 'Tìm kiếm' }) {
  return (
    <label className="search-box">
      <Search size={17} />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
      />
    </label>
  );
}
export function Tabs({ items, active, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {items.map((item) => (
        <button
          type="button"
          role="tab"
          aria-selected={active === item.id}
          key={item.id}
          className={active === item.id ? 'active' : ''}
          onClick={() => onChange(item.id)}
        >
          {item.label}
          {item.count !== undefined && <span>{item.count}</span>}
        </button>
      ))}
    </div>
  );
}
export function Empty({
  title = 'Chưa có dữ liệu',
  description = 'Thử thay đổi bộ lọc hoặc thêm dữ liệu mới.',
  children,
}) {
  return (
    <div className="empty">
      <Inbox size={32} />
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function Panel({ title, description, action, children, className = '' }) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <div className="panel-heading">
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`field ${className}`}>
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Modal({ title, description, children, onClose, wide = false }) {
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
      className={`modal ${wide ? 'wide' : ''}`}
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
      <div className="modal-heading">
        <div>
          <h2 id={titleId}>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        <IconButton icon={X} label="Đóng hộp thoại" onClick={onClose} />
      </div>
      {children}
    </dialog>
  );
}
export function Pagination({ page, total, pageSize = 8, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="pagination">
      <span>
        {total ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)}` : '0'} trên{' '}
        <b>{total}</b> kết quả
      </span>
      <div>
        <IconButton
          icon={ChevronLeft}
          label="Trang trước"
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
        />
        <span>
          Trang {page} / {pages}
        </span>
        <IconButton
          icon={ChevronRight}
          label="Trang sau"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        />
      </div>
    </div>
  );
}
export function useAction() {
  const { notify } = useWorkspace();
  return async (fn, success) => {
    try {
      await fn();
      if (success) notify(success);
      return true;
    } catch (error) {
      notify(error.message || 'Không thể thực hiện. Vui lòng thử lại.', 'error');
      return false;
    }
  };
}
export { ArrowDownToLine };
