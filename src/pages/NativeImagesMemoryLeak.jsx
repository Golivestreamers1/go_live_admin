import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ImageIcon,
  MemoryStick,
  RefreshCw,
  Smartphone,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import stabilizationService from '../services/stabilizationService';
import { useStabilizationRealtime } from '../hooks/useStabilizationRealtime';
import StabilizationLiveBadge from '../components/stabilization/StabilizationLiveBadge';

const roleBadgeClass = (role) =>
  role === 'streamer'
    ? 'border-violet-200 bg-violet-50 text-violet-700'
    : 'border-sky-200 bg-sky-50 text-sky-700';

const formatRole = (role) => (role === 'streamer' ? 'Streamer' : 'Viewer');

const formatMb = (value) => `${Number(value || 0).toFixed(2)} MB`;

const formatRam = (mb) => {
  if (mb == null) return '—';
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${Math.round(mb)} MB`;
};

const formatPct = (value) => (value == null ? null : `${value}% of phone RAM`);

const DeviceSpecsLine = ({ row }) => {
  const parts = [
    row.manufacturer || row.deviceBrand,
    `${row.osName} ${row.osVersion}`.trim(),
    row.totalMemoryMb ? formatRam(row.totalMemoryMb) : null,
    row.deviceType,
  ].filter(Boolean);
  return <p className="text-xs text-muted-foreground">{parts.join(' · ')}</p>;
};

const MemoryBar = ({ label, valueMb, pctOfRam, tone = 'default' }) => {
  const barPct = pctOfRam != null ? Math.min(100, Math.max(4, pctOfRam * 8)) : 8;
  const toneCls =
    tone === 'saved'
      ? 'bg-indigo-500'
      : tone === 'without'
        ? 'bg-amber-400'
        : 'bg-emerald-500';
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium tabular-nums text-gray-900">
          {formatMb(valueMb)}
          {pctOfRam != null ? (
            <span className="ml-1 font-normal text-muted-foreground">({formatPct(pctOfRam)})</span>
          ) : null}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full ${toneCls}`} style={{ width: `${barPct}%` }} />
      </div>
    </div>
  );
};

const NativeImagesMemoryLeak = () => {
  const realtime = useStabilizationRealtime(
    () => stabilizationService.getNativeImagesMatrix(),
    (payload) => payload?.nativeImages,
  );
  const data = realtime.data;
  const summary = data?.summary;
  const matrix = data?.matrix || [];
  const devices = data?.devices || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to="/stabilization"
            className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to App Stability
          </Link>
          <h1 className="flex flex-wrap items-center gap-2 text-3xl font-bold text-gray-900">
            <ImageIcon className="h-8 w-8 text-indigo-500" />
            Image Memory Savings
            <StabilizationLiveBadge isLive={realtime.isLive} isStale={realtime.isStale} />
          </h1>
          <p className="mt-1 max-w-3xl text-gray-600">
            For each person live right now, see their phone details, how much memory their photos
            use, how much we saved with our image improvements, and how that compares to their
            phone&apos;s total RAM.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={realtime.refresh} disabled={realtime.isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${realtime.isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Live devices</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{summary?.activeDevices ?? '—'}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {summary
              ? `${summary.streamers} streaming · ${summary.viewers} watching`
              : 'Waiting for live activity…'}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg phone RAM</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {summary?.avgDeviceRamMb ? formatRam(summary.avgDeviceRamMb) : '—'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Typical device size across live users
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Photo memory (with our fix)</CardDescription>
            <CardTitle className="text-2xl tabular-nums text-emerald-700">
              {summary ? formatMb(summary.withMb) : '—'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Total across everyone live right now
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total memory saved</CardDescription>
            <CardTitle className="text-2xl tabular-nums text-indigo-700">
              {summary ? `${formatMb(summary.savedMb)} (${summary.avgSavingsPct}%)` : '—'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Compared to loading images the old way
          </CardContent>
        </Card>
      </div>

      {devices.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Live users right now</h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {devices.map((row) => (
              <Card key={row.userId} className="border-gray-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{row.deviceModel}</CardTitle>
                      <DeviceSpecsLine row={row} />
                    </div>
                    <Badge variant="outline" className={roleBadgeClass(row.role)}>
                      {formatRole(row.role)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-gray-900">{row.activeImageCount}</span> photos
                    on screen during this live session
                  </p>
                  <MemoryBar
                    label="Using now (our fix)"
                    valueMb={row.imageMemoryWithExpoMb}
                    pctOfRam={row.imageUsePctOfRam}
                    tone="default"
                  />
                  <MemoryBar
                    label="Would use without our fix"
                    valueMb={row.imageMemoryWithoutNativeMb}
                    pctOfRam={row.withoutFixPctOfRam}
                    tone="without"
                  />
                  <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2">
                    <p className="text-sm font-semibold text-indigo-900">
                      We saved {formatMb(row.savingsMb)} ({row.savingsPct}% on photos)
                    </p>
                    {row.savedPctOfRam != null ? (
                      <p className="text-xs text-indigo-700">
                        That&apos;s {formatPct(row.savedPctOfRam)} freed up on this device
                      </p>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Last updated {new Date(row.reportedAt).toLocaleTimeString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MemoryStick className="h-5 w-5 text-indigo-500" />
            Summary by device type
          </CardTitle>
          <CardDescription>
            Same phone models grouped together — helpful for spotting patterns across streamers and
            viewers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!data ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : matrix.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              <Smartphone className="mx-auto mb-3 h-8 w-8 opacity-40" />
              No one is on a live stream right now. When streamers or viewers join, you&apos;ll see
              their phone specs and memory savings here.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Device</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Phone RAM</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Activity</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">People live</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Using now</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Without fix</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Saved</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {matrix.map((row) => (
                    <tr key={`${row.deviceModel}-${row.role}-${row.osName}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{row.deviceModel}</p>
                        <p className="text-xs text-muted-foreground">
                          {[row.manufacturer || row.deviceBrand, row.osName, row.deviceType]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </td>
                      <td className="px-4 py-3 tabular-nums">{formatRam(row.avgTotalMemoryMb)}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={roleBadgeClass(row.role)}>
                          {formatRole(row.role)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 tabular-nums">{row.activeSessions}</td>
                      <td className="px-4 py-3 tabular-nums text-emerald-700">
                        {formatMb(row.withExpoImageMb)}
                        {row.imageUsePctOfRam != null ? (
                          <span className="block text-xs text-muted-foreground">
                            {formatPct(row.imageUsePctOfRam)}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-amber-700">
                        {formatMb(row.withoutNativeImageMb)}
                      </td>
                      <td className="px-4 py-3 tabular-nums font-semibold text-indigo-700">
                        {formatMb(row.savedMb)} ({row.savingsPct}%)
                        {row.savedPctOfRam != null ? (
                          <span className="block text-xs font-normal text-muted-foreground">
                            {formatPct(row.savedPctOfRam)}
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Phone RAM comes from the device itself. Photo memory is an estimate for avatars and images
        on screen during live — not the entire app or other apps on the phone. Numbers refresh while
        someone is actively streaming or watching.
      </p>
    </div>
  );
};

export default NativeImagesMemoryLeak;
