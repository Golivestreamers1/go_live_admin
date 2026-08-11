import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import financeService from "../services/financeService";

const usd = (v) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(v) || 0);

const usdPrecise = (v) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(v) || 0,
  );

const num = (v) => new Intl.NumberFormat("en-US").format(Number(v) || 0);
const pct = (v) => `${(Number(v) || 0).toFixed(1)}%`;

/* ------------------------------------------------------------------------- */
/* Charts — hand-rolled SVG. No charting dependency exists in this app and     */
/* two shapes do not justify adding one.                                       */
/* ------------------------------------------------------------------------- */

/**
 * Horizontal waterfall. Horizontal rather than vertical so the step labels
 * ("Store & processor fees") read straight instead of rotated.
 */
const Waterfall = ({ steps }) => {
  const [hover, setHover] = useState(null);

  const rows = useMemo(() => {
    let cursor = 0;
    return steps.map((s) => {
      const value = Number(s.usd) || 0;
      if (s.direction === "net") {
        return { ...s, value, start: 0, end: value, kind: "net" };
      }
      const start = cursor;
      const end = cursor + value;
      cursor = end;
      return { ...s, value, start, end, kind: value >= 0 ? "in" : "out" };
    });
  }, [steps]);

  const max = Math.max(...rows.map((r) => Math.max(r.start, r.end)), 1);
  const rowH = 34;
  const gap = 8;
  const height = rows.length * (rowH + gap);
  const labelW = 210;
  const valueW = 110;

  return (
    <div className="viz-root relative">
      <svg
        width="100%"
        viewBox={`0 0 800 ${height}`}
        role="img"
        aria-label="Revenue waterfall from gross to platform net"
        style={{ overflow: "visible" }}
      >
        {rows.map((r, i) => {
          const y = i * (rowH + gap);
          const plotW = 800 - labelW - valueW;
          const x = (v) => labelW + (Math.abs(v) / max) * plotW;
          const bx = x(Math.min(r.start, r.end));
          const bw = Math.max(x(Math.max(r.start, r.end)) - bx, 2);
          const fill =
            r.kind === "net"
              ? "var(--viz-net)"
              : r.kind === "in"
                ? "var(--viz-in)"
                : "var(--viz-out)";
          return (
            <g
              key={r.key}
              onMouseEnter={() => setHover(r.key)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "default" }}
            >
              {/* Full-width hit target — bigger than the mark, per hover spec. */}
              <rect x="0" y={y} width="800" height={rowH + gap} fill="transparent" />
              <text
                x="0"
                y={y + rowH / 2}
                dominantBaseline="middle"
                className="fill-[var(--viz-ink-2)]"
                style={{ fontSize: 12 }}
              >
                {r.label}
              </text>
              <rect
                x={bx}
                y={y + 6}
                width={bw}
                height={rowH - 12}
                rx="4"
                fill={fill}
                opacity={hover && hover !== r.key ? 0.45 : 1}
              />
              <text
                x="800"
                y={y + rowH / 2}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-[var(--viz-ink-1)]"
                style={{ fontSize: 12, fontVariantNumeric: "tabular-nums" }}
              >
                {usd(r.value)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: "var(--viz-in)" }}
          />
          Money in
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: "var(--viz-out)" }}
          />
          Money out
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: "var(--viz-net)" }}
          />
          Net
        </span>
      </div>
    </div>
  );
};

/** Monthly gross revenue. Single series, so no legend — the title names it. */
const MonthlyBars = ({ data }) => {
  const [hover, setHover] = useState(null);
  if (!data.length) {
    return <p className="text-sm text-muted-foreground">No revenue in this window.</p>;
  }

  const max = Math.max(...data.map((d) => d.grossUsd), 1);
  const w = 800;
  const h = 200;
  const padB = 28;
  const padT = 16;
  const slot = w / data.length;
  const barW = Math.min(slot - 6, 54);

  return (
    <div className="viz-root relative">
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Gross revenue by month">
        <line
          x1="0"
          y1={h - padB}
          x2={w}
          y2={h - padB}
          stroke="var(--viz-axis)"
          strokeWidth="1"
        />
        {data.map((d, i) => {
          const bh = ((d.grossUsd / max) * (h - padB - padT)) || 0;
          const x = i * slot + (slot - barW) / 2;
          const y = h - padB - bh;
          const isHover = hover === d.period;
          return (
            <g
              key={d.period}
              onMouseEnter={() => setHover(d.period)}
              onMouseLeave={() => setHover(null)}
            >
              <rect x={i * slot} y={0} width={slot} height={h} fill="transparent" />
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(bh, 2)}
                rx="4"
                fill="var(--viz-in)"
                opacity={hover && !isHover ? 0.45 : 1}
              />
              {isHover && (
                <text
                  x={i * slot + slot / 2}
                  y={y - 5}
                  textAnchor="middle"
                  className="fill-[var(--viz-ink-1)]"
                  style={{ fontSize: 11, fontVariantNumeric: "tabular-nums" }}
                >
                  {usd(d.grossUsd)}
                </text>
              )}
              <text
                x={i * slot + slot / 2}
                y={h - padB + 15}
                textAnchor="middle"
                className="fill-[var(--viz-ink-3)]"
                style={{ fontSize: 10 }}
              >
                {d.period}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const Stat = ({ label, value, sub, emphasis }) => (
  <Card>
    <CardContent className="pt-5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={`mt-1 font-semibold tabular-nums ${
          emphasis ? "text-3xl" : "text-2xl"
        }`}
      >
        {value}
      </p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </CardContent>
  </Card>
);

/* ------------------------------------------------------------------------- */

const FinanceOverview = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [buckets, setBuckets] = useState(null); // null = server default

  const load = useCallback(
    async (opts = {}) => {
      try {
        setLoading(true);
        const result = await financeService.getOverview({
          from: opts.from ?? from,
          to: opts.to ?? to,
          groupBy: "month",
          buckets: opts.buckets ?? buckets ?? undefined,
        });
        setData(result);
        if (buckets === null && result?.revenue?.byBucket) {
          setBuckets(
            result.revenue.byBucket.filter((b) => b.included).map((b) => b.key),
          );
        }
      } catch (error) {
        toast.error(
          error?.response?.data?.message || "Failed to load finance overview",
        );
      } finally {
        setLoading(false);
      }
    },
    [from, to, buckets],
  );

  useEffect(() => {
    load();
    // Intentionally load once on mount; filters apply via explicit Apply click.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleBucket = (key) => {
    const next = (buckets || []).includes(key)
      ? (buckets || []).filter((b) => b !== key)
      : [...(buckets || []), key];
    setBuckets(next);
    load({ buckets: next });
  };

  const monthly = useMemo(() => {
    if (!data?.timeSeries) return [];
    const active = new Set(buckets || []);
    const byPeriod = new Map();
    for (const row of data.timeSeries) {
      if (active.size && !active.has(row.bucket)) continue;
      byPeriod.set(row.period, (byPeriod.get(row.period) || 0) + row.grossUsd);
    }
    return [...byPeriod.entries()]
      .map(([period, grossUsd]) => ({ period, grossUsd }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }, [data, buckets]);

  if (loading && !data) {
    return <div className="p-6 text-sm text-muted-foreground">Loading finance overview…</div>;
  }
  if (!data) {
    return <div className="p-6 text-sm text-muted-foreground">No data.</div>;
  }

  const h = data.headline;

  return (
    <div className="viz-root space-y-6 p-6">
      <style>{`
        .viz-root {
          --viz-in:     #2a78d6;
          --viz-out:    #e34948;
          --viz-net:    #0b0b0b;
          --viz-ink-1:  #0b0b0b;
          --viz-ink-2:  #52514e;
          --viz-ink-3:  #898781;
          --viz-axis:   #c3c2b7;
        }
        .dark .viz-root {
          --viz-in:     #3987e5;
          --viz-out:    #e66767;
          --viz-net:    #ffffff;
          --viz-ink-1:  #ffffff;
          --viz-ink-2:  #c3c2b7;
          --viz-ink-3:  #898781;
          --viz-axis:   #383835;
        }
      `}</style>

      <div>
        <h1 className="text-2xl font-semibold">Money Flow</h1>
        <p className="text-sm text-muted-foreground">
          Where revenue comes from, what it costs, and what the platform keeps.
        </p>
      </div>

      {/* Filters — one row above the charts. */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-5">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">From</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">To</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
          </div>
          <Button onClick={() => load()} disabled={loading}>
            {loading ? "Loading…" : "Apply"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setFrom("");
              setTo("");
              load({ from: "", to: "" });
            }}
            disabled={loading}
          >
            All time
          </Button>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Count in headline:</span>
            {data.revenue.byBucket.map((b) => {
              const on = (buckets || []).includes(b.key);
              return (
                <button
                  key={b.key}
                  type="button"
                  title={b.note}
                  onClick={() => toggleBucket(b.key)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                    on
                      ? "border-transparent bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {b.label} · {usd(b.grossUsd)}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Headline */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Gross revenue" value={usd(h.grossUsd)} sub="Selected buckets + subscriptions" />
        <Stat label="Store & processor fees" value={`−${usd(h.feeUsd)}`} sub="Estimated — see assumptions" />
        <Stat label="Platform net (accrual)" value={usd(h.accrualNetUsd)} sub={`${pct(h.accrualMarginPct)} margin`} emphasis />
        <Stat label="Platform net (cash)" value={usd(h.cashNetUsd)} sub={`${pct(h.cashMarginPct)} margin`} emphasis />
      </div>

      {/* Accrual vs cash */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Accrual vs cash</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Line</TableHead>
                  <TableHead className="text-right">Accrual</TableHead>
                  <TableHead className="text-right">Cash</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Gross revenue</TableCell>
                  <TableCell className="text-right tabular-nums">{usdPrecise(data.accrual.grossUsd)}</TableCell>
                  <TableCell className="text-right tabular-nums">{usdPrecise(data.cash.grossUsd)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Store &amp; processor fees</TableCell>
                  <TableCell className="text-right tabular-nums">−{usdPrecise(data.accrual.feeUsd)}</TableCell>
                  <TableCell className="text-right tabular-nums">−{usdPrecise(data.cash.feeUsd)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Refunds (measured, IAP)</TableCell>
                  <TableCell className="text-right tabular-nums">−{usdPrecise(data.accrual.refundedUsd)}</TableCell>
                  <TableCell className="text-right tabular-nums">−{usdPrecise(data.cash.refundedUsd)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>PayPal chargeback reserve (est.)</TableCell>
                  <TableCell className="text-right tabular-nums">−{usdPrecise(data.accrual.chargebackReserveUsd)}</TableCell>
                  <TableCell className="text-right tabular-nums">−{usdPrecise(data.cash.chargebackReserveUsd)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Streamer &amp; grant obligations</TableCell>
                  <TableCell className="text-right tabular-nums">−{usdPrecise(data.accrual.obligationsUsd)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">—</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Withdrawals approved</TableCell>
                  <TableCell className="text-right text-muted-foreground">—</TableCell>
                  <TableCell className="text-right tabular-nums">−{usdPrecise(data.cash.withdrawalsApprovedUsd)}</TableCell>
                </TableRow>
                <TableRow className="font-semibold">
                  <TableCell>Platform net</TableCell>
                  <TableCell className="text-right tabular-nums">{usdPrecise(data.accrual.netUsd)}</TableCell>
                  <TableCell className="text-right tabular-nums">{usdPrecise(data.cash.netUsd)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <p className="mt-3 text-xs text-muted-foreground">{data.cash.note}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Outstanding liability</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">
              {usd(data.outstandingLiability.totalUsd)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Held right now, owed to users. Not affected by the date filter.
            </p>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Rubies</dt>
                <dd className="tabular-nums">
                  {num(data.outstandingLiability.rubies)} · {usd(data.outstandingLiability.rubiesUsd)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Coins</dt>
                <dd className="tabular-nums">
                  {num(data.outstandingLiability.coins)} · {usd(data.outstandingLiability.coinsUsd)}
                </dd>
              </div>
              <div className="flex justify-between border-t pt-2">
                <dt className="text-muted-foreground">Withdrawals pending</dt>
                <dd className="tabular-nums">{usd(data.withdrawals.pending.usd)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              Valued at {num(data.rates.rubiesPerUsd)} rubies per $1.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Waterfall */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gross to net</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Waterfall steps={data.waterfall} />
        </CardContent>
      </Card>

      {/* Obligations + platform */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Where the money goes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Obligation</TableHead>
                  <TableHead className="text-right">Rubies</TableHead>
                  <TableHead className="text-right">Coins</TableHead>
                  <TableHead className="text-right">USD</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(data.obligations).map(([key, o]) => (
                  <TableRow key={key}>
                    <TableCell>{o.label}</TableCell>
                    <TableCell className="text-right tabular-nums">{num(o.rubies)}</TableCell>
                    <TableCell className="text-right tabular-nums">{num(o.coins)}</TableCell>
                    <TableCell className="text-right tabular-nums">{usdPrecise(o.usd)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Margin by channel</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Platform</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Fees</TableHead>
                  <TableHead className="text-right">Payout</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.revenue.byPlatform.map((p) => (
                  <TableRow key={p.platform}>
                    <TableCell className="capitalize">{p.platform}</TableCell>
                    <TableCell className="text-right tabular-nums">{usd(p.grossUsd)}</TableCell>
                    <TableCell className="text-right tabular-nums">{usd(p.feeUsd)}</TableCell>
                    <TableCell className="text-right tabular-nums">{usd(p.payoutUsd)}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{pct(p.marginPct)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="mt-3 text-xs text-muted-foreground">
              Payout assumes every purchased coin is eventually gifted and cashed out.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gross revenue by month</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <MonthlyBars data={monthly} />
        </CardContent>
      </Card>

      {/* Per SKU */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Margin by SKU and platform</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead className="text-right">Sales</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Coins / $</TableHead>
                <TableHead className="text-right">Fee %</TableHead>
                <TableHead className="text-right">Payout %</TableHead>
                <TableHead className="text-right">Margin %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.revenue.bySku.map((s) => (
                <TableRow key={`${s.sku}-${s.platform}`}>
                  <TableCell className="font-mono text-xs">{s.sku}</TableCell>
                  <TableCell className="capitalize">{s.platform}</TableCell>
                  <TableCell className="text-right tabular-nums">{num(s.count)}</TableCell>
                  <TableCell className="text-right tabular-nums">{usd(s.grossUsd)}</TableCell>
                  <TableCell className="text-right tabular-nums">{num(s.coinsPerUsd)}</TableCell>
                  <TableCell className="text-right tabular-nums">{pct(s.feePct)}</TableCell>
                  <TableCell className="text-right tabular-nums">{pct(s.payoutPct)}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="inline-block h-1.5 rounded-sm"
                        style={{
                          width: `${Math.max(Math.min(s.marginPct, 100), 0) * 0.6}px`,
                          background: "var(--viz-in)",
                        }}
                      />
                      {pct(s.marginPct)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Assumptions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assumptions &amp; data quality</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Input</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.assumptions.map((a) => (
                <TableRow key={a.key}>
                  <TableCell className="whitespace-nowrap">{a.label}</TableCell>
                  <TableCell className="whitespace-nowrap font-medium">{a.value}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{a.note}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="rounded-md border p-3 text-xs text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Ruby cashout rate:</span>{" "}
              {num(data.rates.rubiesPerUsd)} rubies per $1 (source: {data.rates.rateSource}).{" "}
              {data.rates.note}
            </p>
            <p className="mt-2">
              <span className="font-medium text-foreground">Real charged amounts:</span>{" "}
              {num(data.dataQuality.storeChargedUsdRows)} of{" "}
              {num(data.dataQuality.purchaseRows)} purchase rows (
              {pct(data.dataQuality.storeChargedCoverage)}) carry a store-reported
              charged amount. {data.dataQuality.note}
            </p>
            <p className="mt-2">
              <span className="font-medium text-foreground">Excluded from headline:</span>{" "}
              {usdPrecise(data.dataQuality.excludedUsd)} sits in buckets not currently
              counted. Toggle them above to include.
            </p>
            <p className="mt-2">
              <span className="font-medium text-foreground">Subscriptions:</span>{" "}
              {data.subscriptions.caveat}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinanceOverview;
