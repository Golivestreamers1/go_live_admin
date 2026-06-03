import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowDown,
  CheckCircle2,
  Cpu,
  MemoryStick,
  RefreshCw,
  Smartphone,
  Sparkles,
  TrendingDown,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import stabilizationService from '../services/stabilizationService';
import { usePolling } from '../hooks/usePolling';

const formatMb = (mb) => {
  if (mb == null) return '—';
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${Math.round(mb)} MB`;
};

const formatPct = (n) => (n == null ? '—' : `${n}%`);

const ScenarioBar = ({ beforeMb, afterMb, targetMb, title, subtitle }) => {
  const max = Math.max(beforeMb || 1, afterMb || 0, targetMb || 0) * 1.1;
  const beforeW = `${Math.min(100, ((beforeMb || 0) / max) * 100)}%`;
  const afterW = afterMb != null ? `${Math.min(100, (afterMb / max) * 100)}%` : '0%';
  const targetW = targetMb != null ? `${Math.min(100, (targetMb / max) * 100)}%` : null;
  const saved =
    beforeMb && afterMb != null ? Math.round(((beforeMb - afterMb) / beforeMb) * 100) : null;

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {saved != null ? (
          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
            <TrendingDown className="mr-1 h-3 w-3" />
            {saved}% lighter
          </Badge>
        ) : null}
      </div>
      <div className="mt-4 space-y-3">
        <div>
          <div className="mb-1 flex justify-between text-xs text-gray-500">
            <span>Before optimization</span>
            <span className="font-medium text-amber-700">{formatMb(beforeMb)}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-amber-400" style={{ width: beforeW }} />
          </div>
        </div>
        {targetW ? (
          <div>
            <div className="mb-1 flex justify-between text-xs text-gray-500">
              <span>Target</span>
              <span className="font-medium text-sky-700">{formatMb(targetMb)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full border border-dashed border-sky-400 bg-sky-100"
                style={{ width: targetW }}
              />
            </div>
          </div>
        ) : null}
        <div>
          <div className="mb-1 flex justify-between text-xs text-gray-500">
            <span>After optimization</span>
            <span className="font-medium text-emerald-700">
              {afterMb != null ? formatMb(afterMb) : 'Collecting live data…'}
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: afterW }} />
          </div>
        </div>
      </div>
    </div>
  );
};

const GaugeArc = ({ value, max, label, unit = '%', tone = 'emerald' }) => {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const toneStroke =
    tone === 'amber' ? '#f59e0b' : tone === 'rose' ? '#f43f5e' : '#10b981';
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-28 w-28">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r="48" fill="none" stroke="#e5e7eb" strokeWidth="10" />
          <circle
            cx="60"
            cy="60"
            r="48"
            fill="none"
            stroke={toneStroke}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * 301} 301`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tabular-nums text-gray-900">
            {value}
            {unit}
          </span>
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">{label}</p>
    </div>
  );
};

const ProbeSparkline = ({ samples }) => {
  if (!samples?.length) return <span className="text-xs text-muted-foreground">—</span>;
  const vals = samples.map((s) => s.imageMemoryWithExpoMb || 0);
  const max = Math.max(...vals, 1);
  return (
    <div className="flex h-8 items-end gap-0.5">
      {vals.map((v, i) => (
        <div
          key={`${i}-${v}`}
          className="w-1.5 rounded-t bg-indigo-400"
          style={{ height: `${Math.max(8, (v / max) * 100)}%` }}
          title={`+${samples[i]?.atSec ?? 0}s: ${v} MB`}
        />
      ))}
    </div>
  );
};

const OptimizationImpact = () => {
  const polling = usePolling(() => stabilizationService.getOptimizationImpact(), {
    defaultIntervalMs: 30_000,
  });
  const data = polling.data;
  const headline = data?.headline;
  const scenarios = data?.scenarios || [];
  const cpu = data?.cpu;
  const live = data?.liveProof;
  const modules = data?.modules || [];
  const probes = data?.recentProbes || [];

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
          <h1 className="flex items-center gap-2 text-3xl font-bold text-gray-900">
            <Sparkles className="h-8 w-8 text-emerald-500" />
            Optimization Impact
          </h1>
          <p className="mt-1 max-w-3xl text-gray-600">
            Client-ready view of how our performance work makes Go Live lighter, smoother, and
            more stable — with before/after benchmarks and live proof from real devices.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={polling.refresh} disabled={polling.isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${polling.isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card className="overflow-hidden border-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-indigo-700 text-white shadow-lg">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-100">Overall improvement</p>
              <p className="mt-1 text-3xl font-bold sm:text-4xl">
                {headline?.improvementPct != null
                  ? `~${headline.improvementPct}% better memory efficiency`
                  : 'Measuring live impact…'}
              </p>
              <p className="mt-2 max-w-xl text-sm text-emerald-50">{headline?.label}</p>
            </div>
            <div className="flex flex-wrap gap-6">
              <GaugeArc
                value={headline?.improvementPct ?? 0}
                max={100}
                label="Avg scenario gain"
                tone="emerald"
              />
              {cpu?.afterPct != null ? (
                <GaugeArc
                  value={cpu.afterPct}
                  max={cpu.beforePct || 244}
                  label="CPU after gift (idle)"
                  unit="%"
                  tone="emerald"
                />
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <MemoryStick className="h-5 w-5 text-indigo-500" />
          Before vs after (key scenarios)
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {scenarios.map((s) => (
            <ScenarioBar
              key={s.id}
              title={s.title}
              subtitle={s.subtitle}
              beforeMb={s.beforeMb}
              afterMb={s.afterMb}
              targetMb={s.targetMb}
            />
          ))}
        </div>
      </div>

      {cpu ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Cpu className="h-5 w-5 text-violet-500" />
              CPU during live gifting
            </CardTitle>
            <CardDescription>
              Multi-core CPU spike while gifts play — lower is better for battery and heat.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center justify-around gap-8 py-2">
              <GaugeArc value={cpu.beforePct} max={300} label="Before (peak)" unit="%" tone="rose" />
              <ArrowDown className="hidden h-8 w-8 text-emerald-500 sm:block" />
              <GaugeArc
                value={cpu.afterPct ?? 0}
                max={300}
                label="After (steady)"
                unit="%"
                tone="emerald"
              />
            </div>
            {cpu.improvementPct != null ? (
              <p className="mt-4 text-center text-sm text-emerald-700">
                ~{cpu.improvementPct}% lower CPU at steady state after gift animations complete
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Smartphone className="h-5 w-5 text-sky-500" />
          Live proof (real devices right now)
        </h2>
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Devices reporting</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {live?.devicesReportingNow ?? '—'}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {live
                ? `${live.streamersLive} streaming · ${live.viewersLive} watching`
                : 'No live sessions'}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Image RAM saved (live)</CardDescription>
              <CardTitle className="text-2xl tabular-nums text-indigo-700">
                {live?.totalImageMemorySavedMb != null
                  ? `${live.totalImageMemorySavedMb.toFixed(1)} MB`
                  : '—'}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {live?.avgImageSavingsPct
                ? `${live.avgImageSavingsPct}% vs old image loading`
                : 'Across active live users'}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Clean stream exits</CardDescription>
              <CardTitle className="text-2xl tabular-nums text-emerald-700">
                {live?.recentCleanExits ?? '—'}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Camera &amp; mic released after live
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Post-live memory recovery</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {live?.probeSuccessPct != null ? `${live.probeSuccessPct}% OK` : '—'}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {live?.avgImageMemoryRecoveredAfterLiveMb != null
                ? `~${live.avgImageMemoryRecoveredAfterLiveMb} MB image cache cleared after exit`
                : `${live?.postLiveProbes ?? 0} probes in last 3 min`}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-amber-500" />
            Optimizations shipped
          </CardTitle>
          <CardDescription>What we built — each item reduces RAM, CPU, or crash risk.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {modules.map((m) => (
              <li
                key={m.id}
                className="flex gap-3 rounded-lg border border-emerald-100 bg-emerald-50/50 p-3"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <p className="font-medium text-gray-900">{m.title}</p>
                  <p className="text-xs text-muted-foreground">{m.summary}</p>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {probes.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent post-live memory probes</CardTitle>
            <CardDescription>
              Samples at +0s, +5s, +15s, +30s after leaving a stream — bars show image cache
              dropping.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Device</th>
                  <th className="pb-2 pr-4 font-medium">Role</th>
                  <th className="pb-2 pr-4 font-medium">Verdict</th>
                  <th className="pb-2 pr-4 font-medium">Recovery curve</th>
                  <th className="pb-2 font-medium">Phone RAM</th>
                </tr>
              </thead>
              <tbody>
                {probes.map((p) => (
                  <tr key={`${p.userId}-${p.reportedAt}`} className="border-b last:border-0">
                    <td className="py-3 pr-4">
                      <p className="font-medium">{p.deviceModel}</p>
                      <p className="text-xs text-muted-foreground">{p.osName}</p>
                    </td>
                    <td className="py-3 pr-4 capitalize">{p.role}</td>
                    <td className="py-3 pr-4">
                      <Badge
                        className={
                          p.verdict === 'ok'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : p.verdict === 'fail'
                              ? 'border-red-200 bg-red-50 text-red-700'
                              : 'border-amber-200 bg-amber-50 text-amber-800'
                        }
                      >
                        {p.verdict}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <ProbeSparkline samples={p.samples} />
                    </td>
                    <td className="py-3 tabular-nums">{formatMb(p.totalMemoryMb)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}

      <p className="text-center text-xs text-muted-foreground">
        Benchmarks update from{' '}
        <code className="rounded bg-gray-100 px-1">optimizationBaselines.js</code> — live tiles
        refresh every 30s from devices on staging/production builds with telemetry enabled.
      </p>
    </div>
  );
};

export default OptimizationImpact;
