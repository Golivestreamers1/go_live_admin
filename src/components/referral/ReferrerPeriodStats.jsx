import { cn } from '../../lib/utils';
import { formatStatsRangeUtc, normalizeReferrerSummary } from './referralDisplay';

const fmtNum = (n, { allowNull = false } = {}) => {
  if (n == null || n === '') return allowNull ? '—' : '0';
  if (Number.isNaN(Number(n))) return '—';
  return Number(n).toLocaleString();
};

function StatLine({ label, value, tone }) {
  return (
    <div className="flex justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-semibold tabular-nums', tone)}>{value}</span>
    </div>
  );
}

function PeriodCard({ title, subtitle, range, stats, active, onSelect }) {
  const s = normalizeReferrerSummary(stats) || {
    count: 0,
    rubies: 0,
    rewardedCount: 0,
    linkedCount: 0,
    pendingCount: null,
  };

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'text-left rounded-lg border p-3 min-w-[200px] flex-1 transition-colors',
        active
          ? 'border-primary ring-1 ring-primary/30 bg-primary/5'
          : 'border-border bg-card hover:bg-muted/40',
      )}
    >
      <p className="text-sm font-semibold">{title}</p>
      {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
      <p className="text-[10px] text-muted-foreground mt-1 leading-snug" title={formatStatsRangeUtc(range)}>
        {formatStatsRangeUtc(range)}
      </p>
      <div className="mt-3 space-y-1.5 border-t pt-2">
        <StatLine label="Linked" value={fmtNum(s.count)} />
        <StatLine label="Paid" value={fmtNum(s.rewardedCount)} tone="text-emerald-700" />
        <StatLine label="0 rubies" value={fmtNum(s.linkedCount)} tone="text-amber-800" />
        <StatLine
          label="Pending"
          value={fmtNum(s.pendingCount, { allowNull: true })}
          tone="text-amber-700"
        />
        <StatLine label="Rubies paid" value={fmtNum(s.rubies)} tone="text-rose-700" />
      </div>
      {active && (
        <p className="text-[10px] text-primary mt-2 font-medium">Table uses this period</p>
      )}
    </button>
  );
}

export function ReferrerPeriodStats({ breakdown, listPeriod, onSelectListPeriod }) {
  if (!breakdown) return null;

  const cards = [
    {
      key: 'calendar_month',
      title: 'This month',
      subtitle: breakdown.calendarMonth?.label,
      range: breakdown.calendarMonth?.range,
      stats: breakdown.calendarMonth?.stats,
    },
    {
      key: 'calendar_year',
      title: 'This year',
      subtitle: breakdown.calendarYear?.label,
      range: breakdown.calendarYear?.range,
      stats: breakdown.calendarYear?.stats,
    },
    {
      key: 'all_time',
      title: 'All time',
      subtitle: 'Lifetime',
      range: breakdown.allTime?.range,
      stats: breakdown.allTime?.stats,
    },
    {
      key: 'selected',
      title: 'Page filter',
      subtitle: breakdown.selected?.label || 'Same as referrals page',
      range: breakdown.selected?.range,
      stats: breakdown.selected?.stats,
    },
  ];

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Statistics by period (UTC) — click a card to filter the table below
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 overscroll-x-contain">
        {cards.map((c) => (
          <PeriodCard
            key={c.key}
            title={c.title}
            subtitle={c.subtitle}
            range={c.range}
            stats={c.stats}
            active={listPeriod === c.key}
            onSelect={() => onSelectListPeriod?.(c.key)}
          />
        ))}
      </div>
    </div>
  );
}

export default ReferrerPeriodStats;
