import React from 'react';
import PropTypes from 'prop-types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { formatNumber } from './formatters';

const TrendLineChart = ({ data, unit, loading }) => {
  const rows = data ?? [];
  const values = rows.map((r) => r.cumulative);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const range = max - min || 1;

  const points = rows
    .map((row, index) => {
      const x = rows.length === 1 ? 50 : (index / (rows.length - 1)) * 100;
      const y = 100 - ((row.cumulative - min) / range) * 80 - 10;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Net trend</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading trend…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No trend data in this range.</p>
        ) : (
          <div>
            <svg viewBox="0 0 100 100" className="h-40 w-full" preserveAspectRatio="none">
              <polyline
                fill="none"
                stroke="#3b82f6"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
                points={points}
              />
            </svg>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{rows[0]?.date}</span>
              <span>
                Latest cumulative net: {formatNumber(rows[rows.length - 1]?.cumulative)} {unit}
              </span>
              <span>{rows[rows.length - 1]?.date}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

TrendLineChart.propTypes = {
  data: PropTypes.array,
  unit: PropTypes.string.isRequired,
  loading: PropTypes.bool,
};

export default TrendLineChart;
