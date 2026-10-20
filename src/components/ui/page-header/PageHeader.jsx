import './PageHeader.css';
export function PageHeader({ eyebrow, title, description, children }) {
  return (
    <div className="page-header-content">
      <div className="page-header-content-2">
        {eyebrow && <div className="page-header-content-3">{eyebrow}</div>}
        <h1 className="page-header-title">{title}</h1>
        <p className="page-header-description">{description}</p>
      </div>
      <div className="page-header-content-4">{children}</div>
    </div>
  );
}
