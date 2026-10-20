import './SearchModal.css';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, Compass, Command } from 'lucide-react';
import { Modal } from '../../ui/index.js';
import { normalize } from '../../../utils/format.js';

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
      <div className="search-modal-content">
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
            <Command className="search-modal-command" /> K
          </kbd>
        </div>

        {/* Results */}
        <div className="search-modal-content-2">
          {filtered.length === 0 ? (
            /* Empty state */
            <div className="search-modal-content-3">
              <div className="search-modal-content-4">
                <Compass className="search-modal-compass" />
              </div>
              <p className="search-modal-description">Không tìm thấy kết quả</p>
              <p className="search-modal-description-2">Thử tìm với từ khóa khác</p>
            </div>
          ) : query.trim() ? (
            /* Filtered results - flat list */
            <div className="search-modal-content-5">
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
            <div className="search-modal-content-6">
              {groups.map((group) => (
                <div key={group.label}>
                  <div className="group-header">{group.label}</div>
                  <div className="search-modal-content-5">
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
          <div className="search-modal-content-7">
            <span className="search-modal-text">
              <kbd className="search-modal-shortcut">↑↓</kbd>
              di chuyển
            </span>
            <span className="search-modal-text">
              <kbd className="search-modal-shortcut">↵</kbd>
              chọn
            </span>
          </div>
        )}
      </div>
    </Modal>
  );
}
