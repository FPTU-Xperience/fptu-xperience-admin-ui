import './WorkflowPrimitives.css';
import { ACTIVITY_STATES } from '../../../workflows/workflow-model.js';

export function WorkflowGrid({ children }) {
  return <div className="workflow-grid">{children}</div>;
}
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
export function WorkflowHistory({ rows }) {
  return (
    <ol className="workflow-history">
      {rows.length ? (
        rows.map((row) => (
          <li key={row.id}>
            <strong>{row.text || row.reason || row.kind}</strong>
            <span>
              {row.actor || 'Mô phỏng'} ·{' '}
              {new Date(row.at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
            </span>
          </li>
        ))
      ) : (
        <li>Chưa có thao tác trong phiên này.</li>
      )}
    </ol>
  );
}
export function ActivityProgress({ state }) {
  const stages = ['Kế hoạch', 'Chờ duyệt', 'Thực hiện', 'Chờ quyết toán', 'Hoàn tất'];
  const index = {
    DRAFT: 0,
    REVISION: 0,
    PLAN_REVIEW: 1,
    APPROVED: 2,
    EXECUTING: 2,
    SETTLEMENT_REVIEW: 3,
    COMPLETED: 4,
  }[state];
  return (
    <div>
      <ol className="workflow-progress" aria-label="Tiến trình hoạt động">
        {stages.map((s, i) => (
          <li key={s} aria-current={i === index ? 'step' : undefined} data-done={i < index}>
            <span>{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
      <p className="workflow-status">Trạng thái: {ACTIVITY_STATES[state] || state}</p>
    </div>
  );
}
