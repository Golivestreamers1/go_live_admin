export const formatRam = (mb) => {
  if (mb == null) return '—';
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${Math.round(mb)} MB`;
};

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
  return [
    {
      id: 'device',
      label: 'Device & RAM',
      done: Boolean(device?.deviceModel && device?.totalMemoryMb),
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
      id: 'timeline',
      label: 'Timeline',
      done: (historyPoints?.length ?? 0) >= 2,
    },
  ];
}

export function micCameraSummary(device) {
  if (device?.hasHardwareTelemetry !== true) return 'Status pending…';
  const mic = device.micInUse ? 'Mic on' : 'Mic off';
  const cam = device.cameraInUse ? 'Cam on' : 'Cam off';
  return `${mic} · ${cam}`;
}

export function sortLiveDevices(devices) {
  return [...devices].sort((a, b) => {
    if (a.role === 'streamer' && b.role !== 'streamer') return -1;
    if (b.role === 'streamer' && a.role !== 'streamer') return 1;
    return new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime();
  });
}
