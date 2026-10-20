import './Panel.css';
export function Panel({ title, description, action, children, className = '' }) {
  return (
    <section className={`panel-root ${className}`}>
      {title && (
        <div className="panel-header">
          <div>
            <h2 className="panel-heading">{title}</h2>
            {description && <p className="panel-description">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
