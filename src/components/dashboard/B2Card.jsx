import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Cloud, AlertCircle } from 'lucide-react';
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

const B2Card = () => {
  // B2 listing is expensive — poll slowly by default (15m)
  const polling = usePolling(() => dashboardService.getB2(), {
    defaultIntervalMs: 15 * 60_000,
  });
  const { data } = polling;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-muted-foreground" />
            Backblaze B2
          </CardTitle>
          <CardDescription>
            {data?.configured
              ? `${data.bucket} · ${data.region}`
              : 'Object storage'}
          </CardDescription>
        </div>
        <RefreshControl {...polling} />
      </CardHeader>
      <CardContent>
        {!data ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !data.configured ? (
          <div className="flex items-start gap-3 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            <AlertCircle className="mt-0.5 h-5 w-5" />
            <div>
              <p className="font-medium text-gray-700">B2 not configured</p>
              <p>{data.message}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-md border bg-card p-3">
                <p className="text-xs text-muted-foreground">Total objects</p>
                <p className="text-lg font-semibold">{data.totalObjects.toLocaleString()}</p>
              </div>
              <div className="rounded-md border bg-card p-3">
                <p className="text-xs text-muted-foreground">Total size</p>
                <p className="text-lg font-semibold">{formatBytes(data.totalBytes)}</p>
              </div>
              <div className="rounded-md border bg-card p-3">
                <p className="text-xs text-muted-foreground">Last scan</p>
                <p className="text-lg font-semibold">{(data.scanDurationMs / 1000).toFixed(1)}s</p>
              </div>
              <div className="rounded-md border bg-card p-3">
                <p className="text-xs text-muted-foreground">Truncated</p>
                <p className="text-lg font-semibold">{data.truncated ? 'Yes' : 'No'}</p>
                {data.truncated && (
                  <p className="text-xs text-amber-600">listing capped — totals are partial</p>
                )}
              </div>
            </div>
            {data.breakdown?.length > 0 && (
              <div className="overflow-hidden rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="px-3 py-2">Prefix</th>
                      <th className="px-3 py-2 text-right">Objects</th>
                      <th className="px-3 py-2 text-right">Size</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.breakdown.map((b) => (
                      <tr key={b.prefix} className="border-t">
                        <td className="px-3 py-2 font-medium">{b.prefix}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{b.count.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatBytes(b.bytes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default B2Card;
