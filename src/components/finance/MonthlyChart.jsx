import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

/**
 * Month by month — money in, what it cost, and what was left.
 *
 * Hand-rolled SVG. The admin has no charting dependency and one chart does not
 * justify adding 200kB of one.
 *
 * The series is built server-side in the same pass as the headline, so this
 * chart cannot disagree with the totals above it. (The page it replaces built
 * its chart from a second query with different filters, which is exactly why
 * its chart and its headline never matched.)
 */

const money = (v) =>
  v === null || v === undefined || Number.isNaN(Number(v))
    ? "—"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(Number(v));

const moneyExact = (v) =>
  v === null || v === undefined || Number.isNaN(Number(v))
    ? "—"
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v));

const SERIES = [
  { key: "inUsd", label: "Money in", className: "fill-emerald-500", swatch: "bg-emerald-500" },
  { key: "feeUsd", label: "Store fees", className: "fill-amber-500", swatch: "bg-amber-500" },
  { key: "outUsd", label: "Paid out", className: "fill-rose-500", swatch: "bg-rose-500" },
  { key: "keptUsd", label: "We kept", className: "fill-sky-600", swatch: "bg-sky-600" },
];

export default function MonthlyChart({ months }) {
  const [hover, setHover] = useState(null);

  if (!Array.isArray(months) || months.length === 0) return null;

  const max = Math.max(
    ...months.flatMap((m) => SERIES.map((s) => Math.abs(Number(m[s.key]) || 0))),
    1,
  );

  // A fixed viewBox scaled by CSS: no resize observer, no layout thrash.
  const W = 900;
  const H = 260;
  const padLeft = 56;
  const padBottom = 34;
  const padTop = 12;
  const plotH = H - padBottom - padTop;
  const plotW = W - padLeft - 12;
  const groupW = plotW / months.length;
  // Capped: with only two months in range the bars grew to ~170px each and
  // read as solid blocks rather than as a comparison.
  const barW = Math.min(Math.max((groupW - 10) / SERIES.length, 2), 34);
  const clusterW = barW * SERIES.length;

  // Four gridlines is enough to read a value off; more is noise.
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ f, value: max * f }));

  const active = hover !== null ? months[hover] : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">Month by month</CardTitle>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {SERIES.map((s) => (
              <span key={s.key} className="flex items-center gap-1.5">
                <span className={`inline-block h-2.5 w-2.5 rounded-sm ${s.swatch}`} />
                {s.label}
              </span>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-[260px] w-full min-w-[640px]"
            role="img"
            aria-label="Money in, store fees, money paid out and money kept, by month"
          >
            {ticks.map((t) => {
              const y = padTop + plotH - t.f * plotH;
              return (
                <g key={t.f}>
                  <line
                    x1={padLeft}
                    x2={W - 12}
                    y1={y}
                    y2={y}
                    className="stroke-border"
                    strokeWidth="1"
                  />
                  <text
                    x={padLeft - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-muted-foreground text-[11px]"
                  >
                    {money(t.value)}
                  </text>
                </g>
              );
            })}

            {months.map((m, i) => {
              const gx = padLeft + i * groupW;
              return (
                <g
                  key={m.key}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                >
                  {/* Full-height hit area, so hovering the gap still works. */}
                  <rect
                    x={gx}
                    y={padTop}
                    width={groupW}
                    height={plotH}
                    className={hover === i ? "fill-muted/50" : "fill-transparent"}
                  />
                  {SERIES.map((s, si) => {
                    const value = Math.abs(Number(m[s.key]) || 0);
                    const h = (value / max) * plotH;
                    return (
                      <rect
                        key={s.key}
                        x={gx + (groupW - clusterW) / 2 + si * barW}
                        y={padTop + plotH - h}
                        width={barW - 1}
                        height={Math.max(h, value > 0 ? 1 : 0)}
                        className={s.className}
                        rx="1"
                      >
                        <title>{`${m.label} — ${s.label}: ${moneyExact(m[s.key])}`}</title>
                      </rect>
                    );
                  })}
                  <text
                    x={gx + groupW / 2}
                    y={H - 12}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[11px]"
                  >
                    {m.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* The numbers behind the bars — a chart nobody can read the values off
            is decoration, so the hovered month is spelled out here. */}
        <div className="mt-3 grid gap-2 rounded-md bg-muted/50 p-3 sm:grid-cols-4">
          {SERIES.map((s) => (
            <div key={s.key}>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`inline-block h-2 w-2 rounded-sm ${s.swatch}`} />
                {s.label}
              </div>
              <div className="text-lg font-semibold tabular-nums">
                {moneyExact(
                  active
                    ? active[s.key]
                    : months.reduce((acc, m) => acc + (Number(m[s.key]) || 0), 0),
                )}
              </div>
            </div>
          ))}
          <div className="text-xs text-muted-foreground sm:col-span-4">
            {active ? `${active.label} — hover a month to compare` : "All months in range. Hover a bar for one month."}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
