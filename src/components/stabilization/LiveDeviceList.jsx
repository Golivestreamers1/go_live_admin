import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Smartphone } from 'lucide-react';
import { Badge } from '../ui/badge';
import {
  formatAge,
  formatRole,
  getDeviceTelemetryStages,
  appFootprintSummary,
  formatAppRamUsage,
  micCameraSummary,
  roleBadgeClass,
  sortLiveDevices,
} from './liveDeviceShared';
import { StreamHealthBadge, StreamHealthCompact } from './StreamHealthPanel';
import { formatPlatformLiveSubtitle } from '../../utils/stabilizationLiveFacts';
import { STABILIZATION_PING_INTERVAL_LABEL } from '../../constants/stabilizationTelemetry';

function StageDots({ stages }) {
  const doneCount = stages.filter((s) => s.done).length;
  return (
    <div className="flex items-center gap-1.5">
      {stages.map((stage) => (
        <span
          key={stage.id}
          title={stage.label}
          className={`h-2 w-2 rounded-full ${stage.done ? 'bg-emerald-500' : 'bg-gray-200'}`}
        />
      ))}
      <span className="ml-1 text-[11px] text-muted-foreground">
        {doneCount}/{stages.length} loaded
      </span>
    </div>
  );
}

function DeviceListRow({ device }) {
  const stages = getDeviceTelemetryStages(device);
  const detailPath = `/stabilization/device/${device.userId}`;
  const leak = device.ramLeakSignal;

  return (
    <Link
      to={detailPath}
      className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 transition-colors hover:border-gray-300 hover:bg-gray-50"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-gray-900">{device.deviceModel}</p>
          <Badge variant="outline" className={`text-[10px] ${roleBadgeClass(device.role)}`}>
            {formatRole(device.role)}
          </Badge>
          {leak ? (
            <Badge
              variant="outline"
              className={`text-[10px] ${
                leak.level === 'fail'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-amber-200 bg-amber-50 text-amber-800'
              }`}
              title={leak.message || undefined}
            >
              RAM ↑ {Math.round(leak.growthMb)} MB
            </Badge>
          ) : null}
          {device.streamHealthLevel === 'critical' ? (
            <StreamHealthBadge level="critical" />
          ) : device.streamHealthLevel === 'warning' ? (
            <StreamHealthBadge level="warning" />
          ) : null}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {device.osName} {device.osVersion} · ping {formatAge(device.reportedAt)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{micCameraSummary(device)}</p>
        <p className="mt-1 text-xs text-emerald-800 font-medium tabular-nums">
          {formatAppRamUsage(device, { precise: true })}
        </p>
        {leak?.message ? (
          <p
            className={`mt-1 text-xs font-medium ${
              leak.level === 'fail' ? 'text-red-700' : 'text-amber-800'
            }`}
          >
            {leak.level === 'fail' ? 'Critical: ' : 'Warning: '}
            {leak.message}
          </p>
        ) : null}
        <div className="mt-1.5">
          <StreamHealthCompact device={device} />
        </div>
        <p className="mt-0.5 text-xs text-blue-700/90">{appFootprintSummary(device)}</p>
        <div className="mt-2">
          <StageDots stages={stages} />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-0.5 self-center pl-2 text-blue-600">
        <span className="whitespace-nowrap text-xs font-medium">View details</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-blue-500" aria-hidden />
      </div>
    </Link>
  );
}

export default function LiveDeviceList({ liveDevices, summary }) {
  const sortedDevices = useMemo(() => sortLiveDevices(liveDevices), [liveDevices]);
  const platformUsers = summary?.liveOnStreamNow ?? 0;
  const reportingCount = summary?.telemetryDevicesReporting ?? sortedDevices.length;

  if (sortedDevices.length === 0) {
    if (platformUsers > 0) {
      return (
        <div className="rounded-xl border border-dashed bg-amber-50/40 p-10 text-center">
          <Smartphone className="mx-auto mb-3 h-10 w-10 text-amber-400" />
          <p className="font-medium text-gray-900">{platformUsers} users on live right now</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatPlatformLiveSubtitle(summary)}. Device telemetry rows appear here once the app
            sends memory reports (~every {STABILIZATION_PING_INTERVAL_LABEL} on the live screen).
          </p>
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-dashed bg-gray-50/50 p-10 text-center">
        <Smartphone className="mx-auto mb-3 h-10 w-10 text-gray-300" />
        <p className="font-medium text-gray-900">No one on live right now</p>
        <p className="mt-1 text-sm text-muted-foreground">
          When a streamer or viewer opens the live screen, their device appears here. Tap a row to
          open full memory details.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b bg-gray-50/80 px-4 py-3">
        <h2 className="text-lg font-semibold text-gray-900">Live devices</h2>
        <p className="text-sm text-muted-foreground">
          {formatPlatformLiveSubtitle(summary)} · {reportingCount} device
          {reportingCount === 1 ? '' : 's'} reporting below · tap a row for full metrics
        </p>
      </div>
      <div className="divide-y divide-gray-100">
        {sortedDevices.map((device) => (
          <DeviceListRow key={device.userId} device={device} />
        ))}
      </div>
    </div>
  );
}

export function DataCollectionBanner({ device }) {
  const stages = getDeviceTelemetryStages(device);
  const doneCount = stages.filter((s) => s.done).length;
  const allDone = doneCount === stages.length;

  if (allDone) return null;

  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3">
      <p className="text-sm font-medium text-amber-900">
        Collecting live data ({doneCount}/{stages.length}) — app pings every {STABILIZATION_PING_INTERVAL_LABEL}
      </p>
      <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
        {stages.map((stage) => (
          <li key={stage.id} className="flex items-center gap-2 text-xs text-amber-900/90">
            <span
              className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                stage.done ? 'bg-emerald-500 text-white' : 'bg-amber-200 text-amber-800'
              }`}
            >
              {stage.done ? '✓' : '…'}
            </span>
            {stage.label}
            {!stage.done && stage.id === 'timeline' ? ' (needs 2 pings ~10 sec)' : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
