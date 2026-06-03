import React, { useEffect, useId, useMemo, useState } from 'react';

const formatMb = (value) => {
  const n = Number(value) || 0;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} GB`;
  return `${Math.round(n)} MB`;
};

const formatMbPrecise = (value) => {
  const n = Number(value) || 0;
  if (n >= 1024) return `${(n / 1024).toFixed(2)} GB`;
  return `${n.toFixed(1)} MB`;
};

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const span = Math.abs(endAngle - startAngle);
  const largeArc = span <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function gaugeColor(pct) {
  if (pct >= 85) return '#ef4444';
  if (pct >= 60) return '#f59e0b';
  return '#22c55e';
}

function MemoryGauge({ valueMb, totalMb, label = 'On-screen image RAM' }) {
  const pct = totalMb > 0 ? clamp((valueMb / totalMb) * 100, 0, 100) : 0;
  const cx = 100;
  const cy = 100;
  const r = 68;
  const leftAngle = 180;
  const rightAngle = 0;
  const progressAngle = leftAngle - (pct / 100) * 180;
  const trackPath = describeArc(cx, cy, r, leftAngle, rightAngle);
  const progressPath =
    pct > 0 ? describeArc(cx, cy, r, leftAngle, progressAngle) : null;
  const needleTip = polarToCartesian(cx, cy, r * 0.78, progressAngle);

  return (
    <div className="flex h-full flex-col rounded-lg border bg-gray-50/40 p-4">
      <p className="text-center text-sm font-medium text-gray-700">{label}</p>
      <div className="relative mx-auto w-full max-w-[240px] flex-1">
        <svg viewBox="0 0 200 130" className="w-full" aria-hidden>
          <path
            d={trackPath}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="16"
            strokeLinecap="round"
          />
          {progressPath ? (
            <path
              d={progressPath}
              fill="none"
              stroke={gaugeColor(pct)}
              strokeWidth="16"
              strokeLinecap="round"
            />
          ) : null}
          <line
            x1={cx}
            y1={cy}
            x2={needleTip.x}
            y2={needleTip.y}
            stroke="#374151"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx={cx} cy={cy} r="4.5" fill="#374151" />
          <text x="24" y="112" fontSize="10" fill="#9ca3af">
            0
          </text>
          <text x="100" y="24" textAnchor="middle" fontSize="10" fill="#9ca3af">
            {totalMb > 0 ? formatMb(totalMb / 2) : '50%'}
          </text>
          <text x="176" y="112" textAnchor="end" fontSize="10" fill="#9ca3af">
            {totalMb > 0 ? formatMb(totalMb) : '100%'}
          </text>
        </svg>
        <div className="pointer-events-none absolute inset-x-0 top-[46%] text-center">
          <p className="text-2xl font-semibold tabular-nums leading-none text-gray-900">
            {formatMbPrecise(valueMb)}
          </p>
          <p className="mt-1 text-xs tabular-nums text-muted-foreground">
            {totalMb > 0 ? (
              <>
                {pct.toFixed(1)}% of {formatMb(totalMb)}
              </>
            ) : (
              `${pct.toFixed(1)}%`
            )}
          </p>
        </div>
      </div>
      {valueMb <= 0 ? (
        <p className="mt-1 text-center text-xs text-muted-foreground">
          No avatars or photos on screen — expected during stream
        </p>
      ) : null}
    </div>
  );
}

function DonutSegment({ cx, cy, r, strokeWidth, offset, length, color }) {
  const c = 2 * Math.PI * r;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeDasharray={`${length} ${c - length}`}
      strokeDashoffset={offset}
      transform={`rotate(-90 ${cx} ${cy})`}
    />
  );
}

function HardwareStatusBadges({ device }) {
  const hasTelemetry = device.hasHardwareTelemetry === true;
  const micInUse = device.micInUse === true;
  const cameraInUse = device.cameraInUse === true;

  if (!hasTelemetry) {
    return (
      <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 font-medium text-gray-600">
        Mic / camera status pending…
      </span>
    );
  }

  return (
    <>
      <span
        className={`rounded-full border px-2 py-0.5 font-medium ${
          micInUse
            ? 'border-rose-200 bg-rose-50 text-rose-700'
            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
        }`}
      >
        Mic {micInUse ? 'in use' : 'off / released'}
      </span>
      <span
        className={`rounded-full border px-2 py-0.5 font-medium ${
          cameraInUse
            ? 'border-rose-200 bg-rose-50 text-rose-700'
            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
        }`}
      >
        Camera {cameraInUse ? 'in use' : 'off / released'}
      </span>
    </>
  );
}

function hardwareBenefitCopy(device, stepCount, live) {
  const hasTelemetry = device.hasHardwareTelemetry === true;
  const micInUse = device.micInUse === true;
  const cameraInUse = device.cameraInUse === true;

  if (!live) {
    return { value: 'Released', detail: 'Hardware released after live ended', tone: 'emerald' };
  }

  if (!hasTelemetry) {
    return {
      value: 'Waiting for ping',
      detail: 'Mic/camera state updates every ~20s from the app',
      tone: 'rose',
    };
  }

  if (!micInUse && !cameraInUse) {
    return {
      value: 'Mic & camera off',
      detail: `Both idle now — ${stepCount} cleanup steps still run on exit to fully release Agora`,
      tone: 'emerald',
    };
  }

  const parts = [];
  if (micInUse) parts.push('mic');
  if (cameraInUse) parts.push('camera');
  return {
    value: `${parts.join(' + ')} active`,
    detail: `Muted hardware is off now · ${stepCount} cleanup steps on exit free any remaining lock`,
    tone: 'rose',
  };
}

function UsageBar({ label, used, total, tone = 'blue', sublabel }) {
  const pct = total > 0 ? clamp((used / total) * 100, 0, 100) : 0;
  const toneCls =
    tone === 'green'
      ? 'bg-emerald-500'
      : tone === 'violet'
        ? 'bg-violet-500'
        : tone === 'amber'
          ? 'bg-amber-500'
          : 'bg-blue-500';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium text-gray-800">{label}</span>
        <span className="tabular-nums text-gray-900">
          {formatMbPrecise(used)}
          {total > 0 ? (
            <span className="ml-1 font-normal text-muted-foreground">
              / {formatMb(total)} ({pct.toFixed(1)}%)
            </span>
          ) : null}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full transition-all ${toneCls}`}
          style={{ width: `${pct}%`, minWidth: pct > 0 && pct < 1 ? '4px' : undefined }}
        />
      </div>
      {sublabel ? <p className="text-xs text-muted-foreground">{sublabel}</p> : null}
    </div>
  );
}

function BenefitCard({ title, value, detail, tone = 'emerald' }) {
  const cls =
    tone === 'indigo'
      ? 'border-indigo-200 bg-indigo-50 text-indigo-900'
      : tone === 'rose'
        ? 'border-rose-200 bg-rose-50 text-rose-900'
        : 'border-emerald-200 bg-emerald-50 text-emerald-900';

  return (
    <div className={`rounded-lg border px-4 py-3 ${cls}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-80">{title}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
      {detail ? <p className="mt-1 text-xs opacity-90">{detail}</p> : null}
    </div>
  );
}

function UsageAndBenefitSection({ device, stepCount = 8, live = true }) {
  const totalRam = Number(device.totalMemoryMb) || 0;
  const imagesMb = Number(device.imageMemoryWithExpoMb) || 0;
  const withoutFixMb = Number(device.imageMemoryWithoutNativeMb) || 0;
  const savingsMb = Number(device.savingsMb) || 0;
  const savingsPct = Number(device.savingsPct) || 0;
  const totalStorage = Number(device.totalStorageMb) || 0;
  const usedStorage = Number(device.usedStorageMb) || 0;
  const freeStorage = Number(device.freeStorageMb) || 0;
  const hasStorage = totalStorage > 0 && usedStorage >= 0;
  const hwBenefit = hardwareBenefitCopy(device, stepCount, live);

  return (
    <div className="space-y-4 border-b px-4 py-4">
      <div>
        <p className="text-sm font-semibold text-gray-900">Usage right now</p>
        <p className="text-xs text-muted-foreground">
          Phone RAM &amp; storage from device · image RAM is measured live from the app
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-4 rounded-lg border bg-gray-50/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">RAM</p>
          <UsageBar
            label="Images on screen (in use)"
            used={imagesMb}
            total={totalRam}
            tone="violet"
            sublabel={
              withoutFixMb > imagesMb
                ? `Without our fix this would be ${formatMbPrecise(withoutFixMb)}`
                : 'Live photo / avatar memory during this session'
            }
          />
          {totalRam > 0 ? (
            <p className="text-xs text-muted-foreground">
              Phone total RAM: {formatMb(totalRam)} · Full app RAM (e.g. Xcode 456 MB) is not sent
              from the phone yet — only image slice is measured here.
            </p>
          ) : null}
        </div>

        <div className="space-y-4 rounded-lg border bg-gray-50/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Storage (ROM)</p>
          {hasStorage ? (
            <>
              <UsageBar
                label="Device storage used"
                used={usedStorage}
                total={totalStorage}
                tone="amber"
                sublabel={`${formatMb(freeStorage)} free · ${Number(device.storageUsePct ?? (usedStorage / totalStorage) * 100).toFixed(1)}% full`}
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Storage data pending — stay on live for the next ping (~20s).
            </p>
          )}
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold text-gray-900">Feature benefit at this moment</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <BenefitCard
            title="Image memory fix"
            value={savingsMb > 0 ? `${formatMbPrecise(savingsMb)} saved` : 'No photos yet'}
            detail={
              savingsMb > 0
                ? `${savingsPct}% less than old image loader · ${device.savedPctOfRam != null ? `${device.savedPctOfRam}% of phone RAM` : 'right now'}`
                : 'Benefit appears when avatars/images are on screen'
            }
            tone="indigo"
          />
          <BenefitCard
            title="Camera & mic (live state)"
            value={hwBenefit.value}
            detail={hwBenefit.detail}
            tone={hwBenefit.tone}
          />
          <BenefitCard
            title="Total measured savings"
            value={savingsMb > 0 ? formatMbPrecise(savingsMb) : '—'}
            detail={
              savingsMb > 0 && withoutFixMb > 0
                ? `Using ${formatMbPrecise(imagesMb)} instead of ${formatMbPrecise(withoutFixMb)} for on-screen images`
                : 'Combined stabilization benefit from image optimization'
            }
          />
        </div>
      </div>
    </div>
  );
}

function MemoryDonut({ valueMb, totalMb, deviceLabel, savingsMb = 0, usedStorageMb, totalStorageMb }) {
  const showStorage = totalStorageMb > 0 && usedStorageMb >= 0;
  const total = Math.max(totalMb || 0, valueMb || 0, 1);
  const imagesMb = Math.max(0, valueMb || 0);
  const benefitMb = Math.max(0, savingsMb || 0);
  const restMb = Math.max(0, total - imagesMb - benefitMb);
  const c = 2 * Math.PI * 52;
  const imagesLen = (imagesMb / total) * c;
  const benefitLen = (benefitMb / total) * c;
  const restLen = (restMb / total) * c;

  if (showStorage) {
    const storageTotal = Math.max(totalStorageMb, 1);
    const usedLen = (usedStorageMb / storageTotal) * c;
    const freeLen = c - usedLen;
    return (
      <div className="flex h-full flex-col rounded-lg border bg-gray-50/40 p-4">
        <p className="mb-2 text-center text-sm font-medium text-gray-700">Storage breakdown</p>
        <svg viewBox="0 0 140 140" className="mx-auto w-full max-w-[160px]" aria-hidden>
          <circle cx="70" cy="70" r="52" fill="none" stroke="#f3f4f6" strokeWidth="18" />
          <DonutSegment cx={70} cy={70} r={52} strokeWidth={18} offset={0} length={usedLen} color="#f97316" />
          <DonutSegment cx={70} cy={70} r={52} strokeWidth={18} offset={-usedLen} length={freeLen} color="#d1d5db" />
        </svg>
        <div className="mt-3 space-y-1.5 text-xs">
          <div className="flex justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-500" />
              Used
            </span>
            <span className="tabular-nums font-medium">{formatMb(usedStorageMb)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-300" />
              Free
            </span>
            <span className="tabular-nums font-medium">
              {formatMb(Math.max(0, totalStorageMb - usedStorageMb))}
            </span>
          </div>
          <p className="pt-1 text-[11px] text-muted-foreground">Total: {formatMb(totalStorageMb)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-lg border bg-gray-50/40 p-4">
      <p className="mb-2 text-center text-sm font-medium text-gray-700">RAM breakdown</p>
      <svg viewBox="0 0 140 140" className="mx-auto w-full max-w-[160px]" aria-hidden>
        <circle cx="70" cy="70" r="52" fill="none" stroke="#f3f4f6" strokeWidth="18" />
        <DonutSegment cx={70} cy={70} r={52} strokeWidth={18} offset={0} length={imagesLen} color="#8b5cf6" />
        <DonutSegment
          cx={70}
          cy={70}
          r={52}
          strokeWidth={18}
          offset={-imagesLen}
          length={benefitLen}
          color="#22c55e"
        />
        <DonutSegment
          cx={70}
          cy={70}
          r={52}
          strokeWidth={18}
          offset={-(imagesLen + benefitLen)}
          length={restLen}
          color="#d1d5db"
        />
      </svg>
      <div className="mt-3 space-y-1.5 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-gray-700">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-violet-500" />
            Images in use
          </span>
          <span className="tabular-nums font-medium">{formatMbPrecise(imagesMb)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-gray-700">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Saved by our fix
          </span>
          <span className="tabular-nums font-medium">{formatMbPrecise(benefitMb)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-gray-700">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-300" />
            Rest of phone RAM
          </span>
          <span className="tabular-nums font-medium">{formatMb(restMb)}</span>
        </div>
        <p className="pt-1 text-[11px] text-muted-foreground">Phone total: {formatMb(totalMb)}</p>
      </div>
    </div>
  );
}

function MemoryTimeline({ points, label = 'Session memory trend' }) {
  const gradId = useId();
  const width = 640;
  const height = 160;
  const pad = { top: 12, right: 12, bottom: 28, left: 44 };

  const chart = useMemo(() => {
    if (!points?.length) return null;

    const vals = points.map((p) => p.mb);
    const maxVal = Math.max(...vals, 0.5);
    const minVal = 0;
    const start = points[0].t;
    const end = points[points.length - 1].t;
    const span = Math.max(end - start, 1);

    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;

    const coords = points.map((p) => {
      const x = pad.left + ((p.t - start) / span) * plotW;
      const y = pad.top + plotH - ((p.mb - minVal) / (maxVal - minVal || 1)) * plotH;
      return { x, y, ...p };
    });

    const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
    const area = `${line} L ${coords[coords.length - 1].x.toFixed(1)} ${(pad.top + plotH).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(pad.top + plotH).toFixed(1)} Z`;

    const durationSec = Math.floor(span / 1000);
    const durationLabel =
      durationSec >= 60
        ? `${Math.floor(durationSec / 60)} min ${durationSec % 60} sec`
        : `${durationSec} sec`;

    return {
      coords,
      line,
      area,
      maxVal,
      minVal,
      durationLabel,
      high: Math.max(...vals),
      low: Math.min(...vals),
    };
  }, [points]);

  if (!chart) {
    return (
      <div className="flex h-[200px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed bg-gray-50/80 px-4 text-center text-sm text-muted-foreground">
        <p>Collecting live samples…</p>
        <p className="text-xs">Updates every ~20s while on stream</p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-gray-700">{label}</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full rounded-lg bg-[#fafafa]" aria-hidden>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const y = pad.top + (height - pad.top - pad.bottom) * f;
          const val = chart.maxVal * (1 - f);
          return (
            <g key={f}>
              <line
                x1={pad.left}
                y1={y}
                x2={width - pad.right}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
              <text x={pad.left - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#9ca3af">
                {val < 1 ? val.toFixed(1) : Math.round(val)}
              </text>
            </g>
          );
        })}
        <path d={chart.area} fill={`url(#${gradId})`} />
        <path d={chart.line} fill="none" stroke="#2563eb" strokeWidth="2" />
        {chart.coords.map((c) => (
          <circle key={c.t} cx={c.x} cy={c.y} r="3" fill="#2563eb" />
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-xs tabular-nums text-muted-foreground">
        <span>
          Duration: <span className="font-medium text-gray-900">{chart.durationLabel}</span>
        </span>
        <span>
          High: <span className="font-medium text-gray-900">{formatMbPrecise(chart.high)}</span>
        </span>
        <span>
          Low: <span className="font-medium text-gray-900">{formatMbPrecise(chart.low)}</span>
        </span>
      </div>
    </div>
  );
}

function ProbeTimeline({ samples }) {
  const points = (samples || []).map((s) => ({
    t: Number(s.atSec) || 0,
    mb: Number(s.imageMemoryWithExpoMb) || 0,
    images: Number(s.activeImageCount) || 0,
    agora: s.agoraEngineAlive,
  }));

  if (points.length === 0) return null;

  const maxMb = Math.max(...points.map((p) => p.mb), 0.5);
  const width = 640;
  const height = 140;
  const pad = { top: 10, right: 12, bottom: 28, left: 36 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const maxSec = Math.max(...points.map((p) => p.t), 30);

  const coords = points.map((p) => ({
    ...p,
    x: pad.left + (p.t / maxSec) * plotW,
    y: pad.top + plotH - (p.mb / maxMb) * plotH,
  }));

  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-gray-700">Post-live cleanup timeline (+0s → +30s)</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full rounded-lg bg-[#fafafa]" aria-hidden>
        <line
          x1={pad.left}
          y1={pad.top + plotH}
          x2={width - pad.right}
          y2={pad.top + plotH}
          stroke="#d1d5db"
        />
        {coords.map((c) => (
          <g key={c.t}>
            <line
              x1={c.x}
              y1={pad.top}
              x2={c.x}
              y2={pad.top + plotH}
              stroke="#f3f4f6"
              strokeDasharray="3 3"
            />
            <text x={c.x} y={height - 8} textAnchor="middle" fontSize="10" fill="#6b7280">
              +{c.t}s
            </text>
            <circle
              cx={c.x}
              cy={c.y}
              r="4"
              fill={c.agora ? '#ef4444' : '#22c55e'}
              stroke="#fff"
              strokeWidth="1.5"
            />
          </g>
        ))}
        <path d={line} fill="none" stroke="#2563eb" strokeWidth="2" />
      </svg>
      <p className="mt-1 text-xs text-muted-foreground">
        Blue line = image memory · Green dot = Agora released · Red dot = engine still alive
      </p>
    </div>
  );
}

export function useLiveDeviceHistory(liveDevices, tick) {
  const [history, setHistory] = useState({});

  useEffect(() => {
    if (!liveDevices?.length) {
      setHistory({});
      return;
    }

    setHistory((prev) => {
      const next = { ...prev };
      const now = Date.now();
      const liveIds = new Set(liveDevices.map((d) => d.userId));

      for (const device of liveDevices) {
        const key = device.userId;
        const point = {
          t: now,
          mb: Number(device.imageMemoryWithExpoMb) || 0,
          images: Number(device.activeImageCount) || 0,
          savings: Number(device.savingsMb) || 0,
        };
        const existing = next[key] || [];
        next[key] = [...existing, point].slice(-48);
      }

      for (const key of Object.keys(next)) {
        if (!liveIds.has(key)) delete next[key];
      }

      return next;
    });
  }, [liveDevices, tick]);

  return history;
}

export function DeviceMemoryMetricsPanel({ device, historyPoints, subtitle, stepCount = 8, embedded = false }) {
  const imageMb = Number(device.imageMemoryWithExpoMb) || 0;
  const totalMb = Number(device.totalMemoryMb) || 0;
  const savingsMb = Number(device.savingsMb) || 0;
  const hasStorage = Number(device.totalStorageMb) > 0;
  const historyReady = (historyPoints?.length ?? 0) >= 2;
  const showCharts = totalMb > 0 || imageMb > 0 || hasStorage;

  return (
    <div
      className={
        embedded
          ? 'space-y-4'
          : 'overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm'
      }
    >
      <div className="border-b bg-gray-50/80 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-semibold text-gray-900">{device.deviceModel}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <HardwareStatusBadges device={device} />
            {savingsMb > 0 ? (
              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700">
                {formatMbPrecise(savingsMb)} saved now
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <UsageAndBenefitSection device={device} stepCount={stepCount} live />

      {showCharts ? (
        <div className={`grid grid-cols-1 gap-4 lg:grid-cols-2 ${embedded ? '' : 'px-4 pb-4'}`}>
          <MemoryGauge
            valueMb={imageMb}
            totalMb={totalMb}
            label="On-screen image RAM"
          />
          <MemoryDonut
            valueMb={imageMb}
            totalMb={totalMb}
            savingsMb={savingsMb}
            deviceLabel={device.deviceModel}
            usedStorageMb={device.usedStorageMb}
            totalStorageMb={device.totalStorageMb}
          />
        </div>
      ) : (
        <div
          className={`mx-4 mb-4 rounded-lg border border-dashed bg-gray-50/50 px-4 py-8 text-center text-sm text-muted-foreground ${embedded ? '' : ''}`}
        >
          <p className="font-medium text-gray-700">Charts loading</p>
          <p className="mt-1 text-xs">First memory ping from the device (~20s on live)</p>
        </div>
      )}

      <div className={embedded ? 'pt-2' : 'border-t px-4 py-4'}>
        <MemoryTimeline
          points={historyPoints}
          label={
            historyReady
              ? 'Memory trend (this live session)'
              : 'Memory trend — needs 2+ pings (~40s on stream)'
          }
        />
      </div>
    </div>
  );
}

export function ProbeMetricsPanel({ probe, formatReason, formatRole, roleBadgeClass, verdictBadgeClass, formatVerdict }) {
  const samples = probe.samples || [];
  const finalSample = samples[samples.length - 1];
  const imageMb = finalSample?.imageMemoryWithExpoMb ?? 0;
  const totalMb = probe.totalMemoryMb ?? 0;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b bg-gray-50/80 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-gray-900">{probe.deviceModel}</p>
            <p className="text-xs text-muted-foreground">
              {formatReason(probe.reason)} · {new Date(probe.reportedAt).toLocaleString()}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${roleBadgeClass(probe.role)}`}>
              {formatRole(probe.role)}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${verdictBadgeClass(probe.verdict)}`}>
              {formatVerdict(probe.verdict)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 p-4 lg:grid-cols-2">
        <MemoryGauge
          valueMb={imageMb}
          totalMb={totalMb}
          label="Image memory at +30s"
        />
        <MemoryDonut valueMb={imageMb} totalMb={totalMb} deviceLabel={probe.deviceModel} />
      </div>

      <div className="border-t px-4 py-4">
        <ProbeTimeline samples={samples} />
        {probe.issues?.length > 0 ? (
          <p className="mt-3 text-sm text-amber-800">Issues: {probe.issues.join(', ')}</p>
        ) : null}
      </div>
    </div>
  );
}

export default DeviceMemoryMetricsPanel;
