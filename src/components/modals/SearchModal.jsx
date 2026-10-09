import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, Compass, Command } from 'lucide-react';
import { Modal } from '../ui/index.js';
import { normalize } from '../../utils/format.js';

export function SearchModal({ nav, onClose }) {
  const [query, setQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return nav;
    return nav.filter((item) => normalize(item.label).includes(normalize(query)));
  }, [nav, query]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Reset focus when results change
  useEffect(() => {
    setFocusedIndex(0);
  }, [filtered.length]);

  // Keyboard navigation
  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[focusedIndex]) {
      handleSelect(filtered[focusedIndex]);
    }
  }

  function handleSelect(item) {
    navigate(item.path);
    onClose();
  }

  // Group nav items by space
  const groups = useMemo(() => {
    const ctsv = filtered.filter((item) => item.path.startsWith('/ctsv'));
    const admin = filtered.filter((item) => item.path.startsWith('/admin'));
    return [
      { label: 'Công tác sinh viên', path: '/ctsv', items: ctsv },
      { label: 'Quản trị hệ thống', path: '/admin', items: admin },
    ].filter((g) => g.items.length > 0);
  }, [filtered]);

  return (
    <Modal
      title="Bạn muốn đến đâu?"
      description="Tìm một chức năng trong không gian đang xem."
      onClose={onClose}
    >
      <div className="px-6 py-5">
        {/* Search input */}
        <div className="search-input-wrapper">
          <Search className="search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập tên chức năng…"
            aria-label="Tìm kiếm chức năng"
          />
          <kbd className="search-kbd">
            <Command className="w-3 h-3" /> K
          </kbd>
        </div>

        {/* Results */}
        <div className="mt-4 max-h-[360px] overflow-y-auto">
          {filtered.length === 0 ? (
            /* Empty state */
            <div className="py-10 text-center">
              <div className="w-14 h-14 rounded-full bg-[#f5f6f8] flex items-center justify-center mx-auto mb-3">
                <Compass className="w-6 h-6 text-[#9ca3af]" />
              </div>
              <p className="text-sm text-[#6b7280]">Không tìm thấy kết quả</p>
              <p className="text-xs text-[#9ca3af] mt-1">
                Thử tìm với từ khóa khác
              </p>
            </div>
          ) : query.trim() ? (
            /* Filtered results - flat list */
            <div className="space-y-1">
              {filtered.map((item, index) => (
                <button
                  key={item.path}
                  className={`search-result ${focusedIndex === index ? 'focused' : ''}`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setFocusedIndex(index)}
                >
                  <div className="search-result-icon">
                    <item.icon size={18} />
                  </div>
                  <span className="search-result-label">{item.label}</span>
                  <span className="search-result-path">{item.path}</span>
                  <ArrowRight className="search-result-arrow" />
                </button>
              ))}
            </div>
          ) : (
            /* Grouped results - initial state */
            <div className="space-y-5">
              {groups.map((group) => (
                <div key={group.label}>
                  <div className="group-header">
                    {group.label}
                  </div>
                  <div className="space-y-1">
                    {group.items.map((item, index) => {
                      const globalIndex = filtered.indexOf(item);
                      return (
                        <button
                          key={item.path}
                          className={`search-result ${focusedIndex === globalIndex ? 'focused' : ''}`}
                          onClick={() => handleSelect(item)}
                          onMouseEnter={() => setFocusedIndex(globalIndex)}
                        >
                          <div className="search-result-icon">
                            <item.icon size={18} />
                          </div>
                          <span className="search-result-label">{item.label}</span>
                          <ArrowRight className="search-result-arrow" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        {filtered.length > 0 && (
          <div className="mt-4 pt-3 border-t border-[#e5e7eb] flex items-center gap-4 text-[10px] text-[#9ca3af]">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-[#f5f6f8] rounded text-[9px]">↑↓</kbd>
              di chuyển
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-[#f5f6f8] rounded text-[9px]">↵</kbd>
              chọn
            </span>
          </div>
        )}
      </div>

      <style>{`
        .search-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon {
          position: absolute;
          left: 14px;
          width: 18px;
          height: 18px;
          color: #9ca3af;
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          height: 48px;
          padding: 0 80px 0 46px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          font-size: 14px;
          color: #26303d;
          background: #fff;
          outline: none;
          transition: border-color 150ms ease, box-shadow 150ms ease;
        }

        .search-input::placeholder {
          color: #9ca3af;
        }

        .search-input:focus {
          border-color: #ed641c;
          box-shadow: 0 0 0 3px rgba(237, 100, 28, 0.1);
        }

        .search-kbd {
          position: absolute;
          right: 12px;
          display: flex;
          align-items: center;
          gap: 2px;
          padding: 4px 8px;
          background: #f5f6f8;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 11px;
          color: #6b7280;
          font-family: inherit;
        }

        .group-header {
          font-size: 10px;
          font-weight: 600;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 0 8px;
          margin-bottom: 6px;
        }

        .search-result {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 10px 12px;
          background: transparent;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          text-align: left;
          transition: background 100ms ease;
        }

        .search-result:hover,
        .search-result.focused {
          background: #fafbfc;
        }

        .search-result-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: #fef3e8;
          color: #ed641c;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .search-result-label {
          flex: 1;
          font-size: 13px;
          font-weight: 500;
          color: #26303d;
        }

        .search-result-path {
          font-size: 10px;
          color: #9ca3af;
          font-family: monospace;
        }

        .search-result-arrow {
          width: 16px;
          height: 16px;
          color: #d1d5db;
          flex-shrink: 0;
          transition: transform 150ms ease, color 150ms ease;
        }

        .search-result:hover .search-result-arrow,
        .search-result.focused .search-result-arrow {
          transform: translateX(2px);
          color: #ed641c;
        }
      `}</style>
    </Modal>
  );
}
