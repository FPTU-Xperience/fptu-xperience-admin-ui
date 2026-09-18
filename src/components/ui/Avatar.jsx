import { initials } from '../../utils/format.js';

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