import './WorkflowPrimitives.css';

export function WorkflowActions({ children }) {
  return <div className="workflow-actions">{children}</div>;
}
export function WorkflowBody({ children }) {
  return <div className="workflow-body">{children}</div>;
}
export function WorkflowTable({ columns, children, label }) {
  return (
    <div className="workflow-table-scroll">
      <table className="workflow-table" aria-label={label}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
