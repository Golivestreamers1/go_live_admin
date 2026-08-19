import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

/**
 * Gross to net — the old page's most useful chart, rebuilt.
 *
 * Two things are different from the original:
 *
 *  1. The running balance is computed **on the server** and shipped with each
 *     step. The old version re-accumulated it in the browser, which is how it
 *     ended up disagreeing with the headline above it.
 *  2. It does not take `Math.abs()` of the bar positions. The old one did, so a
 *     negative net rendered as if it were a gain.
 *
 * Deliberately a table with bars rather than a pure chart: an accountant needs
 * to read the numbers, and the bar is there to show the shape, not to replace
 * them.
 */

const money = (v) =>
  v === null || v === undefined || Number.isNaN(Number(v))
    ? "—"
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v));

export default function GrossToNet({ steps }) {
  if (!Array.isArray(steps) || steps.length === 0) return null;

  const rows = steps.filter((s) => s.direction !== "net");
  const net = steps.find((s) => s.direction === "net");

  // Scale to the tallest point the running balance ever reaches, so the bars
  // are comparable to one another and to the final net.
  const max = Math.max(
    ...steps.map((s) => Math.abs(Number(s.balance) || 0)),
    ...steps.map((s) => Math.abs(Number(s.usd) || 0)),
    1,
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Gross to net</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-1">
          {rows.map((s) => {
            const value = Number(s.usd) || 0;
            const balance = Number(s.balance) || 0;
            const start = balance - value;
            // Bar spans from the previous balance to the new one, in either
            // direction. No abs() — a drop below zero draws below zero.
            const lo = Math.min(start, balance);
            const hi = Math.max(start, balance);
            const left = (Math.max(lo, 0) / max) * 100;
            const width = Math.max(((hi - Math.max(lo, 0)) / max) * 100, 0.6);
            const isIn = value >= 0;

            return (
              <div
                key={s.key}
                className="grid grid-cols-[minmax(9rem,1.3fr)_2.4fr_auto_auto] items-center gap-3 border-b border-dashed py-2 last:border-0"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{s.label}</div>
                  {s.detail ? (
                    <div className="truncate text-xs text-muted-foreground">{s.detail}</div>
                  ) : null}
                </div>

                <div className="h-5 w-full rounded bg-muted/60">
                  <div
                    className={`h-5 rounded ${isIn ? "bg-emerald-500/70" : "bg-destructive/70"}`}
                    style={{ marginLeft: `${left}%`, width: `${width}%` }}
                    title={`${money(start)} → ${money(balance)}`}
                  />
                </div>

                <div
                  className={`w-24 text-right text-sm tabular-nums ${
                    isIn ? "text-emerald-600" : "text-destructive"
                  }`}
                >
                  {isIn ? "+" : "−"}
                  {money(Math.abs(value))}
                </div>

                <div className="w-28 text-right text-sm tabular-nums text-muted-foreground">
                  {money(balance)}
                </div>
              </div>
            );
          })}
        </div>

        {net ? (
          <div className="mt-3 grid grid-cols-[minmax(9rem,1.3fr)_2.4fr_auto_auto] items-center gap-3 rounded-md bg-muted/60 px-0 py-3">
            <div className="text-sm font-semibold">{net.label}</div>
            <div className="h-6 w-full rounded bg-muted">
              <div
                className={`h-6 rounded ${
                  Number(net.usd) >= 0 ? "bg-emerald-600" : "bg-destructive"
                }`}
                style={{ width: `${Math.min((Math.abs(Number(net.usd)) / max) * 100, 100)}%` }}
              />
            </div>
            <div
              className={`w-24 text-right text-base font-bold tabular-nums ${
                Number(net.usd) >= 0 ? "text-emerald-600" : "text-destructive"
              }`}
            >
              {money(net.usd)}
            </div>
            <div className="w-28 text-right text-xs text-muted-foreground">{net.detail}</div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
