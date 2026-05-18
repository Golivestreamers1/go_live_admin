import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Video, AlertCircle } from 'lucide-react';
import dashboardService from '../../services/dashboardService';
import { usePolling } from '../../hooks/usePolling';
import RefreshControl from './RefreshControl';

const Stat = ({ label, value, sub }) => (
  <div className="rounded-md border bg-card p-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <div className="text-lg font-semibold">{value}</div>
    {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
  </div>
);

const AgoraCard = () => {
  const polling = usePolling(() => dashboardService.getAgora(), {
    defaultIntervalMs: 15 * 60_000,
  });
  const { data } = polling;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-muted-foreground" />
            Agora
          </CardTitle>
          <CardDescription>
            Live streaming provider {data?.appId && `· app ${data.appId}`}
          </CardDescription>
        </div>
        <RefreshControl {...polling} />
      </CardHeader>
      <CardContent className="space-y-4">
        {!data ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            {data.local && (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <Stat
                  label="Active Agora streams"
                  value={data.local.activeAgoraStreams.toLocaleString()}
                />
                <Stat
                  label="Streams today"
                  value={data.local.agoraStreamsToday.toLocaleString()}
                />
                <Stat
                  label="Stream minutes (30d)"
                  value={data.local.streamMinutes30d.toLocaleString()}
                  sub="from our DB"
                />
              </div>
            )}
            {!data.configured && (
              <div className="flex items-start gap-3 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                <AlertCircle className="mt-0.5 h-5 w-5" />
                <div>
                  <p className="font-medium text-gray-700">Agora REST analytics not configured</p>
                  <p>{data.message}</p>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AgoraCard;
