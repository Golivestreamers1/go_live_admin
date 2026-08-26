export const formatRam = (mb) => {
  if (mb == null) return '—';
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${Math.round(mb)} MB`;
};

/** Best available app RAM: OS native → Agora SDK → JS formula estimate. */
export function appCurrentRamMb(device) {
  if (device?.appProcessMemoryAvailable === true) {
    const mb = Number(device.appProcessMemoryMb);
    if (Number.isFinite(mb) && mb > 0) {
      return { mb, native: true, isEstimate: false, source: 'os' };
    }
  }
  if (device?.appRamSource === 'agora' || device?.appRamSource === 'os') {
    const mb = Number(device.appDisplayRamMb ?? device.rtcMemoryAppMb);
    if (Number.isFinite(mb) && mb > 0) {
      return { mb, native: false, isEstimate: false, source: device.appRamSource };
    }
  }
  const agoraMb = Number(device?.rtcMemoryAppMb);
  if (Number.isFinite(agoraMb) && agoraMb > 0) {
    return { mb: agoraMb, native: false, isEstimate: false, source: 'agora' };
  }
  const displayMb = Number(device?.appDisplayRamMb);
  if (Number.isFinite(displayMb) && displayMb > 0 && device?.appRamSource === 'estimate') {
    return { mb: displayMb, native: false, isEstimate: true, source: 'estimate' };
  }
  const tracked = Number(device?.appTrackedRamMb);
  if (Number.isFinite(tracked) && tracked > 0) {
    return { mb: tracked, native: false, isEstimate: true, source: 'estimate' };
  }
  return { mb: null, native: false, isEstimate: false, source: null };
}

export function appRamSourceLabel(source, isEstimate) {
  if (source === 'os') return 'App RAM now (OS)';
  if (source === 'agora') return 'App RAM (Agora SDK, live)';
  if (isEstimate || source === 'estimate') return 'App RAM (formula estimate)';
  return 'App RAM';
}

export function formatAppRamUsage(device, { precise = false } = {}) {
  const { mb, isEstimate, source } = appCurrentRamMb(device);
  if (mb == null) return 'App RAM pending…';
  const fmt = precise
    ? mb >= 1024
      ? `${(mb / 1024).toFixed(2)} GB`
      : `${mb.toFixed(1)} MB`
    : formatRam(mb);
  if (source === 'os') return fmt;
  if (source === 'agora') return fmt;
  return `~${fmt}${isEstimate ? ' (est.)' : ''}`;
}

export const formatAge = (value) => {
  if (!value) return '—';
  const sec = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  return `${Math.floor(sec / 60)}m ago`;
};

export const formatRole = (role) => (role === 'streamer' ? 'Streamer' : 'Viewer');

export const roleBadgeClass = (role) =>
  role === 'streamer'
    ? 'border-violet-200 bg-violet-50 text-violet-700'
    : 'border-sky-200 bg-sky-50 text-sky-700';

export function getDeviceTelemetryStages(device, historyPoints = []) {
  const historyLen = device?.memoryHistory?.length ?? historyPoints?.length ?? 0;
  return [
    {
      id: 'device',
      label: 'App RAM (OS)',
      done:
        appCurrentRamMb(device).source === 'os' ||
        (appCurrentRamMb(device).source === 'agora' && appCurrentRamMb(device).mb != null),
    },
    {
      id: 'hardware',
      label: 'Mic / camera',
      done: device?.hasHardwareTelemetry === true,
    },
    {
      id: 'storage',
      label: 'Storage',
      done: Number(device?.totalStorageMb) > 0,
    },
    {
      id: 'appFootprint',
      label: 'App disk/RAM',
      done:
        Number(device?.appStorageTotalMb) > 0 ||
        Number(device?.appProcessMemoryMb) > 0 ||
        Number(device?.appTrackedRamMb) > 0,
    },
    {
      id: 'streamHealth',
      label: 'Stream health',
      done: device?.hasRtcStats === true,
    },
    {
      id: 'timeline',
      label: 'Timeline',
      done: historyLen >= 2,
    },
  ];
}

export function micCameraSummary(device) {
  if (device?.hasHardwareTelemetry !== true) return 'Status pending…';
  const mic = device.micInUse ? 'Mic on' : 'Mic off';
  const cam = device.cameraInUse ? 'Cam on' : 'Cam off';
  return `${mic} · ${cam}`;
}

export function appFootprintSummary(device) {
  const disk = Number(device?.appStorageTotalMb);
  if (disk > 0) return `App disk ${formatRam(disk)}`;
  return 'App disk pending…';
}

export function sortLiveDevices(devices) {
  return [...devices].sort((a, b) => {
    if (a.role === 'streamer' && b.role !== 'streamer') return -1;
    if (b.role === 'streamer' && a.role !== 'streamer') return 1;
    return new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime();
  });
}
