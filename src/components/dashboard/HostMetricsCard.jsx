import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Cpu, MemoryStick, HardDrive, Gauge, Server, Activity } from 'lucide-react';
import dashboardService from '../../services/dashboardService';
import { usePolling } from '../../hooks/usePolling';
import RefreshControl from './RefreshControl';

const formatBytes = (bytes) => {
  if (bytes == null) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(n < 10 ? 2 : 1)} ${units[i]}`;
};

const formatUptime = (sec) => {
  if (!sec) return '—';
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const Bar = ({ pct, label, sublabel, tone = 'blue' }) => {
  const safe = Math.max(0, Math.min(100, Number(pct) || 0));
  const toneCls =
    safe > 90
      ? 'bg-red-500'
      : safe > 75
        ? 'bg-amber-500'
        : tone === 'green'
          ? 'bg-emerald-500'
          : 'bg-blue-500';
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="tabular-nums text-muted-foreground">{sublabel}</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full transition-all ${toneCls}`} style={{ width: `${safe}%` }} />
      </div>
    </div>
  );
};

const HostMetricsCard = () => {
  const polling = usePolling(() => dashboardService.getHost(), {
    defaultIntervalMs: 60_000,
  });
  const { data } = polling;

  if (!data) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-muted-foreground" />
              Host Metrics
            </CardTitle>
            <CardDescription>{polling.isStale ? `Stale: ${polling.error}` : 'Loading…'}</CardDescription>
          </div>
          <RefreshControl {...polling} />
        </CardHeader>
      </Card>
    );
  }

  const { cpu, memory, disk, heap, eventLoop, process: proc, hostInfo } = data;
  // Defensive: backend may send null/undefined if its event-loop monitor had no samples
  const loopMeanMs = Number(eventLoop?.meanMs) || 0;
  const loopP99Ms = Number(eventLoop?.p99Ms) || 0;
  const loopOk = loopP99Ms < 200;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-muted-foreground" />
            Host Metrics
          </CardTitle>
          <CardDescription>
            {hostInfo.hostname} · {hostInfo.platform}
          </CardDescription>
        </div>
        <RefreshControl {...polling} />
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Bar
            label={
              <span className="flex items-center gap-2">
                <Cpu className="h-4 w-4" /> CPU load (1m / {cpu.cores} cores)
              </span>
            }
            sublabel={`${cpu.load1} (${cpu.loadPct1}%) · 5m ${cpu.load5} · 15m ${cpu.load15}`}
            pct={cpu.loadPct1}
          />
          <Bar
            label={
              <span className="flex items-center gap-2">
                <MemoryStick className="h-4 w-4" /> RAM
              </span>
            }
            sublabel={`${formatBytes(memory.usedBytes)} / ${formatBytes(memory.totalBytes)} (${memory.usedPct}%)`}
            pct={memory.usedPct}
          />
          <Bar
            label={
              <span className="flex items-center gap-2">
                <Gauge className="h-4 w-4" /> Node heap
              </span>
            }
            sublabel={`${formatBytes(heap.usedBytes)} / ${formatBytes(heap.totalBytes)} · RSS ${formatBytes(heap.rssBytes)}`}
            pct={heap.usedPct}
            tone="green"
          />
          {disk.usedPct != null && (
            <Bar
              label={
                <span className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4" /> Disk (root)
                </span>
              }
              sublabel={`${formatBytes(disk.totalBytes - disk.freeBytes)} / ${formatBytes(disk.totalBytes)} (${disk.usedPct}%)`}
              pct={disk.usedPct}
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Event-loop lag</p>
            <p className={`font-semibold ${loopOk ? 'text-emerald-700' : 'text-red-600'}`}>
              p99 {loopP99Ms.toFixed(2)} ms
            </p>
            <p className="text-xs text-muted-foreground">mean {loopMeanMs.toFixed(2)} ms</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Process uptime</p>
            <p className="font-semibold">{formatUptime(proc.uptimeSec)}</p>
            <p className="text-xs text-muted-foreground">PID {proc.pid}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Node</p>
            <p className="font-semibold">{proc.nodeVersion}</p>
            <p className="text-xs text-muted-foreground">PM2 id {proc.pm2Id ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">System uptime</p>
            <p className="font-semibold">{formatUptime(hostInfo.systemUptimeSec)}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Activity className="h-3 w-3" /> {cpu.model.split('@')[0].trim()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HostMetricsCard;
