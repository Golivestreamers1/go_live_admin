import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

/**
 * Where the coins went — as small multiples, one panel per unit.
 *
 * This was a single four-bar funnel. It could not be read honestly, for two
 * reasons that compounded each other:
 *
 *   1. Rows 1–2 count coins and rows 3–4 count rubies, but every row was drawn
 *      against one shared maximum and labelled as a percentage of coins bought.
 *      "Rubies cashed out" therefore showed as 32.3% of a COIN total.
 *   2. In a funnel shape a later bar longer than an earlier one reads as a bug.
 *      Here it happens routinely and correctly — a coin bought in one month can
 *      be gifted in the next — so the chart needed a paragraph underneath
 *      explaining why it was not what it looked like.
 *
 * A chart that needs a disclaimer to stop misleading people is the wrong chart.
 * Each unit now gets its own panel and its own baseline, so a share is always a
 * share of its own unit, and the two units are never set against one another.
 *
 * Bars are still sized by COUNT, never by dollars: a coin sells for ~$0.0067 but
 * pays out at ~$0.0026, so sizing by dollars would render the platform's margin
 * as if it were leakage. Every dollar figure states its own basis.
 */

const money = (v) =>
  v === null || v === undefined || Number.isNaN(Number(v))
    ? "—"
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v));

const num = (v) =>
  v === null || v === undefined || Number.isNaN(Number(v))
    ? "—"
    : new Intl.NumberFormat("en-US").format(Number(v));

/*
 * One hue per unit, not one per row. Colour here carries identity (which unit),
 * never rank — cycling four hues down a single measure told the reader the rows
 * differed in kind when they only differed in position. Validated as a
 * categorical pair: ΔE 26.1 deutan / 34.7 normal vision against a light surface.
 */
const UNIT = {
  coins: { title: "Coins", caption: "bought with money", bar: "bg-emerald-500" },
  rubies: { title: "Rubies", caption: "what hosts earn and cash out", bar: "bg-violet-500" },
};
const FALLBACK = { title: "", caption: "", bar: "bg-emerald-500" };

/** Preserve backend order; group without sorting so the story stays sequential. */
function groupByUnit(stages) {
  const order = [];
  const byUnit = new Map();
  for (const s of stages) {
    const unit = s.unit || "coins";
    if (!byUnit.has(unit)) {
      byUnit.set(unit, []);
      order.push(unit);
    }
    byUnit.get(unit).push(s);
  }
  return order.map((unit) => ({ unit, rows: byUnit.get(unit) }));
}

function Row({ stage, max, refValue, refLabel, isReference, tone }) {
  const count = Math.abs(Number(stage.coins) || 0);
  const width = max > 0 ? (count / max) * 100 : 0;
  /*
   * The share is of this panel's OWN first row, and says so in words. A bare
   * "32.3%" next to a bar invites the reader to supply their own denominator,
   * and the one they supply is the wrong one.
   */
  const share = refValue > 0 ? Math.round((count / refValue) * 1000) / 10 : null;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{stage.label}</span>
        <span className="text-xs text-muted-foreground">{stage.note}</span>
      </div>

      <div className="mt-1.5 flex items-center gap-3">
        <div className="h-6 flex-1 rounded-sm bg-muted/50">
          <div
            className={`h-6 rounded-sm ${tone}`}
            /* A zero is drawn as nothing. The 0.5% floor exists so a real but
               tiny value stays visible; applying it to 0 painted a sliver of
               colour on an empty period, which reads as data that is not there. */
            style={{ width: `${count > 0 ? Math.min(Math.max(width, 0.5), 100) : 0}%` }}
          />
        </div>
        <div className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums">
          {num(count)}
        </div>
      </div>

      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 text-xs text-muted-foreground">
        <span>
          <span className="font-medium tabular-nums text-foreground">{money(stage.usd)}</span>{" "}
          — {stage.usdBasis}
        </span>
        {share !== null && !isReference ? (
          <span className="tabular-nums">{share}% of {refLabel}</span>
        ) : null}
      </div>
    </div>
  );
}

export default function Funnel({ stages, note }) {
  if (!Array.isArray(stages) || stages.length === 0) return null;

  const groups = groupByUnit(stages);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Where the coins went</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {groups.map(({ unit, rows }) => {
            const meta = UNIT[unit] || FALLBACK;
            const max = Math.max(...rows.map((r) => Math.abs(Number(r.coins) || 0)), 1);
            /* Every share in a panel is measured against that panel's first row. */
            const first = rows[0];
            const refValue = Math.abs(Number(first.coins) || 0);
            const refLabel = (first.label || "").toLowerCase();

            return (
              <div key={unit} className="space-y-4">
                {meta.title ? (
                  <div className="flex items-baseline gap-2 border-b pb-1.5">
                    <span className="text-sm font-semibold uppercase tracking-wide">
                      {meta.title}
                    </span>
                    <span className="text-xs text-muted-foreground">{meta.caption}</span>
                  </div>
                ) : null}

                {rows.map((s) => (
                  <Row
                    key={s.key}
                    stage={s}
                    max={max}
                    refValue={refValue}
                    refLabel={refLabel}
                    isReference={s.key === first.key}
                    tone={meta.bar}
                  />
                ))}
              </div>
            );
          })}
        </div>

        {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
      </CardContent>
    </Card>
  );
}
