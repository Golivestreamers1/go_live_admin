/** Platform-wide live counts shown on App Stability admin pages. */
export function formatPlatformLiveSubtitle(summary) {
  if (!summary) return 'Waiting for live activity…';

  const parts = [
    `${summary.streamersLive ?? 0} streaming`,
    `${summary.viewersLive ?? 0} watching`,
  ];

  if (summary.activeStreams != null) {
    const n = summary.activeStreams;
    parts.push(`${n} host stream${n === 1 ? '' : 's'}`);
  }
  if ((summary.battlesInProgress ?? 0) > 0) {
    const n = summary.battlesInProgress;
    parts.push(`${n} battle${n === 1 ? '' : 's'}`);
  }
  if ((summary.boxPartiesInProgress ?? 0) > 0) {
    const n = summary.boxPartiesInProgress;
    parts.push(`${n} box ${n === 1 ? 'party' : 'parties'}`);
  }

  const telemetry = summary.telemetryDevicesReporting;
  if (telemetry != null) {
    parts.push(`${telemetry} reporting telemetry`);
  }

  return parts.join(' · ');
}

export function formatNativeImagesLiveSubtitle(summary) {
  if (!summary) return 'Waiting for live activity…';

  const parts = [
    `${summary.platformStreamersOnline ?? 0} streaming`,
    `${summary.platformLiveViewers ?? 0} watching`,
  ];

  if (summary.platformHostStreams != null) {
    const n = summary.platformHostStreams;
    parts.push(`${n} host stream${n === 1 ? '' : 's'}`);
  }
  if ((summary.platformBattles ?? 0) > 0) {
    const n = summary.platformBattles;
    parts.push(`${n} battle${n === 1 ? '' : 's'}`);
  }

  const telemetry = summary.telemetryDevicesReporting ?? summary.activeDevices;
  if (telemetry != null) {
    parts.push(`${telemetry} reporting telemetry`);
  }

  return parts.join(' · ');
}

export function formatOptimizationLiveSubtitle(live) {
  if (!live) return 'No live sessions';

  const parts = [
    `${live.streamersLive ?? 0} streaming`,
    `${live.viewersLive ?? 0} watching`,
  ];

  if (live.hostStreamsLive != null) {
    const n = live.hostStreamsLive;
    parts.push(`${n} host stream${n === 1 ? '' : 's'}`);
  }

  const telemetry = live.devicesReportingNow;
  if (telemetry != null) {
    parts.push(`${telemetry} reporting telemetry`);
  }

  return parts.join(' · ');
}
