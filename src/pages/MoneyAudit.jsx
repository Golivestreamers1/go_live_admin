import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import DateRangeFilter from "../components/finance/DateRangeFilter";
import financeAuditService from "../services/financeAuditService";

/**
 * Coins & Rubies Audit.
 *
 * Compares what the ledger says should exist against what accounts actually
 * hold, and lists every place the two disagree. Strictly read-only — this page
 * has no action that changes anything.
 *
 * Two deliberate choices carried over from the agreed prototype:
 *  - Every quantity of coins or rubies is shown with its dollar value beside it.
 *  - A problem row says what it means for the business, not what failed in code.
 */

/* ── formatting ───────────────────────────────────────────────────────
 * `—` for missing, never a confident `$0`. The old finance page coerced
 * every absent value to zero, which made a broken field indistinguishable
 * from a real result.
 */
const usd = (v) =>
  v === null || v === undefined || Number.isNaN(Number(v))
    ? "—"
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v));

const num = (v) =>
  v === null || v === undefined || Number.isNaN(Number(v))
    ? "—"
    : new Intl.NumberFormat("en-US").format(Number(v));

const signed = (v) => (v === null || v === undefined ? "—" : `${Number(v) > 0 ? "+" : ""}${num(v)}`);

const SEVERITY_META = {
  critical: { label: "CRITICAL", variant: "destructive" },
  warning: { label: "WARNING", variant: "secondary" },
  info: { label: "INFO", variant: "outline" },
};

const CHECK_LABELS = {
  userBalance: "Wallet vs. history",
  stuckStreams: "Unpaid streams",
  withdrawalPairing: "Payout records",
  commissionPairing: "Commissions",
  purchaseIntegrity: "Purchases",
  lifetimeRubies: "Lifetime earnings",
  systemTotals: "System totals",
};

function Stat({ label, value, hint, tone }) {
  const toneClass =
    tone === "bad" ? "text-destructive" : tone === "good" ? "text-emerald-600" : "";
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className={`mt-2 text-3xl font-bold tabular-nums ${toneClass}`}>{value}</div>
        {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}

/** One side of the "should exist vs. actually exists" comparison. */
function BalancePanel({ title, note, totals, unit, valueOf }) {
  if (!totals) return null;
  const delta = totals.delta ?? 0;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {title}
          <span className="text-xs font-normal text-muted-foreground">{note}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        <Row label={`${unit} ever created`} value={num(totals.created)} />
        <Row label="Removed (spent, cashed out, clawed back)" value={`−${num(totals.removed)}`} />
        <div className="mt-2 flex justify-between border-t-2 border-foreground pt-2 font-semibold">
          <span>So accounts should hold</span>
          <span className="tabular-nums">{num(totals.shouldBeHeld)}</span>
        </div>
        <Row label="Accounts actually hold" value={num(totals.actuallyHeld)} />
        <div
          className={`mt-2 flex justify-between rounded-md px-3 py-2 font-semibold ${
            delta === 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"
          }`}
        >
          <span>{delta === 0 ? "Balanced" : "Unexplained"}</span>
          <span className="tabular-nums">
            {delta === 0 ? "0" : `${signed(delta)} ${unit.toLowerCase()}`}
            {delta === 0 ? "" : ` · ${valueOf}`}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between border-b border-dashed py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

export default function MoneyAudit() {
  const [rangeState, setRangeState] = useState({ range: "all", from: "", to: "" });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(
    async ({ refresh = false } = {}) => {
      setLoading(true);
      setError(null);
      try {
        const result = await financeAuditService.getAudit({ ...rangeState, refresh });
        setData(result);
      } catch (err) {
        // Keep the failure on screen. The old finance page showed a toast and
        // left stale numbers up, which is how a broken page looks healthy.
        setError(
          err?.response?.data?.message || err?.message || "Could not load the audit."
        );
        toast.error("Could not load the audit");
      } finally {
        setLoading(false);
      }
    },
    [rangeState]
  );

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => {
    const out = { critical: [], warning: [], info: [] };
    for (const f of data?.findings || []) (out[f.severity] || out.info).push(f);
    return out;
  }, [data]);

  const balanced = data?.balanced;
  const summary = data?.summary;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Coins &amp; Rubies Audit</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Every coin and ruby the system says it created, compared against what accounts
            actually hold right now. Anything that does not match is listed below, with what
            it is worth in real money.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => load({ refresh: true })} disabled={loading}>
            {loading ? "Checking…" : "Run the check now"}
          </Button>
        </div>
      </div>

      {/* Errors get a retry, and it sits ABOVE the data guard so a failed first
          load is still recoverable. */}
      {error ? (
        <Card className="border-destructive">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
            <div>
              <div className="font-semibold text-destructive">Could not load the audit</div>
              <div className="mt-1 text-sm text-muted-foreground">{error}</div>
            </div>
            <Button variant="outline" size="sm" onClick={() => load({ refresh: true })}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 pt-6">
          <DateRangeFilter value={rangeState} onChange={setRangeState} disabled={loading} />
          <span className="text-xs text-muted-foreground">
            Applies to unpaid streams, payouts and purchases. Wallet and lifetime checks are
            always all-time — a balance is cumulative, so a date window cannot reconcile it.
          </span>
        </CardContent>
      </Card>

      {loading && !data ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Running the checks…
          </CardContent>
        </Card>
      ) : null}

      {data ? (
        <>
          <Card className={balanced ? "border-emerald-500/40 bg-emerald-500/5" : "border-destructive/40 bg-destructive/5"}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="text-3xl leading-none">{balanced ? "✅" : "⚠️"}</div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold">
                    {balanced ? "The books balance" : "The books do not balance"}
                  </h2>
                  <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                    {balanced
                      ? "Every account's history adds up to the balance it holds, and every payout and commission has its matching record."
                      : "Some value cannot be traced to a transaction. Each problem below says what it means and what it is worth."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-8">
                    <div>
                      <div className="text-2xl font-bold tabular-nums">
                        {usd(summary?.unexplainedUsd)}
                      </div>
                      <div className="text-xs text-muted-foreground">value we cannot explain</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold tabular-nums">{num(summary?.findings)}</div>
                      <div className="text-xs text-muted-foreground">problems found</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold tabular-nums">
                        {num(summary?.accountsChecked)}
                      </div>
                      <div className="text-xs text-muted-foreground">accounts checked</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        {data.generatedAt ? new Date(data.generatedAt).toLocaleTimeString() : "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">last checked</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Critical"
              value={num(summary?.bySeverity?.critical)}
              hint="Money is missing or unaccounted for"
              tone={summary?.bySeverity?.critical ? "bad" : "good"}
            />
            <Stat
              label="Warnings"
              value={num(summary?.bySeverity?.warning)}
              hint="Records disagree, or something was not written"
            />
            <Stat label="Notes" value={num(summary?.bySeverity?.info)} hint="Context, not problems" />
            <Stat
              label="Ruby rate used"
              value={`${num(Math.round(data.rates?.rubiesPerUsd))} / $1`}
              hint="Today's rate — historical rates are not stored"
            />
          </div>

          <div>
            <h2 className="mb-1 text-lg font-semibold">The two counts that must agree</h2>
            <p className="mb-3 text-sm text-muted-foreground">
              If the last line of either panel is not zero, something happened that was never
              written down.
            </p>
            <div className="grid gap-4 lg:grid-cols-2">
              <BalancePanel
                title="COINS"
                note="bought with money"
                unit="Coins"
                totals={data.totals?.coins}
                valueOf={usd(data.totals?.coins?.usd)}
              />
              <BalancePanel
                title="RUBIES"
                note="turns into real cash"
                unit="Rubies"
                totals={data.totals?.rubies}
                valueOf={usd(data.totals?.rubies?.usd)}
              />
            </div>
          </div>

          {["critical", "warning", "info"].map((severity) =>
            grouped[severity].length ? (
              <div key={severity}>
                <h2 className="mb-3 text-lg font-semibold">
                  {severity === "critical"
                    ? "Problems that need attention"
                    : severity === "warning"
                      ? "Records that disagree"
                      : "Notes"}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {grouped[severity].length}
                  </span>
                </h2>
                <Card>
                  <CardContent className="overflow-x-auto p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[30%]">Problem</TableHead>
                          <TableHead>What it means</TableHead>
                          <TableHead>Who / what</TableHead>
                          <TableHead className="text-right">Difference</TableHead>
                          <TableHead className="text-right">Worth</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {grouped[severity].map((f, i) => (
                          <TableRow key={`${f.check}-${f.subjectId}-${i}`}>
                            <TableCell className="align-top">
                              <Badge variant={SEVERITY_META[f.severity]?.variant}>
                                {SEVERITY_META[f.severity]?.label}
                              </Badge>
                              <div className="mt-2 font-medium">{f.title}</div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                {CHECK_LABELS[f.check] || f.check}
                              </div>
                            </TableCell>
                            <TableCell className="align-top text-sm text-muted-foreground">
                              {f.detail}
                            </TableCell>
                            <TableCell className="align-top text-sm">
                              <div className="font-medium">{f.subject || "—"}</div>
                              {f.expected !== null && f.actual !== null ? (
                                <div className="mt-1 text-xs text-muted-foreground tabular-nums">
                                  history {num(f.expected)} · actual {num(f.actual)}
                                </div>
                              ) : null}
                            </TableCell>
                            <TableCell className="align-top text-right tabular-nums">
                              {f.delta === null ? "—" : `${signed(f.delta)} ${f.currency || ""}`}
                            </TableCell>
                            <TableCell className="align-top text-right font-semibold tabular-nums">
                              {usd(f.usd)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            ) : null
          )}

          {data.findings?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="text-3xl">✅</div>
                <div className="mt-2 font-semibold">Nothing to report</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Every account reconciles against its history.
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">What ran</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Check</TableHead>
                    <TableHead className="text-right">Records examined</TableHead>
                    <TableHead className="text-right">Problems</TableHead>
                    <TableHead className="text-right">Time</TableHead>
                    <TableHead>Date filter</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data.checks || []).map((c) => (
                    <TableRow key={c.check}>
                      <TableCell className="font-medium">
                        {CHECK_LABELS[c.check] || c.check}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{num(c.scanned)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {num(data.findings.filter((f) => f.check === c.check).length)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{c.ms} ms</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.allTimeOnly ? "always all-time" : data.range?.label || "All time"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
