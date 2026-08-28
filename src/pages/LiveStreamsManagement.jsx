import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { ArrowLeft, Boxes, Radio, Search, Square, Swords } from 'lucide-react';
import dashboardService from '../services/dashboardService';
import { usePolling } from '../hooks/usePolling';
import RefreshControl from '../components/dashboard/RefreshControl';

const formatDuration = (dateValue) => {
  if (!dateValue) return '0s';
  const started = new Date(dateValue).getTime();
  if (Number.isNaN(started)) return '0s';
  const sec = Math.max(0, Math.floor((Date.now() - started) / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

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

const deriveMode = (stream) => {
  if (stream?.battleId) return 'battle';
  if (stream?.boxPartyHostStreamId || stream?.roomId) return 'box';
  return 'single';
};

const modeBadgeVariant = (mode) => {
  if (mode === 'battle') return 'destructive';
  if (mode === 'box') return 'secondary';
  return 'outline';
};

const LiveStreamsManagement = () => {
  const polling = usePolling(() => dashboardService.getActiveLiveStreams(), {
    defaultIntervalMs: 60_000,
  });
  const { data, refresh, error, isLoading } = polling;
  const [search, setSearch] = useState('');
  const [streamToEnd, setStreamToEnd] = useState(null);
  const [ending, setEnding] = useState(false);
  const [endError, setEndError] = useState('');

  const streams = Array.isArray(data) ? data : [];
  const mappedStreams = useMemo(
    () =>
      streams.map((s) => ({
        streamId: String(s._id),
        title: s.title || '',
        streamerName: s.streamer?.name || s.streamer?.username || 'Unknown',
        streamerUsername: s.streamer?.username || '',
        streamerEmail: s.streamer?.email || '',
        provider: s.streamingProvider || 'agora',
        startedAt: s.startedAt || null,
        mode: deriveMode(s),
        isBoxGuest: Boolean(s.boxPartyHostStreamId),
        // Kept so the stat cards can count distinct battles and parties rather than rows —
        // a battle spans two rows and a box party spans one per participant.
        battleId: s.battleId ? String(s.battleId) : null,
        boxPartyId: s.boxPartyHostStreamId
          ? String(s.boxPartyHostStreamId)
          : s.roomId
            ? String(s._id)
            : null,
      })),
    [streams],
  );

  const filteredStreams = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return mappedStreams;
    return mappedStreams.filter((s) =>
      [s.streamerName, s.streamerUsername, s.streamerEmail, s.title, s.mode, s.provider]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [mappedStreams, search]);

  /**
   * A box party is ONE broadcast containing several people: the host owns a stream row and every
   * guest gets their own row pointing back at it. Counting rows therefore counts participants,
   * not streams — which is why this page read 12 while the dashboard read 8 for the same moment.
   *
   * `hosts` applies the rule the dashboard already uses (dashboard.service.js: hostStreams =
   * rows without a boxPartyHostStreamId), so the two pages now agree on what "a stream" means.
   * The row total is still shown, labelled as participants, because this page is for moderation
   * and every row is someone you can individually end.
   */
  const stats = useMemo(() => {
    let singles = 0;
    let hosts = 0;
    // A battle spans two rows and a box party spans one row per participant, so both are
    // counted as distinct events — matching dashboard.service.js, which does the same with
    // `distinctBattles` and `countDistinctBoxParties`.
    const battleIds = new Set();
    const partyIds = new Set();
    for (const s of mappedStreams) {
      if (!s.isBoxGuest) hosts += 1;
      if (s.mode === 'battle') {
        if (s.battleId) battleIds.add(s.battleId);
      } else if (s.mode === 'box') {
        if (s.boxPartyId) partyIds.add(s.boxPartyId);
      } else {
        singles += 1;
      }
    }
    return {
      battles: battleIds.size,
      boxes: partyIds.size,
      singles,
      hosts,
      participants: mappedStreams.length,
    };
  }, [mappedStreams]);

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
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">All Live Streams</h1>
            <p className="text-muted-foreground mt-1">
              View every active stream and end any stream for moderation.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            <RefreshControl {...polling} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Active streams</div>
              <div className="text-2xl font-bold">{stats.hosts}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">broadcasts, not people</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Live participants</div>
              <div className="text-2xl font-bold">{stats.participants}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">hosts + box guests</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Single</div>
              <div className="text-2xl font-bold">{stats.singles}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Battles</div>
              <div className="text-2xl font-bold">{stats.battles}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Box parties</div>
              <div className="text-2xl font-bold">{stats.boxes}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                {/* One row per participant, so a box party appears once per person here
                    while the dashboard counts it as a single broadcast. */}
                <CardTitle>
                  Live participants ({filteredStreams.length}
                  {search.trim() ? ` of ${mappedStreams.length}` : ''})
                </CardTitle>
                <CardDescription>
                  Search and moderate everyone currently live. Box guests appear as separate rows
                  and can be ended individually.
                </CardDescription>
              </div>
              <div className="relative w-full md:max-w-sm">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter by name, username, title, or email…"
                  className="h-9 pl-8"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {error ? (
              <p className="rounded-md border border-dashed p-6 text-center text-sm text-destructive">
                Failed to load live streams: {error}
              </p>
            ) : isLoading ? (
              <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                Loading live streams...
              </p>
            ) : filteredStreams.length ? (
              <div className="max-h-[34rem] overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Streamer</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead className="text-right">Duration</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStreams.map((stream) => (
                      <TableRow key={stream.streamId}>
                        <TableCell className="font-medium">
                          <div>{stream.streamerName}</div>
                          {stream.streamerUsername ? (
                            <div className="text-xs font-normal text-muted-foreground">
                              @{stream.streamerUsername}
                            </div>
                          ) : null}
                          {stream.streamerEmail ? (
                            <div className="text-xs font-normal text-muted-foreground">
                              {stream.streamerEmail}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate text-muted-foreground">
                          {stream.title || <span className="italic">untitled</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant={modeBadgeVariant(stream.mode)} className="capitalize gap-1">
                            {stream.mode === 'battle' ? (
                              <Swords className="h-3.5 w-3.5" />
                            ) : stream.mode === 'box' ? (
                              <Boxes className="h-3.5 w-3.5" />
                            ) : (
                              <Radio className="h-3.5 w-3.5" />
                            )}
                            {stream.mode}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize text-muted-foreground">
                          {stream.provider}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatDuration(stream.startedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="h-8 gap-1.5"
                            onClick={() => {
                              setEndError('');
                              setStreamToEnd(stream);
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
              </div>
            ) : (
              <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                {search.trim()
                  ? `No live streams match "${search.trim()}".`
                  : 'No streams are live right now.'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

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
                  End <span className="font-medium text-foreground">{streamToEnd?.streamerName}</span>
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
              {ending ? 'Ending...' : 'End stream'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default LiveStreamsManagement;
