import './Field.css';
export function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`field-root ${className}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <small className="field-hint">{hint}</small>}
    </label>
  );
}
