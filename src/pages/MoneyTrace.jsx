import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import StatCard from "../components/finance/StatCard";
import EmptyState from "../components/finance/EmptyState";
import financeAuditService from "../services/financeAuditService";

/**
 * Follow One Dollar.
 *
 * A lookup tool, not a report — which is why it has no date-range filter. Type
 * in any handle on a payment and see the whole journey.
 *
 * Read-only.
 */

const usd = (v) =>
  v === null || v === undefined || Number.isNaN(Number(v))
    ? "—"
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v));

const num = (v) =>
  v === null || v === undefined || Number.isNaN(Number(v))
    ? "—"
    : new Intl.NumberFormat("en-US").format(Number(v));

const SPLIT_COLORS = {
  store: "#8a94a6",
  host: "#c0245a",
  agency: "#8a5cc4",
  recruiter: "#6b4fc2",
  kept: "#0f8a5f",
};

export default function MoneyTrace() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      setData(await financeAuditService.trace(query.trim()));
    } catch (err) {
      setData(null);
      setError(err?.response?.data?.message || err?.message || "Nothing found.");
      toast.error("Trace failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Follow One Dollar</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Type in anything — a person, a receipt number, a PayPal reference, a withdrawal — and
          see the whole journey of that money, from the card to the host&apos;s bank.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form className="flex flex-wrap items-center gap-2" onSubmit={run}>
            <Input
              className="min-w-[280px] flex-1"
              placeholder="username, email, store receipt, PayPal id, or withdrawal id"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button type="submit" disabled={loading || !query.trim()}>
              {loading ? "Tracing…" : "Trace it"}
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            Accepts: username · email · Apple/Google receipt · PayPal order or capture id ·
            withdrawal id · transaction id
          </p>
        </CardContent>
      </Card>

      {error ? (
        <EmptyState icon="🔍" title="Nothing found" detail={error} />
      ) : null}

      {!data && !error && !loading ? (
        <EmptyState
          icon="💸"
          title="Nothing traced yet"
          detail="Enter something above. Tracing a specific receipt shows only what followed that payment; tracing a person shows their whole history."
        />
      ) : null}

      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label={data.anchor ? "Purchase" : "Account"}
              value={data.anchor ? usd(data.anchor.usd) : data.subject.username || "—"}
              hint={
                data.anchor
                  ? `${num(data.anchor.coins)} coins · ${new Date(data.anchor.at).toLocaleDateString()}`
                  : data.subject.email
              }
            />
            <StatCard
              label="Matched as"
              value={data.matchedAs}
              hint={data.subject.country ? `${data.subject.country}` : "—"}
            />
            <StatCard label="Steps" value={num(data.summary.steps)} hint="events on the timeline" />
            <StatCard
              label="Unproven steps"
              value={num(data.summary.unprovenSteps)}
              hint="no evidence the money actually moved"
              tone={data.summary.unprovenSteps ? "bad" : "good"}
            />
          </div>

          {data.split ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  So who ended up with the {usd(data.split.grossUsd)}?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex overflow-hidden rounded-lg text-xs font-bold text-white" style={{ height: 52 }}>
                  {data.split.parts
                    .filter((p) => p.pct > 0)
                    .map((p) => (
                      <div
                        key={p.key}
                        className="grid place-items-center"
                        style={{ width: `${p.pct}%`, background: SPLIT_COLORS[p.key] }}
                        title={`${p.label}: ${usd(p.usd)}`}
                      >
                        {p.pct >= 10 ? usd(p.usd) : ""}
                      </div>
                    ))}
                </div>
                <Table className="mt-4">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Who</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Share</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.split.parts.map((p) => (
                      <TableRow key={p.key}>
                        <TableCell className="font-medium">{p.label}</TableCell>
                        <TableCell className="text-right tabular-nums">{usd(p.usd)}</TableCell>
                        <TableCell className="text-right tabular-nums">{p.pct}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="mt-3 border-l-2 pl-3 text-sm text-muted-foreground">
                  {data.split.basis}
                </p>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">The journey, step by step</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableBody>
                  {data.timeline.map((s, i) => (
                    <TableRow key={i} className={s.proven ? "" : "bg-destructive/5"}>
                      <TableCell className="w-[110px] align-top text-xs text-muted-foreground">
                        <div className="font-semibold text-foreground">
                          {new Date(s.at).toLocaleDateString()}
                        </div>
                        {new Date(s.at).toLocaleTimeString()}
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="font-medium">{s.title}</div>
                        <div className="mt-1 max-w-2xl text-xs text-muted-foreground">
                          {s.detail}
                        </div>
                        {!s.proven ? (
                          <Badge variant="destructive" className="mt-2">
                            NO RECORD
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell className="w-[170px] align-top text-right text-sm tabular-nums">
                        {s.coins ? (
                          <div className={s.coins < 0 ? "text-destructive" : ""}>
                            {s.coins > 0 ? "+" : ""}
                            {num(s.coins)} coins
                          </div>
                        ) : null}
                        {s.rubies ? (
                          <div className={s.rubies < 0 ? "text-destructive" : ""}>
                            {s.rubies > 0 ? "+" : ""}
                            {num(s.rubies)} rubies
                          </div>
                        ) : null}
                        {s.usd !== null && s.usd !== undefined ? (
                          <div className="text-xs text-muted-foreground">{usd(s.usd)}</div>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Where this trail stops</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {data.limits.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
