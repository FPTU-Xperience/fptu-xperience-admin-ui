import './FeatureWorkspace.css';
import { createContext, useContext } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useWorkspace } from '../../../context/WorkspaceContext.jsx';

export const EmbeddedPageContext = createContext(false);
export const useEmbeddedPage = () => useContext(EmbeddedPageContext);
export function useFeatureView(tabs) {
  const [search] = useSearchParams();
  return tabs.some((tab) => tab.id === search.get('view')) ? search.get('view') : tabs[0].id;
}
export default function FeatureWorkspace({
  title,
  description,
  tabs,
  active,
  tabAction,
  children,
}) {
  const location = useLocation(),
    { season } = useWorkspace();
  return (
    <section className="feature-workspace">
      <header className="feature-workspace-heading">
        <div>
          <p>CÔNG VIỆC THEO QUY TRÌNH</p>
          <h1>{title}</h1>
          <span>{description}</span>
        </div>
        {season && <span className="feature-workspace-semester">Đang xem: {season}</span>}
      </header>
      <nav className="feature-workspace-tabs" aria-label={`Các mục ${title}`}>
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            aria-current={active === tab.id ? 'page' : undefined}
            to={{
              pathname: location.pathname,
              search: new URLSearchParams({ view: tab.id }).toString(),
            }}
          >
            {tab.label}
          </Link>
        ))}
        {tabAction}
      </nav>
      <EmbeddedPageContext.Provider value={true}>
        <div className="feature-workspace-body">{children}</div>
      </EmbeddedPageContext.Provider>
    </section>
  );
}
