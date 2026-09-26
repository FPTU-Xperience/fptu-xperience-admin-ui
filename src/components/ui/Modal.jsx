import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './Button.jsx';

export function Modal({ title, description, children, onClose, wide = false }) {
  const ref = useRef();
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = prev;
    };
  }, []);
  return (
    <dialog
      className={`border border-[#eceef2] p-0 bg-white rounded-xl sm:rounded-[14px] w-[560px] max-w-[calc(100vw-20px)] sm:max-w-[calc(100vw-30px)] max-h-[94dvh] sm:max-h-[90dvh] shadow-modal text-ink [&::backdrop]:bg-[#27334366] [&::backdrop]:backdrop-blur-[3px] ${
        wide ? 'sm:w-[790px]' : ''
      }`}
      ref={ref}
      aria-labelledby={titleId}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) {
          const r = ref.current.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <div className="px-[18px] pt-[22px] pb-[17px] sm:px-[26px] sm:pt-6 sm:pb-5 flex items-start justify-between gap-[15px] border-b border-border">
        <div>
          <h2 id={titleId} className="text-[16px] sm:text-[18px] font-semibold tracking-[-0.5px]">
            {title}
          </h2>
          {description && (
            <p className="text-[11px] text-[#9ca5b2] leading-[1.7] mt-2">{description}</p>
          )}
        </div>
        <IconButton
          className="mt-[-5px] mr-[-9px]"
          icon={X}
          label="Đóng hộp thoại"
          onClick={onClose}
        />
      </div>
      {children}
    </dialog>
  );
}
