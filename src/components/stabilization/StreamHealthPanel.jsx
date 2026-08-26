import React from 'react';
import { Activity, AlertTriangle, Battery, Signal, Wifi } from 'lucide-react';
import { STABILIZATION_PING_INTERVAL_LABEL } from '../../constants/stabilizationTelemetry';
import { getActiveStreamHealthReasons } from './streamHealthReasons';

const HEALTH_STYLES = {
  healthy: {
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    dot: 'bg-emerald-500',
    label: 'Healthy',
  },
  warning: {
    badge: 'border-amber-200 bg-amber-50 text-amber-800',
    dot: 'bg-amber-500',
    label: 'Warning',
  },
  critical: {
    badge: 'border-red-200 bg-red-50 text-red-800',
    dot: 'bg-red-500',
    label: 'Critical',
  },
  unknown: {
    badge: 'border-gray-200 bg-gray-50 text-gray-600',
    dot: 'bg-gray-300',
    label: 'Pending',
  },
};

function StatCell({ label, value, sub }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-gray-900">{value ?? '—'}</p>
      {sub ? <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function qualityLabel(label) {
  if (!label) return '—';
  return label.replace(/_/g, ' ');
}

function formatNetwork(device) {
  if (!device.networkType) return '—';
  const type = String(device.networkType).toUpperCase();
  const parts = [type];
  if (device.networkIsConnected === false) parts.push('offline');
  else if (device.networkIsInternetReachable === false) parts.push('no internet');
  return parts.join(' · ');
}

function formatBattery(device) {
  const pct = device.batteryLevelPct;
  if (pct == null || pct < 0 || pct > 100) return '—';
  const label = `${Math.round(pct)}%`;
  return device.batteryIsCharging ? `${label} ⚡` : label;
}

function formatBitrate(tx, rx, role) {
  if (tx == null && rx == null) return '—';
  if (role === 'streamer') {
    return tx != null ? `${Math.round(tx)} kbps ↑` : '—';
  }
  if (rx != null) return `${Math.round(rx)} kbps ↓`;
  return tx != null ? `${Math.round(tx)} kbps` : '—';
}

export function StreamHealthBadge({ level }) {
  const key = HEALTH_STYLES[level] ? level : 'unknown';
  const style = HEALTH_STYLES[key];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${style.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}

export function StreamHealthReasons({ device, compact = false }) {
  const level = device?.streamHealthLevel;
  if (!level || level === 'healthy' || level === 'unknown') return null;

  const reasons = getActiveStreamHealthReasons(device);
  if (reasons.length === 0) return null;

  const isCritical = level === 'critical';
  const boxClass = isCritical
    ? 'border-red-200 bg-red-50 text-red-900'
    : 'border-amber-200 bg-amber-50 text-amber-900';
  const iconClass = isCritical ? 'text-red-600' : 'text-amber-600';

  if (compact) {
    return (
      <p className={`text-xs font-medium ${isCritical ? 'text-red-700' : 'text-amber-800'}`}>
        {isCritical ? 'Critical: ' : 'Warning: '}
        {reasons.join(' · ')}
      </p>
    );
  }

  return (
    <div className={`mt-3 rounded-lg border px-3 py-2.5 ${boxClass}`}>
      <div className="flex items-start gap-2">
        <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${iconClass}`} />
        <div className="min-w-0">
          <p className="text-sm font-semibold">{isCritical ? 'Critical — why?' : 'Warning — why?'}</p>
          <ul className="mt-1 space-y-0.5 text-sm">
            {reasons.map((reason) => (
              <li key={reason}>• {reason}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function StreamHealthCompact({ device }) {
  if (!device.hasRtcStats && device.batteryLevelPct == null && !device.networkType) {
    return (
      <p className="text-xs text-muted-foreground">
        Stream stats pending — join live channel first ({STABILIZATION_PING_INTERVAL_LABEL})
      </p>
    );
  }

  const level = device.streamHealthLevel || 'unknown';
  const parts = [];
  if (device.rtcFps != null) parts.push(`${Math.round(device.rtcFps)} fps`);
  if (device.rtcTxKbps != null || device.rtcRxKbps != null) {
    parts.push(formatBitrate(device.rtcTxKbps, device.rtcRxKbps, device.role));
  }
  if (device.rtcRttMs != null) parts.push(`${Math.round(device.rtcRttMs)} ms RTT`);
  if (device.networkType) parts.push(formatNetwork(device));
  if (device.batteryLevelPct != null) parts.push(formatBattery(device));

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <StreamHealthBadge level={level} />
        <span className="text-xs tabular-nums text-gray-700">{parts.join(' · ') || '—'}</span>
      </div>
      <StreamHealthReasons device={device} compact />
    </div>
  );
}

export default function StreamHealthPanel({ device }) {
  const level = device.streamHealthLevel || 'unknown';
  const loss =
    device.rtcTxPacketLossPct != null || device.rtcRxPacketLossPct != null
      ? `${device.rtcTxPacketLossPct ?? 0}% ↑ / ${device.rtcRxPacketLossPct ?? 0}% ↓`
      : '—';

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-violet-600" />
            <p className="text-sm font-semibold text-gray-900">Stream health (Agora + device)</p>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Real-time from Agora RTC callbacks — updates every {STABILIZATION_PING_INTERVAL_LABEL} while live
          </p>
        </div>
        <StreamHealthBadge level={level} />
      </div>

      <StreamHealthReasons device={device} />

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        <StatCell
          label="Connection"
          value={device.rtcConnectionStateLabel || '—'}
          sub={
            device.rtcReconnectCount > 0
              ? `${device.rtcReconnectCount} reconnect${device.rtcReconnectCount === 1 ? '' : 's'}`
              : null
          }
        />
        <StatCell
          label="FPS"
          value={device.rtcFps != null ? Math.round(device.rtcFps) : null}
          sub={
            device.rtcVideoWidth && device.rtcVideoHeight
              ? `${device.rtcVideoWidth}×${device.rtcVideoHeight}`
              : null
          }
        />
        <StatCell
          label={device.role === 'streamer' ? 'TX bitrate' : 'RX bitrate'}
          value={
            device.role === 'streamer'
              ? device.rtcTxKbps != null
                ? `${Math.round(device.rtcTxKbps)} kbps`
                : null
              : device.rtcRxKbps != null
                ? `${Math.round(device.rtcRxKbps)} kbps`
                : device.rtcTxKbps != null
                  ? `${Math.round(device.rtcTxKbps)} kbps`
                  : null
          }
          sub={
            device.rtcVideoBitrateKbps != null
              ? `Video ${Math.round(device.rtcVideoBitrateKbps)} kbps`
              : null
          }
        />
        <StatCell
          label="Latency (RTT)"
          value={device.rtcRttMs != null ? `${Math.round(device.rtcRttMs)} ms` : null}
        />
        <StatCell label="Packet loss" value={loss} />
        <StatCell
          label="Network quality"
          value={`↑ ${qualityLabel(device.rtcTxQualityLabel)} / ↓ ${qualityLabel(device.rtcRxQualityLabel)}`}
        />
        <StatCell
          label="Network"
          value={formatNetwork(device)}
          sub={device.networkIsInternetReachable === false ? 'No internet reachability' : null}
        />
        <StatCell label="Battery" value={formatBattery(device)} />
        <StatCell
          label="Channel users"
          value={device.rtcUserCount != null ? device.rtcUserCount : null}
          sub={
            device.rtcDurationSec != null
              ? `${Math.floor(device.rtcDurationSec / 60)}m in channel`
              : null
          }
        />
        <StatCell
          label="CPU (Agora)"
          value={device.rtcCpuAppPct != null ? `${Math.round(device.rtcCpuAppPct)}%` : null}
        />
        <StatCell
          label="Agora memory hint"
          value={device.rtcMemoryAppMb != null ? `${device.rtcMemoryAppMb} MB` : null}
          sub="SDK-reported, approximate"
        />
        <StatCell
          label="Mic / camera"
          value={
            device.micInUse || device.cameraInUse
              ? [device.micInUse ? 'Mic on' : 'Mic off', device.cameraInUse ? 'Cam on' : 'Cam off'].join(
                  ' · ',
                )
              : device.agoraEngineAlive
                ? 'Engine alive'
                : '—'
          }
        />
      </div>

      {!device.hasRtcStats ? (
        <p className="mt-3 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-xs text-muted-foreground">
          Agora stats appear after joining a live channel. Streamer/viewer must stay on live screen for
          ~10–15 sec for first RTC callbacks.
        </p>
      ) : null}
    </div>
  );
}

export function StreamHealthIcons({ device }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      {device.networkType ? (
        <span title={formatNetwork(device)}>
          <Wifi className="h-3.5 w-3.5" />
        </span>
      ) : null}
      {device.batteryLevelPct != null ? (
        <span title={formatBattery(device)}>
          <Battery className="h-3.5 w-3.5" />
        </span>
      ) : null}
      {device.hasRtcStats ? (
        <span title="Agora RTC stats active">
          <Signal className="h-3.5 w-3.5" />
        </span>
      ) : null}
    </div>
  );
}
