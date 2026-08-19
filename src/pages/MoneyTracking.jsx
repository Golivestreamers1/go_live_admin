import { useCallback, useEffect, useState } from "react";
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
import StatCard from "../components/finance/StatCard";
import EmptyState from "../components/finance/EmptyState";
import ExportCsvButton from "../components/finance/ExportCsvButton";
import financeAuditService from "../services/financeAuditService";

/**
 * Money Tracking.
 *
 * What came in, what the stores took, what we paid out, what we kept, and what
 * we still owe — over one date range applied to everything on the page.
 *
 * Read-only. "Close the month" is deliberately disabled: closing a period
 * writes, and this round is read-only by design.
 */

const usd = (v) =>
  v === null || v === undefined || Number.isNaN(Number(v))
    ? "—"
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v));

const num = (v) =>
  v === null || v === undefined || Number.isNaN(Number(v))
    ? "—"
    : new Intl.NumberFormat("en-US").format(Number(v));

/** Fixed palette so the bar and its legend can never drift apart. */
const BAR_COLORS = {
  fees: "#8a94a6",
  cashouts: "#c0245a",
  agency: "#8a5cc4",
  recruiter: "#6b4fc2",
  refunds: "#c62b3d",
  kept: "#0f8a5f",
};

export default function MoneyTracking() {
  const [rangeState, setRangeState] = useState({ range: "30d", from: "", to: "" });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(
    async ({ refresh = false } = {}) => {
      setLoading(true);
      setError(null);
      try {
        setData(await financeAuditService.getTracking({ ...rangeState, refresh }));
      } catch (err) {
        setError(err?.response?.data?.message || err?.message || "Could not load the report.");
        toast.error("Could not load money tracking");
      } finally {
        setLoading(false);
      }
    },
    [rangeState]
  );

  useEffect(() => {
    load();
  }, [load]);

  const h = data?.headline;
  const maxMonth = Math.max(1, ...(data?.monthly || []).map((m) => m.gross || 0));

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Money Tracking</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Everything that happened to money in this period. Four questions: what came in,
            what was taken off the top, what we paid out, and what is left.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportCsvButton
            filename={`money-tracking-${rangeState.range}.csv`}
            fetcher={() => financeAuditService.exportTrackingCsv(rangeState)}
          />
          <Button variant="outline" size="sm" onClick={() => load({ refresh: true })} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </Button>
          <Button size="sm" disabled title="Closing a period writes to the database — not part of this read-only release.">
            Close the month
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="border-destructive">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
            <div>
              <div className="font-semibold text-destructive">Could not load the report</div>
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
          {data?.range ? (
            <span className="text-xs text-muted-foreground">Showing: {data.range.label}</span>
          ) : null}
        </CardContent>
      </Card>

      {loading && !data ? (
        <EmptyState icon="⏳" title="Loading…" detail="Adding up the period." />
      ) : null}

      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="1 · Came in" value={usd(h.grossUsd)} hint="What players actually paid us" />
            <StatCard label="2 · Taken off the top" value={`−${usd(h.feeUsd)}`} hint="Apple, Google & PayPal fees" tone="bad" />
            <StatCard label="3 · Paid out" value={`−${usd(h.paidOutUsd)}`} hint="Hosts, agencies, recruiters" tone="bad" />
            <StatCard label="4 · We kept" value={usd(h.keptUsd)} hint="Before staff, servers & tax" tone="good" />
          </div>

          {data.per100?.length ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">For every $100 that came in…</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex overflow-hidden rounded-lg text-xs font-bold text-white" style={{ height: 52 }}>
                  {data.per100
                    .filter((p) => p.pct > 0)
                    .map((p) => (
                      <div
                        key={p.key}
                        className="grid place-items-center"
                        style={{ width: `${p.pct}%`, background: BAR_COLORS[p.key] || "#8a94a6" }}
                        title={`${p.label}: $${p.usd}`}
                      >
                        {p.pct >= 8 ? `$${p.usd}` : ""}
                      </div>
                    ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-sm">
                  {data.per100.map((p) => (
                    <span key={p.key} className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-sm"
                        style={{ background: BAR_COLORS[p.key] || "#8a94a6" }}
                      />
                      ${p.usd} — {p.label}
                    </span>
                  ))}
                </div>
                <p className="mt-4 border-l-2 pl-3 text-sm text-muted-foreground">
                  We sell a coin for about a cent and buy a ruby back for about a quarter of a
                  cent. That gap is the whole margin — we take <strong>nothing</strong> when a
                  gift is sent: 1 coin becomes 1 ruby.
                </p>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Where the money came from</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Payments</TableHead>
                    <TableHead className="text-right">They paid</TableHead>
                    <TableHead className="text-right">Fee taken</TableHead>
                    <TableHead className="text-right">We received</TableHead>
                    <TableHead className="text-right">Share</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.moneyIn.byChannel.map((c) => (
                    <TableRow key={c.key}>
                      <TableCell>
                        <span className="font-medium">{c.label}</span>
                        {c.proven === false ? (
                          <Badge variant="secondary" className="ml-2">
                            estimated
                          </Badge>
                        ) : null}
                        {c.note ? (
                          <div className="mt-1 text-xs text-muted-foreground">{c.note}</div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{num(c.count)}</TableCell>
                      <TableCell className="text-right tabular-nums">{usd(c.gross)}</TableCell>
                      <TableCell className="text-right tabular-nums text-destructive">
                        −{usd(c.fee)}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {usd(c.net)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{c.share}%</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell>Total</TableCell>
                    <TableCell />
                    <TableCell className="text-right tabular-nums">{usd(h.grossUsd)}</TableCell>
                    <TableCell className="text-right tabular-nums text-destructive">
                      −{usd(h.feeUsd)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{usd(h.netUsd)}</TableCell>
                    <TableCell className="text-right tabular-nums">100%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Where the money went</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment</TableHead>
                    <TableHead>Who gets it</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Can we prove it happened?</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.moneyOut.items.map((i) => (
                    <TableRow key={i.key}>
                      <TableCell>
                        <span className="font-medium">{i.label}</span>
                        {i.informational ? (
                          <Badge variant="outline" className="ml-2">
                            not subtracted twice
                          </Badge>
                        ) : null}
                        <div className="mt-1 max-w-md text-xs text-muted-foreground">{i.note}</div>
                      </TableCell>
                      <TableCell className="text-sm">{i.who}</TableCell>
                      <TableCell className="text-right tabular-nums">{num(i.count)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {usd(i.usd)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={i.proven ? "secondary" : "destructive"}>
                          {i.proven ? "yes" : "NO"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell colSpan={3}>Total paid out</TableCell>
                    <TableCell className="text-right tabular-nums">{usd(data.moneyOut.total)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div>
            <h2 className="mb-1 text-lg font-semibold">What we still owe</h2>
            <p className="mb-3 text-sm text-muted-foreground">
              Coins and rubies people hold right now that can eventually become cash. A real
              debt, even though it has not been paid.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                label="Rubies hosts hold"
                value={usd(data.liability.rubiesUsd)}
                hint={`${num(data.liability.rubiesHeld)} rubies · can be requested as cash today`}
              />
              <StatCard
                label="Coins players hold"
                value={usd(data.liability.coinsUsd)}
                hint={`${num(data.liability.coinsHeld)} coins · already paid for, not yet spent`}
              />
              <StatCard
                label="Worst case total owed"
                value={usd(data.liability.totalUsd)}
                hint={`As of ${data.liability.asOf === "now" ? "right now" : new Date(data.liability.asOf).toLocaleDateString()}`}
              />
            </div>
            {!data.liability.liveWallets.agreesWithLedger ? (
              <p className="mt-3 text-xs text-destructive">
                The ledger and the live wallet balances disagree. The Coins &amp; Rubies Audit
                page lists exactly which accounts.
              </p>
            ) : null}
          </div>

          {data.monthly?.length ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Month by month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex h-48 items-end gap-4 px-2">
                  {data.monthly.map((m) => (
                    <div key={m.key} className="flex-1 text-center">
                      <div className="text-xs tabular-nums text-muted-foreground">
                        {usd(m.gross)}
                      </div>
                      <div
                        className="mt-1 rounded-t bg-foreground/80"
                        style={{ height: `${Math.max(2, (m.gross / maxMonth) * 140)}px` }}
                      />
                      <div className="mt-1 text-xs text-muted-foreground">{m.key}</div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  These bars are built from the same rows as the total above, so they always
                  add up to it.
                </p>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">What this page still cannot tell you</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Question</TableHead>
                    <TableHead>Answer today</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.caveats.map((c) => (
                    <TableRow key={c.question}>
                      <TableCell className="font-medium">{c.question}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.answer}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">
            Ruby rate applied: {num(Math.round(data.rates.rubiesPerUsd))} rubies = $1. {data.rates.caveat}
          </p>
        </>
      ) : null}
    </div>
  );
}
