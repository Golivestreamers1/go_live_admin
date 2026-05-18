import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';

const OPTIONS = [
  { value: 0, label: 'Off' },
  { value: 30_000, label: '30s' },
  { value: 60_000, label: '1m' },
  { value: 5 * 60_000, label: '5m' },
  { value: 15 * 60_000, label: '15m' },
];

const formatAgo = (ts) => {
  if (!ts) return 'never';
  const sec = Math.floor((Date.now() - ts.getTime()) / 1000);
  if (sec < 5) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
};

const RefreshControl = ({
  intervalMs,
  setIntervalMs,
  refresh,
  isLoading,
  lastUpdatedAt,
  isStale,
}) => {
  // tick once a second so the "X seconds ago" label updates
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`text-xs ${isStale ? 'text-amber-600' : 'text-muted-foreground'}`}>
        {isStale ? 'stale · ' : ''}updated {formatAgo(lastUpdatedAt)}
      </span>
      <select
        value={intervalMs}
        onChange={(e) => setIntervalMs(Number(e.target.value))}
        className="rounded-md border border-input bg-background px-2 py-1 text-xs"
        title="Auto-refresh interval"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.value === 0 ? 'Off' : `Every ${o.label}`}
          </option>
        ))}
      </select>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={refresh}
        disabled={isLoading}
        className="h-8"
      >
        <RefreshCw className={`mr-1 h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
    </div>
  );
};

export default RefreshControl;
