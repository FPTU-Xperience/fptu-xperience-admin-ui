import './StatCard.css';
import { ArrowUpRight } from 'lucide-react';

const TONES = {
  orange: 'stat-card-orange',
  blue: 'stat-card-blue',
  green: 'stat-card-green',
  purple: 'stat-card-purple',
  red: 'stat-card-red',
};

export function StatCard({ label, value, note, icon: Icon, tone = 'orange', change }) {
  return (
    <div className="stat-card-root">
      <div className="stat-card-header">
        <span>{label}</span>
        <span className={`stat-card-icon ${TONES[tone]}`}>
          <Icon size={19} />
        </span>
      </div>
      <strong className="stat-card-value">{value}</strong>
      <div className="stat-card-meta">
        {change && (
          <span className="stat-card-change">
            <ArrowUpRight size={13} />
            {change}
          </span>
        )}
        {note}
      </div>
    </div>
  );
}
