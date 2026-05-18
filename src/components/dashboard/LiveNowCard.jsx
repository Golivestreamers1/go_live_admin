import React from 'react';
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
import { Radio, Eye, Users, Swords, Boxes } from 'lucide-react';
import dashboardService from '../../services/dashboardService';
import { usePolling } from '../../hooks/usePolling';
import RefreshControl from './RefreshControl';

const formatDuration = (sec) => {
  if (!sec || sec < 0) return '0s';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

const modeBadgeVariant = (mode) => {
  switch (mode) {
    case 'battle':
      return 'destructive';
    case 'box':
      return 'secondary';
    default:
      return 'outline';
  }
};

const StatTile = ({ icon: Icon, label, value, accent }) => (
  <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
    <div className={`flex h-10 w-10 items-center justify-center rounded-md ${accent}`}>
      <Icon className="h-5 w-5" />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold leading-tight">{value}</p>
    </div>
  </div>
);

const LiveNowCard = () => {
  const polling = usePolling(() => dashboardService.getLive(), {
    defaultIntervalMs: 60_000,
  });
  const { data } = polling;

  const tiles = [
    {
      icon: Radio,
      label: 'Active Streams',
      value: data?.activeStreams ?? '—',
      accent: 'bg-red-100 text-red-600',
    },
    {
      icon: Eye,
      label: 'Live Viewers',
      value: data?.liveViewersNow ?? '—',
      accent: 'bg-blue-100 text-blue-600',
    },
    {
      icon: Users,
      label: 'Streamers Online',
      value: data?.streamersOnline ?? '—',
      accent: 'bg-emerald-100 text-emerald-600',
    },
    {
      icon: Swords,
      label: 'Battles',
      value: data?.battlesInProgress ?? '—',
      accent: 'bg-amber-100 text-amber-600',
    },
    {
      icon: Boxes,
      label: 'Box Parties',
      value: data?.boxPartiesInProgress ?? '—',
      accent: 'bg-violet-100 text-violet-600',
    },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            Live Now
          </CardTitle>
          <CardDescription>Realtime streams and viewers</CardDescription>
        </div>
        <RefreshControl {...polling} />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {tiles.map((t) => (
            <StatTile key={t.label} {...t} />
          ))}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-700">Top Live Streams</h3>
          {data?.topStreams?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Streamer</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="text-right">Viewers</TableHead>
                  <TableHead className="text-right">Peak</TableHead>
                  <TableHead className="text-right">Unique</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topStreams.map((s) => (
                  <TableRow key={s.streamId}>
                    <TableCell className="font-medium">{s.streamer}</TableCell>
                    <TableCell className="max-w-[240px] truncate text-muted-foreground">
                      {s.title || <span className="italic">untitled</span>}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{s.viewersNow}</TableCell>
                    <TableCell className="text-right">{s.peak}</TableCell>
                    <TableCell className="text-right">{s.uniqueViewers}</TableCell>
                    <TableCell>
                      <Badge variant={modeBadgeVariant(s.mode)} className="capitalize">
                        {s.mode}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize text-muted-foreground">{s.provider}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatDuration(s.durationSec)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              No streams are live right now.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveNowCard;
