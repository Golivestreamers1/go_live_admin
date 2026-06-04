import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ImageIcon, RefreshCw, Video } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import stabilizationService from '../services/stabilizationService';
import { useStabilizationRealtime } from '../hooks/useStabilizationRealtime';
import StabilizationLiveBadge from '../components/stabilization/StabilizationLiveBadge';
import LiveDeviceList from '../components/stabilization/LiveDeviceList';

const formatRam = (mb) => {
  if (mb == null) return '—';
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${Math.round(mb)} MB`;
};

const Stabilization = () => {
  const realtime = useStabilizationRealtime(
    () => stabilizationService.getCameraMicStabilization(),
    (payload) => payload?.cameraMic,
  );

  const data = realtime.data;
  const summary = data?.summary;
  const liveDevices = data?.liveDevices || [];
  const stepCount = data?.cleanupStepsActive ?? 8;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex flex-wrap items-center gap-2 text-3xl font-bold text-gray-900">
            App Stability
            <StabilizationLiveBadge isLive={realtime.isLive} isStale={realtime.isStale} />
          </h1>
          <p className="mt-1 max-w-3xl text-gray-600">
            Live devices on stream — Agora stream health (FPS, bitrate, latency), app RAM, battery,
            network, and hardware. Tap a row for full details.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={realtime.refresh} disabled={realtime.isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${realtime.isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Live on stream now</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {summary?.liveOnStreamNow ?? '—'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {summary
              ? `${summary.streamersLive} streaming · ${summary.viewersLive} watching`
              : 'Waiting for live activity…'}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Recent clean releases</CardDescription>
            <CardTitle className="text-2xl tabular-nums text-emerald-700">
              {summary?.recentCleanReleases ?? '—'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Camera/mic released after exit (last ~3 min)
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Cleanup steps</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{stepCount}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Automatic steps on every stream exit
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Stream health alerts</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {(summary?.streamHealthCritical ?? 0) > 0 ? (
                <span className="text-red-600">{summary.streamHealthCritical} critical</span>
              ) : (summary?.streamHealthWarning ?? 0) > 0 ? (
                <span className="text-amber-600">{summary.streamHealthWarning} warning</span>
              ) : (
                <span className="text-emerald-600">All clear</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Agora bitrate, FPS, latency, packet loss, battery &amp; network
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg app RAM (live)</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {summary?.avgAppProcessRamMb
                ? formatRam(summary.avgAppProcessRamMb)
                : summary?.avgDeviceRamMb
                  ? `~${formatRam(summary.avgDeviceRamMb)}`
                  : '—'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Go Live process memory across devices reporting now
          </CardContent>
        </Card>
      </div>

      <LiveDeviceList liveDevices={liveDevices} summary={summary} />

      <div className="flex flex-wrap gap-4 border-t pt-4">
        <Link
          to="/stabilization/native-images-memory-leak"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          <ImageIcon className="h-4 w-4" />
          Image memory matrix
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          to="/stabilization/camera-mic-memory"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-rose-600 hover:text-rose-800"
        >
          <Video className="h-4 w-4" />
          Cleanup &amp; probes
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
};

export default Stabilization;
