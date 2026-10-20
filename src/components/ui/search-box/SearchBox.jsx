import './SearchBox.css';
import { Search } from 'lucide-react';

export function SearchBox({
  value,
  onChange,
  placeholder = 'Tìm kiếm…',
  label = 'Tìm kiếm',
  className = '',
}) {
  return (
    <label className={`search-box-field ${className}`}>
      <Search size={17} />
      <input
        type="search"
        className="search-box-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
      />
    </label>
  );
}
