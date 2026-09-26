export function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`flex flex-col gap-2 min-w-0 text-[11px] sm:text-[12px] ${className}`}>
      <span className="text-[11px] font-medium text-[#63738a]">{label}</span>
      {children}
      {hint && <small className="text-[10.5px] text-[#a3aebb] leading-[1.7]">{hint}</small>}
    </label>
  );
}
