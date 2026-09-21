import { initials } from '../../utils/format.js';

export function Avatar({ name, color, size = '', className = '' }) {
  return (
    <span
      className={`h-[34px] w-[34px] grid place-items-center rounded-full bg-[#eef1f8] text-[#8493b3] text-[11px] font-semibold shrink-0 ${size} ${className}`}
      style={color ? { color, background: `${color}16` } : undefined}
    >
      {initials(name || 'Tài khoản')}
    </span>
  );
}
