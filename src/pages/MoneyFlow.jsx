import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
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
import GrossToNet from "../components/finance/GrossToNet";
import RateCard from "../components/finance/RateCard";
import MonthlyChart from "../components/finance/MonthlyChart";
import Funnel from "../components/finance/Funnel";
import financeAuditService from "../services/financeAuditService";

/**
 * Money Flow — the whole business, in the order the money actually moves.
 *
 * Read-only. Structured as a funnel so it can be read top to bottom:
 * people buy coins → coins become gifts → gifts become rubies → rubies become
 * cash (or go back to coins at 55%). Alongside it, the two things that cost us
 * money: value we give away free, and subscriptions.
 */

const usd = (v) =>
  v === null || v === undefined || Number.isNaN(Number(v))
    ? "—"
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v));

const usd4 = (v) =>
  v === null || v === undefined || Number.isNaN(Number(v))
    ? "—"
    : `$${Number(v).toFixed(5)}`;

const num = (v) =>
  v === null || v === undefined || Number.isNaN(Number(v))
    ? "—"
    : new Intl.NumberFormat("en-US").format(Number(v));

/** "− $4.89", or a bare em dash when the figure is missing — never "−—". */
const minus = (v) =>
  v === null || v === undefined || Number.isNaN(Number(v)) ? "—" : `−${usd(v)}`;

/** " — 8%", or nothing at all when the rate is missing — never "undefined%". */
const pctLabel = (v) =>
  v === null || v === undefined || Number.isNaN(Number(v)) ? "" : ` — ${v}%`;

/** A numbered funnel step with a one-line plain-English summary. */
function Step({ n, title, summary, children, tone }) {
  return (
    <Card className={tone === "good" ? "border-emerald-500/40" : undefined}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-start gap-3 text-base">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-foreground text-xs text-background">
            {n}
          </span>
          <span>
            {title}
            {summary ? (
              <span className="mt-1 block text-sm font-normal text-muted-foreground">{summary}</span>
            ) : null}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Line({ label, value, sub, strong }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-dashed py-2 last:border-0">
      <span className={strong ? "font-semibold" : "text-muted-foreground"}>
        {label}
        {sub ? <span className="mt-0.5 block text-xs text-muted-foreground">{sub}</span> : null}
      </span>
      <span className={`shrink-0 tabular-nums ${strong ? "font-semibold" : ""}`}>{value}</span>
    </div>
  );
}

export default function MoneyFlow() {
  const [rangeState, setRangeState] = useState({ range: "30d", from: "", to: "" });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(
    async ({ refresh = false } = {}) => {
      setLoading(true);
      setError(null);
      try {
        setData(await financeAuditService.getFlow({ ...rangeState, refresh }));
      } catch (err) {
        setError(err?.response?.data?.message || err?.message || "Could not load money flow.");
        toast.error("Could not load money flow");
      } finally {
        setLoading(false);
      }
    },
    [rangeState]
  );

  useEffect(() => {
    load();
  }, [load]);

  const d = data;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Money Flow</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Coins bought → gifted → rubies → cash.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => load({ refresh: true })} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </Button>
      </div>

      {error ? (
        <Card className="border-destructive">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
            <div>
              <div className="font-semibold text-destructive">Could not load money flow</div>
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
          {d?.range ? (
            <span className="text-xs text-muted-foreground">Showing: {d.range.label}</span>
          ) : null}
        </CardContent>
      </Card>

      {loading && !d ? <EmptyState icon="⏳" title="Loading…" detail="Following the money." /> : null}

      {d ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Money in" value={usd(d.headline.totalInUsd)} hint="Verified sales + subscriptions" />
            <StatCard label="Store fees" value={`−${usd(d.headline.totalFeesUsd)}`} hint="Apple, Google, PayPal" tone="bad" />
            <StatCard label="Cash paid to hosts" value={`−${usd(d.headline.totalOutUsd)}`} hint="Approved cash-outs" tone="bad" />
            <StatCard label="We kept" value={usd(d.headline.keptUsd)} hint={`${d.headline.keptPct}% of money in`} tone="good" />
          </div>

          {/* ── the shape of it, before any of the detail ── */}
          <MonthlyChart months={d.monthly} />

          {/* Full width each: at half width the waterfall truncated its own
              row labels, which defeats the point of labelling them. */}
          <GrossToNet steps={d.grossToNet} />
          <Funnel stages={d.funnel} note={d.funnelNote} />

          {/* ── the rates every figure above depends on ── */}
          <RateCard rateCard={d.rateCard} />

          {/* ── 1. buying ── */}
          <Step
            n="1"
            title="People buy coins"
            summary={`${num(d.buying.payments)} payments bought ${num(d.buying.coinsSold)} coins for ${usd(d.buying.grossUsd)} — about ${usd4(d.buying.usdPerCoin)} per coin.`}
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Where they paid</TableHead>
                    <TableHead className="text-right">Payments</TableHead>
                    <TableHead className="text-right">Coins issued</TableHead>
                    <TableHead className="text-right">They paid</TableHead>
                    <TableHead className="text-right">Store fee</TableHead>
                    <TableHead className="text-right">We received</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.buying.byChannel.map((c) => (
                    <TableRow key={c.key}>
                      <TableCell className="font-medium">{c.label}</TableCell>
                      <TableCell className="text-right tabular-nums">{num(c.payments)}</TableCell>
                      <TableCell className="text-right tabular-nums">{num(c.coins)}</TableCell>
                      <TableCell className="text-right tabular-nums">{usd(c.grossUsd)}</TableCell>
                      <TableCell className="text-right tabular-nums text-destructive">−{usd(c.feeUsd)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{usd(c.netUsd)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right tabular-nums">{num(d.buying.payments)}</TableCell>
                    <TableCell className="text-right tabular-nums">{num(d.buying.coinsSold)}</TableCell>
                    <TableCell className="text-right tabular-nums">{usd(d.buying.grossUsd)}</TableCell>
                    <TableCell className="text-right tabular-nums text-destructive">−{usd(d.buying.feeUsd)}</TableCell>
                    <TableCell className="text-right tabular-nums">{usd(d.buying.netUsd)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </Step>

          {/* ── payments we did not count ── */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-destructive/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Not real payments — held out of revenue
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {num(d.buying.excluded.count)} rows · {usd(d.buying.excluded.usd)}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {d.buying.excluded.byReason.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Why it does not count</TableHead>
                        <TableHead className="text-right">Rows</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {d.buying.excluded.byReason.map((r) => (
                        <TableRow key={r.key}>
                          <TableCell className="text-sm">{r.label}</TableCell>
                          <TableCell className="text-right tabular-nums">{num(r.count)}</TableCell>
                          <TableCell className="text-right tabular-nums">{usd(r.usd)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="px-6 pb-6 text-sm text-muted-foreground">Nothing excluded in this period.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-amber-500/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Real, but unproven — also held out
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {num(d.buying.unverified.count)} rows · {usd(d.buying.unverified.usd)}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {d.buying.unverified.byBucket.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Why we cannot prove it</TableHead>
                        <TableHead className="text-right">Rows</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {d.buying.unverified.byBucket.map((b) => (
                        <TableRow key={b.key}>
                          <TableCell className="text-sm">
                            {b.label}
                            <div className="mt-0.5 text-xs text-muted-foreground">{b.why}</div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{num(b.count)}</TableCell>
                          <TableCell className="text-right tabular-nums">{usd(b.usd)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="px-6 pb-6 text-sm text-muted-foreground">Everything in this period is verified.</p>
                )}
              </CardContent>
            </Card>
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">
            Left: never a real sale. Right: probably real, but taken before receipt checking
            existed — so unprovable. Neither is in the headline.
          </p>

          {/* ── 2. gifting ── */}
          <Step
            n="2"
            title="Coins are spent on gifts"
            summary={`${num(d.gifting.coinsGifted)} coins were gifted and became ${num(d.gifting.rubiesCredited)} rubies. ${d.gifting.rateLabel}.`}
          >
            <Line label="Coins gifted" value={num(d.gifting.coinsGifted)} sub={`across ${num(d.gifting.giftCount)} gifts`} />
            <Line label="Rubies that should have been created" value={num(d.gifting.rubiesExpected)} />
            <Line label="Rubies hosts were actually credited" value={num(d.gifting.rubiesCredited)} strong />
            {d.gifting.difference !== 0 ? (
              <div
                className={`mt-3 rounded-md px-3 py-2 text-sm ${
                  d.gifting.differenceKind === "stranded"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-amber-500/10 text-amber-700"
                }`}
              >
                <strong>
                  {d.gifting.difference > 0 ? "+" : ""}
                  {num(d.gifting.difference)} rubies ({usd(d.gifting.differenceUsd)})
                </strong>{" "}
                — {d.gifting.differenceLabel}{" "}
                {d.gifting.differenceKind === "stranded"
                  ? "The Coins & Rubies Audit page names the exact streams."
                  : ""}
              </div>
            ) : (
              <div className="mt-3 rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
                {d.gifting.differenceLabel}
              </div>
            )}
            <div className="mt-4 rounded-md bg-muted/50 p-3 text-sm">
              <div className="font-semibold">
                What the platform takes at this step: {d.gifting.platformTakePct}% — {usd(0)}
              </div>
              <p className="mt-1 text-muted-foreground">{d.gifting.note}</p>
            </div>
          </Step>

          {/* ── 3. cash-out ── */}
          <Step
            n="3"
            title="Rubies are cashed out for real money"
            summary={`${num(d.cashout.rubiesCashedOut)} rubies were paid out as ${usd(d.cashout.cashPaidUsd)} across ${num(d.cashout.requests)} approved cash-outs.`}
            tone="good"
          >
            <Line label="Cash-out rate" value={`${num(Math.round(d.cashout.rubiesPerUsd))} rubies = $1`} />
            <Line label="We sold each of those coins for about" value={usd4(d.cashout.avgUsdPerCoinSold)} />
            <Line label="We pay out each ruby at" value={usd4(d.cashout.usdPerRuby)} />
            <Line label="What those coins originally sold for" value={usd(d.cashout.soldForUsd)} />
            <Line label="What we paid out for them" value={`−${usd(d.cashout.cashPaidUsd)}`} />
            <div className="mt-3 rounded-md bg-emerald-500/10 px-3 py-3 text-emerald-700">
              <div className="flex items-baseline justify-between">
                <span className="font-semibold">The platform earns on this path</span>
                <span className="text-xl font-bold tabular-nums">{usd(d.cashout.marginUsd)}</span>
              </div>
              <div className="mt-1 text-sm">{d.cashout.marginPct}% of what those coins sold for</div>
            </div>

            {/* Paid because of a cash-out, on top of it — so they belong here. */}
            <div className="mt-4 rounded-md border border-destructive/30 p-3">
              <div className="mb-1 text-sm font-semibold">
                Paid on top of every cash-out
                <span className="ml-2 font-normal text-destructive tabular-nums">
                  {minus(d.commissions?.totalUsd)}
                </span>
              </div>
              <Line
                label={`Agency commission${pctLabel(d.commissions?.agencyRatePct)}`}
                sub={`${num(d.commissions?.agencyCount)} payments`}
                value={minus(d.commissions?.agencyUsd)}
              />
              <Line
                label={`Recruiter commission${pctLabel(d.commissions?.recruiterRatePct)}`}
                sub={`${num(d.commissions?.recruiterCount)} payments · ${num(d.commissions?.recruiterRubies)} rubies`}
                value={minus(d.commissions?.recruiterUsd)}
              />
              <p className="mt-2 text-xs text-muted-foreground">{d.commissions?.note}</p>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">{d.cashout.basis}</p>
          </Step>

          {/* ── 4. conversion ── */}
          <Step
            n="4"
            title="Or rubies go back into coins"
            summary={`${num(d.conversion.rubiesConverted)} rubies were converted into ${num(d.conversion.coinsIssued)} coins. ${d.conversion.rateLabel}.`}
          >
            <Line label="Rubies given up by hosts" value={num(d.conversion.rubiesConverted)} sub={`${num(d.conversion.conversions)} conversions`} />
            <Line label="Coins they received back" value={num(d.conversion.coinsIssued)} />
            <Line label={`Rubies retained by the platform (${((1 - d.rates.rubyToCoinRate) * 100).toFixed(0)}%)`} value={num(d.conversion.rubiesRetained)} strong />
            <div className="mt-3 rounded-md bg-emerald-500/10 px-3 py-3 text-emerald-700">
              <div className="flex items-baseline justify-between">
                <span className="font-semibold">The platform earns here</span>
                <span className="text-xl font-bold tabular-nums">{usd(d.conversion.retainedUsd)}</span>
              </div>
              <div className="mt-1 text-sm">{d.conversion.note}</div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">⚠ {d.conversion.caveat}</p>
          </Step>

          {/* ── giveaways ── */}
          <Step
            n="5"
            title="Free value we hand out"
            summary={`${num(d.givenAway.totalCoins)} coins and ${num(d.givenAway.totalRubies)} rubies given away. If it is all gifted and cashed out, it costs ${usd(d.givenAway.totalCashCostUsd)}.`}
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>What it is</TableHead>
                    <TableHead className="text-right">Coins</TableHead>
                    <TableHead className="text-right">Rubies</TableHead>
                    <TableHead className="text-right">Cash it could cost</TableHead>
                    <TableHead className="text-right">Had we sold it instead</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.givenAway.categories.map((c) => (
                    <TableRow key={c.key}>
                      <TableCell>
                        <span className="font-medium">{c.label}</span>
                        <div className="mt-0.5 text-xs text-muted-foreground">{c.why}</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{num(c.coins)}</TableCell>
                      <TableCell className="text-right tabular-nums">{num(c.rubies)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-destructive">
                        {usd(c.cashCostUsd)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {usd(c.saleValueUsd)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right tabular-nums">{num(d.givenAway.totalCoins)}</TableCell>
                    <TableCell className="text-right tabular-nums">{num(d.givenAway.totalRubies)}</TableCell>
                    <TableCell className="text-right tabular-nums text-destructive">
                      {usd(d.givenAway.totalCashCostUsd)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{usd(d.givenAway.totalSaleValueUsd)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{d.givenAway.note}</p>
          </Step>

          {/* ── subscriptions ── */}
          <Step
            n="6"
            title="Subscriptions"
            summary={`${num(d.subscriptions.subscribers)} subscriptions at ${usd(d.subscriptions.pricePerSub)}.`}
          >
            <Line label="Subscription revenue" value={usd(d.subscriptions.grossUsd)} sub="estimated — never reaches the ledger" />
            <Line label="Store fee" value={`−${usd(d.subscriptions.storeFeeUsd)}`} />
            <Line
              label="Grants we owe because of them"
              value={`−${usd(d.subscriptions.grantCostUsd)}`}
              sub={`${num(d.subscriptions.grantCoins)} coins to subscribers, ${num(d.subscriptions.grantRubies)} rubies to hosts`}
            />
            <div
              className={`mt-3 rounded-md px-3 py-3 ${
                d.subscriptions.netAfterGrantsUsd >= 0
                  ? "bg-emerald-500/10 text-emerald-700"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              <div className="flex items-baseline justify-between">
                <span className="font-semibold">
                  {d.subscriptions.netAfterGrantsUsd >= 0 ? "Net gain on subscriptions" : "Net LOSS on subscriptions"}
                </span>
                <span className="text-xl font-bold tabular-nums">{usd(d.subscriptions.netAfterGrantsUsd)}</span>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{d.subscriptions.note}</p>
          </Step>

          {/* ── worked example ── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{d.example.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {d.example.steps.map((s) => (
                <Line
                  key={s.label}
                  label={s.label}
                  sub={s.detail}
                  value={s.usd === null || s.usd === undefined ? "—" : usd(s.usd)}
                  strong={s.label === "We keep"}
                />
              ))}
              <p className="mt-3 border-l-2 pl-3 text-sm text-muted-foreground">{d.example.note}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">What this page cannot prove</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Question</TableHead>
                    <TableHead>Answer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.caveats.map((c) => (
                    <TableRow key={c.question}>
                      <TableCell className="font-medium">{c.question}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.answer}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">{d.rates.caveat}</p>
        </>
      ) : null}
    </div>
  );
}
