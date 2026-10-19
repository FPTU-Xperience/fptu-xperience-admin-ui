import { Link } from 'react-router-dom';
import { Clock3 } from 'lucide-react';
import { Button, Panel } from '../ui/index.js';

export default function PendingOperation({
  title,
  description,
  steps,
  action,
  children,
  links = [],
}) {
  return (
    <div className="space-y-5">
      <div className="operation-notice flex items-start gap-3" role="status">
        <Clock3 className="shrink-0 mt-1" size={18} />
        <div>
          <h2>{title}</h2>
          <p className="mt-2">{description}</p>
        </div>
      </div>
      {children}
      <Panel title="Quy trình xử lý">
        <ol className="divide-y divide-border">
          {steps.map((step, index) => (
            <li key={step} className="flex items-start gap-3 p-5">
              <span className="text-muted shrink-0">{index + 1}.</span>
              <p>{step}</p>
            </li>
          ))}
        </ol>
      </Panel>
      <div className="flex flex-wrap gap-3 items-center">
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
