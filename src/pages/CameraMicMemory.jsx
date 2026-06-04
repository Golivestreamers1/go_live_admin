import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Mic,
  RefreshCw,
  Smartphone,
  Video,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import stabilizationService from '../services/stabilizationService';
import { useStabilizationRealtime } from '../hooks/useStabilizationRealtime';
import StabilizationLiveBadge from '../components/stabilization/StabilizationLiveBadge';
import {
  DeviceMemoryMetricsPanel,
  ProbeMetricsPanel,
} from '../components/stabilization/DeviceMemoryMetricsPanel';
import LiveDeviceList from '../components/stabilization/LiveDeviceList';

const CLEANUP_STEPS = [
  'Stop receiving other people’s video and audio',
  'Switch from broadcaster to audience (stop sending)',
  'Turn off camera and mic publishing',
  'Mute and disable the local camera',
  'Mute and disable the local microphone',
  'Stop the camera preview',
  'Leave the live channel and release the video engine',
  'Reset the phone’s audio session so the mic unlocks',
];

const roleBadgeClass = (role) =>
  role === 'streamer'
    ? 'border-violet-200 bg-violet-50 text-violet-700'
    : 'border-sky-200 bg-sky-50 text-sky-700';

const formatRole = (role) => (role === 'streamer' ? 'Streamer' : 'Viewer');

const formatReason = (reason) => {
  switch (reason) {
    case 'stream_end':
      return 'Live ended';
    case 'unmount':
      return 'Left screen';
    case 'leave_screen':
      return 'Navigated away';
    default:
      return reason || '—';
  }
};

const verdictBadgeClass = (verdict) => {
  switch (verdict) {
    case 'ok':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'fail':
      return 'border-red-200 bg-red-50 text-red-700';
    default:
      return 'border-amber-200 bg-amber-50 text-amber-800';
  }
};

const formatVerdict = (verdict) => {
  switch (verdict) {
    case 'ok':
      return 'OK';
    case 'fail':
      return 'Fail';
    default:
      return 'Warn';
  }
};

const formatRam = (mb) => {
  if (mb == null) return '—';
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${Math.round(mb)} MB`;
};

const DeviceSpecsLine = ({ row }) => {
  const parts = [
    row.manufacturer || row.deviceBrand,
    `${row.osName || ''} ${row.osVersion || ''}`.trim(),
    row.totalMemoryMb ? formatRam(row.totalMemoryMb) : null,
    row.deviceType,
  ].filter(Boolean);
  return <p className="text-xs text-muted-foreground">{parts.join(' · ')}</p>;
};

const CameraMicMemory = () => {
  const realtime = useStabilizationRealtime(
    () => stabilizationService.getCameraMicStabilization(),
    (payload) => payload?.cameraMic,
  );
  const data = realtime.data;
  const summary = data?.summary;
  const liveDevices = data?.liveDevices || [];
  const recentReleases = data?.recentReleases || [];
  const recentProbes = data?.recentProbes || [];
  const releaseMatrix = data?.releaseMatrix || [];
  const stepCount = data?.cleanupStepsActive ?? CLEANUP_STEPS.length;

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
            <Video className="h-8 w-8 text-rose-500" />
            Camera &amp; Mic Cleanup
            <StabilizationLiveBadge isLive={realtime.isLive} isStale={realtime.isStale} />
          </h1>
          <p className="mt-1 max-w-3xl text-gray-600">
            When someone finishes a live stream or stops watching, we run a full teardown so the
            phone&apos;s camera and microphone are released — not left locked in the background.
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
            Users who left live with camera/mic fully released (last ~3 min)
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Cleanup steps per exit</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{stepCount}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Automatic steps before the phone unlocks camera &amp; mic
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg phone RAM (live users)</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {summary?.avgDeviceRamMb ? formatRam(summary.avgDeviceRamMb) : '—'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Device size across people currently on live
          </CardContent>
        </Card>
      </div>

      <LiveDeviceList
        liveDevices={liveDevices}
        summary={summary}
      />

      {(summary?.recentProbes ?? 0) > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Post-live probes (30s)</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{summary.recentProbes}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Cleanup health checks after live ends
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Probe OK</CardDescription>
              <CardTitle className="text-2xl tabular-nums text-emerald-700">
                {summary.probeOk ?? 0}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Agora released, caches empty at +30s
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Probe warn / fail</CardDescription>
              <CardTitle className="text-2xl tabular-nums text-amber-700">
                {(summary.probeWarn ?? 0) + (summary.probeFail ?? 0)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Needs investigation — see probe details below
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-l-4 border-l-emerald-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            What happens when live ends
          </CardTitle>
          <CardDescription>
            Every time a streamer ends their stream or a viewer leaves, the app runs these steps in
            order — so the camera light turns off and the mic is no longer reserved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {CLEANUP_STEPS.slice(0, stepCount).map((step, i) => (
              <li key={step} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {recentReleases.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Mic className="h-5 w-5 text-emerald-600" />
            Recent clean exits
          </h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {recentReleases.map((row) => (
              <Card key={`${row.userId}-${row.reportedAt}`} className="border-emerald-100">
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
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <p className="text-sm font-medium text-emerald-900">
                      Camera &amp; mic released ({row.cleanupStepsCompleted}/{stepCount} steps)
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Reason:{' '}
                    <span className="font-medium text-gray-900">{formatReason(row.reason)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(row.reportedAt).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {recentProbes.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Post-live memory probes</h2>
            <p className="text-sm text-muted-foreground">
              Samples at +0s, +5s, +15s, +30s after live exit — compare with Xcode Perf Monitor at
              the same timestamps in dev.
            </p>
          </div>
          {recentProbes.map((row) => (
            <ProbeMetricsPanel
              key={`${row.userId}-${row.reportedAt}`}
              probe={row}
              formatReason={formatReason}
              formatRole={formatRole}
              roleBadgeClass={roleBadgeClass}
              verdictBadgeClass={verdictBadgeClass}
              formatVerdict={formatVerdict}
            />
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-rose-500" />
            Clean releases by device
          </CardTitle>
          <CardDescription>
            Grouped by phone model — useful for spotting if certain devices need extra attention.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!data ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : releaseMatrix.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              <Video className="mx-auto mb-3 h-8 w-8 opacity-40" />
              No clean exits recorded yet. When someone finishes a live stream or stops watching,
              you&apos;ll see their device and release count here.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Device</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Phone RAM</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Role</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Clean exits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {releaseMatrix.map((row) => (
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
                      <td className="px-4 py-3 tabular-nums font-semibold text-emerald-700">
                        {row.releaseCount}
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
        This page confirms hardware was released cleanly after live — not a full device memory
        profile. Reports appear when someone ends or leaves a stream and refresh for about three
        minutes.
      </p>
    </div>
  );
};

export default CameraMicMemory;
