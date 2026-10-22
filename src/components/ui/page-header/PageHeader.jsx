import './PageHeader.css';
import { useEmbeddedPage } from '../../workflow/feature-workspace/FeatureWorkspace.jsx';
export function PageHeader({ eyebrow, title, description, children }) {
  const Heading = useEmbeddedPage() ? 'h2' : 'h1';
  return (
    <div className="page-header-content">
      <div className="page-header-content-2">
        {eyebrow && <div className="page-header-content-3">{eyebrow}</div>}
        <Heading className="page-header-title">{title}</Heading>
        <p className="page-header-description">{description}</p>
      </div>
      <div className="page-header-content-4">{children}</div>
    </div>
  );
}
