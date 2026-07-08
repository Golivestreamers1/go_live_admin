import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';

const CONFIDENCE_STYLES = {
  GREEN: 'bg-green-100 text-green-800 border-green-200',
  YELLOW: 'bg-amber-100 text-amber-800 border-amber-200',
  RED: 'bg-red-100 text-red-800 border-red-200',
};

const CONFIDENCE_FILL = {
  GREEN: '#22c55e',
  YELLOW: '#f59e0b',
  RED: '#ef4444',
};

const fmtUsd = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
    Number(n) || 0
  );

const fmtNum = (n) => Number(n || 0).toLocaleString();

function formatShortDate(runDate) {
  if (!runDate) return '—';
  const [y, m, d] = runDate.split('-').map(Number);
  if (!y || !m || !d) return runDate;
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function ConfidenceTimeline({ snapshots }) {
  const layout = useMemo(() => {
    const n = snapshots.length;
    if (!n) return null;

    const width = 640;
    const height = 132;
    const padX = 28;
    const padTop = 12;
    const barAreaH = 72;
    const gap = n > 14 ? 2 : 4;
    const barW = Math.max(8, (width - padX * 2 - gap * (n - 1)) / n);

    const bars = snapshots.map((row, i) => ({
      key: row.runDate,
      x: padX + i * (barW + gap),
      y: padTop,
      w: barW,
      h: barAreaH,
      fill: CONFIDENCE_FILL[row.confidence] || '#94a3b8',
      label: formatShortDate(row.runDate),
      confidence: row.confidence,
    }));

    return { width, height, bars };
  }, [snapshots]);

  if (!layout) return null;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className="w-full min-w-[320px] max-w-3xl"
        role="img"
        aria-label="Platform confidence by day"
      >
        {layout.bars.map((bar) => (
          <g key={bar.key}>
            <rect
              x={bar.x}
              y={bar.y}
              width={bar.w}
              height={bar.h}
              rx={4}
              fill={bar.fill}
              opacity={0.92}
            >
              <title>{`${bar.label}: ${bar.confidence}`}</title>
            </rect>
            <text
              x={bar.x + bar.w / 2}
              y={bar.y + bar.h + 16}
              textAnchor="middle"
              className="fill-gray-600 text-[10px]"
            >
              {bar.label}
            </text>
          </g>
        ))}
      </svg>
      <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-green-500" /> GREEN
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-amber-500" /> YELLOW
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-red-500" /> RED
        </span>
      </div>
    </div>
  );
}

function MetricSparkline({ snapshots, getValue, stroke, label, formatValue = fmtNum }) {
  const path = useMemo(() => {
    const n = snapshots.length;
    if (n < 2) return null;

    const width = 280;
    const height = 88;
    const pad = 12;
    const values = snapshots.map(getValue);
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;

    const coords = values.map((v, i) => {
      const x = pad + (i / (n - 1)) * (width - pad * 2);
      const y = pad + (1 - (v - min) / range) * (height - pad * 2);
      return { x, y, v };
    });

    const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
    const latest = values[values.length - 1];
    const first = values[0];

    return { width, height, line, coords, latest, first, delta: latest - first };
  }, [snapshots, getValue]);

  if (!path) {
    const only = snapshots.length === 1 ? getValue(snapshots[0]) : null;
    return (
      <div className="rounded-lg border bg-muted/30 p-3">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold tabular-nums mt-1">{formatValue(only ?? 0)}</p>
        <p className="text-xs text-muted-foreground mt-1">Need 2+ daily snapshots for trend line</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold tabular-nums">{formatValue(path.latest)}</p>
      </div>
      <svg viewBox={`0 0 ${path.width} ${path.height}`} className="w-full h-20">
        <path d={path.line} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
        {path.coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r="3" fill={stroke} />
        ))}
      </svg>
      <p className="text-xs text-muted-foreground tabular-nums">
        Change: {path.delta >= 0 ? '+' : ''}
        {formatValue(path.delta)} since first day in view
      </p>
    </div>
  );
}

export default function ReconciliationHistoryTrend({ snapshots = [], days = 30 }) {
  const rows = snapshots;

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-semibold">Daily trend</CardTitle>
        <CardDescription className="text-sm leading-relaxed">
          Nightly snapshots track confidence, referential orphans (I3), and withdraw liability over the
          last {days} days. Schedule{' '}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">npm run snapshot:reconciliation-daily</code>{' '}
          on the backend.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!rows.length ? (
          <p className="text-sm text-muted-foreground py-4">
            No daily snapshots yet. Run the nightly snapshot script twice on different dates to see trends
            here.
          </p>
        ) : (
          <>
            <div>
              <p className="text-sm font-medium text-gray-900 mb-3">Platform confidence</p>
              <ConfidenceTimeline snapshots={rows} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <MetricSparkline
                snapshots={rows}
                label="I3 post-cutoff orphans"
                stroke="#ef4444"
                getValue={(r) => Number(r.i3?.postCutoffOrphans ?? 0)}
              />
              <MetricSparkline
                snapshots={rows}
                label="I3 legacy orphans (pre-cutoff)"
                stroke="#f59e0b"
                getValue={(r) => Number(r.i3?.preCutoffOrphans ?? 0)}
              />
              <MetricSparkline
                snapshots={rows}
                label="Pending withdraw (USD)"
                stroke="#2563eb"
                getValue={(r) => Number(r.withdrawLiability?.pendingUsd ?? 0)}
                formatValue={fmtUsd}
              />
            </div>

            <div>
              <p className="text-sm font-medium text-gray-900 mb-2">Snapshot history</p>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead className="text-right">I3 post</TableHead>
                      <TableHead className="text-right">I3 legacy</TableHead>
                      <TableHead className="text-right">Pending $</TableHead>
                      <TableHead className="text-right">Coin diff</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...rows].reverse().map((row) => (
                      <TableRow key={row.runDate}>
                        <TableCell className="font-medium">{row.runDate}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={CONFIDENCE_STYLES[row.confidence] || ''}>
                            {row.confidence}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fmtNum(row.i3?.postCutoffOrphans)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fmtNum(row.i3?.preCutoffOrphans)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fmtUsd(row.withdrawLiability?.pendingUsd)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fmtNum(row.lifetimeFlow?.coinLifetimeDiff)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
