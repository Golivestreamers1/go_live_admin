import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Database, Activity } from 'lucide-react';
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

const formatNum = (n) => (n == null ? '—' : Number(n).toLocaleString());

const Stat = ({ label, value, sub }) => (
  <div className="rounded-md border bg-card p-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <div className="text-lg font-semibold">{value}</div>
    {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
  </div>
);

const MongoCard = () => {
  const polling = usePolling(() => dashboardService.getMongo(), {
    defaultIntervalMs: 60_000,
  });
  const { data } = polling;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-muted-foreground" />
            MongoDB
          </CardTitle>
          <CardDescription>
            {data?.host || 'Loading…'}
            {data?.version && ` · v${data.version}`}
          </CardDescription>
        </div>
        <RefreshControl {...polling} />
      </CardHeader>
      <CardContent className="space-y-4">
        {!data ? (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat
                label="Data size"
                value={formatBytes(data.storage?.dataSizeBytes)}
                sub={`indexes ${formatBytes(data.storage?.indexSizeBytes)}`}
              />
              <Stat
                label="Documents"
                value={formatNum(data.storage?.objects)}
                sub={`avg ${formatBytes(data.storage?.avgObjSizeBytes)}`}
              />
              <Stat
                label="Connections"
                value={`${formatNum(data.connections?.current)} / ${formatNum(
                  (data.connections?.current || 0) + (data.connections?.available || 0)
                )}`}
                sub={`active ${formatNum(data.connections?.active)}`}
              />
              <Stat
                label="Replica set"
                value={
                  data.replicaSet ? (
                    <div className="flex items-center gap-1">
                      <span>{data.replicaSet.set}</span>
                      <Badge
                        variant={data.replicaSet.myState === 1 ? 'default' : 'secondary'}
                        className="text-[10px]"
                      >
                        {data.replicaSet.members?.find((m) => m.stateStr)?.stateStr || `state ${data.replicaSet.myState}`}
                      </Badge>
                    </div>
                  ) : (
                    'standalone'
                  )
                }
                sub={
                  data.replicaSet
                    ? `${data.replicaSet.members?.length || 0} member(s)`
                    : null
                }
              />
            </div>

            {data.opcounters && (
              <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
                {['insert', 'query', 'update', 'delete', 'command'].map((k) => (
                  <div key={k} className="rounded-md border bg-card p-3">
                    <p className="text-xs capitalize text-muted-foreground">{k}</p>
                    <p className="font-semibold flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      {formatNum(data.opcounters[k])}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {data.topCollections?.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-700">
                  Top collections by size
                </h4>
                <div className="overflow-hidden rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr className="text-left">
                        <th className="px-3 py-2">Collection</th>
                        <th className="px-3 py-2 text-right">Docs</th>
                        <th className="px-3 py-2 text-right">Size</th>
                        <th className="px-3 py-2 text-right">Index size</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topCollections.map((c) => (
                        <tr key={c.name} className="border-t">
                          <td className="px-3 py-2 font-medium">{c.name}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{formatNum(c.count)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{formatBytes(c.sizeBytes)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{formatBytes(c.indexSizeBytes)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default MongoCard;
