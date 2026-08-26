import React, { useEffect, useId, useMemo, useState } from 'react';
import { STABILIZATION_PING_INTERVAL_LABEL } from '../../constants/stabilizationTelemetry';
import { appCurrentRamMb, appRamSourceLabel } from './liveDeviceShared';
import StreamHealthPanel from './StreamHealthPanel';

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

function AppRamHero({ device }) {
  const { mb, native, isEstimate, source } = appCurrentRamMb(device);
  if (mb == null) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-6 text-center">
        <p className="text-sm font-medium text-gray-700">Go Live RAM usage</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Waiting for first ping ({STABILIZATION_PING_INTERVAL_LABEL}). Rebuild app if this stays empty — native module required
          for exact OS memory.
        </p>
      </div>
    );
  }

  const isFormulaEstimate = source === 'estimate';

  return (
    <div
      className={`rounded-xl border px-5 py-4 shadow-sm ${
        native
          ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-white'
          : isFormulaEstimate
            ? 'border-amber-300 bg-gradient-to-br from-amber-50 to-white'
            : 'border-blue-300 bg-gradient-to-br from-blue-50 to-white'
      }`}
    >
      <p
        className={`text-xs font-semibold uppercase tracking-wide ${
          native ? 'text-emerald-800' : isFormulaEstimate ? 'text-amber-800' : 'text-blue-800'
        }`}
      >
        Go Live app RAM — right now
      </p>
      <p
        className={`mt-1 text-4xl font-bold tabular-nums tracking-tight ${
          native ? 'text-emerald-950' : isFormulaEstimate ? 'text-amber-950' : 'text-blue-950'
        }`}
      >
        {isEstimate ? '~' : ''}
        {formatMbPrecise(mb)}
      </p>
      <p
        className={`mt-1.5 text-sm ${
          native ? 'text-emerald-900/90' : isFormulaEstimate ? 'text-amber-900/90' : 'text-blue-900/90'
        }`}
      >
        {native
          ? 'OS process memory (same number as Xcode Memory gauge / Android Studio PSS)'
          : source === 'agora'
            ? 'Live reading from Agora SDK — updates while stream is active'
            : `Formula only (45 MB base + 110 MB Agora guess + images). Rebuild app for real OS RAM.`}
      </p>
      {isFormulaEstimate ? (
        <p className="mt-2 text-xs text-amber-800/90 tabular-nums">
          Breakdown: {formatMbPrecise(device.appBaselineRamMb ?? 45)} base
          {Number(device.appAgoraRamMb) > 0
            ? ` + ${formatMbPrecise(device.appAgoraRamMb)} Agora guess`
            : ''}
          {Number(device.appImageRamMb) > 0
            ? ` + ${formatMbPrecise(device.appImageRamMb)} images`
            : ''}
          {Number(device.appLottieRamMb) > 0
            ? ` + ${formatMbPrecise(device.appLottieRamMb)} Lottie`
            : ''}
        </p>
      ) : null}
      {native && device.appOsAvailableMemoryMb != null ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Device still has ~{formatMbPrecise(device.appOsAvailableMemoryMb)} free for all apps
        </p>
      ) : null}
    </div>
  );
}

/** Clear image-RAM stat — no semicircle gauge (midpoint label was confused with usage). */
function AppFootprintSummaryStrip({ device }) {
  const appDisk = Number(device.appStorageTotalMb) || 0;
  const { mb: appRam, native, isEstimate, source } = appCurrentRamMb(device);
  if (appDisk <= 0 && (appRam == null || appRam <= 0)) return null;

  return (
    <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {appDisk > 0 ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50/60 px-3 py-2 text-sm">
          <span className="font-medium text-blue-900">Go Live on disk</span>
          <span className="ml-2 tabular-nums text-blue-800">{formatMbPrecise(appDisk)}</span>
          {device.appStoragePctOfDevice != null ? (
            <span className="text-xs text-blue-700/80"> ({device.appStoragePctOfDevice}% of phone)</span>
          ) : null}
        </div>
      ) : null}
      {appRam != null && appRam > 0 ? (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${
            native
              ? 'border-blue-200 bg-blue-50/60'
              : source === 'estimate'
                ? 'border-amber-200 bg-amber-50/60'
                : 'border-blue-200 bg-blue-50/60'
          }`}
        >
          <span
            className={`font-medium ${
              source === 'estimate' ? 'text-amber-900' : 'text-blue-900'
            }`}
          >
            {appRamSourceLabel(source, isEstimate)}
          </span>
          <span
            className={`ml-2 tabular-nums ${source === 'estimate' ? 'text-amber-800' : 'text-blue-800'}`}
          >
            {isEstimate ? '~' : ''}
            {formatMbPrecise(appRam)}
          </span>
          {source === 'estimate' ? (
            <p className="mt-1 text-[11px] text-amber-800/90">
              Static formula — run <code className="text-[10px]">npx expo run:ios</code> for live OS
              RAM
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function MemoryBreakdownRow({ label, mb, barTotalMb, hint }) {
  const value = Math.max(0, Number(mb) || 0);
  if (value <= 0) return null;
  const total = Math.max(value, Number(barTotalMb) || value);
  const pct = clamp((value / total) * 100, 0, 100);

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium text-gray-800">{label}</span>
        <span className="shrink-0 tabular-nums text-gray-700">{formatMbPrecise(value)}</span>
      </div>
      {hint ? <p className="text-[10px] text-muted-foreground">{hint}</p> : null}
      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full bg-blue-500/80" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Xcode-like process memory breakdown from native OS APIs. */
function ProcessMemoryReport({ device }) {
  const hasNative =
    device.appProcessMemoryAvailable === true && Number(device.appProcessMemoryMb) > 0;
  if (!hasNative) return null;

  const processMb = Number(device.appProcessMemoryMb) || 0;
  const isIos = device.appProcessMemorySource === 'ios';
  const barTotal = processMb;

  return (
    <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/40 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900">
            Process memory (OS)
          </p>
          <p className="text-[11px] text-emerald-800/80">
            {isIos
              ? 'Physical footprint — same metric iOS uses for memory limits (Xcode Memory gauge)'
              : 'Total PSS — proportional set size (Android Studio Memory profiler)'}
          </p>
        </div>
        <p className="text-2xl font-bold tabular-nums text-emerald-950">{formatMbPrecise(processMb)}</p>
      </div>

      <div className="space-y-2 border-t border-emerald-200/80 pt-3">
        {isIos ? (
          <>
            <MemoryBreakdownRow
              label="Physical footprint"
              mb={device.appPhysFootprintMb ?? processMb}
              barTotalMb={barTotal}
              hint="Primary — matches Xcode debug gauge"
            />
            <MemoryBreakdownRow
              label="Resident size (RSS)"
              mb={device.appResidentMb}
              barTotalMb={barTotal}
            />
            <MemoryBreakdownRow label="Virtual size" mb={device.appVirtualMb} barTotalMb={barTotal} />
          </>
        ) : (
          <>
            <MemoryBreakdownRow
              label="Total PSS"
              mb={device.appTotalPssMb ?? processMb}
              barTotalMb={barTotal}
              hint="Primary — Android Studio process memory"
            />
            <MemoryBreakdownRow label="Java heap" mb={device.appJavaHeapMb} barTotalMb={barTotal} />
            <MemoryBreakdownRow label="Native heap" mb={device.appNativeHeapMb} barTotalMb={barTotal} />
            <MemoryBreakdownRow label="Graphics" mb={device.appGraphicsMb} barTotalMb={barTotal} />
            <MemoryBreakdownRow label="Code" mb={device.appCodeMb} barTotalMb={barTotal} />
            <MemoryBreakdownRow label="Stack" mb={device.appStackMb} barTotalMb={barTotal} />
            <MemoryBreakdownRow label="Other (system / private)" mb={device.appOtherPssMb} barTotalMb={barTotal} />
          </>
        )}
        {Number(device.appOsAvailableMemoryMb) > 0 ? (
          <p className="text-[11px] text-muted-foreground">
            OS reports ~{formatMbPrecise(device.appOsAvailableMemoryMb)} still available to apps on this
            device
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ImageMemoryCard({ valueMb, appRamMb, label = 'On-screen image RAM' }) {
  const imageMb = Math.max(0, Number(valueMb) || 0);
  const appMb = Math.max(0, Number(appRamMb) || 0);
  const pctOfApp = appMb > 0 ? clamp((imageMb / appMb) * 100, 0, 100) : 0;
  const isEmpty = imageMb <= 0;

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">{label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Photos &amp; avatars visible on screen (estimated decode size)
          </p>
        </div>
        {appMb > 0 ? (
          <span className="shrink-0 rounded-md bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-800">
            App RAM {formatMb(appMb)}
          </span>
        ) : null}
      </div>

      <div className="mt-5">
        <p className="text-4xl font-bold tabular-nums tracking-tight text-gray-900">
          {formatMbPrecise(imageMb)}
        </p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {appMb > 0 ? (
            isEmpty ? (
              <>No images on screen in this slice</>
            ) : (
              <>
                <span className="font-medium text-violet-700">{pctOfApp.toFixed(1)}%</span> of Go
                Live app RAM
              </>
            )
          ) : (
            'Part of app memory while images are visible'
          )}
        </p>
      </div>

      {appMb > 0 ? (
        <div className="mt-5">
          <div className="mb-1.5 flex justify-between text-xs text-gray-500">
            <span>Image slice of app</span>
            <span className="tabular-nums">
              {formatMbPrecise(imageMb)} / {formatMb(appMb)}
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full transition-all ${
                isEmpty ? 'bg-gray-200' : 'bg-violet-500'
              }`}
              style={{ width: `${Math.max(isEmpty ? 0 : 2, pctOfApp)}%` }}
            />
          </div>
        </div>
      ) : null}

      {isEmpty ? (
        <p className="mt-4 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          No avatars or photos on screen right now — common during stream without visible chat
          images.
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
      detail: `Mic/camera state updates from the app (${STABILIZATION_PING_INTERVAL_LABEL} pings, instant on admin via socket)`,
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
  const imagesMb = Number(device.imageMemoryWithExpoMb) || 0;
  const withoutFixMb = Number(device.imageMemoryWithoutNativeMb) || 0;
  const savingsMb = Number(device.savingsMb) || 0;
  const savingsPct = Number(device.savingsPct) || 0;
  const totalStorage = Number(device.totalStorageMb) || 0;
  const usedStorage = Number(device.usedStorageMb) || 0;
  const freeStorage = Number(device.freeStorageMb) || 0;
  const hasStorage = totalStorage > 0 && usedStorage >= 0;
  const appStorageTotal = Number(device.appStorageTotalMb) || 0;
  const appDocStorage = Number(device.appDocumentStorageMb) || 0;
  const appCacheStorage = Number(device.appCacheStorageMb) || 0;
  const hasAppStorage = appStorageTotal > 0;
  const appTrackedRam = Number(device.appTrackedRamMb) || 0;
  const hasAppTrackedRam = appTrackedRam > 0;
  const { mb: appProcessRam } = appCurrentRamMb(device);
  const hasAppProcessRam = appProcessRam != null && appProcessRam > 0;
  const hwBenefit = hardwareBenefitCopy(device, stepCount, live);

  return (
    <div className="space-y-4 border-b px-4 py-4">
      <AppRamHero device={device} />

      <div>
        <p className="text-sm font-semibold text-gray-900">App footprint detail</p>
        <p className="text-xs text-muted-foreground">
          How much Go Live uses on disk and in memory — not whole-phone totals
        </p>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">
          Go Live app
        </p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-3">
            {hasAppStorage ? (
              <>
                <UsageBar
                  label="App files on disk (sandbox)"
                  used={appStorageTotal}
                  total={appStorageTotal}
                  tone="blue"
                  sublabel={`Documents ${formatMbPrecise(appDocStorage)} · Cache ${formatMbPrecise(appCacheStorage)}${device.appStorageScanComplete === false ? ' · partial scan' : ''}`}
                />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                App disk scan pending — next live ping ({STABILIZATION_PING_INTERVAL_LABEL}).
              </p>
            )}
          </div>
          <div className="space-y-3">
            {hasAppProcessRam ? (
              <ProcessMemoryReport device={device} />
            ) : hasAppTrackedRam ? (
              <>
                <UsageBar
                  label="Tracked app RAM (estimate)"
                  used={appTrackedRam}
                  total={appTrackedRam}
                  tone="blue"
                  sublabel={`Images ${formatMbPrecise(device.appImageRamMb ?? 0)} · Lottie ~${formatMbPrecise(device.appLottieRamMb ?? 0)} · Agora ~${formatMbPrecise(device.appAgoraRamMb ?? 0)} · RN base ~${formatMbPrecise(device.appBaselineRamMb ?? 0)}`}
                />
                <p className="text-[11px] text-muted-foreground">
                  Native process RAM unavailable — rebuild the app with the process-memory module.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">App RAM on next ping ({STABILIZATION_PING_INTERVAL_LABEL}).</p>
            )}
            {hasAppProcessRam &&
            (Number(device.appImageRamMb) > 0 || Number(device.appLottieRamMb) > 0) ? (
              <p className="rounded-md border border-gray-200 bg-white/80 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                JS-visible slices only: Images {formatMbPrecise(device.appImageRamMb ?? 0)} · Lottie{' '}
                {formatMbPrecise(device.appLottieRamMb ?? 0)}. The rest of{' '}
                {formatMbPrecise(appProcessRam)} is native heap, Agora, camera/video buffers — not
                measurable from JavaScript.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-4 rounded-lg border bg-gray-50/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            In-app image memory
          </p>
          <UsageBar
            label="Images on screen (in use)"
            used={imagesMb}
            total={hasAppProcessRam ? appProcessRam : Math.max(imagesMb, withoutFixMb, 1)}
            tone="violet"
            sublabel={
              withoutFixMb > imagesMb
                ? `Without our fix this would be ${formatMbPrecise(withoutFixMb)}`
                : 'Live photo / avatar memory during this session'
            }
          />
        </div>

        <div className="space-y-4 rounded-lg border bg-gray-50/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            App files vs phone storage
          </p>
          {hasAppStorage && hasStorage ? (
            <UsageBar
              label="Go Live sandbox on device"
              used={appStorageTotal}
              total={totalStorage}
              tone="amber"
              sublabel={`Phone overall ${formatMb(usedStorage)} used · ${formatMb(freeStorage)} free`}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Storage pending — next ping ({STABILIZATION_PING_INTERVAL_LABEL}).
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
                ? `${savingsPct}% less than old image loader in this session`
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

function StorageDonutCard({ usedStorageMb, totalStorageMb }) {
  const used = Math.max(0, Number(usedStorageMb) || 0);
  const total = Math.max(Number(totalStorageMb) || 0, 1);
  const free = Math.max(0, total - used);
  const usedPct = clamp((used / total) * 100, 0, 100);
  const c = 2 * Math.PI * 52;
  const usedLen = (used / total) * c;
  const freeLen = c - usedLen;

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm font-semibold text-gray-900">Device storage</p>
        <p className="mt-0.5 text-xs text-muted-foreground">On-phone disk (ROM), not RAM</p>
      </div>

      <div className="relative mx-auto my-4 w-full max-w-[180px]">
        <svg viewBox="0 0 140 140" className="w-full" aria-hidden>
          <circle cx="70" cy="70" r="52" fill="none" stroke="#f3f4f6" strokeWidth="16" />
          <DonutSegment cx={70} cy={70} r={52} strokeWidth={16} offset={0} length={usedLen} color="#f97316" />
          <DonutSegment cx={70} cy={70} r={52} strokeWidth={16} offset={-usedLen} length={freeLen} color="#e5e7eb" />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-bold tabular-nums text-gray-900">{usedPct.toFixed(0)}%</p>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">used</p>
        </div>
      </div>

      <dl className="space-y-2.5 text-sm">
        <div className="flex items-center justify-between gap-4 rounded-lg bg-orange-50/80 px-3 py-2">
          <dt className="flex items-center gap-2 font-medium text-gray-800">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-orange-500" />
            Used
          </dt>
          <dd className="tabular-nums font-semibold text-gray-900">{formatMb(used)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-lg bg-gray-50 px-3 py-2">
          <dt className="flex items-center gap-2 font-medium text-gray-800">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-gray-300" />
            Free
          </dt>
          <dd className="tabular-nums font-semibold text-gray-900">{formatMb(free)}</dd>
        </div>
        <div className="flex justify-between border-t pt-2 text-xs text-muted-foreground">
          <span>Total capacity</span>
          <span className="tabular-nums font-medium text-gray-700">{formatMb(total)}</span>
        </div>
      </dl>
    </div>
  );
}

function RamBreakdownDonut({ valueMb, totalMb, savingsMb = 0 }) {
  const appMb = Math.max(Number(totalMb) || 0, 1);
  const imagesMb = Math.max(0, Number(valueMb) || 0);
  const benefitMb = Math.max(0, Number(savingsMb) || 0);
  const restMb = Math.max(0, appMb - imagesMb - benefitMb);
  const c = 2 * Math.PI * 52;
  const imagesLen = (imagesMb / appMb) * c;
  const benefitLen = (benefitMb / appMb) * c;
  const restLen = (restMb / appMb) * c;

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm font-semibold text-gray-900">App RAM breakdown</p>
        <p className="mt-0.5 text-xs text-muted-foreground">How image memory fits in Go Live app RAM</p>
      </div>

      <svg viewBox="0 0 140 140" className="mx-auto my-4 w-full max-w-[180px]" aria-hidden>
        <circle cx="70" cy="70" r="52" fill="none" stroke="#f3f4f6" strokeWidth="16" />
        <DonutSegment cx={70} cy={70} r={52} strokeWidth={16} offset={0} length={imagesLen} color="#8b5cf6" />
        <DonutSegment
          cx={70}
          cy={70}
          r={52}
          strokeWidth={16}
          offset={-imagesLen}
          length={benefitLen}
          color="#22c55e"
        />
        <DonutSegment
          cx={70}
          cy={70}
          r={52}
          strokeWidth={16}
          offset={-(imagesLen + benefitLen)}
          length={restLen}
          color="#e5e7eb"
        />
      </svg>

      <dl className="space-y-2 text-sm">
        {[
          { color: 'bg-violet-500', label: 'Images on screen', value: imagesMb },
          { color: 'bg-emerald-500', label: 'Saved by our fix', value: benefitMb },
          { color: 'bg-gray-300', label: 'Rest of app RAM', value: restMb },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4">
            <dt className="flex items-center gap-2 text-gray-700">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${row.color}`} />
              {row.label}
            </dt>
            <dd className="tabular-nums font-semibold text-gray-900">{formatMbPrecise(row.value)}</dd>
          </div>
        ))}
        <div className="flex justify-between border-t pt-2 text-xs text-muted-foreground">
          <span>Go Live app total</span>
          <span className="font-medium text-gray-700">{formatMb(appMb)}</span>
        </div>
      </dl>
    </div>
  );
}

/** Backend time-series → chart points (ms timestamps). */
export function normalizeMemoryHistory(history) {
  if (!Array.isArray(history) || !history.length) return [];
  return history
    .map((p) => ({
      t: new Date(p.at).getTime(),
      processMb: p.processMb != null && Number.isFinite(Number(p.processMb)) ? Number(p.processMb) : null,
      imageMb: Number(p.imageMb) || 0,
      trackedMb:
        p.trackedMb != null && Number.isFinite(Number(p.trackedMb)) ? Number(p.trackedMb) : null,
      agoraAlive: p.agoraAlive === true,
    }))
    .filter((p) => Number.isFinite(p.t))
    .sort((a, b) => a.t - b.t);
}

function RamLeakAlert({ signal }) {
  if (!signal?.message) return null;
  const isFail = signal.level === 'fail';
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-sm ${
        isFail
          ? 'border-red-200 bg-red-50 text-red-900'
          : 'border-amber-200 bg-amber-50 text-amber-900'
      }`}
    >
      <p className="font-semibold">{isFail ? 'Possible memory leak' : 'RAM climbing'}</p>
      <p className="mt-0.5 text-xs opacity-90">{signal.message}</p>
      {signal.fromMb != null && signal.toMb != null ? (
        <p className="mt-1 text-xs tabular-nums">
          {formatMbPrecise(signal.fromMb)} → {formatMbPrecise(signal.toMb)} over {signal.samples}{' '}
          pings
        </p>
      ) : null}
    </div>
  );
}

function DualMemoryTimeline({ points, label = 'Live memory time series' }) {
  const gradProcessId = useId();
  const gradImageId = useId();
  const width = 640;
  const height = 180;
  const pad = { top: 16, right: 12, bottom: 32, left: 48 };

  const chart = useMemo(() => {
    if (!points?.length) return null;

    const processVals = points.map((p) => p.processMb).filter((v) => v != null && v > 0);
    const imageVals = points.map((p) => p.imageMb).filter((v) => v > 0);
    const hasProcess = processVals.length > 0;
    const hasImage = imageVals.length > 0;

    if (!hasProcess && !hasImage) return { empty: true };

    const allVals = [...processVals, ...imageVals];
    const maxVal = Math.max(...allVals, 0.5);
    const start = points[0].t;
    const end = points[points.length - 1].t;
    const span = Math.max(end - start, 1);
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;

    const toCoord = (p) => ({
      x: pad.left + ((p.t - start) / span) * plotW,
      processY:
        p.processMb != null && p.processMb > 0
          ? pad.top + plotH - (p.processMb / maxVal) * plotH
          : null,
      imageY: pad.top + plotH - (p.imageMb / maxVal) * plotH,
      ...p,
    });

    const coords = points.map(toCoord);

    const lineFor = (key) =>
      coords
        .filter((c) => c[key] != null)
        .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c[key].toFixed(1)}`)
        .join(' ');

    const processLine = hasProcess ? lineFor('processY') : '';
    const imageLine = hasImage ? lineFor('imageY') : '';

    const durationSec = Math.floor(span / 1000);
    const durationLabel =
      durationSec >= 3600
        ? `${Math.floor(durationSec / 3600)}h ${Math.floor((durationSec % 3600) / 60)}m`
        : durationSec >= 60
          ? `${Math.floor(durationSec / 60)} min ${durationSec % 60} sec`
          : `${durationSec} sec`;

    return {
      coords,
      processLine,
      imageLine,
      maxVal,
      hasProcess,
      hasImage,
      durationLabel,
      processHigh: hasProcess ? Math.max(...processVals) : null,
      processLow: hasProcess ? Math.min(...processVals) : null,
      imageHigh: hasImage ? Math.max(...imageVals) : null,
      imageLow: hasImage ? Math.min(...imageVals) : null,
      agoraMarkers: coords.filter((c) => c.agoraAlive),
    };
  }, [points]);

  if (!chart) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 text-center">
        <p className="text-sm font-medium text-gray-700">Collecting live samples…</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Server stores each ping ({STABILIZATION_PING_INTERVAL_LABEL}). Chart appears after 2+ samples while on stream.
        </p>
      </div>
    );
  }

  if (chart.empty) {
    return (
      <div>
        <p className="mb-2 text-sm font-semibold text-gray-900">{label}</p>
        <div className="flex min-h-[180px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 text-sm text-muted-foreground">
          No measurable RAM in this window yet.
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-gray-900">{label}</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full rounded-lg bg-[#fafafa]" aria-hidden>
        <defs>
          <linearGradient id={gradProcessId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id={gradImageId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
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
              <text x={pad.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#9ca3af">
                {val < 1 ? val.toFixed(1) : Math.round(val)}
              </text>
            </g>
          );
        })}
        {chart.processLine ? (
          <path d={chart.processLine} fill="none" stroke="#059669" strokeWidth="2.5" />
        ) : null}
        {chart.imageLine ? (
          <path d={chart.imageLine} fill="none" stroke="#2563eb" strokeWidth="2" strokeDasharray="6 3" />
        ) : null}
        {chart.agoraMarkers.map((c) => (
          <circle
            key={`agora-${c.t}`}
            cx={c.x}
            cy={pad.top + (height - pad.top - pad.bottom)}
            r="3"
            fill="#ef4444"
          />
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>
          Window: <span className="font-medium text-gray-900">{chart.durationLabel}</span>
        </span>
        {chart.hasProcess ? (
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-4 rounded bg-emerald-600" />
            Process RAM high/low:{' '}
            <span className="font-medium tabular-nums text-gray-900">
              {formatMbPrecise(chart.processLow)} – {formatMbPrecise(chart.processHigh)}
            </span>
          </span>
        ) : null}
        {chart.hasImage ? (
          <span className="flex items-center gap-1">
            <span className="inline-block h-0.5 w-4 border-t-2 border-dashed border-blue-600" />
            Image RAM high/low:{' '}
            <span className="font-medium tabular-nums text-gray-900">
              {formatMbPrecise(chart.imageLow)} – {formatMbPrecise(chart.imageHigh)}
            </span>
          </span>
        ) : null}
        {chart.agoraMarkers.length > 0 ? (
          <span className="text-red-700">Red ticks = Agora engine alive at ping</span>
        ) : null}
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
    const allZero = vals.every((v) => v <= 0);
    if (allZero) return { allZero: true };

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
      <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 text-center">
        <p className="text-sm font-medium text-gray-700">Collecting live samples…</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Chart appears after 2+ pings from the device (~2 min on stream at {STABILIZATION_PING_INTERVAL_LABEL} interval).
        </p>
      </div>
    );
  }

  if (chart.allZero) {
    return (
      <div>
        <p className="mb-2 text-sm font-semibold text-gray-900">{label}</p>
        <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 text-center">
          <p className="text-sm font-medium text-gray-700">No image memory on screen yet</p>
          <p className="max-w-md text-xs text-muted-foreground">
            Trend line starts when avatars or photos appear in the live UI. Stream without visible
            images stays at 0 MB — that is normal.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-gray-900">{label}</p>
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

  const allZero = points.every((p) => p.mb <= 0);
  const maxMb = allZero ? 1 : Math.max(...points.map((p) => p.mb), 0.5);
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
      <p className="mb-2 text-sm font-semibold text-gray-900">Post-live cleanup timeline (+0s → +30s)</p>
      {allZero ? (
        <p className="mb-3 rounded-lg border border-dashed border-emerald-200 bg-emerald-50/50 px-3 py-2 text-xs text-emerald-900">
          Image memory stayed at 0 MB through cleanup — Agora and images released cleanly.
        </p>
      ) : null}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full rounded-lg border border-gray-100 bg-gray-50/50" aria-hidden>
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
  const savingsMb = Number(device.savingsMb) || 0;
  const { mb: appRamMb } = appCurrentRamMb(device);
  const hasStorage = Number(device.totalStorageMb) > 0;
  const serverHistory = normalizeMemoryHistory(device.memoryHistory);
  const chartPoints =
    serverHistory.length >= 2
      ? serverHistory
      : (historyPoints || []).map((p) => ({
          t: p.t,
          processMb: null,
          imageMb: p.mb,
          agoraAlive: false,
        }));
  const historyReady = chartPoints.length >= 2;
  const showCharts = appRamMb != null || imageMb > 0 || hasStorage;
  const usingServerHistory = serverHistory.length >= 2;

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

      <div className={embedded ? '' : 'px-4'}>
        <StreamHealthPanel device={device} />
      </div>

      <AppFootprintSummaryStrip device={device} />

      {device.ramLeakSignal ? <div className={embedded ? '' : 'px-4'}><RamLeakAlert signal={device.ramLeakSignal} /></div> : null}

      {showCharts ? (
        <div className={`grid grid-cols-1 gap-4 lg:grid-cols-2 ${embedded ? '' : 'px-4 pb-4'}`}>
          <ImageMemoryCard
            valueMb={imageMb}
            appRamMb={appRamMb}
            label="On-screen image RAM"
          />
          {hasStorage ? (
            <StorageDonutCard
              usedStorageMb={device.usedStorageMb}
              totalStorageMb={device.totalStorageMb}
            />
          ) : (
            <RamBreakdownDonut
              valueMb={imageMb}
              totalMb={appRamMb ?? imageMb + savingsMb}
              savingsMb={savingsMb}
            />
          )}
        </div>
      ) : (
        <div
          className={`mx-4 mb-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-8 text-center ${embedded ? '' : ''}`}
        >
          <p className="text-sm font-medium text-gray-700">Waiting for device metrics</p>
          <p className="mt-1 text-xs text-muted-foreground">
            First ping shortly after live opens ({STABILIZATION_PING_INTERVAL_LABEL} interval).
          </p>
        </div>
      )}

      <div className={embedded ? 'pt-2' : 'border-t px-4 py-4 space-y-4'}>
        {usingServerHistory ? (
          <DualMemoryTimeline
            points={chartPoints}
            label={
              historyReady
                ? 'Process & image RAM (server time series)'
                : 'Time series — needs 2+ pings (~10 sec on stream)'
            }
          />
        ) : (
          <MemoryTimeline
            points={chartPoints.map((p) => ({ t: p.t, mb: p.imageMb }))}
            label={
              historyReady
                ? 'Image RAM trend (this browser session — rebuild app for OS process line)'
                : 'Memory trend — needs 2+ pings (~10 sec on stream)'
            }
          />
        )}
      </div>
    </div>
  );
}

export function ProbeMetricsPanel({ probe, formatReason, formatRole, roleBadgeClass, verdictBadgeClass, formatVerdict }) {
  const samples = probe.samples || [];
  const finalSample = samples[samples.length - 1];
  const imageMb = finalSample?.imageMemoryWithExpoMb ?? 0;
  const probeDevice = {
    appProcessMemoryAvailable: probe.appProcessMemoryAvailable,
    appProcessMemoryMb: probe.appProcessMemoryMb ?? finalSample?.appProcessMemoryMb,
    appTrackedRamMb: probe.appTrackedRamMb ?? finalSample?.appTrackedRamMb,
  };
  const { mb: appRamMb } = appCurrentRamMb(probeDevice);
  const appMb = appRamMb ?? imageMb;

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

      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
        <ImageMemoryCard valueMb={imageMb} appRamMb={appMb} label="Image memory at +30s" />
        <RamBreakdownDonut valueMb={imageMb} totalMb={appMb} />
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
