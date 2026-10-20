import './PendingOperation.css';
import '../Operations.css';
import { Link } from 'react-router-dom';
import { Clock3 } from 'lucide-react';
import { Button, Panel } from '../../ui/index.js';

export default function PendingOperation({
  title,
  description,
  steps,
  action,
  children,
  links = [],
}) {
  return (
    <div className="pending-operation-content">
      <div className="operation-notice pending-operation-content-2" role="status">
        <Clock3 className="pending-operation-clock3" size={18} />
        <div>
          <h2>{title}</h2>
          <p className="pending-operation-description">{description}</p>
        </div>
      </div>
      {children}
      <Panel title="Quy trình xử lý">
        <ol className="pending-operation-steps">
          {steps.map((step, index) => (
            <li key={step} className="pending-operation-item">
              <span className="pending-operation-text">{index + 1}.</span>
              <p>{step}</p>
            </li>
          ))}
        </ol>
      </Panel>
      <div className="pending-operation-content-3">
        <Button disabled>{action}</Button>
        {links.map(([to, label]) => (
          <Link key={to} className="operation-link" to={to}>
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
