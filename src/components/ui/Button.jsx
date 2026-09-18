import { LoaderCircle } from 'lucide-react';

export function Button({ children, variant = 'secondary', icon: Icon, busy, className = '', ...props }) {
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