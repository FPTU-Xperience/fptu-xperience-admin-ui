export function Tabs({ items, active, onChange }) {
  return (
    <div
      className="flex gap-[17px] sm:gap-6 px-[17px] sm:px-[22px] border-b border-border overflow-x-auto"
      role="tablist"
    >
      {items.map((item) => (
        <button
          type="button"
          role="tab"
          aria-selected={active === item.id}
          key={item.id}
          className={`border-0 bg-transparent pt-[14px] pb-[13px] text-[10px] sm:text-[11.5px] whitespace-nowrap flex items-center gap-[7px] font-[450] border-b-2 ${
            active === item.id ? 'border-accent text-accent' : 'border-transparent text-[#758293]'
          }`}
          onClick={() => onChange(item.id)}
        >
          {item.label}
          {item.count !== undefined && (
            <span
              className={`px-[5px] py-[2px] min-w-[18px] rounded text-[9.5px] text-center ${
                active === item.id ? 'bg-[#fff0e5] text-[#d78048]' : 'bg-[#f0f2f5] text-[#9ba3ae]'
              }`}
            >
              {item.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
