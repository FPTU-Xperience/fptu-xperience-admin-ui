import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Modal, SearchBox } from '../ui/index.js';
import { normalize } from '../../utils/format.js';

export function SearchModal({ nav, onClose }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  return (
    <Modal
      title="Bạn muốn đến đâu?"
      description="Tìm một chức năng trong không gian đang xem."
      onClose={onClose}
    >
      <div className="modal-body">
        <SearchBox value={query} onChange={setQuery} placeholder="Nhập tên chức năng…" />
        {nav
          .filter((item) => normalize(item.label).includes(normalize(query)))
          .map((item) => (
            <button
              className="search-result"
              key={item.path}
              onClick={() => {
                navigate(item.path);
                onClose();
              }}
            >
              <item.icon size={18} />
              {item.label}
              <ArrowRight size={15} />
            </button>
          ))}
      </div>
    </Modal>
  );
}