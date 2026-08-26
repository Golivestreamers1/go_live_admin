import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Radio, Eye, Users, Swords, Boxes, Square } from 'lucide-react';
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

const endStreamWarning = (stream) => {
  if (stream?.isBoxGuest) {
    return 'This will end only this guest stream and remove them from the box party.';
  }
  if (stream?.mode === 'battle') {
    return 'This will end the stream, terminate the battle, and disconnect all viewers.';
  }
  if (stream?.mode === 'box') {
    return 'This will end the host stream, close the box party for all guests, and disconnect viewers.';
  }
  return 'This will end the stream immediately and disconnect all viewers.';
};

const LiveNowCard = () => {
  const polling = usePolling(() => dashboardService.getLive(), {
    defaultIntervalMs: 60_000,
  });
  const { data, refresh } = polling;
  const [streamToEnd, setStreamToEnd] = useState(null);
  const [ending, setEnding] = useState(false);
  const [endError, setEndError] = useState('');

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

  const handleConfirmEnd = async () => {
    if (!streamToEnd?.streamId) return;
    setEnding(true);
    setEndError('');
    try {
      await dashboardService.endLiveStream(streamToEnd.streamId);
      setStreamToEnd(null);
      await refresh();
    } catch (err) {
      setEndError(err?.response?.data?.message || err?.message || 'Failed to end stream');
    } finally {
      setEnding(false);
    }
  };

  return (
    <>
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
            <h3 className="mb-2 text-sm font-semibold text-gray-700">
              Live Streams
              {typeof data?.activeStreams === 'number' ? ` (${data.activeStreams})` : ''}
            </h3>
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
                    <TableHead className="text-right">Actions</TableHead>
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
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="h-8 gap-1.5"
                          onClick={() => {
                            setEndError('');
                            setStreamToEnd(s);
                          }}
                        >
                          <Square className="h-3.5 w-3.5 fill-current" />
                          End
                        </Button>
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

      <AlertDialog
        open={Boolean(streamToEnd)}
        onOpenChange={(open) => {
          if (!open && !ending) setStreamToEnd(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End live stream?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  End <span className="font-medium text-foreground">{streamToEnd?.streamer}</span>
                  {streamToEnd?.title ? (
                    <>
                      {' '}
                      — <span className="italic">{streamToEnd.title}</span>
                    </>
                  ) : null}
                  ?
                </p>
                <p>{endStreamWarning(streamToEnd)}</p>
                {endError ? <p className="text-destructive">{endError}</p> : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={ending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={ending}
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmEnd();
              }}
            >
              {ending ? 'Ending…' : 'End stream'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default LiveNowCard;
