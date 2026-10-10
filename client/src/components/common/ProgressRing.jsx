import React from 'react';

export default function ProgressRing({
  percentage = 60,
  size = 120,
  strokeWidth = 12,
  color = 'var(--accent)',
  trackColor = 'var(--bg-surface-active)',
  label,
  sublabel,
  className = '',
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`progress-ring-container flex items-center gap-4 ${className}`}>
      <div className="progress-ring-svg-wrapper" style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Active progress arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 0.6s ease-in-out',
              transform: 'rotate(-90deg)',
              transformOrigin: '50% 50%',
            }}
          />
        </svg>

        <div
          className="progress-ring-center-text"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            textAlign: 'center',
          }}
        >
          <span className="font-bold text-xl" style={{ color: 'var(--text-primary)', lineHeight: 1 }}>
            {percentage}%
          </span>
        </div>
      </div>

      {(label || sublabel) && (
        <div className="progress-ring-info">
          {label && <h4 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{label}</h4>}
          {sublabel && <p className="text-xs text-muted" style={{ marginTop: 2 }}>{sublabel}</p>}
        </div>
      )}
    </div>
  );
}
