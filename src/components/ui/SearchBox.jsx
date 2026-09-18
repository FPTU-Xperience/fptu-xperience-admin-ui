import { Search } from 'lucide-react';

export function SearchBox({ value, onChange, placeholder = 'Tìm kiếm…', label = 'Tìm kiếm' }) {
  return (
    <label className="search-box">
      <Search size={17} />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
      />
    </label>
  );
}