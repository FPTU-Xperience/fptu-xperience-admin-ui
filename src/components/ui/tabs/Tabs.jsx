import './Tabs.css';
export function Tabs({ items, active, onChange }) {
  return (
    <div className="tabs-content" role="tablist">
      {items.map((item) => (
        <button
          type="button"
          role="tab"
          aria-selected={active === item.id}
          key={item.id}
          className={`tabs-button ${
            active === item.id ? 'tabs-button-state-active' : 'tabs-button-state-inactive'
          }`}
          onClick={() => onChange(item.id)}
        >
          {item.label}
          {item.count !== undefined && (
            <span
              className={`tabs-text ${
                active === item.id ? 'tabs-text-state-active' : 'tabs-text-state-inactive'
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
