import { Search } from 'lucide-react';

export function SearchBox({ value, onChange, placeholder = 'Tìm kiếm…', label = 'Tìm kiếm', className = '' }) {
  return (
    <label
      className={`flex gap-[9px] items-center h-9 border border-[#e7eaee] rounded-md px-[11px] text-[#b0b6bf] bg-white min-w-[150px] max-w-[420px] flex-1 focus-within:outline focus-within:outline-2 focus-within:outline-[#ed641c40] focus-within:outline-offset-1 ${className}`}
    >
      <Search size={17} />
      <input
        type="search"
        className="border-0 !p-0 bg-transparent w-full !h-8 text-[11px] outline-hidden"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
      />
    </label>
  );
}