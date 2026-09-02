import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

/**
 * How the money works — the page that explains the other four.
 *
 * Written because the model was documented and unreachable: docs/ holds ~1,450
 * lines across ACCOUNTING_USER_MANUAL, MONEY_FLOW_SIMPLE, FINANCE_MONEY_FLOW
 * and EXCHANGE_RATES, and nothing in the admin linked to any of it. An operator
 * could read every number on the finance pages without ever learning what a
 * ruby is, or which of two near-identically named pages answers their question.
 *
 * DELIBERATELY CONTAINS NO RATES. Every concrete number — the price of a coin,
 * the cash-out tiers, the commission percentages — points at the rate card on
 * Money Flow instead of restating it. A second copy of a rate is a second thing
 * to update, and the copy that nobody remembers to update is the one that ends
 * up being believed. Structure lives here; numbers live in one place.
 */

function Term({ word, children }) {
  return (
    <div className="border-b py-3 last:border-b-0">
      <dt className="text-sm font-semibold">{word}</dt>
      <dd className="mt-1 text-sm text-muted-foreground">{children}</dd>
    </div>
  );
}

function Step({ n, title, children }) {
  return (
    <div className="flex gap-4">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
        {n}
      </div>
      <div className="pb-6">
        <div className="font-medium">{title}</div>
        <div className="mt-1 text-sm text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

const PAGES = [
  {
    href: "/finance",
    name: "Money Flow",
    question: "Did we make money, and where did it go?",
    detail:
      "The whole business top to bottom, in the order money actually moves. Start here. It also carries the rate card — the one place every rate in the system is written down.",
  },
  {
    href: "/finance/tracking",
    name: "Money Tracking",
    question: "What happened to money in this specific period?",
    detail:
      "The same money, framed as a period close: what came in, what was taken off the top, what we paid out, what is left, and what we still owe. Export to CSV lives here.",
  },
  {
    href: "/finance/audit",
    name: "Coins & Rubies Audit",
    question: "Do the books actually balance?",
    detail:
      "Compares what the ledger says should exist against what accounts really hold, and lists every account that disagrees with a dollar value attached.",
  },
  {
    href: "/finance/trace",
    name: "Follow One Dollar",
    question: "What happened to this one person's money?",
    detail:
      "One account, one receipt or one withdrawal, as a timeline — from the card payment to the payout, with each step marked proven or unproven.",
  },
];

export default function MoneyGuide() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">How the money works</h1>
        <p className="mt-1 max-w-3xl text-muted-foreground">
          Everything the four Accounting pages assume you already know. No rates are
          repeated here — those live on the rate card, so there is only ever one copy to
          trust.
        </p>
      </div>

      {/* ── which page answers which question ── */}
      <div>
        <h2 className="mb-1 text-lg font-semibold">Start here</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Four pages, four different questions. Pick by the question you actually have.
        </p>
        <div className="grid gap-4 lg:grid-cols-2">
          {PAGES.map((p) => (
            <Card key={p.href}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  <Link to={p.href} className="hover:underline">
                    {p.name}
                  </Link>
                </CardTitle>
                <div className="text-sm font-medium text-foreground">“{p.question}”</div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{p.detail}</CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ── the model, in the order it happens ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">One dollar, all the way through</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <Step n="1" title="Someone buys coins with real money">
            They pay Apple, Google, or us via PayPal. The store keeps a cut before the
            money ever reaches us, so what a buyer pays and what we receive are two
            different numbers — both are shown, never conflated.
          </Step>
          <Step n="2" title="They spend coins on gifts in a live stream">
            The coins leave the sender's wallet immediately. The host is not credited yet.
          </Step>
          <Step n="3" title="The stream ends, and the host is credited in rubies">
            One gifted coin becomes one ruby. We take nothing at this moment. Crediting
            happens <strong>once for the whole stream</strong>, not per gift — which is why
            a single gift cannot be followed past this line, on any page.
          </Step>
          <Step n="4" title="The host asks to cash rubies out">
            An admin approves it by hand and pays by PayPal. Agency and recruiter
            commission is added <strong>on top</strong> of that payout — it is an extra cost
            to us, never a deduction from the host.
          </Step>
          <Step n="5" title="This is where the trail stops">
            We record that an admin approved the transfer. We do not record that the money
            arrived — there is no paid state, no payout reference and no date on a host
            withdrawal. Every page says so rather than implying otherwise.
          </Step>

          <div className="mt-2 rounded-md border bg-muted/40 p-4 text-sm">
            <div className="font-semibold">Where the profit actually comes from</div>
            <p className="mt-1 text-muted-foreground">
              Not from a commission on gifts — that is zero. We sell a coin for roughly four
              times what we buy a ruby back for, and{" "}
              <strong className="text-foreground">that spread is the entire margin</strong>.
              It is also why a coin balance and coin revenue can never be compared
              directly: the same coin is worth two different amounts depending on which
              direction it is travelling.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── two payout rails, because this catches people out ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Money leaves by two separate doors</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            This is the single most common source of confusion, because the two look alike
            and live in different places.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-md border p-3">
              <div className="font-medium text-foreground">Host cash-outs</div>
              <p className="mt-1">
                A host converts their own rubies to cash. Approved on{" "}
                <Link to="/withdraw-requests" className="underline">
                  Withdraw Requests
                </Link>
                . Cannot be proven paid.
              </p>
            </div>
            <div className="rounded-md border p-3">
              <div className="font-medium text-foreground">Agency &amp; recruiter payouts</div>
              <p className="mt-1">
                An agency owner or recruiter cashes out commission they earned on other
                people's payouts. A different collection with its own approval path.
                Sometimes carries an external reference, so it{" "}
                <em>can</em> be proven — the pages say which rows are.
              </p>
            </div>
          </div>
          <p>
            Commission is also counted at two different moments: when it is{" "}
            <strong className="text-foreground">earned</strong> and when it is{" "}
            <strong className="text-foreground">paid</strong>. Money Tracking shows both and
            adds only one to the total — adding both would charge the business twice for
            one commission. The two only line up over all time; inside a date window a
            payout usually settles commission earned in an earlier month.
          </p>
        </CardContent>
      </Card>

      {/* ── the nouns ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">What the words mean</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-10 sm:grid-cols-2">
            <Term word="Coin">
              What a buyer purchases with real money and spends on gifts. Priced per pack,
              so there is no single price for one coin.
            </Term>
            <Term word="Ruby">
              What a host earns when someone gifts them. Rubies are the only thing that can
              become cash. One gifted coin becomes one ruby.
            </Term>
            <Term word="Gift">
              An item a viewer sends a host during a stream, priced in coins. Sending it
              moves coins immediately; it credits the host only when the stream ends.
            </Term>
            <Term word="Cash-out">
              A host asking to turn rubies into money, priced by a tier table and approved
              by hand. Not automated.
            </Term>
            <Term word="Conversion">
              A host turning rubies back into coins to spend in the app instead of cashing
              out. They lose value doing this — it is not the cash-out path, and no ledger
              row records the difference.
            </Term>
            <Term word="Agency">
              A group a host belongs to. Its owner earns commission when its members cash
              out, paid on top of the member's payout.
            </Term>
            <Term word="Icon Recruiter">
              Someone who brought a host to the platform and earns commission on their
              cash-outs. Paid in rubies, so it becomes a future cash-out rather than cash
              leaving today.
            </Term>
            <Term word="Ledger (WalletTransaction)">
              The record of every movement of coins and rubies. If value moved without a
              row here, the audit page reports it as unexplained — that is exactly what it
              is looking for.
            </Term>
            <Term word="Lifetime rubies">
              Everything a host has ever earned, as opposed to what they hold now. Drives
              leaderboards and agency tiers, so it can disagree with the spendable balance
              and still be correct.
            </Term>
            <Term word="Unverified / excluded purchase">
              A payment we deliberately do not count as revenue — sandbox and TestFlight
              receipts, staff accounts, malformed order ids, deleted buyers. Always listed
              with its reason rather than silently dropped.
            </Term>
          </dl>
        </CardContent>
      </Card>

      {/* ── the honest limits ── */}
      <Card className="border-amber-500/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">What none of these pages can tell you</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Worth knowing before anyone treats these numbers as an audited account. Each
            page repeats the limits that apply to it.
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Whether a host actually received their PayPal transfer. We record approval only.</li>
            <li>
              What Apple and Google really charged. The per-transaction figure is discarded
              on save, so every row is priced at list.
            </li>
            <li>
              Whether there are PayPal chargebacks. No dispute webhook exists, so they are
              assumed, not measured.
            </li>
            <li>
              What a past month was worth at the time. Historical rates are not stored, so
              every period is valued at today's rate.
            </li>
            <li>Whether a closed month can change afterwards. It can — nothing is frozen.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Deeper reading</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Longer write-ups live in the admin repository under <code>docs/</code> —{" "}
            <code>MONEY_FLOW_SIMPLE.md</code> for the plain-English version,{" "}
            <code>ACCOUNTING_USER_MANUAL.md</code> for day-to-day operations,{" "}
            <code>FINANCE_MONEY_FLOW.md</code> and <code>EXCHANGE_RATES.md</code> for the
            full model and every rate's provenance.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
