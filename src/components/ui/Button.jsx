import { LoaderCircle } from 'lucide-react';

const VARIANTS = {
  secondary: 'bg-white text-[#626b79] shadow-card hover:enabled:bg-[#f9fafc] hover:enabled:border-[#ccd0d7]',
  primary:
    'bg-accent border-accent text-white shadow-accent hover:enabled:bg-accent-dark hover:enabled:border-accent-dark',
  danger: 'bg-[#d34f4f] text-white border-[#d34f4f]',
  'danger-soft': 'text-[#c25151] bg-[#fff3f2] border-[#f5dbd9]',
};

export function Button({ children, variant = 'secondary', icon: Icon, busy, className = '', ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded min-h-9 px-[13px] py-[9px] leading-[1.25] border border-[#e2e5e9] text-[11px] 3xl:text-[12px] font-semibold whitespace-nowrap transition-[background,box-shadow,border-color] duration-150 disabled:opacity-60 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...props}
      disabled={props.disabled || busy}
    >
      {busy ? <LoaderCircle className="animate-spin" size={16} /> : Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

export function IconButton({ icon: Icon, label, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`h-[30px] w-[30px] bg-transparent rounded-md inline-flex justify-center items-center text-[#9a9faa] hover:enabled:bg-[#f0f2f5] hover:enabled:text-[#596272] disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      title={label}
      aria-label={label}
      {...props}
    >
      <Icon size={17} />
    </button>
  );
}
