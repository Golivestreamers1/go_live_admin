import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

/**
 * Rate card — every exchange rate, where it comes from, and whether it moved.
 *
 * Built to be read without reading: the numbers are large, the source is a
 * chip, and the one thing that is genuinely an opinion rather than a fact
 * (Apple's cut, PayPal's fee) is chipped "assumed" everywhere it appears.
 *
 * The change log is deliberately allowed to be empty. Only the cash-out tier
 * table is stored in the database, so it is the only rate whose history exists
 * at all — the empty state says that rather than pretending nothing has ever
 * changed.
 */

const money = (v) =>
  v === null || v === undefined || Number.isNaN(Number(v))
    ? "—"
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v));

/** Coin prices are sub-cent; the 2dp formatter turned $0.00706 into "$0.01". */
const coinPrice = (v) =>
  v === null || v === undefined || Number.isNaN(Number(v)) ? "—" : `$${Number(v).toFixed(5)}`;

const num = (v) =>
  v === null || v === undefined || Number.isNaN(Number(v))
    ? "—"
    : new Intl.NumberFormat("en-US").format(Number(v));

const when = (v) =>
  v ? new Date(v).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";

const CHANGE_LABEL = {
  admin: "Admin can change it",
  deploy: "Needs a code release",
  env: "Server setting",
  store: "Code + App Store / Play Console",
};

function BasisChip({ basis }) {
  return basis === "assumed" ? (
    <Badge variant="outline" className="border-amber-500/50 text-amber-600">
      assumed
    </Badge>
  ) : (
    <Badge variant="outline" className="border-emerald-500/50 text-emerald-600">
      measured
    </Badge>
  );
}

/* ── the chain, as four numbers ──────────────────────────────────────── */

function Chain({ chain }) {
  // A grid, not a wrapping flex row: the flex version wrapped the fourth card
  // onto a second line and left a dangling arrow pointing at the page edge.
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {chain.map((c, i) => (
        <div key={c.step} className="relative rounded-lg border p-3">
          <div className="text-xs text-muted-foreground">{c.from}</div>
          <div className="mt-1 text-xl font-bold tabular-nums">{c.rate}</div>
          <div className="text-xs text-muted-foreground">{c.to}</div>
          <div className="mt-2 flex flex-wrap gap-1">
            <BasisChip basis={c.basis} />
            <Badge variant="secondary" className="text-[10px]">
              {CHANGE_LABEL[c.changeableBy] || c.changeableBy}
            </Badge>
          </div>
          {i < chain.length - 1 ? (
            <span
              aria-hidden="true"
              className="absolute -right-[13px] top-1/2 hidden -translate-y-1/2 text-xl text-muted-foreground xl:block"
            >
              →
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/* ── $100 all the way through ────────────────────────────────────────── */

function JourneyBar({ j }) {
  if (!j) return null;
  const parts = [
    { key: "host", label: "Host", usd: j.hostCashUsd, className: "bg-sky-500" },
    { key: "agency", label: "Agency", usd: j.agencyUsd, className: "bg-violet-500" },
    { key: "recruiter", label: "Recruiter", usd: j.recruiterUsd, className: "bg-fuchsia-500" },
    { key: "us", label: "We keep", usd: j.platformBeforeFeesUsd, className: "bg-emerald-600" },
  ];
  const total = j.spendUsd || 100;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{j.label}</span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {money(j.spendUsd)} → {num(j.coins)} coins → {num(j.rubies)} rubies
        </span>
      </div>

      <div className="flex h-9 w-full overflow-hidden rounded">
        {parts.map((p) => {
          const w = (Math.max(p.usd, 0) / total) * 100;
          if (w <= 0) return null;
          return (
            <div
              key={p.key}
              className={`flex items-center justify-center ${p.className}`}
              style={{ width: `${w}%` }}
              title={`${p.label}: ${money(p.usd)}`}
            >
              {w > 9 ? (
                <span className="px-1 text-xs font-semibold tabular-nums text-white">
                  {money(p.usd)}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {parts.map((p) => (
          <span key={p.key} className="flex items-center gap-1.5">
            <span className={`inline-block h-2 w-2 rounded-sm ${p.className}`} />
            {p.label} {money(p.usd)}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── the card ────────────────────────────────────────────────────────── */

export default function RateCard({ rateCard }) {
  const rc = rateCard;
  if (!rc) return null;

  return (
    <div className="space-y-4">
      {/* the chain */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            How a dollar becomes a coin, a ruby, and a dollar again
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Chain chain={rc.chain || []} />
          {rc.dollarJourney ? (
            <div className="space-y-5 rounded-lg border p-4">
              <div className="text-sm font-semibold">
                {money(100)} spent, gifted in full, then cashed out
              </div>
              <JourneyBar j={rc.dollarJourney.highestMargin} />
              <JourneyBar j={rc.dollarJourney.lowestMargin} />
              <p className="text-xs text-muted-foreground">{rc.dollarJourney.note}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* rates that disagree with each other */}
      {rc.conflicts?.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {rc.conflicts.map((c) => (
            <Card
              key={c.key}
              className={
                c.severity === "high"
                  ? "border-destructive/50"
                  : c.severity === "medium"
                    ? "border-amber-500/50"
                    : undefined
              }
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Badge
                    variant={c.severity === "info" ? "secondary" : "destructive"}
                    className="text-[10px] uppercase"
                  >
                    {c.severity === "info" ? "by design" : c.severity}
                  </Badge>
                  {c.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded bg-muted/60 p-2 text-xs">{c.a}</div>
                  <div className="rounded bg-muted/60 p-2 text-xs">{c.b}</div>
                </div>
                <div className="text-xs">
                  <span className="font-semibold">Which one runs: </span>
                  <span className="text-muted-foreground">{c.whichWins}</span>
                </div>
                <div className="text-xs text-muted-foreground">{c.impact}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* what a coin costs */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              What a coin costs
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {coinPrice(rc.packs?.cheapestPerCoin)} – {coinPrice(rc.packs?.dearestPerCoin)} · {rc.packs?.spreadPct}% spread
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pack</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Coins</TableHead>
                  <TableHead className="text-right">Coins per $1</TableHead>
                  <TableHead className="text-right">$ per coin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rc.packs?.rows || []).map((p) => (
                  <TableRow key={p.name}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(p.usd)}</TableCell>
                    <TableCell className="text-right tabular-nums">{num(p.coins)}</TableCell>
                    <TableCell className="text-right tabular-nums">{num(p.coinsPerUsd)}</TableCell>
                    <TableCell className="text-right tabular-nums">${p.usdPerCoin}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* cash-out tiers */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              What a ruby pays
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {num(Math.round(rc.rubiesPerUsd))} rubies = $1
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cash-out</TableHead>
                  <TableHead className="text-right">Rubies</TableHead>
                  <TableHead className="text-right">Rubies per $1</TableHead>
                  <TableHead className="text-right">Live?</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rc.tiers?.rows || []).map((t, i) => (
                  <TableRow key={t.id || `${t.amountUsd}-${i}`}>
                    <TableCell className="font-medium tabular-nums">{money(t.amountUsd)}</TableCell>
                    <TableCell className="text-right tabular-nums">{num(t.rubies)}</TableCell>
                    <TableCell className="text-right tabular-nums">{num(t.rubiesPerUsd)}</TableCell>
                    <TableCell className="text-right">
                      {t.isActive ? (
                        <Badge variant="outline" className="border-emerald-500/50 text-emerald-600">
                          on
                        </Badge>
                      ) : (
                        <Badge variant="secondary">off</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="px-6 py-3 text-xs text-muted-foreground">
              Source: <code>{rc.tiers?.source}</code>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* every rate */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Every rate we use</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rate</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Measured or assumed</TableHead>
                  <TableHead>Who can change it</TableHead>
                  <TableHead>Where it is set</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rc.rates || []).map((r) => (
                  <TableRow key={r.key}>
                    <TableCell>
                      <div className="font-medium">{r.label}</div>
                      <div className="text-xs text-muted-foreground">{r.plain}</div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right font-semibold tabular-nums">
                      {r.value}
                    </TableCell>
                    <TableCell>
                      <BasisChip basis={r.basis} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {CHANGE_LABEL[r.changeableBy] || r.changeableBy}
                      {r.historyAvailable ? null : (
                        <div className="text-muted-foreground">no history kept</div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <code>{r.source}</code>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* change log */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Rate changes
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {rc.history?.trackedRates || 0} of {rc.history?.totalRates || 0} rates can be tracked
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className={rc.changes?.length ? "p-0" : undefined}>
          {rc.changes?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>What</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead>Now</TableHead>
                  <TableHead>Before</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rc.changes.map((c, i) => (
                  <TableRow key={`${c.scope}-${c.what}-${c.change}-${i}`}>
                    <TableCell className="whitespace-nowrap tabular-nums">{when(c.at)}</TableCell>
                    <TableCell className="font-medium">{c.what}</TableCell>
                    <TableCell>
                      <Badge variant={c.proven ? "outline" : "secondary"}>{c.change}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.detail}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.previous || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nothing to show. {rc.history?.note}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
