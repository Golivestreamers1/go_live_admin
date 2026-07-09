import React from 'react';
import PropTypes from 'prop-types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { formatNumber } from './formatters';

const DailyFlowChart = ({ data, unit, loading }) => {
  const rows = data ?? [];
  const maxValue = Math.max(1, ...rows.flatMap((r) => [r.received, r.spent]));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Daily flow</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading daily flow…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No {unit} activity in this range.</p>
        ) : (
          <div className="max-h-72 space-y-2 overflow-auto pr-1">
            {rows.map((row) => (
              <div key={row.date} className="space-y-1 border-b border-dashed pb-2 last:border-0">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-900">{row.date}</span>
                  <span className="text-muted-foreground">
                    Net {formatNumber(row.net)} {unit}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="w-14 text-emerald-700">Received</span>
                    <div className="h-2 flex-1 rounded bg-muted">
                      <div
                        className="h-2 rounded bg-emerald-500"
                        style={{ width: `${(row.received / maxValue) * 100}%` }}
                      />
                    </div>
                    <span className="w-16 text-right">{formatNumber(row.received)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="w-14 text-red-700">Spent</span>
                    <div className="h-2 flex-1 rounded bg-muted">
                      <div
                        className="h-2 rounded bg-red-400"
                        style={{ width: `${(row.spent / maxValue) * 100}%` }}
                      />
                    </div>
                    <span className="w-16 text-right">{formatNumber(row.spent)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

DailyFlowChart.propTypes = {
  data: PropTypes.array,
  unit: PropTypes.string.isRequired,
  loading: PropTypes.bool,
};

export default DailyFlowChart;
