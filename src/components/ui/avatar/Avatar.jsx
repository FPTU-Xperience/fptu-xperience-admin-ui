import './Avatar.css';
import { initials } from '../../../utils/format.js';

export function Avatar({ name, color, size = '', className = '' }) {
  return (
    <span
      className={`avatar-root ${size} ${className}`}
      style={color ? { color, background: `${color}16` } : undefined}
    >
      {initials(name || 'Tài khoản')}
    </span>
  );
}
