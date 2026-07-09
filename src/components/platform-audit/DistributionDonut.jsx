import React from 'react';
import PropTypes from 'prop-types';
import { formatNumber } from './formatters';

const COLORS = [
  '#3b82f6',
  '#8b5cf6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#06b6d4',
  '#ec4899',
  '#64748b',
];

const DistributionDonut = ({ title, segments, centerLabel, centerValue }) => {
  const filtered = segments.filter((s) => s.value > 0);
  const total = filtered.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="mt-2 text-xs text-muted-foreground">No data in selected range</p>
      </div>
    );
  }

  let gradientParts = [];
  let cursor = 0;
  filtered.forEach((segment, index) => {
    const pct = (segment.value / total) * 100;
    const color = segment.color ?? COLORS[index % COLORS.length];
    gradientParts.push(`${color} ${cursor}% ${cursor + pct}%`);
    cursor += pct;
  });

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative mx-auto h-28 w-28 shrink-0">
        <div
          className="h-full w-full rounded-full"
          style={{ background: `conic-gradient(${gradientParts.join(', ')})` }}
        />
        <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-white text-center">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {centerLabel}
          </span>
          <span className="text-sm font-bold text-gray-900">{centerValue}</span>
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        {filtered.map((segment, index) => {
          const color = segment.color ?? COLORS[index % COLORS.length];
          const pct = Math.round((segment.value / total) * 1000) / 10;
          return (
            <div key={segment.label} className="flex items-center justify-between gap-2 text-xs">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                <span className="truncate text-muted-foreground">{segment.label}</span>
              </div>
              <span className="shrink-0 font-medium text-gray-900">
                {formatNumber(segment.value)} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

DistributionDonut.propTypes = {
  title: PropTypes.string.isRequired,
  segments: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.number.isRequired,
      color: PropTypes.string,
    })
  ).isRequired,
  centerLabel: PropTypes.string.isRequired,
  centerValue: PropTypes.string.isRequired,
};

export default DistributionDonut;
