const TONES = {
  neutral: 'bg-[#f2f3f5] text-[#788290]',
  orange: 'bg-[#fff0e5] text-[#b16b36]',
  green: 'bg-[#edf8f2] text-green',
  blue: 'bg-[#eef4fd] text-[#4d78a6]',
  purple: 'bg-[#f4eefb] text-[#8763aa]',
  red: 'bg-[#fff0ee] text-[#d06b63]',
};

export function Badge({ children, tone = 'neutral', dot = false, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-[5px] rounded-sm px-[7px] py-1 text-[10px] 3xl:text-[11px] font-medium whitespace-nowrap leading-[1.5] ${TONES[tone]} ${className}`}
    >
      {dot && <i className="w-1 h-1 rounded-full bg-current" />}
      {children}
    </span>
  );
}
