import { ArrowUpRight } from 'lucide-react';

export function StatCard({ label, value, note, icon: Icon, tone = 'orange', change }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <span className={`stat-icon ${tone}`}>
          <Icon size={19} />
        </span>
      </div>
      <strong>{value}</strong>
      <div className="stat-note">
        {change && (
          <span>
            <ArrowUpRight size={13} />
            {change}
          </span>
        )}
        {note}
      </div>
    </div>
  );
}