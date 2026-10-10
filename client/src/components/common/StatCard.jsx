import React from 'react';
import { TrendingUp, Activity, CheckCircle, Clock } from 'lucide-react';

function Sparkline({ data = [3, 5, 8, 12, 10, 15, 20], color = 'var(--accent)' }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data) || 1;
  const width = 80;
  const height = 28;

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - min) / (max - min || 1)) * (height - 6) - 3;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="sparkline-svg">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

const icons = {
  total: Activity,
  progress: TrendingUp,
  done: CheckCircle,
  pending: Clock,
};

export default function StatCard({ label, value, type = 'total', sparkline }) {
  const IconComp = icons[type] || Activity;
  const colors = {
    total: 'var(--accent)',
    progress: 'var(--column-progress)',
    done: 'var(--status-online)',
    pending: 'var(--status-away)',
  };

  return (
    <div className={`stat-card-modern ${type}`}>
      <div className="stat-card-top">
        <span className="stat-label">{label}</span>
        <div className="stat-icon-wrapper" style={{ background: `${colors[type]}15`, color: colors[type] }}>
          <IconComp size={16} />
        </div>
      </div>

      <div className="stat-card-bottom">
        <div className="stat-value">{value ?? 0}</div>
        {sparkline && <Sparkline data={sparkline} color={colors[type]} />}
      </div>
    </div>
  );
}
