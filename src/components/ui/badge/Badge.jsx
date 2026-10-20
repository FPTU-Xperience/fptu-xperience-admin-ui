import './Badge.css';
const TONES = {
  neutral: 'badge-neutral',
  orange: 'badge-orange',
  green: 'badge-green',
  blue: 'badge-blue',
  purple: 'badge-purple',
  red: 'badge-red',
};

export function Badge({ children, tone = 'neutral', dot = false, className = '' }) {
  return (
    <span className={`badge-root ${TONES[tone]} ${className}`}>
      {dot && <i className="badge-dot" />}
      {children}
    </span>
  );
}
