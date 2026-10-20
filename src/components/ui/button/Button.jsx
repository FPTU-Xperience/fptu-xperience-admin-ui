import './Button.css';
import { LoaderCircle } from 'lucide-react';

const VARIANTS = {
  secondary: 'button-secondary',
  primary: 'button-primary',
  danger: 'button-danger',
  'danger-soft': 'button-danger-soft',
};

export function Button({
  children,
  variant = 'secondary',
  icon: Icon,
  busy,
  className = '',
  ...props
}) {
  return (
    <button
      className={`button-root ${VARIANTS[variant]} ${className}`}
      {...props}
      aria-busy={busy || undefined}
      disabled={props.disabled || busy}
    >
      {busy ? <LoaderCircle className="button-spinner" size={16} /> : Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

export function IconButton({ icon: Icon, label, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`icon-button-root ${className}`}
      title={label}
      aria-label={label}
      {...props}
    >
      <Icon size={17} />
    </button>
  );
}
