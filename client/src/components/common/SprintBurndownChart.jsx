import React from 'react';

export default function SprintBurndownChart({
  actualData = [60, 54, 48, 42, 32, 20, 16],
  idealData = [60, 50, 40, 30, 20, 10, 0],
  days = ['Day 1', '3', '5', '7', '9', 'Day 14'],
  height = 220,
}) {
  const width = 500;
  const paddingLeft = 40;
  const paddingBottom = 30;
  const paddingTop = 20;
  const paddingRight = 20;

  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  const maxVal = 60;

  const getCoords = (data) =>
    data.map((val, idx) => {
      const x = paddingLeft + (idx / (data.length - 1)) * chartW;
      const y = paddingTop + (1 - val / maxVal) * chartH;
      return { x, y, val };
    });

  const actualPoints = getCoords(actualData);
  const idealPoints = getCoords(idealData);

  const actualPath = actualPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const idealPath = idealPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  const lastActual = actualPoints[actualPoints.length - 1];

  return (
    <div className="burndown-chart-wrapper w-full" style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {/* Y-Axis Grid & Labels */}
        {[60, 40, 20, 0].map((val) => {
          const y = paddingTop + (1 - val / maxVal) * chartH;
          return (
            <g key={val}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={width - paddingRight}
                y2={y}
                stroke="var(--border)"
                strokeDasharray="2 2"
              />
              <text
                x={paddingLeft - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="var(--text-muted)"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* X-Axis Labels */}
        {days.map((day, idx) => {
          const x = paddingLeft + (idx / (days.length - 1)) * chartW;
          return (
            <text
              key={day}
              x={x}
              y={height - 6}
              textAnchor="middle"
              fontSize="11"
              fill="var(--text-muted)"
            >
              {day}
            </text>
          );
        })}

        {/* Ideal Line (Dashed) */}
        <path
          d={idealPath}
          fill="none"
          stroke="var(--text-muted)"
          strokeWidth="2"
          strokeDasharray="4 4"
          opacity="0.6"
        />

        {/* Actual Line (Solid Accent) */}
        <path
          d={actualPath}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* End Point Indicator */}
        {lastActual && (
          <circle
            cx={lastActual.x}
            cy={lastActual.y}
            r="4"
            fill="var(--accent)"
            stroke="var(--bg-surface)"
            strokeWidth="2"
          />
        )}
      </svg>
    </div>
  );
}
