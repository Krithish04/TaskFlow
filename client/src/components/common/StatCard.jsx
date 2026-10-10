import React from 'react';
import Sparkline from './Sparkline';

export default function StatCard({
  label,
  value,
  delta,
  deltaType = 'positive', // 'positive' | 'negative' | 'danger'
  sparkline = [2, 4, 3, 6, 5, 8],
  sparklineColor = 'var(--accent)',
  className = '',
}) {
  const deltaColorClass =
    deltaType === 'danger'
      ? 'text-danger'
      : deltaType === 'negative'
      ? 'text-success'
      : 'text-success';

  return (
    <div className={`stat-card-modern ${className}`}>
      <div className="stat-card-top">
        <span className="stat-label">{label}</span>
      </div>

      <div className="stat-card-middle my-1">
        <span className="stat-value">{value ?? 0}</span>
      </div>

      <div className="stat-card-bottom flex items-center justify-between">
        {delta ? (
          <span className={`stat-delta-text text-xs font-semibold ${deltaColorClass}`}>
            {delta}
          </span>
        ) : (
          <span />
        )}

        {sparkline && sparkline.length > 1 && (
          <Sparkline data={sparkline} color={sparklineColor} width={76} height={24} />
        )}
      </div>
    </div>
  );
}
