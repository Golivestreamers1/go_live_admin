import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

/**
 * The funnel, in coins.
 *
 * Bars are sized by COUNT, never by dollars. Sizing by dollars would quietly
 * mix two different prices — a coin sells for roughly $0.0067 but pays out at
 * roughly $0.0026 — and the drop would look like leakage when it is actually
 * the margin. Every dollar figure here therefore states its own basis.
 */

const money = (v) =>
  v === null || v === undefined || Number.isNaN(Number(v))
    ? "—"
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v));

const num = (v) =>
  v === null || v === undefined || Number.isNaN(Number(v))
    ? "—"
    : new Intl.NumberFormat("en-US").format(Number(v));

const TONE = ["bg-emerald-500", "bg-sky-500", "bg-violet-500", "bg-rose-500"];

export default function Funnel({ stages, note }) {
  if (!Array.isArray(stages) || stages.length === 0) return null;

  const max = Math.max(...stages.map((s) => Math.abs(Number(s.coins) || 0)), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Where the coins went</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {stages.map((s, i) => {
          const coins = Math.abs(Number(s.coins) || 0);
          const width = (coins / max) * 100;
          const share = max > 0 ? Math.round((coins / max) * 1000) / 10 : 0;
          return (
            <div key={s.key}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-medium">{s.label}</span>
                <span className="text-xs text-muted-foreground">{s.note}</span>
              </div>

              <div className="mt-1 flex items-center gap-3">
                <div className="h-8 flex-1 rounded bg-muted/60">
                  <div
                    className={`flex h-8 items-center rounded ${TONE[i % TONE.length]}`}
                    style={{ width: `${Math.max(width, 1)}%` }}
                  >
                    <span className="truncate px-2 text-xs font-semibold text-white tabular-nums">
                      {num(coins)}
                    </span>
                  </div>
                </div>
                <div className="w-14 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                  {share}%
                </div>
              </div>

              <div className="mt-1 text-xs text-muted-foreground">
                <span className="font-medium tabular-nums text-foreground">{money(s.usd)}</span>{" "}
                — {s.usdBasis}
              </div>
            </div>
          );
        })}

        {note ? <p className="pt-1 text-xs text-muted-foreground">{note}</p> : null}
      </CardContent>
    </Card>
  );
}
